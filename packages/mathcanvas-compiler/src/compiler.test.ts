import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CONTRACT_SCHEMA_VERSION,
  sha256Hex
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  generateFractionComparisonActivitySet,
  splitActivitySetIntoCanvases
} from "@mathcanvas/templates";
import {
  CREATE_PROJECT_ENDPOINT,
  FRACTION_SVG_BY_DENOMINATOR,
  compileCanvasActivitySpec
} from "./index.js";

function compiled() {
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "compiler-request",
    prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
    problemCount: 4,
    createdAt: "2026-07-28T00:00:00.000Z"
  });
  const set = generateFractionComparisonActivitySet(recommendation, {
    seed: "compiler-seed",
    generatedAt: "2026-07-28T02:00:00.000Z"
  });
  const spec = splitActivitySetIntoCanvases(set)[0]!;
  return { set, spec, compiled: compileCanvasActivitySpec(spec) };
}

describe("MathCanvas 컴파일러", () => {
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
      /^분수 띠로 크기 비교하기 · 5학년 · 보통 · 1\/4 \[AI-[A-F0-9]{12}\]$/
    );
    expect(result.payload.isShowMenuOnActivity).toBe(false);
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
      expect(native?.x).toBeCloseTo(model.bounds.x + perWidth / 2);
      expect(native?.y).toBe(model.bounds.y + 40);
      expect(native).toMatchObject({
        groupId: `${model.id}-move-group`,
        isGroup: true,
        isMoveRotateHandler: false,
        isFillChange: false,
        isSplit: false,
        parent: { isResizeHandle: false, isAngleHandle: false }
      });
      const moveGroup = result.payload.contentsJson.find(
        (object) => object.id === `${model.id}-move-group`
      );
      expect(moveGroup).toMatchObject({
        svgId: "group-element",
        groupId: `${model.id}-move-group`,
        ids: [model.id],
        viewBox: {
          x: model.bounds.x,
          y: model.bounds.y,
          width: model.bounds.width,
          height: model.bounds.height
        },
        isGroup: true,
        isBluePrint: true,
        playgroundIndex: 0,
        isMoveRotateHandler: false
      });
    }
  });

  it("고정 표면만 잠그고 분수 띠·기호·입력칸은 학생이 조작하게 둔다", () => {
    const { spec, compiled: result } = compiled();
    const locked = new Set(result.payload.canvasOption.lockIds.flat());
    for (const model of spec.visualModels) {
      expect(locked.has(model.id)).toBe(false);
      expect(locked.has(`${model.id}-move-group`)).toBe(false);
    }
    for (const object of spec.movableObjects)
      expect(locked.has(object.id)).toBe(false);
    expect(locked.has(spec.inputObjects[0]!.id)).toBe(false);
    expect(locked.has("instruction-main")).toBe(true);
    expect(locked.has("problem-1-mat")).toBe(true);
    expect(locked.has("problem-1-left-lane-label")).toBe(true);
    expect(
      locked.has(`${spec.inputObjects[0]!.id}-surface`)
    ).toBe(true);
  });

  it("두 분수 식과 기호 놓기 칸이 겹치지 않는다", () => {
    const { compiled: result } = compiled();
    const left = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-left-fraction"
    )!;
    const right = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-right-fraction"
    )!;
    const slot = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-relation-slot-surface"
    )!;
    expect(left.fill).toBe("transparent");
    expect(right.fill).toBe("transparent");
    const slotLeft = (slot.point1 as [number, number])[0];
    const slotRight = (slot.point2 as [number, number])[0];
    expect(Number(left.x) + Number(left.width)).toBeLessThan(slotLeft);
    expect(Number(right.x)).toBeGreaterThan(slotRight);
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

  it("분수 식은 수식으로, 띠 이름은 읽기 쉬운 일반 글자로 만든다", () => {
    const { compiled: result } = compiled();
    const prompt = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-left-fraction"
    )!;
    const order = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-order-label"
    )!;
    const laneLabel = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-left-lane-label"
    )!;

    expect(prompt.svgId).toBe("math-latex");
    expect(order).toMatchObject({ svgId: "input-text", text: "1/4" });
    expect(laneLabel).toMatchObject({
      svgId: "input-text",
      text: "첫째 띠 자리",
      fontSize: 24,
      x: 790
    });
  });

  it("비교 기호는 이동 전용이고 비교 까닭 칸은 실제 편집 객체다", () => {
    const { spec, compiled: result } = compiled();
    const less = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-less-symbol"
    )!;
    const response = result.payload.contentsJson.find(
      (object) => object.id === spec.inputObjects[0]!.id
    )!;
    const responseSurface = result.payload.contentsJson.find(
      (object) => object.id === `${spec.inputObjects[0]!.id}-surface`
    )!;
    expect(less).toMatchObject({
      svgId: "math-latex",
      text: "<",
      isMoveRotateHandler: false
    });
    expect(response).toMatchObject({
      svgId: "input-text",
      isTextEdit: true,
      isTextEditFontSize: false,
      isMoveRotateHandler: false,
      playgroundIndex: 2
    });
    expect(responseSurface).toMatchObject({
      svgId: "drawElem",
      fill: "#FFFFFF",
      stroke: "#718398",
      isMoveRotateHandler: false
    });
  });
});
