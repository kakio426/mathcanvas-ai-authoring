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
  if (
    record.auxiliarySources.some((source) =>
      source.caveat?.includes("분수의 덧셈과 뺄셈")
    )
  ) {
    warnings.push(
      "보조 학습 맵의 상위 단원명은 공식 성취기준 문구가 아니므로 추천 목표에는 공식 문구를 사용했습니다."
    );
  }

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
