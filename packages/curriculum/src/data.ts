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
      title: "2022 개정 초중등학교 교육과정 원문 탑재 안내 및 수학과 교육과정",
      url: "https://ncic.re.kr/bbs/eduNotice2022/view/543.do",
      locator: "초등학교 5~6학년군 수학 > 수와 연산 > [6수01-07]",
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
          "official-source-checked는 코드와 출처 위치 확인을 뜻하며 공식 문구 수록이나 교육 전문가 승인을 뜻하지 않습니다. 이 스냅샷은 [6수01-07]을 상위 단원명인 '분수의 덧셈과 뺄셈'으로 표시하므로 공식 목표를 대신할 수 없습니다."
      }
    ],
    reviewedAt: "2026-07-28T00:00:00.000Z",
    reviewer: "MathCanvas AI authoring curriculum review"
  });
