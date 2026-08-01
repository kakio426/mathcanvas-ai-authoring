import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import {
  enumerateCommonUnitDenominators,
  fractionLatex,
  fractionText,
  gcd,
  sameFractionValue,
  selectDistinctCommonUnitConfigurations,
  shuffled,
  type FractionValue
} from "./common-unit-pool.js";

export const UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_ID =
  "fraction.unlike-denominator.common-unit-sum-choice" as const;
export const UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_VERSION =
  "1.0.1" as const;

type Configuration = {
  readonly leftDenominator: number;
  readonly rightDenominator: number;
  readonly leftNumerator: number;
  readonly rightNumerator: number;
  readonly commonDenominator: number;
};

function candidateValues(
  configuration: Configuration
): FractionValue[] {
  const {
    leftDenominator,
    rightDenominator,
    leftNumerator,
    rightNumerator,
    commonDenominator
  } = configuration;
  const leftCells =
    leftNumerator * (commonDenominator / leftDenominator);
  const rightCells =
    rightNumerator * (commonDenominator / rightDenominator);
  return [
    {
      numerator: leftCells + rightCells,
      denominator: commonDenominator
    },
    {
      numerator: leftNumerator + rightNumerator,
      denominator: leftDenominator + rightDenominator
    },
    {
      numerator: leftNumerator + rightNumerator,
      denominator: commonDenominator
    },
    {
      numerator: Math.max(leftCells, rightCells),
      denominator: commonDenominator
    },
    {
      numerator: leftNumerator * rightNumerator,
      denominator: leftDenominator * rightDenominator
    }
  ];
}

function configurationPool(): Configuration[] {
  const output: Configuration[] = [];
  for (const denominators of enumerateCommonUnitDenominators(
    "increasing"
  )) {
    const {
      leftDenominator,
      rightDenominator,
      commonDenominator
    } = denominators;
    for (
      let leftNumerator = 1;
      leftNumerator < leftDenominator;
      leftNumerator += 1
    ) {
      for (
        let rightNumerator = 1;
        rightNumerator < rightDenominator;
        rightNumerator += 1
      ) {
        const configuration = {
          leftDenominator,
          rightDenominator,
          leftNumerator,
          rightNumerator,
          commonDenominator
        };
        if (
          gcd(leftNumerator, leftDenominator) !== 1 ||
          gcd(rightNumerator, rightDenominator) !== 1
        ) {
          continue;
        }
        const leftCells =
          leftNumerator *
          (commonDenominator / leftDenominator);
        const rightCells =
          rightNumerator *
          (commonDenominator / rightDenominator);
        const candidates = candidateValues(configuration);
        if (
          leftCells + rightCells >= commonDenominator ||
          candidates.some((candidate, index) =>
            candidates
              .slice(index + 1)
              .some((other) =>
                sameFractionValue(candidate, other)
              )
          )
        ) {
          continue;
        }
        output.push(configuration);
      }
    }
  }
  return output;
}

export function generateUnlikeDenominatorCommonUnitSumItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    !Number.isInteger(parameters.problemCount) ||
    parameters.problemCount < 2 ||
    parameters.problemCount > 3
  ) {
    throw new RangeError(
      "분모가 다른 분수 덧셈 활동은 기본 난이도에서 2~3문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:unlike-denominator-common-unit-sum`
  );
  const selected = selectDistinctCommonUnitConfigurations(
    configurationPool(),
    random,
    parameters.problemCount,
    (configuration) => String(configuration.commonDenominator)
  );
  if (selected.length !== parameters.problemCount) {
    throw new Error(
      "unlike-denominator-common-unit-sum-capacity-exhausted"
    );
  }

  return selected.map((configuration, index) => {
    const {
      leftDenominator,
      rightDenominator,
      leftNumerator,
      rightNumerator,
      commonDenominator
    } = configuration;
    const leftCells =
      leftNumerator *
      (commonDenominator / leftDenominator);
    const rightCells =
      rightNumerator *
      (commonDenominator / rightDenominator);
    const sumCells = leftCells + rightCells;
    const values = candidateValues(configuration);
    const candidates = shuffled(values, random);
    const order = index + 1;
    return {
      id: `unlike-denominator-common-unit-sum-${order}`,
      order,
      kind: "unlike-denominator-common-unit-sum-choice",
      values: {
        leftDenominator,
        rightDenominator,
        leftNumerator,
        rightNumerator,
        commonDenominator,
        leftCells,
        rightCells,
        sumCells,
        left: {
          numerator: leftNumerator,
          denominator: leftDenominator
        },
        right: {
          numerator: rightNumerator,
          denominator: rightDenominator
        },
        unit: {
          numerator: commonDenominator,
          denominator: commonDenominator
        },
        correctResultText:
          `${sumCells}/${commonDenominator}`,
        correctResultLatex: fractionLatex(values[0]!),
        addBothText:
          `${leftNumerator + rightNumerator}/` +
          `${leftDenominator + rightDenominator}`,
        sameNumeratorText:
          `${leftNumerator + rightNumerator}/` +
          `${commonDenominator}`,
        largerPartText:
          `${Math.max(leftCells, rightCells)}/` +
          `${commonDenominator}`,
        productText:
          `${leftNumerator * rightNumerator}/` +
          `${leftDenominator * rightDenominator}`,
        candidate1: fractionText(candidates[0]!),
        candidate2: fractionText(candidates[1]!),
        candidate3: fractionText(candidates[2]!),
        candidate4: fractionText(candidates[3]!),
        candidate5: fractionText(candidates[4]!),
        candidate1Latex: fractionLatex(candidates[0]!),
        candidate2Latex: fractionLatex(candidates[1]!),
        candidate3Latex: fractionLatex(candidates[2]!),
        candidate4Latex: fractionLatex(candidates[3]!),
        candidate5Latex: fractionLatex(candidates[4]!),
        orderLabel: `${order}번`,
        leftLabel: "첫째 띠",
        rightLabel: "둘째 띠",
        questionLatex:
          `${fractionLatex({
            numerator: leftNumerator,
            denominator: leftDenominator
          })}+${fractionLatex({
            numerator: rightNumerator,
            denominator: rightDenominator
          })}=?`,
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId:
          UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_ID,
        generatorVersion:
          UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_VERSION,
        seed
      }
    };
  });
}
