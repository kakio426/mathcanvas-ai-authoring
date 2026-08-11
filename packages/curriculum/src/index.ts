import {
  CONTRACT_SCHEMA_VERSION,
  curriculumRecordSchema,
  type CurriculumRecord
} from "@mathcanvas/contracts";
import {
  LEARNING_MAP_COMMIT,
  grade3PilotOfficialRecords,
  angleMeasurementRecord,
  barGraphInterpretationRecord,
  lengthMeasurementRecord,
  lineSymmetryRecord,
  clockReadingRecord,
  timeDurationRecord,
  triangleClassificationRecord,
  sameDenominatorFractionOperationsRecord,
  equalityRelationRecord,
  equivalentFractionRecord,
  numberCompositionRecord,
  placeValueRecord,
  repeatingPatternRecord,
  multiplicationMeaningRecord,
  oneDigitDivisorDivisionRecord,
  probabilityComparisonRecord,
  unlikeDenominatorComparisonRecord,
  unlikeDenominatorFractionOperationsRecord
} from "./data.js";
import { findOfficialElementaryStandard } from "./official-elementary-standards.js";
import {
  findClaimEvidenceActivityProfile
} from "./activity-profiles.js";
import { factorPairActivityProfile } from "./factor-pair-profile.js";
import {
  findPartialOperationActivityProfile
} from "./partial-operation-profile.js";

export class CurriculumResolutionError extends Error {
  public constructor(
    public readonly code:
      | "unsupported-standard"
      | "official-source-missing"
      | "official-auxiliary-mismatch",
    message: string
  ) {
    super(message);
    this.name = "CurriculumResolutionError";
  }
}

export interface CurriculumResolution {
  record: CurriculumRecord;
  warnings: string[];
  auxiliarySnapshotSha: typeof LEARNING_MAP_COMMIT;
  /**
   * 모든 반환 레코드는 공식 HWP와 PDF를 교차 확인한 fixture에 존재한다.
   * 활동별로 더 자세한 선수학습을 가진 `data.ts` 레코드가 있으면 그 레코드를
   * 우선하고, 없으면 같은 공식 fixture에서 완전한 기본 레코드를 만든다.
   */
  provenance: "reviewed";
}

function officialFixtureRecord(
  standardCode: string
): CurriculumRecord | undefined {
  const standard = findOfficialElementaryStandard(standardCode);
  if (!standard) return undefined;

  return curriculumRecordSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    key: `kr-2022-elem-math:${standard.code
      .replaceAll("[", "")
      .replaceAll("]", "")
      .replace("수", "su")}`,
    code: standard.code,
    gradeBand: standard.gradeBand,
    domain: standard.domain,
    officialGoal: standard.officialGoal,
    prerequisites: [],
    officialSource: {
      sourceId: "kr-moe-2022-33-annex-8-elementary-math",
      sourceKind: "official",
      title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
      url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
      locator: standard.sourceLocator,
      version: "교육부 고시 제2022-33호",
      verificationStatus: "official-text-verified",
      sourceTextIncluded: false,
      caveat:
        "저장소에는 교육과정 원문 전체를 재배포하지 않습니다. 성취기준 코드와 목표 문구는 교육부 HWP와 NCIC PDF를 교차 확인한 fixture입니다."
    },
    auxiliarySources: [
      {
        sourceId: "deck6-korean-elementary-learning-map",
        sourceKind: "auxiliary",
        title: "DECK6/korean-elementary-learning-map",
        url: "https://github.com/DECK6/korean-elementary-learning-map",
        locator: `${standard.code} / curriculum position and prerequisite design only`,
        version: LEARNING_MAP_COMMIT,
        verificationStatus: "auxiliary-pinned",
        sourceTextIncluded: false,
        caveat:
          "학습지도는 표현과 선수 관계 설계에만 사용하며 공식 교육과정의 권위를 대신하지 않습니다."
      }
    ],
    reviewedAt: standard.reviewedAt,
    reviewer: standard.reviewer
  });
}

export function resolveCurriculum(
  standardCode = "[6수01-07]"
): CurriculumResolution {
  const grade3PilotRecords = Object.fromEntries(
    grade3PilotOfficialRecords.map((record) => [record.code, record])
  );
  const records: Readonly<Record<string, CurriculumRecord>> = {
    "[2수01-02]": placeValueRecord,
    "[2수01-04]": numberCompositionRecord,
    "[2수01-10]": multiplicationMeaningRecord,
    "[4수01-06]": oneDigitDivisorDivisionRecord,
    "[2수02-01]": repeatingPatternRecord,
    "[2수03-07]": clockReadingRecord,
    "[2수03-08]": timeDurationRecord,
    "[2수03-10]": lengthMeasurementRecord,
    "[4수01-15]": sameDenominatorFractionOperationsRecord,
    "[4수02-03]": equalityRelationRecord,
    "[4수03-09]": triangleClassificationRecord,
    "[4수03-24]": angleMeasurementRecord,
    "[4수04-01]": barGraphInterpretationRecord,
    "[6수01-06]": equivalentFractionRecord,
    "[6수01-07]": unlikeDenominatorComparisonRecord,
    "[6수01-08]": unlikeDenominatorFractionOperationsRecord,
    "[6수03-02]": lineSymmetryRecord,
    "[6수04-04]": probabilityComparisonRecord,
    ...grade3PilotRecords
  };
  const profileMatches = [
    findClaimEvidenceActivityProfile(standardCode),
    findPartialOperationActivityProfile(standardCode),
    factorPairActivityProfile.standardCode === standardCode
      ? factorPairActivityProfile
      : undefined
  ].filter((candidate) => candidate !== undefined);
  const record = records[standardCode] ?? officialFixtureRecord(standardCode);
  if (!record) {
    throw new CurriculumResolutionError(
      "unsupported-standard",
      `검증되지 않은 성취기준입니다: ${standardCode}`
    );
  }
  if (
    record.officialSource.sourceKind !== "official" ||
    (record.officialSource.verificationStatus !==
      "official-text-verified" &&
      record.officialSource.verificationStatus !==
        "official-source-checked")
  ) {
    throw new CurriculumResolutionError(
      "official-source-missing",
      "공식 원문으로 검증된 교육과정 출처가 없습니다."
    );
  }

  const warnings: string[] = [];
  for (const source of record.auxiliarySources) {
    if (source.caveat) warnings.push(source.caveat);
  }
  if (profileMatches.length > 1) {
    warnings.push(
      `${standardCode}에 활동 프로필이 ${profileMatches.length}개 연결되어 있어 첫 번째(${profileMatches[0]?.activityId})만 사용합니다. 성취기준 배정을 분리해야 합니다.`
    );
  }
  warnings.push(
    standardCode === "[6수01-07]"
      ? "이 템플릿은 분수 띠로 크기를 비교하는 개념 형성 활동입니다. 성취기준 전체를 평가하려면 학생이 비교 방법을 말하거나 쓰는 후속 확인이 필요합니다."
      : "조작 뒤 학생의 설명을 확인하는 후속 활동이 필요합니다."
  );

  return {
    record,
    warnings,
    auxiliarySnapshotSha: LEARNING_MAP_COMMIT,
    provenance: "reviewed"
  };
}

export {
  LEARNING_MAP_COMMIT,
  grade3PilotOfficialRecords,
  angleMeasurementRecord,
  barGraphInterpretationRecord,
  lengthMeasurementRecord,
  lineSymmetryRecord,
  clockReadingRecord,
  timeDurationRecord,
  triangleClassificationRecord,
  sameDenominatorFractionOperationsRecord,
  equalityRelationRecord,
  equivalentFractionRecord,
  numberCompositionRecord,
  placeValueRecord,
  repeatingPatternRecord,
  multiplicationMeaningRecord,
  oneDigitDivisorDivisionRecord,
  probabilityComparisonRecord,
  unlikeDenominatorComparisonRecord,
  unlikeDenominatorFractionOperationsRecord
} from "./data.js";

export {
  UNVERIFIED_LOCATOR_PREFIX,
  findTeacherCurriculumStandard,
  findTeacherTextbookUnit,
  teacherCurriculumCatalog,
  teacherTextbookUnits,
  type TeacherActivityOption,
  type TeacherCurriculumStandard,
  type TeacherLearningNeed,
  type TeacherTextbookUnit
} from "./teacher-catalog.js";
export {
  OFFICIAL_ELEMENTARY_STANDARD_COUNT,
  findOfficialElementaryStandard,
  officialElementaryStandards,
  officialElementaryStandardsFixture
} from "./official-elementary-standards.js";
export {
  CLASSIFICATION_ASSESSMENT_TARGET_IDS,
  REPEATING_PATTERN_ASSESSMENT_TARGET_IDS,
  assessmentTargetSets,
  assessmentTargets,
  findAssessmentTarget,
  findAssessmentTargetSet
} from "./assessment-targets.js";
export {
  CLAIM_EVIDENCE_MANIPULATION,
  claimEvidenceActivityProfiles,
  findClaimEvidenceActivityProfile,
  type ClaimEvidenceActivityProfile,
  type ClaimEvidenceItemSeed
} from "./activity-profiles.js";
export {
  FACTOR_PAIR_MANIPULATION,
  factorPairActivityProfile,
  type FactorPairActivityProfile,
  type FactorPairItemSeed
} from "./factor-pair-profile.js";
export {
  PARTIAL_OPERATION_MANIPULATION,
  findPartialOperationActivityProfile,
  partialOperationActivityProfiles,
  type PartialOperationActivityProfile,
  type PartialOperationCardSeed,
  type PartialOperationItemSeed
} from "./partial-operation-profile.js";

export {
  findGrade3PilotEntry,
  getGrade3PilotCoverage,
  grade3PilotEntries,
  grade3PilotLedger,
  grade3PilotSourceManifest,
  grade3PilotStandardCodes
} from "./pilot-ledger.js";
export {
  findWorksheetCatalogEntry,
  getElementaryCurriculumCoverage,
  getGrade3PilotWorksheetCoverage,
  getWorksheetCatalogAuthoritySnapshot,
  grade3PilotWorksheetCatalog
} from "./worksheet-catalog-v2.js";
export {
  findNativeAffordanceFamily,
  grade3PilotNativeAffordanceFamilyCatalog
} from "./native-affordance-catalog-v2.js";
export {
  findNativeAffordanceCandidateRubric,
  grade3PilotNativeAffordanceCandidateRubricCatalog
} from "./native-affordance-rubric-v2.js";
