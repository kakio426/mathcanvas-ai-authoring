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

describe("fail-closed tool adapter registry", () => {
  it("현재 검증된 다섯 도구만 등록한다", () => {
    expect(
      REGISTERED_TOOL_ADAPTERS.map((adapter) => adapter.toolKey)
    ).toEqual([
      "NO03FM",
      "NO04NT",
      "common.text",
      "common.formula",
      "common.rectangle"
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

  it("46개 module variant 중 검증된 분수 12개와 숫자 카드 10개만 허용한다", () => {
    expect(NATIVE_MODULE_VARIANT_CONTRACTS).toHaveLength(46);
    expect(RELEASED_MODULE_VARIANT_IDS).toHaveLength(22);
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
      x: 320,
      y: 420,
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
  });
});
