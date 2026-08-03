import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import { shuffled } from "./common-unit-pool.js";

export const BAR_GRAPH_REPRESENT_CELLS_GENERATOR_ID =
  "data.bar-graph.represent-cells-choice" as const;
export const BAR_GRAPH_REPRESENT_CELLS_GENERATOR_VERSION =
  "1.0.0" as const;

// 표의 자료를 막대그래프로 옮길 때, 학생은 값이 아니라 칸 수를 정해야 한다.
// 노리는 오개념은 "12명이니까 12칸"처럼 한 칸의 값을 1로 보는 생각이다.
type Configuration = {
  readonly context: string;
  readonly categoryLabel: string;
  readonly categories: readonly string[];
  readonly values: readonly number[];
  readonly peoplePerCell: 2 | 5;
  readonly gridlineCount: number;
  readonly targetIndex: number;
};

const contexts = [
  {
    context: "우리 반이 좋아하는 운동",
    categoryLabel: "운동",
    categories: ["축구", "농구", "피구", "달리기"]
  },
  {
    context: "우리 반이 기르고 싶은 동물",
    categoryLabel: "동물",
    categories: ["강아지", "고양이", "햄스터", "토끼"]
  },
  {
    context: "우리 반이 좋아하는 과일",
    categoryLabel: "과일",
    categories: ["사과", "포도", "딸기", "귤"]
  }
] as const;

function candidateCells(
  configuration: Configuration
): readonly [number, number, number, number, number] {
  const value = configuration.values[configuration.targetIndex]!;
  const correct = value / configuration.peoplePerCell;
  return [
    correct,
    // 한 칸의 값을 1로 보고 값을 그대로 칸으로 세는 생각
    value,
    // 한 칸의 값을 곱해 버리는 생각
    correct * configuration.peoplePerCell + configuration.peoplePerCell,
    correct + 1,
    configuration.peoplePerCell
  ];
}

function configurationPool(): Configuration[] {
  const output: Configuration[] = [];
  for (const context of contexts) {
    for (const peoplePerCell of [2, 5] as const) {
      for (const gridlineCount of [7, 9] as const) {
        const maximum = (gridlineCount - 1) * peoplePerCell;
        for (
          let targetCells = 2;
          targetCells <= gridlineCount - 2;
          targetCells += 1
        ) {
          // 나머지 항목은 축 안에서 서로 다른 값으로 채운다.
          const others = [1, gridlineCount - 2, gridlineCount - 3].map(
            (cells) => cells * peoplePerCell
          );
          const values = [
            targetCells * peoplePerCell,
            ...others
          ].slice(0, context.categories.length);
          if (new Set(values).size !== values.length) continue;
          if (values.some((value) => value <= 0 || value > maximum)) {
            continue;
          }
          const configuration: Configuration = {
            context: context.context,
            categoryLabel: context.categoryLabel,
            categories: context.categories,
            values,
            peoplePerCell,
            gridlineCount,
            targetIndex: 0
          };
          const candidates = candidateCells(configuration);
          if (
            new Set(candidates).size !== candidates.length ||
            candidates.some((candidate) => candidate <= 0)
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

export const BAR_GRAPH_REPRESENT_CELLS_CAPACITY =
  configurationPool().length;

export function generateBarGraphRepresentCellsItems(
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
      "막대그래프로 나타내기 활동은 기본 난이도에서 2~3문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:bar-graph-represent-cells`
  );
  const selected: Configuration[] = [];
  const seenContexts = new Set<string>();
  const seenScales = new Set<number>();
  for (const configuration of shuffled(configurationPool(), random)) {
    if (seenContexts.has(configuration.context)) continue;
    // 문항마다 한 칸의 값이 달라야 학생이 규칙을 외우지 않는다.
    if (
      seenScales.has(configuration.peoplePerCell) &&
      seenScales.size < 2
    ) {
      continue;
    }
    seenContexts.add(configuration.context);
    seenScales.add(configuration.peoplePerCell);
    selected.push(configuration);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new Error("bar-graph-represent-cells-capacity-exhausted");
  }

  return selected.map((configuration, index) => {
    const order = index + 1;
    const target = configuration.categories[configuration.targetIndex]!;
    const value = configuration.values[configuration.targetIndex]!;
    const correctCells = value / configuration.peoplePerCell;
    const candidates = shuffled(candidateCells(configuration), random);
    const tableText = configuration.categories
      .map(
        (category, position) =>
          `${category} ${configuration.values[position]}명`
      )
      .join(" · ");
    return {
      id: `bar-graph-represent-cells-${order}`,
      order,
      kind: "bar-graph-represent-cells-choice",
      values: {
        orderLabel: `${order}번`,
        questionText: `${configuration.context}입니다. ${target} 막대는 몇 칸까지 그려야 하나요?`,
        contextText: configuration.context,
        categoryLabelText: configuration.categoryLabel,
        tableText,
        categories: [...configuration.categories],
        values: [...configuration.values],
        peoplePerCell: configuration.peoplePerCell,
        gridlineCount: configuration.gridlineCount,
        scaleText: `눈금 한 칸 = ${configuration.peoplePerCell}명`,
        valueAxisName: "학생 수",
        valueColumnName: "학생 수(명)",
        valueAxisUnit: "명",
        // 막대는 비워서 보낸다. 채우는 일이 학생의 몫이다.
        barValues: configuration.categories.map(() => 0),
        targetLabel: target,
        targetValue: value,
        correctValueText: `${correctCells}칸`,
        answerExplanation: `${target}는 ${value}명이고 눈금 한 칸이 ${configuration.peoplePerCell}명이므로 ${value} ÷ ${configuration.peoplePerCell} = ${correctCells}, 곧 ${correctCells}칸까지 그립니다.`,
        ...Object.fromEntries(
          candidates.flatMap((cells, candidateIndex) => [
            [`candidate${candidateIndex + 1}`, `${cells}칸`],
            [`candidate${candidateIndex + 1}Latex`, `${cells}칸`]
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: BAR_GRAPH_REPRESENT_CELLS_GENERATOR_ID,
        generatorVersion: BAR_GRAPH_REPRESENT_CELLS_GENERATOR_VERSION,
        seed
      }
    };
  });
}
