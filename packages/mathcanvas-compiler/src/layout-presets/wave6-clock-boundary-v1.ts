import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const candidateRoles = [
  "position-card-1",
  "position-card-2",
  "position-card-3",
  "position-card-4",
  "position-card-5"
] as const;

const choiceCenterX = 1320;
const choiceMemberWidth = 390;
const choiceColumnGap = 35;
const choiceInsetX = 8;

export const wave6ClockBoundaryLayoutPreset: LayoutPreset = {
  itemOriginY: 330,
  itemPitch: 630,
  canvasBaseHeight: 360,
  minGap: 20,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 2200,
      height: 360
    },
    "header.primary": {
      scope: "canvas",
      x: 220,
      y: 44,
      width: 1760,
      height: 58
    },
    "header.secondary": {
      scope: "canvas",
      x: 220,
      y: 124,
      width: 1760,
      height: 58
    },
    "header.tertiary": {
      scope: "canvas",
      x: 220,
      y: 204,
      width: 1760,
      height: 58
    },
    "item.panel": {
      scope: "item",
      x: 200,
      y: 20,
      width: 1800,
      height: 560
    },
    "item.number": {
      scope: "item",
      x: 240,
      y: 44,
      width: 90,
      height: 44
    },
    "item.question": {
      scope: "item",
      x: 360,
      y: 40,
      width: 1500,
      height: 52
    },
    "item.clock": {
      scope: "item",
      x: 300,
      y: 145,
      width: 360,
      height: 360
    },
    "item.prediction-label": {
      scope: "item",
      x: 730,
      y: 122,
      width: 190,
      height: 40
    },
    "item.prediction-box": {
      scope: "item",
      x: 950,
      y: 110,
      width: 430,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 680,
      y: 190,
      width: 1280,
      height: 190
    },
    "item.pool-label": {
      scope: "item",
      x:
        centeredRowLeft(
          choiceCenterX,
          3,
          choiceMemberWidth,
          choiceColumnGap
        ) + choiceInsetX,
      y: 210,
      width: 250,
      height: 32
    },
    ...centeredChoicePoolTokens({
      roles: candidateRoles,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 252,
      rowGap: 6,
      memberWidth: choiceMemberWidth,
      memberHeight: 56,
      columnGap: choiceColumnGap,
      insetX: choiceInsetX,
      insetY: 6
    }),
    "item.explanation-label": {
      scope: "item",
      x: 730,
      y: 415,
      width: 200,
      height: 40
    },
    "item.explanation-box": {
      scope: "item",
      x: 950,
      y: 400,
      width: 800,
      height: 145
    }
  }
};
