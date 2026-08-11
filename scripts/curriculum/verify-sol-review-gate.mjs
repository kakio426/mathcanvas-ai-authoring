import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { reviewImplementationFiles } from "./sol-review-status.mjs";

const root = resolve(new URL("../..", import.meta.url).pathname);
const reportPath = resolve(root, "reports/curriculum-execution/no-family-plan.json");
const boardPath = resolve(root, "scripts/curriculum/sol-review-board.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(code) {
  throw new Error(`sol-review-gate:${code}`);
}

function fileMatches(pattern, file) {
  if (pattern === file) return true;
  if (pattern.endsWith("/**")) {
    return file.startsWith(pattern.slice(0, -2));
  }
  if (!pattern.includes("*")) return false;
  const expression = new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
      .join(".*")}$`
  );
  return expression.test(file);
}

function assertFilesAllowed(files, patterns, code) {
  for (const file of files) {
    if (!patterns.some((pattern) => fileMatches(pattern, file))) {
      fail(`${code}:${file}`);
    }
  }
}

function changedFilesAt(commit) {
  return git("diff-tree", "--root", "--no-commit-id", "--name-only", "-r", commit)
    .split("\n")
    .filter(Boolean);
}

function changedFilesAfter(commit) {
  return git("diff", "--name-only", `${commit}..HEAD`)
    .split("\n")
    .filter(Boolean);
}

const report = readJson(reportPath);
const board = readJson(boardPath);
const workItemId = arg("--work-item");
const operation = arg("--operation");
const candidateCommit = arg("--candidate") ?? git("rev-parse", "HEAD");
const familyTrackId = arg("--family-track-id");
const scopeId = arg("--scope-id");

if (!workItemId || !operation) fail("work-item-and-operation-required");
if (!/^[a-f0-9]{40}$/.test(candidateCommit)) fail("candidate-commit-format");
if (
  operation !== "TARGET_SET" &&
  operation !== "FAMILY_TRACK" &&
  operation !== "SOL_REPLAN" &&
  operation !== "FAMILY_REVALIDATION"
) {
  fail("operation-not-review-gated");
}
if ((familyTrackId && !scopeId) || (!familyTrackId && scopeId)) {
  fail("review-scope-incomplete");
}
if (operation === "FAMILY_TRACK" && !familyTrackId) {
  fail("family-track-review-scope-required");
}
if (operation === "FAMILY_REVALIDATION" && !familyTrackId) {
  fail("family-revalidation-review-scope-required");
}

const workItem = report.workItems.find(
  (item) =>
    item.workItemId === workItemId ||
    item.operationWorkItemId === workItemId ||
    workItemId.startsWith(`${item.workItemId}-`)
);
if (!workItem) fail(`unknown-work-item:${workItemId}`);

const reviews = board.reviews
  .filter(
    (review) =>
      review.standardCode === workItem.standardCode &&
      review.operation === operation &&
      (!["FAMILY_TRACK", "FAMILY_REVALIDATION"].includes(operation) ||
        (review.familyTrackId === familyTrackId &&
          review.scopeId === scopeId))
  )
  .sort((left, right) => right.attempt - left.attempt);
const review = reviews[0];
if (!review) fail(`review-missing:${workItem.standardCode}:${operation}`);
if (review.decision !== "approved") fail(`review-not-approved:${review.decision}`);
if (review.candidateCommit !== candidateCommit) {
  fail(`candidate-mismatch:${review.candidateCommit}:${candidateCommit}`);
}
if (review.reviewer !== "gpt-5.6-sol / max") fail("reviewer-mismatch");
if (operation === "FAMILY_REVALIDATION") {
  if (
    review.familyTrackId !== familyTrackId ||
    review.scopeId !== scopeId ||
    typeof review.artifactPath !== "string" ||
    !/^[a-f0-9]{64}$/.test(review.fingerprintSha256 ?? "")
  ) {
    fail("family-revalidation-evidence-missing");
  }
}
if (
  !review.reviewId ||
  !Number.isInteger(review.attempt) ||
  !review.checkedAt ||
  !Number.isFinite(Date.parse(review.checkedAt)) ||
  !Array.isArray(review.evidenceRefs) ||
  !review.evidenceRefs.length ||
  !Array.isArray(review.findings) ||
  !review.findings.length ||
  !Array.isArray(review.changedFiles) ||
  !review.changedFiles.length
) {
  fail("review-evidence-missing");
}

try {
  git("cat-file", "-e", `${candidateCommit}^{commit}`);
} catch {
  fail("candidate-commit-not-found");
}

try {
  git("merge-base", "--is-ancestor", candidateCommit, "HEAD");
} catch {
  fail("candidate-not-in-current-head");
}

const status = git("status", "--short");
if (status) fail("working-tree-not-clean");
if (git("branch", "--show-current") !== "main") fail("not-on-main");

const candidateFiles = changedFilesAt(candidateCommit).sort();
const reviewFiles = [...review.changedFiles].sort();
if (JSON.stringify(candidateFiles) !== JSON.stringify(reviewFiles)) {
  fail("changed-files-mismatch");
}

const operationPatterns = report.operationPolicy?.allowedFilesByOperation?.[operation];
if (!Array.isArray(operationPatterns) || !operationPatterns.length) {
  fail(`operation-manifest-missing:${operation}`);
}
assertFilesAllowed(candidateFiles, operationPatterns, "candidate-file-not-allowed");

const postApprovalPatterns = [
  ...(report.operationPolicy?.postApprovalFilesByOperation?.[operation] ?? []),
  "scripts/curriculum/sol-review-board.json",
  "reports/**"
];
if (!postApprovalPatterns.length) fail(`post-approval-manifest-missing:${operation}`);
const afterCandidateFiles = changedFilesAfter(candidateCommit);
if (!afterCandidateFiles.length) fail("sol-commit-missing-after-candidate");
assertFilesAllowed(
  afterCandidateFiles,
  postApprovalPatterns,
  "post-approval-file-not-allowed"
);
const implementationFilesAfterCandidate = afterCandidateFiles.filter((file) => {
  if (file === "scripts/curriculum/sol-review-board.json" || file.startsWith("reports/")) {
    return false;
  }
  return reviewImplementationFiles({
    operation,
    changedFiles: [file]
  }).length > 0;
});
if (implementationFilesAfterCandidate.length) {
  fail(
    `candidate-implementation-mutated-after-candidate:${implementationFilesAfterCandidate.join(",")}`
  );
}
if (!afterCandidateFiles.includes("scripts/curriculum/sol-review-board.json")) {
  fail("sol-board-commit-missing");
}
if (!afterCandidateFiles.includes("reports/curriculum-execution/no-family-plan.json")) {
  fail("derived-report-commit-missing");
}

console.log(
  `sol-review gate PASS: ${workItem.workItemId} ${operation} candidate=${candidateCommit} attempt=${review.attempt}; postApproval=${afterCandidateFiles.length} files`
);
