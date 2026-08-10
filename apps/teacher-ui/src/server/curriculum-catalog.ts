import {
  teacherCurriculumCatalog,
  teacherTextbookUnits
} from "@mathcanvas/curriculum";
import { findTeacherIntentCapabilityForRoute } from "@mathcanvas/contracts";
import type { CurriculumCatalogResponse } from "../shared/contract.js";

export function buildCurriculumCatalogResponse(): CurriculumCatalogResponse {
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
      activityIds: [...unit.activityIds]
    })),
    standards: teacherCurriculumCatalog.map((standard) => ({
      standardCode: standard.standardCode,
      gradeBand: standard.gradeBand,
      domain: standard.domain,
      focusLabel: standard.focusLabel,
      standardSummary: standard.standardSummary,
      summaryKind: standard.summaryKind,
      activities: standard.activities.map((activity) => {
        const capability = findTeacherIntentCapabilityForRoute({
          manipulation: activity.manipulation,
          standardCode: standard.standardCode
        });
        return {
          id: activity.id,
          label: activity.label,
          description: activity.description,
          defaultProblemCount: activity.defaultProblemCount,
          availableProblemCounts: [...activity.availableProblemCounts],
          availability: activity.availability,
          ...(capability
            ? { teacherIntentCapability: capability.kind }
            : {}),
          learningNeeds: activity.learningNeeds.map((need) => ({
            id: need.id,
            label: need.label,
            description: need.description
          }))
        };
      })
    }))
  };
}
