import {
  getActivitySupportState,
  templateDefinitionSchema,
  type ActivityBlueprint,
  type Recommendation,
  type ResolvedActivity,
  type ResolvedItem,
  type TemplateDefinition
} from "@mathcanvas/contracts";
import { balancedEquationCardsBlueprint } from "./blueprints/balanced-equation-cards.js";
import { balanceScaleSumBlueprint } from "./blueprints/balance-scale-sum.js";
import { equivalentFractionBlueprint } from "./blueprints/equivalent-fraction.js";
import { fractionComparisonBlueprint } from "./blueprints/fraction-comparison.js";
import { makeTenNumberCardsBlueprint } from "./blueprints/make-ten-number-cards.js";
import { clockHourHandBoundaryBlueprint } from "./blueprints/clock-hour-hand-boundary.js";
import { elapsedTimeClockPairBlueprint } from "./blueprints/elapsed-time-clock-pair.js";
import { sameDenominatorFractionSumBlueprint } from "./blueprints/same-denominator-fraction-sum.js";
import { sameDenominatorImproperSumBlueprint } from "./blueprints/same-denominator-improper-sum.js";
import { unlikeDenominatorCommonUnitSumBlueprint } from "./blueprints/unlike-denominator-common-unit-sum.js";
import { unlikeDenominatorCommonUnitDifferenceBlueprint } from "./blueprints/unlike-denominator-common-unit-difference.js";
import { barGraphScaleUnitBlueprint } from "./blueprints/bar-graph-scale-unit.js";
import { brokenRulerLengthBlueprint } from "./blueprints/broken-ruler-length.js";
import { placeValueTenExchangeBlueprint } from "./blueprints/place-value-ten-exchange.js";
import { repeatingPatternUnitBlueprint } from "./blueprints/repeating-pattern-unit.js";
import { multiplicationArrayMeaningBlueprint } from "./blueprints/multiplication-array-meaning.js";
import { probabilityBagComparisonBlueprint } from "./blueprints/probability-bag-comparison.js";
import { claimEvidenceBlueprints } from "./blueprints/claim-evidence.js";
import {
  CLAIM_EVIDENCE_MANIPULATION,
  claimEvidenceActivityProfiles
} from "@mathcanvas/curriculum";
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

export const balancedEquationCardsTemplateDefinition = templateDefinition(
  balancedEquationCardsBlueprint,
  {
    supportedGradeBands: ["3-4"],
    maximumProblemCount: 4,
    requiredModules: [
      "NO04NT",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  }
);

export const balanceScaleSumTemplateDefinition = templateDefinition(
  balanceScaleSumBlueprint,
  {
    supportedGradeBands: ["3-4"],
    maximumProblemCount: 4,
    requiredModules: [
      "CR07BS",
      "NO04NT",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  }
);

export const clockHourHandBoundaryTemplateDefinition =
  templateDefinition(clockHourHandBoundaryBlueprint, {
    supportedGradeBands: ["1-2"],
    maximumProblemCount: 4,
    requiredModules: [
      "SM02AD",
      "input-text",
      "drawElem"
    ]
  });

export const elapsedTimeClockPairTemplateDefinition =
  templateDefinition(elapsedTimeClockPairBlueprint, {
    supportedGradeBands: ["1-2"],
    maximumProblemCount: 4,
    requiredModules: [
      "SM02AD",
      "input-text",
      "drawElem"
    ]
  });

export const sameDenominatorFractionSumTemplateDefinition =
  templateDefinition(sameDenominatorFractionSumBlueprint, {
    supportedGradeBands: ["3-4"],
    maximumProblemCount: 4,
    requiredModules: [
      "NO03FM",
      "input-text",
      "drawElem"
    ]
  });

export const sameDenominatorImproperSumTemplateDefinition =
  templateDefinition(sameDenominatorImproperSumBlueprint, {
    supportedGradeBands: ["3-4"],
    maximumProblemCount: 4,
    requiredModules: [
      "NO03FM",
      "input-text",
      "drawElem"
    ]
  });

export const unlikeDenominatorCommonUnitSumTemplateDefinition =
  templateDefinition(unlikeDenominatorCommonUnitSumBlueprint, {
    supportedGradeBands: ["5-6"],
    maximumProblemCount: 3,
    requiredModules: [
      "NO03FM",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  });

export const unlikeDenominatorCommonUnitDifferenceTemplateDefinition =
  templateDefinition(
    unlikeDenominatorCommonUnitDifferenceBlueprint,
    {
      supportedGradeBands: ["5-6"],
      maximumProblemCount: 3,
      requiredModules: [
        "NO03FM",
        "input-text",
        "math-latex",
        "drawElem"
      ]
    }
  );

export const barGraphScaleUnitTemplateDefinition =
  templateDefinition(barGraphScaleUnitBlueprint, {
    supportedGradeBands: ["3-4"],
    maximumProblemCount: 3,
    requiredModules: [
      "NO03FM",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  });

export const brokenRulerLengthTemplateDefinition =
  templateDefinition(brokenRulerLengthBlueprint, {
    supportedGradeBands: ["1-2"],
    maximumProblemCount: 3,
    requiredModules: [
      "NO03FM",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  });

export const placeValueTenExchangeTemplateDefinition =
  templateDefinition(placeValueTenExchangeBlueprint, {
    supportedGradeBands: ["1-2"],
    maximumProblemCount: 3,
    requiredModules: [
      "NO04PD",
      "input-text",
      "math-latex",
      "drawElem"
    ]
  });

export const repeatingPatternUnitTemplateDefinition =
  templateDefinition(repeatingPatternUnitBlueprint, {
    supportedGradeBands: ["1-2"],
    maximumProblemCount: 3,
    requiredModules: ["SM02PB", "input-text", "math-latex", "drawElem"]
  });

export const multiplicationArrayMeaningTemplateDefinition =
  templateDefinition(multiplicationArrayMeaningBlueprint, {
    supportedGradeBands: ["1-2"],
    maximumProblemCount: 3,
    requiredModules: ["input-text", "math-latex", "drawElem"]
  });

export const probabilityBagComparisonTemplateDefinition =
  templateDefinition(probabilityBagComparisonBlueprint, {
    supportedGradeBands: ["5-6"],
    maximumProblemCount: 4,
    requiredModules: ["NO03FM", "input-text", "math-latex", "drawElem"]
  });

export const claimEvidenceTemplateDefinitions = Object.fromEntries(
  claimEvidenceBlueprints.map((blueprint) => {
    const profile = claimEvidenceActivityProfiles.find(
      (candidate) => candidate.activityId === blueprint.id
    );
    if (!profile) {
      throw new Error(`claim-evidence-profile-missing:${blueprint.id}`);
    }
    return [
      blueprint.id,
      templateDefinition(blueprint, {
        supportedGradeBands: [profile.gradeBand],
        maximumProblemCount: 2,
        requiredModules: ["input-text", "drawElem"]
      })
    ];
  })
) as Readonly<Record<string, TemplateDefinition>>;

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

export function generateBalancedEquationCardsActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    balancedEquationCardsBlueprint,
    balancedEquationCardsTemplateDefinition,
    recommendation,
    options,
    "number-card-balanced-equation-drag"
  );
}

export function generateBalanceScaleSumActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    balanceScaleSumBlueprint,
    balanceScaleSumTemplateDefinition,
    recommendation,
    options,
    "balance-scale-sum-card-drag"
  );
}

export function generateClockHourHandBoundaryActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    clockHourHandBoundaryBlueprint,
    clockHourHandBoundaryTemplateDefinition,
    recommendation,
    options,
    "clock-hour-hand-boundary-drag"
  );
}

export function generateElapsedTimeClockPairActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    elapsedTimeClockPairBlueprint,
    elapsedTimeClockPairTemplateDefinition,
    recommendation,
    options,
    "elapsed-time-clock-pair-drag"
  );
}

export function generateSameDenominatorFractionSumActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    sameDenominatorFractionSumBlueprint,
    sameDenominatorFractionSumTemplateDefinition,
    recommendation,
    options,
    "same-denominator-fraction-sum-drag"
  );
}

export function generateSameDenominatorImproperSumActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    sameDenominatorImproperSumBlueprint,
    sameDenominatorImproperSumTemplateDefinition,
    recommendation,
    options,
    "same-denominator-improper-sum-drag"
  );
}

export function generateUnlikeDenominatorCommonUnitSumActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    unlikeDenominatorCommonUnitSumBlueprint,
    unlikeDenominatorCommonUnitSumTemplateDefinition,
    recommendation,
    options,
    "unlike-denominator-common-unit-drag"
  );
}

export function generateUnlikeDenominatorCommonUnitDifferenceActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    unlikeDenominatorCommonUnitDifferenceBlueprint,
    unlikeDenominatorCommonUnitDifferenceTemplateDefinition,
    recommendation,
    options,
    "unlike-denominator-common-unit-difference-drag"
  );
}

export function generateBarGraphScaleUnitActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    barGraphScaleUnitBlueprint,
    barGraphScaleUnitTemplateDefinition,
    recommendation,
    options,
    "bar-graph-scale-unit-drag"
  );
}

export function generateBrokenRulerLengthActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    brokenRulerLengthBlueprint,
    brokenRulerLengthTemplateDefinition,
    recommendation,
    options,
    "length-unit-iteration-drag"
  );
}

export function generatePlaceValueTenExchangeActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(
    placeValueTenExchangeBlueprint,
    placeValueTenExchangeTemplateDefinition,
    recommendation,
    options,
    "place-value-ten-exchange-drag"
  );
}

export function generateRepeatingPatternUnitActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(repeatingPatternUnitBlueprint, repeatingPatternUnitTemplateDefinition, recommendation, options, "pattern-block-repeat-unit-drag");
}

export function generateMultiplicationArrayMeaningActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(multiplicationArrayMeaningBlueprint, multiplicationArrayMeaningTemplateDefinition, recommendation, options, "multiplication-array-choice-drag");
}

export function generateProbabilityBagComparisonActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  return prepare(probabilityBagComparisonBlueprint, probabilityBagComparisonTemplateDefinition, recommendation, options, "probability-fraction-strip-drag");
}

export function generateClaimEvidenceActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): RegisteredActivityPlan {
  const blueprint = recommendation.templateId
    ? claimEvidenceBlueprints.find(
        (candidate) => candidate.id === recommendation.templateId
      )
    : undefined;
  const definition = blueprint
    ? claimEvidenceTemplateDefinitions[blueprint.id]
    : undefined;
  if (!blueprint || !definition) {
    throw new Error(
      `claim-evidence-activity-unregistered:${recommendation.templateId ?? "missing"}`
    );
  }
  return prepare(
    blueprint,
    definition,
    recommendation,
    options,
    CLAIM_EVIDENCE_MANIPULATION
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

function balancedEquationAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer:
      `${String(item.values.a)} + ${String(item.values.b)} = ` +
      `${String(item.values.c)} + ${String(item.values.solution)}`,
    explanation:
      `등호 왼쪽과 오른쪽의 값은 모두 ${String(item.values.leftTotal)}입니다.`
  }));
}

function balanceScaleSumAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer:
      `${String(item.values.a)} + ${String(item.values.b)} = ` +
      `${String(item.values.correctResult)}`,
    explanation:
      `왼쪽 접시의 합은 ${String(item.values.correctResult)}입니다. ` +
      `${String(item.values.correctResult)} 수 카드를 오른쪽 접시에 놓으면 저울이 수평이 됩니다.`
  }));
}

function clockHourHandBoundaryAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctPositionText),
    explanation:
      `긴바늘이 ${String(item.values.targetMinute)}분까지 움직이는 동안 ` +
      `짧은바늘도 ${String(item.values.startHour)}에서 ` +
      `${String(item.values.nextHour)} 쪽으로 조금씩 움직입니다.`
  }));
}

function elapsedTimeClockPairAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctResultText),
    explanation:
      `시작 시각에서 긴바늘을 ${String(item.values.elapsedMinutes)}분만큼 돌리면 ` +
      `끝 시각이 됩니다. 1시간은 60분이므로 시 경계를 지난 분도 이어 세어야 합니다.`
  }));
}

function sameDenominatorFractionSumAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctResultText),
    explanation:
      `같은 크기의 전체를 ${String(item.values.denominator)}조각으로 나눈 ` +
      `단위는 그대로이고, 색칠한 조각은 ` +
      `${String(item.values.leftNumerator)}+${String(item.values.rightNumerator)}=` +
      `${String(item.values.sumNumerator)}조각입니다.`
  }));
}

function sameDenominatorImproperSumAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctResultText),
    explanation:
      `전체 하나를 ${String(item.values.denominator)}조각으로 나눈 단위는 그대로이고, ` +
      `${String(item.values.leftNumerator)}+${String(item.values.rightNumerator)}=` +
      `${String(item.values.sumNumerator)}조각이므로 합은 1을 넘을 수 있습니다.`
  }));
}

function unlikeDenominatorCommonUnitSumAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctResultText),
    explanation:
      `두 분모 ${String(item.values.leftDenominator)}, ` +
      `${String(item.values.rightDenominator)}를 ` +
      `${String(item.values.commonDenominator)}칸으로 통분하면 ` +
      `${String(item.values.leftCells)}칸과 ` +
      `${String(item.values.rightCells)}칸입니다. ` +
      `따라서 합은 ${String(item.values.sumCells)}/` +
      `${String(item.values.commonDenominator)}입니다.`
  }));
}

function unlikeDenominatorCommonUnitDifferenceAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctResultText),
    explanation:
      `두 분모 ${String(item.values.leftDenominator)}, ` +
      `${String(item.values.rightDenominator)}를 ` +
      `${String(item.values.commonDenominator)}칸으로 통분하면 ` +
      `${String(item.values.leftCells)}칸에서 ` +
      `${String(item.values.rightCells)}칸을 덮습니다. ` +
      `따라서 남은 부분은 ${String(item.values.differenceCells)}/` +
      `${String(item.values.commonDenominator)}입니다.`
  }));
}

function barGraphScaleUnitAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: `${String(item.values.questionValue)}명`,
    explanation:
      `초록 막대의 ${String(item.values.referenceCells)}칸이 ` +
      `${String(item.values.referenceValue)}명이므로 한 칸은 ` +
      `${String(item.values.peoplePerCell)}명입니다. ` +
      `파란 막대는 ${String(item.values.questionCells)}칸이므로 ` +
      `${String(item.values.questionValue)}명입니다.`
  }));
}

function brokenRulerLengthAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: `${String(item.values.lengthCm)} cm`,
    explanation:
      `${String(item.values.startMark)} cm 눈금부터 ` +
      `${String(item.values.endMark)} cm 눈금까지는 ` +
      `1 cm 간격이 ${String(item.values.lengthCm)}번 들어갑니다. ` +
      `연필의 왼쪽 끝을 0에 맞추어도 오른쪽 끝은 ` +
      `${String(item.values.lengthCm)} cm 눈금에 닿습니다.`
  }));
}

function placeValueTenExchangeAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctValue),
    explanation:
      `십 모형 10개는 10이 열 번 모인 100입니다. ` +
      `따라서 처음 수 ${String(item.values.initialValue)}의 백의 자리가 ` +
      `${String(item.values.regroupedHundreds)}으로 1 커지고, ` +
      `십과 일의 자리는 그대로이므로 ` +
      `${String(item.values.correctValue)}입니다.`
  }));
}

function repeatingPatternUnitAnswerKey(resolved: ResolvedActivity): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: `${String(item.values.correctValueText)}조각`,
    explanation: "세 조각이 같은 순서로 되풀이되므로 가장 짧은 반복 단위는 3조각입니다. 다음 두 조각도 그 순서에 맞게 이어 놓습니다."
  }));
}

function multiplicationArrayMeaningAnswerKey(resolved: ResolvedActivity): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctValueText),
    explanation: `한 묶음에 ${String(item.values.each)}개가 있고 그런 묶음이 ${String(item.values.groups)}개이므로 ${String(item.values.correctValueText)}=${String(item.values.total)}입니다.`
  }));
}

function probabilityBagComparisonAnswerKey(resolved: ResolvedActivity): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => {
    const left = ratioValue(item, "left");
    const right = ratioValue(item, "right");
    const relation = String(item.values.correctRelation);
    return {
      problemNumber: item.order,
      answer: `${left.numerator}/${left.denominator} ${relation} ${right.numerator}/${right.denominator}`,
      explanation: "각 주머니의 전체 공 수에 대한 빨강 공 수를 같은 전체 길이의 띠로 나타내어 비교합니다. 빨강 공 개수만이 아니라 전체 공 수도 함께 보아야 합니다."
    };
  });
}

function claimEvidenceAnswerKey(
  resolved: ResolvedActivity
): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctValueText),
    explanation: String(item.values.answerExplanation)
  }));
}

const claimEvidenceRegistry = Object.fromEntries(
  claimEvidenceBlueprints.map((blueprint) => [
    blueprint.id,
    {
      blueprint,
      prepare: generateClaimEvidenceActivity,
      supportState:
        getActivitySupportState(blueprint.id) ?? "verified",
      answerKey: claimEvidenceAnswerKey
    } satisfies RegistryEntry
  ])
) as Readonly<Record<string, RegistryEntry>>;

const registry: Readonly<Record<string, RegistryEntry>> = {
  ...claimEvidenceRegistry,
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
  },
  [balancedEquationCardsBlueprint.id]: {
    blueprint: balancedEquationCardsBlueprint,
    prepare: generateBalancedEquationCardsActivity,
    supportState:
      getActivitySupportState(balancedEquationCardsBlueprint.id) ??
      "verified",
    answerKey: balancedEquationAnswerKey
  },
  [balanceScaleSumBlueprint.id]: {
    blueprint: balanceScaleSumBlueprint,
    prepare: generateBalanceScaleSumActivity,
    supportState:
      getActivitySupportState(balanceScaleSumBlueprint.id) ??
      "verified",
    answerKey: balanceScaleSumAnswerKey
  },
  [clockHourHandBoundaryBlueprint.id]: {
    blueprint: clockHourHandBoundaryBlueprint,
    prepare: generateClockHourHandBoundaryActivity,
    supportState:
      getActivitySupportState(clockHourHandBoundaryBlueprint.id) ??
      "verified",
    answerKey: clockHourHandBoundaryAnswerKey
  },
  [elapsedTimeClockPairBlueprint.id]: {
    blueprint: elapsedTimeClockPairBlueprint,
    prepare: generateElapsedTimeClockPairActivity,
    supportState:
      getActivitySupportState(elapsedTimeClockPairBlueprint.id) ??
      "verified",
    answerKey: elapsedTimeClockPairAnswerKey
  },
  [sameDenominatorFractionSumBlueprint.id]: {
    blueprint: sameDenominatorFractionSumBlueprint,
    prepare: generateSameDenominatorFractionSumActivity,
    supportState:
      getActivitySupportState(
        sameDenominatorFractionSumBlueprint.id
      ) ?? "verified",
    answerKey: sameDenominatorFractionSumAnswerKey
  },
  [sameDenominatorImproperSumBlueprint.id]: {
    blueprint: sameDenominatorImproperSumBlueprint,
    prepare: generateSameDenominatorImproperSumActivity,
    supportState:
      getActivitySupportState(
        sameDenominatorImproperSumBlueprint.id
      ) ?? "verified",
    answerKey: sameDenominatorImproperSumAnswerKey
  },
  [unlikeDenominatorCommonUnitSumBlueprint.id]: {
    blueprint: unlikeDenominatorCommonUnitSumBlueprint,
    prepare: generateUnlikeDenominatorCommonUnitSumActivity,
    supportState:
      getActivitySupportState(
        unlikeDenominatorCommonUnitSumBlueprint.id
    ) ?? "verified",
    answerKey: unlikeDenominatorCommonUnitSumAnswerKey
  },
  [unlikeDenominatorCommonUnitDifferenceBlueprint.id]: {
    blueprint: unlikeDenominatorCommonUnitDifferenceBlueprint,
    prepare:
      generateUnlikeDenominatorCommonUnitDifferenceActivity,
    supportState:
      getActivitySupportState(
        unlikeDenominatorCommonUnitDifferenceBlueprint.id
      ) ?? "verified",
    answerKey: unlikeDenominatorCommonUnitDifferenceAnswerKey
  },
  [barGraphScaleUnitBlueprint.id]: {
    blueprint: barGraphScaleUnitBlueprint,
    prepare: generateBarGraphScaleUnitActivity,
    supportState:
      getActivitySupportState(barGraphScaleUnitBlueprint.id) ??
      "verified",
    answerKey: barGraphScaleUnitAnswerKey
  },
  [brokenRulerLengthBlueprint.id]: {
    blueprint: brokenRulerLengthBlueprint,
    prepare: generateBrokenRulerLengthActivity,
    supportState:
      getActivitySupportState(brokenRulerLengthBlueprint.id) ??
      "verified",
    answerKey: brokenRulerLengthAnswerKey
  },
  [placeValueTenExchangeBlueprint.id]: {
    blueprint: placeValueTenExchangeBlueprint,
    prepare: generatePlaceValueTenExchangeActivity,
    supportState:
      getActivitySupportState(placeValueTenExchangeBlueprint.id) ??
      "verified",
    answerKey: placeValueTenExchangeAnswerKey
  },
  [repeatingPatternUnitBlueprint.id]: {
    blueprint: repeatingPatternUnitBlueprint,
    prepare: generateRepeatingPatternUnitActivity,
    supportState: getActivitySupportState(repeatingPatternUnitBlueprint.id) ?? "verified",
    answerKey: repeatingPatternUnitAnswerKey
  },
  [multiplicationArrayMeaningBlueprint.id]: {
    blueprint: multiplicationArrayMeaningBlueprint,
    prepare: generateMultiplicationArrayMeaningActivity,
    supportState: getActivitySupportState(multiplicationArrayMeaningBlueprint.id) ?? "verified",
    answerKey: multiplicationArrayMeaningAnswerKey
  },
  [probabilityBagComparisonBlueprint.id]: {
    blueprint: probabilityBagComparisonBlueprint,
    prepare: generateProbabilityBagComparisonActivity,
    supportState: getActivitySupportState(probabilityBagComparisonBlueprint.id) ?? "verified",
    answerKey: probabilityBagComparisonAnswerKey
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
