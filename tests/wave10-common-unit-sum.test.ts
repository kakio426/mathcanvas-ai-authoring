import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  prepareRegisteredActivityForEnvelopeValidation,
  unlikeDenominatorCommonUnitSumBlueprint
} from "@mathcanvas/templates";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function lcm(left: number, right: number): number {
  return (left * right) / gcd(left, right);
}

function reducedKey(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

describe("Wave 10 공통 단위로 더하는 분모가 다른 분수 활동", () => {
  it("다섯 오개념 선택지와 같은 칸으로 나눈 고정 자를 만든다", () => {
    const curriculum = resolveCurriculum("[6수01-08]");
    const recommendation = recommendationSchema.parse({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "wave10-common-unit-test",
      supported: true,
      templateId: unlikeDenominatorCommonUnitSumBlueprint.id,
      gradeBand: curriculum.record.gradeBand,
      recommendedGrade: 5,
      standardCode: curriculum.record.code,
      learningGoal:
        unlikeDenominatorCommonUnitSumBlueprint.learningObjective,
      prerequisites: curriculum.record.prerequisites,
      problemCount: 2,
      difficulty: "normal",
      manipulation: "unlike-denominator-common-unit-drag",
      rationale: ["Wave 10 집중 테스트입니다."],
      confidence: 0.98,
      caveats: curriculum.warnings,
      blockingReasons: [],
      curriculum: curriculum.record
    });
    const plan =
      prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: "wave10-common-unit-test",
          generatedAt: "2026-07-31T00:00:00.000Z",
          activityId: "wave10-common-unit-test"
        }
      );
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-07-31T00:00:00.000Z")
    );

    expect(report.issues).toEqual([]);
    expect(report.canCreate).toBe(true);
    expect(
      resolved.items.every((item) => {
        const leftDenominator = Number(
          item.values.leftDenominator
        );
        const rightDenominator = Number(
          item.values.rightDenominator
        );
        const commonDenominator = Number(
          item.values.commonDenominator
        );
        const leftCells = Number(item.values.leftCells);
        const rightCells = Number(item.values.rightCells);
        const sumCells = Number(item.values.sumCells);
        const candidates = [1, 2, 3, 4, 5].map(
          (number) => item.values[`candidate${number}`]
        );
        return (
          gcd(
            Number(item.values.leftNumerator),
            leftDenominator
          ) === 1 &&
          gcd(
            Number(item.values.rightNumerator),
            rightDenominator
          ) === 1 &&
          commonDenominator ===
            lcm(leftDenominator, rightDenominator) &&
          commonDenominator > rightDenominator &&
          720 % leftDenominator === 0 &&
          720 % rightDenominator === 0 &&
          720 % commonDenominator === 0 &&
          sumCells === leftCells + rightCells &&
          sumCells < commonDenominator &&
          new Set(candidates).size === 5 &&
          [
            item.values.correctResultText,
            item.values.addBothText,
            item.values.sameNumeratorText,
            item.values.largerPartText,
            item.values.productText
          ].every((value) => candidates.includes(value))
        );
      })
    ).toBe(true);
    expect(
      new Set(
        resolved.items.map((item) =>
          [
            reducedKey(
              Number(item.values.leftNumerator),
              Number(item.values.leftDenominator)
            ),
            reducedKey(
              Number(item.values.rightNumerator),
              Number(item.values.rightDenominator)
            )
          ]
            .sort()
            .join("+")
        )
      ).size
    ).toBe(resolved.items.length);

    const fractionModels =
      compiled.payload.contentsJson.filter(
        (object) =>
          typeof object.svgId === "string" &&
          object.svgId.startsWith("NO03FM-")
      );
    const unitRulers = fractionModels.filter(
      (object) =>
        typeof object.id === "string" &&
        object.id.includes("unit-ruler")
    );
    expect(fractionModels).toHaveLength(
      resolved.items.length * 3
    );
    expect(unitRulers).toHaveLength(resolved.items.length);
    expect(
      unitRulers.every(
        (object) =>
          Number(object.count) === Number(object.divider) &&
          resolved.items.some(
            (item) =>
              Number(object.count) ===
              Number(item.values.commonDenominator)
          )
      )
    ).toBe(true);
  });
});
