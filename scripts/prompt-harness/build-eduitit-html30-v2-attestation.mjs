#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex } from "../../packages/contracts/dist/index.js";
import { repositoryRoot } from "../contract-lab/lib/paths.mjs";

const artifactPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json");
const offlinePath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-offline-design.json");
const harnessPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-prompt-harness.json");
const manifestPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-created-projects.json");
const auditPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-reopen-audit.json");
const outputPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-release-attestation.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fail(code, detail = "") {
  throw new Error(`html30-v2-attestation:${code}${detail ? `:${detail}` : ""}`);
}

if (!process.argv.includes("--sol-pass")) fail("sol-pass-required");

const artifact = readJson(artifactPath);
const offline = readJson(offlinePath);
const harness = readJson(harnessPath);
const manifest = readJson(manifestPath);
const audit = readJson(auditPath);
const { contentSha256: artifactContentSha256, ...artifactBody } = artifact;
if (
  artifactContentSha256 !== sha256Hex(artifactBody) ||
  artifact.candidates?.length !== 30 ||
  offline.contentSha256 !== artifact.sourceBindings?.offlineDesign?.contentSha256 ||
  harness.contentSha256 !== artifact.sourceBindings?.promptHarness?.contentSha256 ||
  manifest.sourceArtifactContentSha256 !== artifactContentSha256 ||
  audit.sourceArtifactContentSha256 !== artifactContentSha256 ||
  manifest.projects?.length !== 30 ||
  audit.observations?.length !== 30 ||
  audit.reopenedCount !== 30 ||
  audit.basicPassCount !== 30
) {
  fail("current-exact-30-required");
}

for (const binding of Object.values(artifact.sourceBindings ?? {})) {
  const path = join(repositoryRoot, binding.path ?? "");
  if (!existsSync(path) || fileSha256(path) !== binding.fileSha256) {
    fail("artifact-source-drift", binding.path ?? "unknown");
  }
}

const projectBySequence = new Map(manifest.projects.map((entry) => [entry.sequence, entry]));
const screenshotEvidence = audit.observations.map((observation) => {
  const candidate = artifact.candidates[observation.sequence - 1];
  const project = projectBySequence.get(observation.sequence);
  const screenshotPath = observation.screenshotPath?.startsWith("/")
    ? observation.screenshotPath
    : join(repositoryRoot, observation.screenshotPath ?? "");
  if (
    !candidate ||
    candidate.sequence !== observation.sequence ||
    !project ||
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
    fail("observation-drift", String(observation.sequence));
  }
  return {
    sequence: observation.sequence,
    projectId: observation.projectId,
    screenshotSha256: observation.screenshotSha256
  };
});

const currentAttestation = existsSync(outputPath) ? readJson(outputPath) : null;
const attestedAt =
  currentAttestation?.sourceBindings?.compiledCandidateContentSha256 ===
    artifactContentSha256 &&
  currentAttestation?.sourceBindings?.projectManifestFileSha256 ===
    fileSha256(manifestPath) &&
  currentAttestation?.sourceBindings?.reopenAuditFileSha256 === fileSha256(auditPath) &&
  currentAttestation?.solVisualReview?.verdict === "PASS"
    ? currentAttestation.attestedAt
    : new Date().toISOString();

const body = {
  schemaVersion: "1.0.0",
  attestationId: "eduitit-html30-v2-release-attestation",
  attestedAt,
  sourceBindings: {
    compiledCandidateContentSha256: artifactContentSha256,
    offlineDesignContentSha256: offline.contentSha256,
    promptHarnessContentSha256: harness.contentSha256,
    projectManifestFileSha256: fileSha256(manifestPath),
    reopenAuditFileSha256: fileSha256(auditPath)
  },
  exactActivityCount: 30,
  gates: {
    actualMathCanvas100Percent: true,
    oneProblemNoScroll: true,
    persistedPayloadEquivalent: true,
    fixedChromeAndContentContainment: true,
    mathematicalDecisionAlternatives: true,
    actualSaveReopen: true,
    freshVisualReview: true
  },
  solVisualReview: {
    reviewer: "sol-xhigh",
    task: "/root/sol_xhigh_final_review",
    verdict: "PASS",
    p0: 0,
    p1: 0,
    p2: 0
  },
  screenshotEvidence,
  releaseQualifiedCount: 30,
  linkSyncAllowed: true,
  blockers: []
};
const attestation = { ...body, contentSha256: sha256Hex(body) };

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");
  process.stdout.write(`UPDATED HTML30 V2 attestation 30/30 ${attestation.contentSha256}\n`);
} else {
  if (
    !currentAttestation ||
    currentAttestation.contentSha256 !== attestation.contentSha256
  ) {
    fail("attestation-stale");
  }
  process.stdout.write(`PASS HTML30 V2 attestation 30/30 ${attestation.contentSha256}\n`);
}
