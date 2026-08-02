import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import { factorPairActivityProfile } from "@mathcanvas/curriculum";
import {
  FACTOR_PAIR_ARRAY_GENERATOR_ID,
  FACTOR_PAIR_ARRAY_GENERATOR_VERSION
} from "../item-generators/factor-pair-array.js";

const pieceRoles = Array.from(
  { length: 8 },
  (_, index) => `factor-card-${index + 1}`
);
const piecePaths = Array.from(
  { length: 8 },
  (_, index) => `piece${index + 1}`
);
const equationRoles = [
  "factor-slot-1",
  "multiply-operator",
  "factor-slot-2",
  "equals-operator",
  "target-value"
];

const block = (
  id: string,
  kind: "band" | "row" | "slot",
  preset: string,
  repeat: "once" | "each-item",
  groups: { flowGroup?: string; collisionGroup?: string } = {}
) => ({ id, kind, preset, repeat, ...groups, children: [] });

const pieceRole = (number: number) => ({
  role: `factor-card-${number}`,
  scope: "each-item" as const,
  layoutRole: `factor-card-${number}`,
  idRole: `factor-card-${number}`,
  toolKey: "NO04NT",
  intentKind: "number-card",
  locked: false,
  movable: true,
  instructionalIntent:
    "목표 수의 약수쌍이 되는지 판단할 수 있는 수 카드입니다.",
  properties: {},
  bindings: { value: `item.piece${number}` },
  containerRole: "factor-pool"
});

const instructions = [
  "① 수 카드를 옮기기 전에, 곱해서 목표 수가 되는 두 수를 예상해 쓰세요.",
  "② 수 카드 두 장을 빈칸에 놓고, 빈 격자에 같은 크기의 직사각형으로 나타내세요.",
  "③ 다른 두 수도 찾아보고, 두 수가 약수인 까닭을 쓰세요."
] as const;

const instructionRoleNames = [
  "instruction-predict",
  "instruction-represent",
  "instruction-explain"
] as const;

export const factorPairArrayBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: factorPairActivityProfile.activityId,
  version: "1.0.0",
  title: factorPairActivityProfile.title,
  learningObjective: factorPairActivityProfile.learningObjective,
  curriculumBinding: {
    standardCode: factorPairActivityProfile.standardCode,
    domain: factorPairActivityProfile.domain,
    officialGoal: factorPairActivityProfile.officialGoal
  },
  generator: {
    id: FACTOR_PAIR_ARRAY_GENERATOR_ID,
    version: FACTOR_PAIR_ARRAY_GENERATOR_VERSION,
    parameters: { problemCount: 2, difficulty: "normal" }
  },
  toolRoles: [
    ...instructions.map((text, index) => ({
      role: instructionRoleNames[index]!,
      scope: "activity" as const,
      layoutRole: instructionRoleNames[index]!,
      idRole: instructionRoleNames[index]!,
      toolKey: "common.text",
      intentKind: "text" as const,
      locked: true,
      movable: false,
      instructionalIntent: [
        "수 카드를 보기 전에 학생의 약수쌍 예상을 남깁니다.",
        "고른 두 수를 곱셈식과 직사각형 배열로 연결합니다.",
        "다른 약수쌍과 약수의 뜻을 설명하게 합니다."
      ][index]!,
      properties: { text, fontSize: 31 },
      bindings: {}
    })),
    {
      role: "work-panel",
      scope: "each-item",
      layoutRole: "work-panel",
      idRole: "work-panel",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "한 문항의 예상, 구성, 배열, 설명을 묶습니다.",
      properties: { fill: "#F8FBFF", stroke: "#65758B" },
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
      properties: { text: "", fontSize: 28 },
      bindings: { text: "item.orderLabel" },
      containerRole: "work-panel"
    },
    {
      role: "question",
      scope: "each-item",
      layoutRole: "question",
      idRole: "question",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "여러 약수쌍을 찾을 목표 수를 제시합니다.",
      properties: { text: "", fontSize: 27 },
      bindings: { text: "item.questionText" },
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
      instructionalIntent: "카드를 옮기기 전 예상한 약수쌍을 적게 합니다.",
      properties: { text: "예상한 두 수", fontSize: 23 },
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
      instructionalIntent: "학생이 처음 생각한 두 수를 쓰는 빈 영역입니다.",
      properties: { fill: "#FFFFFF", stroke: "#65758B", strokeDashArray: "8 6" },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "factor-slot-1",
      scope: "each-item",
      layoutRole: "factor-slot-1",
      idRole: "factor-slot-1",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "첫 번째 수 카드를 놓는 곱셈식의 빈칸입니다.",
      properties: { fill: "#FFFFFF", stroke: "#2388E8", strokeDashArray: "8 6" },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "multiply-operator",
      scope: "each-item",
      layoutRole: "multiply-operator",
      idRole: "multiply-operator",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: true,
      movable: false,
      instructionalIntent: "두 수가 곱셈의 두 요인임을 나타냅니다.",
      properties: { text: "\\times", fontSize: 54 },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "factor-slot-2",
      scope: "each-item",
      layoutRole: "factor-slot-2",
      idRole: "factor-slot-2",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "두 번째 수 카드를 놓는 곱셈식의 빈칸입니다.",
      properties: { fill: "#FFFFFF", stroke: "#2388E8", strokeDashArray: "8 6" },
      bindings: {},
      containerRole: "work-panel"
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
      instructionalIntent: "두 수의 곱과 목표 수의 관계를 나타냅니다.",
      properties: { text: "=", fontSize: 54 },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "target-value",
      scope: "each-item",
      layoutRole: "target-value",
      idRole: "target-value",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: true,
      movable: false,
      instructionalIntent: "배열로 만들어야 할 전체 칸 수를 나타냅니다.",
      properties: { text: "", fontSize: 54 },
      bindings: { text: "item.targetLatex" },
      containerRole: "work-panel"
    },
    {
      role: "array-panel",
      scope: "each-item",
      layoutRole: "array-panel",
      idRole: "array-panel",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "학생이 직사각형 배열을 표시하는 격자판을 묶습니다.",
      properties: { fill: "#F3FAFF", stroke: "#4AA9D8" },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "array-label",
      scope: "each-item",
      layoutRole: "array-label",
      idRole: "array-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "격자에서 해야 할 학생 행동을 안내합니다.",
      properties: { text: "6×8 격자에 직사각형 나타내기", fontSize: 22 },
      bindings: {},
      containerRole: "array-panel"
    },
    {
      role: "array-grid",
      scope: "each-item",
      layoutRole: "array-grid",
      idRole: "array-grid",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "학생이 펜으로 선택한 가로와 세로를 표시하는 빈 격자입니다.",
      properties: { text: "", fontSize: 28 },
      bindings: { text: "item.gridText" },
      containerRole: "array-panel"
    },
    {
      role: "factor-pool",
      scope: "each-item",
      layoutRole: "factor-pool",
      idRole: "factor-pool",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "쓸 수 있는 카드와 버릴 수 있는 카드를 함께 묶습니다.",
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
      instructionalIntent: "학생이 고를 수 있는 수 카드 묶음을 안내합니다.",
      properties: { text: "고를 수 있는 수", fontSize: 22 },
      bindings: {},
      containerRole: "factor-pool"
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
      instructionalIntent: "약수의 뜻을 배열과 곱셈식으로 설명하게 합니다.",
      properties: { text: "두 수가 약수인 까닭", fontSize: 23 },
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
      instructionalIntent: "다른 약수쌍과 약수인 까닭을 쓰는 빈 영역입니다.",
      properties: { fill: "#FFFFFF", stroke: "#65758B", strokeDashArray: "8 6" },
      bindings: {},
      containerRole: "work-panel"
    }
  ],
  layout: {
    tokenSet: "wave19-factor-pair-array-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        block("instruction-predict", "row", "header.primary", "once", { flowGroup: "instructions" }),
        block("instruction-represent", "row", "header.secondary", "once", { flowGroup: "instructions" }),
        block("instruction-explain", "row", "header.tertiary", "once", { flowGroup: "instructions" }),
        block("work-panel", "band", "item.panel", "each-item", { flowGroup: "item-main-pool-flow" }),
        block("number", "slot", "item.number", "each-item"),
        block("question", "slot", "item.question", "each-item"),
        block("prediction-label", "slot", "item.prediction-label", "each-item"),
        block("prediction-box", "slot", "item.prediction-box", "each-item"),
        ...equationRoles.map((role) => block(role, "slot", `item.${role}`, "each-item", { collisionGroup: "factor-equation" })),
        block("array-panel", "band", "item.array-panel", "each-item"),
        block("array-label", "slot", "item.array-label", "each-item"),
        block("array-grid", "slot", "item.array-grid", "each-item"),
        block("factor-pool", "band", "item.factor-pool", "each-item", { flowGroup: "item-main-pool-flow" }),
        block("pool-label", "slot", "item.pool-label", "each-item"),
        ...pieceRoles.map((role) => block(role, "slot", `item.${role}`, "each-item", { collisionGroup: "factor-card-pool" })),
        block("explanation-label", "slot", "item.explanation-label", "each-item"),
        block("explanation-box", "slot", "item.explanation-box", "each-item")
      ]
    }
  },
  constraints: [
    {
      id: "construct-factor-slot-1",
      kind: "fill-from-pool",
      sources: pieceRoles.map((role) => ({ scope: "each-item" as const, role })),
      target: { scope: "each-item", role: "factor-slot-1" },
      parameters: {},
      requiresStudentAction: true
    },
    {
      id: "construct-factor-slot-2",
      kind: "fill-from-pool",
      sources: pieceRoles.map((role) => ({ scope: "each-item" as const, role })),
      target: { scope: "each-item", role: "factor-slot-2" },
      parameters: {},
      requiresStudentAction: true
    }
  ],
  valuePredicates: [
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "construct",
        slotRoles: ["factor-slot-1", "factor-slot-2"],
        pieceRoles,
        pieceProperty: "value",
        totalPath: "targetTotal",
        solutionSetPath: "solutionPairs",
        surplusPath: "surplusValues",
        minimumSolutions: 2,
        minimumSurplus: 4,
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: ["array-panel", "array-label", "array-grid"]
      }
    },
    {
      kind: "values.product-construction-solution-set",
      parameters: {
        piecePaths,
        solutionSetPath: "solutionPairs",
        totalPath: "targetTotal",
        slotCount: 2,
        minimumSolutions: 2
      }
    },
    {
      kind: "values.surplus-piece-present",
      parameters: {
        piecePaths,
        solutionSetPath: "solutionPairs",
        surplusPath: "surplusValues",
        minimumSurplus: 4
      }
    },
    {
      kind: "geometry.factor-array-board",
      parameters: {
        role: "array-grid",
        textPath: "gridText",
        rowCountPath: "gridRows",
        columnCountPath: "gridColumns"
      }
    },
    {
      kind: "visual.discrete-model-consistent",
      parameters: { valuePaths: piecePaths, sourceRoles: pieceRoles }
    },
    {
      kind: "visual.equation-rail",
      parameters: {
        roles: equationRoles,
        operatorRoles: ["multiply-operator", "equals-operator", "target-value"],
        centerTolerance: 2,
        maxGapDelta: 8,
        fontSize: 54
      }
    },
    {
      kind: "language.classroom-korean",
      parameters: {
        instructionRoles: [...instructionRoleNames],
        labelRoles: ["prediction-label", "array-label", "pool-label", "explanation-label"],
        promptRoles: ["question"],
        maximumInstructionLength: 76,
        maximumLabelLength: 24
      }
    },
    {
      kind: "visual.text-fit",
      parameters: {
        roles: [...instructionRoleNames, "question", "prediction-label", "array-label", "pool-label", "explanation-label"],
        maximumFillRatio: 0.96
      }
    },
    {
      kind: "visual.labeled-pool-row",
      parameters: {
        labelRole: "pool-label",
        memberRoles: pieceRoles,
        containerRole: "factor-pool",
        rowCenterTolerance: 2,
        gapTolerance: 2,
        groupCenterTolerance: 8,
        labelAlignmentTolerance: 2,
        minimumLabelGap: 12,
        maximumLabelGap: 28
      }
    },
    {
      kind: "visual.no-overlap",
      parameters: {
        roles: ["number", "question", "prediction-label", "prediction-box", ...equationRoles, "array-label", "array-grid", "pool-label", ...pieceRoles, "explanation-label", "explanation-box"]
      }
    }
  ],
  instructions: [...instructions],
  payload: {
    categoryId: MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId,
    tags: ["약수", "약수쌍", "수 카드", "직사각형 배열", "여러 해"],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: { problemCount: 2, difficulty: "normal" }
});
