import { z } from "zod";
import { teacherIntentSchema } from "./teacher-intent.js";

export const CONTRACT_SCHEMA_VERSION = "1.0.0" as const;
export const ACTIVITY_SPEC_SCHEMA_VERSION = "1.0.0" as const;
export const VERIFIED_TEMPLATE_ID =
  "fraction.compare.unlike-denominators.visual-v1" as const;
export const MIN_VISUAL_FRACTION_DIFFERENCE_RATIO = 0.08 as const;

const identifier = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/, "식별자에는 영문, 숫자, . _ : -만 사용할 수 있습니다.");

export const difficultySchema = z.enum(["easy", "normal", "hard"]);
export const denominatorRelationSchema = z.enum([
  "mixed",
  "coprime",
  "multiple"
]);
export const manipulationSchema = z.enum([
  "fraction-strip-common-start-drag",
  "equivalent-fraction-strip-match",
  "number-card-make-ten-drag",
  "number-card-balanced-equation-drag",
  "balance-scale-sum-card-drag",
  "clock-hour-hand-boundary-drag",
  "elapsed-time-clock-pair-drag",
  "same-denominator-fraction-sum-drag",
  "same-denominator-improper-sum-drag",
  "unlike-denominator-common-unit-drag",
  "unlike-denominator-common-unit-difference-drag",
  "bar-graph-scale-unit-drag",
  "length-unit-iteration-drag",
  "place-value-ten-exchange-drag",
  "pattern-block-repeat-unit-drag",
  "multiplication-array-choice-drag",
  "probability-fraction-strip-drag",
  "claim-evidence-revision-drag",
  "factor-pair-array-construction-drag",
  "partial-operation-expression-construction-drag",
  "bar-graph-represent-cells-drag"
]);
export const gradeBandSchema = z.enum(["1-2", "3-4", "5-6"]);

export const boundsSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive().finite(),
    height: z.number().positive().finite()
  })
  .strict();

export const fractionSchema = z
  .object({
    numerator: z.number().int().min(1).max(11),
    denominator: z.number().int().min(2).max(12)
  })
  .strict()
  .refine((value) => value.numerator < value.denominator, {
    message: "첫 버전은 진분수만 지원합니다."
  });

export const curriculumSourceSchema = z
  .object({
    sourceId: identifier,
    sourceKind: z.enum(["official", "auxiliary"]),
    title: z.string().min(1).max(240),
    url: z.string().url(),
    locator: z.string().min(1).max(500),
    version: z.string().min(1).max(160),
    verificationStatus: z.enum([
      "official-text-verified",
      "official-source-checked",
      "auxiliary-pinned",
      "unverified"
    ]),
    sourceTextIncluded: z.boolean(),
    caveat: z.string().min(1).max(1000).optional()
  })
  .strict();

export const curriculumRecordSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    key: identifier,
    code: z.string().regex(/^\[[246]수\d{2}-\d{2}\]$/),
    gradeBand: gradeBandSchema,
    domain: z.enum([
      "수와 연산",
      "변화와 관계",
      "도형과 측정",
      "자료와 가능성"
    ]),
    officialGoal: z.string().min(1).max(500),
    prerequisites: z.array(z.string().min(1).max(500)).max(12),
    officialSource: curriculumSourceSchema.refine(
      (source) =>
        source.sourceKind === "official" &&
        (source.verificationStatus === "official-text-verified" ||
          source.verificationStatus === "official-source-checked"),
      "공식 출처 확인 상태가 필요합니다."
    ),
    auxiliarySources: z.array(curriculumSourceSchema).max(8),
    reviewedAt: z.string().datetime(),
    reviewer: z.string().min(1).max(120)
  })
  .strict();

export const generationRequestSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    requestId: identifier,
    prompt: z.string().trim().min(5).max(2000),
    requestedStandardCode: z
      .string()
      .regex(/^\[[246]수\d{2}-\d{2}\]$/)
      .optional(),
    requestedGrade: z.number().int().min(1).max(6).optional(),
    problemCount: z.number().int().min(1).max(6).optional(),
    difficulty: difficultySchema.optional(),
    denominatorRelation: denominatorRelationSchema.optional(),
    manipulation: manipulationSchema.optional(),
    teacherIntent: teacherIntentSchema.optional(),
    createdAt: z.string().datetime()
  })
  .strict();

export const recommendationSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    requestId: identifier,
    supported: z.boolean(),
    templateId: identifier.optional(),
    gradeBand: gradeBandSchema.optional(),
    recommendedGrade: z.number().int().min(1).max(6).optional(),
    standardCode: z.string().optional(),
    learningGoal: z.string().min(1).max(500).optional(),
    prerequisites: z.array(z.string().min(1).max(500)).max(12),
    problemCount: z.number().int().min(1).max(6).optional(),
    difficulty: difficultySchema.optional(),
    denominatorRelation: denominatorRelationSchema.optional(),
    manipulation: manipulationSchema.optional(),
    teacherIntent: teacherIntentSchema.optional(),
    rationale: z.array(z.string().min(1).max(500)).min(1).max(8),
    confidence: z.number().min(0).max(1),
    caveats: z.array(z.string().min(1).max(1000)).max(12),
    blockingReasons: z.array(z.string().min(1).max(1000)).max(12),
    unsupportedRequests: z.array(z.string().min(1).max(500)).max(8).optional(),
    t0Proposal: z
      .object({
        problemCount: z.number().int().min(1).max(6),
        difficulty: difficultySchema,
        denominatorRelation: denominatorRelationSchema.optional()
      })
      .strict()
      .optional(),
    curriculum: curriculumRecordSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.supported) {
      const required: Array<keyof typeof value> = [
        "templateId",
        "gradeBand",
        "recommendedGrade",
        "standardCode",
        "learningGoal",
        "problemCount",
        "difficulty",
        "manipulation",
        "curriculum"
      ];
      for (const key of required) {
        if (value[key] === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: "지원 추천에는 이 필드가 필요합니다."
          });
        }
      }
    }
  });

export const relationSchema = z.enum(["<", ">"]);

export const activityProblemSchema = z
  .object({
    id: identifier,
    order: z.number().int().min(1).max(6),
    left: fractionSchema,
    right: fractionSchema,
    correctRelation: relationSchema,
    difficulty: difficultySchema,
    explanation: z.string().min(1).max(400)
  })
  .strict()
  .refine((problem) => problem.left.denominator !== problem.right.denominator, {
    message: "두 분수의 분모는 달라야 합니다."
  });

export const visualModelSchema = z
  .object({
    id: identifier,
    problemId: identifier,
    role: z.enum(["left-strip", "right-strip"]),
    fraction: fractionSchema,
    bounds: boundsSchema,
    wholeWidth: z.number().positive().finite(),
    segmentHeight: z.number().positive().finite(),
    commonStartX: z.number().finite(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    movable: z.literal(true)
  })
  .strict();

export const fixedObjectSchema = z
  .object({
    id: identifier,
    kind: z.enum(["instruction", "comparison-mat", "common-start-line", "label"]),
    bounds: boundsSchema,
    locked: z.literal(true),
    text: z.string().min(1).max(300).optional()
  })
  .strict();

export const movableObjectSchema = z
  .object({
    id: identifier,
    kind: z.enum(["fraction-strip", "comparison-symbol"]),
    problemId: identifier,
    sourceModelId: identifier.optional(),
    bounds: boundsSchema,
    mathematicalDecision: z.string().min(1).max(300)
  })
  .strict();

export const dropAreaSchema = z
  .object({
    id: identifier,
    problemId: identifier,
    kind: z.enum(["comparison-lane", "relation-slot"]),
    bounds: boundsSchema,
    accepts: z.array(identifier).min(1).max(8),
    label: z.string().min(1).max(80)
  })
  .strict();

export const activitySpecSchema = z
  .object({
    schemaVersion: z.literal(ACTIVITY_SPEC_SCHEMA_VERSION),
    id: identifier,
    seed: z.string().min(1).max(120),
    title: z.string().min(1).max(120),
    learningObjective: z.string().min(1).max(500),
    curriculumReferences: z.array(curriculumRecordSchema).min(1).max(4),
    recommendationSnapshot: recommendationSchema,
    problems: z.array(activityProblemSchema).min(2).max(6),
    visualModels: z.array(visualModelSchema).min(4).max(12),
    fixedObjects: z.array(fixedObjectSchema).min(3).max(64),
    movableObjects: z.array(movableObjectSchema).min(4).max(24),
    dropAreas: z.array(dropAreaSchema).min(2).max(18),
    layout: z
      .object({
        width: z.literal(2400),
        height: z.number().int().min(1400).max(4800),
        viewBox: z.tuple([
          z.number().finite(),
          z.number().finite(),
          z.number().positive(),
          z.number().positive()
        ]),
        minGap: z.number().min(16).max(120)
      })
      .strict(),
    instructions: z.array(z.string().min(1).max(160)).min(1).max(4),
    provenance: z
      .object({
        generatedAt: z.string().datetime(),
        requestId: identifier,
        curriculumSourceIds: z.array(identifier).min(1).max(12),
        auxiliarySnapshotSha: z.string().regex(/^[a-f0-9]{40}$/)
      })
      .strict(),
    templateId: identifier,
    templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/)
  })
  .strict();

export const mathCanvasPayloadSchema = z
  .object({
    projectTitle: z.string().min(1).max(120),
    categoryId: z.string().min(1).max(80),
    contentsJson: z.array(z.record(z.unknown())),
    canvasOption: z
      .object({
        grid: z.record(z.unknown()),
        scale: z.number().finite(),
        lockIds: z.array(z.array(identifier)),
        viewBox: z.tuple([
          z.number().finite(),
          z.number().finite(),
          z.number().positive(),
          z.number().positive()
        ]),
        moduleArr: z.record(z.record(z.boolean())),
        penElements: z.array(z.unknown())
      })
      .passthrough(),
    isShowMenuOnActivity: z.boolean(),
    isNoteworthy: z.literal(false),
    tags: z.array(z.string().max(80)).max(20),
    studyLevel: z.literal("elementary")
  })
  .strict();

export const compiledProjectSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    contractVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    sourceActivitySpecId: identifier,
    sourceActivitySpecVersion: z.literal(ACTIVITY_SPEC_SCHEMA_VERSION),
    templateId: identifier,
    templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    payload: mathCanvasPayloadSchema
  })
  .strict();

export const validationIssueSchema = z
  .object({
    code: identifier,
    severity: z.enum(["error", "warning"]),
    area: z.enum([
      "schema",
      "curriculum",
      "mathematics",
      "pedagogy",
      "layout",
      "interaction",
      "api-contract",
      "security"
    ]),
    message: z.string().min(1).max(1000),
    path: z.string().max(500).optional()
  })
  .strict();

export const validationReportSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    activitySpecId: identifier,
    compiledPayloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    checkedAt: z.string().datetime(),
    issues: z.array(validationIssueSchema).max(200),
    canCreate: z.boolean()
  })
  .strict()
  .refine(
    (report) =>
      report.canCreate ===
      !report.issues.some((issue) => issue.severity === "error"),
    "canCreate 값은 오류 유무와 일치해야 합니다."
  );

export const creationJobSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    jobId: identifier,
    approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.enum([
      "queued",
      "creating",
      "succeeded",
      "failed",
      "expired"
    ]),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    projectId: z.string().min(1).max(160).optional(),
    editorUrl: z.string().url().optional(),
    errorCode: identifier.optional()
  })
  .strict();

export const approvalReceiptSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    activitySpecHash: z.string().regex(/^[a-f0-9]{64}$/),
    approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
    approvedAt: z.string().datetime(),
    expiresAt: z.string().datetime()
  })
  .strict();

export const templateDefinitionSchema = z
  .object({
    id: identifier,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    supportedGradeBands: z.array(gradeBandSchema).min(1),
    supportedStandards: z.array(z.string()).min(1),
    supportedProblemCount: z
      .object({ min: z.number().int(), max: z.number().int() })
      .strict(),
    requiredModules: z.array(z.string()).min(1),
    confidenceThreshold: z.number().min(0).max(1)
  })
  .strict();

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type ActivitySpec = z.infer<typeof activitySpecSchema>;
export type ActivityProblem = z.infer<typeof activityProblemSchema>;
export type VisualModel = z.infer<typeof visualModelSchema>;
export type CompiledProject = z.infer<typeof compiledProjectSchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type CreationJob = z.infer<typeof creationJobSchema>;
export type CurriculumRecord = z.infer<typeof curriculumRecordSchema>;
export type ApprovalReceipt = z.infer<typeof approvalReceiptSchema>;
export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type DenominatorRelation = z.infer<
  typeof denominatorRelationSchema
>;
