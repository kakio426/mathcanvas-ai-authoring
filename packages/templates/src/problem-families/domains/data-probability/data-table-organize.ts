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

export const DATA_TABLE_ORGANIZE_FAMILY_ID =
  "data.early-table.organize-v1" as const;
export const DATA_TABLE_ORGANIZE_MANIPULATION =
  "data-table-organize-choice-drag" as const;
export const DATA_TABLE_ORGANIZE_GENERATOR_ID =
  "data.early-table.organize-items" as const;
export const DATA_TABLE_ORGANIZE_GENERATOR_VERSION = "1.0.0" as const;
const LEARNING_MAP_USAGE_SNAPSHOT_SHA256 =
  "ad5931c31d7b2fe0f43c9dbb8a6e1c2e690acd9402351c876421e4f6ab1259d4";

const dataTableAssessmentTargetSet = findAssessmentTargetSet("[2수04-02]");
if (!dataTableAssessmentTargetSet || dataTableAssessmentTargetSet.targetIds.length !== 2) {
  throw new Error("data-table-assessment-target-set-invalid");
}

export const DATA_TABLE_CONTEXT_IDS = [
  "fruit",
  "toys",
  "vehicles",
  "school-supplies"
] as const;
export type DataTableContextId = (typeof DATA_TABLE_CONTEXT_IDS)[number];

type Context = Readonly<{
  title: string;
  categoryLabel: string;
  categories: readonly [string, string, string];
  rawData: readonly string[];
  counts: readonly [number, number, number];
}>;

const CONTEXTS: Readonly<Record<DataTableContextId, Context>> = {
  fruit: {
    title: "우리 반이 좋아하는 과일",
    categoryLabel: "과일",
    categories: ["사과", "바나나", "포도"],
    rawData: ["사과", "포도", "사과", "바나나", "사과", "포도"],
    counts: [3, 1, 2]
  },
  toys: {
    title: "우리 반이 좋아하는 장난감",
    categoryLabel: "장난감",
    categories: ["공", "인형", "블록"],
    rawData: ["블록", "인형", "공", "인형", "공", "인형"],
    counts: [2, 3, 1]
  },
  vehicles: {
    title: "우리 반이 타고 싶은 탈것",
    categoryLabel: "탈것",
    categories: ["버스", "자전거", "기차"],
    rawData: ["기차", "버스", "자전거", "기차", "자전거", "기차", "기차"],
    counts: [1, 2, 4]
  },
  "school-supplies": {
    title: "교실에서 찾은 학용품",
    categoryLabel: "학용품",
    categories: ["연필", "지우개", "자"],
    rawData: ["자", "연필", "지우개", "연필", "지우개", "자", "지우개"],
    counts: [2, 3, 2]
  }
};

const instructions = [
  "① 원자료를 하나씩 세어 범주 이름과 개수를 함께 나타낸 표 답을 골라 놓으세요.",
  "② 고른 표 답의 세 개수를 더해 원자료 전체 수와 같은지 확인하세요.",
  "③ 표로 나타내면 무엇이 편리한지 한 문장으로 써 보세요."
] as const;

const baseScaffold = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "원자료를 범주별로 세어 범주 이름과 개수가 함께 있는 표 답을 결정하게 합니다.",
    "선택한 표 답의 세 개수 합과 원자료 전체 수를 대응해 스스로 검산하게 합니다.",
    "표가 비교와 집계에 편리한 까닭을 자료에 근거해 설명하게 합니다."
  ],
  questionIntent:
    "원자료를 표로 정리하거나 표로 나타냈을 때의 편리한 점을 묻습니다.",
  predictionLabel: "내가 고른 답",
  poolLabel: "고를 수 있는 생각",
  explanationLabel: "설명",
  centerCandidates: true,
  fontSizes: { question: 27, candidate: 27 }
});

const scaffold = baseScaffold.map((role) => {
  const candidateIndex = CHOICE_CARD_ROLES.indexOf(
    role.role as (typeof CHOICE_CARD_ROLES)[number]
  );
  if (candidateIndex >= 0) {
    return {
      ...role,
      toolKey: "common.text" as const,
      intentKind: "text" as const,
      properties: { ...role.properties, fontSize: 18 },
      bindings: { text: `item.candidate${candidateIndex + 1}` }
    };
  }
  if (role.role === "explanation-label") {
    return { ...role, layoutRole: "explanation-box" };
  }
  if (role.role === "raw-data") {
    return {
      ...role,
      properties: { ...role.properties, fontSize: 16 }
    };
  }
  return role;
});

export const dataTableOrganizeVariationEnvelope = defineVariationEnvelope({
  schemaVersion: "1.0.0",
  blueprintId: DATA_TABLE_ORGANIZE_FAMILY_ID,
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
      values: [...DATA_TABLE_CONTEXT_IDS],
      default: "fruit"
    }
  ],
  pinned: { difficulty: "normal" },
  expectedCombinationCount: DATA_TABLE_CONTEXT_IDS.length
});

export const dataTableOrganizeBlueprint = defineActivityBlueprint(
  withStudentScreenQuality({
    schemaVersion: "1.0.0",
    id: DATA_TABLE_ORGANIZE_FAMILY_ID,
    version: "1.0.0",
    title: "자료를 표로 정리하고 편리한 점 설명하기",
    learningObjective:
      "자료를 범주별로 세어 표로 나타내고, 표로 나타내면 편리한 점을 말할 수 있다.",
    curriculumBinding: {
      standardCode: "[2수04-02]",
      domain: "자료와 가능성",
      officialGoal:
        "자료를 분류하여 표로 나타내고, 자료를 표로 나타내면 편리한 점을 말할 수 있다."
    },
    generator: {
      id: DATA_TABLE_ORGANIZE_GENERATOR_ID,
      version: DATA_TABLE_ORGANIZE_GENERATOR_VERSION,
      parameters: { problemCount: 2, difficulty: "normal", contextId: "fruit" }
    },
    toolRoles: [
      ...scaffold,
      {
        role: "data-table",
        scope: "each-item",
        layoutRole: "data-table",
        idRole: "data-table",
        toolKey: "DP02TG",
        intentKind: "data-table",
        locked: true,
        movable: false,
        instructionalIntent:
          "고쳐야 할 임시 표입니다. 원자료와 선택한 완전한 표 답을 비교합니다.",
        properties: {},
        bindings: {
          title: "item.tableTitleText",
          categories: "item.categories",
          values: "item.tableValues",
          categoryAxisName: "item.categoryLabelText",
          valueColumnName: "item.valueColumnName"
        },
        containerRole: "work-panel"
      },
      {
        role: "raw-data",
        scope: "each-item",
        layoutRole: "scale-label",
        idRole: "raw-data",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "표로 정리하기 전의 원자료를 범주 이름과 함께 보여 줍니다.",
        properties: { text: "", fontSize: 16 },
        bindings: { text: "item.rawDataText" },
        containerRole: "work-panel"
      }
    ],
    layout: {
      tokenSet: "wave22-bar-graph-represent-v1",
      root: {
        id: "canvas",
        kind: "canvas",
        preset: "canvas.root",
        repeat: "once",
        children: [
          ...makeChoiceExplanationScaffoldLayoutChildren(),
          layoutBlock("data-table", "slot", "item.data-table", "each-item"),
          layoutBlock("scale-label", "slot", "item.scale-label", "each-item")
        ]
      }
    },
    constraints: [
      {
        id: "select-table-answer",
        kind: "select-one-of",
        sources: CHOICE_CARD_ROLES.map((role) => ({
          scope: "each-item" as const,
          role
        })),
        target: { scope: "each-item", role: "prediction-box" },
        parameters: {},
        requiresStudentAction: true
      }
    ],
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "select-one",
          decisionConstraintId: "select-table-answer",
          candidateRoles: CHOICE_CARD_ROLES,
          candidateProperty: "text",
          correctValuePath: "correctValueText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: ["data-table", "raw-data", "prediction-box"]
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
            "prediction-label",
            "pool-label",
            "explanation-label",
            "raw-data",
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
            "raw-data",
            "data-table",
            "prediction-label",
            "prediction-box",
            "pool-label",
            ...CHOICE_CARD_ROLES,
            "explanation-label",
            "explanation-box"
          ]
        }
      }
    ],
    instructions: [...instructions],
    payload: {
      categoryId: MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"].categoryId,
      tags: ["자료 분류", "표", "개수 세기", "편리한 점"],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: { problemCount: 2, difficulty: "normal", contextId: "fruit" }
  }, {
    questionFontSize: 36,
    compactGlyphRoles: ["raw-data", ...CHOICE_CARD_ROLES],
    compactGlyphMinimumFontSize: 18
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

function candidateValues(context: Context, index: number): string[] {
  if (index === 0) {
    const [first, second, third] = context.counts;
    const formatMapping = (counts: readonly [number, number, number]) =>
      context.categories
        .map((category, categoryIndex) => `${category}${counts[categoryIndex]}개`)
        .join("\n");
    return [
      formatMapping([first, second, third]),
      formatMapping([first + second + third, 0, 0]),
      formatMapping([second, first, third]),
      formatMapping([first, third, second]),
      formatMapping([first + 1, second, third - 1])
    ];
  }
  return [
    "개수 비교",
    "보기 좋음",
    "자료 늘어남",
    "모두 같음",
    "분류 불필요"
  ];
}

export function generateDataTableOrganizeItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly contextId: DataTableContextId;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2 ||
    !DATA_TABLE_CONTEXT_IDS.includes(parameters.contextId)
  ) {
    throw new RangeError(
      "표로 정리하기 활동은 기본 난이도·2문항·등록된 자료 맥락을 지원합니다."
    );
  }
  const context = CONTEXTS[parameters.contextId];
  const total = context.counts.reduce((sum, value) => sum + value, 0);
  const formatMapping = (counts: readonly [number, number, number]) =>
    context.categories
      .map((category, categoryIndex) => `${category}${counts[categoryIndex]}개`)
      .join("\n");
  const formatAnswerMapping = (counts: readonly [number, number, number]) =>
    context.categories
      .map((category, categoryIndex) => `${category} ${counts[categoryIndex]}개`)
      .join(", ");
  const formatRawData = (rawData: readonly string[]) => {
    const lines: string[] = [];
    for (let index = 0; index < rawData.length; index += 3) {
      lines.push(rawData.slice(index, index + 3).join("·"));
    }
    return `${rawData.length}개: ${lines.join("\n")}`;
  };
  const random = createSeededRandom(`${seed}:data-table-organize:${parameters.contextId}`);
  return Array.from({ length: parameters.problemCount }, (_, index) => {
    const candidates = shuffle(candidateValues(context, index), random);
    const isOrganize = index === 0;
    const correctValueText = isOrganize
      ? formatMapping(context.counts)
      : "개수 비교";
    const tableValues = isOrganize ? [1, 1, 1] : [...context.counts];
    return {
      id: `${DATA_TABLE_ORGANIZE_FAMILY_ID}-${index + 1}`,
      order: index + 1,
      kind: "data-table-organize-choice",
      values: {
        contextId: parameters.contextId,
        orderLabel: `${index + 1}번`,
        contextText: context.title,
        tableTitleText: isOrganize
          ? `${context.title} (고쳐야 할 표)`
          : `${context.title} (완성한 표)`,
        categoryLabelText: context.categoryLabel,
        valueColumnName: "개수(개)",
        categories: [...context.categories],
        tableValues,
        rawDataText: formatRawData(context.rawData),
        questionText: isOrganize
          ? `${context.categoryLabel} 자료의 표 답은 무엇인가요?`
          : "표로 나타내면 무엇이 편리한가요?",
        correctValueText,
        correctAnswerText: isOrganize
          ? `${formatAnswerMapping(context.counts)} (합계 ${total}개)`
          : correctValueText,
        answerExplanation: isOrganize
          ? `원자료를 범주 순서 ${context.categories.join(", ")}에 맞춰 세면 ${correctValueText}입니다. ${context.counts[0]}+${context.counts[1]}+${context.counts[2]}=${total}이고 원자료 ${context.rawData.length}개를 빠짐없이 한 번씩 세었습니다. 고쳐야 할 표의 임시 개수와 비교해 완성한 표 답을 확인합니다.`
          : "표에서는 같은 범주의 개수를 모아 보여 주므로 범주별 개수와 차이를 한눈에 비교하기 쉽습니다.",
        misconceptionIds: isOrganize
          ? [
              "data.table.category-or-count-mismatch-v1",
              "data.table.total-as-category-count-v1"
            ]
          : [
              "data.table.decoration-without-information-gain-v1",
              "data.table.total-only-usefulness-v1"
            ],
        ...Object.fromEntries(
          candidates.flatMap((candidate, candidateIndex) => [
            [`candidate${candidateIndex + 1}`, candidate],
            [`candidate${candidateIndex + 1}Latex`, candidate]
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: DATA_TABLE_ORGANIZE_GENERATOR_ID,
        generatorVersion: DATA_TABLE_ORGANIZE_GENERATOR_VERSION,
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
    !DATA_TABLE_CONTEXT_IDS.includes(variation.contextId as DataTableContextId)
  ) {
    throw new Error(`problem-family-native-variation-invalid:${DATA_TABLE_ORGANIZE_FAMILY_ID}`);
  }
  return generateDataTableOrganizeItems(
    {
      difficulty: "normal",
      problemCount: 2,
      contextId: variation.contextId as DataTableContextId
    },
    seed
  );
}

const defaultProblemParameters = problemParametersSchema.parse({
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
  values: { contextId: "fruit" }
});

function parseProblemParameters(input: ProblemParameters): ProblemParameters {
  const parsed = problemParametersSchema.parse(input);
  const contextId = parsed.values.contextId;
  if (
    parsed.familyId !== DATA_TABLE_ORGANIZE_FAMILY_ID ||
    Object.keys(parsed.values).join(":") !== "contextId" ||
    typeof contextId !== "string" ||
    !DATA_TABLE_CONTEXT_IDS.includes(contextId as DataTableContextId)
  ) {
    throw new Error("data-table-organize-parameters-unsupported");
  }
  return problemParametersSchema.parse({
    ...parsed,
    values: { contextId }
  });
}

export const dataTableOrganizeCapability: ProblemFamilyCapabilityExtension = {
  familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
  recommendedGrade: 2,
  gradeRange: [1, 2],
  defaultProblemCount: 2,
  parameterFields: [
    {
      key: "contextId",
      inputLabel: "자료 맥락",
      control: "select",
      section: "자료 조건",
      options: DATA_TABLE_CONTEXT_IDS.map((value) => ({
        value,
        label: CONTEXTS[value].title
      }))
    }
  ],
  defaultParameters: defaultProblemParameters,
  promptGuards: [
    {
      pattern: "(자료를|표를).{0,10}(직접|새로).{0,8}(수집|만들)",
      message:
        "이 문제군은 등록된 원자료를 표로 정리하고 읽는 활동입니다. 새로운 자료 수집은 지원하지 않습니다."
    }
  ],
  unsupportedParameterPolicy: "clarification-required",
  title: "자료를 표로 정리하고 편리한 점 설명하기",
  scopeNote:
    "등록된 생활 맥락의 원자료를 범주별로 세어 임시 표를 고치고, 표에서 범주별 개수와 차이를 비교하는 활동입니다.",
  parseParameters: parseProblemParameters
};

function requirePreparedRecommendation(
  recommendation: Recommendation
): { problemCount: number; difficulty: "normal"; parameters: ProblemParameters } {
  if (
    recommendation.templateId !== DATA_TABLE_ORGANIZE_FAMILY_ID ||
    recommendation.standardCode !== "[2수04-02]" ||
    recommendation.manipulation !== DATA_TABLE_ORGANIZE_MANIPULATION ||
    recommendation.problemCount !== 2 ||
    recommendation.difficulty !== "normal"
  ) {
    throw new Error(`activity-recommendation-mismatch:${DATA_TABLE_ORGANIZE_FAMILY_ID}`);
  }
  return {
    problemCount: 2,
    difficulty: "normal",
    parameters: parseProblemParameters(
      recommendation.problemParameters ?? defaultProblemParameters
    )
  };
}

function prepare(recommendation: Recommendation, options: GenerateActivitySpecOptions) {
  const prepared = requirePreparedRecommendation(recommendation);
  if (Number.isNaN(Date.parse(options.generatedAt))) throw new Error("generatedAt-invalid");
  const contextId = prepared.parameters.values.contextId as DataTableContextId;
  return {
    blueprint: dataTableOrganizeBlueprint,
    items: generateDataTableOrganizeItems(
      { difficulty: prepared.difficulty, problemCount: prepared.problemCount, contextId },
      options.seed
    ),
    recommendation,
    options: {
      seed: options.seed,
      generatedAt: new Date(options.generatedAt).toISOString(),
      activityId: options.activityId ?? `${DATA_TABLE_ORGANIZE_FAMILY_ID}-${options.seed}`,
      templateVersion: dataTableOrganizeBlueprint.version,
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
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    statements: [
      String(item.values.questionText),
      String(item.values.rawDataText),
      `표 범주: ${(item.values.categories as string[]).join(", ")}`,
      `표 상태: ${item.order === 1 ? "고쳐야 할 표" : "완성한 표"}`,
      `현재 표 개수: ${(item.values.tableValues as number[]).join(", ")}`,
      `선택: ${[1, 2, 3, 4, 5].map((index) => String(item.values[`candidate${index}`])).join(", ")}`
    ]
  }));
}

function appliedProblemParameters(resolved: ResolvedActivity): ProblemParameters | undefined {
  const first = resolved.items[0];
  const contextId = first?.values.contextId;
  if (typeof contextId !== "string") return undefined;
  return parseProblemParameters({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
    values: { contextId }
  });
}

const source: ProblemFamilyRegistrySource = {
  registrationKind: "native-problem-family-module",
  familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
  templateId: DATA_TABLE_ORGANIZE_FAMILY_ID,
  activityId: DATA_TABLE_ORGANIZE_FAMILY_ID,
  standardCode: "[2수04-02]",
  supportedStandardCodes: ["[2수04-02]"],
  gradeBand: "1-2",
  domain: "자료와 가능성",
  learningGoal: dataTableOrganizeBlueprint.learningObjective,
  assessmentTargetIds: [...dataTableAssessmentTargetSet.targetIds],
  manipulation: DATA_TABLE_ORGANIZE_MANIPULATION,
  generator: {
    id: DATA_TABLE_ORGANIZE_GENERATOR_ID,
    version: DATA_TABLE_ORGANIZE_GENERATOR_VERSION
  },
  blueprint: {
    contentHash: dataTableOrganizeBlueprint.contentHash,
    version: dataTableOrganizeBlueprint.version,
    layoutTokenSet: dataTableOrganizeBlueprint.layout.tokenSet
  },
  availableProblemCounts: [2],
  supportedDifficulties: ["normal"],
  supportState: "verified",
  evidencePaths: [
    "packages/templates/src/problem-families/domains/data-probability/data-table-organize.test.ts"
  ]
};

const cognitiveManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: dataTableOrganizeBlueprint.id,
  blueprintVersion: dataTableOrganizeBlueprint.version,
  blueprintContentHash: dataTableOrganizeBlueprint.contentHash,
  mathematicalDecision:
    "학생은 고쳐야 할 표를 원자료와 대조해 범주명과 개수가 결속된 완전한 표 매핑을 선택하고, 세 개수의 합이 전체 자료 수와 같은지 확인한 뒤 표가 범주별 개수와 차이를 비교하기 편리한 까닭을 결정한다.",
  misconceptionConflict:
    "전체 개수를 범주별 개수로 쓰거나 표를 꾸미기일 뿐이라고 생각하는 답을 원자료·표의 실제 개수와 충돌시킨다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    usageSnapshotSha256: LEARNING_MAP_USAGE_SNAPSHOT_SHA256,
    standardCode: "[2수04-02]",
    topicIds: [
      "kr.mt.math.data-probability.g1-2.s2-04-02.representation",
      "kr.mt.math.data-probability.g1-2.s2-04-02.application"
    ],
    prerequisiteTopicIds: [
      "kr.mt.math.data-probability.g1-2.s2-04-02.concept",
      "kr.mt.math.data-probability.g1-2.s2-04-02.representation"
    ],
    observableEvidence: [
      "[2수04-02] 자료의 정리 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
      "자신의 표현물에서 자료와 가능성 내용과 근거가 드러나는 부분을 찾아 설명한다.",
      "[2수04-02] 자료의 정리 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
      "수행 과정과 결과를 기록하고, [2수04-02] 자료의 정리 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
    ],
    assessmentPrompt:
      "'자료의 정리'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
    caveat:
      "학습지도 저장소는 표현과 선수 관계 설계의 보조 자료이며 공식 교육과정 [2수04-02] 원문을 대신하지 않는다."
  },
  decision: {
    mode: "select-one",
    constraintId: "select-table-answer",
    candidateRoles: [...CHOICE_CARD_ROLES],
    candidateProperty: "text",
    correctValuePath: "correctValueText",
    distractors: [
      {
        predicateKind: "cognitive.release-contract",
        misconception:
          "전체 개수·한 범주의 임시 개수·표의 장식적 모양을 정답으로 고른다."
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "data-representation",
    roles: ["data-table", "raw-data", "prediction-box"],
    invariant:
      "학생이 선택한 완전한 표 매핑의 각 범주 개수는 원자료에서 같은 범주를 센 결과와 같고, 세 개수의 합은 원자료 전체 수와 같으며, 표를 사용하면 범주별 개수와 차이를 빠르게 비교할 수 있다."
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath:
    "다섯 표 답 카드는 계속 움직일 수 있고, 학생은 고쳐야 할 표·원자료·세 개수의 합을 다시 비교한 뒤 범주명과 개수가 결속된 최종 표 매핑 선택과 설명을 고친다.",
  limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
});

export const dataTableOrganizeProblemFamilyModule: ProblemFamilyNativeModule = {
  source,
  capability: dataTableOrganizeCapability,
  runtime: {
    familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
    blueprint: dataTableOrganizeBlueprint,
    prepare,
    supportState: "verified",
    generateItemsForVariation,
    answerKey,
    problemPreviews,
    appliedProblemParameters
  },
  cognitiveManifest,
  variationEnvelope: dataTableOrganizeVariationEnvelope
};
