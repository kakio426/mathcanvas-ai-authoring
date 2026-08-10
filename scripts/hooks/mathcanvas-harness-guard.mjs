#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptDirectory, "..", "..");

const protectedEntrypoints = [
  "scripts/contract-lab/create-eduitit-html30-projects.mjs",
  "scripts/prompt-harness/sync-eduitit-html30-links.mjs",
  "scripts/prompt-harness/sync-eduitit-html30-v2-links.mjs"
];

const writeMethodPattern = /\b(?:POST|PUT|PATCH|DELETE)\b/i;
const projectEndpointPattern = /(?:mathcanvas\.vivasam\.com)?\/api\/project(?:\b|\/)/i;
const html30WriteIntentPattern =
  /(?:html30[^\n;&|]*(?:create|release|publish|sync|link|upload)|(?:create|release|publish|sync|link|upload)[^\n;&|]*html30)/i;
const executableScriptPattern = /(?:^|[\s;&|])(?:node\s+)?["']?(scripts\/[A-Za-z0-9_./-]+\.(?:mjs|js|ts))["']?/g;
const canonicalLiveWritePattern = /^(?:pnpm html30:v2:live:create -- --execute-live --artifact-sha [a-f0-9]{64}|pnpm html30:v2:live:update -- --execute-live --update-existing --artifact-sha [a-f0-9]{64}(?: --sequences (?:[1-9]|[12][0-9]|30)(?:,(?:[1-9]|[12][0-9]|30))*)?|pnpm html30:v2:links:sync -- --execute --attestation-sha [a-f0-9]{64}|node scripts\/contract-lab\/create-eduitit-html30-v2-candidates\.mjs --execute-live --artifact-sha [a-f0-9]{64}|node scripts\/contract-lab\/create-eduitit-html30-v2-candidates\.mjs --execute-live --update-existing --artifact-sha [a-f0-9]{64}(?: --sequences (?:[1-9]|[12][0-9]|30)(?:,(?:[1-9]|[12][0-9]|30))*)?|node scripts\/prompt-harness\/sync-eduitit-html30-v2-links\.mjs --execute --attestation-sha [a-f0-9]{64})$/;

function isInsideRepository(cwd, root) {
  const pathFromRoot = relative(root, resolve(cwd));
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
}

function normalizeCommand(value) {
  return typeof value === "string" ? value.replaceAll("\\", "/") : "";
}

function referencedScripts(command) {
  return [...command.matchAll(executableScriptPattern)].map((match) => match[1]);
}

function scriptContainsHtml30Write(scriptPath, root) {
  const absolutePath = resolve(root, scriptPath);
  if (!isInsideRepository(absolutePath, root) || !existsSync(absolutePath)) return false;
  const source = readFileSync(absolutePath, "utf8");
  const concernsHtml30 = /eduitit-html30|EDUITIT-MC30/i.test(source);
  const writesMathCanvas = projectEndpointPattern.test(source) && writeMethodPattern.test(source);
  const writesLessonBundle =
    /lesson_bundles/.test(source) && /writeFile(?:Sync)?\s*\(/.test(source);
  return concernsHtml30 && (writesMathCanvas || writesLessonBundle);
}

export function evaluateMathCanvasHarnessGuard(input, options = {}) {
  const root = resolve(options.repositoryRoot ?? repositoryRoot);
  const cwd = resolve(input?.cwd ?? root);
  const command = normalizeCommand(input?.tool_input?.command);
  if (!command) {
    return {
      allowed: true,
      code: isInsideRepository(cwd, root) ? "non-command-tool" : "outside-repository"
    };
  }

  if (!isInsideRepository(cwd, root)) {
    const referencesProtectedEntrypoint = protectedEntrypoints.some(
      (entrypoint) =>
        command.includes(entrypoint) ||
        command.includes(normalizeCommand(resolve(root, entrypoint)))
    );
    if (
      referencesProtectedEntrypoint ||
      canonicalLiveWritePattern.test(command.trim()) ||
      (projectEndpointPattern.test(command) && writeMethodPattern.test(command)) ||
      html30WriteIntentPattern.test(command)
    ) {
      return {
        allowed: false,
        code: "outside-repository-protected-write",
        reason:
          "작업 디렉터리를 바꿔 HTML30 하네스를 우회하는 외부 쓰기를 차단했습니다. " +
          "MathCanvas 저장과 수업꾸러미 링크 반영은 저장소 안의 canonical 명령으로만 실행해야 합니다."
      };
    }
    return { allowed: true, code: "outside-repository" };
  }

  if (canonicalLiveWritePattern.test(command.trim())) {
    return {
      allowed: true,
      code: command.includes("links:sync") ||
        command.includes("sync-eduitit-html30-v2-links")
        ? "canonical-html30-v2-link-sync"
        : command.includes("update-existing")
          ? "canonical-html30-v2-live-update"
          : "canonical-html30-v2-live-create"
    };
  }

  const directEntrypoint = protectedEntrypoints.find((entrypoint) =>
    command.includes(entrypoint)
  );
  if (directEntrypoint) {
    return {
      allowed: false,
      code: "protected-entrypoint",
      reason:
        `HTML30 하네스를 우회하는 직접 실행을 차단했습니다: ${directEntrypoint}. ` +
        "새 canonical compiler와 release attestation 경로를 사용해야 합니다."
    };
  }

  if (projectEndpointPattern.test(command) && writeMethodPattern.test(command)) {
    return {
      allowed: false,
      code: "direct-project-write",
      reason:
        "MathCanvas project API 직접 쓰기를 차단했습니다. " +
        "검증된 payload와 release attestation을 소비하는 canonical writer만 사용할 수 있습니다."
    };
  }

  if (html30WriteIntentPattern.test(command)) {
    return {
      allowed: false,
      code: "html30-write-intent",
      reason:
        "HTML30 생성·배포·링크 승격 명령을 차단했습니다. " +
        "offline harness PASS 뒤 canonical release 명령으로만 실행해야 합니다."
    };
  }

  const unsafeScript = referencedScripts(command).find((scriptPath) =>
    scriptContainsHtml30Write(scriptPath, root)
  );
  if (unsafeScript) {
    return {
      allowed: false,
      code: "indirect-html30-writer",
      reason:
        `HTML30 외부 쓰기 기능이 있는 임의 스크립트를 차단했습니다: ${unsafeScript}. ` +
        "canonical writer 경계에 연결하세요."
    };
  }

  return { allowed: true, code: "no-protected-write" };
}

export function codexHookOutput(decision) {
  if (decision.allowed) return {};
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: decision.reason
    }
  };
}

export function assertLegacyHtml30WriterDisabled(entrypoint) {
  throw new Error(
    `eduitit-html30-harness:legacy-writer-disabled:${entrypoint}:` +
      "canonical-release-attestation-required"
  );
}

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

export async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    process.stdout.write(
      `${JSON.stringify(codexHookOutput({
        allowed: false,
        reason: "MathCanvas harness hook 입력을 읽지 못해 안전하게 차단했습니다."
      }))}\n`
    );
    return;
  }
  process.stdout.write(
    `${JSON.stringify(codexHookOutput(evaluateMathCanvasHarnessGuard(input)))}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
