import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint,
  type ActivityBlueprint
} from "@mathcanvas/contracts";
import {
  partialOperationActivityProfiles,
  type PartialOperationActivityProfile
} from "@mathcanvas/curriculum";
import {
  PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_ID,
  PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_VERSION
} from "../item-generators/partial-operation-decomposition.js";

const pieceRoles = Array.from(
  { length: 8 },
  (_, index) => `expression-card-${index + 1}`
);
const pieceValuePaths = Array.from(
  { length: 8 },
  (_, index) => `pieceValue${index + 1}`
);
const equationRoles = [
  "expression-slot-1",
  "plus-operator",
  "expression-slot-2",
  "equals-operator",
  "target-value"
];
const instructions = [
  "① 식 카드를 옮기기 전에, 어떻게 나누어 계산할지 예상해 쓰세요.",
  "② 식 카드 두 장을 빈칸에 놓고, 빈 모형에 두 부분을 나타내세요.",
  "③ 다른 두 장으로도 만들어 보고, 두 방법의 답이 같은 까닭을 쓰세요."
] as const;
const instructionRoles = [
  "instruction-predict",
  "instruction-represent",
  "instruction-explain"
] as const;

const block = (
  id: string,
  kind: "band" | "row" | "slot",
  preset: string,
  repeat: "once" | "each-item",
  groups: { flowGroup?: string; collisionGroup?: string } = {}
) => ({ id, kind, preset, repeat, ...groups, children: [] });

function expressionPieceRole(number: number) {
  return {
    role: `expression-card-${number}`,
    scope: "each-item" as const,
    layoutRole: `expression-card-${number}`,
    idRole: `expression-card-${number}`,
    toolKey: "common.formula",
    intentKind: "latex" as const,
    locked: false,
    movable: true,
    instructionalIntent:
      "원래 계산을 두 부분으로 나누는 방법인지 판단할 수 있는 식 카드입니다.",
    properties: { text: "", fontSize: 36 },
    bindings: {
      text: `item.pieceText${number}`,
      value: `item.pieceValue${number}`
    },
    containerRole: "expression-pool"
  };
}

function makeBlueprint(
  profile: PartialOperationActivityProfile
): ActivityBlueprint {
  return defineActivityBlueprint({
    schemaVersion: "1.0.0",
    id: profile.activityId,
    version: "1.0.0",
    title: profile.title,
    learningObjective: profile.learningObjective,
    curriculumBinding: {
      standardCode: profile.standardCode,
      domain: profile.domain,
      officialGoal: profile.officialGoal
    },
    generator: {
      id: PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_ID,
      version: PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_VERSION,
      parameters: {
        profileId: profile.profileId,
        problemCount: 2,
        difficulty: "normal"
      }
    },
    toolRoles: [
      ...instructions.map((text, index) => ({
        role: instructionRoles[index]!,
        scope: "activity" as const,
        layoutRole: instructionRoles[index]!,
        idRole: instructionRoles[index]!,
        toolKey: "common.text",
        intentKind: "text" as const,
        locked: true,
        movable: false,
        instructionalIntent: [
          "식 카드를 옮기기 전 계산 전략을 예상해 씁니다.",
          "고른 식과 빈 모형을 연결하여 부분 계산을 확인합니다.",
          "다른 분해 방법을 찾고 같은 결과가 되는 까닭을 설명합니다."
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
        instructionalIntent: "한 문항의 예상, 식 구성, 모형, 설명을 묶습니다.",
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
        instructionalIntent: "부분 계산으로 해결할 곱셈 또는 나눗셈 상황을 제시합니다.",
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
        instructionalIntent: "카드를 보기 전 학생의 계산 전략을 남깁니다.",
        properties: { text: "나누어 계산할 방법", fontSize: 23 },
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
        instructionalIntent: "학생이 처음 생각한 분해 방법을 쓰는 빈 영역입니다.",
        properties: { fill: "#FFFFFF", stroke: "#65758B", strokeDashArray: "8 6" },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "expression-slot-1",
        scope: "each-item",
        layoutRole: "expression-slot-1",
        idRole: "expression-slot-1",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "첫 번째 부분 계산 식 카드를 놓습니다.",
        properties: { fill: "#FFFFFF", stroke: "#2388E8", strokeDashArray: "8 6" },
        bindings: {},
        containerRole: "work-panel"
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
        instructionalIntent: "두 부분 계산의 결과를 더함을 나타냅니다.",
        properties: { text: "+", fontSize: 52 },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "expression-slot-2",
        scope: "each-item",
        layoutRole: "expression-slot-2",
        idRole: "expression-slot-2",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "두 번째 부분 계산 식 카드를 놓습니다.",
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
        instructionalIntent: "부분 계산의 합과 전체 결과가 같음을 나타냅니다.",
        properties: { text: "=", fontSize: 52 },
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
        instructionalIntent: "두 부분 계산으로 만들어야 할 전체 결과입니다.",
        properties: { text: "", fontSize: 52 },
        bindings: { text: "item.targetLatex" },
        containerRole: "work-panel"
      },
      {
        role: "model-panel",
        scope: "each-item",
        layoutRole: "model-panel",
        idRole: "model-panel",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "학생이 전체를 두 부분으로 나누어 확인하는 공간을 묶습니다.",
        properties: { fill: "#F3FAFF", stroke: "#4AA9D8" },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "model-label",
        scope: "each-item",
        layoutRole: "model-label",
        idRole: "model-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "모형에서 할 학생 행동을 안내합니다.",
        properties: { text: profile.modelLabel, fontSize: 22 },
        bindings: {},
        containerRole: "model-panel"
      },
      {
        role: "model-instruction",
        scope: "each-item",
        layoutRole: "model-instruction",
        idRole: "model-instruction",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "빈 모형을 사용하는 방법을 짧게 제시합니다.",
        properties: { text: profile.modelInstruction, fontSize: 18 },
        bindings: {},
        containerRole: "model-panel"
      },
      {
        role: "model-workspace",
        scope: "each-item",
        layoutRole: "model-workspace",
        idRole: "model-workspace",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "학생이 펜으로 두 부분을 표시하는 답이 없는 빈 모형입니다.",
        properties: { text: "", fontSize: 28 },
        bindings: { text: "item.modelText" },
        containerRole: "model-panel"
      },
      {
        role: "expression-pool",
        scope: "each-item",
        layoutRole: "expression-pool",
        idRole: "expression-pool",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "쓸 수 있는 식과 버릴 수 있는 식을 함께 묶습니다.",
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
        instructionalIntent: "학생이 고를 수 있는 식 카드 묶음을 안내합니다.",
        properties: { text: "고를 수 있는 식", fontSize: 22 },
        bindings: {},
        containerRole: "expression-pool"
      },
      ...pieceRoles.map((_, index) => expressionPieceRole(index + 1)),
      {
        role: "explanation-label",
        scope: "each-item",
        layoutRole: "explanation-label",
        idRole: "explanation-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "모형과 부분 계산을 연결하여 같은 결과인 까닭을 설명하게 합니다.",
        properties: { text: profile.explanationLabel, fontSize: 23 },
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
        instructionalIntent: "다른 분해 방법과 같은 결과가 되는 까닭을 쓰는 빈 영역입니다.",
        properties: { fill: "#FFFFFF", stroke: "#65758B", strokeDashArray: "8 6" },
        bindings: {},
        containerRole: "work-panel"
      }
    ],
    layout: {
      tokenSet: "wave20-partial-operation-v1",
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
          ...equationRoles.map((role) => block(role, "slot", `item.${role}`, "each-item", { collisionGroup: "partial-equation" })),
          block("model-panel", "band", "item.model-panel", "each-item"),
          block("model-label", "slot", "item.model-label", "each-item"),
          block("model-instruction", "slot", "item.model-instruction", "each-item"),
          block("model-workspace", "slot", "item.model-workspace", "each-item"),
          block("expression-pool", "band", "item.expression-pool", "each-item", { flowGroup: "item-main-pool-flow" }),
          block("pool-label", "slot", "item.pool-label", "each-item"),
          ...pieceRoles.map((role) => block(role, "slot", `item.${role}`, "each-item", { collisionGroup: "expression-card-pool" })),
          block("explanation-label", "slot", "item.explanation-label", "each-item"),
          block("explanation-box", "slot", "item.explanation-box", "each-item")
        ]
      }
    },
    constraints: [
      {
        id: "construct-expression-slot-1",
        kind: "fill-from-pool",
        sources: pieceRoles.map((role) => ({ scope: "each-item" as const, role })),
        target: { scope: "each-item", role: "expression-slot-1" },
        parameters: {},
        requiresStudentAction: true
      },
      {
        id: "construct-expression-slot-2",
        kind: "fill-from-pool",
        sources: pieceRoles.map((role) => ({ scope: "each-item" as const, role })),
        target: { scope: "each-item", role: "expression-slot-2" },
        parameters: {},
        requiresStudentAction: true
      }
    ],
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "construct",
          slotRoles: ["expression-slot-1", "expression-slot-2"],
          pieceRoles,
          pieceProperty: "value",
          totalPath: "targetResult",
          solutionSetPath: "solutionPairs",
          surplusPath: "surplusValues",
          minimumSolutions: 2,
          minimumSurplus: 4,
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: ["model-panel", "model-label", "model-instruction", "model-workspace"]
        }
      },
      {
        kind: "values.partial-operation-card-set",
        parameters: {
          cardsPath: "candidateSpecs",
          solutionSetPath: "solutionPairs",
          operationKindPath: "operationKind",
          wholeOperandPath: "wholeOperand",
          fixedOperandPath: "fixedOperand",
          totalPath: "targetResult"
        }
      },
      {
        kind: "values.surplus-piece-present",
        parameters: {
          piecePaths: pieceValuePaths,
          solutionSetPath: "solutionPairs",
          surplusPath: "surplusValues",
          minimumSurplus: 4
        }
      },
      {
        kind: "visual.equation-rail",
        parameters: {
          roles: equationRoles,
          operatorRoles: ["plus-operator", "equals-operator", "target-value"],
          centerTolerance: 2,
          maxGapDelta: 8,
          fontSize: 52
        }
      },
      {
        kind: "language.classroom-korean",
        parameters: {
          instructionRoles: [...instructionRoles],
          labelRoles: ["prediction-label", "model-label", "pool-label", "explanation-label"],
          promptRoles: ["question", "model-instruction"],
          maximumInstructionLength: 76,
          maximumLabelLength: 24
        }
      },
      {
        kind: "visual.text-fit",
        parameters: {
          roles: [...instructionRoles, "question", "prediction-label", "model-label", "model-instruction", "pool-label", "explanation-label"],
          maximumFillRatio: 0.96
        }
      },
      {
        kind: "visual.labeled-pool-row",
        parameters: {
          labelRole: "pool-label",
          memberRoles: pieceRoles,
          containerRole: "expression-pool",
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
          roles: ["number", "question", "prediction-label", "prediction-box", ...equationRoles, "model-label", "model-instruction", "model-workspace", "pool-label", ...pieceRoles, "explanation-label", "explanation-box"]
        }
      }
    ],
    instructions: [...instructions],
    payload: {
      categoryId: MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId,
      tags: profile.operationKind === "multiply"
        ? ["곱셈", "부분곱", "분배", "배열", "여러 방법"]
        : ["나눗셈", "부분몫", "똑같이 나누기", "여러 방법"],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: { problemCount: 2, difficulty: "normal" }
  });
}

export const partialOperationDecompositionBlueprints =
  partialOperationActivityProfiles.map(makeBlueprint);

export function findPartialOperationDecompositionBlueprint(
  activityId: string
): ActivityBlueprint | undefined {
  return partialOperationDecompositionBlueprints.find(
    (blueprint) => blueprint.id === activityId
  );
}
