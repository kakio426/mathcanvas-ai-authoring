import { z } from "zod";
import { sha256Hex } from "../hash.js";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const sequenceSchema = z.number().int().min(1).max(30);

export const EDUITIT_HTML30_VISUAL_REVIEW_CRITERIA_VERSION =
  "html30-v2-original-pixel-pedagogy-and-geometry-v2" as const;

const reviewFindingSchema = z
  .object({
    findingId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,80}$/),
    severity: z.enum(["P0", "P1", "P2"]),
    sequences: z.array(sequenceSchema).min(1).max(30),
    message: z.string().trim().min(8).max(500)
  })
  .strict();

const reviewObservationSchema = z
  .object({
    sequence: sequenceSchema,
    projectId: z.string().regex(/^[A-Za-z0-9_-]+$/),
    screenshotSha256: sha256Schema,
    verdict: z.enum(["PASS", "ITERATE"]),
    findingIds: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{2,80}$/)).max(20)
  })
  .strict();

export const eduititHtml30VisualReviewV2Schema = z
  .object({
    schemaVersion: z.literal("2.0.0"),
    reviewId: z.enum([
      "eduitit-html30-v2-visual-review-sol",
      "eduitit-html30-v2-visual-review-opus"
    ]),
    reviewedAt: z.string().datetime(),
    reviewer: z
      .object({
        model: z.enum(["gpt-5.6-sol", "claude-opus-5"]),
        effort: z.enum(["xhigh", "max", "ultra"]),
        sessionId: z.string().trim().min(4).max(200),
        independentFromOtherReview: z.literal(true)
      })
      .strict(),
    sourceBindings: z
      .object({
        reopenAuditFileSha256: sha256Schema,
        compiledCandidateContentSha256: sha256Schema
      })
      .strict(),
    criteriaVersion: z.literal(EDUITIT_HTML30_VISUAL_REVIEW_CRITERIA_VERSION),
    observations: z.array(reviewObservationSchema).length(30),
    findings: z.array(reviewFindingSchema).max(100),
    verdict: z.enum(["PASS", "ITERATE"]),
    totals: z
      .object({
        p0: z.number().int().min(0).max(100),
        p1: z.number().int().min(0).max(100),
        p2: z.number().int().min(0).max(100)
      })
      .strict(),
    contentSha256: sha256Schema
  })
  .strict()
  .superRefine((value, context) => {
    const expectedSequences = Array.from({ length: 30 }, (_, index) => index + 1);
    const findingIds = value.findings.map((finding) => finding.findingId);
    const findingById = new Map(value.findings.map((finding) => [finding.findingId, finding]));
    const calculated = {
      p0: value.findings.filter((finding) => finding.severity === "P0").length,
      p1: value.findings.filter((finding) => finding.severity === "P1").length,
      p2: value.findings.filter((finding) => finding.severity === "P2").length
    };
    const observationsValid = value.observations.every((observation, index) => {
      if (observation.sequence !== expectedSequences[index]) return false;
      if (new Set(observation.findingIds).size !== observation.findingIds.length) {
        return false;
      }
      const referenced = observation.findingIds.map((findingId) => findingById.get(findingId));
      return (
        referenced.every(
          (finding) => finding && finding.sequences.includes(observation.sequence)
        ) &&
        (observation.verdict === "PASS") === (observation.findingIds.length === 0)
      );
    });
    const expectedReviewId = value.reviewer.model === "gpt-5.6-sol"
      ? "eduitit-html30-v2-visual-review-sol"
      : "eduitit-html30-v2-visual-review-opus";
    const shouldPass =
      value.findings.length === 0 &&
      value.observations.every((observation) => observation.verdict === "PASS");
    const referencedFindingIds = new Set(
      value.observations.flatMap((observation) => observation.findingIds)
    );
    if (
      value.reviewId !== expectedReviewId ||
      new Set(findingIds).size !== findingIds.length ||
      value.findings.some(
        (finding) =>
          new Set(finding.sequences).size !== finding.sequences.length ||
          !referencedFindingIds.has(finding.findingId)
      ) ||
      new Set(value.observations.map((observation) => observation.projectId)).size !== 30 ||
      new Set(
        value.observations.map((observation) => observation.screenshotSha256)
      ).size !== 30 ||
      !observationsValid ||
      calculated.p0 !== value.totals.p0 ||
      calculated.p1 !== value.totals.p1 ||
      calculated.p2 !== value.totals.p2 ||
      (value.verdict === "PASS") !== shouldPass
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "시각 검토는 reviewer·30개 screenshot·finding·총계·판정을 서로 정확히 결속해야 합니다."
      });
    }
  });

export type EduititHtml30VisualReviewV2 = z.infer<
  typeof eduititHtml30VisualReviewV2Schema
>;

const lifecycleStateNameSchema = z.enum([
  "initial",
  "selected",
  "core-manipulated",
  "undo-reset",
  "reopened"
]);
const lifecycleRecordIdSchema = z
  .string()
  .regex(/^html30-v2-lifecycle-[a-z0-9-]+$/);
const lifecycleScreenshotPathSchema = z
  .string()
  .regex(
    /^research\/mathcanvas\/evidence\/eduitit-html30-v2\/lifecycle\/html30-v2-lifecycle-[a-z0-9-]+\/(?:initial|selected|core-manipulated|undo-reset|reopened)\.png$/
  );
const lifecycleObservationPathSchema = z
  .string()
  .regex(
    /^research\/mathcanvas\/evidence\/eduitit-html30-v2\/lifecycle\/html30-v2-lifecycle-[a-z0-9-]+\/(?:initial|selected|core-manipulated|undo-reset|reopened)\.json$/
  );

export const eduititHtml30LifecycleStateObservationV2Schema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    recordId: lifecycleRecordIdSchema,
    state: lifecycleStateNameSchema,
    sequence: sequenceSchema,
    projectId: z.string().regex(/^[A-Za-z0-9_-]+$/),
    candidatePayloadHash: sha256Schema,
    captureHarnessFileSha256: sha256Schema,
    screenshotPath: lifecycleScreenshotPathSchema,
    screenshotSha256: sha256Schema,
    persistedStateSha256: sha256Schema,
    semanticProjectionSha256: sha256Schema,
    selectionChromeVisible: z.boolean(),
    boundsWithinWorkbench: z.literal(true),
    contentSha256: sha256Schema
  })
  .strict()
  .superRefine((value, context) => {
    const { contentSha256, ...body } = value;
    if (contentSha256 !== sha256Hex(body)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lifecycle state observation은 canonical content hash와 일치해야 합니다."
      });
    }
  });

const lifecycleStateSchema = z
  .object({
    state: lifecycleStateNameSchema,
    screenshotPath: lifecycleScreenshotPathSchema,
    screenshotSha256: sha256Schema,
    observationPath: lifecycleObservationPathSchema,
    observationFileSha256: sha256Schema,
    observationContentSha256: sha256Schema,
    persistedStateSha256: sha256Schema,
    semanticProjectionSha256: sha256Schema,
    selectionChromeVisible: z.boolean(),
    boundsWithinWorkbench: z.literal(true)
  })
  .strict();

const lifecycleRecordSchema = z
  .object({
    recordId: lifecycleRecordIdSchema,
    affordanceFamilyId: z.string().regex(/^[a-z0-9][a-z0-9-]+-v\d+$/),
    layoutVariant: z.enum(["single-native-workbench", "composition-workbench"]),
    representativeSequence: sequenceSchema,
    projectId: z.string().regex(/^[A-Za-z0-9_-]+$/),
    candidatePayloadHash: sha256Schema,
    coveredSequences: z.array(sequenceSchema).min(1).max(30),
    states: z.tuple([
      lifecycleStateSchema.extend({ state: z.literal("initial") }).strict(),
      lifecycleStateSchema
        .extend({
          state: z.literal("selected"),
          selectionChromeVisible: z.literal(true)
        })
        .strict(),
      lifecycleStateSchema
        .extend({
          state: z.literal("core-manipulated"),
          selectionChromeVisible: z.literal(true)
        })
        .strict(),
      lifecycleStateSchema.extend({ state: z.literal("undo-reset") }).strict(),
      lifecycleStateSchema
        .extend({
          state: z.literal("reopened"),
          selectionChromeVisible: z.literal(false)
        })
        .strict()
    ])
  })
  .strict();

export const eduititHtml30LifecycleEvidenceV2Schema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    evidenceId: z.literal("eduitit-html30-v2-native-lifecycle-evidence"),
    capturedAt: z.string().datetime(),
    sourceBindings: z
      .object({
        compiledCandidateContentSha256: sha256Schema,
        offlineDesignContentSha256: sha256Schema,
        projectManifestFileSha256: sha256Schema,
        captureHarness: z
          .object({
            path: z.literal(
              "scripts/contract-lab/capture-eduitit-html30-v2-lifecycle.mjs"
            ),
            fileSha256: sha256Schema
          })
          .strict()
      })
      .strict(),
    coverageMode: z.literal("affordance-family-layout-risk-max"),
    records: z.array(lifecycleRecordSchema).min(1).max(30),
    verdict: z.enum(["PASS", "ITERATE"]),
    blockers: z.array(z.string().trim().min(1).max(300)).max(100),
    contentSha256: sha256Schema
  })
  .strict()
  .superRefine((value, context) => {
    const exactSequences = Array.from({ length: 30 }, (_, index) => index + 1);
    const covered = value.records
      .flatMap((record) => record.coveredSequences)
      .sort((left, right) => left - right);
    const recordsValid = value.records.every((record) => {
      const [initial, selected, manipulated, reset, reopened] = record.states;
      return (
        record.coveredSequences.includes(record.representativeSequence) &&
        new Set(record.coveredSequences).size === record.coveredSequences.length &&
        new Set(record.states.map((state) => state.screenshotSha256)).size === 5 &&
        record.states.every(
          (state) =>
            state.screenshotPath ===
              `research/mathcanvas/evidence/eduitit-html30-v2/lifecycle/${record.recordId}/${state.state}.png` &&
            state.observationPath ===
              `research/mathcanvas/evidence/eduitit-html30-v2/lifecycle/${record.recordId}/${state.state}.json`
        ) &&
        selected.semanticProjectionSha256 === initial.semanticProjectionSha256 &&
        manipulated.semanticProjectionSha256 !== initial.semanticProjectionSha256 &&
        reset.semanticProjectionSha256 === initial.semanticProjectionSha256 &&
        reopened.semanticProjectionSha256 === initial.semanticProjectionSha256 &&
        reset.persistedStateSha256 === initial.persistedStateSha256 &&
        reopened.persistedStateSha256 === initial.persistedStateSha256
      );
    });
    const shouldPass =
      recordsValid &&
      JSON.stringify(covered) === JSON.stringify(exactSequences) &&
      value.blockers.length === 0;
    const { contentSha256, ...body } = value;
    if (
      new Set(value.records.map((record) => record.recordId)).size !==
        value.records.length ||
      new Set(value.records.map((record) => record.projectId)).size !==
        value.records.length ||
      !recordsValid ||
      JSON.stringify(covered) !== JSON.stringify(exactSequences) ||
      (value.verdict === "PASS") !== shouldPass ||
      contentSha256 !== sha256Hex(body)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "lifecycle evidence는 family×layout 대표의 selected·manipulated·undo/reset·reopen 상태와 1–30 coverage를 정확히 결속해야 합니다."
      });
    }
  });

export type EduititHtml30LifecycleEvidenceV2 = z.infer<
  typeof eduititHtml30LifecycleEvidenceV2Schema
>;

const reviewBindingSchema = z
  .object({
    model: z.enum(["gpt-5.6-sol", "claude-opus-5"]),
    path: z.enum([
      "research/mathcanvas/eduitit-html30-v2-visual-review-sol.json",
      "research/mathcanvas/eduitit-html30-v2-visual-review-opus.json"
    ]),
    fileSha256: sha256Schema,
    contentSha256: sha256Schema,
    sessionId: z.string().trim().min(4).max(200),
    verdict: z.enum(["PASS", "ITERATE"])
  })
  .strict();

const lifecycleBindingSchema = z
  .object({
    path: z.literal(
      "research/mathcanvas/eduitit-html30-v2-native-lifecycle-evidence.json"
    ),
    fileSha256: sha256Schema,
    contentSha256: sha256Schema,
    verdict: z.enum(["PASS", "ITERATE"])
  })
  .strict();

export const eduititHtml30ReleaseAttestationV2Schema = z
  .object({
    schemaVersion: z.literal("2.1.0"),
    attestationId: z.literal("eduitit-html30-v2-release-attestation"),
    attestedAt: z.string().datetime(),
    sourceBindings: z
      .object({
        compiledCandidateContentSha256: sha256Schema,
        offlineDesignContentSha256: sha256Schema,
        promptHarnessContentSha256: sha256Schema,
        projectManifestFileSha256: sha256Schema,
        reopenAuditFileSha256: sha256Schema,
        lifecycleEvidence: lifecycleBindingSchema.nullable(),
        visualReviews: z.array(reviewBindingSchema).length(2)
      })
      .strict(),
    exactActivityCount: z.literal(30),
    gates: z
      .object({
        actualMathCanvas100Percent: z.boolean(),
        oneProblemNoScroll: z.boolean(),
        authoredPayloadSaveReopen: z.boolean(),
        fixedChromeContentAndPeerNonOverlap: z.boolean(),
        mathematicalDecisionAlternatives: z.boolean(),
        actualNativeLifecycle: z.boolean(),
        freshIndependentVisualReviews: z.boolean()
      })
      .strict(),
    screenshotEvidence: z
      .array(
        z
          .object({
            sequence: sequenceSchema,
            projectId: z.string().regex(/^[A-Za-z0-9_-]+$/),
            screenshotSha256: sha256Schema
          })
          .strict()
      )
      .length(30),
    releaseQualifiedSequences: z.array(sequenceSchema).max(30),
    releaseQualifiedCount: z.number().int().min(0).max(30),
    linkSyncAllowed: z.boolean(),
    blockers: z.array(z.string().trim().min(1).max(300)).max(100),
    contentSha256: sha256Schema
  })
  .strict()
  .superRefine((value, context) => {
    const gatesPass = Object.values(value.gates).every(Boolean);
    const sequences = value.releaseQualifiedSequences;
    const reviews = value.sourceBindings.visualReviews;
    const shouldAllow =
      gatesPass &&
      sequences.length === 30 &&
      value.blockers.length === 0 &&
      value.sourceBindings.lifecycleEvidence?.verdict === "PASS" &&
      reviews.every((review) => review.verdict === "PASS");
    const expectedReviewPath = (model: (typeof reviews)[number]["model"]) =>
      model === "gpt-5.6-sol"
        ? "research/mathcanvas/eduitit-html30-v2-visual-review-sol.json"
        : "research/mathcanvas/eduitit-html30-v2-visual-review-opus.json";
    const exactSequences = Array.from({ length: 30 }, (_, index) => index + 1);
    if (
      value.screenshotEvidence.some(
        (entry, index) => entry.sequence !== exactSequences[index]
      ) ||
      new Set(value.screenshotEvidence.map((entry) => entry.projectId)).size !== 30 ||
      new Set(
        value.screenshotEvidence.map((entry) => entry.screenshotSha256)
      ).size !== 30 ||
      new Set(reviews.map((review) => review.model)).size !== 2 ||
      new Set(reviews.map((review) => review.sessionId)).size !== 2 ||
      reviews.some((review) => review.path !== expectedReviewPath(review.model)) ||
      (value.gates.actualNativeLifecycle === true) !==
        (value.sourceBindings.lifecycleEvidence?.verdict === "PASS") ||
      new Set(sequences).size !== sequences.length ||
      sequences.some((sequence, index) => sequence !== exactSequences[index]) ||
      value.releaseQualifiedCount !== sequences.length ||
      value.linkSyncAllowed !== shouldAllow
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "release attestation은 계산된 gate·두 독립 검토·30개 screenshot과 링크 승격을 정확히 결속해야 합니다."
      });
    }
  });

export type EduititHtml30ReleaseAttestationV2 = z.infer<
  typeof eduititHtml30ReleaseAttestationV2Schema
>;
