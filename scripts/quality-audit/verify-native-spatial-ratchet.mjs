#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  nativeSpatialGateStateSchema,
  canPromoteNativeSpatialGate,
  evaluateNativeSpatialRatchet
} from "../../packages/contracts/dist/index.js";

const root = resolve(import.meta.dirname, "../..");
const path = resolve(root, "research/mathcanvas/native-spatial-gate-state.json");
const state = nativeSpatialGateStateSchema.parse(
  JSON.parse(readFileSync(path, "utf8"))
);
const ratchet = evaluateNativeSpatialRatchet({
  state,
  issues: state.currentIssues,
  changedActivityIds: state.changedActivityIds
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
  `native-spatial-ratchet PASS: mode=${state.mode} baseline=${state.baselineIssues.length} waivers=${state.waivers.length}\n`
);
