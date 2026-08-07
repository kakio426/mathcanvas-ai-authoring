#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  nativeSpatialGateStateSchema,
  canPromoteNativeSpatialGate,
  evaluateNativeSpatialRatchet,
  nativeSpatialActivityScopeSchema,
  nativeSpatialContractCatalogSchema,
  collectNativeSpatialIssues
} from "../../packages/contracts/dist/index.js";
import { listRegisteredBlueprints } from "../../packages/templates/dist/index.js";

const root = resolve(import.meta.dirname, "../..");
const statePath = resolve(root, "research/mathcanvas/native-spatial-gate-state.json");
const scopePath = resolve(root, "research/mathcanvas/native-spatial-activity-scope.json");
const catalogPath = resolve(root, "research/mathcanvas/native-spatial-contract-catalog.json");
const state = nativeSpatialGateStateSchema.parse(
  JSON.parse(readFileSync(statePath, "utf8"))
);
const scope = nativeSpatialActivityScopeSchema.parse(
  JSON.parse(readFileSync(scopePath, "utf8"))
);
const catalog = nativeSpatialContractCatalogSchema.parse(
  JSON.parse(readFileSync(catalogPath, "utf8"))
);
const generated = collectNativeSpatialIssues({
  scope,
  catalog,
  blueprints: listRegisteredBlueprints()
});
const ratchet = evaluateNativeSpatialRatchet({
  state,
  issues: generated.issues,
  changedActivityIds: generated.changedActivityIds
});

if (ratchet.blockingIssues.length > 0) {
  throw new Error(
    `native-spatial-ratchet-blocked:${ratchet.blockingIssues
      .map((issue) => `${issue.activityId}:${issue.gateId}:${issue.fingerprint}`)
      .join(",")}`
  );
}

if (state.mode === "hard" && !canPromoteNativeSpatialGate(state, {
  releasedActivityCount: 1,
  executedActivityCount: 1,
  unwaivedIssueCount: state.baselineIssues.length,
  stableGreenRuns: state.stableGreenRuns,
  falsePositiveSamples: state.falsePositiveSamples
})) {
  throw new Error("native-spatial-hard-promotion-criteria-not-met");
}

process.stdout.write(
  `native-spatial-ratchet PASS: mode=${state.mode} changed=${generated.changedActivityIds.length} issues=${generated.issues.length} baseline=${state.baselineIssues.length} waivers=${state.waivers.length}\n`
);
