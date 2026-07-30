import {
  ACTIVITY_IDS,
  defineVariationEnvelope
} from "@mathcanvas/contracts";

export const fractionComparisonVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: ACTIVITY_IDS.fractionComparison,
    knobs: [
      {
        key: "problemCount",
        tier: "T1",
        kind: "bounded-integer",
        min: 2,
        max: 6,
        default: 4
      },
      {
        key: "difficulty",
        tier: "T1",
        kind: "enum",
        values: ["easy", "normal", "hard"],
        default: "normal"
      },
      {
        key: "denominatorRelation",
        tier: "T2",
        kind: "enum",
        values: ["mixed", "coprime", "multiple"],
        default: "mixed"
      }
    ],
    pinned: {},
    expectedCombinationCount: 45
  });
