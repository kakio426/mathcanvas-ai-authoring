import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  prepareRegisteredActivityForEnvelopeValidation,
  sameDenominatorFractionSumBlueprint
} from "@mathcanvas/templates";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 8 같은 분모 분수 덧셈 오개념 갈등 활동", () => {
  it("규칙형 문항·다섯 오개념 선택지·이어 붙일 두 분수 띠를 생성한다", () => {
    const curriculum = resolveCurriculum("[4수01-15]");
    const recommendation = recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "wave8-fraction-sum-test",
      supported: true,
      templateId: sameDenominatorFractionSumBlueprint.id,
      gradeBand: curriculum.record.gradeBand,
      recommendedGrade: 4,
      standardCode: curriculum.record.code,
      learningGoal:
        sameDenominatorFractionSumBlueprint.learningObjective,
      prerequisites: curriculum.record.prerequisites,
      problemCount: 2,
      difficulty: "normal",
      manipulation: "same-denominator-fraction-sum-drag",
      rationale: ["Wave 8 집중 테스트입니다."],
      confidence: 0.98,
      caveats: curriculum.warnings,
      blockingReasons: [],
      curriculum: curriculum.record
    });
    const plan =
      prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: "wave8-fraction-sum-test",
          generatedAt: "2026-07-31T00:00:00.000Z",
          activityId: "wave8-fraction-sum-test"
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
          Number(item.values.leftNumerator) +
            Number(item.values.rightNumerator) ===
            Number(item.values.sumNumerator) &&
          Number(item.values.sumNumerator) <
            Number(item.values.denominator) &&
          new Set(candidates).size === 5 &&
          [
            item.values.correctResultText,
            item.values.addBothText,
            item.values.largerAddendText,
            item.values.doubleCountText,
            item.values.differenceText
          ].every((value) => candidates.includes(value))
        );
      })
    ).toBe(true);
    const strips = compiled.payload.contentsJson.filter(
      (object) =>
        typeof object.svgId === "string" &&
        object.svgId.startsWith("NO03FM-")
    );
    expect(strips).toHaveLength(resolved.items.length * 2);
    expect(
      strips.every(
        (strip) =>
          Number(strip.count) > 0 &&
          Number(strip.divider) >= 3 &&
          Number(strip.count) < Number(strip.divider)
      )
    ).toBe(true);
  });
});
