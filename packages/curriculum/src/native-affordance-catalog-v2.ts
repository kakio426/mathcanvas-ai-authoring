import {
  canonicalJson,
  nativeAffordanceFamilyCatalogSchema,
  type PilotLedgerEntry,
  type NativeAffordanceFamily,
  type NativeSemanticStateProjection
} from "@mathcanvas/contracts";
import { grade3PilotEntries } from "./pilot-ledger.js";

const NATIVE_SPATIAL_CATALOG_SOURCE_SHA256 =
  "229969c1590f6c2225c8a8758bb460200c2f4d90e0f9cdcfbdc046d8c91d2c1c";

const ignoredPaths = [
  "viewport.pan",
  "selection.ids",
  "placement.x",
  "placement.y"
] as const;

const familyConfig: Record<
  string,
  {
    preferredToolKey: string;
    supportState: NativeAffordanceFamily["supportState"];
    decision: NativeAffordanceFamily["decision"];
    invariantPaths: readonly string[];
    releaseBlockers: readonly string[];
    spatialContractRefs?: NativeAffordanceFamily["spatialContractRefs"];
  }
> = {
  "native-array-model-v1": {
    preferredToolKey: "NO04NG",
    supportState: "captured",
    decision: "pending",
    invariantPaths: ["array.rows", "array.columns", "array.total"],
    releaseBlockers: [
      "semantic array manipulation adapter is not contracted",
      "native reserveBox and task envelope are not family-pinned"
    ]
  },
  "native-counting-model-v1": {
    preferredToolKey: "NO01SC",
    supportState: "contracted",
    decision: "conditional-go",
    invariantPaths: [
      "groups.membership",
      "groups.memberCount",
      "remainder.count"
    ],
    spatialContractRefs: [
      {
        contractId: "native-element-no01sc-01-v2",
        contractVersion: "2.0.0",
        recordHash:
          "7e2b8402f37df7c9a42aabbfe6a0975eb1622c5578e03d996509053b10f1291b",
        sourceFileSha256: NATIVE_SPATIAL_CATALOG_SOURCE_SHA256
      },
      {
        contractId: "division-grouping-no01sc-01-composition-v2",
        contractVersion: "2.0.0",
        recordHash:
          "2f2cb9234825061829716c1784e03245a04369bb428e37e2272a363cdad5dff6",
        sourceFileSha256: NATIVE_SPATIAL_CATALOG_SOURCE_SHA256
      }
    ],
    releaseBlockers: [
      "V2 native adapter registry must bind the persisted group membership projection",
      "R5 candidate manifest must approve the full lifecycle representative"
    ]
  },
  "native-fraction-model-v1": {
    preferredToolKey: "NO03FM",
    supportState: "contracted",
    decision: "pending",
    invariantPaths: ["whole.parts", "whole.selectedMembership"],
    releaseBlockers: [
      "V2 fraction adapter must bind whole and selected-part state",
      "family-specific reserveBox must be rechecked for one-screen-large-v1"
    ]
  },
  "native-place-value-model-v1": {
    preferredToolKey: "NO04PD",
    supportState: "contracted",
    decision: "pending",
    invariantPaths: ["placeValue.countByPlace", "placeValue.membership"],
    releaseBlockers: [
      "V2 exchange operation and persisted membership projection are not contracted",
      "family-specific reserveBox must be rechecked for the pilot viewport"
    ]
  },
  "native-circle-model-v1": {
    preferredToolKey: "SM07CS",
    supportState: "captured",
    decision: "pending",
    invariantPaths: [
      "circle.center",
      "circle.radius",
      "circle.diameterRelation"
    ],
    releaseBlockers: [
      "circle semantic handle operation has not been isolated and contracted",
      "creation and save/reopen evidence is missing"
    ]
  },
  "native-picture-graph-v1": {
    preferredToolKey: "DP03PG",
    supportState: "captured",
    decision: "pending",
    invariantPaths: [
      "graph.legendUnit",
      "graph.rowCounts",
      "graph.interpretedQuantity"
    ],
    releaseBlockers: [
      "picture graph semantic edit operation is not contracted",
      "family-specific native reserve and round-trip evidence is missing"
    ]
  },
  "native-unit-conversion-v1": {
    preferredToolKey: "NO04NT",
    supportState: "captured",
    decision: "pending",
    invariantPaths: [
      "units.membership",
      "units.totalQuantity",
      "units.exchange"
    ],
    releaseBlockers: [
      "unit exchange operation has only static evidence",
      "candidate NO04NT/NO01SC semantic and spatial comparison is incomplete"
    ]
  }
};

function nativeDefinitionSignature(entry: PilotLedgerEntry): string {
  return canonicalJson({
    version: entry.nativeAffordance.version,
    candidateToolKeys: entry.nativeAffordance.candidateToolKeys,
    requiredOperation: entry.nativeAffordance.requiredOperation,
    semanticState: entry.nativeAffordance.semanticState,
    supportState: entry.nativeAffordance.supportState,
    evidenceIds: entry.nativeAffordance.evidenceIds,
    evidenceRefs: entry.nativeAffordance.evidenceRefs
  });
}

export function buildNativeAffordanceFamilyCatalog(
  entries: readonly PilotLedgerEntry[] = grade3PilotEntries
) {
  const grouped = new Map<string, PilotLedgerEntry[]>();
  for (const entry of entries) {
    const familyId = entry.nativeAffordance.affordanceFamilyId;
    const familyEntries = grouped.get(familyId) ?? [];
    familyEntries.push(entry);
    grouped.set(familyId, familyEntries);
  }

  const families = [...grouped.entries()].map(([familyId, familyEntries]) => {
    const representative = familyEntries[0]!;
    const signature = nativeDefinitionSignature(representative);
    if (familyEntries.some((entry) => nativeDefinitionSignature(entry) !== signature)) {
      throw new Error(`native-affordance-family-drift:${familyId}`);
    }
    const config = familyConfig[familyId];
    if (!config) {
      throw new Error(`native-affordance-family-config-missing:${familyId}`);
    }
    const projection: NativeSemanticStateProjection = {
      invariantPaths: [...config.invariantPaths],
      ignoredPaths: [...ignoredPaths],
      normalization: "viewport-selection-translation-invariant"
    };
    return {
      schemaVersion: "1.0.0" as const,
      affordanceFamilyId: familyId,
      version: representative.nativeAffordance.version,
      mathematicalDecision: representative.nativeAffordance.requiredOperation,
      preferredToolKey: config.preferredToolKey,
      candidateToolKeys: representative.nativeAffordance.candidateToolKeys,
      requiredSemanticOperation: representative.nativeAffordance.requiredOperation,
      semanticStateProjection: projection,
      supportState: config.supportState,
      decision: config.decision,
      evidenceRefs: representative.nativeAffordance.evidenceRefs,
      spatialContractRefs: config.spatialContractRefs ?? [],
      releaseBlockers: [...config.releaseBlockers]
    } satisfies NativeAffordanceFamily;
  });

  return nativeAffordanceFamilyCatalogSchema.parse({
    schemaVersion: "1.0.0",
    families
  });
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return value;
}

const canonicalNativeAffordanceFamilyCatalog = deepFreeze(
  buildNativeAffordanceFamilyCatalog()
);

export const grade3PilotNativeAffordanceFamilyCatalog =
  canonicalNativeAffordanceFamilyCatalog;

export function findNativeAffordanceFamily(
  affordanceFamilyId: string
): NativeAffordanceFamily | undefined {
  const family = canonicalNativeAffordanceFamilyCatalog.families.find(
    (candidate) => candidate.affordanceFamilyId === affordanceFamilyId
  );
  return family ? structuredClone(family) : undefined;
}
