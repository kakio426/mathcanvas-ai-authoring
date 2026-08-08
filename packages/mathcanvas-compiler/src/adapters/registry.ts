import {
  assertReleasedTool
} from "@mathcanvas/contracts";
import {
  makeBalanceScaleObject,
  makeAnalogClockObject,
  makeCountingModelObjects,
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
  NativeToolPlacement,
  CountingModelIntent
} from "./native-tool-contracts.js";

export type NativeToolCompileRequest = NativeToolIntent;
export type {
  AnalogClockIntent,
  BalanceScaleIntent,
  CountingModelIntent,
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
  readonly kind: "single" | "multi";
  readonly requiredModuleKeys: readonly string[];
}

export interface CompiledSingleToolFragment extends CompiledToolFragment {
  readonly kind: "single";
  readonly object: Record<string, unknown>;
  readonly primaryObjectId: string;
}

export interface CompiledMultiToolFragment extends CompiledToolFragment {
  readonly kind: "multi";
  readonly objects: readonly Record<string, unknown>[];
}

export type CompiledNativeToolFragment =
  | CompiledSingleToolFragment
  | CompiledMultiToolFragment;

type SingleNativeToolCompileRequest = Exclude<
  NativeToolCompileRequest,
  CountingModelIntent
>;

function singleFragment(
  object: Record<string, unknown>,
  primaryObjectId: string,
  requiredModuleKeys: readonly string[]
): CompiledSingleToolFragment {
  return {
    kind: "single",
    object,
    primaryObjectId,
    requiredModuleKeys
  };
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
    adapterKey: "counting-model",
    toolKey: "NO01SC",
    contractFamily: "native-counting-model-pool"
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
  request: CountingModelIntent,
  placement: NativeToolPlacement
): CompiledMultiToolFragment;
export function compileNativeTool(
  request: SingleNativeToolCompileRequest,
  placement: NativeToolPlacement
): CompiledSingleToolFragment;
export function compileNativeTool(
  request: NativeToolCompileRequest,
  placement: NativeToolPlacement
): CompiledNativeToolFragment;
export function compileNativeTool(
  request: NativeToolCompileRequest,
  placement: NativeToolPlacement
): CompiledNativeToolFragment {
  const contract = assertReleasedTool(request.toolKey);
  if (contract.adapterKey !== request.kind) {
    throw new Error(
      `tool-adapter-mismatch:${request.toolKey}:${request.kind}`
    );
  }
  switch (request.kind) {
    case "analog-clock":
      return singleFragment(
        makeAnalogClockObject(request, placement),
        placement.id,
        ["SM02AD"]
      );
    case "fraction-model":
      return singleFragment(
        makeFractionObject(request, placement),
        placement.id,
        ["NO03FM"]
      );
    case "counting-model":
      return {
        kind: "multi",
        objects: makeCountingModelObjects(request, placement),
        requiredModuleKeys: ["NO01SC"]
      };
    case "number-card":
      return singleFragment(
        makeNumberCardObject(request, placement),
        placement.id,
        ["NO04NT"]
      );
    case "place-value-model":
      return singleFragment(
        makePlaceValueModelObject(request, placement),
        placement.id,
        ["NO04PD"]
      );
    case "pattern-block":
      return singleFragment(
        makePatternBlockObject(request, placement),
        placement.id,
        ["SM02PB"]
      );
    case "balance-scale":
      return singleFragment(
        makeBalanceScaleObject(request, placement),
        placement.id,
        ["CR07BS"]
      );
    case "bar-chart":
      return singleFragment(
        makeBarChartObject(request, placement),
        placement.id,
        ["DP04BC"]
      );
    case "data-table":
      return singleFragment(
        makeDataTableObject(request, placement),
        placement.id,
        ["DP02TG"]
      );
    case "text":
      return singleFragment(
        makeTextObject(request, placement),
        placement.id,
        []
      );
    case "latex":
      return singleFragment(
        makeLatexObject(request, placement),
        placement.id,
        []
      );
    case "draw-rectangle":
      assertContractedNativeDrawShape(request.toolKey);
      return singleFragment(
        makeRectangleObject(request, placement),
        placement.id,
        []
      );
    case "point-line":
      return singleFragment(
        makePointLineObject(request, placement),
        placement.id,
        []
      );
    default:
      throw new Error(
        `tool-adapter-unregistered:${String(
          (request as { kind?: unknown }).kind
        )}`
      );
  }
}
