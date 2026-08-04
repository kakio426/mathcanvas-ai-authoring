import type { LayoutPreset } from "@mathcanvas/contracts";
import { centeredChoicePoolTokens, centeredRowLeft } from "./centered-choice-pool.js";

const choices = Array.from({ length: 5 }, (_, i) => `position-card-${i + 1}`);
const choiceCenterX = 1850;

export const wave17MultiplicationArrayLayoutPreset: LayoutPreset = {
  itemOriginY: 330,
  itemPitch: 780,
  canvasBaseHeight: 390,
  minGap: 8,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 2300, height: 390 },
    "header.primary": { scope: "canvas", x: 220, y: 44, width: 1860, height: 58 },
    "header.secondary": { scope: "canvas", x: 220, y: 124, width: 1860, height: 58 },
    "header.tertiary": { scope: "canvas", x: 220, y: 204, width: 1860, height: 58 },
    "item.panel": { scope: "item", x: 70, y: 20, width: 2160, height: 730 },
    "item.number": { scope: "item", x: 110, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 230, y: 35, width: 1650, height: 72 },
    "item.array-panel": { scope: "item", x: 120, y: 125, width: 1370, height: 315 },
    "item.group-label": { scope: "item", x: 170, y: 155, width: 420, height: 44 },
    "item.array-text": { scope: "item", x: 170, y: 245, width: 1300, height: 100 },
    "item.prediction-label": { scope: "item", x: 1520, y: 115, width: 210, height: 40 },
    "item.prediction-box": { scope: "item", x: 1750, y: 125, width: 300, height: 64 },
    "item.choice-panel": { scope: "item", x: 1500, y: 195, width: 700, height: 225 },
    "item.pool-label": { scope: "item", x: centeredRowLeft(choiceCenterX, 3, 220, 18) + 20, y: 209, width: 280, height: 34 },
    ...centeredChoicePoolTokens({ roles: choices, rowCounts: [3, 2], centerX: choiceCenterX, firstRowY: 255, rowGap: 8, memberWidth: 220, memberHeight: 70, contentWidth: 180, columnGap: 18, insetX: 8, insetY: 6 }),
    "item.explanation-label": { scope: "item", x: 150, y: 500, width: 280, height: 40 },
    "item.explanation-box": { scope: "item", x: 450, y: 475, width: 1700, height: 170 }
  }
};
