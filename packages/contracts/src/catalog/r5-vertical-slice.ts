import { z } from "zod";
import { sha256Hex } from "../hash.js";
import { jsonRecordSchema } from "../vocabulary/json.js";
import { stableIdSchema } from "../vocabulary/ids.js";
import { spatialBoundsSchema, type SpatialBounds } from "../vocabulary/native-spatial.js";
import { worksheetFamilyRefSchema } from "./worksheet-v2.js";

export const R5_VERTICAL_SLICE_SCHEMA_VERSION = "1.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const semanticVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

const phaseSequenceSchema = z.tuple([
  z.literal("prediction"),
  z.literal("mathematical-confirmation"),
  z.literal("explanation"),
  z.literal("revision")
]);

const learnerSentenceSchema = z
  .string()
  .trim()
  .min(4)
  .max(74)
  .refine((value) => !value.includes("\n") && /[.?!]$/.test(value), {
    message: "학생 지시문은 한 줄의 완결된 문장이어야 합니다."
  });

const candidateSchema = z
  .object({
    candidateId: stableIdSchema,
    text: z.string().trim().min(1).max(24),
    interpretation: z.string().trim().min(1).max(180)
  })
  .strict();

const sourceStateSchema = z
  .object({
    state: z.enum(["initial", "selected", "manipulated"]),
    bounds: spatialBoundsSchema
  })
  .strict();

const predictedStateSchema = z
  .object({
    state: z.enum(["initial", "selected", "manipulated"]),
    relativeTo: z.literal("native-union-top-left"),
    bounds: spatialBoundsSchema
  })
  .strict();

export const r5VerticalSliceSpecSchema = z
  .object({
    schemaVersion: z.literal(R5_VERTICAL_SLICE_SCHEMA_VERSION),
    sliceId: stableIdSchema,
    sliceVersion: semanticVersionSchema,
    sequence: z.number().int().min(1).max(30),
    catalogEntryId: z.string().regex(/^grade3-basic-practice-ppt-\d{2}$/),
    title: z.string().trim().min(1).max(80),
    catalogSnapshotSha256: sha256Schema,
    families: z
      .object({
        blueprint: worksheetFamilyRefSchema,
        variation: worksheetFamilyRefSchema,
        affordance: worksheetFamilyRefSchema,
        layout: worksheetFamilyRefSchema
      })
      .strict(),
    mathematicalDecision: z.string().trim().min(1).max(240),
    misconception: z
      .object({
        misconceptionId: stableIdSchema,
        statement: z.string().trim().min(1).max(240),
        rejectedByObservedEvidence: z.string().trim().min(1).max(240)
      })
      .strict(),
    learnerTask: z
      .object({
        question: z.string().trim().min(1).max(100),
        candidates: z.tuple([candidateSchema, candidateSchema, candidateSchema]),
        correctCandidateId: stableIdSchema,
        phaseSequence: phaseSequenceSchema,
        instructions: z
          .object({
            prediction: learnerSentenceSchema,
            mathematicalConfirmation: learnerSentenceSchema,
            explanation: learnerSentenceSchema,
            revision: learnerSentenceSchema
          })
          .strict(),
        explanationEvidence: z.string().trim().min(1).max(240),
        initialAnswerComplete: z.literal(false)
      })
      .strict(),
    native: z
      .object({
        toolKey: z.enum(["DP03PG", "NO04NG", "NO03FM", "SM07CS"]),
        variantId: z.string().regex(/^(?:DP03PG|NO04NG|NO03FM|SM07CS)-\d{2}$/),
        discoveryEvidenceId: z.literal("r5-native-tool-discovery-v1"),
        discoveryEvidenceContentSha256: sha256Schema,
        initialObjectSha256: sha256Schema,
        manipulatedObjectSha256: sha256Schema,
        initialScreenshotSha256: sha256Schema,
        manipulatedScreenshotSha256: sha256Schema,
        operation: z.string().trim().min(1).max(160),
        configuredInitialState: jsonRecordSchema,
        targetState: jsonRecordSchema,
        invariant: z.string().trim().min(1).max(240),
        primaryMathematicalStateChanged: z.literal(true),
        initialTargetAnswerVisible: z.literal(false)
      })
      .strict(),
    spatialPreflight: z
      .object({
        profileId: z.literal("student-one-screen-large-v1"),
        profileVersion: z.literal("1.0.0"),
        profileContentSha256: sha256Schema,
        problemCount: z.literal(1),
        nativeScale: z.number().finite().min(0.5).max(1),
        sourceStateEnvelopesCss: z.tuple([
          sourceStateSchema.extend({ state: z.literal("initial") }).strict(),
          sourceStateSchema.extend({ state: z.literal("selected") }).strict(),
          sourceStateSchema.extend({ state: z.literal("manipulated") }).strict()
        ]),
        predictedStateEnvelopesCss: z.tuple([
          predictedStateSchema.extend({ state: z.literal("initial") }).strict(),
          predictedStateSchema.extend({ state: z.literal("selected") }).strict(),
          predictedStateSchema.extend({ state: z.literal("manipulated") }).strict()
        ]),
        predictedUnionCss: spatialBoundsSchema,
        maximumNativeReserveCssHeight: z.literal(211.6),
        oneScreenBudgetPass: z.literal(true),
        actualInteractionEvidencePending: z.literal(true)
      })
      .strict(),
    candidateState: z.literal("offline-design-candidate"),
    releaseQualified: z.literal(false),
    blockers: z.tuple([
      z.literal("activity-specific interaction evidence is not registered"),
      z.literal("actual save/reopen lifecycle is pending"),
      z.literal("fresh glyph and chrome canary is pending")
    ])
  })
  .strict()
  .superRefine((value, context) => {
    const familyIds = Object.values(value.families).map((family) => family.id);
    if (new Set(familyIds).size !== familyIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["families"],
        message: "blueprint·variation·affordance·layout family는 구분되어야 합니다."
      });
    }
    const candidateIds = value.learnerTask.candidates.map(
      (candidate) => candidate.candidateId
    );
    const candidateTexts = value.learnerTask.candidates.map(
      (candidate) => candidate.text
    );
    if (
      new Set(candidateIds).size !== 3 ||
      new Set(candidateTexts).size !== 3 ||
      !candidateIds.includes(value.learnerTask.correctCandidateId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["learnerTask", "candidates"],
        message: "보기 3개는 서로 달라야 하고 정답 ID를 정확히 포함해야 합니다."
      });
    }
    if (!value.native.variantId.startsWith(`${value.native.toolKey}-`)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["native", "variantId"],
        message: "native variant가 toolKey에 속하지 않습니다."
      });
    }
    assertSpatialPreflight(value.spatialPreflight, context);
  });

type SpatialPreflight = z.infer<
  typeof r5VerticalSliceSpecSchema
>["spatialPreflight"];

function approximately(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-3;
}

function union(bounds: readonly SpatialBounds[]): SpatialBounds {
  const left = Math.min(...bounds.map((entry) => entry.x));
  const top = Math.min(...bounds.map((entry) => entry.y));
  const right = Math.max(...bounds.map((entry) => entry.x + entry.width));
  const bottom = Math.max(...bounds.map((entry) => entry.y + entry.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function assertSpatialPreflight(
  value: SpatialPreflight,
  context: z.RefinementCtx
): void {
  const sourceBounds = value.sourceStateEnvelopesCss.map(
    (entry) => entry.bounds
  );
  const sourceUnion = union(sourceBounds);
  const expectedPredicted = sourceBounds.map((bounds) => ({
    x: (bounds.x - sourceUnion.x) * value.nativeScale,
    y: (bounds.y - sourceUnion.y) * value.nativeScale,
    width: bounds.width * value.nativeScale,
    height: bounds.height * value.nativeScale
  }));
  const predicted = value.predictedStateEnvelopesCss.map(
    (entry) => entry.bounds
  );
  const predictedUnion = union(predicted);
  const mismatch = predicted.some((bounds, index) => {
    const expected = expectedPredicted[index]!;
    return (
      !approximately(bounds.x, expected.x) ||
      !approximately(bounds.y, expected.y) ||
      !approximately(bounds.width, expected.width) ||
      !approximately(bounds.height, expected.height)
    );
  });
  if (
    mismatch ||
    !approximately(value.predictedUnionCss.x, predictedUnion.x) ||
    !approximately(value.predictedUnionCss.y, predictedUnion.y) ||
    !approximately(value.predictedUnionCss.width, predictedUnion.width) ||
    !approximately(value.predictedUnionCss.height, predictedUnion.height) ||
    predictedUnion.height > value.maximumNativeReserveCssHeight + 1e-3
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["spatialPreflight"],
      message:
        "source envelope→common-anchor scale 파생 또는 one-screen native 높이가 올바르지 않습니다."
    });
  }
}

export type R5VerticalSliceSpec = z.infer<typeof r5VerticalSliceSpecSchema>;

const r5VerticalSliceSetBodyBaseSchema = z
  .object({
    schemaVersion: z.literal(R5_VERTICAL_SLICE_SCHEMA_VERSION),
    setId: z.literal("r5-four-representation-vertical-slices-v1"),
    setVersion: z.literal("1.0.0"),
    generatedAt: z.string().datetime(),
    sourceBindings: z
      .object({
        promptHarness: z
          .object({
            path: z.literal(
              "research/mathcanvas/eduitit-html30-prompt-harness.json"
            ),
            fileSha256: sha256Schema,
            contentSha256: sha256Schema
          })
          .strict(),
        nativeDiscovery: z
          .object({
            path: z.literal("research/mathcanvas/r5-native-tool-discovery.json"),
            fileSha256: sha256Schema,
            contentSha256: sha256Schema
          })
          .strict(),
        oneScreenProfile: z
          .object({
            path: z.literal("research/mathcanvas/student-one-screen-large-v1.json"),
            fileSha256: sha256Schema,
            contentSha256: sha256Schema
          })
          .strict()
      })
      .strict(),
    entries: z.array(r5VerticalSliceSpecSchema).length(4),
    status: z.literal("offline-four-slice-review-ready"),
    releaseQualified: z.literal(false)
  })
  .strict();

export const r5VerticalSliceSetBodySchema =
  r5VerticalSliceSetBodyBaseSchema.superRefine((value, context) => {
    const sequences = value.entries.map((entry) => entry.sequence);
    const entryIds = value.entries.map((entry) => entry.catalogEntryId);
    if (
      sequences.join("|") !== "1|2|10|23" ||
      new Set(entryIds).size !== 4 ||
      value.entries.some(
        (entry) =>
          entry.native.discoveryEvidenceContentSha256 !==
            value.sourceBindings.nativeDiscovery.contentSha256 ||
          entry.spatialPreflight.profileContentSha256 !==
            value.sourceBindings.oneScreenProfile.contentSha256
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "R5 exact four-entry set 또는 source binding이 다릅니다."
      });
    }
  });

export type R5VerticalSliceSetBody = z.infer<
  typeof r5VerticalSliceSetBodySchema
>;

export function r5VerticalSliceSetContentHash(
  body: R5VerticalSliceSetBody
): string {
  return sha256Hex(r5VerticalSliceSetBodySchema.parse(body));
}

export const r5VerticalSliceSetSchema = r5VerticalSliceSetBodyBaseSchema
  .extend({ contentSha256: sha256Schema })
  .strict()
  .superRefine((value, context) => {
    const { contentSha256, ...body } = value;
    const parsed = r5VerticalSliceSetBodySchema.safeParse(body);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: issue.path,
          message: issue.message
        });
      }
      return;
    }
    if (contentSha256 !== r5VerticalSliceSetContentHash(parsed.data)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentSha256"],
        message: "R5 four-slice content hash가 본문과 다릅니다."
      });
    }
  });

export type R5VerticalSliceSet = z.infer<typeof r5VerticalSliceSetSchema>;
