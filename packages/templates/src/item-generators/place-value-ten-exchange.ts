import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import { shuffled } from "./common-unit-pool.js";

export const PLACE_VALUE_TEN_EXCHANGE_GENERATOR_ID =
  "number.place-value.ten-exchange-choice" as const;
export const PLACE_VALUE_TEN_EXCHANGE_GENERATOR_VERSION =
  "1.1.0" as const;

type Configuration = {
  readonly hundreds: number;
  readonly tens: number;
  readonly ones: number;
};

export function placeValueExchangeIdeas(
  hundreds: number,
  tens: number,
  ones: number
): readonly [number, number, number, number, number] {
  const correct = (hundreds + 1) * 100 + tens * 10 + ones;
  const concatenateCounts = Number(`${hundreds}${tens + 10}${ones}`);
  const omitExchangeTen = hundreds * 100 + tens * 10 + ones;
  const tenTensAsTenOnes =
    hundreds * 100 + tens * 10 + 10 + ones;
  const reverseHundredsAndOnes =
    ones * 100 + (hundreds + 1) * 10 + tens;
  const ideas = [
    correct,
    concatenateCounts,
    omitExchangeTen,
    tenTensAsTenOnes,
    reverseHundredsAndOnes
  ];
  if (new Set(ideas).size !== ideas.length) {
    throw new Error("place-value-exchange-idea-collision");
  }
  return ideas as [number, number, number, number, number];
}

const configurations: readonly Configuration[] = Array.from(
  { length: 4 },
  (_, index) => index + 1
).flatMap((hundreds) =>
  Array.from({ length: 5 }, (_, index) => index).flatMap((tens) =>
    Array.from({ length: 8 }, (_, index) => index + 1)
      .map((ones) => ({ hundreds, tens, ones }))
      .filter((configuration) => {
        try {
          placeValueExchangeIdeas(
            configuration.hundreds,
            configuration.tens,
            configuration.ones
          );
          return true;
        } catch {
          return false;
        }
      })
  )
);

export const PLACE_VALUE_TEN_EXCHANGE_CONFIGURATION_CAPACITY =
  configurations.length;

export function generatePlaceValueTenExchangeItems(
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
      "자릿값 바꾸기 활동은 기본 난이도에서 2~3문항을 지원합니다."
    );
  }

  const random = createSeededRandom(`${seed}:place-value-ten-exchange`);
  const selected: Configuration[] = [];
  const seenHundreds = new Set<number>();
  const seenTens = new Set<number>();
  for (const configuration of shuffled([...configurations], random)) {
    if (
      seenHundreds.has(configuration.hundreds) ||
      seenTens.has(configuration.tens)
    ) {
      continue;
    }
    selected.push(configuration);
    seenHundreds.add(configuration.hundreds);
    seenTens.add(configuration.tens);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new Error("place-value-ten-exchange-capacity-exhausted");
  }

  return selected.map((configuration, index) => {
    const order = index + 1;
    const [
      correct,
      concatenateCounts,
      omitExchangeTen,
      tenTensAsTenOnes,
      reverseHundredsAndOnes
    ] = placeValueExchangeIdeas(
      configuration.hundreds,
      configuration.tens,
      configuration.ones
    );
    const initialValue =
      configuration.hundreds * 100 +
      configuration.tens * 10 +
      configuration.ones;
    const candidates = shuffled(
      [
        correct,
        concatenateCounts,
        omitExchangeTen,
        tenTensAsTenOnes,
        reverseHundredsAndOnes
      ],
      random
    );
    return {
      id: `place-value-ten-exchange-${order}`,
      order,
      kind: "place-value-ten-exchange-choice",
      values: {
        hundreds: configuration.hundreds,
        tens: configuration.tens,
        ones: configuration.ones,
        exchangeTens: 10,
        initialValue,
        initialValueText: String(initialValue),
        initialValueLatex: String(initialValue),
        initialDecompositionText:
          `${configuration.hundreds}백 + ` +
          `${configuration.tens}십 + ${configuration.ones}일`,
        regroupedHundreds: configuration.hundreds + 1,
        correctValue: correct,
        correctValueText: String(correct),
        concatenateCountsText: String(concatenateCounts),
        omitExchangeTenText: String(omitExchangeTen),
        tenTensAsTenOnesText: String(tenTensAsTenOnes),
        reverseHundredsAndOnesText: String(reverseHundredsAndOnes),
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
        questionText:
          `처음 수 ${initialValue}에 십 모형 10개를 더하면 몇인가요?`,
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: PLACE_VALUE_TEN_EXCHANGE_GENERATOR_ID,
        generatorVersion: PLACE_VALUE_TEN_EXCHANGE_GENERATOR_VERSION,
        seed
      }
    };
  });
}
