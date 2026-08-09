#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  nativeSpatialActivityScopeSchema,
  nativeSpatialContractCatalogSchema,
  nativeSpatialContractRecordHash
} from "../../packages/contracts/dist/index.js";
import { findClaimEvidenceBlueprint } from "../../packages/templates/dist/index.js";
import { stableJson } from "../contract-lab/lib/normalize.mjs";

const root = resolve(import.meta.dirname, "../..");
const activityId =
  "number.division.quotient-remainder.claim-evidence-v1";
const scenarioFiles = [
  "research/mathcanvas/division-counting-group-canary.json",
  "research/mathcanvas/division-counting-group-29-by-7-canary.json",
  "research/mathcanvas/division-counting-group-31-by-6-canary.json"
];
const expectedScenarios = new Set(["23-by-4", "29-by-7", "31-by-6"]);
const canaries = scenarioFiles.map((path) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"))
);
const blueprint = findClaimEvidenceBlueprint(activityId);
if (!blueprint) {
  throw new Error("native-spatial-catalog-blueprint-missing");
}

const canonical = canaries.find(
  (canary) => canary?.scenario?.scenarioKey === "31-by-6"
);
if (!canonical) {
  throw new Error("native-spatial-catalog-max-canary-missing");
}
const canonicalLayoutContentHash =
  canonical?.activityCompositionSpatialContractCandidate?.contract
    ?.composition?.layoutContentHash;
for (const canary of canaries) {
  const checks = canary?.environment?.classroomTextClearance?.checks;
  const fixedChromeClearance =
    canary?.environment?.fixedChromeTaskClearance;
  if (
    canary?.schemaVersion !== "2.0.0" ||
    canary?.activityId !== activityId ||
    !expectedScenarios.delete(canary?.scenario?.scenarioKey) ||
    canary?.productContract?.blueprintContentHash !== blueprint.contentHash ||
    canary?.layoutRevision !== canonical.layoutRevision ||
    canary?.activityCompositionSpatialContractCandidate?.contract
      ?.composition?.layoutContentHash !== canonicalLayoutContentHash ||
    canary?.environment?.servedAssetEvidence?.sha256 !==
      canonical.environment.servedAssetEvidence.sha256 ||
    canary?.environment?.nativeOverlayIntersectionCount !== 0 ||
    !checks ||
    Object.values(checks).some((passed) => passed !== true) ||
    fixedChromeClearance?.stableAfterReopen !== true ||
    Object.values(fixedChromeClearance?.initial?.checks ?? {}).length !== 3 ||
    Object.values(fixedChromeClearance.initial.checks).some(
      (passed) => passed !== true
    ) ||
    Object.values(fixedChromeClearance?.reopened?.checks ?? {}).length !== 3 ||
    Object.values(fixedChromeClearance.reopened.checks).some(
      (passed) => passed !== true
    )
  ) {
    throw new Error(
      `native-spatial-catalog-scenario-evidence-invalid:${canary?.scenario?.scenarioKey ?? "unknown"}`
    );
  }
}
if (expectedScenarios.size > 0) {
  throw new Error("native-spatial-catalog-scenario-suite-incomplete");
}

const intrinsicCandidate = canonical.intrinsicSpatialContractCandidate;
const compositionCandidate =
  canonical.activityCompositionSpatialContractCandidate;
if (
  intrinsicCandidate?.contract?.contractKind !== "intrinsic-element" ||
  compositionCandidate?.contract?.contractKind !== "activity-composition" ||
  compositionCandidate.contract.composition.blueprintContentHash !==
    blueprint.contentHash ||
  compositionCandidate.contract.composition.layoutContentHash !==
    canonicalLayoutContentHash ||
  compositionCandidate.contract.composition.layoutPresetId !==
    blueprint.layout.tokenSet
) {
  throw new Error("native-spatial-catalog-contract-binding-invalid");
}

const intrinsicBody = {
  recordKind: "intrinsic-element",
  contractVersion: intrinsicCandidate.contractVersion,
  contract: intrinsicCandidate.contract,
  evidence: intrinsicCandidate.evidence,
  upstreamContracts: []
};
const intrinsicRecord = {
  ...intrinsicBody,
  recordHash: nativeSpatialContractRecordHash(intrinsicBody)
};
const compositionBody = {
  recordKind: "activity-composition",
  contractVersion: compositionCandidate.contractVersion,
  contract: compositionCandidate.contract,
  evidence: compositionCandidate.evidence,
  upstreamContracts: [
    {
      contractId: intrinsicRecord.contract.contractId,
      contractVersion: intrinsicRecord.contractVersion,
      recordHash: intrinsicRecord.recordHash
    }
  ]
};
const catalog = nativeSpatialContractCatalogSchema.parse({
  schemaVersion: "2.0.0",
  records: [
    intrinsicRecord,
    {
      ...compositionBody,
      recordHash: nativeSpatialContractRecordHash(compositionBody)
    }
  ]
});
const scope = nativeSpatialActivityScopeSchema.parse({
  schemaVersion: "1.0.0",
  entries: [
    {
      activityId,
      blueprintContentHash: blueprint.contentHash
    }
  ]
});

writeFileSync(
  resolve(root, "research/mathcanvas/native-spatial-contract-catalog.json"),
  stableJson(catalog),
  { encoding: "utf8", mode: 0o600 }
);
writeFileSync(
  resolve(root, "research/mathcanvas/native-spatial-activity-scope.json"),
  stableJson(scope),
  { encoding: "utf8", mode: 0o600 }
);

process.stdout.write(
  `native spatial catalog updated: schema=2.0.0 scenarios=3 blueprint=${blueprint.contentHash}\n`
);
