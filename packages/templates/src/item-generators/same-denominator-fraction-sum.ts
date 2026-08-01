import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_ID =
  "fraction.same-denominator.sum-choice" as const;
export const SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_VERSION =
  "1.0.0" as const;

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

function configurationPool(): Configuration[] {
  const output: Configuration[] = [];
  for (let denominator = 3; denominator <= 10; denominator += 1) {
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
        const sumNumerator =
          leftNumerator + rightNumerator;
        if (
          leftNumerator === rightNumerator ||
          sumNumerator >= denominator
        ) {
          continue;
        }
        const candidates: FractionValue[] = [
          { numerator: sumNumerator, denominator },
          {
            numerator: sumNumerator,
            denominator: denominator * 2
          },
          {
            numerator: Math.max(
              leftNumerator,
              rightNumerator
            ),
            denominator
          },
          { numerator: sumNumerator + 1, denominator },
          {
            numerator: Math.abs(
              leftNumerator - rightNumerator
            ),
            denominator
          }
        ];
        if (
          candidates.some((value, index) =>
            candidates
              .slice(index + 1)
              .some((other) => sameValue(value, other))
          )
        ) {
          continue;
        }
        output.push({
          denominator,
          leftNumerator,
          rightNumerator
        });
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

export function generateSameDenominatorFractionSumItems(
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
      "같은 분모 분수 덧셈 활동은 기본 난이도에서 2~4문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:same-denominator-fraction-sum`
  );
  const selected: Configuration[] = [];
  for (const configuration of shuffled(configurationPool(), random)) {
    if (
      selected.some(
        (existing) =>
          existing.denominator === configuration.denominator
      )
    ) {
      continue;
    }
    selected.push(configuration);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new Error(
      "same-denominator-fraction-sum-capacity-exhausted"
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
    const candidateValues = [
      { numerator: sumNumerator, denominator },
      {
        numerator: sumNumerator,
        denominator: denominator * 2
      },
      {
        numerator: Math.max(leftNumerator, rightNumerator),
        denominator
      },
      { numerator: sumNumerator + 1, denominator },
      {
        numerator: Math.abs(
          leftNumerator - rightNumerator
        ),
        denominator
      }
    ];
    const candidates = shuffled(candidateValues, random);
    const order = index + 1;
    return {
      id: `same-denominator-sum-${order}`,
      order,
      kind: "same-denominator-fraction-sum-choice",
      values: {
        denominator,
        leftNumerator,
        rightNumerator,
        sumNumerator,
        left: {
          numerator: leftNumerator,
          denominator
        },
        right: {
          numerator: rightNumerator,
          denominator
        },
        correctResultText: `${sumNumerator}/${denominator}`,
        correctResultLatex: fractionLatex({
          numerator: sumNumerator,
          denominator
        }),
        addBothText: `${sumNumerator}/${denominator * 2}`,
        largerAddendText:
          `${Math.max(leftNumerator, rightNumerator)}/${denominator}`,
        doubleCountText: `${sumNumerator + 1}/${denominator}`,
        differenceText:
          `${Math.abs(leftNumerator - rightNumerator)}/${denominator}`,
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
        questionText:
          `${leftNumerator}/${denominator} + ` +
          `${rightNumerator}/${denominator}의 합은 얼마일까요?`,
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
          SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_ID,
        generatorVersion:
          SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_VERSION,
        seed
      }
    };
  });
}
