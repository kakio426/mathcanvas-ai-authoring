import {
  ACTIVITY_SPEC_SCHEMA_VERSION,
  activitySpecSchema,
  mintResolvedId,
  type ActivityProblem,
  type ActivitySpec,
  type ResolvedActivity,
  type ResolvedEmission
} from "@mathcanvas/contracts";

type FractionValue = {
  numerator: number;
  denominator: number;
};

function itemFraction(
  values: Record<string, unknown>,
  key: "left" | "right"
): FractionValue {
  const value = values[key];
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof (value as Record<string, unknown>).numerator !== "number" ||
    typeof (value as Record<string, unknown>).denominator !== "number"
  ) {
    throw new Error(`approval-view-fraction-missing:${key}`);
  }
  return value as FractionValue;
}

function emission(
  resolved: ResolvedActivity,
  role: string,
  itemId?: string
): ResolvedEmission {
  const found = resolved.emissions.find(
    (candidate) =>
      candidate.role === role && candidate.itemId === itemId
  );
  if (!found) {
    throw new Error(
      `approval-view-emission-missing:${role}:${itemId ?? "activity"}`
    );
  }
  return found;
}

function textOf(value: ResolvedEmission): string {
  if (
    (value.toolIntent.kind !== "text" &&
      value.toolIntent.kind !== "latex") ||
    typeof value.toolIntent.properties.text !== "string"
  ) {
    throw new Error(`approval-view-text-missing:${value.id}`);
  }
  return value.toolIntent.properties.text;
}

export function projectFractionComparisonApprovalView(
  resolved: ResolvedActivity
): ActivitySpec {
  const problems: ActivityProblem[] = resolved.items.map((item) => {
    const correctRelation = item.values.correctRelation;
    const difficulty = item.values.difficulty;
    const explanation = item.values.explanation;
    if (
      (correctRelation !== "<" && correctRelation !== ">") ||
      (difficulty !== "easy" &&
        difficulty !== "normal" &&
        difficulty !== "hard") ||
      typeof explanation !== "string"
    ) {
      throw new Error(`approval-view-item-invalid:${item.id}`);
    }
    return {
      id: item.id,
      order: item.order,
      left: itemFraction(item.values, "left"),
      right: itemFraction(item.values, "right"),
      correctRelation,
      difficulty,
      explanation
    };
  });
  const visualModels: ActivitySpec["visualModels"] = [];
  const fixedObjects: ActivitySpec["fixedObjects"] = [
    ...[
      "instruction-main",
      "instruction-symbol",
      "instruction-explain"
    ].map((role) => {
      const object = emission(resolved, role);
      return {
        id: object.id,
        kind: "instruction" as const,
        bounds: object.bounds,
        locked: true as const,
        text: textOf(object)
      };
    })
  ];
  const movableObjects: ActivitySpec["movableObjects"] = [];
  const dropAreas: ActivitySpec["dropAreas"] = [];
  for (const problem of problems) {
    const itemId = problem.id;
    const left = emission(resolved, "left-strip", itemId);
    const right = emission(resolved, "right-strip", itemId);
    const mat = emission(resolved, "mat", itemId);
    const start = emission(resolved, "start-line", itemId);
    const leftLane = emission(
      resolved,
      "left-lane-surface",
      itemId
    );
    const rightLane = emission(
      resolved,
      "right-lane-surface",
      itemId
    );
    const relationSlot = emission(
      resolved,
      "relation-slot-surface",
      itemId
    );
    const less = emission(resolved, "less-symbol", itemId);
    const greater = emission(resolved, "greater-symbol", itemId);
    if (
      left.toolIntent.kind !== "fraction-model" ||
      right.toolIntent.kind !== "fraction-model" ||
      typeof left.toolIntent.properties.color !== "string" ||
      typeof right.toolIntent.properties.color !== "string"
    ) {
      throw new Error(`approval-view-model-invalid:${itemId}`);
    }
    visualModels.push(
      {
        id: left.id,
        problemId: itemId,
        role: "left-strip",
        fraction: itemFraction(
          resolved.items.find((item) => item.id === itemId)!.values,
          "left"
        ),
        bounds: left.bounds,
        wholeWidth: leftLane.bounds.width,
        segmentHeight: left.bounds.height,
        commonStartX: leftLane.bounds.x,
        color: left.toolIntent.properties.color,
        movable: true
      },
      {
        id: right.id,
        problemId: itemId,
        role: "right-strip",
        fraction: itemFraction(
          resolved.items.find((item) => item.id === itemId)!.values,
          "right"
        ),
        bounds: right.bounds,
        wholeWidth: rightLane.bounds.width,
        segmentHeight: right.bounds.height,
        commonStartX: rightLane.bounds.x,
        color: right.toolIntent.properties.color,
        movable: true
      }
    );
    fixedObjects.push(
      {
        id: mat.id,
        kind: "comparison-mat",
        bounds: mat.bounds,
        locked: true,
        text: `${problem.order}번 비교판`
      },
      {
        id: start.id,
        kind: "common-start-line",
        bounds: start.bounds,
        locked: true,
        text: "출발선"
      }
    );
    movableObjects.push(
      {
        id: mintResolvedId(
          "left-movable",
          "each-item",
          itemId
        ),
        kind: "fraction-strip",
        problemId: itemId,
        sourceModelId: left.id,
        bounds: left.bounds,
        mathematicalDecision:
          "첫 번째 분수 띠를 같은 전체의 출발선에 맞춥니다."
      },
      {
        id: mintResolvedId(
          "right-movable",
          "each-item",
          itemId
        ),
        kind: "fraction-strip",
        problemId: itemId,
        sourceModelId: right.id,
        bounds: right.bounds,
        mathematicalDecision:
          "두 번째 분수 띠를 같은 전체의 출발선에 맞춥니다."
      },
      {
        id: less.id,
        kind: "comparison-symbol",
        problemId: itemId,
        bounds: less.bounds,
        mathematicalDecision:
          "두 분수의 크기를 보고 알맞은 기호를 고릅니다."
      },
      {
        id: greater.id,
        kind: "comparison-symbol",
        problemId: itemId,
        bounds: greater.bounds,
        mathematicalDecision:
          "두 분수의 크기를 보고 알맞은 기호를 고릅니다."
      }
    );
    dropAreas.push(
      {
        id: mintResolvedId("left-lane", "each-item", itemId),
        problemId: itemId,
        kind: "comparison-lane",
        bounds: leftLane.bounds,
        accepts: [
          mintResolvedId("left-movable", "each-item", itemId)
        ],
        label: "첫째 띠"
      },
      {
        id: mintResolvedId("right-lane", "each-item", itemId),
        problemId: itemId,
        kind: "comparison-lane",
        bounds: rightLane.bounds,
        accepts: [
          mintResolvedId("right-movable", "each-item", itemId)
        ],
        label: "둘째 띠"
      },
      {
        id: mintResolvedId(
          "relation-slot",
          "each-item",
          itemId
        ),
        problemId: itemId,
        kind: "relation-slot",
        bounds: relationSlot.bounds,
        accepts: [less.id, greater.id],
        label: "기호 놓는 곳"
      }
    );
  }
  return activitySpecSchema.parse({
    schemaVersion: ACTIVITY_SPEC_SCHEMA_VERSION,
    id: resolved.id,
    seed: resolved.seed,
    title: resolved.title,
    learningObjective: resolved.learningObjective,
    curriculumReferences: resolved.curriculumReferences,
    recommendationSnapshot: resolved.recommendationSnapshot,
    problems,
    visualModels,
    fixedObjects,
    movableObjects,
    dropAreas,
    layout: resolved.layout,
    instructions: resolved.instructions,
    provenance: resolved.provenance,
    templateId: resolved.legacy.templateId,
    templateVersion: resolved.legacy.templateVersion
  });
}
