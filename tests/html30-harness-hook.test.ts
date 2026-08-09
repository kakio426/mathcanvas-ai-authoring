import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertLegacyHtml30WriterDisabled,
  codexHookOutput,
  evaluateMathCanvasHarnessGuard
} from "../scripts/hooks/mathcanvas-harness-guard.mjs";

const root = resolve(import.meta.dirname, "..");

function evaluate(command: string, cwd = root) {
  return evaluateMathCanvasHarnessGuard(
    {
      cwd,
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command }
    },
    { repositoryRoot: root }
  );
}

describe("Eduitit HTML30 Codex harness hook", () => {
  it("offline harness verification and focused tests remain available", () => {
    expect(evaluate("pnpm prompt-harness:eduitit-html30:verify")).toEqual({
      allowed: true,
      code: "no-protected-write"
    });
    expect(
      evaluate("pnpm vitest run tests/eduitit-html30-prompt-harness.test.ts")
    ).toEqual({ allowed: true, code: "no-protected-write" });
  });

  it("allows only the exact canonical V2 live create or existing-project update command", () => {
    const sha = "a".repeat(64);
    expect(
      evaluate(
        `pnpm html30:v2:live:create -- --execute-live --artifact-sha ${sha}`
      )
    ).toEqual({
      allowed: true,
      code: "canonical-html30-v2-live-create"
    });
    expect(
      evaluate(
        `pnpm html30:v2:live:update -- --execute-live --update-existing --artifact-sha ${sha}`
      )
    ).toEqual({
      allowed: true,
      code: "canonical-html30-v2-live-update"
    });
    expect(
      evaluate(
        `pnpm html30:v2:live:update -- --execute-live --update-existing --artifact-sha ${sha} --sequences 1,30`
      )
    ).toEqual({
      allowed: true,
      code: "canonical-html30-v2-live-update"
    });
    expect(
      evaluate(
        `pnpm html30:v2:live:create -- --execute-live --artifact-sha ${sha}; curl -X POST https://mathcanvas.vivasam.com/api/project`
      ).allowed
    ).toBe(false);
    expect(
      evaluate(
        `pnpm html30:v2:live:create -- --execute-live --artifact-sha ${sha} --sequences 1`
      ).allowed
    ).toBe(false);
  });

  it("allows only the attestation-bound canonical lesson-bundle link sync", () => {
    const sha = "b".repeat(64);
    expect(
      evaluate(
        `pnpm html30:v2:links:sync -- --execute --attestation-sha ${sha}`
      )
    ).toEqual({
      allowed: true,
      code: "canonical-html30-v2-link-sync"
    });
    expect(
      evaluate(
        `pnpm html30:v2:links:sync -- --execute --attestation-sha ${sha}; echo bypass`
      ).allowed
    ).toBe(false);
    expect(
      evaluate("node scripts/prompt-harness/sync-eduitit-html30-v2-links.mjs")
        .allowed
    ).toBe(false);
  });

  it.each([
    [
      "node scripts/contract-lab/create-eduitit-html30-projects.mjs",
      "protected-entrypoint"
    ],
    [
      "node scripts/prompt-harness/sync-eduitit-html30-links.mjs",
      "protected-entrypoint"
    ],
    [
      "curl -X PUT https://mathcanvas.vivasam.com/api/project/example",
      "direct-project-write"
    ],
    ["pnpm html30:release", "html30-write-intent"]
  ])("blocks an unverified external write: %s", (command, code) => {
    const decision = evaluate(command);
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe(code);
    expect(codexHookOutput(decision)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny"
      }
    });
  });

  it("does not govern commands from another repository", () => {
    expect(
      evaluate(
        "curl -X PUT https://mathcanvas.vivasam.com/api/project/example",
        resolve(root, "..")
      )
    ).toEqual({ allowed: true, code: "outside-repository" });
  });

  it("keeps the legacy writer entrypoints fail-closed even without Codex hooks", () => {
    expect(() =>
      assertLegacyHtml30WriterDisabled("create-eduitit-html30-projects")
    ).toThrow(
      "eduitit-html30-harness:legacy-writer-disabled:create-eduitit-html30-projects"
    );
  });
});
