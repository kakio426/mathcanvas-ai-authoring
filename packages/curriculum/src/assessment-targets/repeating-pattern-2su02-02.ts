import {
  PROBLEM_FAMILY_SCHEMA_VERSION,
  assessmentTargetSchema,
  assessmentTargetSetSchema,
  type AssessmentTarget,
  type AssessmentTargetSet
} from "@mathcanvas/contracts";
import { LEARNING_MAP_COMMIT } from "../data.js";

const REVIEWED_AT = "2026-08-11T17:45:42.000Z";
const REVIEWER = "repository-owner-directed Codex review";
const STANDARD_CODE = "[2수02-02]";

export const REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS = {
  constructRepeatRule: "change.pattern.repeat-rule.construct-v1",
  constructRepeatArrangement: "change.pattern.declared-repeat.repair-v1",
  constructChangeArrangement: "change.pattern.change-rule.construct-v1"
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
      REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS.constructRepeatRule,
    standardCode: STANDARD_CODE,
    statement:
      "물체·무늬 배열에 적용할 반복 단위의 성분과 순서를 스스로 정하고 선언할 수 있다.",
    observableEvidence: [
      "학생이 구성·선언한 반복 단위와 그 경계가 배열 시작 부분에 드러난다.",
      "정한 반복 단위가 배열의 각 연속 위치에 어떻게 적용되는지 말이나 그림으로 설명한다."
    ],
    assessmentPrompt:
      "물체·무늬 카드와 빈 배열 칸을 제시하고, 학생이 반복 단위의 성분과 순서를 직접 정해 선언한 뒤 그 규칙을 배열에 적용할 방법을 말하게 하라.",
    misconceptions: [
      {
        misconceptionId: "repeat.pattern.rule-changes-mid-sequence-v1",
        statement:
          "처음 정한 반복 단위를 배열 중간에 바꾸어 한 가지 반복 규칙으로 배열하지 못한다."
      },
      {
        misconceptionId: "repeat.pattern.arrangement-no-rule-v1",
        statement:
          "반복 단위와 순서를 정하지 않고 보기 좋은 모양만 임의로 배열한다."
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
      "공식 문장의 ‘자신이 정한 규칙’을 반복 단위의 성분·순서를 직접 구성·선언하는 결정으로 구체화한다. 이 repeat-only family는 repeat rule 구성 target만 소유하며 배열 적용·수정과 수 변화 관계는 별도 family가 소유한다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId:
      REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS.constructRepeatArrangement,
    standardCode: STANDARD_CODE,
    statement:
      "스스로 선언한 반복 단위에 맞도록 다음 항목들을 배열하고 어긋난 반복 항목을 고칠 수 있다.",
    observableEvidence: [
      "완성된 반복 배열에서 단위 경계와 수정된 항목을 다시 추적할 수 있다.",
      "어긋난 항목을 바꾸고 배열이 선언한 반복 단위에 맞는지 설명한다."
    ],
    assessmentPrompt:
      "학생이 선언한 반복 단위에 따라 배열을 끝까지 구성하게 하고, 어긋난 항목을 실제로 교체한 뒤 완성한 배열이 규칙에 맞는 까닭을 설명하게 하라.",
    misconceptions: [
      {
        misconceptionId:
          "repeat.pattern.copy-last-item-instead-of-applying-rule-v1",
        statement:
          "마지막에 보인 항목만 그대로 복사하고 배열 전체에 선언한 반복 단위를 적용하지 않는다."
      },
      {
        misconceptionId: "repeat.pattern.rule-boundary-mismatch-v1",
        statement:
          "반복 단위의 시작과 끝을 잘못 정해 일부 위치만 맞는 어긋난 배열도 완성된 것으로 판단한다."
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
      "정한 반복 단위의 일관된 적용, 어긋난 항목의 실제 교체, 규칙 근거 설명을 하나의 구성·검증 lifecycle로 묶는다. repeat rule 구성 target과 수 변화 관계 target은 주장하지 않는다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId:
      REPEATING_PATTERN_ARRANGEMENT_ASSESSMENT_TARGET_IDS.constructChangeArrangement,
    standardCode: STANDARD_CODE,
    statement:
      "수 배열에 적용할 시작값·변화량·방향을 스스로 정하고 선언한 뒤, 그 관계로 다음 항을 배열하고 어긋난 항을 고칠 수 있다.",
    observableEvidence: [
      "학생이 구성·선언한 시작값·변화량·방향이 화면에 드러난다.",
      "연속 항의 관계를 대조해 다음 항을 예측하고 어긋난 수를 수정한다."
    ],
    assessmentPrompt:
      "수 카드와 빈 배열 칸을 제시하고, 학생이 시작값·변화량·방향을 직접 정해 선언한 뒤 그 관계로 다음 항을 배열하고 어긋난 수를 고치게 하라.",
    misconceptions: [
      {
        misconceptionId: "change.pattern.step-or-direction-mismatch-v1",
        statement:
          "시작값은 맞지만 변화량이나 방향을 바꾸어 일정한 변화 관계를 유지하지 못한다."
      },
      {
        misconceptionId: "change.pattern.copy-last-number-v1",
        statement:
          "직전 수를 반복하거나 한 항의 차이만 보고 전체 수 배열의 관계를 판단한다."
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
      "수 변화 family는 repeat family와 별도로 시작값·변화량·방향을 학생이 구성·선언하고, 같은 관계로 배열·수정하는 envelope를 증명해야 한다.",
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
    "공식 문장의 규칙 정하기와 정한 규칙에 따른 배열 구성·수정을 repeat 구성, repeat 적용·수정, change 구성·적용의 세 필수 평가 목표로 완전 분해했다.",
  reviewedAt: REVIEWED_AT,
  reviewer: REVIEWER
});
