#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canonicalJson,
  conservativeFontMetricsTableSchema,
  nativeSpatialContractSchema,
  oneScreenInteractionEvidenceContentHash,
  oneScreenInteractionEvidenceSchema,
  oneScreenLayoutProfileSchema,
  r5NativeToolDiscoveryEvidenceSchema,
  r5VerticalSliceSetSchema,
  sha256Hex,
  studentOneScreenGeometryProfileSchema
} from "../../packages/contracts/dist/index.js";
import { buildR5VerticalSliceSpecs } from "../../packages/templates/dist/index.js";
import { resolveOneScreenLayoutFromPinnedInputs } from "../../packages/mathcanvas-compiler/dist/resolve/one-screen-layout.js";

const root = resolve(import.meta.dirname, "../..");
const paths = {
  artifact: "research/mathcanvas/r5-four-vertical-slices.json",
  discovery: "research/mathcanvas/r5-native-tool-discovery.json",
  profile: "research/mathcanvas/student-one-screen-large-v1.json",
  geometry: "research/mathcanvas/student-one-screen-geometry-profile.json",
  metrics: "research/mathcanvas/pretendard-conservative-font-metrics-v1.json"
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

const artifact = r5VerticalSliceSetSchema.parse(json(paths.artifact));
const discovery = r5NativeToolDiscoveryEvidenceSchema.parse(
  json(paths.discovery)
);
const profile = oneScreenLayoutProfileSchema.parse(json(paths.profile));
const geometry = studentOneScreenGeometryProfileSchema.parse(
  json(paths.geometry)
);
const metrics = conservativeFontMetricsTableSchema.parse(json(paths.metrics));

if (
  artifact.sourceBindings.nativeDiscovery.fileSha256 !==
    fileSha256(paths.discovery) ||
  artifact.sourceBindings.nativeDiscovery.contentSha256 !==
    discovery.contentSha256 ||
  artifact.sourceBindings.oneScreenProfile.fileSha256 !==
    fileSha256(paths.profile) ||
  artifact.sourceBindings.oneScreenProfile.contentSha256 !==
    profile.contentSha256 ||
  canonicalJson(artifact.entries) !==
    canonicalJson(buildR5VerticalSliceSpecs(discovery, profile))
) {
  fail("canonical-source-binding");
}

const results = [];
for (const entry of artifact.entries) {
  const union = entry.spatialPreflight.predictedUnionCss;
  const interactionEvidenceId = `${entry.sliceId}-offline-interaction-v1`;
  const reserveCanvas = {
    x: 0,
    y: 0,
    width: union.width / profile.geometryBinding.coordinateScaleX,
    height: union.height / profile.geometryBinding.coordinateScaleY
  };
  const contract = nativeSpatialContractSchema.parse({
    contractKind: "intrinsic-element",
    contractId: `${entry.sliceId}-offline-native-v1`,
    toolKey: entry.native.toolKey,
    variantId: entry.native.variantId,
    toolVersionFingerprint: `discovery:${entry.native.discoveryEvidenceContentSha256}`,
    minInteractiveSize: {
      width: reserveCanvas.width,
      height: reserveCanvas.height
    },
    minInteractiveCssSize: { width: union.width, height: union.height },
    reserveBox: reserveCanvas,
    reserveAnchor: "placement-top-left",
    roundTripStable: false,
    roundTripTolerance: 0,
    derivedFromEvidenceIds: [interactionEvidenceId]
  });
  const interactionBody = {
    schemaVersion: "1.0.0",
    evidenceId: interactionEvidenceId,
    evidenceVersion: "1.0.0",
    nativeContractId: contract.contractId,
    nativeContractVersion: "2.0.0",
    sourceEvidence: {
      artifactPath: paths.artifact,
      fileSha256: fileSha256(paths.artifact),
      contentSha256: artifact.contentSha256,
      nativeContractRecordHash: sha256Hex({
        status: "offline-preflight-not-a-native-spatial-record",
        contract
      })
    },
    coverage: "activity-specific-pinned",
    viewport: {
      width: 1280,
      height: 800,
      surfaceMode: "authoring-editor",
      sidebarState: "expanded"
    },
    commonAnchor: {
      kind: "native-reserve-top-left",
      reserveWidthCssPx: union.width,
      reserveHeightCssPx: union.height
    },
    stateEnvelopesCss: entry.spatialPreflight.predictedStateEnvelopesCss.map(
      (state) => ({
        state: state.state,
        relativeTo: "native-reserve-top-left",
        bounds: state.bounds
      })
    ),
    selectedChromeIncluded: true,
    manipulatedMovementIncluded: true,
    taskEnvelopeBounded: true
  };
  const interaction = oneScreenInteractionEvidenceSchema.parse({
    ...interactionBody,
    contentSha256: oneScreenInteractionEvidenceContentHash(interactionBody)
  });
  const layout = resolveOneScreenLayoutFromPinnedInputs({
    problemCount: 1,
    profile,
    pinned: {
      geometryProfile: geometry,
      geometryProfileFileSha256: fileSha256(paths.geometry),
      fontMetrics: metrics,
      fontMetricsFileSha256: fileSha256(paths.metrics)
    },
    text: {
      title: entry.learnerTask.question,
      predictionInstruction: entry.learnerTask.instructions.prediction,
      confirmationInstruction:
        entry.learnerTask.instructions.mathematicalConfirmation,
      explanationInstruction: entry.learnerTask.instructions.explanation,
      revisionInstruction: entry.learnerTask.instructions.revision,
      candidates: entry.learnerTask.candidates.map((candidate) => candidate.text)
    },
    native: {
      contract,
      contractVersion: "2.0.0",
      interactionEvidence: interaction,
      expectedInteractionEvidenceContentSha256: interaction.contentSha256
    }
  });
  const instructionLines = Object.values(layout.phaseInstructions).map(
    (instruction) => instruction.measurement.lineCount
  );
  const candidateLines = layout.candidateCards.map(
    (candidate) => candidate.measurement.lineCount
  );
  if (
    layout.title.measurement.lineCount !== 1 ||
    instructionLines.some((lineCount) => lineCount !== 1) ||
    candidateLines.some((lineCount) => lineCount !== 1) ||
    layout.budget.overflowCssHeight !== 0 ||
    layout.budget.remainingCssHeight < -1e-6 ||
    layout.native.clearanceToNextPhaseCssPx < 18 ||
    layout.candidateCards.some(
      (candidate) =>
        candidate.horizontalAlignment !== "center" ||
        candidate.verticalAlignment !== "center"
    )
  ) {
    fail(`layout-${entry.sequence}`);
  }
  results.push({
    sequence: entry.sequence,
    titleLineCount: layout.title.measurement.lineCount,
    instructionLineCounts: instructionLines,
    candidateLineCounts: candidateLines,
    nativeUnionHeightCssPx: union.height,
    usedHeightCssPx: layout.budget.usedCssHeight,
    remainingHeightCssPx: layout.budget.remainingCssHeight,
    nativeClearanceCssPx: layout.native.clearanceToNextPhaseCssPx
  });
}

process.stdout.write(
  `PASS R5 four-slice preflight: ${results
    .map(
      (result) =>
        `${result.sequence}:${result.nativeUnionHeightCssPx.toFixed(1)}px/${result.remainingHeightCssPx.toFixed(1)}px`
    )
    .join(" ")}\n`
);
