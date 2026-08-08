import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from(
  { length: 5 },
  (_, index) => `position-card-${index + 1}`
);
const choiceCenterX = 600;
const choiceRowLeft = centeredRowLeft(choiceCenterX, 5, 190, 15);

/**
 * 나눗셈 한 문제 전용 1280×800 배치.
 *
 * workbench는 약 1060×458 CSS px를 확보하고, 그 안에서 source/group/remainder를
 * 가로로 나눈다. 큰 draw rectangle을 unit 뒤에 깔면 native 다중 선택을 가로채므로
 * 제품은 각 영역을 내부가 빈 얇은 border line 네 개로 그린다.
 */
export const wave25DivisionGroupingLayoutPreset: LayoutPreset = {
  itemOriginY: 110,
  itemPitch: 940,
  canvasBaseHeight: 160,
  minGap: 16,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 1600,
      height: 300
    },
    "header.primary": {
      scope: "canvas",
      x: 80,
      y: 8,
      width: 1440,
      height: 30
    },
    "header.secondary": {
      scope: "canvas",
      x: 80,
      y: 40,
      width: 1440,
      height: 30
    },
    "header.tertiary": {
      scope: "canvas",
      x: 80,
      y: 72,
      width: 1440,
      height: 30
    },
    "item.panel": {
      scope: "item",
      x: 70,
      y: 0,
      width: 1460,
      height: 910
    },
    "item.number": {
      scope: "item",
      x: 90,
      y: 4,
      width: 70,
      height: 48
    },
    "item.question": {
      scope: "item",
      x: 175,
      y: 0,
      width: 1345,
      height: 55
    },
    "item.choice-panel": {
      scope: "item",
      x: 70,
      y: 65,
      width: 1050,
      height: 140
    },
    "item.pool-label": {
      scope: "item",
      x: choiceRowLeft + 15,
      y: 70,
      width: 260,
      height: 32
    },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [5],
      centerX: choiceCenterX,
      firstRowY: 105,
      rowGap: 0,
      memberWidth: 190,
      memberHeight: 90,
      contentWidth: 160,
      columnGap: 15,
      insetX: 15,
      insetY: 8
    }),
    "item.prediction-label": {
      scope: "item",
      x: 1165,
      y: 78,
      width: 320,
      height: 34
    },
    "item.prediction-box": {
      scope: "item",
      x: 1140,
      y: 65,
      width: 390,
      height: 140
    },
    "item.array-panel": {
      scope: "item",
      x: 50,
      y: 220,
      width: 1500,
      height: 630
    },
    "item.source-panel": {
      scope: "item",
      x: 70,
      y: 265,
      width: 720,
      height: 400
    },
    "item.source-label": {
      scope: "item",
      x: 95,
      y: 275,
      width: 670,
      height: 38
    },
    "item.counting-model-pool": {
      scope: "item",
      x: 80,
      y: 315,
      width: 700,
      height: 350
    },
    "item.group-lane": {
      scope: "item",
      x: 810,
      y: 265,
      width: 590,
      height: 400
    },
    "item.group-lane-label": {
      scope: "item",
      x: 835,
      y: 275,
      width: 540,
      height: 38
    },
    "item.remainder-lane": {
      scope: "item",
      x: 1420,
      y: 265,
      width: 110,
      height: 400
    },
    "item.remainder-lane-label": {
      scope: "item",
      x: 1430,
      y: 275,
      width: 90,
      height: 38
    },
    "item.explanation-label": {
      scope: "item",
      x: 125,
      y: 715,
      width: 1325,
      height: 34
    },
    "item.explanation-box": {
      scope: "item",
      x: 100,
      y: 700,
      width: 1400,
      height: 120
    }
  }
};
