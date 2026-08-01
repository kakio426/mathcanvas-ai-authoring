import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_ID =
  "fraction.same-denominator.improper-sum-choice" as const;
export const SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_VERSION =
  "1.0.1" as const;

type FractionValue = {
  readonly numerator: number;
  readonly denominator: number;
};

type Configuration = {
  readonly denominator: number;
  readonly leftNumerator: number;
  readonly rightNumerator: number;
};

function shuffled<T>(
  values: readonly T[],
  random: () => number
): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [output[index], output[swapWith]] = [
      output[swapWith]!,
      output[index]!
    ];
  }
  return output;
}

function sameValue(
  left: FractionValue,
  right: FractionValue
): boolean {
  return (
    left.numerator * right.denominator ===
    right.numerator * left.denominator
  );
}

function candidateValues(
  configuration: Configuration
): FractionValue[] {
  const {
    denominator,
    leftNumerator,
    rightNumerator
  } = configuration;
  const sumNumerator =
    leftNumerator + rightNumerator;
  return [
    { numerator: sumNumerator, denominator },
    {
      numerator: sumNumerator,
      denominator: denominator * 2
    },
    { numerator: denominator, denominator },
    {
      numerator: sumNumerator - denominator,
      denominator
    },
    {
      numerator: Math.max(
        leftNumerator,
        rightNumerator
      ),
      denominator
    }
  ];
}

function configurationPool(): Configuration[] {
  const output: Configuration[] = [];
  for (let denominator = 4; denominator <= 10; denominator += 1) {
    for (
      let leftNumerator = 1;
      leftNumerator < denominator;
      leftNumerator += 1
    ) {
      for (
        let rightNumerator = 1;
        rightNumerator < denominator;
        rightNumerator += 1
      ) {
        const configuration = {
          denominator,
          leftNumerator,
          rightNumerator
        };
        const sumNumerator =
          leftNumerator + rightNumerator;
        if (
          leftNumerator === rightNumerator ||
          sumNumerator <= denominator ||
          candidateValues(configuration).some(
            (value, index, values) =>
              values
                .slice(index + 1)
                .some((other) =>
                  sameValue(value, other)
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

function fractionText(value: FractionValue): string {
  return `${value.numerator}/${value.denominator}`;
}

function fractionLatex(value: FractionValue): string {
  return `\\frac{${value.numerator}}{${value.denominator}}`;
}

export function generateSameDenominatorImproperSumItems(
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
    parameters.problemCount > 4
  ) {
    throw new RangeError(
      "1을 넘는 같은 분모 분수 덧셈 활동은 기본 난이도에서 2~4문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:same-denominator-improper-sum`
  );
  const selected: Configuration[] = [];
  for (const configuration of shuffled(configurationPool(), random)) {
    const numeratorPair = [
      configuration.leftNumerator,
      configuration.rightNumerator
    ].sort((left, right) => left - right).join(":");
    if (
      selected.some(
        (existing) => {
          const existingPair = [
            existing.leftNumerator,
            existing.rightNumerator
          ].sort((left, right) => left - right).join(":");
          return (
            existing.denominator === configuration.denominator ||
            existingPair === numeratorPair
          );
        }
      )
    ) {
      continue;
    }
    selected.push(configuration);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new Error(
      "same-denominator-improper-sum-capacity-exhausted"
    );
  }

  return selected.map((configuration, index) => {
    const {
      denominator,
      leftNumerator,
      rightNumerator
    } = configuration;
    const sumNumerator =
      leftNumerator + rightNumerator;
    const overflowNumerator =
      sumNumerator - denominator;
    const values = candidateValues(configuration);
    const candidates = shuffled(values, random);
    const order = index + 1;
    return {
      id: `same-denominator-improper-sum-${order}`,
      order,
      kind: "same-denominator-improper-sum-choice",
      values: {
        denominator,
        leftNumerator,
        rightNumerator,
        sumNumerator,
        overflowNumerator,
        left: {
          numerator: leftNumerator,
          denominator
        },
        right: {
          numerator: rightNumerator,
          denominator
        },
        correctResultText: `${sumNumerator}/${denominator}`,
        correctResultLatex: fractionLatex(values[0]!),
        addBothText:
          `${sumNumerator}/${denominator * 2}`,
        capAtOneText: `${denominator}/${denominator}`,
        overflowOnlyText:
          `${overflowNumerator}/${denominator}`,
        largerAddendText:
          `${Math.max(
            leftNumerator,
            rightNumerator
          )}/${denominator}`,
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
            denominator
          })}+${fractionLatex({
            numerator: rightNumerator,
            denominator
          })}=?`,
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId:
          SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_ID,
        generatorVersion:
          SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_VERSION,
        seed
      }
    };
  });
}
