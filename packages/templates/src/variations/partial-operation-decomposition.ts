import { defineVariationEnvelope } from "@mathcanvas/contracts";
import { partialOperationActivityProfiles } from "@mathcanvas/curriculum";

export const partialOperationDecompositionVariationEnvelopes =
  partialOperationActivityProfiles.map((profile) =>
    defineVariationEnvelope({
      schemaVersion: "1.0.0",
      blueprintId: profile.activityId,
      knobs: [],
      pinned: { problemCount: 2, difficulty: "normal" },
      expectedCombinationCount: 1
    })
  );
