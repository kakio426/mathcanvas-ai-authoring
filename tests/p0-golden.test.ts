import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  sha256Hex,
  verifyApprovalReceipt
} from "@mathcanvas/contracts";
import {
  buildP0FractionComparisonGolden,
  buildP3FractionComparisonGolden,
  p0GoldenFixturePath,
  p3GoldenFixturePath,
  stablePrettyJson,
  writeP0FractionComparisonGolden
} from "../scripts/golden/fraction-comparison.js";

const updateRequested =
  process.env.MATHCANVAS_UPDATE_GOLDEN === "1";

if (updateRequested) writeP0FractionComparisonGolden();

describe("P0 분수 비교 고정 seed 골든", () => {
  it("planner → template → compiler → validator 결과가 골든과 일치한다", () => {
    const expected = readFileSync(p0GoldenFixturePath, "utf8");
    const actual = stablePrettyJson(
      buildP0FractionComparisonGolden()
    );

    expect(actual).toBe(expected);
    expect(
      stablePrettyJson(buildP3FractionComparisonGolden())
    ).toBe(readFileSync(p3GoldenFixturePath, "utf8"));
  });

  it("과거 canary와 현재 승인 해시를 각각의 골든에 연결한다", () => {
    const historical = buildP0FractionComparisonGolden();
    const current = buildP3FractionComparisonGolden();
    const {
      activitySpec,
      compiledProject,
      approvalReceipt
    } = current.results;

    expect(historical.results.compiledProject.payloadHash).toBe(
      sha256Hex(historical.results.compiledProject.payload)
    );
    expect(historical.invariants.submittedObjectCount).toBe(59);
    expect(compiledProject.payloadHash).toBe(
      sha256Hex(compiledProject.payload)
    );
    expect(approvalReceipt.activitySpecHash).toBe(
      sha256Hex(activitySpec)
    );
    expect(
      verifyApprovalReceipt(
        activitySpec,
        approvalReceipt,
        new Date("2026-07-29T00:04:00.000Z")
      )
    ).toBe(true);
    expect(current.invariants.validationCanCreate).toBe(true);
    expect(current.invariants.validationIssueCodes).toEqual([]);
    expect(current.results.compiledProject.payload).not.toEqual(
      historical.results.compiledProject.payload
    );
    const p3Approval = current.results.activitySpec as {
      binding: { variation: unknown };
    };
    expect(p3Approval.binding.variation).toEqual({
      problemCount: 4,
      difficulty: "normal",
      denominatorRelation: "mixed"
    });
  });

  it("정규화가 입력 객체를 변경하지 않는다", () => {
    const input = {
      z: [{ second: 2, first: 1 }],
      a: { nested: true }
    };
    const before = structuredClone(input);

    stablePrettyJson(input);

    expect(input).toEqual(before);
  });
});
