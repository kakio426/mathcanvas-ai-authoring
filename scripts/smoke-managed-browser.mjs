#!/usr/bin/env node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ManagedChromeRuntime
} from "../packages/managed-browser/dist/index.js";

const profileDirectory = await mkdtemp(
  join(tmpdir(), "mathcanvas-managed-chrome-smoke-")
);
let runtime;
try {
  runtime = new ManagedChromeRuntime({
    userDataDirectory: profileDirectory,
    headless: true
  });
  await runtime.openWorkspace();
  const connection = await runtime.checkConnection({
    forceContractCheck: true,
    bringToFront: false
  });
  if (
    connection.state === "browser-launch-failed" ||
    connection.state === "contract-mismatch"
  ) {
    throw new Error(
      `관리형 Chrome 런타임 연결 실패: ${connection.detailCode ?? connection.state}`
    );
  }
  process.stdout.write(
    `PASS  실제 관리형 Chrome 런타임 → MathCanvas — ${connection.state} (${connection.currentUrl ?? "URL 없음"})\n`
  );
} finally {
  if (runtime) await runtime.close();
  await rm(profileDirectory, { recursive: true, force: true });
}
