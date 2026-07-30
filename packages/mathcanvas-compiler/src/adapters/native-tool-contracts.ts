import type { VisualModel } from "@mathcanvas/contracts";

export interface NativeToolPlacement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type FractionModelIntent = {
  readonly kind: "fraction-model";
  readonly toolKey: "NO03FM";
  readonly fraction: VisualModel["fraction"];
  readonly color: string;
};

export type NumberCardIntent = {
  readonly kind: "number-card";
  readonly toolKey: "NO04NT";
  readonly value: number;
};

export type TextIntent = {
  readonly kind: "text";
  readonly toolKey: "common.text";
  readonly text: string;
  readonly fontSize?: number;
};

export type LatexIntent = {
  readonly kind: "latex";
  readonly toolKey: "common.formula";
  readonly text: string;
  readonly fontSize?: number;
};

export type RectangleIntent = {
  readonly kind: "draw-rectangle";
  readonly toolKey: "common.rectangle";
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeDashArray?: string;
};

export type NativeToolIntent =
  | FractionModelIntent
  | NumberCardIntent
  | TextIntent
  | LatexIntent
  | RectangleIntent;
