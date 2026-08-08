import type { LayoutPreset, LayoutToken } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from(
  { length: 5 },
  (_, index) => `position-card-${index + 1}`
);
const choiceCenterX = 495;
const choiceRowLeft = centeredRowLeft(choiceCenterX, 3, 250, 15);

const groupSlotTokens = (): Readonly<Record<string, LayoutToken>> => {
  const tokens: Record<string, LayoutToken> = {};
  const lefts = [640, 1015];
  const tops = [390, 530, 670];
  let slot = 1;
  for (const top of tops) {
    for (const left of lefts) {
      tokens[`item.group-slot-${slot}`] = {
        scope: "item",
        x: left,
        y: top,
        width: 365,
        height: 135
      };
      tokens[`item.group-slot-${slot}-label`] = {
        scope: "item",
        x: left + 12,
        y: top + 5,
        width: 341,
        height: 28
      };
      slot += 1;
    }
  }
  return tokens;
};

/**
 * 나눗셈 한 문제 전용 1280×800 배치.
 *
 * 예상과 설명은 위쪽에 두어 MathCanvas의 고정 selection toolbar 전용 하단 band를
 * 비운다. workbench는 source/group/remainder를 가로로 나누고, 정답을 누설하지
 * 않도록 실제 몫보다 하나 많은 6개의 묶음 자리를 제공한다. 큰 draw rectangle을
 * unit 뒤에 깔면 native 다중 선택을 가로채므로 모든 영역은 내부가 빈 얇은 border
 * line 네 개로 그린다.
 */
export const wave25DivisionGroupingLayoutPreset: LayoutPreset = {
  itemOriginY: 110,
  itemPitch: 880,
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
      height: 850
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
      width: 850,
      height: 220
    },
    "item.pool-label": {
      scope: "item",
      x: choiceRowLeft,
      y: 70,
      width: 260,
      height: 32
    },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 105,
      rowGap: 10,
      memberWidth: 250,
      memberHeight: 70,
      contentWidth: 220,
      columnGap: 15,
      insetX: 15,
      insetY: 8
    }),
    "item.prediction-label": {
      scope: "item",
      x: 965,
      y: 78,
      width: 540,
      height: 34
    },
    "item.prediction-box": {
      scope: "item",
      x: 940,
      y: 65,
      width: 590,
      height: 95
    },
    "item.explanation-label": {
      scope: "item",
      x: 965,
      y: 188,
      width: 540,
      height: 74
    },
    "item.explanation-box": {
      scope: "item",
      x: 940,
      y: 175,
      width: 590,
      height: 110
    },
    "item.array-panel": {
      scope: "item",
      x: 50,
      y: 300,
      width: 1500,
      height: 520
    },
    "item.source-panel": {
      scope: "item",
      x: 70,
      y: 345,
      width: 550,
      height: 460
    },
    "item.source-label": {
      scope: "item",
      x: 95,
      y: 355,
      width: 500,
      height: 38
    },
    "item.counting-model-pool": {
      scope: "item",
      x: 80,
      y: 390,
      width: 530,
      height: 390
    },
    "item.group-lane": {
      scope: "item",
      x: 630,
      y: 345,
      width: 760,
      height: 460
    },
    "item.group-lane-label": {
      scope: "item",
      x: 650,
      y: 355,
      width: 710,
      height: 38
    },
    ...groupSlotTokens(),
    "item.remainder-lane": {
      scope: "item",
      x: 1410,
      y: 345,
      width: 120,
      height: 460
    },
    "item.remainder-lane-label": {
      scope: "item",
      x: 1415,
      y: 355,
      width: 110,
      height: 38
    }
  }
};
