#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const minimumTestCount = 133;
const maximumTestCount = 140;
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
if (
  tests.length < minimumTestCount ||
  tests.length > maximumTestCount
) {
  throw new Error(
    `test-budget-drift:${tests.length}:expected-${minimumTestCount}-${maximumTestCount}`
  );
}

process.stdout.write(
  `PASS test budget ${tests.length}/${minimumTestCount}-${maximumTestCount}\n`
);
