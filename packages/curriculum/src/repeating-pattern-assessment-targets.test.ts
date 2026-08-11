import { describe, expect, it } from "vitest";
import {
  REPEATING_PATTERN_ASSESSMENT_TARGET_IDS,
  assessmentTargetSets,
  assessmentTargets,
  findAssessmentTarget,
  findAssessmentTargetSet
} from "./assessment-targets.js";
import { findOfficialElementaryStandard } from "./official-elementary-standards.js";

describe("[2수02-01] reviewed AssessmentTarget set", () => {
  it("공식 목표를 규칙 찾기와 여러 방법으로 표현하기의 두 필수 목표로 고정한다", () => {
    expect(
      findOfficialElementaryStandard("[2수02-01]")?.officialGoal
    ).toBe(
      "물체, 무늬, 수 등의 배열에서 규칙을 찾아 여러 가지 방법으로 표현할 수 있다."
    );
    const set = findAssessmentTargetSet("[2수02-01]");
    const targets = assessmentTargets.filter(
      (target) => target.standardCode === "[2수02-01]"
    );
    expect(set).toMatchObject({
      completeness: "reviewed-complete",
      targetIds: Object.values(REPEATING_PATTERN_ASSESSMENT_TARGET_IDS)
    });
    expect(targets).toHaveLength(2);
    expect(targets.every((target) => target.required)).toBe(true);
    expect(new Set(targets.map((target) => target.targetId))).toEqual(
      new Set(set?.targetIds)
    );
    expect(set?.scopeNote).toContain(
      "물체·무늬·수는 별도 목표가 아니라 문제 맥락의 다양성"
    );
  });

  it("규칙의 발견과 서로 다른 표현의 연결을 각각 관찰 가능하게 정의한다", () => {
    expect(
      findAssessmentTarget(
        REPEATING_PATTERN_ASSESSMENT_TARGET_IDS.identifyRule
      )
    ).toMatchObject({
      learningMap: {
        topicIds: [
          "kr.mt.math.change-relationships.g1-2.s2-02-01.concept"
        ],
        prerequisiteTopicIds: []
      },
      misconceptions: expect.arrayContaining([
        expect.objectContaining({
          misconceptionId: "change.pattern.visible-whole-as-unit-v1"
        })
      ])
    });
    expect(
      findAssessmentTarget(
        REPEATING_PATTERN_ASSESSMENT_TARGET_IDS.expressRuleMultipleWays
      )
    ).toMatchObject({
      learningMap: {
        topicIds: [
          "kr.mt.math.change-relationships.g1-2.s2-02-01.representation"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.change-relationships.g1-2.s2-02-01.concept"
        ]
      },
      observableEvidence: expect.arrayContaining([
        expect.stringContaining("조각 수와 실제 배열")
      ])
    });
    expect(assessmentTargetSets).toHaveLength(4);
    expect(assessmentTargets).toHaveLength(10);
  });
});
