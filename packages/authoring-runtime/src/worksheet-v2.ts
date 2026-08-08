import { randomUUID } from "node:crypto";
import {
  CONTRACT_SCHEMA_VERSION,
  createApprovalReceipt,
  sha256Hex,
  verifyApprovalReceipt,
  worksheetPreparationV2Schema,
  worksheetV2ApprovalSchema,
  worksheetV2CompileGateSchema,
  worksheetV2DraftSchema,
  type WorksheetPreparationV2,
  type WorksheetPlanV2,
  type WorksheetV2CompileGate,
  type WorksheetV2Draft
} from "@mathcanvas/contracts";
import {
  planWorksheetV2,
  planWorksheetV2ForContractLab,
  type WorksheetV2Surface
} from "@mathcanvas/planner";
import {
  prepareWorksheetV2,
  prepareWorksheetV2ForContractLab,
  type PrepareWorksheetV2Options
} from "@mathcanvas/templates";

export interface WorksheetV2AuthoringClock {
  now(): Date;
}

const systemClock: WorksheetV2AuthoringClock = {
  now: () => new Date()
};

export interface WorksheetV2PlanPreparationOptions
  extends PrepareWorksheetV2Options {
  readonly surface?: WorksheetV2Surface;
}

export interface CreateWorksheetV2DraftOptions {
  readonly draftId?: string;
  readonly createdAt?: string;
  readonly expiresAt?: string;
  readonly ttlMs?: number;
}

export interface ApproveWorksheetV2DraftInput {
  readonly draftId: string;
  readonly preparationHash: string;
  readonly teacherConfirmed: boolean;
  readonly approvedAt?: string;
  readonly ttlMs?: number;
}

export interface ResolveWorksheetV2DraftInput {
  readonly draftId: string;
  readonly preparationHash: string;
}

export interface WorksheetV2AuthoringRuntimeOptions {
  /**
   * Offline fixture seam only. Production uses the current planner resolver so
   * a stale/local catalog snapshot cannot be promoted by itself.
   */
  readonly canonicalPlanResolver?: (
    input: unknown,
    surface: WorksheetV2Surface
  ) => WorksheetPlanV2;
}

export class WorksheetV2AuthoringRuntimeError extends Error {
  public constructor(
    public readonly code:
      | "invalid-preparation"
      | "draft-not-found"
      | "draft-expired"
      | "approval-required"
      | "approval-expired"
      | "activity-spec-changed"
      | "candidate-not-approvable"
      | "invalid-time-window",
    message: string
  ) {
    super(message);
    this.name = "WorksheetV2AuthoringRuntimeError";
  }
}

function requireDate(value: string, label: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new WorksheetV2AuthoringRuntimeError(
      "invalid-time-window",
      `${label}이 올바른 ISO 시각이 아닙니다.`
    );
  }
  return parsed;
}

function ensureFutureWindow(
  createdAt: Date,
  expiresAt: Date,
  label: string
): void {
  if (expiresAt.getTime() <= createdAt.getTime()) {
    throw new WorksheetV2AuthoringRuntimeError(
      "invalid-time-window",
      `${label} 만료 시각은 기준 시각보다 뒤여야 합니다.`
    );
  }
}

/**
 * R2의 V2 transport 경계다. 기존 V1 추천·manipulation 상태와 별도 map을
 * 사용하며, R4 layout/native 계약이 생기기 전에는 compile payload를 만들지
 * 않는다.
 */
export class WorksheetV2AuthoringRuntime {
  readonly #drafts = new Map<string, WorksheetV2Draft>();
  readonly #canonicalPlanResolver: (
    input: unknown,
    surface: WorksheetV2Surface
  ) => WorksheetPlanV2;

  public constructor(
    private readonly clock: WorksheetV2AuthoringClock = systemClock,
    options: WorksheetV2AuthoringRuntimeOptions = {}
  ) {
    this.#canonicalPlanResolver =
      options.canonicalPlanResolver ??
      ((input, surface) =>
        surface === "contract-lab"
          ? planWorksheetV2ForContractLab(input)
          : planWorksheetV2(input));
  }

  /** 구조화 선택 → V2 plan → V2 preparation을 하나의 명시 경로로 연결한다. */
  public planAndPrepare(
    input: unknown,
    options: WorksheetV2PlanPreparationOptions
  ): WorksheetPreparationV2 {
    const surface = options.surface ?? "teacher";
    const plan =
      surface === "contract-lab"
        ? planWorksheetV2ForContractLab(input)
        : planWorksheetV2(input);
    return surface === "contract-lab"
      ? prepareWorksheetV2ForContractLab(plan, options)
      : prepareWorksheetV2(plan, options);
  }

  public createDraft(
    preparation: WorksheetPreparationV2,
    options: CreateWorksheetV2DraftOptions = {}
  ): WorksheetV2Draft {
    const parsedPreparation = worksheetPreparationV2Schema.safeParse(preparation);
    if (!parsedPreparation.success) {
      throw new WorksheetV2AuthoringRuntimeError(
        "invalid-preparation",
        `V2 preparation 형식이 올바르지 않습니다: ${parsedPreparation.error.issues
          .map((issue) => issue.message)
          .join(", ")}`
      );
    }
    const validPreparation = parsedPreparation.data;
    if (validPreparation.state !== "transport-ready") {
      throw new WorksheetV2AuthoringRuntimeError(
        "invalid-preparation",
        "V2 preparation은 transport-ready 상태여야 합니다."
      );
    }
    if (validPreparation.surface === "contract-lab") {
      throw new WorksheetV2AuthoringRuntimeError(
        "candidate-not-approvable",
        "contract-lab preparation은 manifest-bound 승인 경계가 생길 때까지 teacher approval로 draft할 수 없습니다."
      );
    }
    this.ensureCanonicalPreparation(validPreparation);
    const createdAt = requireDate(
      options.createdAt ?? this.clock.now().toISOString(),
      "createdAt"
    );
    const expiresAt = requireDate(
      options.expiresAt ??
        new Date(
          createdAt.getTime() + (options.ttlMs ?? 30 * 60 * 1000)
        ).toISOString(),
      "expiresAt"
    );
    ensureFutureWindow(createdAt, expiresAt, "draft");
    const draft = worksheetV2DraftSchema.parse({
      schemaVersion: "2.0.0",
      draftId:
        options.draftId ?? `worksheet-draft-v2-${randomUUID()}`,
      preparation: validPreparation,
      preparationHash: sha256Hex(validPreparation),
      state: "pending-approval",
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    const stored = this.cloneDraft(draft);
    this.#drafts.set(stored.draftId, stored);
    return this.cloneDraft(stored);
  }

  public getDraft(draftId: string): WorksheetV2Draft | undefined {
    const draft = this.#drafts.get(draftId);
    return draft === undefined ? undefined : this.cloneDraft(draft);
  }

  public approveDraft(
    input: ApproveWorksheetV2DraftInput
  ): WorksheetV2Draft {
    const draft = this.requireDraft(input.draftId);
    const now = requireDate(
      input.approvedAt ?? this.clock.now().toISOString(),
      "approvedAt"
    );
    this.ensureDraftLive(draft, now);
    if (!input.teacherConfirmed) {
      throw new WorksheetV2AuthoringRuntimeError(
        "approval-required",
        "교사가 V2 활동을 명시적으로 승인해야 합니다."
      );
    }
    this.ensureCanonicalPreparation(draft.preparation);
    this.ensurePreparationHash(draft, input.preparationHash);
    const approvalExpiresAt = new Date(
      Math.min(
        Date.parse(draft.expiresAt),
        now.getTime() + (input.ttlMs ?? 10 * 60 * 1000)
      )
    );
    ensureFutureWindow(now, approvalExpiresAt, "approval");
    const approvedAt = now.toISOString();
    const expiresAt = approvalExpiresAt.toISOString();
    const receipt = createApprovalReceipt(
      draft.preparation,
      now,
      approvalExpiresAt
    );
    if (receipt.activitySpecHash !== draft.preparationHash) {
      throw new WorksheetV2AuthoringRuntimeError(
        "activity-spec-changed",
        "V2 preparation hash가 승인 receipt와 일치하지 않습니다."
      );
    }
    const approval = worksheetV2ApprovalSchema.parse({
      schemaVersion: "2.0.0",
      draftId: draft.draftId,
      preparationHash: draft.preparationHash,
      approvalHash: receipt.approvalHash,
      teacherConfirmed: true,
      approvedAt,
      expiresAt
    });
    const approved = worksheetV2DraftSchema.parse({
      ...draft,
      state: "approved",
      approval
    });
    const stored = this.cloneDraft(approved);
    this.#drafts.set(stored.draftId, stored);
    return this.cloneDraft(stored);
  }

  public resolveDraft(
    input: ResolveWorksheetV2DraftInput
  ): WorksheetPreparationV2 {
    const draft = this.requireDraft(input.draftId);
    const now = this.clock.now();
    this.ensureDraftLive(draft, now);
    this.ensurePreparationHash(draft, input.preparationHash);
    this.ensureCanonicalPreparation(draft.preparation);
    if (draft.state !== "approved" || draft.approval === undefined) {
      throw new WorksheetV2AuthoringRuntimeError(
        "approval-required",
        "V2 draft는 승인 후에만 resolve할 수 있습니다."
      );
    }
    const approval = draft.approval;
    if (Date.parse(approval.expiresAt) <= now.getTime()) {
      throw new WorksheetV2AuthoringRuntimeError(
        "approval-expired",
        "V2 승인이 만료되어 다시 확인해야 합니다."
      );
    }
    const receipt = {
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      activitySpecHash: draft.preparationHash,
      approvalHash: approval.approvalHash,
      approvedAt: approval.approvedAt,
      expiresAt: approval.expiresAt
    };
    if (
      !verifyApprovalReceipt(
        draft.preparation,
        receipt,
        now
      )
    ) {
      throw new WorksheetV2AuthoringRuntimeError(
        "activity-spec-changed",
        "V2 승인 hash가 현재 draft와 일치하지 않습니다."
      );
    }
    return draft.preparation;
  }

  /**
   * R2의 compile fixture. resolve까지 통과하지만, 실제 MathCanvas payload는
   * R4의 LearningPhaseContract·OneScreenLayoutProfile·native reserve 계약이
   * 없으므로 항상 명시적인 차단 결과로 끝난다.
   */
  public compileDraft(
    input: ResolveWorksheetV2DraftInput
  ): WorksheetV2CompileGate {
    const draft = this.requireDraft(input.draftId);
    this.resolveDraft(input);
    return worksheetV2CompileGateSchema.parse({
      schemaVersion: "2.0.0",
      draftId: draft.draftId,
      preparationHash: draft.preparationHash,
      state: "blocked",
      blockingReasons: [
        "R4 LearningPhaseContract와 OneScreenLayoutProfile이 확정되기 전에는 MathCanvas payload를 compile하지 않습니다.",
        "R3 native reserve·semantic lifecycle 계약과 R5 actual save/reopen evidence가 아직 없습니다."
      ],
      checkedAt: this.clock.now().toISOString()
    });
  }

  private requireDraft(draftId: string): WorksheetV2Draft {
    const draft = this.#drafts.get(draftId);
    if (draft === undefined) {
      throw new WorksheetV2AuthoringRuntimeError(
        "draft-not-found",
        "V2 draft를 찾지 못했습니다."
      );
    }
    return this.cloneDraft(draft);
  }

  private ensureDraftLive(draft: WorksheetV2Draft, now: Date): void {
    if (now.getTime() < Date.parse(draft.createdAt)) {
      throw new WorksheetV2AuthoringRuntimeError(
        "invalid-time-window",
        "현재 시각이 V2 draft 생성 시각보다 이를 수 없습니다."
      );
    }
    if (Date.parse(draft.expiresAt) <= now.getTime()) {
      this.#drafts.delete(draft.draftId);
      throw new WorksheetV2AuthoringRuntimeError(
        "draft-expired",
        "V2 draft 확인 시간이 지나 안전하게 중단했습니다."
      );
    }
  }

  private ensurePreparationHash(
    draft: WorksheetV2Draft,
    preparationHash: string
  ): void {
    if (
      preparationHash !== draft.preparationHash ||
      sha256Hex(draft.preparation) !== draft.preparationHash
    ) {
      throw new WorksheetV2AuthoringRuntimeError(
        "activity-spec-changed",
        "교사가 확인한 V2 preparation과 현재 draft가 다릅니다."
      );
    }
  }

  private ensureCanonicalPreparation(
    preparation: WorksheetPreparationV2
  ): void {
    let canonicalPlan: WorksheetPlanV2;
    try {
      canonicalPlan = this.#canonicalPlanResolver(
        preparation.plan.request,
        preparation.surface
      );
    } catch {
      throw new WorksheetV2AuthoringRuntimeError(
        "activity-spec-changed",
        "현재 catalog/planner가 preparation을 더 이상 공개하지 않아 안전하게 중단했습니다."
      );
    }
    if (sha256Hex(canonicalPlan) !== sha256Hex(preparation.plan)) {
      throw new WorksheetV2AuthoringRuntimeError(
        "activity-spec-changed",
        "현재 catalog/planner 결과와 preparation snapshot이 달라 안전하게 중단했습니다."
      );
    }
  }

  private cloneDraft(draft: WorksheetV2Draft): WorksheetV2Draft {
    return worksheetV2DraftSchema.parse(structuredClone(draft));
  }
}
