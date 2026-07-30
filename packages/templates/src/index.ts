export {
  FRACTION_TEMPLATE_VERSION,
  buildRegisteredTeacherAnswerKey,
  equivalentFractionTemplateDefinition,
  fractionComparisonTemplateDefinition,
  generateEquivalentFractionActivity,
  generateFractionComparisonActivity,
  generateMakeTenNumberCardsActivity,
  getRegisteredBlueprintContentHash,
  getRegisteredActivitySupportState,
  makeTenNumberCardsTemplateDefinition,
  listRegisteredBlueprints,
  prepareRegisteredActivity,
  projectRegisteredApprovalView,
  type GenerateActivitySpecOptions,
  type RegisteredTeacherAnswer,
  type RegisteredActivityPlan
} from "./registry.js";
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
