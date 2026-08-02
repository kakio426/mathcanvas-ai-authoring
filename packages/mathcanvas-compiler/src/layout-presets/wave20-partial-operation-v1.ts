import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const cards = Array.from(
  { length: 8 },
  (_, index) => `expression-card-${index + 1}`
);
const poolCenterX = 1200;

export const wave20PartialOperationLayoutPreset: LayoutPreset = {
  itemOriginY: 340,
  itemPitch: 1200,
  canvasBaseHeight: 400,
  minGap: 10,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 2400, height: 400 },
    "header.primary": { scope: "canvas", x: 220, y: 40, width: 1960, height: 58 },
    "header.secondary": { scope: "canvas", x: 220, y: 120, width: 1960, height: 58 },
    "header.tertiary": { scope: "canvas", x: 220, y: 200, width: 1960, height: 58 },
    "item.panel": { scope: "item", x: 70, y: 20, width: 2260, height: 750 },
    "item.number": { scope: "item", x: 110, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 230, y: 35, width: 1960, height: 64 },
    "item.prediction-label": { scope: "item", x: 130, y: 135, width: 220, height: 40 },
    "item.prediction-box": { scope: "item", x: 380, y: 118, width: 300, height: 78 },
    "item.expression-slot-1": { scope: "item", x: 760, y: 108, width: 260, height: 96 },
    "item.plus-operator": { scope: "item", x: 1050, y: 108, width: 70, height: 96 },
    "item.expression-slot-2": { scope: "item", x: 1150, y: 108, width: 260, height: 96 },
    "item.equals-operator": { scope: "item", x: 1440, y: 108, width: 70, height: 96 },
    "item.target-value": { scope: "item", x: 1540, y: 108, width: 150, height: 96 },
    "item.model-panel": { scope: "item", x: 120, y: 235, width: 1220, height: 315 },
    "item.model-label": { scope: "item", x: 170, y: 255, width: 430, height: 38 },
    "item.model-instruction": { scope: "item", x: 620, y: 257, width: 650, height: 34 },
    "item.model-workspace": { scope: "item", x: 250, y: 310, width: 960, height: 205 },
    "item.expression-pool": { scope: "item", x: 430, y: 790, width: 1540, height: 350 },
    "item.pool-label": {
      scope: "item",
      x: centeredRowLeft(poolCenterX, 4, 250, 24) + 9,
      y: 820,
      width: 250,
      height: 34
    },
    ...centeredChoicePoolTokens({
      roles: cards,
      rowCounts: [4, 4],
      centerX: poolCenterX,
      firstRowY: 870,
      rowGap: 24,
      memberWidth: 250,
      memberHeight: 96,
      contentWidth: 230,
      columnGap: 24,
      insetX: 10,
      insetY: 8
    }),
    "item.explanation-label": { scope: "item", x: 150, y: 615, width: 310, height: 40 },
    "item.explanation-box": { scope: "item", x: 490, y: 580, width: 1660, height: 145 }
  }
};
