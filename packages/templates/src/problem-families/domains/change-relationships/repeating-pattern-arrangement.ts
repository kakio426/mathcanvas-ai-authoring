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
  "change-odd-numbers",
  "change-even-numbers"
] as const;
export type RepeatingPatternArrangementContextId =
  (typeof REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS)[number];

type PatternItemSpec = Readonly<{
  sequence: readonly [number, number, number];
  pieces: readonly [number, number, number, number, number];
  correctSequence: readonly [number, number, number];
  correctNext: readonly [number, number];
  phase: "declare" | "repair";
  relationId: "repeat-2" | "repeat-3" | "step-1" | "step-2";
  repairIndex?: 2;
  correctRuleText: string;
  candidates: readonly [string, string, string, string, string];
  questionText: string;
  explanation: string;
}>;

type PatternContext = Readonly<{
  title: string;
  ruleKind: "repeat" | "change";
  items: readonly [PatternItemSpec, PatternItemSpec];
}>;

const CONTEXTS: Readonly<
  Record<RepeatingPatternArrangementContextId, PatternContext>
> = {
  "repeat-colors": {
    title: "두 조각 패턴 블록 배열",
    ruleKind: "repeat",
    items: [
      {
        sequence: [1, 2, 1],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [1, 2, 1],
        correctNext: [2, 1],
        phase: "declare",
        relationId: "repeat-2",
        correctRuleText: "노-파",
        candidates: [
          "노-파",
          "노랑만",
          "색 섞기",
          "한 번",
          "끝 복사"
        ],
        questionText:
          "패턴 블록을 세 칸 놓았습니다. 반복 단위를 직접 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "노란 육각형과 파란 마름모가 두 조각 단위로 되풀이됩니다. 그래서 다음은 파란 마름모, 노란 육각형입니다."
      },
      {
        sequence: [1, 4, 1],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [1, 2, 1],
        correctNext: [2, 1],
        phase: "repair",
        relationId: "repeat-2",
        repairIndex: 2,
        correctRuleText: "노-파",
        candidates: [
          "노-파",
          "노랑만",
          "파랑-빨강",
          "한 번",
          "끝 복사"
        ],
        questionText:
          "패턴 블록 배열에서 어긋난 조각을 고친 뒤 반복 단위를 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "두 번째 조각을 파란 마름모로 고치면 노란 육각형-파란 마름모가 되풀이됩니다. 다음은 파란 마름모, 노란 육각형입니다."
      }
    ]
  },
  "repeat-shapes": {
    title: "세 조각 패턴 블록 배열",
    ruleKind: "repeat",
    items: [
      {
        sequence: [1, 2, 3],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [1, 2, 3],
        correctNext: [1, 2],
        phase: "declare",
        relationId: "repeat-3",
        correctRuleText: "노-파-빨",
        candidates: [
          "노-파-빨",
          "노랑",
          "거꾸로",
          "한번",
          "끝복사"
        ],
        questionText:
          "패턴 블록을 세 칸 놓았습니다. 가장 짧은 반복 단위를 직접 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "노란 육각형-파란 마름모-빨간 사다리꼴이 세 조각 단위로 되풀이됩니다. 다음은 노란 육각형, 파란 마름모입니다."
      },
      {
        sequence: [1, 5, 3],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [1, 2, 3],
        correctNext: [1, 2],
        phase: "repair",
        relationId: "repeat-3",
        repairIndex: 2,
        correctRuleText: "노-파-빨",
        candidates: [
          "노-파-빨",
          "노랑",
          "파빨노",
          "한번",
          "끝복사"
        ],
        questionText:
          "패턴 블록 배열에서 어긋난 조각을 고친 뒤 세 조각의 반복 단위를 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "세 번째 조각을 빨간 사다리꼴로 고치면 세 조각이 같은 순서로 되풀이됩니다. 다음은 노란 육각형, 파란 마름모입니다."
      }
    ]
  },
  "change-odd-numbers": {
    title: "한 칸 변화 패턴 블록 배열",
    ruleKind: "change",
    items: [
      {
        sequence: [1, 2, 3],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [1, 2, 3],
        correctNext: [4, 5],
        phase: "declare",
        relationId: "step-1",
        correctRuleText: "1칸↑",
        candidates: [
          "1칸↑",
          "2칸↑",
          "1칸↓",
          "같은",
          "끝 복사"
        ],
        questionText:
          "패턴 블록을 한 칸씩 앞으로 옮기는 변화 관계를 직접 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "노란 육각형에서 파란 마름모, 빨간 사다리꼴로 한 칸씩 앞으로 바뀝니다. 다음은 초록 삼각형, 주황 정사각형입니다."
      },
      {
        sequence: [1, 5, 3],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [1, 2, 3],
        correctNext: [4, 5],
        phase: "repair",
        relationId: "step-1",
        repairIndex: 2,
        correctRuleText: "1칸↑",
        candidates: [
          "1칸↑",
          "2칸↑",
          "1칸↓",
          "같은",
          "끝 복사"
        ],
        questionText:
          "패턴 블록 배열에서 어긋난 조각을 고친 뒤 한 칸씩 앞으로 바뀌는 관계를 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "세 번째 조각을 빨간 사다리꼴로 고치면 한 칸씩 앞으로 바뀌는 관계가 이어집니다. 다음은 초록 삼각형, 주황 정사각형입니다."
      }
    ]
  },
  "change-even-numbers": {
    title: "두 칸 변화 패턴 블록 배열",
    ruleKind: "change",
    items: [
      {
        sequence: [2, 4, 6],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [2, 4, 6],
        correctNext: [2, 4],
        phase: "declare",
        relationId: "step-2",
        correctRuleText: "2칸↑",
        candidates: [
          "2칸↑",
          "1칸↑",
          "2칸↓",
          "같은",
          "끝 복사"
        ],
        questionText:
          "패턴 블록을 두 칸씩 건너뛰는 변화 관계를 직접 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "파란 마름모에서 초록 삼각형, 보라 마름모로 두 칸씩 건너뜁니다. 다음은 파란 마름모, 초록 삼각형입니다."
      },
      {
        sequence: [2, 1, 6],
        pieces: [1, 2, 3, 4, 5],
        correctSequence: [2, 4, 6],
        correctNext: [2, 4],
        phase: "repair",
        relationId: "step-2",
        repairIndex: 2,
        correctRuleText: "2칸↑",
        candidates: [
          "2칸↑",
          "1칸↑",
          "2칸↓",
          "같은",
          "끝 복사"
        ],
        questionText:
          "패턴 블록 배열에서 어긋난 조각을 고친 뒤 두 칸씩 건너뛰는 관계를 정하고 다음 두 칸을 어떻게 놓을까요?",
        explanation:
          "두 번째 조각을 초록 삼각형으로 고치면 두 칸씩 건너뛰는 관계가 이어집니다. 다음은 파란 마름모, 초록 삼각형입니다."
      }
    ]
  }
};

const instructions = [
  "① 앞의 배열을 보고 반복 단위나 변화 관계를 직접 정하고 규칙 카드를 고르세요.",
  "② 정한 규칙에 맞는 조각을 다음 두 칸에 놓고 모든 위치를 다시 확인하세요.",
  "③ 어긋난 조각을 고친 뒤 규칙과 배열이 맞는 까닭을 쓰세요."
] as const;

const scaffoldBase = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "학생이 완성된 규칙을 받지 않고 배열에서 반복 단위나 변화 관계를 직접 선언하게 합니다.",
    "선언한 규칙에 맞는 조각을 빈 칸에 놓고 모든 위치에 적용되는지 확인하게 합니다.",
    "어긋난 조각을 되돌리고 규칙과 배열의 관계를 말하게 합니다."
  ],
  questionIntent:
    "앞의 배열에서 학생이 정한 규칙을 선언하고 다음 두 항을 구성하게 합니다.",
  predictionLabel: "정한 규칙",
  poolLabel: "규칙 카드",
  explanationLabel: "확인한 까닭",
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
    instructionalIntent: "앞의 배열과 다음 두 빈 칸을 한 줄로 묶습니다.",
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
    instructionalIntent: "앞의 배열을 살펴볼 범위를 알려 줍니다.",
    properties: { text: "앞의 배열", fontSize: 23 },
    bindings: {},
    containerRole: "pattern-track"
  },
  ...sequenceRoles.slice(0, 3).map((role, index) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "SM02PB",
    intentKind: "pattern-block" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      index === 1
        ? "어긋난 조각을 바꿀 자리로 삼아 배열의 관계를 다시 확인하는 패턴 블록입니다."
        : "규칙을 정할 때 근거로 살펴보는 패턴 블록입니다.",
    properties: {},
    bindings: { variant: `item.sequenceVariant${index + 1}` },
    containerRole: "pattern-track"
  })),
  ...sequenceRoles.slice(3).map((role) => ({
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent: "학생이 정한 규칙으로 채울 앞쪽의 빈 칸입니다.",
    properties: { fill: "#FFFFFF", stroke: "#7B8DA5", strokeDashArray: "8 6" },
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
    instructionalIntent: "정한 규칙에 맞는 다음 항을 놓는 빈 칸입니다.",
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
    instructionalIntent: "정한 규칙에 맞는 조각과 어긋나는 조각을 함께 제공합니다.",
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
    properties: { text: "다음 조각 고르기", fontSize: 22 },
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
      "자신이 정한 반복 또는 변화 규칙에 따라 물체·무늬·수를 배열하고, 어긋난 항을 고쳐 규칙과 배열의 관계를 설명할 수 있다.",
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
        id: `complete-arrangement-${role.slice(-1)}`,
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
        id: "repair-misaligned-arrangement",
        kind: "fill-from-pool",
        sources: completionRoles.map((piece) => ({
          scope: "each-item" as const,
          role: piece
        })),
        target: { scope: "each-item", role: "sequence-block-2" },
        parameters: {
          repairIndexPath: "repairIndex",
          phasePath: "phase"
        },
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
            ...slotRoles
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
      tags: ["규칙 정하기", "반복 배열", "변화 관계", "어긋난 항 고치기"],
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
    compactGlyphRoles: [...sequenceRoles, ...completionRoles, ...CHOICE_CARD_ROLES],
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
        ...(spec.repairIndex === undefined
          ? {}
          : { repairIndex: spec.repairIndex }),
        questionText: spec.questionText,
        correctRuleText: spec.correctRuleText,
        initialSequence: [...spec.sequence],
        correctSequence: [...spec.correctSequence],
        correctNext: [...spec.correctNext],
        correctAnswerText:
          `${spec.correctRuleText}; 다음: ${spec.correctNext
            .map(patternBlockLabel)
            .join(", ")}`,
        answerExplanation: spec.explanation,
        verificationText:
          "고친 조각과 다음 두 칸을 앞의 배열과 이어 보며 모든 위치에 같은 규칙이 적용되는지 확인하세요.",
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
    "현재 공개 envelope는 패턴 블록의 repeat-2·repeat-3·step-1·step-2 관계입니다. 학생은 규칙 카드를 자신의 규칙으로 선언하고, 빈 칸을 구성하며, 처음부터 어긋난 조각을 되돌려 고칩니다. 물체·수 표현은 별도 envelope에서 추가해야 하며 이 family가 대신한다고 주장하지 않습니다.",
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
        `앞의 패턴 블록: ${sequenceRoles
          .map((_, index) => {
            const value = item.values[`sequenceVariant${index + 1}`];
            return value === undefined ? "빈 칸" : patternBlockLabel(value);
          })
          .join(" → ")}`,
        `규칙 후보: ${CHOICE_CARD_ROLES.map((_, index) =>
          String(item.values[`candidate${index + 1}`])
        ).join(" | ")}`,
        `다음 조각: ${completionRoles
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
    "학생은 앞의 물체·무늬·수 배열에서 반복 단위 또는 변화 관계를 직접 정해 규칙 후보를 선언하고, 그 규칙에 맞는 다음 두 항을 구성한 뒤 어긋난 항을 고친다.",
  misconceptionConflict:
    "마지막 항 복사, 규칙의 중간 변경, 반복 단위의 경계를 잘못 잡아 일부 위치만 맞는 배열을 정답으로 보는 생각을 배열 전체의 위치별 관계와 충돌시킨다.",
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
          "마지막 항을 복사하거나 규칙의 일부만 맞추어도 배열 전체가 완성되었다고 생각한다."
      },
      {
        predicateKind: "cognitive.release-contract",
        misconception:
          "반복 단위의 시작과 끝을 잘못 정해 중간부터 규칙을 바꾼다."
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "data-representation",
    roles: ["pattern-track", ...sequenceRoles, ...slotRoles],
    invariant:
      "정한 반복 단위 또는 변화 관계가 앞의 모든 위치와 다음 두 칸에 일관되게 적용되고, 어긋난 조각은 다시 고칠 수 있다."
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath:
    "규칙 후보와 다섯 조각은 계속 되돌릴 수 있으며, 다음 두 칸을 놓은 뒤 배열 전체의 관계가 어긋나면 다른 규칙이나 조각으로 고치고 까닭을 기록한다.",
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
