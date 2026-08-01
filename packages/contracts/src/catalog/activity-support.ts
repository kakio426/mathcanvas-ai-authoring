export const ACTIVITY_IDS = {
  fractionComparison:
    "fraction.compare.unlike-denominators.visual-v1",
  equivalentFraction: "fraction.equivalent.same-whole.visual-v1",
  makeTenNumberCards: "number.make-10.cards-v1",
  balancedEquationCards:
    "relation.equal-sign.balanced-equation.cards-v1",
  balanceScaleSum:
    "relation.equal-sign.balance-scale.sum-card-v1",
  clockHourHandBoundary:
    "measure.time.clock.hour-hand-boundary-v1",
  elapsedTimeClockPair:
    "measure.time.elapsed.clock-pair-v1",
  sameDenominatorFractionSum:
    "fraction.add.same-denominator.strips-v1",
  sameDenominatorImproperSum:
    "fraction.add.same-denominator.improper-sum-v1",
  unlikeDenominatorCommonUnitSum:
    "fraction.add.unlike-denominators.common-unit-v1",
  unlikeDenominatorCommonUnitDifference:
    "fraction.subtract.unlike-denominators.common-unit-v1",
  barGraphScaleUnit:
    "data.bar-graph.scale-unit.read-v1",
  brokenRulerLength:
    "measure.length.unit-iteration.ruler-v1",
  placeValueTenExchange:
    "number.place-value.regroup-ten-bundles-v1",
  repeatingPatternUnit:
    "pattern.repeat-unit.pattern-blocks-v1",
  multiplicationArrayMeaning:
    "number.multiplication.group-array-meaning-v1",
  probabilityBagComparison:
    "probability.compare.bag-ratios-v1"
} as const;

export type ActivitySupportState = "verified" | "released";

export const ACTIVITY_LEARNING_GOALS: Readonly<
  Record<
    (typeof ACTIVITY_IDS)[keyof typeof ACTIVITY_IDS],
    string
  >
> = {
  [ACTIVITY_IDS.fractionComparison]:
    "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다.",
  [ACTIVITY_IDS.equivalentFraction]:
    "같은 전체에서 크기가 같은 분수를 선택하고 분자와 분모의 변화를 설명할 수 있다.",
  [ACTIVITY_IDS.makeTenNumberCards]:
    "여러 수 중에서 합이 10인 두 수를 찾고, 열 칸 모형을 근거로 다른 방법과 비교하여 설명할 수 있다.",
  [ACTIVITY_IDS.balancedEquationCards]:
    "등호를 사용하여 크기가 같은 두 양의 관계를 식으로 나타낼 수 있다.",
  [ACTIVITY_IDS.balanceScaleSum]:
    "등호를 사용하여 크기가 같은 두 양의 관계를 식으로 나타낼 수 있다.",
  [ACTIVITY_IDS.clockHourHandBoundary]:
    "시계를 보고 시각을 ‘몇 시 몇 분’까지 읽을 수 있다.",
  [ACTIVITY_IDS.elapsedTimeClockPair]:
    "1시간과 1분의 관계를 이해하고, 시간을 ‘시간’, ‘분’으로 표현할 수 있다.",
  [ACTIVITY_IDS.sameDenominatorFractionSum]:
    "분모가 같은 분수의 덧셈 원리를 이해하고 계산할 수 있다.",
  [ACTIVITY_IDS.sameDenominatorImproperSum]:
    "분모가 같은 분수의 덧셈 원리를 이해하고 계산할 수 있다.",
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitSum]:
    "분모가 다른 두 진분수를 같은 크기의 단위로 바꾸어 더하고 그 방법을 설명할 수 있다.",
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitDifference]:
    "분모가 다른 두 진분수를 같은 크기의 단위로 바꾸어 빼고 그 방법을 설명할 수 있다.",
  [ACTIVITY_IDS.barGraphScaleUnit]:
    "기준 막대에서 눈금 한 칸의 크기를 정하고 다른 막대가 나타내는 값을 해석할 수 있다.",
  [ACTIVITY_IDS.brokenRulerLength]:
    "길이 단위 1 cm를 알고, 같은 단위를 반복하여 물체의 길이를 측정하고 설명할 수 있다.",
  [ACTIVITY_IDS.placeValueTenExchange]:
    "십 모형 10개가 백 1개와 같은 양임을 100칸 모형으로 확인하고 전체 수의 변화를 자릿값으로 설명할 수 있다.",
  [ACTIVITY_IDS.repeatingPatternUnit]:
    "무늬의 가장 짧은 반복 단위를 찾아 이어 놓고, 같은 규칙이 계속되는 까닭을 설명할 수 있다.",
  [ACTIVITY_IDS.multiplicationArrayMeaning]:
    "같은 수씩 묶인 상황을 곱셈식과 배열로 연결하고, 두 수가 나타내는 뜻을 설명할 수 있다.",
  [ACTIVITY_IDS.probabilityBagComparison]:
    "두 주머니에서 원하는 색이 나올 가능성을 전체 수에 대한 원하는 색의 수로 나타내어 비교하고 설명할 수 있다."
};

export const ACTIVITY_SUPPORT: Readonly<
  Record<(typeof ACTIVITY_IDS)[keyof typeof ACTIVITY_IDS], ActivitySupportState>
> = {
  [ACTIVITY_IDS.fractionComparison]: "released",
  [ACTIVITY_IDS.equivalentFraction]: "released",
  [ACTIVITY_IDS.makeTenNumberCards]: "released",
  [ACTIVITY_IDS.balancedEquationCards]: "released",
  [ACTIVITY_IDS.balanceScaleSum]: "released",
  [ACTIVITY_IDS.clockHourHandBoundary]: "released",
  [ACTIVITY_IDS.elapsedTimeClockPair]: "released",
  [ACTIVITY_IDS.sameDenominatorFractionSum]: "released",
  [ACTIVITY_IDS.sameDenominatorImproperSum]: "released",
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitSum]: "released",
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitDifference]: "released",
  [ACTIVITY_IDS.barGraphScaleUnit]: "released",
  [ACTIVITY_IDS.brokenRulerLength]: "released",
  [ACTIVITY_IDS.placeValueTenExchange]: "released",
  [ACTIVITY_IDS.repeatingPatternUnit]: "released",
  [ACTIVITY_IDS.multiplicationArrayMeaning]: "released",
  [ACTIVITY_IDS.probabilityBagComparison]: "released"
};

export const ACTIVITY_RELEASE_EVIDENCE: Readonly<
  Record<
    (typeof ACTIVITY_IDS)[keyof typeof ACTIVITY_IDS],
    readonly string[]
  >
> = {
  [ACTIVITY_IDS.fractionComparison]: [
    "research/mathcanvas/p3-release-canary.json"
  ],
  [ACTIVITY_IDS.equivalentFraction]: [
    "research/mathcanvas/p3-release-canary.json"
  ],
  [ACTIVITY_IDS.makeTenNumberCards]: [
    "research/mathcanvas/p3-release-canary.json"
  ],
  [ACTIVITY_IDS.balancedEquationCards]: [
    "research/mathcanvas/wave5-equality-release-canary.json"
  ],
  [ACTIVITY_IDS.balanceScaleSum]: [
    "research/mathcanvas/wave5-balance-scale-release-canary.json"
  ],
  [ACTIVITY_IDS.clockHourHandBoundary]: [
    "research/mathcanvas/wave6-clock-release-canary.json"
  ],
  [ACTIVITY_IDS.elapsedTimeClockPair]: [
    "research/mathcanvas/wave7-elapsed-time-release-canary.json"
  ],
  [ACTIVITY_IDS.sameDenominatorFractionSum]: [
    "research/mathcanvas/wave8-fraction-sum-release-canary.json"
  ],
  [ACTIVITY_IDS.sameDenominatorImproperSum]: [
    "research/mathcanvas/wave9-improper-sum-release-canary.json"
  ],
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitSum]: [
    "research/mathcanvas/wave10-common-unit-release-canary.json"
  ],
  [ACTIVITY_IDS.unlikeDenominatorCommonUnitDifference]: [
    "research/mathcanvas/wave11-common-unit-difference-release-canary.json"
  ],
  [ACTIVITY_IDS.barGraphScaleUnit]: [
    "research/mathcanvas/wave12-bar-graph-scale-release-canary.json"
  ],
  [ACTIVITY_IDS.brokenRulerLength]: [
    "research/mathcanvas/wave13-broken-ruler-release-canary.json"
  ],
  [ACTIVITY_IDS.placeValueTenExchange]: [
    "research/mathcanvas/wave14-place-value-release-canary.json"
  ],
  [ACTIVITY_IDS.repeatingPatternUnit]: [
    "research/mathcanvas/wave16-pattern-release-canary.json"
  ],
  [ACTIVITY_IDS.multiplicationArrayMeaning]: [
    "research/mathcanvas/wave17-multiplication-release-canary.json"
  ],
  [ACTIVITY_IDS.probabilityBagComparison]: [
    "research/mathcanvas/wave17-probability-release-canary.json"
  ]
};

export function getActivitySupportState(
  activityId: string
): ActivitySupportState | undefined {
  return ACTIVITY_SUPPORT[
    activityId as keyof typeof ACTIVITY_SUPPORT
  ];
}
