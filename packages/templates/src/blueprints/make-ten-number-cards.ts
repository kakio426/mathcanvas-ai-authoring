import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  NUMBER_BOND_TEN_GENERATOR_ID,
  NUMBER_BOND_TEN_GENERATOR_VERSION
} from "../item-generators/number-bond-ten.js";

const pieceRoles = Array.from(
  { length: 6 },
  (_, index) => `piece-card-${index + 1}`
);
const piecePaths = Array.from(
  { length: 6 },
  (_, index) => `piece${index + 1}`
);
const frameCellRoles = Array.from(
  { length: 10 },
  (_, index) => `frame-cell-${index + 1}`
);
const equationRoles = [
  "left-slot",
  "plus-operator",
  "right-slot",
  "equals-operator",
  "total-value"
];

const block = (
  id: string,
  kind: "band" | "row" | "slot",
  preset: string,
  repeat: "once" | "each-item",
  groups: {
    flowGroup?: string;
    collisionGroup?: string;
  } = {}
) => ({ id, kind, preset, repeat, ...groups, children: [] });

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
    "여러 후보 중 10을 만들 수 있는 두 수를 판단하여 옮깁니다.",
  properties: {},
  bindings: { value: `item.piece${number}` }
});

const frameCellRole = (number: number) => ({
  role: `frame-cell-${number}`,
  scope: "each-item" as const,
  layoutRole: `frame-cell-${number}`,
  idRole: `frame-cell-${number}`,
  toolKey: "common.rectangle",
  intentKind: "draw-rectangle",
  locked: true,
  movable: false,
  instructionalIntent:
    "선택한 두 수의 합을 하나씩 세어 확인하는 열 칸의 단위입니다.",
  properties: {
    fill: "#FFFFFF",
    stroke: "#65758B"
  },
  bindings: {},
  containerRole: "work-panel"
});

const poolSources = pieceRoles.map((role) => ({
  scope: "each-item" as const,
  role
}));

export const makeTenNumberCardsBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: "number.make-10.cards-v1",
  version: "2.1.0",
  title: "여러 방법으로 10 만들기",
  learningObjective:
    "여러 수 중에서 합이 10인 두 수를 찾고, 열 칸 모형을 근거로 다른 방법과 비교하여 설명할 수 있다.",
  curriculumBinding: {
    standardCode: "[2수01-04]",
    domain: "수와 연산",
    officialGoal:
      "하나의 수를 두 수로 분해하고 두 수를 하나의 수로 합성하는 활동을 통하여 수 감각을 기른다."
  },
  generator: {
    id: NUMBER_BOND_TEN_GENERATOR_ID,
    version: NUMBER_BOND_TEN_GENERATOR_VERSION,
    parameters: { problemCount: 4, difficulty: "normal" }
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
        "수 카드를 움직이기 전에 합이 10인 두 수를 예상하게 합니다.",
      properties: {
        text: "① 카드를 옮기기 전에, 합이 10이 되는 두 수를 예상해 써 보세요.",
        fontSize: 40
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
        "열 칸을 하나씩 세어 선택한 합을 스스로 확인하게 합니다.",
      properties: {
        text: "② 수 카드 두 장을 골라 식의 빈칸에 놓고, 10칸에 나타내어 확인하세요.",
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
        "다른 해를 찾고 근거에 따라 선택을 수정하도록 안내합니다.",
      properties: {
        text: "③ 다른 방법도 찾아보세요. 처음 생각과 달랐다면 고친 까닭을 써 보세요.",
        fontSize: 32
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
      instructionalIntent: "예상·구성·검증·설명 영역을 묶습니다.",
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
      properties: { fontSize: 32 },
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
      instructionalIntent: "조작 전 예상을 쓰는 곳을 안내합니다.",
      properties: { text: "예상한 두 수", fontSize: 26 },
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
      instructionalIntent:
        "정답이 없는 상태에서 두 수를 예상해 남기는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {}
    },
    {
      role: "left-slot",
      scope: "each-item",
      layoutRole: "left-slot",
      idRole: "left-slot",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "선택한 첫 번째 수 카드의 구성 칸입니다.",
      properties: {
        fill: "#FFF7E8",
        stroke: "#D49420",
        strokeDashArray: "10 8"
      },
      bindings: {}
    },
    {
      role: "plus-operator",
      scope: "each-item",
      layoutRole: "plus-operator",
      idRole: "plus-operator",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: true,
      movable: false,
      instructionalIntent: "두 부분을 합하는 관계를 표시합니다.",
      properties: { text: "+", fontSize: 64 },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "right-slot",
      scope: "each-item",
      layoutRole: "right-slot",
      idRole: "right-slot",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "선택한 두 번째 수 카드의 구성 칸입니다.",
      properties: {
        fill: "#EAF9FF",
        stroke: "#287EA8",
        strokeDashArray: "10 8"
      },
      bindings: {}
    },
    {
      role: "equals-operator",
      scope: "each-item",
      layoutRole: "equals-operator",
      idRole: "equals-operator",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: true,
      movable: false,
      instructionalIntent: "구성한 합과 전체의 같음을 표시합니다.",
      properties: { text: "=", fontSize: 64 },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "total-value",
      scope: "each-item",
      layoutRole: "total-value",
      idRole: "total-value",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: true,
      movable: false,
      instructionalIntent: "구성해야 하는 전체 10을 표시합니다.",
      properties: { text: "10", fontSize: 64 },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "frame-label",
      scope: "each-item",
      layoutRole: "frame-label",
      idRole: "frame-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "열 칸 모형으로 합을 확인하도록 안내합니다.",
      properties: { text: "10칸에 나타내기", fontSize: 26 },
      bindings: {},
      containerRole: "work-panel"
    },
    ...frameCellRoles.map((_, index) => frameCellRole(index + 1)),
    {
      role: "explanation-label",
      scope: "each-item",
      layoutRole: "explanation-label",
      idRole: "explanation-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "열 칸에서 확인한 수학적 근거를 요구합니다.",
      properties: { text: "다른 방법과 까닭", fontSize: 26 },
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
      instructionalIntent:
        "두 수가 10이 되는 근거와 다른 방법, 수정 내용을 남기는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {}
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
      instructionalIntent: "선택하거나 버릴 수 있는 후보 수 카드 모음을 표시합니다.",
      properties: { text: "수 카드", fontSize: 28 },
      bindings: {}
    },
    ...pieceRoles.map((_, index) => pieceRole(index + 1))
  ],
  layout: {
    tokenSet: "p3-cognitive-make-ten-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        block(
          "instruction-predict",
          "row",
          "header.primary",
          "once",
          { flowGroup: "instructions" }
        ),
        block(
          "instruction-verify",
          "row",
          "header.secondary",
          "once",
          { flowGroup: "instructions" }
        ),
        block(
          "instruction-explain",
          "row",
          "header.tertiary",
          "once",
          { flowGroup: "instructions" }
        ),
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
            { collisionGroup: "equation-rail" }
          )
        ),
        block(
          "frame-label",
          "slot",
          "item.frame-label",
          "each-item"
        ),
        ...frameCellRoles.map((role) =>
          block(
            role,
            "slot",
            `item.${role}`,
            "each-item",
            { collisionGroup: "ten-frame" }
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
        ),
        block("pool-label", "slot", "item.pool-label", "each-item"),
        ...pieceRoles.map((role) =>
          block(
            role,
            "slot",
            `item.${role}`,
            "each-item",
            { collisionGroup: "piece-pool" }
          )
        )
      ]
    }
  },
  constraints: [
    {
      id: "construct-left-slot",
      kind: "fill-from-pool",
      sources: poolSources,
      target: { scope: "each-item", role: "left-slot" },
      parameters: {},
      requiresStudentAction: true
    },
    {
      id: "construct-right-slot",
      kind: "fill-from-pool",
      sources: poolSources,
      target: { scope: "each-item", role: "right-slot" },
      parameters: {},
      requiresStudentAction: true
    }
  ],
  valuePredicates: [
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "construct",
        slotRoles: ["left-slot", "right-slot"],
        pieceRoles,
        pieceProperty: "value",
        totalPath: "total",
        solutionSetPath: "solutions",
        surplusPath: "surplusPieces",
        minimumSolutions: 2,
        minimumSurplus: 2,
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: frameCellRoles
      }
    },
    {
      kind: "values.construction-solution-set",
      parameters: {
        piecePaths,
        solutionSetPath: "solutions",
        totalPath: "total",
        slotCount: 2,
        minimumSolutions: 2
      }
    },
    {
      kind: "values.surplus-piece-present",
      parameters: {
        piecePaths,
        solutionSetPath: "solutions",
        surplusPath: "surplusPieces",
        minimumSurplus: 2
      }
    },
    {
      kind: "values.near-miss-combination",
      parameters: {
        piecePaths,
        nearMissPath: "nearMissCombinations",
        totalPath: "total"
      }
    },
    {
      kind: "visual.discrete-model-consistent",
      parameters: {
        valuePaths: piecePaths,
        sourceRoles: pieceRoles
      }
    },
    {
      kind: "geometry.countable-unit-frame",
      parameters: {
        cellRoles: frameCellRoles,
        expectedCountPath: "unitFrameCells",
        rowCount: 2,
        columnCount: 5
      }
    },
    {
      kind: "visual.equation-rail",
      parameters: {
        roles: equationRoles,
        operatorRoles: [
          "plus-operator",
          "equals-operator",
          "total-value"
        ],
        centerTolerance: 2,
        maxGapDelta: 8,
        fontSize: 64
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
          "frame-label",
          "explanation-label",
          "pool-label"
        ],
        maximumInstructionLength: 70,
        maximumLabelLength: 12
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
          "frame-label",
          "explanation-label",
          "pool-label"
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
        maximumLabelGap: 32
      }
    },
    {
      kind: "visual.no-overlap",
      parameters: {
        roles: [
          "prediction-box",
          "prediction-label",
          ...equationRoles,
          "frame-label",
          ...frameCellRoles,
          "explanation-label",
          "explanation-box",
          "pool-label",
          ...pieceRoles
        ]
      }
    }
  ],
  instructions: [
    "카드를 옮기기 전에, 합이 10이 되는 두 수를 예상해 써 보세요.",
    "수 카드 두 장을 골라 식의 빈칸에 놓고, 10칸에 나타내어 확인하세요.",
    "다른 방법도 찾아보고 처음 생각과 달랐다면 고친 까닭을 써 보세요."
  ],
  payload: {
    categoryId: MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId,
    tags: [
      "10 만들기",
      "수 카드",
      "가르기와 모으기",
      "여러 해",
      "예상과 검증"
    ],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: { problemCount: 4, difficulty: "normal" }
});
