import type { LayoutPreset } from "@mathcanvas/contracts";
import { p3CognitiveFractionLayoutPreset } from "./p3-cognitive-fraction-v1.js";

export const wave17ProbabilityBagLayoutPreset: LayoutPreset = {
  ...p3CognitiveFractionLayoutPreset,
  tokens: {
    ...p3CognitiveFractionLayoutPreset.tokens,
    "item.panel": {
      ...p3CognitiveFractionLayoutPreset.tokens["item.panel"]!,
      width: 1940
    },
    "item.prediction-box": {
      ...p3CognitiveFractionLayoutPreset.tokens["item.prediction-box"]!,
      width: 270
    },
    "item.bag-context": {
      scope: "item",
      relativeTo: "item.panel",
      x: 150,
      y: 388,
      width: 1790,
      height: 52
    },
    "item.explanation-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 30,
      y: 470,
      width: 170,
      height: 42
    },
    "item.explanation-box": {
      scope: "item",
      relativeTo: "item.panel",
      x: 210,
      y: 460,
      width: 1180,
      height: 70
    }
  }
};
