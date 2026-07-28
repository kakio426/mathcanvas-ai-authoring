import {
  ACTIVITY_SPEC_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  VERIFIED_TEMPLATE_ID,
  activitySpecSchema,
  createSeededRandom,
  templateDefinitionSchema,
  type ActivityProblem,
  type ActivitySpec,
  type Difficulty,
  type Recommendation,
  type TemplateDefinition
} from "@mathcanvas/contracts";
import { LEARNING_MAP_COMMIT } from "@mathcanvas/curriculum";

export const FRACTION_TEMPLATE_VERSION = "1.0.0" as const;

export const fractionComparisonTemplateDefinition: TemplateDefinition =
  templateDefinitionSchema.parse({
    id: VERIFIED_TEMPLATE_ID,
    version: FRACTION_TEMPLATE_VERSION,
    supportedGradeBands: ["5-6"],
    supportedStandards: ["[6수01-07]"],
    supportedProblemCount: { min: 2, max: 6 },
    requiredModules: ["NO03FM", "input-text", "math-latex", "drawElem"],
    confidenceThreshold: 0.9
  });

type FractionPair = readonly [
  leftNumerator: number,
  leftDenominator: number,
  rightNumerator: number,
  rightDenominator: number
];

const pairBank: Record<Difficulty, readonly FractionPair[]> = {
  easy: [
    [1, 2, 3, 4],
    [2, 3, 1, 2],
    [1, 3, 3, 4],
    [3, 5, 1, 2],
    [2, 5, 3, 4],
    [3, 4, 2, 3],
    [1, 4, 2, 3],
    [4, 5, 1, 2]
  ],
  normal: [
    [4, 5, 2, 3],
    [3, 4, 3, 5],
    [4, 7, 3, 4],
    [3, 8, 3, 5],
    [5, 6, 4, 7],
    [2, 7, 1, 2],
    [5, 8, 3, 7],
    [4, 9, 2, 3]
  ],
  hard: [
    [5, 8, 8, 11],
    [7, 10, 5, 9],
    [4, 7, 7, 9],
    [7, 9, 5, 8],
    [5, 11, 7, 12],
    [7, 12, 3, 4],
    [8, 11, 5, 9],
    [6, 11, 7, 9]
  ]
};

export interface GenerateActivitySpecOptions {
  seed: string;
  generatedAt: string;
  activityId?: string;
}

function shuffledPairs(
  difficulty: Difficulty,
  count: number,
  seed: string
): FractionPair[] {
  const uniquePairs = new Set(
    pairBank[difficulty].map((pair) =>
      [
        `${pair[0]}/${pair[1]}`,
        `${pair[2]}/${pair[3]}`
      ]
        .sort()
        .join("|")
    )
  );
  if (uniquePairs.size !== pairBank[difficulty].length) {
    throw new Error(`${difficulty} 문제 은행에 같은 분수 비교가 중복되었습니다.`);
  }
  const random = createSeededRandom(`${seed}:${difficulty}:${count}`);
  const pairs = [...pairBank[difficulty]];
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

function makeProblem(
  pair: FractionPair,
  order: number,
  difficulty: Difficulty
): ActivityProblem {
  const [leftNumerator, leftDenominator, rightNumerator, rightDenominator] =
    pair;
  const leftCross = leftNumerator * rightDenominator;
  const rightCross = rightNumerator * leftDenominator;
  if (leftCross === rightCross) {
    throw new Error("첫 템플릿에는 크기가 같은 분수 쌍을 사용할 수 없습니다.");
  }
  const visualDifference = Math.abs(
    leftNumerator / leftDenominator -
      rightNumerator / rightDenominator
  );
  if (visualDifference < MIN_VISUAL_FRACTION_DIFFERENCE_RATIO) {
    throw new Error(
      `분수 띠 길이 차이는 전체의 ${MIN_VISUAL_FRACTION_DIFFERENCE_RATIO * 100}% 이상이어야 합니다.`
    );
  }
  const correctRelation = leftCross > rightCross ? ">" : "<";
  return {
    id: `problem-${order}`,
    order,
    left: { numerator: leftNumerator, denominator: leftDenominator },
    right: { numerator: rightNumerator, denominator: rightDenominator },
    correctRelation,
    difficulty,
    explanation:
      correctRelation === ">"
        ? "같은 전체에서 첫째 분수 띠가 더 깁니다."
        : "같은 전체에서 둘째 분수 띠가 더 깁니다."
  };
}

export function generateFractionComparisonActivity(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
): ActivitySpec {
  if (
    !recommendation.supported ||
    recommendation.templateId !== VERIFIED_TEMPLATE_ID ||
    recommendation.standardCode !== "[6수01-07]" ||
    recommendation.curriculum === undefined ||
    recommendation.problemCount === undefined ||
    recommendation.difficulty === undefined ||
    recommendation.manipulation !== "fraction-strip-common-start-drag"
  ) {
    throw new Error("검증된 분수 비교 추천안만 활동으로 만들 수 있습니다.");
  }
  if (
    recommendation.confidence <
    fractionComparisonTemplateDefinition.confidenceThreshold
  ) {
    throw new Error("추천 신뢰도가 템플릿 생성 기준보다 낮습니다.");
  }
  const generatedAt = new Date(options.generatedAt);
  if (Number.isNaN(generatedAt.getTime())) {
    throw new Error("generatedAt은 올바른 ISO 날짜여야 합니다.");
  }

  const problemCount = recommendation.problemCount;
  const problems = shuffledPairs(
    recommendation.difficulty,
    problemCount,
    options.seed
  ).map((pair, index) =>
    makeProblem(pair, index + 1, recommendation.difficulty!)
  );
  const height = 320 + problemCount * 620;
  const visualModels: ActivitySpec["visualModels"] = [];
  const fixedObjects: ActivitySpec["fixedObjects"] = [
    {
      id: "instruction-main",
      kind: "instruction" as const,
      bounds: { x: 240, y: 80, width: 1920, height: 100 },
      locked: true as const,
      text: "분수 띠를 같은 출발선에 놓아요."
    },
    {
      id: "instruction-symbol",
      kind: "instruction" as const,
      bounds: { x: 240, y: 204, width: 1920, height: 70 },
      locked: true as const,
      text: "두 띠의 길이를 보고 알맞은 기호를 놓아요."
    }
  ];
  const movableObjects: ActivitySpec["movableObjects"] = [];
  const dropAreas: ActivitySpec["dropAreas"] = [];

  for (const problem of problems) {
    const top = 260 + (problem.order - 1) * 620;
    const prefix = problem.id;
    const commonStartX = 720;
    const wholeWidth = 640;

    visualModels.push(
      {
        id: `${prefix}-left-strip`,
        problemId: prefix,
        role: "left-strip" as const,
        fraction: problem.left,
        bounds: { x: 250, y: top + 400, width: 640, height: 80 },
        wholeWidth,
        segmentHeight: 80,
        commonStartX,
        color: "#FFA26C",
        movable: true as const
      },
      {
        id: `${prefix}-right-strip`,
        problemId: prefix,
        role: "right-strip" as const,
        fraction: problem.right,
        bounds: { x: 1510, y: top + 400, width: 640, height: 80 },
        wholeWidth,
        segmentHeight: 80,
        commonStartX,
        color: "#65F0FF",
        movable: true as const
      }
    );

    fixedObjects.push(
      {
        id: `${prefix}-mat`,
        kind: "comparison-mat" as const,
        bounds: { x: 620, y: top + 60, width: 1160, height: 300 },
        locked: true as const,
        text: `${problem.order}번 비교판`
      },
      {
        id: `${prefix}-start-line`,
        kind: "common-start-line" as const,
        bounds: { x: commonStartX - 8, y: top + 120, width: 16, height: 180 },
        locked: true as const,
        text: "출발선"
      }
    );

    movableObjects.push(
      {
        id: `${prefix}-left-movable`,
        kind: "fraction-strip" as const,
        problemId: prefix,
        sourceModelId: `${prefix}-left-strip`,
        bounds: { x: 250, y: top + 400, width: 640, height: 80 },
        mathematicalDecision:
          "첫 번째 분수 띠를 같은 전체의 출발선에 맞춥니다."
      },
      {
        id: `${prefix}-right-movable`,
        kind: "fraction-strip" as const,
        problemId: prefix,
        sourceModelId: `${prefix}-right-strip`,
        bounds: { x: 1510, y: top + 400, width: 640, height: 80 },
        mathematicalDecision:
          "두 번째 분수 띠를 같은 전체의 출발선에 맞춥니다."
      },
      {
        id: `${prefix}-less-symbol`,
        kind: "comparison-symbol" as const,
        problemId: prefix,
        bounds: { x: 1010, y: top + 400, width: 100, height: 100 },
        mathematicalDecision: "두 분수의 크기를 보고 알맞은 기호를 고릅니다."
      },
      {
        id: `${prefix}-greater-symbol`,
        kind: "comparison-symbol" as const,
        problemId: prefix,
        bounds: { x: 1160, y: top + 400, width: 100, height: 100 },
        mathematicalDecision: "두 분수의 크기를 보고 알맞은 기호를 고릅니다."
      }
    );

    dropAreas.push(
      {
        id: `${prefix}-left-lane`,
        problemId: prefix,
        kind: "comparison-lane" as const,
        bounds: { x: commonStartX, y: top + 120, width: 640, height: 80 },
        accepts: [`${prefix}-left-movable`],
        label: "첫째 띠"
      },
      {
        id: `${prefix}-right-lane`,
        problemId: prefix,
        kind: "comparison-lane" as const,
        bounds: { x: commonStartX, y: top + 220, width: 640, height: 80 },
        accepts: [`${prefix}-right-movable`],
        label: "둘째 띠"
      },
      {
        id: `${prefix}-relation-slot`,
        problemId: prefix,
        kind: "relation-slot" as const,
        bounds: { x: 1430, y: top + 160, width: 120, height: 120 },
        accepts: [
          `${prefix}-less-symbol`,
          `${prefix}-greater-symbol`
        ],
        label: "기호 놓는 곳"
      }
    );
  }

  return activitySpecSchema.parse({
    schemaVersion: ACTIVITY_SPEC_SCHEMA_VERSION,
    id: options.activityId ?? `fraction-compare-${options.seed}`,
    seed: options.seed,
    title: "분수 띠로 크기 비교하기",
    learningObjective: recommendation.learningGoal,
    curriculumReferences: [recommendation.curriculum],
    recommendationSnapshot: recommendation,
    problems,
    visualModels,
    fixedObjects,
    movableObjects,
    dropAreas,
    layout: {
      width: 2400,
      height,
      viewBox: [0, 0, 2400, height],
      minGap: 24
    },
    instructions: [
      "분수 띠를 같은 출발선에 놓아요.",
      "두 띠의 길이를 보고 알맞은 기호를 놓아요."
    ],
    provenance: {
      generatedAt: generatedAt.toISOString(),
      requestId: recommendation.requestId,
      curriculumSourceIds: [
        recommendation.curriculum.officialSource.sourceId,
        ...recommendation.curriculum.auxiliarySources.map(
          (source) => source.sourceId
        )
      ],
      auxiliarySnapshotSha: LEARNING_MAP_COMMIT
    },
    templateId: VERIFIED_TEMPLATE_ID,
    templateVersion: FRACTION_TEMPLATE_VERSION
  });
}
