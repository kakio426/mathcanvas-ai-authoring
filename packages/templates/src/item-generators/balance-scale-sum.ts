import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const BALANCE_SCALE_SUM_GENERATOR_ID =
  "balance-scale.sum-card-choice" as const;
export const BALANCE_SCALE_SUM_GENERATOR_VERSION =
  "1.0.0" as const;

type Configuration = {
  readonly a: number;
  readonly b: number;
  readonly correctResult: number;
  readonly differenceValue: number;
  readonly nearMissValue: number;
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

function configurations(): Configuration[] {
  const output: Configuration[] = [];
  for (let a = 1; a <= 5; a += 1) {
    for (let b = a + 1; b <= 6; b += 1) {
      const correctResult = a + b;
      if (correctResult < 4 || correctResult > 9) continue;
      const differenceValue = b - a;
      const nearMissValue = [correctResult - 1, correctResult + 1]
        .find(
          (value) =>
            value >= 0 &&
            value <= 9 &&
            ![a, b, differenceValue, correctResult].includes(value)
        );
      if (
        nearMissValue === undefined ||
        new Set([
          a,
          b,
          differenceValue,
          nearMissValue,
          correctResult
        ]).size !== 5
      ) {
        continue;
      }
      output.push({
        a,
        b,
        correctResult,
        differenceValue,
        nearMissValue
      });
    }
  }
  return output;
}

const CONFIGURATIONS = configurations();

export function generateBalanceScaleSumItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (parameters.problemCount < 2 || parameters.problemCount > 4) {
    throw new RangeError(
      "접시저울로 같은 값 찾기는 2~4문제를 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:balance-scale-sum:${parameters.difficulty}`
  );
  const selected = shuffled(CONFIGURATIONS, random).slice(
    0,
    parameters.problemCount
  );
  if (selected.length !== parameters.problemCount) {
    throw new RangeError(
      "요청한 수만큼 서로 다른 접시저울 문항을 만들 수 없습니다."
    );
  }
  return selected.map((configuration, index) => {
    const pieces = shuffled(
      [
        configuration.correctResult,
        configuration.a,
        configuration.b,
        configuration.differenceValue,
        configuration.nearMissValue
      ],
      random
    );
    const order = index + 1;
    return {
      id: `balance-scale-sum-${order}`,
      order,
      kind: "balance-scale-sum-card-choice",
      values: {
        ...configuration,
        aText: String(configuration.a),
        bText: String(configuration.b),
        orderLabel: `${order}번`,
        piece1: pieces[0],
        piece2: pieces[1],
        piece3: pieces[2],
        piece4: pieces[3],
        piece5: pieces[4],
        surplusPieces: pieces.filter(
          (value) => value !== configuration.correctResult
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: BALANCE_SCALE_SUM_GENERATOR_ID,
        generatorVersion: BALANCE_SCALE_SUM_GENERATOR_VERSION,
        seed
      }
    };
  });
}
