import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import { shuffled } from "./common-unit-pool.js";

export const BROKEN_RULER_LENGTH_GENERATOR_ID =
  "measure.length.unit-iteration-choice" as const;
export const BROKEN_RULER_LENGTH_GENERATOR_VERSION =
  "1.2.0" as const;

type Configuration = {
  readonly totalUnits: 8 | 12;
  readonly startMark: number;
  readonly lengthCm: number;
};

export function brokenRulerCandidateValues(
  totalUnits: number,
  startMark: number,
  lengthCm: number
): readonly [number, number, number, number, number] {
  void startMark;
  const orderedIdeas = [
    lengthCm,
    lengthCm + 1,
    lengthCm - 1,
    totalUnits,
    totalUnits - lengthCm
  ];
  const unique = [...new Set(orderedIdeas)].filter(
    (value) =>
      Number.isInteger(value) && value >= 1 && value <= totalUnits
  );
  if (unique.length < 5) {
    throw new Error("broken-ruler-candidate-capacity-exhausted");
  }
  return unique.slice(0, 5) as [number, number, number, number, number];
}

const configurations: readonly Configuration[] = ([8, 12] as const)
  .flatMap((totalUnits) =>
    Array.from({ length: totalUnits - 2 }, (_, index) => index + 1)
      .flatMap((startMark) =>
        Array.from(
          { length: totalUnits - startMark - 1 },
          (_, index) => index + 2
        ).map((lengthCm) => ({
          totalUnits,
          startMark,
          lengthCm
        }))
      )
  )
  .filter((configuration) => {
    try {
      brokenRulerCandidateValues(
        configuration.totalUnits,
        configuration.startMark,
        configuration.lengthCm
      );
      return true;
    } catch {
      return false;
    }
  });

export const BROKEN_RULER_LENGTH_CONFIGURATION_CAPACITY =
  configurations.length;

export function generateBrokenRulerLengthItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    !Number.isInteger(parameters.problemCount) ||
    parameters.problemCount < 2 ||
    parameters.problemCount > 3
  ) {
    throw new RangeError(
      "자로 길이 재기 활동은 기본 난이도에서 2~3문항을 지원합니다."
    );
  }

  const random = createSeededRandom(`${seed}:broken-ruler-length`);
  const selected: Configuration[] = [];
  const seenTotalUnits = new Set<number>();
  const seenStartMarks = new Set<number>();
  for (const configuration of shuffled([...configurations], random)) {
    if (
      seenStartMarks.has(configuration.startMark) ||
      selected.length < 2 &&
      seenTotalUnits.has(configuration.totalUnits)
    ) {
      continue;
    }
    selected.push(configuration);
    seenTotalUnits.add(configuration.totalUnits);
    seenStartMarks.add(configuration.startMark);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new Error("broken-ruler-length-capacity-exhausted");
  }

  return selected.map((configuration, index) => {
    const startMark = configuration.startMark;
    const endMark = startMark + configuration.lengthCm;
    const candidates = shuffled(
      brokenRulerCandidateValues(
        configuration.totalUnits,
        startMark,
        configuration.lengthCm
      ),
      random
    );
    const order = index + 1;
    return {
      id: `broken-ruler-length-${order}`,
      order,
      kind: "broken-ruler-length-choice",
      values: {
        totalUnits: configuration.totalUnits,
        startMark,
        lengthCm: configuration.lengthCm,
        endMark,
        pencilSpan: {
          from: startMark,
          to: endMark,
          of: configuration.totalUnits
        },
        unitStick: {
          numerator: 1,
          denominator: configuration.totalUnits
        },
        unitRuler: {
          numerator: configuration.totalUnits,
          denominator: configuration.totalUnits
        },
        correctLengthText: String(configuration.lengthCm),
        candidate1: String(candidates[0]),
        candidate2: String(candidates[1]),
        candidate3: String(candidates[2]),
        candidate4: String(candidates[3]),
        candidate5: String(candidates[4]),
        candidate1Latex: String(candidates[0]),
        candidate2Latex: String(candidates[1]),
        candidate3Latex: String(candidates[2]),
        candidate4Latex: String(candidates[3]),
        candidate5Latex: String(candidates[4]),
        orderLabel: `${order}번`,
        measuredBarLabel: "연필",
        unitStickLabel: "1 cm 막대",
        questionText:
          "연필의 왼쪽 끝이 자의 시작점과 맞지 않습니다. 연필의 길이는 몇 cm입니까?",
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: BROKEN_RULER_LENGTH_GENERATOR_ID,
        generatorVersion: BROKEN_RULER_LENGTH_GENERATOR_VERSION,
        seed
      }
    };
  });
}
