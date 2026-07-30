import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const NUMBER_BOND_TEN_GENERATOR_ID =
  "number-bond.sum-10" as const;
export const NUMBER_BOND_TEN_GENERATOR_VERSION = "2.0.0" as const;

const TOTAL = 10;
const PAIRS = [
  [1, 9],
  [2, 8],
  [3, 7],
  [4, 6]
] as const;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type Pair = readonly [number, number];
type Configuration = {
  readonly pieces: readonly number[];
  readonly solutions: readonly Pair[];
  readonly surplusPieces: readonly number[];
  readonly nearMissCombinations: readonly Pair[];
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

function combinations(values: readonly number[]): Pair[] {
  const output: Pair[] = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      output.push([values[left]!, values[right]!]);
    }
  }
  return output;
}

function pairKey(pair: Pair): string {
  return [...pair].sort((left, right) => left - right).join("+");
}

function configurationCandidates(): Configuration[] {
  const output: Configuration[] = [];
  for (let left = 0; left < PAIRS.length; left += 1) {
    for (let right = left + 1; right < PAIRS.length; right += 1) {
      const intended = [PAIRS[left]!, PAIRS[right]!];
      const solutionDigits: number[] = intended.flat();
      const remaining = DIGITS.filter(
        (digit) => !solutionDigits.includes(digit)
      );
      for (const surplus of combinations(remaining)) {
        const pieces = [...solutionDigits, ...surplus];
        const allPairs = combinations(pieces);
        const solutions = allPairs.filter(
          (pair) => pair[0] + pair[1] === TOTAL
        );
        const nearMissCombinations = allPairs.filter(
          (pair) =>
            Math.abs(pair[0] + pair[1] - TOTAL) === 1
        );
        const solutionValues = new Set(solutions.flat());
        const surplusPieces = pieces.filter(
          (piece) => !solutionValues.has(piece)
        );
        if (
          solutions.length === 2 &&
          new Set(solutions.map(pairKey)).size === 2 &&
          surplusPieces.length === 2 &&
          nearMissCombinations.length > 0
        ) {
          output.push({
            pieces,
            solutions,
            surplusPieces,
            nearMissCombinations
          });
        }
      }
    }
  }
  return output;
}

const CONFIGURATIONS = configurationCandidates();

export function generateNumberBondTenItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (parameters.problemCount > PAIRS.length + 1) {
    throw new RangeError(
      "10 만들기는 서로 다른 해 조합으로 최대 5문제까지 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:make-ten:${parameters.difficulty}`
  );
  const selected: Configuration[] = [];
  const usedSolutionSets = new Set<string>();
  for (const candidate of shuffled(CONFIGURATIONS, random)) {
    const solutionSetKey = candidate.solutions
      .map(pairKey)
      .sort()
      .join("|");
    if (usedSolutionSets.has(solutionSetKey)) continue;
    selected.push(candidate);
    usedSolutionSets.add(solutionSetKey);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new RangeError(
      "요청한 수만큼 서로 다른 10 만들기 구성 문항을 만들 수 없습니다."
    );
  }

  return selected.map((configuration, index) => {
    const pieces = shuffled(configuration.pieces, random);
    const order = index + 1;
    return {
      id: `make-ten-${order}`,
      order,
      kind: "number-bond-construction",
      values: {
        total: TOTAL,
        slotCount: 2,
        unitFrameCells: TOTAL,
        pieces,
        piece1: pieces[0],
        piece2: pieces[1],
        piece3: pieces[2],
        piece4: pieces[3],
        piece5: pieces[4],
        piece6: pieces[5],
        solutions: configuration.solutions,
        nearMissCombinations:
          configuration.nearMissCombinations,
        surplusPieces: configuration.surplusPieces,
        difficulty: parameters.difficulty,
        orderLabel: `${order}번`
      },
      provenance: {
        generatorId: NUMBER_BOND_TEN_GENERATOR_ID,
        generatorVersion: NUMBER_BOND_TEN_GENERATOR_VERSION,
        seed
      }
    };
  });
}
