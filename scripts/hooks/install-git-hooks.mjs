#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const repositoryCheck = spawnSync("git", ["rev-parse", "--git-dir"], {
  cwd: root,
  stdio: "ignore"
});
if (repositoryCheck.status !== 0) {
  console.log("MathCanvas Git hooks skipped: Git repository not available");
  process.exit(0);
}
const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit"
});
if (result.status !== 0) {
  throw new Error("mathcanvas-git-hooks-install-failed");
}
console.log("MathCanvas Git hooks installed: core.hooksPath=.githooks");
