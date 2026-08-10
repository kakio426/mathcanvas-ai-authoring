import {
  createSeededRandom,
  type Difficulty,
  type MultiplicationArrayContextObjectId,
  type ResolvedItem,
  type TeacherIntent
} from "@mathcanvas/contracts";
import { shuffled } from "./common-unit-pool.js";

export const MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID = "number.multiplication.array-meaning-choice" as const;
export const MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION = "1.2.0" as const;

interface MultiplicationConfiguration {
  readonly each: number;
  readonly groups: number;
  readonly thing: string;
  readonly container: string;
  readonly contextObjectId?: MultiplicationArrayContextObjectId;
  readonly misconceptionId?: "groups-size-order";
}

const configurations: readonly MultiplicationConfiguration[] = [
  { each: 3, groups: 4, thing: "연필", container: "봉지" },
  { each: 6, groups: 7, thing: "바둑돌", container: "줄" },
  { each: 5, groups: 6, thing: "붙임 딱지", container: "줄" }
] as const;

const contextCopy: Readonly<
  Record<
    MultiplicationArrayContextObjectId,
    { readonly thing: string; readonly container: string }
  >
> = {
  "ice-cream": { thing: "아이스크림", container: "묶음" },
  pencil: { thing: "연필", container: "봉지" },
  "baduk-stone": { thing: "바둑돌", container: "줄" },
  sticker: { thing: "붙임 딱지", container: "줄" }
};

function subjectParticle(word: string): "이" | "가" {
  const last = word.codePointAt(word.length - 1);
  if (last === undefined || last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

function objectParticle(word: string): "을" | "를" {
  const last = word.codePointAt(word.length - 1);
  if (last === undefined || last < 0xac00 || last > 0xd7a3) return "을";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}

export function generateMultiplicationArrayMeaningItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly teacherIntent?: TeacherIntent;
  },
  seed: string
): ResolvedItem[] {
  if (parameters.difficulty !== "normal" || parameters.problemCount < 2 || parameters.problemCount > 3) {
    throw new RangeError("곱셈 배열 활동은 기본 난이도에서 2~3문항을 지원합니다.");
  }
  const random = createSeededRandom(`${seed}:multiplication-array-meaning`);
  const selectedConfigurations = [...configurations];
  if (
    parameters.teacherIntent &&
    parameters.teacherIntent.kind !== "multiplication-array-v1"
  ) {
    throw new Error(
      `multiplication-teacher-intent-kind-mismatch:${parameters.teacherIntent.kind}`
    );
  }
  if (parameters.teacherIntent) {
    const context = contextCopy[parameters.teacherIntent.contextObjectId];
    selectedConfigurations[0] = {
      each: parameters.teacherIntent.itemsPerGroup,
      groups: parameters.teacherIntent.groupCount,
      thing: context.thing,
      container: context.container,
      contextObjectId: parameters.teacherIntent.contextObjectId,
      misconceptionId: parameters.teacherIntent.misconceptionId
    };
  }
  // Keep the worksheet's authored problem order stable. Randomness is reserved for
  // answer-card placement so the generated activity remains an exact lesson match.
  return selectedConfigurations.slice(0, parameters.problemCount).map((item, index) => {
    const groupNoun = `${item.groups}${item.container}`;
    const groupedDots = Array.from(
      { length: item.groups },
      () => `(${"●".repeat(item.each)})`
    );
    const arrayText = groupedDots.length > 5
      ? [
          groupedDots.slice(0, Math.ceil(groupedDots.length / 2)).join("  "),
          groupedDots.slice(Math.ceil(groupedDots.length / 2)).join("  ")
        ].join("\n")
      : groupedDots.join("  ");
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
        questionText: `한 ${item.container}에 ${item.thing}${subjectParticle(item.thing)} ${item.each}개씩 있습니다. ${groupNoun}${objectParticle(groupNoun)} 나타낸 식은 무엇인가요?`,
        groupLabelText: `${item.each}개씩 ${item.groups}묶음`,
        arrayText,
        correctValueText: correct,
        each: item.each,
        groups: item.groups,
        total: item.each * item.groups,
        ...(item.contextObjectId === undefined
          ? {}
          : { contextObjectId: item.contextObjectId }),
        ...(item.misconceptionId === undefined
          ? {}
          : { misconceptionId: item.misconceptionId }),
        ...Object.fromEntries(candidates.flatMap((value, i) => [[`candidate${i + 1}`, value], [`candidate${i + 1}Latex`, value]])),
        difficulty: parameters.difficulty
      },
      provenance: { generatorId: MULTIPLICATION_ARRAY_MEANING_GENERATOR_ID, generatorVersion: MULTIPLICATION_ARRAY_MEANING_GENERATOR_VERSION, seed }
    };
  });
}
