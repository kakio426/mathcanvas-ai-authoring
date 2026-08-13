import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { semanticSliceIsCurrent } from "./revalidation-semantic-slice.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultBoardPath = resolve(
  root,
  "scripts/curriculum/sol-review-board.json"
);
const revalidationDir = resolve(
  root,
  "reports/curriculum-execution/family-revalidation"
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

function latestUnscopedReview(board, standardCode, operation) {
  return [...(board.reviews ?? [])]
    .filter(
      (review) =>
        review.standardCode === standardCode &&
        review.operation === operation &&
        review.familyTrackId === undefined &&
        review.scopeId === undefined
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

export function validateOperationCursor(
  operationSequence,
  completedOperations,
  nextOperation
) {
  return (
    Array.isArray(operationSequence) &&
    Array.isArray(completedOperations) &&
    completedOperations.length < operationSequence.length &&
    completedOperations.every(
      (operation, index) => operation === operationSequence[index]
    ) &&
    operationSequence[completedOperations.length] === nextOperation
  );
}

export function rewindFamilyTrackForRetry(
  operationSequence,
  completedOperations,
  reviewDecision
) {
  if (
    reviewDecision !== "changes-requested" ||
    !Array.isArray(operationSequence) ||
    !Array.isArray(completedOperations) ||
    !completedOperations.includes("FAMILY_TRACK")
  ) {
    return null;
  }
  const familyTrackIndex = operationSequence.indexOf("FAMILY_TRACK");
  if (familyTrackIndex < 0) return null;
  return {
    completedOperations: operationSequence.slice(0, familyTrackIndex),
    nextOperation: "FAMILY_TRACK"
  };
}

export function familyRevalidationSupersedes(
  revalidationReview,
  familyTrackReview
) {
  return (
    revalidationReview?.operation === "FAMILY_REVALIDATION" &&
    typeof revalidationReview.supersedesFamilyTrackReviewId === "string" &&
    revalidationReview.supersedesFamilyTrackReviewId ===
      (familyTrackReview?.reviewId ?? null)
  );
}

export function replanTriggerReview(
  replanReview,
  latestFamilyRevalidationReview,
  blockedFamilyTrackReview,
  reviews = []
) {
  if (
    latestFamilyRevalidationReview &&
    ["changes-requested", "blocked"].includes(
      latestFamilyRevalidationReview.decision
    )
  ) {
    return latestFamilyRevalidationReview;
  }
  if (replanReview?.supersedesBlockedReviewId) {
    return (
      reviews.find(
        (review) => review.reviewId === replanReview.supersedesBlockedReviewId
      ) ?? null
    );
  }
  return blockedFamilyTrackReview ?? null;
}

/**
 * Once an approved replan has been consumed, its original legacy blocker is
 * historical evidence, not a fresh blocker. Only a new scoped family review
 * or a new family-revalidation decision may send the cursor back through
 * SOL_REPLAN. Before consumption we retain the original trigger so the
 * replan approval can still be validated against supersedesBlockedReviewId.
 */
export function replanTriggerForFlow({
  rawTrigger,
  replanConsumed,
  latestFamilyRevalidationReview = null,
  scopedFamilyTrackReviews = [],
  latestSolReplanRequest = null
}) {
  if (!replanConsumed) {
    if (
      latestSolReplanRequest &&
      latestSolReplanRequest.reviewId !== rawTrigger?.reviewId
    ) {
      return latestSolReplanRequest;
    }
    return rawTrigger ?? latestSolReplanRequest ?? null;
  }
  if (
    latestSolReplanRequest &&
    latestSolReplanRequest.reviewId !== rawTrigger?.reviewId &&
    latestSolReplanRequest.decision === "blocked"
  ) {
    return latestSolReplanRequest;
  }
  if (
    latestFamilyRevalidationReview &&
    latestFamilyRevalidationReview.reviewId !== rawTrigger?.reviewId &&
    ["changes-requested", "blocked"].includes(
      latestFamilyRevalidationReview.decision
    )
  ) {
    return latestFamilyRevalidationReview;
  }
  return (
    scopedFamilyTrackReviews.find(
      (review) =>
        review?.reviewId !== rawTrigger?.reviewId &&
        review?.decision === "blocked"
    ) ?? null
  );
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * A SOL_REPLAN_REQUEST is a blocked-only, scoped preflight record. It does
 * not approve implementation or authorize a push; it gives a later
 * SOL_REPLAN an exact, current failure identity to supersede instead of
 * resurrecting a blocker that an earlier replan already consumed.
 */
export function solReplanRequestArtifactIsCurrent(review) {
  if (
    !review ||
    review.operation !== "SOL_REPLAN_REQUEST" ||
    review.decision !== "blocked" ||
    typeof review.blockerArtifactPath !== "string" ||
    !/^[a-f0-9]{64}$/.test(review.blockerArtifactSha256 ?? "")
  ) {
    return false;
  }
  try {
    const artifactRoot = resolve(
      root,
      "reports/curriculum-execution/subwork-state"
    );
    const artifactPath = resolve(root, review.blockerArtifactPath);
    if (
      !artifactPath.startsWith(`${artifactRoot}/`) ||
      !existsSync(artifactPath) ||
      sha256File(artifactPath) !== review.blockerArtifactSha256
    ) {
      return false;
    }
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    return (
      artifact.schemaVersion === "1.0.0" &&
      artifact.operation === "SOL_REPLAN_REQUEST" &&
      artifact.status === "blocked-needs-sol-replan" &&
      artifact.workItemId === review.workItemId &&
      artifact.operationWorkItemId === review.operationWorkItemId &&
      artifact.standardCode === review.standardCode &&
      artifact.familyTrackId === review.familyTrackId &&
      artifact.scopeId === review.scopeId &&
      artifact.blockedOperation === review.blockedOperation &&
      artifact.blockedContractRevision === review.blockedContractRevision &&
      Array.isArray(artifact.blockerCodes) &&
      artifact.blockerCodes.length > 0 &&
      new Set(artifact.blockerCodes).size === artifact.blockerCodes.length &&
      artifact.blockerCodes.every(
        (code) => typeof code === "string" && code.length > 0
      ) &&
      Array.isArray(artifact.evidenceRefs) &&
      artifact.evidenceRefs.length > 0 &&
      artifact.evidenceRefs.every(
        (evidence) => typeof evidence === "string" && evidence.length > 0
      )
    );
  } catch {
    return false;
  }
}

export function solReplanRequestMatchesCursor(
  review,
  cursor,
  candidateChecker = reviewCandidateIsCurrent
) {
  return (
    review?.operation === "SOL_REPLAN_REQUEST" &&
    review?.decision === "blocked" &&
    review.workItemId === cursor?.workItemId &&
    review.standardCode === cursor?.standardCode &&
    review.operationWorkItemId === cursor?.operationWorkItemId &&
    review.familyTrackId === cursor?.familyTrackId &&
    review.scopeId === cursor?.scopeId &&
    review.blockedOperation === cursor?.nextOperation &&
    review.blockedContractRevision === cursor?.contractRevision &&
    candidateChecker(review) &&
    solReplanRequestArtifactIsCurrent(review)
  );
}

export function latestScopedSolReplanRequest(
  reviews,
  cursor,
  consumedRequestId = null,
  candidateChecker = reviewCandidateIsCurrent
) {
  return (
    [...(reviews ?? [])]
      .filter(
        (review) =>
          review.reviewId !== consumedRequestId &&
          solReplanRequestMatchesCursor(review, cursor, candidateChecker)
      )
      .sort((left, right) => right.attempt - left.attempt)[0] ?? null
  );
}

/**
 * Resolve the first operation in the cursor after the replan trigger has
 * been classified. A consumed replan only blocks on a new hard blocker
 * (scoped FAMILY_TRACK=blocked or a failing FAMILY_REVALIDATION); a scoped
 * FAMILY_TRACK=changes-requested is handled by the normal implementation
 * rewind path and must not create another SOL_REPLAN.
 */
export function resolveFlowOperation({
  flowReplanTrigger,
  replanApproved,
  replanConsumed,
  nextSubWorkOperation = null
}) {
  const blockedBySolReplan =
    flowReplanTrigger !== null && (!replanApproved || replanConsumed);
  if (blockedBySolReplan) return "SOL_REPLAN";
  if (replanApproved && !replanConsumed) return "TARGET_SET";
  if (replanConsumed && nextSubWorkOperation) return nextSubWorkOperation;
  return null;
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

const sharedFamilyAggregationFiles = new Set([
  "packages/templates/src/problem-families/domains/change-relationships/index.ts",
  "packages/templates/src/problem-families/registry.test.ts"
]);

export function reviewImplementationFiles(review) {
  return (review.changedFiles ?? []).filter(
    (file) =>
      !file.startsWith("reports/") &&
      !(
        review.operation === "TARGET_SET" &&
        sharedTargetAggregationFiles.has(file)
      ) &&
      !(
        review.operation === "FAMILY_TRACK" &&
        sharedFamilyAggregationFiles.has(file)
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

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * A revalidation approval is meaningful only while the artifact it reviewed
 * still has the same fingerprint and every file recorded by that artifact is
 * unchanged. This lets the lifecycle consume a scoped FAMILY_REVALIDATION
 * record without tying it to unrelated later standard work.
 */
export function familyRevalidationArtifactIsCurrent(review) {
  if (
    !review ||
    review.operation !== "FAMILY_REVALIDATION" ||
    typeof review.artifactPath !== "string" ||
    !/^[a-f0-9]{64}$/.test(review.fingerprintSha256 ?? "")
  ) {
    return false;
  }
  try {
    const artifactPath = resolve(root, review.artifactPath);
    if (!artifactPath.startsWith(`${root}/`) || !existsSync(artifactPath)) {
      return false;
    }
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    if (
      artifact.operation !== "FAMILY_REVALIDATION" ||
      artifact.workItemId !== review.workItemId ||
      artifact.standardCode !== review.standardCode ||
      artifact.familyTrackId !== review.familyTrackId ||
      artifact.scopeId !== review.scopeId ||
      artifact.fingerprintSha256 !== review.fingerprintSha256
    ) {
      return false;
    }
    if (
      typeof review.replanContractRevision === "string" &&
      artifact.replanContractRevision !== review.replanContractRevision
    ) {
      return false;
    }
    const { fingerprintSha256, ...fingerprintPayload } = artifact;
    if (sha256Json(fingerprintPayload) !== fingerprintSha256) return false;
    if (
      !Array.isArray(artifact.semanticSlices) ||
      !artifact.semanticSlices.every((slice) =>
        semanticSliceIsCurrent(root, slice)
      )
    ) {
      return false;
    }
    return Object.entries(artifact.implementationFiles ?? {}).every(
      ([relativePath, expectedHash]) => {
        const implementationPath = resolve(root, relativePath);
        if (
          !implementationPath.startsWith(`${root}/`) ||
          !existsSync(implementationPath)
        ) {
          return false;
        }
        return (
          createHash("sha256")
            .update(readFileSync(implementationPath))
            .digest("hex") === expectedHash
        );
      }
    );
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
      const scopedReview = latestReview(
        board,
        standardCode,
        "FAMILY_TRACK",
        reviewScope
      );
      const legacyReview = reviewScope
        ? latestUnscopedReview(board, standardCode, "FAMILY_TRACK")
        : null;
      const revalidation = latestReview(
        board,
        standardCode,
        "FAMILY_REVALIDATION",
        reviewScope
      );
      if (!scopedReview) {
        if (
          legacyReview?.decision === "approved" &&
          !candidateChecker(legacyReview) &&
          revalidation?.decision === "approved" &&
          familyRevalidationSupersedes(revalidation, legacyReview) &&
          candidateChecker(revalidation) &&
          familyRevalidationArtifactIsCurrent(revalidation)
        ) {
          return "approved";
        }
        return "pending";
      }
      const review = scopedReview;
      if (
        review.decision === "approved" &&
        !candidateChecker(review)
      ) {
        if (
          revalidation?.decision === "approved" &&
          familyRevalidationSupersedes(revalidation, review) &&
          candidateChecker(revalidation) &&
          familyRevalidationArtifactIsCurrent(revalidation)
        ) {
          return "approved";
        }
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
