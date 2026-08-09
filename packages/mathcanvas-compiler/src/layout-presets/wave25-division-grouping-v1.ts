import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from(
  { length: 5 },
  (_, index) => `position-card-${index + 1}`
);
const choiceCenterX = 385;
const choiceMemberWidth = 230;
const choiceRowLeft = centeredRowLeft(
  choiceCenterX,
  3,
  choiceMemberWidth,
  10
);

/**
 * 나눗셈 한 문제 전용 1280×800 배치.
 *
 * MathCanvas input-text의 실제 1.5 line-height와 editor padding을 먼저
 * 수용한다. 세 안내문은 53-unit line box와 23-unit leading을 사용하고,
 * 질문은 52px/86-unit으로 키워 안내와 문제의 위계를 분명히 한다. 답 카드는
 * 실제 56-unit text box를 70-unit backdrop 정중앙에 둔다.
 *
 * 늘어난 읽기 공간만큼 네이티브 작업판을 축소하지 않는다. 답 구조를 읽지 않는
 * 8-7-8-8 source pool과 3열×2행 group reserve를 사용해 작업판을 넓고 낮게
 * 만들고, 기존 80-unit NO01SC 조작 크기와 editor overlay 하한을 유지한다.
 */
export const wave25DivisionGroupingLayoutPreset: LayoutPreset = {
  itemOriginY: 237,
  itemPitch: 1020,
  canvasBaseHeight: 200,
  minGap: 16,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 1640,
      height: 300
    },
    "header.primary": {
      scope: "canvas",
      x: 60,
      y: 0,
      width: 1520,
      height: 53
    },
    "header.secondary": {
      scope: "canvas",
      x: 60,
      y: 76,
      width: 1520,
      height: 53
    },
    "header.tertiary": {
      scope: "canvas",
      x: 60,
      y: 152,
      width: 1520,
      height: 53
    },
    "item.panel": {
      scope: "item",
      x: 0,
      y: 0,
      width: 1600,
      height: 823
    },
    "item.number": {
      scope: "item",
      x: 30,
      y: 8,
      width: 70,
      height: 53
    },
    "item.question": {
      scope: "item",
      x: 0,
      y: 0,
      width: 1612,
      height: 86
    },
    "item.choice-panel": {
      scope: "item",
      x: 10,
      y: 119,
      width: 750,
      height: 234
    },
    "item.pool-label": {
      scope: "item",
      x: choiceRowLeft,
      y: 129,
      width: 300,
      height: 56
    },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 200,
      rowGap: 10,
      memberWidth: choiceMemberWidth,
      memberHeight: 70,
      contentWidth: 218,
      columnGap: 10,
      insetX: 6,
      insetY: 7
    }),
    "item.prediction-label": {
      scope: "item",
      x: 790,
      y: 129,
      width: 240,
      height: 56
    },
    "item.prediction-box": {
      scope: "item",
      x: 770,
      y: 119,
      width: 280,
      height: 234
    },
    "item.explanation-label": {
      scope: "item",
      x: 1080,
      y: 129,
      width: 500,
      height: 56
    },
    "item.explanation-box": {
      scope: "item",
      x: 1060,
      y: 119,
      width: 540,
      height: 234
    },
    "item.array-panel": {
      scope: "item",
      x: 0,
      y: 365,
      width: 1600,
      height: 458
    },
    "item.array-border-top": {
      scope: "item",
      x: 0,
      y: 365,
      width: 1600,
      height: 4
    },
    "item.array-border-bottom": {
      scope: "item",
      x: 0,
      y: 819,
      width: 1600,
      height: 4
    },
    "item.array-border-left": {
      scope: "item",
      x: 0,
      y: 365,
      width: 4,
      height: 458
    },
    "item.array-border-right": {
      scope: "item",
      x: 1596,
      y: 365,
      width: 4,
      height: 458
    },
    "item.source-panel": {
      scope: "item",
      x: 4,
      y: 369,
      width: 678,
      height: 450
    },
    "item.source-label": {
      scope: "item",
      x: 14,
      y: 383,
      width: 650,
      height: 56
    },
    "item.counting-model-pool": {
      scope: "item",
      x: 4,
      y: 457,
      width: 672,
      height: 336
    },
    "item.source-separator": {
      scope: "item",
      x: 678,
      y: 369,
      width: 4,
      height: 450
    },
    "item.group-lane": {
      scope: "item",
      x: 682,
      y: 369,
      width: 764,
      height: 450
    },
    "item.group-lane-label": {
      scope: "item",
      x: 692,
      y: 383,
      width: 744,
      height: 56
    },
    "item.remainder-lane": {
      scope: "item",
      x: 1450,
      y: 369,
      width: 146,
      height: 450
    },
    "item.remainder-separator": {
      scope: "item",
      x: 1446,
      y: 369,
      width: 4,
      height: 450
    },
    "item.remainder-lane-label": {
      scope: "item",
      x: 1452,
      y: 383,
      width: 142,
      height: 56
    }
  }
};
