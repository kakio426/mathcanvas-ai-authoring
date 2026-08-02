#!/usr/bin/env node
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuthoringRuntime,
  InstanceLockBusyError,
  type AuthoringRuntime,
  type MathCanvasAuthoringService
} from "@mathcanvas/authoring-runtime";
import type {
  ApiErrorBody,
  CreationStatus,
  PublicActivity,
  SessionResponse
} from "../shared/contract.js";
import {
  APPROVAL_TTL_MS,
  TeacherSessionStore,
  type TeacherSession
} from "./session.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const staticDirectory = join(currentDirectory, "..", "web");
const repositoryRoot = normalize(join(currentDirectory, "..", "..", "..", ".."));
const sessions = new TeacherSessionStore();
const bootKey = randomBytes(32).toString("base64url");
let bootKeyUsed = false;
const cookieName = "mathcanvas_teacher";
const csrfHeader = "x-mathcanvas-ui";
let port = 0;
let runtime: AuthoringRuntime | undefined;
let loginProcess: ChildProcess | undefined;
let loginStarting = false;

const difficultyLabels = {
  easy: "기초",
  normal: "보통",
  hard: "도전"
} as const;

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
  fallback: { grade: number; problemCount: number; difficulty: "easy" | "normal" | "hard" }
): PublicActivity {
  const recommendation = result.recommendation;
  const learningGoal =
    recommendation.learningGoal ?? "수학적 관계를 직접 조작하고 근거를 설명하기";
  return {
    cardId: randomUUID(),
    title: result.activitySummary?.title ?? "MathCanvas 탐구 활동",
    gradeLabel: `${recommendation.recommendedGrade ?? fallback.grade}학년`,
    problemCount: recommendation.problemCount ?? fallback.problemCount,
    difficultyLabel:
      difficultyLabels[recommendation.difficulty ?? fallback.difficulty],
    learningGoal,
    summary:
      "학생이 답을 고르는 데서 끝나지 않고, 직접 조작한 결과로 처음 생각을 확인하고 그 이유를 설명하도록 구성했습니다.",
    studentInstructions: result.activitySummary?.studentInstructions ?? [],
    teacherChecks: [
      "학생이 조작하기 전에 자신의 판단과 그 까닭을 먼저 나타내는지 살펴보세요.",
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
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const requestedGrade = Number(body.requestedGrade);
    const problemCount = Number(body.problemCount);
    const difficulty = body.difficulty;
    if (
      prompt.length < 5 ||
      prompt.length > 1000 ||
      !Number.isInteger(requestedGrade) ||
      requestedGrade < 1 ||
      requestedGrade > 6 ||
      ![2, 4, 6].includes(problemCount) ||
      !["easy", "normal", "hard"].includes(String(difficulty))
    ) {
      error(response, 400, "invalid_lesson", "수업 내용과 세 가지 선택을 다시 확인해 주세요.");
      return;
    }
    const currentRuntime = getRuntime();
    if (!currentRuntime) {
      error(response, 409, "busy", "다른 MathCanvas 작업이 끝난 뒤 다시 추천받아 주세요.");
      return;
    }
    const typedDifficulty = difficulty as "easy" | "normal" | "hard";
    const result = currentRuntime.service.recommend({
      prompt,
      requestedGrade,
      problemCount,
      difficulty: typedDifficulty
    });
    if (!result.supported || !result.draftId || !result.activitySpecHash) {
      error(
        response,
        422,
        "recommendation_unavailable",
        result.recommendation.blockingReasons[0] ?? "지금 조건에 맞는 활동을 찾지 못했어요.",
        ["가르칠 수학 개념을 적어 주세요.", "학생이 자주 틀리는 생각을 함께 적어 주세요.", "한 번에 한 가지 학습 목표만 적어 주세요."]
      );
      return;
    }
    const activity = toPublicActivity(result, {
      grade: requestedGrade,
      problemCount,
      difficulty: typedDifficulty
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
        difficultyLabel: activity.difficultyLabel,
        learningGoal: activity.learningGoal,
        summary: activity.summary
      }
    });
    return;
  }

  const previewMatch = url.pathname.match(/^\/api\/recommendations\/([^/]+)$/);
  if (request.method === "GET" && previewMatch) {
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
        creation.message =
          creation.status === "succeeded"
            ? "새 활동을 만들었습니다. MathCanvas에서 바로 확인해 보세요."
            : "활동을 만들지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.";
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
        "set-cookie": `${cookieName}=${encodeURIComponent(session.id)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`
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
