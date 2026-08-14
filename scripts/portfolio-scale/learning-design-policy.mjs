import { createHash } from "node:crypto";

export const PORTFOLIO_LEARNING_DESIGN_POLICY = Object.freeze({
  skillName: "mathcanvas-learning-design",
  expectedStandardCount: 97,
  expectedTargetOutlineCount: 237,
  minimumRendererCount: 7,
  expectedEngineClassCount: 23,
  minimumInteractionShellCount: 7,
  minimumActionProfileCount: 2,
  minimumManipulativeStandardCount: 31,
  maximumDominantRendererShare: 0.4
});

const canonicalize = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
};

export const portfolioContentSha256 = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)) ?? "undefined")
    .digest("hex");

export function buildPortfolioLearningDesignMetrics(rows) {
  const rendererCounts = Object.fromEntries(
    [...new Set(rows.map((row) => row.rendererKind))]
      .sort()
      .map((rendererKind) => [
        rendererKind,
        rows.filter((row) => row.rendererKind === rendererKind).length
      ])
  );
  const dominantRendererCount = Math.max(0, ...Object.values(rendererCounts));
  const actionProfiles = new Set(
    rows.map((row) => JSON.stringify(row.constraintKinds ?? []))
  );
  const interactionShells = new Set(
    rows.map((row) => row.interactionShellId).filter(Boolean)
  );
  const manipulativeStandardCount = rows.filter(
    (row) => (row.manipulativeConstraintCount ?? 0) > 0
  ).length;

  return {
    rendererCount: Object.keys(rendererCounts).length,
    rendererCounts,
    dominantRendererShare:
      rows.length === 0 ? 1 : dominantRendererCount / rows.length,
    engineClassCount: new Set(rows.flatMap((row) => row.engineClassIds ?? [])).size,
    interactionShellCount: interactionShells.size,
    actionProfileCount: actionProfiles.size,
    manipulativeStandardCount,
    elementaryCopyStandardCount: rows.filter(
      (row) =>
        row.internalCodeHidden &&
        row.questionsElementary &&
        row.choicesElementary &&
        row.registeredEvidencePromptsVisible
    ).length,
    usableNativeStandardCount: rows.filter(
      (row) => row.nativeElementsContained && row.nativeElementsUsable
    ).length
  };
}

export function evaluatePortfolioLearningDesignReadiness({
  rows,
  passedTargetOutlineCount,
  failedStandardCount,
  policy = PORTFOLIO_LEARNING_DESIGN_POLICY
}) {
  const metrics = buildPortfolioLearningDesignMetrics(rows);
  const checks = {
    standardsComplete: rows.length === policy.expectedStandardCount,
    targetOutlinesComplete:
      passedTargetOutlineCount === policy.expectedTargetOutlineCount,
    noFailedStandards: failedStandardCount === 0,
    rendererBreadth: metrics.rendererCount >= policy.minimumRendererCount,
    engineBreadth: metrics.engineClassCount === policy.expectedEngineClassCount,
    interactionShellBreadth:
      metrics.interactionShellCount >= policy.minimumInteractionShellCount,
    actionProfileBreadth:
      metrics.actionProfileCount >= policy.minimumActionProfileCount,
    manipulationBreadth:
      metrics.manipulativeStandardCount >= policy.minimumManipulativeStandardCount,
    noSingleRendererDominance:
      metrics.dominantRendererShare <= policy.maximumDominantRendererShare,
    elementaryCopyComplete:
      metrics.elementaryCopyStandardCount === policy.expectedStandardCount,
    nativeUsabilityComplete:
      metrics.usableNativeStandardCount === policy.expectedStandardCount
  };
  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    skillName: policy.skillName,
    ready: failedChecks.length === 0,
    checks,
    failedChecks,
    metrics,
    policy
  };
}

export function validatePortfolioStaticAttestation(report) {
  if (!report || typeof report !== "object") {
    throw new Error("portfolio-static-attestation-invalid");
  }
  const { contentSha256, ...body } = report;
  if (!/^[a-f0-9]{64}$/u.test(contentSha256 ?? "")) {
    throw new Error("portfolio-static-attestation-sha-missing");
  }
  const actualSha256 = portfolioContentSha256(body);
  if (actualSha256 !== contentSha256) {
    throw new Error(
      `portfolio-static-attestation-sha-mismatch:${contentSha256}:${actualSha256}`
    );
  }
  if (report.releaseReadiness?.ready !== true) {
    throw new Error(
      `portfolio-static-attestation-not-release-ready:${(report.releaseReadiness?.failedChecks ?? []).join(",")}`
    );
  }
  return { contentSha256, reportId: report.reportId };
}
