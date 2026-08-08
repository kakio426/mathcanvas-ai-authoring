import {
  worksheetPreparationV2Schema,
  worksheetPlanV2Schema,
  type WorksheetPlanV2,
  type WorksheetPreparationV2
} from "@mathcanvas/contracts";

export interface PrepareWorksheetV2Options {
  readonly preparedAt: string;
  readonly preparationId?: string;
}

function preparationIdFor(plan: WorksheetPlanV2): string {
  return `preparation-${plan.planId.replace(/^plan-/, "")}`;
}

function prepare(
  input: WorksheetPlanV2,
  options: PrepareWorksheetV2Options,
  allowCandidate: boolean
): WorksheetPreparationV2 {
  const plan = worksheetPlanV2Schema.parse(input);
  if (
    plan.status === "blocked" ||
    plan.status === "unsupported" ||
    (!allowCandidate && plan.status !== "released")
  ) {
    throw new Error(
      `worksheet-v2-not-preparable:${plan.catalogEntry.catalogEntryId}:${plan.status}`
    );
  }
  if (Number.isNaN(Date.parse(options.preparedAt))) {
    throw new Error("preparedAt-invalid");
  }
  return worksheetPreparationV2Schema.parse({
    schemaVersion: "2.0.0",
    preparationId: options.preparationId ?? preparationIdFor(plan),
    plan,
    surface: allowCandidate ? "contract-lab" : "teacher",
    state: "transport-ready",
    preparedAt: new Date(options.preparedAt).toISOString(),
    notes: [
      "R2 transport preparation은 구조화 plan과 authority/family binding만 전달합니다.",
      ...(allowCandidate
        ? [
            "release-candidate는 contract-lab 전용이며 teacher UI나 public released 경로에 노출하지 않습니다."
          ]
        : [])
    ]
  });
}

/** Public V2 preparation. Only released catalog entries can use this path. */
export function prepareWorksheetV2(
  plan: WorksheetPlanV2,
  options: PrepareWorksheetV2Options
): WorksheetPreparationV2 {
  return prepare(plan, options, false);
}

/** Contract-lab transport fixture for release-candidate entries. */
export function prepareWorksheetV2ForContractLab(
  plan: WorksheetPlanV2,
  options: PrepareWorksheetV2Options
): WorksheetPreparationV2 {
  return prepare(plan, options, true);
}
