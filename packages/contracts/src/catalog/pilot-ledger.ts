import { z } from "zod";
import { stableIdSchema } from "../vocabulary/ids.js";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const sourceLocatorSchema = z
  .object({
    sourceId: stableIdSchema,
    title: z.string().min(1).max(240),
    url: z.string().url(),
    version: z.string().min(1).max(160),
    contentSha256: sha256Schema,
    locator: z.string().min(1).max(500),
    authority: z.enum(["standard", "unit", "auxiliary"]),
    verificationStatus: z.enum([
      "official-text-verified",
      "official-source-checked",
      "auxiliary-pinned",
      "unverified"
    ]),
    extractedBy: stableIdSchema,
    reviewedBy: stableIdSchema,
    reviewedAt: z.string().datetime()
  })
  .strict();

const nativeEvidenceCatalog = {
  "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NG": {
    file: "research/mathcanvas/tool-catalog.snapshot.json",
    sha256: "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
    toolKey: "NO04NG",
    claim: "captured"
  },
  "research/mathcanvas/division-native-semantic-probe.json#candidate=NO04NG": {
    file: "research/mathcanvas/division-native-semantic-probe.json",
    sha256: "3bdeedc9c2f281c9fd9db1ed3cfa855f34ddae3b59cc0c7522f85df2f867d45b",
    toolKey: "NO04NG",
    claim: "captured"
  },
  "research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC": {
    file: "research/mathcanvas/tool-catalog.snapshot.json",
    sha256: "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
    toolKey: "NO01SC",
    claim: "captured"
  },
  "research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC": {
    file: "research/mathcanvas/division-counting-group-canary.json",
    sha256: "045f8147302dd1b4625bc4a3e33ece1b9b0e2caf8b638d2b0690c7eda1e942d5",
    toolKey: "NO01SC",
    claim: "released"
  },
  "research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM": {
    file: "research/mathcanvas/tool-catalog.snapshot.json",
    sha256: "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
    toolKey: "NO03FM",
    claim: "captured"
  },
  "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM": {
    file: "research/mathcanvas/wave1-current-golden-canary.roundtrip.json",
    sha256: "33289aaa6007dbd72fb09e984f5a422e238851f035f258d2f58219c7ac634f7d",
    toolKey: "NO03FM",
    claim: "released"
  },
  "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD": {
    file: "research/mathcanvas/tool-catalog.snapshot.json",
    sha256: "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
    toolKey: "NO04PD",
    claim: "captured"
  },
  "research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD": {
    file: "research/mathcanvas/wave14-place-value-release-canary.json",
    sha256: "fa1f1fb11863d061737eb5c9d2cbbfe3333d9b3b8c2f2c292dadb853c9629840",
    toolKey: "NO04PD",
    claim: "released"
  },
  "research/mathcanvas/tool-catalog.snapshot.json#tool=SM07CS": {
    file: "research/mathcanvas/tool-catalog.snapshot.json",
    sha256: "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
    toolKey: "SM07CS",
    claim: "captured"
  },
  "research/mathcanvas/tool-catalog.snapshot.json#tool=DP03PG": {
    file: "research/mathcanvas/tool-catalog.snapshot.json",
    sha256: "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
    toolKey: "DP03PG",
    claim: "captured"
  },
  "research/mathcanvas/graph-tool-contract.observations.json#tool=DP03PG": {
    file: "research/mathcanvas/graph-tool-contract.observations.json",
    sha256: "48b31f3b08d8cd0768709e7bf484dc92331c801fb92732128d2e2146c29e61bc",
    toolKey: "DP03PG",
    claim: "captured"
  },
  "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT": {
    file: "research/mathcanvas/tool-catalog.snapshot.json",
    sha256: "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
    toolKey: "NO04NT",
    claim: "captured"
  },
  "research/mathcanvas/module-variant-contract.static.json#tool=NO04NT": {
    file: "research/mathcanvas/module-variant-contract.static.json",
    sha256: "074d0af84a040d6769569c0346e7480749ac2c6b164df3f65fdc1cdfbe5fdde4",
    toolKey: "NO04NT",
    claim: "captured"
  }
} as const;

const nativeEvidenceReferenceSchema = z
  .object({
    id: z.string().min(1).max(500),
    file: z.string().regex(/^research\/mathcanvas\/[A-Za-z0-9._-]+\.json$/),
    sha256: sha256Schema,
    toolKey: stableIdSchema,
    claim: z.enum(["captured", "contracted", "verified", "released"])
  })
  .strict()
  .superRefine((value, context) => {
    const expected = nativeEvidenceCatalog[value.id as keyof typeof nativeEvidenceCatalog];
    if (!expected) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["id"],
        message: "등록된 native evidence locator만 사용할 수 있습니다."
      });
      return;
    }
    for (const field of ["file", "sha256", "toolKey", "claim"] as const) {
      if (value[field] !== expected[field]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `native evidence ${field}가 pinned registry와 다릅니다.`
        });
      }
    }
  });

const pilotPrimaryStandardCodes = [
  "[4수01-04]",
  "[4수01-05]",
  "[4수01-06]",
  "[4수01-09]",
  "[4수01-10]",
  "[4수01-11]",
  "[4수03-06]",
  "[4수03-15]",
  "[4수03-16]",
  "[4수03-18]",
  "[4수03-21]",
  "[4수04-01]"
] as const;

const pilotCrossBandStandardCodes = ["[2수01-10]", "[2수03-10]"] as const;

const standardBindingSchema = z
  .object({
    code: z.enum(pilotPrimaryStandardCodes),
    gradeBand: z.enum(["1-2", "3-4", "5-6"]),
    domain: z.enum([
      "수와 연산",
      "변화와 관계",
      "도형과 측정",
      "자료와 가능성"
    ]),
    officialGoal: z.string().min(1).max(500),
    source: sourceLocatorSchema
  })
  .strict();

const crossBandReviewSchema = z
  .object({
    standardCode: z.enum(pilotCrossBandStandardCodes),
    reason: z.string().min(1).max(500),
    teacherLabel: z.literal("선수 학습 복습"),
    unit: z
      .object({
        unitId: z.string().regex(/^[1-6]-[12]-[1-6]$/),
        grade: z.number().int().min(1).max(6),
        semester: z.union([z.literal(1), z.literal(2)]),
        unitNumber: z.number().int().min(1).max(6),
        title: z.string().min(1).max(100),
        source: sourceLocatorSchema
      })
      .strict()
      .superRefine((value, context) => {
        if (
          value.unitId !==
          `${value.grade}-${value.semester}-${value.unitNumber}`
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["unitId"],
            message: "cross-band unitId가 학년·학기·단원과 일치해야 합니다."
          });
        }
        if (value.source.authority !== "unit") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["source", "authority"],
            message: "cross-band review는 별도 unit authority를 가져야 합니다."
          });
        }
      })
  })
  .strict();

const unitBindingSchema = z
  .object({
    unitId: z.string().regex(/^[1-6]-[12]-[1-6]$/),
    grade: z.number().int().min(1).max(6),
    semester: z.union([z.literal(1), z.literal(2)]),
    unitNumber: z.number().int().min(1).max(6),
    title: z.string().min(1).max(100),
    source: sourceLocatorSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.unitId !==
      `${value.grade}-${value.semester}-${value.unitNumber}`
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "unitId가 학년·학기·단원과 일치해야 합니다."
      });
    }
  });

const nativeAffordanceRequirementSchema = z
  .object({
    affordanceFamilyId: stableIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    candidateToolKeys: z.array(stableIdSchema).min(1).max(6),
    requiredOperation: z.string().min(1).max(500),
    semanticState: z.string().min(1).max(500),
    supportState: z.enum(["captured", "contracted", "verified", "released"]),
    evidenceIds: z.array(z.string().min(1).max(500)).min(1).max(8),
    evidenceRefs: z.array(nativeEvidenceReferenceSchema).min(1).max(8)
  })
  .strict()
  .superRefine((value, context) => {
    const refIds = value.evidenceRefs.map((reference) => reference.id);
    if (value.evidenceIds.join("\n") !== refIds.join("\n")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceIds"],
        message: "evidenceIds와 구조화된 evidenceRefs가 같은 순서로 결속되어야 합니다."
      });
    }
    if (
      value.evidenceRefs.some(
        (reference) => !value.candidateToolKeys.includes(reference.toolKey)
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "모든 native evidence는 candidate tool key를 직접 가리켜야 합니다."
      });
    }
    const requiredClaim =
      value.supportState === "released"
        ? "released"
        : value.supportState === "verified"
          ? "verified"
          : value.supportState === "contracted"
            ? "contracted"
            : "captured";
    if (
      !value.evidenceRefs.some(
        (reference) =>
          value.candidateToolKeys.includes(reference.toolKey) &&
          reference.claim === requiredClaim
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: `supportState ${value.supportState}에 필요한 ${requiredClaim} evidence가 없습니다.`
      });
    }
  });

const familyCandidateSchema = z
  .object({
    id: stableIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    rationale: z.string().min(1).max(500)
  })
  .strict();

const learningMapBindingSchema = z
  .object({
    topicId: stableIdSchema,
    prerequisiteTopicIds: z.array(stableIdSchema).max(8),
    observableEvidence: z.array(z.string().min(1).max(500)).min(1).max(4),
    assessmentPrompt: z.string().min(1).max(1000),
    sourceRecordKey: z.string().min(1).max(240)
  })
  .strict();

export const pilotLedgerEntrySchema = z
  .object({
    sourceId: z.string().regex(/^ppt-\d{2}$/),
    title: z.string().min(1).max(160),
    pptLocator: z.string().regex(/^claude-all-30-ppt-content\.md#L\d+-L\d+$/),
    grade: z.literal(3),
    semester: z.union([z.literal(1), z.literal(2)]),
    unit: unitBindingSchema,
    pptUnit: z
      .object({
        semester: z.union([z.literal(1), z.literal(2)]),
        unitNumber: z.number().int().min(1).max(6),
        title: z.string().min(1).max(100)
      })
      .strict(),
    unitMappingNote: z.string().min(1).max(500),
    domain: z.enum([
      "수와 연산",
      "변화와 관계",
      "도형과 측정",
      "자료와 가능성"
    ]),
    learningType: z.literal("기본 연습"),
    standard: standardBindingSchema,
    prerequisiteStandardCodes: z
      .array(z.enum(pilotCrossBandStandardCodes))
      .max(8),
    crossBandReview: crossBandReviewSchema.optional(),
    learningMap: learningMapBindingSchema,
    mathematicalDecision: z.string().min(1).max(500),
    misconception: z.string().min(1).max(500),
    invariant: z.string().min(1).max(500),
    explanationFocus: z.string().min(1).max(500),
    nativeAffordance: nativeAffordanceRequirementSchema,
    blueprintFamily: familyCandidateSchema,
    variationPreset: familyCandidateSchema,
    layoutFamily: familyCandidateSchema,
    retainedPptStages: z.array(z.number().int().min(1).max(11)).min(1).max(11),
    excludedPptStages: z.array(z.number().int().min(1).max(11)).max(11),
    phaseSourceStages: z
      .object({
        prediction: z.array(z.number().int().min(1).max(11)).min(1),
        "mathematical-confirmation": z
          .array(z.number().int().min(1).max(11))
          .min(1),
        explanation: z.array(z.number().int().min(1).max(11)).min(1),
        revision: z.array(z.number().int().min(1).max(11)).min(1)
      })
      .strict(),
    screenSequence: z
      .array(z.enum(["prediction", "mathematical-confirmation", "explanation", "revision"]))
      .length(4),
    r1State: z.literal("reviewed")
  })
  .strict()
  .superRefine((value, context) => {
    if (value.domain !== value.standard.domain) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["domain"],
        message: "entry domain과 standard domain이 일치해야 합니다."
      });
    }
    if (value.standard.source.authority !== "standard") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["standard", "source", "authority"],
        message: "성취기준은 standard authority에 결속해야 합니다."
      });
    }
    if (value.unit.source.authority !== "unit") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit", "source", "authority"],
        message: "학년·학기·단원은 unit authority에 결속해야 합니다."
      });
    }
    if (value.unit.grade !== value.grade) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit", "grade"],
        message: "entry 학년과 unit 학년이 일치해야 합니다."
      });
    }
    if (value.unit.semester !== value.semester) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit", "semester"],
        message: "entry 학기와 unit 학기가 일치해야 합니다."
      });
    }
    if (value.pptUnit.semester !== value.semester) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pptUnit", "semester"],
        message: "PPT 원고의 학기와 entry 학기가 일치해야 합니다."
      });
    }
    if (value.standard.gradeBand !== "3-4") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["standard", "gradeBand"],
        message: "3학년 pilot의 primary standard는 3–4학년군이어야 합니다."
      });
    }
    if (
      value.prerequisiteStandardCodes.some(
        (code) => code === (value.standard.code as string)
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prerequisiteStandardCodes"],
        message: "primary standard를 선수 학습 코드로 중복 결속할 수 없습니다."
      });
    }
    if (
      value.crossBandReview &&
      !value.prerequisiteStandardCodes.includes(value.crossBandReview.standardCode)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["crossBandReview", "standardCode"],
        message: "cross-band review 코드는 prerequisiteStandardCodes에도 있어야 합니다."
      });
    }
    if (!value.crossBandReview && value.prerequisiteStandardCodes.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prerequisiteStandardCodes"],
        message: "prerequisite standard가 있으면 별도 cross-band review binding도 있어야 합니다."
      });
    }
    if (
      value.crossBandReview &&
      (value.prerequisiteStandardCodes.length !== 1 ||
        value.prerequisiteStandardCodes[0] !== value.crossBandReview.standardCode)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prerequisiteStandardCodes"],
        message: "cross-band prerequisite는 review binding과 정확히 하나로 결속되어야 합니다."
      });
    }
    if (value.screenSequence.join(",") !== "prediction,mathematical-confirmation,explanation,revision") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["screenSequence"],
        message: "학생 화면 순서는 예상→수학적 확인→설명→수정이어야 합니다."
      });
    }
    const retained = new Set(value.retainedPptStages);
    const excluded = new Set(value.excludedPptStages);
    for (const stage of retained) {
      if (excluded.has(stage)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["excludedPptStages"],
          message: "남긴 원고 단계와 제외한 원고 단계가 겹칩니다."
        });
        break;
      }
    }
    for (const [phase, stages] of Object.entries(value.phaseSourceStages)) {
      for (const stage of stages) {
        if (!retained.has(stage)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["phaseSourceStages", phase],
            message: "학생 phase의 source stage는 retainedPptStages 안에 있어야 합니다."
          });
          break;
        }
      }
    }
    if (
      new Set([
        value.blueprintFamily.id,
        value.nativeAffordance.affordanceFamilyId,
        value.layoutFamily.id
      ]).size !== 3
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layoutFamily", "id"],
        message: "blueprint·affordance·layout family ID는 서로 달라야 합니다."
      });
    }
  });

export const pilotSourceManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    pilotId: z.literal("grade-3-basic-practice-30"),
    ppt: sourceLocatorSchema.extend({
      sourceId: z.literal("ppt-grade-3-basic-practice-30"),
      authority: z.literal("auxiliary")
    }),
    standardAuthority: sourceLocatorSchema.extend({
      sourceId: z.literal("kr-ncic-2022-elementary-math"),
      authority: z.literal("standard")
    }),
    unitAuthorities: z
      .array(
        sourceLocatorSchema.extend({
          authority: z.literal("unit")
        })
      )
      .length(2),
    crossBandUnitAuthorities: z
      .array(
        sourceLocatorSchema.extend({
          authority: z.literal("unit")
        })
      )
      .min(1)
      .max(4),
    authorityEvidence: z
      .object({
        file: z.literal(
          "research/curriculum/grade-3-pilot-authority-evidence.json"
        ),
        sha256: sha256Schema
      })
      .strict(),
    learningMap: z
      .object({
        repository: z.literal("DECK6/korean-elementary-learning-map"),
        commit: z.string().regex(/^[a-f0-9]{40}$/),
        topicsSha256: sha256Schema,
        dependenciesSha256: sha256Schema,
        standardsSha256: sha256Schema,
        fixtureSha256: sha256Schema
      })
      .strict(),
    extractedBy: stableIdSchema,
    reviewedBy: stableIdSchema,
    reviewedAt: z.string().datetime()
  })
  .strict();

export const grade3PilotLedgerSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    sourceManifest: pilotSourceManifestSchema,
    entries: z.array(pilotLedgerEntrySchema).length(30)
  })
  .strict()
  .superRefine((value, context) => {
    const sourceIdentity = (source: {
      sourceId: string;
      url: string;
      version: string;
      contentSha256: string;
    }) =>
      [source.sourceId, source.url, source.version, source.contentSha256].join(
        "\u0000"
      );
    const standardSourceKey = sourceIdentity(value.sourceManifest.standardAuthority);
    const unitSourceKeys = new Set(
      value.sourceManifest.unitAuthorities.map(sourceIdentity)
    );
    const crossBandSourceKeys = new Set(
      value.sourceManifest.crossBandUnitAuthorities.map(sourceIdentity)
    );
    const expectedCrossBandUnitIds: Record<
      (typeof pilotCrossBandStandardCodes)[number],
      string
    > = {
      "[2수01-10]": "2-1-6",
      "[2수03-10]": "2-1-4"
    };
    const variationDefinitions = new Map<string, string>();
    const ids = value.entries.map((entry) => entry.sourceId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "PPT source ID는 중복될 수 없습니다."
      });
    }
    const expected = Array.from({ length: 30 }, (_, index) =>
      `ppt-${String(index + 1).padStart(2, "0")}`
    );
    if (ids.slice().sort().join(",") !== expected.join(",")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "ppt-01부터 ppt-30까지 모두 있어야 합니다."
      });
    }
    const domains = value.entries.reduce<Record<string, number>>(
      (counts, entry) => {
        counts[entry.domain] = (counts[entry.domain] ?? 0) + 1;
        return counts;
      },
      {}
    );
    const expectedDomainCounts: Record<string, number> = {
      "수와 연산": 21,
      "변화와 관계": 0,
      "도형과 측정": 7,
      "자료와 가능성": 2
    };
    for (const [domain, expectedCount] of Object.entries(expectedDomainCounts)) {
      if ((domains[domain] ?? 0) !== expectedCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries"],
          message: `${domain} 영역 수가 ${expectedCount}와 다릅니다.`
        });
      }
    }
    const semesters = value.entries.reduce<Record<string, number>>(
      (counts, entry) => {
        counts[String(entry.semester)] =
          (counts[String(entry.semester)] ?? 0) + 1;
        return counts;
      },
      {}
    );
    if (semesters["1"] !== 15 || semesters["2"] !== 15) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "1학기·2학기는 각각 15개여야 합니다."
      });
    }
    for (const [index, entry] of value.entries.entries()) {
      const variationDefinition = [
        entry.variationPreset.version,
        entry.variationPreset.rationale,
        entry.mathematicalDecision
      ].join("\u0000");
      const priorDefinition = variationDefinitions.get(entry.variationPreset.id);
      if (priorDefinition && priorDefinition !== variationDefinition) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "variationPreset", "id"],
          message: "같은 variation preset ID/version은 하나의 수학적 정의만 가져야 합니다."
        });
      } else {
        variationDefinitions.set(entry.variationPreset.id, variationDefinition);
      }
      if (entry.crossBandReview) {
        const crossBand = entry.crossBandReview;
        const sourceKey = [
          crossBand.unit.source.sourceId,
          crossBand.unit.source.url,
          crossBand.unit.source.version,
          crossBand.unit.source.contentSha256
        ].join("\u0000");
        if (crossBand.unit.grade !== 2) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entries", index, "crossBandReview", "unit", "grade"],
            message: "3학년 pilot의 cross-band review unit은 2학년이어야 합니다."
          });
        }
        if (crossBand.unit.unitId !== expectedCrossBandUnitIds[crossBand.standardCode]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entries", index, "crossBandReview", "unit", "unitId"],
            message: "cross-band 성취기준과 unit의 고정 매핑이 다릅니다."
          });
        }
        if (!crossBandSourceKeys.has(sourceKey)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["entries", index, "crossBandReview", "unit", "source"],
            message: "cross-band unit source는 manifest에 pin된 authority여야 합니다."
          });
        }
      }
      if (sourceIdentity(entry.standard.source) !== standardSourceKey) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "standard", "source"],
          message: "primary standard source는 manifest에 pin된 standard authority여야 합니다."
        });
      }
      if (!unitSourceKeys.has(sourceIdentity(entry.unit.source))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "unit", "source"],
          message: "entry unit source는 manifest에 pin된 unit authority여야 합니다."
        });
      }
      const expectedUnitSource =
        value.sourceManifest.unitAuthorities[entry.semester - 1];
      if (
        !expectedUnitSource ||
        sourceIdentity(entry.unit.source) !== sourceIdentity(expectedUnitSource)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "unit", "source"],
          message: "entry 학기와 unit authority source가 정확히 일치해야 합니다."
        });
      }
    }
  });

export type PilotLedgerEntry = z.infer<typeof pilotLedgerEntrySchema>;
export type PilotSourceManifest = z.infer<typeof pilotSourceManifestSchema>;
export type Grade3PilotLedger = z.infer<typeof grade3PilotLedgerSchema>;

export function defineGrade3PilotLedger(
  input: z.input<typeof grade3PilotLedgerSchema>
): Grade3PilotLedger {
  return grade3PilotLedgerSchema.parse(input);
}
