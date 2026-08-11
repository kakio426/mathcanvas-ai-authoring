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

export const REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID =
  "pattern.create-repeat-unit-explain-v1" as const;
export const REPEATING_PATTERN_ARRANGEMENT_MANIPULATION =
  "pattern-rule-arrangement-choice-drag" as const;
export const REPEATING_PATTERN_ARRANGEMENT_GENERATOR_ID =
  "pattern.create-repeat-unit-explain-items" as const;
export const REPEATING_PATTERN_ARRANGEMENT_GENERATOR_VERSION = "1.0.0" as const;
const LEARNING_MAP_USAGE_SNAPSHOT_SHA256 =
  "bed940f1896d3991aeb12766dff49c84dd110465e38ed01625ed5f32b564b1d5";

const assessmentTargetSet = findAssessmentTargetSet("[2수02-02]");
if (
  !assessmentTargetSet ||
  assessmentTargetSet.targetIds.length !== 2
) {
  throw new Error("repeating-pattern-arrangement-assessment-target-set-invalid");
}

export const REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS = [
  "repeat-colors",
  "repeat-shapes",
] as const;
export type RepeatingPatternArrangementContextId =
  (typeof REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS)[number];

type PatternItemSpec = Readonly<{
  sequence: readonly [number, number, number];
  pieces: readonly [number, number, number, number, number];
  correctSequence: readonly [number, number, number];
  correctNext: readonly [number, number];
  correctContinuation: readonly [number, number];
  phase: "repair";
  relationId: "repeat-2";
  correctRuleText: string;
  candidates: readonly [string, string, string, string, string];
  questionText: string;
  observationText: string;
  explanation: string;
}>;

type PatternContext = Readonly<{
  title: string;
  ruleKind: "repeat";
  items: readonly [PatternItemSpec, PatternItemSpec];
}>;

const CONTEXTS: Readonly<
  Record<RepeatingPatternArrangementContextId, PatternContext>
> = {
  "repeat-colors": {
    title: "초록·주황 두 조각 패턴 블록 배열",
    ruleKind: "repeat",
    items: [
      {
        sequence: [4, 4, 4],
        pieces: [4, 5, 5, 4, 4],
        correctSequence: [4, 5, 4],
        correctNext: [5, 4],
        correctContinuation: [5, 4],
        phase: "repair",
        relationId: "repeat-2",
        correctRuleText: "초-주",
        candidates: [
          "초-주",
          "초록만",
          "주-초-주",
          "한 번",
          "끝 복사"
        ],
        questionText:
          "어긋난 블록을 빼고 초록-주황 반복 단위를 정한 뒤 두 칸을 어떻게 채울까요?",
        observationText: "초록 → □ → 초록",
        explanation:
          "두 번째 블록을 주황 정사각형으로 고치면 초록-주황이 되풀이됩니다. 뒤의 두 칸은 주황, 초록입니다."
      },
      {
        sequence: [4, 4, 4],
        pieces: [4, 5, 5, 4, 4],
        correctSequence: [4, 5, 4],
        correctNext: [5, 4],
        correctContinuation: [5, 4],
        phase: "repair",
        relationId: "repeat-2",
        correctRuleText: "초-주",
        candidates: [
          "초-주",
          "초록만",
          "주-초-주",
          "한 번",
          "끝 복사"
        ],
        questionText:
          "어긋난 블록을 빼고 초록-주황 반복 단위를 정한 뒤 두 칸을 어떻게 채울까요?",
        observationText: "초록 → □ → 초록",
        explanation:
          "두 번째 블록을 주황 정사각형으로 고치면 초록-주황이 되풀이됩니다. 뒤의 두 칸은 주황, 초록입니다."
      }
    ]
  },
  "repeat-shapes": {
    title: "주황·초록 두 모양 패턴 블록 배열",
    ruleKind: "repeat",
    items: [
      {
        sequence: [5, 5, 5],
        pieces: [4, 4, 5, 5, 5],
        correctSequence: [5, 4, 5],
        correctNext: [4, 5],
        correctContinuation: [4, 5],
        phase: "repair",
        relationId: "repeat-2",
        correctRuleText: "주-초",
        candidates: [
          "주-초",
          "주황만",
          "초-주-초",
          "한 번",
          "끝복사"
        ],
        questionText:
          "어긋난 블록을 빼고 주황-초록 반복 단위를 정한 뒤 두 칸을 어떻게 채울까요?",
        observationText: "주황 → □ → 주황",
        explanation:
          "두 번째 블록을 초록 삼각형으로 고치면 주황-초록이 되풀이됩니다. 뒤의 두 칸은 초록, 주황입니다."
      },
      {
        sequence: [5, 5, 5],
        pieces: [4, 4, 5, 5, 5],
        correctSequence: [5, 4, 5],
        correctNext: [4, 5],
        correctContinuation: [4, 5],
        phase: "repair",
        relationId: "repeat-2",
        correctRuleText: "주-초",
        candidates: [
          "주-초",
          "주황만",
          "초-주-초",
          "한 번",
          "끝복사"
        ],
        questionText:
          "어긋난 블록을 빼고 주황-초록 반복 단위를 정한 뒤 두 칸을 어떻게 채울까요?",
        observationText: "주황 → □ → 주황",
        explanation:
          "두 번째 블록을 초록 삼각형으로 고치면 주황-초록이 되풀이됩니다. 뒤의 두 칸은 초록, 주황입니다."
      }
    ]
  }
};

const instructions = [
  "① 어긋난 블록을 빼고 남은 블록에서 반복 단위를 정해 규칙 카드를 고르세요.",
  "② 정한 규칙에 맞는 조각을 고칠 자리와 다음 두 칸에 놓으세요.",
  "③ 내가 정한 규칙과 배열이 맞는 까닭을 글로 쓰고 모든 위치를 확인하세요."
] as const;

const scaffoldBase = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "학생이 어긋난 블록을 빼고 남은 블록에서 반복 단위를 선언하게 합니다.",
    "선언한 규칙에 맞는 조각을 고칠 자리와 다음 두 칸에 놓게 합니다.",
    "자신의 규칙을 글로 쓰고 고친 블록과 배열의 관계를 설명하게 합니다."
  ],
  questionIntent:
    "학생이 어긋난 블록을 고치고 자신의 규칙으로 세 칸을 구성하게 합니다.",
  predictionLabel: "정한 규칙",
  poolLabel: "규칙 카드",
  explanationLabel: "내 규칙·확인한 까닭",
  centerCandidates: true,
  fontSizes: { question: 20, candidate: 18, label: 21 }
});

const scaffold = scaffoldBase.map((role) => {
  if (CHOICE_CARD_ROLES.includes(role.role as (typeof CHOICE_CARD_ROLES)[number])) {
    const candidateIndex = CHOICE_CARD_ROLES.indexOf(
      role.role as (typeof CHOICE_CARD_ROLES)[number]
    );
    return {
      ...role,
      toolKey: "common.text" as const,
      intentKind: "text" as const,
      properties: { ...role.properties, fontSize: 16 },
      bindings: { text: `item.candidate${candidateIndex + 1}` }
    };
  }
  if (role.role === "explanation-box") {
    return {
      ...role,
      toolKey: "common.text" as const,
      intentKind: "text" as const,
      instructionalIntent:
        "학생이 자신이 정한 반복 단위와 배열이 맞는 까닭을 직접 입력하는 영역입니다.",
      properties: { text: "", fontSize: 24 },
      bindings: {}
    };
  }
  return role;
});

const sequenceRoles = Array.from({ length: 6 }, (_, index) =>
  `sequence-block-${index + 1}`
);
const completionRoles = Array.from({ length: 5 }, (_, index) =>
  `completion-block-${index + 1}`
);
const slotRoles = ["next-slot-1", "next-slot-2"] as const;

const patternRoles = [
  {
    role: "pattern-track",
    scope: "each-item" as const,
    layoutRole: "pattern-track",
    idRole: "pattern-track",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle",
    locked: true,
    movable: false,
    instructionalIntent: "처음 세 블록과 고칠 자리, 뒤의 두 빈 칸을 한 줄로 묶습니다.",
    properties: { fill: "#F8FAFC", stroke: "#8291A7" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "pattern-label",
    scope: "each-item" as const,
    layoutRole: "pattern-label",
    idRole: "pattern-label",
    toolKey: "common.text",
    intentKind: "text",
    locked: true,
    movable: false,
    instructionalIntent: "어긋난 조각을 뺀 뒤 보이는 두 항의 관계를 살펴보게 합니다.",
    properties: { text: "", fontSize: 16 },
    bindings: { text: "item.observationText" },
    containerRole: "pattern-track"
  },
  ...sequenceRoles
    .filter((role) => role !== "sequence-block-2")
    .slice(0, 2)
    .map((role) => {
      const index = sequenceRoles.indexOf(role);
      return {
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "SM02PB",
    intentKind: "pattern-block" as const,
    locked: true,
    movable: false,
    instructionalIntent: "규칙을 정할 때 근거로 살펴보는 고정 패턴 블록입니다.",
    properties: {},
    bindings: { variant: `item.sequenceVariant${index + 1}` },
    containerRole: "pattern-track"
      };
    }),
  {
    role: "sequence-block-2",
    scope: "each-item" as const,
    layoutRole: "sequence-block-2",
    idRole: "sequence-block-2",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent: "어긋난 블록을 빼고 알맞은 블록을 놓는 고정 자리입니다.",
    properties: { fill: "#FFF8F0", stroke: "#D9792B", strokeDashArray: "8 6" },
    bindings: {},
    containerRole: "pattern-track"
  },
  {
    role: "misaligned-block",
    scope: "each-item" as const,
    layoutRole: "sequence-block-2",
    idRole: "misaligned-block",
    toolKey: "SM02PB",
    intentKind: "pattern-block" as const,
    locked: false,
    movable: true,
    instructionalIntent: "처음부터 어긋나 있어 먼저 조각 바구니로 빼야 하는 패턴 블록입니다.",
    properties: {},
    bindings: { variant: "item.sequenceVariant2" },
    containerRole: "pattern-track"
  },
  ...sequenceRoles.slice(3).map((role) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: "이후 배열이 이어짐을 나타내는 생략 표지입니다.",
    properties: { text: "⋯", fontSize: 24, centerInPlacement: true },
    bindings: {},
    containerRole: "pattern-track"
  })),
  ...slotRoles.map((role) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle",
    locked: true,
    movable: false,
    instructionalIntent: "정한 규칙에 맞는 다음 두 항을 놓는 빈 칸입니다.",
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
    intentKind: "draw-rectangle",
    locked: true,
    movable: false,
    instructionalIntent: "어긋난 조각을 되돌리고 정한 규칙에 맞는 조각을 놓는 바구니입니다.",
    properties: { fill: "#F5FBFF", stroke: "#4AA9D8" },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "piece-bank-label",
    scope: "each-item" as const,
    layoutRole: "piece-bank-label",
    idRole: "piece-bank-label",
    toolKey: "common.text",
    intentKind: "text",
    locked: true,
    movable: false,
    instructionalIntent: "빈 칸에 놓을 조각을 고르게 합니다.",
    properties: { text: "조각 바구니", fontSize: 22 },
    bindings: {},
    containerRole: "piece-bank"
  },
  ...completionRoles.map((role, index) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "SM02PB",
    intentKind: "pattern-block" as const,
    locked: false,
    movable: true,
    instructionalIntent:
      "정한 규칙에 맞는지 판단하여 빈 칸으로 옮길 수 있는 패턴 블록입니다.",
    properties: {},
    bindings: { variant: `item.completionVariant${index + 1}` },
    containerRole: "piece-bank"
  }))
];

export const repeatingPatternArrangementVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
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
        values: [...REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS],
        default: "repeat-colors"
      }
    ],
    pinned: { difficulty: "normal" },
    expectedCombinationCount: REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS.length
  });

export const repeatingPatternArrangementBlueprint = defineActivityBlueprint(
  withStudentScreenQuality({
    schemaVersion: "1.0.0",
    id: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
    version: "1.0.0",
    title: "정한 규칙으로 배열 만들고 고치기",
    learningObjective:
      "자신이 정한 반복 규칙에 따라 패턴 블록을 배열하고, 어긋난 블록을 고쳐 규칙과 배열의 관계를 설명할 수 있다.",
    curriculumBinding: {
      standardCode: "[2수02-02]",
      domain: "변화와 관계",
      officialGoal: "자신이 정한 규칙에 따라 물체, 무늬, 수 등을 배열할 수 있다."
    },
    generator: {
      id: REPEATING_PATTERN_ARRANGEMENT_GENERATOR_ID,
      version: REPEATING_PATTERN_ARRANGEMENT_GENERATOR_VERSION,
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
          ...makeChoiceExplanationScaffoldLayoutChildren(),
          layoutBlock("pattern-track", "slot", "item.pattern-track", "each-item"),
          layoutBlock("pattern-label", "slot", "item.pattern-label", "each-item"),
          ...sequenceRoles.map((role) =>
            layoutBlock(role, "slot", `item.${role}`, "each-item")
          ),
          ...slotRoles.map((role) =>
            layoutBlock(role, "slot", `item.${role}`, "each-item")
          ),
          layoutBlock("piece-bank", "slot", "item.piece-bank", "each-item"),
          layoutBlock("piece-bank-label", "slot", "item.piece-bank-label", "each-item"),
          ...completionRoles.map((role) =>
            layoutBlock(role, "slot", `item.${role}`, "each-item")
          )
        ]
      }
    },
    constraints: [
      {
        id: "select-arrangement-rule",
        kind: "select-one-of",
        sources: CHOICE_CARD_ROLES.map((role) => ({
          scope: "each-item" as const,
          role
        })),
        target: { scope: "each-item", role: "prediction-box" },
        parameters: {},
        requiresStudentAction: true
      },
      ...slotRoles.map((role) => ({
        id: `complete-arrangement-${role}`,
        kind: "fill-from-pool",
        sources: completionRoles.map((piece) => ({
          scope: "each-item" as const,
          role: piece
        })),
        target: { scope: "each-item" as const, role },
        parameters: {},
        requiresStudentAction: true
      })),
      {
        id: "remove-misaligned-arrangement",
        kind: "place-in",
        sources: [{
          scope: "each-item" as const,
          role: "misaligned-block"
        }],
        target: { scope: "each-item", role: "piece-bank" },
        parameters: {},
        requiresStudentAction: true
      },
      {
        id: "repair-misaligned-arrangement",
        kind: "fill-from-pool",
        sources: completionRoles.map((piece) => ({
          scope: "each-item" as const,
          role: piece
        })),
        target: { scope: "each-item", role: "sequence-block-2" },
        parameters: {},
        requiresStudentAction: true
      }
    ],
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "select-one",
          decisionConstraintId: "select-arrangement-rule",
          candidateRoles: CHOICE_CARD_ROLES,
          candidateProperty: "text",
          correctValuePath: "correctRuleText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: [
            "pattern-track",
            ...sequenceRoles,
            ...slotRoles,
            "misaligned-block"
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
            "pattern-label",
            "piece-bank-label",
            "prediction-label",
            "pool-label",
            "explanation-label"
          ],
          promptRoles: ["question"],
          maximumInstructionLength: 80,
          maximumLabelLength: 20
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
            "pattern-label",
            "piece-bank-label",
            "prediction-label",
            "pool-label",
            "explanation-label",
            ...CHOICE_CARD_ROLES
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
            "prediction-label",
            "prediction-box",
            "pool-label",
            ...CHOICE_CARD_ROLES,
            "pattern-label",
            ...sequenceRoles,
            ...slotRoles,
            "piece-bank-label",
            ...completionRoles,
            "explanation-label",
            "explanation-box"
          ]
        }
      }
    ],
    instructions: [...instructions],
    payload: {
      categoryId: MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId,
      tags: ["규칙 정하기", "반복 배열", "어긋난 블록 고치기"],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: {
      problemCount: 2,
      difficulty: "normal",
      contextId: "repeat-colors"
    }
  }, {
    questionFontSize: 20,
    compactGlyphRoles: [
      "pattern-label",
      ...sequenceRoles,
      ...completionRoles,
      ...CHOICE_CARD_ROLES
    ],
    compactGlyphMinimumFontSize: 16
  })
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
    throw new Error("repeating-pattern-arrangement-variant-invalid");
  }
  return PATTERN_BLOCK_LABELS[value]!;
}

export function generateRepeatingPatternArrangementItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly contextId: RepeatingPatternArrangementContextId;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2 ||
    !REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS.includes(parameters.contextId)
  ) {
    throw new RangeError(
      "정한 규칙으로 배열 만들기 활동은 기본 난이도·2문항·등록된 배열 맥락을 지원합니다."
    );
  }
  const context = CONTEXTS[parameters.contextId];
  const random = createSeededRandom(
    `${seed}:repeating-pattern-arrangement:${parameters.contextId}`
  );
  return context.items.map((spec, index) => {
    const candidates = shuffle(spec.candidates, random);
    const pieces = shuffle(spec.pieces, random);
    return {
      id: `${REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID}-${parameters.contextId}-${index + 1}`,
      order: index + 1,
      kind: "repeating-pattern-arrangement-choice",
      values: {
        contextId: parameters.contextId,
        ruleKind: context.ruleKind,
        contextTitle: context.title,
        orderLabel: `${index + 1}번`,
        phase: spec.phase,
        relationId: spec.relationId,
        questionText: spec.questionText,
        observationText: spec.observationText,
        correctRuleText: spec.correctRuleText,
        initialSequence: [...spec.sequence],
        correctSequence: [...spec.correctSequence],
        correctNext: [...spec.correctNext],
        correctContinuation: [...spec.correctContinuation],
        correctAnswerText:
          `${spec.correctRuleText}; 이어지는 두 칸: ${spec.correctContinuation
            .map(patternBlockLabel)
            .join(", ")}`,
        answerExplanation: spec.explanation,
        verificationText:
          "어긋난 조각을 뺀 뒤 고친 블록과 이어지는 두 칸에 같은 반복 규칙이 적용되는지 확인하세요.",
        misconceptionIds: [
          "change.pattern.rule-changes-mid-sequence-v1",
          "change.pattern.rule-boundary-mismatch-v1"
        ],
        ...Object.fromEntries(
          spec.sequence.map((value, valueIndex) => [
            `sequenceVariant${valueIndex + 1}`,
            value
          ])
        ),
        ...Object.fromEntries(
          pieces.map((value, valueIndex) => [
            `completionVariant${valueIndex + 1}`,
            value
          ])
        ),
        ...Object.fromEntries(
          candidates.flatMap((value, candidateIndex) => [
            [`candidate${candidateIndex + 1}`, value],
            [`candidate${candidateIndex + 1}Latex`, value]
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: REPEATING_PATTERN_ARRANGEMENT_GENERATOR_ID,
        generatorVersion: REPEATING_PATTERN_ARRANGEMENT_GENERATOR_VERSION,
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
    !REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS.includes(
      variation.contextId as RepeatingPatternArrangementContextId
    )
  ) {
    throw new Error(
      `problem-family-native-variation-invalid:${REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID}`
    );
  }
  return generateRepeatingPatternArrangementItems(
    {
      difficulty: "normal",
      problemCount: 2,
      contextId: variation.contextId as RepeatingPatternArrangementContextId
    },
    seed
  );
}

const defaultProblemParameters = problemParametersSchema.parse({
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
  values: { contextId: "repeat-colors" }
});

function parseProblemParameters(input: ProblemParameters): ProblemParameters {
  const parsed = problemParametersSchema.parse(input);
  const contextId = parsed.values.contextId;
  if (
    parsed.familyId !== REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID ||
    Object.keys(parsed.values).join(":") !== "contextId" ||
    typeof contextId !== "string" ||
    !REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS.includes(
      contextId as RepeatingPatternArrangementContextId
    )
  ) {
    throw new Error("repeating-pattern-arrangement-parameters-unsupported");
  }
  return problemParametersSchema.parse({
    ...parsed,
    values: { contextId }
  });
}

export const repeatingPatternArrangementCapability: ProblemFamilyCapabilityExtension = {
  familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
  recommendedGrade: 2,
  gradeRange: [1, 2],
  defaultProblemCount: 2,
  parameterFields: [
    {
      key: "contextId",
      inputLabel: "배열 맥락",
      control: "select",
      section: "수학 조건",
      options: REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS.map((value) => ({
        value,
        label: CONTEXTS[value].title
      }))
    }
  ],
  defaultParameters: defaultProblemParameters,
  promptGuards: [],
  unsupportedParameterPolicy: "clarification-required",
  title: "정한 규칙으로 배열 만들고 고치기",
  scopeNote:
    "현재 공개 envelope는 초록·주황 또는 주황·초록 패턴 블록의 repeat-2 관계입니다. 학생은 어긋난 블록을 바구니로 빼고, 남은 블록을 근거로 규칙 카드를 고른 뒤 자신의 규칙과 까닭을 글로 선언하고, 고칠 자리와 다음 두 칸을 채웁니다. repeat-3·변화·수 표현·다른 사물 맥락은 별도 envelope에서 추가해야 하며 이 family가 대신한다고 주장하지 않습니다.",
  parseParameters: parseProblemParameters
};

function requirePreparedRecommendation(
  recommendation: Recommendation
): { problemCount: number; difficulty: "normal"; parameters: ProblemParameters } {
  if (
    recommendation.templateId !== REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID ||
    recommendation.standardCode !== "[2수02-02]" ||
    recommendation.manipulation !== REPEATING_PATTERN_ARRANGEMENT_MANIPULATION ||
    recommendation.problemCount !== 2 ||
    recommendation.difficulty !== "normal"
  ) {
    throw new Error(
      `activity-recommendation-mismatch:${REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID}`
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
  const contextId = prepared.parameters.values.contextId as RepeatingPatternArrangementContextId;
  return {
    blueprint: repeatingPatternArrangementBlueprint,
    items: generateRepeatingPatternArrangementItems(
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
        options.activityId ?? `${REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID}-${options.seed}`,
      templateVersion: repeatingPatternArrangementBlueprint.version,
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
    .map((item) => ({
      problemNumber: item.order,
      statements: [
        String(item.values.questionText),
        `처음 패턴 블록: ${sequenceRoles
          .slice(0, 3)
          .map((_, index) =>
            patternBlockLabel(item.values[`sequenceVariant${index + 1}`])
          )
          .join(" → ")}`,
        `관찰 안내: ${String(item.values.observationText)}`,
        "수정 자리: 두 번째 블록(처음에는 어긋난 조각)",
        "이후 표시: ⋯ ⋯ ⋯ (생략)",
        "채울 자리: 고칠 자리 → 다음 칸 2곳",
        `규칙 후보: ${CHOICE_CARD_ROLES.map((_, index) =>
          String(item.values[`candidate${index + 1}`])
        ).join(" | ")}`,
        `조각 바구니: ${completionRoles
          .map((_, index) =>
            patternBlockLabel(item.values[`completionVariant${index + 1}`])
          )
          .join(", ")}`,
        `활동 단계: ${String(item.values.phase) === "repair" ? "어긋난 조각 고치기" : "규칙 정하고 배열 구성하기"}`
      ]
    }));
}

function appliedProblemParameters(
  resolved: ResolvedActivity
): ProblemParameters | undefined {
  const contextId = resolved.items[0]?.values.contextId;
  if (typeof contextId !== "string") return undefined;
  return parseProblemParameters({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
    values: { contextId }
  });
}

const source: ProblemFamilyRegistrySource = {
  registrationKind: "native-problem-family-module",
  familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
  templateId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
  activityId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
  standardCode: "[2수02-02]",
  supportedStandardCodes: ["[2수02-02]"],
  gradeBand: "1-2",
  domain: "변화와 관계",
  learningGoal: repeatingPatternArrangementBlueprint.learningObjective,
  assessmentTargetIds: [...assessmentTargetSet.targetIds],
  manipulation: REPEATING_PATTERN_ARRANGEMENT_MANIPULATION,
  generator: {
    id: REPEATING_PATTERN_ARRANGEMENT_GENERATOR_ID,
    version: REPEATING_PATTERN_ARRANGEMENT_GENERATOR_VERSION
  },
  blueprint: {
    contentHash: repeatingPatternArrangementBlueprint.contentHash,
    version: repeatingPatternArrangementBlueprint.version,
    layoutTokenSet: repeatingPatternArrangementBlueprint.layout.tokenSet
  },
  availableProblemCounts: [2],
  supportedDifficulties: ["normal"],
  supportState: "verified",
  evidencePaths: [
    "packages/templates/src/problem-families/domains/change-relationships/repeating-pattern-arrangement.test.ts"
  ]
};

const cognitiveManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: repeatingPatternArrangementBlueprint.id,
  blueprintVersion: repeatingPatternArrangementBlueprint.version,
  blueprintContentHash: repeatingPatternArrangementBlueprint.contentHash,
  mathematicalDecision:
    "학생은 어긋난 블록을 빼고 남은 패턴 블록에서 반복 단위를 직접 정해 규칙 카드를 고른 뒤, 자신의 규칙과 까닭을 글로 선언하고 고칠 자리와 다음 두 칸을 구성한다.",
  misconceptionConflict:
    "마지막 블록 복사, 반복 단위의 경계 오류, 어긋난 블록을 그대로 두어도 된다는 생각을 고친 자리와 다음 두 칸 전체의 반복 관계와 충돌시킨다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    usageSnapshotSha256: LEARNING_MAP_USAGE_SNAPSHOT_SHA256,
    standardCode: "[2수02-02]",
    topicIds: [
      "kr.mt.math.change-relationships.g1-2.s2-02-02.representation",
      "kr.mt.math.change-relationships.g1-2.s2-02-02.application"
    ],
    prerequisiteTopicIds: [
      "kr.mt.math.change-relationships.g1-2.s2-02-02.concept",
      "kr.mt.math.change-relationships.g1-2.s2-02-02.representation"
    ],
    observableEvidence: [
      "정한 규칙에 따른 배열을 말·글·수·그림·움직임 중 알맞은 방식으로 나타낸다.",
      "자신의 배열에서 규칙과 배열의 순서가 드러나는 부분을 찾아 설명한다.",
      "자신이 정한 규칙으로 배열을 끝까지 구성하고 어긋난 항목을 고친다.",
      "수행 과정과 결과를 기록하고, 다음 배열에서 규칙을 더 분명히 드러낼 방법을 제시한다."
    ],
    assessmentPrompt:
      "자신이 정한 규칙으로 물체·무늬·수를 배열하는 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 배열 표현, 결과의 타당성을 차례로 설명하게 하라.",
    caveat:
      "학습지도 저장소는 표현과 선수 관계 설계의 보조 자료이며 공식 교육과정 [2수02-02] 원문을 대신하지 않는다."
  },
  decision: {
    mode: "select-one",
    constraintId: "select-arrangement-rule",
    candidateRoles: [...CHOICE_CARD_ROLES],
    candidateProperty: "text",
    correctValuePath: "correctRuleText",
    distractors: [
      {
        predicateKind: "cognitive.release-contract",
        misconception:
          "마지막 블록을 복사하거나 고칠 자리를 그대로 두어도 배열 전체가 완성되었다고 생각한다."
      },
      {
        predicateKind: "cognitive.release-contract",
        misconception:
          "반복 단위의 경계를 잘못 정해 고친 자리와 다음 두 칸에서 규칙을 바꾼다."
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "data-representation",
    roles: ["pattern-track", ...sequenceRoles, ...slotRoles, "misaligned-block"],
    invariant:
      "어긋난 블록을 빼고 고친 뒤, 정한 반복 단위가 고친 자리와 다음 두 칸에 일관되게 적용되어야 한다."
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath:
    "어긋난 블록을 조각 바구니로 되돌리고, 규칙 카드·자신의 규칙 글·세 조각을 계속 바꾸어 반복 관계를 확인한 뒤 까닭을 기록한다.",
  limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
});

export const repeatingPatternArrangementProblemFamilyModule: ProblemFamilyNativeModule = {
  source,
  capability: repeatingPatternArrangementCapability,
  runtime: {
    familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
    blueprint: repeatingPatternArrangementBlueprint,
    prepare,
    supportState: "verified",
    generateItemsForVariation,
    answerKey,
    problemPreviews,
    appliedProblemParameters
  },
  cognitiveManifest,
  variationEnvelope: repeatingPatternArrangementVariationEnvelope
};
