import { describe, expect, it } from "vitest";
import {
  assertNativeAffordanceSpatialBinding,
  hashNativeSemanticState,
  nativeAffordanceFamilySchema
} from "@mathcanvas/contracts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildNativeAffordanceFamilyCatalog,
  findNativeAffordanceFamily,
  grade3PilotNativeAffordanceFamilyCatalog
} from "./native-affordance-catalog-v2.js";
import { grade3PilotEntries } from "./pilot-ledger.js";
import { grade3PilotWorksheetCatalog } from "./worksheet-catalog-v2.js";

describe("R3 native affordance family catalog", () => {
  it("30개 entry를 7개 affordanceFamily로 dedupe하고 대표 tool/evidence에 결속한다", () => {
    expect(grade3PilotNativeAffordanceFamilyCatalog.families).toHaveLength(7);
    const familyIds = new Set(
      grade3PilotNativeAffordanceFamilyCatalog.families.map(
        (family) => family.affordanceFamilyId
      )
    );
    expect(familyIds.size).toBe(7);
    for (const entry of grade3PilotEntries) {
      expect(familyIds.has(entry.nativeAffordance.affordanceFamilyId)).toBe(
        true
      );
      const family = findNativeAffordanceFamily(
        entry.nativeAffordance.affordanceFamilyId
      )!;
      expect(family.candidateToolKeys).toEqual(
        entry.nativeAffordance.candidateToolKeys
      );
      const catalogEntry = grade3PilotWorksheetCatalog.find(
        (candidate) => candidate.sourceId === entry.sourceId
      )!;
      expect(catalogEntry.affordanceFamily.supportState).toBe(
        family.supportState
      );
      expect(
        family.evidenceRefs.every((reference) =>
          family.candidateToolKeys.includes(reference.toolKey)
        )
      ).toBe(true);
    }
  });

  it("NO01SC grouping은 contracted·conditional-go이고 spatial contract 두 개를 고정한다", () => {
    const family = findNativeAffordanceFamily("native-counting-model-v1")!;
    expect(family.preferredToolKey).toBe("NO01SC");
    expect(family.supportState).toBe("contracted");
    expect(family.decision).toBe("conditional-go");
    expect(family.spatialContractRefs.map((ref) => ref.contractId)).toEqual([
      "native-element-no01sc-01-v2",
      "division-grouping-no01sc-01-composition-v2"
    ]);
    expect(family.releaseBlockers.length).toBeGreaterThan(0);
    const spatialCatalogPath = resolve(
      process.cwd(),
      "research/mathcanvas/native-spatial-contract-catalog.json"
    );
    const spatialCatalog = JSON.parse(
      readFileSync(spatialCatalogPath, "utf8")
    );
    const spatialCatalogSha256 = createHash("sha256")
      .update(readFileSync(spatialCatalogPath))
      .digest("hex");
    expect(
      family.spatialContractRefs.every(
        (reference) => reference.sourceFileSha256 === spatialCatalogSha256
      )
    ).toBe(true);
    expect(() =>
      assertNativeAffordanceSpatialBinding(
        family,
        spatialCatalog,
        spatialCatalogSha256
      )
    ).not.toThrow();
    const wrong = structuredClone(family);
    wrong.spatialContractRefs[0]!.recordHash = "0".repeat(64);
    expect(() =>
      assertNativeAffordanceSpatialBinding(
        wrong,
        spatialCatalog,
        spatialCatalogSha256
      )
    ).toThrow(/spatial-binding-mismatch/);
    const wrongSource = structuredClone(family);
    wrongSource.spatialContractRefs[0]!.sourceFileSha256 = "0".repeat(64);
    expect(() =>
      assertNativeAffordanceSpatialBinding(
        wrongSource,
        spatialCatalog,
        spatialCatalogSha256
      )
    ).toThrow(/spatial-binding-mismatch/);
  });

  it("placement·selection·viewport 변화는 같은 semantic hash이고 수학 관계 변화는 hash를 바꾼다", () => {
    const family = findNativeAffordanceFamily("native-counting-model-v1")!;
    const initial = {
      viewport: { pan: { x: 0, y: 0 } },
      selection: { ids: ["unit-01"] },
      placement: { x: 100, y: 200 },
      groups: { membership: [["unit-01", "unit-02"]], memberCount: [2] },
      remainder: { count: 1 }
    };
    const moved = structuredClone(initial);
    moved.viewport.pan = { x: 320, y: -120 };
    moved.selection.ids = ["unit-99"];
    moved.placement = { x: 900, y: 40 };
    expect(
      hashNativeSemanticState(initial, family.semanticStateProjection)
    ).toBe(hashNativeSemanticState(moved, family.semanticStateProjection));

    const changed = structuredClone(initial);
    changed.groups.memberCount = [3];
    expect(
      hashNativeSemanticState(initial, family.semanticStateProjection)
    ).not.toBe(hashNativeSemanticState(changed, family.semanticStateProjection));
  });

  it("projection과 candidate evidence의 결속을 변조하면 fail-closed한다", () => {
    const family = findNativeAffordanceFamily("native-array-model-v1")!;
    const wrongPreferred = structuredClone(family);
    wrongPreferred.preferredToolKey = "NO01SC";
    expect(nativeAffordanceFamilySchema.safeParse(wrongPreferred).success).toBe(
      false
    );

    const wrongProjection = structuredClone(family);
    wrongProjection.semanticStateProjection.ignoredPaths.push("array.total");
    expect(nativeAffordanceFamilySchema.safeParse(wrongProjection).success).toBe(
      false
    );

    const wrongEvidence = structuredClone(family);
    wrongEvidence.evidenceRefs[0]!.toolKey = "NO01SC";
    expect(nativeAffordanceFamilySchema.safeParse(wrongEvidence).success).toBe(
      false
    );

    const wrongClaimLevel = structuredClone(family);
    wrongClaimLevel.supportState = "contracted";
    expect(
      nativeAffordanceFamilySchema.safeParse(wrongClaimLevel).success
    ).toBe(false);

    const wrongConditionalClaim = structuredClone(family);
    wrongConditionalClaim.decision = "conditional-go";
    wrongConditionalClaim.releaseBlockers = ["still probing"];
    expect(
      nativeAffordanceFamilySchema.safeParse(wrongConditionalClaim).success
    ).toBe(false);

    const wrongNestedProjection = structuredClone(family);
    wrongNestedProjection.semanticStateProjection.invariantPaths = ["array"];
    wrongNestedProjection.semanticStateProjection.ignoredPaths.push(
      "array.total"
    );
    expect(
      nativeAffordanceFamilySchema.safeParse(wrongNestedProjection).success
    ).toBe(false);
  });

  it("같은 family의 native 정의 drift를 last-wins로 덮지 않는다", () => {
    const entries = structuredClone(grade3PilotEntries);
    const targetIndex = entries.findIndex(
      (entry) =>
        entry.nativeAffordance.affordanceFamilyId === "native-array-model-v1"
    );
    expect(targetIndex).toBeGreaterThanOrEqual(0);
    entries[targetIndex]!.nativeAffordance.requiredOperation =
      "drifted native operation";
    expect(() => buildNativeAffordanceFamilyCatalog(entries)).toThrow(
      "native-affordance-family-drift:native-array-model-v1"
    );
  });

  it("canonical family authority는 freeze되고 finder는 오염되지 않는 clone을 반환한다", () => {
    expect(Object.isFrozen(grade3PilotNativeAffordanceFamilyCatalog)).toBe(true);
    expect(
      Object.isFrozen(grade3PilotNativeAffordanceFamilyCatalog.families[0])
    ).toBe(true);
    const returned = findNativeAffordanceFamily("native-counting-model-v1")!;
    returned.supportState = "released";
    returned.decision = "baseline-released";
    returned.releaseBlockers = [];
    const reread = findNativeAffordanceFamily("native-counting-model-v1")!;
    expect(reread.supportState).toBe("contracted");
    expect(reread.decision).toBe("conditional-go");
    expect(reread.releaseBlockers).toHaveLength(2);
  });
});
