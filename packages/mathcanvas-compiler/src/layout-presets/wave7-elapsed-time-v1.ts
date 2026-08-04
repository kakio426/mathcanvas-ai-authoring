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

const choiceCenterX = 1430;
const choiceMemberWidth = 280;
const choiceColumnGap = 35;
const choiceInsetX = 8;

export const wave7ElapsedTimeLayoutPreset: LayoutPreset = {
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
    "item.start-clock-label": {
      scope: "item",
      x: 270,
      y: 112,
      width: 120,
      height: 38
    },
    "item.clock-start": {
      scope: "item",
      x: 180,
      y: 150,
      width: 280,
      height: 280
    },
    "item.end-clock-label": {
      scope: "item",
      x: 620,
      y: 112,
      width: 120,
      height: 38
    },
    "item.clock-end": {
      scope: "item",
      x: 530,
      y: 150,
      width: 280,
      height: 280
    },
    "item.prediction-label": {
      scope: "item",
      x: 900,
      y: 122,
      width: 190,
      height: 40
    },
    "item.prediction-box": {
      scope: "item",
      x: 1120,
      y: 110,
      width: 310,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 880,
      y: 190,
      width: 1100,
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
      width: 280,
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
      x: 900,
      y: 435,
      width: 200,
      height: 40
    },
    "item.explanation-box": {
      scope: "item",
      x: 1120,
      y: 415,
      width: 760,
      height: 155
    }
  }
};
