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
import { CLASSIFICATION_ASSESSMENT_TARGET_IDS } from "@mathcanvas/curriculum";
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

export const CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID =
  "data.classification.given-criterion-count-v1" as const;
export const CLASSIFICATION_GIVEN_CRITERION_COUNT_MANIPULATION =
  "classification-count-choice-drag" as const;
export const CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_ID =
  "data.classification.given-criterion-count-items" as const;
export const CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_VERSION =
  "1.0.0" as const;

const LEARNING_MAP_USAGE_SNAPSHOT_SHA256 =
  "148d9ae34ddfbd0eed5f3a90b5cde749bb079ae56cf3df8161b6005ba745bb45";
const TOTAL_OBJECT_COUNT = 8;

export const CLASSIFICATION_SET_IDS = [
  "round-shape",
  "writing-tools",
  "vehicles",
  "food"
] as const;
export type ClassificationSetId =
  (typeof CLASSIFICATION_SET_IDS)[number];

export const classificationGivenCriterionCountVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
    knobs: [
      {
        key: "problemCount",
        tier: "T1",
        kind: "bounded-integer",
        min: 1,
        max: 3,
        default: 2
      },
      {
        key: "classificationSetId",
        tier: "T1",
        kind: "enum",
        values: [...CLASSIFICATION_SET_IDS],
        default: "round-shape"
      },
      {
        key: "matchingCount",
        tier: "T2",
        kind: "bounded-integer",
        min: 2,
        max: 6,
        default: 4
      }
    ],
    pinned: { difficulty: "normal" },
    expectedCombinationCount: 60
  });

type ClassificationSet = Readonly<{
  criterion: string;
  questionNoun: string;
  matching: readonly string[];
  nonmatching: readonly string[];
}>;

const CLASSIFICATION_SETS: Readonly<
  Record<ClassificationSetId, ClassificationSet>
> = {
  "round-shape": {
    criterion: "둥근 모양",
    questionNoun: "둥근 모양인 물건",
    matching: ["공", "시계", "동전", "접시", "바퀴", "단추", "구슬", "고리"],
    nonmatching: ["책", "상자", "액자", "수첩", "문", "자", "칠판", "블록"]
  },
  "writing-tools": {
    criterion: "글씨 쓰는 도구",
    questionNoun: "글씨를 쓰는 도구",
    matching: ["연필", "색연필", "볼펜", "사인펜", "분필", "붓", "만년필", "마커"],
    nonmatching: ["지우개", "자", "공책", "가위", "풀", "책", "필통", "클립"]
  },
  vehicles: {
    criterion: "탈것",
    questionNoun: "탈것",
    matching: ["버스", "자전거", "기차", "배", "자동차", "비행기", "트럭", "지하철"],
    nonmatching: ["의자", "책", "사과", "우산", "시계", "연필", "모자", "컵"]
  },
  food: {
    criterion: "먹거나 마시는 것",
    questionNoun: "먹거나 마실 수 있는 것",
    matching: ["사과", "우유", "빵", "포도", "밥", "물", "딸기", "달걀"],
    nonmatching: ["연필", "자", "책", "가위", "양말", "우산", "시계", "공"]
  }
};

const instructions = [
  "① 기준에 맞는 사물 수를 골라 놓으세요.",
  "② 물건 이름을 하나씩 확인하고 기준에 맞는 것만 세어 보세요.",
  "③ 처음 고른 수를 바꿀 수 있고, 분류 기준과 맞는 물건 이름·개수를 쓰세요."
] as const;

const scaffold = makeChoiceExplanationScaffoldRoles({
  instructions,
  instructionalIntents: [
    "분류하기 전에 기준에 맞는 사물의 개수를 결정하게 합니다.",
    "모든 사물에 같은 기준을 적용해 선택한 개수를 확인하게 합니다.",
    "기준에 맞는 사물 이름과 개수를 남겨 선택을 설명하고 고치게 합니다."
  ],
  questionIntent:
    "섞여 있는 사물 중 한 가지 분류 기준에 맞는 사물의 개수를 묻습니다.",
  predictionLabel: "내가 고른 개수",
  poolLabel: "고를 수 있는 개수",
  explanationLabel: "분류 기준·물건·개수",
  centerCandidates: true
});

export const classificationGivenCriterionCountBlueprint =
  defineActivityBlueprint(
    withStudentScreenQuality(
      {
        schemaVersion: "1.0.0",
        id: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
        version: "1.0.0",
        title: "기준에 맞는 사물을 분류해 개수 세기",
        learningObjective:
          "주어진 기준에 맞는 사물을 구분하여 빠짐없이 세고, 기준과 개수를 함께 설명할 수 있다.",
        curriculumBinding: {
          standardCode: "[2수04-01]",
          domain: "자료와 가능성",
          officialGoal:
            "여러 가지 사물을 정해진 기준 또는 자신이 정한 기준으로 분류하여 개수를 세어 보고, 기준에 따른 결과를 말할 수 있다."
        },
        generator: {
          id: CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_ID,
          version: CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_VERSION,
          parameters: {
            problemCount: 2,
            difficulty: "normal",
            classificationSetId: "round-shape",
            matchingCount: 4
          }
        },
        toolRoles: [
          ...scaffold,
          {
            role: "array-panel",
            scope: "each-item",
            layoutRole: "array-panel",
            idRole: "array-panel",
            toolKey: "common.rectangle",
            intentKind: "draw-rectangle",
            locked: true,
            movable: false,
            instructionalIntent:
              "분류 기준과 섞인 사물 목록을 같은 확인 영역에 묶습니다.",
            properties: { fill: "#F5FBFF", stroke: "#4AA9D8" },
            bindings: {},
            containerRole: "work-panel"
          },
          {
            role: "group-label",
            scope: "each-item",
            layoutRole: "group-label",
            idRole: "group-label",
            toolKey: "common.text",
            intentKind: "text",
            locked: true,
            movable: false,
            instructionalIntent:
              "모든 사물에 똑같이 적용할 분류 기준을 알려 줍니다.",
            properties: { text: "", fontSize: 25 },
            bindings: { text: "item.criterionLabelText" },
            containerRole: "array-panel"
          },
          {
            role: "array-text",
            scope: "each-item",
            layoutRole: "array-text",
            idRole: "array-text",
            toolKey: "common.text",
            intentKind: "text",
            locked: true,
            movable: false,
            instructionalIntent:
              "기준에 맞는 것과 맞지 않는 것이 섞인 여덟 사물을 빠짐없이 보여 줍니다.",
            properties: { text: "", fontSize: 24 },
            bindings: { text: "item.objectListText" },
            containerRole: "array-panel"
          }
        ],
        layout: {
          tokenSet: "wave17-multiplication-array-v1",
          root: {
            id: "canvas",
            kind: "canvas",
            preset: "canvas.root",
            repeat: "once",
            children: [
              ...makeChoiceExplanationScaffoldLayoutChildren(),
              layoutBlock("array-panel", "slot", "item.array-panel", "each-item"),
              layoutBlock("group-label", "slot", "item.group-label", "each-item"),
              layoutBlock("array-text", "slot", "item.array-text", "each-item")
            ]
          }
        },
        constraints: [
          {
            id: "select-matching-count",
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
              decisionConstraintId: "select-matching-count",
              candidateRoles: CHOICE_CARD_ROLES,
              candidateProperty: "text",
              correctValuePath: "correctValueText",
              predictionRole: "prediction-box",
              explanationRole: "explanation-box",
              verificationRoles: ["array-panel", "group-label", "array-text"]
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
                "explanation-label",
                "group-label"
              ],
              promptRoles: ["question"],
              maximumInstructionLength: 72,
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
                "group-label",
                "array-text"
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
                "group-label",
                "array-text",
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
          categoryId:
            MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"].categoryId,
          tags: ["분류하기", "개수 세기", "분류 기준", "생각 고치기"],
          studyLevel: "elementary",
          isShowMenuOnActivity: true
        },
        variationDefaults: {
          problemCount: 2,
          difficulty: "normal",
          classificationSetId: "round-shape",
          matchingCount: 4
        }
      },
      {
        compactGlyphRoles: ["array-text"],
        compactGlyphMinimumFontSize: 30
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

function rotatedSlice<T>(
  values: readonly T[],
  count: number,
  offset: number
): T[] {
  return Array.from(
    { length: count },
    (_, index) => values[(offset + index) % values.length]!
  );
}

export function classificationCountCandidateValues(
  matchingCount: number
): number[] {
  const ideas = [
    matchingCount,
    TOTAL_OBJECT_COUNT,
    TOTAL_OBJECT_COUNT - matchingCount,
    matchingCount - 1,
    matchingCount + 1,
    matchingCount - 2,
    matchingCount + 2,
    1,
    7
  ];
  const candidates = [
    ...new Set(
      ideas.filter(
        (value) =>
          Number.isInteger(value) && value >= 1 && value <= TOTAL_OBJECT_COUNT
      )
    )
  ].slice(0, 5);
  if (candidates.length !== 5 || !candidates.includes(matchingCount)) {
    throw new Error("classification-count-candidate-capacity-invalid");
  }
  return candidates;
}

export function generateClassificationGivenCriterionCountItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly classificationSetId: ClassificationSetId;
    readonly matchingCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    !Number.isInteger(parameters.problemCount) ||
    parameters.problemCount < 1 ||
    parameters.problemCount > 3 ||
    !CLASSIFICATION_SET_IDS.includes(parameters.classificationSetId) ||
    !Number.isInteger(parameters.matchingCount) ||
    parameters.matchingCount < 2 ||
    parameters.matchingCount > 6
  ) {
    throw new RangeError(
      "분류 활동은 기본 난이도, 1~3문항, 기준에 맞는 사물 2~6개를 지원합니다."
    );
  }
  const definition = CLASSIFICATION_SETS[parameters.classificationSetId];
  const random = createSeededRandom(
    `${seed}:classification-given-criterion-count:${parameters.classificationSetId}:${parameters.matchingCount}`
  );
  const matchingPool = shuffle(definition.matching, random);
  const nonmatchingPool = shuffle(definition.nonmatching, random);
  const candidateNumbers = classificationCountCandidateValues(
    parameters.matchingCount
  );

  return Array.from({ length: parameters.problemCount }, (_, index) => {
    const matchingObjects = rotatedSlice(
      matchingPool,
      parameters.matchingCount,
      index
    );
    const nonmatchingObjects = rotatedSlice(
      nonmatchingPool,
      TOTAL_OBJECT_COUNT - parameters.matchingCount,
      index
    );
    const objects = shuffle(
      [...matchingObjects, ...nonmatchingObjects],
      random
    );
    const candidates = shuffle(candidateNumbers, random);
    const latexCandidates = candidates.map(String);
    const objectListText = [
      objects.slice(0, 4).join("  ·  "),
      objects.slice(4).join("  ·  ")
    ].join("\n");
    return {
      id: `classification-given-criterion-count-${index + 1}`,
      order: index + 1,
      kind: "classification-given-criterion-count-choice",
      values: {
        orderLabel: `${index + 1}번`,
        questionText: `다음 물건 중 ${definition.questionNoun}은 몇 개인가요?`,
        criterionLabelText: `기준: ${definition.criterion}`,
        objectListText,
        objects,
        matchingObjects,
        nonmatchingObjects,
        classificationSetId: parameters.classificationSetId,
        matchingCount: parameters.matchingCount,
        totalObjectCount: TOTAL_OBJECT_COUNT,
        correctValueText: String(parameters.matchingCount),
        correctAnswerText: `${parameters.matchingCount}개`,
        answerExplanation:
          `${definition.questionNoun}에 맞는 것은 ${matchingObjects.join(", ")}로 모두 ` +
          `${parameters.matchingCount}개입니다. 나머지 ${nonmatchingObjects.length}개와 ` +
          `전체 ${TOTAL_OBJECT_COUNT}개를 답하지 않도록 같은 기준으로 하나씩 셉니다.`,
        misconceptionIds: [
          "data.classification.count-all-v1",
          "data.classification.criterion-reversal-v1",
          "data.classification.omit-or-double-count-v1"
        ],
        ...Object.fromEntries(
          candidates.flatMap((value, candidateIndex) => [
            [`candidate${candidateIndex + 1}`, `${value}개`],
            [`candidate${candidateIndex + 1}Latex`, latexCandidates[candidateIndex]!]
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_ID,
        generatorVersion:
          CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_VERSION,
        seed
      }
    };
  });
}

function generateItemsForVariation(
  variation: Readonly<Record<string, unknown>>,
  seed: string
): ResolvedItem[] {
  const problemCount = variation.problemCount;
  const difficulty = variation.difficulty;
  const classificationSetId = variation.classificationSetId;
  const matchingCount = variation.matchingCount;
  if (
    typeof problemCount !== "number" ||
    difficulty !== "normal" ||
    typeof classificationSetId !== "string" ||
    !CLASSIFICATION_SET_IDS.includes(
      classificationSetId as ClassificationSetId
    ) ||
    typeof matchingCount !== "number"
  ) {
    throw new Error(
      `problem-family-native-variation-invalid:${CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID}`
    );
  }
  return generateClassificationGivenCriterionCountItems(
    {
      problemCount,
      difficulty,
      classificationSetId: classificationSetId as ClassificationSetId,
      matchingCount
    },
    seed
  );
}

const defaultProblemParameters = problemParametersSchema.parse({
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
  values: {
    classificationSetId: "round-shape",
    matchingCount: 4
  }
});

function parseProblemParameters(input: ProblemParameters): ProblemParameters {
  const parsed = problemParametersSchema.parse(input);
  const keys = Object.keys(parsed.values).sort();
  const classificationSetId = parsed.values.classificationSetId;
  const matchingCount = parsed.values.matchingCount;
  if (
    parsed.familyId !== CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID ||
    JSON.stringify(keys) !==
      JSON.stringify(["classificationSetId", "matchingCount"]) ||
    typeof classificationSetId !== "string" ||
    !CLASSIFICATION_SET_IDS.includes(
      classificationSetId as ClassificationSetId
    ) ||
    typeof matchingCount !== "number" ||
    !Number.isInteger(matchingCount) ||
    matchingCount < 2 ||
    matchingCount > 6
  ) {
    throw new Error("classification-problem-parameters-unsupported");
  }
  return problemParametersSchema.parse({
    ...parsed,
    values: { classificationSetId, matchingCount }
  });
}

export const classificationGivenCriterionCountCapability:
  ProblemFamilyCapabilityExtension = {
  familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
  recommendedGrade: 2,
  gradeRange: [1, 2],
  defaultProblemCount: 2,
  parameterFields: [
    {
      key: "classificationSetId",
      inputLabel: "분류할 사물과 기준",
      control: "select",
      section: "분류 조건",
      options: [
        { value: "round-shape", label: "둥근 모양 찾기" },
        { value: "writing-tools", label: "글씨 쓰는 도구 찾기" },
        { value: "vehicles", label: "탈것 찾기" },
        { value: "food", label: "먹거나 마실 것 찾기" }
      ]
    },
    {
      key: "matchingCount",
      inputLabel: "기준에 맞는 사물 수",
      control: "number",
      section: "분류 조건",
      unit: "개",
      min: 2,
      max: 6
    }
  ],
  defaultParameters: defaultProblemParameters,
  promptGuards: [
    {
      pattern: "(자신|스스로|직접).{0,8}(정한|정하는|만든).{0,5}기준",
      message:
        "이 문제군은 주어진 기준으로 분류하는 활동만 지원합니다. 학생이 기준을 스스로 정하는 목표는 아직 별도 문제군이 필요합니다."
    },
    {
      pattern: "(표|그래프).{0,8}(나타내|그리|작성)",
      message:
        "이 문제군은 분류와 개수 세기까지 지원합니다. 표나 그래프로 나타내기는 [2수04-02]·[2수04-03] 문제군에서 다뤄야 합니다."
    }
  ],
  unsupportedParameterPolicy: "clarification-required",
  title: "주어진 기준으로 사물을 분류해 개수 세기",
  scopeNote:
    "여덟 사물 중 주어진 한 가지 기준에 맞는 사물 2~6개를 구분해 세고 결과를 설명합니다. 학생이 분류 기준을 스스로 정하는 목표는 지원하지 않습니다.",
  parseParameters: parseProblemParameters
};

function requirePreparedRecommendation(
  recommendation: Recommendation
): {
  problemCount: number;
  difficulty: "normal";
  parameters: ProblemParameters;
} {
  if (
    recommendation.templateId !==
      CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID ||
    recommendation.standardCode !== "[2수04-01]" ||
    recommendation.learningGoal !==
      classificationGivenCriterionCountBlueprint.learningObjective ||
    recommendation.manipulation !==
      CLASSIFICATION_GIVEN_CRITERION_COUNT_MANIPULATION ||
    recommendation.curriculum === undefined ||
    recommendation.problemCount === undefined ||
    ![1, 2, 3].includes(recommendation.problemCount) ||
    recommendation.difficulty !== "normal"
  ) {
    throw new Error(
      `activity-recommendation-mismatch:${CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID}`
    );
  }
  return {
    problemCount: recommendation.problemCount,
    difficulty: recommendation.difficulty,
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
  const classificationSetId = prepared.parameters.values
    .classificationSetId as ClassificationSetId;
  const matchingCount = prepared.parameters.values.matchingCount as number;
  return {
    blueprint: classificationGivenCriterionCountBlueprint,
    items: generateClassificationGivenCriterionCountItems(
      {
        difficulty: prepared.difficulty,
        problemCount: prepared.problemCount,
        classificationSetId,
        matchingCount
      },
      options.seed
    ),
    recommendation,
    options: {
      seed: options.seed,
      generatedAt: new Date(options.generatedAt).toISOString(),
      activityId:
        options.activityId ??
        `${CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID}-${options.seed}`,
      templateVersion: classificationGivenCriterionCountBlueprint.version,
      variation: {
        problemCount: prepared.problemCount,
        difficulty: prepared.difficulty,
        classificationSetId,
        matchingCount
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
  return resolved.items.map((item) => ({
    problemNumber: item.order,
    statements: [
      String(item.values.questionText),
      String(item.values.criterionLabelText),
      `사물: ${String(item.values.objectListText).replaceAll("\n", " / ")}`,
      `선택: ${[1, 2, 3, 4, 5]
        .map((index) => String(item.values[`candidate${index}`]))
        .join(", ")}`
    ]
  }));
}

function appliedProblemParameters(
  resolved: ResolvedActivity
): ProblemParameters | undefined {
  const first = resolved.items[0];
  if (!first) return undefined;
  const classificationSetId = first.values.classificationSetId;
  const matchingCount = first.values.matchingCount;
  if (
    typeof classificationSetId !== "string" ||
    typeof matchingCount !== "number" ||
    resolved.items.some(
      (item) =>
        item.values.classificationSetId !== classificationSetId ||
        item.values.matchingCount !== matchingCount
    )
  ) {
    return undefined;
  }
  return parseProblemParameters({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
    values: { classificationSetId, matchingCount }
  });
}

const source: ProblemFamilyRegistrySource = {
  registrationKind: "native-problem-family-module",
  familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
  templateId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
  activityId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
  standardCode: "[2수04-01]",
  supportedStandardCodes: ["[2수04-01]"],
  gradeBand: "1-2",
  domain: "자료와 가능성",
  learningGoal: classificationGivenCriterionCountBlueprint.learningObjective,
  assessmentTargetIds: [
    CLASSIFICATION_ASSESSMENT_TARGET_IDS.givenCriterion,
    CLASSIFICATION_ASSESSMENT_TARGET_IDS.countByClass,
    CLASSIFICATION_ASSESSMENT_TARGET_IDS.describeResult
  ],
  manipulation: CLASSIFICATION_GIVEN_CRITERION_COUNT_MANIPULATION,
  generator: {
    id: CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_ID,
    version: CLASSIFICATION_GIVEN_CRITERION_COUNT_GENERATOR_VERSION
  },
  blueprint: {
    contentHash: classificationGivenCriterionCountBlueprint.contentHash,
    version: classificationGivenCriterionCountBlueprint.version,
    layoutTokenSet: classificationGivenCriterionCountBlueprint.layout.tokenSet
  },
  availableProblemCounts: [1, 2, 3],
  supportedDifficulties: ["normal"],
  supportState: "verified",
  evidencePaths: [
    "packages/templates/src/problem-families/domains/data-probability/classification-given-criterion-count.test.ts"
  ]
};

const cognitiveManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: classificationGivenCriterionCountBlueprint.id,
  blueprintVersion: classificationGivenCriterionCountBlueprint.version,
  blueprintContentHash: classificationGivenCriterionCountBlueprint.contentHash,
  mathematicalDecision:
    "학생은 섞여 있는 여덟 사물에 같은 기준을 적용해 기준에 맞는 사물이 어느 것이며 모두 몇 개인지 결정한다.",
  misconceptionConflict:
    "제시된 모든 사물을 세거나 기준 반대편 사물을 택한 생각을, 분류 기준에 맞는 사물 이름과 개수를 함께 남긴 결과와 충돌시킨다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    usageSnapshotSha256: LEARNING_MAP_USAGE_SNAPSHOT_SHA256,
    standardCode: "[2수04-01]",
    topicIds: [
      "kr.mt.math.data-probability.g1-2.s2-04-01.representation"
    ],
    prerequisiteTopicIds: [
      "kr.mt.math.data-probability.g1-2.s2-04-01.concept"
    ],
    observableEvidence: [
      "[2수04-01] 자료의 정리 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
      "자신의 표현물에서 자료와 가능성 내용과 근거가 드러나는 부분을 찾아 설명한다."
    ],
    assessmentPrompt:
      "'자료의 정리'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
    caveat:
      "학습지도 저장소는 표현과 선수 관계 설계의 보조 자료이며 공식 교육과정 [2수04-01] 원문을 대신하지 않는다."
  },
  decision: {
    mode: "select-one",
    constraintId: "select-matching-count",
    candidateRoles: [...CHOICE_CARD_ROLES],
    candidateProperty: "text",
    correctValuePath: "correctValueText",
    distractors: [
      {
        predicateKind: "cognitive.release-contract",
        misconception:
          "기준에 맞는 사물만 세지 않고 전체, 반대편, 하나 빠뜨리거나 더 센 개수를 고른다."
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "data-representation",
    roles: ["array-panel", "group-label", "array-text"],
    invariant:
      "같은 분류 기준을 모든 사물에 적용하고 기준에 맞는 사물만 빠짐없이 한 번씩 세어야 한다."
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath:
    "다섯 개수 카드는 계속 움직일 수 있어, 사물 목록을 다시 살펴 센 개수가 다르면 선택을 바꾸고 분류 기준·사물 이름·개수를 다시 남길 수 있다.",
  limitations: {
    autoGrading: "none-by-design",
    phaseOrder: "teacher-guided"
  }
});

export const classificationGivenCriterionCountProblemFamilyModule:
  ProblemFamilyNativeModule = {
  source,
  capability: classificationGivenCriterionCountCapability,
  runtime: {
    familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
    blueprint: classificationGivenCriterionCountBlueprint,
    prepare,
    supportState: "verified",
    generateItemsForVariation,
    answerKey,
    problemPreviews,
    appliedProblemParameters
  },
  cognitiveManifest,
  variationEnvelope: classificationGivenCriterionCountVariationEnvelope
};
