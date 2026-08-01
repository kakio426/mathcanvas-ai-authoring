import type { LayoutPreset } from "@mathcanvas/contracts";

export const p3CognitiveEquivalentLayoutPreset: LayoutPreset = {
  itemOriginY: 360,
  itemPitch: 860,
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
      height: 470
    },
    "item.candidate-pool": {
      scope: "item",
      x: 120,
      y: 514,
      width: 2160,
      height: 300
    },
    "item.candidate-pool-label": {
      scope: "item",
      x: 160,
      y: 526,
      width: 180,
      height: 32
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
    "item.reference-lane": {
      scope: "item",
      x: 1000,
      y: 130,
      width: 640,
      height: 80
    },
    "item.reference-lane-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 520,
      y: 120,
      width: 90,
      height: 50
    },
    "item.reference-strip": {
      scope: "item",
      x: 1000,
      y: 130,
      width: 640,
      height: 80
    },
    "item.target-lane": {
      scope: "item",
      x: 1000,
      y: 250,
      width: 640,
      height: 80
    },
    "item.target-lane-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 520,
      y: 240,
      width: 90,
      height: 50
    },
    "item.start-line": {
      scope: "item",
      x: 992,
      y: 130,
      width: 16,
      height: 200
    },
    "item.explanation-label": {
      scope: "item",
      relativeTo: "item.panel",
      x: 30,
      y: 375,
      width: 170,
      height: 42
    },
    "item.explanation-box": {
      scope: "item",
      relativeTo: "item.panel",
      x: 210,
      y: 358,
      width: 1180,
      height: 90
    },
    "item.candidate-1": {
      scope: "item",
      x: 160,
      y: 574,
      width: 640,
      height: 80
    },
    "item.candidate-2": {
      scope: "item",
      x: 880,
      y: 574,
      width: 640,
      height: 80
    },
    "item.candidate-3": {
      scope: "item",
      x: 1600,
      y: 574,
      width: 640,
      height: 80
    },
    "item.candidate-4": {
      scope: "item",
      x: 160,
      y: 694,
      width: 640,
      height: 80
    },
    "item.candidate-5": {
      scope: "item",
      x: 880,
      y: 694,
      width: 640,
      height: 80
    },
    "item.candidate-6": {
      scope: "item",
      x: 1600,
      y: 694,
      width: 640,
      height: 80
    }
  }
};
