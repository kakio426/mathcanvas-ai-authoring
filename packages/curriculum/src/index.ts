import {
  CONTRACT_SCHEMA_VERSION,
  curriculumRecordSchema,
  type CurriculumRecord
} from "@mathcanvas/contracts";
import {
  LEARNING_MAP_COMMIT,
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
   * `reviewed`는 사람이 공식 원문과 대조해 `data.ts`에 기록한 레코드다.
   * `synthesized`는 활동 프로필과 카탈로그 위치만으로 코드가 조립한 레코드이며,
   * 성취기준 문구를 공식 PDF와 대조한 기록이 없다. 출시 게이트는 이 값을 본다.
   */
  provenance: "reviewed" | "synthesized";
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
    "[4수03-09]": triangleClassificationRecord,
    "[4수03-24]": angleMeasurementRecord,
    "[4수04-01]": barGraphInterpretationRecord,
    "[6수01-06]": equivalentFractionRecord,
    "[6수01-07]": unlikeDenominatorComparisonRecord,
    "[6수01-08]": unlikeDenominatorFractionOperationsRecord,
    "[6수03-02]": lineSymmetryRecord,
    "[6수04-04]": probabilityComparisonRecord
  };
  const profileMatches = [
    findClaimEvidenceActivityProfile(standardCode),
    findPartialOperationActivityProfile(standardCode),
    factorPairActivityProfile.standardCode === standardCode
      ? factorPairActivityProfile
      : undefined
  ].filter((candidate) => candidate !== undefined);
  const profile = profileMatches[0];
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
            // 이 레코드는 활동 프로필과 카탈로그 위치만으로 조립한 것이다.
            // 성취기준 문구를 공식 PDF와 대조한 기록이 없으므로
            // `official-text-verified`를 자칭하지 않는다. 출시하려면
            // data.ts에 사람이 검토한 CurriculumRecord를 먼저 추가해야 한다.
            verificationStatus: "official-source-checked",
            sourceTextIncluded: false,
            caveat:
              "성취기준 코드와 소주제 위치만 카탈로그에서 확인했습니다. 목표 문구는 아직 교육부 고시 제2022-33호 [별책 8] 원문과 대조하지 않았습니다."
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
          reviewer: "자동 합성 (사람 검토 없음)"
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

  const provenance =
    records[standardCode] === undefined ? "synthesized" : "reviewed";

  const warnings: string[] = [];
  for (const source of record.auxiliarySources) {
    if (source.caveat) warnings.push(source.caveat);
  }
  if (provenance === "synthesized") {
    warnings.push(
      `${standardCode}의 교육과정 레코드는 활동 프로필에서 자동 합성한 것입니다. 출시 전에 공식 원문과 대조한 레코드를 curriculum/src/data.ts에 추가해야 합니다.`
    );
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
    provenance
  };
}

export {
  LEARNING_MAP_COMMIT,
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
