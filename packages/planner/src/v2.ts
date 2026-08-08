import {
  worksheetPlanV2Schema,
  worksheetRequestV2Schema,
  type WorksheetCatalogEntry,
  type WorksheetModifierDecision,
  type WorksheetPlanV2,
  type WorksheetRequestV2
} from "@mathcanvas/contracts";
import {
  findWorksheetCatalogEntry
} from "@mathcanvas/curriculum";

export type WorksheetV2Surface = "teacher" | "contract-lab";

export class WorksheetV2PlanningError extends Error {
  public constructor(
    public readonly code:
      | "invalid-request"
      | "catalog-entry-not-found"
      | "selection-mismatch"
      | "entry-not-public",
    message: string
  ) {
    super(message);
    this.name = "WorksheetV2PlanningError";
  }
}

function sameSelection(
  left: WorksheetRequestV2["selection"],
  right: WorksheetCatalogEntry["selection"]
): boolean {
  return (
    left.grade === right.grade &&
    left.semester === right.semester &&
    left.unitId === right.unitId &&
    left.standardCode === right.standardCode &&
    left.learningType === right.learningType
  );
}

function planIdFor(requestId: string): string {
  const suffix = requestId.replace(/[^A-Za-z0-9-]/g, "-");
  return `plan-${suffix}`.slice(0, 160);
}

function applyModifiers(
  request: WorksheetRequestV2,
  entry: WorksheetCatalogEntry
): {
  appliedModifiers: WorksheetModifierDecision[];
  rejectedModifiers: WorksheetModifierDecision[];
} {
  const appliedModifiers: WorksheetModifierDecision[] = [];
  const rejectedModifiers: WorksheetModifierDecision[] = [];
  const modifier = request.modifier;
  if (!modifier) return { appliedModifiers, rejectedModifiers };

  if (modifier.context !== undefined) {
    const context = modifier.context.trim();
    if (context.length === 0) {
      rejectedModifiers.push({
        key: "context",
        value: modifier.context,
        reason: "수업 맥락은 비어 있지 않아야 합니다."
      });
    } else if (context.length > entry.modifierPolicy.contextMaxChars) {
      rejectedModifiers.push({
        key: "context",
        value: context,
        reason: `수업 맥락은 ${entry.modifierPolicy.contextMaxChars}자 이내여야 합니다.`
      });
    } else {
      appliedModifiers.push({ key: "context", value: context });
    }
  }
  if (modifier.problemCount !== undefined) {
    const range = entry.modifierPolicy.problemCount;
    if (
      modifier.problemCount < range.min ||
      modifier.problemCount > range.max
    ) {
      rejectedModifiers.push({
        key: "problemCount",
        value: modifier.problemCount,
        reason: `문제 수는 ${range.min}~${range.max}개만 허용됩니다.`
      });
    } else {
      appliedModifiers.push({
        key: "problemCount",
        value: modifier.problemCount
      });
    }
  }
  if (modifier.difficulty !== undefined) {
    if (!entry.modifierPolicy.allowedDifficulties.includes(modifier.difficulty)) {
      rejectedModifiers.push({
        key: "difficulty",
        value: modifier.difficulty,
        reason: "이 catalog entry에서 검증된 난이도만 사용할 수 있습니다."
      });
    } else {
      appliedModifiers.push({
        key: "difficulty",
        value: modifier.difficulty
      });
    }
  }
  return { appliedModifiers, rejectedModifiers };
}

function parseV2Request(input: unknown): WorksheetRequestV2 {
  const parsed = worksheetRequestV2Schema.safeParse(input);
  if (!parsed.success) {
    throw new WorksheetV2PlanningError(
      "invalid-request",
      `V2 요청 형식이 올바르지 않습니다: ${parsed.error.issues
        .map((issue) => issue.message)
        .join(", ")}`
    );
  }
  return parsed.data;
}

function planParsedRequest(
  request: WorksheetRequestV2,
  surface: WorksheetV2Surface
): WorksheetPlanV2 {
  const entry = findWorksheetCatalogEntry(request.catalogEntryId);
  if (!entry) {
    throw new WorksheetV2PlanningError(
      "catalog-entry-not-found",
      `등록된 V2 catalog entry가 없습니다: ${request.catalogEntryId}`
    );
  }
  if (!sameSelection(request.selection, entry.selection)) {
    throw new WorksheetV2PlanningError(
      "selection-mismatch",
      "학년·학기·단원·성취기준·학습 유형 선택이 catalog entry와 다릅니다."
    );
  }
  if (surface === "teacher" && (!entry.teacherVisible || entry.availability !== "released")) {
    throw new WorksheetV2PlanningError(
      "entry-not-public",
      `이 entry는 아직 교사 UI에 공개할 수 없습니다: ${entry.blockingReasons.join(" ")}`
    );
  }
  const { appliedModifiers, rejectedModifiers } = applyModifiers(
    request,
    entry
  );
  return worksheetPlanV2Schema.parse({
    schemaVersion: "2.0.0",
    planId: planIdFor(request.requestId),
    request,
    catalogEntry: entry,
    status: entry.availability,
    selection: entry.selection,
    blueprintFamily: entry.blueprintFamily,
    variationPreset: entry.variationPreset,
    affordanceFamily: entry.affordanceFamily,
    layoutProfile: entry.layoutFamily,
    authorityBinding: entry.authorityBinding,
    seed: request.seed,
    appliedModifiers,
    rejectedModifiers,
    blockingReasons: [
      ...entry.blockingReasons,
      ...rejectedModifiers.map((modifier) => modifier.reason ?? "허용되지 않은 modifier입니다.")
    ]
  });
}

export function planWorksheetV2(
  input: unknown
): WorksheetPlanV2 {
  return planParsedRequest(parseV2Request(input), "teacher");
}

/**
 * R2 generic transport fixture와 contract-lab만 사용하는 candidate 경로다.
 * public teacher planner가 release-candidate를 released처럼 노출하지 않도록
 * 별도 함수로 분리한다.
 */
export function planWorksheetV2ForContractLab(
  input: unknown
): WorksheetPlanV2 {
  return planParsedRequest(parseV2Request(input), "contract-lab");
}

export function resolveWorksheetCatalogEntry(
  catalogEntryId: string
): WorksheetCatalogEntry | undefined {
  return findWorksheetCatalogEntry(catalogEntryId);
}
