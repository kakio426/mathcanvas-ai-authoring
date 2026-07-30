import {
  ACTIVITY_IDS,
  CONTRACT_SCHEMA_VERSION,
  VERIFIED_TEMPLATE_ID,
  generationRequestSchema,
  getActivitySupportState,
  recommendationSchema,
  type GenerationRequest,
  type Recommendation
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";

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
  if (request.manipulation === "fraction-strip-common-start-drag") {
    return undefined;
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
      | "low-confidence",
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
  const candidate = request.manipulation
    ? verifiedCandidate(request)
    : makeTenPatterns.some((pattern) => pattern.test(request.prompt))
      ? verifiedCandidate(request)
      : hasSupportedIntent(request.prompt)
        ? undefined
        : verifiedCandidate(request);
  if (candidate) {
    const curriculum = resolveCurriculum(candidate.standardCode);
    const supportState = getActivitySupportState(candidate.templateId);
    const problemCount = request.problemCount ?? 4;
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
      ...(request.denominatorRelation !== undefined
        ? ["분모 관계 선택은 분수 크기 비교 활동에서만 지원합니다."]
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
      learningGoal: curriculum.record.officialGoal,
      prerequisites: curriculum.record.prerequisites,
      problemCount,
      difficulty,
      manipulation: candidate.manipulation,
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
              `활동은 ${supportState ?? "unregistered"} 상태이며 실제 생성에는 아직 공개되지 않았습니다.`
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
  if (confidence < 0.9) {
    throw new PlanningError(
      "low-confidence",
      "추천 신뢰도가 생성 기준보다 낮습니다."
    );
  }

  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: request.requestId,
    supported: true,
    templateId: VERIFIED_TEMPLATE_ID,
    gradeBand: "5-6",
    recommendedGrade: request.requestedGrade ?? 5,
    standardCode: curriculum.record.code,
    learningGoal: curriculum.record.officialGoal,
    prerequisites: curriculum.record.prerequisites,
    problemCount,
    difficulty,
    denominatorRelation,
    manipulation,
    rationale: [
      "첫 검증 패턴에 맞춰 분모가 서로 다른 두 분수를 비교하는 활동으로 구성합니다.",
      "같은 길이의 분수 띠를 같은 출발선에 놓으면 전체가 같다는 조건을 눈으로 확인할 수 있습니다.",
      "분수 띠를 직접 옮긴 뒤 비교 기호를 고르게 하여 학생의 크기 판단이 조작으로 드러납니다.",
      `${problemCount}문제를 한 문제씩 새 캔버스로 나누어 학생이 현재 비교에 집중하게 합니다.`
    ],
    confidence,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}
