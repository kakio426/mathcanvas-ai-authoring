import { describe, expect, it } from "vitest";
import { recommendationSchema } from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  prepareRegisteredActivityForEnvelopeValidation,
  unlikeDenominatorCommonUnitDifferenceBlueprint
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

describe("Wave 11 공통 단위로 빼는 분모가 다른 분수 활동", () => {
  it("다섯 오개념 카드와 덮어 남은 칸을 읽는 고정 자를 만든다", () => {
    const planned = recommendActivity({
      schemaVersion: "1.0.0",
      requestId: "wave11-common-unit-difference-test",
      prompt:
        "5학년 분모가 다른 분수의 뺄셈을 띠로 확인하는 활동지를 만들어 주세요.",
      requestedGrade: 5,
      createdAt: "2026-07-31T00:00:00.000Z"
    });
    expect(planned).toMatchObject({
      templateId:
        unlikeDenominatorCommonUnitDifferenceBlueprint.id,
      standardCode: "[6수01-08]",
      problemCount: 3,
      manipulation:
        "unlike-denominator-common-unit-difference-drag"
    });
    const recommendation = recommendationSchema.parse({
      ...planned,
      supported: true,
      blockingReasons: []
    });
    const plan =
      prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: "wave11-common-unit-difference-test",
          generatedAt: "2026-07-31T00:00:00.000Z",
          activityId: "wave11-common-unit-difference-test"
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
    expect(resolved.items).toHaveLength(3);
    expect(
      resolved.items.every((item) => {
        const leftDenominator = Number(
          item.values.leftDenominator
        );
        const rightDenominator = Number(
          item.values.rightDenominator
        );
        const leftNumerator = Number(
          item.values.leftNumerator
        );
        const rightNumerator = Number(
          item.values.rightNumerator
        );
        const commonDenominator = Number(
          item.values.commonDenominator
        );
        const leftCells = Number(item.values.leftCells);
        const rightCells = Number(item.values.rightCells);
        const differenceCells = Number(
          item.values.differenceCells
        );
        const candidates = [1, 2, 3, 4, 5].map(
          (number) => String(item.values[`candidate${number}`])
        );
        return (
          gcd(leftNumerator, leftDenominator) === 1 &&
          gcd(rightNumerator, rightDenominator) === 1 &&
          commonDenominator ===
            lcm(leftDenominator, rightDenominator) &&
          commonDenominator >
            Math.max(leftDenominator, rightDenominator) &&
          720 % leftDenominator === 0 &&
          720 % rightDenominator === 0 &&
          720 % commonDenominator === 0 &&
          leftCells ===
            leftNumerator *
              (commonDenominator / leftDenominator) &&
          rightCells ===
            rightNumerator *
              (commonDenominator / rightDenominator) &&
          differenceCells === leftCells - rightCells &&
          differenceCells >= 1 &&
          differenceCells < commonDenominator &&
          gcd(differenceCells, commonDenominator) === 1 &&
          new Set(
            candidates.map((candidate) => {
              const [numerator, denominator] = candidate
                .split("/")
                .map(Number);
              return reducedKey(numerator!, denominator!);
            })
          ).size === 5 &&
          [
            item.values.correctResultText,
            item.values.oneSideCommonText,
            item.values.coveredPartText,
            item.values.minuendOnlyText,
            item.values.denominatorSumText
          ].every((value) =>
            candidates.includes(String(value))
          )
        );
      })
    ).toBe(true);
    expect(
      new Set(
        resolved.items.map((item) =>
          [
            Number(item.values.leftDenominator),
            Number(item.values.rightDenominator)
          ]
            .sort((left, right) => left - right)
            .join(":")
        )
      ).size
    ).toBe(resolved.items.length);
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
          ].join("-")
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
        object.id.endsWith("-unit-ruler")
    );
    expect(fractionModels).toHaveLength(
      resolved.items.length * 3
    );
    expect(unitRulers).toHaveLength(resolved.items.length);
    expect(
      unitRulers.every((object) => {
        const item = resolved.items.find(
          (candidate) =>
            object.id === `${candidate.id}-unit-ruler`
        );
        return (
          item !== undefined &&
          Number(object.count) ===
            Number(item.values.commonDenominator) &&
          Number(object.divider) ===
            Number(item.values.commonDenominator)
        );
      })
    ).toBe(true);
  });
});
