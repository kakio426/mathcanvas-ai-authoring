import {
  MATHCANVAS_PROJECT_CATEGORIES,
  PROBLEM_FAMILY_SCHEMA_VERSION,
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

export const CHANGE_RULE_CONSTRUCTION_FAMILY_ID =
  "pattern.change-rule.construct-v1" as const;
export const CHANGE_RULE_CONSTRUCTION_MANIPULATION =
  "change-rule-construction" as const;
export const CHANGE_RULE_CONSTRUCTION_GENERATOR_ID =
  "pattern.change-rule.construct-items" as const;
export const CHANGE_RULE_CONSTRUCTION_GENERATOR_VERSION = "1.0.0" as const;
const TARGET_ID = "change.pattern.change-rule.construct-v1" as const;
const LEARNING_MAP_USAGE_SNAPSHOT_SHA256 =
  "bed940f1896d3991aeb12766dff49c84dd110465e38ed01625ed5f32b564b1d5";

const targetSet = findAssessmentTargetSet("[2수02-02]");
if (!targetSet?.targetIds.includes(TARGET_ID)) {
  throw new Error("change-rule-construction-assessment-target-missing");
}

export const CHANGE_RULE_CONTEXT_IDS = ["change-counts", "change-story"] as const;
export type ChangeRuleContextId = (typeof CHANGE_RULE_CONTEXT_IDS)[number];

type ChangeState = Readonly<{
  ruleStateKey: string;
  startValue: number;
  stepMagnitude: number;
  directionCode: 1 | 2;
  direction: "increase" | "decrease";
  sequenceValues: readonly [number, number, number, number];
  wrongIndex: number;
  wrongValue: number;
  repairValue: number;
}>;

const VALID_STATES: readonly ChangeState[] = [
  {
    ruleStateKey: "inc-1-by-1",
    startValue: 1,
    stepMagnitude: 1,
    directionCode: 1,
    direction: "increase",
    sequenceValues: [1, 2, 3, 4],
    wrongIndex: 2,
    wrongValue: 8,
    repairValue: 3
  },
  {
    ruleStateKey: "inc-3-by-2",
    startValue: 3,
    stepMagnitude: 2,
    directionCode: 1,
    direction: "increase",
    sequenceValues: [3, 5, 7, 9],
    wrongIndex: 2,
    wrongValue: 4,
    repairValue: 7
  },
  {
    ruleStateKey: "dec-8-by-1",
    startValue: 8,
    stepMagnitude: 1,
    directionCode: 2,
    direction: "decrease",
    sequenceValues: [8, 7, 6, 5],
    wrongIndex: 2,
    wrongValue: 2,
    repairValue: 6
  },
  {
    ruleStateKey: "dec-6-by-2",
    startValue: 6,
    stepMagnitude: 2,
    directionCode: 2,
    direction: "decrease",
    sequenceValues: [6, 4, 2, 0],
    wrongIndex: 2,
    wrongValue: 9,
    repairValue: 2
  }
] as const;

type PoolDefinition = Readonly<{
  id: string;
  targetRole: string;
  phase: "rule-selection" | "apply-declared-change" | "repair-declared-change";
  writesStatePath: string;
  writesStateIndex: number;
  stateField?: "startValue" | "stepMagnitude" | "direction";
  sourceValueProperty: "value";
  valueDecoder:
    | "integer-0-9-v1"
    | "positive-integer-1-9-v1"
    | "direction-code-v1";
  writesStateIndexPath?: string;
  mappingPath?: string;
  values: (state: ChangeState) => number;
}>;

const POOLS: readonly PoolDefinition[] = [
  {
    id: "rule-start",
    targetRole: "rule-control-start",
    phase: "rule-selection",
    writesStatePath: "studentChangeRuleState",
    writesStateIndex: 0,
    stateField: "startValue",
    sourceValueProperty: "value",
    valueDecoder: "integer-0-9-v1",
    values: (state) => state.startValue
  },
  {
    id: "rule-step",
    targetRole: "rule-control-step",
    phase: "rule-selection",
    writesStatePath: "studentChangeRuleState",
    writesStateIndex: 1,
    stateField: "stepMagnitude",
    sourceValueProperty: "value",
    valueDecoder: "positive-integer-1-9-v1",
    values: (state) => state.stepMagnitude
  },
  {
    id: "rule-direction",
    targetRole: "rule-control-direction",
    phase: "rule-selection",
    writesStatePath: "studentChangeRuleState",
    writesStateIndex: 2,
    stateField: "direction",
    sourceValueProperty: "value",
    valueDecoder: "direction-code-v1",
    values: (state) => state.directionCode
  },
  {
    id: "sequence-0",
    targetRole: "sequence-term-1",
    phase: "apply-declared-change",
    writesStatePath: "constructedSequenceState",
    writesStateIndex: 0,
    sourceValueProperty: "value",
    valueDecoder: "integer-0-9-v1",
    values: (state) => state.sequenceValues[0]
  },
  {
    id: "sequence-1",
    targetRole: "sequence-term-2",
    phase: "apply-declared-change",
    writesStatePath: "constructedSequenceState",
    writesStateIndex: 1,
    sourceValueProperty: "value",
    valueDecoder: "integer-0-9-v1",
    values: (state) => state.sequenceValues[1]
  },
  {
    id: "sequence-2",
    targetRole: "sequence-term-3",
    phase: "apply-declared-change",
    writesStatePath: "constructedSequenceState",
    writesStateIndex: 2,
    sourceValueProperty: "value",
    valueDecoder: "integer-0-9-v1",
    values: (state) => state.sequenceValues[2]
  },
  {
    id: "sequence-3",
    targetRole: "sequence-term-4",
    phase: "apply-declared-change",
    writesStatePath: "constructedSequenceState",
    writesStateIndex: 3,
    sourceValueProperty: "value",
    valueDecoder: "integer-0-9-v1",
    values: (state) => state.sequenceValues[3]
  },
  {
    id: "repair",
    targetRole: "repair-target",
    phase: "repair-declared-change",
    writesStatePath: "repairedChangeSequenceState",
    writesStateIndex: 2,
    writesStateIndexPath: "misalignedTermIndex",
    mappingPath: "validRepairedChangeStatesByRuleState",
    sourceValueProperty: "value",
    valueDecoder: "integer-0-9-v1",
    values: (state) => state.repairValue
  }
];

const sourceRoleId = (poolId: string, state: ChangeState) =>
  `change-${poolId}-${state.ruleStateKey}`;
const variantId = (value: number) => `NO04NT-${String(value + 1).padStart(2, "0")}`;

const SOURCE_POOLS = POOLS.map((pool) => ({
  id: pool.id,
  targetRole: pool.targetRole,
  toolKey: "NO04NT" as const,
  phase: pool.phase,
  writesStatePath: pool.writesStatePath,
  writesStateIndex: pool.writesStateIndex,
  ...(pool.writesStateIndexPath
    ? { writesStateIndexPath: pool.writesStateIndexPath }
    : {}),
  ...(pool.mappingPath ? { mappingPath: pool.mappingPath } : {}),
  ...(pool.stateField ? { stateField: pool.stateField } : {}),
  sourceValueProperty: pool.sourceValueProperty,
  valueDecoder: pool.valueDecoder,
  sources: VALID_STATES.map((state) => {
    const value = pool.values(state);
    return {
      roleId: sourceRoleId(pool.id, state),
      ruleStateKey: state.ruleStateKey,
      value,
      variantId: variantId(value),
      ...(pool.id === "rule-direction"
        ? { decodedValue: state.direction }
        : {})
    };
  })
}));

const SOURCE_WRITES = SOURCE_POOLS.flatMap((pool) =>
  pool.sources.map((source) => {
    const state = VALID_STATES.find(
      (candidate) => candidate.ruleStateKey === source.ruleStateKey
    )!;
    return {
      writeId: `${pool.id === "rule-start" ? "construct-change-rule-start" : pool.id === "rule-step" ? "construct-change-rule-step" : pool.id === "rule-direction" ? "construct-change-rule-direction" : pool.id === "sequence-0" ? "apply-change-term-1" : pool.id === "sequence-1" ? "apply-change-term-2" : pool.id === "sequence-2" ? "apply-change-term-3" : pool.id === "sequence-3" ? "apply-change-term-4" : "repair-change-term"}-${source.ruleStateKey}`,
      constraintId:
        pool.id === "rule-start"
          ? "construct-change-rule-start"
          : pool.id === "rule-step"
            ? "construct-change-rule-step"
            : pool.id === "rule-direction"
              ? "construct-change-rule-direction"
              : pool.id === "sequence-0"
                ? "apply-change-term-1"
                : pool.id === "sequence-1"
                  ? "apply-change-term-2"
                  : pool.id === "sequence-2"
                    ? "apply-change-term-3"
                    : pool.id === "sequence-3"
                      ? "apply-change-term-4"
                      : "repair-change-term",
      stateId: state.ruleStateKey,
      ruleStateKey: state.ruleStateKey,
      ruleStateKeyProperty: "ruleStateKey" as const,
      sourceRoleId: source.roleId,
      sourcePoolId: pool.id,
      targetRole: pool.targetRole,
      phase: pool.phase,
      writesStatePath: pool.writesStatePath,
      writesStateIndex: pool.writesStateIndex,
      ...(pool.writesStateIndexPath
        ? { writesStateIndexPath: pool.writesStateIndexPath }
        : {}),
      ...(pool.mappingPath ? { mappingPath: pool.mappingPath } : {}),
      ...(pool.stateField ? { stateField: pool.stateField } : {}),
      sourceValueProperty: pool.sourceValueProperty,
      valueDecoder: pool.valueDecoder,
      expectedSourceValue: source.value,
      expectedDecodedValue:
        pool.id === "rule-direction" ? state.direction : source.value
    };
  })
);

const SOURCE_ROLE_IDS = SOURCE_POOLS.flatMap((pool) =>
  pool.sources.map((source) => source.roleId)
);
const TARGET_ROLES = [
  "rule-control-start",
  "rule-control-step",
  "rule-control-direction",
  "sequence-term-1",
  "sequence-term-2",
  "sequence-term-3",
  "sequence-term-4",
  "repair-target"
] as const;
const STATE_FIELDS = ["startValue", "stepMagnitude", "direction"] as const;
const DIRECTION_VALUES = ["increase", "decrease"] as const;
const PERMUTATIONS = [
  ["startValue", "stepMagnitude", "direction"],
  ["startValue", "direction", "stepMagnitude"],
  ["stepMagnitude", "startValue", "direction"],
  ["stepMagnitude", "direction", "startValue"],
  ["direction", "startValue", "stepMagnitude"],
  ["direction", "stepMagnitude", "startValue"]
] as const;

const NATIVE_VALUE_MAP = Array.from({ length: 10 }, (_, value) => ({
  value,
  variantId: variantId(value)
}));

const SOURCE_MODEL = {
  toolKey: "NO04NT" as const,
  sourceUseMode: "move-once-no-clone" as const,
  selectionCorrelation: "single-ruleStateKey-across-eight-writes" as const,
  validStateCount: 4 as const,
  sourcePoolCount: 8 as const,
  sourcesPerPool: 4 as const,
  perStateRoleCount: 8 as const,
  physicalSourceRoleCount: 32 as const,
  sourcePools: SOURCE_POOLS,
  capacity: {
    requiredPhysicalSources: 32 as const,
    requiredControlWrites: 12 as const,
    requiredApplicationWrites: 16 as const,
    requiredRepairWrites: 4 as const,
    requiredDerivedOutputs: 20 as const,
    selectedPhysicalSourcesPerState: 8 as const,
    requiredTargetActionsPerState: 8 as const,
    cloneOrReuseAssumed: false as const,
    requiresPairwiseDisjointRoleIds: true as const
  }
};

const ANSWER_LEAK_CONTRACT = {
  mode: "unordered-field-set-across-emissions" as const,
  semanticKeys: ["startValue", "stepMagnitude", "direction"] as const,
  emissionScope: "locked-non-source" as const,
  scanSurfaces: ["structured-properties", "visible-text"] as const,
  excludeSourceRoleIds: true as const,
  numericMultiplicityAware: true as const,
  rejectCompleteStateAcrossEmissions: true as const,
  permutationCoverage: PERMUTATIONS
};

const NATIVE_EVIDENCE = {
  toolKey: "NO04NT" as const,
  releasedValueVariantMap: NATIVE_VALUE_MAP,
  expectedSourceRoleIds: SOURCE_ROLE_IDS,
  expectedSourceRoleCount: 32 as const,
  expectedTargetRoleIds: [...TARGET_ROLES],
  expectedTargetRoleCount: 8 as const,
  renderedBounds: {
    width: 80 as const,
    height: 80 as const,
    sourceConstant: "NUMBER_CARD_RENDERED_SIZE" as const
  },
  minimumTargetBounds: { width: 188 as const, height: 188 as const },
  containment: "native-rendered-bounds" as const,
  requiresExactResolvedSourceIdValueVariantMatch: true as const,
  requiresAllSourcesAndTargetsVisibleSimultaneously: true as const,
  requiresPairwiseDisjointSourcePools: true as const,
  requiresSourceTargetRegionDisjointness: true as const
};

const CHANGE_DECISION = {
  mode: "construct-change-rule" as const,
  constructionMode: "student-constructed" as const,
  answerMode: "conditional-rubric" as const,
  ruleStatePath: "studentChangeRuleState",
  stateFields: STATE_FIELDS,
  directionValues: DIRECTION_VALUES,
  minimumDistinctStartValues: 2,
  minimumDistinctStepMagnitudes: 2,
  initialState: "empty" as const,
  requiresStudentDeclaredState: true as const,
  validStateCatalog: VALID_STATES,
  sourceModel: SOURCE_MODEL,
  sourceWriteContract: {
    cardinality: {
      validStateCount: 4 as const,
      sourcePoolCount: 8 as const,
      writesPerState: 8 as const,
      writeCount: 32 as const,
      controlWriteCount: 12 as const,
      applicationWriteCount: 16 as const,
      repairWriteCount: 4 as const
    },
    writes: SOURCE_WRITES
  },
  answerLeakContract: ANSWER_LEAK_CONTRACT,
  nativeEvidenceContract: NATIVE_EVIDENCE,
  distractors: [
    {
      predicateKind: "cognitive.change-rule-state-contract",
      misconception: "증가와 감소 방향을 반대로 적용한다."
    },
    {
      predicateKind: "cognitive.change-rule-state-contract",
      misconception: "선언한 변화량 대신 바로 앞 수를 되풀이하거나 다른 간격을 적용한다."
    }
  ],
  application: {
    ruleStatePath: "studentChangeRuleState",
    sequenceStatePath: "constructedSequenceState",
    minimumVisibleTerms: 4,
    transition: "next-equals-current-plus-signed-step" as const,
    requiresAdjacentDifferenceEvidence: true as const,
    requiresVisibleComparison: true as const
  },
  repair: {
    ruleStatePath: "studentChangeRuleState",
    beforeStatePath: "initialChangeSequenceState",
    afterStatePath: "repairedChangeSequenceState",
    wrongIndexPath: "misalignedTermIndex",
    derivation: "replace-with-declared-transition-value" as const,
    requiresConditionalMapping: true as const,
    requiresOnlyWrongIndexChanges: true as const
  }
};

const RUNTIME_AUTHORITY = {
  mode: CHANGE_DECISION.mode,
  constructionMode: CHANGE_DECISION.constructionMode,
  answerMode: CHANGE_DECISION.answerMode,
  ruleStatePath: CHANGE_DECISION.ruleStatePath,
  stateFields: CHANGE_DECISION.stateFields,
  directionValues: CHANGE_DECISION.directionValues,
  initialState: CHANGE_DECISION.initialState,
  validStateCatalog: CHANGE_DECISION.validStateCatalog,
  sourceModel: CHANGE_DECISION.sourceModel,
  sourceWriteContract: CHANGE_DECISION.sourceWriteContract,
  answerLeakContract: CHANGE_DECISION.answerLeakContract,
  nativeEvidenceContract: CHANGE_DECISION.nativeEvidenceContract,
  distractors: CHANGE_DECISION.distractors,
  application: CHANGE_DECISION.application,
  repair: CHANGE_DECISION.repair
};

type ContextSpec = Readonly<{
  title: string;
  items: readonly [{ stateKey: string; questionText: string }, { stateKey: string; questionText: string }];
}>;

const CONTEXTS: Readonly<Record<ChangeRuleContextId, ContextSpec>> = {
  "change-counts": {
    title: "수 카드 변화 규칙",
    items: [
      {
        stateKey: "inc-1-by-1",
        questionText: "시작값·변화량·방향을 정해 수 배열을 어떻게 만들어 볼까요?"
      },
      {
        stateKey: "inc-3-by-2",
        questionText: "다른 시작값과 변화량으로 이어지는 수를 어떻게 만들어 볼까요?"
      }
    ]
  },
  "change-story": {
    title: "변화 이야기 수 배열",
    items: [
      {
        stateKey: "dec-8-by-1",
        questionText: "줄어드는 수의 시작값·변화량·방향을 어떻게 정해 볼까요?"
      },
      {
        stateKey: "dec-6-by-2",
        questionText: "두 칸씩 줄어드는 수 배열의 관계를 어떻게 만들어 볼까요?"
      }
    ]
  }
};

const instructions = [
  "① 수 카드를 골라 시작값·변화량·방향을 정하세요.",
  "② 정한 관계로 네 항을 만들고 어긋난 항만 고치세요.",
  "③ 선생님과 정한 관계와 배열의 차이를 함께 확인하세요."
] as const;

const scaffoldBase = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "학생이 시작값·변화량·방향을 수 카드로 직접 구성합니다.",
    "학생이 선언한 signed step으로 네 항을 만들고 오류 항을 고칩니다.",
    "교사가 학생 선언과 인접 항의 관계를 조건부로 확인합니다."
  ],
  questionIntent: "학생이 변화 규칙의 세 요소를 직접 정하고 배열에 적용합니다.",
  predictionLabel: "내가 정한 변화 규칙",
  poolLabel: "고를 수 있는 수 카드",
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
    if (role.role.startsWith("instruction-")) return { ...role, locked: false };
    if (role.role === "work-panel") {
      return { ...role, properties: { fill: "none", stroke: "slategray" } };
    }
    if (role.role === "prediction-box") {
      return {
        ...role,
        properties: { fill: "white", stroke: "slategray", strokeDashArray: "8 6" }
      };
    }
    if (role.role === "explanation-box") {
      return {
        ...role,
        role: "teacher-rubric",
        layoutRole: "explanation-box",
        idRole: "teacher-rubric",
        toolKey: "common.text" as const,
        intentKind: "text" as const,
        properties: { text: "교사 확인 기준", fontSize: 20 },
        bindings: {},
        instructionalIntent: "교사가 학생의 선언 상태에 따라 확인하는 조건부 루브릭입니다."
      };
    }
    return role;
  });

const emptyTarget = (role: string, intent: string) => ({
  role,
  scope: "each-item" as const,
  layoutRole: role,
  idRole: role,
  toolKey: "common.rectangle" as const,
  intentKind: "draw-rectangle" as const,
  locked: true,
  movable: false,
  instructionalIntent: intent,
  properties: { fill: "white", stroke: "slategray", strokeDashArray: "8 6" },
  bindings: {},
  containerRole: "item-panel"
});

const sourceRoles = SOURCE_POOLS.flatMap((pool) =>
  pool.sources.map((source) => ({
    role: source.roleId,
    scope: "each-item" as const,
    layoutRole: source.roleId,
    idRole: source.roleId,
    toolKey: "NO04NT" as const,
    intentKind: "number-card" as const,
    locked: false,
    movable: true,
    instructionalIntent: "학생이 변화 규칙을 구성할 때 옮길 수 있는 수 카드입니다.",
    properties: { ruleStateKey: source.ruleStateKey },
    bindings: { value: `item.sourceValues.${source.roleId}` },
    containerRole: "source-panel"
  }))
);

const targetRoles = TARGET_ROLES.map((role) =>
  emptyTarget(
    role,
    role.startsWith("rule-control")
      ? "학생이 시작값·변화량·방향을 선언하는 빈 칸입니다."
      : role === "repair-target"
        ? "학생이 선언한 관계로 어긋난 항을 고치는 빈 칸입니다."
        : "학생이 선언한 변화 관계로 다음 항을 만드는 빈 칸입니다."
  )
);

const panels = [
  "item-panel",
  "source-panel",
  "rule-state-panel",
  "sequence-panel",
  "repair-panel"
].map((role) => ({
  role,
  scope: "each-item" as const,
  layoutRole: role,
  idRole: role,
  toolKey: "common.rectangle" as const,
  intentKind: "draw-rectangle" as const,
  locked: true,
  movable: false,
  instructionalIntent: "활동 영역을 구분하는 고정 패널입니다.",
  properties: { fill: "#F8FAFC", stroke: "#CBD5E1" },
  bindings: {},
  containerRole: "item-panel"
}));

const changeBlueprint = defineActivityBlueprint(
  withStudentScreenQuality(
    {
      schemaVersion: "1.0.0",
      id: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
      version: "1.0.0",
      title: "시작값과 변화량으로 수 배열 만들기",
      learningObjective:
        "시작값·변화량·방향을 직접 선언하고 같은 signed step으로 수 배열을 만들고 고칠 수 있다.",
      curriculumBinding: {
        standardCode: "[2수02-02]",
        domain: "변화와 관계",
        officialGoal: "자신이 정한 규칙에 따라 물체, 무늬, 수 등을 배열할 수 있다."
      },
      generator: {
        id: CHANGE_RULE_CONSTRUCTION_GENERATOR_ID,
        version: CHANGE_RULE_CONSTRUCTION_GENERATOR_VERSION,
        parameters: { problemCount: 2, difficulty: "normal", contextId: "change-counts" }
      },
      toolRoles: [...scaffold, ...panels, ...sourceRoles, ...targetRoles],
      layout: {
        tokenSet: "w002-change-rule-v1",
        root: {
          id: "canvas",
          kind: "canvas",
          preset: "canvas.root",
          repeat: "once",
          children: [
            ...makeChoiceExplanationScaffoldLayoutChildren()
              .filter(
                (child) =>
                  !child.id.startsWith("position-card-") &&
                  child.id !== "choice-panel" &&
                  child.id !== "pool-label"
              ),
            layoutBlock("item-panel", "slot", "item.panel", "each-item"),
            layoutBlock("source-panel", "slot", "item.source-panel", "each-item"),
            layoutBlock("rule-state-panel", "slot", "item.rule-state-panel", "each-item"),
            layoutBlock("sequence-panel", "slot", "item.sequence-panel", "each-item"),
            layoutBlock("repair-panel", "slot", "item.repair-panel", "each-item"),
            ...TARGET_ROLES.map((role) =>
              layoutBlock(role, "slot", `item.${role}`, "each-item")
            ),
            ...SOURCE_ROLE_IDS.map((role) =>
              layoutBlock(role, "slot", `item.${role}`, "each-item")
            )
          ]
        }
      },
      constraints: SOURCE_POOLS.map((pool) => ({
        id:
          pool.id === "rule-start"
            ? "construct-change-rule-start"
            : pool.id === "rule-step"
              ? "construct-change-rule-step"
              : pool.id === "rule-direction"
                ? "construct-change-rule-direction"
                : pool.id === "sequence-0"
                  ? "apply-change-term-1"
                  : pool.id === "sequence-1"
                    ? "apply-change-term-2"
                    : pool.id === "sequence-2"
                      ? "apply-change-term-3"
                      : pool.id === "sequence-3"
                        ? "apply-change-term-4"
                        : "repair-change-term",
        kind: "fill-from-pool" as const,
        sources: pool.sources.map((source) => ({
          scope: "each-item" as const,
          role: source.roleId
        })),
        target: { scope: "each-item" as const, role: pool.targetRole },
        parameters: {
          phase: pool.phase,
          writesStatePath: pool.writesStatePath,
          writesStateIndex: pool.writesStateIndex,
          ruleStateKeyProperty: "ruleStateKey",
          selectionCorrelation: "single-ruleStateKey-across-eight-writes",
          sourceValueProperty: pool.sourceValueProperty,
          valueDecoder: pool.valueDecoder,
          ...(pool.stateField ? { stateField: pool.stateField } : {}),
          ...(pool.writesStateIndexPath
            ? { writesStateIndexPath: pool.writesStateIndexPath }
            : {}),
          ...(pool.mappingPath ? { mappingPath: pool.mappingPath } : {})
        },
        requiresStudentAction: true
      })),
      valuePredicates: [
        { kind: "cognitive.change-rule-state-contract", parameters: RUNTIME_AUTHORITY },
        {
          kind: "language.classroom-korean",
          parameters: {
            instructionRoles: ["instruction-predict", "instruction-verify", "instruction-explain"],
            labelRoles: ["prediction-label", "explanation-label", "teacher-rubric"],
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
              "prediction-label",
              "explanation-label",
              "teacher-rubric"
            ],
            maximumFillRatio: 0.96
          }
        },
        {
          kind: "visual.no-overlap",
          parameters: {
            roles: [
              "number",
              "question",
              "prediction-label",
              "prediction-box",
              "explanation-label",
              "teacher-rubric",
              ...TARGET_ROLES,
              ...SOURCE_ROLE_IDS
            ]
          }
        }
      ],
      instructions: [...instructions],
      payload: {
        categoryId: MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId,
        tags: ["시작값", "변화량", "수 배열", "관계 고치기"],
        studyLevel: "elementary",
        isShowMenuOnActivity: true
      },
      variationDefaults: {
        problemCount: 2,
        difficulty: "normal",
        contextId: "change-counts"
      }
    },
    {
      questionFontSize: 23,
      compactGlyphRoles: [...SOURCE_ROLE_IDS],
      compactGlyphMinimumFontSize: 16
    }
  )
);

function signedStep(state: ChangeState) {
  return state.direction === "increase" ? state.stepMagnitude : -state.stepMagnitude;
}

function validMapping(state: ChangeState) {
  const before = [...state.sequenceValues];
  before[state.wrongIndex] = state.wrongValue;
  return {
    ruleState: {
      startValue: state.startValue,
      stepMagnitude: state.stepMagnitude,
      direction: state.direction
    },
    beforeState: before,
    afterState: [...state.sequenceValues],
    wrongIndex: state.wrongIndex
  };
}

function sourceValuesForState(state: ChangeState) {
  return Object.fromEntries(
    SOURCE_POOLS.flatMap((pool) =>
      pool.sources.map((source) => [source.roleId, source.value])
    )
  );
}

export function generateChangeRuleConstructionItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly contextId: ChangeRuleContextId;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2 ||
    !CHANGE_RULE_CONTEXT_IDS.includes(parameters.contextId)
  ) {
    throw new RangeError(
      "변화 규칙 활동은 기본 난이도·2문항·등록된 변화 맥락을 지원합니다."
    );
  }
  const context = CONTEXTS[parameters.contextId];
  return context.items.map((spec, index) => {
    const state = VALID_STATES.find((candidate) => candidate.ruleStateKey === spec.stateKey)!;
    const sourceValues = sourceValuesForState(state);
    const mappings = VALID_STATES.map(validMapping);
    return {
      id: `${CHANGE_RULE_CONSTRUCTION_FAMILY_ID}-${parameters.contextId}-${index + 1}`,
      order: index + 1,
      kind: "change-rule",
      values: {
        contextId: parameters.contextId,
        contextTitle: context.title,
        orderLabel: `${index + 1}번`,
        questionText: spec.questionText,
        studentChangeRuleState: [],
        constructedSequenceState: [],
        initialChangeSequenceState: [],
        repairedChangeSequenceState: [],
        misalignedTermIndex: 2,
        validChangeRuleStates: VALID_STATES.map((entry) => ({ ...entry })),
        validRepairValueByRuleStateKey: Object.fromEntries(
          VALID_STATES.map((entry) => [entry.ruleStateKey, entry.repairValue])
        ),
        validRepairedChangeStatesByRuleState: mappings,
        sourceValues,
        selectedContextStateKey: state.ruleStateKey,
        correctAnswerText:
          "학생이 정한 시작값·변화량·방향이 네 항의 signed step과 어긋난 항의 교정에 모두 이어지는지 확인하는 조건부 기준",
        answerExplanation:
          "학생이 직접 고른 세 요소를 규칙으로 선언하고, 네 항의 인접 차와 고친 항이 그 규칙에 맞는지 교사가 함께 확인합니다.",
        misconceptionIds: [
          "change.pattern.step-or-direction-mismatch-v1",
          "change.pattern.copy-last-number-v1"
        ],
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: CHANGE_RULE_CONSTRUCTION_GENERATOR_ID,
        generatorVersion: CHANGE_RULE_CONSTRUCTION_GENERATOR_VERSION,
        seed
      }
    };
  });
}

function generateItemsForVariation(
  variation: Readonly<Record<string, unknown>>,
  seed: string
) {
  if (
    variation.problemCount !== 2 ||
    variation.difficulty !== "normal" ||
    typeof variation.contextId !== "string" ||
    !CHANGE_RULE_CONTEXT_IDS.includes(variation.contextId as ChangeRuleContextId)
  ) {
    throw new Error(`problem-family-native-variation-invalid:${CHANGE_RULE_CONSTRUCTION_FAMILY_ID}`);
  }
  return generateChangeRuleConstructionItems(
    {
      difficulty: "normal",
      problemCount: 2,
      contextId: variation.contextId as ChangeRuleContextId
    },
    seed
  );
}

const defaultParameters = problemParametersSchema.parse({
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
  values: { contextId: "change-counts" }
});

function parseParameters(input: ProblemParameters): ProblemParameters {
  const parsed = problemParametersSchema.parse(input);
  if (
    parsed.familyId !== CHANGE_RULE_CONSTRUCTION_FAMILY_ID ||
    Object.keys(parsed.values).join(":") !== "contextId" ||
    typeof parsed.values.contextId !== "string" ||
    !CHANGE_RULE_CONTEXT_IDS.includes(parsed.values.contextId as ChangeRuleContextId)
  ) {
    throw new Error("change-rule-construction-parameters-unsupported");
  }
  return parsed;
}

export const changeRuleConstructionCapability: ProblemFamilyCapabilityExtension = {
  familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
  recommendedGrade: 2,
  gradeRange: [1, 2],
  defaultProblemCount: 2,
  parameterFields: [
    {
      key: "contextId",
      inputLabel: "변화 맥락",
      control: "select",
      section: "수학 조건",
      options: CHANGE_RULE_CONTEXT_IDS.map((value) => ({
        value,
        label: CONTEXTS[value].title
      }))
    }
  ],
  defaultParameters,
  promptGuards: [
    {
      pattern: "(반복 단위|repeat-2|repeat-3|패턴 블록)",
      message: "이 family는 수의 시작값·변화량·방향을 구성하는 envelope이며 물체·무늬 repeat는 별도 family입니다."
    },
    {
      pattern: "(자동.?채점|응답.?저장|재열기.*응답)",
      message: "현재 envelope는 실제 응답 저장·재열기·자동 채점을 증명하지 않았습니다."
    },
    {
      pattern: "(특정.*정답|정답.*고정|한 가지.*정답)",
      message: "학생이 선택한 변화 규칙을 조건부 루브릭으로 확인하며 특정 정답 조합을 고정하지 않습니다."
    }
  ],
  unsupportedParameterPolicy: "clarification-required",
  title: "시작값과 변화량으로 수 배열 만들기",
  scopeNote:
    "네 개의 bounded signed-step 상태와 32개 NO04NT 수 카드·8개 빈 action target을 갖는 offline envelope입니다. 학생 선택·실제 저장·재열기·live evidence는 아직 주장하지 않습니다.",
  parseParameters
};

function requireRecommendation(recommendation: Recommendation) {
  if (
    recommendation.templateId !== CHANGE_RULE_CONSTRUCTION_FAMILY_ID ||
    recommendation.standardCode !== "[2수02-02]" ||
    recommendation.manipulation !== CHANGE_RULE_CONSTRUCTION_MANIPULATION ||
    recommendation.problemCount !== 2 ||
    recommendation.difficulty !== "normal"
  ) {
    throw new Error(`activity-recommendation-mismatch:${CHANGE_RULE_CONSTRUCTION_FAMILY_ID}`);
  }
  return parseParameters(
    recommendation.problemParameters ?? defaultParameters
  );
}

function prepare(
  recommendation: Recommendation,
  options: GenerateActivitySpecOptions
) {
  const parameters = requireRecommendation(recommendation);
  if (Number.isNaN(Date.parse(options.generatedAt))) {
    throw new Error("generatedAt-invalid");
  }
  const contextId = parameters.values.contextId as ChangeRuleContextId;
  return {
    blueprint: changeBlueprint,
    items: generateChangeRuleConstructionItems(
      { difficulty: "normal", problemCount: 2, contextId },
      options.seed
    ),
    recommendation,
    options: {
      seed: options.seed,
      generatedAt: new Date(options.generatedAt).toISOString(),
      activityId: options.activityId ?? `${CHANGE_RULE_CONSTRUCTION_FAMILY_ID}-${options.seed}`,
      templateVersion: changeBlueprint.version,
      variation: { problemCount: 2, difficulty: "normal", contextId }
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

function problemPreviews(resolved: ResolvedActivity): RegisteredProblemPreview[] {
  return [...resolved.items]
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      problemNumber: item.order,
      statements: [
        String(item.values.questionText),
        "초기 상태: 학생 규칙, 만든 수 배열, 수정 전·후 배열은 모두 비어 있습니다.",
        "수 카드 바구니: 8개 pool×네 장의 NO04NT 카드, 총 32개.",
        "교사용 허용 상태: 네 signed-step 상태와 각 상태의 조건부 수정값.",
        "학생 조작 8개: 세 규칙 필드, 네 배열 항, 오류 항 교정.",
        "교사 확인 기준: 학생이 선언한 signed step과 인접 차, 수정 전후가 일치해야 합니다.",
        "이 미리보기는 compile-time envelope이며 실제 학생 선택·조작 순서·응답·저장·재열기를 증명하지 않습니다."
      ]
    }));
}

function appliedProblemParameters(resolved: ResolvedActivity): ProblemParameters | undefined {
  const contextId = resolved.items[0]?.values.contextId;
  return typeof contextId === "string"
    ? parseParameters({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
        values: { contextId }
      })
    : undefined;
}

const source: ProblemFamilyRegistrySource = {
  registrationKind: "native-problem-family-module",
  familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
  templateId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
  activityId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
  standardCode: "[2수02-02]",
  supportedStandardCodes: ["[2수02-02]"],
  gradeBand: "1-2",
  domain: "변화와 관계",
  learningGoal: changeBlueprint.learningObjective,
  assessmentTargetIds: [TARGET_ID],
  solReviewScope: {
    familyTrackId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
    scopeId: "W002-FAMILY_TRACK-change-rule"
  },
  manipulation: CHANGE_RULE_CONSTRUCTION_MANIPULATION,
  generator: {
    id: CHANGE_RULE_CONSTRUCTION_GENERATOR_ID,
    version: CHANGE_RULE_CONSTRUCTION_GENERATOR_VERSION
  },
  blueprint: {
    contentHash: changeBlueprint.contentHash,
    version: changeBlueprint.version,
    layoutTokenSet: changeBlueprint.layout.tokenSet
  },
  availableProblemCounts: [2],
  supportedDifficulties: ["normal"],
  supportState: "verified",
  evidencePaths: [
    "packages/templates/src/problem-families/domains/change-relationships/change-rule-construction.test.ts"
  ]
};

const cognitiveManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: changeBlueprint.id,
  blueprintVersion: changeBlueprint.version,
  blueprintContentHash: changeBlueprint.contentHash,
  mathematicalDecision:
    "학생은 시작값·변화량·증가·감소 방향을 직접 선언하고 같은 signed step으로 네 항을 만든다.",
  misconceptionConflict:
    "직전 수를 복사하거나 방향을 반대로 적용하는 생각을 인접 차와 조건부 오류 교정에 충돌시킨다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    usageSnapshotSha256: LEARNING_MAP_USAGE_SNAPSHOT_SHA256,
    standardCode: "[2수02-02]",
    topicIds: ["kr.mt.math.change-relationships.g1-2.s2-02-02.application"],
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
      "이 family는 [2수02-02]의 수 변화 관계 envelope만 다루며 실제 응답 저장·재열기와 live evidence는 별도 검토 대상이다."
  },
  decision: CHANGE_DECISION as never,
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "countable-unit-model",
    roles: [...TARGET_ROLES],
    invariant:
      "학생이 선언한 signed step이 네 항의 모든 인접 차와 조건부 오류 교정에 이어진다."
  },
  explanation: { regionRole: "teacher-rubric" },
  revisionPath:
    "수 카드는 계속 옮길 수 있고, 학생은 선언한 관계와 다르면 선택·배열·오류 교정을 다시 확인할 수 있다.",
  limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
});

export const changeRuleConstructionProblemFamilyModule: ProblemFamilyNativeModule = {
  source,
  capability: changeRuleConstructionCapability,
  runtime: {
    familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
    blueprint: changeBlueprint,
    prepare,
    supportState: "verified",
    generateItemsForVariation,
    answerKey,
    problemPreviews,
    appliedProblemParameters
  },
  cognitiveManifest,
  variationEnvelope: defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
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
        values: [...CHANGE_RULE_CONTEXT_IDS],
        default: "change-counts"
      }
    ],
    pinned: { difficulty: "normal" },
    expectedCombinationCount: CHANGE_RULE_CONTEXT_IDS.length
  })
};

export { changeBlueprint as changeRuleConstructionBlueprint };
