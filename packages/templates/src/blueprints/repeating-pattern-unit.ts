import { MATHCANVAS_PROJECT_CATEGORIES, defineActivityBlueprint } from "@mathcanvas/contracts";
import { REPEATING_PATTERN_UNIT_GENERATOR_ID, REPEATING_PATTERN_UNIT_GENERATOR_VERSION } from "../item-generators/repeating-pattern-unit.js";
import { CHOICE_CARD_ROLES, layoutBlock, makeChoiceExplanationScaffoldLayoutChildren, makeChoiceExplanationScaffoldRoles } from "./choice-explanation-scaffold.js";

const sequenceRoles = Array.from({ length: 6 }, (_, i) => `sequence-block-${i + 1}`);
const slotRoles = ["next-slot-1", "next-slot-2"] as const;
const pieceRoles = Array.from({ length: 5 }, (_, i) => `completion-block-${i + 1}`);
const instructions = [
  "① 가장 짧게 되풀이되는 무늬가 몇 조각인지 골라 놓으세요.",
  "② 무늬 조각 두 개를 빈칸에 놓아 같은 규칙이 이어지는지 살펴보세요.",
  "③ 처음 고른 답을 바꿀 수 있고, 어디부터 다시 되풀이되는지 쓰세요."
] as const;

const scaffold = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: ["반복 단위를 먼저 결정하게 합니다.", "패턴 블록으로 선택의 결과를 확인하게 합니다.", "반복 단위의 경계로 선택을 설명하고 수정하게 합니다."],
  questionIntent: "되풀이되는 가장 짧은 단위를 묻습니다.",
  predictionLabel: "내가 고른 조각 수",
  poolLabel: "고를 수 있는 조각 수",
  explanationLabel: "되풀이되는 까닭 쓰기"
});

export const repeatingPatternUnitBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: "pattern.repeat-unit.pattern-blocks-v1",
  version: "1.0.0",
  title: "패턴 블록으로 가장 짧은 반복 단위 찾기",
  learningObjective: "무늬의 가장 짧은 반복 단위를 찾아 이어 놓고, 같은 규칙이 계속되는 까닭을 설명할 수 있다.",
  curriculumBinding: { standardCode: "[2수02-01]", domain: "변화와 관계", officialGoal: "물체, 무늬, 수 등의 배열에서 규칙을 찾아 여러 가지 방법으로 표현할 수 있다." },
  generator: { id: REPEATING_PATTERN_UNIT_GENERATOR_ID, version: REPEATING_PATTERN_UNIT_GENERATOR_VERSION, parameters: { problemCount: 2, difficulty: "normal" } },
  toolRoles: [
    ...scaffold,
    { role: "pattern-track", scope: "each-item", layoutRole: "pattern-track", idRole: "pattern-track", toolKey: "common.rectangle", intentKind: "draw-rectangle", locked: true, movable: false, instructionalIntent: "반복 무늬와 이어 놓을 두 칸을 한 줄로 묶습니다.", properties: { fill: "#F8FAFC", stroke: "#8291A7" }, bindings: {}, containerRole: "work-panel" },
    { role: "pattern-label", scope: "each-item", layoutRole: "pattern-label", idRole: "pattern-label", toolKey: "common.text", intentKind: "text", locked: true, movable: false, instructionalIntent: "살펴볼 무늬를 안내합니다.", properties: { text: "이어 놓을 자리", fontSize: 23 }, bindings: {}, containerRole: "pattern-track" },
    ...sequenceRoles.map((role, i) => ({ role, scope: "each-item" as const, layoutRole: role, idRole: role, toolKey: "SM02PB", intentKind: "pattern-block" as const, locked: true, movable: false, instructionalIntent: "주어진 반복 무늬를 이루는 고정된 패턴 블록입니다.", properties: {}, bindings: { variant: `item.sequenceVariant${i + 1}` }, containerRole: "pattern-track" })),
    ...slotRoles.map((role) => ({ role, scope: "each-item" as const, layoutRole: role, idRole: role, toolKey: "common.rectangle", intentKind: "draw-rectangle" as const, locked: true, movable: false, instructionalIntent: "규칙에 맞는 다음 블록을 놓는 빈칸입니다.", properties: { fill: "#FFFFFF", stroke: "#7B8DA5", strokeDashArray: "8 6" }, bindings: {}, containerRole: "pattern-track" })),
    { role: "piece-bank", scope: "each-item", layoutRole: "piece-bank", idRole: "piece-bank", toolKey: "common.rectangle", intentKind: "draw-rectangle", locked: true, movable: false, instructionalIntent: "필요한 조각과 쓰지 않는 조각을 함께 제공합니다.", properties: { fill: "#F5FBFF", stroke: "#4AA9D8" }, bindings: {}, containerRole: "work-panel" },
    { role: "piece-bank-label", scope: "each-item", layoutRole: "piece-bank-label", idRole: "piece-bank-label", toolKey: "common.text", intentKind: "text", locked: true, movable: false, instructionalIntent: "이어 놓을 조각을 고르게 합니다.", properties: { text: "이어 놓을 조각", fontSize: 23 }, bindings: {}, containerRole: "piece-bank" },
    ...pieceRoles.map((role, i) => ({ role, scope: "each-item" as const, layoutRole: role, idRole: role, toolKey: "SM02PB", intentKind: "pattern-block" as const, locked: false, movable: true, instructionalIntent: "규칙에 필요한지 판단하여 빈칸에 놓는 패턴 블록입니다.", properties: {}, bindings: { variant: `item.completionVariant${i + 1}` }, containerRole: "piece-bank" }))
  ],
  layout: { tokenSet: "wave16-repeating-pattern-v1", root: { id: "canvas", kind: "canvas", preset: "canvas.root", repeat: "once", children: [
    ...makeChoiceExplanationScaffoldLayoutChildren(),
    layoutBlock("pattern-track", "slot", "item.pattern-track", "each-item"),
    layoutBlock("pattern-label", "slot", "item.pattern-label", "each-item"),
    ...sequenceRoles.map((role) => layoutBlock(role, "slot", `item.${role}`, "each-item")),
    ...slotRoles.map((role) => layoutBlock(role, "slot", `item.${role}`, "each-item")),
    layoutBlock("piece-bank", "slot", "item.piece-bank", "each-item"),
    layoutBlock("piece-bank-label", "slot", "item.piece-bank-label", "each-item"),
    ...pieceRoles.map((role) => layoutBlock(role, "slot", `item.${role}`, "each-item"))
  ] } },
  constraints: [
    { id: "select-repeat-length", kind: "select-one-of", sources: CHOICE_CARD_ROLES.map((role) => ({ scope: "each-item" as const, role })), target: { scope: "each-item", role: "prediction-box" }, parameters: {}, requiresStudentAction: true },
    ...slotRoles.map((role, i) => ({ id: `complete-pattern-${i + 1}`, kind: "select-one-of" as const, sources: pieceRoles.map((piece) => ({ scope: "each-item" as const, role: piece })), target: { scope: "each-item" as const, role }, parameters: {}, requiresStudentAction: true }))
  ],
  valuePredicates: [
    { kind: "cognitive.release-contract", parameters: { mode: "select-one", decisionConstraintId: "select-repeat-length", candidateRoles: CHOICE_CARD_ROLES, candidateProperty: "text", correctValuePath: "correctValueText", predictionRole: "prediction-box", explanationRole: "explanation-box", verificationRoles: [...sequenceRoles, ...slotRoles, "completion-block-1", "completion-block-2"] } },
    { kind: "language.classroom-korean", parameters: { instructionRoles: ["instruction-predict", "instruction-verify", "instruction-explain"], labelRoles: ["pattern-label", "piece-bank-label", "prediction-label", "pool-label", "explanation-label"], promptRoles: ["question"], maximumInstructionLength: 70, maximumLabelLength: 18 } },
    { kind: "visual.text-fit", parameters: { roles: ["instruction-predict", "instruction-verify", "instruction-explain", "question", "pattern-label", "piece-bank-label", "prediction-label", "pool-label", "explanation-label"], maximumFillRatio: 0.96 } },
    { kind: "visual.labeled-pool-row", parameters: { labelRole: "pool-label", memberRoles: CHOICE_CARD_ROLES, containerRole: "choice-panel", rowCenterTolerance: 2, gapTolerance: 2, groupCenterTolerance: 12, labelAlignmentTolerance: 2, minimumLabelGap: 12, maximumLabelGap: 24 } },
    { kind: "visual.no-overlap", parameters: { roles: ["number", "question", "prediction-label", "prediction-box", "pool-label", ...CHOICE_CARD_ROLES, "pattern-label", ...sequenceRoles, ...slotRoles, "piece-bank-label", ...pieceRoles, "explanation-label", "explanation-box"] } }
  ],
  instructions: [...instructions],
  payload: { categoryId: MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId, tags: ["규칙 찾기", "반복 단위", "패턴 블록", "생각 고치기"], studyLevel: "elementary", isShowMenuOnActivity: true },
  variationDefaults: { problemCount: 2, difficulty: "normal" }
});
