import {
  assertReleasedTool
} from "@mathcanvas/contracts";
import {
  makeBalanceScaleObject,
  makeAnalogClockObject,
  makeFractionObject,
  makeLatexObject,
  makeNumberCardObject,
  makeBarChartObject,
  makeDataTableObject,
  makePatternBlockObject,
  makePlaceValueModelObject,
  makePointLineObject,
  makeRectangleObject,
  makeTextObject
} from "./native-factories.js";
import {
  assertContractedNativeDrawShape
} from "./native-draw-contracts.js";
import type {
  NativeToolIntent,
  NativeToolPlacement
} from "./native-tool-contracts.js";

export type NativeToolCompileRequest = NativeToolIntent;
export type {
  AnalogClockIntent,
  BalanceScaleIntent,
  FractionModelIntent,
  LatexIntent,
  NativeToolIntent,
  NativeToolPlacement,
  NumberCardIntent,
  PatternBlockIntent,
  PlaceValueModelIntent,
  RectangleIntent,
  PointLineIntent,
  TextIntent
} from "./native-tool-contracts.js";
export { PLACE_VALUE_SVG_BY_VALUE } from "./native-factories.js";
export {
  NUMBER_CARD_RENDERED_SIZE,
  PLACE_VALUE_MODEL_RENDERED_DIAMETER,
  resolveNativeRenderedBounds,
  type NativeRenderedBounds
} from "./native-rendered-bounds.js";

export interface CompiledToolFragment {
  readonly object: Record<string, unknown>;
  readonly requiredModuleKeys: readonly string[];
}

export const REGISTERED_TOOL_ADAPTERS = [
  {
    adapterKey: "analog-clock",
    toolKey: "SM02AD",
    contractFamily: "native-geared-clock"
  },
  {
    adapterKey: "balance-scale",
    toolKey: "CR07BS",
    contractFamily: "native-balance-scale"
  },
  {
    adapterKey: "fraction-model",
    toolKey: "NO03FM",
    contractFamily: "native-fraction-model"
  },
  {
    adapterKey: "number-card",
    toolKey: "NO04NT",
    contractFamily: "native-module-variant"
  },
  {
    adapterKey: "place-value-model",
    toolKey: "NO04PD",
    contractFamily: "native-module-variant"
  },
  {
    adapterKey: "pattern-block",
    toolKey: "SM02PB",
    contractFamily: "native-pattern-block"
  },
  {
    adapterKey: "bar-chart",
    toolKey: "DP04BC",
    contractFamily: "native-module-variant"
  },
  {
    adapterKey: "data-table",
    toolKey: "DP02TG",
    contractFamily: "native-module-variant"
  },
  {
    adapterKey: "text",
    toolKey: "common.text",
    contractFamily: "native-text-object"
  },
  {
    adapterKey: "latex",
    toolKey: "common.formula",
    contractFamily: "native-latex-object"
  },
  {
    adapterKey: "draw-rectangle",
    toolKey: "common.rectangle",
    contractFamily: "native-draw-object"
  },
  {
    adapterKey: "point-line",
    toolKey: "common.point-line",
    contractFamily: "native-angle-object"
  }
] as const;

export function compileNativeTool(
  request: NativeToolCompileRequest,
  placement: NativeToolPlacement
): CompiledToolFragment {
  const contract = assertReleasedTool(request.toolKey);
  if (contract.adapterKey !== request.kind) {
    throw new Error(
      `tool-adapter-mismatch:${request.toolKey}:${request.kind}`
    );
  }
  switch (request.kind) {
    case "analog-clock":
      return {
        object: makeAnalogClockObject(request, placement),
        requiredModuleKeys: ["SM02AD"]
      };
    case "fraction-model":
      return {
        object: makeFractionObject(request, placement),
        requiredModuleKeys: ["NO03FM"]
      };
    case "number-card":
      return {
        object: makeNumberCardObject(request, placement),
        requiredModuleKeys: ["NO04NT"]
      };
    case "place-value-model":
      return {
        object: makePlaceValueModelObject(request, placement),
        requiredModuleKeys: ["NO04PD"]
      };
    case "pattern-block":
      return {
        object: makePatternBlockObject(request, placement),
        requiredModuleKeys: ["SM02PB"]
      };
    case "balance-scale":
      return {
        object: makeBalanceScaleObject(request, placement),
        requiredModuleKeys: ["CR07BS"]
      };
    case "bar-chart":
      return {
        object: makeBarChartObject(request, placement),
        requiredModuleKeys: ["DP04BC"]
      };
    case "data-table":
      return {
        object: makeDataTableObject(request, placement),
        requiredModuleKeys: ["DP02TG"]
      };
    case "text":
      return {
        object: makeTextObject(request, placement),
        requiredModuleKeys: []
      };
    case "latex":
      return {
        object: makeLatexObject(request, placement),
        requiredModuleKeys: []
      };
    case "draw-rectangle":
      assertContractedNativeDrawShape(request.toolKey);
      return {
        object: makeRectangleObject(request, placement),
        requiredModuleKeys: []
      };
    case "point-line":
      return {
        object: makePointLineObject(request, placement),
        requiredModuleKeys: []
      };
    default:
      throw new Error(
        `tool-adapter-unregistered:${String(
          (request as { kind?: unknown }).kind
        )}`
      );
  }
}
