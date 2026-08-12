import {
  MATHCANVAS_PROJECT_CATEGORIES,
  PROBLEM_FAMILY_SCHEMA_VERSION,
  createSeededRandom,
  defineActivityBlueprint,
  defineCognitiveDemandManifest,
  defineVariationEnvelope,
  problemParametersSchema,
  type Difficulty,
  type ProblemParameters,
  type Recommendation,
  type ResolvedActivity,
  type ResolvedItem
} from "@mathcanvas/contracts";
import { findAssessmentTargetSet } from "@mathcanvas/curriculum";
import {
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "../../../blueprints/choice-explanation-scaffold.js";
import { withStudentScreenQuality } from "../../../blueprints/student-screen-quality.js";
import type {
  GenerateActivitySpecOptions,
  RegisteredProblemPreview,
  RegisteredTeacherAnswer
} from "../../runtime-types.js";
import type {
  ProblemFamilyCapabilityExtension,
  ProblemFamilyNativeModule,
  ProblemFamilyRegistrySource
} from "../../types.js";

export const DECLARED_REPEAT_REPAIR_FAMILY_ID =
  "pattern.declared-repeat.repair-v1" as const;
export const DECLARED_REPEAT_REPAIR_MANIPULATION =
  "pattern-declared-repeat-repair" as const;
export const DECLARED_REPEAT_REPAIR_GENERATOR_ID =
  "pattern.declared-repeat.repair-items" as const;
export const DECLARED_REPEAT_REPAIR_GENERATOR_VERSION = "1.0.0" as const;
const LEARNING_MAP_USAGE_SNAPSHOT_SHA256 =
  "bed940f1896d3991aeb12766dff49c84dd110465e38ed01625ed5f32b564b1d5";
const TARGET_ID = "change.pattern.declared-repeat.repair-v1" as const;

const assessmentTargetSet = findAssessmentTargetSet("[2수02-02]");
if (!assessmentTargetSet?.targetIds.includes(TARGET_ID)) {
  throw new Error("declared-repeat-repair-assessment-target-missing");
}

export const DECLARED_REPEAT_REPAIR_CONTEXT_IDS = [
  "repeat-colors",
  "repeat-shapes"
] as const;
export type DeclaredRepeatRepairContextId =
  (typeof DECLARED_REPEAT_REPAIR_CONTEXT_IDS)[number];

type RepairItemSpec = Readonly<{
  semanticValues: readonly [number, number, number];
  wrongValue: number;
  questionText: string;
  continuationText: string;
}>;

type RepairContext = Readonly<{
  title: string;
  items: readonly [RepairItemSpec, RepairItemSpec];
}>;

const CONTEXTS: Readonly<
  Record<DeclaredRepeatRepairContextId, RepairContext>
> = {
  "repeat-colors": {
    title: "색깔 패턴 블록",
    items: [
      {
        semanticValues: [4, 5, 6],
        wrongValue: 2,
        questionText:
          "두 가지 패턴 블록으로 내 규칙을 정하면, 어긋난 곳을 어떻게 고치고 다음 배열을 완성할까요?",
        continuationText:
          "내가 정한 두 조각의 순서대로 다음 네 칸을 채워 보세요."
      },
      {
        semanticValues: [4, 5, 6],
        wrongValue: 1,
        questionText:
          "두 가지 패턴 블록으로 내 규칙을 정하면, 어긋난 곳을 어떻게 고치고 다음 배열을 완성할까요?",
        continuationText:
          "내가 정한 두 조각의 순서대로 다음 네 칸을 채워 보세요."
      }
    ]
  },
  "repeat-shapes": {
    title: "모양 패턴 블록",
    items: [
      {
        semanticValues: [1, 2, 3],
        wrongValue: 6,
        questionText:
          "두 가지 패턴 블록으로 내 규칙을 정하면, 어긋난 곳을 어떻게 고치고 다음 배열을 완성할까요?",
        continuationText:
          "내가 정한 두 조각의 순서대로 다음 네 칸을 채워 보세요."
      },
      {
        semanticValues: [1, 2, 3],
        wrongValue: 5,
        questionText:
          "두 가지 패턴 블록으로 내 규칙을 정하면, 어긋난 곳을 어떻게 고치고 다음 배열을 완성할까요?",
        continuationText:
          "내가 정한 두 조각의 순서대로 다음 네 칸을 채워 보세요."
      }
    ]
  }
};

const instructions = [
  "① 바구니에서 두 가지 패턴 블록을 골라 규칙 칸에 순서대로 놓으세요.",
  "② 어긋난 블록을 뺀 조각 칸으로 옮기고, 내 규칙에 맞는 블록을 고칠 자리에 놓으세요.",
  "③ 내 규칙대로 다음 네 칸을 채운 뒤, 같은 순서인지 확인하세요."
] as const;

const scaffoldBase = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "학생이 두 패턴 블록과 순서를 직접 선택해 반복 단위를 선언하게 합니다.",
    "학생이 선언한 반복 단위와 어긋난 블록을 실제로 분리하고 알맞은 블록으로 교체하게 합니다.",
    "학생이 선언한 두 조각의 순서를 다음 네 칸에 적용해 완성한 배열로 근거를 남기게 합니다."
  ],
  questionIntent:
    "학생이 스스로 선언한 반복 단위를 어긋난 항의 수정과 다음 배열 구성에 일관되게 적용하게 합니다.",
  predictionLabel: "내가 정한 규칙",
  poolLabel: "쓸 수 있는 패턴 블록",
  explanationLabel: "교사 확인 기준",
  centerCandidates: false,
  fontSizes: { question: 23, label: 21 }
});

const scaffold = scaffoldBase
  .filter(
    (role) =>
      !role.role.startsWith("position-card-") &&
      role.role !== "choice-panel" &&
      role.role !== "pool-label"
  )
  .map((role) => {
    if (role.role.startsWith("instruction-")) {
      return { ...role, locked: false };
    }
    if (role.role === "work-panel") {
      return {
        ...role,
        properties: { fill: "none", stroke: "slategray" }
      };
    }
    if (role.role === "prediction-box") {
      return {
        ...role,
        properties: {
          fill: "white",
          stroke: "slategray",
          strokeDashArray: "8 6"
        }
      };
    }
    if (role.role === "explanation-box") {
      return {
        ...role,
        role: "teacher-rubric",
        layoutRole: "teacher-rubric",
        idRole: "teacher-rubric",
        toolKey: "common.text" as const,
        intentKind: "text" as const,
        properties: {
          text: "내 규칙과 고친 배열의 순서 비교",
          fontSize: 20
        },
        bindings: {},
        instructionalIntent:
          "교사가 학생의 선언 상태에 따라 수정 결과를 확인하는 조건부 루브릭입니다."
      };
    }
    return role;
  });

const ruleSlotRoles = ["rule-slot-1", "rule-slot-2"] as const;
const variantRoles = Array.from(
  { length: 12 },
  (_, index) => "rule-variant-" + (index + 1)
);
const variantLayoutRoles = Array.from(
  { length: 12 },
  (_, index) => "rule-source-" + (index + 1)
);
const continuationTargetRoles = [
  "continuation-slot-1",
  "continuation-slot-2",
  "continuation-slot-3",
  "continuation-slot-4"
] as const;
const repairRoles = [
  "misaligned-item",
  "repair-target",
  "repair-bank"
] as const;

const emptyTargetRole = (
  role: string,
  intent: string,
  containerRole: string
) => ({
  role,
  scope: "each-item" as const,
  layoutRole: role,
  idRole: role,
  toolKey: "common.rectangle" as const,
  intentKind: "draw-rectangle" as const,
  locked: true,
  movable: false,
  instructionalIntent: intent,
  properties: {
    fill: "white",
    stroke: "slategray",
    strokeDashArray: "8 6"
  },
  bindings: {},
  containerRole
});

const patternRoles = [
  {
    role: "pattern-track",
    scope: "each-item" as const,
    layoutRole: "pattern-track",
    idRole: "pattern-track",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "선언한 규칙, 다음 배열, 어긋난 항의 수정 결과를 한 화면에서 비교하는 작업 영역입니다.",
    properties: { fill: "aliceblue", stroke: "slategray" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "rule-label",
    scope: "each-item" as const,
    layoutRole: "rule-label",
    idRole: "rule-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "학생이 두 조각과 순서를 선언할 곳을 안내합니다.",
    properties: { text: "내 규칙", fontSize: 20 },
    bindings: {},
    containerRole: "pattern-track"
  },
  {
    role: "continuation-label",
    scope: "each-item" as const,
    layoutRole: "continuation-label",
    idRole: "continuation-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "선언한 규칙을 이어서 적용할 네 칸을 안내합니다.",
    properties: { text: "내 규칙으로 다음 네 칸 잇기", fontSize: 18 },
    bindings: {},
    containerRole: "pattern-track"
  },
  {
    role: "repair-label",
    scope: "each-item" as const,
    layoutRole: "repair-label",
    idRole: "repair-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "어긋난 블록을 빼고 새 블록으로 고칠 곳을 안내합니다.",
    properties: {
      text: "어긋난 블록 → 고칠 자리 → 뺀 조각",
      fontSize: 18
    },
    bindings: {},
    containerRole: "pattern-track"
  },
  ...ruleSlotRoles.map((role) =>
    emptyTargetRole(
      role,
      "학생이 바구니에서 고른 블록을 순서대로 놓아 규칙을 선언하는 빈 칸입니다.",
      "pattern-track"
    )
  ),
  ...continuationTargetRoles.map((role) =>
    emptyTargetRole(
      role,
      "학생이 선언한 반복 단위의 해당 순서를 적용하는 빈 칸입니다.",
      "pattern-track"
    )
  ),
  {
    role: "misaligned-item",
    scope: "each-item" as const,
    layoutRole: "misaligned-item",
    idRole: "misaligned-item",
    toolKey: "SM02PB",
    intentKind: "pattern-block" as const,
    locked: false,
    movable: true,
    instructionalIntent:
      "학생이 선언할 어떤 규칙의 두 번째 조각과도 다른, 실제로 빼야 할 독립된 어긋난 블록입니다.",
    properties: {},
    bindings: {
      variant: "item.misalignedVariant",
      orderedValues: "item.misalignedVariant"
    },
    containerRole: "pattern-track"
  },
  emptyTargetRole(
    "repair-target",
    "학생이 선언한 규칙의 두 번째 조각과 같은 블록을 놓아 고치는 빈 칸입니다.",
    "pattern-track"
  ),
  emptyTargetRole(
    "repair-bank",
    "학생이 어긋난 블록을 옮겨 두는 빈 칸입니다.",
    "pattern-track"
  ),
  {
    role: "piece-bank",
    scope: "each-item" as const,
    layoutRole: "piece-bank",
    idRole: "piece-bank",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "규칙 선언, 다음 배열, 교체에 함께 사용하는 열두 개의 물리 블록 바구니입니다.",
    properties: { fill: "azure", stroke: "steelblue" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "pool-label",
    scope: "each-item" as const,
    layoutRole: "piece-bank-label",
    idRole: "pool-label",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "학생이 옮길 수 있는 패턴 블록을 안내합니다.",
    properties: { text: "패턴 블록", fontSize: 21 },
    bindings: {},
    containerRole: "piece-bank"
  },
  ...variantRoles.map((role, index) => ({
    role,
    scope: "each-item" as const,
    layoutRole: variantLayoutRoles[index]!,
    idRole: role,
    toolKey: "SM02PB" as const,
    intentKind: "pattern-block" as const,
    locked: false,
    movable: true,
    instructionalIntent:
      "학생이 규칙 선언, 다음 배열, 고친 자리에 사용할 수 있는 패턴 블록입니다.",
    properties: {},
    bindings: {
      variant: "item.ruleVariant" + (index + 1),
      orderedValues: "item.ruleVariant" + (index + 1)
    },
    containerRole: "piece-bank"
  }))
];

const scaffoldLayoutChildren =
  makeChoiceExplanationScaffoldLayoutChildren()
    .filter(
      (child) =>
        !child.id.startsWith("position-card-") &&
        child.id !== "choice-panel" &&
        child.id !== "pool-label"
    )
    .map((child) =>
      child.id === "explanation-box"
        ? { ...child, id: "teacher-rubric" }
        : child
    );

export const declaredRepeatRepairVariationEnvelope = defineVariationEnvelope({
  schemaVersion: "1.0.0",
  blueprintId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
  knobs: [
    {
      key: "problemCount",
      tier: "T1",
      kind: "bounded-integer",
      min: 2,
      max: 2,
      default: 2
    },
    {
      key: "contextId",
      tier: "T1",
      kind: "enum",
      values: [...DECLARED_REPEAT_REPAIR_CONTEXT_IDS],
      default: "repeat-colors"
    }
  ],
  pinned: { difficulty: "normal" },
  expectedCombinationCount: DECLARED_REPEAT_REPAIR_CONTEXT_IDS.length
});

export const declaredRepeatRepairBlueprint = defineActivityBlueprint(
  withStudentScreenQuality(
    {
      schemaVersion: "1.0.0",
      id: DECLARED_REPEAT_REPAIR_FAMILY_ID,
      version: "1.0.0",
      title: "내가 정한 반복 규칙으로 배열 고치기",
      learningObjective:
        "두 패턴 블록의 순서를 스스로 선언하고, 그 반복 단위에 따라 어긋난 항을 교체하며 다음 배열을 완성할 수 있다.",
      curriculumBinding: {
        standardCode: "[2수02-02]",
        domain: "변화와 관계",
        officialGoal:
          "자신이 정한 규칙에 따라 물체, 무늬, 수 등을 배열할 수 있다."
      },
      generator: {
        id: DECLARED_REPEAT_REPAIR_GENERATOR_ID,
        version: DECLARED_REPEAT_REPAIR_GENERATOR_VERSION,
        parameters: {
          problemCount: 2,
          difficulty: "normal",
          contextId: "repeat-colors"
        }
      },
      toolRoles: [...scaffold, ...patternRoles],
      layout: {
        tokenSet: "w002-repeat-repair-v1",
        root: {
          id: "canvas",
          kind: "canvas",
          preset: "canvas.root",
          repeat: "once",
          children: [
            ...scaffoldLayoutChildren,
            layoutBlock(
              "pool-flow-frame",
              "band",
              "item.pattern-track",
              "each-item",
              undefined,
              "pool-flow"
            ),
            layoutBlock(
              "pattern-track",
              "slot",
              "item.pattern-track",
              "each-item"
            ),
            layoutBlock("rule-label", "slot", "item.rule-label", "each-item"),
            layoutBlock(
              "continuation-label",
              "slot",
              "item.continuation-label",
              "each-item"
            ),
            layoutBlock(
              "repair-label",
              "slot",
              "item.repair-label",
              "each-item"
            ),
            ...ruleSlotRoles.map((role) =>
              layoutBlock(role, "slot", "item." + role, "each-item")
            ),
            ...continuationTargetRoles.map((role) =>
              layoutBlock(role, "slot", "item." + role, "each-item")
            ),
            ...repairRoles.map((role) =>
              layoutBlock(role, "slot", "item." + role, "each-item")
            ),
            layoutBlock(
              "piece-bank",
              "slot",
              "item.piece-bank",
              "each-item",
              undefined,
              "pool-flow"
            ),
            layoutBlock(
              "piece-bank-label",
              "slot",
              "item.piece-bank-label",
              "each-item"
            ),
            ...variantLayoutRoles.map((role) =>
              layoutBlock(role, "slot", "item." + role, "each-item")
            )
          ]
        }
      },
      constraints: [
        ...ruleSlotRoles.map((role, index) => ({
          id: "construct-rule-slot-" + (index + 1),
          kind: "fill-from-pool" as const,
          sources: variantRoles.map((sourceRole) => ({
            scope: "each-item" as const,
            role: sourceRole
          })),
          target: { scope: "each-item" as const, role },
          parameters: {
            phase: "rule-selection",
            initialRuleStatePath: "studentRuleState",
            writesRuleStatePath: "declaredRuleState",
            ruleStateIndex: index,
            sourceValueProperty: "orderedValues"
          },
          requiresStudentAction: true
        })),
        ...continuationTargetRoles.map((role, index) => ({
          id: "apply-rule-slot-" + (index + 1),
          kind: "fill-from-pool" as const,
          sources: variantRoles.map((sourceRole) => ({
            scope: "each-item" as const,
            role: sourceRole
          })),
          target: { scope: "each-item" as const, role },
          parameters: {
            phase: "apply-declared-rule",
            ruleStatePath: "declaredRuleState",
            ruleStateIndex: index % 2,
            sourceValueProperty: "orderedValues"
          },
          requiresStudentAction: true
        })),
        {
          id: "remove-misaligned-item",
          kind: "place-in",
          sources: [
            { scope: "each-item" as const, role: "misaligned-item" }
          ],
          target: { scope: "each-item" as const, role: "repair-bank" },
          parameters: {
            phase: "remove-misaligned",
            declaredRuleStatePath: "declaredRuleState",
            repairRuleStateIndex: 1,
            wrongItemProperty: "orderedValues",
            beforeStatePath: "initialArrangementState",
            afterStatePath: "repairedArrangementState"
          },
          requiresStudentAction: true
        },
        {
          id: "repair-misaligned-item",
          kind: "fill-from-pool",
          sources: variantRoles.map((sourceRole) => ({
            scope: "each-item" as const,
            role: sourceRole
          })),
          target: { scope: "each-item" as const, role: "repair-target" },
          parameters: {
            phase: "place-replacement",
            declaredRuleStatePath: "declaredRuleState",
            repairRuleStateIndex: 1,
            sourceValueProperty: "orderedValues",
            wrongItemProperty: "orderedValues",
            beforeStatePath: "initialArrangementState",
            afterStatePath: "repairedArrangementState",
            validAfterStateExamplesPath:
              "validRepairedArrangementStatesByDeclaredRuleState",
            writesStatePath: "repairedArrangementState",
            conditionalMappingPath:
              "validRepairedArrangementStatesByDeclaredRuleState"
          },
          requiresStudentAction: true
        }
      ],
      valuePredicates: [
        {
          kind: "cognitive.rule-state-contract",
          parameters: {
            mode: "construct-rule",
            ruleStatePath: "studentRuleState",
            decisionConstraintId: "construct-rule-slot",
            validRuleStatesPath: "validRuleStateExamples",
            surplusPath: "surplusRuleStateExamples",
            variantRoles: [...variantRoles],
            ruleSlotRoles: [...ruleSlotRoles],
            variantProperty: "orderedValues",
            continuationRuleStatePath: "declaredRuleState",
            explanationRuleStatePath: "declaredRuleState",
            predictionRole: "prediction-box",
            explanationRole: "teacher-rubric",
            verificationRoles: [
              ...ruleSlotRoles,
              ...continuationTargetRoles,
              ...repairRoles
            ],
            minimumValidStates: 6,
            minimumSurplus: 3,
            distractors: [
              {
                predicateKind: "cognitive.rule-state-contract",
                misconception:
                  "마지막에 보인 블록만 반복하면 선언한 두 조각의 순서를 적용한 것이라고 생각한다."
              },
              {
                predicateKind: "cognitive.rule-state-contract",
                misconception:
                  "반복 단위의 경계를 놓쳐 어긋난 블록을 그대로 두어도 배열이 맞는다고 생각한다."
              }
            ],
            constructionMode: "student-constructed",
            answerMode: "conditional-rubric",
            studentInputRoles: [],
            stateConstruction: {
              kind: "ordered-distinct-subset-from-pool",
              sourceRoles: [...variantRoles],
              slotRoles: [...ruleSlotRoles],
              slotCount: 2,
              minimumDistinctValues: 2,
              minimumDistinctPoolValues: 3,
              minimumCopiesPerDistinctValue: 4,
              sourceUseMode: "move-once-no-clone",
              allowsAnyOrderedSelection: true,
              initialState: "empty"
            },
            application: {
              ruleStatePath: "declaredRuleState",
              continuationTargetRoles: [...continuationTargetRoles],
              period: 2,
              minimumTargetCount: 4,
              requiresVisibleComparison: true,
              requiresSimultaneousRuleAndContinuation: true,
              ruleStateIndexMode: "index-mod-period",
              evidenceMode: "student-state-dependent"
            },
            repair: {
              kind: "declared-rule-independent-misplacement",
              declaredRuleStatePath: "declaredRuleState",
              repairRuleStateIndex: 1,
              wrongItemProperty: "orderedValues",
              wrongItemRoles: ["misaligned-item"],
              repairTargetRoles: ["repair-target"],
              repairBankRoles: ["repair-bank"],
              beforeStatePath: "initialArrangementState",
              afterStatePath: "repairedArrangementState",
              validAfterStateExamplesPath:
                "validRepairedArrangementStatesByDeclaredRuleState",
              afterStateDerivation: {
                kind: "replace-at-declared-rule-index",
                declaredRuleStatePath: "declaredRuleState",
                repairRuleStateIndex: 1,
                requiresConditionalMapping: true
              },
              removeConstraintId: "remove-misaligned-item",
              replacementConstraintId: "repair-misaligned-item",
              requiresIndependentWrongState: true,
              requiresBeforeAfterComparison: true,
              evidenceMode: "student-state-dependent"
            },
            stateLifecycle: {
              kind: "empty-selection-then-declared-repair",
              statePath: "studentRuleState",
              selectionPhase: "rule-selection",
              selectionOutputStatePath: "declaredRuleState",
              writesDeclaredState: true,
              phaseOrder: [
                "rule-selection",
                "remove-misaligned",
                "place-replacement"
              ],
              initialState: "empty",
              declaredStateCardinality: 2,
              declaredStateExamplesPath: "validRuleStateExamples",
              selectionConstraintIdPrefix: "construct-rule-slot",
              requiresIndexedSelectionWrites: true,
              repairRequiresDeclaredState: true
            }
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
              "rule-label",
              "continuation-label",
              "repair-label",
              "pool-label",
              "prediction-label",
              "explanation-label",
              "teacher-rubric"
            ],
            promptRoles: ["question"],
            maximumInstructionLength: 88,
            maximumLabelLength: 50
          }
        },
        {
          kind: "visual.text-fit",
          parameters: {
            roles: [
              "instruction-predict",
              "instruction-verify",
              "instruction-explain",
              "question",
              "rule-label",
              "continuation-label",
              "repair-label",
              "pool-label",
              "prediction-label",
              "explanation-label",
              "teacher-rubric"
            ],
            maximumFillRatio: 0.96
          }
        },
        {
          kind: "visual.labeled-pool-row",
          parameters: {
            labelRole: "pool-label",
            memberRoles: [...variantRoles],
            containerRole: "piece-bank",
            rowCenterTolerance: 2,
            gapTolerance: 2,
            groupCenterTolerance: 800,
            labelAlignmentTolerance: 100,
            minimumLabelGap: 12,
            maximumLabelGap: 50
          }
        },
        {
          kind: "visual.no-overlap",
          parameters: {
            roles: [
              "number",
              "question",
              "rule-label",
              "continuation-label",
              "repair-label",
              ...ruleSlotRoles,
              ...continuationTargetRoles,
              ...repairRoles,
              "pool-label",
              ...variantRoles,
              "prediction-label",
              "prediction-box",
              "explanation-label",
              "teacher-rubric"
            ]
          }
        }
      ],
      instructions: [...instructions],
      payload: {
        categoryId: MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId,
        tags: ["반복 규칙", "배열 고치기", "패턴 블록", "조건부 수정"],
        studyLevel: "elementary",
        isShowMenuOnActivity: true
      },
      variationDefaults: {
        problemCount: 2,
        difficulty: "normal",
        contextId: "repeat-colors"
      }
    },
    {
      questionFontSize: 23,
      compactGlyphRoles: [
        "rule-label",
        "continuation-label",
        "repair-label",
        ...variantRoles,
        "misaligned-item"
      ],
      compactGlyphMinimumFontSize: 16
    }
  )
);

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target]!, output[index]!];
  }
  return output;
}

const PATTERN_BLOCK_LABELS: Readonly<Record<number, string>> = {
  1: "노란 육각형",
  2: "파란 마름모",
  3: "빨간 사다리꼴",
  4: "초록 삼각형",
  5: "주황 정사각형",
  6: "보라 마름모"
};

function patternBlockLabel(value: unknown): string {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    PATTERN_BLOCK_LABELS[value] === undefined
  ) {
    throw new Error("declared-repeat-repair-variant-invalid");
  }
  return PATTERN_BLOCK_LABELS[value]!;
}

function stateText(state: readonly number[]): string {
  return state.map(patternBlockLabel).join(" → ");
}

function validStates(
  values: readonly [number, number, number]
): readonly (readonly [number, number])[] {
  return values.flatMap((left) =>
    values
      .filter((right) => right !== left)
      .map((right) => [left, right] as const)
  );
}

function surplusStates(
  values: readonly [number, number, number]
): readonly (readonly [number, number])[] {
  return values.map((value) => [value, value] as const);
}

export function generateDeclaredRepeatRepairItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly contextId: DeclaredRepeatRepairContextId;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2 ||
    !DECLARED_REPEAT_REPAIR_CONTEXT_IDS.includes(parameters.contextId)
  ) {
    throw new RangeError(
      "선언한 반복 규칙으로 배열 고치기 활동은 기본 난이도·2문항·등록된 패턴 맥락을 지원합니다."
    );
  }
  const context = CONTEXTS[parameters.contextId];
  const random = createSeededRandom(
    seed + ":declared-repeat-repair:" + parameters.contextId
  );
  return context.items.map((spec, index) => {
    const states = validStates(spec.semanticValues);
    const surplus = surplusStates(spec.semanticValues);
    const physicalVariants = spec.semanticValues.flatMap((value) => [
      value,
      value,
      value,
      value
    ]);
    const variants = shuffle(physicalVariants, random);
    return {
      id:
        DECLARED_REPEAT_REPAIR_FAMILY_ID +
        "-" +
        parameters.contextId +
        "-" +
        (index + 1),
      order: index + 1,
      kind: "declared-repeat-repair",
      values: {
        contextId: parameters.contextId,
        contextTitle: context.title,
        orderLabel: index + 1 + "번",
        questionText: spec.questionText,
        continuationText: spec.continuationText,
        studentRuleState: [],
        declaredRuleState: [],
        validRuleStateExamples: states.map((state) => [...state]),
        surplusRuleStateExamples: surplus.map((state) => [...state]),
        initialArrangementState: [],
        repairedArrangementState: [],
        validRepairedArrangementStatesByDeclaredRuleState: states.map(
          (declaredRuleState) => ({
            declaredRuleState: [...declaredRuleState],
            beforeState: [declaredRuleState[0], spec.wrongValue],
            afterState: [...declaredRuleState]
          })
        ),
        misalignedVariant: spec.wrongValue,
        correctAnswerText:
          "학생이 선언한 두 조각의 순서에 맞게 어긋난 두 번째 블록을 바꾸고, 같은 두 조각 순서로 다음 네 칸을 채운 결과",
        answerExplanation:
          "학생이 실제로 고른 첫째·둘째 블록을 한 단위로 봅니다. 어긋난 두 번째 블록은 학생이 고른 둘째 블록과 같은 블록으로 바꾸고, 다음 네 칸은 첫째·둘째·첫째·둘째 순서가 되면 맞습니다.",
        misconceptionIds: [
          "repeat.pattern.copy-last-item-instead-of-applying-rule-v1",
          "repeat.pattern.rule-boundary-mismatch-v1"
        ],
        ...Object.fromEntries(
          variants.map((value, variantIndex) => [
            "ruleVariant" + (variantIndex + 1),
            value
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: DECLARED_REPEAT_REPAIR_GENERATOR_ID,
        generatorVersion: DECLARED_REPEAT_REPAIR_GENERATOR_VERSION,
        seed
      }
    };
  });
}

function generateItemsForVariation(
  variation: Readonly<Record<string, unknown>>,
  seed: string
): ResolvedItem[] {
  if (
    variation.problemCount !== 2 ||
    variation.difficulty !== "normal" ||
    typeof variation.contextId !== "string" ||
    !DECLARED_REPEAT_REPAIR_CONTEXT_IDS.includes(
      variation.contextId as DeclaredRepeatRepairContextId
    )
  ) {
    throw new Error(
      "problem-family-native-variation-invalid:" +
        DECLARED_REPEAT_REPAIR_FAMILY_ID
    );
  }
  return generateDeclaredRepeatRepairItems(
    {
      difficulty: "normal",
      problemCount: 2,
      contextId: variation.contextId as DeclaredRepeatRepairContextId
    },
    seed
  );
}

const defaultProblemParameters = problemParametersSchema.parse({
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
  values: { contextId: "repeat-colors" }
});

function parseProblemParameters(input: ProblemParameters): ProblemParameters {
  const parsed = problemParametersSchema.parse(input);
  const contextId = parsed.values.contextId;
  if (
    parsed.familyId !== DECLARED_REPEAT_REPAIR_FAMILY_ID ||
    Object.keys(parsed.values).join(":") !== "contextId" ||
    typeof contextId !== "string" ||
    !DECLARED_REPEAT_REPAIR_CONTEXT_IDS.includes(
      contextId as DeclaredRepeatRepairContextId
    )
  ) {
    throw new Error("declared-repeat-repair-parameters-unsupported");
  }
  return problemParametersSchema.parse({
    ...parsed,
    values: { contextId }
  });
}

export const declaredRepeatRepairCapability: ProblemFamilyCapabilityExtension = {
  familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
  recommendedGrade: 2,
  gradeRange: [1, 2],
  defaultProblemCount: 2,
  parameterFields: [
    {
      key: "contextId",
      inputLabel: "패턴 블록 맥락",
      control: "select",
      section: "수학 조건",
      options: DECLARED_REPEAT_REPAIR_CONTEXT_IDS.map((value) => ({
        value,
        label: CONTEXTS[value].title
      }))
    }
  ],
  defaultParameters: defaultProblemParameters,
  promptGuards: [
    {
      pattern: "(repeat-3|세 조각|세 항|3개 반복)",
      message:
        "현재 envelope는 두 조각 repeat 규칙의 선언·수정만 지원합니다. repeat-3은 별도 family가 필요합니다."
    },
    {
      pattern: "(수 배열|변화량|시작값|증가|감소|등차)",
      message:
        "수의 시작값·변화량·방향은 change-rule family의 범위이며 이 family는 패턴 블록 repeat만 지원합니다."
    },
    {
      pattern: "(초록.*주황|주황.*초록|정답.*순서|특정.*순서)",
      message:
        "이 family는 학생이 두 조각과 순서를 직접 선언하는 활동이라 미리 정한 정답 순서를 지원하지 않습니다."
    },
    {
      pattern: "(자동.?채점|응답.?저장|재열기.*응답)",
      message:
        "현재 envelope는 학생 조작 상태의 자동 채점·응답 저장·재열기를 증명하지 않았습니다."
    }
  ],
  unsupportedParameterPolicy: "clarification-required",
  title: "내가 정한 반복 규칙으로 배열 고치기",
  scopeNote:
    "세 가지 패턴 블록 값의 물리적 복제 4개씩(총 12개)에서 학생이 서로 다른 두 조각과 순서를 선언하고, 독립된 어긋난 두 번째 항을 교체하며 다음 네 칸에 repeat-2 규칙을 적용하는 조건부 envelope입니다. 특정 정답 순서, repeat-3, 수 변화, 자동 채점, 실제 응답 저장·재열기는 지원하지 않습니다.",
  parseParameters: parseProblemParameters
};

function requirePreparedRecommendation(
  recommendation: Recommendation
): { problemCount: number; difficulty: "normal"; parameters: ProblemParameters } {
  if (
    recommendation.templateId !== DECLARED_REPEAT_REPAIR_FAMILY_ID ||
    recommendation.standardCode !== "[2수02-02]" ||
    recommendation.manipulation !== DECLARED_REPEAT_REPAIR_MANIPULATION ||
    recommendation.problemCount !== 2 ||
    recommendation.difficulty !== "normal"
  ) {
    throw new Error(
      "activity-recommendation-mismatch:" +
        DECLARED_REPEAT_REPAIR_FAMILY_ID
    );
  }
  return {
    problemCount: 2,
    difficulty: "normal",
    parameters: parseProblemParameters(
      recommendation.problemParameters ?? defaultProblemParameters
    )
  };
}

function prepare(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
) {
  const prepared = requirePreparedRecommendation(recommendation);
  if (Number.isNaN(Date.parse(options.generatedAt))) {
    throw new Error("generatedAt-invalid");
  }
  const contextId = prepared.parameters.values
    .contextId as DeclaredRepeatRepairContextId;
  return {
    blueprint: declaredRepeatRepairBlueprint,
    items: generateDeclaredRepeatRepairItems(
      {
        difficulty: prepared.difficulty,
        problemCount: prepared.problemCount,
        contextId
      },
      options.seed
    ),
    recommendation,
    options: {
      seed: options.seed,
      generatedAt: new Date(options.generatedAt).toISOString(),
      activityId:
        options.activityId ??
        DECLARED_REPEAT_REPAIR_FAMILY_ID + "-" + options.seed,
      templateVersion: declaredRepeatRepairBlueprint.version,
      variation: {
        problemCount: 2,
        difficulty: "normal",
        contextId
      }
    }
  };
}

function answerKey(resolved: ResolvedActivity): RegisteredTeacherAnswer[] {
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    answer: String(item.values.correctAnswerText),
    explanation: String(item.values.answerExplanation)
  }));
}

function problemPreviews(
  resolved: ResolvedActivity
): RegisteredProblemPreview[] {
  return [...resolved.items]
    .sort((left, right) => left.order - right.order)
    .map((item) => {
      const valid = item.values
        .validRuleStateExamples as readonly (readonly number[])[];
      const surplus = item.values
        .surplusRuleStateExamples as readonly (readonly number[])[];
      const mappings = item.values
        .validRepairedArrangementStatesByDeclaredRuleState as readonly {
        readonly declaredRuleState: readonly number[];
        readonly beforeState: readonly number[];
        readonly afterState: readonly number[];
      }[];
      const variants = variantRoles.map((_, index) =>
        patternBlockLabel(item.values["ruleVariant" + (index + 1)])
      );
      return {
        problemNumber: item.order,
        statements: [
          String(item.values.questionText),
          "초기 상태: 학생 규칙, 선언 규칙, 수정 전 배열, 수정 후 배열은 모두 비어 있습니다.",
          "패턴 블록 바구니(세 종류×네 개): " + variants.join(", "),
          "독립된 어긋난 블록: " +
            patternBlockLabel(item.values.misalignedVariant),
          "교사용 허용 선언 6가지: " +
            valid.map((state) => stateText(state)).join(" / "),
          "교사용 거부 선언 3가지: " +
            surplus.map((state) => stateText(state)).join(" / "),
          "교사용 조건부 수정표: " +
            mappings
              .map(
                (mapping) =>
                  "[" +
                  stateText(mapping.declaredRuleState) +
                  "] " +
                  stateText(mapping.beforeState) +
                  " → " +
                  stateText(mapping.afterState)
              )
              .join(" / "),
          "학생 조작 8개: 규칙 선언 2개, 어긋난 블록 빼기 1개, 알맞은 블록 놓기 1개, 다음 배열 채우기 4개.",
          "교사 확인 기준: 학생이 실제로 선언한 두 조각의 순서가 고친 곳과 다음 네 칸에 모두 이어져야 합니다.",
          "이 미리보기는 compile-time 문제·조건부 상태 envelope만 보여 주며 학생의 실제 응답·저장·재열기와 자동 채점을 증명하지 않습니다."
        ]
      };
    });
}

function appliedProblemParameters(
  resolved: ResolvedActivity
): ProblemParameters | undefined {
  const contextId = resolved.items[0]?.values.contextId;
  if (typeof contextId !== "string") return undefined;
  return parseProblemParameters({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
    values: { contextId }
  });
}

const source: ProblemFamilyRegistrySource = {
  registrationKind: "native-problem-family-module",
  familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
  templateId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
  activityId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
  standardCode: "[2수02-02]",
  supportedStandardCodes: ["[2수02-02]"],
  gradeBand: "1-2",
  domain: "변화와 관계",
  learningGoal: declaredRepeatRepairBlueprint.learningObjective,
  assessmentTargetIds: [TARGET_ID],
  solReviewScope: {
    familyTrackId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
    scopeId: "W002-FAMILY_TRACK-repeat-repair"
  },
  manipulation: DECLARED_REPEAT_REPAIR_MANIPULATION,
  generator: {
    id: DECLARED_REPEAT_REPAIR_GENERATOR_ID,
    version: DECLARED_REPEAT_REPAIR_GENERATOR_VERSION
  },
  blueprint: {
    contentHash: declaredRepeatRepairBlueprint.contentHash,
    version: declaredRepeatRepairBlueprint.version,
    layoutTokenSet: declaredRepeatRepairBlueprint.layout.tokenSet
  },
  availableProblemCounts: [2],
  supportedDifficulties: ["normal"],
  supportState: "verified",
  evidencePaths: [
    "packages/templates/src/problem-families/domains/change-relationships/declared-repeat-repair.test.ts"
  ]
};

const cognitiveManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: declaredRepeatRepairBlueprint.id,
  blueprintVersion: declaredRepeatRepairBlueprint.version,
  blueprintContentHash: declaredRepeatRepairBlueprint.contentHash,
  mathematicalDecision:
    "학생은 서로 다른 두 패턴 블록과 순서를 직접 선언하고, 그 선언에 따라 독립된 어긋난 두 번째 항을 교체하며 같은 반복 단위를 다음 네 칸에 적용한다.",
  misconceptionConflict:
    "마지막 블록만 복사하거나 반복 단위의 경계를 놓치는 생각을, 선언한 두 칸·독립된 어긋난 항·조건부 교체칸·다음 네 칸의 동시 비교에 충돌시킨다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    usageSnapshotSha256: LEARNING_MAP_USAGE_SNAPSHOT_SHA256,
    standardCode: "[2수02-02]",
    topicIds: [
      "kr.mt.math.change-relationships.g1-2.s2-02-02.application"
    ],
    prerequisiteTopicIds: [
      "kr.mt.math.change-relationships.g1-2.s2-02-02.concept",
      "kr.mt.math.change-relationships.g1-2.s2-02-02.representation"
    ],
    observableEvidence: [
      "자신이 정한 규칙으로 배열을 끝까지 구성하고 어긋난 항목을 고친다.",
      "수행 과정과 결과를 기록하고, 다음 배열에서 규칙을 더 분명히 드러낼 방법을 제시한다."
    ],
    assessmentPrompt:
      "자신이 정한 규칙으로 물체·무늬·수를 배열하는 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 배열 표현, 결과의 타당성을 차례로 설명하게 하라.",
    caveat:
      "학습지도 저장소는 적용과 선수 관계 설계의 보조 자료이며 공식 교육과정 [2수02-02] 원문을 대신하지 않는다. 이 family는 학생이 선언한 패턴 블록 repeat-2 규칙의 적용·수정 target만 다룬다."
  },
  decision: {
    mode: "construct-rule",
    constructionMode: "student-constructed",
    answerMode: "conditional-rubric",
    ruleStatePath: "studentRuleState",
    decisionConstraintId: "construct-rule-slot",
    variantRoles: [...variantRoles],
    ruleSlotRoles: [...ruleSlotRoles],
    variantProperty: "orderedValues",
    validRuleStatesPath: "validRuleStateExamples",
    surplusPath: "surplusRuleStateExamples",
    minimumValidStates: 6,
    minimumSurplus: 3,
    stateConstruction: {
      kind: "ordered-distinct-subset-from-pool",
      sourceRoles: [...variantRoles],
      slotRoles: [...ruleSlotRoles],
      slotCount: 2,
      minimumDistinctValues: 2,
      minimumDistinctPoolValues: 3,
      minimumCopiesPerDistinctValue: 4,
      sourceUseMode: "move-once-no-clone",
      allowsAnyOrderedSelection: true,
      initialState: "empty"
    },
    application: {
      ruleStatePath: "declaredRuleState",
      continuationTargetRoles: [...continuationTargetRoles],
      period: 2,
      minimumTargetCount: 4,
      requiresVisibleComparison: true,
      requiresSimultaneousRuleAndContinuation: true,
      ruleStateIndexMode: "index-mod-period",
      evidenceMode: "student-state-dependent"
    },
    repair: {
      kind: "declared-rule-independent-misplacement",
      declaredRuleStatePath: "declaredRuleState",
      repairRuleStateIndex: 1,
      wrongItemProperty: "orderedValues",
      wrongItemRoles: ["misaligned-item"],
      repairTargetRoles: ["repair-target"],
      repairBankRoles: ["repair-bank"],
      beforeStatePath: "initialArrangementState",
      afterStatePath: "repairedArrangementState",
      validAfterStateExamplesPath:
        "validRepairedArrangementStatesByDeclaredRuleState",
      afterStateDerivation: {
        kind: "replace-at-declared-rule-index",
        declaredRuleStatePath: "declaredRuleState",
        repairRuleStateIndex: 1,
        requiresConditionalMapping: true
      },
      removeConstraintId: "remove-misaligned-item",
      replacementConstraintId: "repair-misaligned-item",
      requiresIndependentWrongState: true,
      requiresBeforeAfterComparison: true,
      evidenceMode: "student-state-dependent"
    },
    stateLifecycle: {
      kind: "empty-selection-then-declared-repair",
      statePath: "studentRuleState",
      selectionPhase: "rule-selection",
      selectionOutputStatePath: "declaredRuleState",
      writesDeclaredState: true,
      phaseOrder: [
        "rule-selection",
        "remove-misaligned",
        "place-replacement"
      ],
      initialState: "empty",
      declaredStateCardinality: 2,
      declaredStateExamplesPath: "validRuleStateExamples",
      selectionConstraintIdPrefix: "construct-rule-slot",
      requiresIndexedSelectionWrites: true,
      repairRequiresDeclaredState: true
    },
    distractors: [
      {
        predicateKind: "cognitive.rule-state-contract",
        misconception:
          "마지막에 보인 블록만 반복하면 선언한 두 조각의 순서를 적용한 것이라고 생각한다."
      },
      {
        predicateKind: "cognitive.rule-state-contract",
        misconception:
          "반복 단위의 경계를 놓쳐 어긋난 블록을 그대로 두어도 배열이 맞는다고 생각한다."
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "countable-unit-model",
    roles: [
      ...ruleSlotRoles,
      ...continuationTargetRoles,
      ...repairRoles
    ],
    invariant:
      "학생이 선언한 첫째·둘째 블록이 다음 네 칸에서 같은 순서로 두 번 반복되고, 고친 두 번째 항은 선언한 둘째 블록과 같아야 한다."
  },
  explanation: { regionRole: "teacher-rubric" },
  revisionPath:
    "열두 물리 블록과 어긋난 블록은 계속 움직일 수 있으므로, 학생은 선언한 두 칸의 순서에 맞게 교체 블록과 다음 네 칸을 다시 놓을 수 있다.",
  limitations: {
    autoGrading: "none-by-design",
    phaseOrder: "teacher-guided"
  }
});

export const declaredRepeatRepairProblemFamilyModule: ProblemFamilyNativeModule = {
  source,
  capability: declaredRepeatRepairCapability,
  runtime: {
    familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
    blueprint: declaredRepeatRepairBlueprint,
    prepare,
    supportState: "verified",
    generateItemsForVariation,
    answerKey,
    problemPreviews,
    appliedProblemParameters
  },
  cognitiveManifest,
  variationEnvelope: declaredRepeatRepairVariationEnvelope
};
