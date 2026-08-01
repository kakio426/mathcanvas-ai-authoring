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

const choiceCenterX = 1480;
const choiceMemberWidth = 250;
const choiceColumnGap = 30;
const choiceInsetX = 8;
const choiceContentWidth = 42;

export const wave8FractionSumLayoutPreset: LayoutPreset = {
  itemOriginY: 330,
  itemPitch: 690,
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
      x: 120,
      y: 20,
      width: 1960,
      height: 620
    },
    "item.number": {
      scope: "item",
      x: 160,
      y: 44,
      width: 90,
      height: 44
    },
    "item.question": {
      scope: "item",
      x: 280,
      y: 40,
      width: 1600,
      height: 52
    },
    "item.left-strip-label": {
      scope: "item",
      x: 170,
      y: 126,
      width: 120,
      height: 38
    },
    "item.left-strip": {
      scope: "item",
      x: 310,
      y: 118,
      width: 600,
      height: 70
    },
    "item.right-strip-label": {
      scope: "item",
      x: 170,
      y: 221,
      width: 120,
      height: 38
    },
    "item.right-strip": {
      scope: "item",
      x: 310,
      y: 213,
      width: 600,
      height: 70
    },
    "item.join-lane-label": {
      scope: "item",
      x: 120,
      y: 342,
      width: 180,
      height: 40
    },
    "item.join-lane": {
      scope: "item",
      x: 310,
      y: 318,
      width: 600,
      height: 90
    },
    "item.start-line": {
      scope: "item",
      x: 306,
      y: 318,
      width: 8,
      height: 90
    },
    "item.prediction-label": {
      scope: "item",
      x: 1000,
      y: 122,
      width: 180,
      height: 40
    },
    "item.prediction-box": {
      scope: "item",
      x: 1210,
      y: 110,
      width: 300,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 980,
      y: 190,
      width: 1000,
      height: 210
    },
    "item.pool-label": {
      scope: "item",
      x:
        centeredRowLeft(
          choiceCenterX,
          3,
          choiceMemberWidth,
          choiceColumnGap
        ) +
        (choiceMemberWidth - choiceContentWidth) / 2,
      y: 210,
      width: 220,
      height: 32
    },
    ...centeredChoicePoolTokens({
      roles: candidateRoles,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 252,
      rowGap: 8,
      memberWidth: choiceMemberWidth,
      memberHeight: 64,
      contentWidth: choiceContentWidth,
      columnGap: choiceColumnGap,
      insetX: choiceInsetX,
      insetY: 6
    }),
    "item.explanation-label": {
      scope: "item",
      x: 1000,
      y: 435,
      width: 200,
      height: 40
    },
    "item.explanation-box": {
      scope: "item",
      x: 1210,
      y: 415,
      width: 700,
      height: 155
    }
  }
};
