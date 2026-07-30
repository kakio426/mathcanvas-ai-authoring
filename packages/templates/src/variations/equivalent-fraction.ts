import {
  ACTIVITY_IDS,
  defineVariationEnvelope
} from "@mathcanvas/contracts";

export const equivalentFractionVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: ACTIVITY_IDS.equivalentFraction,
    knobs: [
      {
        key: "problemCount",
        tier: "T1",
        kind: "bounded-integer",
        min: 2,
        max: 6,
        default: 4
      }
    ],
    pinned: { difficulty: "normal" },
    expectedCombinationCount: 5
  });
