export interface ActivityReleaseCanaryEvidence {
  readonly blueprintId: string;
  readonly status: "pass";
  readonly blueprintContentHash: string;
  readonly layoutPresetContentHash: string;
  readonly releaseQualified?: boolean;
  readonly [key: string]: unknown;
}

export declare function validateActivityReleaseCanaryEvidence(
  evidence: unknown
): ActivityReleaseCanaryEvidence;
