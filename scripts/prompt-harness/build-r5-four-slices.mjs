#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  oneScreenLayoutProfileSchema,
  r5NativeToolDiscoveryEvidenceSchema,
  r5VerticalSliceSetContentHash,
  r5VerticalSliceSetSchema
} from "../../packages/contracts/dist/index.js";
import { buildR5VerticalSliceSpecs } from "../../packages/templates/dist/index.js";
import { stableJson } from "../contract-lab/lib/normalize.mjs";

const root = resolve(import.meta.dirname, "../..");
const outputPath = resolve(
  root,
  "research/mathcanvas/r5-four-vertical-slices.json"
);
const paths = {
  promptHarness: "research/mathcanvas/eduitit-html30-prompt-harness.json",
  nativeDiscovery: "research/mathcanvas/r5-native-tool-discovery.json",
  oneScreenProfile: "research/mathcanvas/student-one-screen-large-v1.json"
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

function fail(reason) {
  throw new Error(`r5-four-slices-invalid:${reason}`);
}

const promptHarness = json(paths.promptHarness);
const discovery = r5NativeToolDiscoveryEvidenceSchema.parse(
  json(paths.nativeDiscovery)
);
const profile = oneScreenLayoutProfileSchema.parse(json(paths.oneScreenProfile));
const entries = buildR5VerticalSliceSpecs(discovery, profile);

for (const entry of entries) {
  const source = promptHarness.entries?.find(
    (candidate) => candidate.sequence === entry.sequence
  );
  if (
    !source ||
    source.catalogBinding?.catalogEntryId !== entry.catalogEntryId ||
    source.catalogBinding?.snapshotSha256 !== entry.catalogSnapshotSha256 ||
    source.catalogBinding?.alignmentStatus !== "exact" ||
    source.catalogBinding?.availability !== "blocked"
  ) {
    fail(`prompt-harness-binding-${entry.sequence}`);
  }
}

const body = {
  schemaVersion: "1.0.0",
  setId: "r5-four-representation-vertical-slices-v1",
  setVersion: "1.0.0",
  generatedAt: discovery.observedAt,
  sourceBindings: {
    promptHarness: {
      path: paths.promptHarness,
      fileSha256: fileSha256(paths.promptHarness),
      contentSha256: promptHarness.contentSha256
    },
    nativeDiscovery: {
      path: paths.nativeDiscovery,
      fileSha256: fileSha256(paths.nativeDiscovery),
      contentSha256: discovery.contentSha256
    },
    oneScreenProfile: {
      path: paths.oneScreenProfile,
      fileSha256: fileSha256(paths.oneScreenProfile),
      contentSha256: profile.contentSha256
    }
  },
  entries,
  status: "offline-four-slice-review-ready",
  releaseQualified: false
};
const artifact = r5VerticalSliceSetSchema.parse({
  ...body,
  contentSha256: r5VerticalSliceSetContentHash(body)
});
const expected = stableJson(artifact);

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, expected, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(
    `UPDATED R5 four vertical slices ${artifact.entries.length}/4 ${artifact.contentSha256}\n`
  );
} else {
  const actual = readFileSync(outputPath, "utf8");
  if (actual !== expected) fail("artifact-stale");
  process.stdout.write(
    `PASS R5 four vertical slices ${artifact.entries.length}/4 ${artifact.contentSha256}\n`
  );
}
