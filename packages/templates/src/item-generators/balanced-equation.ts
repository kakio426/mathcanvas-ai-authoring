import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const BALANCED_EQUATION_GENERATOR_ID =
  "balanced-equation.card-choice" as const;
export const BALANCED_EQUATION_GENERATOR_VERSION = "1.0.0" as const;

type Configuration = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly solution: number;
  readonly leftTotal: number;
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
  for (let leftTotal = 7; leftTotal <= 9; leftTotal += 1) {
    for (let a = 2; a <= leftTotal - 2; a += 1) {
      const b = leftTotal - a;
      for (let c = 1; c < leftTotal; c += 1) {
        const solution = leftTotal - c;
        if (
          new Set([leftTotal, c, solution]).size !== 3 ||
          solution === a ||
          solution === b
        ) {
          continue;
        }
        const nearMissValue = [solution - 1, solution + 1].find(
          (value) =>
            value >= 0 &&
            value <= 9 &&
            ![leftTotal, c, solution].includes(value)
        );
        if (nearMissValue === undefined) continue;
        output.push({
          a,
          b,
          c,
          solution,
          leftTotal,
          nearMissValue
        });
      }
    }
  }
  return output;
}

const CONFIGURATIONS = configurations();
const DIGITS = Array.from({ length: 10 }, (_, index) => index);

export function generateBalancedEquationItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (parameters.problemCount > 4) {
    throw new RangeError(
      "등호 양쪽의 값 맞추기는 최대 4문제까지 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:balanced-equation:${parameters.difficulty}`
  );
  const selected: Configuration[] = [];
  const used = new Set<string>();
  for (const candidate of shuffled(CONFIGURATIONS, random)) {
    const key = [candidate.a, candidate.b, candidate.c]
      .sort((left, right) => left - right)
      .join("|");
    if (used.has(key)) continue;
    used.add(key);
    selected.push(candidate);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new RangeError(
      "요청한 수만큼 서로 다른 등호 관계 문항을 만들 수 없습니다."
    );
  }

  return selected.map((configuration, index) => {
    const required = [
      configuration.solution,
      configuration.leftTotal,
      configuration.c,
      configuration.nearMissValue
    ];
    const surplus = shuffled(
      DIGITS.filter(
        (value) =>
          !required.includes(value) &&
          value !== configuration.a &&
          value !== configuration.b
      ),
      random
    ).slice(0, 2);
    const pieces = shuffled([...required, ...surplus], random);
    const order = index + 1;
    return {
      id: `balanced-equation-${order}`,
      order,
      kind: "balanced-equation-card-choice",
      values: {
        ...configuration,
        aText: String(configuration.a),
        bText: String(configuration.b),
        cText: String(configuration.c),
        operationalAnswer: configuration.leftTotal,
        mirrorValue: configuration.c,
        surplusPieces: surplus,
        unitCellCount: 18,
        piece1: pieces[0],
        piece2: pieces[1],
        piece3: pieces[2],
        piece4: pieces[3],
        piece5: pieces[4],
        piece6: pieces[5],
        orderLabel: `${order}번`,
        ...Object.fromEntries(
          Array.from({ length: 18 }, (_, cellIndex) => [
            `topFill${cellIndex + 1}`,
            cellIndex < configuration.a
              ? "#4F8FEA"
              : cellIndex < configuration.leftTotal
                ? "#65B89A"
                : "#FFFFFF"
          ])
        ),
        ...Object.fromEntries(
          Array.from({ length: 18 }, (_, cellIndex) => [
            `bottomFill${cellIndex + 1}`,
            cellIndex < configuration.c
              ? "#F2A33A"
              : "#FFFFFF"
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: BALANCED_EQUATION_GENERATOR_ID,
        generatorVersion: BALANCED_EQUATION_GENERATOR_VERSION,
        seed
      }
    };
  });
}
