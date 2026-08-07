#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const inputPath = resolve(
  root,
  process.argv.find((argument) => argument.startsWith("--input="))?.slice(8) ??
    "research/mathcanvas/division-native-candidate-rubric.json"
);
const evidence = JSON.parse(readFileSync(inputPath, "utf8"));
const expectedTools = ["NO01SC", "NO01NR", "NO07IC", "NO04NG"];
const requiredBlockers = [
  "manipulation-state-change",
  "save-reopen-roundtrip"
];

if (
  evidence?.schemaVersion !== "1.0.0" ||
  evidence?.rubricId !== "division-native-candidate-rubric-v1" ||
  evidence?.probeMode !== "static-catalog-plus-headless-auth-check" ||
  !Array.isArray(evidence?.candidates) ||
  evidence.candidates.length !== expectedTools.length ||
  evidence.candidates.some(
    (candidate, index) =>
      candidate?.toolKey !== expectedTools[index] ||
      candidate?.rubricResult !== "unverified-live" ||
      !Array.isArray(candidate?.staticEvidence) ||
      candidate.staticEvidence.length === 0 ||
      !requiredBlockers.every((blocker) =>
        candidate.releaseBlockers?.includes(blocker)
      )
  )
) {
  throw new Error("division-native-rubric-candidate-evidence-invalid");
}

if (evidence.liveProbe?.status === "blocked-auth-required") {
  if (
    evidence.liveProbe.writeCount !== 0 ||
    evidence.liveProbe.userChromeTouched !== false ||
    evidence.decision?.status !== "no-go-until-live-native-probe" ||
    !evidence.decision.safeFallback?.includes("verified")
  ) {
    throw new Error("division-native-rubric-auth-block-is-not-fail-closed");
  }
} else {
  throw new Error("division-native-rubric-live-status-requires-review");
}

process.stdout.write(
  `division-native-rubric PASS: status=${evidence.liveProbe.status} candidates=${evidence.candidates.length}\n`
);
