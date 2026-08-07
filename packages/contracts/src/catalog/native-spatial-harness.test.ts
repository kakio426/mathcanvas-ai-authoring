import { describe, expect, it } from "vitest";
import {
  collectNativeSpatialIssues,
  type NativeSpatialContractCatalog,
  type NativeSpatialActivityScope
} from "./native-spatial-harness.js";

const contract = {
  contractId: "contract.v1",
  toolKey: "NO01SC",
  variantId: "NO01SC-01",
  toolVersionFingerprint: "bundle:v1",
  minInteractiveSize: { width: 80, height: 80 },
  reserveBox: { x: -50, y: -50, width: 100, height: 100 },
  reserveAnchor: "placement-center" as const,
  roundTripStable: true,
  roundTripTolerance: 1,
  derivedFromEvidenceIds: ["evidence.v1"]
};

const observation = (state: "initial" | "selected" | "manipulated" | "undo-reset" | "reopened", hash: string) => ({
  state,
  placement: { x: 100, y: 200, width: 80, height: 80 },
  visualBox: { x: 100, y: 200, width: 80, height: 80 },
  chromeBox: { x: 90, y: 190, width: 100, height: 100 },
  reserveBox: { x: 90, y: 190, width: 100, height: 100 },
  taskEnvelope: { x: 90, y: 190, width: 100, height: 100 },
  persistedMathematicalStateHash: hash
});

const evidence = {
  evidenceId: "evidence.v1",
  observedAt: "2026-08-08T00:00:00.000Z",
  toolKey: "NO01SC",
  variantId: "NO01SC-01",
  toolVersionFingerprint: "bundle:v1",
  environment: {
    viewport: "1280x800",
    devicePixelRatio: 1,
    fontFingerprint: "font:v1",
    assetFingerprint: "asset:v1",
    harnessVersion: "harness:v1"
  },
  observations: [
    observation("initial", "a".repeat(64)),
    observation("selected", "a".repeat(64)),
    observation("manipulated", "b".repeat(64)),
    observation("undo-reset", "a".repeat(64)),
    observation("reopened", "a".repeat(64))
  ],
  persistedStateChanged: true,
  roundTripReferenceState: "undo-reset" as const,
  roundTripDrift: 0,
  roundTripDriftWithinTolerance: true,
  nonPointerInteraction: "not-observed" as const
};

const scope: NativeSpatialActivityScope = {
  schemaVersion: "1.0.0",
  entries: [{ activityId: "activity.v1", blueprintContentHash: "a".repeat(64) }]
};

const blueprint = {
  id: "activity.v1",
  contentHash: "a".repeat(64),
  toolRoles: [
    {
      role: "native-piece",
      toolKey: "NO01SC",
      spatialContractId: "contract.v1",
      spatialContractVersion: "v1"
    },
    { role: "label", toolKey: "common.text" }
  ]
};

describe("native spatial issue harness", () => {
  it("generates a blocking issue for a changed native role without a contract", () => {
    const result = collectNativeSpatialIssues({
      scope,
      catalog: { schemaVersion: "1.0.0", records: [] },
      blueprints: [
        {
          ...blueprint,
          toolRoles: [{ role: "native-piece", toolKey: "NO01SC" }]
        }
      ]
    });
    expect(result.changedActivityIds).toEqual(["activity.v1"]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.gateId).toBe("visual.native-reserve-box-fit");
  });

  it("clears a changed native role only with matching lifecycle evidence", () => {
    const catalog: NativeSpatialContractCatalog = {
      schemaVersion: "1.0.0",
      records: [{ contractVersion: "v1", contract, evidence }]
    };
    expect(
      collectNativeSpatialIssues({
        scope,
        catalog,
        blueprints: [blueprint]
      }).issues
    ).toHaveLength(0);
    expect(() =>
      collectNativeSpatialIssues({
        scope: {
          ...scope,
          entries: [{ ...scope.entries[0]!, blueprintContentHash: "b".repeat(64) }]
        },
        catalog,
        blueprints: [blueprint]
      })
    ).toThrow("native-spatial-scope-stale");
  });

  it("turns a state-change failure in the catalog into a ratchet issue", () => {
    const catalog: NativeSpatialContractCatalog = {
      schemaVersion: "1.0.0",
      records: [
        {
          contractVersion: "v1",
          contract,
          evidence: { ...evidence, persistedStateChanged: false }
        }
      ]
    };
    const result = collectNativeSpatialIssues({
      scope,
      catalog,
      blueprints: [blueprint]
    });
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.gateId).toBe(
      "affordance.primary-math-state-change"
    );
  });
});
