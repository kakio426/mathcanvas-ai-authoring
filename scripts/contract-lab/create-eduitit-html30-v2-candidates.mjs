#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  mathCanvasPayloadSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";
import { repositoryRoot, resolveStateDirectory } from "./lib/paths.mjs";

const origin = "https://mathcanvas.vivasam.com";
const artifactPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json"
);
const manifestPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-created-projects.json"
);

function fileSha(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function requestedUpdateSequences() {
  const value = argument("--sequences");
  if (value === null) return Array.from({ length: 30 }, (_, index) => index + 1);
  const sequences = value.split(",").map(Number);
  if (
    sequences.length === 0 ||
    new Set(sequences).size !== sequences.length ||
    sequences.some(
      (sequence) => !Number.isInteger(sequence) || sequence < 1 || sequence > 30
    )
  ) {
    throw new Error("html30-v2-live:update-sequences-invalid");
  }
  return sequences.sort((left, right) => left - right);
}

function verifyArtifact(expectedSha) {
  const artifact = readJson(artifactPath);
  const { contentSha256, ...body } = artifact;
  if (
    expectedSha !== contentSha256 ||
    contentSha256 !== sha256Hex(body) ||
    artifact.candidates?.length !== 30 ||
    artifact.attestation?.exactCandidateCount !== 30 ||
    artifact.attestation?.allAtMathCanvas100PercentScale3 !== true ||
    artifact.attestation?.allCanonicalGroupsPersisted !== true ||
    artifact.attestation?.legacyWriterUsed !== false ||
    artifact.attestation?.externalWriteAllowed !== false
  ) {
    throw new Error("html30-v2-live:artifact-attestation");
  }
  for (const binding of Object.values(artifact.sourceBindings ?? {})) {
    if (typeof binding?.path !== "string" || typeof binding?.fileSha256 !== "string") {
      throw new Error("html30-v2-live:source-binding-shape");
    }
    const absolutePath = join(repositoryRoot, binding.path);
    if (!existsSync(absolutePath) || fileSha(absolutePath) !== binding.fileSha256) {
      throw new Error(`html30-v2-live:source-drift:${binding.path}`);
    }
  }
  for (const [index, candidate] of artifact.candidates.entries()) {
    const payload = mathCanvasPayloadSchema.parse(candidate.payload);
    if (
      candidate.sequence !== index + 1 ||
      candidate.payloadHash !== sha256Hex(payload) ||
      payload.canvasOption.scale !== 3 ||
      payload.canvasOption.viewBox.join(",") !== "0,0,1536,960" ||
      candidate.lifecycle?.externalWriteAllowed !== false ||
      candidate.lifecycle?.releaseQualified !== false
    ) {
      throw new Error(`html30-v2-live:candidate-drift:${index + 1}`);
    }
  }
  return artifact;
}

function initialManifest(artifact) {
  return {
    schemaVersion: "1.0.0",
    manifestId: "eduitit-html30-v2-created-projects",
    sourceArtifactPath:
      "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json",
    sourceArtifactContentSha256: artifact.contentSha256,
    mode: "authenticated-background-post-once-per-candidate",
    expectedCreateCount: 30,
    projects: [],
    completedCount: 0,
    completed: false
  };
}

function saveManifest(manifest) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (!process.argv.includes("--execute-live")) {
  throw new Error("html30-v2-live:explicit-execute-flag-required");
}
const updateExisting = process.argv.includes("--update-existing");
const updateSequences = updateExisting ? requestedUpdateSequences() : [];
if (!updateExisting && argument("--sequences") !== null) {
  throw new Error("html30-v2-live:create-sequences-forbidden");
}
const expectedArtifactSha = argument("--artifact-sha");
if (!/^[a-f0-9]{64}$/.test(expectedArtifactSha ?? "")) {
  throw new Error("html30-v2-live:artifact-sha-required");
}
const artifact = verifyArtifact(expectedArtifactSha);
let manifest = existsSync(manifestPath)
  ? readJson(manifestPath)
  : initialManifest(artifact);
if (!updateExisting && manifest.sourceArtifactContentSha256 !== artifact.contentSha256) {
  throw new Error("html30-v2-live:existing-manifest-source-drift");
}
const existingBySequence = new Map(
  manifest.projects.map((project) => [project.sequence, project])
);
if (
  updateExisting &&
  (manifest.projects.length !== 30 ||
    existingBySequence.size !== 30 ||
    artifact.candidates.some(
      (candidate) => !existingBySequence.get(candidate.sequence)?.projectId
    ))
) {
  throw new Error("html30-v2-live:update-exact-existing-30-required");
}
const candidatesToWrite = updateExisting
  ? artifact.candidates.filter((candidate) =>
      updateSequences.includes(candidate.sequence)
    )
  : artifact.candidates.filter(
      (candidate) => !existingBySequence.has(candidate.sequence)
    );
if (candidatesToWrite.length === 0) {
  process.stdout.write(`DONE 30/30 ${manifestPath}\n`);
  process.exit(0);
}
if (updateExisting) {
  const changedSequences = artifact.candidates
    .filter(
      (candidate) =>
        existingBySequence.get(candidate.sequence)?.payloadHash !==
        candidate.payloadHash
    )
    .map((candidate) => candidate.sequence);
  if (changedSequences.some((sequence) => !updateSequences.includes(sequence))) {
    throw new Error(
      `html30-v2-live:update-sequences-incomplete:${changedSequences.join(",")}`
    );
  }
}

const session = await createLiveAuthHeadlessSession(resolveStateDirectory());
let context;
try {
  context = await session.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  if (updateExisting) {
    manifest.updateInProgress = {
      targetArtifactContentSha256: artifact.contentSha256,
      sequences: updateSequences,
      startedAt: new Date().toISOString()
    };
    manifest.completed = false;
    saveManifest(manifest);
  }
  for (const candidate of candidatesToWrite) {
    const existingRecord = existingBySequence.get(candidate.sequence);
    const result = await page.evaluate(async ({ body, existingProjectId }) => {
      const token = window.localStorage.getItem("accessToken");
      const response = await fetch(
        existingProjectId
          ? `/api/project/${encodeURIComponent(existingProjectId)}`
          : "/api/project",
        {
          method: existingProjectId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json;charset=utf-8",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          credentials: "include",
          body: JSON.stringify(body)
        }
      );
      const responseText = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = null;
      }
      return {
        ok:
          response.ok &&
          (existingProjectId !== null || typeof parsed?.projectId === "string"),
        status: response.status,
        projectId: existingProjectId ?? parsed?.projectId ?? null,
        error: response.ok ? "" : responseText.slice(0, 400)
      };
    }, {
        body: candidate.payload,
        existingProjectId: updateExisting ? existingRecord?.projectId ?? null : null
      });
    if (!result.ok || !result.projectId) {
      throw new Error(
        `html30-v2-live:${updateExisting ? "update" : "create"}-failed:${candidate.sequence}:${result.status}:${result.error}`
      );
    }
    const record = {
      sequence: candidate.sequence,
      activityId: candidate.activityId,
      projectTitle: candidate.payload.projectTitle,
      projectId: result.projectId,
      url: `${origin}/ko/view/${result.projectId}`,
      payloadHash: candidate.payloadHash,
      ...(existingRecord?.createdAt
        ? { createdAt: existingRecord.createdAt }
        : { createdAt: new Date().toISOString() }),
      ...(updateExisting ? { updatedAt: new Date().toISOString() } : {})
    };
    manifest.projects = manifest.projects.filter(
      (project) => project.sequence !== candidate.sequence
    );
    manifest.projects.push(record);
    manifest.projects.sort((left, right) => left.sequence - right.sequence);
    manifest.completedCount = manifest.projects.length;
    manifest.completed = manifest.projects.length === 30;
    saveManifest(manifest);
    process.stdout.write(
      `${updateExisting ? "UPDATED" : "CREATED"} ${candidate.sequence}/30 ${record.url}\n`
    );
  }
} finally {
  await context?.close().catch(() => undefined);
  await session.close().catch(() => undefined);
}

manifest = readJson(manifestPath);
manifest.completedCount = manifest.projects.length;
manifest.completed = manifest.projects.length === 30;
manifest.finishedAt = new Date().toISOString();
if (updateExisting) {
  const currentBySequence = new Map(
    artifact.candidates.map((candidate) => [candidate.sequence, candidate])
  );
  if (
    manifest.projects.some(
      (project) =>
        currentBySequence.get(project.sequence)?.payloadHash !== project.payloadHash
    )
  ) {
    throw new Error("html30-v2-live:update-current-artifact-incomplete");
  }
  manifest.sourceArtifactContentSha256 = artifact.contentSha256;
  manifest.mode = "authenticated-background-put-existing-once-per-candidate";
  manifest.updateCompletedAt = new Date().toISOString();
  delete manifest.updateInProgress;
}
saveManifest(manifest);
process.stdout.write(`DONE ${manifest.completedCount}/30 ${manifestPath}\n`);
