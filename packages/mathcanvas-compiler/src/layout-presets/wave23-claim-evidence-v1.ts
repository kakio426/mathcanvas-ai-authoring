import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from(
  { length: 5 },
  (_, index) => `position-card-${index + 1}`
);
const choiceCenterX = 800;
const choiceRowLeft = centeredRowLeft(
  choiceCenterX,
  5,
  250,
  20
);

/** 주장-근거 활동 공통 학생 화면. 긴 교실 용어도 폰트를 줄이지 않고 담는다. */
export const wave23ClaimEvidenceLayoutPreset: LayoutPreset = {
  itemOriginY: 215,
  itemPitch: 1040,
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
      height: 1010
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
      width: 1325,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 90,
      y: 95,
      width: 1420,
      height: 190
    },
    "item.pool-label": {
      scope: "item",
      x: choiceRowLeft + 15,
      y: 105,
      width: 320,
      height: 42
    },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [5],
      centerX: choiceCenterX,
      firstRowY: 155,
      rowGap: 0,
      memberWidth: 250,
      memberHeight: 110,
      contentWidth: 220,
      columnGap: 20,
      insetX: 15,
      insetY: 10
    }),
    "item.prediction-label": {
      scope: "item",
      x: 105,
      y: 305,
      width: 360,
      height: 44
    },
    "item.prediction-box": {
      scope: "item",
      x: 105,
      y: 300,
      width: 1395,
      height: 200
    },
    "item.array-panel": {
      scope: "item",
      x: 90,
      y: 525,
      width: 1420,
      height: 245
    },
    "item.group-label": {
      scope: "item",
      x: 140,
      y: 540,
      width: 480,
      height: 45
    },
    "item.array-text": {
      scope: "item",
      x: 140,
      y: 595,
      width: 1320,
      height: 155
    },
    "item.angle-clock": {
      scope: "item",
      x: 160,
      y: 590,
      width: 180,
      height: 180
    },
    "item.angle-evidence-text": {
      scope: "item",
      x: 390,
      y: 610,
      width: 1050,
      height: 110
    },
    "item.explanation-label": {
      scope: "item",
      x: 125,
      y: 800,
      width: 480,
      height: 44
    },
    "item.explanation-box": {
      scope: "item",
      x: 105,
      y: 790,
      width: 1395,
      height: 180
    }
  }
};

/** 각도 활동은 시계 눈금을 펜으로 표시할 수 있도록 시각 모델을 크게 둔다. */
export const wave23AngleClaimEvidenceLayoutPreset: LayoutPreset = {
  ...wave23ClaimEvidenceLayoutPreset,
  itemPitch: 1100,
  tokens: {
    ...wave23ClaimEvidenceLayoutPreset.tokens,
    "item.panel": {
      scope: "item",
      x: 70,
      y: 0,
      width: 1460,
      height: 1070
    },
    "item.array-panel": {
      scope: "item",
      x: 90,
      y: 525,
      width: 1420,
      height: 320
    },
    "item.angle-clock": {
      scope: "item",
      x: 150,
      y: 600,
      width: 240,
      height: 240
    },
    "item.angle-evidence-text": {
      scope: "item",
      x: 440,
      y: 635,
      width: 1000,
      height: 110
    },
    "item.explanation-label": {
      scope: "item",
      x: 125,
      y: 870,
      width: 480,
      height: 44
    },
    "item.explanation-box": {
      scope: "item",
      x: 105,
      y: 860,
      width: 1395,
      height: 180
    }
  }
};
