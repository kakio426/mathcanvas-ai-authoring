import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const cards = Array.from(
  { length: 8 },
  (_, index) => `factor-card-${index + 1}`
);
const poolCenterX = 1200;

export const wave19FactorPairArrayLayoutPreset: LayoutPreset = {
  itemOriginY: 340,
  itemPitch: 1160,
  canvasBaseHeight: 400,
  minGap: 10,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 2400, height: 400 },
    "header.primary": { scope: "canvas", x: 220, y: 40, width: 1960, height: 58 },
    "header.secondary": { scope: "canvas", x: 220, y: 120, width: 1960, height: 58 },
    "header.tertiary": { scope: "canvas", x: 220, y: 200, width: 1960, height: 58 },
    "item.panel": { scope: "item", x: 70, y: 20, width: 2260, height: 720 },
    "item.number": { scope: "item", x: 110, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 230, y: 35, width: 1960, height: 64 },
    "item.prediction-label": { scope: "item", x: 130, y: 135, width: 160, height: 40 },
    "item.prediction-box": { scope: "item", x: 310, y: 118, width: 240, height: 78 },
    "item.factor-slot-1": { scope: "item", x: 650, y: 112, width: 110, height: 90 },
    "item.multiply-operator": { scope: "item", x: 790, y: 112, width: 70, height: 90 },
    "item.factor-slot-2": { scope: "item", x: 890, y: 112, width: 110, height: 90 },
    "item.equals-operator": { scope: "item", x: 1030, y: 112, width: 70, height: 90 },
    "item.target-value": { scope: "item", x: 1130, y: 112, width: 130, height: 90 },
    "item.array-panel": { scope: "item", x: 120, y: 235, width: 1220, height: 300 },
    "item.array-label": { scope: "item", x: 170, y: 255, width: 420, height: 38 },
    "item.array-grid": { scope: "item", x: 250, y: 305, width: 960, height: 200 },
    "item.factor-pool": { scope: "item", x: 620, y: 760, width: 1160, height: 340 },
    "item.pool-label": {
      scope: "item",
      x: centeredRowLeft(poolCenterX, 4, 100, 24) + 9,
      y: 790,
      width: 250,
      height: 34
    },
    ...centeredChoicePoolTokens({
      roles: cards,
      rowCounts: [4, 4],
      centerX: poolCenterX,
      firstRowY: 840,
      rowGap: 24,
      memberWidth: 100,
      memberHeight: 100,
      contentWidth: 82,
      columnGap: 24,
      insetX: 8,
      insetY: 8
    }),
    "item.explanation-label": { scope: "item", x: 150, y: 600, width: 260, height: 40 },
    "item.explanation-box": { scope: "item", x: 440, y: 570, width: 1710, height: 140 }
  }
};
