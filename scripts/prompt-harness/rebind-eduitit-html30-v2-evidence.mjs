#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex } from "../../packages/contracts/dist/index.js";
import { repositoryRoot } from "../contract-lab/lib/paths.mjs";

const artifactPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json"
);
const manifestPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-created-projects.json"
);
const auditPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-reopen-audit.json"
);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fail(code, sequence = "") {
  throw new Error(`html30-v2-evidence-rebind:${code}${sequence ? `:${sequence}` : ""}`);
}

const artifact = readJson(artifactPath);
const manifest = readJson(manifestPath);
const audit = readJson(auditPath);
const { contentSha256, ...artifactBody } = artifact;
if (
  contentSha256 !== sha256Hex(artifactBody) ||
  artifact.candidates?.length !== 30 ||
  manifest.projects?.length !== 30 ||
  manifest.completed !== true ||
  audit.observations?.length !== 30 ||
  audit.reopenedCount !== 30 ||
  audit.basicPassCount !== 30
) {
  fail("exact-current-30-required");
}

const projectBySequence = new Map(
  manifest.projects.map((project) => [project.sequence, project])
);
const observationBySequence = new Map(
  audit.observations.map((observation) => [observation.sequence, observation])
);
for (const candidate of artifact.candidates) {
  const project = projectBySequence.get(candidate.sequence);
  const observation = observationBySequence.get(candidate.sequence);
  const screenshotPath = observation?.screenshotPath?.startsWith("/")
    ? observation.screenshotPath
    : join(repositoryRoot, observation?.screenshotPath ?? "");
  if (
    !project ||
    !observation ||
    project.activityId !== candidate.activityId ||
    project.payloadHash !== candidate.payloadHash ||
    observation.projectId !== project.projectId ||
    observation.expectedPayloadHash !== candidate.payloadHash ||
    observation.sourceLayoutContentSha256 !== candidate.sourceLayoutContentSha256 ||
    observation.reopened !== true ||
    observation.persistedPayloadEquivalent !== true ||
    observation.outOfSafeTaskIds?.length !== 0 ||
    observation.chromeOverlapTaskIds?.length !== 0 ||
    observation.nativeOutOfContentIds?.length !== 0 ||
    observation.answerOutOfBandIds?.length !== 0 ||
    !existsSync(screenshotPath) ||
    fileSha256(screenshotPath) !== observation.screenshotSha256
  ) {
    fail("payload-layout-screenshot-drift", String(candidate.sequence));
  }
}

if (!process.argv.includes("--write")) {
  process.stdout.write(`PASS HTML30 V2 evidence rebind 30/30 ${contentSha256}\n`);
  process.exit(0);
}

const reboundAt = new Date().toISOString();
const nextManifest = {
  ...manifest,
  sourceArtifactContentSha256: contentSha256,
  evidenceReboundAt: reboundAt
};
const nextAudit = {
  ...audit,
  sourceArtifactContentSha256: contentSha256,
  evidenceReboundAt: reboundAt
};
writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
writeFileSync(auditPath, `${JSON.stringify(nextAudit, null, 2)}\n`, "utf8");
process.stdout.write(`UPDATED HTML30 V2 evidence rebind 30/30 ${contentSha256}\n`);
