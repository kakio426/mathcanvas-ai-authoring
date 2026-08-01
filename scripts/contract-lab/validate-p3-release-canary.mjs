#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  defaultResearchRoot
} from "./lib/paths.mjs";

export const P3_CANARY_STATES = [
  "pass",
  "auth-required",
  "probe-unavailable",
  "palette-changed",
  "contract-mismatch",
  "delivery-failed"
];
const P3_BLUEPRINT_IDS = new Set([
  "fraction.compare.unlike-denominators.visual-v1",
  "fraction.equivalent.same-whole.visual-v1",
  "number.make-10.cards-v1"
]);

export function classifyP3CanaryResult(result) {
  if (result?.ok === true) return "pass";
  const code = String(result?.errorCode ?? "");
  if (code === "auth-required" || code === "login-required") {
    return "auth-required";
  }
  if (code === "contract-probe-unavailable") {
    return "probe-unavailable";
  }
  if (code === "palette-changed") return "palette-changed";
  if (
    code === "contract-mismatch" ||
    code === "payload-hash-mismatch"
  ) {
    return "contract-mismatch";
  }
  return "delivery-failed";
}

export function validateP3ReleaseCanaryEvidence(evidence) {
  if (
    evidence?.schemaVersion !== "1.0.0" ||
    evidence?.probeId !== "p3-release-canary-v1" ||
    typeof evidence?.observedAt !== "string" ||
    Number.isNaN(Date.parse(evidence.observedAt)) ||
    !Array.isArray(evidence?.results) ||
    evidence.results.length !== 3
  ) {
    throw new Error("p3-canary-evidence-shape-invalid");
  }
  const ids = new Set();
  for (const result of evidence.results) {
    if (
      typeof result?.blueprintId !== "string" ||
      !P3_BLUEPRINT_IDS.has(result.blueprintId) ||
      ids.has(result.blueprintId) ||
      !/^[a-f0-9]{64}$/.test(
        result?.blueprintContentHash ?? ""
      ) ||
      !/^[a-f0-9]{64}$/.test(
        result?.layoutPresetContentHash ?? ""
      ) ||
      !P3_CANARY_STATES.includes(result.status) ||
      !/^[a-f0-9]{64}$/.test(result?.payloadHash ?? "") ||
      result?.existingProjectWriteCount !== 0 ||
      result?.createRequestCount > 1
    ) {
      throw new Error("p3-canary-result-invalid");
    }
    if (
      result.status === "pass" &&
      (!/^[a-f0-9]{64}$/.test(
        result?.projectReferenceHash ?? ""
      ) ||
        result?.editorPath !==
          "/ko/view/<redacted-project>" ||
        result?.createRequestCount !== 1)
    ) {
      throw new Error("p3-canary-pass-evidence-incomplete");
    }
    ids.add(result.blueprintId);
  }
  if (ids.size !== P3_BLUEPRINT_IDS.size) {
    throw new Error("p3-canary-blueprint-set-invalid");
  }
  const passCount = evidence.results.filter(
    (result) => result.status === "pass"
  ).length;
  if (
    evidence.summary?.passCount !== passCount ||
    evidence.summary?.overallStatus !==
      (passCount === 3 ? "pass" : "blocked")
  ) {
    throw new Error("p3-canary-summary-invalid");
  }
  return evidence;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  try {
    const options = parseArguments(process.argv.slice(2), {
      input: {
        type: "string",
        default: join(
          defaultResearchRoot,
          "p3-release-canary.json"
        )
      }
    });
    const evidence = validateP3ReleaseCanaryEvidence(
      JSON.parse(readFileSync(options.input, "utf8"))
    );
    process.stdout.write(
      `PASS P3 release canary ${evidence.summary.passCount}/3\n`
    );
  } catch (error) {
    failCli(error);
  }
}
