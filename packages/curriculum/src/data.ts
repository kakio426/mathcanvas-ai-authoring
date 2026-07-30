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
