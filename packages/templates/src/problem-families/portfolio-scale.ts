import {
  MATHCANVAS_PROJECT_CATEGORIES,
  createSeededRandom,
  defineActivityBlueprint,
  defineCognitiveDemandManifest,
  defineVariationEnvelope,
  type ActivityBlueprintBody,
  type Difficulty,
  type Recommendation,
  type ResolvedActivity,
  type ResolvedItem
} from "@mathcanvas/contracts";
import {
  CHOICE_CARD_ROLES,
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "../blueprints/choice-explanation-scaffold.js";
import type {
  GenerateActivitySpecOptions,
  RegisteredProblemPreview,
  RegisteredTeacherAnswer
} from "./runtime-types.js";
import type {
  ProblemFamilyNativeModule,
  ProblemFamilyRegistrySource
} from "./types.js";
import rawData from "./portfolio-scale.generated.json" with { type: "json" };

type PortfolioRenderer =
  | "number-card"
  | "place-value"
  | "fraction"
  | "pattern"
  | "table-graph"
  | "geometry"
  | "clock"
  | "relation-board";

type TargetOutline = Readonly<{
  key: string;
  studentDecision: string;
  invariant: string;
  observableEvidence: string;
  misconceptionClass: string;
}>;

type PortfolioRecord = Readonly<{
  sequence: number;
  workItemId: string;
  standardCode: string;
  standardSlug: string;
  officialGoal: string;
  gradeBand: "1-2" | "3-4" | "5-6";
  domain: "수와 연산" | "변화와 관계" | "도형과 측정" | "자료와 가능성";
  archetypeId: string;
  engineClassIds: readonly string[];
  rendererKind: PortfolioRenderer;
  familyId: string;
  manipulation: string;
  targetOutlines: readonly TargetOutline[];
  learningMap: Readonly<{
    topicId: string;
    prerequisiteTopicIds: readonly string[];
    observableEvidence: readonly string[];
    assessmentPrompt: string;
  }>;
}>;

const data = rawData as unknown as Readonly<{
  source: Readonly<{
    learningMapCommit: string;
    learningMapUsageSha256: string;
  }>;
  standardCount: number;
  targetOutlineCount: number;
  records: readonly PortfolioRecord[];
}>;

const CANDIDATE_ROLES = CHOICE_CARD_ROLES.slice(0, 4);
const INSTRUCTIONS = [
  "① 생각 카드 하나를 골라 ‘내가 고른 생각’ 칸에 놓으세요.",
  "② 오른쪽 수학 자료를 움직이거나 살펴보고 선택과 맞는지 확인하세요.",
  "③ 맞지 않으면 카드를 바꾸고, 확인한 관계를 말로 설명하세요."
] as const;

const scaffold = makeChoiceExplanationScaffoldRoles({
  instructions: INSTRUCTIONS,
  instructionalIntents: [
    "자료를 확인하기 전에 학생 자신의 판단을 먼저 드러냅니다.",
    "엔진별 수학 자료로 선택한 생각을 스스로 확인하게 합니다.",
    "자료와 맞지 않는 생각을 바꾸고 확인 근거를 교사에게 말하게 합니다."
  ],
  questionIntent: "성취기준 목표 윤곽에서 학생이 내려야 할 핵심 판단을 묻습니다.",
  predictionLabel: "내가 고른 생각",
  poolLabel: "생각 카드",
  explanationLabel: "말로 설명할 관계",
  candidateCount: 4,
  centerCandidates: true,
  fontSizes: { instruction: 29, question: 27, label: 24, candidate: 21 }
}).map((role) =>
  CANDIDATE_ROLES.includes(role.role as (typeof CANDIDATE_ROLES)[number])
    ? {
        ...role,
        toolKey: "common.text",
        intentKind: "text" as const,
        properties: { text: "", fontSize: 21, centerInPlacement: true }
      }
    : role
);

const nativeRole = (
  role: string,
  slot: "native-1" | "native-2" | "native-3" | "native-4" | "native-wide-1" | "native-wide-2",
  input: Pick<ActivityBlueprintBody["toolRoles"][number], "toolKey" | "intentKind" | "properties" | "bindings" | "instructionalIntent" | "locked" | "movable">
): ActivityBlueprintBody["toolRoles"][number] => ({
  role,
  scope: "each-item",
  layoutRole: role,
  idRole: role,
  containerRole: "array-panel",
  ...input
});

function nativeRoles(renderer: PortfolioRenderer): ActivityBlueprintBody["toolRoles"] {
  if (renderer === "number-card") {
    return [
      ...[1, 2, 3, 4].map((index) => nativeRole(
        `native-model-${index}`,
        `native-${index}` as "native-1",
        {
          toolKey: "NO04NT",
          intentKind: "number-card",
          locked: false,
          movable: true,
          instructionalIntent: "수 카드를 움직여 수와 관계를 비교합니다.",
          properties: {},
          bindings: { value: `item.nativeValue${index}` }
        }
      )),
      nativeRole("native-target", "native-wide-1", {
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "수 카드를 옮겨 비교할 수 있는 넉넉한 빈 영역입니다.",
        properties: { fill: "#FFFFFF", stroke: "#2F80ED", strokeDashArray: "8 6" },
        bindings: {}
      })
    ];
  }
  if (renderer === "place-value") {
    return [1, 2, 3].map((index) => nativeRole(
      `native-model-${index}`,
      `native-${index}` as "native-1",
      {
        toolKey: "NO04PD",
        intentKind: "place-value-model",
        locked: false,
        movable: true,
        instructionalIntent: "일·십·백 모형을 움직여 자릿값 관계를 확인합니다.",
        properties: {},
        bindings: { value: `item.placeValue${index}` }
      }
    ));
  }
  if (renderer === "fraction") {
    return [
      ...[1, 2].map((index) => nativeRole(
        `native-model-${index}`,
        `native-${index}` as "native-1",
        {
          toolKey: "NO03FM",
          intentKind: "fraction-model",
          locked: false,
          movable: true,
          instructionalIntent: "분수 띠를 같은 출발선에 놓아 전체와 부분을 비교합니다.",
          properties: { color: index === 1 ? "#FFA26C" : "#65F0FF" },
          bindings: { fraction: `item.nativeFraction${index}` }
        }
      )),
      nativeRole("native-target", "native-wide-2", {
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "두 분수 띠를 같은 출발선에 놓아 비교하는 빈 영역입니다.",
        properties: { fill: "#FFFFFF", stroke: "#2F80ED", strokeDashArray: "8 6" },
        bindings: {}
      })
    ];
  }
  if (renderer === "pattern") {
    return [1, 2, 3, 4].map((index) => nativeRole(
      `native-model-${index}`,
      `native-${index}` as "native-1",
      {
        toolKey: "SM02PB",
        intentKind: "pattern-block",
        locked: false,
        movable: true,
        instructionalIntent: "패턴 블록의 모양과 순서를 바꾸어 관계를 확인합니다.",
        properties: {},
        bindings: { variant: `item.patternVariant${index}` }
      }
    ));
  }
  if (renderer === "table-graph") {
    return [nativeRole("native-model-1", "native-wide-1", {
        toolKey: "DP02TG",
        intentKind: "data-table",
        locked: true,
        movable: false,
        instructionalIntent: "범주와 개수를 표로 묶어 비교할 자료를 제공합니다.",
        properties: {},
        bindings: {
          title: "item.nativeTitle",
          categories: "item.nativeCategories",
          values: "item.nativeDataValues",
          categoryAxisName: "item.nativeCategoryAxis",
          valueColumnName: "item.nativeValueColumn"
        }
      })];
  }
  if (renderer === "geometry") {
    return [1, 2, 3].map((index) => nativeRole(
      `native-model-${index}`,
      `native-${index}` as "native-1",
      {
        toolKey: "common.point-line",
        intentKind: "point-line",
        locked: index !== 3,
        movable: index === 3,
        instructionalIntent: "점과 선을 움직여 도형의 방향·각·대응 관계를 확인합니다.",
        properties: {
          geometry: index === 3 ? "angle" : "line",
          ...(index === 1 ? { ray: "base" } : {}),
          ...(index === 2 ? { ray: "turn" } : {}),
          stroke: index === 3 ? "#1677D2" : "#5E6473"
        },
        bindings: { angleDegrees: `item.geometryAngle${index}` }
      }
    ));
  }
  if (renderer === "clock") {
    return [nativeRole("native-model-1", "native-wide-1", {
      toolKey: "SM02AD",
      intentKind: "analog-clock",
      locked: false,
      movable: true,
      instructionalIntent: "긴바늘과 짧은바늘의 연결을 움직여 시각 관계를 확인합니다.",
      properties: { clockType: "geared", isWorking: false },
      bindings: { hours: "item.nativeHour", minutes: "item.nativeMinute" }
    })];
  }
  return [];
}

function nativeRoleNames(renderer: PortfolioRenderer): string[] {
  return nativeRoles(renderer).map((role) => role.role);
}

function nativeLayout(renderer: PortfolioRenderer) {
  if (renderer === "number-card") {
    return [
      ...[1, 2, 3, 4].map((index) =>
        layoutBlock(
          `native-model-${index}`,
          "slot",
          `item.native-source-${index}`,
          "each-item"
        )
      ),
      layoutBlock(
        "native-target",
        "slot",
        "item.native-number-target",
        "each-item"
      )
    ];
  }
  if (renderer === "fraction") {
    return [
      layoutBlock("native-model-1", "slot", "item.native-1", "each-item"),
      layoutBlock("native-model-2", "slot", "item.native-2", "each-item"),
      layoutBlock("native-target", "slot", "item.native-wide-2", "each-item")
    ];
  }
  if (renderer === "table-graph") {
    return [
      layoutBlock(
        "native-model-1",
        "slot",
        "item.native-table-wide",
        "each-item"
      )
    ];
  }
  return nativeRoles(renderer).map((role, index) => {
    const wide = renderer === "clock";
    return layoutBlock(
      role.role,
      "slot",
      wide ? `item.native-wide-${index + 1}` : `item.native-${index + 1}`,
      "each-item"
    );
  });
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target]!, output[index]!];
  }
  return output;
}

function concise(text: string, maximumLength: number): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  return normalized.length <= maximumLength
    ? normalized
    : `${normalized.slice(0, maximumLength - 1).trimEnd()}…`;
}

function generateItems(record: PortfolioRecord, difficulty: Difficulty, seed: string): ResolvedItem[] {
  if (difficulty !== "normal") {
    throw new RangeError(`portfolio-difficulty-unsupported:${record.familyId}`);
  }
  const random = createSeededRandom(`${seed}:${record.familyId}`);
  return record.targetOutlines.map((target, index) => {
    const candidates = shuffle([
      "자료의 관계·단위·전체 조건이 모두 맞는다.",
      "눈에 보이는 수 하나만 같으면 모두 맞는다.",
      "단위나 순서는 달라도 결과만 같으면 된다.",
      "처음 생각은 자료와 비교하지 않아도 된다."
    ], random);
    return {
      id: `${record.standardSlug}-${target.key}`,
      order: index + 1,
      kind: `portfolio-${record.rendererKind}-diagnostic`,
      values: {
        orderLabel: `${index + 1}번`,
        questionText: `“${concise(target.studentDecision, 24)}”을 확인할 생각은 무엇인가요?`,
        evidenceLabelText: `${record.engineClassIds.join("+")} · ${record.archetypeId} 자료`,
        evidenceText: `확인: ${concise(target.observableEvidence, 24)}`,
        targetDecisionText: target.studentDecision,
        targetEvidenceText: target.observableEvidence,
        correctValueText: "자료의 관계·단위·전체 조건이 모두 맞는다.",
        correctAnswerText: "핵심 조건을 모두 확인한 생각",
        answerExplanation: `${target.invariant} 화면에서는 ${target.observableEvidence}`,
        targetOutlineKey: target.key,
        misconceptionClass: target.misconceptionClass,
        nativeValue1: 1,
        nativeValue2: 3,
        nativeValue3: 5,
        nativeValue4: 7,
        placeValue1: 1,
        placeValue2: 10,
        placeValue3: 100,
        nativeFraction1: { numerator: 1, denominator: 2 },
        nativeFraction2: { numerator: 2, denominator: 3 },
        patternVariant1: 1,
        patternVariant2: 2,
        patternVariant3: 1,
        patternVariant4: 2,
        nativeTitle: "확인 자료",
        nativeCategories: ["가", "나", "다"],
        nativeDataValues: [2, 3, 1],
        nativeCategoryAxis: "범주",
        nativeValueColumn: "개수",
        nativeGridValue: 1,
        nativeGridlineCount: 5,
        nativeValueAxis: "개수",
        nativeValueUnit: "개",
        geometryAngle1: 30,
        geometryAngle2: 90,
        geometryAngle3: 60,
        nativeHour: 3,
        nativeMinute: 30,
        ...Object.fromEntries(
          candidates.flatMap((candidate, candidateIndex) => [
            [`candidate${candidateIndex + 1}`, candidate],
            [`candidate${candidateIndex + 1}Latex`, candidate]
          ])
        ),
        difficulty
      },
      provenance: {
        generatorId: "portfolio.scale.target-outline-items",
        generatorVersion: "1.0.0",
        seed
      }
    };
  });
}

function makeModule(record: PortfolioRecord): ProblemFamilyNativeModule {
  const modelRoles = nativeRoles(record.rendererKind);
  const modelRoleNames = modelRoles.map((role) => role.role);
  const noOverlapModelRoleNames = modelRoleNames.filter(
    (role) => role !== "native-target"
  );
  const blueprint = defineActivityBlueprint({
    schemaVersion: "1.0.0",
    id: record.familyId,
    version: "1.0.0",
    title: `${record.standardCode} 핵심 판단과 자료 확인`,
    learningObjective: `${record.officialGoal}의 ${record.targetOutlines.length}개 목표 윤곽을 자료와 비교해 설명할 수 있다.`,
    curriculumBinding: {
      standardCode: record.standardCode,
      domain: record.domain,
      officialGoal: record.officialGoal
    },
    generator: {
      id: "portfolio.scale.target-outline-items",
      version: "1.0.0",
      parameters: {
        problemCount: record.targetOutlines.length,
        difficulty: "normal",
        rendererKind: record.rendererKind,
        workItemId: record.workItemId
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
        instructionalIntent: "선택한 생각을 자료와 비교하는 확인 영역입니다.",
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
        instructionalIntent: "사용한 엔진 계열과 자료 유형을 알려 줍니다.",
        properties: { text: "", fontSize: 22 },
        bindings: { text: "item.evidenceLabelText" },
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
        instructionalIntent: "화면에서 확인할 수 있는 관찰 증거를 제시합니다.",
        properties: { text: "", fontSize: 20 },
        bindings: { text: "item.evidenceText" },
        containerRole: "array-panel"
      },
      ...modelRoles
    ],
    layout: {
      tokenSet: "portfolio-scale-v1",
      root: {
        id: "canvas",
        kind: "canvas",
        preset: "canvas.root",
        repeat: "once",
        children: [
          ...makeChoiceExplanationScaffoldLayoutChildren(4),
          layoutBlock("array-panel", "slot", "item.array-panel", "each-item"),
          layoutBlock("group-label", "slot", "item.group-label", "each-item"),
          layoutBlock(
            "array-text",
            "slot",
            record.rendererKind === "table-graph"
              ? "item.array-text-table"
              : "item.array-text",
            "each-item"
          ),
          ...nativeLayout(record.rendererKind)
        ]
      }
    },
    constraints: [
      {
        id: "select-portfolio-claim",
        kind: "select-one-of",
        sources: CANDIDATE_ROLES.map((role) => ({ scope: "each-item", role })),
        target: { scope: "each-item", role: "prediction-box" },
        parameters: {},
        requiresStudentAction: true
      },
      ...(record.rendererKind === "number-card"
        ? [{
            id: "move-number-cards-to-evidence-target",
            kind: "fill-from-pool",
            sources: [1, 2, 3, 4].map((index) => ({
              scope: "each-item" as const,
              role: `native-model-${index}`
            })),
            target: { scope: "each-item" as const, role: "native-target" },
            parameters: {},
            requiresStudentAction: true
          }]
        : record.rendererKind === "fraction"
          ? [{
              id: "move-fraction-strips-to-evidence-target",
              kind: "fill-from-pool",
              sources: [1, 2].map((index) => ({
                scope: "each-item" as const,
                role: `native-model-${index}`
              })),
              target: { scope: "each-item" as const, role: "native-target" },
              parameters: {},
              requiresStudentAction: true
            }]
          : [])
    ],
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "select-one",
          decisionConstraintId: "select-portfolio-claim",
          candidateRoles: CANDIDATE_ROLES,
          candidateProperty: "text",
          correctValuePath: "correctValueText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: ["array-panel", "group-label", "array-text", ...modelRoleNames]
        }
      },
      {
        kind: "language.classroom-korean",
        parameters: {
          instructionRoles: ["instruction-predict", "instruction-verify", "instruction-explain"],
          labelRoles: ["prediction-label", "pool-label", "explanation-label", "group-label"],
          promptRoles: ["question"],
          maximumInstructionLength: 74,
          maximumLabelLength: 42
        }
      },
      {
        kind: "visual.text-fit",
        parameters: {
          roles: [
            "instruction-predict", "instruction-verify", "instruction-explain", "question",
            "prediction-label", "pool-label", "explanation-label", "group-label", "array-text",
            ...CANDIDATE_ROLES
          ],
          maximumFillRatio: 0.98
        }
      },
      {
        kind: "visual.labeled-pool-row",
        parameters: {
          labelRole: "pool-label",
          memberRoles: CANDIDATE_ROLES,
          containerRole: "choice-panel",
          rowCenterTolerance: 2,
          gapTolerance: 2,
          groupCenterTolerance: 12,
          labelAlignmentTolerance: 2,
          minimumLabelGap: 12,
          maximumLabelGap: 30
        }
      },
      {
        kind: "visual.no-overlap",
        parameters: {
          roles: [
            "number", "question", "prediction-label", "prediction-box", "pool-label",
            ...CANDIDATE_ROLES, "group-label", "array-text", ...noOverlapModelRoleNames,
            "explanation-label", "explanation-box"
          ]
        }
      }
    ],
    instructions: [...INSTRUCTIONS],
    payload: {
      categoryId: MATHCANVAS_PROJECT_CATEGORIES[record.domain].categoryId,
      tags: [record.standardCode, "97시연", record.rendererKind.slice(0, 12)],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: {
      problemCount: record.targetOutlines.length,
      difficulty: "normal"
    }
  });

  const source: ProblemFamilyRegistrySource = {
    registrationKind: "portfolio-scale-adapter",
    familyId: record.familyId,
    templateId: record.familyId,
    activityId: record.familyId,
    standardCode: record.standardCode,
    supportedStandardCodes: [record.standardCode],
    gradeBand: record.gradeBand,
    domain: record.domain,
    learningGoal: blueprint.learningObjective,
    assessmentTargetIds: [],
    portfolioTargetOutlineKeys: record.targetOutlines.map((target) => target.key),
    engineClassIds: record.engineClassIds,
    manipulation: record.manipulation,
    generator: { id: blueprint.generator.id, version: blueprint.generator.version },
    blueprint: {
      contentHash: blueprint.contentHash,
      version: blueprint.version,
      layoutTokenSet: blueprint.layout.tokenSet
    },
    availableProblemCounts: [record.targetOutlines.length],
    supportedDifficulties: ["normal"],
    supportState: "verified",
    evidencePaths: ["reports/portfolio-scale/latest.json"]
  };

  const cognitiveManifest = defineCognitiveDemandManifest({
    schemaVersion: "1.0.0",
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    blueprintContentHash: blueprint.contentHash,
    mathematicalDecision: `학생은 ${record.targetOutlines.length}개 목표 윤곽마다 자료를 보기 전에 생각을 고르고 ${record.rendererKind} 자료와 비교한다.`,
    misconceptionConflict: "눈에 보이는 수 하나, 결과만 같음, 단위·순서 생략, 자료 미확인 생각을 목표별 관찰 증거와 충돌시킨다.",
    learningMap: {
      repository: "DECK6/korean-elementary-learning-map",
      commit: data.source.learningMapCommit,
      usageSnapshotSha256: data.source.learningMapUsageSha256,
      standardCode: record.standardCode,
      topicIds: [record.learningMap.topicId],
      prerequisiteTopicIds: [...record.learningMap.prerequisiteTopicIds],
      observableEvidence: [...record.learningMap.observableEvidence],
      assessmentPrompt: record.learningMap.assessmentPrompt,
      caveat: `97개 확장 진단 경로는 학습지도와 공식 교육과정 ${record.standardCode}을 연결하지만 정식 숙달 판정을 대신하지 않는다.`
    },
    decision: {
      mode: "select-one",
      constraintId: "select-portfolio-claim",
      candidateRoles: CANDIDATE_ROLES,
      candidateProperty: "text",
      correctValuePath: "correctValueText",
      distractors: [
        {
          predicateKind: "cognitive.release-contract",
          misconception: "자료의 관계·단위·전체 조건 중 일부만 보고도 판단이 맞다고 여긴다."
        }
      ]
    },
    prediction: { regionRole: "prediction-box" },
    verification: {
      kind: record.domain === "자료와 가능성"
        ? "data-representation"
        : record.domain === "도형과 측정"
          ? "coordinate-or-graph"
          : "countable-unit-model",
      roles: ["array-panel", "group-label", "array-text", ...modelRoleNames],
      invariant: "목표에 적힌 관계와 단위·순서·전체 조건을 화면 자료에서 모두 확인한 판단만 유지한다."
    },
    explanation: { regionRole: "explanation-box" },
    revisionPath: "네 생각 카드는 계속 움직일 수 있고 native 자료도 엔진 종류에 따라 움직이거나 비교할 수 있어 자료와 맞지 않으면 선택을 바꿀 수 있다.",
    limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
  });

  const variationEnvelope = defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: record.familyId,
    knobs: [],
    pinned: { problemCount: record.targetOutlines.length, difficulty: "normal" },
    expectedCombinationCount: 1
  });

  const prepare = (recommendation: Recommendation, options: GenerateActivitySpecOptions) => {
    if (
      recommendation.templateId !== record.familyId ||
      recommendation.standardCode !== record.standardCode ||
      recommendation.learningGoal !== blueprint.learningObjective ||
      recommendation.manipulation !== record.manipulation ||
      recommendation.problemCount !== record.targetOutlines.length ||
      recommendation.difficulty !== "normal" ||
      Number.isNaN(Date.parse(options.generatedAt))
    ) {
      throw new Error(`activity-recommendation-mismatch:${record.familyId}`);
    }
    return {
      blueprint,
      items: generateItems(record, "normal", options.seed),
      recommendation,
      options: {
        seed: options.seed,
        generatedAt: new Date(options.generatedAt).toISOString(),
        activityId: options.activityId ?? `${record.familyId}-${options.seed}`,
        templateVersion: blueprint.version,
        variation: { problemCount: record.targetOutlines.length, difficulty: "normal" }
      }
    };
  };

  const answerKey = (resolved: ResolvedActivity): RegisteredTeacherAnswer[] =>
    resolved.items.map((item) => ({
      problemNumber: item.order,
      answer: String(item.values.correctAnswerText),
      explanation: String(item.values.answerExplanation)
    }));

  const problemPreviews = (resolved: ResolvedActivity): RegisteredProblemPreview[] =>
    resolved.items.map((item) => ({
      problemNumber: item.order,
      statements: [
        String(item.values.questionText),
        String(item.values.targetDecisionText),
        String(item.values.evidenceLabelText),
        String(item.values.targetEvidenceText),
        `목표 윤곽: ${String(item.values.targetOutlineKey)}`
      ]
    }));

  return {
    source,
    runtime: {
      familyId: record.familyId,
      blueprint,
      prepare,
      supportState: "verified",
      creationMode: "portfolio-pilot",
      generateItemsForVariation: (variation, seed) => {
        if (
          variation.problemCount !== record.targetOutlines.length ||
          variation.difficulty !== "normal"
        ) {
          throw new Error(`portfolio-variation-invalid:${record.familyId}`);
        }
        return generateItems(record, "normal", seed);
      },
      answerKey,
      problemPreviews
    },
    cognitiveManifest,
    variationEnvelope
  };
}

export const PORTFOLIO_SCALE_PROBLEM_FAMILY_MODULES:
  readonly ProblemFamilyNativeModule[] = data.records.map(makeModule);

export const PORTFOLIO_SCALE_COUNTS = Object.freeze({
  standards: data.standardCount,
  targetOutlines: data.targetOutlineCount,
  renderers: new Set(data.records.map((record) => record.rendererKind)).size
});
