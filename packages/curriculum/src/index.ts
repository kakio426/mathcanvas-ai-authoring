import type { CurriculumRecord } from "@mathcanvas/contracts";
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
  const record = records[standardCode];
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
