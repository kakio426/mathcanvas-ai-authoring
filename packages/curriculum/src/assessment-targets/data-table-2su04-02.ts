import {
  PROBLEM_FAMILY_SCHEMA_VERSION,
  assessmentTargetSchema,
  assessmentTargetSetSchema,
  type AssessmentTarget,
  type AssessmentTargetSet
} from "@mathcanvas/contracts";
import { LEARNING_MAP_COMMIT } from "../data.js";

const REVIEWED_AT = "2026-08-11T00:00:00.000Z";
const REVIEWER = "repository-owner-directed Codex review";
const STANDARD_CODE = "[2수04-02]";

export const DATA_TABLE_ASSESSMENT_TARGET_IDS = {
  organizeClassifiedData:
    "data.table.organize-classified-data-v1",
  explainTableUsefulness: "data.table.explain-usefulness-v1"
} as const;

const conceptTopic =
  "kr.mt.math.data-probability.g1-2.s2-04-02.concept";
const representationTopic =
  "kr.mt.math.data-probability.g1-2.s2-04-02.representation";
const applicationTopic =
  "kr.mt.math.data-probability.g1-2.s2-04-02.application";

export const dataTableAssessmentTargets: readonly AssessmentTarget[] = [
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId: DATA_TABLE_ASSESSMENT_TARGET_IDS.organizeClassifiedData,
    standardCode: STANDARD_CODE,
    statement:
      "분류한 자료를 표의 알맞은 범주에 빠짐없이 대응시키고 각 범주의 개수를 나타낼 수 있다.",
    observableEvidence: [
      "원자료의 각 항목을 정확히 한 범주에 대응시켜 표에 기록한다.",
      "표의 범주별 개수 합이 원자료 전체 개수와 같은지 확인한다."
    ],
    assessmentPrompt:
      "몇 가지 기준으로 분류할 수 있는 자료를 제시하고, 학생이 각 자료를 표의 알맞은 범주에 옮겨 적은 뒤 범주별 개수를 세어 표를 완성하게 하라.",
    misconceptions: [
      {
        misconceptionId: "data.table.category-or-count-mismatch-v1",
        statement:
          "자료를 알맞은 범주에 넣지 못하거나 범주별 개수를 세는 과정에서 하나를 빠뜨리거나 두 번 센다."
      },
      {
        misconceptionId: "data.table.total-as-category-count-v1",
        statement:
          "전체 자료의 개수를 한 범주의 개수로 적어 범주별 수와 전체 수를 구분하지 못한다."
      }
    ],
    learningMap: {
      repository: "DECK6/korean-elementary-learning-map",
      commit: LEARNING_MAP_COMMIT,
      topicIds: [representationTopic],
      prerequisiteTopicIds: [conceptTopic]
    },
    required: true,
    reviewStatus: "reviewed",
    scopeNote:
      "표의 각 범주와 원자료를 일대일로 대응하고 개수를 정확히 기록하는 목표다. 자료를 수집하거나 새로운 분류 기준을 발명하는 목표는 포함하지 않는다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId: DATA_TABLE_ASSESSMENT_TARGET_IDS.explainTableUsefulness,
    standardCode: STANDARD_CODE,
    statement:
      "자료를 표로 나타내면 범주별 개수와 차이를 한눈에 비교하기 편리한 점을 자료에 근거해 말할 수 있다.",
    observableEvidence: [
      "표에서 바로 읽을 수 있는 범주별 개수나 많고 적음의 비교를 근거로 든다.",
      "원자료를 하나씩 살펴보는 것보다 표가 비교·집계에 편리한 이유를 말한다."
    ],
    assessmentPrompt:
      "같은 자료를 원자료와 표로 함께 제시하고, 학생이 표에서 쉽게 알 수 있는 정보와 표로 나타냈을 때 편리한 점을 자료의 개수나 비교 결과를 근거로 설명하게 하라.",
    misconceptions: [
      {
        misconceptionId: "data.table.decoration-without-information-gain-v1",
        statement:
          "표가 보기 좋게 꾸며져서 편리하다고만 말하고 범주별 개수나 비교 정보와 연결하지 않는다."
      },
      {
        misconceptionId: "data.table.total-only-usefulness-v1",
        statement:
          "범주별 정보를 보지 않고 전체 자료의 개수만 읽어 표의 편리한 점을 설명한다."
      }
    ],
    learningMap: {
      repository: "DECK6/korean-elementary-learning-map",
      commit: LEARNING_MAP_COMMIT,
      topicIds: [applicationTopic],
      prerequisiteTopicIds: [conceptTopic, representationTopic]
    },
    required: true,
    reviewStatus: "reviewed",
    scopeNote:
      "공식 문장의 ‘표로 나타내면 편리한 점’을 범주별 개수와 비교 정보를 빠르게 읽는 근거 설명으로 구체화한다. 표의 종류를 암기하거나 자료를 직접 조사하는 것은 이 target의 필수 조건이 아니다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  })
] as const;

export const dataTableAssessmentTargetSet: AssessmentTargetSet =
  assessmentTargetSetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    standardCode: STANDARD_CODE,
    targetIds: Object.values(DATA_TABLE_ASSESSMENT_TARGET_IDS),
    completeness: "reviewed-complete",
    scopeNote:
      "공식 문장의 자료 분류 결과를 표로 나타내기와 표로 나타냈을 때의 편리한 점 설명을 두 개의 필수 평가 목표로 완전 분해했다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  });
