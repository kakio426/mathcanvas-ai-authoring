import type { DenominatorRelation, Difficulty, ResolvedItem } from "@mathcanvas/contracts";
import { generateFractionPairItems } from "./fraction-pair.js";

export const PROBABILITY_BAG_PAIR_GENERATOR_ID = "probability.bag-pair.unlike-ratios" as const;
export const PROBABILITY_BAG_PAIR_GENERATOR_VERSION = "1.0.0" as const;

export function generateProbabilityBagPairItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly denominatorRelation?: DenominatorRelation;
  },
  seed: string
): ResolvedItem[] {
  return generateFractionPairItems(parameters, `${seed}:probability-bags`).map((item) => {
    const left = item.values.left as { numerator: number; denominator: number };
    const right = item.values.right as { numerator: number; denominator: number };
    return {
      ...item,
      kind: "probability-bag-comparison",
      values: {
        ...item.values,
        leftRed: left.numerator,
        leftTotal: left.denominator,
        rightRed: right.numerator,
        rightTotal: right.denominator,
        questionText:
          `첫째 주머니는 전체 ${left.denominator}개 중 빨강 ${left.numerator}개, ` +
          `둘째 주머니는 전체 ${right.denominator}개 중 빨강 ${right.numerator}개입니다. ` +
          "어느 쪽에서 빨강 공이 나올 가능성이 더 큰가요?"
      },
      provenance: {
        generatorId: PROBABILITY_BAG_PAIR_GENERATOR_ID,
        generatorVersion: PROBABILITY_BAG_PAIR_GENERATOR_VERSION,
        seed
      }
    };
  });
}
