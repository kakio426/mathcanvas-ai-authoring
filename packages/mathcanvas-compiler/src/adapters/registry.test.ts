import { describe, expect, it } from "vitest";
import { MATHCANVAS_TOOL_MANIFEST } from "@mathcanvas/contracts";
import {
  REGISTERED_TOOL_ADAPTERS,
  compileNativeTool,
  type NativeToolCompileRequest
} from "./registry.js";
import {
  NATIVE_MODULE_VARIANT_CONTRACTS,
  RELEASED_MODULE_VARIANT_IDS,
  RELEASED_NUMBER_CARD_VARIANT_IDS,
  assertReleasedModuleVariant
} from "./native-module-variant-contracts.js";
import { buildModuleActivationMap } from "./module-activation.js";
import {
  NUMBER_CARD_RENDERED_SIZE,
  PLACE_VALUE_MODEL_RENDERED_DIAMETER,
  resolveNativeRenderedBounds
} from "./native-rendered-bounds.js";

describe("fail-closed tool adapter registry", () => {
  it("현재 검증된 열두 도구만 등록한다", () => {
    expect(
      REGISTERED_TOOL_ADAPTERS.map((adapter) => adapter.toolKey)
    ).toEqual([
      "SM02AD",
      "CR07BS",
      "NO03FM",
      "NO04NT",
      "NO04PD",
      "SM02PB",
      "DP04BC",
      "DP02TG",
      "common.text",
      "common.formula",
      "common.rectangle",
      "common.point-line"
    ]);
    expect(
      MATHCANVAS_TOOL_MANIFEST.filter(
        (entry) => entry.supportState === "released"
      )
        .map((entry) => entry.stableKey)
        .sort()
    ).toEqual(
      REGISTERED_TOOL_ADAPTERS.map((adapter) => adapter.toolKey).sort()
    );
  });

  it("released module만 활성화하고 46개 module을 모두 명시한다", () => {
    const activation = buildModuleActivationMap(["NO03FM"]);
    expect(
      Object.values(activation).flatMap((unit) =>
        Object.keys(unit)
      )
    ).toHaveLength(46);
    expect(activation.Unit01.NO03FM).toBe(true);
    expect(
      Object.values(activation)
        .flatMap((unit) => Object.values(unit))
        .filter(Boolean)
    ).toHaveLength(1);
    expect(() => buildModuleActivationMap(["NO01NR"])).toThrow(
      "tool-not-released:NO01NR:captured"
    );
  });

  it("46개 module variant 중 검증된 분수·숫자 카드·자릿값 모형·접시저울·기어식 시계·패턴 블록·막대그래프·자료와 표만 허용한다", () => {
    expect(NATIVE_MODULE_VARIANT_CONTRACTS).toHaveLength(46);
    // 분수 12 + 수 카드 10 + 자릿값 3 + 저울 1 + 시계 1 + 패턴블록 6
    // + 막대그래프 1 + 자료와 표 1
    expect(RELEASED_MODULE_VARIANT_IDS).toHaveLength(35);
    expect(RELEASED_NUMBER_CARD_VARIANT_IDS).toHaveLength(10);
    expect(() =>
      assertReleasedModuleVariant("NO03FM", "NO03FM-08")
    ).not.toThrow();
    expect(() =>
      assertReleasedModuleVariant("NO03FM", "NO03FM-11")
    ).toThrow("module-variant-not-released:NO03FM:NO03FM-11");
    expect(() =>
      assertReleasedModuleVariant("NO04NT", "NO04NT-01")
    ).not.toThrow();
    expect(() =>
      assertReleasedModuleVariant("NO04NT", "NO04NT-11")
    ).toThrow("module-variant-not-released:NO04NT:NO04NT-11");
    expect(() =>
      assertReleasedModuleVariant("NO04PD", "NO04PD-04")
    ).not.toThrow();
    expect(() =>
      assertReleasedModuleVariant("NO04PD", "NO04PD-06")
    ).toThrow("module-variant-not-released:NO04PD:NO04PD-06");
    expect(() =>
      assertReleasedModuleVariant("CR07BS", "CR07BS-01")
    ).not.toThrow();
    expect(() =>
      assertReleasedModuleVariant("CR07BS", "CR07BS-02")
    ).toThrow("module-variant-not-released:CR07BS:CR07BS-02");
    expect(() =>
      assertReleasedModuleVariant("SM02AD", "SM02AD-01")
    ).not.toThrow();
    expect(() =>
      assertReleasedModuleVariant("SM02AD", "SM02AD-02")
    ).toThrow("module-variant-not-released:SM02AD:SM02AD-02");
  });

  it("adapter key와 tool key가 맞지 않으면 거부한다", () => {
    const mismatched = {
      kind: "text",
      toolKey: "common.formula",
      text: "안내"
    } as unknown as NativeToolCompileRequest;
    const placement = {
      id: "label",
      x: 0,
      y: 0,
      width: 100,
      height: 40
    };
    expect(() => compileNativeTool(mismatched, placement)).toThrow(
      "tool-adapter-mismatch:common.formula:text"
    );
    expect(() =>
      compileNativeTool({
        kind: "text",
        toolKey: "common.text",
        text: "안내"
      }, placement)
    ).not.toThrow();
  });

  it("회색 목표 각과 움직이는 세 점 측정 각을 같은 좌표계로 만든다", () => {
    const placement = {
      id: "angle-model",
      x: 100,
      y: 200,
      width: 700,
      height: 270
    };
    const targetRay = compileNativeTool({
      kind: "point-line",
      toolKey: "common.point-line",
      geometry: "line",
      angleDegrees: 70,
      ray: "turn",
      stroke: "#5E6473"
    }, { ...placement, id: "target-turn-ray" });
    const measureAngle = compileNativeTool({
      kind: "point-line",
      toolKey: "common.point-line",
      geometry: "angle",
      angleDegrees: 45,
      stroke: "#1677D2"
    }, { ...placement, id: "measure-angle" });

    expect(targetRay.requiredModuleKeys).toEqual([]);
    expect(targetRay.object).toMatchObject({
      id: "target-turn-ray",
      svgId: "drawElem",
      type: "line",
      point1: [450, 450]
    });
    expect(measureAngle.requiredModuleKeys).toEqual([]);
    expect(measureAngle.object).toMatchObject({
      id: "measure-angle",
      svgId: "angleElem",
      point2: [450, 450]
    });
    expect(measureAngle.object).toHaveProperty("point1");
    expect(measureAngle.object).toHaveProperty("point3");
  });

  it("도구 의미 계약과 절대 좌표 배치를 분리한다", () => {
    const intent: NativeToolCompileRequest = {
      kind: "text",
      toolKey: "common.text",
      text: "좌표와 분리된 내용",
      fontSize: 32
    };
    expect(intent).not.toHaveProperty("id");
    expect(intent).not.toHaveProperty("x");
    expect(intent).not.toHaveProperty("y");
    expect(intent).not.toHaveProperty("width");
    expect(intent).not.toHaveProperty("height");

    const first = compileNativeTool(intent, {
      id: "first",
      x: 10,
      y: 20,
      width: 180,
      height: 48
    }).object;
    const second = compileNativeTool(intent, {
      id: "second",
      x: 210,
      y: 320,
      width: 260,
      height: 64
    }).object;

    expect(first).toMatchObject({
      id: "first",
      text: "좌표와 분리된 내용",
      x: 10,
      y: 20,
      width: 180,
      height: 48
    });
    expect(second).toMatchObject({
      id: "second",
      text: "좌표와 분리된 내용",
      x: 210,
      y: 320,
      width: 260,
      height: 64
    });

    const numberCard = compileNativeTool({
      kind: "number-card",
      toolKey: "NO04NT",
      value: 7
    }, {
      id: "digit-7",
      x: 320,
      y: 420,
      width: 80,
      height: 80
    });
    expect(numberCard.requiredModuleKeys).toEqual(["NO04NT"]);
    expect(numberCard.object).toMatchObject({
      id: "digit-7",
      x: 360,
      y: 460,
      _x: 0,
      _y: 0,
      svgId: "NO04NT-08",
      parent: { variation: 25 },
      numberFrameSnap: true,
      isHorizontalFlip: true,
      isVerticalFlip: true
    });
    expect(() =>
      compileNativeTool({
        kind: "number-card",
        toolKey: "NO04NT",
        value: 10
      }, {
        id: "invalid-digit",
        x: 0,
        y: 0,
        width: 80,
        height: 80
      })
    ).toThrow("number-card-value-out-of-range:10");

    const placeValueTen = compileNativeTool({
      kind: "place-value-model",
      toolKey: "NO04PD",
      value: 10
    }, {
      id: "ten-piece",
      x: 500,
      y: 600,
      width: 120,
      height: 120
    });
    expect(placeValueTen.requiredModuleKeys).toEqual(["NO04PD"]);
    expect(placeValueTen.object).toMatchObject({
      id: "ten-piece",
      x: 560,
      y: 660,
      svgId: "NO04PD-04",
      n: 10,
      count: 1,
      r: 60,
      fill: "#18C5FF",
      numberFrameSnap: true
    });

    const clock = compileNativeTool({
      kind: "analog-clock",
      toolKey: "SM02AD",
      hours: 5,
      minutes: 0,
      clockType: "geared",
      isWorking: false
    }, {
      id: "clock",
      x: 300,
      y: 500,
      width: 360,
      height: 360
    });
    expect(clock.requiredModuleKeys).toEqual(["SM02AD"]);
    expect(clock.object).toMatchObject({
      id: "clock",
      x: 300,
      y: 500,
      svgId: "SM02AD-01",
      type: "geared",
      hours: 5,
      minutes: 0,
      seconds: 0,
      isWorking: false,
      isFirst: false
    });
  });

  it("중심 좌표를 쓰는 네이티브 조작물도 배치 bounds의 왼쪽 위에 맞춘다", () => {
    const fraction = compileNativeTool({
      kind: "fraction-model",
      toolKey: "NO03FM",
      fraction: { numerator: 2, denominator: 5 },
      color: "#2194FF"
    }, {
      id: "fraction-strip",
      x: 100,
      y: 200,
      width: 500,
      height: 80
    }).object;
    expect(fraction).toMatchObject({
      x: 150,
      y: 240,
      _x: 150,
      _y: 240,
      coordinates: [
        [-50, -40],
        [150, -40],
        [150, 40],
        [-50, 40]
      ]
    });
  });

  it("고정형 도구와 배치 비례형 도구의 실제 화면 크기를 구분한다", () => {
    const oversizedPlacement = {
      id: "oversized",
      x: 100,
      y: 200,
      width: 240,
      height: 200
    };
    const numberCardIntent = {
      kind: "number-card",
      toolKey: "NO04NT",
      value: 7
    } as const;
    const placeValueIntent = {
      kind: "place-value-model",
      toolKey: "NO04PD",
      value: 10
    } as const;

    expect(
      resolveNativeRenderedBounds(numberCardIntent, oversizedPlacement)
    ).toEqual({
      x: 180,
      y: 260,
      width: NUMBER_CARD_RENDERED_SIZE,
      height: NUMBER_CARD_RENDERED_SIZE
    });
    expect(
      resolveNativeRenderedBounds(placeValueIntent, oversizedPlacement)
    ).toEqual({
      x: 160,
      y: 240,
      width: PLACE_VALUE_MODEL_RENDERED_DIAMETER,
      height: PLACE_VALUE_MODEL_RENDERED_DIAMETER
    });
    expect(
      compileNativeTool(numberCardIntent, oversizedPlacement).object
    ).toMatchObject({
      x: 220,
      y: 300,
      coordinates: [
        [-40, -40],
        [40, -40],
        [40, 40],
        [-40, 40]
      ]
    });

    const clockIntent = {
      kind: "analog-clock",
      toolKey: "SM02AD",
      hours: 3,
      minutes: 15,
      clockType: "geared",
      isWorking: false
    } as const;
    const smallClockPlacement = {
      id: "small-clock",
      x: 10,
      y: 20,
      width: 180,
      height: 180
    };
    const largeClockPlacement = {
      ...smallClockPlacement,
      id: "large-clock",
      width: 300,
      height: 300
    };
    expect(
      resolveNativeRenderedBounds(clockIntent, smallClockPlacement)
    ).toEqual({ x: 10, y: 20, width: 180, height: 180 });
    expect(
      resolveNativeRenderedBounds(clockIntent, largeClockPlacement)
    ).toEqual({ x: 10, y: 20, width: 300, height: 300 });
    expect(
      compileNativeTool(clockIntent, smallClockPlacement).object
    ).toMatchObject({ r: 180, clockScale: 0.5 });
    expect(
      compileNativeTool(clockIntent, largeClockPlacement).object
    ).toMatchObject({ r: 180, clockScale: 300 / 360 });

    const fractionIntent = {
      kind: "fraction-model",
      toolKey: "NO03FM",
      fraction: { numerator: 2, denominator: 5 },
      color: "#2194FF"
    } as const;
    expect(
      resolveNativeRenderedBounds(fractionIntent, {
        id: "fraction",
        x: 50,
        y: 70,
        width: 500,
        height: 80
      })
    ).toEqual({ x: 50, y: 70, width: 200, height: 80 });

    const unitSpanIntent = {
      kind: "draw-rectangle",
      toolKey: "common.rectangle",
      fill: "#F6A94A",
      unitSpan: { from: 2, to: 7, of: 10 }
    } as const;
    expect(
      resolveNativeRenderedBounds(unitSpanIntent, {
        id: "unit-span",
        x: 100,
        y: 120,
        width: 600,
        height: 50
      })
    ).toEqual({ x: 220, y: 120, width: 300, height: 50 });
  });

  it("사각형의 정수 단위 구간만 눈금에 맞춰 그린다", () => {
    const rectangle = compileNativeTool({
      kind: "draw-rectangle",
      toolKey: "common.rectangle",
      fill: "#F6A94A",
      unitSpan: { from: 2, to: 7, of: 8 }
    }, {
      id: "measured-pencil",
      x: 330,
      y: 332,
      width: 720,
      height: 70
    }).object;
    expect(rectangle).toMatchObject({
      point1: [510, 332],
      point2: [960, 402],
      coordinates: [
        [510, 332],
        [960, 332],
        [960, 402],
        [510, 402]
      ]
    });
    expect(() =>
      compileNativeTool({
        kind: "draw-rectangle",
        toolKey: "common.rectangle",
        fill: "#F6A94A",
        unitSpan: { from: 4, to: 4, of: 8 }
      }, {
        id: "empty-span",
        x: 0,
        y: 0,
        width: 720,
        height: 70
      })
    ).toThrow("rectangle-unit-span-invalid");
    expect(() =>
      compileNativeTool({
        kind: "draw-rectangle",
        toolKey: "common.rectangle",
        fill: "#F6A94A",
        unitSpan: { from: 1, to: 3, of: 8 }
      }, {
        id: "fractional-pixel-span",
        x: 0,
        y: 0,
        width: 722,
        height: 70
      })
    ).toThrow("rectangle-unit-span-invalid");
  });
});
