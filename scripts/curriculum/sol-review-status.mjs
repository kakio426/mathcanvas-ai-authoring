import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultBoardPath = resolve(
  root,
  "scripts/curriculum/sol-review-board.json"
);

export function readSolReviewBoard(boardPath = defaultBoardPath) {
  return JSON.parse(readFileSync(boardPath, "utf8"));
}

function latestReview(board, standardCode, operation, expectedScope = null) {
  return [...(board.reviews ?? [])]
    .filter(
      (review) =>
        review.standardCode === standardCode &&
        review.operation === operation &&
        reviewScopeMatches(review, expectedScope)
    )
    .sort((left, right) => right.attempt - left.attempt)[0] ?? null;
}

function normalizedScope(scope) {
  if (!scope) return null;
  const familyTrackId = scope.familyTrackId ?? null;
  const scopeId = scope.scopeId ?? null;
  if (familyTrackId === null && scopeId === null) return null;
  return { familyTrackId, scopeId };
}

export function reviewScopeMatches(review, expectedScope = null) {
  const scope = normalizedScope(expectedScope);
  if (!scope) return true;
  return (
    review.familyTrackId === scope.familyTrackId &&
    review.scopeId === scope.scopeId
  );
}

function defaultGit(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
}

function lines(value) {
  return value.split("\n").filter(Boolean).sort();
}

const sharedTargetAggregationFiles = new Set([
  "packages/curriculum/src/assessment-targets.ts",
  "packages/curriculum/src/assessment-targets.test.ts",
  "packages/curriculum/src/repeating-pattern-assessment-targets.test.ts"
]);

export function reviewImplementationFiles(review) {
  return (review.changedFiles ?? []).filter(
    (file) =>
      !file.startsWith("reports/") &&
      !(
        review.operation === "TARGET_SET" &&
        sharedTargetAggregationFiles.has(file)
      )
  );
}

/**
 * An approved review is only current while its candidate commit is present in
 * the checked-out history and none of the candidate's implementation files
 * were changed afterwards. Generated reports are intentionally ignored here:
 * report regeneration is a derived operation and must not invalidate the
 * family implementation approval by itself.
 */
export function reviewCandidateIsCurrent(review, runGit = defaultGit) {
  if (!review || !/^[a-f0-9]{40}$/.test(review.candidateCommit)) return false;
  try {
    runGit(["cat-file", "-e", `${review.candidateCommit}^{commit}`]);
    runGit(["merge-base", "--is-ancestor", review.candidateCommit, "HEAD"]);
    const candidateFiles = lines(
      runGit([
        "diff-tree",
        "--root",
        "--no-commit-id",
        "--name-only",
        "-r",
        review.candidateCommit
      ])
    );
    const recordedFiles = lines(review.changedFiles?.join("\n") ?? "");
    if (JSON.stringify(candidateFiles) !== JSON.stringify(recordedFiles)) {
      return false;
    }
    const implementationFiles = reviewImplementationFiles({
      ...review,
      changedFiles: recordedFiles
    });
    const afterFiles = new Set(
      lines(runGit(["diff", "--name-only", `${review.candidateCommit}..HEAD`]))
    );
    return implementationFiles.every((file) => !afterFiles.has(file));
  } catch {
    return false;
  }
}

/**
 * Native family lifecycle is not an approval by itself. A native family may
 * be counted as offline/live only after the latest Sol FAMILY_TRACK review for
 * every standard it supports is approved. Legacy adapters retain their frozen
 * release evidence and are not retroactively required to have a Sol record.
 */
export function nativeFamilyReviewStatus(
  manifest,
  board,
  candidateChecker = reviewCandidateIsCurrent
) {
  if (manifest.renderRecipe.kind !== "native-render-recipe") {
    return "legacy";
  }
  const standardCodes = manifest.capability.supportedStandardCodes ?? [];
  if (standardCodes.length === 0) return "pending";
  const reviewScope = manifest.solReviewScope ?? null;
  const decisions = standardCodes.map(
    (standardCode) => {
      const review = latestReview(
        board,
        standardCode,
        "FAMILY_TRACK",
        reviewScope
      );
      if (!review) return "pending";
      if (
        review.decision === "approved" &&
        !candidateChecker(review)
      ) {
        return "stale";
      }
      return review.decision;
    }
  );
  if (decisions.includes("blocked")) return "blocked";
  if (decisions.includes("changes-requested")) return "changes-requested";
  if (decisions.includes("stale")) return "stale";
  if (decisions.every((decision) => decision === "approved")) {
    return "approved";
  }
  return "pending";
}

export function effectiveFamilyLifecycleStage(
  manifest,
  board,
  candidateChecker = reviewCandidateIsCurrent
) {
  const reviewStatus = nativeFamilyReviewStatus(manifest, board, candidateChecker);
  if (reviewStatus !== "legacy" && reviewStatus !== "approved") {
    return "generatable";
  }
  return manifest.releaseEvidence.lifecycleStage;
}

export function effectiveFamilyRecord(
  manifest,
  board,
  candidateChecker = reviewCandidateIsCurrent
) {
  return {
    reviewStatus: nativeFamilyReviewStatus(manifest, board, candidateChecker),
    lifecycleStage: effectiveFamilyLifecycleStage(
      manifest,
      board,
      candidateChecker
    )
  };
}
