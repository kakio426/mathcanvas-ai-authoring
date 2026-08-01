import {
  ACTIVITY_IDS,
  defineVariationEnvelope
} from "@mathcanvas/contracts";

export const clockHourHandBoundaryVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: ACTIVITY_IDS.clockHourHandBoundary,
    knobs: [
      {
        key: "problemCount",
        tier: "T1",
        kind: "bounded-integer",
        min: 2,
        max: 4,
        default: 2
      }
    ],
    pinned: { difficulty: "normal" },
    expectedCombinationCount: 3
  });
