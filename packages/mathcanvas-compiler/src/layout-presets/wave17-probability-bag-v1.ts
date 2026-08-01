import type { LayoutPreset } from "@mathcanvas/contracts";
import { p3CognitiveFractionLayoutPreset } from "./p3-cognitive-fraction-v1.js";

export const wave17ProbabilityBagLayoutPreset: LayoutPreset = {
  ...p3CognitiveFractionLayoutPreset,
  tokens: {
    ...p3CognitiveFractionLayoutPreset.tokens,
    "item.bag-context": {
      scope: "item",
      x: 530,
      y: 392,
      width: 1420,
      height: 52
    },
    "item.explanation-label": {
      scope: "item",
      x: 410,
      y: 458,
      width: 170,
      height: 42
    },
    "item.explanation-box": {
      scope: "item",
      x: 590,
      y: 448,
      width: 1180,
      height: 70
    }
  }
};
