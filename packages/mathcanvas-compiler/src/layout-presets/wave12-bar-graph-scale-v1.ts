import type { LayoutPreset } from "@mathcanvas/contracts";
import { wave10CommonUnitLayoutPreset } from "./wave10-common-unit-v1.js";

/**
 * Wave 12 keeps the reusable choice/explanation column from Wave 10, but
 * gives graph reading its own two-row alignment workspace. The two source
 * bars deliberately start at different x positions from each other and
 * from the scale rows so that alignment is a learner action, not a layout
 * fact.
 */
export const wave12BarGraphScaleLayoutPreset: LayoutPreset = {
  ...wave10CommonUnitLayoutPreset,
  tokens: {
    ...wave10CommonUnitLayoutPreset.tokens,
    "item.left-strip-label": {
      scope: "item",
      x: 120,
      y: 126,
      width: 130,
      height: 38
    },
    "item.left-strip": {
      scope: "item",
      x: 270,
      y: 118,
      width: 720,
      height: 70
    },
    "item.right-strip-label": {
      scope: "item",
      x: 120,
      y: 221,
      width: 130,
      height: 38
    },
    "item.right-strip": {
      scope: "item",
      x: 290,
      y: 213,
      width: 720,
      height: 70
    },
    "item.join-lane-label": {
      scope: "item",
      x: 120,
      y: 368,
      width: 190,
      height: 48
    },
    "item.join-lane": {
      scope: "item",
      x: 330,
      y: 308,
      width: 720,
      height: 180
    },
    "item.reference-lane": {
      scope: "item",
      x: 330,
      y: 318,
      width: 720,
      height: 76
    },
    "item.question-lane": {
      scope: "item",
      x: 330,
      y: 407,
      width: 720,
      height: 76
    },
    "item.start-line": {
      scope: "item",
      x: 326,
      y: 318,
      width: 8,
      height: 165
    },
    "item.unit-ruler-label": {
      scope: "item",
      x: 120,
      y: 511,
      width: 190,
      height: 36
    },
    "item.unit-ruler": {
      scope: "item",
      x: 330,
      y: 500,
      width: 720,
      height: 56
    }
  }
};
