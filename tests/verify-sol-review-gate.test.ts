import { describe, expect, it } from "vitest";
import {
  candidateImplementationMutationsBeforeReview,
  locateReviewTransaction
// @ts-expect-error Repository-side ESM gate utility has no declaration file.
} from "../scripts/curriculum/verify-sol-review-gate.mjs";

const candidateCommit = "a".repeat(40);
const review = {
  reviewId: "W002-FAMILY_TRACK-repeat-repair-SOL-A3",
  workItemId: "W002",
  standardCode: "[2수02-02]",
  operation: "FAMILY_TRACK",
  decision: "approved",
  candidateCommit,
  changedFiles: [
    "packages/templates/src/problem-families/example.ts",
    "reports/problem-family-registry/latest.json"
  ]
};

function fakeGitWithReview(historicalReview = review) {
  const calls: string[][] = [];
  const runGit = (...args: string[]) => {
    calls.push(args);
    const key = args.join(" ");
    if (args[0] === "rev-list") return "governance-1\nreviewer-1\nlater-1";
    if (key === "show governance-1:scripts/curriculum/sol-review-board.json") {
      return JSON.stringify({ reviews: [] });
    }
    if (key === "show reviewer-1:scripts/curriculum/sol-review-board.json") {
      return JSON.stringify({ reviews: [historicalReview] });
    }
    if (key === "rev-parse reviewer-1^") return "reviewer-parent";
    if (key === `diff --name-only ${candidateCommit}..reviewer-parent`) {
      return "W002_REPLAN.md\nreports/curriculum-execution/no-family-plan.json";
    }
    if (
      key ===
      "diff-tree --root --no-commit-id --name-only -r reviewer-1"
    ) {
      return [
        "scripts/curriculum/sol-review-board.json",
        "reports/problem-family-registry/latest.json",
        "reports/curriculum-execution/no-family-plan.json"
      ].join("\n");
    }
    throw new Error(`unexpected git call: ${key}`);
  };
  return { calls, runGit };
}

describe("Sol review transaction window", () => {
  it("selects only the reviewer transaction after intervening governance", () => {
    const { calls, runGit } = fakeGitWithReview();
    expect(
      locateReviewTransaction({ review, candidateCommit, runGit })
    ).toEqual({
      reviewerCommit: "reviewer-1",
      reviewerParent: "reviewer-parent",
      candidateToReviewerParentFiles: [
        "W002_REPLAN.md",
        "reports/curriculum-execution/no-family-plan.json"
      ],
      reviewerTransactionFiles: [
        "scripts/curriculum/sol-review-board.json",
        "reports/problem-family-registry/latest.json",
        "reports/curriculum-execution/no-family-plan.json"
      ]
    });
    expect(
      calls.some(
        (args) =>
          args[0] === "diff" &&
          args[1] === "--name-only" &&
          args[2] === `${candidateCommit}..HEAD`
      )
    ).toBe(false);
  });

  it("still detects candidate implementation mutation before review", () => {
    expect(
      candidateImplementationMutationsBeforeReview({
        review,
        candidateFiles: review.changedFiles,
        candidateToReviewerParentFiles: [
          "W002_REPLAN.md",
          "packages/templates/src/problem-families/example.ts"
        ]
      })
    ).toEqual(["packages/templates/src/problem-families/example.ts"]);
  });

  it("rejects a review record changed after its reviewer transaction", () => {
    const { runGit } = fakeGitWithReview({
      ...review,
      decision: "changes-requested"
    });
    expect(() =>
      locateReviewTransaction({ review, candidateCommit, runGit })
    ).toThrow(
      "sol-review-gate:review-record-mutated-after-transaction:W002-FAMILY_TRACK-repeat-repair-SOL-A3"
    );
  });
});
