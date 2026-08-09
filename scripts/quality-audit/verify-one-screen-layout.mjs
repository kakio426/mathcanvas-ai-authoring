#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  conservativeFontMetricsTableSchema,
  canonicalOneScreenRegistryIsDeepFrozen,
  findCanonicalOneScreenProfile,
  oneProblemMinimumCssHeight,
  oneScreenLayoutProfileSchema,
  sha256Hex,
  studentOneScreenGeometryProfileSchema,
  twoProblemMinimumCssHeight
} from "../../packages/contracts/dist/index.js";
import { measureConservativeText } from "../../packages/mathcanvas-compiler/dist/index.js";

const root = resolve(import.meta.dirname, "../..");

function bytes(path) {
  return readFileSync(resolve(root, path));
}

function json(path) {
  return JSON.parse(bytes(path).toString("utf8"));
}

function fileSha256(path) {
  return createHash("sha256").update(bytes(path)).digest("hex");
}

function approximate(left, right) {
  return Math.abs(left - right) <= 1e-6;
}

function fail(reason) {
  throw new Error(`one-screen-layout-invalid:${reason}`);
}

const geometryPath =
  "research/mathcanvas/student-one-screen-geometry-profile.json";
const metricsPath =
  "research/mathcanvas/pretendard-conservative-font-metrics-v1.json";
const profilePath = "research/mathcanvas/student-one-screen-large-v1.json";
const evidencePath =
  "research/mathcanvas/student-one-screen-large-v1-budget-evidence.json";
const legacyQualityPath =
  "packages/templates/src/blueprints/student-screen-quality.ts";
const legacyThresholdsPath = "scripts/quality-audit/thresholds.mjs";

const geometry = studentOneScreenGeometryProfileSchema.parse(
  json(geometryPath)
);
const metrics = conservativeFontMetricsTableSchema.parse(json(metricsPath));
const profile = oneScreenLayoutProfileSchema.parse(json(profilePath));
const evidence = json(evidencePath);
const { integrity, ...evidenceBody } = evidence;
const canonicalProfile = findCanonicalOneScreenProfile(
  profile.profileId,
  profile.profileVersion
);

if (
  integrity?.contentSha256 !== sha256Hex(evidenceBody) ||
  evidence.schemaVersion !== "1.0.0" ||
  evidence.evidenceId !==
    "student-one-screen-large-v1-offline-budget-20260809"
) {
  fail("evidence-integrity");
}

if (
  !canonicalOneScreenRegistryIsDeepFrozen() ||
  JSON.stringify(canonicalProfile.profile) !== JSON.stringify(profile) ||
  JSON.stringify(canonicalProfile.geometryProfile) !==
    JSON.stringify(geometry) ||
  JSON.stringify(canonicalProfile.fontMetrics) !== JSON.stringify(metrics) ||
  canonicalProfile.profileFileSha256 !== fileSha256(profilePath) ||
  canonicalProfile.geometryProfileFileSha256 !== fileSha256(geometryPath) ||
  canonicalProfile.fontMetricsFileSha256 !== fileSha256(metricsPath) ||
  profile.geometryBinding.profileId !== geometry.profileId ||
  profile.geometryBinding.profileVersion !== geometry.profileVersion ||
  profile.geometryBinding.profileFileSha256 !== fileSha256(geometryPath) ||
  profile.geometryBinding.profileContentSha256 !== geometry.contentSha256 ||
  profile.fontMetricsBinding.tableId !== metrics.tableId ||
  profile.fontMetricsBinding.tableVersion !== metrics.tableVersion ||
  profile.fontMetricsBinding.tableFileSha256 !== fileSha256(metricsPath) ||
  profile.fontMetricsBinding.tableContentSha256 !== metrics.contentSha256 ||
  profile.fontMetricsBinding.fontFingerprint !== metrics.fontFingerprint
) {
  fail("profile-source-binding");
}

const oneProblem = oneProblemMinimumCssHeight(profile);
const twoProblem = twoProblemMinimumCssHeight(profile);
const baselineWithoutNative =
  oneProblem - profile.problemCapacity.assumedMinimumNativeReserveCssHeight;
const maximumNativeReserve =
  profile.geometryBinding.fixedSafeCss.height - baselineWithoutNative;
const candidateInnerWidth =
  profile.geometryBinding.fixedSafeCss.width -
  profile.spacing.outerPaddingXCssPx * 2;
const candidateCardWidth =
  (candidateInnerWidth - profile.spacing.candidateColumnGapCssPx * 2) / 3;
const candidateTextWidth =
  candidateCardWidth - profile.spacing.candidateCardPaddingXCssPx * 2;
const candidateMeasurement = measureConservativeText("4묶음, 1개", {
  fontSizeCssPx: profile.typography.candidate.targetCssPx,
  lineHeightRatio: profile.typography.candidate.lineHeightRatio,
  maximumWidthCssPx: candidateTextWidth,
  metrics
});
const candidateCardHeight =
  candidateMeasurement.heightCssPx +
  profile.spacing.candidateCardPaddingYCssPx * 2;

const roleSampleInputs = [
  ["title", "같은 수만큼 묶으면 몇 묶음이 될까요?", profile.typography.title, candidateInnerWidth],
  ["question", "어느 답이 모형과 맞을까요?", profile.typography.question, candidateInnerWidth],
  ["coreInstruction", "모형을 움직여 직접 확인하세요.", profile.typography.coreInstruction, candidateInnerWidth],
  ["candidate", "4묶음, 1개", profile.typography.candidate, candidateTextWidth],
  ["mathLabel", "3 × 4 = 12", profile.typography.mathLabel, candidateTextWidth],
  ["support", "처음 고른 답", profile.typography.support, candidateTextWidth]
];
const roleSamples = roleSampleInputs.map(([role, text, typography, maximumWidthCssPx]) => {
  const measurement = measureConservativeText(text, {
    fontSizeCssPx: typography.targetCssPx,
    lineHeightRatio: typography.lineHeightRatio,
    maximumWidthCssPx,
    metrics
  });
  return {
    role,
    text,
    fontSize: measurement.fontSizeCssPx,
    lineHeight: measurement.lineHeightCssPx,
    lineCount: measurement.lineCount,
    maxLineWidth: measurement.maxLineWidthCssPx
  };
});
const expectedRoleSamples =
  evidence.namedPredictions.typographyRoleSamples.samples;
if (
  evidence.namedPredictions.typographyRoleSamples.status !==
    "offline-measured-configured-targets" ||
  evidence.namedPredictions.typographyRoleSamples.actualPlacementGate !==
    "R5 activity-specific layout and canary" ||
  expectedRoleSamples.length !== roleSamples.length ||
  roleSamples.some((sample, index) => {
    const expected = expectedRoleSamples[index];
    return (
      !expected ||
      expected.role !== sample.role ||
      expected.text !== sample.text ||
      expected.lineCount !== sample.lineCount ||
      !approximate(expected.fontSize, sample.fontSize) ||
      !approximate(expected.lineHeight, sample.lineHeight) ||
      !approximate(expected.maxLineWidth, sample.maxLineWidth)
    );
  }) ||
  roleSamples.some(
    (sample) => sample.lineHeight / sample.fontSize < 1.35
  )
) {
  fail("typography-role-predictions");
}

const budget = evidence.verticalBudgetCssPx;
if (
  !approximate(oneProblem, 580.4) ||
  !approximate(twoProblem, 1160.8) ||
  !approximate(maximumNativeReserve, 211.6) ||
  !approximate(budget.oneProblemMinimum, oneProblem) ||
  !approximate(budget.twoProblemMinimum, twoProblem) ||
  !approximate(budget.oneProblemMaximumNativeReserve, maximumNativeReserve) ||
  !approximate(
    budget.oneProblemRemaining,
    profile.geometryBinding.fixedSafeCss.height - oneProblem
  ) ||
  oneProblem > profile.geometryBinding.fixedSafeCss.height ||
  twoProblem <= profile.geometryBinding.fixedSafeCss.height ||
  evidence.verticalBudgetCssPx.oneProblemStatus !== "supported" ||
  evidence.verticalBudgetCssPx.twoProblemStatus !== "unsupported"
) {
  fail("vertical-budget");
}

const sentences = [
  "먼저 답을 고르세요.",
  "모형을 움직여 확인하세요.",
  "확인한 수학적 증거를 쓰세요.",
  "처음 답과 다르면 고치세요."
];
const fullWidthInstructionTextWidth =
  profile.geometryBinding.fixedSafeCss.width -
  profile.spacing.outerPaddingXCssPx * 2;
const sentenceMeasurements = sentences.map((text) =>
  measureConservativeText(text, {
    fontSizeCssPx: profile.typography.coreInstruction.targetCssPx,
    lineHeightRatio: profile.typography.coreInstruction.lineHeightRatio,
    maximumWidthCssPx: fullWidthInstructionTextWidth,
    metrics
  })
);
const singleInstructionRowHeight = sentenceMeasurements[0].heightCssPx;
const stackHeight =
  sentenceMeasurements.reduce(
    (sum, measurement) => sum + measurement.heightCssPx,
    0
  ) +
  profile.spacing.semanticGroupGapCssPx * (sentenceMeasurements.length - 1);
if (
  sentenceMeasurements.some(
    (measurement) =>
      measurement.lineHeightCssPx <
        measurement.fontSizeCssPx * 1.35
  ) ||
  !approximate(
    evidence.namedPredictions.topFourInstructionRows.singleLineRowHeight,
    singleInstructionRowHeight
  ) ||
  !approximate(
    evidence.namedPredictions.topFourInstructionRows.stackHeight,
    stackHeight
  ) ||
  !approximate(
    evidence.namedPredictions.threeCandidateCards.cardWidth,
    candidateCardWidth
  ) ||
  !approximate(
    evidence.namedPredictions.threeCandidateCards.innerTextWidth,
    candidateTextWidth
  ) ||
  !approximate(
    evidence.namedPredictions.threeCandidateCards.singleLineCardHeight,
    candidateCardHeight
  )
) {
  fail("named-regression-metrics");
}

if (
  evidence.profile.profileFileSha256 !== fileSha256(profilePath) ||
  evidence.profile.profileContentSha256 !== profile.contentSha256 ||
  evidence.fontMetrics.tableFileSha256 !== fileSha256(metricsPath) ||
  evidence.fontMetrics.tableContentSha256 !== metrics.contentSha256 ||
  evidence.fixedEditorGeometry.geometryProfileFileSha256 !==
    fileSha256(geometryPath) ||
  evidence.fixedEditorGeometry.geometryProfileContentSha256 !==
    geometry.contentSha256 ||
  evidence.legacyDefaults.studentScreenQualityFileSha256 !==
    fileSha256(legacyQualityPath) ||
  evidence.legacyDefaults.qualityThresholdsFileSha256 !==
    fileSha256(legacyThresholdsPath) ||
  evidence.legacyDefaults.changed !== false ||
  evidence.decision.profileScopedOnly !== true ||
  evidence.decision.nativeReserveFirst !== true ||
  evidence.decision.liveMeasurementAllowed !== false ||
  evidence.decision.genericInteractionReady !== false ||
  evidence.decision.releaseQualified !== false
) {
  fail("pinned-evidence-or-claim-boundary");
}

process.stdout.write(
  `one-screen-layout PASS: one=${oneProblem.toFixed(1)}px two=${twoProblem.toFixed(1)}px maxNative=${maximumNativeReserve.toFixed(1)}px profile=${profile.contentSha256}\n`
);
