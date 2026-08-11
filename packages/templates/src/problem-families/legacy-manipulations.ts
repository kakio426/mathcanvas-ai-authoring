import { ACTIVITY_IDS } from "@mathcanvas/contracts";

/**
 * Phase 1 strangler adapter 전용 고정표다. 기존 29개 blueprint에는 manipulation이
 * 내장돼 있지 않아 이 표로 한 번 감싼다. 신규 family는 이 파일을 수정하지 않고
 * 자기 영역 index의 manifest에서 manipulation을 선언한다.
 */
export const LEGACY_MANIPULATION_BY_FAMILY: Readonly<
  Record<(typeof ACTIVITY_IDS)[keyof typeof ACTIVITY_IDS], string>
> = {
  [ACTIVITY_IDS.fractionComparison]: "fraction-strip-common-start-drag",
  [ACTIVITY_IDS.equivalentFraction]: "equivalent-fraction-strip-match",
  [ACTIVITY_IDS.makeTenNumberCards]: "number-card-make-ten-drag",
  [ACTIVITY_IDS.balancedEquationCards]: "number-card-balanced-equation-drag",
  [ACTIVITY_IDS.balanceScaleSum]: "balance-scale-sum-card-drag",
  [ACTIVITY_IDS.clockHourHandBoundary]: "clock-hour-hand-boundary-drag",
  [ACTIVITY_IDS.elapsedTimeClockPair]: "elapsed-time-clock-pair-drag",
  [ACTIVITY_IDS.sameDenominatorFractionSum]:
    "same-denominator-fraction-sum-drag",
  [ACTIVITY_IDS.sameDenominatorImproperSum]:
    "same-denominator-improper-sum-drag",
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitSum]:
    "unlike-denominator-common-unit-drag",
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitDifference]:
    "unlike-denominator-common-unit-difference-drag",
  [ACTIVITY_IDS.barGraphScaleUnit]: "bar-graph-scale-unit-drag",
  [ACTIVITY_IDS.barGraphRepresentFromTable]:
    "bar-graph-represent-cells-drag",
  [ACTIVITY_IDS.brokenRulerLength]: "length-unit-iteration-drag",
  [ACTIVITY_IDS.placeValueTenExchange]: "place-value-ten-exchange-drag",
  [ACTIVITY_IDS.repeatingPatternUnit]: "pattern-block-repeat-unit-drag",
  [ACTIVITY_IDS.multiplicationArrayMeaning]:
    "multiplication-array-choice-drag",
  [ACTIVITY_IDS.probabilityBagComparison]:
    "probability-fraction-strip-drag",
  [ACTIVITY_IDS.divisionRemainderClaim]: "claim-evidence-revision-drag",
  [ACTIVITY_IDS.angleMeasureClaim]: "claim-evidence-revision-drag",
  [ACTIVITY_IDS.mixedCalculationClaim]: "claim-evidence-revision-drag",
  [ACTIVITY_IDS.ratioMeaningClaim]: "claim-evidence-revision-drag",
  [ACTIVITY_IDS.pictureGraphKeyClaim]: "claim-evidence-revision-drag",
  [ACTIVITY_IDS.triangleClassificationClaim]:
    "claim-evidence-revision-drag",
  [ACTIVITY_IDS.lineSymmetryClaim]: "claim-evidence-revision-drag",
  [ACTIVITY_IDS.graphPurposeClaim]: "claim-evidence-revision-drag",
  [ACTIVITY_IDS.factorPairArray]: "factor-pair-array-construction-drag",
  [ACTIVITY_IDS.partialProductDecomposition]:
    "partial-operation-expression-construction-drag",
  [ACTIVITY_IDS.partialQuotientDecomposition]:
    "partial-operation-expression-construction-drag"
};
