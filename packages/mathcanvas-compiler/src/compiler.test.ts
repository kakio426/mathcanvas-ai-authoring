import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CONTRACT_SCHEMA_VERSION,
  sha256Hex
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  generateFractionComparisonActivity,
  projectFractionComparisonApprovalView
} from "@mathcanvas/templates";
import {
  CREATE_PROJECT_ENDPOINT,
  FRACTION_SVG_BY_DENOMINATOR,
  compileActivity,
  getLayoutPreset,
  resolveActivity,
  resolveLayout
} from "./index.js";
import type {
  LayoutPreset,
  LayoutToken
} from "@mathcanvas/contracts";

function compiled() {
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "compiler-request",
    prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
    problemCount: 4,
    createdAt: "2026-07-28T00:00:00.000Z"
  });
  const plan = generateFractionComparisonActivity(recommendation, {
    seed: "compiler-seed",
    generatedAt: "2026-07-28T02:00:00.000Z"
  });
  const resolved = resolveActivity(plan);
  const spec = projectFractionComparisonApprovalView(resolved);
  return { spec, resolved, compiled: compileActivity(resolved) };
}

describe("MathCanvas 컴파일러", () => {
  it("같은 blueprint와 seed에서 같은 상대 배치와 ResolvedActivity를 만든다", () => {
    const recommendation = recommendActivity({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "resolver-stable",
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
      createdAt: "2026-07-28T00:00:00.000Z"
    });
    const plan = generateFractionComparisonActivity(recommendation, {
      seed: "resolver-stable-seed",
      generatedAt: "2026-07-28T02:00:00.000Z"
    });
    expect(resolveActivity(plan)).toEqual(resolveActivity(plan));
  });

  it("layout missing/cycle/negative/overlap/overflow를 stable code로 차단한다", () => {
    const plan = generateFractionComparisonActivity(
      recommendActivity({
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        requestId: "layout-errors",
        prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
        createdAt: "2026-07-28T00:00:00.000Z"
      }),
      {
        seed: "layout-errors",
        generatedAt: "2026-07-28T02:00:00.000Z"
      }
    );
    const preset = getLayoutPreset(plan.blueprint.layout.tokenSet);
    const altered = (
      patch: Record<string, LayoutToken>
    ): LayoutPreset => ({
      ...preset,
      tokens: { ...preset.tokens, ...patch }
    });
    const primary = preset.tokens["header.primary"]!;
    const secondary = preset.tokens["header.secondary"]!;
    const cases: Array<[string, LayoutPreset]> = [
      [
        "layout-missing-anchor",
        altered({
          "header.primary": {
            ...primary,
            relativeTo: "missing.anchor"
          }
        })
      ],
      [
        "layout-cyclic-reference",
        altered({
          "header.primary": {
            ...primary,
            relativeTo: "header.secondary"
          },
          "header.secondary": {
            ...secondary,
            relativeTo: "header.primary"
          }
        })
      ],
      [
        "layout-negative-size",
        altered({
          "header.primary": { ...primary, width: -1 }
        })
      ],
      [
        "layout-overlap",
        altered({
          "header.secondary": {
            scope: secondary.scope,
            x: primary.x,
            y: primary.y,
            width: secondary.width,
            height: secondary.height
          }
        })
      ],
      [
        "layout-canvas-overflow",
        altered({
          "header.primary": { ...primary, x: 2390 }
        })
      ]
    ];
    cases.forEach(([code, tokens]) =>
      expect(() =>
        resolveLayout(
          plan.blueprint.layout,
          plan.items.map((item) => item.id),
          tokens
        )
      ).toThrow(code)
    );
  });

  it("공개 프로젝트에서 관찰한 네이티브 객체 계약을 따른다", () => {
    const observed = JSON.parse(
      readFileSync(
        new URL(
          "../../../fixtures/mathcanvas/native-object-contract.json",
          import.meta.url
        ),
        "utf8"
      )
    ) as {
      mathLatex: Record<string, unknown>;
      drawRectangle: Record<string, unknown>;
    };
    const { compiled: result } = compiled();
    const symbol = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-less-symbol"
    );
    const surface = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-left-lane-surface"
    );
    expect(symbol).toMatchObject(observed.mathLatex);
    expect(surface).toMatchObject({
      svgId: observed.drawRectangle.svgId,
      type: observed.drawRectangle.type,
      strokeType: observed.drawRectangle.strokeType,
      strokeWidth: observed.drawRectangle.strokeWidth,
      isStrokeChange: observed.drawRectangle.isStrokeChange,
      isMoveRotateHandler:
        observed.drawRectangle.isMoveRotateHandler
    });
  });

  it("새 프로젝트 POST 계약만 노출한다", () => {
    expect(CREATE_PROJECT_ENDPOINT).toBe("/api/project");
    const result = compiled().compiled;
    expect(result.payload.categoryId).toBe("rJa0d46MAy");
    expect(result.payload.studyLevel).toBe("elementary");
    expect(result.payload.isNoteworthy).toBe(false);
    expect(result.payload.projectTitle).toMatch(
      /^분수 띠로 크기 비교하기 · 5학년 · 4문제 · 보통 \[AI-[A-F0-9]{12}\]$/
    );
    expect(result.payloadHash).toBe(sha256Hex(result.payload));
  });

  it("분모와 MathCanvas 분수 모형 ID를 실제 fixture대로 연결한다", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          "../../../fixtures/mathcanvas/fraction-svg-map.json",
          import.meta.url
        ),
        "utf8"
      )
    ) as { svgIdByDenominator: Record<string, string> };
    expect(FRACTION_SVG_BY_DENOMINATOR).toEqual(
      Object.fromEntries(
        Object.entries(fixture.svgIdByDenominator).map(([key, value]) => [
          Number(key),
          value
        ])
      )
    );
    const { spec, compiled: result } = compiled();
    for (const model of spec.visualModels) {
      const native = result.payload.contentsJson.find(
        (object) => object.id === model.id
      );
      expect(native?.svgId).toBe(
        FRACTION_SVG_BY_DENOMINATOR[model.fraction.denominator]
      );
      expect(native?.count).toBe(model.fraction.numerator);
      expect(native?.divider).toBe(model.fraction.denominator);
      const perWidth = 640 / model.fraction.denominator;
      const geometricWidth = perWidth * model.fraction.numerator;
      expect(native?.width).toBe(Math.round(geometricWidth));
      expect(native?.cx).toBeCloseTo(
        ((model.fraction.numerator - 1) * perWidth) / 2
      );
      expect(native?.coordinates).toEqual([
        [-perWidth / 2, -40],
        [geometricWidth - perWidth / 2, -40],
        [geometricWidth - perWidth / 2, 40],
        [-perWidth / 2, 40]
      ]);
    }
  });

  it("고정 표면만 잠그고 분수 띠와 기호는 움직일 수 있게 둔다", () => {
    const { spec, compiled: result } = compiled();
    const locked = new Set(result.payload.canvasOption.lockIds.flat());
    for (const model of spec.visualModels) expect(locked.has(model.id)).toBe(false);
    for (const object of spec.movableObjects)
      expect(locked.has(object.id)).toBe(false);
    expect(locked.has("instruction-main")).toBe(true);
    expect(locked.has("instruction-symbol")).toBe(true);
    expect(locked.has("problem-1-mat")).toBe(true);
    expect(locked.has("problem-1-left-lane-label")).toBe(true);
    expect(locked.has("problem-1-relation-slot-label")).toBe(true);
  });

  it("문제 식과 기호 놓기 칸이 겹치지 않는다", () => {
    const { compiled: result } = compiled();
    const prompt = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-prompt"
    )!;
    const slot = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-relation-slot-surface"
    )!;
    expect(prompt.fill).toBe("transparent");
    const promptBottom = Number(prompt.y) + Number(prompt.height);
    const slotTop = (slot.point1 as [number, number])[1];
    expect(promptBottom).toBeLessThanOrEqual(slotTop);
    expect(slot).toMatchObject({
      svgId: "drawElem",
      x: 0,
      y: 0,
      strokeType: 1,
      strokeWidth: 2,
      isStrokeChange: true
    });
    expect(slot).not.toHaveProperty("width");
    expect(slot).not.toHaveProperty("height");
  });

  it("문제 번호는 일반 글자로, 분수 식은 수식으로 나누고 띠 이름을 비교판 안에 둔다", () => {
    const { spec, compiled: result } = compiled();
    const mat = spec.fixedObjects.find(
      (object) => object.id === "problem-1-mat"
    )!;
    const prompt = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-prompt"
    )!;
    const number = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-number"
    )!;
    const laneLabel = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-left-lane-label"
    )!;

    expect(prompt.svgId).toBe("math-latex");
    expect(String(prompt.text)).not.toContain("번");
    expect(number).toMatchObject({ svgId: "input-text", text: "1번" });
    expect(Number(laneLabel.x)).toBeGreaterThanOrEqual(mat.bounds.x);
    expect(Number(laneLabel.x) + Number(laneLabel.width)).toBeLessThanOrEqual(
      mat.bounds.x + mat.bounds.width
    );
  });
});
