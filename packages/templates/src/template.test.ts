import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  generateFractionComparisonActivitySet,
  splitActivitySetIntoCanvases,
  VISUAL_DIFFERENCE_BANDS
} from "./index.js";

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
      const spec = generateFractionComparisonActivitySet(
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
      generateFractionComparisonActivitySet(recommendation(), options)
    ).toEqual(generateFractionComparisonActivitySet(recommendation(), options));
  });

  it("쉬움에서 어려움으로 갈수록 눈으로 구별할 길이 차이가 줄어든다", () => {
    expect(VISUAL_DIFFERENCE_BANDS.easy.min).toBeGreaterThan(
      VISUAL_DIFFERENCE_BANDS.normal.max
    );
    expect(VISUAL_DIFFERENCE_BANDS.normal.min).toBeGreaterThanOrEqual(
      VISUAL_DIFFERENCE_BANDS.hard.max
    );
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const spec = generateFractionComparisonActivitySet(
        recommendation({ difficulty, problemCount: 6 }),
        {
          seed: `difficulty-band-${difficulty}`,
          generatedAt: "2026-07-28T02:00:00.000Z"
        }
      );
      for (const problem of spec.problems) {
        const difference = Math.abs(
          problem.left.numerator / problem.left.denominator -
            problem.right.numerator / problem.right.denominator
        );
        expect(difference).toBeGreaterThanOrEqual(
          VISUAL_DIFFERENCE_BANDS[difficulty].min
        );
        expect(difference).toBeLessThanOrEqual(
          VISUAL_DIFFERENCE_BANDS[difficulty].max
        );
      }
    }
  });

  it.each([2, 4, 6])(
    "%i문제를 한 문제짜리 캔버스로 정확히 나눈다",
    (problemCount) => {
      const set = generateFractionComparisonActivitySet(
        recommendation({ problemCount }),
        {
          seed: `canvas-count-${problemCount}`,
          generatedAt: "2026-07-28T02:00:00.000Z"
        }
      );
      const canvases = splitActivitySetIntoCanvases(set);
      expect(canvases).toHaveLength(problemCount);
      expect(canvases.map((canvas) => canvas.canvasIndex)).toEqual(
        Array.from({ length: problemCount }, (_, index) => index + 1)
      );
      expect(new Set(canvases.map((canvas) => canvas.canvasHash)).size).toBe(
        problemCount
      );
      for (const canvas of canvases) {
        expect(canvas.layout).toEqual({
          width: 1280,
          height: 800,
          viewBox: [0, 0, 1280, 800],
          stageRatio: "16:10",
          minGap: 16
        });
        expect(canvas.problem.order).toBe(canvas.canvasIndex);
        expect(canvas.visualModels).toHaveLength(2);
        expect(canvas.inputObjects).toHaveLength(1);
        expect(
          canvas.placementGuides.every(
            (guide) => guide.behavior === "visual-guide-only"
          )
        ).toBe(true);
      }
    }
  );

  it("문제마다 같은 전체와 실제 수학 판단이 있는 조작을 만든다", () => {
    const set = generateFractionComparisonActivitySet(recommendation(), {
      seed: "visual-seed",
      generatedAt: "2026-07-28T02:00:00.000Z"
    });
    const canvases = splitActivitySetIntoCanvases(set);
    for (const canvas of canvases) {
      const models = canvas.visualModels;
      expect(new Set(models.map((model) => model.wholeWidth))).toEqual(
        new Set([400])
      );
      expect(new Set(models.map((model) => model.commonStartX))).toEqual(
        new Set([720])
      );
      const leftModel = models.find(
        (model) => model.role === "left-strip"
      )!;
      const rightModel = models.find(
        (model) => model.role === "right-strip"
      )!;
      expect(new Set(models.map((model) => model.bounds.x)).size).toBe(2);
      const leftEnd = leftModel.bounds.x + leftModel.bounds.width;
      const rightEnd = rightModel.bounds.x + rightModel.bounds.width;
      if (canvas.problem.correctRelation === ">") {
        expect(leftEnd + canvas.layout.minGap).toBeLessThan(rightEnd);
      } else {
        expect(rightEnd + canvas.layout.minGap).toBeLessThan(leftEnd);
      }
      for (const model of models) {
        expect(model.bounds.x).toBeGreaterThanOrEqual(95);
        expect(model.bounds.x + model.bounds.width).toBeLessThanOrEqual(525);
      }
      const decisions = canvas.movableObjects
        .map((object) => object.mathematicalDecision)
        .join(" ");
      expect(decisions).toContain("띠");
      expect(canvas.inputObjects[0]?.placeholder).toContain("한 줄");
      expect(
        canvas.fixedObjects.find(
          (object) => object.id === `${canvas.problem.id}-response-label`
        )?.text
      ).toBe("3. 까닭을 써요");
      expect(
        canvas.fixedObjects.find(
          (object) => object.id === `${canvas.problem.id}-start-label`
        )?.text
      ).toBe("출발선");
      expect(canvas.instructions).toEqual([
        "시작점이 다른 두 띠를 출발선에 맞춰요."
      ]);

      const lanes = canvas.placementGuides.filter(
        (guide) => guide.kind === "comparison-lane"
      );
      const startLine = canvas.fixedObjects.find(
        (object) => object.kind === "common-start-line"
      )!;
      for (const model of models) {
        expect(model.bounds.x + model.bounds.width + canvas.layout.minGap)
          .toBeLessThanOrEqual(model.commonStartX);
        for (const lane of lanes) {
          expect(
            model.bounds.x < lane.bounds.x + lane.bounds.width &&
              model.bounds.x + model.bounds.width > lane.bounds.x &&
              model.bounds.y < lane.bounds.y + lane.bounds.height &&
              model.bounds.y + model.bounds.height > lane.bounds.y
          ).toBe(false);
        }
        expect(model.bounds.x + model.bounds.width).toBeLessThan(
          startLine.bounds.x
        );
      }
    }
  });
});
