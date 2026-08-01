import { createSeededRandom, type Difficulty, type ResolvedItem } from "@mathcanvas/contracts";
import { shuffled } from "./common-unit-pool.js";

export const REPEATING_PATTERN_UNIT_GENERATOR_ID = "pattern.repeat-unit.choice" as const;
export const REPEATING_PATTERN_UNIT_GENERATOR_VERSION = "1.0.0" as const;

const units = [[4, 5, 2], [5, 4, 6], [2, 4, 5], [6, 5, 4]] as const;

export function generateRepeatingPatternUnitItems(
  parameters: { readonly difficulty: Difficulty; readonly problemCount: number },
  seed: string
): ResolvedItem[] {
  if (parameters.difficulty !== "normal" || parameters.problemCount < 2 || parameters.problemCount > 3) {
    throw new RangeError("반복 무늬 활동은 기본 난이도에서 2~3문항을 지원합니다.");
  }
  const random = createSeededRandom(`${seed}:repeating-pattern-unit`);
  return shuffled([...units], random).slice(0, parameters.problemCount).map((unit, index) => {
    const candidates = shuffled([1, 2, 3, 4, 5], random);
    const pieces = shuffled([unit[0], unit[1], unit[2], 1, 3], random);
    const values: Record<string, unknown> = {
      orderLabel: `${index + 1}번`,
      questionText: "되풀이되는 가장 짧은 무늬는 몇 조각인가요?",
      correctValueText: "3",
      difficulty: parameters.difficulty
    };
    [...unit, ...unit].forEach((variant, i) => { values[`sequenceVariant${i + 1}`] = variant; });
    pieces.forEach((variant, i) => { values[`completionVariant${i + 1}`] = variant; });
    candidates.forEach((value, i) => {
      values[`candidate${i + 1}`] = String(value);
      values[`candidate${i + 1}Latex`] = String(value);
    });
    return {
      id: `repeating-pattern-unit-${index + 1}`,
      order: index + 1,
      kind: "repeating-pattern-unit-choice",
      values,
      provenance: { generatorId: REPEATING_PATTERN_UNIT_GENERATOR_ID, generatorVersion: REPEATING_PATTERN_UNIT_GENERATOR_VERSION, seed }
    };
  });
}
