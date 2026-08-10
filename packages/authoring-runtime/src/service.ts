import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  createApprovalReceipt,
  generationRequestSchema,
  recommendationSchema,
  resolvedActivitySchema,
  sha256Hex,
  verifyApprovalReceipt,
  type Recommendation,
  type ResolvedActivity,
  type TeacherIntent
} from "@mathcanvas/contracts";
import {
  CreationJobStore,
  type MathCanvasBrowserRuntime,
  type QueuedCreation,
  type StoredCreationJob
} from "@mathcanvas/managed-browser";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import {
  buildRegisteredAppliedTeacherIntent,
  buildRegisteredProblemPreviews,
  buildRegisteredTeacherAnswerKey,
  getRegisteredBlueprintContentHash,
  prepareRegisteredActivity,
  projectRegisteredApprovalView
} from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";
import { WorksheetV2AuthoringRuntime } from "./worksheet-v2.js";

interface Draft {
  draftSchemaVersion: 3;
  draftId: string;
  resolved: ResolvedActivity;
  binding: ResolvedActivity["binding"];
  recommendation: Recommendation;
  activitySpecHash: string;
  createdAt: string;
  expiresAt: string;
  jobId?: string;
  payloadHash?: string;
}

export interface TeacherAnswer {
  problemNumber: number;
  answer: string;
  explanation: string;
}

export interface ProblemPreview {
  problemNumber: number;
  statements: string[];
  statementSource: "learner-instructions" | "answer-explanation";
}

export interface RecommendationSummary {
  supported: boolean;
  templateId?: string;
  recommendedGrade?: number;
  standardCode?: string;
  learningGoal?: string;
  problemCount?: number;
  difficulty?: "easy" | "normal" | "hard";
  denominatorRelation?: NonNullable<
    Recommendation["denominatorRelation"]
  >;
  manipulation?: NonNullable<Recommendation["manipulation"]>;
  teacherIntent?: TeacherIntent;
  rationale: string[];
  caveats: string[];
  blockingReasons: string[];
  unsupportedRequests?: string[];
  t0Proposal?: NonNullable<Recommendation["t0Proposal"]>;
  sources?: Array<{
    title: string;
    url: string;
    version: string;
  }>;
}

function summarizeRecommendation(
  recommendation: Recommendation
): RecommendationSummary {
  return {
    supported: recommendation.supported,
    ...(recommendation.templateId === undefined
      ? {}
      : { templateId: recommendation.templateId }),
    ...(recommendation.recommendedGrade === undefined
      ? {}
      : { recommendedGrade: recommendation.recommendedGrade }),
    ...(recommendation.standardCode === undefined
      ? {}
      : { standardCode: recommendation.standardCode }),
    ...(recommendation.learningGoal === undefined
      ? {}
      : { learningGoal: recommendation.learningGoal }),
    ...(recommendation.problemCount === undefined
      ? {}
      : { problemCount: recommendation.problemCount }),
    ...(recommendation.difficulty === undefined
      ? {}
      : { difficulty: recommendation.difficulty }),
    ...(recommendation.denominatorRelation === undefined
      ? {}
      : {
          denominatorRelation:
            recommendation.denominatorRelation
        }),
    ...(recommendation.manipulation === undefined
      ? {}
      : { manipulation: recommendation.manipulation }),
    ...(recommendation.teacherIntent === undefined
      ? {}
      : { teacherIntent: recommendation.teacherIntent }),
    rationale: recommendation.rationale,
    caveats: recommendation.caveats,
    blockingReasons: recommendation.blockingReasons,
    ...(recommendation.unsupportedRequests === undefined
      ? {}
      : {
          unsupportedRequests:
            recommendation.unsupportedRequests
        }),
    ...(recommendation.t0Proposal === undefined
      ? {}
      : { t0Proposal: recommendation.t0Proposal }),
    ...(recommendation.curriculum
      ? {
          sources: [
            recommendation.curriculum.officialSource,
            ...recommendation.curriculum.auxiliarySources
          ].map((source) => ({
            title: source.title,
            url: source.url,
            version: source.version
          }))
        }
      : {})
  };
}

const learnerInstructionRoles = [
  "instruction-predict",
  "instruction-verify",
  "instruction-explain"
] as const;

export function projectLearnerFacingInstructions(
  resolved: ResolvedActivity
): string[] {
  const itemScopedInstructions = resolved.emissions.filter(
    (emission) =>
      emission.itemId !== undefined &&
      learnerInstructionRoles.some((role) => role === emission.role)
  );
  if (itemScopedInstructions.length === 0) return resolved.instructions;
  if (resolved.items.length !== 1) {
    throw new AuthoringServiceError(
      "validation-failed",
      "문항별 학생 안내 문구를 하나의 추천 요약으로 확정할 수 없어 생성하지 않았습니다."
    );
  }
  const itemId = resolved.items[0]?.id;
  if (!itemId) {
    throw new AuthoringServiceError(
      "validation-failed",
      "학생 안내 문구의 문항을 확인할 수 없어 생성하지 않았습니다."
    );
  }
  if (
    itemScopedInstructions.length !== learnerInstructionRoles.length ||
    itemScopedInstructions.some((emission) => emission.itemId !== itemId)
  ) {
    throw new AuthoringServiceError(
      "validation-failed",
      "선택된 한 문항의 학생 안내 세 역할만 확정할 수 없어 생성하지 않았습니다."
    );
  }
  const instructions = learnerInstructionRoles.map((role) => {
    const matches = resolved.emissions.filter(
      (emission) => emission.itemId === itemId && emission.role === role
    );
    const text = matches[0]?.toolIntent.properties.text;
    if (
      matches.length !== 1 ||
      typeof text !== "string" ||
      text.trim().length === 0
    ) {
      throw new AuthoringServiceError(
        "validation-failed",
        `학생 안내 문구 ${role}가 누락되거나 중복되어 생성하지 않았습니다.`
      );
    }
    return text.trim();
  });
  return instructions;
}

export function projectProblemPreviews(
  resolved: ResolvedActivity,
  answerKey: readonly TeacherAnswer[]
): ProblemPreview[] {
  const registeredPreviews = buildRegisteredProblemPreviews(resolved);
  if (registeredPreviews) {
    const expectedProblemNumbers = [...resolved.items]
      .sort((left, right) => left.order - right.order)
      .map((item) => item.order);
    if (
      registeredPreviews.length !== resolved.items.length ||
      registeredPreviews.some(
        (preview, index) =>
          preview.problemNumber !== expectedProblemNumbers[index] ||
          preview.statements.length === 0 ||
          preview.statements.some((statement) => statement.trim().length === 0)
      )
    ) {
      throw new AuthoringServiceError(
        "validation-failed",
        "등록된 실제 문항 미리보기가 완전하지 않아 생성하지 않았습니다."
      );
    }
    return registeredPreviews.map((preview) => ({
      problemNumber: preview.problemNumber,
      statements: [...preview.statements],
      statementSource: "learner-instructions"
    }));
  }
  const answerByProblemNumber = new Map(
    answerKey.map((answer) => [answer.problemNumber, answer])
  );
  return [...resolved.items]
    .sort((left, right) => left.order - right.order)
    .map((item) => {
      const statements = learnerInstructionRoles.map((role) => {
        const matches = resolved.emissions.filter(
          (emission) => emission.itemId === item.id && emission.role === role
        );
        const text = matches[0]?.toolIntent.properties.text;
        return matches.length === 1 &&
          typeof text === "string" &&
          text.trim().length > 0
          ? text.trim()
          : undefined;
      });
      if (statements.every((statement) => statement !== undefined)) {
        return {
          problemNumber: item.order,
          statements,
          statementSource: "learner-instructions" as const
        };
      }

      const answer = answerByProblemNumber.get(item.order);
      if (!answer || answer.explanation.trim().length === 0) {
        throw new AuthoringServiceError(
          "validation-failed",
          `${item.order}번 문항의 미리보기 문구를 확인할 수 없어 생성하지 않았습니다.`
        );
      }
      return {
        problemNumber: item.order,
        statements: [answer.explanation.trim()],
        statementSource: "answer-explanation" as const
      };
    });
}

export function projectAppliedTeacherIntent(
  resolved: ResolvedActivity
): TeacherIntent | undefined {
  try {
    return buildRegisteredAppliedTeacherIntent(resolved);
  } catch {
    throw new AuthoringServiceError(
      "validation-failed",
      "요청한 첫 문항 조건과 실제 생성값이 달라 안전하게 멈췄습니다. 조건을 다시 확인해 주세요."
    );
  }
}

/**
 * 생성 실패 코드별 사용자 안내 문구의 단일 원본이다.
 * MCP 응답과 교사용 화면이 같은 문구를 쓰도록 여기서만 관리한다.
 * 새 실패 코드를 만들면 이 표에도 함께 추가한다.
 */
export const CREATION_FAILURE_MESSAGES: Readonly<Record<string, string>> = {
  "login-required":
    "MathCanvas 로그인이 풀렸어요. 전용 창에서 다시 로그인한 뒤 새로 추천받아 주세요.",
  "auth-required":
    "MathCanvas 로그인이 풀렸어요. 전용 창에서 다시 로그인한 뒤 새로 추천받아 주세요.",
  "mathcanvas-tab-missing":
    "MathCanvas 전용 창에서 ‘내 캔버스’를 연 뒤 새로 추천받아 주세요.",
  "browser-launch-failed":
    "Chrome을 열지 못했어요. Chrome 설치 상태와 다른 MathCanvas 전용 창이 열려 있는지 확인해 주세요.",
  "contract-mismatch":
    "MathCanvas 연결 방식이 바뀌어 안전하게 멈췄어요. 도구를 업데이트해 주세요.",
  "contract-probe-unavailable":
    "생성 전 확인 절차를 마치지 못해 안전하게 멈췄어요. 잠시 뒤 다시 시도해 주세요.",
  "permission-denied":
    "지금 로그인한 MathCanvas 계정에 새 활동을 만들 권한이 있는지 확인해 주세요.",
  "mathcanvas-unavailable":
    "MathCanvas에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  "payload-hash-mismatch":
    "확인하신 내용과 만들려던 활동이 달라 안전하게 멈췄어요. 내용을 다시 확인해 주세요.",
  "project-create-failed":
    "MathCanvas에서 새 활동을 만들지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요."
};

export function describeCreationFailure(
  errorCode: string | undefined
): string {
  return (
    (errorCode === undefined
      ? undefined
      : CREATION_FAILURE_MESSAGES[errorCode]) ??
    "활동을 만들지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요."
  );
}

const retryableCreationErrors = new Set([
  "login-required",
  "auth-required",
  "contract-probe-unavailable",
  "browser-launch-failed",
  "mathcanvas-unavailable",
  "project-create-failed"
]);

export interface AuthoringClock {
  now(): Date;
}

const systemClock: AuthoringClock = { now: () => new Date() };
const MAX_STORED_DRAFTS = 100;

export interface AuthoringServiceOptions {
  draftSnapshotPath?: string;
}

export class AuthoringServiceError extends Error {
  public constructor(
    public readonly code:
      | "draft-not-found"
      | "draft-expired"
      | "draft-schema-expired"
      | "approval-required"
      | "activity-spec-changed"
      | "validation-failed"
      | "unsupported-request"
      | "teacher-intent-confirmation-required",
    message: string
  ) {
    super(message);
    this.name = "AuthoringServiceError";
  }
}

export class MathCanvasAuthoringService {
  readonly #drafts = new Map<string, Draft>();
  readonly #draftSnapshotPath: string | undefined;
  public readonly worksheetV2: WorksheetV2AuthoringRuntime;

  public constructor(
    public readonly browserRuntime: MathCanvasBrowserRuntime,
    public readonly jobStore: CreationJobStore,
    private readonly clock: AuthoringClock = systemClock,
    options: AuthoringServiceOptions = {}
  ) {
    this.#draftSnapshotPath = options.draftSnapshotPath;
    this.worksheetV2 = new WorksheetV2AuthoringRuntime({
      now: () => this.clock.now()
    });
    if (!this.#draftSnapshotPath || !existsSync(this.#draftSnapshotPath)) {
      return;
    }
    const snapshot = JSON.parse(
      readFileSync(this.#draftSnapshotPath, "utf8")
    ) as unknown;
    if (
      typeof snapshot !== "object" ||
      snapshot === null ||
      !("version" in snapshot) ||
      snapshot.version !== 3 ||
      !("drafts" in snapshot) ||
      !Array.isArray(snapshot.drafts)
    ) {
      if (
        typeof snapshot === "object" &&
        snapshot !== null &&
        "version" in snapshot &&
        (snapshot.version === 1 || snapshot.version === 2)
      ) {
        throw new AuthoringServiceError(
          "draft-schema-expired",
          "이전 추천안 형식은 만료되었습니다. 새 추천을 받아 주세요."
        );
      }
      throw new Error("저장된 추천안 파일 형식이 올바르지 않습니다.");
    }
    for (const item of snapshot.drafts) {
      if (typeof item !== "object" || item === null) {
        throw new Error("저장된 추천안 항목이 올바르지 않습니다.");
      }
      const record = item as Record<string, unknown>;
      const draftId = record.draftId;
      const activitySpecHash = record.activitySpecHash;
      const createdAt = record.createdAt;
      const expiresAt = record.expiresAt;
      const jobId = record.jobId;
      const payloadHash = record.payloadHash;
      const draftSchemaVersion = record.draftSchemaVersion;
      const resolved = resolvedActivitySchema.parse(record.resolved);
      const binding = record.binding;
      const spec = projectRegisteredApprovalView(resolved);
      const recommendation = recommendationSchema.parse(record.recommendation);
      if (
        draftSchemaVersion !== 3 ||
        typeof draftId !== "string" ||
        !/^draft-[A-Za-z0-9-]+$/.test(draftId) ||
        typeof activitySpecHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(activitySpecHash) ||
        sha256Hex(spec) !== activitySpecHash ||
        sha256Hex(recommendation) !==
          sha256Hex(resolved.recommendationSnapshot) ||
        sha256Hex(binding) !== sha256Hex(resolved.binding) ||
        typeof createdAt !== "string" ||
        Number.isNaN(Date.parse(createdAt)) ||
        typeof expiresAt !== "string" ||
        Number.isNaN(Date.parse(expiresAt)) ||
        Date.parse(expiresAt) <= Date.parse(createdAt) ||
        (jobId !== undefined &&
          (typeof jobId !== "string" ||
            !/^job-[A-Za-z0-9-]+$/.test(jobId))) ||
        (payloadHash !== undefined &&
          (typeof payloadHash !== "string" ||
            !/^[a-f0-9]{64}$/.test(payloadHash))) ||
        (jobId === undefined) !== (payloadHash === undefined)
      ) {
        throw new Error(`저장된 추천안 ${String(draftId)}가 올바르지 않습니다.`);
      }
      this.#drafts.set(draftId, {
        draftSchemaVersion: 3,
        draftId,
        resolved,
        binding: resolved.binding,
        recommendation,
        activitySpecHash,
        createdAt,
        expiresAt,
        ...(typeof jobId === "string" ? { jobId } : {}),
        ...(typeof payloadHash === "string" ? { payloadHash } : {})
      });
    }
  }

  #persistDrafts(): void {
    if (!this.#draftSnapshotPath) return;
    const directory = dirname(this.#draftSnapshotPath);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.#draftSnapshotPath}.tmp`;
    writeFileSync(
      temporaryPath,
      `${JSON.stringify({
        version: 3,
        drafts: [...this.#drafts.values()]
      })}\n`,
      { encoding: "utf8", mode: 0o600 }
    );
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, this.#draftSnapshotPath);
    chmodSync(this.#draftSnapshotPath, 0o600);
  }

  public async openWorkspace(): Promise<{
    state:
      | "browser-launch-failed"
      | "login-required"
      | "contract-mismatch"
      | "ready";
    ready: boolean;
    message: string;
    checkedAt?: string;
    currentUrl?: string;
    detailCode?: string;
  }> {
    const connection = await this.browserRuntime.openWorkspace();
    if (connection.state === "login-required") {
      await this.browserRuntime.close();
    }
    return this.#connectionSummary(connection);
  }

  public async checkConnection(): Promise<{
    state:
      | "browser-launch-failed"
      | "login-required"
      | "contract-mismatch"
      | "ready";
    ready: boolean;
    message: string;
    checkedAt?: string;
    currentUrl?: string;
    detailCode?: string;
  }> {
    const connection = await this.browserRuntime.checkConnection({
      forceContractCheck: true,
      bringToFront: false
    });
    if (connection.state === "login-required") {
      await this.browserRuntime.close();
    }
    return this.#connectionSummary(connection);
  }

  #connectionSummary(connection: Awaited<
    ReturnType<MathCanvasBrowserRuntime["checkConnection"]>
  >): {
    state:
      | "browser-launch-failed"
      | "login-required"
      | "contract-mismatch"
      | "ready";
    ready: boolean;
    message: string;
    checkedAt: string;
    currentUrl?: string;
    detailCode?: string;
  } {
    const messages: Record<typeof connection.state, string> = {
      "browser-launch-failed":
        "Chrome을 열지 못했습니다. Chrome 설치 상태와 다른 MathCanvas 전용 창이 실행 중인지 확인해 주세요.",
      "login-required":
        "프로젝트 폴더에서 `pnpm mathcanvas:login`을 실행하고 전용 Chrome에서 로그인한 뒤 ‘내 캔버스’까지 이동해 주세요.",
      "contract-mismatch":
        "MathCanvas 연결 방식이 현재 버전과 달라졌습니다. 생성하지 않고 안전하게 멈췄어요.",
      ready: "MathCanvas에 연결되었어요. 새 활동지를 만들 준비가 됐습니다."
    };
    return {
      state: connection.state,
      ready: connection.ready,
      message: messages[connection.state],
      checkedAt: connection.checkedAt,
      ...(connection.currentUrl
        ? { currentUrl: connection.currentUrl }
        : {}),
      ...(connection.detailCode
        ? { detailCode: connection.detailCode }
        : {})
    };
  }

  public recommend(input: {
    prompt: string;
    requestedStandardCode?: string;
    requestedGrade?: number;
    problemCount?: number;
    difficulty?: "easy" | "normal" | "hard";
    denominatorRelation?: NonNullable<
      Recommendation["denominatorRelation"]
    >;
    manipulation?: NonNullable<Recommendation["manipulation"]>;
    teacherIntent?: TeacherIntent;
  }): {
    supported: boolean;
    recommendation: RecommendationSummary;
    draftId?: string;
    activitySpecHash?: string;
    expiresAt?: string;
    activitySummary?: {
      title: string;
      studentInstructions: string[];
      problemPreviews: ProblemPreview[];
      appliedTeacherIntent?: TeacherIntent;
      minimumVisualDifferencePercent?: number;
    };
    teacherAnswerKey?: TeacherAnswer[];
    approvalPrompt?: string;
  } {
    const now = this.clock.now();
    for (const [storedDraftId, storedDraft] of this.#drafts) {
      if (Date.parse(storedDraft.expiresAt) <= now.getTime()) {
        this.#drafts.delete(storedDraftId);
      }
    }
    while (this.#drafts.size >= MAX_STORED_DRAFTS) {
      const oldest = [...this.#drafts.values()].sort(
        (left, right) =>
          Date.parse(left.createdAt) - Date.parse(right.createdAt)
      )[0];
      if (!oldest) break;
      this.#drafts.delete(oldest.draftId);
    }
    const request = generationRequestSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: `request-${randomUUID()}`,
      prompt: input.prompt,
      ...(input.requestedStandardCode === undefined
        ? {}
        : { requestedStandardCode: input.requestedStandardCode }),
      ...(input.requestedGrade === undefined
        ? {}
        : { requestedGrade: input.requestedGrade }),
      ...(input.problemCount === undefined
        ? {}
        : { problemCount: input.problemCount }),
      ...(input.difficulty === undefined
        ? {}
        : { difficulty: input.difficulty }),
      ...(input.denominatorRelation === undefined
        ? {}
        : {
            denominatorRelation:
              input.denominatorRelation
          }),
      ...(input.manipulation === undefined
        ? {}
        : { manipulation: input.manipulation }),
      ...(input.teacherIntent === undefined
        ? {}
        : { teacherIntent: input.teacherIntent }),
      createdAt: now.toISOString()
    });
    const recommendation = recommendActivity(request);
    if (!recommendation.supported) {
      return {
        supported: false,
        recommendation: summarizeRecommendation(recommendation)
      };
    }

    const draftId = `draft-${randomUUID()}`;
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    const plan = prepareRegisteredActivity(recommendation, {
      seed: request.requestId,
      generatedAt: now.toISOString(),
      activityId: `activity-${randomUUID()}`
    });
    const resolved = resolveActivity(plan);
    const spec = projectRegisteredApprovalView(resolved);
    const activitySpecHash = sha256Hex(spec);
    const teacherAnswerKey = buildRegisteredTeacherAnswerKey(resolved);
    const problemPreviews = projectProblemPreviews(resolved, teacherAnswerKey);
    const appliedTeacherIntent = projectAppliedTeacherIntent(resolved);
    this.#drafts.set(draftId, {
      draftSchemaVersion: 3,
      draftId,
      resolved,
      binding: resolved.binding,
      recommendation,
      activitySpecHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    this.#persistDrafts();
    return {
      supported: true,
      recommendation: summarizeRecommendation(recommendation),
      draftId,
      activitySpecHash,
      expiresAt: expiresAt.toISOString(),
      activitySummary: {
        title: resolved.title,
        studentInstructions: projectLearnerFacingInstructions(resolved),
        problemPreviews,
        ...(appliedTeacherIntent === undefined
          ? {}
          : { appliedTeacherIntent }),
        ...(recommendation.denominatorRelation === undefined
          ? {}
          : {
              minimumVisualDifferencePercent:
                MIN_VISUAL_FRACTION_DIFFERENCE_RATIO * 100
            })
      },
      teacherAnswerKey,
      approvalPrompt:
        "추천한 학년, 문제 수, 난이도와 조작 방식을 확인한 뒤 ‘이대로 만들어줘’라고 승인해 주세요."
    };
  }

  public async createNewProject(input: {
    draftId: string;
    activitySpecHash: string;
    teacherConfirmed: boolean;
  }): Promise<{
    jobId: string;
    status: string;
    activitySpecHash: string;
    payloadHash: string;
    expiresAt: string;
    validation: ReturnType<typeof validateForCreation>;
    teacherAnswerKey: TeacherAnswer[];
    message: string;
    projectId?: string;
    editorUrl?: string;
    errorCode?: string;
  }> {
    if (!input.teacherConfirmed) {
      throw new AuthoringServiceError(
        "approval-required",
        "교사가 추천안을 명시적으로 승인한 뒤에만 만들 수 있습니다."
      );
    }
    const draft = this.#drafts.get(input.draftId);
    if (!draft) {
      throw new AuthoringServiceError(
        "draft-not-found",
        "추천안을 찾지 못했습니다. 다시 추천을 받아 주세요."
      );
    }
    const now = this.clock.now();
    const canonicalResolved = resolveActivity(
      prepareRegisteredActivity(draft.recommendation, {
        seed: draft.binding.seed,
        generatedAt: draft.resolved.provenance.generatedAt,
        activityId: draft.resolved.id
      })
    );
    const canonicalBinding = canonicalResolved.binding;
    if (Date.parse(draft.expiresAt) <= now.getTime()) {
      this.#drafts.delete(input.draftId);
      this.#persistDrafts();
      throw new AuthoringServiceError(
        "draft-expired",
        "추천안 확인 시간이 지났습니다. 같은 조건으로 다시 추천을 받아 주세요."
      );
    }
    if (
      input.activitySpecHash !== draft.activitySpecHash ||
      sha256Hex(
        projectRegisteredApprovalView(draft.resolved)
      ) !== draft.activitySpecHash ||
      sha256Hex(draft.binding) !==
        sha256Hex(draft.resolved.binding) ||
      sha256Hex(draft.binding) !==
        sha256Hex(canonicalBinding) ||
      sha256Hex(draft.resolved) !==
        sha256Hex(canonicalResolved) ||
      draft.binding.blueprintContentHash !==
        getRegisteredBlueprintContentHash(
          draft.binding.blueprintId
        )
    ) {
      throw new AuthoringServiceError(
        "activity-spec-changed",
        "교사가 확인한 추천안과 만들려는 활동이 다릅니다."
      );
    }
    if (draft.jobId) {
      const existing = this.jobStore.get(draft.jobId, now);
      if (!existing) {
        throw new Error("기존 생성 작업 상태를 찾지 못했습니다.");
      }
      if (!draft.payloadHash) {
        throw new Error("이미 등록한 작업의 payload 해시가 없습니다.");
      }
      if (
        existing.status === "failed" &&
        existing.result?.errorCode &&
        retryableCreationErrors.has(existing.result.errorCode)
      ) {
        delete draft.jobId;
        delete draft.payloadHash;
        this.#persistDrafts();
      } else {
        const recovered =
          existing.status === "queued" || existing.status === "creating"
            ? await this.#executeJob(existing, draft)
            : existing;
        return this.#creationSummary(
          recovered,
          draft,
          validateForCreation(
            draft.resolved,
            compileActivity(draft.resolved),
            now
          ),
          "같은 생성 요청의 기존 작업 결과를 확인했습니다."
        );
      }
    }

    const compiled = compileActivity(draft.resolved);
    const validation = validateForCreation(
      draft.resolved,
      compiled,
      now
    );
    if (!validation.canCreate) {
      throw new AuthoringServiceError(
        "validation-failed",
        `생성 전 검증을 통과하지 못했습니다: ${validation.issues
          .map((issue) => issue.message)
          .join(" ")}`
      );
    }
    const samePayload = this.jobStore.findByPayloadHash(
      compiled.payloadHash,
      now
    );
    if (samePayload) {
      draft.jobId = samePayload.job.jobId;
      draft.payloadHash = compiled.payloadHash;
      this.#persistDrafts();
      const recovered =
        samePayload.status === "queued" || samePayload.status === "creating"
          ? await this.#executeJob(samePayload, draft)
          : samePayload;
      return this.#creationSummary(
        recovered,
        draft,
        validation,
        "같은 활동의 기존 작업 결과를 확인했습니다."
      );
    }
    const approvalExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const approvalView =
      projectRegisteredApprovalView(draft.resolved);
    const approval = createApprovalReceipt(
      approvalView,
      now,
      approvalExpiresAt
    );
    if (!verifyApprovalReceipt(approvalView, approval, now)) {
      throw new Error("승인 무결성 검증에 실패했습니다.");
    }
    const jobId = `job-${randomUUID()}`;
    const job: QueuedCreation = {
      jobId,
      approvalHash: approval.approvalHash,
      payloadHash: compiled.payloadHash,
      createdAt: now.toISOString(),
      expiresAt: approvalExpiresAt.toISOString(),
      compiledProject: compiled,
      validationReport: validation
    };
    const stored = this.jobStore.enqueue(job, now);
    draft.jobId = jobId;
    draft.payloadHash = compiled.payloadHash;
    this.#persistDrafts();
    const completed = await this.#executeJob(stored, draft);
    return this.#creationSummary(
      completed,
      draft,
      validation,
      completed.status === "succeeded"
        ? "새 활동지를 만들고 편집 링크를 준비했습니다."
        : "새 활동지를 만들지 못했습니다. 오류 안내를 확인해 주세요."
    );
  }

  async #executeJob(
    stored: StoredCreationJob,
    draft: Draft
  ): Promise<StoredCreationJob> {
    const canonicalCompiled = compileActivity(draft.resolved);
    const currentValidation = validateForCreation(
      draft.resolved,
      canonicalCompiled,
      this.clock.now()
    );
    if (
      !currentValidation.canCreate ||
      stored.job.payloadHash !== canonicalCompiled.payloadHash ||
      sha256Hex(stored.job.compiledProject) !==
        sha256Hex(canonicalCompiled) ||
      stored.job.validationReport.compiledPayloadHash !==
        canonicalCompiled.payloadHash
    ) {
      throw new AuthoringServiceError(
        "validation-failed",
        "저장된 생성 작업이 현재 검증된 활동과 달라 안전하게 중단했습니다."
      );
    }
    const marked = this.jobStore.markCreating(
      stored.job.jobId,
      this.clock.now()
    );
    if (marked.status === "expired") return marked;
    const result = await this.browserRuntime.createProject(
      marked.job.compiledProject.payload,
      marked.job.payloadHash
    );
    return this.jobStore.complete(marked.job.jobId, result);
  }

  #creationSummary(
    stored: StoredCreationJob,
    draft: Draft,
    validation: ReturnType<typeof validateForCreation>,
    message: string
  ): {
    jobId: string;
    status: string;
    activitySpecHash: string;
    payloadHash: string;
    expiresAt: string;
    validation: ReturnType<typeof validateForCreation>;
    teacherAnswerKey: TeacherAnswer[];
    message: string;
    projectId?: string;
    editorUrl?: string;
    errorCode?: string;
  } {
    return {
      jobId: stored.job.jobId,
      status: stored.status,
      activitySpecHash: draft.activitySpecHash,
      payloadHash: stored.job.payloadHash,
      expiresAt: stored.job.expiresAt,
      validation,
      teacherAnswerKey: buildRegisteredTeacherAnswerKey(draft.resolved),
      message,
      ...(stored.result?.projectId
        ? { projectId: stored.result.projectId }
        : {}),
      ...(stored.result?.editorUrl
        ? { editorUrl: stored.result.editorUrl }
        : {}),
      ...(stored.result?.errorCode
        ? { errorCode: stored.result.errorCode }
        : {})
    };
  }

  public getJobStatus(jobId: string): {
    found: boolean;
    jobId: string;
    status?: string;
    projectId?: string;
    editorUrl?: string;
    errorCode?: string;
    message: string;
  } {
    const status = this.jobStore.get(jobId, this.clock.now());
    if (!status) {
      return {
        found: false,
        jobId,
        message: "생성 작업을 찾지 못했습니다."
      };
    }
    const messages: Record<typeof status.status, string> = {
      queued: "MathCanvas 전용 Chrome을 준비하고 있어요.",
      creating: "MathCanvas에 새 활동지를 만들고 있어요.",
      succeeded: "새 활동지를 만들고 편집 링크를 준비했어요.",
      failed: "새 활동지를 만들지 못했습니다. 오류 안내를 확인해 주세요.",
      expired: "생성 요청 시간이 지나 안전하게 중단했습니다."
    };
    return {
      found: true,
      jobId,
      status: status.status,
      ...(status.result?.projectId
        ? { projectId: status.result.projectId }
        : {}),
      ...(status.result?.editorUrl
        ? { editorUrl: status.result.editorUrl }
        : {}),
      ...(status.result?.errorCode
        ? { errorCode: status.result.errorCode }
        : {}),
      message:
        status.status === "failed"
          ? describeCreationFailure(status.result?.errorCode)
          : messages[status.status]
    };
  }
}
