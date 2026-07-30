export const ACTIVITY_IDS = {
  fractionComparison:
    "fraction.compare.unlike-denominators.visual-v1",
  equivalentFraction: "fraction.equivalent.same-whole.visual-v1",
  makeTenNumberCards: "number.make-10.cards-v1"
} as const;

export type ActivitySupportState = "verified" | "released";

export const ACTIVITY_SUPPORT: Readonly<
  Record<(typeof ACTIVITY_IDS)[keyof typeof ACTIVITY_IDS], ActivitySupportState>
> = {
  [ACTIVITY_IDS.fractionComparison]: "released",
  [ACTIVITY_IDS.equivalentFraction]: "released",
  [ACTIVITY_IDS.makeTenNumberCards]: "released"
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
    "research/mathcanvas/p3-release-canary.json",
    "research/mathcanvas/wave4-number-card-canary.roundtrip.json",
    "research/mathcanvas/w3-equation-rail-optical.json"
  ]
};

export function getActivitySupportState(
  activityId: string
): ActivitySupportState | undefined {
  return ACTIVITY_SUPPORT[
    activityId as keyof typeof ACTIVITY_SUPPORT
  ];
}
