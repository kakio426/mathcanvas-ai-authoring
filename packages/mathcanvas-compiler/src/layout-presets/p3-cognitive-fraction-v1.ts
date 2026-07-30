import type { LayoutPreset } from "@mathcanvas/contracts";

export const p3CognitiveFractionLayoutPreset: LayoutPreset = {
  itemOriginY: 360,
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
      y: 70,
      width: 1920,
      height: 90
    },
    "header.secondary": {
      scope: "canvas",
      relativeTo: "header.primary",
      x: 0,
      y: 114,
      width: 1920,
      height: 62
    },
    "header.tertiary": {
      scope: "canvas",
      relativeTo: "header.secondary",
      x: 0,
      y: 86,
      width: 1920,
      height: 62
    },
    "item.panel": {
      scope: "item",
      x: 380,
      y: 20,
      width: 1640,
      height: 450
    },
    "item.number": {
      scope: "item",
      relativeTo: "item.panel",
      x: 30,
      y: 18,
      width: 110,
      height: 52
    },
    "item.prompt": {
      scope: "item",
      relativeTo: "item.panel",
      x: 690,
      y: 12,
      width: 420,
      height: 66
    },
    "item.prediction-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 30,
      y: 92,
      width: 170,
      height: 42
    },
    "item.prediction-box": {
      scope: "item",
      relativeTo: "item.panel",
      x: 210,
      y: 80,
      width: 260,
      height: 70
    },
    "item.left-lane": {
      scope: "item",
      x: 740,
      y: 130,
      width: 640,
      height: 80
    },
    "item.left-lane-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 130,
      y: 120,
      width: 70,
      height: 50
    },
    "item.right-lane": {
      scope: "item",
      x: 740,
      y: 240,
      width: 640,
      height: 80
    },
    "item.right-lane-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 130,
      y: 230,
      width: 70,
      height: 50
    },
    "item.start-line": {
      scope: "item",
      x: 732,
      y: 130,
      width: 16,
      height: 190
    },
    "item.relation-slot": {
      scope: "item",
      x: 1460,
      y: 170,
      width: 120,
      height: 120
    },
    "item.relation-slot-label": {
      scope: "item",
      relativeTo: "item.relation-slot",
      x: 135,
      y: 36,
      width: 180,
      height: 42
    },
    "item.explanation-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 30,
      y: 354,
      width: 170,
      height: 42
    },
    "item.explanation-box": {
      scope: "item",
      relativeTo: "item.panel",
      x: 210,
      y: 338,
      width: 1180,
      height: 90
    },
    "item.left-source": {
      scope: "item",
      x: 260,
      y: 520,
      width: 640,
      height: 80
    },
    "item.right-source": {
      scope: "item",
      x: 1500,
      y: 520,
      width: 640,
      height: 80
    },
    "item.less-choice": {
      scope: "item",
      x: 970,
      y: 510,
      width: 100,
      height: 100
    },
    "item.equal-choice": {
      scope: "item",
      x: 1120,
      y: 510,
      width: 100,
      height: 100
    },
    "item.greater-choice": {
      scope: "item",
      x: 1270,
      y: 510,
      width: 100,
      height: 100
    }
  }
};
