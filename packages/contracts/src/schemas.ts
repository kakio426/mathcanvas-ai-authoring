import { z } from "zod";

export const CONTRACT_SCHEMA_VERSION = "1.0.0" as const;
export const ACTIVITY_SPEC_SCHEMA_VERSION = "1.0.0" as const;
export const ACTIVITY_SET_SPEC_SCHEMA_VERSION = "2.0.0" as const;
export const CANVAS_ACTIVITY_SPEC_SCHEMA_VERSION = "2.0.0" as const;
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
  "number-card-make-ten-drag"
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
    domain: z.literal("수와 연산"),
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
    requestedGrade: z.number().int().min(1).max(6).optional(),
    problemCount: z.number().int().min(2).max(6).optional(),
    difficulty: difficultySchema.optional(),
    denominatorRelation: denominatorRelationSchema.optional(),
    manipulation: manipulationSchema.optional(),
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
    problemCount: z.number().int().min(2).max(6).optional(),
    difficulty: difficultySchema.optional(),
    denominatorRelation: denominatorRelationSchema.optional(),
    manipulation: manipulationSchema.optional(),
    rationale: z.array(z.string().min(1).max(500)).min(1).max(8),
    confidence: z.number().min(0).max(1),
    caveats: z.array(z.string().min(1).max(1000)).max(12),
    blockingReasons: z.array(z.string().min(1).max(1000)).max(12),
    unsupportedRequests: z.array(z.string().min(1).max(500)).max(8).optional(),
    t0Proposal: z
      .object({
        problemCount: z.number().int().min(2).max(6),
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

/**
 * v1 ActivitySpec은 저장된 초안을 읽는 마이그레이션 경계로만 남긴다.
 * 새 생성 경로는 ActivitySetSpec → CanvasActivitySpec[]을 사용한다.
 */
export const legacyActivitySpecSchema = activitySpecSchema;

export const inputObjectSchema = z
  .object({
    id: identifier,
    kind: z.literal("explanation-text"),
    problemId: identifier,
    bounds: boundsSchema,
    placeholder: z.string().min(1).max(120),
    editable: z.literal(true),
    collectResponse: z.literal(false)
  })
  .strict();

export const placementGuideSchema = z
  .object({
    id: identifier,
    problemId: identifier,
    kind: z.enum(["comparison-lane", "relation-slot"]),
    bounds: boundsSchema,
    intendedObjectIds: z.array(identifier).min(1).max(4),
    label: z.string().min(1).max(80),
    behavior: z.literal("visual-guide-only")
  })
  .strict();

const activitySetShape = {
  schemaVersion: z.literal(ACTIVITY_SET_SPEC_SCHEMA_VERSION),
  setId: identifier,
  seed: z.string().min(1).max(120),
  title: z.string().min(1).max(80),
  grade: z.number().int().min(1).max(6),
  gradeBand: gradeBandSchema,
  standardCode: z.string().regex(/^\[[246]수\d{2}-\d{2}\]$/),
  learningObjective: z.string().min(1).max(500),
  problemCount: z.number().int().min(2).max(6),
  difficulty: difficultySchema,
  manipulation: manipulationSchema,
  problems: z.array(activityProblemSchema).min(2).max(6),
  curriculumReferences: z.array(curriculumRecordSchema).min(1).max(4),
  recommendationSnapshot: recommendationSchema,
  provenance: z
    .object({
      generatedAt: z.string().datetime(),
      requestId: identifier,
      curriculumSourceIds: z.array(identifier).min(1).max(12),
      auxiliarySnapshotSha: z.string().regex(/^[a-f0-9]{40}$/)
    })
    .strict(),
  templateId: z.literal(VERIFIED_TEMPLATE_ID),
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/)
} as const;

function validateActivitySetShape(
  value: {
    problemCount: number;
    problems: Array<{ order: number }>;
    grade: number;
    gradeBand: "1-2" | "3-4" | "5-6";
  },
  context: z.RefinementCtx
): void {
  if (value.problemCount !== value.problems.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["problemCount"],
      message: "problemCount는 실제 문제 수와 같아야 합니다."
    });
  }
  const expectedOrders = value.problems.map((_, index) => index + 1);
  if (
    value.problems.some(
      (problem, index) => problem.order !== expectedOrders[index]
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["problems"],
      message: "문제 순서는 1부터 빠짐없이 이어져야 합니다."
    });
  }
  const expectedBand =
    value.grade <= 2 ? "1-2" : value.grade <= 4 ? "3-4" : "5-6";
  if (value.gradeBand !== expectedBand) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["gradeBand"],
      message: "학년과 학년군이 맞지 않습니다."
    });
  }
}

export const activitySetDraftSchema = z
  .object(activitySetShape)
  .strict()
  .superRefine(validateActivitySetShape);

export const activitySetSpecSchema = z
  .object({
    ...activitySetShape,
    setHash: z.string().regex(/^[a-f0-9]{64}$/)
  })
  .strict()
  .superRefine(validateActivitySetShape);

const canvasActivityShape = {
  schemaVersion: z.literal(CANVAS_ACTIVITY_SPEC_SCHEMA_VERSION),
  canvasId: identifier,
  setId: identifier,
  setHash: z.string().regex(/^[a-f0-9]{64}$/),
  canvasIndex: z.number().int().min(1).max(6),
  canvasCount: z.number().int().min(2).max(6),
  seed: z.string().min(1).max(120),
  title: z.string().min(1).max(80),
  grade: z.number().int().min(1).max(6),
  standardCode: z.string().regex(/^\[[246]수\d{2}-\d{2}\]$/),
  learningObjective: z.string().min(1).max(500),
  curriculumReferences: z.array(curriculumRecordSchema).min(1).max(4),
  recommendationSnapshot: recommendationSchema,
  problem: activityProblemSchema,
  visualModels: z.array(visualModelSchema).length(2),
  fixedObjects: z.array(fixedObjectSchema).min(6).max(32),
  movableObjects: z.array(movableObjectSchema).length(4),
  inputObjects: z.array(inputObjectSchema).length(1),
  placementGuides: z.array(placementGuideSchema).length(3),
  layout: z
    .object({
      width: z.literal(1280),
      height: z.literal(800),
      viewBox: z.tuple([
        z.literal(0),
        z.literal(0),
        z.literal(1280),
        z.literal(800)
      ]),
      stageRatio: z.literal("16:10"),
      minGap: z.number().min(16).max(80)
    })
    .strict(),
  instructions: z.array(z.string().min(1).max(120)).min(1).max(3),
  provenance: z
    .object({
      generatedAt: z.string().datetime(),
      requestId: identifier,
      curriculumSourceIds: z.array(identifier).min(1).max(12),
      auxiliarySnapshotSha: z.string().regex(/^[a-f0-9]{40}$/)
    })
    .strict(),
  templateId: z.literal(VERIFIED_TEMPLATE_ID),
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/)
} as const;

function validateCanvasActivityShape(
  value: {
    canvasIndex: number;
    canvasCount: number;
    problem: { id: string; order: number };
    visualModels: Array<{ problemId: string }>;
    movableObjects: Array<{ problemId: string }>;
    inputObjects: Array<{ problemId: string }>;
    placementGuides: Array<{ problemId: string }>;
  },
  context: z.RefinementCtx
): void {
  if (
    value.canvasIndex > value.canvasCount ||
    value.problem.order !== value.canvasIndex
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["canvasIndex"],
      message: "캔버스 번호와 문제 순서가 맞아야 합니다."
    });
  }
  const foreignProblemReference = [
    ...value.visualModels,
    ...value.movableObjects,
    ...value.inputObjects,
    ...value.placementGuides
  ].some((object) => object.problemId !== value.problem.id);
  if (foreignProblemReference) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["problem"],
      message: "한 캔버스의 모든 학생 객체는 같은 문제 하나만 가리켜야 합니다."
    });
  }
}

export const canvasActivityDraftSchema = z
  .object(canvasActivityShape)
  .strict()
  .superRefine(validateCanvasActivityShape);

export const canvasActivitySpecSchema = z
  .object({
    ...canvasActivityShape,
    canvasHash: z.string().regex(/^[a-f0-9]{64}$/)
  })
  .strict()
  .superRefine(validateCanvasActivityShape);

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

export const compiledCanvasProjectSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    contractVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    sourceCanvasSpecId: identifier,
    sourceCanvasSpecVersion: z.literal(CANVAS_ACTIVITY_SPEC_SCHEMA_VERSION),
    setId: identifier,
    setHash: z.string().regex(/^[a-f0-9]{64}$/),
    canvasHash: z.string().regex(/^[a-f0-9]{64}$/),
    templateId: z.literal(VERIFIED_TEMPLATE_ID),
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
    canvasSpecId: identifier,
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

export const activitySetApprovalReceiptSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    setHash: z.string().regex(/^[a-f0-9]{64}$/),
    approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
    approvedAt: z.string().datetime(),
    expiresAt: z.string().datetime()
  })
  .strict();

export const creationBatchItemSchema = z
  .object({
    canvasIndex: z.number().int().min(1).max(6),
    canvasHash: z.string().regex(/^[a-f0-9]{64}$/),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.enum([
      "queued",
      "creating",
      "succeeded",
      "failed",
      "expired"
    ]),
    jobId: identifier.optional(),
    projectId: z.string().min(1).max(160).optional(),
    editorUrl: z.string().url().optional(),
    errorCode: identifier.optional()
  })
  .strict()
  .superRefine((item, context) => {
    if (item.status === "succeeded" && (!item.projectId || !item.editorUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "성공한 캔버스에는 projectId와 editorUrl이 필요합니다."
      });
    }
    if (item.status === "failed" && !item.errorCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "실패한 캔버스에는 errorCode가 필요합니다."
      });
    }
  });

export const creationBatchSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    batchId: z.string().regex(/^batch-[A-Za-z0-9-]+$/),
    setId: identifier,
    setHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.enum([
      "queued",
      "creating",
      "partial",
      "succeeded",
      "failed",
      "expired"
    ]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    items: z.array(creationBatchItemSchema).min(2).max(6)
  })
  .strict()
  .superRefine((batch, context) => {
    const orders = batch.items.map((item) => item.canvasIndex);
    if (
      new Set(orders).size !== orders.length ||
      orders.some((order, index) => order !== index + 1)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "배치 항목은 1부터 순서대로 한 번씩 있어야 합니다."
      });
    }
    const statuses = new Set(batch.items.map((item) => item.status));
    if (
      (batch.status === "succeeded" && statuses.size !== 1) ||
      (batch.status === "succeeded" && !statuses.has("succeeded"))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "배치 성공 상태는 모든 캔버스가 성공했을 때만 가능합니다."
      });
    }
  });

export const renderEvidenceSchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    projectId: identifier,
    canvasIndex: z.number().int().min(1).max(6),
    viewport: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        deviceScaleFactor: z.number().positive()
      })
      .strict(),
    editorScreenshot: z.string().min(1).max(1000),
    previewScreenshot: z.string().min(1).max(1000),
    measuredRects: z.array(
      z
        .object({
          id: identifier,
          x: z.number().finite(),
          y: z.number().finite(),
          width: z.number().nonnegative().finite(),
          height: z.number().nonnegative().finite()
        })
        .strict()
    ),
    qaResult: z.enum(["passed", "failed"]),
    issues: z.array(z.string().min(1).max(500)).max(100)
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
export type ActivitySetDraft = z.infer<typeof activitySetDraftSchema>;
export type ActivitySetSpec = z.infer<typeof activitySetSpecSchema>;
export type CanvasActivityDraft = z.infer<typeof canvasActivityDraftSchema>;
export type CanvasActivitySpec = z.infer<typeof canvasActivitySpecSchema>;
export type ActivityProblem = z.infer<typeof activityProblemSchema>;
export type VisualModel = z.infer<typeof visualModelSchema>;
export type CompiledProject = z.infer<typeof compiledProjectSchema>;
export type CompiledCanvasProject = z.infer<
  typeof compiledCanvasProjectSchema
>;
export type ValidationReport = z.infer<typeof validationReportSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type CreationJob = z.infer<typeof creationJobSchema>;
export type CurriculumRecord = z.infer<typeof curriculumRecordSchema>;
export type ApprovalReceipt = z.infer<typeof approvalReceiptSchema>;
export type ActivitySetApprovalReceipt = z.infer<
  typeof activitySetApprovalReceiptSchema
>;
export type CreationBatch = z.infer<typeof creationBatchSchema>;
export type CreationBatchItem = z.infer<typeof creationBatchItemSchema>;
export type RenderEvidence = z.infer<typeof renderEvidenceSchema>;
export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type DenominatorRelation = z.infer<
  typeof denominatorRelationSchema
>;
