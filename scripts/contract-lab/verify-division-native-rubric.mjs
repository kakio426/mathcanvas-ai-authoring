#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const inputPath = resolve(
  root,
  process.argv.find((argument) => argument.startsWith("--input="))?.slice(8) ??
    "research/mathcanvas/division-native-candidate-rubric.json"
);
const rubric = JSON.parse(readFileSync(inputPath, "utf8"));
const expectedActivityId =
  "number.division.quotient-remainder.claim-evidence-v1";
const expectedCandidates = [
  ["NO01SC", "conditional-primary-candidate"],
  ["NO01NR", "secondary-representation-not-equal-group-core"],
  ["NO07IC", "rejected-semantic-mismatch"],
  ["NO04NG", "secondary-checking-representation-not-group-core"]
];
const expectedDecision =
  "conditional-go-no01sc-grouping-persistent-lifecycle-required";

function safeRepositoryPath(pathValue) {
  if (
    typeof pathValue !== "string" ||
    pathValue.length === 0 ||
    pathValue.includes("\0")
  ) {
    return null;
  }
  const absolutePath = resolve(root, pathValue);
  const relation = relative(root, absolutePath);
  if (
    relation === "" ||
    relation === ".." ||
    relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(relation)
  ) {
    return null;
  }
  return absolutePath;
}

if (
  rubric?.schemaVersion !== "1.0.0" ||
  rubric?.rubricId !== "division-native-candidate-rubric-v1" ||
  rubric?.activityId !== expectedActivityId ||
  rubric?.probeMode !== "static-catalog-plus-live-isolated-semantic-probe" ||
  rubric?.decision?.status !== expectedDecision ||
  rubric?.decision?.primaryCandidate !== "NO01SC-01" ||
  !rubric?.decision?.safeFallback?.includes("verified") ||
  !Array.isArray(rubric?.candidates) ||
  rubric.candidates.length !== expectedCandidates.length ||
  rubric.candidates.some((candidate, index) => {
    const [toolKey, rubricResult] = expectedCandidates[index];
    return (
      candidate?.toolKey !== toolKey ||
      candidate?.rubricResult !== rubricResult ||
      !Array.isArray(candidate?.staticEvidence) ||
      candidate.staticEvidence.length === 0 ||
      !Array.isArray(candidate?.releaseBlockers) ||
      candidate.releaseBlockers.length === 0
    );
  })
) {
  throw new Error("division-native-rubric-candidate-evidence-invalid");
}

if (
  rubric?.liveProbe?.status !==
    "semantic-grouping-observed-persistent-lifecycle-required" ||
  rubric.liveProbe.writeCount !== 0 ||
  rubric.liveProbe.userChromeTouched !== false ||
  rubric.liveProbe.clientSavePayloadMathematicalStateChange !== true ||
  rubric.liveProbe.persistedServerStateObserved !== false ||
  rubric.liveProbe.saveReopenObserved !== false ||
  rubric.liveProbe.unknownCandidatesColocated !== false ||
  rubric.liveProbe.oneSemanticCasePerCanvas !== true ||
  rubric.liveProbe.qualityEvidence !== false ||
  rubric.liveProbe.decisionStatus !== expectedDecision ||
  !Array.isArray(rubric.liveProbe.evidence) ||
  rubric.liveProbe.evidence.length !== 1
) {
  throw new Error("division-native-rubric-semantic-probe-is-not-fail-closed");
}

const semanticProbePath = safeRepositoryPath(rubric.liveProbe.evidence[0]);
if (!semanticProbePath) {
  throw new Error("division-native-rubric-linked-observation-path-invalid");
}

let probe;
try {
  probe = JSON.parse(readFileSync(semanticProbePath, "utf8"));
} catch {
  throw new Error("division-native-rubric-linked-observation-unreadable");
}

const byModuleKey = Object.fromEntries(
  Array.isArray(probe?.candidates)
    ? probe.candidates.map((candidate) => [candidate?.moduleKey, candidate])
    : []
);
const counting = byModuleKey.NO01SC;
const numberRack = byModuleKey.NO01NR;
const numberGrid = byModuleKey.NO04NG;
const groupDelta = counting?.mathematicalState?.groupMoveDelta;
const groupMoveDistance = Math.hypot(groupDelta?.x ?? 0, groupDelta?.y ?? 0);
const screenshotPaths = probe?.isolation?.localScreenshots;

if (
  probe?.schemaVersion !== "1.0.0" ||
  probe?.activityId !== rubric.activityId ||
  probe?.probeMode !== "dedicated-live-auth-read-only-response-injection" ||
  probe?.environment?.externalWriteCount !== 0 ||
  probe?.environment?.userChromeTouched !== false ||
  probe?.environment?.serviceWorkersBlocked !== true ||
  probe?.environment?.attemptedSavePayloadCount < 1 ||
  probe?.environment?.blockedNonSafeRequestCount < 1 ||
  probe?.isolation?.sourceProjectPersistedStateChanged !== false ||
  probe?.isolation?.unknownCandidatesColocated !== false ||
  probe?.isolation?.oneSemanticCasePerCanvas !== true ||
  probe?.isolation?.qualityEvidence !== false ||
  !Array.isArray(screenshotPaths) ||
  screenshotPaths.length < 4 ||
  screenshotPaths.some(
    (pathValue) =>
      typeof pathValue !== "string" ||
      isAbsolute(pathValue) ||
      !pathValue.startsWith(
        ".mathcanvas-contract-lab/previews/wave18/division-native-semantic/"
      )
  ) ||
  probe?.decision?.status !== expectedDecision ||
  probe?.decision?.primaryCandidate !== "NO01SC-01" ||
  probe?.decision?.releaseQualified !== false ||
  counting?.variantId !== "NO01SC-01" ||
  counting?.semanticOperation !== "multi-select-group-move-undo" ||
  counting?.mathematicalState?.initialMemberCount !== 4 ||
  counting?.mathematicalState?.groupedWrapperCount !== 1 ||
  counting?.mathematicalState?.groupedWrapperMemberCount !== 4 ||
  counting?.mathematicalState?.clientSavePayloadHasCommonGroupMembership !==
    true ||
  counting?.mathematicalState?.memberMoveMatchesWrapper !== true ||
  counting?.mathematicalState?.undoRestoresUngroupedState !== true ||
  counting?.mathematicalState?.fullDivisionStateObserved !== false ||
  !Number.isFinite(groupMoveDistance) ||
  groupMoveDistance <= 10 ||
  numberRack?.variantId !== "NO01NR-01" ||
  numberRack?.semanticOperation !== "bead-drag" ||
  numberRack?.mathematicalState?.persistedClientStateChanged !== true ||
  numberRack?.mathematicalState?.beforeBeadX?.[0] ===
    numberRack?.mathematicalState?.afterBeadX?.[0] ||
  numberGrid?.variantId !== "NO04NG-01" ||
  numberGrid?.semanticOperation !== "number-cell-select" ||
  numberGrid?.mathematicalState?.persistedClientStateChanged !== true ||
  numberGrid?.mathematicalState?.beforeSelectedRect?.length !== 0 ||
  numberGrid?.mathematicalState?.afterSelectedRect?.length !== 2
) {
  throw new Error("division-native-rubric-linked-semantic-probe-invalid");
}

process.stdout.write(
  `division-native-rubric PASS: status=${rubric.liveProbe.status} primary=${rubric.decision.primaryCandidate}\n`
);
