#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import {
  r5NativeDiscoveryExpectedVariants,
  r5NativeToolDiscoveryEvidenceSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { stableJson } from "../contract-lab/lib/normalize.mjs";

const root = resolve(import.meta.dirname, "../..");
const manifestPath = "research/mathcanvas/r5-native-tool-discovery-manifest.json";
const allowedRawRoot = resolve(root, ".mathcanvas-contract-lab/raw");
const allowedScreenshotRoot = resolve(
  root,
  ".mathcanvas-contract-lab/previews/r5-native-tool-discovery"
);

function fail(reason) {
  throw new Error(`r5-native-tool-discovery-invalid:${reason}`);
}

function bytes(path) {
  return readFileSync(resolve(root, path));
}

function json(path) {
  return JSON.parse(bytes(path).toString("utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(bytes(path)).digest("hex");
}

function valueSha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function assertInside(path, directory, label) {
  const absolute = resolve(root, path);
  const relation = relative(directory, absolute);
  if (
    relation === "" ||
    relation.startsWith("..") ||
    isAbsolute(relation) ||
    !existsSync(absolute)
  ) {
    fail(`${label}-path`);
  }
  return absolute;
}

function summarizeBounds(bounds) {
  return Object.fromEntries(
    Object.entries(bounds).map(([key, value]) => [
      key,
      Number(Number(value).toFixed(3))
    ])
  );
}

function unionBounds(entries) {
  if (entries.length === 0) return null;
  const left = Math.min(...entries.map((entry) => entry.x));
  const top = Math.min(...entries.map((entry) => entry.y));
  const right = Math.max(...entries.map((entry) => entry.x + entry.width));
  const bottom = Math.max(...entries.map((entry) => entry.y + entry.height));
  return summarizeBounds({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  });
}

function visualBoundsFromRaw(initial) {
  const rootBounds = initial.boundsCssPx;
  const chromePattern =
    /(?:item-toolbar|item-focus|resize|handler|setting-toggle|move-handler|rotate-move)/;
  const visualEntries = initial.descendants
    .filter((entry) => !chromePattern.test(String(entry.className ?? "")))
    .map((entry) => entry.bounds)
    .filter(
      (bounds) =>
        bounds &&
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.width <= rootBounds.width + 0.01 &&
        bounds.height <= rootBounds.height + 0.01
    );
  return unionBounds(visualEntries) ?? rootBounds;
}

function semanticStateSnapshot(object) {
  const scalarKeys = [
    "svgId",
    "width",
    "height",
    "x",
    "y",
    "row",
    "column",
    "count",
    "divider",
    "r",
    "angle",
    "isHorizontal",
    "labelCount",
    "categoryCnt",
    "selectedIndex"
  ];
  const structuredKeys = [
    "graphValue",
    "selectedRect",
    "point1",
    "point2",
    "label",
    "units"
  ];
  return {
    ...Object.fromEntries(
      scalarKeys
        .filter((key) => object[key] !== undefined)
        .map((key) => [key, object[key]])
    ),
    ...Object.fromEntries(
      structuredKeys
        .filter((key) => object[key] !== undefined)
        .map((key) => [key, object[key]])
    ),
    ...(object.svgId === "NO04NG-03" && Array.isArray(object.numbers)
      ? {
          multiplicationArray: {
            visibleRows: Number(object.row) - 1,
            visibleColumns: Number(object.column) - 1,
            target: {
              row: 4,
              column: 6,
              product:
                object.numbers.find(
                  (entry) => entry?.r === 4 && entry?.c === 6
                )?.num ?? null
            }
          }
        }
      : {}),
    numbersSha256: Array.isArray(object.numbers)
      ? valueSha256(object.numbers)
      : null,
    coordinatesSha256: Array.isArray(object.coordinates)
      ? valueSha256(object.coordinates)
      : null
  };
}

function changedTopLevelFields(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => stableJson(before[key]) !== stableJson(after[key]))
    .sort();
}

const manifest = json(manifestPath);
if (
  manifest.schemaVersion !== "1.0.0" ||
  manifest.manifestId !== "r5-native-tool-discovery-pinned-v1" ||
  manifest.releaseQualified !== false ||
  manifest.evidence?.path !==
    "research/mathcanvas/r5-native-tool-discovery.json" ||
  manifest.raw?.path !==
    ".mathcanvas-contract-lab/raw/r5-native-tool-discovery.raw.json"
) {
  fail("manifest-shape");
}

if (fileSha256(manifest.evidence.path) !== manifest.evidence.fileSha256) {
  fail("evidence-file-sha");
}
assertInside(manifest.raw.path, allowedRawRoot, "raw");
if (fileSha256(manifest.raw.path) !== manifest.raw.fileSha256) {
  fail("raw-file-sha");
}

const evidence = r5NativeToolDiscoveryEvidenceSchema.parse(
  json(manifest.evidence.path)
);
const raw = json(manifest.raw.path);
if (
  evidence.contentSha256 !== manifest.evidence.contentSha256 ||
  evidence.observedAt !== manifest.evidence.observedAt ||
  evidence.sourceEvidence.rawFileSha256 !== manifest.raw.fileSha256 ||
  raw.schemaVersion !== "1.0.0" ||
  raw.artifactId !== "r5-native-tool-discovery-raw-v1" ||
  raw.observedAt !== evidence.observedAt ||
  raw.mode !== evidence.mode ||
  stableJson(raw.environment) !== stableJson(evidence.environment) ||
  raw.requestAudit?.externalWriteCount !== 0 ||
  raw.observations?.length !== evidence.observations.length
) {
  fail("raw-compact-binding");
}

const expectedVariants = r5NativeDiscoveryExpectedVariants();
for (const [index, compact] of evidence.observations.entries()) {
  const rawObservation = raw.observations[index];
  if (
    !rawObservation ||
    compact.variantId !== expectedVariants[index] ||
    rawObservation.variantId !== compact.variantId ||
    rawObservation.moduleKey !== compact.moduleKey ||
    valueSha256(rawObservation.initial.object) !==
      compact.initial.objectSha256 ||
    stableJson(Object.keys(rawObservation.initial.object).sort()) !==
      stableJson(compact.initial.objectKeys) ||
    stableJson(semanticStateSnapshot(rawObservation.initial.object)) !==
      stableJson(compact.initial.mathematicalState) ||
    stableJson(visualBoundsFromRaw(rawObservation.initial)) !==
      stableJson(compact.initial.visualBoundsCssPx) ||
    stableJson(rawObservation.initial.boundsCssPx) !==
      stableJson(compact.initial.selectedEnvelopeCssPx) ||
    rawObservation.initial.screenshot !== compact.initial.screenshot ||
    rawObservation.initial.screenshotSha256 !==
      compact.initial.screenshotSha256
  ) {
    fail(`observation-initial-${compact.variantId}`);
  }
  assertInside(compact.initial.screenshot, allowedScreenshotRoot, "screenshot");
  if (fileSha256(compact.initial.screenshot) !== compact.initial.screenshotSha256) {
    fail(`initial-screenshot-sha-${compact.variantId}`);
  }
  if (compact.semanticProbe === null) {
    if (rawObservation.semanticProbe !== null) {
      fail(`unexpected-raw-semantic-${compact.variantId}`);
    }
    continue;
  }
  const rawProbe = rawObservation.semanticProbe;
  if (
    !rawProbe?.object ||
    rawProbe.status !== compact.semanticProbe.status ||
    stableJson(rawProbe.operation) !== stableJson(compact.semanticProbe.operation) ||
    stableJson(changedTopLevelFields(rawObservation.initial.object, rawProbe.object)) !==
      stableJson(compact.semanticProbe.changedTopLevelFields) ||
    stableJson(semanticStateSnapshot(rawProbe.object)) !==
      stableJson(compact.semanticProbe.after) ||
    stableJson(compact.initial.mathematicalState) !==
      stableJson(compact.semanticProbe.before) ||
    valueSha256(rawProbe.object) !== compact.semanticProbe.objectSha256 ||
    stableJson(rawProbe.boundsCssPx) !==
      stableJson(compact.semanticProbe.manipulatedEnvelopeCssPx) ||
    rawProbe.screenshot !== compact.semanticProbe.screenshot ||
    rawProbe.screenshotSha256 !== compact.semanticProbe.screenshotSha256
  ) {
    fail(`observation-semantic-${compact.variantId}`);
  }
  assertInside(
    compact.semanticProbe.screenshot,
    allowedScreenshotRoot,
    "semantic-screenshot"
  );
  if (
    fileSha256(compact.semanticProbe.screenshot) !==
    compact.semanticProbe.screenshotSha256
  ) {
    fail(`semantic-screenshot-sha-${compact.variantId}`);
  }
}

const blocked = raw.requestAudit.blockedRequests;
const signatures = blocked.map((entry) => `${entry.method} ${entry.path}`);
const allowedSignatures = new Set([
  "PUT /api/project/<source-project>",
  "POST /api/project/<source-project>/upload-image",
  "POST https://lc.getunicorn.org/l"
]);
const signatureCount = (signature) =>
  signatures.filter((candidate) => candidate === signature).length;
if (
  signatures.some((signature) => !allowedSignatures.has(signature)) ||
  signatureCount("PUT /api/project/<source-project>") !== 16 ||
  signatureCount("POST /api/project/<source-project>/upload-image") !== 16 ||
  signatureCount("POST https://lc.getunicorn.org/l") !==
    evidence.environment.blockedTelemetryCount
) {
  fail("request-audit");
}

const sourcePaths = [
  "research/mathcanvas/tool-catalog.snapshot.json",
  "research/mathcanvas/bundle-contract.snapshot.json"
];
if (
  manifest.sources?.length !== sourcePaths.length ||
  manifest.sources.some((source, index) => source.path !== sourcePaths[index])
) {
  fail("source-manifest-order");
}
for (const source of manifest.sources) {
  if (fileSha256(source.path) !== source.fileSha256) {
    fail(`source-file-sha-${source.path}`);
  }
  const snapshot = json(source.path);
  const records = source.records;
  if (
    records.length !== 4 ||
    records.map((record) => record.moduleKey).join("|") !==
      ["DP03PG", "NO04NG", "NO03FM", "SM07CS"].join("|")
  ) {
    fail(`source-record-set-${source.path}`);
  }
  for (const record of records) {
    const actual = snapshot.tools?.find(
      (candidate) => candidate.moduleKey === record.moduleKey
    );
    if (!actual || sha256Hex(actual) !== record.recordHash) {
      fail(`source-record-hash-${source.path}-${record.moduleKey}`);
    }
    if (
      source.path.endsWith("bundle-contract.snapshot.json") &&
      (!Array.isArray(actual.variants) ||
        !expectedVariants
          .filter((variantId) => variantId.startsWith(`${record.moduleKey}-`))
          .every((variantId) => actual.variants.includes(variantId)))
    ) {
      fail(`source-variant-binding-${record.moduleKey}`);
    }
  }
}

process.stdout.write(
  `PASS R5 native discovery: ${evidence.observations.length} variants, 4 semantic transitions, external writes 0\n`
);
