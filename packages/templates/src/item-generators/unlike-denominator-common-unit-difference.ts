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

export const UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_ID =
  "fraction.unlike-denominator.common-unit-difference-choice" as const;
export const UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_VERSION =
  "1.0.0" as const;

type Configuration = {
  readonly leftDenominator: number;
  readonly rightDenominator: number;
  readonly leftNumerator: number;
  readonly rightNumerator: number;
  readonly commonDenominator: number;
  readonly leftCells: number;
  readonly rightCells: number;
  readonly differenceCells: number;
};

function candidateValues(
  configuration: Configuration
): FractionValue[] {
  const {
    leftDenominator,
    rightDenominator,
    rightNumerator,
    commonDenominator,
    leftCells,
    rightCells,
    differenceCells
  } = configuration;
  return [
    {
      numerator: differenceCells,
      denominator: commonDenominator
    },
    {
      numerator: leftCells - rightNumerator,
      denominator: commonDenominator
    },
    {
      numerator: rightCells,
      denominator: commonDenominator
    },
    {
      numerator: leftCells,
      denominator: commonDenominator
    },
    {
      numerator: differenceCells,
      denominator: leftDenominator + rightDenominator
    }
  ];
}

function configurationPool(): Configuration[] {
  const output: Configuration[] = [];
  for (const {
    leftDenominator,
    rightDenominator,
    commonDenominator
  } of enumerateCommonUnitDenominators("both")) {
    for (
      let leftNumerator = 1;
      leftNumerator < leftDenominator;
      leftNumerator += 1
    ) {
      if (gcd(leftNumerator, leftDenominator) !== 1) continue;
      for (
        let rightNumerator = 1;
        rightNumerator < rightDenominator;
        rightNumerator += 1
      ) {
        if (gcd(rightNumerator, rightDenominator) !== 1) continue;
        const leftCells =
          leftNumerator *
          (commonDenominator / leftDenominator);
        const rightCells =
          rightNumerator *
          (commonDenominator / rightDenominator);
        const differenceCells = leftCells - rightCells;
        if (
          differenceCells < 1 ||
          gcd(differenceCells, commonDenominator) !== 1
        ) {
          continue;
        }
        const configuration = {
          leftDenominator,
          rightDenominator,
          leftNumerator,
          rightNumerator,
          commonDenominator,
          leftCells,
          rightCells,
          differenceCells
        };
        const candidates = candidateValues(configuration);
        if (
          candidates.some(
            (candidate) =>
              candidate.numerator < 1 ||
              candidate.numerator >= candidate.denominator
          ) ||
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

function denominatorPairKey(
  configuration: Configuration
): string {
  return [
    configuration.leftDenominator,
    configuration.rightDenominator
  ]
    .sort((left, right) => left - right)
    .join(":");
}

export function generateUnlikeDenominatorCommonUnitDifferenceItems(
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
      "분모가 다른 분수 뺄셈 활동은 기본 난이도에서 2~3문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:unlike-denominator-common-unit-difference`
  );
  const selected = selectDistinctCommonUnitConfigurations(
    configurationPool(),
    random,
    parameters.problemCount,
    denominatorPairKey
  );
  if (selected.length !== parameters.problemCount) {
    throw new Error(
      "unlike-denominator-common-unit-difference-capacity-exhausted"
    );
  }

  return selected.map((configuration, index) => {
    const {
      leftDenominator,
      rightDenominator,
      leftNumerator,
      rightNumerator,
      commonDenominator,
      leftCells,
      rightCells,
      differenceCells
    } = configuration;
    const values = candidateValues(configuration);
    const candidates = shuffled(values, random);
    const order = index + 1;
    return {
      id: `unlike-denominator-common-unit-difference-${order}`,
      order,
      kind: "unlike-denominator-common-unit-difference-choice",
      values: {
        leftDenominator,
        rightDenominator,
        leftNumerator,
        rightNumerator,
        commonDenominator,
        leftCells,
        rightCells,
        differenceCells,
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
        correctResultText: fractionText(values[0]!),
        correctResultLatex: fractionLatex(values[0]!),
        oneSideCommonText: fractionText(values[1]!),
        coveredPartText: fractionText(values[2]!),
        minuendOnlyText: fractionText(values[3]!),
        denominatorSumText: fractionText(values[4]!),
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
        leftLabel: "처음 띠",
        rightLabel: "덮는 띠",
        questionLatex:
          `${fractionLatex({
            numerator: leftNumerator,
            denominator: leftDenominator
          })}-${fractionLatex({
            numerator: rightNumerator,
            denominator: rightDenominator
          })}=?`,
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId:
          UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_ID,
        generatorVersion:
          UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_VERSION,
        seed
      }
    };
  });
}
