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
  CHOICE_CARD_ROLES,
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

export const REPEAT_RULE_CONSTRUCTION_FAMILY_ID =
  "pattern.repeat-unit.construct-v1" as const;
export const REPEAT_RULE_CONSTRUCTION_MANIPULATION =
  "pattern-repeat-rule-construction" as const;
export const REPEAT_RULE_CONSTRUCTION_GENERATOR_ID =
  "pattern.repeat-unit.construct-items" as const;
export const REPEAT_RULE_CONSTRUCTION_GENERATOR_VERSION = "1.0.0" as const;
const LEARNING_MAP_USAGE_SNAPSHOT_SHA256 =
  "bed940f1896d3991aeb12766dff49c84dd110465e38ed01625ed5f32b564b1d5";
const TARGET_ID = "change.pattern.repeat-rule.construct-v1" as const;

const assessmentTargetSet = findAssessmentTargetSet("[2수02-02]");
if (!assessmentTargetSet?.targetIds.includes(TARGET_ID)) {
  throw new Error("repeat-rule-construction-assessment-target-missing");
}

export const REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS = [
  "repeat-colors",
  "repeat-shapes"
] as const;
export type RepeatRuleConstructionContextId =
  (typeof REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS)[number];

type RuleItemSpec = Readonly<{
  ruleState: readonly [number, number];
  validRuleStates: readonly (readonly [number, number])[];
  surplusRuleStates: readonly (readonly [number, number])[];
  variants: readonly [number, number, number, number, number];
  questionText: string;
  continuationText: string;
  answerExplanation: string;
}>;

type RuleContext = Readonly<{
  title: string;
  unitLabel: string;
  items: readonly [RuleItemSpec, RuleItemSpec];
}>;

const CONTEXTS: Readonly<
  Record<RepeatRuleConstructionContextId, RuleContext>
> = {
  "repeat-colors": {
    title: "초록·주황 패턴 블록",
    unitLabel: "색깔 두 조각",
    items: [
      {
        ruleState: [4, 5],
        validRuleStates: [
          [4, 5],
          [5, 4]
        ],
        surplusRuleStates: [[4, 4]],
        variants: [4, 5, 4, 6, 6],
        questionText:
          "빈 규칙 칸 두 곳에 패턴 블록을 직접 골라 놓고, 어떻게 반복되는지 말해 보세요.",
        continuationText: "같은 순서로 계속",
        answerExplanation:
          "초록과 주황을 한 단위로 정하고 두 조각의 순서를 고정하면, 어느 위치에서 시작해도 같은 두 조각이 반복됩니다."
      },
      {
        ruleState: [4, 6],
        validRuleStates: [
          [4, 6],
          [6, 4]
        ],
        surplusRuleStates: [[4, 4]],
        variants: [4, 6, 4, 5, 5],
        questionText:
          "빈 규칙 칸 두 곳에 패턴 블록을 직접 골라 놓고, 어떻게 반복되는지 말해 보세요.",
        continuationText: "같은 순서로 계속",
        answerExplanation:
          "초록과 보라를 한 단위로 정하고 두 조각의 순서를 고정하면, 두 조각이 번갈아 반복됩니다."
      }
    ]
  },
  "repeat-shapes": {
    title: "파랑·빨강 패턴 블록",
    unitLabel: "모양 두 조각",
    items: [
      {
        ruleState: [2, 3],
        validRuleStates: [
          [2, 3],
          [3, 2]
        ],
        surplusRuleStates: [[2, 2]],
        variants: [2, 3, 2, 1, 1],
        questionText:
          "빈 규칙 칸 두 곳에 패턴 블록을 직접 골라 놓고, 어떻게 반복되는지 말해 보세요.",
        continuationText: "같은 순서로 계속",
        answerExplanation:
          "파랑과 빨강을 한 단위로 정하고 두 조각의 순서를 고정하면, 같은 순서가 계속 반복됩니다."
      },
      {
        ruleState: [2, 1],
        validRuleStates: [
          [2, 1],
          [1, 2]
        ],
        surplusRuleStates: [[2, 2]],
        variants: [2, 1, 2, 3, 3],
        questionText:
          "빈 규칙 칸 두 곳에 패턴 블록을 직접 골라 놓고, 어떻게 반복되는지 말해 보세요.",
        continuationText: "같은 순서로 계속",
        answerExplanation:
          "파랑과 노랑을 한 단위로 정하고 두 조각의 순서를 고정하면, 두 조각이 번갈아 반복됩니다."
      }
    ]
  }
};

const instructions = [
  "① 바구니에서 패턴 블록을 골라 빈 규칙 칸 두 곳에 직접 놓으세요.",
  "② 두 조각의 순서를 내가 정한 규칙으로 선언하고, 다음에도 같은지 확인하세요.",
  "③ 정한 두 조각과 순서가 왜 규칙인지 글로 써 보세요."
] as const;

const scaffoldBase = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "학생이 보기 카드를 고르는 대신 패턴 블록을 직접 선택해 규칙을 구성하게 합니다.",
    "학생이 두 조각의 순서를 선언하고 그 순서를 다음 배열에 적용할지 확인하게 합니다.",
    "학생이 구성한 두 조각과 순서를 근거로 반복 규칙을 설명하게 합니다."
  ],
  questionIntent:
    "학생이 패턴 블록 두 조각과 순서를 직접 정해 반복 규칙을 구성하게 합니다.",
  predictionLabel: "내가 정한 규칙",
  poolLabel: "고를 수 있는 패턴 블록",
  explanationLabel: "내 규칙·확인한 까닭",
  centerCandidates: false,
  fontSizes: { question: 23, label: 21 }
});

// The generic scaffold contains a five-card choice panel. A construct-rule
// family must not present a pre-authored correct card, so only its instruction,
// question, prediction, and explanation regions are retained here.
const scaffold = scaffoldBase
  .filter(
    (role) =>
      !role.role.startsWith("position-card-") &&
      role.role !== "choice-panel" &&
      role.role !== "pool-label"
  )
  .map((role) => {
    if (role.role === "explanation-box") {
      return {
        ...role,
        toolKey: "common.text" as const,
        intentKind: "text" as const,
        properties: { text: "", fontSize: 22 },
        bindings: {},
        instructionalIntent:
          "학생이 직접 구성한 두 조각의 순서와 반복되는 까닭을 쓰는 영역입니다."
      };
    }
    return role;
  });

const ruleSlotRoles = ["rule-slot-1", "rule-slot-2"] as const;
const variantRoles = [
  "rule-variant-1",
  "rule-variant-2",
  "rule-variant-3",
  "rule-variant-4",
  "rule-variant-5"
] as const;
const variantLayoutRoles = [
  "completion-block-1",
  "completion-block-2",
  "completion-block-3",
  "completion-block-4",
  "completion-block-5"
] as const;

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
      "학생이 정한 두 조각의 순서를 확인하는 작업 영역입니다.",
    properties: { fill: "#F8FAFC", stroke: "#8291A7" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "continuation-lane",
    scope: "each-item" as const,
    layoutRole: "pattern-label",
    idRole: "continuation-lane",
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "학생이 선언한 규칙을 다음 배열에도 같은 순서로 적용할지 확인하게 합니다.",
    properties: { text: "", fontSize: 16 },
    bindings: { text: "item.continuationText" },
    containerRole: "pattern-track"
  },
  ...ruleSlotRoles.map((role) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role === "rule-slot-1" ? "next-slot-1" : "next-slot-2",
    idRole: role,
    toolKey: "common.rectangle" as const,
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "학생이 직접 고른 패턴 블록을 순서대로 놓는 빈 규칙 칸입니다.",
    properties: { fill: "#FFFFFF", stroke: "#7B8DA5", strokeDashArray: "8 6" },
    bindings: {},
    containerRole: "pattern-track"
  })),
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
      "학생이 직접 정할 두 조각을 고르는 패턴 블록 바구니입니다.",
    properties: { fill: "#F5FBFF", stroke: "#4AA9D8" },
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
    instructionalIntent: "규칙을 구성할 때 사용할 수 있는 블록을 안내합니다.",
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
      "규칙에 사용할지 판단해 빈 규칙 칸으로 옮길 수 있는 패턴 블록입니다.",
    properties: {},
    bindings: {
      variant: `item.ruleVariant${index + 1}`,
      orderedValues: `item.ruleVariant${index + 1}`
    },
    containerRole: "piece-bank"
  }))
];

const scaffoldLayoutChildren = makeChoiceExplanationScaffoldLayoutChildren().filter(
  (child) =>
    !child.id.startsWith("position-card-") &&
    child.id !== "choice-panel" &&
    child.id !== "pool-label"
);

export const repeatRuleConstructionVariationEnvelope = defineVariationEnvelope({
  schemaVersion: "1.0.0",
  blueprintId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
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
      values: [...REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS],
      default: "repeat-colors"
    }
  ],
  pinned: { difficulty: "normal" },
  expectedCombinationCount: REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS.length
});

export const repeatRuleConstructionBlueprint = defineActivityBlueprint(
  withStudentScreenQuality(
    {
      schemaVersion: "1.0.0",
      id: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
      version: "1.0.0",
      title: "패턴 블록으로 반복 규칙 직접 정하기",
      learningObjective:
        "패턴 블록의 성분과 순서를 직접 정해 반복 규칙으로 선언하고, 같은 규칙을 다음 배열에도 적용할 수 있다.",
      curriculumBinding: {
        standardCode: "[2수02-02]",
        domain: "변화와 관계",
        officialGoal: "자신이 정한 규칙에 따라 물체, 무늬, 수 등을 배열할 수 있다."
      },
      generator: {
        id: REPEAT_RULE_CONSTRUCTION_GENERATOR_ID,
        version: REPEAT_RULE_CONSTRUCTION_GENERATOR_VERSION,
        parameters: { problemCount: 2, difficulty: "normal", contextId: "repeat-colors" }
      },
      toolRoles: [...scaffold, ...patternRoles],
      layout: {
        tokenSet: "wave16-repeating-pattern-v1",
        root: {
          id: "canvas",
          kind: "canvas",
          preset: "canvas.root",
          repeat: "once",
          children: [
            ...scaffoldLayoutChildren,
            layoutBlock("choice-panel", "band", "item.choice-panel", "each-item", undefined, "pool-flow"),
            layoutBlock("pattern-track", "slot", "item.pattern-track", "each-item"),
            layoutBlock("pattern-label", "slot", "item.pattern-label", "each-item"),
            layoutBlock("next-slot-1", "slot", "item.next-slot-1", "each-item"),
            layoutBlock("next-slot-2", "slot", "item.next-slot-2", "each-item"),
            layoutBlock("piece-bank", "slot", "item.piece-bank", "each-item", undefined, "pool-flow"),
            layoutBlock("piece-bank-label", "slot", "item.piece-bank-label", "each-item"),
            ...variantRoles.map((role, index) =>
              layoutBlock(variantLayoutRoles[index]!, "slot", `item.${variantLayoutRoles[index]}`, "each-item")
            )
          ]
        }
      },
      constraints: ruleSlotRoles.map((role, index) => ({
        id: `construct-rule-slot-${index + 1}`,
        kind: "fill-from-pool" as const,
        sources: variantRoles.map((sourceRole) => ({
          scope: "each-item" as const,
          role: sourceRole
        })),
        target: { scope: "each-item" as const, role },
        parameters: {},
        requiresStudentAction: true
      })),
      valuePredicates: [
        {
          kind: "cognitive.rule-state-contract",
          parameters: {
            mode: "construct-rule",
            ruleStatePath: "ruleState",
            decisionConstraintId: "construct-rule-slot",
            validRuleStatesPath: "validRuleStates",
            surplusPath: "surplusRuleStates",
            variantRoles: [...variantRoles],
            ruleSlotRoles: [...ruleSlotRoles],
            variantProperty: "orderedValues",
            continuationRuleStatePath: "ruleState",
            explanationRuleStatePath: "ruleState",
            predictionRole: "prediction-box",
            explanationRole: "explanation-box",
            verificationRoles: ["rule-slot-1", "rule-slot-2", "continuation-lane"],
            minimumValidStates: 2,
            minimumSurplus: 1,
            distractors: [
              {
                predicateKind: "cognitive.rule-state-contract",
                misconception:
                  "두 조각의 순서를 중간에 바꾸거나 같은 조각만 반복해도 정한 규칙이라고 생각한다."
              },
              {
                predicateKind: "cognitive.rule-state-contract",
                misconception:
                  "패턴 블록을 두 개 정하지 않고 보기 좋은 모양만 임의로 놓아도 된다고 생각한다."
              }
            ]
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
              "pool-label",
              "prediction-label",
              "explanation-label"
            ],
            promptRoles: ["question"],
            maximumInstructionLength: 80,
            maximumLabelLength: 26
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
              "continuation-lane",
              "pool-label",
              "prediction-label",
              "explanation-label"
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
            groupCenterTolerance: 40,
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
              "prediction-label",
              "prediction-box",
              "continuation-lane",
              "rule-slot-1",
              "rule-slot-2",
              "pool-label",
              ...variantRoles,
              "explanation-label",
              "explanation-box"
            ]
          }
        }
      ],
      instructions: [...instructions],
      payload: {
        categoryId: MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId,
        tags: ["규칙 정하기", "반복 배열", "패턴 블록", "순서 선언"],
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
      compactGlyphRoles: ["continuation-lane", ...variantRoles],
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
    throw new Error("repeat-rule-construction-variant-invalid");
  }
  return PATTERN_BLOCK_LABELS[value]!;
}

function stateText(state: readonly number[]): string {
  return state.map(patternBlockLabel).join(" → ");
}

export function generateRepeatRuleConstructionItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly contextId: RepeatRuleConstructionContextId;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2 ||
    !REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS.includes(parameters.contextId)
  ) {
    throw new RangeError(
      "반복 규칙 직접 정하기 활동은 기본 난이도·2문항·등록된 패턴 맥락을 지원합니다."
    );
  }
  const context = CONTEXTS[parameters.contextId];
  const random = createSeededRandom(
    `${seed}:repeat-rule-construction:${parameters.contextId}`
  );
  return context.items.map((spec, index) => {
    const variants = shuffle(spec.variants, random);
    const answerRule = stateText(spec.ruleState);
    return {
      id: `${REPEAT_RULE_CONSTRUCTION_FAMILY_ID}-${parameters.contextId}-${index + 1}`,
      order: index + 1,
      kind: "repeat-rule-construction",
      values: {
        contextId: parameters.contextId,
        contextTitle: context.title,
        unitLabel: context.unitLabel,
        orderLabel: `${index + 1}번`,
        questionText: spec.questionText,
        continuationText: spec.continuationText,
        poolLabel: "패턴 블록",
        ruleState: [...spec.ruleState],
        validRuleStates: spec.validRuleStates.map((state) => [...state]),
        surplusRuleStates: spec.surplusRuleStates.map((state) => [...state]),
        correctAnswerText: `${answerRule} (두 조각의 순서를 정해 반복)`,
        answerExplanation: spec.answerExplanation,
        verificationText:
          "두 규칙 칸의 블록과 순서를 바꾸어도 다음 배열에서 같은 순서가 반복되는지 확인하세요.",
        misconceptionIds: [
          "repeat.pattern.rule-changes-mid-sequence-v1",
          "repeat.pattern.arrangement-no-rule-v1"
        ],
        ...Object.fromEntries(
          variants.map((value, variantIndex) => [
            `ruleVariant${variantIndex + 1}`,
            value
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: REPEAT_RULE_CONSTRUCTION_GENERATOR_ID,
        generatorVersion: REPEAT_RULE_CONSTRUCTION_GENERATOR_VERSION,
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
    !REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS.includes(
      variation.contextId as RepeatRuleConstructionContextId
    )
  ) {
    throw new Error(
      `problem-family-native-variation-invalid:${REPEAT_RULE_CONSTRUCTION_FAMILY_ID}`
    );
  }
  return generateRepeatRuleConstructionItems(
    {
      difficulty: "normal",
      problemCount: 2,
      contextId: variation.contextId as RepeatRuleConstructionContextId
    },
    seed
  );
}

const defaultProblemParameters = problemParametersSchema.parse({
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
  values: { contextId: "repeat-colors" }
});

function parseProblemParameters(input: ProblemParameters): ProblemParameters {
  const parsed = problemParametersSchema.parse(input);
  const contextId = parsed.values.contextId;
  if (
    parsed.familyId !== REPEAT_RULE_CONSTRUCTION_FAMILY_ID ||
    Object.keys(parsed.values).join(":") !== "contextId" ||
    typeof contextId !== "string" ||
    !REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS.includes(
      contextId as RepeatRuleConstructionContextId
    )
  ) {
    throw new Error("repeat-rule-construction-parameters-unsupported");
  }
  return problemParametersSchema.parse({
    ...parsed,
    values: { contextId }
  });
}

export const repeatRuleConstructionCapability: ProblemFamilyCapabilityExtension = {
  familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
  recommendedGrade: 2,
  gradeRange: [1, 2],
  defaultProblemCount: 2,
  parameterFields: [
    {
      key: "contextId",
      inputLabel: "패턴 블록 맥락",
      control: "select",
      section: "수학 조건",
      options: REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS.map((value) => ({
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
        "현재 envelope는 두 조각 repeat 규칙 구성만 지원합니다. repeat-3은 별도 family가 필요합니다."
    },
    {
      pattern: "(수 배열|변화량|시작값|증가|감소|등차)",
      message:
        "수의 시작값·변화량·방향은 change-rule family의 범위이며 이 family는 패턴 블록 repeat만 지원합니다."
    },
    {
      pattern: "(어긋난|고쳐|수정|repair)",
      message:
        "어긋난 항목의 실제 교체는 declared-repeat repair family의 범위이며 이 family는 규칙 구성만 지원합니다."
    }
  ],
  unsupportedParameterPolicy: "clarification-required",
  title: "패턴 블록으로 반복 규칙 직접 정하기",
  scopeNote:
    "등록된 패턴 블록 5개 중 두 조각과 순서를 학생이 직접 구성·선언하는 repeat-2 규칙 envelope입니다. repeat-3, 수 변화, 어긋난 항목 교체, save/reopen 응답 의미화는 이 family가 주장하지 않습니다.",
  parseParameters: parseProblemParameters
};

function requirePreparedRecommendation(
  recommendation: Recommendation
): { problemCount: number; difficulty: "normal"; parameters: ProblemParameters } {
  if (
    recommendation.templateId !== REPEAT_RULE_CONSTRUCTION_FAMILY_ID ||
    recommendation.standardCode !== "[2수02-02]" ||
    recommendation.manipulation !== REPEAT_RULE_CONSTRUCTION_MANIPULATION ||
    recommendation.problemCount !== 2 ||
    recommendation.difficulty !== "normal"
  ) {
    throw new Error(
      `activity-recommendation-mismatch:${REPEAT_RULE_CONSTRUCTION_FAMILY_ID}`
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
  const contextId = prepared.parameters.values.contextId as RepeatRuleConstructionContextId;
  return {
    blueprint: repeatRuleConstructionBlueprint,
    items: generateRepeatRuleConstructionItems(
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
        options.activityId ?? `${REPEAT_RULE_CONSTRUCTION_FAMILY_ID}-${options.seed}`,
      templateVersion: repeatRuleConstructionBlueprint.version,
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

function problemPreviews(
  resolved: ResolvedActivity
): RegisteredProblemPreview[] {
  return [...resolved.items]
    .sort((left, right) => left.order - right.order)
    .map((item) => {
      const valid = item.values.validRuleStates as readonly (readonly number[])[];
      const surplus = item.values.surplusRuleStates as readonly (readonly number[])[];
      const variants = variantRoles.map((_, index) =>
        patternBlockLabel(item.values[`ruleVariant${index + 1}`])
      );
      return {
        problemNumber: item.order,
        statements: [
          String(item.values.questionText),
          "초기 상태: 두 규칙 칸은 비어 있고 학생이 패턴 블록을 직접 고릅니다.",
          `패턴 블록 바구니: ${variants.join(", ")}`,
          `교사용 허용 규칙 상태: ${valid
            .map((state) => stateText(state))
            .join(" / ")}`,
          `교사용 거부 상태: ${surplus
            .map((state) => stateText(state))
            .join(" / ")}`,
          `규칙 칸: ${ruleSlotRoles.join(", ")}`,
          String(item.values.continuationText),
          "이 미리보기는 compile-time envelope만 보여 주며 학생의 실제 응답·저장·재열기를 증명하지 않습니다."
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
    familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
    values: { contextId }
  });
}

const source: ProblemFamilyRegistrySource = {
  registrationKind: "native-problem-family-module",
  familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
  templateId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
  activityId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
  standardCode: "[2수02-02]",
  supportedStandardCodes: ["[2수02-02]"],
  gradeBand: "1-2",
  domain: "변화와 관계",
  learningGoal: repeatRuleConstructionBlueprint.learningObjective,
  assessmentTargetIds: [TARGET_ID],
  solReviewScope: {
    familyTrackId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
    scopeId: "W002-FAMILY_TRACK-repeat-rule"
  },
  manipulation: REPEAT_RULE_CONSTRUCTION_MANIPULATION,
  generator: {
    id: REPEAT_RULE_CONSTRUCTION_GENERATOR_ID,
    version: REPEAT_RULE_CONSTRUCTION_GENERATOR_VERSION
  },
  blueprint: {
    contentHash: repeatRuleConstructionBlueprint.contentHash,
    version: repeatRuleConstructionBlueprint.version,
    layoutTokenSet: repeatRuleConstructionBlueprint.layout.tokenSet
  },
  availableProblemCounts: [2],
  supportedDifficulties: ["normal"],
  supportState: "verified",
  evidencePaths: [
    "packages/templates/src/problem-families/domains/change-relationships/repeat-rule-construction.test.ts"
  ]
};

const cognitiveManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: repeatRuleConstructionBlueprint.id,
  blueprintVersion: repeatRuleConstructionBlueprint.version,
  blueprintContentHash: repeatRuleConstructionBlueprint.contentHash,
  mathematicalDecision:
    "학생은 패턴 블록 바구니에서 두 조각과 순서를 직접 구성해 반복 단위로 선언하고, 그 순서가 다음 배열에도 계속 적용되는지 설명한다.",
  misconceptionConflict:
    "두 조각의 순서를 중간에 바꾸거나 같은 조각만 놓거나 보기 좋은 모양만 고르는 생각을, 두 규칙 칸의 순서와 반복 적용 관계에 충돌시킨다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    usageSnapshotSha256: LEARNING_MAP_USAGE_SNAPSHOT_SHA256,
    standardCode: "[2수02-02]",
    topicIds: [
      "kr.mt.math.change-relationships.g1-2.s2-02-02.representation"
    ],
    prerequisiteTopicIds: [
      "kr.mt.math.change-relationships.g1-2.s2-02-02.concept"
    ],
    observableEvidence: [
      "정한 규칙에 따른 배열을 말·글·수·그림·움직임 중 알맞은 방식으로 나타낸다.",
      "자신의 배열에서 규칙과 배열의 순서가 드러나는 부분을 찾아 설명한다."
    ],
    assessmentPrompt:
      "자신이 정한 규칙에 따른 배열을 제시하고, 학생이 같은 규칙을 두 가지 이상의 표현으로 나타낸 뒤 표현 사이의 연결 이유를 설명하게 하라.",
    caveat:
      "학습지도 저장소는 표현과 선수 관계 설계의 보조 자료이며 공식 교육과정 [2수02-02] 원문을 대신하지 않는다. 이 family는 패턴 블록 repeat-2 규칙 구성만 다룬다."
  },
  decision: {
    mode: "construct-rule",
    ruleStatePath: "ruleState",
    decisionConstraintId: "construct-rule-slot",
    variantRoles: [...variantRoles],
    ruleSlotRoles: [...ruleSlotRoles],
    variantProperty: "orderedValues",
    validRuleStatesPath: "validRuleStates",
    surplusPath: "surplusRuleStates",
    minimumValidStates: 2,
    minimumSurplus: 1,
    distractors: [
      {
        predicateKind: "cognitive.rule-state-contract",
        misconception:
          "두 조각의 순서를 중간에 바꾸거나 같은 조각만 반복해도 정한 규칙이라고 생각한다."
      },
      {
        predicateKind: "cognitive.rule-state-contract",
        misconception:
          "패턴 블록을 두 개 정하지 않고 보기 좋은 모양만 임의로 놓아도 된다고 생각한다."
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "countable-unit-model",
    roles: ["rule-slot-1", "rule-slot-2", "continuation-lane"],
    invariant:
      "두 규칙 칸에 놓은 패턴 블록과 순서가 다음 배열에서도 같은 단위로 반복되어야 한다."
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath:
    "다섯 패턴 블록은 계속 움직일 수 있으며, 학생은 두 규칙 칸의 성분과 순서를 바꾸어 반복되는 까닭을 다시 설명할 수 있다.",
  limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
});

export const repeatRuleConstructionProblemFamilyModule: ProblemFamilyNativeModule = {
  source,
  capability: repeatRuleConstructionCapability,
  runtime: {
    familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
    blueprint: repeatRuleConstructionBlueprint,
    prepare,
    supportState: "verified",
    generateItemsForVariation,
    answerKey,
    problemPreviews,
    appliedProblemParameters
  },
  cognitiveManifest,
  variationEnvelope: repeatRuleConstructionVariationEnvelope
};
