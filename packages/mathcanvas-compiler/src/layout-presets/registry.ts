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
import { w002RepeatRuleConstructionLayoutPreset } from "./w002-repeat-rule-construction-v1.js";
import { w002RepeatRepairLayoutPreset } from "./w002-repeat-repair-v1.js";
import { w002ChangeRuleLayoutPreset } from "./w002-change-rule-v1.js";
import { wave17MultiplicationArrayLayoutPreset } from "./wave17-multiplication-array-v1.js";
import { wave17ProbabilityBagLayoutPreset } from "./wave17-probability-bag-v1.js";
import { wave19FactorPairArrayLayoutPreset } from "./wave19-factor-pair-array-v1.js";
import { wave20PartialOperationLayoutPreset } from "./wave20-partial-operation-v1.js";
import { wave22BarGraphRepresentLayoutPreset } from "./wave22-bar-graph-represent-v1.js";
import { wave21ClaimEvidenceV2LayoutPreset } from "./wave21-claim-evidence-v2.js";
import {
  wave23AngleClaimEvidenceLayoutPreset,
  wave23ClaimEvidenceLayoutPreset
} from "./wave23-claim-evidence-v1.js";
import { wave25DivisionGroupingLayoutPreset } from "./wave25-division-grouping-v1.js";
import { portfolioScaleLayoutPreset } from "./portfolio-scale-v1.js";

type WritingLayoutShift = {
  readonly fromY: number;
  readonly minimumX?: number;
  readonly additionalTokenKeys?: readonly string[];
};

type WritingLayoutQuality = {
  readonly predictionShift?: WritingLayoutShift;
};

const WRITING_LAYOUT_QUALITY: Readonly<Record<string, WritingLayoutQuality>> = {
  "p3-cognitive-fraction-v1": {
    predictionShift: { fromY: 180 }
  },
  "p3-cognitive-equivalent-v1": {},
  "p3-cognitive-make-ten-v1": {
    predictionShift: { fromY: 120 }
  },
  "wave5-balanced-equation-v1": {
    predictionShift: { fromY: 135 }
  },
  "wave5-balance-scale-v1": {
    predictionShift: { fromY: 100 }
  },
  "wave6-clock-boundary-v1": {
    predictionShift: { fromY: 190, minimumX: 680 }
  },
  "wave7-elapsed-time-v1": {
    predictionShift: { fromY: 190, minimumX: 880 }
  },
  "wave8-fraction-sum-v1": {
    predictionShift: { fromY: 190, minimumX: 980 }
  },
  "wave9-improper-sum-v1": {
    predictionShift: { fromY: 190, minimumX: 1310 }
  },
  "wave10-common-unit-v1": {
    predictionShift: { fromY: 190, minimumX: 1090 }
  },
  "common-unit-lane-v1": {
    predictionShift: { fromY: 190, minimumX: 1090 }
  },
  "wave12-bar-graph-scale-v1": {
    predictionShift: { fromY: 190, minimumX: 1090 }
  },
  "wave13-broken-ruler-v1": {
    predictionShift: { fromY: 190, minimumX: 1260 }
  },
  "wave14-place-value-ten-exchange-v1": {
    predictionShift: { fromY: 190, minimumX: 1260 }
  },
  "wave16-repeating-pattern-v1": {
    predictionShift: { fromY: 195, minimumX: 1590 }
  },
  "wave17-multiplication-array-v1": {
    predictionShift: {
      fromY: 195,
      minimumX: 1500,
      additionalTokenKeys: [
        "item.explanation-label",
        "item.explanation-box"
      ]
    }
  },
  "wave17-probability-bag-v1": {
    predictionShift: { fromY: 180 }
  },
  "wave21-claim-evidence-v2": {
    predictionShift: { fromY: 315 }
  },
  "wave23-claim-evidence-v1": {}
};

// The prediction area is also a drop target in most activities.  Its header
// lives inside the box, so leave a distinct landing area below that header.
const PREDICTION_HEIGHT = 200;
const EXPLANATION_HEIGHT = 140;
const WRITING_HEADER_INSET_X = 20;
const WRITING_HEADER_INSET_Y = 8;
const WRITING_HEADER_HEIGHT = 40;
const WRITING_TO_NEXT_GAP = 16;

function withStudentWritingLayout(
  id: string,
  preset: LayoutPreset
): LayoutPreset {
  const quality = WRITING_LAYOUT_QUALITY[id];
  if (!quality) return preset;

  const tokens = Object.fromEntries(
    Object.entries(preset.tokens).map(([key, token]) => [
      key,
      { ...token }
    ])
  ) as Record<string, LayoutPreset["tokens"][string]>;
  const predictionBox = tokens["item.prediction-box"];
  const predictionLabel = tokens["item.prediction-label"];
  const explanationBox = tokens["item.explanation-box"];
  const explanationLabel = tokens["item.explanation-label"];
  if (
    !predictionBox ||
    !predictionLabel ||
    !explanationBox ||
    !explanationLabel
  ) {
    throw new Error(`student-writing-layout-incomplete:${id}`);
  }

  const predictionHeight = Math.max(
    predictionBox.height,
    PREDICTION_HEIGHT
  );
  const shift = quality.predictionShift;
  const shiftDelta = shift
    ? Math.max(
        0,
        predictionBox.y + predictionHeight +
          WRITING_TO_NEXT_GAP - shift.fromY
      )
    : 0;
  if (shift && shiftDelta > 0) {
    for (const [key, token] of Object.entries(tokens)) {
      const additionallyShifted =
        shift.additionalTokenKeys?.includes(key) ?? false;
      if (
        key === "item.prediction-box" ||
        key === "item.prediction-label" ||
        token.scope !== "item" ||
        (!additionallyShifted &&
          (token.y < shift.fromY ||
            (shift.minimumX !== undefined && token.x < shift.minimumX)))
      ) {
        continue;
      }
      tokens[key] = { ...token, y: token.y + shiftDelta };
    }
  }

  tokens["item.prediction-box"] = {
    ...predictionBox,
    height: predictionHeight
  };
  tokens["item.prediction-label"] = {
    ...predictionLabel,
    x: predictionBox.x + WRITING_HEADER_INSET_X,
    y: predictionBox.y + WRITING_HEADER_INSET_Y,
    width: predictionBox.width - WRITING_HEADER_INSET_X * 2,
    height: Math.min(predictionLabel.height, WRITING_HEADER_HEIGHT)
  };

  const shiftedExplanationBox = tokens["item.explanation-box"]!;
  const shiftedExplanationLabel = tokens["item.explanation-label"]!;
  const explanationHeight = Math.max(
    shiftedExplanationBox.height,
    EXPLANATION_HEIGHT
  );
  const explanationGrowth =
    explanationHeight - shiftedExplanationBox.height;
  const panelExtraGrowth = id === "wave17-probability-bag-v1" ? 32 : 0;
  const externalGapGrowth =
    id === "wave17-probability-bag-v1"
      ? 50
      : [
            "p3-cognitive-fraction-v1",
            "p3-cognitive-equivalent-v1"
          ].includes(id)
        ? 18
        : 0;

  const containerKeys = ["item.panel", "item.mat", "item.item-panel"];
  const originalContainerBottom = Math.min(
    ...containerKeys
      .map((key) => tokens[key])
      .filter((token): token is NonNullable<typeof token> => Boolean(token))
      .map((token) => token.y + token.height)
  );
  const outsideGrowth = explanationGrowth + externalGapGrowth;
  if (outsideGrowth > 0 && Number.isFinite(originalContainerBottom)) {
    for (const [key, token] of Object.entries(tokens)) {
      if (
        containerKeys.includes(key) ||
        token.scope !== "item" ||
        token.relativeTo ||
        token.y < originalContainerBottom
      ) {
        continue;
      }
      tokens[key] = { ...token, y: token.y + outsideGrowth };
    }
  }
  tokens["item.explanation-box"] = {
    ...shiftedExplanationBox,
    height: explanationHeight
  };
  tokens["item.explanation-label"] = {
    ...shiftedExplanationLabel,
    x: shiftedExplanationBox.x + WRITING_HEADER_INSET_X,
    y: shiftedExplanationBox.y + WRITING_HEADER_INSET_Y,
    width: shiftedExplanationBox.width - WRITING_HEADER_INSET_X * 2,
    height: Math.min(
      shiftedExplanationLabel.height,
      WRITING_HEADER_HEIGHT
    )
  };

  const verticalGrowth =
    shiftDelta + explanationGrowth + panelExtraGrowth;
  const interItemGrowth = [
    "p3-cognitive-fraction-v1",
    "p3-cognitive-equivalent-v1",
    "wave17-probability-bag-v1"
  ].includes(id)
    ? 88
    : 0;
  for (const key of containerKeys) {
    const panel = tokens[key];
    if (panel) tokens[key] = { ...panel, height: panel.height + verticalGrowth };
  }
  return {
    ...preset,
    itemPitch: preset.itemPitch + verticalGrowth + interItemGrowth,
    tokens
  };
}

const rawPresets: Readonly<Record<string, LayoutPreset>> = {
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
  "w002-repeat-rule-construction-v1": w002RepeatRuleConstructionLayoutPreset,
  "w002-repeat-repair-v1": w002RepeatRepairLayoutPreset,
  "w002-change-rule-v1": w002ChangeRuleLayoutPreset,
  "wave17-multiplication-array-v1": wave17MultiplicationArrayLayoutPreset,
  "wave17-probability-bag-v1": wave17ProbabilityBagLayoutPreset,
  "wave19-factor-pair-array-v1": wave19FactorPairArrayLayoutPreset,
  "wave20-partial-operation-v1": wave20PartialOperationLayoutPreset,
  "wave22-bar-graph-represent-v1": wave22BarGraphRepresentLayoutPreset,
  "wave21-claim-evidence-v2": wave21ClaimEvidenceV2LayoutPreset,
  "wave23-claim-evidence-v1": wave23ClaimEvidenceLayoutPreset,
  "wave23-angle-claim-evidence-v1":
    wave23AngleClaimEvidenceLayoutPreset,
  "wave25-division-grouping-v1": wave25DivisionGroupingLayoutPreset,
  "portfolio-scale-v1": portfolioScaleLayoutPreset
};

const presets: Readonly<Record<string, LayoutPreset>> =
  Object.fromEntries(
    Object.entries(rawPresets).map(([id, preset]) => [
      id,
      withStudentWritingLayout(id, preset)
    ])
  );

export function getLayoutPreset(id: string): LayoutPreset {
  const preset = presets[id];
  if (!preset) throw new Error(`layout-preset-unregistered:${id}`);
  return preset;
}
