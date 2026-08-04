import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  BALANCE_SCALE_SUM_GENERATOR_ID,
  BALANCE_SCALE_SUM_GENERATOR_VERSION
} from "../item-generators/balance-scale-sum.js";
import { withStudentScreenQuality } from "./student-screen-quality.js";

const pieceRoles = Array.from(
  { length: 5 },
  (_, index) => `piece-card-${index + 1}`
);
const piecePaths = Array.from(
  { length: 5 },
  (_, index) => `piece${index + 1}`
);
const equationRoles = [
  "left-a",
  "plus",
  "left-b",
  "equals",
  "unknown-result"
];

const block = (
  id: string,
  kind: "band" | "row" | "slot",
  preset: string,
  repeat: "once" | "each-item",
  collisionGroup?: string,
  flowGroup?: string
) => ({
  id,
  kind,
  preset,
  repeat,
  ...(collisionGroup ? { collisionGroup } : {}),
  ...(flowGroup ? { flowGroup } : {}),
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
    "왼쪽 접시의 두 수와 같은 값을 식으로 생각하게 합니다.",
  properties: { text, fontSize: 54 },
  bindings: binding ? { text: binding } : {},
  containerRole: "work-panel"
});

const fixedCardRole = (
  role: "fixed-card-a" | "fixed-card-b",
  valuePath: "a" | "b"
) => ({
  role,
  scope: "each-item" as const,
  layoutRole: role,
  idRole: role,
  toolKey: "NO04NT",
  intentKind: "number-card",
  locked: true,
  movable: false,
  instructionalIntent:
    "왼쪽 접시에 놓인 두 수를 실제 무게로 사용합니다.",
  properties: { balanceSide: "left" },
  bindings: { value: `item.${valuePath}` },
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
    "왼쪽 두 수의 합과 같은 수인지 판단하여 오른쪽 접시에 놓습니다.",
  properties: {},
  bindings: { value: `item.piece${number}` },
  containerRole: "choice-panel"
});

export const balanceScaleSumBlueprint = defineActivityBlueprint(withStudentScreenQuality({
  schemaVersion: "1.0.0",
  id: "relation.equal-sign.balance-scale.sum-card-v1",
  version: "1.0.0",
  title: "저울로 같은 값 찾기",
  learningObjective:
    "등호를 사용하여 크기가 같은 두 양의 관계를 식으로 나타낼 수 있다.",
  curriculumBinding: {
    standardCode: "[4수02-03]",
    domain: "변화와 관계",
    officialGoal:
      "등호를 사용하여 크기가 같은 두 양의 관계를 식으로 나타낼 수 있다."
  },
  generator: {
    id: BALANCE_SCALE_SUM_GENERATOR_ID,
    version: BALANCE_SCALE_SUM_GENERATOR_VERSION,
    parameters: { problemCount: 2, difficulty: "normal" }
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
        "카드를 옮기기 전에 왼쪽 두 수의 합을 예상하게 합니다.",
      properties: {
        text: "① 카드를 옮기기 전에, 왼쪽 두 수의 합과 같은 수를 예상해 써 보세요.",
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
        "고른 카드가 같은 값인지 저울의 기울기로 직접 확인하게 합니다.",
      properties: {
        text: "② 수 카드 한 장을 오른쪽 접시에 놓고, 저울이 어느 쪽으로 기우는지 확인하세요.",
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
        "저울이 기울면 선택을 고치고 수의 관계를 설명하게 합니다.",
      properties: {
        text: "③ 양쪽이 같지 않으면 카드를 바꾸고, 처음 생각과 달라진 까닭을 써 보세요.",
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
      instructionalIntent:
        "예상·저울 확인·설명 활동을 한 문항 안에 묶습니다.",
      properties: { fill: "none", stroke: "#65758B" },
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
      instructionalIntent:
        "카드를 옮기기 전에 예상한 수를 쓰는 곳입니다.",
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
      instructionalIntent: "학생의 첫 생각을 남기는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {},
      containerRole: "work-panel"
    },
    formulaRole("left-a", "", "item.aText"),
    formulaRole("plus", "+"),
    formulaRole("left-b", "", "item.bText"),
    formulaRole("equals", "="),
    formulaRole("unknown-result", "□"),
    {
      role: "balance-scale",
      scope: "each-item",
      layoutRole: "balance-scale",
      idRole: "balance-scale",
      toolKey: "CR07BS",
      intentKind: "balance-scale",
      locked: true,
      movable: false,
      instructionalIntent:
        "양쪽 값이 같을 때 수평이 되는 접시저울입니다.",
      properties: { initialDirection: "left" },
      bindings: {},
      containerRole: "work-panel"
    },
    fixedCardRole("fixed-card-a", "a"),
    fixedCardRole("fixed-card-b", "b"),
    {
      role: "choice-panel",
      scope: "each-item",
      layoutRole: "choice-panel",
      idRole: "choice-panel",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent:
        "고를 수 있는 수 카드와 설명 칸을 한데 묶습니다.",
      properties: { fill: "#FFFFFF", stroke: "#B2BFCE" },
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
      instructionalIntent:
        "오른쪽 접시에 놓을 수 카드를 안내합니다.",
      properties: { text: "수 카드", fontSize: 26 },
      bindings: {},
      containerRole: "choice-panel"
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
      instructionalIntent:
        "선택과 저울의 기울기를 연결해 설명하게 합니다.",
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
      instructionalIntent:
        "처음 생각과 바꾼 까닭을 남기는 빈 영역입니다.",
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
    tokenSet: "wave5-balance-scale-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        block("instruction-predict", "row", "header.primary", "once"),
        block("instruction-verify", "row", "header.secondary", "once"),
        block("instruction-explain", "row", "header.tertiary", "once"),
        block(
          "work-panel",
          "band",
          "item.panel",
          "each-item",
          undefined,
          "item-primary-flow"
        ),
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
          "balance-scale",
          "slot",
          "item.balance-scale",
          "each-item"
        ),
        block(
          "fixed-card-a",
          "slot",
          "item.fixed-card-a",
          "each-item"
        ),
        block(
          "fixed-card-b",
          "slot",
          "item.fixed-card-b",
          "each-item"
        ),
        block(
          "choice-panel",
          "band",
          "item.choice-panel",
          "each-item",
          undefined,
          "item-primary-flow"
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
      id: "select-balance-card",
      kind: "select-one-of",
      sources: pieceRoles.map((role) => ({
        scope: "each-item" as const,
        role
      })),
      target: { scope: "each-item", role: "balance-scale" },
      parameters: {},
      requiresStudentAction: true
    }
  ],
  valuePredicates: [
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "select-one",
        decisionConstraintId: "select-balance-card",
        candidateRoles: pieceRoles,
        candidateProperty: "value",
        correctValuePath: "correctResult",
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: ["balance-scale"]
      }
    },
    {
      kind: "values.balance-card-distractors",
      parameters: {
        aPath: "a",
        bPath: "b",
        correctPath: "correctResult",
        differencePath: "differenceValue",
        nearMissPath: "nearMissValue",
        surplusPath: "surplusPieces",
        piecePaths
      }
    },
    {
      kind: "values.no-duplicate-combination",
      parameters: { valuePaths: ["a", "b"] }
    },
    {
      kind: "visual.equation-rail",
      parameters: {
        roles: equationRoles,
        operatorRoles: equationRoles,
        centerTolerance: 2,
        maxGapDelta: 2,
        fontSize: 54
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
        containerRole: "choice-panel",
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
          "pool-label",
          ...pieceRoles,
          "explanation-label",
          "explanation-box"
        ]
      }
    }
  ],
  instructions: [
    "카드를 옮기기 전에, 왼쪽 두 수의 합과 같은 수를 예상해 써 보세요.",
    "수 카드 한 장을 오른쪽 접시에 놓고, 저울이 어느 쪽으로 기우는지 확인하세요.",
    "양쪽이 같지 않으면 카드를 바꾸고, 처음 생각과 달라진 까닭을 써 보세요."
  ],
  payload: {
    categoryId:
      MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId,
    tags: [
      "등호",
      "동치 관계",
      "접시저울",
      "수 카드",
      "예상과 수정"
    ],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: { problemCount: 2, difficulty: "normal" }
}));
