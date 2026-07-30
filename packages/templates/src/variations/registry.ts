import {
  assertVariationSuiteLimit,
  enumerateVariationEnvelope,
  resolveDeclaredVariation,
  type ResolvedVariation,
  type VariationEnvelopeDeclaration
} from "@mathcanvas/contracts";
import { equivalentFractionVariationEnvelope } from "./equivalent-fraction.js";
import { fractionComparisonVariationEnvelope } from "./fraction-comparison.js";
import { makeTenNumberCardsVariationEnvelope } from "./make-ten-number-cards.js";

export const REGISTERED_VARIATION_ENVELOPES = [
  fractionComparisonVariationEnvelope,
  equivalentFractionVariationEnvelope,
  makeTenNumberCardsVariationEnvelope
] as const;

export const REGISTERED_VARIATION_COMBINATION_COUNT =
  assertVariationSuiteLimit(REGISTERED_VARIATION_ENVELOPES);

if (REGISTERED_VARIATION_COMBINATION_COUNT !== 54) {
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
