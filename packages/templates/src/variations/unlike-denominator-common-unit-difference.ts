import {
  ACTIVITY_IDS,
  defineVariationEnvelope
} from "@mathcanvas/contracts";

export const unlikeDenominatorCommonUnitDifferenceVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId:
      ACTIVITY_IDS.unlikeDenominatorCommonUnitDifference,
    knobs: [
      {
        key: "problemCount",
        tier: "T1",
        kind: "bounded-integer",
        min: 2,
        max: 3,
        default: 2
      }
    ],
    pinned: { difficulty: "normal" },
    expectedCombinationCount: 2
  });
