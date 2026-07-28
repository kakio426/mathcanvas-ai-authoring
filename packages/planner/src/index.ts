import {
  CONTRACT_SCHEMA_VERSION,
  VERIFIED_TEMPLATE_ID,
  generationRequestSchema,
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
    manipulation,
    rationale: [
      "첫 검증 패턴에 맞춰 분모가 서로 다른 두 분수를 비교하는 활동으로 구성합니다.",
      "같은 길이의 분수 띠를 같은 출발선에 놓으면 전체가 같다는 조건을 눈으로 확인할 수 있습니다.",
      "분수 띠를 직접 옮긴 뒤 비교 기호를 고르게 하여 학생의 크기 판단이 조작으로 드러납니다.",
      `${problemCount}문제는 비교 방법을 익히고 적용하기에 충분하면서 한 캔버스가 지나치게 복잡해지지 않는 분량입니다.`
    ],
    confidence,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}
