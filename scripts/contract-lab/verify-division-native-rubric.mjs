#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

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
const allowedProbeModes = new Set([
  "static-catalog-plus-headless-auth-check",
  "static-catalog-plus-live-affordance-observation"
]);
const expectedActivityId =
  "number.division.quotient-remainder.claim-evidence-v1";

if (
  evidence?.schemaVersion !== "1.0.0" ||
  evidence?.rubricId !== "division-native-candidate-rubric-v1" ||
  evidence?.activityId !== expectedActivityId ||
  !allowedProbeModes.has(evidence?.probeMode) ||
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
} else if (evidence.liveProbe?.status === "blocked-write-approval-required") {
  if (
    evidence.liveProbe.writeCount !== 0 ||
    evidence.liveProbe.userChromeTouched !== false ||
    evidence.liveProbe.persistedMathematicalStateChange !== false ||
    evidence.liveProbe.saveReopenObserved !== false ||
    !Array.isArray(evidence.liveProbe.evidence) ||
    evidence.liveProbe.evidence.length === 0 ||
    evidence.decision?.status !== "no-go-until-approved-native-canary" ||
    !evidence.decision.safeFallback?.includes("verified")
  ) {
    throw new Error(
      "division-native-rubric-write-approval-block-is-not-fail-closed"
    );
  }
  const linkedObservations = evidence.liveProbe.evidence.map((pathValue) => {
    if (typeof pathValue !== "string" || pathValue.includes("\0")) {
      throw new Error("division-native-rubric-linked-observation-path-invalid");
    }
    const observationPath = resolve(root, pathValue);
    const relation = relative(root, observationPath);
    if (
      relation === "" ||
      relation === ".." ||
      relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
      isAbsolute(relation)
    ) {
      throw new Error("division-native-rubric-linked-observation-path-invalid");
    }
    try {
      return {
        pathValue,
        observation: JSON.parse(readFileSync(observationPath, "utf8"))
      };
    } catch {
      throw new Error("division-native-rubric-linked-observation-unreadable");
    }
  });
  if (
    linkedObservations.length === 0 ||
    linkedObservations.some(({ observation }) => {
      const captures = Array.isArray(observation?.captures)
        ? observation.captures
        : [];
      const hasReferenceCapture = (state, width, height) =>
        captures.some(
          (capture) =>
            capture?.state === state &&
            capture?.viewport?.width === width &&
            capture?.viewport?.height === height &&
            capture.qualityEvidence === false
        );
      return (
        observation?.schemaVersion !== "1.0.0" ||
        observation?.activityId !== evidence.activityId ||
        observation?.environment?.userChromeTouched !== false ||
        observation?.environment?.writeCount !== 0 ||
        observation?.conclusion?.status !==
          "blocked-write-approval-required" ||
        observation?.conclusion?.nativeObjectPlacementConfirmed !== false ||
        observation?.conclusion?.nativeLifecycleVerified !== false ||
        observation?.conclusion?.releaseDecision !==
          "no-go-until-approved-native-canary" ||
        observation?.conclusion?.visualQualityEvidence
          ?.ownedProjectEditor1280 !== "not-qualified" ||
        observation?.conclusion?.visualQualityEvidence
          ?.ownedProjectEditor1440 !== "not-qualified" ||
        observation?.conclusion?.visualQualityEvidence
          ?.nativeSettingsModal1440 !== "affordance-reference" ||
        !hasReferenceCapture("editor-initial-reference-1280", 1280, 800) ||
        !hasReferenceCapture("tool-settings-open-reference-1280", 1280, 800) ||
        !hasReferenceCapture("editor-initial", 1440, 1000) ||
        !hasReferenceCapture("tool-settings-open", 1440, 1000)
      );
    })
  ) {
    throw new Error(
      "division-native-rubric-linked-observation-not-fail-closed"
    );
  }
} else {
  throw new Error("division-native-rubric-live-status-requires-review");
}

process.stdout.write(
  `division-native-rubric PASS: status=${evidence.liveProbe.status} candidates=${evidence.candidates.length}\n`
);
