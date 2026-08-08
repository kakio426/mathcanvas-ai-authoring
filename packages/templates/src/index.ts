export {
  FRACTION_TEMPLATE_VERSION,
  buildRegisteredTeacherAnswerKey,
  balancedEquationCardsTemplateDefinition,
  balanceScaleSumTemplateDefinition,
  clockHourHandBoundaryTemplateDefinition,
  elapsedTimeClockPairTemplateDefinition,
  sameDenominatorFractionSumTemplateDefinition,
  sameDenominatorImproperSumTemplateDefinition,
  unlikeDenominatorCommonUnitSumTemplateDefinition,
  unlikeDenominatorCommonUnitDifferenceTemplateDefinition,
  barGraphScaleUnitTemplateDefinition,
  brokenRulerLengthTemplateDefinition,
  placeValueTenExchangeTemplateDefinition,
  repeatingPatternUnitTemplateDefinition,
  multiplicationArrayMeaningTemplateDefinition,
  probabilityBagComparisonTemplateDefinition,
  claimEvidenceTemplateDefinitions,
  factorPairArrayTemplateDefinition,
  partialOperationDecompositionTemplateDefinitions,
  equivalentFractionTemplateDefinition,
  fractionComparisonTemplateDefinition,
  generateEquivalentFractionActivity,
  generateFractionComparisonActivity,
  generateMakeTenNumberCardsActivity,
  generateBalancedEquationCardsActivity,
  generateBalanceScaleSumActivity,
  generateClockHourHandBoundaryActivity,
  generateElapsedTimeClockPairActivity,
  generateSameDenominatorFractionSumActivity,
  generateSameDenominatorImproperSumActivity,
  generateUnlikeDenominatorCommonUnitSumActivity,
  generateUnlikeDenominatorCommonUnitDifferenceActivity,
  generateBarGraphScaleUnitActivity,
  generateBrokenRulerLengthActivity,
  generatePlaceValueTenExchangeActivity,
  generateRepeatingPatternUnitActivity,
  generateMultiplicationArrayMeaningActivity,
  generateProbabilityBagComparisonActivity,
  generateClaimEvidenceActivity,
  generateFactorPairArrayActivity,
  generatePartialOperationDecompositionActivity,
  getRegisteredBlueprintContentHash,
  getRegisteredActivitySupportState,
  makeTenNumberCardsTemplateDefinition,
  listRegisteredBlueprints,
  prepareRegisteredActivity,
  prepareRegisteredActivityForEnvelopeValidation,
  projectRegisteredApprovalView,
  type GenerateActivitySpecOptions,
  type RegisteredTeacherAnswer,
  type RegisteredActivityPlan
} from "./registry.js";
export {
  prepareWorksheetV2,
  prepareWorksheetV2ForContractLab,
  type PrepareWorksheetV2Options
} from "./worksheet-v2.js";
export {
  balancedEquationCardsBlueprint
} from "./blueprints/balanced-equation-cards.js";
export {
  balanceScaleSumBlueprint
} from "./blueprints/balance-scale-sum.js";
export {
  clockHourHandBoundaryBlueprint
} from "./blueprints/clock-hour-hand-boundary.js";
export {
  elapsedTimeClockPairBlueprint
} from "./blueprints/elapsed-time-clock-pair.js";
export {
  sameDenominatorFractionSumBlueprint
} from "./blueprints/same-denominator-fraction-sum.js";
export {
  sameDenominatorImproperSumBlueprint
} from "./blueprints/same-denominator-improper-sum.js";
export {
  unlikeDenominatorCommonUnitSumBlueprint
} from "./blueprints/unlike-denominator-common-unit-sum.js";
export {
  unlikeDenominatorCommonUnitDifferenceBlueprint
} from "./blueprints/unlike-denominator-common-unit-difference.js";
export {
  barGraphScaleUnitBlueprint
} from "./blueprints/bar-graph-scale-unit.js";
export {
  brokenRulerLengthBlueprint
} from "./blueprints/broken-ruler-length.js";
export {
  placeValueTenExchangeBlueprint
} from "./blueprints/place-value-ten-exchange.js";
export { repeatingPatternUnitBlueprint } from "./blueprints/repeating-pattern-unit.js";
export { multiplicationArrayMeaningBlueprint } from "./blueprints/multiplication-array-meaning.js";
export { probabilityBagComparisonBlueprint } from "./blueprints/probability-bag-comparison.js";
export {
  claimEvidenceBlueprints,
  findClaimEvidenceBlueprint
} from "./blueprints/claim-evidence.js";
export {
  makeDivisionQuotientRemainderBlueprint
} from "./blueprints/division-quotient-remainder.js";
export { factorPairArrayBlueprint } from "./blueprints/factor-pair-array.js";
export { barGraphRepresentFromTableBlueprint } from "./blueprints/bar-graph-represent-from-table.js";
export {
  findPartialOperationDecompositionBlueprint,
  partialOperationDecompositionBlueprints
} from "./blueprints/partial-operation-decomposition.js";
export {
  BALANCE_SCALE_SUM_GENERATOR_ID,
  BALANCE_SCALE_SUM_GENERATOR_VERSION,
  generateBalanceScaleSumItems
} from "./item-generators/balance-scale-sum.js";
export {
  CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_ID,
  CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_VERSION,
  generateClockHourHandBoundaryItems
} from "./item-generators/clock-hour-hand-boundary.js";
export {
  ELAPSED_TIME_CLOCK_PAIR_GENERATOR_ID,
  ELAPSED_TIME_CLOCK_PAIR_GENERATOR_VERSION,
  generateElapsedTimeClockPairItems
} from "./item-generators/elapsed-time-clock-pair.js";
export {
  SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_ID,
  SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_VERSION,
  generateSameDenominatorFractionSumItems
} from "./item-generators/same-denominator-fraction-sum.js";
export {
  SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_ID,
  SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_VERSION,
  generateSameDenominatorImproperSumItems
} from "./item-generators/same-denominator-improper-sum.js";
export {
  UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_ID,
  UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_VERSION,
  generateUnlikeDenominatorCommonUnitSumItems
} from "./item-generators/unlike-denominator-common-unit-sum.js";
export {
  UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_ID,
  UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_VERSION,
  generateUnlikeDenominatorCommonUnitDifferenceItems
} from "./item-generators/unlike-denominator-common-unit-difference.js";
export {
  BAR_GRAPH_SCALE_CONFIGURATION_CAPACITY,
  BAR_GRAPH_SCALE_UNIT_GENERATOR_ID,
  BAR_GRAPH_SCALE_UNIT_GENERATOR_VERSION,
  generateBarGraphScaleUnitItems
} from "./item-generators/bar-graph-scale-unit.js";
export {
  BROKEN_RULER_LENGTH_CONFIGURATION_CAPACITY,
  BROKEN_RULER_LENGTH_GENERATOR_ID,
  BROKEN_RULER_LENGTH_GENERATOR_VERSION,
  brokenRulerCandidateValues,
  generateBrokenRulerLengthItems
} from "./item-generators/broken-ruler-length.js";
export {
  PLACE_VALUE_TEN_EXCHANGE_CONFIGURATION_CAPACITY,
  PLACE_VALUE_TEN_EXCHANGE_GENERATOR_ID,
  PLACE_VALUE_TEN_EXCHANGE_GENERATOR_VERSION,
  generatePlaceValueTenExchangeItems,
  placeValueExchangeIdeas
} from "./item-generators/place-value-ten-exchange.js";
export {
  REPEATING_PATTERN_UNIT_GENERATOR_ID,
  REPEATING_PATTERN_UNIT_GENERATOR_VERSION,
  generateRepeatingPatternUnitItems
} from "./item-generators/repeating-pattern-unit.js";
export {
  MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID,
  MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION,
  generateMultiplicationArrayMeaningItems
} from "./item-generators/multiplication-array-meaning.js";
export {
  PROBABILITY_BAG_PAIR_GENERATOR_ID,
  PROBABILITY_BAG_PAIR_GENERATOR_VERSION,
  generateProbabilityBagPairItems
} from "./item-generators/probability-bag-pair.js";
export {
  CLAIM_EVIDENCE_GENERATOR_ID,
  CLAIM_EVIDENCE_DOT_GROUPING_GENERATOR_VERSION,
  CLAIM_EVIDENCE_GENERATOR_VERSION,
  CLAIM_EVIDENCE_NATIVE_GROUPING_GENERATOR_VERSION,
  CLAIM_EVIDENCE_GENERATOR_V2_VERSION,
  generateClaimEvidenceItems,
  makeUnresolvedDotField
} from "./item-generators/claim-evidence.js";
export {
  FACTOR_PAIR_ARRAY_GENERATOR_ID,
  FACTOR_PAIR_ARRAY_GENERATOR_VERSION,
  generateFactorPairArrayItems
} from "./item-generators/factor-pair-array.js";
export {
  PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_ID,
  PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_VERSION,
  generatePartialOperationDecompositionItems
} from "./item-generators/partial-operation-decomposition.js";
export {
  equivalentFractionBlueprint
} from "./blueprints/equivalent-fraction.js";
export {
  fractionComparisonBlueprint
} from "./blueprints/fraction-comparison.js";
export {
  makeTenNumberCardsBlueprint
} from "./blueprints/make-ten-number-cards.js";
export {
  projectFractionComparisonApprovalView
} from "./blueprints/fraction-comparison.approval-view.js";
export {
  BALANCED_EQUATION_GENERATOR_ID,
  BALANCED_EQUATION_GENERATOR_VERSION,
  generateBalancedEquationItems
} from "./item-generators/balanced-equation.js";
export {
  EQUIVALENT_FRACTION_GENERATOR_ID,
  EQUIVALENT_FRACTION_GENERATOR_VERSION,
  generateEquivalentFractionItems
} from "./item-generators/equivalent-fraction.js";
export {
  FRACTION_PAIR_GENERATOR_ID,
  FRACTION_PAIR_GENERATOR_VERSION,
  FRACTION_PAIR_VARIATION_CAPACITY_CELLS,
  VISUAL_DIFFERENCE_BANDS,
  assertFractionPairVariationCapacity,
  generateFractionPairItems
} from "./item-generators/fraction-pair.js";
export {
  NUMBER_BOND_TEN_GENERATOR_ID,
  NUMBER_BOND_TEN_GENERATOR_VERSION,
  generateNumberBondTenItems
} from "./item-generators/number-bond-ten.js";
export { generateBlueprintItems } from "./item-generators/registry.js";
export {
  REGISTERED_VARIATION_COMBINATION_COUNT,
  REGISTERED_VARIATION_ENVELOPES,
  enumerateRegisteredVariationEnvelope,
  getVariationEnvelope,
  resolveRegisteredVariation
} from "./variations/registry.js";
export {
  assertCognitiveManifestBound,
  getCognitiveDemandManifest,
  listCognitiveDemandManifests
} from "./cognitive/registry.js";
