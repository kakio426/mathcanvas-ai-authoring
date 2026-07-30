import type {
  ActivityBlueprint,
  DenominatorRelation,
  Difficulty,
  ResolvedItem
} from "@mathcanvas/contracts";
import { resolveRegisteredVariation } from "../variations/registry.js";
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

type Generator = (
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly denominatorRelation?: DenominatorRelation;
  },
  seed: string
) => ResolvedItem[];

const generators: Readonly<Record<string, Generator>> = {
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
