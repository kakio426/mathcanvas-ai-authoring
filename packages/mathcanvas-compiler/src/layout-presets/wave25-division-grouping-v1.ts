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
  const tops = [350, 536, 722];
  const border = 3;
  let slot = 1;
  for (const top of tops) {
    for (const left of lefts) {
      tokens[`item.group-slot-${slot}`] = {
        scope: "item",
        x: left,
        y: top,
        width: 370,
        height: 186
      };
      tokens[`item.group-slot-${slot}-label`] = {
        scope: "item",
        x: left + 12,
        y: top + 5,
        width: 346,
        height: 28
      };
      tokens[`item.group-slot-${slot}-border-top`] = {
        scope: "item",
        x: left,
        y: top,
        width: 370,
        height: border
      };
      tokens[`item.group-slot-${slot}-border-bottom`] = {
        scope: "item",
        x: left,
        y: top + 186 - border,
        width: 370,
        height: border
      };
      tokens[`item.group-slot-${slot}-border-left`] = {
        scope: "item",
        x: left,
        y: top,
        width: border,
        height: 186
      };
      tokens[`item.group-slot-${slot}-border-right`] = {
        scope: "item",
        x: left + 370 - border,
        y: top,
        width: border,
        height: 186
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
 * 비운다. source pool은 84×84 intrinsic reserve를 기준으로 항상 5열을 유지해
 * 23~31개를 588 높이 안에 담는다. 5는 지원하는 제수 4·6·7과 모두 달라 초기
 * 배열이 몫이나 나머지를 직접 드러내지 않는다. group lane은 가까운 낱개를
 * 묶은 chrome을 담는 370×186 자리 6개를
 * 제공한다. 큰 draw rectangle을 unit 뒤에 깔면 native 다중 선택을 가로채므로
 * 모든 영역은 내부가 빈 얇은 border line 네 개로 그린다.
 */
export const wave25DivisionGroupingLayoutPreset: LayoutPreset = {
  itemOriginY: 145,
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
      y: 40,
      width: 1440,
      height: 30
    },
    "header.secondary": {
      scope: "canvas",
      x: 80,
      y: 72,
      width: 1440,
      height: 30
    },
    "header.tertiary": {
      scope: "canvas",
      x: 80,
      y: 104,
      width: 1440,
      height: 30
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
      x: choiceRowLeft + 15,
      y: 69,
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
      height: 650
    },
    "item.array-border-top": {
      scope: "item",
      x: 50,
      y: 300,
      width: 1500,
      height: 4
    },
    "item.array-border-bottom": {
      scope: "item",
      x: 50,
      y: 946,
      width: 1500,
      height: 4
    },
    "item.array-border-left": {
      scope: "item",
      x: 50,
      y: 300,
      width: 4,
      height: 650
    },
    "item.array-border-right": {
      scope: "item",
      x: 1546,
      y: 300,
      width: 4,
      height: 650
    },
    "item.source-panel": {
      scope: "item",
      x: 70,
      y: 310,
      width: 550,
      height: 640
    },
    "item.source-label": {
      scope: "item",
      x: 95,
      y: 315,
      width: 500,
      height: 38
    },
    "item.counting-model-pool": {
      scope: "item",
      x: 110,
      y: 350,
      width: 470,
      height: 588
    },
    "item.source-separator": {
      scope: "item",
      x: 625,
      y: 310,
      width: 4,
      height: 640
    },
    "item.group-lane": {
      scope: "item",
      x: 630,
      y: 310,
      width: 760,
      height: 640
    },
    "item.group-lane-label": {
      scope: "item",
      x: 650,
      y: 315,
      width: 710,
      height: 38
    },
    ...groupSlotTokens(),
    "item.remainder-lane": {
      scope: "item",
      x: 1410,
      y: 310,
      width: 120,
      height: 640
    },
    "item.remainder-separator": {
      scope: "item",
      x: 1400,
      y: 310,
      width: 4,
      height: 640
    },
    "item.remainder-lane-label": {
      scope: "item",
      x: 1415,
      y: 315,
      width: 110,
      height: 38
    }
  }
};
