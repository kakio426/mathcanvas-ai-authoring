import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import { generateFractionComparisonActivity } from "./index.js";

function recommendation(
  overrides: Record<string, unknown> = {}
) {
  return recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "template-request",
    prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
    createdAt: "2026-07-28T00:00:00.000Z",
    ...overrides
  });
}

describe("분수 비교 템플릿", () => {
  it.each(["easy", "normal", "hard"] as const)(
    "%s 난이도에서 정확한 서로 다른 분모 문제를 만든다",
    (difficulty) => {
      const spec = generateFractionComparisonActivity(
        recommendation({ difficulty }),
        {
          seed: `seed-${difficulty}`,
          generatedAt: "2026-07-28T02:00:00.000Z"
        }
      );
      expect(spec.problems).toHaveLength(4);
      const comparisonKeys = spec.problems.map((problem) =>
        [
          `${problem.left.numerator}/${problem.left.denominator}`,
          `${problem.right.numerator}/${problem.right.denominator}`
        ]
          .sort()
          .join("|")
      );
      expect(new Set(comparisonKeys).size).toBe(comparisonKeys.length);
      for (const problem of spec.problems) {
        expect(problem.left.denominator).not.toBe(problem.right.denominator);
        const relation =
          problem.left.numerator * problem.right.denominator >
          problem.right.numerator * problem.left.denominator
            ? ">"
            : "<";
        expect(problem.correctRelation).toBe(relation);
        expect(
          Math.abs(
            problem.left.numerator / problem.left.denominator -
              problem.right.numerator / problem.right.denominator
          )
        ).toBeGreaterThanOrEqual(
          MIN_VISUAL_FRACTION_DIFFERENCE_RATIO
        );
      }
    }
  );

  it("같은 입력에서 같은 명세를 만든다", () => {
    const options = {
      seed: "same-seed",
      generatedAt: "2026-07-28T02:00:00.000Z"
    };
    expect(
      generateFractionComparisonActivity(recommendation(), options)
    ).toEqual(generateFractionComparisonActivity(recommendation(), options));
  });

  it("문제마다 같은 전체와 실제 수학 판단이 있는 조작을 만든다", () => {
    const spec = generateFractionComparisonActivity(recommendation(), {
      seed: "visual-seed",
      generatedAt: "2026-07-28T02:00:00.000Z"
    });
    for (const problem of spec.problems) {
      const models = spec.visualModels.filter(
        (model) => model.problemId === problem.id
      );
      expect(new Set(models.map((model) => model.wholeWidth))).toEqual(
        new Set([640])
      );
      expect(new Set(models.map((model) => model.commonStartX))).toEqual(
        new Set([720])
      );
      const decisions = spec.movableObjects
        .filter((object) => object.problemId === problem.id)
        .map((object) => object.mathematicalDecision)
        .join(" ");
      expect(decisions).toContain("크기");
    }
    expect(
      spec.fixedObjects.find(
        (object) => object.id === "instruction-symbol"
      )?.text
    ).toContain("기호");
  });
});
