import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  elapsedTimeClockPairBlueprint,
  prepareRegisteredActivityForEnvelopeValidation
} from "@mathcanvas/templates";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 7 걸린 시간 오개념 갈등 활동", () => {
  it("규칙형 문항·다섯 오개념 선택지·두 기어식 시계를 생성한다", () => {
    const curriculum = resolveCurriculum("[2수03-08]");
    const recommendation = recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "wave7-elapsed-time-test",
      supported: true,
      templateId: elapsedTimeClockPairBlueprint.id,
      gradeBand: curriculum.record.gradeBand,
      recommendedGrade: 2,
      standardCode: curriculum.record.code,
      learningGoal: elapsedTimeClockPairBlueprint.learningObjective,
      prerequisites: curriculum.record.prerequisites,
      problemCount: 2,
      difficulty: "normal",
      manipulation: "elapsed-time-clock-pair-drag",
      rationale: ["Wave 7 집중 테스트입니다."],
      confidence: 0.98,
      caveats: curriculum.warnings,
      blockingReasons: [],
      curriculum: curriculum.record
    });
    const plan =
      prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: "wave7-elapsed-time-test",
          generatedAt: "2026-07-31T00:00:00.000Z",
          activityId: "wave7-elapsed-time-test"
        }
      );
    const resolved = resolveActivity(plan);
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
          Number(item.values.startMinute) +
            Number(item.values.elapsedMinutes) >=
            60 &&
          new Set(candidates).size === 5 &&
          [
            item.values.correctResultText,
            item.values.minuteDifferenceText,
            item.values.hourOnlyText,
            item.values.decimalBorrowText,
            item.values.startMinuteText
          ].every((value) => candidates.includes(value))
        );
      })
    ).toBe(true);
    const clocks = compiled.payload.contentsJson.filter(
      (object) => object.svgId === "SM02AD-01"
    );
    expect(clocks).toHaveLength(resolved.items.length * 2);
    expect(
      clocks.every(
        (clock) =>
          clock.type === "geared" &&
          clock.isWorking === false
      )
    ).toBe(true);
  });
});
