import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";
import { wave10CommonUnitLayoutPreset } from "./wave10-common-unit-v1.js";

const candidateRoles = [
  "position-card-1",
  "position-card-2",
  "position-card-3",
  "position-card-4",
  "position-card-5"
] as const;
const choiceCenterX = 1660;
const memberWidth = 210;
const contentWidth = 42;
const columnGap = 20;

export const wave13BrokenRulerLayoutPreset: LayoutPreset = {
  ...wave10CommonUnitLayoutPreset,
  tokens: {
    ...wave10CommonUnitLayoutPreset.tokens,
    "item.question": {
      scope: "item",
      x: 280,
      y: 38,
      width: 1100,
      height: 58
    },
    "item.left-strip-label": {
      scope: "item",
      x: 120,
      y: 326,
      width: 190,
      height: 38
    },
    "item.unit-ruler": {
      scope: "item",
      x: 330,
      y: 480,
      width: 720,
      height: 56
    },
    "item.left-strip": {
      scope: "item",
      relativeTo: "item.unit-ruler",
      x: 0,
      y: -164,
      width: 720,
      height: 70
    },
    "item.right-strip-label": {
      scope: "item",
      x: 120,
      y: 221,
      width: 190,
      height: 38
    },
    "item.right-strip": {
      scope: "item",
      relativeTo: "item.unit-ruler",
      x: 0,
      y: -267,
      width: 720,
      height: 70
    },
    "item.join-lane-label": {
      scope: "item",
      x: 120,
      y: 402,
      width: 190,
      height: 40
    },
    "item.join-lane": {
      scope: "item",
      x: 330,
      y: 300,
      width: 720,
      height: 160
    },
    "item.start-line": {
      scope: "item",
      x: 326,
      y: 300,
      width: 8,
      height: 160
    },
    "item.unit-ruler-label": {
      scope: "item",
      x: 120,
      y: 492,
      width: 190,
      height: 36
    },
    "item.prediction-label": {
      scope: "item",
      x: 1280,
      y: 122,
      width: 180,
      height: 40
    },
    "item.prediction-box": {
      scope: "item",
      x: 1480,
      y: 110,
      width: 300,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 1260,
      y: 190,
      width: 800,
      height: 220
    },
    "item.pool-label": {
      scope: "item",
      x:
        centeredRowLeft(
          choiceCenterX,
          3,
          memberWidth,
          columnGap
        ) +
        (memberWidth - contentWidth) / 2,
      y: 210,
      width: 300,
      height: 32
    },
    ...centeredChoicePoolTokens({
      roles: candidateRoles,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 252,
      rowGap: 8,
      memberWidth,
      memberHeight: 72,
      contentWidth,
      columnGap,
      insetX: 8,
      insetY: 6
    }),
    "item.explanation-label": {
      scope: "item",
      x: 1280,
      y: 445,
      width: 230,
      height: 40
    },
    "item.explanation-box": {
      scope: "item",
      x: 1530,
      y: 425,
      width: 510,
      height: 180
    }
  }
};
