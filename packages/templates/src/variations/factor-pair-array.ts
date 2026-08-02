import { defineVariationEnvelope } from "@mathcanvas/contracts";
import { factorPairActivityProfile } from "@mathcanvas/curriculum";

export const factorPairArrayVariationEnvelope =
  defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: factorPairActivityProfile.activityId,
    knobs: [],
    pinned: { problemCount: 2, difficulty: "normal" },
    expectedCombinationCount: 1
  });
