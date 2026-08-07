import { describe, expect, it } from "vitest";
import {
  canPromoteNativeSpatialGate,
  evaluateNativeSpatialRatchet,
  nativeSpatialGateStateSchema,
  type NativeSpatialGateState,
  type NativeSpatialIssue
} from "./native-spatial-gates.js";

const state: NativeSpatialGateState = {
  schemaVersion: "1.0.0",
  mode: "ratchet",
  hardGateIds: [],
  baselineIssues: [
    {
      activityId: "released.activity",
      gateId: "visual.native-flow-fit",
      fingerprint: "old",
      detail: "known debt"
    }
  ],
  waivers: [],
  currentIssues: [],
  changedActivityIds: [],
  stableGreenRuns: 0,
  falsePositiveSamples: 0
};

const issue = (fingerprint: string): NativeSpatialIssue => ({
  activityId: "changed.activity",
  gateId: "visual.native-flow-fit",
  fingerprint,
  detail: "new native flow issue"
});

describe("native spatial ratchet", () => {
  it("keeps old baseline debt report-only but blocks a changed-scope regression", () => {
    const result = evaluateNativeSpatialRatchet({
      state,
      changedActivityIds: ["changed.activity"],
      issues: [
        {
          activityId: "released.activity",
          gateId: "visual.native-flow-fit",
          fingerprint: "old",
          detail: "known debt"
        },
        issue("new")
      ],
      now: "2026-08-08T00:00:00.000Z"
    });
    expect(result.baselineIssues).toHaveLength(1);
    expect(result.blockingIssues).toEqual([issue("new")]);
  });

  it("promotes only after coverage, three green runs, no issues, and no false positives", () => {
    expect(nativeSpatialGateStateSchema.parse(state)).toEqual(state);
    expect(
      canPromoteNativeSpatialGate(state, {
        releasedActivityCount: 3,
        executedActivityCount: 3,
        unwaivedIssueCount: 0,
        stableGreenRuns: 3,
        falsePositiveSamples: 0
      })
    ).toBe(true);
    expect(
      canPromoteNativeSpatialGate(state, {
        releasedActivityCount: 3,
        executedActivityCount: 2,
        unwaivedIssueCount: 0,
        stableGreenRuns: 3,
        falsePositiveSamples: 0
      })
    ).toBe(false);
  });

  it("blocks a changed-scope issue when its waiver has expired", () => {
    const result = evaluateNativeSpatialRatchet({
      state: {
        ...state,
        waivers: [
          {
            activityId: "changed.activity",
            gateId: "visual.native-flow-fit",
            owner: "owner",
            reason: "temporary probe waiver",
            expiresAt: "2026-08-07T00:00:00.000Z"
          }
        ]
      },
      changedActivityIds: ["changed.activity"],
      issues: [issue("expired-waiver")],
      now: "2026-08-08T00:00:00.000Z"
    });
    expect(result.blockingIssues).toEqual([issue("expired-waiver")]);
    expect(result.waivedIssues).toHaveLength(0);
  });
});
