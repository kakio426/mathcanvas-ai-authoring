import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  BALANCED_EQUATION_GENERATOR_ID,
  BALANCED_EQUATION_GENERATOR_VERSION
} from "../item-generators/balanced-equation.js";

const pieceRoles = Array.from(
  { length: 6 },
  (_, index) => `piece-card-${index + 1}`
);
const piecePaths = Array.from(
  { length: 6 },
  (_, index) => `piece${index + 1}`
);
const topCellRoles = Array.from(
  { length: 18 },
  (_, index) => `top-cell-${index + 1}`
);
const bottomCellRoles = Array.from(
  { length: 18 },
  (_, index) => `bottom-cell-${index + 1}`
);
const equationRoles = [
  "left-a",
  "plus-left",
  "left-b",
  "equals",
  "right-c",
  "plus-right",
  "answer-slot"
];

const block = (
  id: string,
  kind: "band" | "row" | "slot",
  preset: string,
  repeat: "once" | "each-item",
  collisionGroup?: string
) => ({
  id,
  kind,
  preset,
  repeat,
  ...(collisionGroup ? { collisionGroup } : {}),
  children: []
});

const formulaRole = (
  role: string,
  text: string,
  binding?: string
) => ({
  role,
  scope: "each-item" as const,
  layoutRole: role,
  idRole: role,
  toolKey: "common.formula",
  intentKind: "latex",
  locked: true,
  movable: false,
  instructionalIntent:
    "등호 양쪽의 수와 연산 기호를 같은 수식 중심선에 표시합니다.",
  properties: { text, fontSize: 58 },
  bindings: binding ? { text: binding } : {},
  containerRole: "work-panel"
});

const unitCellRole = (
  prefix: "top" | "bottom",
  number: number
) => ({
  role: `${prefix}-cell-${number}`,
  scope: "each-item" as const,
  layoutRole: `${prefix}-cell-${number}`,
  idRole: `${prefix}-cell-${number}`,
  toolKey: "common.rectangle",
  intentKind: "draw-rectangle",
  locked: true,
  movable: false,
  instructionalIntent:
    prefix === "top"
      ? "왼쪽 식의 값을 같은 크기의 칸으로 나타냅니다."
      : "오른쪽 식의 보이는 값을 나타내고, 학생이 고른 수만큼 이어 표시하게 합니다.",
  properties: { fill: "#FFFFFF", stroke: "#65758B" },
  bindings: { fill: `item.${prefix}Fill${number}` },
  containerRole: "work-panel"
});

const pieceRole = (number: number) => ({
  role: `piece-card-${number}`,
  scope: "each-item" as const,
  layoutRole: `piece-card-${number}`,
  idRole: `piece-card-${number}`,
  toolKey: "NO04NT",
  intentKind: "number-card",
  locked: false,
  movable: true,
  instructionalIntent:
    "등호 양쪽의 값을 같게 만들 수인지 판단하여 빈칸으로 옮깁니다.",
  properties: {},
  bindings: { value: `item.piece${number}` },
  containerRole: "work-panel"
});

export const balancedEquationCardsBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: "relation.equal-sign.balanced-equation.cards-v1",
  version: "1.0.0",
  title: "등호 양쪽의 값 맞추기",
  learningObjective:
    "등호를 사용하여 크기가 같은 두 양의 관계를 식으로 나타낼 수 있다.",
  curriculumBinding: {
    standardCode: "[4수02-03]",
    domain: "변화와 관계",
    officialGoal:
      "등호를 사용하여 크기가 같은 두 양의 관계를 식으로 나타낼 수 있다."
  },
  generator: {
    id: BALANCED_EQUATION_GENERATOR_ID,
    version: BALANCED_EQUATION_GENERATOR_VERSION,
    parameters: { problemCount: 3, difficulty: "normal" }
  },
  toolRoles: [
    {
      role: "instruction-predict",
      scope: "activity",
      layoutRole: "instruction-predict",
      idRole: "instruction-predict",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent:
        "카드를 옮기기 전에 등호 양쪽을 같게 할 수를 예상하게 합니다.",
      properties: {
        text: "① 카드를 옮기기 전에, 답 카드 자리에 알맞은 수를 예상해 써 보세요.",
        fontSize: 34
      },
      bindings: {}
    },
    {
      role: "instruction-verify",
      scope: "activity",
      layoutRole: "instruction-verify",
      idRole: "instruction-verify",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent:
        "수 카드를 고르고 두 줄의 단위 칸 끝을 비교하여 등호의 뜻을 확인하게 합니다.",
      properties: {
        text: "② 수 카드 한 장을 답 카드 자리에 놓고, 위아래 두 줄의 끝을 비교하세요.",
        fontSize: 34
      },
      bindings: {}
    },
    {
      role: "instruction-explain",
      scope: "activity",
      layoutRole: "instruction-explain",
      idRole: "instruction-explain",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent:
        "끝점이 다르면 선택을 고치고 등호 양쪽의 관계를 설명하게 합니다.",
      properties: {
        text: "③ 위아래 두 줄의 끝이 다르면 카드를 바꾸고, 생각을 고친 까닭을 써 보세요.",
        fontSize: 34
      },
      bindings: {}
    },
    {
      role: "work-panel",
      scope: "each-item",
      layoutRole: "work-panel",
      idRole: "work-panel",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "예상·선택·확인·설명 영역을 묶습니다.",
      properties: { fill: "#F7FAFF", stroke: "#65758B" },
      bindings: {}
    },
    {
      role: "number",
      scope: "each-item",
      layoutRole: "number",
      idRole: "number",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "문항 순서를 표시합니다.",
      properties: { fontSize: 30 },
      bindings: { text: "item.orderLabel" },
      containerRole: "work-panel"
    },
    {
      role: "prediction-label",
      scope: "each-item",
      layoutRole: "prediction-label",
      idRole: "prediction-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "카드를 옮기기 전의 생각을 쓰는 곳입니다.",
      properties: { text: "내가 예상한 수", fontSize: 25 },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "prediction-box",
      scope: "each-item",
      layoutRole: "prediction-box",
      idRole: "prediction-box",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "예상을 먼저 기록하는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {},
      containerRole: "work-panel"
    },
    formulaRole("left-a", "", "item.aText"),
    formulaRole("plus-left", "+"),
    formulaRole("left-b", "", "item.bText"),
    formulaRole("equals", "="),
    formulaRole("right-c", "", "item.cText"),
    formulaRole("plus-right", "+"),
    {
      role: "answer-slot",
      scope: "each-item",
      layoutRole: "answer-slot",
      idRole: "answer-slot",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "선택한 수 카드 한 장을 놓는 빈칸입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#287EA8",
        strokeDashArray: "10 8"
      },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "top-row-label",
      scope: "each-item",
      layoutRole: "top-row-label",
      idRole: "top-row-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "등호 왼쪽 식의 값을 나타낸 줄입니다.",
      properties: { text: "등호 왼쪽", fontSize: 25 },
      bindings: {},
      containerRole: "work-panel"
    },
    ...topCellRoles.map((_, index) =>
      unitCellRole("top", index + 1)
    ),
    {
      role: "bottom-row-label",
      scope: "each-item",
      layoutRole: "bottom-row-label",
      idRole: "bottom-row-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "등호 오른쪽 식의 값을 나타낼 줄입니다.",
      properties: { text: "등호 오른쪽", fontSize: 25 },
      bindings: {},
      containerRole: "work-panel"
    },
    ...bottomCellRoles.map((_, index) =>
      unitCellRole("bottom", index + 1)
    ),
    {
      role: "marking-hint",
      scope: "each-item",
      layoutRole: "marking-hint",
      idRole: "marking-hint",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent:
        "고른 수만큼 오른쪽 줄의 빈칸을 이어 표시하게 합니다.",
      properties: {
        text: "고른 수만큼 이어서 표시하기",
        fontSize: 24
      },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "pool-label",
      scope: "each-item",
      layoutRole: "pool-label",
      idRole: "pool-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "고를 수 있는 수 카드를 안내합니다.",
      properties: { text: "수 카드", fontSize: 26 },
      bindings: {},
      containerRole: "work-panel"
    },
    ...pieceRoles.map((_, index) => pieceRole(index + 1)),
    {
      role: "explanation-label",
      scope: "each-item",
      layoutRole: "explanation-label",
      idRole: "explanation-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "선택을 고친 까닭과 등호의 뜻을 쓰게 합니다.",
      properties: { text: "생각과 까닭", fontSize: 25 },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "explanation-box",
      scope: "each-item",
      layoutRole: "explanation-box",
      idRole: "explanation-box",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "학생의 설명과 수정 이유를 남기는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {},
      containerRole: "work-panel"
    }
  ],
  layout: {
    tokenSet: "wave5-balanced-equation-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        block("instruction-predict", "row", "header.primary", "once"),
        block("instruction-verify", "row", "header.secondary", "once"),
        block("instruction-explain", "row", "header.tertiary", "once"),
        block("work-panel", "band", "item.panel", "each-item"),
        block("number", "slot", "item.number", "each-item"),
        block(
          "prediction-label",
          "slot",
          "item.prediction-label",
          "each-item"
        ),
        block(
          "prediction-box",
          "slot",
          "item.prediction-box",
          "each-item"
        ),
        ...equationRoles.map((role) =>
          block(
            role,
            "slot",
            `item.${role}`,
            "each-item",
            "equation-rail"
          )
        ),
        block(
          "top-row-label",
          "slot",
          "item.top-row-label",
          "each-item"
        ),
        ...topCellRoles.map((role) =>
          block(role, "slot", `item.${role}`, "each-item", "top-row")
        ),
        block(
          "bottom-row-label",
          "slot",
          "item.bottom-row-label",
          "each-item"
        ),
        ...bottomCellRoles.map((role) =>
          block(
            role,
            "slot",
            `item.${role}`,
            "each-item",
            "bottom-row"
          )
        ),
        block(
          "marking-hint",
          "slot",
          "item.marking-hint",
          "each-item"
        ),
        block("pool-label", "slot", "item.pool-label", "each-item"),
        ...pieceRoles.map((role) =>
          block(
            role,
            "slot",
            `item.${role}`,
            "each-item",
            "piece-pool"
          )
        ),
        block(
          "explanation-label",
          "slot",
          "item.explanation-label",
          "each-item"
        ),
        block(
          "explanation-box",
          "slot",
          "item.explanation-box",
          "each-item"
        )
      ]
    }
  },
  constraints: [
    {
      id: "select-answer-card",
      kind: "select-one-of",
      sources: pieceRoles.map((role) => ({
        scope: "each-item" as const,
        role
      })),
      target: { scope: "each-item", role: "answer-slot" },
      parameters: {},
      requiresStudentAction: true
    }
  ],
  valuePredicates: [
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "select-one",
        decisionConstraintId: "select-answer-card",
        candidateRoles: pieceRoles,
        candidateProperty: "value",
        correctValuePath: "solution",
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: [
          "top-cell-1",
          "top-cell-18",
          "bottom-cell-1",
          "bottom-cell-18"
        ]
      }
    },
    {
      kind: "values.balanced-equation-distractors",
      parameters: {
        aPath: "a",
        bPath: "b",
        cPath: "c",
        solutionPath: "solution",
        operationalAnswerPath: "operationalAnswer",
        mirrorValuePath: "mirrorValue",
        nearMissValuePath: "nearMissValue",
        surplusPath: "surplusPieces",
        unitCellCountPath: "unitCellCount",
        piecePaths,
        minimumSurplus: 2
      }
    },
    {
      kind: "values.no-duplicate-combination",
      parameters: { valuePaths: ["a", "b", "c"] }
    },
    {
      kind: "geometry.countable-unit-frame",
      parameters: {
        cellRoles: topCellRoles,
        expectedCountPath: "unitCellCount",
        rowCount: 1,
        columnCount: 18
      }
    },
    {
      kind: "geometry.countable-unit-frame",
      parameters: {
        cellRoles: bottomCellRoles,
        expectedCountPath: "unitCellCount",
        rowCount: 1,
        columnCount: 18
      }
    },
    {
      kind: "visual.equation-rail",
      parameters: {
        roles: equationRoles,
        operatorRoles: [
          "left-a",
          "plus-left",
          "left-b",
          "equals",
          "right-c",
          "plus-right"
        ],
        centerTolerance: 2,
        maxGapDelta: 2,
        fontSize: 58
      }
    },
    {
      kind: "language.classroom-korean",
      parameters: {
        instructionRoles: [
          "instruction-predict",
          "instruction-verify",
          "instruction-explain"
        ],
        labelRoles: [
          "prediction-label",
          "top-row-label",
          "bottom-row-label",
          "marking-hint",
          "pool-label",
          "explanation-label"
        ],
        maximumInstructionLength: 70,
        maximumLabelLength: 18
      }
    },
    {
      kind: "visual.text-fit",
      parameters: {
        roles: [
          "instruction-predict",
          "instruction-verify",
          "instruction-explain",
          "prediction-label",
          "top-row-label",
          "bottom-row-label",
          "marking-hint",
          "pool-label",
          "explanation-label"
        ],
        maximumFillRatio: 0.96
      }
    },
    {
      kind: "visual.labeled-pool-row",
      parameters: {
        labelRole: "pool-label",
        memberRoles: pieceRoles,
        containerRole: "work-panel",
        rowCenterTolerance: 2,
        gapTolerance: 2,
        groupCenterTolerance: 2,
        labelAlignmentTolerance: 2,
        minimumLabelGap: 12,
        maximumLabelGap: 24
      }
    },
    {
      kind: "visual.no-overlap",
      parameters: {
        roles: [
          "prediction-label",
          "prediction-box",
          ...equationRoles,
          "top-row-label",
          ...topCellRoles,
          "bottom-row-label",
          ...bottomCellRoles,
          "marking-hint",
          "pool-label",
          ...pieceRoles,
          "explanation-label",
          "explanation-box"
        ]
      }
    }
  ],
  instructions: [
    "카드를 옮기기 전에, 답 카드 자리에 알맞은 수를 예상해 써 보세요.",
    "수 카드 한 장을 답 카드 자리에 놓고, 위아래 두 줄의 끝을 비교하세요.",
    "위아래 두 줄의 끝이 다르면 카드를 바꾸고, 생각을 고친 까닭을 써 보세요."
  ],
  payload: {
    categoryId: MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId,
    tags: [
      "등호",
      "동치 관계",
      "수 카드",
      "양쪽의 값",
      "예상과 수정"
    ],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: { problemCount: 3, difficulty: "normal" }
});
