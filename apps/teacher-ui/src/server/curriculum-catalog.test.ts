import { describe, expect, it } from "vitest";
import {
  PROBLEM_FAMILY_SCHEMA_VERSION,
  TEACHER_INTENT_CAPABILITIES,
  problemFamilyManifestSchema
} from "@mathcanvas/contracts";
import { listProblemFamilyManifests } from "@mathcanvas/templates";
import { buildCurriculumCatalogResponse } from "./curriculum-catalog.js";

describe("교사용 교육과정 catalog의 TeacherIntent 노출", () => {
  it("registry의 세 capability만 정확한 성취기준·조작 경로에 표시한다", () => {
    const catalog = buildCurriculumCatalogResponse();
    const exposed = catalog.standards.flatMap((standard) =>
      standard.activities.flatMap((activity) =>
        activity.teacherIntentCapability
          ? [
              {
                kind: activity.teacherIntentCapability,
                standardCode: standard.standardCode
              }
            ]
          : []
      )
    );
    expect(exposed).toHaveLength(TEACHER_INTENT_CAPABILITIES.length);
    expect(exposed.map(({ kind }) => kind).sort()).toEqual(
      TEACHER_INTENT_CAPABILITIES.map(({ kind }) => kind).sort()
    );
    for (const capability of TEACHER_INTENT_CAPABILITIES) {
      expect(exposed).toContainEqual({
        kind: capability.kind,
        standardCode: capability.standardCode
      });
    }
  });

  it("공통 ProblemFamily capability의 필드와 기본값을 서버 registry에서 투영한다", () => {
    const catalog = buildCurriculumCatalogResponse();
    const exposed = catalog.standards.flatMap((standard) =>
      standard.activities.flatMap((activity) =>
        activity.problemParameterCapability
          ? [activity.problemParameterCapability]
          : []
      )
    );
    const expected = listProblemFamilyManifests().filter(
      (manifest) =>
        manifest.capability.defaultParameters !== undefined &&
        manifest.capability.parameterFields.length > 0
    );
    expect(exposed).toHaveLength(expected.length);
    for (const manifest of expected) {
      expect(exposed).toContainEqual({
        familyId: manifest.familyId,
        title: manifest.capability.title,
        scopeNote: manifest.capability.scopeNote,
        defaultParameters: manifest.capability.defaultParameters,
        fields: manifest.capability.parameterFields
      });
    }
  });

  it("native fourth family는 영역 manifest만으로 단원·활동·generic form에 나타난다", () => {
    const baseline = listProblemFamilyManifests()[0]!;
    const familyId = "geometry.angle.sort-v1";
    const dummy = problemFamilyManifestSchema.parse({
      ...baseline,
      familyId,
      activityId: familyId,
      templateId: familyId,
      domain: "도형과 측정",
      learningGoal: "각을 회전한 양에 따라 분류한다.",
      manipulation: "angle-sort-card-drag",
      capability: {
        ...baseline.capability,
        supportedStandardCodes: ["[4수03-24]"],
        gradeBand: "3-4",
        recommendedGrade: 4,
        gradeRange: [3, 4],
        availableProblemCounts: [2, 4],
        defaultProblemCount: 2,
        supportedDifficulties: ["normal"],
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
        defaultParameters: {
          schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
          familyId,
          values: { angleDegrees: 90 }
        },
        legacyTeacherIntentKind: undefined,
        title: "각 분류",
        scopeNote: "10°에서 170° 사이의 각을 지원합니다."
      },
      renderRecipe: {
        kind: "native-render-recipe",
        recipeId: familyId,
        recipeVersion: "1.0.0",
        rendererId: familyId,
        layoutTokenSet: "angle-sort-v1"
      },
      releaseEvidence: {
        ...baseline.releaseEvidence,
        supportState: "verified",
        lifecycleStage: "offline-validated",
        evidencePaths: []
      }
    });
    const catalog = buildCurriculumCatalogResponse([
      ...listProblemFamilyManifests(),
      dummy
    ]);
    const activity = catalog.standards
      .find((standard) => standard.standardCode === "[4수03-24]")
      ?.activities.find((candidate) => candidate.familyId === familyId);

    expect(activity).toMatchObject({
      id: familyId,
      familyId,
      manipulation: "angle-sort-card-drag",
      availability: "verified",
      defaultProblemCount: 2,
      problemParameterCapability: {
        familyId,
        defaultParameters: { values: { angleDegrees: 90 } }
      }
    });
    expect(
      catalog.units
        .filter((unit) => unit.standardCodes.includes("[4수03-24]"))
        .every((unit) => unit.activityIds.includes(familyId))
    ).toBe(true);
  });
});
