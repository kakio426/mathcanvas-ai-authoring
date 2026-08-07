import {
  CONTRACT_SCHEMA_VERSION,
  curriculumRecordSchema,
  type CurriculumRecord
} from "@mathcanvas/contracts";

export const LEARNING_MAP_COMMIT =
  "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c" as const;

export const unlikeDenominatorComparisonRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:6su01-07",
    code: "[6수01-07]",
    gradeBand: "5-6",
    domain: "수와 연산",
    officialGoal:
      "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다.",
    prerequisites: [
      "분수의 분모와 분자의 뜻을 이해한다.",
      "분수 모형에서 같은 전체를 기준으로 양을 나타낼 수 있다.",
      "크기가 같은 분수를 만들고 간단한 분수를 약분하거나 통분할 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "PDF 26쪽, 초등학교 5~6학년군 > 수와 연산 > 분수의 덧셈과 뺄셈 > [6수01-07]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 위 공식 원문 위치에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        sourceId: "deck6-korean-elementary-learning-map",
        sourceKind: "auxiliary",
        title: "DECK6/korean-elementary-learning-map",
        url: "https://github.com/DECK6/korean-elementary-learning-map",
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [6수01-07]",
        version: LEARNING_MAP_COMMIT,
        verificationStatus: "auxiliary-pinned",
        sourceTextIncluded: false,
        caveat:
          "고정 스냅샷은 성취기준 코드와 상위 단원 위치를 확인하는 보조 자료입니다. 공식 목표 문구는 교육부 원문을 기준으로 삼습니다."
      }
    ],
    reviewedAt: "2026-07-29T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

const sharedAuxiliarySource = {
  sourceId: "deck6-korean-elementary-learning-map",
  sourceKind: "auxiliary" as const,
  title: "DECK6/korean-elementary-learning-map",
  url: "https://github.com/DECK6/korean-elementary-learning-map",
  version: LEARNING_MAP_COMMIT,
  verificationStatus: "auxiliary-pinned" as const,
  sourceTextIncluded: false,
  caveat:
    "고정 스냅샷은 성취기준 코드와 상위 단원 위치를 확인하는 보조 자료입니다. 공식 목표 문구는 교육부 원문을 기준으로 삼습니다."
};

function reviewedGeometryRecord(input: {
  key: string;
  code: string;
  gradeBand: "3-4" | "5-6";
  officialGoal: string;
  prerequisites: readonly string[];
  locator: string;
  auxiliaryLocator: string;
}): CurriculumRecord {
  return curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: input.key,
    code: input.code,
    gradeBand: input.gradeBand,
    domain: "도형과 측정",
    officialGoal: input.officialGoal,
    prerequisites: input.prerequisites,
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator: input.locator,
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 위 공식 원문 위치에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator: input.auxiliaryLocator
      }
    ],
    reviewedAt: "2026-08-04T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });
}

export const triangleClassificationRecord = reviewedGeometryRecord({
  key: "kr-2022-elem-math:4su03-09",
  code: "[4수03-09]",
  gradeBand: "3-4",
  officialGoal:
    "여러 가지 모양의 삼각형에 대한 분류 활동을 통하여 직각삼각형, 예각삼각형, 둔각삼각형을 이해한다.",
  prerequisites: [
    "각과 직각을 이해하고 예각과 둔각을 구별할 수 있다.",
    "삼각형을 변과 각의 성질에 따라 분류할 수 있다."
  ],
  locator:
    "PDF 26쪽, 초등학교 3~4학년군 > 도형과 측정 > 여러 가지 삼각형 > [4수03-09]",
  auxiliaryLocator:
    "data/kr/curriculum-standards.json, topics.json, dependencies.json / [4수03-09]"
});

export const angleMeasurementRecord = reviewedGeometryRecord({
  key: "kr-2022-elem-math:4su03-24",
  code: "[4수03-24]",
  gradeBand: "3-4",
  officialGoal:
    "각의 크기의 단위인 1도(°)를 알고, 각도기를 이용하여 각의 크기를 측정하고 어림할 수 있다.",
  prerequisites: [
    "각의 꼭짓점과 두 변을 찾을 수 있다.",
    "직각과 비교하여 예각과 둔각을 구별할 수 있다."
  ],
  locator:
    "PDF 27쪽, 초등학교 3~4학년군 > 도형과 측정 > 각도 > [4수03-24]",
  auxiliaryLocator:
    "data/kr/curriculum-standards.json, topics.json, dependencies.json / [4수03-24]"
});

export const lineSymmetryRecord = reviewedGeometryRecord({
  key: "kr-2022-elem-math:6su03-02",
  code: "[6수03-02]",
  gradeBand: "5-6",
  officialGoal:
    "실생활과 연결하여 선대칭도형과 점대칭도형을 이해하고 그릴 수 있다.",
  prerequisites: [
    "합동인 도형의 대응점, 대응변, 대응각을 찾을 수 있다.",
    "모눈에서 점의 위치와 두 점 사이의 거리를 비교할 수 있다."
  ],
  locator:
    "PDF 34쪽, 초등학교 5~6학년군 > 도형과 측정 > 합동과 대칭 > [6수03-02]",
  auxiliaryLocator:
    "data/kr/curriculum-standards.json, topics.json, dependencies.json / [6수03-02]"
});

export const oneDigitDivisorDivisionRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:4su01-06",
    code: "[4수01-06]",
    gradeBand: "3-4",
    domain: "수와 연산",
    officialGoal:
      "나누는 수가 한 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있으며, 나눗셈에서 몫과 나머지의 의미를 안다.",
    prerequisites: [
      "나눗셈이 이루어지는 실생활 상황에서 나눗셈의 의미를 이해한다.",
      "곱셈과 나눗셈의 관계를 이용해 몫을 구할 수 있다.",
      "주어진 수를 같은 수씩 묶고 남는 수를 셀 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "PDF 23쪽, 초등학교 3~4학년군 > 수와 연산 > 세 자리 수 범위의 나눗셈 > [4수01-06]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 위 공식 원문 위치에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [4수01-06]"
      }
    ],
    reviewedAt: "2026-08-07T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const unlikeDenominatorFractionOperationsRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:6su01-08",
    code: "[6수01-08]",
    gradeBand: "5-6",
    domain: "수와 연산",
    officialGoal:
      "분모가 다른 분수의 덧셈과 뺄셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.",
    prerequisites: [
      "크기가 같은 분수를 만들고 분수를 통분할 수 있다.",
      "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다.",
      "분모가 같은 분수의 덧셈과 뺄셈 원리를 이해한다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "PDF 26쪽, 초등학교 5~6학년군 > 수와 연산 > 분수의 덧셈과 뺄셈 > [6수01-08]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 위 공식 원문 위치에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [6수01-08]"
      }
    ],
    reviewedAt: "2026-07-31T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const equivalentFractionRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:6su01-06",
    code: "[6수01-06]",
    gradeBand: "5-6",
    domain: "수와 연산",
    officialGoal:
      "크기가 같은 분수를 만드는 방법을 이해하고, 분수를 약분, 통분할 수 있다.",
    prerequisites: [
      "분모와 분자의 뜻을 이해한다.",
      "같은 전체에서 분수가 나타내는 양을 분수 모형으로 표현할 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "PDF 26쪽, 초등학교 5~6학년군 > 수와 연산 > 분수의 덧셈과 뺄셈 > [6수01-06]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 위 공식 원문 위치에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [6수01-06]"
      }
    ],
    reviewedAt: "2026-07-30T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const numberCompositionRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:2su01-04",
    code: "[2수01-04]",
    gradeBand: "1-2",
    domain: "수와 연산",
    officialGoal:
      "하나의 수를 두 수로 분해하고 두 수를 하나의 수로 합성하는 활동을 통하여 수 감각을 기른다.",
    prerequisites: [
      "0부터 10까지의 수를 세고 읽을 수 있다.",
      "구체물의 개수를 수로 나타낼 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "PDF 12쪽, 초등학교 1~2학년군 > 수와 연산 > 네 자리 이하의 수 > [2수01-04]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 위 공식 원문 위치에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [2수01-04]"
      }
    ],
    reviewedAt: "2026-07-30T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const placeValueRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:2su01-02",
    code: "[2수01-02]",
    gradeBand: "1-2",
    domain: "수와 연산",
    officialGoal:
      "일, 십, 백, 천의 자릿값과 위치적 기수법을 이해하고, 네 자리 이하의 수를 읽고 쓸 수 있다.",
    prerequisites: [
      "100까지의 수를 세고 읽고 쓸 수 있다.",
      "10개씩 묶음과 낱개로 수를 나타낼 수 있다.",
      "백 모형, 십 모형, 일 모형이 나타내는 양을 구별할 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "PDF 12쪽, 초등학교 1~2학년군 > 수와 연산 > 네 자리 이하의 수 > [2수01-02]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 위 공식 원문 위치에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [2수01-02]"
      }
    ],
    reviewedAt: "2026-08-01T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const equalityRelationRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:4su02-03",
    code: "[4수02-03]",
    gradeBand: "3-4",
    domain: "변화와 관계",
    officialGoal:
      "등호를 사용하여 크기가 같은 두 양의 관계를 식으로 나타낼 수 있다.",
    prerequisites: [
      "두 자리 수 범위에서 덧셈과 뺄셈의 뜻을 이해한다.",
      "수 감각이나 익숙한 연산 성질을 이용해 두 양의 크기를 비교할 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "초등학교 3~4학년군 > 변화와 관계 > 등호와 동치 관계 > [4수02-03]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표는 공식 원문 및 교육청 편성 자료에서 대조했습니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [4수02-03]"
      }
    ],
    reviewedAt: "2026-07-31T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const clockReadingRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:2su03-07",
    code: "[2수03-07]",
    gradeBand: "1-2",
    domain: "도형과 측정",
    officialGoal:
      "시계를 보고 시각을 ‘몇 시 몇 분’까지 읽을 수 있다.",
    prerequisites: [
      "시계의 긴바늘과 짧은바늘을 구별할 수 있다.",
      "5씩 뛰어 세어 60까지 셀 수 있다.",
      "정각과 30분인 시각을 읽을 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "초등학교 1~2학년군 > 도형과 측정 > 시각과 시간 > [2수03-07]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 교육부 공식 원문에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [2수03-07]"
      }
    ],
    reviewedAt: "2026-07-31T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const timeDurationRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:2su03-08",
    code: "[2수03-08]",
    gradeBand: "1-2",
    domain: "도형과 측정",
    officialGoal:
      "1시간과 1분의 관계를 이해하고, 시간을 ‘시간’, ‘분’으로 표현할 수 있다.",
    prerequisites: [
      "시계를 보고 시각을 ‘몇 시 몇 분’까지 읽을 수 있다.",
      "시계의 긴바늘이 가는 방향을 안다.",
      "5씩 뛰어 세어 60까지 셀 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "초등학교 1~2학년군 > 도형과 측정 > 시각과 시간 > [2수03-08]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 교육부 공식 원문 및 교육청 평가 자료에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [2수03-08]"
      }
    ],
    reviewedAt: "2026-07-31T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const sameDenominatorFractionOperationsRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:4su01-15",
    code: "[4수01-15]",
    gradeBand: "3-4",
    domain: "수와 연산",
    officialGoal:
      "분모가 같은 분수의 덧셈과 뺄셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
    prerequisites: [
      "분수에서 분모와 분자가 나타내는 뜻을 안다.",
      "분모가 같은 분수끼리 크기를 비교할 수 있다.",
      "같은 크기의 단위분수를 여러 개 모아 분수를 나타낼 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "초등학교 3~4학년군 > 수와 연산 > 분수의 덧셈과 뺄셈 > [4수01-15]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 교육부 공식 원문 및 교육청 평가 자료에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [4수01-15]"
      }
    ],
    reviewedAt: "2026-07-31T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const barGraphInterpretationRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:4su04-01",
    code: "[4수04-01]",
    gradeBand: "3-4",
    domain: "자료와 가능성",
    officialGoal:
      "자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다.",
    prerequisites: [
      "자료를 정해진 기준에 따라 분류하고 수를 셀 수 있다.",
      "같은 크기의 단위가 반복되는 눈금을 읽을 수 있다.",
      "몇씩 뛰어 세거나 곱셈과 나눗셈으로 전체 수를 구할 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "초등학교 3~4학년군 > 자료와 가능성 > 자료의 수집과 정리 > [4수04-01]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 교육부 공식 원문 및 교육청 편성 자료에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [4수04-01]"
      }
    ],
    reviewedAt: "2026-07-31T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const lengthMeasurementRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:2su03-10",
    code: "[2수03-10]",
    gradeBand: "1-2",
    domain: "도형과 측정",
    officialGoal:
      "길이 단위 1cm와 1m를 알고, 이를 이용하여 주변 사물의 길이를 측정할 수 있다.",
    prerequisites: [
      "두 물체의 한쪽 끝을 맞추어 길이를 직접 비교할 수 있다.",
      "같은 크기의 임의 단위를 반복해 놓고 그 수를 셀 수 있다.",
      "0부터 10까지의 수를 세고 읽을 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator:
        "초등학교 1~2학년군 > 도형과 측정 > 길이 > [2수03-10]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 교육부 공식 원문에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [
      {
        ...sharedAuxiliarySource,
        locator:
          "data/kr/curriculum-standards.json, topics.json, dependencies.json / [2수03-10]"
      }
    ],
    reviewedAt: "2026-08-01T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const repeatingPatternRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:2su02-01",
    code: "[2수02-01]",
    gradeBand: "1-2",
    domain: "변화와 관계",
    officialGoal:
      "물체, 무늬, 수 등의 배열에서 규칙을 찾아 여러 가지 방법으로 표현할 수 있다.",
    prerequisites: [
      "색과 모양이 같은 것끼리 분류할 수 있다.",
      "두세 가지 대상을 차례대로 배열하고 그 순서를 말할 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator: "초등학교 1~2학년군 > 변화와 관계 > 규칙 찾기 > [2수02-01]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat: "성취기준 코드와 목표 문구는 교육부 공식 원문에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [{
      ...sharedAuxiliarySource,
      locator: "data/kr/topics.json, dependencies.json / [2수02-01]"
    }],
    reviewedAt: "2026-08-01T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const multiplicationMeaningRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:2su01-10",
    code: "[2수01-10]",
    gradeBand: "1-2",
    domain: "수와 연산",
    officialGoal:
      "곱셈이 이루어지는 실생활 상황과 연결하여 곱셈의 의미를 이해한다.",
    prerequisites: [
      "같은 수씩 묶어 셀 수 있다.",
      "같은 수를 여러 번 더하는 덧셈식으로 나타낼 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator: "초등학교 1~2학년군 > 수와 연산 > 곱셈 > [2수01-10]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat: "성취기준 코드와 목표 문구는 교육부 공식 원문에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [{
      ...sharedAuxiliarySource,
      locator: "data/kr/topics.json, dependencies.json / [2수01-10]"
    }],
    reviewedAt: "2026-08-01T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });

export const probabilityComparisonRecord: CurriculumRecord =
  curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: "kr-2022-elem-math:6su04-04",
    code: "[6수04-04]",
    gradeBand: "5-6",
    domain: "자료와 가능성",
    officialGoal:
      "사건이 일어날 가능성을 말로 표현하고 비교할 수 있다.",
    prerequisites: [
      "전체에 대한 부분의 크기를 분수로 나타낼 수 있다.",
      "분모가 다른 분수의 크기를 비교할 수 있다."
    ],
    officialSource: {
      sourceId: "kr-ncic-2022-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator: "초등학교 5~6학년군 > 자료와 가능성 > 가능성 > [6수04-04]",
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat: "성취기준 코드와 목표 문구는 교육부 공식 원문에서 대조한 검토 메타데이터입니다."
    },
    auxiliarySources: [{
      ...sharedAuxiliarySource,
      locator: "data/kr/topics.json, dependencies.json / [6수04-04]"
    }],
    reviewedAt: "2026-08-01T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });
