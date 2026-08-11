import {
  PROBLEM_FAMILY_SCHEMA_VERSION,
  assessmentTargetSchema,
  assessmentTargetSetSchema,
  type AssessmentTarget,
  type AssessmentTargetSet
} from "@mathcanvas/contracts";
import { LEARNING_MAP_COMMIT } from "../data.js";

const REVIEWED_AT = "2026-08-11T08:40:00.000Z";
const REVIEWER = "repository-owner-directed Codex review";
const STANDARD_CODE = "[2수02-01]";

export const REPEATING_PATTERN_ASSESSMENT_TARGET_IDS = {
  identifyRule: "change.pattern.identify-rule-v1",
  expressRuleMultipleWays:
    "change.pattern.express-rule-multiple-ways-v1"
} as const;

const conceptTopic =
  "kr.mt.math.change-relationships.g1-2.s2-02-01.concept";
const representationTopic =
  "kr.mt.math.change-relationships.g1-2.s2-02-01.representation";

export const repeatingPatternAssessmentTargets:
  readonly AssessmentTarget[] = [
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId: REPEATING_PATTERN_ASSESSMENT_TARGET_IDS.identifyRule,
    standardCode: STANDARD_CODE,
    statement:
      "물체, 무늬, 수 등의 배열에서 대상이 되풀이되거나 변하는 관계를 살펴 규칙을 찾을 수 있다.",
    observableEvidence: [
      "반복 배열에서 되풀이되는 가장 짧은 단위와 그 경계를 찾는다.",
      "찾은 규칙을 그대로 적용해 다음 대상이나 빈자리에 올 대상을 결정한다."
    ],
    assessmentPrompt:
      "물체, 무늬 또는 수의 배열을 제시하고, 학생이 배열의 규칙을 찾아 다음 대상이나 빈자리를 완성한 뒤 무엇이 어떻게 되풀이되거나 변하는지 말하게 하라.",
    misconceptions: [
      {
        misconceptionId: "change.pattern.visible-whole-as-unit-v1",
        statement:
          "화면에 보이는 배열 전체를 가장 짧은 반복 단위라고 생각한다."
      },
      {
        misconceptionId: "change.pattern.single-feature-only-v1",
        statement:
          "색이나 모양 한 가지만 보고 대상의 순서와 위치 관계를 함께 살피지 않는다."
      }
    ],
    learningMap: {
      repository: "DECK6/korean-elementary-learning-map",
      commit: LEARNING_MAP_COMMIT,
      topicIds: [conceptTopic],
      prerequisiteTopicIds: []
    },
    required: true,
    reviewStatus: "reviewed",
    scopeNote:
      "반복, 증가, 위치 변화 등 배열에서 관찰할 수 있는 규칙을 찾는 목표다. 현재 released family는 세 패턴 블록이 되풀이되는 무늬에 한정한다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  }),
  assessmentTargetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    targetId:
      REPEATING_PATTERN_ASSESSMENT_TARGET_IDS.expressRuleMultipleWays,
    standardCode: STANDARD_CODE,
    statement:
      "찾은 배열의 규칙을 말, 글, 수, 그림, 움직임 등 두 가지 이상의 방법으로 표현하고 표현 사이의 연결을 설명할 수 있다.",
    observableEvidence: [
      "같은 규칙을 반복 단위의 조각 수와 실제 배열을 이어 놓는 방법으로 각각 나타낸다.",
      "서로 다른 표현이 같은 순서와 같은 반복 경계를 나타내는 까닭을 말하거나 쓴다."
    ],
    assessmentPrompt:
      "학생이 찾은 배열의 규칙을 서로 다른 두 가지 방법으로 나타내고, 두 표현이 같은 규칙을 뜻하는 까닭을 배열의 순서나 반복 경계로 설명하게 하라.",
    misconceptions: [
      {
        misconceptionId: "change.pattern.copy-without-rule-v1",
        statement:
          "보이는 대상을 그대로 베끼지만 어떤 단위나 관계가 되풀이되는지는 나타내지 못한다."
      },
      {
        misconceptionId: "change.pattern.representation-mismatch-v1",
        statement:
          "말이나 수로 나타낸 규칙과 실제로 이어 놓은 배열의 순서가 서로 다르다."
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
      "공식 문구의 ‘여러 가지 방법’을 최소 두 표현과 그 연결로 평가한다. 현재 released family는 조각 수 선택, 패턴 블록 이어 놓기, 반복 경계 설명을 사용한다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  })
] as const;

export const repeatingPatternAssessmentTargetSet: AssessmentTargetSet =
  assessmentTargetSetSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    standardCode: STANDARD_CODE,
    targetIds: Object.values(REPEATING_PATTERN_ASSESSMENT_TARGET_IDS),
    completeness: "reviewed-complete",
    scopeNote:
      "공식 문장의 배열 규칙 찾기와 그 규칙을 여러 가지 방법으로 표현하기를 두 개의 필수 평가 목표로 분해했다. 물체·무늬·수는 별도 목표가 아니라 문제 맥락의 다양성으로 관리한다.",
    reviewedAt: REVIEWED_AT,
    reviewer: REVIEWER
  });
