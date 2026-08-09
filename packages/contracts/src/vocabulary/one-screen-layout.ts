import { z } from "zod";
import { sha256Hex } from "../hash.js";
import { stableIdSchema } from "./ids.js";
import { spatialBoundsSchema } from "./native-spatial.js";

export const ONE_SCREEN_LAYOUT_PROFILE_SCHEMA_VERSION = "1.0.0" as const;
export const CONSERVATIVE_FONT_METRICS_SCHEMA_VERSION = "1.0.0" as const;
export const LEARNING_PHASE_CONTRACT_VERSION = "1.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const prefixedSha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const semanticVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

export const learningPhaseSchema = z.enum([
  "prediction",
  "mathematical-confirmation",
  "explanation",
  "revision"
]);

export type LearningPhase = z.infer<typeof learningPhaseSchema>;

const phaseRegionBaseSchema = z.object({
  regionRole: stableIdSchema,
  visibleToLearner: z.literal(true),
  requiresStudentAction: z.literal(true)
});

export const learningPhaseContractSchema = z
  .object({
    contractId: stableIdSchema,
    contractVersion: z.literal(LEARNING_PHASE_CONTRACT_VERSION),
    sequence: z.tuple([
      z.literal("prediction"),
      z.literal("mathematical-confirmation"),
      z.literal("explanation"),
      z.literal("revision")
    ]),
    regions: z.tuple([
      phaseRegionBaseSchema
        .extend({
          phase: z.literal("prediction"),
          requiredAction: z.literal("record-initial-mathematical-decision"),
          requiredArtifact: z.literal("prediction-record")
        })
        .strict(),
      phaseRegionBaseSchema
        .extend({
          phase: z.literal("mathematical-confirmation"),
          requiredAction: z.literal("change-native-mathematical-state"),
          requiredArtifact: z.literal("native-state-evidence")
        })
        .strict(),
      phaseRegionBaseSchema
        .extend({
          phase: z.literal("explanation"),
          requiredAction: z.literal("explain-with-observed-evidence"),
          requiredArtifact: z.literal("student-evidence-explanation")
        })
        .strict(),
      phaseRegionBaseSchema
        .extend({
          phase: z.literal("revision"),
          requiredAction: z.literal("revise-recorded-decision"),
          requiredArtifact: z.literal("revised-prediction-record")
        })
        .strict()
    ]),
    initialState: z
      .object({
        answerComplete: z.literal(false),
        nativeMathematicalStateComplete: z.literal(false)
      })
      .strict()
  })
  .strict()
  .superRefine((value, context) => {
    const roles = value.regions.map((region) => region.regionRole);
    if (new Set(roles).size !== roles.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["regions"],
        message: "학습 phase regionRole은 서로 달라야 합니다."
      });
    }
  });

export type LearningPhaseContract = z.infer<
  typeof learningPhaseContractSchema
>;

export const learningPhaseReleaseEvidenceSchema = z
  .object({
    phaseSequence: z.tuple([
      z.literal("prediction"),
      z.literal("mathematical-confirmation"),
      z.literal("explanation"),
      z.literal("revision")
    ]),
    visibleRegionRoles: z.array(stableIdSchema).length(4),
    initialAnswerComplete: z.literal(false),
    nativeMathematicalStateChanged: z.literal(true),
    explanationUsesObservedEvidence: z.literal(true),
    revisionReferencesPrediction: z.literal(true),
    taskEnvelopeBounded: z.literal(true)
  })
  .strict();

export type LearningPhaseReleaseEvidence = z.infer<
  typeof learningPhaseReleaseEvidenceSchema
>;

export function assertLearningPhaseRelease(
  contract: LearningPhaseContract,
  evidence: LearningPhaseReleaseEvidence
): LearningPhaseReleaseEvidence {
  const parsedContract = learningPhaseContractSchema.parse(contract);
  const parsedEvidence = learningPhaseReleaseEvidenceSchema.parse(evidence);
  const expectedRoles = parsedContract.regions.map(
    (region) => region.regionRole
  );
  if (
    parsedEvidence.visibleRegionRoles.join("|") !==
    expectedRoles.join("|")
  ) {
    throw new Error("learning-phase-visible-region-binding-invalid");
  }
  return parsedEvidence;
}

const advanceRatioSchema = z.number().finite().positive().max(2);

export const conservativeFontMetricsTableBodySchema = z
  .object({
    schemaVersion: z.literal(CONSERVATIVE_FONT_METRICS_SCHEMA_VERSION),
    tableId: stableIdSchema,
    tableVersion: semanticVersionSchema,
    fontFingerprint: prefixedSha256Schema,
    sourceEvidence: z
      .object({
        probeId: stableIdSchema,
        evidenceFileSha256: sha256Schema,
        observedFontFamily: z.string().min(1).max(200)
      })
      .strict(),
    method: z.literal("offline-conservative-codepoint-advance-v1"),
    advanceEm: z
      .object({
        hangul: advanceRatioSchema,
        digit: advanceRatioSchema,
        latin: advanceRatioSchema,
        whitespace: advanceRatioSchema,
        punctuation: advanceRatioSchema,
        symbol: advanceRatioSchema,
        emoji: advanceRatioSchema,
        unknown: advanceRatioSchema
      })
      .strict(),
    limitations: z.array(z.string().min(1).max(300)).min(2).max(8)
  })
  .strict();

export type ConservativeFontMetricsTableBody = z.infer<
  typeof conservativeFontMetricsTableBodySchema
>;

export function conservativeFontMetricsContentHash(
  body: ConservativeFontMetricsTableBody
): string {
  return sha256Hex(conservativeFontMetricsTableBodySchema.parse(body));
}

export const conservativeFontMetricsTableSchema =
  conservativeFontMetricsTableBodySchema
    .extend({ contentSha256: sha256Schema })
    .strict()
    .superRefine((value, context) => {
      const { contentSha256, ...body } = value;
      if (contentSha256 !== conservativeFontMetricsContentHash(body)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contentSha256"],
          message: "font metrics content hash가 본문과 다릅니다."
        });
      }
    });

export type ConservativeFontMetricsTable = z.infer<
  typeof conservativeFontMetricsTableSchema
>;

const interactionStateEnvelopeSchema = z
  .object({
    state: z.enum(["initial", "selected", "manipulated"]),
    relativeTo: z.literal("native-reserve-top-left"),
    bounds: spatialBoundsSchema
  })
  .strict();

export const oneScreenInteractionEvidenceBodySchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    evidenceId: stableIdSchema,
    evidenceVersion: semanticVersionSchema,
    nativeContractId: stableIdSchema,
    nativeContractVersion: z.literal("2.0.0"),
    sourceEvidence: z
      .object({
        artifactPath: z
          .string()
          .regex(/^research\/mathcanvas\/[a-z0-9][a-z0-9._/-]*\.json$/),
        fileSha256: sha256Schema,
        contentSha256: sha256Schema,
        nativeContractRecordHash: sha256Schema
      })
      .strict(),
    coverage: z.literal("activity-specific-pinned"),
    viewport: z
      .object({
        width: z.literal(1280),
        height: z.literal(800),
        surfaceMode: z.literal("authoring-editor"),
        sidebarState: z.literal("expanded")
      })
      .strict(),
    commonAnchor: z
      .object({
        kind: z.literal("native-reserve-top-left"),
        reserveWidthCssPx: z.number().finite().positive(),
        reserveHeightCssPx: z.number().finite().positive()
      })
      .strict(),
    stateEnvelopesCss: z.tuple([
      interactionStateEnvelopeSchema.extend({ state: z.literal("initial") }).strict(),
      interactionStateEnvelopeSchema.extend({ state: z.literal("selected") }).strict(),
      interactionStateEnvelopeSchema.extend({ state: z.literal("manipulated") }).strict()
    ]),
    selectedChromeIncluded: z.literal(true),
    manipulatedMovementIncluded: z.literal(true),
    taskEnvelopeBounded: z.literal(true)
  })
  .strict();

export type OneScreenInteractionEvidenceBody = z.infer<
  typeof oneScreenInteractionEvidenceBodySchema
>;

export function oneScreenInteractionEvidenceContentHash(
  body: OneScreenInteractionEvidenceBody
): string {
  return sha256Hex(oneScreenInteractionEvidenceBodySchema.parse(body));
}

export const oneScreenInteractionEvidenceSchema =
  oneScreenInteractionEvidenceBodySchema
    .extend({ contentSha256: sha256Schema })
    .strict()
    .superRefine((value, context) => {
      const { contentSha256, ...body } = value;
      if (contentSha256 !== oneScreenInteractionEvidenceContentHash(body)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contentSha256"],
          message: "one-screen interaction evidence hash가 본문과 다릅니다."
        });
      }
    });

export type OneScreenInteractionEvidence = z.infer<
  typeof oneScreenInteractionEvidenceSchema
>;

const typographyRoleSchema = z
  .object({
    minCssPx: z.number().finite().min(22).max(64),
    targetCssPx: z.number().finite().min(22).max(64),
    maxCssPx: z.number().finite().min(22).max(64),
    lineHeightRatio: z.number().finite().min(1.35).max(1.8)
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.minCssPx > value.targetCssPx ||
      value.targetCssPx > value.maxCssPx
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "typography min/target/max 순서가 잘못되었습니다."
      });
    }
  });

const oneScreenLayoutProfileBodySchema = z
  .object({
    schemaVersion: z.literal(ONE_SCREEN_LAYOUT_PROFILE_SCHEMA_VERSION),
    profileId: stableIdSchema,
    profileVersion: semanticVersionSchema,
    geometryBinding: z
      .object({
        profileId: stableIdSchema,
        profileVersion: semanticVersionSchema,
        profileFileSha256: sha256Schema,
        profileContentSha256: sha256Schema,
        fixedSafeCss: spatialBoundsSchema,
        fixedSafeCanvas: spatialBoundsSchema,
        coordinateScaleX: z.number().finite().positive(),
        coordinateScaleY: z.number().finite().positive()
      })
      .strict(),
    fontMetricsBinding: z
      .object({
        tableId: stableIdSchema,
        tableVersion: semanticVersionSchema,
        tableFileSha256: sha256Schema,
        tableContentSha256: sha256Schema,
        fontFingerprint: prefixedSha256Schema
      })
      .strict(),
    viewport: z
      .object({
        width: z.literal(1280),
        height: z.literal(800),
        surfaceMode: z.literal("authoring-editor"),
        sidebarState: z.literal("expanded"),
        scrollAllowed: z.literal(false),
        canvasPanAllowed: z.literal(false)
      })
      .strict(),
    typography: z
      .object({
        fixedLearnerTextMinimumCssPx: z.number().finite().min(22),
        title: typographyRoleSchema,
        question: typographyRoleSchema,
        coreInstruction: typographyRoleSchema,
        candidate: typographyRoleSchema,
        mathLabel: typographyRoleSchema,
        support: typographyRoleSchema
      })
      .strict(),
    spacing: z
      .object({
        outerPaddingXCssPx: z.number().finite().min(20),
        outerPaddingYCssPx: z.number().finite().min(8),
        semanticGroupGapCssPx: z.number().finite().min(18),
        internalGapCssPx: z.number().finite().min(8),
        candidateCardPaddingXCssPx: z.number().finite().min(20),
        candidateCardPaddingYCssPx: z.number().finite().min(18),
        candidateColumnGapCssPx: z.number().finite().min(8),
        candidateRowGapCssPx: z.number().finite().min(8),
        interProblemGapCssPx: z.number().finite().min(24),
        writingMinimumHeightCssPx: z.number().finite().min(44),
        nativeToNextPhaseClearanceCssPx: z.number().finite().min(8),
        centeringToleranceCssPx: z.number().finite().min(0).max(1)
      })
      .strict(),
    candidatePolicy: z
      .object({
        minimumCount: z.literal(3),
        maximumCount: z.literal(3),
        columns: z.literal(3),
        horizontalAlignment: z.literal("center"),
        verticalAlignment: z.literal("center")
      })
      .strict(),
    nativePolicy: z
      .object({
        reserveFirst: z.literal(true),
        interactionEvidenceRequired: z.literal(true),
        taskEnvelopeMustBeBounded: z.literal(true),
        requiredStates: z.tuple([
          z.literal("initial"),
          z.literal("selected"),
          z.literal("manipulated")
        ])
      })
      .strict(),
    problemCapacity: z
      .object({
        supportedCounts: z.tuple([z.literal(1)]),
        assumedMinimumNativeReserveCssHeight: z.number().finite().positive(),
        oneProblemMinimumCssHeight: z.number().finite().positive(),
        twoProblemMinimumCssHeight: z.number().finite().positive(),
        availableCssHeight: z.number().finite().positive(),
        twoProblemStatus: z.literal("unsupported"),
        twoProblemReason: z.string().min(1).max(300)
      })
      .strict(),
    phaseContract: learningPhaseContractSchema,
    eligibility: z
      .object({
        fixedGeometryReady: z.literal(true),
        offlineTypographyReady: z.literal(true),
        genericInteractionReady: z.literal(false),
        requiresActivitySpecificInteractionEvidence: z.literal(true),
        releaseQualified: z.literal(false)
      })
      .strict()
  })
  .strict();

export type OneScreenLayoutProfileBody = z.infer<
  typeof oneScreenLayoutProfileBodySchema
>;

function approximate(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-6;
}

export function oneProblemMinimumCssHeight(
  profile: Pick<
    OneScreenLayoutProfileBody,
    "typography" | "spacing" | "problemCapacity"
  >
): number {
  const title =
    profile.typography.title.targetCssPx *
    profile.typography.title.lineHeightRatio;
  const instruction =
    profile.typography.coreInstruction.targetCssPx *
    profile.typography.coreInstruction.lineHeightRatio;
  const candidateLine =
    profile.typography.candidate.targetCssPx *
    profile.typography.candidate.lineHeightRatio;
  const candidateCard =
    candidateLine + profile.spacing.candidateCardPaddingYCssPx * 2;
  const prediction =
    instruction + profile.spacing.internalGapCssPx + candidateCard;
  const confirmation =
    instruction +
    profile.spacing.internalGapCssPx +
    profile.problemCapacity.assumedMinimumNativeReserveCssHeight;
  const explanation =
    instruction +
    profile.spacing.internalGapCssPx +
    profile.spacing.writingMinimumHeightCssPx;
  const revision = instruction;
  return (
    profile.spacing.outerPaddingYCssPx * 2 +
    title +
    prediction +
    confirmation +
    explanation +
    revision +
    profile.spacing.semanticGroupGapCssPx * 4
  );
}

export function twoProblemMinimumCssHeight(
  profile: Pick<
    OneScreenLayoutProfileBody,
    "typography" | "spacing" | "problemCapacity"
  >
): number {
  const one = oneProblemMinimumCssHeight(profile);
  const contentWithoutOuterPadding =
    one - profile.spacing.outerPaddingYCssPx * 2;
  return (
    profile.spacing.outerPaddingYCssPx * 2 +
    contentWithoutOuterPadding * 2 +
    profile.spacing.interProblemGapCssPx
  );
}

export function oneScreenLayoutProfileContentHash(
  body: OneScreenLayoutProfileBody
): string {
  return sha256Hex(oneScreenLayoutProfileBodySchema.parse(body));
}

export const oneScreenLayoutProfileSchema = oneScreenLayoutProfileBodySchema
  .extend({ contentSha256: sha256Schema })
  .strict()
  .superRefine((value, context) => {
    const { contentSha256, ...body } = value;
    if (contentSha256 !== oneScreenLayoutProfileContentHash(body)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentSha256"],
        message: "one-screen profile content hash가 본문과 다릅니다."
      });
    }
    const safe = value.geometryBinding.fixedSafeCss;
    if (
      safe.x < 0 ||
      safe.y < 0 ||
      safe.x + safe.width > value.viewport.width ||
      safe.y + safe.height > value.viewport.height
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["geometryBinding", "fixedSafeCss"],
        message: "fixed safe rect가 viewport를 벗어납니다."
      });
    }
    const typographyRoles = [
      value.typography.title,
      value.typography.question,
      value.typography.coreInstruction,
      value.typography.candidate,
      value.typography.mathLabel,
      value.typography.support
    ];
    if (
      typographyRoles.some(
        (role) =>
          role.minCssPx <
          value.typography.fixedLearnerTextMinimumCssPx
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["typography"],
        message: "학습자 고정 문구가 profile 하한보다 작습니다."
      });
    }
    const expectedOne = oneProblemMinimumCssHeight(value);
    const expectedTwo = twoProblemMinimumCssHeight(value);
    if (
      !approximate(
        value.problemCapacity.oneProblemMinimumCssHeight,
        expectedOne
      ) ||
      !approximate(
        value.problemCapacity.twoProblemMinimumCssHeight,
        expectedTwo
      ) ||
      !approximate(
        value.problemCapacity.availableCssHeight,
        value.geometryBinding.fixedSafeCss.height
      ) ||
      expectedOne > value.problemCapacity.availableCssHeight ||
      expectedTwo <= value.problemCapacity.availableCssHeight
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["problemCapacity"],
        message: "한 문제/두 문제 vertical budget 근거가 profile과 다릅니다."
      });
    }
  });

export type OneScreenLayoutProfile = z.infer<
  typeof oneScreenLayoutProfileSchema
>;
