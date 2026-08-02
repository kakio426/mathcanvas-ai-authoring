import {
  assertVariationSuiteLimit,
  enumerateVariationEnvelope,
  resolveDeclaredVariation,
  type ResolvedVariation,
  type VariationEnvelopeDeclaration
} from "@mathcanvas/contracts";
import { balancedEquationCardsVariationEnvelope } from "./balanced-equation-cards.js";
import { balanceScaleSumVariationEnvelope } from "./balance-scale-sum.js";
import { equivalentFractionVariationEnvelope } from "./equivalent-fraction.js";
import { fractionComparisonVariationEnvelope } from "./fraction-comparison.js";
import { makeTenNumberCardsVariationEnvelope } from "./make-ten-number-cards.js";
import { clockHourHandBoundaryVariationEnvelope } from "./clock-hour-hand-boundary.js";
import { elapsedTimeClockPairVariationEnvelope } from "./elapsed-time-clock-pair.js";
import { sameDenominatorFractionSumVariationEnvelope } from "./same-denominator-fraction-sum.js";
import { sameDenominatorImproperSumVariationEnvelope } from "./same-denominator-improper-sum.js";
import { unlikeDenominatorCommonUnitSumVariationEnvelope } from "./unlike-denominator-common-unit-sum.js";
import { unlikeDenominatorCommonUnitDifferenceVariationEnvelope } from "./unlike-denominator-common-unit-difference.js";
import { barGraphScaleUnitVariationEnvelope } from "./bar-graph-scale-unit.js";
import { brokenRulerLengthVariationEnvelope } from "./broken-ruler-length.js";
import { placeValueTenExchangeVariationEnvelope } from "./place-value-ten-exchange.js";
import { repeatingPatternUnitVariationEnvelope } from "./repeating-pattern-unit.js";
import { multiplicationArrayMeaningVariationEnvelope } from "./multiplication-array-meaning.js";
import { probabilityBagComparisonVariationEnvelope } from "./probability-bag-comparison.js";
import { claimEvidenceVariationEnvelopes } from "./claim-evidence.js";
import { factorPairArrayVariationEnvelope } from "./factor-pair-array.js";

export const REGISTERED_VARIATION_ENVELOPES = [
  fractionComparisonVariationEnvelope,
  equivalentFractionVariationEnvelope,
  makeTenNumberCardsVariationEnvelope,
  balancedEquationCardsVariationEnvelope,
  balanceScaleSumVariationEnvelope,
  clockHourHandBoundaryVariationEnvelope,
  elapsedTimeClockPairVariationEnvelope,
  sameDenominatorFractionSumVariationEnvelope,
  sameDenominatorImproperSumVariationEnvelope,
  unlikeDenominatorCommonUnitSumVariationEnvelope,
  unlikeDenominatorCommonUnitDifferenceVariationEnvelope,
  barGraphScaleUnitVariationEnvelope,
  brokenRulerLengthVariationEnvelope,
  placeValueTenExchangeVariationEnvelope,
  repeatingPatternUnitVariationEnvelope,
  multiplicationArrayMeaningVariationEnvelope,
  probabilityBagComparisonVariationEnvelope,
  factorPairArrayVariationEnvelope,
  ...claimEvidenceVariationEnvelopes
] as const;

export const REGISTERED_VARIATION_COMBINATION_COUNT =
  assertVariationSuiteLimit(REGISTERED_VARIATION_ENVELOPES);

if (REGISTERED_VARIATION_COMBINATION_COUNT !== 98) {
  throw new Error(
    `registered-variation-suite-drift:${REGISTERED_VARIATION_COMBINATION_COUNT}`
  );
}

const byBlueprintId = new Map<
  string,
  VariationEnvelopeDeclaration
>(
  REGISTERED_VARIATION_ENVELOPES.map((declaration) => [
    declaration.blueprintId,
    declaration
  ])
);

export function getVariationEnvelope(
  blueprintId: string
): VariationEnvelopeDeclaration {
  const declaration = byBlueprintId.get(blueprintId);
  if (!declaration) {
    throw new Error(
      `variation-envelope-unregistered:${blueprintId}`
    );
  }
  return declaration;
}

export function resolveRegisteredVariation(
  blueprintId: string,
  input: unknown
): ResolvedVariation {
  return resolveDeclaredVariation(
    getVariationEnvelope(blueprintId),
    input
  );
}

export function enumerateRegisteredVariationEnvelope(
  blueprintId: string
): ResolvedVariation[] {
  return enumerateVariationEnvelope(
    getVariationEnvelope(blueprintId)
  );
}
