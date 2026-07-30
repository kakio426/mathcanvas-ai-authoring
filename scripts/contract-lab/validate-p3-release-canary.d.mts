export declare const P3_CANARY_STATES: readonly string[];
export declare function classifyP3CanaryResult(
  result: { ok?: boolean; errorCode?: string }
): string;
export declare function validateP3ReleaseCanaryEvidence(
  evidence: unknown
): {
  summary: {
    passCount: number;
    overallStatus: "pass" | "blocked";
  };
};
