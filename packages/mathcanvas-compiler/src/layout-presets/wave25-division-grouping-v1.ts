import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from(
  { length: 5 },
  (_, index) => `position-card-${index + 1}`
);
const choiceCenterX = 410;
const choiceMemberWidth = 214;
const choiceRowLeft = centeredRowLeft(
  choiceCenterX,
  3,
  choiceMemberWidth,
  10
);

/**
 * 나눗셈 한 문제 전용 1280×800 배치.
 *
 * 예상과 설명 band를 압축하되 글쓰기 하한을 유지해 workbench를 35 canvas unit
 * 위로 올린다. source pool은 84×84 intrinsic reserve와 max-5 brick stagger를
 * 그대로 담고 canvasBaseHeight/itemPitch를 늘리지 않는다. group lane은 정답을
 * 암시하는 고정 slot 없이 하나의 열린 공간이며, native cluster 자체가 묶음을
 * 나타낸다. 큰 draw rectangle을 unit 뒤에 깔면 다중 선택을 가로채므로 모든
 * 영역은 내부가 빈 얇은 border line으로만 그린다.
 */
export const wave25DivisionGroupingLayoutPreset: LayoutPreset = {
  // The three directions use a full 14-unit leading gap and the question uses
  // the same gap as a larger fourth line.  Response regions are paired left /
  // right, so this added reading space does not move the native workbench or
  // its measured editor-overlay boundary.
  itemOriginY: 144,
  itemPitch: 1020,
  canvasBaseHeight: 200,
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
      y: 0,
      width: 1440,
      height: 34
    },
    "header.secondary": {
      scope: "canvas",
      x: 80,
      y: 48,
      width: 1440,
      height: 34
    },
    "header.tertiary": {
      scope: "canvas",
      x: 80,
      y: 96,
      width: 1440,
      height: 34
    },
    "item.panel": {
      scope: "item",
      x: 70,
      y: 0,
      width: 1460,
      height: 990
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
      x: 80,
      y: 0,
      width: 1440,
      height: 55
    },
    "item.choice-panel": {
      scope: "item",
      x: 70,
      y: 65,
      width: 680,
      height: 178
    },
    "item.pool-label": {
      scope: "item",
      x: choiceRowLeft + 9,
      y: 75,
      width: 260,
      height: 32
    },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 123,
      rowGap: 10,
      memberWidth: choiceMemberWidth,
      memberHeight: 50,
      contentWidth: 200,
      columnGap: 10,
      insetX: 10,
      insetY: 8
    }),
    "item.prediction-label": {
      scope: "item",
      x: 790,
      y: 77,
      width: 210,
      height: 34
    },
    "item.prediction-box": {
      scope: "item",
      x: 770,
      y: 65,
      width: 250,
      height: 178
    },
    "item.explanation-label": {
      scope: "item",
      x: 1060,
      y: 77,
      width: 450,
      height: 34
    },
    "item.explanation-box": {
      scope: "item",
      x: 1040,
      y: 65,
      width: 490,
      height: 178
    },
    "item.array-panel": {
      scope: "item",
      x: 50,
      y: 248,
      width: 1500,
      height: 668
    },
    "item.array-border-top": {
      scope: "item",
      x: 50,
      y: 248,
      width: 1500,
      height: 4
    },
    "item.array-border-bottom": {
      scope: "item",
      x: 50,
      y: 912,
      width: 1500,
      height: 4
    },
    "item.array-border-left": {
      scope: "item",
      x: 50,
      y: 248,
      width: 4,
      height: 668
    },
    "item.array-border-right": {
      scope: "item",
      x: 1546,
      y: 248,
      width: 4,
      height: 668
    },
    "item.source-panel": {
      scope: "item",
      x: 70,
      y: 258,
      width: 550,
      height: 658
    },
    "item.source-label": {
      scope: "item",
      x: 95,
      y: 271,
      width: 500,
      height: 34
    },
    "item.counting-model-pool": {
      scope: "item",
      x: 110,
      y: 319,
      width: 470,
      height: 588
    },
    "item.source-separator": {
      scope: "item",
      x: 625,
      y: 258,
      width: 4,
      height: 658
    },
    "item.group-lane": {
      scope: "item",
      x: 630,
      y: 258,
      width: 740,
      height: 658
    },
    "item.group-lane-label": {
      scope: "item",
      x: 650,
      y: 271,
      width: 690,
      height: 34
    },
    "item.remainder-lane": {
      scope: "item",
      x: 1380,
      y: 258,
      width: 150,
      height: 658
    },
    "item.remainder-separator": {
      scope: "item",
      x: 1370,
      y: 258,
      width: 4,
      height: 658
    },
    "item.remainder-lane-label": {
      scope: "item",
      x: 1385,
      y: 271,
      width: 140,
      height: 34
    }
  }
};
