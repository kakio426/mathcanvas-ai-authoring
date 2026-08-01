import { createSeededRandom, type Difficulty, type ResolvedItem } from "@mathcanvas/contracts";
import { shuffled } from "./common-unit-pool.js";

export const MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID = "number.multiplication.array-meaning-choice" as const;
export const MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION = "1.1.0" as const;

const configurations = [
  { each: 4, groups: 6, thing: "구슬", container: "봉지" },
  { each: 3, groups: 8, thing: "도토리", container: "바구니" },
  { each: 6, groups: 4, thing: "단추", container: "상자" }
] as const;

function subjectParticle(word: string): "이" | "가" {
  const last = word.codePointAt(word.length - 1);
  if (last === undefined || last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

export function generateMultiplicationArrayMeaningItems(
  parameters: { readonly difficulty: Difficulty; readonly problemCount: number },
  seed: string
): ResolvedItem[] {
  if (parameters.difficulty !== "normal" || parameters.problemCount < 2 || parameters.problemCount > 3) {
    throw new RangeError("곱셈 배열 활동은 기본 난이도에서 2~3문항을 지원합니다.");
  }
  const random = createSeededRandom(`${seed}:multiplication-array-meaning`);
  return shuffled([...configurations], random).slice(0, parameters.problemCount).map((item, index) => {
    const correct = `${item.each}\\times${item.groups}`;
    const candidates = shuffled([
      correct,
      `${item.groups}\\times${item.each}`,
      `${item.each}+${item.groups}`,
      `${item.each}\\times${item.groups - 1}`,
      `${item.groups}\\times${item.groups}`
    ], random);
    return {
      id: `multiplication-array-meaning-${index + 1}`,
      order: index + 1,
      kind: "multiplication-array-meaning-choice",
      values: {
        orderLabel: `${index + 1}번`,
        questionText: `한 ${item.container}에 ${item.thing}${subjectParticle(item.thing)} ${item.each}개씩 있습니다. ${item.groups}${item.container}를 나타낸 식은 무엇인가요?`,
        groupLabelText: `${item.each}개씩 ${item.groups}묶음`,
        arrayText: Array.from({ length: item.groups }, () => `(${"●".repeat(item.each)})`).join("  "),
        correctValueText: correct,
        each: item.each,
        groups: item.groups,
        total: item.each * item.groups,
        ...Object.fromEntries(candidates.flatMap((value, i) => [[`candidate${i + 1}`, value], [`candidate${i + 1}Latex`, value]])),
        difficulty: parameters.difficulty
      },
      provenance: { generatorId: MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID, generatorVersion: MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION, seed }
    };
  });
}
