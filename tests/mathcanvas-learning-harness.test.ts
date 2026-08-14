import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyMathCanvasChanges,
  commandsForMathCanvasHook,
  differsOnlyByGeneratedAt
} from "../scripts/hooks/mathcanvas-git-guard.mjs";
import {
  evaluatePortfolioLearningDesignReadiness,
  portfolioContentSha256,
  validatePortfolioStaticAttestation
} from "../scripts/portfolio-scale/learning-design-policy.mjs";

const root = resolve(import.meta.dirname, "..");

const makeRows = () =>
  Array.from({ length: 97 }, (_, index) => ({
    rendererKind: `renderer-${index % 7}`,
    engineClassIds: [`engine-${index % 23}`],
    constraintKinds:
      index < 31 ? ["fill-from-pool", "select-one-of"] : ["select-one-of"],
    interactionShellId: `shell-${index % 7}`,
    manipulativeConstraintCount: index < 31 ? 1 : 0,
    internalCodeHidden: true,
    questionsElementary: true,
    choicesElementary: true,
    registeredEvidencePromptsVisible: true,
    nativeElementsContained: true,
    nativeElementsUsable: true
  }));

describe("MathCanvas learning-design Git harness", () => {
  it("requires static and live proof for learner-facing source changes", () => {
    const classification = classifyMathCanvasChanges([
      "packages/templates/src/problem-families/portfolio-scale.ts",
      "reports/portfolio-scale/latest.json"
    ]);
    expect(classification).toMatchObject({
      learnerFacing: ["packages/templates/src/problem-families/portfolio-scale.ts"],
      requiresStaticLearningHarness: true,
      requiresFullCheck: true,
      requiresLiveAttestation: true
    });
    expect(commandsForMathCanvasHook("pre-commit", classification)).toEqual({
      focusedHarnessTests: true,
      staticLearningHarness: true,
      fullCheck: false,
      liveAttestation: false
    });
    expect(commandsForMathCanvasHook("pre-push", classification)).toEqual({
      focusedHarnessTests: true,
      staticLearningHarness: false,
      fullCheck: true,
      liveAttestation: true
    });
  });

  it("allows harness-only maintenance without pretending it has new live learner evidence", () => {
    const classification = classifyMathCanvasChanges([
      ".githooks/pre-push",
      "scripts/hooks/mathcanvas-git-guard.mjs",
      "tests/mathcanvas-learning-harness.test.ts"
    ]);
    expect(classification.learnerFacing).toEqual([]);
    expect(classification.requiresFullCheck).toBe(true);
    expect(classification.requiresLiveAttestation).toBe(false);
  });

  it("restores generated audit timestamps but rejects any substantive report mutation", () => {
    const before = '{\n  "generatedAt": "2026-08-11T00:00:00.000Z",\n  "score": 100\n}\n';
    const timestampOnly =
      '{\n  "generatedAt": "2026-08-14T00:00:00.000Z",\n  "score": 100\n}\n';
    const substantive =
      '{\n  "generatedAt": "2026-08-14T00:00:00.000Z",\n  "score": 99\n}\n';
    expect(differsOnlyByGeneratedAt(before, timestampOnly)).toBe(true);
    expect(differsOnlyByGeneratedAt(before, substantive)).toBe(false);
  });

  it("fails closed when breadth collapses to one renderer or one action profile", () => {
    const healthy = evaluatePortfolioLearningDesignReadiness({
      rows: makeRows(),
      passedTargetOutlineCount: 237,
      failedStandardCount: 0
    });
    expect(healthy.ready).toBe(true);

    const collapsedRows = makeRows().map((row) => ({
      ...row,
      rendererKind: "one-renderer",
      interactionShellId: "one-shell",
      constraintKinds: ["select-one-of"],
      manipulativeConstraintCount: 0
    }));
    const collapsed = evaluatePortfolioLearningDesignReadiness({
      rows: collapsedRows,
      passedTargetOutlineCount: 237,
      failedStandardCount: 0
    });
    expect(collapsed.ready).toBe(false);
    expect(collapsed.failedChecks).toEqual(
      expect.arrayContaining([
        "rendererBreadth",
        "interactionShellBreadth",
        "actionProfileBreadth",
        "manipulationBreadth",
        "noSingleRendererDominance"
      ])
    );
  });

  it("binds the tracked 97-standard report to a tamper-evident content hash", () => {
    const report = JSON.parse(
      readFileSync(resolve(root, "reports/portfolio-scale/latest.json"), "utf8")
    );
    expect(validatePortfolioStaticAttestation(report)).toEqual({
      contentSha256: report.contentSha256,
      reportId: report.reportId
    });

    const { contentSha256: _ignored, ...body } = report;
    expect(portfolioContentSha256(body)).toBe(report.contentSha256);
    expect(() =>
      validatePortfolioStaticAttestation({
        ...report,
        summary: { ...report.summary, passedStandardCount: 1 }
      })
    ).toThrow("portfolio-static-attestation-sha-mismatch");
  });
});
