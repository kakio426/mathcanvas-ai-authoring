import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  clockHourHandBoundaryBlueprint,
  prepareRegisteredActivityForEnvelopeValidation
} from "@mathcanvas/templates";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 6 시계 오개념 갈등 활동", () => {
  it("예측·그럴듯한 오답·기어식 시계·설명 구조를 생성한다", () => {
    const curriculum = resolveCurriculum("[2수03-07]");
    const recommendation = recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "wave6-clock-test",
      supported: true,
      templateId: clockHourHandBoundaryBlueprint.id,
      gradeBand: curriculum.record.gradeBand,
      recommendedGrade: 2,
      standardCode: curriculum.record.code,
      learningGoal:
        clockHourHandBoundaryBlueprint.learningObjective,
      prerequisites: curriculum.record.prerequisites,
      problemCount: 2,
      difficulty: "normal",
      manipulation: "clock-hour-hand-boundary-drag",
      rationale: ["Wave 6 집중 테스트입니다."],
      confidence: 0.98,
      caveats: curriculum.warnings,
      blockingReasons: [],
      curriculum: curriculum.record
    });
    const plan =
      prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: "wave6-clock-test",
          generatedAt: "2026-07-31T00:00:00.000Z",
          activityId: "wave6-clock-test"
        }
      );
    const resolved = resolveActivity({
      blueprint: plan.blueprint,
      items: plan.items,
      recommendation: plan.recommendation,
      options: plan.options
    });
    const compiled = compileActivity(resolved);
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-07-31T00:00:00.000Z")
    );

    expect(report.canCreate).toBe(true);
    expect(report.issues).toEqual([]);
    expect(
      resolved.items.every((item) => {
        const candidates = [1, 2, 3, 4, 5].map(
          (number) => item.values[`candidate${number}`]
        );
        return (
          new Set(candidates).size === 5 &&
          candidates.includes(item.values.correctPositionText) &&
          candidates.includes(item.values.currentHourText) &&
          candidates.includes(item.values.betweenStartText) &&
          candidates.includes(item.values.nextHourText) &&
          candidates.includes(item.values.minuteNumberText)
        );
      })
    ).toBe(true);
    expect(
      compiled.payload.contentsJson
        .filter((object) => object.svgId === "SM02AD-01")
        .every(
          (clock) =>
            clock.type === "geared" &&
            clock.minutes === 0 &&
            clock.isWorking === false
        )
    ).toBe(true);
  });
});
