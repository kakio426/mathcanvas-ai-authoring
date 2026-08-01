import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  prepareRegisteredActivityForEnvelopeValidation,
  sameDenominatorImproperSumBlueprint
} from "@mathcanvas/templates";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 9 1을 넘는 같은 분모 분수 덧셈 활동", () => {
  it("서로 다른 오개념 선택지와 1의 금을 넘는 두 분수 띠를 만든다", () => {
    const curriculum = resolveCurriculum("[4수01-15]");
    const recommendation = recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "wave9-improper-sum-test",
      supported: true,
      templateId: sameDenominatorImproperSumBlueprint.id,
      gradeBand: curriculum.record.gradeBand,
      recommendedGrade: 4,
      standardCode: curriculum.record.code,
      learningGoal:
        sameDenominatorImproperSumBlueprint.learningObjective,
      prerequisites: curriculum.record.prerequisites,
      problemCount: 2,
      difficulty: "normal",
      manipulation: "same-denominator-improper-sum-drag",
      rationale: ["Wave 9 집중 테스트입니다."],
      confidence: 0.98,
      caveats: curriculum.warnings,
      blockingReasons: [],
      curriculum: curriculum.record
    });
    const plan =
      prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: "wave9-improper-sum-test",
          generatedAt: "2026-07-31T00:00:00.000Z",
          activityId: "wave9-improper-sum-test"
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
          Number(item.values.sumNumerator) >
            Number(item.values.denominator) &&
          Number(item.values.overflowNumerator) ===
            Number(item.values.sumNumerator) -
              Number(item.values.denominator) &&
          new Set(candidates).size === 5 &&
          [
            item.values.correctResultText,
            item.values.addBothText,
            item.values.capAtOneText,
            item.values.overflowOnlyText,
            item.values.largerAddendText
          ].every((value) => candidates.includes(value))
        );
      })
    ).toBe(true);
    expect(
      new Set(
        resolved.items.map((item) =>
          [
            Number(item.values.leftNumerator),
            Number(item.values.rightNumerator)
          ]
            .sort((left, right) => left - right)
            .join(":")
        )
      ).size
    ).toBe(resolved.items.length);
    const boundaryCount = compiled.payload.contentsJson.filter(
      (object) =>
        typeof object.id === "string" &&
        object.id.includes("one-whole-boundary")
    ).length;
    expect(boundaryCount).toBe(resolved.items.length);
  });
});
