import {
  teacherCurriculumCatalog,
  teacherTextbookUnits
} from "@mathcanvas/curriculum";
import {
  listProblemFamilyManifests
} from "@mathcanvas/templates";
import type {
  ProblemFamilyManifest,
  TeacherIntentKind
} from "@mathcanvas/contracts";
import type { CurriculumCatalogResponse } from "../shared/contract.js";

function projectProblemParameterCapability(family: ProblemFamilyManifest) {
  const capability = family.capability;
  if (!capability.defaultParameters || capability.parameterFields.length === 0) {
    return {};
  }
  return {
    problemParameterCapability: {
      familyId: family.familyId,
      title: capability.title,
      scopeNote: capability.scopeNote,
      defaultParameters: capability.defaultParameters,
      fields: capability.parameterFields.map((field) => ({
        ...field,
        ...(field.options
          ? { options: field.options.map((option) => ({ ...option })) }
          : {})
      }))
    },
    ...(capability.legacyTeacherIntentKind
      ? {
          teacherIntentCapability:
            capability.legacyTeacherIntentKind as TeacherIntentKind
        }
      : {})
  };
}

export function buildCurriculumCatalogResponse(
  manifests: readonly ProblemFamilyManifest[] = listProblemFamilyManifests()
): CurriculumCatalogResponse {
  const nativeFamilies = manifests.filter(
    (family) => family.renderRecipe.kind === "native-render-recipe"
  );
  return {
    units: teacherTextbookUnits.map((unit) => ({
      id: unit.id,
      curriculumVersion: unit.curriculumVersion,
      publisher: unit.publisher,
      grade: unit.grade,
      semester: unit.semester,
      unitNumber: unit.unitNumber,
      title: unit.title,
      sourceUrl: unit.sourceUrl,
      standardCodes: [...unit.standardCodes],
      activityIds: [
        ...new Set([
          ...unit.activityIds,
          ...nativeFamilies
            .filter((family) =>
              family.capability.supportedStandardCodes.some((standardCode) =>
                unit.standardCodes.includes(standardCode)
              )
            )
            .map((family) => family.familyId)
        ])
      ]
    })),
    standards: teacherCurriculumCatalog.map((standard) => ({
      standardCode: standard.standardCode,
      gradeBand: standard.gradeBand,
      domain: standard.domain,
      focusLabel: standard.focusLabel,
      standardSummary: standard.standardSummary,
      summaryKind: standard.summaryKind,
      activities: [
        ...standard.activities.map((activity) => {
          const family = manifests.find(
            (candidate) =>
              candidate.manipulation === activity.manipulation &&
              candidate.capability.supportedStandardCodes.includes(
                standard.standardCode
              )
          );
          if (!family) {
            throw new Error(
              `teacher-catalog-problem-family-missing:${standard.standardCode}:${activity.manipulation}`
            );
          }
          return {
            id: activity.id,
            familyId: family.familyId,
            label: activity.label,
            description: activity.description,
            manipulation: activity.manipulation,
            defaultProblemCount: activity.defaultProblemCount,
            availableProblemCounts: [...activity.availableProblemCounts],
            availability: activity.availability,
            ...projectProblemParameterCapability(family),
            learningNeeds: activity.learningNeeds.map((need) => ({
              id: need.id,
              label: need.label,
              description: need.description
            }))
          };
        }),
        ...nativeFamilies
          .filter((family) =>
            family.capability.supportedStandardCodes.includes(
              standard.standardCode
            )
          )
          .map((family) => ({
            id: family.familyId,
            familyId: family.familyId,
            label: family.capability.title,
            description: family.capability.scopeNote,
            manipulation: family.manipulation,
            defaultProblemCount: family.capability.defaultProblemCount,
            availableProblemCounts: [
              ...family.capability.availableProblemCounts
            ],
            availability: family.releaseEvidence.supportState,
            ...projectProblemParameterCapability(family),
            learningNeeds: [
              {
                id: `${family.familyId}.core`,
                label: "핵심 개념을 확인하기",
                description: family.learningGoal
              }
            ]
          }))
      ]
    }))
  };
}
