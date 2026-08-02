import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import { factorPairActivityProfile } from "@mathcanvas/curriculum";
import { shuffled } from "./common-unit-pool.js";

export const FACTOR_PAIR_ARRAY_GENERATOR_ID =
  "number.factor-pair-array-construction" as const;
export const FACTOR_PAIR_ARRAY_GENERATOR_VERSION = "1.0.0" as const;

const GRID_ROWS = 6;
const GRID_COLUMNS = 8;

function blankGridText(): string {
  return Array.from(
    { length: GRID_ROWS },
    () => Array.from({ length: GRID_COLUMNS }, () => "□").join("  ")
  ).join("\n");
}

export function generateFactorPairArrayItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2
  ) {
    throw new RangeError(
      "약수쌍 배열 활동은 기본 난이도 2문항을 지원합니다."
    );
  }
  const random = createSeededRandom(`${seed}:factor-pair-array`);
  return shuffled([...factorPairActivityProfile.items], random).map(
    (item, index) => {
      const candidates = shuffled([...item.candidates], random);
      return {
        id: `factor-pair-array-${index + 1}`,
        order: index + 1,
        kind: "factor-pair-array-construction",
        values: {
          orderLabel: `${index + 1}번`,
          questionText:
            `${item.context} 가로와 세로에는 어느 두 수가 올 수 있나요?`,
          targetTotal: item.target,
          targetLatex: String(item.target),
          gridText: blankGridText(),
          gridRows: GRID_ROWS,
          gridColumns: GRID_COLUMNS,
          solutionPairs: item.solutions.map((pair) => [...pair]),
          surplusValues: [...item.surplus],
          answerExplanation:
            `${item.target}의 약수쌍은 ${item.solutions
              .map(([left, right]) => `${left}×${right}`)
              .join(", ")}입니다. 각 곱은 ${item.target}칸을 남김없이 만듭니다.`,
          ...Object.fromEntries(
            candidates.map((value, candidateIndex) => [
              `piece${candidateIndex + 1}`,
              value
            ])
          ),
          difficulty: parameters.difficulty
        },
        provenance: {
          generatorId: FACTOR_PAIR_ARRAY_GENERATOR_ID,
          generatorVersion: FACTOR_PAIR_ARRAY_GENERATOR_VERSION,
          seed
        }
      };
    }
  );
}
