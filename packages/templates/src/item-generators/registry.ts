import type {
  ActivityBlueprint,
  DenominatorRelation,
  Difficulty,
  ResolvedItem
} from "@mathcanvas/contracts";
import { resolveRegisteredVariation } from "../variations/registry.js";
import {
  BALANCE_SCALE_SUM_GENERATOR_ID,
  BALANCE_SCALE_SUM_GENERATOR_VERSION,
  generateBalanceScaleSumItems
} from "./balance-scale-sum.js";
import {
  BALANCED_EQUATION_GENERATOR_ID,
  BALANCED_EQUATION_GENERATOR_VERSION,
  generateBalancedEquationItems
} from "./balanced-equation.js";
import {
  EQUIVALENT_FRACTION_GENERATOR_ID,
  EQUIVALENT_FRACTION_GENERATOR_VERSION,
  generateEquivalentFractionItems
} from "./equivalent-fraction.js";
import {
  FRACTION_PAIR_GENERATOR_ID,
  FRACTION_PAIR_GENERATOR_VERSION,
  generateFractionPairItems
} from "./fraction-pair.js";
import {
  NUMBER_BOND_TEN_GENERATOR_ID,
  NUMBER_BOND_TEN_GENERATOR_VERSION,
  generateNumberBondTenItems
} from "./number-bond-ten.js";
import {
  CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_ID,
  CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_VERSION,
  generateClockHourHandBoundaryItems
} from "./clock-hour-hand-boundary.js";
import {
  ELAPSED_TIME_CLOCK_PAIR_GENERATOR_ID,
  ELAPSED_TIME_CLOCK_PAIR_GENERATOR_VERSION,
  generateElapsedTimeClockPairItems
} from "./elapsed-time-clock-pair.js";
import {
  SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_ID,
  SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_VERSION,
  generateSameDenominatorFractionSumItems
} from "./same-denominator-fraction-sum.js";
import {
  SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_ID,
  SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_VERSION,
  generateSameDenominatorImproperSumItems
} from "./same-denominator-improper-sum.js";
import {
  UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_ID,
  UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_VERSION,
  generateUnlikeDenominatorCommonUnitSumItems
} from "./unlike-denominator-common-unit-sum.js";
import {
  UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_ID,
  UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_VERSION,
  generateUnlikeDenominatorCommonUnitDifferenceItems
} from "./unlike-denominator-common-unit-difference.js";
import {
  BAR_GRAPH_SCALE_UNIT_GENERATOR_ID,
  BAR_GRAPH_SCALE_UNIT_GENERATOR_VERSION,
  generateBarGraphScaleUnitItems
} from "./bar-graph-scale-unit.js";
import {
  BROKEN_RULER_LENGTH_GENERATOR_ID,
  BROKEN_RULER_LENGTH_GENERATOR_VERSION,
  generateBrokenRulerLengthItems
} from "./broken-ruler-length.js";
import {
  PLACE_VALUE_TEN_EXCHANGE_GENERATOR_ID,
  PLACE_VALUE_TEN_EXCHANGE_GENERATOR_VERSION,
  generatePlaceValueTenExchangeItems
} from "./place-value-ten-exchange.js";
import {
  REPEATING_PATTERN_UNIT_GENERATOR_ID,
  REPEATING_PATTERN_UNIT_GENERATOR_VERSION,
  generateRepeatingPatternUnitItems
} from "./repeating-pattern-unit.js";
import {
  MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID,
  MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION,
  generateMultiplicationArrayMeaningItems
} from "./multiplication-array-meaning.js";
import {
  PROBABILITY_BAG_PAIR_GENERATOR_ID,
  PROBABILITY_BAG_PAIR_GENERATOR_VERSION,
  generateProbabilityBagPairItems
} from "./probability-bag-pair.js";
import {
  CLAIM_EVIDENCE_GENERATOR_ID,
  CLAIM_EVIDENCE_GENERATOR_VERSION,
  generateClaimEvidenceItems
} from "./claim-evidence.js";
import {
  FACTOR_PAIR_ARRAY_GENERATOR_ID,
  FACTOR_PAIR_ARRAY_GENERATOR_VERSION,
  generateFactorPairArrayItems
} from "./factor-pair-array.js";

type Generator = (
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly denominatorRelation?: DenominatorRelation;
    readonly profileId?: string;
  },
  seed: string
) => ResolvedItem[];

const generators: Readonly<Record<string, Generator>> = {
  [`${FACTOR_PAIR_ARRAY_GENERATOR_ID}:${FACTOR_PAIR_ARRAY_GENERATOR_VERSION}`]:
    generateFactorPairArrayItems,
  [`${CLAIM_EVIDENCE_GENERATOR_ID}:${CLAIM_EVIDENCE_GENERATOR_VERSION}`]:
    generateClaimEvidenceItems,
  [`${REPEATING_PATTERN_UNIT_GENERATOR_ID}:${REPEATING_PATTERN_UNIT_GENERATOR_VERSION}`]:
    generateRepeatingPatternUnitItems,
  [`${MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID}:${MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION}`]:
    generateMultiplicationArrayMeaningItems,
  [`${PROBABILITY_BAG_PAIR_GENERATOR_ID}:${PROBABILITY_BAG_PAIR_GENERATOR_VERSION}`]:
    generateProbabilityBagPairItems,
  [`${PLACE_VALUE_TEN_EXCHANGE_GENERATOR_ID}:${PLACE_VALUE_TEN_EXCHANGE_GENERATOR_VERSION}`]:
    generatePlaceValueTenExchangeItems,
  [`${BROKEN_RULER_LENGTH_GENERATOR_ID}:${BROKEN_RULER_LENGTH_GENERATOR_VERSION}`]:
    generateBrokenRulerLengthItems,
  [`${BAR_GRAPH_SCALE_UNIT_GENERATOR_ID}:${BAR_GRAPH_SCALE_UNIT_GENERATOR_VERSION}`]:
    generateBarGraphScaleUnitItems,
  [`${UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_ID}:${UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_VERSION}`]:
    generateUnlikeDenominatorCommonUnitDifferenceItems,
  [`${UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_ID}:${UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_VERSION}`]:
    generateUnlikeDenominatorCommonUnitSumItems,
  [`${SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_ID}:${SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_VERSION}`]:
    generateSameDenominatorImproperSumItems,
  [`${SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_ID}:${SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_VERSION}`]:
    generateSameDenominatorFractionSumItems,
  [`${ELAPSED_TIME_CLOCK_PAIR_GENERATOR_ID}:${ELAPSED_TIME_CLOCK_PAIR_GENERATOR_VERSION}`]:
    generateElapsedTimeClockPairItems,
  [`${CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_ID}:${CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_VERSION}`]:
    generateClockHourHandBoundaryItems,
  [`${BALANCE_SCALE_SUM_GENERATOR_ID}:${BALANCE_SCALE_SUM_GENERATOR_VERSION}`]:
    generateBalanceScaleSumItems,
  [`${BALANCED_EQUATION_GENERATOR_ID}:${BALANCED_EQUATION_GENERATOR_VERSION}`]:
    generateBalancedEquationItems,
  [`${FRACTION_PAIR_GENERATOR_ID}:${FRACTION_PAIR_GENERATOR_VERSION}`]:
    generateFractionPairItems,
  [`${EQUIVALENT_FRACTION_GENERATOR_ID}:${EQUIVALENT_FRACTION_GENERATOR_VERSION}`]:
    generateEquivalentFractionItems,
  [`${NUMBER_BOND_TEN_GENERATOR_ID}:${NUMBER_BOND_TEN_GENERATOR_VERSION}`]:
    generateNumberBondTenItems
};

export function generateBlueprintItems(
  blueprint: ActivityBlueprint,
  seed: string,
  variation: Readonly<Record<string, unknown>>
): ResolvedItem[] {
  const generator =
    generators[
      `${blueprint.generator.id}:${blueprint.generator.version}`
    ];
  if (!generator) {
    throw new Error(
      `unknown-item-generator:${blueprint.generator.id}:${blueprint.generator.version}`
    );
  }
  const resolved = resolveRegisteredVariation(
    blueprint.id,
    variation
  );
  return generator(
    {
      ...blueprint.generator.parameters,
      problemCount: resolved.problemCount as number,
      difficulty: resolved.difficulty as Difficulty,
      ...(resolved.denominatorRelation
        ? {
            denominatorRelation:
              resolved.denominatorRelation as DenominatorRelation
          }
        : {})
    },
    seed
  );
}
