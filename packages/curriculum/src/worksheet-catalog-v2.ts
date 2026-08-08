import {
  defineWorksheetCatalogEntry,
  worksheetCoverageReportSchema,
  type WorksheetCatalogEntry,
  type WorksheetCoverageReport
} from "@mathcanvas/contracts";
import {
  findTeacherTextbookUnit,
  teacherTextbookUnits
} from "./teacher-catalog.js";
import {
  grade3PilotEntries,
  grade3PilotSourceManifest
} from "./pilot-ledger.js";
import { findNativeAffordanceFamily } from "./native-affordance-catalog-v2.js";

function authoritySource(source: {
  sourceId: string;
  url: string;
  version: string;
  contentSha256: string;
  locator: string;
  verificationStatus:
    | "official-text-verified"
    | "official-source-checked"
    | "auxiliary-pinned"
    | "unverified";
}) {
  return {
    sourceId: source.sourceId,
    url: source.url,
    version: source.version,
    contentSha256: source.contentSha256,
    locator: source.locator,
    verificationStatus: source.verificationStatus
  };
}

function family(
  id: string,
  version: string,
  rationale: string
) {
  return { id, version, rationale };
}

export const grade3PilotWorksheetCatalog: readonly WorksheetCatalogEntry[] =
  grade3PilotEntries.map((entry) => {
    const unit = findTeacherTextbookUnit(entry.unit.unitId);
    if (!unit) {
      throw new Error(`worksheet-catalog-unit-missing:${entry.unit.unitId}`);
    }
    const crossBand = entry.crossBandReview
      ? {
          standardCode: entry.crossBandReview.standardCode,
          teacherLabel: entry.crossBandReview.teacherLabel,
          unitId: entry.crossBandReview.unit.unitId,
          grade: entry.crossBandReview.unit.grade,
          semester: entry.crossBandReview.unit.semester,
          source: authoritySource(entry.crossBandReview.unit.source)
        }
      : undefined;
    const nativeFamily = findNativeAffordanceFamily(
      entry.nativeAffordance.affordanceFamilyId
    );
    if (!nativeFamily) {
      throw new Error(
        `worksheet-catalog-native-family-missing:${entry.nativeAffordance.affordanceFamilyId}`
      );
    }
    return defineWorksheetCatalogEntry({
      catalogEntryId: `grade3-basic-practice-${entry.sourceId}`,
      sourceId: entry.sourceId,
      title: entry.title,
      selection: {
        grade: entry.grade,
        semester: entry.semester,
        unitId: entry.unit.unitId,
        standardCode: entry.standard.code,
        learningType: entry.learningType
      },
      domain: entry.domain,
      learningGoal: entry.standard.officialGoal,
      authorityBinding: {
        standard: {
          code: entry.standard.code,
          gradeBand: entry.standard.gradeBand,
          domain: entry.standard.domain,
          officialGoal: entry.standard.officialGoal,
          source: authoritySource(entry.standard.source)
        },
        unit: {
          unitId: entry.unit.unitId,
          grade: entry.unit.grade,
          semester: entry.unit.semester,
          unitNumber: entry.unit.unitNumber,
          title: entry.unit.title,
          source: authoritySource(entry.unit.source)
        },
        prerequisiteStandardCodes: entry.prerequisiteStandardCodes,
        ...(crossBand ? { crossBandReview: crossBand } : {})
      },
      blueprintFamily: family(
        entry.blueprintFamily.id,
        entry.blueprintFamily.version,
        entry.blueprintFamily.rationale
      ),
      variationPreset: family(
        entry.variationPreset.id,
        entry.variationPreset.version,
        entry.variationPreset.rationale
      ),
      affordanceFamily: {
        family: family(
          entry.nativeAffordance.affordanceFamilyId,
          entry.nativeAffordance.version,
          entry.nativeAffordance.requiredOperation
        ),
        candidateToolKeys: nativeFamily.candidateToolKeys,
        supportState: nativeFamily.supportState,
        evidenceIds: nativeFamily.evidenceRefs.map((reference) => reference.id)
      },
      layoutFamily: family(
        entry.layoutFamily.id,
        entry.layoutFamily.version,
        entry.layoutFamily.rationale
      ),
      phaseSequence: entry.screenSequence,
      modifierPolicy: {
        problemCount: { min: 1, max: 2, default: 1 },
        allowedDifficulties: ["normal"],
        contextMaxChars: 500
      },
      availability: "blocked",
      teacherVisible: false,
      blockingReasons: [
        "R3 native affordance와 R4 one-screen layout 계약이 아직 완료되지 않아 release-candidate로 승격하지 않습니다.",
        "R5–R8 실제 lifecycle·승인·시각 canary 전에는 public teacher UI에 노출하지 않습니다."
      ],
      pilotCoverageEligible: true,
      curriculumCoverageEligible: entry.crossBandReview === undefined,
      learningMapTopicId: entry.learningMap.topicId,
      pptLocator: entry.pptLocator
    });
  });

export function findWorksheetCatalogEntry(
  catalogEntryId: string
): WorksheetCatalogEntry | undefined {
  return grade3PilotWorksheetCatalog.find(
    (entry) => entry.catalogEntryId === catalogEntryId
  );
}

function counts(
  entries: readonly WorksheetCatalogEntry[]
): Pick<
  WorksheetCoverageReport,
  "totalEntries" | "releasedEntries" | "candidateEntries" | "blockedEntries" | "unsupportedEntries"
> {
  return entries.reduce(
    (result, entry) => {
      result.totalEntries += 1;
      if (entry.availability === "released") result.releasedEntries += 1;
      if (entry.availability === "release-candidate") {
        result.candidateEntries += 1;
      }
      if (entry.availability === "blocked") result.blockedEntries += 1;
      if (entry.availability === "unsupported") {
        result.unsupportedEntries += 1;
      }
      return result;
    },
    {
      totalEntries: 0,
      releasedEntries: 0,
      candidateEntries: 0,
      blockedEntries: 0,
      unsupportedEntries: 0
    }
  );
}

export function getGrade3PilotWorksheetCoverage(): WorksheetCoverageReport {
  const summary = counts(grade3PilotWorksheetCatalog);
  return worksheetCoverageReportSchema.parse({
    coverageKind: "pilot",
    status: "available",
    numerator: summary.releasedEntries,
    denominator: summary.totalEntries,
    ...summary,
    note: "pilotCoverage는 30개 콘텐츠 중 실제 released entry만 분자로 계산합니다. 현재 pilot catalog는 R3/R4 gate 전이라 blocked 상태입니다."
  });
}

export function getElementaryCurriculumCoverage(): WorksheetCoverageReport {
  const summary = counts(grade3PilotWorksheetCatalog);
  return worksheetCoverageReportSchema.parse({
    coverageKind: "curriculum",
    status: "unavailable",
    numerator: null,
    denominator: null,
    ...summary,
    note: "초등 1–6학년 전체 공식 성취기준 분모가 아직 완전하게 검증되지 않았으므로 curriculumCoverage 수치를 추정하지 않습니다."
  });
}

export function getWorksheetCatalogAuthoritySnapshot(): {
  standardSourceId: string;
  unitSourceIds: readonly string[];
  crossBandUnitSourceIds: readonly string[];
  textbookUnitCount: number;
} {
  return {
    standardSourceId: grade3PilotSourceManifest.standardAuthority.sourceId,
    unitSourceIds: grade3PilotSourceManifest.unitAuthorities.map(
      (source) => source.sourceId
    ),
    crossBandUnitSourceIds: grade3PilotSourceManifest.crossBandUnitAuthorities.map(
      (source) => source.sourceId
    ),
    textbookUnitCount: teacherTextbookUnits.length
  };
}
