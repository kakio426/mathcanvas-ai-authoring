import {
  PROBLEM_FAMILY_SCHEMA_VERSION,
  assessmentTargetSchema,
  assessmentTargetSetSchema,
  type AssessmentTarget,
  type AssessmentTargetSet
} from "@mathcanvas/contracts";
import { LEARNING_MAP_COMMIT } from "./data.js";
import { findOfficialElementaryStandard } from "./official-elementary-standards.js";

const REVIEWED_AT = "2026-08-11T00:00:00.000Z";
const REVIEWER = "repository-owner-directed Codex review";
const STANDARD_CODE = "[2수04-01]";

export const CLASSIFICATION_ASSESSMENT_TARGET_IDS = {
  givenCriterion: "data.classification.given-criterion-v1",
  selfChosenCriterion: "data.classification.self-chosen-criterion-v1",
  countByClass: "data.classification.count-by-class-v1",
  describeResult: "data.classification.describe-result-v1"
} as const;

const conceptTopic =
  "kr.mt.math.data-probability.g1-2.s2-04-01.concept";
const representationTopic =
  "kr.mt.math.data-probability.g1-2.s2-04-01.representation";
const applicationTopic =
  "kr.mt.math.data-probability.g1-2.s2-04-01.application";

const rawTargets: readonly AssessmentTarget[] = [
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId: CLASSIFICATION_ASSESSMENT_TARGET_IDS.givenCriterion,
    standardCode: STANDARD_CODE,
    statement:
      "주어진 분류 기준에 맞는 사물과 맞지 않는 사물을 구분할 수 있다.",
    observableEvidence: [
      "섞여 있는 사물 중 주어진 기준에 맞는 사물을 빠짐없이 선택한다.",
      "선택하지 않은 사물이 기준에 맞지 않는 까닭을 기준의 속성으로 구분한다."
    ],
    assessmentPrompt:
      "여러 사물과 한 가지 분류 기준을 제시하고, 학생이 기준에 맞는 사물을 모두 고른 뒤 선택 근거를 말하게 하라.",
    misconceptions: [
      {
        misconceptionId: "data.classification.salient-feature-v1",
        statement:
          "제시된 기준 대신 색이나 크기처럼 눈에 띄는 다른 특징으로 사물을 나눈다."
      },
      {
        misconceptionId: "data.classification.criterion-reversal-v1",
        statement: "기준에 맞지 않는 사물을 기준에 맞는 사물로 반대로 고른다."
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
      "관찰 가능한 한 가지 기준이 명시된 상황에서의 분류를 다룬다. 학생이 기준을 스스로 만드는 목표는 별도 target이다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId: CLASSIFICATION_ASSESSMENT_TARGET_IDS.selfChosenCriterion,
    standardCode: STANDARD_CODE,
    statement:
      "여러 사물의 공통 속성을 살펴 분류 기준을 스스로 정하고 그 기준에 따라 나눌 수 있다.",
    observableEvidence: [
      "모든 사물에 일관되게 적용할 수 있는 분류 기준을 말한다.",
      "자신이 정한 같은 기준을 바꾸지 않고 사물을 분류한다."
    ],
    assessmentPrompt:
      "여러 사물을 제시하고, 학생이 분류 기준을 한 가지 정해 말한 뒤 그 기준을 모든 사물에 일관되게 적용하게 하라.",
    misconceptions: [
      {
        misconceptionId: "data.classification.changing-criterion-v1",
        statement: "사물마다 서로 다른 특징을 사용해 분류 기준을 중간에 바꾼다."
      },
      {
        misconceptionId: "data.classification.overlapping-classes-v1",
        statement: "한 사물이 여러 무리에 겹치거나 어느 무리에도 들지 않는 모호한 기준을 정한다."
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
      "학생이 기준을 직접 정하고 일관되게 적용하는 목표다. 첫 native family에서는 아직 지원하지 않는다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId: CLASSIFICATION_ASSESSMENT_TARGET_IDS.countByClass,
    standardCode: STANDARD_CODE,
    statement:
      "분류한 각 무리의 사물 수를 빠뜨리거나 중복하지 않고 셀 수 있다.",
    observableEvidence: [
      "분류 기준에 맞는 사물을 하나씩 대응하여 센 개수를 나타낸다.",
      "전체 사물 수와 각 무리의 개수를 구분한다."
    ],
    assessmentPrompt:
      "분류된 사물 또는 분류할 사물 모음을 제시하고, 학생이 각 무리의 사물 수를 세어 개수로 나타내게 하라.",
    misconceptions: [
      {
        misconceptionId: "data.classification.count-all-v1",
        statement: "기준에 맞는 사물만 세지 않고 제시된 모든 사물의 수를 답한다."
      },
      {
        misconceptionId: "data.classification.omit-or-double-count-v1",
        statement: "사물을 하나 빠뜨리거나 같은 사물을 두 번 세어 개수가 하나 차이 난다."
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
      "분류 결과와 전체 자료 수를 구분해 각 무리의 개수를 정확히 세는 목표다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId: CLASSIFICATION_ASSESSMENT_TARGET_IDS.describeResult,
    standardCode: STANDARD_CODE,
    statement:
      "사용한 기준과 각 무리의 개수 또는 비교 결과를 말할 수 있다.",
    observableEvidence: [
      "어떤 기준으로 분류했는지와 기준에 맞는 사물의 개수를 함께 말한다.",
      "분류 결과에서 어느 무리가 더 많거나 적은지 개수를 근거로 말한다."
    ],
    assessmentPrompt:
      "분류 결과를 제시하고, 학생이 사용한 기준과 각 무리의 개수 또는 두 무리의 많고 적음을 한 문장으로 말하게 하라.",
    misconceptions: [
      {
        misconceptionId: "data.classification.result-without-criterion-v1",
        statement: "개수만 말하고 어떤 기준으로 분류한 결과인지 설명하지 않는다."
      },
      {
        misconceptionId: "data.classification.total-as-class-v1",
        statement: "전체 자료 수를 한 무리의 개수인 것처럼 말한다."
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
      "분류 기준과 개수를 연결해 결과를 말하는 목표다. 단순히 숫자 하나만 답하는 것으로 완전히 충족되지는 않는다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  })
] as const;

const rawSets: readonly AssessmentTargetSet[] = [
  assessmentTargetSetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    standardCode: STANDARD_CODE,
    targetIds: Object.values(CLASSIFICATION_ASSESSMENT_TARGET_IDS),
    completeness: "reviewed-complete",
    scopeNote:
      "공식 문장의 정해진 기준, 자신이 정한 기준, 개수 세기, 기준에 따른 결과 말하기를 네 개의 필수 평가 목표로 빠짐없이 분해했다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  })
] as const;

function assertRegistryIntegrity(): void {
  const targetIds = rawTargets.map((target) => target.targetId);
  if (new Set(targetIds).size !== targetIds.length) {
    throw new Error("assessment-target-duplicate");
  }
  const setCodes = rawSets.map((set) => set.standardCode);
  if (new Set(setCodes).size !== setCodes.length) {
    throw new Error("assessment-target-set-duplicate");
  }
  for (const set of rawSets) {
    if (!findOfficialElementaryStandard(set.standardCode)) {
      throw new Error(`assessment-target-standard-unknown:${set.standardCode}`);
    }
    const targets = rawTargets.filter(
      (target) => target.standardCode === set.standardCode
    );
    const actual = [...targets.map((target) => target.targetId)].sort();
    const declared = [...set.targetIds].sort();
    if (JSON.stringify(actual) !== JSON.stringify(declared)) {
      throw new Error(`assessment-target-set-incomplete:${set.standardCode}`);
    }
    if (targets.some((target) => target.reviewStatus !== "reviewed")) {
      throw new Error(`assessment-target-set-unreviewed:${set.standardCode}`);
    }
  }
}

assertRegistryIntegrity();

export const assessmentTargets: readonly AssessmentTarget[] = rawTargets;
export const assessmentTargetSets: readonly AssessmentTargetSet[] = rawSets;

export function findAssessmentTarget(
  targetId: string
): AssessmentTarget | undefined {
  return assessmentTargets.find((target) => target.targetId === targetId);
}

export function findAssessmentTargetSet(
  standardCode: string
): AssessmentTargetSet | undefined {
  return assessmentTargetSets.find((set) => set.standardCode === standardCode);
}
