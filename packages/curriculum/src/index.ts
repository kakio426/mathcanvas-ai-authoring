import type { CurriculumRecord } from "@mathcanvas/contracts";
import {
  LEARNING_MAP_COMMIT,
  unlikeDenominatorComparisonRecord
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
  if (standardCode !== "[6수01-07]") {
    throw new CurriculumResolutionError(
      "unsupported-standard",
      `첫 버전에서 검증된 성취기준은 [6수01-07]뿐입니다: ${standardCode}`
    );
  }
  const record = unlikeDenominatorComparisonRecord;
  if (
    record.officialSource.sourceKind !== "official" ||
    record.officialSource.verificationStatus !== "official-text-verified"
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
    "이 템플릿은 분수 띠로 크기를 비교하는 개념 형성 활동입니다. 성취기준 전체를 평가하려면 학생이 비교 방법을 말하거나 쓰는 후속 확인이 필요합니다."
  );

  return {
    record,
    warnings,
    auxiliarySnapshotSha: LEARNING_MAP_COMMIT
  };
}

export {
  LEARNING_MAP_COMMIT,
  unlikeDenominatorComparisonRecord
} from "./data.js";
