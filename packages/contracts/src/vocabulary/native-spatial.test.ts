import { describe, expect, it } from "vitest";
import {
  assertNativeSpatialContract,
  assertNativeSpatialEvidence,
  nativeSpatialContractSchema,
  nativeSpatialEvidenceSchema
} from "./native-spatial.js";

const contract = {
  contractId: "NO04NT.default.spatial-v1",
  toolKey: "NO04NT",
  variantId: "NO04NT-01",
  toolVersionFingerprint: "bundle:stable-number-card-v1",
  minInteractiveSize: { width: 80, height: 80 },
  reserveBox: { x: -50, y: -50, width: 100, height: 100 },
  reserveAnchor: "placement-center" as const,
  roundTripStable: true,
  roundTripTolerance: 1,
  derivedFromEvidenceIds: ["wave4.number-card.spatial.v1"]
};

describe("native spatial contract", () => {
  it("accepts a versioned reserve box without mixing observations", () => {
    expect(nativeSpatialContractSchema.parse(contract)).toEqual(contract);
    expect(assertNativeSpatialContract(contract)).toEqual(contract);
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
});

describe("native spatial evidence", () => {
  it("requires state change evidence for a manipulated observation", () => {
    const evidence = {
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
        {
          state: "manipulated" as const,
          visualBox: { x: 0, y: 0, width: 80, height: 80 },
          chromeBox: { x: -10, y: -10, width: 100, height: 100 },
          taskEnvelope: { x: 0, y: 0, width: 100, height: 100 },
          persistedMathematicalStateHash: "a".repeat(64)
        }
      ],
      persistedStateChanged: true,
      roundTripDriftWithinTolerance: true,
      nonPointerInteraction: "not-observed" as const
    };
    expect(nativeSpatialEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(assertNativeSpatialEvidence(evidence)).toEqual(evidence);
  });

  it("rejects a reopened observation with drift outside tolerance", () => {
    const evidence = {
      evidenceId: "wave4.number-card.reopen.v1",
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
        {
          state: "reopened" as const,
          visualBox: { x: 0, y: 0, width: 80, height: 80 },
          chromeBox: { x: 0, y: 0, width: 80, height: 80 },
          taskEnvelope: { x: 0, y: 0, width: 80, height: 80 },
          persistedMathematicalStateHash: "b".repeat(64)
        }
      ],
      persistedStateChanged: false,
      roundTripDriftWithinTolerance: false,
      nonPointerInteraction: "not-observed" as const
    };
    expect(() => assertNativeSpatialEvidence(evidence)).toThrow(
      "native-spatial-reopen-drift-outside-tolerance"
    );
  });
});
