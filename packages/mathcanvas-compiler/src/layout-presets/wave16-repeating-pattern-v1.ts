import type { LayoutPreset } from "@mathcanvas/contracts";
import { centeredChoicePoolTokens, centeredRowLeft } from "./centered-choice-pool.js";

const choices = Array.from({ length: 5 }, (_, i) => `position-card-${i + 1}`);
const sequence = Array.from({ length: 6 }, (_, i) => `sequence-block-${i + 1}`);
const pieces = Array.from({ length: 5 }, (_, i) => `completion-block-${i + 1}`);
const choiceCenterX = 1950;

export const wave16RepeatingPatternLayoutPreset: LayoutPreset = {
  itemOriginY: 330,
  itemPitch: 890,
  canvasBaseHeight: 390,
  minGap: 8,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 2400, height: 390 },
    "header.primary": { scope: "canvas", x: 220, y: 44, width: 1960, height: 58 },
    "header.secondary": { scope: "canvas", x: 220, y: 124, width: 1960, height: 58 },
    "header.tertiary": { scope: "canvas", x: 220, y: 204, width: 1960, height: 58 },
    "item.panel": { scope: "item", x: 70, y: 20, width: 2260, height: 840 },
    "item.number": { scope: "item", x: 110, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 230, y: 38, width: 1200, height: 54 },
    "item.pattern-track": { scope: "item", x: 120, y: 115, width: 1420, height: 260 },
    "item.pattern-label": { scope: "item", x: 155, y: 135, width: 280, height: 38 },
    ...Object.fromEntries(sequence.map((role, i) => [`item.${role}`, { scope: "item" as const, x: 235 + i * 160, y: 205, width: 120, height: 120 }])),
    "item.next-slot-1": { scope: "item", x: 1195, y: 200, width: 130, height: 130 },
    "item.next-slot-2": { scope: "item", x: 1360, y: 200, width: 130, height: 130 },
    "item.piece-bank": { scope: "item", x: 120, y: 405, width: 1420, height: 270 },
    "item.piece-bank-label": { scope: "item", x: 155, y: 425, width: 260, height: 38 },
    ...Object.fromEntries(pieces.map((role, i) => [`item.${role}`, { scope: "item" as const, x: 250 + i * 245, y: 505, width: 120, height: 120 }])),
    "item.prediction-label": { scope: "item", x: 1610, y: 115, width: 230, height: 40 },
    "item.prediction-box": { scope: "item", x: 1860, y: 105, width: 300, height: 64 },
    "item.choice-panel": { scope: "item", x: 1590, y: 195, width: 720, height: 225 },
    "item.pool-label": { scope: "item", x: centeredRowLeft(choiceCenterX, 3, 180, 18) + 50, y: 209, width: 280, height: 34 },
    ...centeredChoicePoolTokens({ roles: choices, rowCounts: [3, 2], centerX: choiceCenterX, firstRowY: 255, rowGap: 8, memberWidth: 180, memberHeight: 70, contentWidth: 80, columnGap: 18, insetX: 8, insetY: 6 }),
    "item.explanation-label": { scope: "item", x: 1610, y: 470, width: 300, height: 40 },
    "item.explanation-box": { scope: "item", x: 1610, y: 520, width: 650, height: 170 }
  }
};
