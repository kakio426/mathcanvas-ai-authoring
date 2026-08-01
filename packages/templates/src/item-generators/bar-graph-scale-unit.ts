import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import { shuffled } from "./common-unit-pool.js";

export const BAR_GRAPH_SCALE_UNIT_GENERATOR_ID =
  "data.bar-graph.scale-unit-choice" as const;
export const BAR_GRAPH_SCALE_UNIT_GENERATOR_VERSION =
  "1.0.0" as const;

type Configuration = {
  readonly totalCells: 10 | 12;
  readonly peoplePerCell: 2 | 5 | 10;
  readonly referenceCells: number;
  readonly questionCells: number;
  readonly referenceValue: number;
  readonly questionValue: number;
};

function candidateValues(
  configuration: Configuration
): readonly [number, number, number, number, number] {
  const {
    peoplePerCell,
    referenceCells,
    questionCells,
    referenceValue,
    questionValue
  } = configuration;
  return [
    questionValue,
    questionCells,
    referenceValue,
    referenceValue + (questionCells - referenceCells),
    (questionCells + 1) * peoplePerCell
  ];
}

function configurationPool(): Configuration[] {
  const output: Configuration[] = [];
  for (const totalCells of [10, 12] as const) {
    for (const peoplePerCell of [2, 5, 10] as const) {
      for (
        let referenceCells = 2;
        referenceCells <= totalCells - 3;
        referenceCells += 1
      ) {
        for (
          let questionCells = referenceCells + 1;
          questionCells <= totalCells - 1;
          questionCells += 1
        ) {
          const referenceValue =
            referenceCells * peoplePerCell;
          const questionValue =
            questionCells * peoplePerCell;
          const configuration = {
            totalCells,
            peoplePerCell,
            referenceCells,
            questionCells,
            referenceValue,
            questionValue
          };
          const candidates = candidateValues(configuration);
          if (
            candidates.some((candidate) => candidate > 100) ||
            new Set(candidates).size !== candidates.length
          ) {
            continue;
          }
          output.push(configuration);
        }
      }
    }
  }
  return output;
}

export const BAR_GRAPH_SCALE_CONFIGURATION_CAPACITY =
  configurationPool().length;

export function generateBarGraphScaleUnitItems(
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
      "막대그래프 눈금 읽기 활동은 기본 난이도에서 2~3문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:bar-graph-scale-unit`
  );
  const selected: Configuration[] = [];
  const seenCellValues = new Set<number>();
  const seenConfigurations = new Set<string>();
  for (const configuration of shuffled(configurationPool(), random)) {
    const configurationKey = [
      configuration.totalCells,
      configuration.referenceCells,
      configuration.questionCells
    ].join(":");
    if (
      seenCellValues.has(configuration.peoplePerCell) ||
      seenConfigurations.has(configurationKey)
    ) {
      continue;
    }
    seenCellValues.add(configuration.peoplePerCell);
    seenConfigurations.add(configurationKey);
    selected.push(configuration);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new Error("bar-graph-scale-unit-capacity-exhausted");
  }

  return selected.map((configuration, index) => {
    const candidates = shuffled(
      candidateValues(configuration),
      random
    );
    const order = index + 1;
    return {
      id: `bar-graph-scale-unit-${order}`,
      order,
      kind: "bar-graph-scale-unit-choice",
      values: {
        totalCells: configuration.totalCells,
        peoplePerCell: configuration.peoplePerCell,
        referenceCells: configuration.referenceCells,
        questionCells: configuration.questionCells,
        referenceValue: configuration.referenceValue,
        questionValue: configuration.questionValue,
        referenceBar: {
          numerator: configuration.referenceCells,
          denominator: configuration.totalCells
        },
        questionBar: {
          numerator: configuration.questionCells,
          denominator: configuration.totalCells
        },
        scaleTrack: {
          numerator: configuration.totalCells,
          denominator: configuration.totalCells
        },
        correctResultText: String(configuration.questionValue),
        cellCountText: String(configuration.questionCells),
        referenceCopyText: String(configuration.referenceValue),
        unitAsOneText: String(
          configuration.referenceValue +
            (configuration.questionCells -
              configuration.referenceCells)
        ),
        boundaryExtraText: String(
          (configuration.questionCells + 1) *
            configuration.peoplePerCell
        ),
        candidate1: String(candidates[0]),
        candidate2: String(candidates[1]),
        candidate3: String(candidates[2]),
        candidate4: String(candidates[3]),
        candidate5: String(candidates[4]),
        candidate1Latex: String(candidates[0]),
        candidate2Latex: String(candidates[1]),
        candidate3Latex: String(candidates[2]),
        candidate4Latex: String(candidates[3]),
        candidate5Latex: String(candidates[4]),
        orderLabel: `${order}번`,
        referenceLabel: "초록 막대",
        questionLabel: "파란 막대",
        questionText:
          `초록 막대는 ${configuration.referenceValue}명입니다. ` +
          "파란 막대는 몇 명입니까?",
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: BAR_GRAPH_SCALE_UNIT_GENERATOR_ID,
        generatorVersion: BAR_GRAPH_SCALE_UNIT_GENERATOR_VERSION,
        seed
      }
    };
  });
}
