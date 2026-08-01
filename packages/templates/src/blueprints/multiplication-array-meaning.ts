import { MATHCANVAS_PROJECT_CATEGORIES, defineActivityBlueprint } from "@mathcanvas/contracts";
import { MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID, MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION } from "../item-generators/multiplication-array-meaning.js";
import { CHOICE_CARD_ROLES, layoutBlock, makeChoiceExplanationScaffoldLayoutChildren, makeChoiceExplanationScaffoldRoles } from "./choice-explanation-scaffold.js";

const instructions = [
  "① 문제에 맞는 곱셈식을 골라 놓으세요.",
  "② 괄호 한 묶음의 점 수와 묶음 수를 세어 식의 두 수와 비교하세요.",
  "③ 처음 고른 식을 바꿀 수 있고, 앞 수와 뒤 수가 뜻하는 것을 쓰세요."
] as const;
const scaffold = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: ["상황과 식의 연결을 먼저 결정하게 합니다.", "같은 수씩 묶인 배열로 선택을 확인하게 합니다.", "곱셈식의 두 수가 뜻하는 바를 설명하고 수정하게 합니다."],
  questionIntent: "실생활 곱셈 상황에 맞는 식을 묻습니다.",
  predictionLabel: "내가 고른 식",
  poolLabel: "고를 수 있는 식",
  explanationLabel: "두 수의 뜻 쓰기"
});

export const multiplicationArrayMeaningBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: "number.multiplication.group-array-meaning-v1",
  version: "1.0.0",
  title: "같은 수씩 묶은 배열과 곱셈식 연결하기",
  learningObjective: "같은 수씩 묶인 상황을 곱셈식과 배열로 연결하고, 두 수가 나타내는 뜻을 설명할 수 있다.",
  curriculumBinding: { standardCode: "[2수01-10]", domain: "수와 연산", officialGoal: "곱셈이 이루어지는 실생활 상황과 연결하여 곱셈의 의미를 이해한다." },
  generator: { id: MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID, version: MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION, parameters: { problemCount: 2, difficulty: "normal" } },
  toolRoles: [
    ...scaffold,
    { role: "array-panel", scope: "each-item", layoutRole: "array-panel", idRole: "array-panel", toolKey: "common.rectangle", intentKind: "draw-rectangle", locked: true, movable: false, instructionalIntent: "같은 수씩 묶인 배열을 한 영역에 보여 줍니다.", properties: { fill: "#F5FBFF", stroke: "#4AA9D8" }, bindings: {}, containerRole: "work-panel" },
    { role: "group-label", scope: "each-item", layoutRole: "group-label", idRole: "group-label", toolKey: "common.text", intentKind: "text", locked: true, movable: false, instructionalIntent: "한 묶음의 수와 묶음 수를 말로 나타냅니다.", properties: { text: "", fontSize: 25 }, bindings: { text: "item.groupLabelText" }, containerRole: "array-panel" },
    { role: "array-text", scope: "each-item", layoutRole: "array-text", idRole: "array-text", toolKey: "common.text", intentKind: "text", locked: true, movable: false, instructionalIntent: "각 괄호를 한 묶음으로 하여 전체를 직접 셀 수 있는 배열입니다.", properties: { text: "", fontSize: 24 }, bindings: { text: "item.arrayText" }, containerRole: "array-panel" }
  ],
  layout: { tokenSet: "wave17-multiplication-array-v1", root: { id: "canvas", kind: "canvas", preset: "canvas.root", repeat: "once", children: [
    ...makeChoiceExplanationScaffoldLayoutChildren(),
    layoutBlock("array-panel", "slot", "item.array-panel", "each-item"),
    layoutBlock("group-label", "slot", "item.group-label", "each-item"),
    layoutBlock("array-text", "slot", "item.array-text", "each-item")
  ] } },
  constraints: [{ id: "select-multiplication-expression", kind: "select-one-of", sources: CHOICE_CARD_ROLES.map((role) => ({ scope: "each-item" as const, role })), target: { scope: "each-item", role: "prediction-box" }, parameters: {}, requiresStudentAction: true }],
  valuePredicates: [
    { kind: "cognitive.release-contract", parameters: { mode: "select-one", decisionConstraintId: "select-multiplication-expression", candidateRoles: CHOICE_CARD_ROLES, candidateProperty: "text", correctValuePath: "correctValueText", predictionRole: "prediction-box", explanationRole: "explanation-box", verificationRoles: ["array-panel", "group-label", "array-text"] } },
    { kind: "language.classroom-korean", parameters: { instructionRoles: ["instruction-predict", "instruction-verify", "instruction-explain"], labelRoles: ["prediction-label", "pool-label", "explanation-label", "group-label"], promptRoles: ["question"], maximumInstructionLength: 70, maximumLabelLength: 20 } },
    { kind: "visual.text-fit", parameters: { roles: ["instruction-predict", "instruction-verify", "instruction-explain", "question", "prediction-label", "pool-label", "explanation-label", "group-label", "array-text"], maximumFillRatio: 0.96 } },
    { kind: "visual.labeled-pool-row", parameters: { labelRole: "pool-label", memberRoles: CHOICE_CARD_ROLES, containerRole: "choice-panel", rowCenterTolerance: 2, gapTolerance: 2, groupCenterTolerance: 12, labelAlignmentTolerance: 2, minimumLabelGap: 12, maximumLabelGap: 24 } },
    { kind: "visual.no-overlap", parameters: { roles: ["number", "question", "group-label", "array-text", "prediction-label", "prediction-box", "pool-label", ...CHOICE_CARD_ROLES, "explanation-label", "explanation-box"] } }
  ],
  instructions: [...instructions],
  payload: { categoryId: MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId, tags: ["곱셈", "같은 수씩 묶기", "배열", "생각 고치기"], studyLevel: "elementary", isShowMenuOnActivity: true },
  variationDefaults: { problemCount: 2, difficulty: "normal" }
});
