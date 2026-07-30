#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const pnpmCommand =
  process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  pnpmCommand,
  ["exec", "vitest", "run", "tests/p0-golden.test.ts"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MATHCANVAS_UPDATE_GOLDEN: "1"
    },
    stdio: "inherit",
    shell: false
  }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
