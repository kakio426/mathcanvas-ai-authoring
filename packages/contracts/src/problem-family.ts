import { z } from "zod";
import {
  curriculumActivityStageSchema,
  elementaryMathDomainSchema,
  officialElementaryStandardSchema
} from "./curriculum-coverage.js";

export const PROBLEM_FAMILY_SCHEMA_VERSION = "1.0.0" as const;

/**
 * Phase 1의 canonical family ID다. 기존 활동은 blueprint/activity/template ID가
 * 이미 같은 값을 사용하므로 그 값을 보존한다.
 */
export const familyIdSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/);

export const problemFamilyManipulationSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)+$/);

export const problemParameterValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(160)).max(32),
  z.array(z.number().finite()).max(32)
]);

export const problemParametersSchema = z
  .object({
    schemaVersion: z.literal(PROBLEM_FAMILY_SCHEMA_VERSION),
    familyId: familyIdSchema,
    values: z.record(problemParameterValueSchema)
  })
  .strict()
  .superRefine((input, context) => {
    const entries = Object.entries(input.values);
    if (entries.length < 1 || entries.length > 32) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["values"],
        message: "문제 조건은 1~32개여야 합니다."
      });
    }
    for (const [key] of entries) {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["values", key],
          message: "문제 조건 키는 lowerCamelCase 식별자여야 합니다."
        });
      }
    }
  });

export const problemParameterFieldSchema = z
  .object({
    key: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/),
    inputLabel: z.string().trim().min(1).max(120),
    control: z.enum(["number", "select", "fixed", "text", "boolean"]),
    section: z.string().trim().min(1).max(80),
    unit: z.string().trim().min(1).max(40).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    options: z
      .array(
        z
          .object({
            value: z.string().max(160),
            label: z.string().trim().min(1).max(160)
          })
          .strict()
      )
      .max(64)
      .optional()
  })
  .strict();

export const assessmentTargetSchema = z
  .object({
    schemaVersion: z.literal(PROBLEM_FAMILY_SCHEMA_VERSION),
    targetId: familyIdSchema,
    standardCode: officialElementaryStandardSchema.shape.code,
    statement: z.string().trim().min(1).max(500),
    observableEvidence: z.array(z.string().trim().min(1).max(500)).min(1).max(12),
    assessmentPrompt: z.string().trim().min(1).max(1000),
    misconceptions: z
      .array(
        z
          .object({
            misconceptionId: familyIdSchema,
            statement: z.string().trim().min(1).max(500)
          })
          .strict()
      )
      .min(1)
      .max(12),
    learningMap: z
      .object({
        repository: z.literal("DECK6/korean-elementary-learning-map"),
        commit: z.string().regex(/^[a-f0-9]{40}$/),
        topicIds: z.array(familyIdSchema).min(1).max(8),
        prerequisiteTopicIds: z.array(familyIdSchema).max(8)
      })
      .strict(),
    required: z.boolean(),
    reviewStatus: z.enum(["draft", "reviewed"]),
    scopeNote: z.string().trim().min(1).max(1000),
    reviewedAt: z.string().datetime(),
    reviewer: z.string().trim().min(1).max(160)
  })
  .strict();

/**
 * 한 성취기준의 target 분해가 일부 초안인지, 필수 목표를 빠짐없이 검토한
 * 완전 집합인지 구분한다. 이 레코드가 없으면 targetCoverage 분모를 만들지 않는다.
 */
export const assessmentTargetSetSchema = z
  .object({
    schemaVersion: z.literal(PROBLEM_FAMILY_SCHEMA_VERSION),
    standardCode: officialElementaryStandardSchema.shape.code,
    targetIds: z.array(familyIdSchema).min(1).max(32),
    completeness: z.literal("reviewed-complete"),
    scopeNote: z.string().trim().min(1).max(1000),
    reviewedAt: z.string().datetime(),
    reviewer: z.string().trim().min(1).max(160)
  })
  .strict()
  .superRefine((set, context) => {
    if (new Set(set.targetIds).size !== set.targetIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetIds"],
        message: "AssessmentTargetSet의 target ID가 중복되었습니다."
      });
    }
  });

export const capabilityManifestSchema = z
  .object({
    schemaVersion: z.literal(PROBLEM_FAMILY_SCHEMA_VERSION),
    supportedStandardCodes: z
      .array(officialElementaryStandardSchema.shape.code)
      .min(1)
      .max(32),
    gradeBand: z.enum(["1-2", "3-4", "5-6"]),
    recommendedGrade: z.number().int().min(1).max(6),
    gradeRange: z.tuple([
      z.number().int().min(1).max(6),
      z.number().int().min(1).max(6)
    ]),
    availableProblemCounts: z.array(z.number().int().min(1).max(6)).min(1).max(6),
    defaultProblemCount: z.number().int().min(1).max(6),
    supportedDifficulties: z.array(z.enum(["easy", "normal", "hard"])).min(1),
    denominatorRelation: z.enum(["mixed", "coprime", "multiple"]).optional(),
    parameterFields: z.array(problemParameterFieldSchema).max(32),
    defaultParameters: problemParametersSchema.optional(),
    promptGuards: z
      .array(
        z
          .object({
            pattern: z.string().min(1).max(500),
            message: z.string().trim().min(1).max(1000)
          })
          .strict()
      )
      .max(24),
    unsupportedParameterPolicy: z.enum([
      "unsupported",
      "clarification-required"
    ]),
    title: z.string().trim().min(1).max(160),
    scopeNote: z.string().trim().min(1).max(1000),
    legacyTeacherIntentKind: z.string().min(1).max(160).optional()
  })
  .strict()
  .superRefine((capability, context) => {
    if (
      capability.recommendedGrade < capability.gradeRange[0] ||
      capability.recommendedGrade > capability.gradeRange[1]
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recommendedGrade"],
        message: "권장 학년은 지원 학년 범위 안에 있어야 합니다."
      });
    }
    if (!capability.availableProblemCounts.includes(capability.defaultProblemCount)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultProblemCount"],
        message: "기본 문제 수는 지원 문제 수 목록에 있어야 합니다."
      });
    }
    const fieldKeys = capability.parameterFields.map((field) => field.key);
    if (new Set(fieldKeys).size !== fieldKeys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parameterFields"],
        message: "문제 조건 필드 키가 중복되었습니다."
      });
    }
    if (capability.defaultParameters) {
      const valueKeys = Object.keys(capability.defaultParameters.values).sort();
      if (valueKeys.join(":") !== [...fieldKeys].sort().join(":")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["defaultParameters", "values"],
          message: "기본 문제 조건과 capability 필드가 정확히 일치해야 합니다."
        });
      }
    }
    for (const guard of capability.promptGuards) {
      try {
        new RegExp(guard.pattern, "u");
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["promptGuards"],
          message: "prompt guard 정규식이 유효하지 않습니다."
        });
      }
    }
  });

export const renderRecipeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("legacy-blueprint-adapter"),
      recipeId: familyIdSchema,
      recipeVersion: z.string().min(1).max(80),
      blueprintId: familyIdSchema,
      layoutTokenSet: z.string().min(1).max(160)
    })
    .strict(),
  z
    .object({
      kind: z.literal("native-render-recipe"),
      recipeId: familyIdSchema,
      recipeVersion: z.string().min(1).max(80),
      rendererId: familyIdSchema,
      layoutTokenSet: z.string().min(1).max(160)
    })
    .strict()
]);

export const releaseEvidenceSchema = z
  .object({
    schemaVersion: z.literal(PROBLEM_FAMILY_SCHEMA_VERSION),
    supportState: z.enum(["verified", "released"]),
    lifecycleStage: curriculumActivityStageSchema.exclude(["unmapped"]),
    evidencePaths: z.array(z.string().trim().min(1).max(500)).max(32),
    verificationMethod: z.enum(["inline-hashes", "external-visual-audit"]),
    blueprintContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    layoutPresetContentHash: z.string().regex(/^[a-f0-9]{64}$/).optional()
  })
  .strict()
  .superRefine((evidence, context) => {
    if (
      evidence.supportState === "released" &&
      (evidence.lifecycleStage !== "live-released" ||
        evidence.evidencePaths.length < 1)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lifecycleStage"],
        message: "released family에는 live-released 단계와 현재 증거가 필요합니다."
      });
    }
    if (
      evidence.supportState === "verified" &&
      evidence.lifecycleStage === "live-released"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportState"],
        message: "verified family를 live-released로 표시할 수 없습니다."
      });
    }
    if (
      evidence.verificationMethod === "inline-hashes" &&
      evidence.layoutPresetContentHash === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layoutPresetContentHash"],
        message: "inline hash 검증에는 layout preset hash가 필요합니다."
      });
    }
  });

export const solReviewScopeSchema = z
  .object({
    familyTrackId: familyIdSchema,
    scopeId: z
      .string()
      .min(3)
      .max(160)
      .regex(/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)+$/)
  })
  .strict();

export const problemFamilyManifestSchema = z
  .object({
    schemaVersion: z.literal(PROBLEM_FAMILY_SCHEMA_VERSION),
    familyId: familyIdSchema,
    activityId: familyIdSchema,
    templateId: familyIdSchema,
    domain: elementaryMathDomainSchema,
    learningGoal: z.string().trim().min(1).max(500),
    assessmentTargetIds: z.array(familyIdSchema).max(32),
    manipulation: problemFamilyManipulationSchema,
    generator: z
      .object({
        id: familyIdSchema,
        version: z.string().min(1).max(80)
      })
      .strict(),
    capability: capabilityManifestSchema,
    renderRecipe: renderRecipeSchema,
    solReviewScope: solReviewScopeSchema.optional(),
    releaseEvidence: releaseEvidenceSchema
  })
  .strict()
  .superRefine((family, context) => {
    if (
      family.familyId !== family.activityId ||
      family.familyId !== family.templateId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["familyId"],
        message: "Phase 1 canonical family/activity/template ID는 같아야 합니다."
      });
    }
    if (family.capability.defaultParameters?.familyId !== family.familyId) {
      if (family.capability.defaultParameters) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["capability", "defaultParameters", "familyId"],
          message: "기본 문제 조건의 family ID가 manifest와 다릅니다."
        });
      }
    }
  });

// OfficialStandard는 Phase 0에서 고정한 권위 스키마를 그대로 재사용한다.
export const officialStandardSchema = officialElementaryStandardSchema;

export type FamilyId = z.infer<typeof familyIdSchema>;
export type ProblemParameters = z.infer<typeof problemParametersSchema>;
export type ProblemParameterValue = z.infer<typeof problemParameterValueSchema>;
export type ProblemParameterField = z.infer<typeof problemParameterFieldSchema>;
export type AssessmentTarget = z.infer<typeof assessmentTargetSchema>;
export type AssessmentTargetSet = z.infer<typeof assessmentTargetSetSchema>;
export type CapabilityManifest = z.infer<typeof capabilityManifestSchema>;
export type RenderRecipe = z.infer<typeof renderRecipeSchema>;
export type ReleaseEvidence = z.infer<typeof releaseEvidenceSchema>;
export type SolReviewScope = z.infer<typeof solReviewScopeSchema>;
export type ProblemFamilyManifest = z.infer<typeof problemFamilyManifestSchema>;
