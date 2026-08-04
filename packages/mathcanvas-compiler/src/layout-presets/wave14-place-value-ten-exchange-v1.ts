import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choiceRoles = [
  "position-card-1",
  "position-card-2",
  "position-card-3",
  "position-card-4",
  "position-card-5"
] as const;

const tenRoles = Array.from(
  { length: 10 },
  (_, index) => `exchange-ten-${index + 1}`
);
const slotRoles = Array.from(
  { length: 10 },
  (_, index) => `exchange-slot-${index + 1}`
);
const gridRoles = Array.from(
  { length: 10 },
  (_, index) => `hundred-grid-row-${index + 1}`
);

const choiceCenterX = 1650;
const memberWidth = 210;
const contentWidth = 100;
const columnGap = 20;

const tenTokens = Object.fromEntries(
  tenRoles.map((role, index) => [
    `item.${role}`,
    {
      scope: "item" as const,
      x: 173 + (index % 5) * 144,
      y: 310 + Math.floor(index / 5) * 134,
      width: 120,
      height: 120
    }
  ])
);

const slotTokens = Object.fromEntries(
  slotRoles.map((role, index) => [
    `item.${role}`,
    {
      scope: "item" as const,
      x: 165 + (index % 5) * 150,
      y: 670 + Math.floor(index / 5) * 150,
      width: 148,
      height: 148
    }
  ])
);

const gridTokens = Object.fromEntries(
  gridRoles.map((role, index) => [
    `item.${role}`,
    {
      scope: "item" as const,
      x: 970,
      y: 680 + index * 24,
      width: 262,
      height: 24
    }
  ])
);

export const wave14PlaceValueTenExchangeLayoutPreset: LayoutPreset = {
  itemOriginY: 330,
  itemPitch: 1020,
  canvasBaseHeight: 390,
  minGap: 8,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 2200,
      height: 390
    },
    "header.primary": {
      scope: "canvas",
      x: 220,
      y: 44,
      width: 1760,
      height: 58
    },
    "header.secondary": {
      scope: "canvas",
      x: 220,
      y: 124,
      width: 1760,
      height: 58
    },
    "header.tertiary": {
      scope: "canvas",
      x: 220,
      y: 204,
      width: 1760,
      height: 58
    },
    "item.panel": {
      scope: "item",
      x: 100,
      y: 20,
      width: 2000,
      height: 970
    },
    "item.number": {
      scope: "item",
      x: 145,
      y: 42,
      width: 90,
      height: 44
    },
    "item.question": {
      scope: "item",
      x: 270,
      y: 38,
      width: 1100,
      height: 72
    },
    "item.initial-panel": {
      scope: "item",
      x: 150,
      y: 112,
      width: 1060,
      height: 100
    },
    "item.initial-label": {
      scope: "item",
      x: 180,
      y: 143,
      width: 130,
      height: 38
    },
    "item.initial-value": {
      scope: "item",
      x: 330,
      y: 126,
      width: 190,
      height: 66
    },
    "item.initial-decomposition": {
      scope: "item",
      x: 580,
      y: 142,
      width: 520,
      height: 40
    },
    "item.ten-bank": {
      scope: "item",
      x: 150,
      y: 240,
      width: 740,
      height: 350
    },
    "item.ten-bank-label": {
      scope: "item",
      x: 175,
      y: 256,
      width: 240,
      height: 36
    },
    ...tenTokens,
    "item.exchange-box": {
      scope: "item",
      x: 150,
      y: 600,
      width: 780,
      height: 390
    },
    "item.exchange-box-label": {
      scope: "item",
      x: 175,
      y: 616,
      width: 300,
      height: 36
    },
    ...slotTokens,
    "item.hundred-grid-panel": {
      scope: "item",
      x: 950,
      y: 610,
      width: 300,
      height: 350
    },
    "item.hundred-grid-label": {
      scope: "item",
      x: 970,
      y: 626,
      width: 240,
      height: 36
    },
    ...gridTokens,
    "item.hundred-grid-relation": {
      scope: "item",
      x: 970,
      y: 925,
      width: 260,
      height: 34
    },
    "item.prediction-label": {
      scope: "item",
      x: 1280,
      y: 120,
      width: 180,
      height: 40
    },
    "item.prediction-box": {
      scope: "item",
      x: 1480,
      y: 108,
      width: 300,
      height: 64
    },
    "item.choice-panel": {
      scope: "item",
      x: 1260,
      y: 190,
      width: 800,
      height: 220
    },
    "item.pool-label": {
      scope: "item",
      x:
        centeredRowLeft(choiceCenterX, 3, memberWidth, columnGap) +
        (memberWidth - contentWidth) / 2,
      y: 210,
      width: 300,
      height: 32
    },
    ...centeredChoicePoolTokens({
      roles: choiceRoles,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 252,
      rowGap: 8,
      memberWidth,
      memberHeight: 72,
      contentWidth,
      columnGap,
      insetX: 8,
      insetY: 6
    }),
    "item.explanation-label": {
      scope: "item",
      x: 1280,
      y: 445,
      width: 250,
      height: 40
    },
    "item.explanation-box": {
      scope: "item",
      x: 1550,
      y: 425,
      width: 490,
      height: 250
    }
  }
};
