import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSemanticSlice,
  semanticSliceHash
} from "./revalidation-semantic-slice.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const planPath = resolve(root, "scripts/curriculum/no-family-plan.json");
const executionPath = resolve(
  root,
  "reports/curriculum-execution/no-family-plan.json"
);
const registryPath = resolve(
  root,
  "reports/problem-family-registry/latest.json"
);
const artifactDir = resolve(
  root,
  "reports/curriculum-execution/family-revalidation"
);
const shouldWrite = process.argv.includes("--write");

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}/`)) {
    throw new Error(`family-revalidation-path-outside-root:${relativePath}`);
  }
  if (!existsSync(absolutePath)) {
    throw new Error(`family-revalidation-file-missing:${relativePath}`);
  }
  return sha256(readFileSync(absolutePath));
}

const workItemId = arg("--work-item");
if (!workItemId) throw new Error("family-revalidation-work-item-required");

const plan = readJson(planPath);
const execution = readJson(executionPath);
const registry = readJson(registryPath);
const workItem = execution.workItems.find(
  (item) => item.workItemId === workItemId
);
if (!workItem) throw new Error(`family-revalidation-work-item-unknown:${workItemId}`);
const contract = plan.trackContracts[workItem.archetypeId];
if (
  !contract ||
  (!contract.revalidationFiles?.length &&
    !contract.revalidationSemanticSlices?.length)
) {
  throw new Error(`family-revalidation-files-not-planned:${workItem.archetypeId}`);
}
const scopeId = arg("--scope-id");
const scopes = workItem.reviewScopes ?? [];
if (scopes.length !== 1 && !scopeId) {
  throw new Error("family-revalidation-scope-required-for-multiple-scopes");
}
const scope = scopes.find((candidate) =>
  scopeId ? candidate.scopeId === scopeId : true
);
if (!scope) throw new Error(`family-revalidation-scope-unknown:${scopeId}`);

const family = registry.families.find(
  (candidate) => candidate.familyId === workItem.plannedFamilyId
);
if (!family) {
  throw new Error(`family-revalidation-family-missing:${workItem.plannedFamilyId}`);
}

const implementationFiles = Object.fromEntries(
  [...(contract.revalidationFiles ?? [])].sort().map((relativePath) => [
    relativePath,
    sha256File(relativePath)
  ])
);
const learningMapHashes = new Set();
for (const relativePath of contract.revalidationFiles ?? []) {
  const text = readFileSync(resolve(root, relativePath), "utf8");
  for (const match of text.matchAll(/usageSnapshotSha256\s*[:=][^\n]*?([a-f0-9]{64})/g)) {
    learningMapHashes.add(match[1]);
  }
}
const semanticSlices = (contract.revalidationSemanticSlices ?? [])
  .map((descriptor) => ({
    ...descriptor,
    sha256: semanticSliceHash(root, descriptor),
    value: buildSemanticSlice(root, descriptor)
  }))
  .sort((left, right) =>
    `${left.kind}:${left.path}:${left.standardCode}`.localeCompare(
      `${right.kind}:${right.path}:${right.standardCode}`
    )
  );

const fingerprintPayload = {
  schemaVersion: "1.0.0",
  operation: "FAMILY_REVALIDATION",
  workItemId,
  standardCode: workItem.standardCode,
  familyId: workItem.plannedFamilyId,
  familyTrackId: scope.familyTrackId,
  scopeId: scope.scopeId,
  assessmentTargetIds: family.assessmentTargetIds,
  gradeBand: family.gradeBand,
  domain: family.domain,
  blueprintContentHash: family.blueprintContentHash,
  replanContractRevision: contract.replanContractRevision ?? null,
  learningMapUsageSnapshotSha256:
    learningMapHashes.size === 1 ? [...learningMapHashes][0] : null,
  implementationFiles,
  semanticSlices
};
const artifact = {
  ...fingerprintPayload,
  fingerprintSha256: sha256(JSON.stringify(fingerprintPayload))
};
const artifactPath = resolve(artifactDir, `${workItemId}.json`);

if (shouldWrite) {
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`family revalidation artifact updated: ${artifactPath}`);
} else {
  const existing = readJson(artifactPath);
  if (JSON.stringify(existing) !== JSON.stringify(artifact)) {
    throw new Error(`family-revalidation-stale:${workItemId}`);
  }
  console.log(`family revalidation artifact PASS: ${workItemId}`);
}
