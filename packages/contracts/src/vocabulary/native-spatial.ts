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

const spatialSizeSchema = z
  .object({
    width: z.number().positive().finite(),
    height: z.number().positive().finite()
  })
  .strict();

const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

const nativeSpatialContractBaseSchema = z.object({
    contractId: stableIdSchema,
    toolKey: stableIdSchema,
    variantId: stableIdSchema,
    toolVersionFingerprint: z.string().min(1).max(240),
    minInteractiveSize: spatialSizeSchema,
    minInteractiveCssSize: spatialSizeSchema,
    reserveBox: localSpatialBoundsSchema,
    reserveAnchor: spatialContractAnchorSchema,
    roundTripStable: z.boolean(),
    roundTripTolerance: z.number().nonnegative().finite(),
    derivedFromEvidenceIds: z.array(stableIdSchema).min(1).max(16)
  });

export const nativeIntrinsicSpatialContractSchema =
  nativeSpatialContractBaseSchema
    .extend({
      contractKind: z.literal("intrinsic-element")
    })
    .strict();

const compositionSemanticRegionSchema = z
  .object({
    id: stableIdSchema,
    bounds: spatialBoundsSchema
  })
  .strict();

const compositionManipulatedEnvelopeSchema = z
  .object({
    id: stableIdSchema,
    bounds: spatialBoundsSchema
  })
  .strict();

export const nativeActivityCompositionSpatialContractSchema =
  nativeSpatialContractBaseSchema
    .extend({
      contractKind: z.literal("activity-composition"),
      composition: z
        .object({
          layoutPresetId: stableIdSchema,
          layoutContentHash: contentHashSchema,
          blueprintContentHash: contentHashSchema,
          canvas: z
            .object({
              width: z.number().positive().finite(),
              height: z.number().positive().finite(),
              canvasBaseHeight: z.number().nonnegative().finite(),
              itemPitch: z.number().positive().finite(),
              itemCount: z.number().int().positive(),
              canvasUnitsToCssPx: z.number().positive().finite()
            })
            .strict(),
          releaseViewport: z
            .object({
              width: z.number().int().positive(),
              height: z.number().int().positive(),
              devicePixelRatio: z.number().positive().finite(),
              surfaceMode: z.enum(["authoring-editor", "student-view"]),
              sidebarState: z.enum(["expanded", "collapsed", "absent"]),
              zoomMode: z.literal("fit"),
              pan: z
                .object({ x: z.number().finite(), y: z.number().finite() })
                .strict()
            })
            .strict(),
          semanticRegions: z.array(compositionSemanticRegionSchema).min(5).max(16),
          selectionOverlayExclusionZoneCssPx: spatialBoundsSchema,
          minGap: z.number().nonnegative().finite(),
          labelClearance: z.number().nonnegative().finite(),
          zOrder: z.array(stableIdSchema).min(3).max(16),
          manipulatedStateEnvelopes: z
            .array(compositionManipulatedEnvelopeSchema)
            .min(2)
            .max(16)
        })
        .strict()
    })
    .strict()
    .superRefine((contract, context) => {
      const { canvas, releaseViewport, semanticRegions, manipulatedStateEnvelopes } =
        contract.composition;
      const expectedHeight =
        canvas.canvasBaseHeight + canvas.itemCount * canvas.itemPitch;
      if (Math.abs(canvas.height - expectedHeight) > 1e-6) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["composition", "canvas", "height"],
          message: "composition canvas height가 base + itemCount × itemPitch와 다릅니다."
        });
      }
      const overlay = contract.composition.selectionOverlayExclusionZoneCssPx;
      if (
        overlay.x < 0 ||
        overlay.y < 0 ||
        overlay.x + overlay.width > releaseViewport.width ||
        overlay.y + overlay.height > releaseViewport.height
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["composition", "selectionOverlayExclusionZoneCssPx"],
          message: "selection overlay exclusion zone이 release viewport를 벗어납니다."
        });
      }
      for (const [path, entries] of [
        ["semanticRegions", semanticRegions],
        ["manipulatedStateEnvelopes", manipulatedStateEnvelopes]
      ] as const) {
        const ids = entries.map((entry) => entry.id);
        if (new Set(ids).size !== ids.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["composition", path],
            message: `${path} ID가 중복됩니다.`
          });
        }
      }
    });

export const nativeSpatialContractSchema = z.union([
  nativeIntrinsicSpatialContractSchema,
  nativeActivityCompositionSpatialContractSchema
]);

export type NativeIntrinsicSpatialContract = z.infer<
  typeof nativeIntrinsicSpatialContractSchema
>;

export type NativeActivityCompositionSpatialContract = z.infer<
  typeof nativeActivityCompositionSpatialContractSchema
>;

export type NativeSpatialContract = z.infer<
  typeof nativeSpatialContractSchema
>;

export const nativeSpatialEvidenceInteractionContextSchema = z
  .object({
    surfaceMode: z.enum(["authoring-editor", "student-view"]),
    sidebarState: z.enum(["expanded", "collapsed", "absent"]),
    zoomMode: z.literal("fit"),
    pan: z.object({ x: z.number().finite(), y: z.number().finite() }).strict(),
    canvasUnitsToCssPx: z.number().positive().finite(),
    selectionOverlayCssPx: spatialBoundsSchema
  })
  .strict();

export const nativeSpatialStateSchema = z.enum([
  "initial",
  "selected",
  "manipulated",
  "undo-reset",
  "reopened"
]);
export type NativeSpatialState = z.infer<typeof nativeSpatialStateSchema>;

export const nativeSpatialObservationSchema = z
  .object({
    state: nativeSpatialStateSchema,
    placement: spatialBoundsSchema,
    visualBox: spatialBoundsSchema,
    chromeBox: spatialBoundsSchema,
    reserveBox: spatialBoundsSchema,
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
        harnessVersion: z.string().min(1).max(120),
        interactionContext: nativeSpatialEvidenceInteractionContextSchema.optional()
      })
      .strict(),
    observations: z.array(nativeSpatialObservationSchema).min(1).max(5),
    persistedStateChanged: z.boolean(),
    roundTripReferenceState: z.enum([
      "initial",
      "selected",
      "manipulated",
      "undo-reset"
    ]),
    roundTripDrift: z.number().nonnegative().finite(),
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
  if (
    parsed.reserveBox.width < parsed.minInteractiveSize.width ||
    parsed.reserveBox.height < parsed.minInteractiveSize.height
  ) {
    throw new Error("native-spatial-reserve-box-below-min-interactive-size");
  }
  if (
    parsed.minInteractiveCssSize.width < 24 ||
    parsed.minInteractiveCssSize.height < 24
  ) {
    throw new Error("native-spatial-css-interaction-size-below-absolute-minimum");
  }
  return parsed;
}

function contains(outer: SpatialBounds, inner: SpatialBounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function taskEnvelopeOf(
  observation: NativeSpatialObservation
): SpatialBounds {
  if ("mode" in observation.taskEnvelope) {
    throw new Error("native-spatial-unbounded-task-envelope");
  }
  return observation.taskEnvelope;
}

function observationByState(
  observations: readonly NativeSpatialObservation[]
): Map<NativeSpatialState, NativeSpatialObservation> {
  if (observations.length !== 5) {
    throw new Error("native-spatial-lifecycle-states-incomplete");
  }
  const byState = new Map<NativeSpatialState, NativeSpatialObservation>();
  for (const observation of observations) {
    if (byState.has(observation.state)) {
      throw new Error(`native-spatial-lifecycle-state-duplicate:${observation.state}`);
    }
    byState.set(observation.state, observation);
  }
  for (const state of [
    "initial",
    "selected",
    "manipulated",
    "undo-reset",
    "reopened"
  ] as const) {
    if (!byState.has(state)) {
      throw new Error(`native-spatial-lifecycle-state-missing:${state}`);
    }
  }
  const expectedOrder = [
    "initial",
    "selected",
    "manipulated",
    "undo-reset",
    "reopened"
  ];
  if (
    observations.map((observation) => observation.state).join(",") !==
    expectedOrder.join(",")
  ) {
    throw new Error("native-spatial-lifecycle-state-order-invalid");
  }
  return byState;
}

function maxBoundsDrift(
  left: SpatialBounds,
  right: SpatialBounds
): number {
  return Math.max(
    Math.abs(left.x - right.x),
    Math.abs(left.y - right.y),
    Math.abs(left.width - right.width),
    Math.abs(left.height - right.height)
  );
}

function resolveContractReserveBox(
  contract: NativeSpatialContract,
  placement: SpatialBounds
): SpatialBounds {
  if (contract.reserveAnchor === "placement-center") {
    return {
      x: placement.x + placement.width / 2 + contract.reserveBox.x,
      y: placement.y + placement.height / 2 + contract.reserveBox.y,
      width: contract.reserveBox.width,
      height: contract.reserveBox.height
    };
  }
  return {
    x: placement.x + contract.reserveBox.x,
    y: placement.y + contract.reserveBox.y,
    width: contract.reserveBox.width,
    height: contract.reserveBox.height
  };
}

export function assertNativeSpatialEvidence(
  evidence: NativeSpatialEvidence
): NativeSpatialEvidence {
  const parsed = nativeSpatialEvidenceSchema.parse(evidence);
  const byState = observationByState(parsed.observations);
  const initial = byState.get("initial")!;
  const manipulated = byState.get("manipulated")!;
  const undoReset = byState.get("undo-reset")!;
  const reopened = byState.get("reopened")!;
  for (const observation of parsed.observations) {
    const taskEnvelope = taskEnvelopeOf(observation);
    if (
      !contains(observation.reserveBox, observation.visualBox) ||
      !contains(observation.reserveBox, observation.chromeBox) ||
      !contains(observation.reserveBox, taskEnvelope) ||
      !contains(taskEnvelope, observation.visualBox) ||
      !contains(taskEnvelope, observation.chromeBox)
    ) {
      throw new Error(
        `native-spatial-observation-outside-reserve-or-task-envelope:${observation.state}`
      );
    }
  }
  const mathematicalStateChanged =
    initial.persistedMathematicalStateHash !==
    manipulated.persistedMathematicalStateHash;
  if (parsed.persistedStateChanged !== mathematicalStateChanged) {
    throw new Error("native-spatial-state-change-hash-mismatch");
  }
  if (!mathematicalStateChanged) {
    throw new Error("native-spatial-manipulation-without-state-change");
  }
  if (
    undoReset.persistedMathematicalStateHash !==
    initial.persistedMathematicalStateHash
  ) {
    throw new Error("native-spatial-undo-reset-state-mismatch");
  }
  const reference = byState.get(parsed.roundTripReferenceState)!;
  if (
    reopened.persistedMathematicalStateHash !==
    reference.persistedMathematicalStateHash
  ) {
    throw new Error("native-spatial-reopen-state-mismatch");
  }
  const measuredDrift = Math.max(
    maxBoundsDrift(reopened.visualBox, reference.visualBox),
    maxBoundsDrift(reopened.chromeBox, reference.chromeBox),
    maxBoundsDrift(reopened.reserveBox, reference.reserveBox)
  );
  if (Math.abs(measuredDrift - parsed.roundTripDrift) > 1e-6) {
    throw new Error("native-spatial-reopen-drift-measurement-mismatch");
  }
  return parsed;
}

export function assertNativeSpatialLifecycleEvidence(
  contract: NativeSpatialContract,
  evidence: NativeSpatialEvidence
): { readonly contract: NativeSpatialContract; readonly evidence: NativeSpatialEvidence } {
  const parsedContract = assertNativeSpatialContract(contract);
  const parsedEvidence = assertNativeSpatialEvidence(evidence);
  if (!parsedContract.roundTripStable) {
    throw new Error("native-spatial-round-trip-unstable");
  }
  if (
    parsedEvidence.toolKey !== parsedContract.toolKey ||
    parsedEvidence.variantId !== parsedContract.variantId ||
    parsedEvidence.toolVersionFingerprint !==
      parsedContract.toolVersionFingerprint ||
    !parsedContract.derivedFromEvidenceIds.includes(parsedEvidence.evidenceId)
  ) {
    throw new Error("native-spatial-contract-evidence-binding-mismatch");
  }
  for (const observation of parsedEvidence.observations) {
    if (
      observation.placement.width < parsedContract.minInteractiveSize.width ||
      observation.placement.height < parsedContract.minInteractiveSize.height
    ) {
      throw new Error(
        `native-spatial-placement-below-min-interactive-size:${observation.state}`
      );
    }
    const expectedReserve = resolveContractReserveBox(
      parsedContract,
      observation.placement
    );
    if (maxBoundsDrift(observation.reserveBox, expectedReserve) > 1e-6) {
      throw new Error(
        `native-spatial-observed-reserve-contract-mismatch:${observation.state}`
      );
    }
    if (
      observation.reserveBox.width < parsedContract.minInteractiveSize.width ||
      observation.reserveBox.height < parsedContract.minInteractiveSize.height
    ) {
      throw new Error(
        `native-spatial-observed-reserve-below-min-interactive-size:${observation.state}`
      );
    }
  }
  if (
    parsedEvidence.roundTripDrift > parsedContract.roundTripTolerance ||
    parsedEvidence.roundTripDriftWithinTolerance !==
      (parsedEvidence.roundTripDrift <= parsedContract.roundTripTolerance)
  ) {
    throw new Error("native-spatial-reopen-drift-outside-tolerance");
  }
  return { contract: parsedContract, evidence: parsedEvidence };
}
