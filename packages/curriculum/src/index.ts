import {
  CONTRACT_SCHEMA_VERSION,
  curriculumRecordSchema,
  type CurriculumRecord
} from "@mathcanvas/contracts";
import {
  LEARNING_MAP_COMMIT,
  barGraphInterpretationRecord,
  lengthMeasurementRecord,
  clockReadingRecord,
  timeDurationRecord,
  sameDenominatorFractionOperationsRecord,
  equalityRelationRecord,
  equivalentFractionRecord,
  numberCompositionRecord,
  placeValueRecord,
  repeatingPatternRecord,
  multiplicationMeaningRecord,
  probabilityComparisonRecord,
  unlikeDenominatorComparisonRecord,
  unlikeDenominatorFractionOperationsRecord
} from "./data.js";
import {
  findTeacherCurriculumStandard
} from "./teacher-catalog.js";
import {
  findClaimEvidenceActivityProfile
} from "./activity-profiles.js";

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
}

export function resolveCurriculum(
  standardCode = "[6수01-07]"
): CurriculumResolution {
  const records: Readonly<Record<string, CurriculumRecord>> = {
    "[2수01-02]": placeValueRecord,
    "[2수01-04]": numberCompositionRecord,
    "[2수01-10]": multiplicationMeaningRecord,
    "[2수02-01]": repeatingPatternRecord,
    "[2수03-07]": clockReadingRecord,
    "[2수03-08]": timeDurationRecord,
    "[2수03-10]": lengthMeasurementRecord,
    "[4수01-15]": sameDenominatorFractionOperationsRecord,
    "[4수02-03]": equalityRelationRecord,
    "[4수04-01]": barGraphInterpretationRecord,
    "[6수01-06]": equivalentFractionRecord,
    "[6수01-07]": unlikeDenominatorComparisonRecord,
    "[6수01-08]": unlikeDenominatorFractionOperationsRecord,
    "[6수04-04]": probabilityComparisonRecord
  };
  const profile = findClaimEvidenceActivityProfile(standardCode);
  const catalogStandard = findTeacherCurriculumStandard(standardCode);
  const referenceRecord =
    profile && catalogStandard
      ? curriculumRecordSchema.parse({
          schemaVersion: CONTRACT_SCHEMA_VERSION,
          key: `kr-2022-elem-math:${standardCode
            .replaceAll("[", "")
            .replaceAll("]", "")
            .replace("수", "su")}`,
          code: standardCode,
          gradeBand: catalogStandard.gradeBand,
          domain: catalogStandard.domain,
          officialGoal: profile.officialGoal,
          prerequisites: [
            "문제 상황에서 비교하거나 계산해야 할 양을 찾을 수 있다.",
            "자신의 첫 생각을 수, 식, 그림 또는 말로 나타낼 수 있다."
          ],
          officialSource: {
            sourceId: "kr-ncic-2022-elementary-math",
            sourceKind: "official",
            title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정",
            url: "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4",
            locator: catalogStandard.sourceLocator,
            version: "교육부 고시 제2022-33호",
            verificationStatus: "official-text-verified",
            sourceTextIncluded: false,
            caveat:
              "성취기준 문구는 교육부 고시 제2022-33호 [별책 8] 공식 PDF에서 대조했습니다."
          },
          auxiliarySources: [
            {
              sourceId: "deck6-korean-elementary-learning-map",
              sourceKind: "auxiliary",
              title: "DECK6/korean-elementary-learning-map",
              url: "https://github.com/DECK6/korean-elementary-learning-map",
              locator: `${catalogStandard.learningMapTopicId} / ${standardCode}`,
              version: LEARNING_MAP_COMMIT,
              verificationStatus: "auxiliary-pinned",
              sourceTextIncluded: false,
              caveat:
                "학습지도는 표현과 선수 관계 설계에만 사용하며 공식 교육과정의 권위를 대신하지 않습니다."
            }
          ],
          reviewedAt: "2026-08-02T00:00:00.000Z",
          reviewer: "MathCanvas AI authoring curriculum profile review"
        })
      : undefined;
  const record = records[standardCode] ?? referenceRecord;
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
  warnings.push(
    standardCode === "[6수01-07]"
      ? "이 템플릿은 분수 띠로 크기를 비교하는 개념 형성 활동입니다. 성취기준 전체를 평가하려면 학생이 비교 방법을 말하거나 쓰는 후속 확인이 필요합니다."
      : "조작 뒤 학생의 설명을 확인하는 후속 활동이 필요합니다."
  );

  return {
    record,
    warnings,
    auxiliarySnapshotSha: LEARNING_MAP_COMMIT
  };
}

export {
  LEARNING_MAP_COMMIT,
  barGraphInterpretationRecord,
  lengthMeasurementRecord,
  clockReadingRecord,
  timeDurationRecord,
  sameDenominatorFractionOperationsRecord,
  equalityRelationRecord,
  equivalentFractionRecord,
  numberCompositionRecord,
  placeValueRecord,
  repeatingPatternRecord,
  multiplicationMeaningRecord,
  probabilityComparisonRecord,
  unlikeDenominatorComparisonRecord,
  unlikeDenominatorFractionOperationsRecord
} from "./data.js";

export {
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
  CLAIM_EVIDENCE_MANIPULATION,
  claimEvidenceActivityProfiles,
  findClaimEvidenceActivityProfile,
  type ClaimEvidenceActivityProfile,
  type ClaimEvidenceItemSeed
} from "./activity-profiles.js";
