import {
  assertReleasedTool
} from "@mathcanvas/contracts";
import {
  makeFractionObject,
  makeLatexObject,
  makeNumberCardObject,
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
  FractionModelIntent,
  LatexIntent,
  NativeToolIntent,
  NativeToolPlacement,
  NumberCardIntent,
  RectangleIntent,
  TextIntent
} from "./native-tool-contracts.js";

export interface CompiledToolFragment {
  readonly object: Record<string, unknown>;
  readonly requiredModuleKeys: readonly string[];
}

export const REGISTERED_TOOL_ADAPTERS = [
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
    default:
      throw new Error(
        `tool-adapter-unregistered:${String(
          (request as { kind?: unknown }).kind
        )}`
      );
  }
}
