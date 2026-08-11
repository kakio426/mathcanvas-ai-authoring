import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(root, relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}/`) || !existsSync(absolutePath)) {
    throw new Error(`semantic-slice-file-missing:${relativePath}`);
  }
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function containsStandard(value, standardCode) {
  return JSON.stringify(value).includes(standardCode);
}

export function buildSemanticSlice(root, descriptor) {
  if (descriptor?.kind === "registry-family") {
    const source = readJson(root, descriptor.path);
    const family = (source.families ?? []).find(
      (candidate) => candidate.familyId === descriptor.familyId
    );
    if (!family) {
      throw new Error(`semantic-slice-family-missing:${descriptor.familyId}`);
    }
    const stableFamily = {
      familyId: family.familyId,
      activityId: family.activityId,
      templateId: family.templateId,
      domain: family.domain,
      standardCodes: family.standardCodes,
      manipulation: family.manipulation,
      generator: family.generator,
      renderRecipeKind: family.renderRecipeKind,
      blueprintContentHash: family.blueprintContentHash,
      assessmentTargetIds: family.assessmentTargetIds,
      parameterKeys: family.parameterKeys,
      evidencePaths: family.evidencePaths
    };
    return {
      kind: descriptor.kind,
      path: descriptor.path,
      standardCode: descriptor.standardCode,
      familyId: descriptor.familyId,
      family: stableFamily
    };
  }
  if (descriptor?.kind === "source-module") {
    const absolutePath = resolve(root, descriptor.path);
    if (!absolutePath.startsWith(`${root}/`) || !existsSync(absolutePath)) {
      throw new Error(`semantic-slice-file-missing:${descriptor.path}`);
    }
    const source = readFileSync(absolutePath, "utf8");
    const start = descriptor.startMarker
      ? source.indexOf(descriptor.startMarker)
      : 0;
    const end = descriptor.endMarker
      ? source.indexOf(descriptor.endMarker, start + 1)
      : source.length;
    if (start < 0 || end < 0 || end <= start) {
      throw new Error(`semantic-slice-marker-missing:${descriptor.path}`);
    }
    let content = source.slice(start, end);
    if (descriptor.normalization === "ignore-learning-map-snapshot") {
      content = content.replace(
        /const LEARNING_MAP_USAGE_SNAPSHOT_SHA256\s*=\s*"[a-f0-9]{64}";/g,
        "const LEARNING_MAP_USAGE_SNAPSHOT_SHA256 = \"<semantic-slice-constant>\";"
      );
    }
    return {
      kind: descriptor.kind,
      path: descriptor.path,
      standardCode: descriptor.standardCode,
      contentSha256: sha256(content)
    };
  }
  if (descriptor?.kind !== "learning-map") {
    throw new Error(`semantic-slice-kind-unsupported:${descriptor?.kind}`);
  }
  const source = readJson(root, descriptor.path);
  const topics = (source.topics ?? []).filter((topic) =>
    containsStandard(topic, descriptor.standardCode)
  );
  const dependencies = (source.dependencies ?? []).filter((dependency) =>
    containsStandard(dependency, descriptor.standardCode)
  );
  return {
    kind: descriptor.kind,
    path: descriptor.path,
    standardCode: descriptor.standardCode,
    topics,
    dependencies
  };
}

export function semanticSliceHash(root, descriptor) {
  return sha256(JSON.stringify(buildSemanticSlice(root, descriptor)));
}

export function semanticSliceIsCurrent(root, slice) {
  if (
    !slice ||
    typeof slice.path !== "string" ||
    typeof slice.kind !== "string" ||
    typeof slice.standardCode !== "string" ||
    !/^[a-f0-9]{64}$/.test(slice.sha256 ?? "")
  ) {
    return false;
  }
  try {
    return (
      semanticSliceHash(root, slice) === slice.sha256
    );
  } catch {
    return false;
  }
}
