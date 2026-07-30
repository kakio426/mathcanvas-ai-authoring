import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  parseActivityBlueprint
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  FRACTION_PAIR_VARIATION_CAPACITY_CELLS,
  VISUAL_DIFFERENCE_BANDS,
  equivalentFractionBlueprint,
  fractionComparisonBlueprint,
  generateFractionComparisonActivity,
  makeTenNumberCardsBlueprint,
  resolveRegisteredVariation
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
  it("blueprint의 절대 좌표, raw payload, 함수, 직접 정답을 거부한다", () => {
    const base = generateFractionComparisonActivity(
      recommendation(),
      {
        seed: "blueprint-negative",
        generatedAt: "2026-07-28T02:00:00.000Z"
      }
    ).blueprint;
    const cases: unknown[] = [];
    const absolute = structuredClone(base) as unknown as Record<
      string,
      unknown
    >;
    absolute.x = 10;
    cases.push(absolute);
    const raw = structuredClone(base) as unknown as Record<
      string,
      unknown
    >;
    raw.contentsJson = [];
    cases.push(raw);
    cases.push({
      ...base,
      variationDefaults: {
        ...base.variationDefaults,
        run: () => true
      }
    });
    const answered = structuredClone(base) as unknown as {
      generator: { parameters: Record<string, unknown> };
    };
    answered.generator.parameters.correctRelation = ">";
    cases.push(answered);
    cases.forEach((candidate) =>
      expect(() => parseActivityBlueprint(candidate)).toThrow(
        /blueprint-(key|function)-forbidden/
      )
    );
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        problemCount: 1
      })
    ).toThrow("variation-value-unsupported");
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        problemCount: 7
      })
    ).toThrow("variation-value-unsupported");
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        problemCount: 4,
        unknownKnob: true
      })
    ).toThrow("variation-key-unsupported");
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        denominatorRelation: "random"
      })
    ).toThrow("variation-value-unsupported");
    expect(() =>
      resolveRegisteredVariation(equivalentFractionBlueprint.id, {
        problemCount: 4,
        difficulty: "hard"
      })
    ).toThrow("variation-pinned-override");
    expect(() =>
      resolveRegisteredVariation(equivalentFractionBlueprint.id, {
        denominatorRelation: "mixed"
      })
    ).toThrow("variation-key-unsupported");
    expect(() =>
      resolveRegisteredVariation(makeTenNumberCardsBlueprint.id, {
        problemCount: 6
      })
    ).toThrow("variation-value-unsupported");
  });

  it("고정 seed와 generator version에서 의미 문항과 provenance가 byte-stable하다", () => {
    const options = {
      seed: "generator-stability",
      generatedAt: "2026-07-28T02:00:00.000Z"
    };
    const first = generateFractionComparisonActivity(
      recommendation(),
      options
    );
    const second = generateFractionComparisonActivity(
      recommendation(),
      options
    );
    expect(first.items).toEqual(second.items);
    expect(
      new Set(
        first.items.map(
          (item) =>
            `${item.provenance.generatorId}:${item.provenance.generatorVersion}:${item.provenance.seed}`
        )
      ).size
    ).toBe(1);
  });

  it.each(["easy", "normal", "hard"] as const)(
    "%s 난이도에서 정확한 서로 다른 분모 문제를 만든다",
    (difficulty) => {
      const plan = generateFractionComparisonActivity(
        recommendation({ difficulty }),
        {
          seed: `seed-${difficulty}`,
          generatedAt: "2026-07-28T02:00:00.000Z"
        }
      );
      expect(plan.items).toHaveLength(4);
      const comparisonKeys = plan.items.map((item) => {
        const left = item.values.left as {
          numerator: number;
          denominator: number;
        };
        const right = item.values.right as {
          numerator: number;
          denominator: number;
        };
        return (
        [
          `${left.numerator}/${left.denominator}`,
          `${right.numerator}/${right.denominator}`
        ]
          .sort()
          .join("|")
        );
      });
      expect(new Set(comparisonKeys).size).toBe(comparisonKeys.length);
      for (const item of plan.items) {
        const left = item.values.left as {
          numerator: number;
          denominator: number;
        };
        const right = item.values.right as {
          numerator: number;
          denominator: number;
        };
        expect(left.denominator).not.toBe(right.denominator);
        const relation =
          left.numerator * right.denominator >
          right.numerator * left.denominator
            ? ">"
            : "<";
        expect(item.values.correctRelation).toBe(relation);
        expect(
          Math.abs(
            left.numerator / left.denominator -
              right.numerator / right.denominator
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
    expect(FRACTION_PAIR_VARIATION_CAPACITY_CELLS).toBe(9);
    expect(VISUAL_DIFFERENCE_BANDS.easy.min).toBeGreaterThan(
      VISUAL_DIFFERENCE_BANDS.normal.max
    );
    expect(VISUAL_DIFFERENCE_BANDS.normal.min).toBeGreaterThanOrEqual(
      VISUAL_DIFFERENCE_BANDS.hard.max
    );
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const plan = generateFractionComparisonActivity(
        recommendation({ difficulty, problemCount: 6 }),
        {
          seed: `difficulty-band-${difficulty}`,
          generatedAt: "2026-07-28T02:00:00.000Z"
        }
      );
      for (const item of plan.items) {
        const left = item.values.left as {
          numerator: number;
          denominator: number;
        };
        const right = item.values.right as {
          numerator: number;
          denominator: number;
        };
        const difference = Math.abs(
          left.numerator / left.denominator -
            right.numerator / right.denominator
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
    const plan = generateFractionComparisonActivity(recommendation(), {
      seed: "visual-seed",
      generatedAt: "2026-07-28T02:00:00.000Z"
    });
    expect(plan.blueprint.toolRoles.filter((role) => role.movable))
      .toHaveLength(5);
    expect(
      plan.blueprint.toolRoles
        .filter((role) => role.movable)
        .map((role) => role.instructionalIntent)
        .join(" ")
    ).toContain("크기");
    expect(
      plan.blueprint.instructions[2]
    ).toContain("기호");
    expect(
      plan.blueprint.instructions[3]
    ).toContain("설명");
    expect(
      plan.blueprint.constraints.some(
        (constraint) => constraint.requiresStudentAction
      )
    ).toBe(true);
  });
});
