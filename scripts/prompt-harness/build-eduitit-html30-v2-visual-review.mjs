#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import {
  EDUITIT_HTML30_VISUAL_REVIEW_CRITERIA_VERSION,
  eduititHtml30VisualReviewV2Schema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { repositoryRoot } from "../contract-lab/lib/paths.mjs";

const auditPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-reopen-audit.json"
);
const artifactPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json"
);
const capturePolicyVersion = "html30-v2-live-geometry-role-v3";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const inputValue = valueAfter("--input");
if (!inputValue) {
  throw new Error("html30-v2-visual-review:input-required");
}
const inputPath = isAbsolute(inputValue)
  ? inputValue
  : resolve(repositoryRoot, inputValue);
if (!existsSync(inputPath)) {
  throw new Error("html30-v2-visual-review:input-missing");
}

const declaration = readJson(inputPath);
const model = declaration?.reviewer?.model;
if (
  declaration?.schemaVersion !== "1.0.0" ||
  !["gpt-5.6-sol", "claude-opus-5"].includes(model) ||
  declaration?.reviewer?.independentFromOtherReview !== true ||
  declaration?.criteriaVersion !== EDUITIT_HTML30_VISUAL_REVIEW_CRITERIA_VERSION ||
  !Array.isArray(declaration?.observations) ||
  declaration.observations.length !== 30 ||
  !Array.isArray(declaration?.findings)
) {
  throw new Error("html30-v2-visual-review:declaration-invalid");
}

const audit = readJson(auditPath);
const artifact = readJson(artifactPath);
if (
  audit.capturePolicyVersion !== capturePolicyVersion ||
  audit.sourceArtifactContentSha256 !== artifact.contentSha256 ||
  audit.observations?.length !== 30
) {
  throw new Error("html30-v2-visual-review:current-audit-required");
}

const findingById = new Map(
  declaration.findings.map((finding) => [finding.findingId, finding])
);
const observations = declaration.observations.map((reviewed, index) => {
  const observation = audit.observations[index];
  if (observation.sequence !== index + 1) {
    throw new Error("html30-v2-visual-review:observation-order");
  }
  if (
    reviewed.sequence !== observation.sequence ||
    reviewed.projectId !== observation.projectId ||
    reviewed.screenshotSha256 !== observation.screenshotSha256 ||
    !Array.isArray(reviewed.findingIds) ||
    !["PASS", "ITERATE"].includes(reviewed.verdict) ||
    reviewed.findingIds.some((findingId) => {
      const finding = findingById.get(findingId);
      return !finding || !finding.sequences?.includes(reviewed.sequence);
    }) ||
    (reviewed.verdict === "PASS") !== (reviewed.findingIds.length === 0)
  ) {
    throw new Error(`html30-v2-visual-review:review-binding:${index + 1}`);
  }
  const expectedScreenshotPath =
    `research/mathcanvas/evidence/eduitit-html30-v2/${String(index + 1).padStart(2, "0")}.png`;
  if (observation.screenshotPath !== expectedScreenshotPath) {
    throw new Error(`html30-v2-visual-review:screenshot-path:${observation.sequence}`);
  }
  const screenshotPath = join(repositoryRoot, expectedScreenshotPath);
  if (
    !existsSync(screenshotPath) ||
    fileSha256(screenshotPath) !== observation.screenshotSha256
  ) {
    throw new Error(`html30-v2-visual-review:screenshot-drift:${observation.sequence}`);
  }
  return {
    sequence: reviewed.sequence,
    projectId: reviewed.projectId,
    screenshotSha256: reviewed.screenshotSha256,
    verdict: reviewed.verdict,
    findingIds: [...reviewed.findingIds]
  };
});

const findings = declaration.findings;
const body = {
  schemaVersion: "2.0.0",
  reviewId:
    model === "gpt-5.6-sol"
      ? "eduitit-html30-v2-visual-review-sol"
      : "eduitit-html30-v2-visual-review-opus",
  reviewedAt: declaration.reviewedAt,
  reviewer: declaration.reviewer,
  sourceBindings: {
    reopenAuditFileSha256: fileSha256(auditPath),
    compiledCandidateContentSha256: artifact.contentSha256
  },
  criteriaVersion: EDUITIT_HTML30_VISUAL_REVIEW_CRITERIA_VERSION,
  observations,
  findings,
  verdict: findings.length === 0 ? "PASS" : "ITERATE",
  totals: {
    p0: findings.filter((finding) => finding.severity === "P0").length,
    p1: findings.filter((finding) => finding.severity === "P1").length,
    p2: findings.filter((finding) => finding.severity === "P2").length
  }
};
const review = eduititHtml30VisualReviewV2Schema.parse({
  ...body,
  contentSha256: sha256Hex(body)
});
const outputPath = join(
  repositoryRoot,
  model === "gpt-5.6-sol"
    ? "research/mathcanvas/eduitit-html30-v2-visual-review-sol.json"
    : "research/mathcanvas/eduitit-html30-v2-visual-review-opus.json"
);

if (!process.argv.includes("--write")) {
  const current = existsSync(outputPath) ? readJson(outputPath) : null;
  if (current?.contentSha256 !== review.contentSha256) {
    throw new Error("html30-v2-visual-review:artifact-stale");
  }
  process.stdout.write(`PASS ${model} visual review ${review.verdict}\n`);
} else {
  writeFileSync(outputPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  process.stdout.write(`UPDATED ${model} visual review ${review.verdict}\n`);
}
