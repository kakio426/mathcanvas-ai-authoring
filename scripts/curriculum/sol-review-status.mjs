import { readFileSync } from "node:fs";
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

function latestReview(board, standardCode, operation) {
  return [...(board.reviews ?? [])]
    .filter(
      (review) =>
        review.standardCode === standardCode && review.operation === operation
    )
    .sort((left, right) => right.attempt - left.attempt)[0] ?? null;
}

/**
 * Native family lifecycle is not an approval by itself. A native family may
 * be counted as offline/live only after the latest Sol FAMILY_TRACK review for
 * every standard it supports is approved. Legacy adapters retain their frozen
 * release evidence and are not retroactively required to have a Sol record.
 */
export function nativeFamilyReviewStatus(manifest, board) {
  if (manifest.renderRecipe.kind !== "native-render-recipe") {
    return "legacy";
  }
  const standardCodes = manifest.capability.supportedStandardCodes ?? [];
  if (standardCodes.length === 0) return "pending";
  const decisions = standardCodes.map(
    (standardCode) =>
      latestReview(board, standardCode, "FAMILY_TRACK")?.decision ?? "pending"
  );
  if (decisions.includes("blocked")) return "blocked";
  if (decisions.includes("changes-requested")) return "changes-requested";
  if (decisions.every((decision) => decision === "approved")) {
    return "approved";
  }
  return "pending";
}

export function effectiveFamilyLifecycleStage(manifest, board) {
  const reviewStatus = nativeFamilyReviewStatus(manifest, board);
  if (reviewStatus !== "legacy" && reviewStatus !== "approved") {
    return "generatable";
  }
  return manifest.releaseEvidence.lifecycleStage;
}

export function effectiveFamilyRecord(manifest, board) {
  return {
    reviewStatus: nativeFamilyReviewStatus(manifest, board),
    lifecycleStage: effectiveFamilyLifecycleStage(manifest, board)
  };
}
