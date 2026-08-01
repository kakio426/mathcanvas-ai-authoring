import type {
  LayoutPreset,
  LayoutToken
} from "@mathcanvas/contracts";

const SLOT_SIZE = 128;
const RAIL_GAP = 32;
const OPERATOR_WIDTH = 72;
const RESULT_WIDTH = 96;
const FORMULA_HEIGHT = 104;
const MATH_AXIS_OFFSET = 0;
const FRAME_CELL_SIZE = 64;

function buildRail(
  originX: number,
  originY: number
): Readonly<Record<string, LayoutToken>> {
  const formulaY =
    originY +
    (SLOT_SIZE - FORMULA_HEIGHT) / 2 +
    MATH_AXIS_OFFSET;
  const leftSlotX = originX;
  const plusX = leftSlotX + SLOT_SIZE + RAIL_GAP;
  const rightSlotX = plusX + OPERATOR_WIDTH + RAIL_GAP;
  const equalsX = rightSlotX + SLOT_SIZE + RAIL_GAP;
  const totalX = equalsX + OPERATOR_WIDTH + RAIL_GAP;
  return {
    "item.left-slot": {
      scope: "item",
      x: leftSlotX,
      y: originY,
      width: SLOT_SIZE,
      height: SLOT_SIZE
    },
    "item.plus-operator": {
      scope: "item",
      x: plusX,
      y: formulaY,
      width: OPERATOR_WIDTH,
      height: FORMULA_HEIGHT
    },
    "item.right-slot": {
      scope: "item",
      x: rightSlotX,
      y: originY,
      width: SLOT_SIZE,
      height: SLOT_SIZE
    },
    "item.equals-operator": {
      scope: "item",
      x: equalsX,
      y: formulaY,
      width: OPERATOR_WIDTH,
      height: FORMULA_HEIGHT
    },
    "item.total-value": {
      scope: "item",
      x: totalX,
      y: formulaY,
      width: RESULT_WIDTH,
      height: FORMULA_HEIGHT
    }
  };
}

function buildFrame(
  originX: number,
  originY: number
): Readonly<Record<string, LayoutToken>> {
  return Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => {
      const row = Math.floor(index / 5);
      const column = index % 5;
      return [
        `item.frame-cell-${index + 1}`,
        {
          scope: "item" as const,
          x: originX + column * FRAME_CELL_SIZE,
          y: originY + row * FRAME_CELL_SIZE,
          width: FRAME_CELL_SIZE,
          height: FRAME_CELL_SIZE
        }
      ];
    })
  );
}

export const p3CognitiveMakeTenLayoutPreset: LayoutPreset = {
  itemOriginY: 420,
  itemPitch: 720,
  canvasBaseHeight: 440,
  minGap: 24,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 2400,
      height: 440
    },
    "header.primary": {
      scope: "canvas",
      x: 240,
      y: 52,
      width: 1920,
      height: 76
    },
    "header.secondary": {
      scope: "canvas",
      x: 240,
      y: 152,
      width: 1920,
      height: 62
    },
    "header.tertiary": {
      scope: "canvas",
      x: 240,
      y: 238,
      width: 1920,
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
      relativeTo: "item.panel",
      x: 30,
      y: 24,
      width: 110,
      height: 48
    },
    "item.prediction-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 170,
      y: 24,
      width: 190,
      height: 44
    },
    "item.prediction-box": {
      scope: "item",
      relativeTo: "item.panel",
      x: 370,
      y: 16,
      width: 420,
      height: 64
    },
    ...buildRail(620, 140),
    "item.frame-label": {
      scope: "item",
      x: 1260,
      y: 168,
      width: 220,
      height: 48
    },
    ...buildFrame(1480, 140),
    "item.explanation-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 30,
      y: 480,
      width: 220,
      height: 44
    },
    "item.explanation-box": {
      scope: "item",
      relativeTo: "item.panel",
      x: 260,
      y: 460,
      width: 1310,
      height: 130
    },
    "item.pool-label": {
      scope: "item",
      x: 860,
      y: 300,
      width: 140,
      height: 44
    },
    ...Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        `item.piece-card-${index + 1}`,
        {
          scope: "item" as const,
          x: 860 + index * 120,
          y: 360,
          width: 80,
          height: 80
        }
      ])
    )
  }
};
