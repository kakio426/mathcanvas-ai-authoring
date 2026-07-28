#!/usr/bin/env node
import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];

function add(label, ok, detail) {
  checks.push({ label, ok, detail });
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
add("Node.js 20 이상", nodeMajor >= 20, `현재 ${process.versions.node}`);

for (const [label, path] of [
  ["MCP 서버 빌드", join(projectDirectory, "apps/mcp-server/dist/index.js")],
  [
    "관리형 브라우저 런타임 빌드",
    join(projectDirectory, "packages/managed-browser/dist/index.js")
  ]
]) {
  try {
    await access(path);
    add(label, true, path);
  } catch {
    add(label, false, `없음: ${path}`);
  }
}

try {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true
  });
  const version = browser.version();
  await browser.close();
  add("Google Chrome 실행", true, version);
} catch {
  add(
    "Google Chrome 실행",
    false,
    "Chrome이 설치되지 않았거나 현재 Playwright에서 실행할 수 없습니다."
  );
}

for (const command of ["codex", "claude"]) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  add(
    `${command} CLI`,
    result.status === 0,
    result.status === 0
      ? (result.stdout || result.stderr).trim().split("\n")[0]
      : "설치되지 않았거나 PATH에서 찾지 못함"
  );
}

for (const check of checks) {
  process.stdout.write(
    `${check.ok ? "PASS" : "FAIL"}  ${check.label} — ${check.detail}\n`
  );
}
process.stdout.write(
  "\n안내: 확장 프로그램과 연결 코드는 사용하지 않습니다. Codex와 Claude Code는 한 번에 하나만 실행하세요.\n"
);
process.exitCode = checks.some(
  (check) => !check.ok && !check.label.endsWith("CLI")
)
  ? 1
  : 0;
