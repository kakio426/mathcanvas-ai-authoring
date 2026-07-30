import type { LayoutPreset } from "@mathcanvas/contracts";

export const p2NumberCompositionLayoutPreset: LayoutPreset = {
  itemOriginY: 320,
  itemPitch: 420,
  canvasBaseHeight: 360,
  minGap: 24,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 2400,
      height: 360
    },
    "header.primary": {
      scope: "canvas",
      x: 240,
      y: 60,
      width: 1920,
      height: 90
    },
    "header.secondary": {
      scope: "canvas",
      relativeTo: "header.primary",
      x: 0,
      y: 114,
      width: 1920,
      height: 60
    },
    "item.panel": {
      scope: "item",
      x: 500,
      y: 20,
      width: 1400,
      height: 280
    },
    "item.number": {
      scope: "item",
      relativeTo: "item.panel",
      x: 30,
      y: 20,
      width: 110,
      height: 50
    },
    "item.prompt": {
      scope: "item",
      relativeTo: "item.panel",
      x: 180,
      y: 20,
      width: 520,
      height: 60
    },
    "item.left-target": {
      scope: "item",
      x: 900,
      y: 120,
      width: 120,
      height: 120
    },
    "item.right-target": {
      scope: "item",
      x: 1160,
      y: 120,
      width: 120,
      height: 120
    },
    "item.plus-label": {
      scope: "item",
      x: 1040,
      y: 145,
      width: 100,
      height: 70
    },
    "item.total-label": {
      scope: "item",
      x: 1320,
      y: 145,
      width: 200,
      height: 70
    },
    "item.left-source": {
      scope: "item",
      x: 620,
      y: 310,
      width: 80,
      height: 80
    },
    "item.right-source": {
      scope: "item",
      x: 1700,
      y: 310,
      width: 80,
      height: 80
    }
  }
};
