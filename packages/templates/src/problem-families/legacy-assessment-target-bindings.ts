import { ACTIVITY_IDS } from "@mathcanvas/contracts";
import { REPEATING_PATTERN_ASSESSMENT_TARGET_IDS } from "@mathcanvas/curriculum";

type LegacyFamilyId =
  (typeof ACTIVITY_IDS)[keyof typeof ACTIVITY_IDS];

/**
 * Phase 2에서 reviewed target 파이프라인으로 이관한 legacy family만 기록한다.
 * 신규 native family는 자기 영역 모듈 source에 target ID를 직접 선언한다.
 */
export const LEGACY_ASSESSMENT_TARGET_IDS_BY_FAMILY: Readonly<
  Partial<Record<LegacyFamilyId, readonly string[]>>
> = Object.freeze({
  [ACTIVITY_IDS.repeatingPatternUnit]: Object.freeze([
    REPEATING_PATTERN_ASSESSMENT_TARGET_IDS.identifyRule,
    REPEATING_PATTERN_ASSESSMENT_TARGET_IDS.expressRuleMultipleWays
  ])
});

export function getLegacyAssessmentTargetIds(
  familyId: string
): readonly string[] {
  return (
    LEGACY_ASSESSMENT_TARGET_IDS_BY_FAMILY[
      familyId as LegacyFamilyId
    ] ?? []
  );
}
