#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const zeroSha = /^0{40}$/u;

const learnerSurfacePrefixes = [
  "apps/",
  "config/",
  "fixtures/",
  "packages/contracts/src/",
  "packages/curriculum/src/",
  "packages/mathcanvas-compiler/src/",
  "packages/planner/src/",
  "packages/templates/src/",
  "packages/validator/src/",
  "scripts/curriculum/",
  "scripts/pedagogy/",
  "scripts/quality-audit/"
];
const harnessPrefixes = [
  ".codex/",
  ".githooks/",
  "reports/portfolio-scale/",
  "scripts/hooks/",
  "scripts/portfolio-scale/",
  "tests/"
];
const harnessFiles = new Set(["AGENTS.md", "package.json", "pnpm-lock.yaml"]);

const normalizePath = (value) => value.replaceAll("\\", "/").replace(/^\.\//u, "");

export function classifyMathCanvasChanges(files) {
  const normalized = [...new Set(files.map(normalizePath).filter(Boolean))].sort();
  const learnerFacing = normalized.filter((file) =>
    learnerSurfacePrefixes.some((prefix) => file.startsWith(prefix))
  );
  const harness = normalized.filter(
    (file) =>
      harnessFiles.has(file) || harnessPrefixes.some((prefix) => file.startsWith(prefix))
  );
  return {
    files: normalized,
    learnerFacing,
    harness,
    requiresStaticLearningHarness: learnerFacing.length > 0,
    requiresFullCheck: learnerFacing.length > 0 || harness.length > 0,
    requiresLiveAttestation: learnerFacing.length > 0
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env
  });
  if (result.status !== 0) {
    const suffix = options.capture
      ? `\n${result.stdout ?? ""}${result.stderr ?? ""}`
      : "";
    throw new Error(
      `mathcanvas-git-hook-command-failed:${command} ${args.join(" ")}${suffix}`
    );
  }
  return options.capture ? result.stdout.trim() : "";
}

function gitLines(args) {
  const output = run("git", args, { capture: true });
  return output ? output.split(/\r?\n/u).filter(Boolean) : [];
}

function stagedFiles() {
  return gitLines(["diff", "--cached", "--name-only", "--diff-filter=ACMRD"]);
}

function pushFiles(input) {
  const files = new Set();
  const lines = input.trim().split(/\r?\n/u).filter(Boolean);
  for (const line of lines) {
    const [localRef, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/u);
    if (!localRef || !localSha || zeroSha.test(localSha)) continue;
    let baseSha = remoteSha;
    if (!baseSha || zeroSha.test(baseSha)) {
      const mergeBase = spawnSync(
        "git",
        ["merge-base", localSha, "refs/remotes/origin/main"],
        { cwd: repositoryRoot, encoding: "utf8" }
      );
      baseSha = mergeBase.status === 0 ? mergeBase.stdout.trim() : `${localSha}^`;
    }
    for (const file of gitLines([
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      `${baseSha}..${localSha}`
    ])) {
      files.add(file);
    }
    if (remoteRef === "refs/heads/main" && localRef !== "refs/heads/main") {
      throw new Error("mathcanvas-main-push-must-use-local-main");
    }
  }
  if (files.size === 0 && lines.length === 0) {
    for (const file of gitLines([
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      "refs/remotes/origin/main..HEAD"
    ])) {
      files.add(file);
    }
  }
  return [...files];
}

function assertNoStagedUnstagedOverlap(files) {
  const unstaged = new Set(gitLines(["diff", "--name-only"]));
  const overlaps = files.filter((file) => unstaged.has(file));
  if (overlaps.length > 0) {
    throw new Error(
      `mathcanvas-staged-file-also-has-unstaged-changes:${overlaps.join(",")}`
    );
  }
}

function runFocusedHarnessTests() {
  run("pnpm", [
    "exec",
    "vitest",
    "run",
    "tests/html30-harness-hook.test.ts",
    "tests/mathcanvas-learning-harness.test.ts"
  ]);
}

export function commandsForMathCanvasHook(mode, classification) {
  if (mode === "pre-commit") {
    return {
      focusedHarnessTests: classification.requiresFullCheck,
      staticLearningHarness: classification.requiresStaticLearningHarness,
      fullCheck: false,
      liveAttestation: false
    };
  }
  if (mode === "pre-push") {
    return {
      focusedHarnessTests: classification.requiresFullCheck,
      staticLearningHarness: false,
      fullCheck: classification.requiresFullCheck,
      liveAttestation: classification.requiresLiveAttestation
    };
  }
  throw new Error(`mathcanvas-git-hook-mode-invalid:${mode}`);
}

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

async function main() {
  const mode = process.argv[2];
  const files = mode === "pre-commit" ? stagedFiles() : pushFiles(await readStdin());
  const classification = classifyMathCanvasChanges(files);
  const commands = commandsForMathCanvasHook(mode, classification);

  if (files.length === 0) {
    console.log(`MathCanvas ${mode}: 변경 파일 없음`);
    return;
  }
  console.log(
    `MathCanvas ${mode}: ${files.length} files, learner=${classification.learnerFacing.length}, ` +
      `harness=${classification.harness.length}`
  );

  if (mode === "pre-commit") {
    run("git", ["diff", "--cached", "--check"]);
    assertNoStagedUnstagedOverlap(classification.learnerFacing);
  }
  if (commands.focusedHarnessTests) runFocusedHarnessTests();
  if (commands.staticLearningHarness) {
    run("pnpm", ["portfolio:verify"]);
    run("pnpm", ["cognitive:verify"]);
    run("pnpm", ["typecheck"]);
  }
  if (commands.fullCheck) run("pnpm", ["check"]);
  if (commands.liveAttestation) run("pnpm", ["portfolio:live:verify"]);

  console.log(`MathCanvas ${mode}: PASS`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
