import { describe, expect, it } from "vitest";
import {
  assertNativeSpatialContract,
  assertNativeSpatialEvidence,
  assertNativeSpatialLifecycleEvidence,
  nativeSpatialContractSchema,
  nativeSpatialEvidenceSchema,
  type NativeSpatialEvidence
} from "./native-spatial.js";

const contract = {
  contractKind: "intrinsic-element" as const,
  contractId: "NO04NT.default.spatial-v1",
  toolKey: "NO04NT",
  variantId: "NO04NT-01",
  toolVersionFingerprint: "bundle:stable-number-card-v1",
  minInteractiveSize: { width: 80, height: 80 },
  minInteractiveCssSize: { width: 44, height: 44 },
  reserveBox: { x: -50, y: -50, width: 100, height: 100 },
  reserveAnchor: "placement-center" as const,
  roundTripStable: true,
  roundTripTolerance: 1,
  derivedFromEvidenceIds: ["wave4.number-card.spatial.v1"]
};

function observation(
  state: NativeSpatialEvidence["observations"][number]["state"],
  persistedMathematicalStateHash: string
) {
  return {
    state,
    placement: { x: 100, y: 200, width: 80, height: 80 },
    visualBox: { x: 100, y: 200, width: 80, height: 80 },
    chromeBox: { x: 90, y: 190, width: 100, height: 100 },
    reserveBox: { x: 90, y: 190, width: 100, height: 100 },
    taskEnvelope: { x: 90, y: 190, width: 100, height: 100 },
    persistedMathematicalStateHash
  };
}

const evidence: NativeSpatialEvidence = {
  evidenceId: "wave4.number-card.spatial.v1",
  observedAt: "2026-08-08T00:00:00.000Z",
  toolKey: "NO04NT",
  variantId: "NO04NT-01",
  toolVersionFingerprint: "bundle:stable-number-card-v1",
  environment: {
    viewport: "1280x800",
    devicePixelRatio: 1,
    fontFingerprint: "font:test",
    assetFingerprint: "asset:test",
    harnessVersion: "test-1"
  },
  observations: [
    observation("initial", "a".repeat(64)),
    observation("selected", "a".repeat(64)),
    observation("manipulated", "b".repeat(64)),
    observation("undo-reset", "a".repeat(64)),
    observation("reopened", "a".repeat(64))
  ],
  persistedStateChanged: true,
  roundTripReferenceState: "undo-reset",
  roundTripDrift: 0,
  roundTripDriftWithinTolerance: true,
  nonPointerInteraction: "not-observed"
};

describe("native spatial contract", () => {
  it("accepts a versioned reserve box without mixing observations", () => {
    expect(nativeSpatialContractSchema.parse(contract)).toEqual(contract);
    expect(assertNativeSpatialContract(contract)).toEqual(contract);
    expect(
      assertNativeSpatialLifecycleEvidence(contract, evidence).evidence
    ).toEqual(evidence);
  });

  it("rejects an unstable contract with a non-zero drift tolerance", () => {
    expect(() =>
      assertNativeSpatialContract({
        ...contract,
        roundTripStable: false,
        roundTripTolerance: 1
      })
    ).toThrow("native-spatial-unstable-contract-tolerance-invalid");
  });

  it("rejects a reserve box smaller than the minimum interaction size", () => {
    expect(() =>
      assertNativeSpatialContract({
        ...contract,
        reserveBox: { x: 0, y: 0, width: 1, height: 1 }
      })
    ).toThrow("native-spatial-reserve-box-below-min-interactive-size");
  });

  it("rejects an intrinsic CSS target below the absolute minimum", () => {
    expect(() =>
      assertNativeSpatialContract({
        ...contract,
        minInteractiveCssSize: { width: 23, height: 44 }
      })
    ).toThrow("native-spatial-css-interaction-size-below-absolute-minimum");
  });

  it("rejects an explicitly unstable lifecycle contract", () => {
    expect(() =>
      assertNativeSpatialLifecycleEvidence(
        { ...contract, roundTripStable: false, roundTripTolerance: 0 },
        evidence
      )
    ).toThrow("native-spatial-round-trip-unstable");
  });
});

describe("native spatial evidence", () => {
  it("requires all lifecycle states and a real persisted hash transition", () => {
    expect(nativeSpatialEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(assertNativeSpatialEvidence(evidence)).toEqual(evidence);
    expect(() =>
      assertNativeSpatialEvidence({
        ...evidence,
        observations: evidence.observations.slice(0, 1)
      })
    ).toThrow("native-spatial-lifecycle-states-incomplete");
    expect(() =>
      assertNativeSpatialEvidence({
        ...evidence,
        persistedStateChanged: false
      })
    ).toThrow("native-spatial-state-change-hash-mismatch");
    expect(() =>
      assertNativeSpatialEvidence({
        ...evidence,
        observations: [...evidence.observations].reverse()
      })
    ).toThrow("native-spatial-lifecycle-state-order-invalid");
  });

  it("rejects unbounded task envelopes and fake round-trip measurements", () => {
    expect(() =>
      assertNativeSpatialEvidence({
        ...evidence,
        observations: evidence.observations.map((item) => ({
          ...item,
          taskEnvelope: { mode: "unbounded" as const }
        }))
      })
    ).toThrow("native-spatial-unbounded-task-envelope");
    expect(() =>
      assertNativeSpatialLifecycleEvidence(contract, {
        ...evidence,
        roundTripDrift: 1,
        roundTripDriftWithinTolerance: true
      })
    ).toThrow("native-spatial-reopen-drift-measurement-mismatch");
    expect(() =>
      assertNativeSpatialEvidence({
        ...evidence,
        observations: evidence.observations.map((item) => ({
          ...item,
          taskEnvelope: { x: 80, y: 180, width: 120, height: 120 }
        }))
      })
    ).toThrow("native-spatial-observation-outside-reserve-or-task-envelope");
  });

  it("rejects stale contract and evidence bindings", () => {
    expect(() =>
      assertNativeSpatialLifecycleEvidence(
        { ...contract, toolVersionFingerprint: "bundle:stale" },
        evidence
      )
    ).toThrow("native-spatial-contract-evidence-binding-mismatch");
  });

  it("rejects a reopened observation with drift outside tolerance", () => {
    expect(() =>
      assertNativeSpatialLifecycleEvidence(contract, {
        ...evidence,
        observations: evidence.observations.map((item) =>
          item.state === "reopened"
            ? { ...item, visualBox: { ...item.visualBox, x: 102 } }
            : item
        ),
        roundTripDrift: 2,
        roundTripDriftWithinTolerance: false
      })
    ).toThrow("native-spatial-reopen-drift-outside-tolerance");
  });

  it("rejects an observed reserve that is not the contract-resolved box", () => {
    expect(() =>
      assertNativeSpatialLifecycleEvidence(contract, {
        ...evidence,
        observations: evidence.observations.map((item) => ({
          ...item,
          reserveBox: { ...item.reserveBox, width: 101 }
        }))
      })
    ).toThrow("native-spatial-observed-reserve-contract-mismatch");
  });
});
