import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  PLACE_VALUE_TEN_EXCHANGE_GENERATOR_ID,
  PLACE_VALUE_TEN_EXCHANGE_GENERATOR_VERSION
} from "../item-generators/place-value-ten-exchange.js";
import {
  CHOICE_CARD_ROLES,
  CHOICE_VALUE_PATHS,
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "./choice-explanation-scaffold.js";

const instructions = [
  "① 옮기기 전에, 처음 수에 십 모형 10개를 더한 수를 골라 놓으세요.",
  "② 십 모형을 묶음판 10칸에 하나씩 놓고, 10줄 100칸을 확인하세요.",
  "③ 처음 생각을 바꿀 수 있고, 십 10개가 수를 어떻게 바꾸는지 쓰세요."
] as const;

const exchangeTenRoles = Array.from(
  { length: 10 },
  (_, index) => `exchange-ten-${index + 1}`
);
const exchangeSlotRoles = Array.from(
  { length: 10 },
  (_, index) => `exchange-slot-${index + 1}`
);
const hundredGridRowRoles = Array.from(
  { length: 10 },
  (_, index) => `hundred-grid-row-${index + 1}`
);

const scaffoldRoles = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "십 모형을 움직이기 전에 자릿값 변화를 예상하게 합니다.",
    "십 모형 열 개를 서로 다른 열 칸에 놓고 100칸과 연결하게 합니다.",
    "십이 열 개 모이면 백이 되는 관계로 처음 선택을 설명하고 수정하게 합니다."
  ],
  questionIntent:
    "처음 수에 십 모형 열 개를 더했을 때의 수를 자연스러운 문장으로 묻습니다.",
  predictionLabel: "내가 고른 수",
  poolLabel: "고를 수 있는 수",
  explanationLabel: "수가 바뀐 까닭 쓰기"
});

const toolRoles = [
  ...scaffoldRoles,
  {
    role: "initial-panel",
    scope: "each-item" as const,
    layoutRole: "initial-panel",
    idRole: "initial-panel",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent: "더하기 전의 수와 자릿값 표현을 묶습니다.",
    properties: { fill: "#F8FAFC", stroke: "#B2BFCE" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "initial-label",
    scope: "each-item" as const,
    layoutRole: "initial-label",
    idRole: "initial-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "더하기 전의 수임을 알립니다.",
    properties: { text: "처음 수", fontSize: 23 },
    bindings: {},
    containerRole: "initial-panel"
  },
  {
    role: "initial-value",
    scope: "each-item" as const,
    layoutRole: "initial-value",
    idRole: "initial-value",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "더하기 전의 수를 숫자로 나타냅니다.",
    properties: { text: "", fontSize: 40 },
    bindings: { text: "item.initialValueLatex" },
    containerRole: "initial-panel"
  },
  {
    role: "initial-decomposition",
    scope: "each-item" as const,
    layoutRole: "initial-decomposition",
    idRole: "initial-decomposition",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "처음 수의 백·십·일 자릿값을 정확히 나타냅니다.",
    properties: { text: "", fontSize: 24 },
    bindings: { text: "item.initialDecompositionText" },
    containerRole: "initial-panel"
  },
  {
    role: "ten-bank",
    scope: "each-item" as const,
    layoutRole: "ten-bank",
    idRole: "ten-bank",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent: "옮기기 전 십 모형 열 개의 출발 영역입니다.",
    properties: { fill: "#F0FAFE", stroke: "#18A8DA" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "ten-bank-label",
    scope: "each-item" as const,
    layoutRole: "ten-bank-label",
    idRole: "ten-bank-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "옮길 십 모형의 수를 안내합니다.",
    properties: { text: "십 모형 10개", fontSize: 23 },
    bindings: {},
    containerRole: "ten-bank"
  },
  ...exchangeTenRoles.map((role) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "NO04PD",
    intentKind: "place-value-model" as const,
    locked: false,
    movable: true,
    instructionalIntent:
      "서로 다른 묶음판 칸에 놓아 열 개의 십이 백 하나가 됨을 확인하는 십 모형입니다.",
    properties: { value: 10 },
    bindings: {},
    containerRole: "ten-bank"
  })),
  {
    role: "exchange-box",
    scope: "each-item" as const,
    layoutRole: "exchange-box",
    idRole: "exchange-box",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent: "십 모형을 하나씩 채우는 열 칸 묶음판입니다.",
    properties: {
      fill: "#F6FDEB",
      stroke: "#76B82A",
      strokeDashArray: "10 8"
    },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "exchange-box-label",
    scope: "each-item" as const,
    layoutRole: "exchange-box-label",
    idRole: "exchange-box-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "열 칸을 빠짐없이 채우도록 안내합니다.",
    properties: { text: "묶음판 10칸 채우기", fontSize: 23 },
    bindings: {},
    containerRole: "exchange-box"
  },
  ...exchangeSlotRoles.map((role) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "십 모형 하나만 들어가는 칸으로 열 개를 빠짐없이 대응시킵니다.",
    properties: {
      fill: "#FFFFFF",
      stroke: "#76B82A",
      strokeDashArray: "8 6"
    },
    bindings: {},
    containerRole: "exchange-box"
  })),
  {
    role: "hundred-grid-panel",
    scope: "each-item" as const,
    layoutRole: "hundred-grid-panel",
    idRole: "hundred-grid-panel",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent: "10줄 100칸의 기준 모형을 묶습니다.",
    properties: { fill: "#F8FFF0", stroke: "#76B82A" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "hundred-grid-label",
    scope: "each-item" as const,
    layoutRole: "hundred-grid-label",
    idRole: "hundred-grid-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "100칸이 열 줄의 십으로 이루어짐을 안내합니다.",
    properties: { text: "10줄 × 10칸", fontSize: 23 },
    bindings: {},
    containerRole: "hundred-grid-panel"
  },
  ...hundredGridRowRoles.map((role) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "한 줄의 네모 열 개를 나타내어 열 줄 전체를 100칸으로 셀 수 있게 합니다.",
    properties: { text: "□□□□□□□□□□", fontSize: 20 },
    bindings: {},
    containerRole: "hundred-grid-panel"
  })),
  {
    role: "hundred-grid-relation",
    scope: "each-item" as const,
    layoutRole: "hundred-grid-relation",
    idRole: "hundred-grid-relation",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "십이 열 개 모이면 백이 되는 관계를 식으로 연결합니다.",
    properties: { text: "10 × 10 = 100", fontSize: 24 },
    bindings: {},
    containerRole: "hundred-grid-panel"
  }
];

const layoutChildren = [
  ...makeChoiceExplanationScaffoldLayoutChildren(),
  ...[
    "initial-panel",
    "initial-label",
    "initial-value",
    "initial-decomposition",
    "ten-bank",
    "ten-bank-label",
    ...exchangeTenRoles,
    "exchange-box",
    "exchange-box-label",
    ...exchangeSlotRoles,
    "hundred-grid-panel",
    "hundred-grid-label",
    ...hundredGridRowRoles,
    "hundred-grid-relation"
  ].map((role) =>
    layoutBlock(role, "slot", `item.${role}`, "each-item")
  )
];

export const placeValueTenExchangeBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: "number.place-value.regroup-ten-bundles-v1",
  version: "1.1.0",
  title: "십 모형 10개를 100칸과 연결하는 자릿값 활동",
  learningObjective:
    "십 모형 10개가 백 1개와 같은 양임을 100칸 모형으로 확인하고 전체 수의 변화를 자릿값으로 설명할 수 있다.",
  curriculumBinding: {
    standardCode: "[2수01-02]",
    domain: "수와 연산",
    officialGoal:
      "일, 십, 백, 천의 자릿값과 위치적 기수법을 이해하고, 네 자리 이하의 수를 읽고 쓸 수 있다."
  },
  generator: {
    id: PLACE_VALUE_TEN_EXCHANGE_GENERATOR_ID,
    version: PLACE_VALUE_TEN_EXCHANGE_GENERATOR_VERSION,
    parameters: { problemCount: 2, difficulty: "normal" }
  },
  toolRoles,
  layout: {
    tokenSet: "wave14-place-value-ten-exchange-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: layoutChildren
    }
  },
  constraints: [
    ...exchangeTenRoles.map((role, index) => ({
      id: `place-ten-in-slot-${index + 1}`,
      kind: "place-in" as const,
      sources: [{ scope: "each-item" as const, role }],
      target: {
        scope: "each-item" as const,
        role: exchangeSlotRoles[index]!
      },
      parameters: {},
      requiresStudentAction: true
    })),
    {
      id: "select-place-value-total",
      kind: "select-one-of",
      sources: CHOICE_CARD_ROLES.map((role) => ({
        scope: "each-item" as const,
        role
      })),
      target: { scope: "each-item", role: "prediction-box" },
      parameters: {},
      requiresStudentAction: true
    }
  ],
  valuePredicates: [
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "select-one",
        decisionConstraintId: "select-place-value-total",
        candidateRoles: CHOICE_CARD_ROLES,
        candidateProperty: "text",
        correctValuePath: "correctValueText",
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: [
          "exchange-ten-1",
          "exchange-ten-10",
          "exchange-slot-1",
          "exchange-slot-10",
          "ten-bank",
          "exchange-box",
          "hundred-grid-panel",
          "hundred-grid-row-1",
          "hundred-grid-row-5",
          "hundred-grid-row-10",
          "hundred-grid-relation"
        ]
      }
    },
    {
      kind: "values.place-value-ten-exchange-distractors",
      parameters: {
        hundredsPath: "hundreds",
        tensPath: "tens",
        onesPath: "ones",
        exchangeTensPath: "exchangeTens",
        correctPath: "correctValueText",
        concatenatePath: "concatenateCountsText",
        omitExchangePath: "omitExchangeTenText",
        tenTensAsOnesPath: "tenTensAsTenOnesText",
        reversePath: "reverseHundredsAndOnesText",
        candidatePaths: CHOICE_VALUE_PATHS
      }
    },
    {
      kind: "geometry.place-value-ten-exchange",
      parameters: {
        tenRoles: exchangeTenRoles,
        slotRoles: exchangeSlotRoles,
        gridRowRoles: hundredGridRowRoles,
        tenBankRole: "ten-bank",
        exchangeBoxRole: "exchange-box",
        hundredGridPanelRole: "hundred-grid-panel",
        relationRole: "hundred-grid-relation"
      }
    },
    {
      kind: "values.no-duplicate-combination",
      parameters: { valuePaths: ["hundreds", "tens", "ones"] }
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
          "initial-label",
          "initial-decomposition",
          "ten-bank-label",
          "exchange-box-label",
          "hundred-grid-label",
          "prediction-label",
          "pool-label",
          "explanation-label"
        ],
        promptRoles: ["question"],
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
          "number",
          "question",
          "initial-label",
          "initial-value",
          "initial-decomposition",
          "ten-bank-label",
          "exchange-box-label",
          "hundred-grid-label",
          ...hundredGridRowRoles,
          "hundred-grid-relation",
          "prediction-label",
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
        memberRoles: CHOICE_CARD_ROLES,
        containerRole: "choice-panel",
        rowCenterTolerance: 2,
        gapTolerance: 2,
        groupCenterTolerance: 12,
        labelAlignmentTolerance: 2,
        minimumLabelGap: 12,
        maximumLabelGap: 24
      }
    },
    {
      kind: "visual.no-overlap",
      parameters: {
        roles: [
          "number",
          "question",
          "initial-label",
          "initial-value",
          "initial-decomposition",
          ...exchangeTenRoles,
          ...exchangeSlotRoles,
          ...hundredGridRowRoles,
          "hundred-grid-relation",
          "prediction-label",
          "prediction-box",
          "pool-label",
          ...CHOICE_CARD_ROLES,
          "explanation-label",
          "explanation-box"
        ]
      }
    }
  ],
  instructions: [...instructions],
  payload: {
    categoryId: MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId,
    tags: [
      "자릿값",
      "십 모형",
      "100칸",
      "10개씩 묶기",
      "생각 고치기"
    ],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: { problemCount: 2, difficulty: "normal" }
});
