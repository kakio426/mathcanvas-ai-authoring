import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import {
  partialOperationActivityProfiles
} from "@mathcanvas/curriculum";
import { shuffled } from "./common-unit-pool.js";

export const PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_ID =
  "number.partial-operation-decomposition" as const;
export const PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_VERSION =
  "1.0.0" as const;

function blankModelText(): string {
  return [
    "┌──────────────────────────────┐",
    "│                              │",
    "│                              │",
    "│                              │",
    "└──────────────────────────────┘"
  ].join("\n");
}

export function generatePartialOperationDecompositionItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly profileId?: string;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2
  ) {
    throw new RangeError(
      "부분곱·부분몫 활동은 기본 난이도 2문항을 지원합니다."
    );
  }
  const profile = partialOperationActivityProfiles.find(
    (candidate) => candidate.profileId === parameters.profileId
  );
  if (!profile) {
    throw new Error(
      `partial-operation-profile-unregistered:${parameters.profileId ?? "missing"}`
    );
  }
  const random = createSeededRandom(
    `${seed}:partial-operation:${profile.profileId}`
  );
  return shuffled([...profile.items], random).map((item, index) => {
    const cards = shuffled([...item.cards], random);
    return {
      id: `${profile.profileId}-${index + 1}`,
      order: index + 1,
      kind: "partial-operation-decomposition",
      values: {
        orderLabel: `${index + 1}번`,
        questionText: item.context,
        operationKind: profile.operationKind,
        wholeOperand: item.wholeOperand,
        fixedOperand: item.fixedOperand,
        targetResult: item.targetResult,
        targetLatex: String(item.targetResult),
        modelText: blankModelText(),
        solutionPairs: item.solutions.map((pair) => [...pair]),
        surplusValues: [...item.surplus],
        candidateSpecs: cards.map((card) => ({ ...card })),
        answerExplanation:
          profile.operationKind === "multiply"
            ? `${item.wholeOperand}×${item.fixedOperand}=${item.targetResult}이고, ${item.solutions
                .map(([left, right]) => `${left}+${right}`)
                .join(" 또는 ")}로 나눌 수 있습니다.`
            : `${item.wholeOperand}÷${item.fixedOperand}=${item.targetResult}이고, ${item.solutions
                .map(([left, right]) => `${left}+${right}`)
                .join(" 또는 ")}가 됩니다.`,
        ...Object.fromEntries(
          cards.flatMap((card, candidateIndex) => [
            [`pieceText${candidateIndex + 1}`, card.text],
            [`pieceValue${candidateIndex + 1}`, card.value]
          ])
        ),
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_ID,
        generatorVersion: PARTIAL_OPERATION_DECOMPOSITION_GENERATOR_VERSION,
        seed
      }
    };
  });
}
