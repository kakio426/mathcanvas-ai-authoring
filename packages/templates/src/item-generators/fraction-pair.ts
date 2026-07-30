import {
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  createSeededRandom,
  type DenominatorRelation,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const FRACTION_PAIR_GENERATOR_ID =
  "fraction-pair.unlike-denominators" as const;
export const FRACTION_PAIR_GENERATOR_VERSION = "1.0.0" as const;

type FractionPair = readonly [
  leftNumerator: number,
  leftDenominator: number,
  rightNumerator: number,
  rightDenominator: number
];

const pairBank: Record<Difficulty, readonly FractionPair[]> = {
  easy: [
    [1, 2, 4, 5],
    [1, 3, 3, 4],
    [2, 3, 1, 4],
    [2, 5, 3, 4],
    [1, 5, 2, 3],
    [3, 5, 1, 4],
    [1, 2, 5, 6],
    [1, 4, 4, 5]
  ],
  normal: [
    [1, 2, 2, 3],
    [3, 4, 3, 5],
    [4, 5, 4, 7],
    [3, 8, 3, 5],
    [2, 7, 1, 2],
    [5, 8, 3, 7],
    [4, 9, 2, 3],
    [5, 6, 3, 5]
  ],
  hard: [
    [5, 8, 8, 11],
    [7, 10, 5, 9],
    [4, 7, 7, 10],
    [7, 9, 2, 3],
    [5, 11, 7, 12],
    [7, 12, 2, 3],
    [8, 11, 5, 6],
    [4, 9, 6, 11]
  ]
};

const multiplePairBank: Record<
  Difficulty,
  readonly FractionPair[]
> = {
  easy: [
    [1, 2, 1, 6],
    [1, 2, 7, 8],
    [1, 3, 5, 6],
    [2, 3, 1, 9],
    [1, 4, 5, 8],
    [1, 3, 9, 12]
  ],
  normal: [
    [1, 2, 1, 4],
    [1, 2, 4, 6],
    [1, 3, 1, 6],
    [1, 3, 5, 9],
    [2, 3, 5, 12],
    [3, 4, 7, 12]
  ],
  hard: [
    [1, 2, 3, 8],
    [1, 2, 6, 10],
    [1, 2, 7, 12],
    [1, 3, 2, 9],
    [2, 3, 7, 9],
    [3, 4, 5, 8]
  ]
};

export const VISUAL_DIFFERENCE_BANDS: Readonly<
  Record<Difficulty, { min: number; max: number }>
> = {
  easy: { min: 0.28, max: 0.56 },
  normal: { min: 0.15, max: 0.27 },
  hard: {
    min: MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
    max: 0.145
  }
};

export interface FractionPairGeneratorParameters {
  readonly difficulty: Difficulty;
  readonly problemCount: number;
  readonly denominatorRelation?: DenominatorRelation;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function reducedKey(
  numerator: number,
  denominator: number
): string {
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function uniquePairKey(pair: FractionPair): string {
  return [
    reducedKey(pair[0], pair[1]),
    reducedKey(pair[2], pair[3])
  ]
    .sort()
    .join("|");
}

function relationPairBank(
  difficulty: Difficulty,
  relation: DenominatorRelation
): readonly FractionPair[] {
  if (relation === "mixed") return pairBank[difficulty];
  if (relation === "coprime") {
    return pairBank[difficulty].filter(
      (pair) => gcd(pair[1], pair[3]) === 1
    );
  }
  return multiplePairBank[difficulty];
}

function assertPair(
  pair: FractionPair,
  difficulty: Difficulty,
  relation: DenominatorRelation
): void {
  const difference = Math.abs(
    pair[0] / pair[1] - pair[2] / pair[3]
  );
  const band = VISUAL_DIFFERENCE_BANDS[difficulty];
  if (
    pair[0] >= pair[1] ||
    pair[2] >= pair[3] ||
    pair[1] === pair[3] ||
    difference < MIN_VISUAL_FRACTION_DIFFERENCE_RATIO ||
    difference < band.min ||
    difference > band.max
  ) {
    throw new Error(
      `fraction-pair-bank-invalid:${difficulty}:${relation}`
    );
  }
  if (
    relation === "coprime" &&
    gcd(pair[1], pair[3]) !== 1
  ) {
    throw new Error(`fraction-pair-not-coprime:${difficulty}`);
  }
  if (
    relation === "multiple" &&
    pair[1] % pair[3] !== 0 &&
    pair[3] % pair[1] !== 0
  ) {
    throw new Error(`fraction-pair-not-multiple:${difficulty}`);
  }
}

export function assertFractionPairVariationCapacity(): number {
  let cells = 0;
  for (const difficulty of [
    "easy",
    "normal",
    "hard"
  ] as const) {
    for (const relation of [
      "mixed",
      "coprime",
      "multiple"
    ] as const) {
      const pairs = relationPairBank(difficulty, relation);
      pairs.forEach((pair) =>
        assertPair(pair, difficulty, relation)
      );
      if (
        pairs.length < 6 ||
        new Set(pairs.map(uniquePairKey)).size !== pairs.length
      ) {
        throw new Error(
          `fraction-pair-bank-capacity:${difficulty}:${relation}`
        );
      }
      cells += 1;
    }
  }
  return cells;
}

export const FRACTION_PAIR_VARIATION_CAPACITY_CELLS =
  assertFractionPairVariationCapacity();

function shuffledPairs(
  difficulty: Difficulty,
  count: number,
  seed: string,
  relation: DenominatorRelation
): FractionPair[] {
  const bank = relationPairBank(difficulty, relation);
  const uniquePairs = new Set(
    bank.map(uniquePairKey)
  );
  if (uniquePairs.size !== bank.length) {
    throw new Error(`${difficulty} 문제 은행에 같은 분수 비교가 중복되었습니다.`);
  }
  const random = createSeededRandom(
    relation === "mixed"
      ? `${seed}:${difficulty}:${count}`
      : `${seed}:${difficulty}:${count}:${relation}`
  );
  const pairs = [...bank];
  for (let index = pairs.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    const current = pairs[index];
    const target = pairs[swapWith];
    if (current === undefined || target === undefined) continue;
    pairs[index] = target;
    pairs[swapWith] = current;
  }
  return pairs.slice(0, count);
}

export function generateFractionPairItems(
  parameters: FractionPairGeneratorParameters,
  seed: string
): ResolvedItem[] {
  const denominatorRelation =
    parameters.denominatorRelation ?? "mixed";
  return shuffledPairs(
    parameters.difficulty,
    parameters.problemCount,
    seed,
    denominatorRelation
  ).map((pair, index) => {
    const [
      leftNumerator,
      leftDenominator,
      rightNumerator,
      rightDenominator
    ] = pair;
    const leftCross = leftNumerator * rightDenominator;
    const rightCross = rightNumerator * leftDenominator;
    if (leftCross === rightCross) {
      throw new Error("크기가 같은 분수 쌍은 사용할 수 없습니다.");
    }
    assertPair(
      pair,
      parameters.difficulty,
      denominatorRelation
    );
    const correctRelation = leftCross > rightCross ? ">" : "<";
    const order = index + 1;
    return {
      id: `problem-${order}`,
      order,
      kind: "fraction-comparison",
      values: {
        left: {
          numerator: leftNumerator,
          denominator: leftDenominator
        },
        right: {
          numerator: rightNumerator,
          denominator: rightDenominator
        },
        correctRelation,
        difficulty: parameters.difficulty,
        explanation:
          correctRelation === ">"
            ? `같은 전체에서 두 띠를 같은 출발선에 놓으면 ${leftNumerator}/${leftDenominator} 띠가 더 깁니다. 더 큰 분수는 ${leftNumerator}/${leftDenominator}입니다.`
            : `같은 전체에서 두 띠를 같은 출발선에 놓으면 ${rightNumerator}/${rightDenominator} 띠가 더 깁니다. 더 큰 분수는 ${rightNumerator}/${rightDenominator}입니다.`,
        orderLabel: `${order}번`,
        prompt:
          `\\frac{${leftNumerator}}{${leftDenominator}} \\; ? \\; ` +
          `\\frac{${rightNumerator}}{${rightDenominator}}`
      },
      provenance: {
        generatorId: FRACTION_PAIR_GENERATOR_ID,
        generatorVersion: FRACTION_PAIR_GENERATOR_VERSION,
        seed
      }
    };
  });
}
