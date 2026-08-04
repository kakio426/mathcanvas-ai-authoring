import type {
  LayoutPreset,
  LayoutToken
} from "@mathcanvas/contracts";

const RAIL_HEIGHT = 108;
const RAIL_GAP = 24;
const FORMULA_WIDTH = 88;
const SLOT_SIZE = 108;
const CELL_SIZE = 42;

function buildRail(
  originX: number,
  originY: number
): Readonly<Record<string, LayoutToken>> {
  const widths = [
    FORMULA_WIDTH,
    FORMULA_WIDTH,
    FORMULA_WIDTH,
    FORMULA_WIDTH,
    FORMULA_WIDTH,
    FORMULA_WIDTH,
    SLOT_SIZE
  ];
  const roles = [
    "left-a",
    "plus-left",
    "left-b",
    "equals",
    "right-c",
    "plus-right",
    "answer-slot"
  ];
  let x = originX;
  return Object.fromEntries(
    roles.map((role, index) => {
      const width = widths[index]!;
      const token: LayoutToken = {
        scope: "item",
        x,
        y: originY,
        width,
        height: RAIL_HEIGHT
      };
      x += width + RAIL_GAP;
      return [`item.${role}`, token];
    })
  );
}

function buildUnitRow(
  prefix: "top" | "bottom",
  originX: number,
  originY: number
): Readonly<Record<string, LayoutToken>> {
  return Object.fromEntries(
    Array.from({ length: 18 }, (_, index) => [
      `item.${prefix}-cell-${index + 1}`,
      {
        scope: "item" as const,
        x: originX + index * CELL_SIZE,
        y: originY,
        width: CELL_SIZE,
        height: CELL_SIZE
      }
    ])
  );
}

export const wave5BalancedEquationLayoutPreset: LayoutPreset = {
  itemOriginY: 410,
  itemPitch: 720,
  canvasBaseHeight: 430,
  minGap: 20,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 2400,
      height: 430
    },
    "header.primary": {
      scope: "canvas",
      x: 220,
      y: 48,
      width: 1960,
      height: 72
    },
    "header.secondary": {
      scope: "canvas",
      x: 220,
      y: 146,
      width: 1960,
      height: 62
    },
    "header.tertiary": {
      scope: "canvas",
      x: 220,
      y: 232,
      width: 1960,
      height: 62
    },
    "item.panel": {
      scope: "item",
      x: 300,
      y: 20,
      width: 1800,
      height: 660
    },
    "item.number": {
      scope: "item",
      x: 340,
      y: 48,
      width: 100,
      height: 44
    },
    "item.prediction-label": {
      scope: "item",
      x: 470,
      y: 48,
      width: 190,
      height: 44
    },
    "item.prediction-box": {
      scope: "item",
      x: 680,
      y: 38,
      width: 370,
      height: 64
    },
    ...buildRail(816, 135),
    "item.top-row-label": {
      scope: "item",
      x: 640,
      y: 268,
      width: 150,
      height: 44
    },
    ...buildUnitRow("top", 822, 258),
    "item.bottom-row-label": {
      scope: "item",
      x: 610,
      y: 336,
      width: 180,
      height: 44
    },
    ...buildUnitRow("bottom", 822, 326),
    "item.marking-hint": {
      scope: "item",
      x: 1600,
      y: 332,
      width: 420,
      height: 46
    },
    "item.pool-label": {
      scope: "item",
      x: 880,
      y: 397,
      width: 120,
      height: 44
    },
    ...Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        `item.piece-card-${index + 1}`,
        {
          scope: "item" as const,
          x: 880 + index * 112,
          y: 457,
          width: 80,
          height: 80
        }
      ])
    ),
    "item.explanation-label": {
      scope: "item",
      x: 650,
      y: 580,
      width: 170,
      height: 44
    },
    "item.explanation-box": {
      scope: "item",
      x: 840,
      y: 560,
      width: 1030,
      height: 100
    }
  }
};
