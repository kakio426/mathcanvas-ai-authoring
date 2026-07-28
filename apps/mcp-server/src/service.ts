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
  activitySpecSchema,
  createApprovalReceipt,
  generationRequestSchema,
  recommendationSchema,
  sha256Hex,
  verifyApprovalReceipt,
  type ActivitySpec,
  type Recommendation
} from "@mathcanvas/contracts";
import {
  BRIDGE_PROTOCOL_VERSION,
  BridgeJobStore,
  type ExtensionHeartbeat
} from "@mathcanvas/bridge-protocol";
import { compileActivitySpec } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import { generateFractionComparisonActivity } from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";

interface Draft {
  draftId: string;
  spec: ActivitySpec;
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

function teacherAnswerKey(spec: ActivitySpec): TeacherAnswer[] {
  return spec.problems.map((problem) => ({
    problemNumber: problem.order,
    answer:
      `${problem.left.numerator}/${problem.left.denominator} ` +
      `${problem.correctRelation} ` +
      `${problem.right.numerator}/${problem.right.denominator}`,
    explanation: problem.explanation
  }));
}

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
      | "activity-spec-changed"
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
  readonly #draftSnapshotPath: string | undefined;

  public constructor(
    public readonly bridgeStore: BridgeJobStore,
    private readonly clock: AuthoringClock = systemClock,
    options: AuthoringServiceOptions = {}
  ) {
    this.#draftSnapshotPath = options.draftSnapshotPath;
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
      snapshot.version !== 1 ||
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
      const activitySpecHash = record.activitySpecHash;
      const createdAt = record.createdAt;
      const expiresAt = record.expiresAt;
      const jobId = record.jobId;
      const payloadHash = record.payloadHash;
      const spec = activitySpecSchema.parse(record.spec);
      const recommendation = recommendationSchema.parse(record.recommendation);
      if (
        typeof draftId !== "string" ||
        !/^draft-[A-Za-z0-9-]+$/.test(draftId) ||
        typeof activitySpecHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(activitySpecHash) ||
        sha256Hex(spec) !== activitySpecHash ||
        sha256Hex(recommendation) !==
          sha256Hex(spec.recommendationSnapshot) ||
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
        draftId,
        spec,
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
        version: 1,
        drafts: [...this.#drafts.values()]
      })}\n`,
      { encoding: "utf8", mode: 0o600 }
    );
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, this.#draftSnapshotPath);
    chmodSync(this.#draftSnapshotPath, 0o600);
  }

  public checkConnection(): {
    state:
      | "extension-not-connected"
      | ExtensionHeartbeat["state"];
    ready: boolean;
    message: string;
    checkedAt?: string;
    detailCode?: string;
  } {
    const heartbeat = this.bridgeStore.latestHeartbeat(this.clock.now());
    if (!heartbeat) {
      return {
        state: "extension-not-connected",
        ready: false,
        message:
          "Chrome 연결이 아직 확인되지 않았어요. 확장 프로그램에 연결 코드를 저장하고 MathCanvas의 ‘내 캔버스’를 열어 주세요."
      };
    }
    const messages: Record<ExtensionHeartbeat["state"], string> = {
      "bridge-not-paired":
        "확장 프로그램에 연결 코드를 저장해 주세요.",
      "mathcanvas-tab-missing":
        "Chrome에서 https://mathcanvas.vivasam.com/ko/myCanvas 를 열어 주세요.",
      "login-required":
        "Chrome의 MathCanvas에서 로그인한 뒤 ‘내 캔버스’를 열어 주세요.",
      "contract-mismatch":
        "MathCanvas 연결 방식이 현재 버전과 달라졌습니다. 생성하지 않고 안전하게 멈췄어요.",
      ready: "MathCanvas에 연결되었어요. 새 활동지를 만들 준비가 됐습니다."
    };
    return {
      state: heartbeat.state,
      ready: heartbeat.state === "ready",
      message: messages[heartbeat.state],
      checkedAt: heartbeat.checkedAt,
      ...(heartbeat.detailCode ? { detailCode: heartbeat.detailCode } : {})
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
    activitySpecHash?: string;
    expiresAt?: string;
    activitySummary?: {
      title: string;
      studentInstructions: string[];
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
    const spec = generateFractionComparisonActivity(recommendation, {
      seed: request.requestId,
      generatedAt: now.toISOString(),
      activityId: `activity-${randomUUID()}`
    });
    const activitySpecHash = sha256Hex(spec);
    this.#drafts.set(draftId, {
      draftId,
      spec,
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
        title: spec.title,
        studentInstructions: spec.instructions,
        minimumVisualDifferencePercent:
          MIN_VISUAL_FRACTION_DIFFERENCE_RATIO * 100
      },
      teacherAnswerKey: teacherAnswerKey(spec),
      approvalPrompt:
        "추천한 학년, 문제 수, 난이도와 조작 방식을 확인한 뒤 ‘이대로 만들어줘’라고 승인해 주세요."
    };
  }

  public createNewProject(input: {
    draftId: string;
    activitySpecHash: string;
    teacherConfirmed: boolean;
  }): {
    jobId: string;
    status: string;
    activitySpecHash: string;
    payloadHash: string;
    expiresAt: string;
    validation: ReturnType<typeof validateForCreation>;
    teacherAnswerKey: TeacherAnswer[];
    message: string;
  } {
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
      input.activitySpecHash !== draft.activitySpecHash ||
      sha256Hex(draft.spec) !== draft.activitySpecHash
    ) {
      throw new AuthoringServiceError(
        "activity-spec-changed",
        "교사가 확인한 추천안과 만들려는 활동이 다릅니다."
      );
    }
    if (draft.jobId) {
      const existing = this.bridgeStore.getStatus(draft.jobId, now);
      if (!existing) {
        throw new Error("기존 생성 작업 상태를 찾지 못했습니다.");
      }
      if (!draft.payloadHash) {
        throw new Error("이미 등록한 작업의 payload 해시가 없습니다.");
      }
      return {
        jobId: draft.jobId,
        status: existing.status,
        activitySpecHash: draft.activitySpecHash,
        payloadHash: draft.payloadHash,
        expiresAt: draft.expiresAt,
        validation: validateForCreation(
          draft.spec,
          compileActivitySpec(draft.spec),
          now
        ),
        teacherAnswerKey: teacherAnswerKey(draft.spec),
        message: "같은 생성 요청이 이미 처리 중이거나 완료되었습니다."
      };
    }

    const compiled = compileActivitySpec(draft.spec);
    const validation = validateForCreation(draft.spec, compiled, now);
    if (!validation.canCreate) {
      throw new AuthoringServiceError(
        "validation-failed",
        `생성 전 검증을 통과하지 못했습니다: ${validation.issues
          .map((issue) => issue.message)
          .join(" ")}`
      );
    }
    const samePayload = this.bridgeStore.findByPayloadHash(
      compiled.payloadHash,
      now
    );
    if (samePayload) {
      draft.jobId = samePayload.jobId;
      draft.payloadHash = compiled.payloadHash;
      this.#persistDrafts();
      return {
        jobId: samePayload.jobId,
        status: samePayload.status,
        activitySpecHash: draft.activitySpecHash,
        payloadHash: compiled.payloadHash,
        expiresAt: draft.expiresAt,
        validation,
        teacherAnswerKey: teacherAnswerKey(draft.spec),
        message:
          "같은 조건의 활동지가 이미 생성 대기 중이거나 완료되었습니다. 기존 작업 상태를 확인해 주세요."
      };
    }
    const approvalExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const approval = createApprovalReceipt(draft.spec, now, approvalExpiresAt);
    if (!verifyApprovalReceipt(draft.spec, approval, now)) {
      throw new Error("승인 무결성 검증에 실패했습니다.");
    }
    const jobId = `job-${randomUUID()}`;
    const job = this.bridgeStore.createQueuedJob({
      jobId,
      approvalHash: approval.approvalHash,
      payloadHash: compiled.payloadHash,
      createdAt: now.toISOString(),
      expiresAt: approvalExpiresAt.toISOString(),
      compiledProject: compiled,
      validationReport: validation
    });
    this.bridgeStore.enqueue(job, now);
    draft.jobId = jobId;
    draft.payloadHash = compiled.payloadHash;
    this.#persistDrafts();
    return {
      jobId,
      status: "queued",
      activitySpecHash: draft.activitySpecHash,
      payloadHash: compiled.payloadHash,
      expiresAt: approvalExpiresAt.toISOString(),
      validation,
      teacherAnswerKey: teacherAnswerKey(draft.spec),
      message:
        "새 활동지 생성을 요청했습니다. Chrome에서 편집 화면이 열릴 때까지 잠시 기다려 주세요."
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
    const status = this.bridgeStore.getStatus(jobId, this.clock.now());
    if (!status) {
      return {
        found: false,
        jobId,
        message: "생성 작업을 찾지 못했습니다."
      };
    }
    const messages: Record<typeof status.status, string> = {
      queued: "Chrome 연결을 기다리고 있어요.",
      creating: "MathCanvas에 새 활동지를 만들고 있어요.",
      succeeded: "새 활동지를 만들고 편집 화면을 열었어요.",
      failed: "새 활동지를 만들지 못했습니다. 오류 안내를 확인해 주세요.",
      expired: "생성 요청 시간이 지나 안전하게 중단했습니다."
    };
    const failureMessages: Record<string, string> = {
      "login-required":
        "Chrome의 MathCanvas에서 다시 로그인한 뒤 새 추천을 받아 주세요.",
      "mathcanvas-tab-missing":
        "Chrome에서 MathCanvas의 ‘내 캔버스’를 연 뒤 새 추천을 받아 주세요.",
      "contract-mismatch":
        "MathCanvas 연결 방식이 달라져 안전하게 멈췄어요. 도구를 업데이트해 주세요.",
      "permission-denied":
        "현재 MathCanvas 계정에 새 프로젝트를 만들 권한이 있는지 확인해 주세요.",
      "mathcanvas-unavailable":
        "MathCanvas에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.",
      "payload-hash-mismatch":
        "교사가 확인한 활동과 생성 데이터가 달라 안전하게 멈췄어요.",
      "project-create-failed":
        "MathCanvas에서 새 프로젝트를 만들지 못했습니다. 연결 상태를 다시 확인해 주세요."
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
        status.status === "failed" && status.result?.errorCode
          ? (failureMessages[status.result.errorCode] ??
            messages.failed)
          : messages[status.status]
    };
  }
}

export { BRIDGE_PROTOCOL_VERSION };
