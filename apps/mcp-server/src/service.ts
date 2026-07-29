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
  activitySetHash,
  activitySetSpecSchema,
  canvasActivityHash,
  canvasActivitySpecSchema,
  createActivitySetApprovalReceipt,
  creationBatchSchema,
  generationRequestSchema,
  legacyActivitySpecSchema,
  recommendationSchema,
  verifyActivitySetApprovalReceipt,
  type ActivitySetSpec,
  type CanvasActivitySpec,
  type CreationBatch,
  type CreationBatchItem,
  type Recommendation,
  type ValidationReport
} from "@mathcanvas/contracts";
import {
  CreationJobStore,
  type MathCanvasBrowserRuntime,
  type QueuedCreation,
  type StoredCreationJob
} from "@mathcanvas/managed-browser";
import { compileCanvasActivitySpec } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import {
  generateFractionComparisonActivitySet,
  splitActivitySetIntoCanvases
} from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";

interface Draft {
  draftId: string;
  set: ActivitySetSpec;
  canvases: CanvasActivitySpec[];
  recommendation: Recommendation;
  setHash: string;
  createdAt: string;
  expiresAt: string;
  batch?: CreationBatch;
}

export interface TeacherAnswer {
  problemNumber: number;
  answer: string;
  explanation: string;
}

export interface RecommendationSummary {
  supported: boolean;
  recommendedGrade?: number;
  standardCode?: string;
  learningGoal?: string;
  problemCount?: number;
  difficulty?: "easy" | "normal" | "hard";
  manipulation?: "fraction-strip-common-start-drag";
  rationale: string[];
  caveats: string[];
  blockingReasons: string[];
  sources?: Array<{
    title: string;
    url: string;
    version: string;
  }>;
}

export interface BatchCanvasSummary {
  canvasIndex: number;
  problem: string;
  status: CreationBatchItem["status"];
  payloadHash: string;
  projectId?: string;
  editorUrl?: string;
  errorCode?: string;
}

function summarizeRecommendation(
  recommendation: Recommendation
): RecommendationSummary {
  return {
    supported: recommendation.supported,
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
    ...(recommendation.manipulation === undefined
      ? {}
      : { manipulation: recommendation.manipulation }),
    rationale: recommendation.rationale,
    caveats: recommendation.caveats,
    blockingReasons: recommendation.blockingReasons,
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

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function teacherAnswerKey(set: ActivitySetSpec): TeacherAnswer[] {
  return set.problems.map((problem) => {
    const commonDenominator =
      (problem.left.denominator * problem.right.denominator) /
      greatestCommonDivisor(
        problem.left.denominator,
        problem.right.denominator
      );
    const leftEquivalent =
      problem.left.numerator *
      (commonDenominator / problem.left.denominator);
    const rightEquivalent =
      problem.right.numerator *
      (commonDenominator / problem.right.denominator);
    return {
      problemNumber: problem.order,
      answer:
        `${problem.left.numerator}/${problem.left.denominator} ` +
        `${problem.correctRelation} ` +
        `${problem.right.numerator}/${problem.right.denominator}`,
      explanation:
        `통분하면 ${problem.left.numerator}/${problem.left.denominator}=` +
        `${leftEquivalent}/${commonDenominator}, ` +
        `${problem.right.numerator}/${problem.right.denominator}=` +
        `${rightEquivalent}/${commonDenominator}입니다. ` +
        `${leftEquivalent}${problem.correctRelation}${rightEquivalent}이므로 ` +
        `${problem.left.numerator}/${problem.left.denominator}` +
        `${problem.correctRelation}` +
        `${problem.right.numerator}/${problem.right.denominator}입니다. ` +
        problem.explanation
    };
  });
}

function fractionPair(canvas: CanvasActivitySpec): string {
  const { left, right } = canvas.problem;
  return (
    `${left.numerator}/${left.denominator} ? ` +
    `${right.numerator}/${right.denominator}`
  );
}

const retryableCreationErrors = new Set([
  "login-required",
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
      | "approval-required"
      | "activity-set-changed"
      | "validation-failed"
      | "unsupported-request",
    message: string
  ) {
    super(message);
    this.name = "AuthoringServiceError";
  }
}

export class MathCanvasAuthoringService {
  readonly #drafts = new Map<string, Draft>();
  readonly #activeCreations = new Map<string, Promise<void>>();
  readonly #draftSnapshotPath: string | undefined;

  public constructor(
    public readonly browserRuntime: MathCanvasBrowserRuntime,
    public readonly jobStore: CreationJobStore,
    private readonly clock: AuthoringClock = systemClock,
    options: AuthoringServiceOptions = {}
  ) {
    this.#draftSnapshotPath = options.draftSnapshotPath;
    this.#loadDrafts();
  }

  #loadDrafts(): void {
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
      (snapshot.version !== 1 && snapshot.version !== 2) ||
      !("drafts" in snapshot) ||
      !Array.isArray(snapshot.drafts)
    ) {
      throw new Error("저장된 추천안 파일 형식이 올바르지 않습니다.");
    }
    for (const item of snapshot.drafts) {
      if (typeof item !== "object" || item === null) {
        throw new Error("저장된 추천안 항목이 올바르지 않습니다.");
      }
      const record = item as Record<string, unknown>;
      const draftId = record.draftId;
      const createdAt = record.createdAt;
      const expiresAt = record.expiresAt;
      const recommendation = recommendationSchema.parse(record.recommendation);
      if (
        typeof draftId !== "string" ||
        !/^draft-[A-Za-z0-9-]+$/.test(draftId) ||
        typeof createdAt !== "string" ||
        Number.isNaN(Date.parse(createdAt)) ||
        typeof expiresAt !== "string" ||
        Number.isNaN(Date.parse(expiresAt)) ||
        Date.parse(expiresAt) <= Date.parse(createdAt)
      ) {
        throw new Error(`저장된 추천안 ${String(draftId)}가 올바르지 않습니다.`);
      }

      if (snapshot.version === 1) {
        const legacy = legacyActivitySpecSchema.parse(record.spec);
        const migrated = generateFractionComparisonActivitySet(
          recommendation,
          {
            seed: legacy.seed,
            generatedAt: legacy.provenance.generatedAt,
            setId: `set-migrated-${legacy.id}`.slice(0, 160)
          }
        );
        this.#drafts.set(draftId, {
          draftId,
          set: migrated,
          canvases: splitActivitySetIntoCanvases(migrated),
          recommendation,
          setHash: migrated.setHash,
          createdAt,
          expiresAt
        });
        continue;
      }

      const set = activitySetSpecSchema.parse(record.set);
      const canvases = Array.isArray(record.canvases)
        ? record.canvases.map((canvas) =>
            canvasActivitySpecSchema.parse(canvas)
          )
        : splitActivitySetIntoCanvases(set);
      const setHash = record.setHash;
      const batch =
        record.batch === undefined
          ? undefined
          : creationBatchSchema.parse(record.batch);
      if (
        typeof setHash !== "string" ||
        setHash !== set.setHash ||
        setHash !== activitySetHash(set) ||
        canvases.length !== set.problemCount ||
        canvases.some(
          (canvas, index) =>
            canvas.setHash !== setHash ||
            canvas.canvasIndex !== index + 1 ||
            canvasActivityHash(canvas) !== canvas.canvasHash
        ) ||
        (batch && batch.setHash !== setHash)
      ) {
        throw new Error(`저장된 추천안 ${draftId}가 올바르지 않습니다.`);
      }
      this.#drafts.set(draftId, {
        draftId,
        set,
        canvases,
        recommendation,
        setHash,
        createdAt,
        expiresAt,
        ...(batch ? { batch } : {})
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
        version: 2,
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
      bringToFront: true
    });
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
        "MathCanvas 전용 Chrome 창에서 로그인한 뒤 ‘내 캔버스’까지 들어가 주세요.",
      "contract-mismatch":
        "MathCanvas 연결 방식이 현재 버전과 달라졌습니다. 생성하지 않고 안전하게 멈췄어요.",
      ready: "MathCanvas에 연결되었어요. 새 캔버스 세트를 만들 준비가 됐습니다."
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
    requestedGrade?: number;
    problemCount?: number;
    difficulty?: "easy" | "normal" | "hard";
    manipulation?: "fraction-strip-common-start-drag";
  }): {
    supported: boolean;
    recommendation: RecommendationSummary;
    draftId?: string;
    setHash?: string;
    expiresAt?: string;
    activitySetSummary?: {
      title: string;
      canvasCount: number;
      oneProblemPerCanvas: true;
      studentInstruction: string;
      minimumVisualDifferencePercent: number;
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
      ...(input.requestedGrade === undefined
        ? {}
        : { requestedGrade: input.requestedGrade }),
      ...(input.problemCount === undefined
        ? {}
        : { problemCount: input.problemCount }),
      ...(input.difficulty === undefined
        ? {}
        : { difficulty: input.difficulty }),
      ...(input.manipulation === undefined
        ? {}
        : { manipulation: input.manipulation }),
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
    const set = generateFractionComparisonActivitySet(recommendation, {
      seed: request.requestId,
      generatedAt: now.toISOString(),
      setId: `set-${randomUUID()}`
    });
    const canvases = splitActivitySetIntoCanvases(set);
    this.#drafts.set(draftId, {
      draftId,
      set,
      canvases,
      recommendation,
      setHash: set.setHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    this.#persistDrafts();
    return {
      supported: true,
      recommendation: summarizeRecommendation(recommendation),
      draftId,
      setHash: set.setHash,
      expiresAt: expiresAt.toISOString(),
      activitySetSummary: {
        title: set.title,
        canvasCount: set.problemCount,
        oneProblemPerCanvas: true,
        studentInstruction: canvases[0]!.instructions[0]!,
        minimumVisualDifferencePercent:
          MIN_VISUAL_FRACTION_DIFFERENCE_RATIO * 100
      },
      teacherAnswerKey: teacherAnswerKey(set),
      approvalPrompt:
        `추천한 조건을 승인하면 한 문제짜리 새 캔버스 ${set.problemCount}개를 만듭니다. ` +
        "괜찮다면 “이대로 만들어줘”라고 말해 주세요. 기존 캔버스는 수정하지 않습니다."
    };
  }

  public async createActivitySet(input: {
    draftId: string;
    setHash: string;
    teacherConfirmed: boolean;
  }): Promise<{
    batchId: string;
    status: CreationBatch["status"];
    setHash: string;
    validations: ValidationReport[];
    teacherAnswerKey: TeacherAnswer[];
    items: BatchCanvasSummary[];
    message: string;
  }> {
    while (true) {
      const activeCreation = this.#activeCreations.get(input.draftId);
      if (!activeCreation) break;
      await activeCreation;
    }
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
    if (Date.parse(draft.expiresAt) <= now.getTime()) {
      this.#drafts.delete(input.draftId);
      this.#persistDrafts();
      throw new AuthoringServiceError(
        "draft-expired",
        "추천안 확인 시간이 지났습니다. 같은 조건으로 다시 추천을 받아 주세요."
      );
    }
    if (
      input.setHash !== draft.setHash ||
      draft.setHash !== draft.set.setHash ||
      activitySetHash(draft.set) !== draft.setHash ||
      draft.canvases.some(
        (canvas) =>
          canvas.setHash !== draft.setHash ||
          canvasActivityHash(canvas) !== canvas.canvasHash
      )
    ) {
      throw new AuthoringServiceError(
        "activity-set-changed",
        "교사가 확인한 세트와 만들려는 캔버스가 다릅니다."
      );
    }

    const compiled = draft.canvases.map((canvas) =>
      compileCanvasActivitySpec(canvas)
    );
    const validations = draft.canvases.map((canvas, index) =>
      validateForCreation(canvas, compiled[index]!, now)
    );
    const failedValidation = validations.find(
      (validation) => !validation.canCreate
    );
    if (failedValidation) {
      throw new AuthoringServiceError(
        "validation-failed",
        `생성 전 검증을 통과하지 못했습니다: ${failedValidation.issues
          .map((value) => value.message)
          .join(" ")}`
      );
    }

    if (!draft.batch) {
      draft.batch = creationBatchSchema.parse({
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        batchId: `batch-${randomUUID()}`,
        setId: draft.set.setId,
        setHash: draft.setHash,
        status: "queued",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        items: compiled.map((project, index) => ({
          canvasIndex: index + 1,
          canvasHash: project.canvasHash,
          payloadHash: project.payloadHash,
          status: "queued"
        }))
      });
      this.#persistDrafts();
    } else {
      for (const item of draft.batch.items) {
        const expected = compiled[item.canvasIndex - 1];
        if (
          !expected ||
          item.canvasHash !== expected.canvasHash ||
          item.payloadHash !== expected.payloadHash
        ) {
          throw new AuthoringServiceError(
            "validation-failed",
            "저장된 배치와 현재 검증된 캔버스가 달라 안전하게 중단했습니다."
          );
        }
        if (
          item.status === "failed" &&
          item.errorCode &&
          retryableCreationErrors.has(item.errorCode)
        ) {
          item.status = "queued";
          delete item.jobId;
          delete item.errorCode;
        }
      }
      draft.batch.updatedAt = now.toISOString();
      draft.batch.status = this.#deriveBatchStatus(draft.batch.items);
      this.#persistDrafts();
    }

    const execution = this.#executeBatch(draft, compiled, validations);
    this.#activeCreations.set(input.draftId, execution);
    try {
      await execution;
    } finally {
      if (this.#activeCreations.get(input.draftId) === execution) {
        this.#activeCreations.delete(input.draftId);
      }
    }
    let openedFirst = false;
    if (draft.batch.status === "succeeded") {
      const firstUrl = draft.batch.items[0]?.editorUrl;
      if (firstUrl) {
        try {
          await this.browserRuntime.openEditor(firstUrl);
          openedFirst = true;
        } catch {
          openedFirst = false;
        }
      }
    }
    return this.#batchSummary(
      draft,
      validations,
      draft.batch.status === "succeeded"
        ? openedFirst
          ? "새 캔버스 세트를 만들고 첫 번째 편집 화면을 열었습니다."
          : "새 캔버스 세트는 모두 만들었지만 편집 화면을 자동으로 열지 못했습니다. 반환된 URL을 열어 주세요."
        : "일부 캔버스를 만들지 못했습니다. 성공한 캔버스는 보존하고 빠진 항목만 다시 시도할 수 있습니다."
    );
  }

  async #executeBatch(
    draft: Draft,
    compiled: ReturnType<typeof compileCanvasActivitySpec>[],
    validations: ValidationReport[]
  ): Promise<void> {
    const batch = draft.batch;
    if (!batch) throw new Error("생성 배치가 없습니다.");
    batch.status = "creating";
    batch.updatedAt = this.clock.now().toISOString();
    this.#persistDrafts();

    for (const item of batch.items) {
      if (item.status === "succeeded") continue;
      if (
        item.status === "failed" &&
        (!item.errorCode || !retryableCreationErrors.has(item.errorCode))
      ) {
        break;
      }
      const project = compiled[item.canvasIndex - 1];
      const validation = validations[item.canvasIndex - 1];
      if (
        !project ||
        !validation ||
        !validation.canCreate ||
        project.canvasHash !== item.canvasHash ||
        project.payloadHash !== item.payloadHash
      ) {
        throw new AuthoringServiceError(
          "validation-failed",
          `${item.canvasIndex}번 캔버스가 승인된 세트와 다릅니다.`
        );
      }

      let stored: StoredCreationJob | null = null;
      if (item.jobId) {
        stored = this.jobStore.get(item.jobId, this.clock.now());
        if (!stored) {
          delete item.jobId;
          item.status = "queued";
        } else if (
          stored.job.payloadHash !== project.payloadHash ||
          stored.job.compiledProject.payloadHash !== project.payloadHash ||
          stored.job.compiledProject.canvasHash !== project.canvasHash ||
          stored.job.compiledProject.setHash !== draft.setHash ||
          stored.job.validationReport.compiledPayloadHash !==
            project.payloadHash ||
          !stored.job.validationReport.canCreate
        ) {
          throw new AuthoringServiceError(
            "validation-failed",
            `${item.canvasIndex}번 저장 작업이 승인된 캔버스와 달라 안전하게 중단했습니다.`
          );
        } else if (stored.status === "succeeded") {
          this.#copyJobResult(item, stored);
          batch.updatedAt = this.clock.now().toISOString();
          this.#persistDrafts();
          continue;
        } else if (
          stored.status === "failed" &&
          stored.result?.errorCode &&
          retryableCreationErrors.has(stored.result.errorCode)
        ) {
          delete item.jobId;
          delete item.errorCode;
          item.status = "queued";
          stored = null;
        } else if (stored.status === "failed" || stored.status === "expired") {
          this.#copyJobResult(item, stored);
          batch.updatedAt = this.clock.now().toISOString();
          this.#persistDrafts();
          break;
        }
      }

      if (!stored) {
        const approvedAt = this.clock.now();
        const expiresAt = new Date(approvedAt.getTime() + 10 * 60 * 1000);
        const approval = createActivitySetApprovalReceipt(
          draft.set,
          approvedAt,
          expiresAt
        );
        if (
          !verifyActivitySetApprovalReceipt(
            draft.set,
            approval,
            approvedAt
          )
        ) {
          throw new Error("승인 무결성 검증에 실패했습니다.");
        }
        const jobId = `job-${randomUUID()}`;
        const queued: QueuedCreation = {
          jobId,
          approvalHash: approval.approvalHash,
          payloadHash: project.payloadHash,
          createdAt: approvedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          compiledProject: project,
          validationReport: validation
        };
        item.jobId = jobId;
        item.status = "queued";
        batch.updatedAt = approvedAt.toISOString();
        this.#persistDrafts();
        const samePayload = this.jobStore.findByPayloadHash(
          project.payloadHash,
          approvedAt
        );
        stored = samePayload ?? this.jobStore.enqueue(queued, approvedAt);
        if (samePayload) item.jobId = samePayload.job.jobId;
      }

      if (stored.status === "queued" || stored.status === "creating") {
        const marked = this.jobStore.markCreating(
          stored.job.jobId,
          this.clock.now()
        );
        item.jobId = marked.job.jobId;
        item.status = marked.status;
        batch.updatedAt = this.clock.now().toISOString();
        this.#persistDrafts();
        if (marked.status === "expired") {
          this.#copyJobResult(item, marked);
          break;
        }
        const result = await this.browserRuntime.createProject(
          marked.job.compiledProject.payload,
          marked.job.payloadHash,
          { openEditor: false }
        );
        stored = this.jobStore.complete(marked.job.jobId, result);
      }
      this.#copyJobResult(item, stored);
      batch.updatedAt = this.clock.now().toISOString();
      this.#persistDrafts();
      if (item.status !== "succeeded") break;
    }

    batch.status = this.#deriveBatchStatus(batch.items);
    batch.updatedAt = this.clock.now().toISOString();
    creationBatchSchema.parse(batch);
    this.#persistDrafts();
  }

  #copyJobResult(
    item: CreationBatchItem,
    stored: StoredCreationJob
  ): void {
    item.status = stored.status;
    item.jobId = stored.job.jobId;
    if (stored.result?.projectId) item.projectId = stored.result.projectId;
    if (stored.result?.editorUrl) item.editorUrl = stored.result.editorUrl;
    if (stored.result?.errorCode) item.errorCode = stored.result.errorCode;
  }

  #deriveBatchStatus(
    items: CreationBatchItem[]
  ): CreationBatch["status"] {
    if (items.every((item) => item.status === "succeeded")) {
      return "succeeded";
    }
    if (items.some((item) => item.status === "creating")) {
      return "creating";
    }
    if (
      items.some((item) => item.status === "succeeded") &&
      items.some((item) => item.status !== "succeeded")
    ) {
      return "partial";
    }
    if (items.every((item) => item.status === "expired")) {
      return "expired";
    }
    if (items.some((item) => item.status === "failed")) {
      return "failed";
    }
    return "queued";
  }

  #batchSummary(
    draft: Draft,
    validations: ValidationReport[],
    message: string
  ): {
    batchId: string;
    status: CreationBatch["status"];
    setHash: string;
    validations: ValidationReport[];
    teacherAnswerKey: TeacherAnswer[];
    items: BatchCanvasSummary[];
    message: string;
  } {
    const batch = draft.batch;
    if (!batch) throw new Error("생성 배치가 없습니다.");
    return {
      batchId: batch.batchId,
      status: batch.status,
      setHash: batch.setHash,
      validations,
      teacherAnswerKey: teacherAnswerKey(draft.set),
      items: batch.items.map((item) => {
        const canvas = draft.canvases[item.canvasIndex - 1]!;
        return {
          canvasIndex: item.canvasIndex,
          problem: fractionPair(canvas),
          status: item.status,
          payloadHash: item.payloadHash,
          ...(item.projectId ? { projectId: item.projectId } : {}),
          ...(item.editorUrl ? { editorUrl: item.editorUrl } : {}),
          ...(item.errorCode ? { errorCode: item.errorCode } : {})
        };
      }),
      message
    };
  }

  public getBatchStatus(batchId: string): {
    found: boolean;
    batchId: string;
    status?: CreationBatch["status"];
    items?: BatchCanvasSummary[];
    message: string;
  } {
    const draft = [...this.#drafts.values()].find(
      (candidate) => candidate.batch?.batchId === batchId
    );
    if (!draft?.batch) {
      return {
        found: false,
        batchId,
        message: "생성 배치를 찾지 못했습니다."
      };
    }
    const messages: Record<CreationBatch["status"], string> = {
      queued: "새 캔버스 생성을 기다리고 있어요.",
      creating: "MathCanvas에 새 캔버스를 만들고 있어요.",
      partial: "일부 캔버스만 만들어졌습니다. 빠진 항목만 다시 시도할 수 있어요.",
      succeeded: "새 캔버스 세트를 모두 만들었어요.",
      failed: "새 캔버스를 만들지 못했습니다. 오류 안내를 확인해 주세요.",
      expired: "생성 요청 시간이 지나 안전하게 중단했습니다."
    };
    return {
      found: true,
      batchId,
      status: draft.batch.status,
      items: draft.batch.items.map((item) => {
        const canvas = draft.canvases[item.canvasIndex - 1]!;
        return {
          canvasIndex: item.canvasIndex,
          problem: fractionPair(canvas),
          status: item.status,
          payloadHash: item.payloadHash,
          ...(item.projectId ? { projectId: item.projectId } : {}),
          ...(item.editorUrl ? { editorUrl: item.editorUrl } : {}),
          ...(item.errorCode ? { errorCode: item.errorCode } : {})
        };
      }),
      message: messages[draft.batch.status]
    };
  }
}
