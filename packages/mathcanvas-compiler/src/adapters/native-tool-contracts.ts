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
  readonly showLabel?: boolean;
};

export type NumberCardIntent = {
  readonly kind: "number-card";
  readonly toolKey: "NO04NT";
  readonly value: number;
  readonly balanceSide?: "left" | "right";
};

export type BalanceScaleIntent = {
  readonly kind: "balance-scale";
  readonly toolKey: "CR07BS";
  readonly initialDirection: "left";
};

export type AnalogClockIntent = {
  readonly kind: "analog-clock";
  readonly toolKey: "SM02AD";
  readonly hours: number;
  readonly minutes: number;
  readonly clockType: "geared";
  readonly isWorking: false;
};

export type PlaceValueModelIntent = {
  readonly kind: "place-value-model";
  readonly toolKey: "NO04PD";
  readonly value: 1 | 10 | 100;
};

export type PatternBlockIntent = {
  readonly kind: "pattern-block";
  readonly toolKey: "SM02PB";
  readonly variant: 1 | 2 | 3 | 4 | 5 | 6;
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
  readonly centerInPlacement?: boolean;
};

export type RectangleIntent = {
  readonly kind: "draw-rectangle";
  readonly toolKey: "common.rectangle";
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeDashArray?: string;
  readonly unitSpan?: {
    readonly from: number;
    readonly to: number;
    readonly of: number;
  };
};

export type NativeToolIntent =
  | FractionModelIntent
  | NumberCardIntent
  | BalanceScaleIntent
  | AnalogClockIntent
  | PlaceValueModelIntent
  | PatternBlockIntent
  | TextIntent
  | LatexIntent
  | RectangleIntent;
