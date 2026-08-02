#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const minimumTestCount = 133;
const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["exec", "vitest", "list", "--json"],
  {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8"
  }
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  throw new Error("vitest-list-failed");
}

const tests = JSON.parse(result.stdout);
if (!Array.isArray(tests)) {
  throw new Error("vitest-list-invalid");
}
if (tests.length < minimumTestCount) {
  throw new Error(
    `test-budget-drift:${tests.length}:expected-at-least-${minimumTestCount}`
  );
}

process.stdout.write(
  `PASS test floor ${tests.length}/${minimumTestCount}+\n`
);
