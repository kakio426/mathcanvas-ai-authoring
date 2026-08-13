#!/usr/bin/env node
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuthoringRuntime,
  describeCreationFailure,
  InstanceLockBusyError,
  type AuthoringRuntime,
  type MathCanvasAuthoringService
} from "@mathcanvas/authoring-runtime";
import {
  findTeacherCurriculumStandard
} from "@mathcanvas/curriculum";
import type {
  ApiErrorBody,
  CreationStatus,
  CurriculumCatalogResponse,
  PublicActivity,
  SessionResponse
} from "../shared/contract.js";
import {
  APPROVAL_TTL_MS,
  SESSION_TTL_MS,
  TeacherSessionStore,
  type TeacherSession
} from "./session.js";
import { buildInputReflections } from "./input-reflections.js";
import {
  findTeacherIntentCapabilityForRoute,
  problemParametersSchema,
  teacherIntentSchema,
  type ProblemParameters,
  type TeacherIntent
} from "@mathcanvas/contracts";
import {
  findProblemFamilyByRoute,
  validateProblemParameters
} from "@mathcanvas/templates";
import { appendTeacherInputLog } from "./teacher-input-log.js";
import { buildCurriculumCatalogResponse } from "./curriculum-catalog.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const staticDirectory = join(currentDirectory, "..", "web");
const repositoryRoot = normalize(join(currentDirectory, "..", "..", "..", ".."));
const teacherInputLogPath = join(repositoryRoot, "reports", "teacher-input-log.jsonl");
const sessions = new TeacherSessionStore();
const bootKey = randomBytes(32).toString("base64url");
let bootKeyUsed = false;
const cookieName = "mathcanvas_teacher";
const csrfHeader = "x-mathcanvas-ui";
let port = 0;
let runtime: AuthoringRuntime | undefined;
let loginProcess: ChildProcess | undefined;
let loginStarting = false;

function json(
  response: ServerResponse,
  status: number,
  body: Record<string, unknown>
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function error(
  response: ServerResponse,
  status: number,
  code: string,
  message: string,
  hints?: string[]
): void {
  const body: ApiErrorBody = {
    error: code,
    message,
    ...(hints ? { hints } : {})
  };
  json(response, status, body as unknown as Record<string, unknown>);
}

function parseCookies(request: IncomingMessage): Record<string, string> {
  const header = request.headers.cookie ?? "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return separator < 0
          ? [part, ""]
          : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}

function getSession(request: IncomingMessage): TeacherSession | undefined {
  return sessions.get(parseCookies(request)[cookieName]);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 32_768) throw new Error("body-too-large");
    chunks.push(buffer);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid-body");
  }
  return value as Record<string, unknown>;
}

function getRuntime(): AuthoringRuntime | undefined {
  if (runtime) return runtime;
  try {
    runtime = createAuthoringRuntime({ headless: true });
    return runtime;
  } catch (caught) {
    if (caught instanceof InstanceLockBusyError) return undefined;
    throw caught;
  }
}

function mapConnection(
  connection: Awaited<ReturnType<MathCanvasAuthoringService["checkConnection"]>>
): SessionResponse {
  if (connection.state === "ready") {
    return {
      connection: "ready",
      message: "MathCanvas와 연결됐어요. 수업 준비를 시작할 수 있습니다."
    };
  }
  if (connection.state === "login-required") {
    return {
      connection: "login_required",
      message: "MathCanvas 로그인이 필요합니다. 전용 로그인 창에서 로그인해 주세요."
    };
  }
  return {
    connection: "disconnected",
    message:
      connection.state === "contract-mismatch"
        ? "MathCanvas 연결 방식이 달라져 안전하게 멈췄어요. 도구 업데이트가 필요합니다."
        : "MathCanvas에 연결하지 못했어요. Chrome 상태를 확인한 뒤 다시 시도해 주세요."
  };
}

function toPublicActivity(
  result: ReturnType<MathCanvasAuthoringService["recommend"]>,
  fallback: {
    grade: number;
    problemCount: number;
    unitTitle: string;
    standardCode: string;
    activityId: string;
    activityLabel: string;
    manipulation: NonNullable<
      ReturnType<MathCanvasAuthoringService["recommend"]>["recommendation"]["manipulation"]
    >;
    learningNeedLabel: string;
    contextNote: string;
    problemParameters?: ProblemParameters;
    teacherIntent?: TeacherIntent;
  }
): PublicActivity {
  const recommendation = result.recommendation;
  const learningGoal =
    recommendation.learningGoal ?? "수학적 관계를 직접 조작하고 근거를 설명하기";
  const problemPreviews = result.activitySummary?.problemPreviews;
  const teacherAnswerKey = result.teacherAnswerKey;
  const expectedProblemCount = recommendation.problemCount ?? fallback.problemCount;
  if (
    !problemPreviews ||
    !teacherAnswerKey ||
    problemPreviews.length !== expectedProblemCount ||
    teacherAnswerKey.length !== expectedProblemCount
  ) {
    throw new Error("honest-preview-incomplete");
  }
  return {
    cardId: randomUUID(),
    title: result.activitySummary?.title ?? "MathCanvas 탐구 활동",
    gradeLabel: `${recommendation.recommendedGrade ?? fallback.grade}학년`,
    problemCount: recommendation.problemCount ?? fallback.problemCount,
    unitTitle: fallback.unitTitle,
    standardCode: recommendation.standardCode ?? fallback.standardCode,
    activityLabel: fallback.activityLabel,
    learningNeedLabel: fallback.learningNeedLabel,
    learningGoal,
    summary:
      `${fallback.learningNeedLabel}라는 어려움을 드러내고, 직접 조작한 결과로 생각을 확인한 뒤 수학적 까닭을 설명하도록 구성했습니다.`,
    studentInstructions: result.activitySummary?.studentInstructions ?? [],
    problemPreviews,
    teacherAnswerKey,
    inputReflections: buildInputReflections(
      {
        requestedGrade: fallback.grade,
        unitTitle: fallback.unitTitle,
        standardCode: fallback.standardCode,
        activityId: fallback.activityId,
        activityLabel: fallback.activityLabel,
        manipulation: fallback.manipulation,
        learningNeedLabel: fallback.learningNeedLabel,
        contextNote: fallback.contextNote,
        problemCount: fallback.problemCount,
        ...(fallback.problemParameters === undefined
          ? {}
          : { problemParameters: fallback.problemParameters }),
        ...(result.activitySummary?.appliedProblemParameters === undefined
          ? {}
          : {
              appliedProblemParameters:
                result.activitySummary.appliedProblemParameters
            }),
        ...(fallback.teacherIntent === undefined
          ? {}
          : { teacherIntent: fallback.teacherIntent }),
        ...(result.activitySummary?.appliedTeacherIntent === undefined
          ? {}
          : {
              appliedTeacherIntent:
                result.activitySummary.appliedTeacherIntent
            })
      },
      recommendation
    ),
    teacherChecks: [
      `학생이 ‘${fallback.learningNeedLabel}’와 관련된 생각을 조작 전에 드러내는지 살펴보세요.`,
      "조작 결과가 처음 생각과 다를 때, 수나 식 또는 길이의 관계를 근거로 설명하는지 살펴보세요.",
      "마지막 문항에서 확인한 방법을 새로운 수학적 상황에도 적용하는지 살펴보세요."
    ],
    flow: [
      {
        number: 1,
        label: "수학적으로 선택하기",
        description: "학생이 답이나 조작 방법을 먼저 스스로 결정합니다."
      },
      {
        number: 2,
        label: "생각의 어긋남 찾기",
        description: "자주 하는 실수가 왜 맞지 않는지 결과로 마주합니다."
      },
      {
        number: 3,
        label: "기준으로 확인하기",
        description: "수, 식, 길이처럼 변하지 않는 관계를 이용해 스스로 확인합니다."
      },
      {
        number: 4,
        label: "설명하고 고치기",
        description: "처음 생각과 달라진 점을 말이나 식으로 설명하고 수정합니다."
      }
    ]
  };
}

function publicCreation(creation: TeacherSession["creations"] extends Map<string, infer T> ? T : never): CreationStatus {
  return {
    creationId: creation.creationId,
    status: creation.status,
    message: creation.message,
    ...(creation.editorUrl ? { editorUrl: creation.editorUrl } : {})
  };
}

function isAllowedEditorUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "mathcanvas.vivasam.com";
  } catch {
    return false;
  }
}

function requireMutationGuards(request: IncomingMessage, response: ServerResponse): boolean {
  const expectedOrigin = `http://127.0.0.1:${port}`;
  const origin = request.headers.origin;
  if (
    request.headers[csrfHeader] !== "1" ||
    (origin !== expectedOrigin && origin !== `http://localhost:${port}`)
  ) {
    error(response, 403, "request_blocked", "안전하지 않은 요청을 차단했습니다. 화면을 새로 열어 주세요.");
    return false;
  }
  return true;
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  session: TeacherSession
): Promise<void> {
  if (request.method === "GET" && url.pathname === "/api/session") {
    if (loginProcess && loginProcess.exitCode === null) {
      json(response, 200, {
        connection: "login_pending",
        message: "로그인 창에서 로그인을 마친 뒤 창을 닫아 주세요. 자동으로 다시 확인합니다."
      });
      return;
    }
    const currentRuntime = getRuntime();
    if (!currentRuntime) {
      json(response, 200, {
        connection: "busy",
        message: "다른 MathCanvas 작업이 실행 중이에요. 그 작업을 마치면 다시 확인해 주세요."
      });
      return;
    }
    json(response, 200, mapConnection(await currentRuntime.service.checkConnection()) as unknown as Record<string, unknown>);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/curriculum") {
    const body: CurriculumCatalogResponse =
      buildCurriculumCatalogResponse();
    json(response, 200, body as unknown as Record<string, unknown>);
    return;
  }

  if (request.method !== "GET" && !requireMutationGuards(request, response)) return;

  if (request.method === "POST" && url.pathname === "/api/session/open-login") {
    if ((!loginProcess || loginProcess.exitCode !== null) && !loginStarting) {
      loginStarting = true;
      try {
        if (runtime) await runtime.closeBrowser();
        const child = spawn(
          process.execPath,
          [join(repositoryRoot, "scripts", "login-mathcanvas.mjs")],
          {
            cwd: repositoryRoot,
            stdio: "ignore"
          }
        );
        loginProcess = child;
        child.once("exit", () => {
          if (loginProcess === child) loginProcess = undefined;
        });
      } finally {
        loginStarting = false;
      }
    }
    json(response, 202, {
      connection: "login_pending",
      message: "로그인 창을 열었습니다. 로그인이 확인되면 창이 자동으로 닫힙니다."
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/recommendations") {
    const body = await readJsonBody(request);
    const unitId = typeof body.unitId === "string" ? body.unitId : "";
    const standardCode = typeof body.standardCode === "string" ? body.standardCode : "";
    const activityId = typeof body.activityId === "string" ? body.activityId : "";
    const learningNeedId = typeof body.learningNeedId === "string" ? body.learningNeedId : "";
    const contextNote = typeof body.contextNote === "string" ? body.contextNote.trim() : "";
    const requestedGrade = Number(body.requestedGrade);
    const problemCount = Number(body.problemCount);
    const problemParametersResult =
      body.problemParameters === undefined
        ? undefined
        : problemParametersSchema.safeParse(body.problemParameters);
    const teacherIntentResult =
      body.teacherIntent === undefined
        ? undefined
        : teacherIntentSchema.safeParse(
            body.teacherIntent
          );
    const curriculumCatalog = buildCurriculumCatalogResponse();
    const unit = curriculumCatalog.units.find((candidate) => candidate.id === unitId);
    const standard = curriculumCatalog.standards.find(
      (candidate) => candidate.standardCode === standardCode
    );
    const activityOption = standard?.activities.find((candidate) => candidate.id === activityId);
    const learningNeed = activityOption?.learningNeeds.find((candidate) => candidate.id === learningNeedId);
    if (
      !unit ||
      !standard ||
      !activityOption ||
      !learningNeed ||
      contextNote.length > 500 ||
      !Number.isInteger(requestedGrade) ||
      requestedGrade !== unit.grade ||
      !unit.standardCodes.includes(standard.standardCode) ||
      !unit.activityIds.includes(activityOption.id) ||
      !activityOption.availableProblemCounts.includes(problemCount)
    ) {
      error(response, 400, "invalid_lesson", "학년, 단원, 성취기준과 학생의 어려움을 다시 확인해 주세요.");
      return;
    }
    if (teacherIntentResult && !teacherIntentResult.success) {
      error(
        response,
        400,
        "teacher_intent_confirmation_required",
        "첫 문항 맞춤 조건을 정확히 확인해 주세요.",
        teacherIntentResult.error.issues.map((issue) => issue.message)
      );
      return;
    }
    if (problemParametersResult && !problemParametersResult.success) {
      error(
        response,
        400,
        "problem_parameters_confirmation_required",
        "문제 맞춤 조건을 정확히 확인해 주세요.",
        problemParametersResult.error.issues.map((issue) => issue.message)
      );
      return;
    }
    let problemParameters = problemParametersResult?.data;
    if (problemParameters) {
      try {
        problemParameters = validateProblemParameters(problemParameters);
      } catch (caught) {
        error(
          response,
          400,
          "problem_parameters_confirmation_required",
          "선택한 활동이 지원하는 문제 조건인지 다시 확인해 주세요.",
          [caught instanceof Error ? caught.message : "invalid-problem-parameters"]
        );
        return;
      }
    }
    const teacherIntent = teacherIntentResult?.data;
    const problemFamily = findProblemFamilyByRoute({
      manipulation: activityOption.manipulation,
      standardCode: standard.standardCode
    });
    if (problemParameters && problemFamily?.familyId !== problemParameters.familyId) {
      error(
        response,
        400,
        "problem_parameters_confirmation_required",
        "선택한 활동과 문제 맞춤 조건의 문제군이 다릅니다. 조건을 다시 골라 주세요."
      );
      return;
    }
    const teacherIntentCapability = findTeacherIntentCapabilityForRoute({
      manipulation: activityOption.manipulation,
      standardCode: standard.standardCode
    });
    if (teacherIntent && teacherIntentCapability?.kind !== teacherIntent.kind) {
      error(
        response,
        400,
        "teacher_intent_confirmation_required",
        "선택한 활동과 첫 문항 맞춤 조건의 종류가 다릅니다. 조건을 다시 골라 주세요."
      );
      return;
    }
    const legacyStandard = findTeacherCurriculumStandard(standard.standardCode);
    const legacyActivity = legacyStandard?.activities.find(
      (candidate) => candidate.id === activityOption.id
    );
    const legacyLearningNeed = legacyActivity?.learningNeeds.find(
      (candidate) => candidate.id === learningNeed.id
    );
    const prompt = [
      legacyActivity?.promptSeed ?? activityOption.description,
      legacyLearningNeed?.promptDetail ?? learningNeed.description,
      ...(contextNote ? [`우리 반 상황: ${contextNote}`] : [])
    ].join(". ");
    const currentRuntime = getRuntime();
    if (!currentRuntime) {
      error(response, 409, "busy", "다른 MathCanvas 작업이 끝난 뒤 다시 추천받아 주세요.");
      return;
    }
    const result = currentRuntime.service.recommend({
      prompt,
      requestedStandardCode: standard.standardCode,
      requestedFamilyId: activityOption.familyId,
      requestedGrade,
      problemCount,
      manipulation: activityOption.manipulation,
      ...(problemParameters === undefined ? {} : { problemParameters }),
      ...(teacherIntent === undefined ? {} : { teacherIntent })
    });
    await appendTeacherInputLog(teacherInputLogPath, {
      at: new Date().toISOString(),
      unitId,
      standardCode,
      activityId,
      learningNeedId,
      problemCount,
      contextNote,
      ...(problemParameters === undefined ? {} : { problemParameters }),
      ...(teacherIntent === undefined ? {} : { teacherIntent }),
      supported: result.supported
    });
    if (
      !result.supported ||
      !result.draftId ||
      !result.activitySpecHash ||
      result.recommendation.standardCode !== standard.standardCode
    ) {
      error(
        response,
        422,
        "recommendation_unavailable",
        result.recommendation.blockingReasons[0] ?? "지금 조건에 맞는 활동을 찾지 못했어요.",
        ["다른 활동 초점을 골라 보세요.", "학생이 실제로 보이는 어려움과 가장 가까운 항목을 골라 보세요."]
      );
      return;
    }
    const activity = toPublicActivity(result, {
      grade: requestedGrade,
      problemCount,
      unitTitle: `${unit.semester}학기 ${unit.unitNumber}. ${unit.title}`,
      standardCode: standard.standardCode,
      activityId: activityOption.id,
      activityLabel: activityOption.label,
      manipulation: activityOption.manipulation,
      learningNeedLabel: learningNeed.label,
      contextNote,
      ...(problemParameters === undefined ? {} : { problemParameters }),
      ...(teacherIntent === undefined ? {} : { teacherIntent })
    });
    sessions.addCard(session, {
      activity,
      draftId: result.draftId,
      activitySpecHash: result.activitySpecHash,
      previewed: false
    });
    json(response, 201, {
      card: {
        cardId: activity.cardId,
        title: activity.title,
        gradeLabel: activity.gradeLabel,
        problemCount: activity.problemCount,
        unitTitle: activity.unitTitle,
        standardCode: activity.standardCode,
        activityLabel: activity.activityLabel,
        learningNeedLabel: activity.learningNeedLabel,
        learningGoal: activity.learningGoal,
        summary: activity.summary
      }
    });
    return;
  }

  // 승인 토큰을 발급하고 previewed 상태를 바꾸므로 GET이 아니라 POST다.
  // POST여야 위쪽 requireMutationGuards(CSRF 헤더 + Origin 검사)를 함께 통과한다.
  const previewMatch = url.pathname.match(/^\/api\/recommendations\/([^/]+)$/);
  if (request.method === "POST" && previewMatch) {
    const cardId = previewMatch[1];
    const card = cardId ? session.cards.get(cardId) : undefined;
    if (!card) {
      error(response, 404, "card_expired", "추천 내용을 다시 불러올 수 없어요. 같은 조건으로 다시 추천받아 주세요.");
      return;
    }
    card.previewed = true;
    const approvalToken = sessions.issueApproval(session, card.activity.cardId);
    json(response, 200, { activity: card.activity, approvalToken });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/creations") {
    const body = await readJsonBody(request);
    const cardId = typeof body.cardId === "string" ? body.cardId : "";
    const approvalToken = typeof body.approvalToken === "string" ? body.approvalToken : "";
    const card = session.cards.get(cardId);
    const approval = session.approvals.get(approvalToken);
    const now = Date.now();
    if (
      !card ||
      !card.previewed ||
      !approval ||
      approval.cardId !== cardId ||
      approval.consumed ||
      now - approval.createdAt > APPROVAL_TTL_MS
    ) {
      error(response, 403, "approval_required", "내용을 다시 확인한 뒤 만들기를 눌러 주세요.");
      return;
    }
    const currentRuntime = getRuntime();
    if (!currentRuntime) {
      error(response, 409, "busy", "다른 MathCanvas 작업이 끝난 뒤 다시 시도해 주세요.");
      return;
    }
    approval.consumed = true;
    const creation = sessions.createCreation(session, "활동을 만들 준비를 하고 있어요.");
    void currentRuntime.service
      .createNewProject({
        draftId: card.draftId,
        activitySpecHash: card.activitySpecHash,
        teacherConfirmed: true
      })
      .then((result) => {
        creation.status = result.status === "succeeded" ? "succeeded" : "failed";
        // 실패 원인별 안내를 하나로 뭉개지 않는다. 로그인이 풀린 것과
        // 권한이 없는 것은 교사가 해야 할 일이 서로 다르다.
        creation.message =
          creation.status === "succeeded"
            ? "새 활동을 만들었습니다. MathCanvas에서 바로 확인해 보세요."
            : describeCreationFailure(result.errorCode);
        if (isAllowedEditorUrl(result.editorUrl)) creation.editorUrl = result.editorUrl;
      })
      .catch(() => {
        creation.status = "failed";
        creation.message = "활동을 만들다가 문제가 생겼어요. 기존 활동은 바뀌지 않았습니다.";
      });
    json(response, 202, publicCreation(creation) as unknown as Record<string, unknown>);
    return;
  }

  const creationMatch = url.pathname.match(/^\/api\/creations\/([^/]+)$/);
  if (request.method === "GET" && creationMatch) {
    const creationId = creationMatch[1];
    const creation = creationId ? session.creations.get(creationId) : undefined;
    if (!creation) {
      error(response, 404, "creation_missing", "생성 상태를 찾지 못했어요. 새 활동이 생겼는지 MathCanvas에서 확인해 주세요.");
      return;
    }
    json(response, 200, publicCreation(creation) as unknown as Record<string, unknown>);
    return;
  }

  error(response, 404, "not_found", "요청한 화면을 찾지 못했습니다.");
}

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

async function serveStatic(response: ServerResponse, pathname: string): Promise<void> {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(staticDirectory, safePath);
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "cache-control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable"
    });
    response.end(body);
  } catch {
    filePath = join(staticDirectory, "index.html");
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(await readFile(filePath));
  }
}

const server = createServer(async (request, response) => {
  response.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "no-referrer");
  try {
    const host = request.headers.host;
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const url = new URL(request.url ?? "/", `http://${host}`);
    let session = getSession(request);
    if (
      !session &&
      !bootKeyUsed &&
      url.pathname === "/" &&
      url.searchParams.get("k") === bootKey
    ) {
      bootKeyUsed = true;
      session = sessions.create();
      response.writeHead(303, {
        location: "/",
        "set-cookie": `${cookieName}=${encodeURIComponent(session.id)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
      });
      response.end();
      return;
    }
    if (!session) {
      if (url.pathname.startsWith("/api/")) {
        error(response, 401, "session_required", "수업 준비 책상을 다시 열어 주세요.");
      } else {
        response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        response.end("수업 준비 책상을 실행한 창에서 접속해 주세요.");
      }
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url, session);
    } else {
      await serveStatic(response, url.pathname);
    }
  } catch (caught) {
    const message = caught instanceof Error && caught.message === "body-too-large"
      ? "입력 내용이 너무 깁니다. 조금 줄여 주세요."
      : "잠시 문제가 생겼어요. 다시 시도해 주세요.";
    error(response, 500, "unexpected", message);
  }
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("teacher-ui-port-unavailable");
  port = address.port;
  const url = `http://127.0.0.1:${port}/?k=${bootKey}`;
  process.stdout.write(`MathCanvas 수업 준비 책상: ${url}\n`);
  if (process.env.MATHCANVAS_UI_NO_OPEN !== "1") {
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    spawn(opener, args, { detached: true, stdio: "ignore" }).unref();
  }
});

async function shutdown(): Promise<void> {
  await runtime?.dispose();
  server.close(() => process.exit(0));
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
