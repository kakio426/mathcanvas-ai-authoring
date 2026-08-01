import type {
  LayoutPreset,
  LayoutToken
} from "@mathcanvas/contracts";

const formulaRoles = [
  "left-a",
  "plus",
  "left-b",
  "equals",
  "unknown-result"
] as const;

function formulaRail(): Readonly<Record<string, LayoutToken>> {
  return Object.fromEntries(
    formulaRoles.map((role, index) => [
      `item.${role}`,
      {
        scope: "item" as const,
        x: 1430 + index * 112,
        y: 150,
        width: 88,
        height: 82
      }
    ])
  );
}

export const wave5BalanceScaleLayoutPreset: LayoutPreset = {
  itemOriginY: 390,
  itemPitch: 730,
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
      height: 64
    },
    "header.secondary": {
      scope: "canvas",
      x: 220,
      y: 136,
      width: 1960,
      height: 64
    },
    "header.tertiary": {
      scope: "canvas",
      x: 220,
      y: 224,
      width: 1960,
      height: 64
    },
    "item.panel": {
      scope: "item",
      x: 300,
      y: 20,
      width: 1800,
      height: 500
    },
    "item.number": {
      scope: "item",
      x: 340,
      y: 46,
      width: 100,
      height: 44
    },
    "item.prediction-label": {
      scope: "item",
      x: 470,
      y: 46,
      width: 190,
      height: 44
    },
    "item.prediction-box": {
      scope: "item",
      x: 680,
      y: 36,
      width: 330,
      height: 64
    },
    ...formulaRail(),
    "item.balance-scale": {
      scope: "item",
      x: 500,
      y: 100,
      width: 760,
      height: 390
    },
    "item.fixed-card-a": {
      scope: "item",
      x: 586,
      y: 149,
      width: 80,
      height: 80
    },
    "item.fixed-card-b": {
      scope: "item",
      x: 690,
      y: 149,
      width: 80,
      height: 80
    },
    "item.choice-panel": {
      scope: "item",
      x: 880,
      y: 540,
      width: 640,
      height: 150
    },
    "item.pool-label": {
      scope: "item",
      x: 950,
      y: 548,
      width: 130,
      height: 38
    },
    ...Object.fromEntries(
      Array.from({ length: 5 }, (_, index) => [
        `item.piece-card-${index + 1}`,
        {
          scope: "item" as const,
          x: 950 + index * 106,
          y: 600,
          width: 80,
          height: 80
        }
      ])
    ),
    "item.explanation-label": {
      scope: "item",
      x: 1430,
      y: 260,
      width: 180,
      height: 44
    },
    "item.explanation-box": {
      scope: "item",
      x: 1430,
      y: 318,
      width: 500,
      height: 140
    }
  }
};
