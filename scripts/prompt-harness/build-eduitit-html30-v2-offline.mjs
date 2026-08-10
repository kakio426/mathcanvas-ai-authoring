#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  eduititHtml30OfflineDesignContentHashV2,
  eduititHtml30OfflineDesignV2Schema
} from "../../packages/contracts/dist/index.js";
import {
  buildEduititHtml30ReserveCandidatesV2,
  resolveEduititHtml30LayoutCandidateV2
} from "../../packages/mathcanvas-compiler/dist/index.js";
import { buildEduititHtml30ActivitySpecsV2 } from "../../packages/templates/dist/index.js";
import { stableJson } from "../contract-lab/lib/normalize.mjs";

const root = resolve(import.meta.dirname, "../..");
const outputPath = resolve(
  root,
  "research/mathcanvas/eduitit-html30-v2-offline-design.json"
);
const sourcePaths = {
  promptHarness: "research/mathcanvas/eduitit-html30-prompt-harness.json",
  activityContract: "packages/contracts/src/catalog/eduitit-html30-v2.ts",
  layoutContract: "packages/contracts/src/catalog/eduitit-html30-layout-v2.ts",
  offlineContract: "packages/contracts/src/catalog/eduitit-html30-offline-v2.ts",
  activityTemplate: "packages/templates/src/eduitit-html30-v2.ts",
  reserveBuilder:
    "packages/mathcanvas-compiler/src/resolve/eduitit-html30-reserve-candidates-v2.ts",
  layoutResolver:
    "packages/mathcanvas-compiler/src/resolve/eduitit-html30-layout-v2.ts",
  artifactBuilder: "scripts/prompt-harness/build-eduitit-html30-v2-offline.mjs"
};

function bytes(path) {
  return readFileSync(resolve(root, path));
}

function json(path) {
  return JSON.parse(bytes(path).toString("utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(bytes(path)).digest("hex");
}

function pinnedFile(path) {
  return { path, fileSha256: fileSha256(path) };
}

function fail(reason) {
  throw new Error(`eduitit-html30-v2-offline-invalid:${reason}`);
}

const promptHarness = json(sourcePaths.promptHarness);
const activities = buildEduititHtml30ActivitySpecsV2(promptHarness);
const reserves = buildEduititHtml30ReserveCandidatesV2(activities);
const layouts = activities.map((activity, index) =>
  resolveEduititHtml30LayoutCandidateV2(activity, reserves[index])
);
const minimumEdgeClearanceCssPx = Math.min(
  ...layouts.flatMap((layout) =>
    layout.placements.map((placement) => placement.minimumEdgeClearanceCssPx)
  )
);

const body = {
  schemaVersion: "1.0.0",
  artifactId: "eduitit-html30-native-first-offline-design-v2",
  artifactVersion: "1.0.0",
  sourceBindings: {
    promptHarness: {
      ...pinnedFile(sourcePaths.promptHarness),
      contentSha256: promptHarness.contentSha256
    },
    activityContract: pinnedFile(sourcePaths.activityContract),
    layoutContract: pinnedFile(sourcePaths.layoutContract),
    offlineContract: pinnedFile(sourcePaths.offlineContract),
    activityTemplate: pinnedFile(sourcePaths.activityTemplate),
    reserveBuilder: pinnedFile(sourcePaths.reserveBuilder),
    layoutResolver: pinnedFile(sourcePaths.layoutResolver),
    artifactBuilder: pinnedFile(sourcePaths.artifactBuilder)
  },
  activities,
  reserves,
  layouts,
  attestation: {
    exactActivityCount: 30,
    allSourceBindingsExact: true,
    allOneProblem: true,
    allAtMathCanvas100Percent: true,
    allForbiddenRegionsAbsent: true,
    allToolsPreplaced: true,
    allKeyboardModifiersAbsent: true,
    allCanonicalGroupsPersisted: true,
    allToolBindingsExact: true,
    allEstimatedReserveStatesContained: true,
    actualReserveStatesVerified: false,
    allReserveUnionsCentered: true,
    allNativeAutoScaleDisabled: true,
    minimumEdgeClearanceCssPx,
    externalWriteAllowed: false,
    canonicalPayloadsGenerated: false,
    liveValidationPending: true,
    releaseQualified: false,
    blockers: [
      "canonical native payload compilation is pending",
      "live 100-percent editor geometry confirmation is pending",
      "actual initial-selected-manipulated reserve capture is pending",
      "save-reopen and fresh visual review are pending"
    ]
  }
};
const artifact = eduititHtml30OfflineDesignV2Schema.parse({
  ...body,
  contentSha256: eduititHtml30OfflineDesignContentHashV2(body)
});
const expected = stableJson(artifact);

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, expected, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(
    `UPDATED Eduitit HTML30 V2 offline design ${activities.length}/30 clearance=${minimumEdgeClearanceCssPx.toFixed(3)} ${artifact.contentSha256}\n`
  );
} else {
  let actual;
  try {
    actual = readFileSync(outputPath, "utf8");
  } catch {
    fail("artifact-missing");
  }
  if (actual !== expected) fail("artifact-stale");
  process.stdout.write(
    `PASS Eduitit HTML30 V2 offline design ${activities.length}/30 clearance=${minimumEdgeClearanceCssPx.toFixed(3)} ${artifact.contentSha256}\n`
  );
}
