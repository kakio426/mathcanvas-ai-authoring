import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const EQUIVALENT_FRACTION_GENERATOR_ID =
  "fraction-pair.equivalent" as const;
export const EQUIVALENT_FRACTION_GENERATOR_VERSION = "2.0.0" as const;

type Pair = readonly [number, number, number, number];
type FractionValue = {
  readonly numerator: number;
  readonly denominator: number;
};

function direction(pair: Pair): "expand" | "reduce" {
  return pair[3] > pair[1] ? "expand" : "reduce";
}

function factor(pair: Pair): number {
  return Math.max(pair[1], pair[3]) / Math.min(pair[1], pair[3]);
}

function pairValueKey(pair: Pair): string {
  return reducedKey({
    numerator: pair[0],
    denominator: pair[1]
  });
}

function fractionKey(value: FractionValue): string {
  return `${value.numerator}/${value.denominator}`;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function reducedKey(value: FractionValue): string {
  const divisor = gcd(value.numerator, value.denominator);
  return `${value.numerator / divisor}/${value.denominator / divisor}`;
}

function equivalentPairs(): Pair[] {
  const pairs: Pair[] = [];
  for (let denominator = 2; denominator <= 6; denominator += 1) {
    for (
      let numerator = 1;
      numerator < denominator;
      numerator += 1
    ) {
      if (gcd(numerator, denominator) !== 1) continue;
      for (const scaleFactor of [2, 3]) {
        if (denominator * scaleFactor > 12) continue;
        const expanded = {
          numerator: numerator * scaleFactor,
          denominator: denominator * scaleFactor
        };
        pairs.push([
          numerator,
          denominator,
          expanded.numerator,
          expanded.denominator
        ]);
        pairs.push([
          expanded.numerator,
          expanded.denominator,
          numerator,
          denominator
        ]);
      }
    }
  }
  if (
    pairs.length < 8 ||
    !pairs.some((pair) => factor(pair) === 3) ||
    !pairs.some((pair) => direction(pair) === "expand") ||
    !pairs.some((pair) => direction(pair) === "reduce")
  ) {
    throw new Error("equivalent-fraction-pair-capacity");
  }
  return pairs;
}

function distractors(
  reference: FractionValue,
  correct: FractionValue,
  scaleFactor: number
): FractionValue[] {
  const additiveDelta = reference.denominator === 12 ? -1 : 1;
  const additive = {
    numerator: reference.numerator + additiveDelta,
    denominator: reference.denominator + additiveDelta
  };
  const oneSide = [
    {
      numerator: reference.numerator,
      denominator: correct.denominator
    },
    {
      numerator: correct.numerator,
      denominator: reference.denominator
    }
  ].find(
    (candidate) =>
      candidate.numerator > 0 &&
      candidate.numerator < candidate.denominator &&
      reducedKey(candidate) !== reducedKey(correct)
  );
  if (!oneSide) {
    throw new Error("equivalent-fraction-one-side-distractor");
  }
  const proposed: FractionValue[] = [
    additive,
    oneSide,
    {
      numerator: correct.numerator + 1,
      denominator: correct.denominator
    },
    {
      numerator: correct.numerator - 1,
      denominator: correct.denominator
    },
    {
      numerator: reference.numerator + 1,
      denominator: reference.denominator
    },
    {
      numerator: reference.numerator - 1,
      denominator: reference.denominator
    },
    {
      numerator: reference.numerator,
      denominator: Math.min(
        12,
        reference.denominator * scaleFactor
      )
    }
  ];
  for (let denominator = 2; denominator <= 12; denominator += 1) {
    for (let numerator = 1; numerator < denominator; numerator += 1) {
      proposed.push({ numerator, denominator });
    }
  }
  const seenExact = new Set<string>();
  const seenValues = new Set<string>([reducedKey(correct)]);
  const result: FractionValue[] = [];
  for (const candidate of proposed) {
    if (
      !Number.isInteger(candidate.numerator) ||
      !Number.isInteger(candidate.denominator) ||
      candidate.numerator < 1 ||
      candidate.numerator >= candidate.denominator ||
      candidate.denominator > 12 ||
      seenExact.has(fractionKey(candidate)) ||
      seenValues.has(reducedKey(candidate))
    ) {
      continue;
    }
    seenExact.add(fractionKey(candidate));
    seenValues.add(reducedKey(candidate));
    result.push(candidate);
    if (result.length === 5) return result;
  }
  throw new Error("equivalent-fraction-distractor-capacity");
}

export function generateEquivalentFractionItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  const random = createSeededRandom(
    `${seed}:equivalent:${parameters.difficulty}`
  );
  const selected = equivalentPairs();
  for (let index = selected.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [selected[index], selected[swapWith]] = [
      selected[swapWith]!,
      selected[index]!
    ];
  }
  const factorThree = selected.find((pair) => factor(pair) === 3);
  const reduced = selected.find(
    (pair) =>
      direction(pair) === "reduce" &&
      pairValueKey(pair) !== pairValueKey(factorThree!)
  );
  const expanded = selected.find(
    (pair) =>
      direction(pair) === "expand" &&
      pairValueKey(pair) !== pairValueKey(factorThree!) &&
      pairValueKey(pair) !== pairValueKey(reduced!)
  );
  const preferred =
    parameters.problemCount >= 3
      ? [factorThree!, reduced!, expanded!, ...selected]
      : selected;
  const chosen: Pair[] = [];
  const chosenValues = new Set<string>();
  for (const pair of preferred) {
    const key = pairValueKey(pair);
    if (chosenValues.has(key)) continue;
    chosenValues.add(key);
    chosen.push(pair);
    if (chosen.length === parameters.problemCount) break;
  }
  if (chosen.length !== parameters.problemCount) {
    throw new Error("equivalent-fraction-unique-value-capacity");
  }
  for (let index = chosen.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [chosen[index], chosen[swapWith]] = [
      chosen[swapWith]!,
      chosen[index]!
    ];
  }
  return chosen
    .map((pair, index) => {
      const [a, b, c, d] = pair;
      const order = index + 1;
      const reference = { numerator: a, denominator: b };
      const correctCandidate = { numerator: c, denominator: d };
      const candidates = [
        correctCandidate,
        ...distractors(reference, correctCandidate, factor(pair))
      ];
      for (
        let candidateIndex = candidates.length - 1;
        candidateIndex > 0;
        candidateIndex -= 1
      ) {
        const swapWith = Math.floor(
          random() * (candidateIndex + 1)
        );
        [candidates[candidateIndex], candidates[swapWith]] = [
          candidates[swapWith]!,
          candidates[candidateIndex]!
        ];
      }
      return {
        id: `equivalent-${order}`,
        order,
        kind: "equivalent-fraction",
        values: {
          left: reference,
          right: correctCandidate,
          reference,
          correctCandidate,
          candidate1: candidates[0]!,
          candidate2: candidates[1]!,
          candidate3: candidates[2]!,
          candidate4: candidates[3]!,
          candidate5: candidates[4]!,
          candidate6: candidates[5]!,
          difficulty: parameters.difficulty,
          orderLabel: `${order}번`,
          prompt: `\\frac{${a}}{${b}} = \\; ?`
        },
        provenance: {
          generatorId: EQUIVALENT_FRACTION_GENERATOR_ID,
          generatorVersion: EQUIVALENT_FRACTION_GENERATOR_VERSION,
          seed
        }
      };
    });
}
