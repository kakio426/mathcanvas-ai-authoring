#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  eduititHtml30ReleaseAttestationV2Schema,
  eduititHtml30VisualReviewV2Schema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { repositoryRoot } from "../contract-lab/lib/paths.mjs";
import { verifyEduititHtml30LifecycleEvidence } from "./lib/verify-eduitit-html30-v2-lifecycle.mjs";

const artifactPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json");
const offlinePath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-offline-design.json");
const harnessPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-prompt-harness.json");
const manifestPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-created-projects.json");
const auditPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-reopen-audit.json");
const outputPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-release-attestation.json");
const lifecycleRelativePath =
  "research/mathcanvas/eduitit-html30-v2-native-lifecycle-evidence.json";
const lifecyclePath = join(repositoryRoot, lifecycleRelativePath);
const reviewPaths = [
  "research/mathcanvas/eduitit-html30-v2-visual-review-sol.json",
  "research/mathcanvas/eduitit-html30-v2-visual-review-opus.json"
];
const capturePolicyVersion = "html30-v2-live-geometry-role-v3";
const peerOverlapToleranceCssPx = 1.5;
const peerMinimumClearanceCssPx = 16;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fail(code, detail = "") {
  throw new Error(`html30-v2-attestation:${code}${detail ? `:${detail}` : ""}`);
}

function contentBoundReview(relativePath, auditFileSha256, artifactContentSha256) {
  const path = join(repositoryRoot, relativePath);
  if (!existsSync(path)) fail("visual-review-missing", relativePath);
  const raw = readJson(path);
  const parsed = eduititHtml30VisualReviewV2Schema.parse(raw);
  const { contentSha256, ...body } = parsed;
  if (
    contentSha256 !== sha256Hex(body) ||
    parsed.sourceBindings.reopenAuditFileSha256 !== auditFileSha256 ||
    parsed.sourceBindings.compiledCandidateContentSha256 !== artifactContentSha256
  ) {
    fail("visual-review-binding-drift", relativePath);
  }
  return { relativePath, path, review: parsed };
}

function decisionGatePass(activity) {
  const contract = activity?.nativePlan?.decisionContract;
  if (
    !contract ||
    contract.initiallyUnresolved !== true ||
    contract.lockedAnswerExposed !== false ||
    contract.distinguishablePossibilityCount < 3 ||
    typeof contract.plausibleWrongPath !== "string" ||
    contract.plausibleWrongPath.length < 12
  ) {
    return false;
  }
  if (contract.mode === "movable-subset") {
    return (
      contract.solutionUsesFewerMovableUnitsThanSupplied === true &&
      contract.rejectableUnitIds?.length > 0 &&
      contract.suppliedMovableUnitCount === activity.nativePlan.movableUnits.length
    );
  }
  if (contract.mode === "native-state-space") {
    return (
      contract.reachableStateWitnesses?.length >= 3 &&
      new Set(contract.reachableStateWitnesses.map((state) => JSON.stringify(state))).size ===
        contract.reachableStateWitnesses.length
    );
  }
  return false;
}

const artifact = readJson(artifactPath);
const offline = readJson(offlinePath);
const harness = readJson(harnessPath);
const manifest = readJson(manifestPath);
const audit = readJson(auditPath);
const { contentSha256: artifactContentSha256, ...artifactBody } = artifact;
if (
  artifactContentSha256 !== sha256Hex(artifactBody) ||
  artifact.candidates?.length !== 30 ||
  offline.activities?.length !== 30 ||
  offline.contentSha256 !== artifact.sourceBindings?.offlineDesign?.contentSha256 ||
  harness.contentSha256 !== artifact.sourceBindings?.promptHarness?.contentSha256 ||
  manifest.sourceArtifactContentSha256 !== artifactContentSha256 ||
  audit.sourceArtifactContentSha256 !== artifactContentSha256 ||
  manifest.projects?.length !== 30 ||
  audit.observations?.length !== 30
) {
  fail("current-exact-30-required");
}

for (const binding of Object.values(artifact.sourceBindings ?? {})) {
  const path = join(repositoryRoot, binding.path ?? "");
  if (!existsSync(path) || fileSha256(path) !== binding.fileSha256) {
    fail("artifact-source-drift", binding.path ?? "unknown");
  }
}

const auditFileSha256 = fileSha256(auditPath);
const reviews = reviewPaths.map((path) =>
  contentBoundReview(path, auditFileSha256, artifactContentSha256)
);
if (new Set(reviews.map(({ review }) => review.reviewer.model)).size !== 2) {
  fail("two-independent-model-reviews-required");
}
if (new Set(reviews.map(({ review }) => review.reviewer.sessionId)).size !== 2) {
  fail("two-independent-review-sessions-required");
}

const projectBySequence = new Map(manifest.projects.map((entry) => [entry.sequence, entry]));
const activityBySequence = new Map(offline.activities.map((entry) => [entry.sequence, entry]));
const reviewObservationByModel = new Map(
  reviews.map(({ review }) => [
    review.reviewer.model,
    new Map(review.observations.map((entry) => [entry.sequence, entry]))
  ])
);

let lifecycleEvidence = null;
if (existsSync(lifecyclePath)) {
  lifecycleEvidence = verifyEduititHtml30LifecycleEvidence({
    repositoryRoot,
    lifecyclePath,
    artifact,
    offline,
    manifest
  });
}

const screenshotEvidence = audit.observations.map((observation, index) => {
  const candidate = artifact.candidates[observation.sequence - 1];
  const project = projectBySequence.get(observation.sequence);
  const expectedScreenshotPath =
    `research/mathcanvas/evidence/eduitit-html30-v2/${String(index + 1).padStart(2, "0")}.png`;
  const screenshotPath = join(repositoryRoot, expectedScreenshotPath);
  if (
    observation.sequence !== index + 1 ||
    observation.screenshotPath !== expectedScreenshotPath ||
    !candidate ||
    candidate.sequence !== observation.sequence ||
    !project ||
    project.payloadHash !== candidate.payloadHash ||
    observation.projectId !== project.projectId ||
    observation.expectedPayloadHash !== candidate.payloadHash ||
    observation.sourceLayoutContentSha256 !== candidate.sourceLayoutContentSha256 ||
    !existsSync(screenshotPath) ||
    fileSha256(screenshotPath) !== observation.screenshotSha256
  ) {
    fail("observation-drift", String(observation.sequence));
  }
  for (const observations of reviewObservationByModel.values()) {
    const reviewed = observations.get(observation.sequence);
    if (
      !reviewed ||
      reviewed.projectId !== observation.projectId ||
      reviewed.screenshotSha256 !== observation.screenshotSha256
    ) {
      fail("review-screenshot-drift", String(observation.sequence));
    }
  }
  return {
    sequence: observation.sequence,
    projectId: observation.projectId,
    screenshotSha256: observation.screenshotSha256
  };
});

const actualMathCanvas100Percent = audit.observations.every(
  (entry) =>
    entry.screenCtmMatched === true &&
    entry.viewport?.width === 1280 &&
    entry.viewport?.height === 800
);
const oneProblemNoScroll = audit.observations.every(
  (entry) => entry.bodyScroll?.width === 1280 && entry.bodyScroll?.height === 800
);
const authoredPayloadSaveReopen = audit.observations.every(
  (entry) => entry.reopened === true && entry.persistedPayloadEquivalent === true
);
const fixedChromeContentAndPeerNonOverlap = audit.observations.every(
  (entry) =>
    entry.capturePolicyVersion === capturePolicyVersion &&
    entry.outOfSafeTaskIds?.length === 0 &&
    entry.chromeOverlapTaskIds?.length === 0 &&
    entry.nativeOutOfContentIds?.length === 0 &&
    entry.answerOutOfBandIds?.length === 0 &&
    entry.peerOverlapToleranceCssPx === peerOverlapToleranceCssPx &&
    Array.isArray(entry.missingMovableRootIds) &&
    entry.missingMovableRootIds.length === 0 &&
    Array.isArray(entry.peerOverlapPairs) &&
    entry.peerOverlapPairs.length === 0 &&
    entry.peerMinimumClearanceCssPx === peerMinimumClearanceCssPx &&
    Array.isArray(entry.peerClearanceViolations) &&
    entry.peerClearanceViolations.length === 0
);
const mathematicalDecisionAlternatives =
  new Set(
    offline.activities.map(
      (entry) => entry.nativePlan.decisionContract.plausibleWrongPath
    )
  ).size === 30 &&
  offline.activities.every(decisionGatePass) &&
  artifact.candidates.every(
    (candidate) =>
      candidate.initialTextLeakageAudit?.policyVersion ===
        "html30-v2-initial-answer-leakage-v2" &&
      candidate.initialTextLeakageAudit?.passed === true &&
      candidate.initialTextLeakageAudit?.violations?.length === 0
  );
const actualNativeLifecycle = lifecycleEvidence?.verdict === "PASS";
const freshIndependentVisualReviews = reviews.every(
  ({ review }) =>
    review.verdict === "PASS" &&
    review.totals.p0 === 0 &&
    review.totals.p1 === 0 &&
    review.totals.p2 === 0
);

const gates = {
  actualMathCanvas100Percent,
  oneProblemNoScroll,
  authoredPayloadSaveReopen,
  fixedChromeContentAndPeerNonOverlap,
  mathematicalDecisionAlternatives,
  actualNativeLifecycle,
  freshIndependentVisualReviews
};

const releaseQualifiedSequences = audit.observations
  .filter((observation) => {
    const activity = activityBySequence.get(observation.sequence);
    return (
      gates.actualMathCanvas100Percent &&
      gates.oneProblemNoScroll &&
      gates.authoredPayloadSaveReopen &&
      gates.actualNativeLifecycle &&
      observation.capturePolicyVersion === capturePolicyVersion &&
      observation.outOfSafeTaskIds?.length === 0 &&
      observation.chromeOverlapTaskIds?.length === 0 &&
      observation.nativeOutOfContentIds?.length === 0 &&
      observation.answerOutOfBandIds?.length === 0 &&
      observation.peerOverlapToleranceCssPx === peerOverlapToleranceCssPx &&
      observation.missingMovableRootIds?.length === 0 &&
      observation.peerOverlapPairs?.length === 0 &&
      observation.peerMinimumClearanceCssPx === peerMinimumClearanceCssPx &&
      observation.peerClearanceViolations?.length === 0 &&
      decisionGatePass(activity) &&
      reviews.every(({ review }) =>
        review.observations[observation.sequence - 1]?.verdict === "PASS"
      )
    );
  })
  .map((entry) => entry.sequence);

const blockers = [
  ...Object.entries(gates)
    .filter(([, passed]) => !passed)
    .map(([gate]) => `gate-failed:${gate}`),
  ...reviews.flatMap(({ review }) =>
    review.findings.map((finding) =>
      `${review.reviewer.model}:${finding.severity}:${finding.findingId}`
    )
  )
];

const currentAttestation = existsSync(outputPath) ? readJson(outputPath) : null;
const reviewBindings = reviews.map(({ relativePath, path, review }) => ({
  model: review.reviewer.model,
  path: relativePath,
  fileSha256: fileSha256(path),
  contentSha256: review.contentSha256,
  sessionId: review.reviewer.sessionId,
  verdict: review.verdict
}));
const sourceBindings = {
  compiledCandidateContentSha256: artifactContentSha256,
  offlineDesignContentSha256: offline.contentSha256,
  promptHarnessContentSha256: harness.contentSha256,
  projectManifestFileSha256: fileSha256(manifestPath),
  reopenAuditFileSha256: auditFileSha256,
  lifecycleEvidence: lifecycleEvidence
    ? {
        path: lifecycleRelativePath,
        fileSha256: fileSha256(lifecyclePath),
        contentSha256: lifecycleEvidence.contentSha256,
        verdict: lifecycleEvidence.verdict
      }
    : null,
  visualReviews: reviewBindings
};
const sameSources =
  currentAttestation?.schemaVersion === "2.1.0" &&
  JSON.stringify(currentAttestation.sourceBindings) === JSON.stringify(sourceBindings);
const body = {
  schemaVersion: "2.1.0",
  attestationId: "eduitit-html30-v2-release-attestation",
  attestedAt: sameSources ? currentAttestation.attestedAt : new Date().toISOString(),
  sourceBindings,
  exactActivityCount: 30,
  gates,
  screenshotEvidence,
  releaseQualifiedSequences,
  releaseQualifiedCount: releaseQualifiedSequences.length,
  linkSyncAllowed:
    Object.values(gates).every(Boolean) &&
    releaseQualifiedSequences.length === 30 &&
    blockers.length === 0,
  blockers
};
const attestation = eduititHtml30ReleaseAttestationV2Schema.parse({
  ...body,
  contentSha256: sha256Hex(body)
});

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");
  process.stdout.write(
    `UPDATED HTML30 V2 attestation ${attestation.releaseQualifiedCount}/30 ${attestation.contentSha256}\n`
  );
} else {
  if (!currentAttestation || currentAttestation.contentSha256 !== attestation.contentSha256) {
    fail("attestation-stale");
  }
  process.stdout.write(
    `PASS HTML30 V2 attestation ${attestation.releaseQualifiedCount}/30 ${attestation.contentSha256}\n`
  );
}
