import { z } from "zod";
import { stableIdSchema } from "./ids.js";

/** A canvas-space rectangle. State observations use this shape. */
export const spatialBoundsSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive().finite(),
    height: z.number().positive().finite()
  })
  .strict();

export type SpatialBounds = z.infer<typeof spatialBoundsSchema>;

/** A local rectangle relative to the native placement anchor. */
export const localSpatialBoundsSchema = spatialBoundsSchema;

export const spatialContractAnchorSchema = z.enum([
  "placement-top-left",
  "placement-center"
]);

export const nativeSpatialContractSchema = z
  .object({
    contractId: stableIdSchema,
    toolKey: stableIdSchema,
    variantId: stableIdSchema,
    toolVersionFingerprint: z.string().min(1).max(240),
    minInteractiveSize: z
      .object({
        width: z.number().positive().finite(),
        height: z.number().positive().finite()
      })
      .strict(),
    reserveBox: localSpatialBoundsSchema,
    reserveAnchor: spatialContractAnchorSchema,
    roundTripStable: z.boolean(),
    roundTripTolerance: z.number().nonnegative().finite(),
    derivedFromEvidenceIds: z.array(stableIdSchema).min(1).max(16)
  })
  .strict();

export type NativeSpatialContract = z.infer<
  typeof nativeSpatialContractSchema
>;

export const nativeSpatialStateSchema = z.enum([
  "initial",
  "selected",
  "manipulated",
  "undo-reset",
  "reopened"
]);

export const nativeSpatialObservationSchema = z
  .object({
    state: nativeSpatialStateSchema,
    visualBox: spatialBoundsSchema,
    chromeBox: spatialBoundsSchema,
    taskEnvelope: z.union([
      spatialBoundsSchema,
      z.object({ mode: z.literal("unbounded") }).strict()
    ]),
    persistedMathematicalStateHash: z.string().regex(/^[a-f0-9]{64}$/),
    screenshotPath: z.string().min(1).max(500).optional()
  })
  .strict();

export type NativeSpatialObservation = z.infer<
  typeof nativeSpatialObservationSchema
>;

export const nativeSpatialEvidenceSchema = z
  .object({
    evidenceId: stableIdSchema,
    observedAt: z.string().datetime(),
    toolKey: stableIdSchema,
    variantId: stableIdSchema,
    toolVersionFingerprint: z.string().min(1).max(240),
    environment: z
      .object({
        viewport: z.string().regex(/^\d+x\d+$/),
        devicePixelRatio: z.number().positive().finite(),
        fontFingerprint: z.string().min(1).max(240),
        assetFingerprint: z.string().min(1).max(240),
        harnessVersion: z.string().min(1).max(120)
      })
      .strict(),
    observations: z.array(nativeSpatialObservationSchema).min(1).max(5),
    persistedStateChanged: z.boolean(),
    roundTripDriftWithinTolerance: z.boolean(),
    nonPointerInteraction: z
      .enum(["available", "unavailable", "not-observed"])
  })
  .strict();

export type NativeSpatialEvidence = z.infer<
  typeof nativeSpatialEvidenceSchema
>;

/**
 * Reserve boxes are layout budgets, not a license to shrink a native object.
 * Keep this check pure so the resolver can fail closed before compiling payload.
 */
export function assertNativeSpatialContract(
  contract: NativeSpatialContract
): NativeSpatialContract {
  const parsed = nativeSpatialContractSchema.parse(contract);
  if (!parsed.roundTripStable && parsed.roundTripTolerance !== 0) {
    throw new Error("native-spatial-unstable-contract-tolerance-invalid");
  }
  if (
    parsed.reserveBox.x + parsed.reserveBox.width < 0 ||
    parsed.reserveBox.y + parsed.reserveBox.height < 0
  ) {
    throw new Error("native-spatial-reserve-box-invalid");
  }
  return parsed;
}

export function assertNativeSpatialEvidence(
  evidence: NativeSpatialEvidence
): NativeSpatialEvidence {
  const parsed = nativeSpatialEvidenceSchema.parse(evidence);
  const states = new Set(parsed.observations.map((observation) => observation.state));
  if (states.has("manipulated") && !parsed.persistedStateChanged) {
    throw new Error("native-spatial-manipulation-without-state-change");
  }
  if (states.has("reopened") && !parsed.roundTripDriftWithinTolerance) {
    throw new Error("native-spatial-reopen-drift-outside-tolerance");
  }
  return parsed;
}
