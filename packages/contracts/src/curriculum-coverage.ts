import { z } from "zod";

export const ELEMENTARY_CURRICULUM_FIXTURE_SCHEMA_VERSION = "1.0.0" as const;

export const elementaryMathDomainSchema = z.enum([
  "수와 연산",
  "변화와 관계",
  "도형과 측정",
  "자료와 가능성"
]);

export const officialElementaryStandardSchema = z
  .object({
    code: z.string().regex(/^\[[246]수0[1-4]-\d{2}\]$/),
    gradeBand: z.enum(["1-2", "3-4", "5-6"]),
    domain: elementaryMathDomainSchema,
    officialGoal: z.string().trim().min(1).max(500),
    sourceLocator: z.string().trim().min(1).max(500),
    verificationStatus: z.literal("official-text-verified"),
    reviewedAt: z.string().datetime(),
    reviewer: z.string().trim().min(1).max(160)
  })
  .strict();

export const officialElementaryStandardsSourceSchema = z
  .object({
    sourceId: z.literal("kr-moe-2022-33-annex-8-elementary-math"),
    title: z.literal(
      "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정"
    ),
    noticeUrl: z.string().url(),
    hwpDownloadUrl: z.string().url(),
    pdfDownloadUrl: z.string().url(),
    noticeDate: z.string().date(),
    reviewedAt: z.string().datetime(),
    reviewer: z.string().trim().min(1).max(160),
    hwpArchiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
    hwpDocumentSha256: z.string().regex(/^[a-f0-9]{64}$/),
    pdfSha256: z.string().regex(/^[a-f0-9]{64}$/),
    sourceTextIncluded: z.literal(false),
    extractionNote: z.string().trim().min(1).max(1000)
  })
  .strict();

export const officialElementaryStandardsFixtureSchema = z
  .object({
    schemaVersion: z.literal(ELEMENTARY_CURRICULUM_FIXTURE_SCHEMA_VERSION),
    source: officialElementaryStandardsSourceSchema,
    standards: z.array(officialElementaryStandardSchema).min(1).max(200)
  })
  .strict()
  .superRefine((fixture, context) => {
    const seenCodes = new Set<string>();
    const gradeBandByPrefix = {
      "2": "1-2",
      "4": "3-4",
      "6": "5-6"
    } as const;
    const domainByCode = {
      "01": "수와 연산",
      "02": "변화와 관계",
      "03": "도형과 측정",
      "04": "자료와 가능성"
    } as const;

    fixture.standards.forEach((standard, index) => {
      if (seenCodes.has(standard.code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["standards", index, "code"],
          message: `공식 성취기준 코드가 중복되었습니다: ${standard.code}`
        });
      }
      seenCodes.add(standard.code);

      const expectedGradeBand = gradeBandByPrefix[
        standard.code[1] as keyof typeof gradeBandByPrefix
      ];
      if (standard.gradeBand !== expectedGradeBand) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["standards", index, "gradeBand"],
          message: `${standard.code}의 학년군은 ${expectedGradeBand}여야 합니다.`
        });
      }

      const expectedDomain = domainByCode[
        standard.code.slice(3, 5) as keyof typeof domainByCode
      ];
      if (standard.domain !== expectedDomain) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["standards", index, "domain"],
          message: `${standard.code}의 영역은 ${expectedDomain}이어야 합니다.`
        });
      }
    });
  });

export const curriculumActivityStageSchema = z.enum([
  "unmapped",
  "mapped",
  "generatable",
  "offline-validated",
  "live-released"
]);

const nullableCoverageCountSchema = z
  .object({
    status: z.enum(["available", "unavailable"]),
    numerator: z.number().int().min(0).nullable(),
    denominator: z.number().int().min(0).nullable(),
    note: z.string().trim().min(1).max(1000)
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status === "available" &&
      (value.numerator === null || value.denominator === null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numerator"],
        message: "available coverage에는 분자와 분모가 필요합니다."
      });
    }
    if (
      value.status === "unavailable" &&
      (value.numerator !== null || value.denominator !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numerator"],
        message: "unavailable coverage는 수치를 제시하지 않습니다."
      });
    }
  });

export const officialStandardCoverageRowSchema = z
  .object({
    code: z.string().regex(/^\[[246]수0[1-4]-\d{2}\]$/),
    gradeBand: z.enum(["1-2", "3-4", "5-6"]),
    domain: elementaryMathDomainSchema,
    officialGoal: z.string().trim().min(1).max(500),
    catalogMapped: z.boolean(),
    catalogSummaryKind: z
      .enum(["official-goal", "activity-profile-goal", "source-position"])
      .nullable(),
    catalogGoalMatchesOfficial: z.boolean().nullable(),
    activityStage: curriculumActivityStageSchema,
    activityIds: z.array(z.string().min(1)).max(32),
    releasedActivityIds: z.array(z.string().min(1)).max(32),
    unitIds: z.array(z.string().regex(/^[1-6]-[12]-[1-6]$/)).max(24),
    targetCoverage: nullableCoverageCountSchema,
    familyVariety: z
      .object({
        basis: z.enum([
          "teacher-activity-option-proxy",
          "canonical-problem-family-registry"
        ]),
        familyCount: z.number().int().min(0),
        releasedFamilyCount: z.number().int().min(0)
      })
      .strict()
  })
  .strict();

export const elementaryCurriculumCoverageReportSchema = z
  .object({
    schemaVersion: z.literal(ELEMENTARY_CURRICULUM_FIXTURE_SCHEMA_VERSION),
    authorityReviewedAt: z.string().datetime(),
    source: officialElementaryStandardsSourceSchema,
    officialStandardCount: z.number().int().positive(),
    catalogStandardCount: z.number().int().min(0),
    mappedStandardCount: z.number().int().min(0),
    standardsWithAnyActivity: z.number().int().min(0),
    standardsWithReleasedActivity: z.number().int().min(0),
    catalogDiff: z
      .object({
        missingOfficialCodes: z.array(z.string()),
        codesOutsideOfficialFixture: z.array(z.string()),
        officialGoalMismatches: z.array(z.string()),
        gradeBandMismatches: z.array(z.string()),
        domainMismatches: z.array(z.string())
      })
      .strict(),
    officialStandardMappingCoverage: nullableCoverageCountSchema,
    releasedActivityReach: nullableCoverageCountSchema,
    targetCoverage: nullableCoverageCountSchema,
    textbookUnitReach: z
      .object({
        totalUnits: z.number().int().min(0),
        unitsWithAnyActivity: z.number().int().min(0),
        unitsWithReleasedActivity: z.number().int().min(0),
        unknownStandardCodes: z.array(z.string()),
        orphanOfficialStandardCodes: z.array(z.string())
      })
      .strict(),
    byGradeBand: z.array(
      z
        .object({
          gradeBand: z.enum(["1-2", "3-4", "5-6"]),
          official: z.number().int().min(0),
          mapped: z.number().int().min(0),
          withActivity: z.number().int().min(0),
          withReleasedActivity: z.number().int().min(0)
        })
        .strict()
    ),
    byDomain: z.array(
      z
        .object({
          domain: elementaryMathDomainSchema,
          official: z.number().int().min(0),
          mapped: z.number().int().min(0),
          withActivity: z.number().int().min(0),
          withReleasedActivity: z.number().int().min(0)
        })
        .strict()
    ),
    rows: z.array(officialStandardCoverageRowSchema)
  })
  .strict();

export type OfficialElementaryStandard = z.infer<
  typeof officialElementaryStandardSchema
>;
export type OfficialElementaryStandardsFixture = z.infer<
  typeof officialElementaryStandardsFixtureSchema
>;
export type ElementaryCurriculumCoverageReport = z.infer<
  typeof elementaryCurriculumCoverageReportSchema
>;
