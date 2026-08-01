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

const choiceCenterX = 1570;
const choiceMemberWidth = 240;
const choiceContentWidth = 42;
const choiceColumnGap = 26;

export const wave10CommonUnitLayoutPreset: LayoutPreset = {
  itemOriginY: 330,
  itemPitch: 730,
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
      height: 660
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
      width: 130,
      height: 38
    },
    "item.left-strip": {
      scope: "item",
      x: 330,
      y: 118,
      width: 720,
      height: 70
    },
    "item.right-strip-label": {
      scope: "item",
      x: 170,
      y: 221,
      width: 130,
      height: 38
    },
    "item.right-strip": {
      scope: "item",
      x: 330,
      y: 213,
      width: 720,
      height: 70
    },
    "item.join-lane-label": {
      scope: "item",
      x: 120,
      y: 342,
      width: 190,
      height: 40
    },
    "item.join-lane": {
      scope: "item",
      x: 330,
      y: 318,
      width: 720,
      height: 84
    },
    "item.start-line": {
      scope: "item",
      x: 326,
      y: 318,
      width: 8,
      height: 84
    },
    "item.unit-ruler-label": {
      scope: "item",
      x: 120,
      y: 434,
      width: 190,
      height: 36
    },
    "item.unit-ruler": {
      scope: "item",
      x: 330,
      y: 422,
      width: 720,
      height: 56
    },
    "item.prediction-label": {
      scope: "item",
      x: 1110,
      y: 122,
      width: 180,
      height: 40
    },
    "item.prediction-box": {
      scope: "item",
      x: 1320,
      y: 110,
      width: 300,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 1090,
      y: 190,
      width: 960,
      height: 220
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
      memberHeight: 72,
      contentWidth: choiceContentWidth,
      columnGap: choiceColumnGap,
      insetX: 8,
      insetY: 6
    }),
    "item.explanation-label": {
      scope: "item",
      x: 1110,
      y: 445,
      width: 200,
      height: 40
    },
    "item.explanation-box": {
      scope: "item",
      x: 1320,
      y: 425,
      width: 700,
      height: 180
    }
  }
};
