import { describe, expect, it } from "vitest";
// @ts-ignore Sol review gate is a repository-side ESM utility.
import * as solReviewStatus from "../scripts/curriculum/sol-review-status.mjs";

const {
  effectiveFamilyLifecycleStage,
  nativeFamilyReviewStatus,
  reviewCandidateIsCurrent,
  reviewImplementationFiles,
  reviewScopeMatches
} = solReviewStatus;

const candidateCommit = "a".repeat(40);

function review(overrides: Record<string, unknown> = {}) {
  return {
    reviewId: "W999-FAMILY_TRACK-SOL-A1",
    standardCode: "[2수02-02]",
    operation: "FAMILY_TRACK",
    decision: "approved",
    attempt: 1,
    candidateCommit,
    changedFiles: ["packages/example.ts", "reports/example.json"],
    ...overrides
  };
}

function manifest(scope?: Record<string, string>) {
  return {
    renderRecipe: { kind: "native-render-recipe" },
    capability: { supportedStandardCodes: ["[2수02-02]"] },
    releaseEvidence: { lifecycleStage: "offline-validated" },
    ...(scope ? { solReviewScope: scope } : {})
  };
}

describe("Sol review candidate and scope gates", () => {
  it("invalidates an approval when a candidate implementation file changes afterwards", () => {
    const base = (args: string[]) => {
      if (args[0] === "diff-tree") {
        return "packages/example.ts\nreports/example.json\n";
      }
      if (args[0] === "diff") {
        return "scripts/curriculum/sol-review-board.json\nreports/example.json\n";
      }
      return "";
    };
    expect(reviewCandidateIsCurrent(review(), base)).toBe(true);

    const stale = (args: string[]) =>
      args[0] === "diff"
        ? "packages/example.ts\nreports/example.json\n"
        : base(args);
    expect(reviewCandidateIsCurrent(review(), stale)).toBe(false);
  });

  it("does not invalidate a target review for an unrelated shared target index change", () => {
    expect(
      reviewImplementationFiles({
        operation: "TARGET_SET",
        changedFiles: [
          "packages/curriculum/src/assessment-targets.ts",
          "packages/curriculum/src/assessment-targets/data-table-2su04-02.ts"
        ]
      })
    ).toEqual([
      "packages/curriculum/src/assessment-targets/data-table-2su04-02.ts"
    ]);
  });

  it("requires both familyTrackId and scopeId for a scoped family review", () => {
    const scope = {
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    };
    expect(reviewScopeMatches(review(), scope)).toBe(false);
    expect(
      reviewScopeMatches(review({ ...scope }), scope)
    ).toBe(true);
  });

  it("does not reuse an unscoped approval for a different family track", () => {
    const scope = {
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    };
    const board = { reviews: [review()] };
    const candidateIsCurrent = () => true;
    expect(nativeFamilyReviewStatus(manifest(scope), board, candidateIsCurrent)).toBe(
      "pending"
    );
    expect(
      nativeFamilyReviewStatus(
        manifest(scope),
        { reviews: [review({ ...scope })] },
        candidateIsCurrent
      )
    ).toBe("approved");
  });

  it("downgrades stale approvals so released evidence is not counted", () => {
    const scope = {
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    };
    const board = { reviews: [review({ ...scope })] };
    const stale = () => false;
    expect(nativeFamilyReviewStatus(manifest(scope), board, stale)).toBe("stale");
    expect(effectiveFamilyLifecycleStage(manifest(scope), board, stale)).toBe(
      "generatable"
    );
  });
});
