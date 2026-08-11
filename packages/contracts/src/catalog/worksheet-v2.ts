import { z } from "zod";
import { stableIdSchema } from "../vocabulary/ids.js";

export const WORKSHEET_V2_SCHEMA_VERSION = "2.0.0" as const;

const gradeSchema = z.number().int().min(1).max(6);
const semesterSchema = z.union([z.literal(1), z.literal(2)]);
const domainSchema = z.enum([
  "수와 연산",
  "변화와 관계",
  "도형과 측정",
  "자료와 가능성"
]);
const learningTypeSchema = z.literal("기본 연습");
const standardCodeSchema = z.string().regex(/^\[[246]수\d{2}-\d{2}\]$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const phaseSequenceSchema = z
  .array(
    z.enum([
      "prediction",
      "mathematical-confirmation",
      "explanation",
      "revision"
    ])
  )
  .length(4)
  .refine(
    (value) =>
      value.join(",") ===
      "prediction,mathematical-confirmation,explanation,revision",
    "학습 phase는 예상→수학적 확인→설명→수정 순서여야 합니다."
  );

export const worksheetAuthoritySourceSchema = z
  .object({
    sourceId: stableIdSchema,
    url: z.string().url(),
    version: z.string().min(1).max(160),
    contentSha256: sha256Schema,
    locator: z.string().min(1).max(500),
    verificationStatus: z.enum([
      "official-text-verified",
      "official-source-checked",
      "auxiliary-pinned",
      "unverified"
    ])
  })
  .strict();

export const curriculumSelectionSchema = z
  .object({
    grade: gradeSchema,
    semester: semesterSchema,
    unitId: z.string().regex(/^[1-6]-[12]-[1-6]$/),
    standardCode: standardCodeSchema,
    learningType: learningTypeSchema
  })
  .strict()
  .superRefine((value, context) => {
    const expectedUnitId = `${value.grade}-${value.semester}-${value.unitId.split("-")[2]}`;
    if (value.unitId !== expectedUnitId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "단원 ID의 학년·학기가 선택과 일치해야 합니다."
      });
    }
  });

export const curriculumAuthorityBindingSchema = z
  .object({
    standard: z
      .object({
        code: standardCodeSchema,
        gradeBand: z.enum(["1-2", "3-4", "5-6"]),
        domain: domainSchema,
        officialGoal: z.string().min(1).max(500),
        source: worksheetAuthoritySourceSchema
      })
      .strict(),
    unit: z
      .object({
        unitId: z.string().regex(/^[1-6]-[12]-[1-6]$/),
        grade: gradeSchema,
        semester: semesterSchema,
        unitNumber: z.number().int().min(1).max(6),
        title: z.string().min(1).max(100),
        source: worksheetAuthoritySourceSchema
      })
      .strict(),
    prerequisiteStandardCodes: z.array(standardCodeSchema).max(8),
    crossBandReview: z
      .object({
        standardCode: standardCodeSchema,
        teacherLabel: z.literal("선수 학습 복습"),
        unitId: z.string().regex(/^[1-6]-[12]-[1-6]$/),
        grade: gradeSchema,
        semester: semesterSchema,
        source: worksheetAuthoritySourceSchema
      })
      .strict()
      .optional()
  })
  .strict()
  .superRefine((value, context) => {
    const [unitGrade, unitSemester, unitNumber] = value.unit.unitId
      .split("-")
      .map(Number);
    if (
      value.unit.grade !== unitGrade ||
      value.unit.semester !== unitSemester ||
      value.unit.unitNumber !== unitNumber
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit"],
        message: "unitId와 unit의 학년·학기·단원 번호가 일치해야 합니다."
      });
    }
    if (value.standard.source.verificationStatus === "unverified") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["standard", "source", "verificationStatus"],
        message: "standard authority는 미검증 상태일 수 없습니다."
      });
    }
    if (value.unit.source.verificationStatus === "unverified") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit", "source", "verificationStatus"],
        message: "unit authority는 미검증 상태일 수 없습니다."
      });
    }
    if (value.standard.source.sourceId === value.unit.source.sourceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit", "source", "sourceId"],
        message: "standard authority와 unit authority를 같은 source로 합칠 수 없습니다."
      });
    }
    if (
      value.crossBandReview &&
      (value.prerequisiteStandardCodes.length !== 1 ||
        value.prerequisiteStandardCodes[0] !==
          value.crossBandReview.standardCode)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["crossBandReview", "standardCode"],
        message: "cross-band review는 선수 학습 목록과 정확히 하나로 결속되어야 합니다."
      });
    }
    if (value.crossBandReview) {
      if (value.crossBandReview.standardCode === value.standard.code) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["crossBandReview", "standardCode"],
          message: "cross-band standard는 primary standard와 달라야 합니다."
        });
      }
      const primaryGradeBand = value.standard.code.startsWith("[2수")
        ? 2
        : value.standard.code.startsWith("[4수")
          ? 4
          : 6;
      const crossBandGradeBand = value.crossBandReview.standardCode.startsWith(
        "[2수"
      )
        ? 2
        : value.crossBandReview.standardCode.startsWith("[4수")
          ? 4
          : 6;
      if (crossBandGradeBand >= primaryGradeBand) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["crossBandReview", "standardCode"],
          message: "cross-band standard는 primary보다 낮은 학년군이어야 합니다."
        });
      }
      const crossBandGradeRange: readonly [number, number] =
        crossBandGradeBand === 2
          ? [1, 2]
          : crossBandGradeBand === 4
            ? [3, 4]
            : [5, 6];
      if (
        value.crossBandReview.grade < crossBandGradeRange[0] ||
        value.crossBandReview.grade > crossBandGradeRange[1]
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["crossBandReview", "grade"],
          message: "cross-band grade는 standard code의 학년군과 일치해야 합니다."
        });
      }
      if (value.crossBandReview.grade >= value.unit.grade) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["crossBandReview", "grade"],
          message: "cross-band grade는 primary unit grade보다 낮아야 합니다."
        });
      }
      const [crossBandGrade, crossBandSemester, crossBandUnitNumber] =
        value.crossBandReview.unitId.split("-").map(Number);
      if (
        value.crossBandReview.grade !== crossBandGrade ||
        value.crossBandReview.semester !== crossBandSemester ||
        value.crossBandReview.grade < 1 ||
        value.crossBandReview.unitId !==
          `${value.crossBandReview.grade}-${value.crossBandReview.semester}-${crossBandUnitNumber}`
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["crossBandReview", "unitId"],
          message: "cross-band review unitId와 학년·학기가 일치해야 합니다."
        });
      }
      if (value.crossBandReview.source.verificationStatus === "unverified") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["crossBandReview", "source", "verificationStatus"],
          message: "cross-band unit authority는 미검증 상태일 수 없습니다."
        });
      }
    }
    if (!value.crossBandReview && value.prerequisiteStandardCodes.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prerequisiteStandardCodes"],
        message: "선수 학습 코드가 있으면 cross-band review binding도 필요합니다."
      });
    }
  });

export const worksheetFamilyRefSchema = z
  .object({
    id: stableIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    rationale: z.string().min(1).max(500)
  })
  .strict();

export const worksheetNativeAffordanceSchema = z
  .object({
    family: worksheetFamilyRefSchema,
    candidateToolKeys: z.array(stableIdSchema).min(1).max(8),
    supportState: z.enum(["captured", "contracted", "verified", "released"]),
    evidenceIds: z.array(z.string().min(1).max(500)).min(1).max(8)
  })
  .strict();

export const worksheetModifierPolicySchema = z
  .object({
    problemCount: z
      .object({
        min: z.number().int().min(1).max(2),
        max: z.number().int().min(1).max(2),
        default: z.number().int().min(1).max(2)
      })
      .strict(),
    allowedDifficulties: z.array(z.enum(["easy", "normal", "hard"])).min(1),
    contextMaxChars: z.number().int().min(0).max(500)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.problemCount.min > value.problemCount.max) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["problemCount"],
        message: "문제 수의 최소값은 최대값보다 클 수 없습니다."
      });
    }
    if (
      value.problemCount.default < value.problemCount.min ||
      value.problemCount.default > value.problemCount.max
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["problemCount", "default"],
        message: "기본 문제 수는 허용 범위 안에 있어야 합니다."
      });
    }
  });

export const worksheetCatalogEntrySchema = z
  .object({
    catalogEntryId: z.string().regex(/^grade3-basic-practice-ppt-\d{2}$/),
    sourceId: z.string().regex(/^ppt-\d{2}$/),
    title: z.string().min(1).max(160),
    selection: curriculumSelectionSchema,
    domain: domainSchema,
    learningGoal: z.string().min(1).max(500),
    authorityBinding: curriculumAuthorityBindingSchema,
    blueprintFamily: worksheetFamilyRefSchema,
    variationPreset: worksheetFamilyRefSchema,
    affordanceFamily: worksheetNativeAffordanceSchema,
    layoutFamily: worksheetFamilyRefSchema,
    phaseSequence: phaseSequenceSchema,
    modifierPolicy: worksheetModifierPolicySchema,
    availability: z.enum([
      "release-candidate",
      "released",
      "blocked",
      "unsupported"
    ]),
    teacherVisible: z.boolean(),
    blockingReasons: z.array(z.string().min(1).max(1000)).max(8),
    pilotCoverageEligible: z.boolean(),
    curriculumCoverageEligible: z.boolean(),
    learningMapTopicId: stableIdSchema,
    pptLocator: z.string().regex(/^claude-all-30-ppt-content\.md#L\d+-L\d+$/)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.selection.standardCode !== value.authorityBinding.standard.code) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorityBinding", "standard", "code"],
        message: "구조화 선택과 primary standard가 일치해야 합니다."
      });
    }
    if (value.selection.unitId !== value.authorityBinding.unit.unitId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorityBinding", "unit", "unitId"],
        message: "구조화 선택과 unit authority가 일치해야 합니다."
      });
    }
    if (
      value.selection.grade !== value.authorityBinding.unit.grade ||
      value.selection.semester !== value.authorityBinding.unit.semester
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorityBinding", "unit"],
        message: "구조화 선택의 학년·학기와 unit authority가 일치해야 합니다."
      });
    }
    if (value.domain !== value.authorityBinding.standard.domain) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["domain"],
        message: "catalog domain과 standard domain이 일치해야 합니다."
      });
    }
    if (
      new Set([
        value.blueprintFamily.id,
        value.variationPreset.id,
        value.affordanceFamily.family.id,
        value.layoutFamily.id
      ]).size !== 4
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layoutFamily", "id"],
        message: "blueprint·variation·affordance·layout family는 구분되어야 합니다."
      });
    }
    if (value.availability === "released") {
      if (!value.teacherVisible) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teacherVisible"],
          message: "released entry는 교사에게 표시되어야 합니다."
        });
      }
      if (value.blockingReasons.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blockingReasons"],
          message: "released entry에는 blocking reason이 남아 있을 수 없습니다."
        });
      }
      if (value.affordanceFamily.supportState !== "released") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["affordanceFamily", "supportState"],
          message: "released entry의 native affordance도 released여야 합니다."
        });
      }
    } else if (value.teacherVisible || value.blockingReasons.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teacherVisible"],
        message: "미출시·차단 entry는 교사에게 표시하지 않고 이유를 남겨야 합니다."
      });
    }
    if (
      value.authorityBinding.crossBandReview &&
      value.curriculumCoverageEligible
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["curriculumCoverageEligible"],
        message: "cross-band review entry는 curriculumCoverage 분자에 포함하지 않습니다."
      });
    }
  });

export const worksheetModifierSchema = z
  .object({
    context: z.string().trim().max(500).optional(),
    problemCount: z.number().int().min(1).max(6).optional(),
    difficulty: z.enum(["easy", "normal", "hard"]).optional()
  })
  .strict();

export const worksheetRequestV2Schema = z
  .object({
    schemaVersion: z.literal(WORKSHEET_V2_SCHEMA_VERSION),
    requestId: stableIdSchema,
    catalogEntryId: z.string().regex(/^grade3-basic-practice-ppt-\d{2}$/),
    selection: curriculumSelectionSchema,
    modifier: worksheetModifierSchema.optional(),
    seed: z.string().min(1).max(160),
    createdAt: z.string().datetime()
  })
  .strict();

const modifierDecisionReasonSchema = z.string().min(1).max(500).optional();

export const worksheetModifierDecisionSchema = z.discriminatedUnion("key", [
  z
    .object({
      key: z.literal("context"),
      value: z.string().max(500),
      reason: modifierDecisionReasonSchema
    })
    .strict(),
  z
    .object({
      key: z.literal("problemCount"),
      value: z.number().int().min(1).max(6),
      reason: modifierDecisionReasonSchema
    })
    .strict(),
  z
    .object({
      key: z.literal("difficulty"),
      value: z.enum(["easy", "normal", "hard"]),
      reason: modifierDecisionReasonSchema
    })
    .strict()
]);

export const worksheetPlanV2Schema = z
  .object({
    schemaVersion: z.literal(WORKSHEET_V2_SCHEMA_VERSION),
    planId: z.string().regex(/^plan-[A-Za-z0-9-]+$/),
    request: worksheetRequestV2Schema,
    catalogEntry: worksheetCatalogEntrySchema,
    status: z.enum(["release-candidate", "released", "blocked", "unsupported"]),
    selection: curriculumSelectionSchema,
    blueprintFamily: worksheetFamilyRefSchema,
    variationPreset: worksheetFamilyRefSchema,
    affordanceFamily: worksheetNativeAffordanceSchema,
    layoutProfile: worksheetFamilyRefSchema,
    authorityBinding: curriculumAuthorityBindingSchema,
    seed: z.string().min(1).max(160),
    appliedModifiers: z.array(worksheetModifierDecisionSchema).max(3),
    rejectedModifiers: z.array(worksheetModifierDecisionSchema).max(3),
    blockingReasons: z.array(z.string().min(1).max(1000)).max(8)
  })
  .strict()
  .superRefine((value, context) => {
    const selectionMatchesCatalog =
      value.request.selection.grade === value.catalogEntry.selection.grade &&
      value.request.selection.semester === value.catalogEntry.selection.semester &&
      value.request.selection.unitId === value.catalogEntry.selection.unitId &&
      value.request.selection.standardCode ===
        value.catalogEntry.selection.standardCode &&
      value.request.selection.learningType ===
        value.catalogEntry.selection.learningType;
    if (!selectionMatchesCatalog) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["request", "selection"],
        message: "request의 구조화 선택은 catalog snapshot과 정확히 같아야 합니다."
      });
    }
    if (value.request.catalogEntryId !== value.catalogEntry.catalogEntryId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["catalogEntry"],
        message: "request와 catalog snapshot이 다른 entry를 가리킵니다."
      });
    }
    if (
      value.selection.grade !== value.catalogEntry.selection.grade ||
      value.selection.semester !== value.catalogEntry.selection.semester ||
      value.selection.unitId !== value.catalogEntry.selection.unitId ||
      value.selection.standardCode !== value.catalogEntry.selection.standardCode ||
      value.selection.learningType !== value.catalogEntry.selection.learningType
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selection"],
        message: "plan selection은 catalog selection을 그대로 보존해야 합니다."
      });
    }
    if (value.seed !== value.request.seed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seed"],
        message: "plan seed는 request seed와 같아야 합니다."
      });
    }
    if (value.status !== value.catalogEntry.availability) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "plan status는 catalog availability와 같아야 합니다."
      });
    }
    const modifier = value.request.modifier ?? {};
    const modifierKeys = ["context", "problemCount", "difficulty"] as const;
    for (const key of modifierKeys) {
      const requestedValue = modifier[key];
      const applied = value.appliedModifiers.filter(
        (decision) => decision.key === key
      );
      const rejected = value.rejectedModifiers.filter(
        (decision) => decision.key === key
      );
      if (requestedValue === undefined) {
        if (applied.length > 0 || rejected.length > 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["appliedModifiers"],
            message: `request에 없는 ${key} modifier를 plan에 추가할 수 없습니다.`
          });
        }
        continue;
      }
      if (applied.length + rejected.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["appliedModifiers"],
          message: `${key} modifier는 applied 또는 rejected 중 정확히 하나여야 합니다.`
        });
        continue;
      }
      const decision = applied[0] ?? rejected[0]!;
      const matchesRequested =
        key === "context"
          ? decision.value === String(requestedValue).trim()
          : decision.value === requestedValue;
      if (!matchesRequested) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["appliedModifiers"],
          message: `${key} modifier의 request 값과 plan 값이 다릅니다.`
        });
      }
      const canApply =
        key === "context"
          ? String(requestedValue).trim().length > 0 &&
            String(requestedValue).trim().length <=
              value.catalogEntry.modifierPolicy.contextMaxChars
          : key === "problemCount"
            ? Number(requestedValue) >=
                value.catalogEntry.modifierPolicy.problemCount.min &&
              Number(requestedValue) <=
                value.catalogEntry.modifierPolicy.problemCount.max
            : value.catalogEntry.modifierPolicy.allowedDifficulties.includes(
                requestedValue as "easy" | "normal" | "hard"
              );
      if (canApply !== (applied.length === 1)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["appliedModifiers"],
          message: `${key} modifier가 catalog policy와 맞지 않는 applied/rejected 상태입니다.`
        });
      }
    }
    if (
      JSON.stringify(value.blueprintFamily) !==
        JSON.stringify(value.catalogEntry.blueprintFamily) ||
      JSON.stringify(value.variationPreset) !==
        JSON.stringify(value.catalogEntry.variationPreset) ||
      JSON.stringify(value.affordanceFamily) !==
        JSON.stringify(value.catalogEntry.affordanceFamily) ||
      JSON.stringify(value.layoutProfile) !==
        JSON.stringify(value.catalogEntry.layoutFamily)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blueprintFamily"],
        message: "plan family binding은 catalog snapshot과 달라질 수 없습니다."
      });
    }
    if (
      JSON.stringify(value.authorityBinding) !==
      JSON.stringify(value.catalogEntry.authorityBinding)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorityBinding"],
        message: "plan authority binding은 catalog snapshot과 같아야 합니다."
      });
    }
    if (
      value.rejectedModifiers.some(
        (modifier) => modifier.reason === undefined
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectedModifiers"],
        message: "거부된 modifier에는 이유가 필요합니다."
      });
    }
  });

export const worksheetCoverageReportSchema = z
  .object({
    coverageKind: z.enum(["pilot", "curriculum"]),
    metric: z.enum([
      "pilot-entry-release",
      "official-standard-released-activity-reach"
    ]),
    status: z.enum(["available", "unavailable"]),
    numerator: z.number().int().min(0).nullable(),
    denominator: z.number().int().min(0).nullable(),
    totalEntries: z.number().int().min(0),
    releasedEntries: z.number().int().min(0),
    candidateEntries: z.number().int().min(0),
    blockedEntries: z.number().int().min(0),
    unsupportedEntries: z.number().int().min(0),
    note: z.string().min(1).max(1000)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "available") {
      if (value.numerator === null || value.denominator === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numerator"],
          message: "available coverage에는 numerator와 denominator가 필요합니다."
        });
      }
    } else if (value.numerator !== null || value.denominator !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numerator"],
        message: "공식 분모를 모르면 coverage 수치를 추정하지 않습니다."
      });
    }
  });

export const worksheetPreparationV2Schema = z
  .object({
    schemaVersion: z.literal(WORKSHEET_V2_SCHEMA_VERSION),
    preparationId: z.string().regex(/^preparation-[A-Za-z0-9-]+$/),
    plan: worksheetPlanV2Schema,
    surface: z.enum(["teacher", "contract-lab"]),
    state: z.literal("transport-ready"),
    preparedAt: z.string().datetime(),
    notes: z.array(z.string().min(1).max(500)).max(4)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.plan.status === "blocked" || value.plan.status === "unsupported") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plan", "status"],
        message: "blocked·unsupported plan은 preparation할 수 없습니다."
      });
    }
  });

const worksheetV2DraftStateSchema = z.enum([
  "pending-approval",
  "approved"
]);

export const worksheetV2ApprovalSchema = z
  .object({
    schemaVersion: z.literal(WORKSHEET_V2_SCHEMA_VERSION),
    draftId: z.string().regex(/^worksheet-draft-v2-[A-Za-z0-9-]+$/),
    preparationHash: sha256Schema,
    approvalHash: sha256Schema,
    teacherConfirmed: z.literal(true),
    approvedAt: z.string().datetime(),
    expiresAt: z.string().datetime()
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.expiresAt) <= Date.parse(value.approvedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "V2 승인 만료 시각은 승인 시각보다 뒤여야 합니다."
      });
    }
  });

export const worksheetV2DraftSchema = z
  .object({
    schemaVersion: z.literal(WORKSHEET_V2_SCHEMA_VERSION),
    draftId: z.string().regex(/^worksheet-draft-v2-[A-Za-z0-9-]+$/),
    preparation: worksheetPreparationV2Schema,
    preparationHash: sha256Schema,
    state: worksheetV2DraftStateSchema,
    approval: worksheetV2ApprovalSchema.optional(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime()
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.expiresAt) <= Date.parse(value.createdAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "V2 draft 만료 시각은 생성 시각보다 뒤여야 합니다."
      });
    }
    if (value.state === "pending-approval" && value.approval !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approval"],
        message: "승인 전 draft에는 approval을 넣을 수 없습니다."
      });
    }
    if (value.state === "approved" && value.approval === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approval"],
        message: "approved draft에는 approval이 필요합니다."
      });
    }
    if (
      value.approval &&
      (value.approval.draftId !== value.draftId ||
        value.approval.preparationHash !== value.preparationHash)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approval"],
        message: "approval은 같은 draft와 preparation hash에 결속되어야 합니다."
      });
    }
    if (value.approval) {
      if (Date.parse(value.approval.approvedAt) < Date.parse(value.createdAt)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["approval", "approvedAt"],
          message: "approval 시각은 draft 생성 시각보다 이를 수 없습니다."
        });
      }
      if (Date.parse(value.approval.expiresAt) > Date.parse(value.expiresAt)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["approval", "expiresAt"],
          message: "approval 만료 시각은 draft 만료 시각을 넘을 수 없습니다."
        });
      }
    }
  });

/**
 * R2 compile은 실제 MathCanvas payload가 아니라 R4 계약 전 차단 결과다.
 * 레이아웃·phase·native reserve 계약이 없는 상태에서 컴파일을 가장하지
 * 않도록 성공 payload variant를 아직 정의하지 않는다.
 */
export const worksheetV2CompileGateSchema = z
  .object({
    schemaVersion: z.literal(WORKSHEET_V2_SCHEMA_VERSION),
    draftId: z.string().regex(/^worksheet-draft-v2-[A-Za-z0-9-]+$/),
    preparationHash: sha256Schema,
    state: z.literal("blocked"),
    blockingReasons: z.array(z.string().min(1).max(1000)).min(1).max(8),
    checkedAt: z.string().datetime()
  })
  .strict();

export type CurriculumSelection = z.infer<typeof curriculumSelectionSchema>;
export type CurriculumAuthorityBinding = z.infer<
  typeof curriculumAuthorityBindingSchema
>;
export type WorksheetFamilyRef = z.infer<typeof worksheetFamilyRefSchema>;
export type WorksheetNativeAffordance = z.infer<
  typeof worksheetNativeAffordanceSchema
>;
export type WorksheetModifierPolicy = z.infer<
  typeof worksheetModifierPolicySchema
>;
export type WorksheetCatalogEntry = z.infer<typeof worksheetCatalogEntrySchema>;
export type WorksheetModifier = z.infer<typeof worksheetModifierSchema>;
export type WorksheetRequestV2 = z.infer<typeof worksheetRequestV2Schema>;
export type WorksheetModifierDecision = z.infer<
  typeof worksheetModifierDecisionSchema
>;
export type WorksheetPlanV2 = z.infer<typeof worksheetPlanV2Schema>;
export type WorksheetCoverageReport = z.infer<
  typeof worksheetCoverageReportSchema
>;
export type WorksheetPreparationV2 = z.infer<
  typeof worksheetPreparationV2Schema
>;
export type WorksheetV2Approval = z.infer<typeof worksheetV2ApprovalSchema>;
export type WorksheetV2Draft = z.infer<typeof worksheetV2DraftSchema>;
export type WorksheetV2CompileGate = z.infer<
  typeof worksheetV2CompileGateSchema
>;

export function defineWorksheetCatalogEntry(
  input: z.input<typeof worksheetCatalogEntrySchema>
): WorksheetCatalogEntry {
  return worksheetCatalogEntrySchema.parse(input);
}

export function defineWorksheetPlanV2(
  input: z.input<typeof worksheetPlanV2Schema>
): WorksheetPlanV2 {
  return worksheetPlanV2Schema.parse(input);
}
