import {
  getActivitySupportState,
  templateDefinitionSchema,
  type ActivityBlueprint,
  type Recommendation,
  type ResolvedActivity,
  type ResolvedItem,
  type TemplateDefinition
} from "@mathcanvas/contracts";
import { equivalentFractionBlueprint } from "./blueprints/equivalent-fraction.js";
import { fractionComparisonBlueprint } from "./blueprints/fraction-comparison.js";
import { makeTenNumberCardsBlueprint } from "./blueprints/make-ten-number-cards.js";
import { generateBlueprintItems } from "./item-generators/registry.js";
import { resolveRegisteredVariation } from "./variations/registry.js";
import { assertCognitiveManifestBound } from "./cognitive/registry.js";

export const FRACTION_TEMPLATE_VERSION =
  fractionComparisonBlueprint.version;

function templateDefinition(
  blueprint: ActivityBlueprint,
  options: {
    readonly supportedGradeBands: readonly ("1-2" | "3-4" | "5-6")[];
    readonly maximumProblemCount: number;
    readonly requiredModules: readonly string[];
  }
): TemplateDefinition {
  return templateDefinitionSchema.parse({
    id: blueprint.id,
    version: blueprint.version,
    supportedGradeBands: options.supportedGradeBands,
    supportedStandards: [
      blueprint.curriculumBinding.standardCode
    ],
    supportedProblemCount: {
      min: 2,
      max: options.maximumProblemCount
    },
    requiredModules: options.requiredModules,
    confidenceThreshold: 0.9
  });
}

export const fractionComparisonTemplateDefinition = templateDefinition(
  fractionComparisonBlueprint,
  {
    supportedGradeBands: ["5-6"],
    maximumProblemCount: 6,
    requiredModules: [
      "NO03FM",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  }
);

export const equivalentFractionTemplateDefinition = templateDefinition(
  equivalentFractionBlueprint,
  {
    supportedGradeBands: ["5-6"],
    maximumProblemCount: 6,
    requiredModules: [
      "NO03FM",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  }
);

export const makeTenNumberCardsTemplateDefinition = templateDefinition(
  makeTenNumberCardsBlueprint,
  {
    supportedGradeBands: ["1-2"],
    maximumProblemCount: 5,
    requiredModules: [
      "NO04NT",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  }
);

export interface GenerateActivitySpecOptions {
  readonly seed: string;
  readonly generatedAt: string;
  readonly activityId?: string;
}

export interface RegisteredActivityPlan {
  readonly blueprint: ActivityBlueprint;
  readonly items: readonly ResolvedItem[];
  readonly recommendation: Recommendation;
  readonly options: {
    readonly seed: string;
    readonly generatedAt: string;
    readonly activityId: string;
    readonly templateVersion: string;
    readonly variation: Readonly<Record<string, unknown>>;
  };
}

function prepare(
  blueprint: ActivityBlueprint,
  definition: TemplateDefinition,
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions,
  manipulation: NonNullable<Recommendation["manipulation"]>
): RegisteredActivityPlan {
  if (
    !recommendation.supported ||
    recommendation.templateId !== blueprint.id ||
    recommendation.standardCode !==
      blueprint.curriculumBinding.standardCode ||
    recommendation.learningGoal !== blueprint.learningObjective ||
    recommendation.curriculum === undefined ||
    recommendation.problemCount === undefined ||
    recommendation.difficulty === undefined ||
    recommendation.manipulation !== manipulation ||
    recommendation.problemCount >
      definition.supportedProblemCount.max
  ) {
    throw new Error(`activity-recommendation-mismatch:${blueprint.id}`);
  }
  if (recommendation.confidence < definition.confidenceThreshold) {
    throw new Error(`activity-confidence-too-low:${blueprint.id}`);
  }
  if (Number.isNaN(Date.parse(options.generatedAt))) {
    throw new Error("generatedAt-invalid");
  }
  const variation = resolveRegisteredVariation(blueprint.id, {
    problemCount: recommendation.problemCount,
    difficulty: recommendation.difficulty,
    ...(recommendation.denominatorRelation
      ? {
          denominatorRelation:
            recommendation.denominatorRelation
        }
      : {})
  });
  return {
    blueprint,
    items: generateBlueprintItems(
      blueprint,
      options.seed,
      variation
    ),
    recommendation,
    options: {
      seed: options.seed,
      generatedAt: new Date(options.generatedAt).toISOString(),
      activityId:
        options.activityId ?? `${blueprint.id}-${options.seed}`,
      templateVersion: blueprint.version,
      variation
    }
  };
}

export function generateFractionComparisonActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    fractionComparisonBlueprint,
    fractionComparisonTemplateDefinition,
    recommendation,
    options,
    "fraction-strip-common-start-drag"
  );
}

export function generateEquivalentFractionActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    equivalentFractionBlueprint,
    equivalentFractionTemplateDefinition,
    recommendation,
    options,
    "equivalent-fraction-strip-match"
  );
}

export function generateMakeTenNumberCardsActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    makeTenNumberCardsBlueprint,
    makeTenNumberCardsTemplateDefinition,
    recommendation,
    options,
    "number-card-make-ten-drag"
  );
}

type RegistryEntry = {
  readonly blueprint: ActivityBlueprint;
  readonly prepare: (
    recommendation: Recommendation,
    options: GenerateActivitySpecOptions
  ) => RegisteredActivityPlan;
  readonly supportState: "verified" | "released";
  readonly answerKey: (
    resolved: ResolvedActivity
  ) => RegisteredTeacherAnswer[];
};

export interface RegisteredTeacherAnswer {
  readonly problemNumber: number;
  readonly answer: string;
  readonly explanation: string;
}

function ratioValue(
  item: ResolvedItem,
  path: string
): { numerator: number; denominator: number } {
  return item.values[path] as {
    numerator: number;
    denominator: number;
  };
}

function fractionComparisonAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  const gcd = (left: number, right: number): number => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0) [a, b] = [b, a % b];
    return a || 1;
  };
  return resolved.items.map((item) => {
    const left = ratioValue(item, "left");
    const right = ratioValue(item, "right");
    const relation = String(item.values.correctRelation);
    const denominator =
      (left.denominator * right.denominator) /
      gcd(left.denominator, right.denominator);
    const leftEquivalent =
      left.numerator * (denominator / left.denominator);
    const rightEquivalent =
      right.numerator * (denominator / right.denominator);
    return {
      problemNumber: item.order,
      answer:
        `${left.numerator}/${left.denominator} ${relation} ` +
        `${right.numerator}/${right.denominator}`,
      explanation:
        `통분하면 ${left.numerator}/${left.denominator}=` +
        `${leftEquivalent}/${denominator}, ` +
        `${right.numerator}/${right.denominator}=` +
        `${rightEquivalent}/${denominator}입니다. ` +
        `${leftEquivalent}${relation}${rightEquivalent}이므로 ` +
        `${left.numerator}/${left.denominator}${relation}` +
        `${right.numerator}/${right.denominator}입니다. ` +
        String(item.values.explanation)
    };
  });
}

function equivalentFractionAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => {
    const left = ratioValue(item, "left");
    const right = ratioValue(item, "right");
    const candidateNumber = [1, 2, 3, 4, 5, 6].find((number) => {
      const candidate = ratioValue(item, `candidate${number}`);
      return (
        candidate.numerator === right.numerator &&
        candidate.denominator === right.denominator
      );
    });
    const expanding = right.denominator > left.denominator;
    const scaleFactor = expanding
      ? right.denominator / left.denominator
      : left.denominator / right.denominator;
    return {
      problemNumber: item.order,
      answer:
        `${left.numerator}/${left.denominator} = ` +
        `${right.numerator}/${right.denominator}` +
        ` (후보 ${String(candidateNumber)}번)`,
      explanation:
        `분자와 분모를 모두 ${scaleFactor}로 ` +
        `${expanding ? "곱하면" : "나누면"} ` +
        `${right.numerator}/${right.denominator}가 되어 분수의 크기가 같습니다.`
    };
  });
}

function makeTenAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => {
    const solutions = item.values.solutions as Array<
      readonly [number, number]
    >;
    return {
      problemNumber: item.order,
      answer: solutions
        .map(([left, right]) => `${left} + ${right} = 10`)
        .join(", "),
      explanation:
        "각 두 수만큼 열 칸에 표시하면 빈칸이나 넘침 없이 10칸이 정확히 채워집니다."
    };
  });
}

const registry: Readonly<Record<string, RegistryEntry>> = {
  [fractionComparisonBlueprint.id]: {
    blueprint: fractionComparisonBlueprint,
    prepare: generateFractionComparisonActivity,
    supportState:
      getActivitySupportState(fractionComparisonBlueprint.id) ??
      "verified",
    answerKey: fractionComparisonAnswerKey
  },
  [equivalentFractionBlueprint.id]: {
    blueprint: equivalentFractionBlueprint,
    prepare: generateEquivalentFractionActivity,
    supportState:
      getActivitySupportState(equivalentFractionBlueprint.id) ??
      "verified",
    answerKey: equivalentFractionAnswerKey
  },
  [makeTenNumberCardsBlueprint.id]: {
    blueprint: makeTenNumberCardsBlueprint,
    prepare: generateMakeTenNumberCardsActivity,
    supportState:
      getActivitySupportState(makeTenNumberCardsBlueprint.id) ??
      "verified",
    answerKey: makeTenAnswerKey
  }
};

export function prepareRegisteredActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  const entry = recommendation.templateId
    ? registry[recommendation.templateId]
    : undefined;
  if (!entry) {
    throw new Error(
      `activity-handler-unregistered:${recommendation.templateId ?? "missing"}`
    );
  }
  if (entry.supportState !== "released") {
    throw new Error(
      `activity-not-released:${entry.blueprint.id}:${entry.supportState}`
    );
  }
  assertCognitiveManifestBound(entry.blueprint);
  return entry.prepare(recommendation, options);
}

export function prepareRegisteredActivityForEnvelopeValidation(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  const entry = recommendation.templateId
    ? registry[recommendation.templateId]
    : undefined;
  if (!entry) {
    throw new Error(
      `activity-handler-unregistered:${recommendation.templateId ?? "missing"}`
    );
  }
  return entry.prepare(recommendation, options);
}

export function listRegisteredBlueprints(): readonly ActivityBlueprint[] {
  return Object.values(registry).map((entry) => entry.blueprint);
}

export function projectRegisteredApprovalView(
  resolved: ResolvedActivity
): Readonly<Record<string, unknown>> {
  return {
    approvalViewSchemaVersion: "2.0.0",
    ...resolved
  };
}

export function buildRegisteredTeacherAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  const entry = registry[resolved.binding.blueprintId];
  if (!entry) {
    throw new Error(
      `activity-handler-unregistered:${resolved.binding.blueprintId}`
    );
  }
  return entry.answerKey(resolved);
}

export function getRegisteredActivitySupportState(
  blueprintId: string
): "verified" | "released" | undefined {
  return registry[blueprintId]?.supportState;
}

export function getRegisteredBlueprintContentHash(
  blueprintId: string
): string {
  const entry = registry[blueprintId];
  if (!entry) {
    throw new Error(`activity-handler-unregistered:${blueprintId}`);
  }
  return entry.blueprint.contentHash;
}
