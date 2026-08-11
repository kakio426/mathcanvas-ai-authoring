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
const STANDARD_CODE = "[2수02-02]";

export const REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS = {
  chooseOwnArrangementRule: "change.pattern.choose-own-arrangement-rule-v1",
  constructArrangementFollowingRule:
    "change.pattern.construct-arrangement-following-rule-v1"
} as const;

const conceptTopic =
  "kr.mt.math.change-relationships.g1-2.s2-02-02.concept";
const representationTopic =
  "kr.mt.math.change-relationships.g1-2.s2-02-02.representation";
const applicationTopic =
  "kr.mt.math.change-relationships.g1-2.s2-02-02.application";

export const repeatingPatternArrangementAssessmentTargets:
  readonly AssessmentTarget[] = [
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId:
      REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS.chooseOwnArrangementRule,
    standardCode: STANDARD_CODE,
    statement:
      "물체·무늬·수 배열에 적용할 반복 또는 변화 규칙을 스스로 정할 수 있다.",
    observableEvidence: [
      "학생이 선택한 반복 단위나 변화 관계가 배열 시작 부분에 드러난다.",
      "정한 규칙이 배열의 각 위치에 어떻게 적용되는지 말이나 그림으로 설명한다."
    ],
    assessmentPrompt:
      "물체·무늬·수 카드를 제시하고, 학생이 자신이 정한 배열 규칙을 선택한 뒤 규칙의 반복 단위나 변화 관계를 말하게 하라.",
    misconceptions: [
      {
        misconceptionId: "change.pattern.rule-changes-mid-sequence-v1",
        statement:
          "처음 정한 규칙을 배열 중간에 바꾸어 한 가지 규칙으로 배열하지 못한다."
      },
      {
        misconceptionId: "change.pattern.arrangement-no-rule-v1",
        statement:
          "순서나 반복 관계를 정하지 않고 보기 좋은 모양만 임의로 배열한다."
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
      "공식 문장의 ‘자신이 정한 규칙’을 학생이 반복 단위나 변화 관계로 명시하는 결정으로 구체화한다. 물체·무늬·수는 문제 맥락의 다양성으로 관리한다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId:
      REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS.constructArrangementFollowingRule,
    standardCode: STANDARD_CODE,
    statement:
      "정한 규칙에 맞도록 다음 항목들을 배열하고 어긋난 항목을 고칠 수 있다.",
    observableEvidence: [
      "완성된 배열에서 반복 단위나 항 사이 관계를 다시 추적할 수 있다.",
      "어긋난 항목을 찾아 바꾸고 배열이 정한 규칙에 맞는지 설명한다."
    ],
    assessmentPrompt:
      "학생이 정한 규칙에 따라 배열을 끝까지 구성하게 하고, 어긋난 항목을 고친 뒤 완성한 배열이 규칙에 맞는 까닭을 설명하게 하라.",
    misconceptions: [
      {
        misconceptionId:
          "change.pattern.copy-last-item-instead-of-applying-rule-v1",
        statement:
          "마지막에 보인 항목만 그대로 복사하고 배열 전체의 규칙을 적용하지 않는다."
      },
      {
        misconceptionId: "change.pattern.omit-rule-check-v1",
        statement:
          "배열을 완성한 뒤에도 각 위치가 같은 규칙을 따르는지 확인하지 않는다."
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
      "정한 규칙의 일관된 적용, 어긋난 항목 수정, 규칙 근거 설명을 하나의 구성·검증 lifecycle로 묶는다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  })
] as const;

export const repeatingPatternArrangementAssessmentTargetSet:
  AssessmentTargetSet = assessmentTargetSetSchema.parse({
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  standardCode: STANDARD_CODE,
  targetIds: Object.values(
    REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS
  ),
  completeness: "reviewed-complete",
  scopeNote:
    "공식 문장의 규칙 정하기와 정한 규칙에 따른 배열 구성·수정을 두 개의 필수 평가 목표로 완전 분해했다.",
  reviewedAt: REVIEWED_AT,
  reviewer: REVIEWER
});
