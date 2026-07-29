import {
  ACTIVITY_SET_SPEC_SCHEMA_VERSION,
  CANVAS_ACTIVITY_SPEC_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  VERIFIED_TEMPLATE_ID,
  activitySetDraftSchema,
  activitySetHash,
  activitySetSpecSchema,
  canvasActivityDraftSchema,
  canvasActivityHash,
  canvasActivitySpecSchema,
  createSeededRandom,
  templateDefinitionSchema,
  type ActivityProblem,
  type ActivitySetSpec,
  type CanvasActivitySpec,
  type Difficulty,
  type Recommendation,
  type TemplateDefinition
} from "@mathcanvas/contracts";
import { LEARNING_MAP_COMMIT } from "@mathcanvas/curriculum";

export const FRACTION_TEMPLATE_VERSION = "2.0.0" as const;

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

export const VISUAL_DIFFERENCE_BANDS: Readonly<
  Record<Difficulty, { min: number; max: number }>
> = {
  easy: { min: 0.28, max: 0.56 },
  normal: { min: 0.15, max: 0.27 },
  hard: { min: MIN_VISUAL_FRACTION_DIFFERENCE_RATIO, max: 0.145 }
};

export interface GenerateActivitySetOptions {
  seed: string;
  generatedAt: string;
  setId?: string;
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
  const differenceBand = VISUAL_DIFFERENCE_BANDS[difficulty];
  if (
    visualDifference < differenceBand.min ||
    visualDifference > differenceBand.max
  ) {
    throw new Error(
      `${difficulty} 문제의 시각적 차이가 난이도 범위와 맞지 않습니다.`
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
        ? `같은 전체에서 두 띠를 같은 출발선에 놓으면 ${leftNumerator}/${leftDenominator} 띠가 더 깁니다. 더 큰 분수는 ${leftNumerator}/${leftDenominator}입니다.`
        : `같은 전체에서 두 띠를 같은 출발선에 놓으면 ${rightNumerator}/${rightDenominator} 띠가 더 깁니다. 더 큰 분수는 ${rightNumerator}/${rightDenominator}입니다.`
  };
}

export function generateFractionComparisonActivitySet(
  recommendation: Recommendation,
  options: GenerateActivitySetOptions
): ActivitySetSpec {
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
  const draft = activitySetDraftSchema.parse({
    schemaVersion: ACTIVITY_SET_SPEC_SCHEMA_VERSION,
    setId: options.setId ?? `fraction-compare-set-${options.seed}`,
    seed: options.seed,
    title: "분수 띠로 크기 비교하기",
    grade: recommendation.recommendedGrade,
    gradeBand: recommendation.gradeBand,
    standardCode: recommendation.standardCode,
    learningObjective: recommendation.learningGoal,
    problemCount,
    difficulty: recommendation.difficulty,
    manipulation: recommendation.manipulation,
    problems,
    curriculumReferences: [recommendation.curriculum],
    recommendationSnapshot: recommendation,
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
  return activitySetSpecSchema.parse({
    ...draft,
    setHash: activitySetHash(draft)
  });
}

function fractionRenderedWidth(
  fraction: ActivityProblem["left"],
  wholeWidth: number
): number {
  return (wholeWidth / fraction.denominator) * fraction.numerator;
}

function buildCanvasActivity(
  set: ActivitySetSpec,
  problem: ActivityProblem
): CanvasActivitySpec {
  const prefix = problem.id;
  const wholeWidth = 640;
  const segmentHeight = 80;
  const commonStartX = 300;
  const leftSourceX = 80;
  const rightSourceX = 660;
  const leftWidth = fractionRenderedWidth(problem.left, wholeWidth);
  const rightWidth = fractionRenderedWidth(problem.right, wholeWidth);
  const draft = canvasActivityDraftSchema.parse({
    schemaVersion: CANVAS_ACTIVITY_SPEC_SCHEMA_VERSION,
    canvasId: `${set.setId}-canvas-${problem.order}`,
    setId: set.setId,
    setHash: set.setHash,
    canvasIndex: problem.order,
    canvasCount: set.problemCount,
    seed: `${set.seed}:canvas:${problem.order}`,
    title: set.title,
    grade: set.grade,
    standardCode: set.standardCode,
    learningObjective: set.learningObjective,
    curriculumReferences: set.curriculumReferences,
    recommendationSnapshot: set.recommendationSnapshot,
    problem,
    visualModels: [
      {
        id: `${prefix}-left-strip`,
        problemId: prefix,
        role: "left-strip",
        fraction: problem.left,
        bounds: {
          x: leftSourceX,
          y: 310,
          width: leftWidth,
          height: segmentHeight
        },
        wholeWidth,
        segmentHeight,
        commonStartX,
        color: "#FFA26C",
        movable: true
      },
      {
        id: `${prefix}-right-strip`,
        problemId: prefix,
        role: "right-strip",
        fraction: problem.right,
        bounds: {
          x: rightSourceX,
          y: 430,
          width: rightWidth,
          height: segmentHeight
        },
        wholeWidth,
        segmentHeight,
        commonStartX,
        color: "#65D9F2",
        movable: true
      }
    ],
    fixedObjects: [
      {
        id: "instruction-main",
        kind: "instruction",
        bounds: { x: 160, y: 82, width: 960, height: 54 },
        locked: true,
        text: "두 띠를 출발선에 맞춰 비교해 보세요."
      },
      {
        id: `${prefix}-order-label`,
        kind: "label",
        bounds: { x: 1060, y: 24, width: 160, height: 42 },
        locked: true,
        text: `${problem.order}/${set.problemCount}`
      },
      {
        id: `${prefix}-mat`,
        kind: "comparison-mat",
        bounds: { x: 80, y: 160, width: 1120, height: 380 },
        locked: true,
        text: "분수 비교판"
      },
      {
        id: `${prefix}-start-line`,
        kind: "common-start-line",
        bounds: { x: commonStartX - 6, y: 306, width: 12, height: 194 },
        locked: true,
        text: "출발선"
      },
      {
        id: `${prefix}-start-label`,
        kind: "label",
        bounds: { x: 170, y: 388, width: 110, height: 42 },
        locked: true,
        text: "출발선"
      },
      {
        id: `${prefix}-symbol-label`,
        kind: "label",
        bounds: { x: 240, y: 582, width: 210, height: 42 },
        locked: true,
        text: "알맞은 기호"
      },
      {
        id: `${prefix}-response-label`,
        kind: "label",
        bounds: { x: 145, y: 696, width: 210, height: 42 },
        locked: true,
        text: "비교한 까닭"
      }
    ],
    movableObjects: [
      {
        id: `${prefix}-left-movable`,
        kind: "fraction-strip",
        problemId: prefix,
        sourceModelId: `${prefix}-left-strip`,
        bounds: {
          x: leftSourceX,
          y: 310,
          width: leftWidth,
          height: segmentHeight
        },
        mathematicalDecision: "첫째 띠의 시작을 출발선에 맞춥니다."
      },
      {
        id: `${prefix}-right-movable`,
        kind: "fraction-strip",
        problemId: prefix,
        sourceModelId: `${prefix}-right-strip`,
        bounds: {
          x: rightSourceX,
          y: 430,
          width: rightWidth,
          height: segmentHeight
        },
        mathematicalDecision: "둘째 띠의 시작을 출발선에 맞춥니다."
      },
      {
        id: `${prefix}-less-symbol`,
        kind: "comparison-symbol",
        problemId: prefix,
        bounds: { x: 500, y: 560, width: 96, height: 96 },
        mathematicalDecision: "두 띠의 길이를 보고 작은 쪽을 나타냅니다."
      },
      {
        id: `${prefix}-greater-symbol`,
        kind: "comparison-symbol",
        problemId: prefix,
        bounds: { x: 660, y: 560, width: 96, height: 96 },
        mathematicalDecision: "두 띠의 길이를 보고 큰 쪽을 나타냅니다."
      }
    ],
    inputObjects: [
      {
        id: `${prefix}-explanation-input`,
        kind: "explanation-text",
        problemId: prefix,
        bounds: { x: 380, y: 680, width: 760, height: 72 },
        placeholder: "띠의 길이를 보고 한 줄로 써 보세요.",
        editable: true,
        collectResponse: false
      }
    ],
    placementGuides: [
      {
        id: `${prefix}-left-lane`,
        problemId: prefix,
        kind: "comparison-lane",
        bounds: {
          x: commonStartX,
          y: 310,
          width: wholeWidth,
          height: segmentHeight
        },
        intendedObjectIds: [`${prefix}-left-movable`],
        label: "첫째 띠 자리",
        behavior: "visual-guide-only"
      },
      {
        id: `${prefix}-right-lane`,
        problemId: prefix,
        kind: "comparison-lane",
        bounds: {
          x: commonStartX,
          y: 430,
          width: wholeWidth,
          height: segmentHeight
        },
        intendedObjectIds: [`${prefix}-right-movable`],
        label: "둘째 띠 자리",
        behavior: "visual-guide-only"
      },
      {
        id: `${prefix}-relation-slot`,
        problemId: prefix,
        kind: "relation-slot",
        bounds: { x: 585, y: 174, width: 110, height: 110 },
        intendedObjectIds: [
          `${prefix}-less-symbol`,
          `${prefix}-greater-symbol`
        ],
        label: "기호 자리",
        behavior: "visual-guide-only"
      }
    ],
    layout: {
      width: 1280,
      height: 800,
      viewBox: [0, 0, 1280, 800],
      stageRatio: "16:10",
      minGap: 16
    },
    instructions: ["두 띠를 출발선에 맞춰 비교해 보세요."],
    provenance: set.provenance,
    templateId: set.templateId,
    templateVersion: set.templateVersion
  });
  return canvasActivitySpecSchema.parse({
    ...draft,
    canvasHash: canvasActivityHash(draft)
  });
}

export function splitActivitySetIntoCanvases(
  input: ActivitySetSpec
): CanvasActivitySpec[] {
  const set = activitySetSpecSchema.parse(input);
  if (activitySetHash(set) !== set.setHash) {
    throw new Error("활동 세트 해시가 내용과 맞지 않습니다.");
  }
  return set.problems.map((problem) => buildCanvasActivity(set, problem));
}
