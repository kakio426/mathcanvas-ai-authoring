import type { LayoutPreset } from "@mathcanvas/contracts";

export const p1FrozenLayoutPreset: LayoutPreset = {
  itemOriginY: 360,
  itemPitch: 620,
  canvasBaseHeight: 420,
  minGap: 24,
  tokens: {
    "canvas.root": {
      scope: "canvas",
      x: 0,
      y: 0,
      width: 2400,
      height: 420
    },
    "header.primary": {
      scope: "canvas",
      x: 240,
      y: 80,
      width: 1920,
      height: 100
    },
    "header.secondary": {
      scope: "canvas",
      relativeTo: "header.primary",
      x: 0,
      y: 124,
      width: 1920,
      height: 70
    },
    "header.tertiary": {
      scope: "canvas",
      relativeTo: "header.secondary",
      x: 0,
      y: 96,
      width: 1920,
      height: 70
    },
    "item.panel": {
      scope: "item",
      x: 620,
      y: 60,
      width: 1160,
      height: 300
    },
    "item.number": {
      scope: "item",
      relativeTo: "item.panel",
      x: 40,
      y: 16,
      width: 120,
      height: 54
    },
    "item.prompt": {
      scope: "item",
      relativeTo: "item.panel",
      x: 760,
      y: 8,
      width: 360,
      height: 70
    },
    "item.left-lane": {
      scope: "item",
      x: 720,
      y: 120,
      width: 640,
      height: 80
    },
    "item.left-lane-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 20,
      y: 75,
      width: 70,
      height: 50
    },
    "item.right-lane": {
      scope: "item",
      x: 720,
      y: 220,
      width: 640,
      height: 80
    },
    "item.right-lane-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 20,
      y: 175,
      width: 70,
      height: 50
    },
    "item.start-line": {
      scope: "item",
      x: 712,
      y: 120,
      width: 16,
      height: 180
    },
    "item.relation-slot": {
      scope: "item",
      x: 1430,
      y: 160,
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
    "item.left-source": {
      scope: "item",
      x: 250,
      y: 400,
      width: 640,
      height: 80
    },
    "item.right-source": {
      scope: "item",
      x: 1510,
      y: 400,
      width: 640,
      height: 80
    },
    "item.less-choice": {
      scope: "item",
      x: 1010,
      y: 400,
      width: 100,
      height: 100
    },
    "item.greater-choice": {
      scope: "item",
      x: 1160,
      y: 400,
      width: 100,
      height: 100
    }
  }
};
