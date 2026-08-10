import {
  ACTIVITY_IDS,
  ACTIVITY_LEARNING_GOALS,
  CONTRACT_SCHEMA_VERSION,
  VERIFIED_TEMPLATE_ID,
  generationRequestSchema,
  getActivitySupportState,
  getTeacherIntentCapability,
  recommendationSchema,
  type GenerationRequest,
  type Recommendation
} from "@mathcanvas/contracts";
import {
  CLAIM_EVIDENCE_MANIPULATION,
  FACTOR_PAIR_MANIPULATION,
  PARTIAL_OPERATION_MANIPULATION,
  factorPairActivityProfile,
  findClaimEvidenceActivityProfile,
  findPartialOperationActivityProfile,
  partialOperationActivityProfiles,
  resolveCurriculum
} from "@mathcanvas/curriculum";

export {
  planWorksheetV2,
  planWorksheetV2ForContractLab,
  resolveWorksheetCatalogEntry,
  WorksheetV2PlanningError,
  type WorksheetV2Surface
} from "./v2.js";

const supportedIntentPatterns = [
  /분모가\s*다른/,
  /서로\s*다른\s*분모/,
  /이분모/,
  /unlike[-\s]?denominator/i
];
const comparisonPatterns = [/크기/, /비교/, /더\s*(큰|작은)/, /compare/i];
const fractionPatterns = [/분수/, /fraction/i];
const equivalentFractionPatterns = [
  /동치\s*분수/,
  /크기가\s*같은\s*분수/,
  /약분/,
  /통분/,
  /equivalent\s*fraction/i
];
const makeTenPatterns = [
  /10\s*(을|를)?\s*만들/,
  /가르기와\s*모으기/,
  /수\s*카드.*10/,
  /number\s*bond/i
];
const balancedEquationPatterns = [
  /등호/,
  /동치\s*관계/,
  /양쪽.*(같|같게)/,
  /equal\s*sign/i
];
const balanceScalePatterns = [
  /접시\s*저울/,
  /양팔\s*저울/,
  /balance\s*scale/i
];
const clockPatterns = [
  /시계/,
  /시각/,
  /긴바늘/,
  /짧은바늘/,
  /clock/i
];
const elapsedTimePatterns = [
  /걸린\s*시간/,
  /경과\s*시간/,
  /몇\s*분\s*걸/,
  /1시간.*60분/,
  /elapsed\s*time/i
];
const sameDenominatorFractionSumPatterns = [
  /분모가\s*같은.*(덧셈|더하|합)/,
  /같은\s*분모.*(덧셈|더하|합)/,
  /동분모.*(덧셈|더하|합)/,
  /same[-\s]?denominator.*(add|sum)/i
];
const unlikeDenominatorFractionSumPatterns = [
  /분모가\s*다른.*(덧셈|더하|합)/,
  /이분모.*(덧셈|더하|합)/,
  /통분.*(덧셈|더하|합)/,
  /unlike[-\s]?denominator.*(add|sum)/i
];
const unlikeDenominatorFractionDifferencePatterns = [
  /분모가\s*다른.*(뺄셈|빼|차)/,
  /이분모.*(뺄셈|빼|차)/,
  /통분.*(뺄셈|빼|차)/,
  /unlike[-\s]?denominator.*(subtract|difference)/i
];
const sameDenominatorImproperSumPatterns = [
  /가분수/,
  /1보다\s*큰/,
  /1을?\s*넘/,
  /improper/i
];
const barGraphScalePatterns = [
  /막대\s*그래프/,
  /막대그래프/,
  /눈금.*막대/,
  /그래프.*눈금/,
  /bar\s*graph/i
];
const lengthUnitIterationPatterns = [
  /길이.*(재|측정)/,
  /(자로|자를|자와|자의|자에|자에서|눈금자).*(길이|cm|센티미터)/,
  /(길이|cm|센티미터).*(자로|자를|자의|눈금자)/,
  /1\s*cm.*(반복|옮겨|재)/i,
  /눈금.*(시작|끝).*길이/,
  /broken\s*ruler/i,
  /measure.*length/i
];
const placeValueTenExchangePatterns = [
  /자릿값/,
  /십\s*모형.*10\s*개/,
  /백\s*모형.*(바꾸|교환)/,
  /10\s*개씩\s*묶/,
  /place\s*value/i,
  /regroup/i
];
const repeatingPatternPatterns = [/규칙\s*찾기/, /반복\s*(무늬|단위)/, /패턴\s*블록/, /repeat(?:ing)?\s*pattern/i];
const multiplicationMeaningPatterns = [/곱셈.*(묶|배열|의미)/, /같은\s*수씩\s*묶/, /multiplication.*(array|group)/i];
const probabilityComparisonPatterns = [/가능성.*(비교|큰|작은)/, /(주머니|공).*(나올|뽑).*(가능성|확률)/, /probability.*compar/i];
const factorPairPatterns = [
  /약수쌍/,
  /약수.*(배열|직사각형|곱셈식)/,
  /(factor|divisor).*(array|pair)/i
];
const partialProductPatterns = [
  /부분곱/,
  /곱셈.*(나누어|분해|계산 원리)/,
  /(partial product|distributive multiplication)/i
];
const partialQuotientPatterns = [
  /부분몫/,
  /나눗셈.*(나누어|분해|계산 원리|똑같이)/,
  /(partial quotient|decompos.*division)/i
];

function verifiedCandidate(request: GenerationRequest):
  | {
      templateId: string;
      standardCode: string;
      manipulation: NonNullable<Recommendation["manipulation"]>;
      grade: number;
      gradeRange: readonly [number, number];
      maximumProblemCount: number;
    }
  | undefined {
  if (
    request.manipulation === CLAIM_EVIDENCE_MANIPULATION ||
    request.manipulation === FACTOR_PAIR_MANIPULATION ||
    request.manipulation === PARTIAL_OPERATION_MANIPULATION ||
    request.requestedStandardCode !== undefined
  ) {
    // 한 성취기준을 여러 계열이 함께 주장할 수 있다(예: [4수04-01]은
    // 막대그래프 활동과 그림그래프 주장-검증 활동이 함께 쓴다).
    // 요청이 조작 방식을 지정했다면 그 계열에만 라우팅한다. 그러지 않으면
    // 출시된 활동 요청이 아직 출시되지 않은 다른 계열로 끌려가 막힌다.
    const profile =
      request.requestedStandardCode &&
      (request.manipulation === undefined ||
        request.manipulation === CLAIM_EVIDENCE_MANIPULATION)
        ? findClaimEvidenceActivityProfile(request.requestedStandardCode)
        : undefined;
    if (profile) {
      return {
        templateId: profile.activityId,
        standardCode: profile.standardCode,
        manipulation: CLAIM_EVIDENCE_MANIPULATION,
        grade: profile.recommendedGrade,
        gradeRange:
          profile.gradeBand === "3-4" ? [3, 4] : [5, 6],
        maximumProblemCount: 2
      };
    }
    const partialOperationProfile =
      request.requestedStandardCode &&
      (request.manipulation === undefined ||
        request.manipulation === PARTIAL_OPERATION_MANIPULATION)
      ? findPartialOperationActivityProfile(
          request.requestedStandardCode
        )
      : request.manipulation === PARTIAL_OPERATION_MANIPULATION
        ? partialOperationActivityProfiles.find((candidate) =>
            candidate.operationKind ===
            (partialQuotientPatterns.some((pattern) =>
              pattern.test(request.prompt)
            )
              ? "divide"
              : "multiply")
          )
        : undefined;
    if (partialOperationProfile) {
      return {
        templateId: partialOperationProfile.activityId,
        standardCode: partialOperationProfile.standardCode,
        manipulation: PARTIAL_OPERATION_MANIPULATION,
        grade: partialOperationProfile.recommendedGrade,
        gradeRange: [3, 4],
        maximumProblemCount: 2
      };
    }
    if (
      request.manipulation === FACTOR_PAIR_MANIPULATION ||
      (request.manipulation === undefined &&
        request.requestedStandardCode ===
          factorPairActivityProfile.standardCode)
    ) {
      return {
        templateId: factorPairActivityProfile.activityId,
        standardCode: factorPairActivityProfile.standardCode,
        manipulation: FACTOR_PAIR_MANIPULATION,
        grade: factorPairActivityProfile.recommendedGrade,
        gradeRange: [5, 6],
        maximumProblemCount: 2
      };
    }
    // 위 세 계열(주장-검증, 약수쌍, 부분곱·부분몫)은 프로필로만 라우팅한다.
    // 그 밖의 요청은 requestedStandardCode가 있더라도 여기서 끊지 않고
    // 아래 등록 활동 라우팅을 그대로 이어간다. 여기서 undefined를 돌려주면
    // 교사 화면이 항상 성취기준 코드를 보내므로 등록 활동 대부분이
    // 기본 분수 비교로 잘못 라우팅되거나 지원하지 않음으로 막힌다.
    if (
      request.manipulation === CLAIM_EVIDENCE_MANIPULATION ||
      request.manipulation === FACTOR_PAIR_MANIPULATION ||
      request.manipulation === PARTIAL_OPERATION_MANIPULATION
    ) {
      return undefined;
    }
  }
  if (request.manipulation === "fraction-strip-common-start-drag") {
    return undefined;
  }
  if (
    factorPairPatterns.some((pattern) => pattern.test(request.prompt))
  ) {
    return {
      templateId: factorPairActivityProfile.activityId,
      standardCode: factorPairActivityProfile.standardCode,
      manipulation: FACTOR_PAIR_MANIPULATION,
      grade: factorPairActivityProfile.recommendedGrade,
      gradeRange: [5, 6],
      maximumProblemCount: 2
    };
  }
  const partialOperationProfile = partialOperationActivityProfiles.find(
    (profile) =>
      profile.operationKind === "multiply"
        ? partialProductPatterns.some((pattern) =>
            pattern.test(request.prompt)
          )
        : partialQuotientPatterns.some((pattern) =>
            pattern.test(request.prompt)
          )
  );
  if (partialOperationProfile) {
    return {
      templateId: partialOperationProfile.activityId,
      standardCode: partialOperationProfile.standardCode,
      manipulation: PARTIAL_OPERATION_MANIPULATION,
      grade: partialOperationProfile.recommendedGrade,
      gradeRange: [3, 4],
      maximumProblemCount: 2
    };
  }
  if (
    request.manipulation === "pattern-block-repeat-unit-drag" ||
    repeatingPatternPatterns.some((pattern) => pattern.test(request.prompt))
  ) {
    return { templateId: ACTIVITY_IDS.repeatingPatternUnit, standardCode: "[2수02-01]", manipulation: "pattern-block-repeat-unit-drag", grade: 2, gradeRange: [1, 2], maximumProblemCount: 3 };
  }
  if (
    request.manipulation === "multiplication-array-choice-drag" ||
    multiplicationMeaningPatterns.some((pattern) => pattern.test(request.prompt))
  ) {
    // 3학년 곱셈 단원에서 같은 묶음의 의미를 다시 확인하는 전이·보충
    // 활동으로도 사용한다. 공식 성취기준은 선행 개념 [2수01-10]에
    // 결속하되 실제 프로젝트의 학년 표시는 교사의 요청 학년을 따른다.
    return { templateId: ACTIVITY_IDS.multiplicationArrayMeaning, standardCode: "[2수01-10]", manipulation: "multiplication-array-choice-drag", grade: 2, gradeRange: [1, 3], maximumProblemCount: 3 };
  }
  if (
    request.manipulation === "probability-fraction-strip-drag" ||
    probabilityComparisonPatterns.some((pattern) => pattern.test(request.prompt))
  ) {
    return { templateId: ACTIVITY_IDS.probabilityBagComparison, standardCode: "[6수04-04]", manipulation: "probability-fraction-strip-drag", grade: 6, gradeRange: [5, 6], maximumProblemCount: 4 };
  }
  if (request.manipulation === "length-unit-iteration-drag") {
    return {
      templateId: ACTIVITY_IDS.brokenRulerLength,
      standardCode: "[2수03-10]",
      manipulation: "length-unit-iteration-drag",
      grade: 2,
      gradeRange: [1, 2],
      maximumProblemCount: 3
    };
  }
  if (
    request.manipulation === "place-value-ten-exchange-drag" ||
    placeValueTenExchangePatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.placeValueTenExchange,
      standardCode: "[2수01-02]",
      manipulation: "place-value-ten-exchange-drag",
      grade: 2,
      gradeRange: [1, 2],
      maximumProblemCount: 3
    };
  }
  if (
    request.manipulation === "bar-graph-scale-unit-drag" ||
    barGraphScalePatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.barGraphScaleUnit,
      standardCode: "[4수04-01]",
      manipulation: "bar-graph-scale-unit-drag",
      grade: 4,
      gradeRange: [3, 4],
      maximumProblemCount: 3
    };
  }
  if (
    request.manipulation ===
      "unlike-denominator-common-unit-difference-drag" ||
    unlikeDenominatorFractionDifferencePatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId:
        ACTIVITY_IDS.unlikeDenominatorCommonUnitDifference,
      standardCode: "[6수01-08]",
      manipulation:
        "unlike-denominator-common-unit-difference-drag",
      grade: 5,
      gradeRange: [5, 6],
      maximumProblemCount: 3
    };
  }
  if (
    request.manipulation ===
      "unlike-denominator-common-unit-drag" ||
    unlikeDenominatorFractionSumPatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId:
        ACTIVITY_IDS.unlikeDenominatorCommonUnitSum,
      standardCode: "[6수01-08]",
      manipulation:
        "unlike-denominator-common-unit-drag",
      grade: 5,
      gradeRange: [5, 6],
      maximumProblemCount: 3
    };
  }
  if (
    request.manipulation ===
      "same-denominator-improper-sum-drag" ||
    (sameDenominatorFractionSumPatterns.some((pattern) =>
      pattern.test(request.prompt)
    ) &&
      sameDenominatorImproperSumPatterns.some((pattern) =>
        pattern.test(request.prompt)
      ))
  ) {
    return {
      templateId: ACTIVITY_IDS.sameDenominatorImproperSum,
      standardCode: "[4수01-15]",
      manipulation: "same-denominator-improper-sum-drag",
      grade: 4,
      gradeRange: [3, 4],
      maximumProblemCount: 4
    };
  }
  if (
    request.manipulation ===
      "same-denominator-fraction-sum-drag" ||
    sameDenominatorFractionSumPatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.sameDenominatorFractionSum,
      standardCode: "[4수01-15]",
      manipulation: "same-denominator-fraction-sum-drag",
      grade: 4,
      gradeRange: [3, 4],
      maximumProblemCount: 4
    };
  }
  if (
    lengthUnitIterationPatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.brokenRulerLength,
      standardCode: "[2수03-10]",
      manipulation: "length-unit-iteration-drag",
      grade: 2,
      gradeRange: [1, 2],
      maximumProblemCount: 3
    };
  }
  if (
    request.manipulation === "elapsed-time-clock-pair-drag" ||
    elapsedTimePatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.elapsedTimeClockPair,
      standardCode: "[2수03-08]",
      manipulation: "elapsed-time-clock-pair-drag",
      grade: 2,
      gradeRange: [1, 2],
      maximumProblemCount: 4
    };
  }
  if (
    request.manipulation === "clock-hour-hand-boundary-drag" ||
    clockPatterns.some((pattern) => pattern.test(request.prompt))
  ) {
    return {
      templateId: ACTIVITY_IDS.clockHourHandBoundary,
      standardCode: "[2수03-07]",
      manipulation: "clock-hour-hand-boundary-drag",
      grade: 2,
      gradeRange: [1, 2],
      maximumProblemCount: 4
    };
  }
  if (
    request.manipulation === "balance-scale-sum-card-drag" ||
    balanceScalePatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.balanceScaleSum,
      standardCode: "[4수02-03]",
      manipulation: "balance-scale-sum-card-drag",
      grade: 4,
      gradeRange: [3, 4],
      maximumProblemCount: 4
    };
  }
  if (
    request.manipulation ===
      "number-card-balanced-equation-drag" ||
    balancedEquationPatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.balancedEquationCards,
      standardCode: "[4수02-03]",
      manipulation: "number-card-balanced-equation-drag",
      grade: 4,
      gradeRange: [3, 4],
      maximumProblemCount: 4
    };
  }
  if (
    request.manipulation === "equivalent-fraction-strip-match" ||
    equivalentFractionPatterns.some((pattern) =>
      pattern.test(request.prompt)
    )
  ) {
    return {
      templateId: ACTIVITY_IDS.equivalentFraction,
      standardCode: "[6수01-06]",
      manipulation: "equivalent-fraction-strip-match",
      grade: 5,
      gradeRange: [5, 6],
      maximumProblemCount: 6
    };
  }
  if (
    request.manipulation === "number-card-make-ten-drag" ||
    makeTenPatterns.some((pattern) => pattern.test(request.prompt))
  ) {
    return {
      templateId: ACTIVITY_IDS.makeTenNumberCards,
      standardCode: "[2수01-04]",
      manipulation: "number-card-make-ten-drag",
      grade: 2,
      gradeRange: [1, 2],
      maximumProblemCount: 5
    };
  }
  return undefined;
}

function hasSupportedIntent(prompt: string): boolean {
  return (
    (supportedIntentPatterns.some((pattern) => pattern.test(prompt)) ||
      fractionPatterns.some((pattern) => pattern.test(prompt))) &&
    comparisonPatterns.some((pattern) => pattern.test(prompt))
  );
}

export class PlanningError extends Error {
  public constructor(
    public readonly code:
      | "invalid-request"
      | "unsupported-intent"
      | "grade-mismatch"
      | "low-confidence"
      | "teacher-intent-confirmation-required",
    message: string
  ) {
    super(message);
    this.name = "PlanningError";
  }
}

export function recommendActivity(input: unknown): Recommendation {
  const parsed = generationRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new PlanningError(
      "invalid-request",
      `요청 형식이 올바르지 않습니다: ${parsed.error.issues
        .map((issue) => issue.message)
        .join(", ")}`
    );
  }
  const request: GenerationRequest = parsed.data;
  const teacherIntentCapability = request.teacherIntent
    ? getTeacherIntentCapability(request.teacherIntent.kind)
    : undefined;
  const blockedPrompt = teacherIntentCapability?.promptGuards?.find((guard) =>
    new RegExp(guard.pattern, "u").test(request.prompt)
  );
  if (blockedPrompt) {
    throw new PlanningError(
      "teacher-intent-confirmation-required",
      blockedPrompt.message
    );
  }
  if (
    teacherIntentCapability &&
    request.manipulation !== undefined &&
    request.manipulation !== teacherIntentCapability.manipulation
  ) {
    throw new PlanningError(
      "teacher-intent-confirmation-required",
      `지정한 조건은 ${teacherIntentCapability.title}에서만 정확히 반영할 수 있습니다. 조건을 빼고 만들거나 해당 활동으로 바꿔 주세요.`
    );
  }
  if (
    teacherIntentCapability &&
    request.requestedStandardCode !== undefined &&
    request.requestedStandardCode !== teacherIntentCapability.standardCode
  ) {
    throw new PlanningError(
      "teacher-intent-confirmation-required",
      `지정한 조건은 성취기준 ${teacherIntentCapability.standardCode} 활동에서만 정확히 반영할 수 있습니다. 조건을 빼고 만들거나 성취기준을 다시 골라 주세요.`
    );
  }
  const routedRequest: GenerationRequest = teacherIntentCapability
    ? {
        ...request,
        manipulation:
          teacherIntentCapability.manipulation as NonNullable<
            Recommendation["manipulation"]
          >
      }
    : request;
  const candidate = teacherIntentCapability
    ? {
        templateId: teacherIntentCapability.templateId,
        standardCode: teacherIntentCapability.standardCode,
        manipulation:
          teacherIntentCapability.manipulation as NonNullable<
            Recommendation["manipulation"]
          >,
        grade: teacherIntentCapability.recommendedGrade,
        gradeRange: teacherIntentCapability.gradeRange,
        maximumProblemCount: teacherIntentCapability.maximumProblemCount
      }
    : routedRequest.manipulation
      ? verifiedCandidate(routedRequest)
      : makeTenPatterns.some((pattern) => pattern.test(request.prompt))
        ? verifiedCandidate(routedRequest)
        : hasSupportedIntent(request.prompt)
          ? undefined
          : verifiedCandidate(routedRequest);
  if (candidate) {
    if (
      teacherIntentCapability &&
      candidate.templateId !== teacherIntentCapability.templateId
    ) {
      throw new PlanningError(
        "teacher-intent-confirmation-required",
        "지정한 조건을 선택한 활동에서 정확히 지킬 수 없습니다. 조건을 빼고 만들거나 취소해 주세요."
      );
    }
    const curriculum = resolveCurriculum(candidate.standardCode);
    const supportState = getActivitySupportState(candidate.templateId);
    const problemCount =
      request.problemCount ??
      teacherIntentCapability?.defaultProblemCount ??
      Math.min(4, candidate.maximumProblemCount);
    const difficulty = request.difficulty ?? "normal";
    const unsupportedRequests = [
      ...(problemCount > candidate.maximumProblemCount
        ? [
            `문제 수는 ${candidate.maximumProblemCount}개까지 검증되었습니다.`
          ]
        : []),
      ...(difficulty !== "normal"
        ? [
            "이 활동의 난이도 선택은 아직 수학적 차이를 만들지 않아 기본값만 지원합니다."
          ]
        : []),
      ...(request.denominatorRelation !== undefined &&
      request.denominatorRelation !== teacherIntentCapability?.denominatorRelation
        ? [
            teacherIntentCapability
              ? "이 맞춤 활동에서는 선택한 분모 관계를 지원하지 않습니다."
              : "분모 관계 선택은 분수 크기 비교 활동에서만 지원합니다."
          ]
        : []),
      ...(request.requestedGrade !== undefined &&
      (request.requestedGrade < candidate.gradeRange[0] ||
        request.requestedGrade > candidate.gradeRange[1])
        ? [
            `${request.requestedGrade}학년은 이 성취기준의 검증 학년군과 맞지 않습니다.`
          ]
        : [])
    ];
    const variationSupported = unsupportedRequests.length === 0;
    return recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: request.requestId,
      supported:
        supportState === "released" && variationSupported,
      templateId: candidate.templateId,
      gradeBand: curriculum.record.gradeBand,
      recommendedGrade: request.requestedGrade ?? candidate.grade,
      standardCode: curriculum.record.code,
      learningGoal:
        ACTIVITY_LEARNING_GOALS[
          candidate.templateId as keyof typeof ACTIVITY_LEARNING_GOALS
        ],
      prerequisites: curriculum.record.prerequisites,
      problemCount,
      difficulty,
      ...(teacherIntentCapability?.denominatorRelation
        ? { denominatorRelation: teacherIntentCapability.denominatorRelation }
        : {}),
      manipulation: candidate.manipulation,
      ...(request.teacherIntent === undefined
        ? {}
        : { teacherIntent: request.teacherIntent }),
      rationale: [
        "요청을 등록된 활동 유형과 성취기준에 연결했습니다."
      ],
      confidence: 0.98,
      caveats: curriculum.warnings,
      blockingReasons:
        !variationSupported
          ? unsupportedRequests
          : supportState === "released"
            ? []
          : [
              supportState === "verified"
                ? "이 활동은 새 화면을 확인하는 중이라 실제 생성에는 아직 공개되지 않았습니다."
                : "이 활동은 아직 등록되지 않아 실제 생성에 사용할 수 없습니다."
            ],
      ...(variationSupported
        ? {}
        : {
            unsupportedRequests,
            t0Proposal: {
              problemCount: Math.min(
                problemCount,
                candidate.maximumProblemCount
              ),
              difficulty: "normal"
            }
          }),
      curriculum: curriculum.record
    });
  }
  if (!hasSupportedIntent(request.prompt)) {
    return recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: request.requestId,
      supported: false,
      prerequisites: [],
      rationale: [
        "첫 버전은 분모가 다른 두 분수의 크기 비교 활동만 검증했습니다."
      ],
      confidence: 0,
      caveats: [],
      blockingReasons: [
        "요청을 검증된 활동 패턴에 안전하게 연결할 수 없습니다."
      ]
    });
  }

  const curriculum = resolveCurriculum();
  if (
    request.requestedGrade !== undefined &&
    (request.requestedGrade < 5 || request.requestedGrade > 6)
  ) {
    return recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: request.requestId,
      supported: false,
      prerequisites: curriculum.record.prerequisites,
      rationale: [
        "공식 성취기준 [6수01-07]은 초등 5~6학년군에 배치되어 있습니다."
      ],
      confidence: 1,
      caveats: curriculum.warnings,
      blockingReasons: [
        `${request.requestedGrade}학년 조건은 공식 학년군과 맞지 않습니다.`
      ]
    });
  }

  const problemCount = request.problemCount ?? 4;
  const difficulty = request.difficulty ?? "normal";
  const denominatorRelation =
    request.denominatorRelation ?? "mixed";
  const manipulation =
    request.manipulation ?? "fraction-strip-common-start-drag";
  const confidence = 0.98;
  const supportState = getActivitySupportState(
    VERIFIED_TEMPLATE_ID
  );
  if (confidence < 0.9) {
    throw new PlanningError(
      "low-confidence",
      "추천 신뢰도가 생성 기준보다 낮습니다."
    );
  }

  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: request.requestId,
    supported: supportState === "released",
    templateId: VERIFIED_TEMPLATE_ID,
    gradeBand: "5-6",
    recommendedGrade: request.requestedGrade ?? 5,
    standardCode: curriculum.record.code,
    learningGoal:
      ACTIVITY_LEARNING_GOALS[VERIFIED_TEMPLATE_ID],
    prerequisites: curriculum.record.prerequisites,
    problemCount,
    difficulty,
    denominatorRelation,
    manipulation,
    rationale: [
      "첫 검증 패턴에 맞춰 분모가 서로 다른 두 분수를 비교하는 활동으로 구성합니다.",
      "같은 길이의 분수 띠를 같은 출발선에 놓으면 전체가 같다는 조건을 눈으로 확인할 수 있습니다.",
      "분수 띠를 직접 옮긴 뒤 비교 기호를 고르게 하여 학생의 크기 판단이 조작으로 드러납니다.",
      `${problemCount}문제는 비교 방법을 익히고 적용하기에 충분하면서 한 캔버스가 지나치게 복잡해지지 않는 분량입니다.`
    ],
    confidence,
    caveats: curriculum.warnings,
    blockingReasons:
      supportState === "released"
        ? []
        : [
            supportState === "verified"
              ? "이 활동은 새 화면을 확인하는 중이라 실제 생성에는 아직 공개되지 않았습니다."
              : "이 활동은 아직 등록되지 않아 실제 생성에 사용할 수 없습니다."
          ],
    curriculum: curriculum.record
  });
}
