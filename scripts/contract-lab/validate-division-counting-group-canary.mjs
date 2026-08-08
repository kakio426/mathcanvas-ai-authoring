#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const inputPath = resolve(
  root,
  process.argv.find((argument) => argument.startsWith("--input="))?.slice(8) ??
    "research/mathcanvas/division-counting-group-canary.json"
);
const canary = JSON.parse(readFileSync(inputPath, "utf8"));

function fail(reason) {
  throw new Error(`division-counting-group-canary-invalid:${reason}`);
}

function expectedFinalState(state) {
  return (
    state?.totalUnitCount === 23 &&
    state?.wrapperCount === 5 &&
    state?.wrapperMemberCounts?.length === 5 &&
    state.wrapperMemberCounts.every((count) => count === 4) &&
    state?.groupedMemberCount === 20 &&
    state?.uniqueGroupedMemberCount === 20 &&
    state?.ungroupedUnitCount === 3 &&
    state?.duplicateMembershipCount === 0 &&
    state?.nestedGroupCount === 0 &&
    state?.staleGroupReferenceCount === 0 &&
    state?.membershipValid === true &&
    state?.groupedMemberSets?.length === 5 &&
    state?.ungroupedUnitIds?.length === 3 &&
    /^[a-f0-9]{64}$/.test(state?.semanticHash ?? "")
  );
}

function positiveBounds(bounds) {
  return (
    Number.isFinite(bounds?.x) &&
    Number.isFinite(bounds?.y) &&
    Number.isFinite(bounds?.width) &&
    Number.isFinite(bounds?.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

if (
  canary?.schemaVersion !== "1.0.0" ||
  canary?.activityId !==
    "number.division.quotient-remainder.claim-evidence-v1" ||
  canary?.toolKey !== "NO01SC" ||
  canary?.variantId !== "NO01SC-01" ||
  canary?.layoutId !== "wave25-division-grouping-v1" ||
  canary?.releaseQualified !== false
) {
  fail("identity-or-release-state");
}

const environment = canary.environment;
if (
  environment?.viewport?.width !== 1280 ||
  environment?.viewport?.height !== 800 ||
  environment?.profileScope !== "dedicated-mathcanvas-profile" ||
  environment?.userChromeTouched !== false ||
  environment?.serviceWorkersBlocked !== true ||
  environment?.reopenedInFreshBrowserContext !== true ||
  environment?.reopenProjectReadCount < 2
) {
  fail("environment");
}

const writes = canary.writeBoundary;
const freshSave =
  writes?.allowedSaveCountThisExecution === 1 &&
  writes?.allowedSaveStatus >= 200 &&
  writes?.allowedSaveStatus < 300 &&
  writes?.resumedFromPriorApprovedSave === false &&
  writes?.saveSkippedToAvoidDuplicateWrite === false;
const readOnlyResume =
  writes?.allowedSaveCountThisExecution === 0 &&
  writes?.resumedFromPriorApprovedSave === true &&
  writes?.saveSkippedToAvoidDuplicateWrite === true;
if (
  writes?.existingDisposableProjectReused !== true ||
  writes?.approvalEvidenceMatched !== true ||
  writes?.disposableTitleMarkerMatched !== true ||
  writes?.createCount !== 0 ||
  writes?.cumulativeApprovedSaveCount !== 1 ||
  writes?.unexpectedExternalWriteCount !== 0 ||
  writes?.reopenPutAttemptCount !== 0 ||
  (!freshSave && !readOnlyResume)
) {
  fail("write-boundary");
}

const initial = canary.initialState;
const reset = canary.undoResetState;
if (
  initial?.totalUnitCount !== 23 ||
  initial?.wrapperCount !== 0 ||
  initial?.groupedMemberCount !== 0 ||
  initial?.ungroupedUnitCount !== 23 ||
  initial?.duplicateMembershipCount !== 0 ||
  initial?.nestedGroupCount !== 0 ||
  initial?.staleGroupReferenceCount !== 0 ||
  initial?.semanticHash !== reset?.semanticHash
) {
  fail("initial-or-reset-state");
}

for (const [name, state] of [
  ["manipulated", canary.manipulatedState],
  ["regrouped", canary.nativeRevisionState?.regrouped],
  ["persisted", canary.persistedState],
  ["reopened", canary.reopenedState],
  ["second-read", canary.secondReadState]
]) {
  if (!expectedFinalState(state)) fail(`${name}-state`);
}

const ungrouped = canary.nativeRevisionState?.ungrouped;
if (
  ungrouped?.totalUnitCount !== 23 ||
  ungrouped?.wrapperCount !== 4 ||
  ungrouped?.groupedMemberCount !== 16 ||
  ungrouped?.uniqueGroupedMemberCount !== 16 ||
  ungrouped?.ungroupedUnitCount !== 7 ||
  ungrouped?.duplicateMembershipCount !== 0 ||
  ungrouped?.nestedGroupCount !== 0 ||
  ungrouped?.staleGroupReferenceCount !== 0 ||
  ungrouped?.membershipValid !== true ||
  canary.nativeRevisionState?.noOrphanWrapperOrStaleGroupReference !== true ||
  canary.nativeRevisionState?.preResetMembershipMatchesPostResetRebuild !==
    true ||
  canary.nativeRevisionState?.visualTransition
    ?.releasedMembersReturnedToSource !== true ||
  canary.nativeRevisionState?.visualTransition?.vacatedFirstGroupSlot !== true ||
  canary.nativeRevisionState?.visualTransition
    ?.occupiedGroupSlotCountAfterUngroup !== 4 ||
  canary.nativeRevisionState?.visualTransition?.emptyGroupSlotCountAfterUngroup !==
    2 ||
  canary.nativeRevisionState?.visualTransition
    ?.occupiedGroupSlotIndexesAfterUngroup?.length !== 4 ||
  canary.nativeRevisionState?.visualTransition
    ?.occupiedGroupSlotIndexesAfterUngroup?.includes(0)
) {
  fail("ungroup-regroup-revision");
}

const spatial = canary.spatialContractCandidate;
if (
  spatial?.allGroupVisualBoxesInsideGroupLane !== true ||
  spatial?.allGroupChromeBoxesInsideGroupLane !== true ||
  spatial?.allGroupsInsideDistinctVisibleSlots !== true ||
  spatial?.allWrappersInsideGroupLane !== true ||
  spatial?.allUngroupedInsideRemainderLane !== true ||
  spatial?.reopenedAllWrappersInsideGroupLane !== true ||
  spatial?.reopenedAllUngroupedInsideRemainderLane !== true ||
  spatial?.persistentVisualGroupingByLaneAndSlots !== true ||
  spatial?.nativeUngroupVisuallyVacatesSlot !== true ||
  spatial?.occupiedGroupSlotCount !== 5 ||
  spatial?.emptyGroupSlotCount !== 1 ||
  !positiveBounds(spatial?.groupLaneCssPx) ||
  !positiveBounds(spatial?.remainderLaneCssPx) ||
  !positiveBounds(spatial?.selectedChromeBoxCssPx) ||
  spatial?.groupSlotBoxesCssPx?.length !== 6 ||
  spatial.groupSlotBoxesCssPx.some((bounds) => !positiveBounds(bounds)) ||
  spatial?.groupVisualBoxesCssPx?.length !== 5 ||
  spatial.groupVisualBoxesCssPx.some((bounds) => !positiveBounds(bounds)) ||
  spatial?.groupChromeBoxesCssPx?.length !== 5 ||
  spatial.groupChromeBoxesCssPx.some((bounds) => !positiveBounds(bounds)) ||
  spatial?.remainderBoxesCssPx?.length !== 3 ||
  spatial.remainderBoxesCssPx.some((bounds) => !positiveBounds(bounds))
) {
  fail("spatial-contract-candidate");
}

const roundTrip = canary.roundTrip;
if (
  roundTrip?.serverStateMatchesClientSave !== true ||
  roundTrip?.firstReopenMatchesServer !== true ||
  roundTrip?.secondReadMatchesServer !== true ||
  roundTrip?.currentLayoutRevisionPersisted !== true ||
  roundTrip?.reopenedFromFreshBrowserContext !== true ||
  roundTrip?.secondGetResponseBodyAsserted !== true ||
  roundTrip?.undoAfterReopenLeavesMathematicalStateUnchanged !== true
) {
  fail("round-trip");
}

if (
  !Array.isArray(canary.screenshots) ||
  canary.screenshots.length !== 6 ||
  canary.screenshots.some(
    (pathValue) =>
      typeof pathValue !== "string" ||
      isAbsolute(pathValue) ||
      !pathValue.startsWith(
        ".mathcanvas-contract-lab/previews/wave18/division-counting-group/"
      )
  )
) {
  fail("screenshots");
}

process.stdout.write(
  "division-counting-group-canary PASS: native group/ungroup/regroup, positive spatial boxes, save/reopen\n"
);
