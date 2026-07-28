#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stateDirectory =
  process.env.MATHCANVAS_STATE_DIR ??
  join(homedir(), ".mathcanvas-ai-authoring");
const checks = [];

function add(label, ok, detail) {
  checks.push({ label, ok, detail });
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
add("Node.js 20 이상", nodeMajor >= 20, `현재 ${process.versions.node}`);

for (const [label, path] of [
  ["MCP 서버 빌드", join(projectDirectory, "apps/mcp-server/dist/index.js")],
  [
    "Chrome 확장 프로그램 빌드",
    join(projectDirectory, "apps/chrome-extension/dist/manifest.json")
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
  const secret = (
    await readFile(join(stateDirectory, "pairing-secret"), "utf8")
  ).trim();
  add(
    "로컬 연결 코드",
    /^[a-f0-9]{64}$/.test(secret),
    /^[a-f0-9]{64}$/.test(secret)
      ? "형식 정상(값은 표시하지 않음)"
      : "형식 오류"
  );
} catch {
  add(
    "로컬 연결 코드",
    false,
    "아직 없음: pnpm pairing-code를 한 번 실행하세요."
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
  "\n안내: Codex와 Claude Code가 같은 38471 포트를 사용하므로 한 번에 한 AI 앱만 실행하세요.\n"
);
process.exitCode = checks.some((check) => !check.ok && !check.label.endsWith("CLI"))
  ? 1
  : 0;
