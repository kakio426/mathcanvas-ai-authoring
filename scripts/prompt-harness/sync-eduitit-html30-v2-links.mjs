#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  eduititHtml30ReleaseAttestationV2Schema,
  eduititHtml30VisualReviewV2Schema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import {
  canonicalJson,
  packageManifestAuthoringBinding,
  sha256
} from "./eduitit-html30.mjs";
import { verifyEduititHtml30LifecycleEvidence } from "./lib/verify-eduitit-html30-v2-lifecycle.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..", "..");
const eduititRoot = resolve(repositoryRoot, "..", "..", "eduitit");
const harnessPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-prompt-harness.json");
const artifactPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json");
const offlinePath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-offline-design.json");
const projectsPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-created-projects.json");
const auditPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-reopen-audit.json");
const attestationPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-release-attestation.json");
const reportPath = join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-link-sync.json");
const bundleRoot = join(eduititRoot, "edu_materials/static/edu_materials/lesson_bundles");
const editorUrlPattern = /^https:\/\/mathcanvas\.vivasam\.com\/ko\/view\/([A-Za-z0-9_-]+)$/;
const anchorPattern = /<a\b[^>]*href="https:\/\/mathcanvas\.vivasam\.com\/ko\/view\/[^"]+"[^>]*>MathCanvas에서 열기<\/a>/g;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function fail(code, detail = "") {
  throw new Error(`html30-v2-link-sync:${code}${detail ? `:${detail}` : ""}`);
}

if (!process.argv.includes("--execute")) fail("explicit-execute-required");
const expectedAttestationSha = argument("--attestation-sha");
if (!/^[a-f0-9]{64}$/.test(expectedAttestationSha ?? "")) {
  fail("attestation-sha-required");
}

const harness = readJson(harnessPath);
const artifact = readJson(artifactPath);
const offline = readJson(offlinePath);
const projects = readJson(projectsPath);
const audit = readJson(auditPath);
const attestation = eduititHtml30ReleaseAttestationV2Schema.parse(
  readJson(attestationPath)
);
const { contentSha256: artifactContentSha256, ...artifactBody } = artifact;
const { contentSha256: attestationContentSha256, ...attestationBody } = attestation;
const lifecycleBinding = attestation.sourceBindings.lifecycleEvidence;
const lifecycleBindingInvalid = (() => {
  if (!lifecycleBinding || lifecycleBinding.verdict !== "PASS") return true;
  const path = join(repositoryRoot, lifecycleBinding.path);
  if (!existsSync(path) || fileSha256(path) !== lifecycleBinding.fileSha256) return true;
  try {
    const parsed = verifyEduititHtml30LifecycleEvidence({
      repositoryRoot,
      lifecyclePath: path,
      artifact,
      offline,
      manifest: projects
    });
    return (
      parsed.contentSha256 !== lifecycleBinding.contentSha256 ||
      parsed.verdict !== "PASS"
    );
  } catch {
    return true;
  }
})();
if (
  artifactContentSha256 !== sha256Hex(artifactBody) ||
  attestationContentSha256 !== expectedAttestationSha ||
  attestationContentSha256 !== sha256Hex(attestationBody) ||
  attestation.sourceBindings?.compiledCandidateContentSha256 !== artifactContentSha256 ||
  attestation.sourceBindings?.promptHarnessContentSha256 !== harness.contentSha256 ||
  attestation.sourceBindings?.projectManifestFileSha256 !== fileSha256(projectsPath) ||
  attestation.sourceBindings?.reopenAuditFileSha256 !== fileSha256(auditPath) ||
  !Object.values(attestation.gates).every(Boolean) ||
  lifecycleBindingInvalid ||
  attestation.sourceBindings.visualReviews.length !== 2 ||
  attestation.sourceBindings.visualReviews.some((review) => {
    const path = join(repositoryRoot, review.path);
    if (review.verdict !== "PASS" || !existsSync(path) || fileSha256(path) !== review.fileSha256) {
      return true;
    }
    try {
      const parsed = eduititHtml30VisualReviewV2Schema.parse(readJson(path));
      const { contentSha256, ...body } = parsed;
      return (
        contentSha256 !== sha256Hex(body) ||
        contentSha256 !== review.contentSha256 ||
        parsed.reviewer.model !== review.model ||
        parsed.reviewer.sessionId !== review.sessionId ||
        parsed.verdict !== review.verdict
      );
    } catch {
      return true;
    }
  }) ||
  attestation.releaseQualifiedCount !== 30 ||
  attestation.linkSyncAllowed !== true ||
  attestation.blockers?.length !== 0 ||
  harness.entries?.length !== 30 ||
  artifact.candidates?.length !== 30 ||
  projects.projects?.length !== 30 ||
  projects.completed !== true ||
  projects.sourceArtifactContentSha256 !== artifactContentSha256 ||
  audit.observations?.length !== 30 ||
  audit.reopenedCount !== 30 ||
  audit.basicPassCount !== 30 ||
  audit.sourceArtifactContentSha256 !== artifactContentSha256
) {
  fail("current-release-attestation-required");
}

const candidateBySequence = new Map(artifact.candidates.map((entry) => [entry.sequence, entry]));
const projectBySequence = new Map(projects.projects.map((entry) => [entry.sequence, entry]));
const observationBySequence = new Map(audit.observations.map((entry) => [entry.sequence, entry]));
const screenshotBySequence = new Map(
  attestation.screenshotEvidence.map((entry) => [entry.sequence, entry])
);
const pendingWrites = [];

for (const source of [...harness.entries].sort((left, right) => left.sequence - right.sequence)) {
  const candidate = candidateBySequence.get(source.sequence);
  const project = projectBySequence.get(source.sequence);
  const observation = observationBySequence.get(source.sequence);
  const screenshot = screenshotBySequence.get(source.sequence);
  const urlMatch = project?.url?.match(editorUrlPattern);
  if (
    !candidate ||
    !project ||
    !observation ||
    !screenshot ||
    candidate.activityId !== project.activityId ||
    candidate.payloadHash !== project.payloadHash ||
    observation.projectId !== project.projectId ||
    observation.expectedPayloadHash !== candidate.payloadHash ||
    observation.sourceLayoutContentSha256 !== candidate.sourceLayoutContentSha256 ||
    screenshot.projectId !== project.projectId ||
    screenshot.screenshotSha256 !== observation.screenshotSha256 ||
    !urlMatch ||
    urlMatch[1] !== project.projectId
  ) {
    fail("source-project-audit-drift", String(source.sequence));
  }

  const packageDirectory = join(bundleRoot, source.lessonId);
  const manifestPath = join(packageDirectory, "manifest.json");
  const htmlPath = join(packageDirectory, "source.html");
  if (!existsSync(manifestPath) || !existsSync(htmlPath)) {
    fail("bundle-file-missing", source.lessonId);
  }
  const manifest = readJson(manifestPath);
  const authoringSha = sha256(
    canonicalJson(packageManifestAuthoringBinding(manifest))
  );
  if (
    manifest.schemaVersion !== 5 ||
    manifest.lessonId !== source.lessonId ||
    manifest.sequence !== source.sequence ||
    manifest.title !== source.title ||
    manifest.sourceSlideHtmlSha256 !== source.sourceBinding.slideHtmlSha256 ||
    source.sourceBinding.packageManifestBindingPolicy !==
      "canonical-json-without-mathcanvas-editor-url-v1" ||
    authoringSha !== source.sourceBinding.packageManifestSha256
  ) {
    fail("bundle-source-binding-drift", source.lessonId);
  }

  const html = readFileSync(htmlPath, "utf8");
  const guideMatches = [
    ...html.matchAll(/<section class="section" data-section="guide">[\s\S]*?<\/section>/g)
  ];
  if (guideMatches.length !== 1) fail("guide-exact-one-required", source.lessonId);
  const guide = guideMatches[0][0];
  const existingAnchors = [...guide.matchAll(anchorPattern)];
  if (existingAnchors.length > 1) fail("mathcanvas-anchor-duplicate", source.lessonId);
  const anchor = `<a class="download secondary" href="${project.url}" target="_blank" rel="noopener noreferrer">MathCanvas에서 열기</a>`;
  const nextGuide = existingAnchors.length === 1
    ? guide.replace(anchorPattern, anchor)
    : guide.replace(/<\/section>$/, `${anchor}</section>`);
  const nextHtml = html.replace(guide, nextGuide);
  if (
    [...nextGuide.matchAll(anchorPattern)].length !== 1 ||
    !nextGuide.includes(`href="${project.url}"`)
  ) {
    fail("anchor-postcondition", source.lessonId);
  }
  pendingWrites.push({
    sequence: source.sequence,
    lessonId: source.lessonId,
    url: project.url,
    manifestPath,
    manifestText: `${JSON.stringify({ ...manifest, mathCanvasEditorUrl: project.url }, null, 2)}\n`,
    htmlPath,
    htmlText: nextHtml
  });
}

if (pendingWrites.length !== 30) fail("exact-30-preflight-required");
for (const write of pendingWrites) {
  writeFileSync(write.manifestPath, write.manifestText, "utf8");
  writeFileSync(write.htmlPath, write.htmlText, "utf8");
  process.stdout.write(`LINKED ${write.sequence}/30 ${write.lessonId} ${write.url}\n`);
}

const linked = pendingWrites.map((write) => {
  const manifest = readJson(write.manifestPath);
  const html = readFileSync(write.htmlPath, "utf8");
  if (
    manifest.mathCanvasEditorUrl !== write.url ||
    [...html.matchAll(anchorPattern)].length !== 1 ||
    !html.includes(`href="${write.url}"`)
  ) {
    fail("write-postcondition", write.lessonId);
  }
  return {
    sequence: write.sequence,
    lessonId: write.lessonId,
    url: write.url,
    manifestSha256: fileSha256(write.manifestPath),
    sourceHtmlSha256: fileSha256(write.htmlPath)
  };
});
const reportBody = {
  schemaVersion: "1.0.0",
  reportId: "eduitit-html30-v2-link-sync",
  syncedAt: new Date().toISOString(),
  releaseAttestationContentSha256: attestationContentSha256,
  linkedCount: 30,
  linked
};
const report = { ...reportBody, contentSha256: sha256Hex(reportBody) };
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`DONE linked=30/30 ${report.contentSha256}\n`);
