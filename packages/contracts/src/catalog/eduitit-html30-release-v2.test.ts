import { describe, expect, it } from "vitest";
import {
  eduititHtml30LifecycleEvidenceV2Schema,
  eduititHtml30ReleaseAttestationV2Schema,
  eduititHtml30VisualReviewV2Schema,
  type EduititHtml30ReleaseAttestationV2,
  type EduititHtml30VisualReviewV2
} from "./eduitit-html30-release-v2.js";
import { sha256Hex } from "../hash.js";

const sha = "a".repeat(64);

function passReview(
  model: "gpt-5.6-sol" | "claude-opus-5"
): EduititHtml30VisualReviewV2 {
  return {
    schemaVersion: "2.0.0",
    reviewId:
      model === "gpt-5.6-sol"
        ? "eduitit-html30-v2-visual-review-sol"
        : "eduitit-html30-v2-visual-review-opus",
    reviewedAt: "2026-08-10T00:00:00.000Z",
    reviewer: {
      model,
      effort: "xhigh",
      sessionId: `${model}-session`,
      independentFromOtherReview: true
    },
    sourceBindings: {
      reopenAuditFileSha256: sha,
      compiledCandidateContentSha256: sha
    },
    criteriaVersion: "html30-v2-original-pixel-pedagogy-and-geometry-v2",
    observations: Array.from({ length: 30 }, (_, index) => ({
      sequence: index + 1,
      projectId: `project-${index + 1}`,
      screenshotSha256: String(index + 1).padStart(64, "0"),
      verdict: "PASS",
      findingIds: []
    })),
    findings: [],
    verdict: "PASS",
    totals: { p0: 0, p1: 0, p2: 0 },
    contentSha256: sha
  };
}

function passAttestation(): EduititHtml30ReleaseAttestationV2 {
  return {
    schemaVersion: "2.1.0",
    attestationId: "eduitit-html30-v2-release-attestation",
    attestedAt: "2026-08-10T00:00:00.000Z",
    sourceBindings: {
      compiledCandidateContentSha256: sha,
      offlineDesignContentSha256: sha,
      promptHarnessContentSha256: sha,
      projectManifestFileSha256: sha,
      reopenAuditFileSha256: sha,
      lifecycleEvidence: {
        path: "research/mathcanvas/eduitit-html30-v2-native-lifecycle-evidence.json",
        fileSha256: sha,
        contentSha256: sha,
        verdict: "PASS"
      },
      visualReviews: [
        {
          model: "gpt-5.6-sol",
          path: "research/mathcanvas/eduitit-html30-v2-visual-review-sol.json",
          fileSha256: sha,
          contentSha256: sha,
          sessionId: "sol-session",
          verdict: "PASS"
        },
        {
          model: "claude-opus-5",
          path: "research/mathcanvas/eduitit-html30-v2-visual-review-opus.json",
          fileSha256: sha,
          contentSha256: sha,
          sessionId: "opus-session",
          verdict: "PASS"
        }
      ]
    },
    exactActivityCount: 30,
    gates: {
      actualMathCanvas100Percent: true,
      oneProblemNoScroll: true,
      authoredPayloadSaveReopen: true,
      fixedChromeContentAndPeerNonOverlap: true,
      mathematicalDecisionAlternatives: true,
      actualNativeLifecycle: true,
      freshIndependentVisualReviews: true
    },
    screenshotEvidence: Array.from({ length: 30 }, (_, index) => ({
      sequence: index + 1,
      projectId: `project-${index + 1}`,
      screenshotSha256: String(index + 1).padStart(64, "0")
    })),
    releaseQualifiedSequences: Array.from({ length: 30 }, (_, index) => index + 1),
    releaseQualifiedCount: 30,
    linkSyncAllowed: true,
    blockers: [],
    contentSha256: sha
  };
}

function passLifecycleEvidence() {
  const recordId = "html30-v2-lifecycle-native-test-single";
  const initialSemantic = "1".repeat(64);
  const manipulatedSemantic = "2".repeat(64);
  const initialState = "3".repeat(64);
  const states = [
    ["initial", false, initialSemantic, initialState],
    ["selected", true, initialSemantic, initialState],
    ["core-manipulated", true, manipulatedSemantic, "4".repeat(64)],
    ["undo-reset", false, initialSemantic, initialState],
    ["reopened", false, initialSemantic, initialState]
  ].map(([state, selectionChromeVisible, semanticProjectionSha256, persistedStateSha256], index) => ({
    state,
    screenshotPath: `research/mathcanvas/evidence/eduitit-html30-v2/lifecycle/${recordId}/${state}.png`,
    screenshotSha256: String(index + 1).padStart(64, "0"),
    observationPath: `research/mathcanvas/evidence/eduitit-html30-v2/lifecycle/${recordId}/${state}.json`,
    observationFileSha256: String(index + 11).padStart(64, "0"),
    observationContentSha256: String(index + 21).padStart(64, "0"),
    persistedStateSha256,
    semanticProjectionSha256,
    selectionChromeVisible,
    boundsWithinWorkbench: true
  }));
  const body = {
    schemaVersion: "1.0.0",
    evidenceId: "eduitit-html30-v2-native-lifecycle-evidence",
    capturedAt: "2026-08-10T00:00:00.000Z",
    sourceBindings: {
      compiledCandidateContentSha256: sha,
      offlineDesignContentSha256: sha,
      projectManifestFileSha256: sha,
      captureHarness: {
        path: "scripts/contract-lab/capture-eduitit-html30-v2-lifecycle.mjs",
        fileSha256: sha
      }
    },
    coverageMode: "affordance-family-layout-risk-max",
    records: [
      {
        recordId,
        affordanceFamilyId: "native-test-v1",
        layoutVariant: "single-native-workbench",
        representativeSequence: 1,
        projectId: "project-1",
        candidatePayloadHash: sha,
        coveredSequences: Array.from({ length: 30 }, (_, index) => index + 1),
        states
      }
    ],
    verdict: "PASS",
    blockers: []
  };
  return { ...body, contentSha256: sha256Hex(body) };
}

describe("Eduitit HTML30 V2 release evidence contracts", () => {
  it("requires a real semantic change, reset, reopen, and exact 1–30 lifecycle coverage", () => {
    const lifecycle = passLifecycleEvidence();
    expect(eduititHtml30LifecycleEvidenceV2Schema.safeParse(lifecycle).success).toBe(true);

    const unchanged = structuredClone(lifecycle);
    unchanged.records[0]!.states[2]!.semanticProjectionSha256 =
      unchanged.records[0]!.states[0]!.semanticProjectionSha256;
    const { contentSha256: _old, ...unchangedBody } = unchanged;
    unchanged.contentSha256 = sha256Hex(unchangedBody);
    expect(eduititHtml30LifecycleEvidenceV2Schema.safeParse(unchanged).success).toBe(false);

    const missing = structuredClone(lifecycle);
    missing.records[0]!.coveredSequences.pop();
    const { contentSha256: _missingOld, ...missingBody } = missing;
    missing.contentSha256 = sha256Hex(missingBody);
    expect(eduititHtml30LifecycleEvidenceV2Schema.safeParse(missing).success).toBe(false);

    const forgedPath = structuredClone(lifecycle);
    forgedPath.records[0]!.states[1]!.screenshotPath =
      "research/mathcanvas/evidence/eduitit-html30-v2/lifecycle/html30-v2-lifecycle-native-test-single/initial.png";
    const { contentSha256: _forgedOld, ...forgedBody } = forgedPath;
    forgedPath.contentSha256 = sha256Hex(forgedBody);
    expect(eduititHtml30LifecycleEvidenceV2Schema.safeParse(forgedPath).success).toBe(false);
  });

  it("accepts an exact 30-screen independent review", () => {
    expect(eduititHtml30VisualReviewV2Schema.safeParse(passReview("gpt-5.6-sol")).success).toBe(true);
  });

  it("rejects reviewer identity drift, orphan findings, and observation order drift", () => {
    const identity = structuredClone(passReview("gpt-5.6-sol"));
    identity.reviewId = "eduitit-html30-v2-visual-review-opus";
    expect(eduititHtml30VisualReviewV2Schema.safeParse(identity).success).toBe(false);

    const orphan = structuredClone(passReview("claude-opus-5"));
    orphan.findings = [
      { findingId: "orphan-finding", severity: "P1", sequences: [1], message: "화면 근거에 연결되지 않은 결함입니다." }
    ];
    orphan.verdict = "ITERATE";
    orphan.totals.p1 = 1;
    expect(eduititHtml30VisualReviewV2Schema.safeParse(orphan).success).toBe(false);

    const order = structuredClone(passReview("gpt-5.6-sol"));
    [order.observations[0], order.observations[1]] = [order.observations[1]!, order.observations[0]!];
    expect(eduititHtml30VisualReviewV2Schema.safeParse(order).success).toBe(false);
  });

  it("allows link sync only for exact ordered evidence and both bound reviewers", () => {
    expect(eduititHtml30ReleaseAttestationV2Schema.safeParse(passAttestation()).success).toBe(true);

    const swappedPath = structuredClone(passAttestation());
    swappedPath.sourceBindings.visualReviews[0]!.path =
      "research/mathcanvas/eduitit-html30-v2-visual-review-opus.json";
    expect(eduititHtml30ReleaseAttestationV2Schema.safeParse(swappedPath).success).toBe(false);

    const falsePass = structuredClone(passAttestation());
    falsePass.gates.fixedChromeContentAndPeerNonOverlap = false;
    expect(eduititHtml30ReleaseAttestationV2Schema.safeParse(falsePass).success).toBe(false);

    const lifecycleMissing = structuredClone(passAttestation());
    lifecycleMissing.sourceBindings.lifecycleEvidence = null;
    expect(
      eduititHtml30ReleaseAttestationV2Schema.safeParse(lifecycleMissing).success
    ).toBe(false);

    const reordered = structuredClone(passAttestation());
    [reordered.screenshotEvidence[0], reordered.screenshotEvidence[1]] = [
      reordered.screenshotEvidence[1]!,
      reordered.screenshotEvidence[0]!
    ];
    expect(eduititHtml30ReleaseAttestationV2Schema.safeParse(reordered).success).toBe(false);

    const duplicateScreenshot = structuredClone(passAttestation());
    duplicateScreenshot.screenshotEvidence[1]!.screenshotSha256 =
      duplicateScreenshot.screenshotEvidence[0]!.screenshotSha256;
    expect(
      eduititHtml30ReleaseAttestationV2Schema.safeParse(duplicateScreenshot).success
    ).toBe(false);
  });
});
