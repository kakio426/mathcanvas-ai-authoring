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

export type PointLineIntent = {
  readonly kind: "point-line";
  readonly toolKey: "common.point-line";
  readonly geometry: "line" | "angle";
  readonly angleDegrees: number;
  readonly ray?: "base" | "turn";
  readonly stroke?: string;
};

/**
 * MathCanvas 막대그래프. 축·눈금·항목 이름을 객체 하나가 모두 담는다.
 * 세로축 최대값은 `(gridlineCount - 1) x valuePerGridline`이며, 이 규칙은
 * research/mathcanvas/graph-tool-object-template.json에 근거를 남겼다.
 */
export type BarChartIntent = {
  readonly kind: "bar-chart";
  readonly toolKey: "DP04BC";
  readonly title: string;
  readonly valueAxisName: string;
  readonly categoryAxisName: string;
  readonly valueAxisUnit: string;
  readonly categories: readonly string[];
  readonly valuePerGridline: number;
  readonly gridlineCount: number;
  /** 비우면 학생이 채우는 그래프, 채우면 읽는 그래프가 된다. */
  readonly values: readonly number[];
};

/** MathCanvas 자료와 표. 막대그래프의 자료 출처로 함께 놓는다. */
export type DataTableIntent = {
  readonly kind: "data-table";
  readonly toolKey: "DP02TG";
  readonly title: string;
  /** 항목 축의 머리글. 예: 운동, 동물 */
  readonly categoryAxisName: string;
  /** 값 열의 머리글. 예: 학생 수(명) */
  readonly valueColumnName: string;
  readonly categories: readonly string[];
  readonly values: readonly number[];
};

export type NativeToolIntent =
  | FractionModelIntent
  | NumberCardIntent
  | BalanceScaleIntent
  | AnalogClockIntent
  | PlaceValueModelIntent
  | PatternBlockIntent
  | BarChartIntent
  | DataTableIntent
  | TextIntent
  | LatexIntent
  | RectangleIntent
  | PointLineIntent;
