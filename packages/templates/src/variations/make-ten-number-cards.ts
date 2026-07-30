import {
  ACTIVITY_IDS,
  defineVariationEnvelope
} from "@mathcanvas/contracts";

export const makeTenNumberCardsVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: ACTIVITY_IDS.makeTenNumberCards,
    knobs: [
      {
        key: "problemCount",
        tier: "T1",
        kind: "bounded-integer",
        min: 2,
        max: 5,
        default: 4
      }
    ],
    pinned: { difficulty: "normal" },
    expectedCombinationCount: 4
  });
