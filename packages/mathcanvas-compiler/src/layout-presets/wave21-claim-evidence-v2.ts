import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from(
  { length: 4 },
  (_, index) => `position-card-${index + 1}`
);
const choiceCenterX = 620;
const choiceRowLeft = centeredRowLeft(
  choiceCenterX,
  4,
  220,
  24
);

/**
 * 한 문제를 한 화면에서 읽고 조작하도록 만든 주장-확인 활동용 레이아웃.
 * 큰 2300px 캔버스를 축소하던 이전 preset과 달리 실제 학생 화면 폭에
 * 가까운 1600px 좌표계를 사용한다.
 */
export const wave21ClaimEvidenceV2LayoutPreset: LayoutPreset = {
  itemOriginY: 215,
  itemPitch: 860,
  canvasBaseHeight: 250,
  minGap: 12,
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
      x: 110,
      y: 28,
      width: 1380,
      height: 52
    },
    "header.secondary": {
      scope: "canvas",
      x: 110,
      y: 82,
      width: 1380,
      height: 52
    },
    "header.tertiary": {
      scope: "canvas",
      x: 110,
      y: 136,
      width: 1380,
      height: 52
    },
    "item.panel": {
      scope: "item",
      x: 70,
      y: 0,
      width: 1460,
      height: 830
    },
    "item.number": {
      scope: "item",
      x: 105,
      y: 24,
      width: 75,
      height: 48
    },
    "item.question": {
      scope: "item",
      x: 205,
      y: 16,
      width: 1260,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 90,
      y: 95,
      width: 1060,
      height: 200
    },
    "item.pool-label": {
      scope: "item",
      x: choiceRowLeft + 15,
      y: 110,
      width: 320,
      height: 45
    },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [4],
      centerX: choiceCenterX,
      firstRowY: 165,
      rowGap: 0,
      memberWidth: 220,
      memberHeight: 120,
      contentWidth: 190,
      columnGap: 24,
      insetX: 15,
      insetY: 12
    }),
    "item.prediction-label": {
      scope: "item",
      x: 1190,
      y: 105,
      width: 290,
      height: 45
    },
    "item.prediction-box": {
      scope: "item",
      x: 1190,
      y: 165,
      width: 290,
      height: 120
    },
    "item.array-panel": {
      scope: "item",
      x: 90,
      y: 315,
      width: 1420,
      height: 270
    },
    "item.group-label": {
      scope: "item",
      x: 140,
      y: 330,
      width: 360,
      height: 45
    },
    "item.array-text": {
      scope: "item",
      x: 140,
      y: 380,
      width: 1320,
      height: 190
    },
    "item.explanation-label": {
      scope: "item",
      x: 105,
      y: 610,
      width: 390,
      height: 45
    },
    "item.explanation-box": {
      scope: "item",
      x: 105,
      y: 665,
      width: 1395,
      height: 140
    }
  }
};
