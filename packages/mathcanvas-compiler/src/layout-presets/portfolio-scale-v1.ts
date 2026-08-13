import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from({ length: 4 }, (_, index) => `position-card-${index + 1}`);
const choiceCenterX = 800;
const choiceRowLeft = centeredRowLeft(choiceCenterX, 2, 610, 24);

/** 97개 성취기준 진단형 활동의 공통 화면. native 증거 영역만 엔진별로 달라진다. */
export const portfolioScaleLayoutPreset: LayoutPreset = {
  itemOriginY: 220,
  itemPitch: 1120,
  canvasBaseHeight: 250,
  minGap: 12,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 1600, height: 300 },
    "header.primary": { scope: "canvas", x: 110, y: 28, width: 1380, height: 52 },
    "header.secondary": { scope: "canvas", x: 110, y: 82, width: 1380, height: 52 },
    "header.tertiary": { scope: "canvas", x: 110, y: 136, width: 1380, height: 52 },
    "item.panel": { scope: "item", x: 70, y: 0, width: 1460, height: 1080 },
    "item.number": { scope: "item", x: 105, y: 24, width: 75, height: 48 },
    "item.question": { scope: "item", x: 205, y: 10, width: 1290, height: 82 },
    "item.choice-panel": { scope: "item", x: 90, y: 105, width: 1420, height: 280 },
    "item.pool-label": { scope: "item", x: choiceRowLeft + 15, y: 115, width: 360, height: 42 },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [2, 2],
      centerX: choiceCenterX,
      firstRowY: 165,
      rowGap: 18,
      memberWidth: 610,
      memberHeight: 92,
      contentWidth: 580,
      columnGap: 24,
      insetX: 15,
      insetY: 8
    }),
    "item.prediction-label": { scope: "item", x: 125, y: 408, width: 360, height: 40 },
    "item.prediction-box": { scope: "item", x: 105, y: 400, width: 1395, height: 120 },
    "item.array-panel": { scope: "item", x: 90, y: 545, width: 1420, height: 280 },
    "item.group-label": { scope: "item", x: 130, y: 558, width: 550, height: 42 },
    "item.array-text": { scope: "item", x: 130, y: 610, width: 590, height: 180 },
    "item.array-text-table": { scope: "item", x: 130, y: 610, width: 590, height: 55 },
    "item.native-target": { scope: "item", x: 735, y: 610, width: 715, height: 190 },
    "item.native-number-target": { scope: "item", x: 875, y: 610, width: 190, height: 190 },
    "item.native-source-1": { scope: "item", x: 1090, y: 650, width: 90, height: 90 },
    "item.native-source-2": { scope: "item", x: 1190, y: 650, width: 90, height: 90 },
    "item.native-source-3": { scope: "item", x: 1290, y: 650, width: 90, height: 90 },
    "item.native-source-4": { scope: "item", x: 1390, y: 650, width: 90, height: 90 },
    "item.native-1": { scope: "item", x: 760, y: 615, width: 170, height: 170 },
    "item.native-2": { scope: "item", x: 940, y: 615, width: 170, height: 170 },
    "item.native-3": { scope: "item", x: 1120, y: 615, width: 170, height: 170 },
    "item.native-4": { scope: "item", x: 1300, y: 615, width: 170, height: 170 },
    "item.native-wide-1": { scope: "item", x: 760, y: 610, width: 340, height: 190 },
    "item.native-wide-2": { scope: "item", x: 1120, y: 610, width: 340, height: 190 },
    "item.native-table-wide": { scope: "item", x: 215, y: 675, width: 1250, height: 125 },
    "item.explanation-label": { scope: "item", x: 125, y: 858, width: 520, height: 42 },
    "item.explanation-box": { scope: "item", x: 105, y: 850, width: 1395, height: 185 }
  }
};
