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
  itemPitch: 1260,
  canvasBaseHeight: 250,
  minGap: 12,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 1600, height: 300 },
    "header.primary": { scope: "canvas", x: 110, y: 28, width: 1380, height: 52 },
    "header.secondary": { scope: "canvas", x: 110, y: 82, width: 1380, height: 52 },
    "header.tertiary": { scope: "canvas", x: 110, y: 136, width: 1380, height: 52 },
    "item.panel": { scope: "item", x: 70, y: 0, width: 1460, height: 1220 },
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
    "item.array-panel": { scope: "item", x: 90, y: 545, width: 1420, height: 400 },
    "item.group-label": { scope: "item", x: 130, y: 558, width: 550, height: 42 },
    "item.array-text": { scope: "item", x: 130, y: 610, width: 1300, height: 42 },
    "item.array-text-table": { scope: "item", x: 130, y: 610, width: 1300, height: 42 },
    "item.native-number-target": { scope: "item", x: 210, y: 680, width: 300, height: 230 },
    "item.native-number-source-1": { scope: "item", x: 615, y: 705, width: 180, height: 180 },
    "item.native-number-source-2": { scope: "item", x: 805, y: 705, width: 180, height: 180 },
    "item.native-number-source-3": { scope: "item", x: 995, y: 705, width: 180, height: 180 },
    "item.native-number-source-4": { scope: "item", x: 1185, y: 705, width: 180, height: 180 },
    "item.native-place-1": { scope: "item", x: 270, y: 680, width: 220, height: 220 },
    "item.native-place-2": { scope: "item", x: 690, y: 680, width: 220, height: 220 },
    "item.native-place-3": { scope: "item", x: 1110, y: 680, width: 220, height: 220 },
    "item.native-fraction-1": { scope: "item", x: 150, y: 690, width: 300, height: 190 },
    "item.native-fraction-2": { scope: "item", x: 500, y: 690, width: 300, height: 190 },
    "item.native-fraction-target": { scope: "item", x: 870, y: 680, width: 500, height: 210 },
    "item.native-pattern-1": { scope: "item", x: 180, y: 680, width: 210, height: 210 },
    "item.native-pattern-2": { scope: "item", x: 510, y: 680, width: 210, height: 210 },
    "item.native-pattern-3": { scope: "item", x: 840, y: 680, width: 210, height: 210 },
    "item.native-pattern-4": { scope: "item", x: 1170, y: 680, width: 210, height: 210 },
    "item.native-geometry-1": { scope: "item", x: 135, y: 660, width: 420, height: 260 },
    "item.native-geometry-2": { scope: "item", x: 580, y: 660, width: 420, height: 260 },
    "item.native-geometry-3": { scope: "item", x: 1025, y: 660, width: 420, height: 260 },
    "item.native-clock": { scope: "item", x: 550, y: 660, width: 500, height: 260 },
    "item.native-table-wide": { scope: "item", x: 215, y: 680, width: 1250, height: 150 },
    "item.explanation-label": { scope: "item", x: 125, y: 978, width: 520, height: 42 },
    "item.explanation-box": { scope: "item", x: 105, y: 970, width: 1395, height: 200 }
  }
};
