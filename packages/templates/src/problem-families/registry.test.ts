import { describe, expect, it } from "vitest";
import {
  ACTIVITY_IDS,
  PROBLEM_FAMILY_SCHEMA_VERSION,
  TEACHER_INTENT_CAPABILITIES,
  defineVariationEnvelope,
  problemParametersSchema,
  type ProblemParameters
} from "@mathcanvas/contracts";
import {
  createProblemFamilyRegistry,
  assertProblemFamilyAssessmentTargetBindings,
  findProblemFamilyByLegacyTeacherIntentKind,
  findProblemFamilyByRoute,
  getProblemFamilyManifest,
  listProblemFamilyManifests,
  problemParametersFromTeacherIntent,
  teacherIntentFromProblemParameters,
  validateProblemParameters
} from "./registry.js";
import { multiplicationArrayMeaningBlueprint } from "../blueprints/multiplication-array-meaning.js";
import { createProblemFamilyRuntimeRegistry } from "./runtime-registry.js";
import { getCognitiveDemandManifest } from "../cognitive/registry.js";
import {
  CLASSIFICATION_ASSESSMENT_TARGET_IDS,
  REPEATING_PATTERN_ASSESSMENT_TARGET_IDS
} from "@mathcanvas/curriculum";
import { CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID } from "./domains/data-probability/classification-given-criterion-count.js";
import { DATA_TABLE_ORGANIZE_FAMILY_ID } from "./domains/data-probability/data-table-organize.js";
import { DECLARED_REPEAT_REPAIR_FAMILY_ID } from "./domains/change-relationships/declared-repeat-repair.js";
import { REPEAT_RULE_CONSTRUCTION_FAMILY_ID } from "./domains/change-relationships/repeat-rule-construction.js";
import { REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID } from "./domains/change-relationships/repeating-pattern-arrangement.js";
import type {
  ProblemFamilyCapabilityExtension,
  ProblemFamilyNativeModule,
  ProblemFamilyRegistrySource
} from "./types.js";
import { PORTFOLIO_SCALE_COUNTS } from "./portfolio-scale.js";

describe("canonical ProblemFamily registry", () => {
  it("기존 29개·다섯 native family·97개 portfolio 실행판을 canonical ID로 정확히 한 번 감싼다", () => {
    const manifests = listProblemFamilyManifests();
    expect(manifests).toHaveLength(34 + PORTFOLIO_SCALE_COUNTS.standards);
    expect(
      manifests.filter(
        (manifest) => manifest.releaseEvidence.supportState === "released"
      )
    ).toHaveLength(21);
    expect(new Set(manifests.map((manifest) => manifest.familyId)).size).toBe(
      manifests.length
    );
    expect(
      manifests.filter(
        (manifest) => manifest.renderRecipe.kind === "portfolio-scale-adapter"
      )
    ).toHaveLength(PORTFOLIO_SCALE_COUNTS.standards);
    expect(
      manifests.filter(
        (manifest) => manifest.renderRecipe.kind === "portfolio-scale-adapter"
      ).reduce(
        (sum, manifest) =>
          sum +
          (manifest.renderRecipe.kind === "portfolio-scale-adapter"
            ? manifest.renderRecipe.targetOutlineCount
            : 0),
        0
      )
    ).toBe(PORTFOLIO_SCALE_COUNTS.targetOutlines);
    for (const manifest of manifests) {
      expect(manifest.familyId).toBe(manifest.activityId);
      expect(manifest.familyId).toBe(manifest.templateId);
      if (manifest.renderRecipe.kind === "portfolio-scale-adapter") {
        expect(manifest.assessmentTargetIds).toEqual([]);
        expect(manifest.releaseEvidence.supportState).toBe("verified");
      } else {
        expect(manifest.renderRecipe.kind).toBe(
          ([
          CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
          DATA_TABLE_ORGANIZE_FAMILY_ID,
          DECLARED_REPEAT_REPAIR_FAMILY_ID,
          REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
          REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID
        ] as readonly string[]).includes(manifest.familyId)
          ? "native-render-recipe"
            : "legacy-blueprint-adapter"
        );
      }
      expect(manifest.releaseEvidence.blueprintContentHash).toMatch(
        /^[a-f0-9]{64}$/
      );
    }
    expect(
      getProblemFamilyManifest(
        CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID
      )?.assessmentTargetIds
    ).toEqual([
      CLASSIFICATION_ASSESSMENT_TARGET_IDS.givenCriterion,
      CLASSIFICATION_ASSESSMENT_TARGET_IDS.countByClass,
      CLASSIFICATION_ASSESSMENT_TARGET_IDS.describeResult
    ]);
    expect(
      getProblemFamilyManifest(ACTIVITY_IDS.repeatingPatternUnit)
    ).toMatchObject({
      assessmentTargetIds: Object.values(
        REPEATING_PATTERN_ASSESSMENT_TARGET_IDS
      ),
      releaseEvidence: {
        supportState: "released",
        lifecycleStage: "live-released",
        evidencePaths: [
          "research/mathcanvas/wave16-pattern-release-canary.json"
        ]
      }
    });
    expect(
      getProblemFamilyManifest(REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID)
    ).toMatchObject({
      capability: {
        supportedStandardCodes: ["[2수02-02]"]
      },
      assessmentTargetIds: expect.any(Array),
      releaseEvidence: { supportState: "verified" }
    });
    expect(
      getProblemFamilyManifest(DECLARED_REPEAT_REPAIR_FAMILY_ID)
    ).toMatchObject({
      capability: {
        supportedStandardCodes: ["[2수02-02]"]
      },
      assessmentTargetIds: [
        "change.pattern.declared-repeat.repair-v1"
      ],
      releaseEvidence: { supportState: "verified" },
      solReviewScope: {
        familyTrackId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
        scopeId: "W002-FAMILY_TRACK-repeat-repair"
      }
    });
  });

  it("기존 세 TeacherIntent를 공통 ProblemParameters로 무손실 왕복한다", () => {
    for (const capability of TEACHER_INTENT_CAPABILITIES) {
      const parameters = problemParametersFromTeacherIntent(
        capability.defaultIntent
      );
      expect(parameters?.familyId).toBe(capability.templateId);
      expect(validateProblemParameters(parameters!)).toEqual(parameters);
      expect(teacherIntentFromProblemParameters(parameters!)).toEqual(
        capability.defaultIntent
      );
      expect(
        findProblemFamilyByLegacyTeacherIntentKind(capability.kind)?.familyId
      ).toBe(capability.templateId);
      expect(
        findProblemFamilyByRoute({
          standardCode: capability.standardCode,
          manipulation: capability.manipulation
        })?.familyId
      ).toBe(capability.templateId);
    }
  });

  it("미지원 family·누락 필드·범위 밖 값은 침묵 무시하지 않는다", () => {
    expect(() =>
      validateProblemParameters({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: ACTIVITY_IDS.makeTenNumberCards,
        values: { target: 10 }
      })
    ).toThrow("problem-parameters-unsupported");
    const multiplication = problemParametersFromTeacherIntent(
      TEACHER_INTENT_CAPABILITIES[0]!.defaultIntent
    )!;
    expect(() =>
      validateProblemParameters({
        ...multiplication,
        values: { ...multiplication.values, itemsPerGroup: 99 }
      })
    ).toThrow();
    expect(() =>
      validateProblemParameters({
        ...multiplication,
        values: { ...multiplication.values, ignoredField: "silent" }
      })
    ).toThrow();
  });

  it("fourth family fixture는 공통 registry 수정 없이 domain source와 capability만으로 나타난다", () => {
    const familyId = "geometry.angle.sort-v1";
    const source: ProblemFamilyRegistrySource = {
      registrationKind: "native-problem-family-module",
      familyId,
      activityId: familyId,
      templateId: familyId,
      standardCode: "[4수03-24]",
      supportedStandardCodes: ["[4수03-24]", "[4수03-25]"],
      gradeBand: "3-4",
      domain: "도형과 측정",
      learningGoal: "각을 회전한 양에 따라 분류한다.",
      assessmentTargetIds: ["geometry.angle.sort-reviewed-v1"],
      manipulation: "angle-sort-card-drag",
      generator: { id: "geometry.angle.sort-items", version: "1.0.0" },
      blueprint: {
        contentHash: "a".repeat(64),
        version: "1.0.0",
        layoutTokenSet: "angle-sort-v1"
      },
      availableProblemCounts: [2, 4],
      supportedDifficulties: ["normal"],
      supportState: "verified",
      evidencePaths: []
    };
    const defaultParameters = problemParametersSchema.parse({
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId,
      values: { angleDegrees: 90 }
    });
    const extension: ProblemFamilyCapabilityExtension = {
      familyId,
      recommendedGrade: 4,
      gradeRange: [3, 4],
      defaultProblemCount: 2,
      parameterFields: [
        {
          key: "angleDegrees",
          inputLabel: "각의 크기",
          control: "number",
          section: "수학 조건",
          unit: "°",
          min: 10,
          max: 170
        }
      ],
      defaultParameters,
      promptGuards: [],
      unsupportedParameterPolicy: "clarification-required",
      title: "각 분류",
      scopeNote: "10°에서 170° 사이의 각을 지원합니다.",
      parseParameters: (input: ProblemParameters) => {
        const parsed = problemParametersSchema.parse(input);
        const keys = Object.keys(parsed.values);
        const value = parsed.values.angleDegrees;
        if (
          parsed.familyId !== familyId ||
          keys.length !== 1 ||
          typeof value !== "number" ||
          value < 10 ||
          value > 170
        ) {
          throw new Error("dummy-angle-parameters-unsupported");
        }
        return parsed;
      }
    };
    const dummyBlueprint = {
      ...multiplicationArrayMeaningBlueprint,
      id: familyId,
      contentHash: "a".repeat(64),
      title: "각 분류",
      learningObjective: source.learningGoal,
      curriculumBinding: {
        standardCode: source.standardCode,
        domain: source.domain,
        officialGoal: source.learningGoal
      },
      generator: {
        id: source.generator.id,
        version: source.generator.version,
        parameters: { problemCount: 2, difficulty: "normal" }
      },
      layout: {
        ...multiplicationArrayMeaningBlueprint.layout,
        tokenSet: source.blueprint.layoutTokenSet
      }
    };
    const module: ProblemFamilyNativeModule = {
      source,
      capability: extension,
      runtime: {
        familyId,
        blueprint: dummyBlueprint,
        supportState: "verified",
        prepare: () => {
          throw new Error("dummy-runtime-not-executed");
        },
        generateItemsForVariation: () => [],
        answerKey: () => [],
        appliedProblemParameters: () => defaultParameters
      },
      cognitiveManifest: {
        ...getCognitiveDemandManifest(
          multiplicationArrayMeaningBlueprint.id
        )!,
        blueprintId: familyId,
        blueprintVersion: dummyBlueprint.version,
        blueprintContentHash: dummyBlueprint.contentHash
      },
      variationEnvelope: defineVariationEnvelope({
        schemaVersion: "1.0.0",
        blueprintId: familyId,
        knobs: [],
        pinned: { problemCount: 2, difficulty: "normal" },
        expectedCombinationCount: 1
      })
    };
    const registry = createProblemFamilyRegistry(
      [module.source],
      [module.capability!]
    );
    const runtimeRegistry = createProblemFamilyRuntimeRegistry([], [module]);

    expect(registry.list()).toHaveLength(1);
    expect(registry.get(familyId)?.renderRecipe.kind).toBe(
      "native-render-recipe"
    );
    expect(runtimeRegistry[familyId]?.blueprint.id).toBe(familyId);
    expect(registry.get(familyId)?.capability.parameterFields[0]?.key).toBe(
      "angleDegrees"
    );
    expect(
      registry.findByRoute({
        standardCode: "[4수03-24]",
        manipulation: "angle-sort-card-drag"
      })?.familyId
    ).toBe(familyId);
    expect(
      registry.findByRoute({
        standardCode: "[4수03-25]",
        manipulation: "angle-sort-card-drag"
      })?.familyId
    ).toBe(familyId);
    expect(registry.validateParameters(defaultParameters)).toEqual(
      defaultParameters
    );

    expect(() =>
      createProblemFamilyRuntimeRegistry([], [
        {
          ...module,
          variationEnvelope: defineVariationEnvelope({
            schemaVersion: "1.0.0",
            blueprintId: familyId,
            knobs: [],
            pinned: { problemCount: 3, difficulty: "normal" },
            expectedCombinationCount: 1
          })
        }
      ])
    ).toThrow("problem-family-native-variation-capability-mismatch");

    const wrongTargetSource: ProblemFamilyRegistrySource = {
      ...source,
      assessmentTargetIds: [
        CLASSIFICATION_ASSESSMENT_TARGET_IDS.givenCriterion
      ]
    };
    const wrongTargetRegistry = createProblemFamilyRegistry(
      [wrongTargetSource],
      [extension]
    );
    expect(() =>
      assertProblemFamilyAssessmentTargetBindings(
        wrongTargetRegistry,
        [wrongTargetSource]
      )
    ).toThrow("problem-family-assessment-target-standard-mismatch");
  });
});
