import type { LayoutPreset } from "@mathcanvas/contracts";
import { p1FrozenLayoutPreset } from "./p1-frozen-v1.js";
import { p2NumberCompositionLayoutPreset } from "./p2-number-composition-v1.js";
import { p3CognitiveFractionLayoutPreset } from "./p3-cognitive-fraction-v1.js";
import { p3CognitiveEquivalentLayoutPreset } from "./p3-cognitive-equivalent-v1.js";
import { p3CognitiveMakeTenLayoutPreset } from "./p3-cognitive-make-ten-v1.js";
import { wave5BalancedEquationLayoutPreset } from "./wave5-balanced-equation-v1.js";
import { wave5BalanceScaleLayoutPreset } from "./wave5-balance-scale-v1.js";
import { wave6ClockBoundaryLayoutPreset } from "./wave6-clock-boundary-v1.js";
import { wave7ElapsedTimeLayoutPreset } from "./wave7-elapsed-time-v1.js";
import { wave8FractionSumLayoutPreset } from "./wave8-fraction-sum-v1.js";
import { wave9ImproperSumLayoutPreset } from "./wave9-improper-sum-v1.js";
import { wave10CommonUnitLayoutPreset } from "./wave10-common-unit-v1.js";
import { wave12BarGraphScaleLayoutPreset } from "./wave12-bar-graph-scale-v1.js";
import { wave13BrokenRulerLayoutPreset } from "./wave13-broken-ruler-v1.js";
import { wave14PlaceValueTenExchangeLayoutPreset } from "./wave14-place-value-ten-exchange-v1.js";
import { wave16RepeatingPatternLayoutPreset } from "./wave16-repeating-pattern-v1.js";
import { wave17MultiplicationArrayLayoutPreset } from "./wave17-multiplication-array-v1.js";
import { wave17ProbabilityBagLayoutPreset } from "./wave17-probability-bag-v1.js";
import { wave19FactorPairArrayLayoutPreset } from "./wave19-factor-pair-array-v1.js";
import { wave20PartialOperationLayoutPreset } from "./wave20-partial-operation-v1.js";

const presets: Readonly<Record<string, LayoutPreset>> = {
  "p1-frozen-v1": p1FrozenLayoutPreset,
  "p2-number-composition-v1": p2NumberCompositionLayoutPreset,
  "p3-cognitive-fraction-v1": p3CognitiveFractionLayoutPreset,
  "p3-cognitive-equivalent-v1":
    p3CognitiveEquivalentLayoutPreset,
  "p3-cognitive-make-ten-v1": p3CognitiveMakeTenLayoutPreset,
  "wave5-balanced-equation-v1":
    wave5BalancedEquationLayoutPreset,
  "wave5-balance-scale-v1": wave5BalanceScaleLayoutPreset,
  "wave6-clock-boundary-v1": wave6ClockBoundaryLayoutPreset,
  "wave7-elapsed-time-v1": wave7ElapsedTimeLayoutPreset,
  "wave8-fraction-sum-v1": wave8FractionSumLayoutPreset,
  "wave9-improper-sum-v1": wave9ImproperSumLayoutPreset,
  "wave10-common-unit-v1": wave10CommonUnitLayoutPreset,
  "common-unit-lane-v1": wave10CommonUnitLayoutPreset,
  "graph-scale-lane-v1": wave12BarGraphScaleLayoutPreset,
  "wave12-bar-graph-scale-v1": wave12BarGraphScaleLayoutPreset,
  "wave13-broken-ruler-v1": wave13BrokenRulerLayoutPreset,
  "wave14-place-value-ten-exchange-v1":
    wave14PlaceValueTenExchangeLayoutPreset,
  "wave16-repeating-pattern-v1": wave16RepeatingPatternLayoutPreset,
  "wave17-multiplication-array-v1": wave17MultiplicationArrayLayoutPreset,
  "wave17-probability-bag-v1": wave17ProbabilityBagLayoutPreset,
  "wave19-factor-pair-array-v1": wave19FactorPairArrayLayoutPreset,
  "wave20-partial-operation-v1": wave20PartialOperationLayoutPreset
};

export function getLayoutPreset(id: string): LayoutPreset {
  const preset = presets[id];
  if (!preset) throw new Error(`layout-preset-unregistered:${id}`);
  return preset;
}
