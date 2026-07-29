import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CONTRACT_SCHEMA_VERSION,
  canvasActivityHash,
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
      const perWidth = model.wholeWidth / model.fraction.denominator;
      const geometricWidth = perWidth * model.fraction.numerator;
      expect(native?.width).toBeCloseTo(geometricWidth);
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
    expect(
      locked.has(`${spec.inputObjects[0]!.id}-surface`)
    ).toBe(true);
  });

  it("분수는 math-latex 없이 카드 안의 분자·분수선·분모로 만든다", () => {
    const { compiled: result } = compiled();
    expect(
      result.payload.contentsJson.some(
        (object) =>
          object.svgId === "math-latex" &&
          typeof object.text === "string" &&
          object.text.includes("\\frac")
      )
    ).toBe(false);

    for (const prefix of [
      "problem-1-left-fraction",
      "problem-1-right-fraction",
      "problem-1-relation-left-fraction",
      "problem-1-relation-right-fraction"
    ]) {
      const card = result.payload.contentsJson.find(
        (object) => object.id === `${prefix}-card`
      )!;
      const numerator = result.payload.contentsJson.find(
        (object) => object.id === `${prefix}-numerator`
      )!;
      const line = result.payload.contentsJson.find(
        (object) => object.id === `${prefix}-line`
      )!;
      const denominator = result.payload.contentsJson.find(
        (object) => object.id === `${prefix}-denominator`
      )!;
      const [cardX, cardY] = card.point1 as [number, number];
      const [cardRight, cardBottom] = card.point2 as [number, number];
      expect(numerator).toMatchObject({
        svgId: "input-text",
        fontSize: 32
      });
      expect(line).toMatchObject({ svgId: "drawElem" });
      expect(denominator).toMatchObject({
        svgId: "input-text",
        fontSize: 32
      });
      for (const piece of [numerator, denominator]) {
        expect(Number(piece.x)).toBeGreaterThanOrEqual(cardX);
        expect(Number(piece.y)).toBeGreaterThanOrEqual(cardY);
        expect(Number(piece.x) + Number(piece.width)).toBeLessThanOrEqual(
          cardRight
        );
        expect(Number(piece.y) + Number(piece.height)).toBeLessThanOrEqual(
          cardBottom
        );
      }
      const [lineX, lineY] = line.point1 as [number, number];
      const [lineRight, lineBottom] = line.point2 as [number, number];
      expect(lineX).toBeGreaterThanOrEqual(cardX);
      expect(lineY).toBeGreaterThanOrEqual(cardY);
      expect(lineRight).toBeLessThanOrEqual(cardRight);
      expect(lineBottom).toBeLessThanOrEqual(cardBottom);
      const lineCenter = (lineX + lineRight) / 2;
      for (const piece of [numerator, denominator]) {
        expect(
          Number(piece.x) + Number(piece.width) / 2
        ).toBeCloseTo(lineCenter);
      }
      expect(Number(numerator.y) + Number(numerator.height)).toBeLessThan(
        lineY
      );
      expect(Number(denominator.y)).toBeGreaterThan(lineBottom);
    }
  });

  it("준비 상자와 빈 목표 자리를 물리적으로 나눈다", () => {
    const { spec, compiled: result } = compiled();
    const laneSurfaces = spec.placementGuides
      .filter((guide) => guide.kind === "comparison-lane")
      .map((guide) => ({
        guide,
        surface: result.payload.contentsJson.find(
          (object) => object.id === `${guide.id}-surface`
        )!
      }));
    const startLine = spec.fixedObjects.find(
      (object) => object.kind === "common-start-line"
    )!;
    for (const model of spec.visualModels) {
      const sourceCard = result.payload.contentsJson.find(
        (object) => object.id === `${model.id}-source-card`
      )!;
      expect(sourceCard).toMatchObject({
        svgId: "drawElem",
        isMoveRotateHandler: false
      });
      const [, sourceTop] = sourceCard.point1 as [number, number];
      const [sourceRight, sourceBottom] = sourceCard.point2 as [number, number];
      expect(model.bounds.x).toBeGreaterThanOrEqual(
        (sourceCard.point1 as [number, number])[0]
      );
      expect(model.bounds.y).toBeGreaterThanOrEqual(sourceTop);
      expect(model.bounds.x + model.bounds.width).toBeLessThanOrEqual(
        sourceRight
      );
      expect(model.bounds.y + model.bounds.height).toBeLessThanOrEqual(
        sourceBottom
      );
      expect(sourceRight).toBeLessThan(startLine.bounds.x);
      for (const { guide } of laneSurfaces) {
        expect(sourceRight).toBeLessThan(guide.bounds.x);
      }
    }
  });

  it("단계 문구와 자리 안내는 읽기 쉬운 일반 글자로 만든다", () => {
    const { compiled: result } = compiled();
    const prompt = result.payload.contentsJson.find(
      (object) => object.id === "instruction-main"
    )!;
    const order = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-order-label"
    )!;
    expect(prompt).toMatchObject({
      svgId: "input-text",
      text: "시작점이 다른 두 띠를 출발선에 맞춰요.",
      fontSize: 34
    });
    expect(order).toMatchObject({ svgId: "input-text", text: "1/4" });
    expect(
      result.payload.contentsJson.some(
        (object) =>
          object.id === "problem-1-left-lane-label" ||
          object.id === "problem-1-right-lane-label"
      )
    ).toBe(false);
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
    const lessCard = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-less-symbol-source-card"
    )!;
    const greaterCard = result.payload.contentsJson.find(
      (object) => object.id === "problem-1-greater-symbol-source-card"
    )!;
    const relationSlot = spec.placementGuides.find(
      (guide) => guide.kind === "relation-slot"
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
      playgroundIndex: 2,
      x: spec.inputObjects[0]!.bounds.x + 210,
      width: spec.inputObjects[0]!.bounds.width - 210
    });
    expect(responseSurface).toMatchObject({
      svgId: "drawElem",
      fill: "#FFFFFF",
      stroke: "#718398",
      isMoveRotateHandler: false
    });
    for (const card of [lessCard, greaterCard]) {
      expect(card).toMatchObject({ svgId: "drawElem" });
      const [x, y] = card.point1 as [number, number];
      const [right, bottom] = card.point2 as [number, number];
      expect(right).toBeLessThan(relationSlot.bounds.x);
      expect(bottom).toBeLessThan(spec.inputObjects[0]!.bounds.y);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  it("캔버스 내용이 바뀌면 같은 세트에서도 생성 표식이 달라진다", () => {
    const { spec, compiled: original } = compiled();
    const changed = structuredClone(spec);
    changed.visualModels[0]!.color = "#FFA26D";
    changed.canvasHash = canvasActivityHash(changed);
    const recompiled = compileCanvasActivitySpec(changed);
    const marker = (title: string) => title.match(/\[AI-([A-F0-9]+)\]/)?.[1];

    expect(marker(original.payload.projectTitle)).toBeTruthy();
    expect(marker(recompiled.payload.projectTitle)).toBeTruthy();
    expect(marker(recompiled.payload.projectTitle)).not.toBe(
      marker(original.payload.projectTitle)
    );
  });

  it("분모 2부터 12까지 분수 띠를 준비 상자 안에 정확한 폭으로 만든다", () => {
    const { spec: fixtureSpec } = compiled();
    for (let denominator = 2; denominator <= 12; denominator += 1) {
      const spec = structuredClone(fixtureSpec);
      const numerator = denominator - 1;
      const rightDenominator = denominator === 2 ? 3 : 2;
      spec.problem.left = { numerator, denominator };
      spec.problem.right = { numerator: 1, denominator: rightDenominator };
      spec.problem.correctRelation = ">";

      const leftModel = spec.visualModels.find(
        (model) => model.role === "left-strip"
      )!;
      leftModel.fraction = { numerator, denominator };
      leftModel.bounds.x = 95;
      leftModel.bounds.width = (400 / denominator) * numerator;
      const rightModel = spec.visualModels.find(
        (model) => model.role === "right-strip"
      )!;
      rightModel.fraction = { numerator: 1, denominator: rightDenominator };
      rightModel.bounds.width = 400 / rightDenominator;
      for (const movable of spec.movableObjects) {
        if (movable.sourceModelId === leftModel.id) {
          movable.bounds.x = leftModel.bounds.x;
          movable.bounds.width = leftModel.bounds.width;
        }
        if (movable.sourceModelId === rightModel.id) {
          movable.bounds.width = rightModel.bounds.width;
        }
      }
      spec.canvasHash = canvasActivityHash(spec);

      const result = compileCanvasActivitySpec(spec);
      const native = result.payload.contentsJson.find(
        (object) => object.id === leftModel.id
      )!;
      const sourceCard = result.payload.contentsJson.find(
        (object) => object.id === `${leftModel.id}-source-card`
      )!;
      const [cardX, cardY] = sourceCard.point1 as [number, number];
      const [cardRight, cardBottom] = sourceCard.point2 as [number, number];
      expect(native).toMatchObject({
        svgId: FRACTION_SVG_BY_DENOMINATOR[denominator],
        count: numerator,
        divider: denominator,
        defaultWidth: 400
      });
      const coordinates = native.coordinates as Array<[number, number]>;
      expect(
        Number(native.x) + Math.min(...coordinates.map((point) => point[0]))
      ).toBeCloseTo(leftModel.bounds.x);
      expect(
        Number(native.y) + Math.min(...coordinates.map((point) => point[1]))
      ).toBeCloseTo(leftModel.bounds.y);
      expect(leftModel.bounds.x).toBeGreaterThanOrEqual(cardX);
      expect(leftModel.bounds.y).toBeGreaterThanOrEqual(cardY);
      expect(leftModel.bounds.x + leftModel.bounds.width).toBeLessThanOrEqual(
        cardRight
      );
      expect(leftModel.bounds.y + leftModel.bounds.height).toBeLessThanOrEqual(
        cardBottom
      );
    }
  });
});
