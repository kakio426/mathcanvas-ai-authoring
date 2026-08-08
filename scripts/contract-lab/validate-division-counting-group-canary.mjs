#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  assertNativeSpatialLifecycleEvidence,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { getLayoutPreset } from "../../packages/mathcanvas-compiler/dist/index.js";
import { findClaimEvidenceBlueprint } from "../../packages/templates/dist/index.js";

const root = resolve(import.meta.dirname, "../..");
const inputPath = resolve(
  root,
  process.argv.find((argument) => argument.startsWith("--input="))?.slice(8) ??
    "research/mathcanvas/division-counting-group-canary.json"
);
const canary = JSON.parse(readFileSync(inputPath, "utf8"));
const scenario = canary?.scenario;
const supportedScenarios = new Set([
  "23-by-4:23:4:5:3",
  "29-by-7:29:7:4:1",
  "31-by-6:31:6:5:1"
]);
if (
  !supportedScenarios.has(
    `${scenario?.scenarioKey}:${scenario?.total}:${scenario?.groupSize}:${scenario?.quotient}:${scenario?.remainderCount}`
  ) ||
  typeof scenario?.seed !== "string"
) {
  throw new Error("division-counting-group-canary-invalid:scenario");
}
const total = scenario.total;
const groupSize = scenario.groupSize;
const quotient = scenario.quotient;
const remainderCount = scenario.remainderCount;
const layoutId = "wave25-division-grouping-v1";
const layoutPreset = getLayoutPreset(layoutId);
const expectedLayoutContentHash = sha256Hex({
  layoutId,
  preset: layoutPreset
});
const expectedLayoutRevision =
  `layout-${expectedLayoutContentHash.slice(0, 16)}`;
const expectedLayoutPresetContentHash = sha256Hex(layoutPreset);
const blueprint = findClaimEvidenceBlueprint(
  "number.division.quotient-remainder.claim-evidence-v1"
);
if (!blueprint) {
  throw new Error("division-counting-group-canary-invalid:blueprint-missing");
}

function fail(reason) {
  throw new Error(`division-counting-group-canary-invalid:${reason}`);
}

function expectedFinalState(state) {
  return (
    state?.totalUnitCount === total &&
    state?.wrapperCount === quotient &&
    state?.wrapperMemberCounts?.length === quotient &&
    state.wrapperMemberCounts.every((count) => count === groupSize) &&
    state?.groupedMemberCount === quotient * groupSize &&
    state?.uniqueGroupedMemberCount === quotient * groupSize &&
    state?.ungroupedUnitCount === remainderCount &&
    state?.duplicateMembershipCount === 0 &&
    state?.nestedGroupCount === 0 &&
    state?.staleGroupReferenceCount === 0 &&
    state?.membershipValid === true &&
    state?.groupedMemberSets?.length === quotient &&
    state?.ungroupedUnitIds?.length === remainderCount &&
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
  canary?.schemaVersion !== "2.0.0" ||
  canary?.status !== "pass" ||
  canary?.activityId !==
    "number.division.quotient-remainder.claim-evidence-v1" ||
  canary?.toolKey !== "NO01SC" ||
  canary?.variantId !== "NO01SC-01" ||
  canary?.layoutId !== layoutId ||
  canary?.layoutRevision !== expectedLayoutRevision ||
  canary?.layoutPresetContentHash !== expectedLayoutPresetContentHash ||
  canary?.blueprintContentHash !== blueprint.contentHash ||
  Object.values(canary?.interactionShape ?? {}).length !== 5 ||
  Object.values(canary.interactionShape).some((observed) => observed !== true) ||
  canary?.releaseQualified !== true
) {
  fail("identity-or-release-state");
}

const environment = canary.environment;
const interactionContext = environment?.releaseInteractionContext;
const textClearance = environment?.classroomTextClearance;
if (
  environment?.viewport?.width !== 1280 ||
  environment?.viewport?.height !== 800 ||
  environment?.profileScope !== "dedicated-mathcanvas-profile" ||
  environment?.userChromeTouched !== false ||
  environment?.serviceWorkersBlocked !== true ||
  environment?.reopenedInFreshBrowserContext !== true ||
  environment?.reopenProjectReadCount < 2 ||
  !/^[a-f0-9]{64}$/.test(
    environment?.servedAssetEvidence?.sha256 ?? ""
  ) ||
  environment?.servedAssetEvidence?.resourceCount < 1 ||
  interactionContext?.viewport?.width !== 1280 ||
  interactionContext?.viewport?.height !== 800 ||
  interactionContext?.surfaceMode !== "authoring-editor" ||
  interactionContext?.sidebarState !== "expanded" ||
  interactionContext?.zoomMode !== "fit" ||
  !Number.isFinite(interactionContext?.canvasUnitsToCssPx) ||
  interactionContext.canvasUnitsToCssPx * 80 < 44 ||
  !positiveBounds(interactionContext?.selectionOverlayCssPx) ||
  environment?.nativeOverlayIntersectionCount !== 0 ||
  !textClearance?.checks ||
  Object.values(textClearance.checks).some((passed) => passed !== true)
) {
  fail("environment");
}

const writes = canary.writeBoundary;
const freshSave =
  writes?.allowedSaveCountThisExecution === 1 &&
  writes?.allowedSaveStatus >= 200 &&
  writes?.allowedSaveStatus < 300 &&
  writes?.resumedFromPriorApprovedSave === false &&
  writes?.saveSkippedToAvoidDuplicateWrite === false &&
  writes?.cumulativeApprovedSaveCount ===
    Number(writes?.priorApprovedVersionCount ?? 0) + 1;
const readOnlyResume =
  writes?.allowedSaveCountThisExecution === 0 &&
  writes?.priorApprovedSaveObserved === true &&
  writes?.priorApprovedVersionCount > 0 &&
  writes?.resumedFromPriorApprovedSave === true &&
  writes?.saveSkippedToAvoidDuplicateWrite === true &&
  writes?.cumulativeApprovedSaveCount ===
    writes?.priorApprovedVersionCount;
if (
  writes?.existingDisposableProjectReused !== true ||
  writes?.approvalEvidenceMatched !== true ||
  writes?.disposableTitleMarkerMatched !== true ||
  writes?.createCount !== 0 ||
  writes?.unexpectedExternalWriteCount !== 0 ||
  writes?.reopenPutAttemptCount !== 0 ||
  (!freshSave && !readOnlyResume)
) {
  fail("write-boundary");
}

const initial = canary.initialState;
const reset = canary.undoResetState;
if (
  initial?.totalUnitCount !== total ||
  initial?.wrapperCount !== 0 ||
  initial?.groupedMemberCount !== 0 ||
  initial?.ungroupedUnitCount !== total ||
  initial?.duplicateMembershipCount !== 0 ||
  initial?.nestedGroupCount !== 0 ||
  initial?.staleGroupReferenceCount !== 0 ||
  initial?.semanticHash !== reset?.semanticHash
) {
  fail("initial-or-reset-state");
}

const compiler = canary.compilerContract;
if (
  compiler?.fragmentKind !== "multi" ||
  compiler?.emittedObjectCount !== total ||
  compiler?.hasAmbiguousPrimaryObject !== false ||
  compiler?.requiredModuleKeys?.length !== 1 ||
  compiler.requiredModuleKeys[0] !== "NO01SC" ||
  compiler?.deterministicUnitIds?.length !== total ||
  new Set(compiler.deterministicUnitIds).size !== total ||
  compiler.deterministicUnitIds.some(
    (id, index) =>
      id !==
      `division-remainder-1-counting-model-pool-unit-${String(index + 1).padStart(2, "0")}`
  ) ||
  !/^[a-f0-9]{64}$/.test(compiler?.unitIdOrderHash ?? "") ||
  compiler?.supportedGroupSizes?.join(",") !== "4,6,7" ||
  compiler?.initialStructureAnalysis?.maximumUnitsPerRow !== 5 ||
  compiler?.initialStructureAnalysis?.answerStructureLeaked !== false ||
  compiler?.initialStructureAnalysis
    ?.completeRowOccupanciesMatchingSupportedGroupSize?.length !== 0 ||
  compiler?.initialStructureAnalysis?.distinctColumnCount <=
    compiler?.initialStructureAnalysis?.rowOccupancies?.length ||
  compiler?.initialColumnsMatchSupportedGroupSize !== false ||
  compiler?.answerStructureLeaked !== false ||
  compiler?.initialPlacementReadsGroupSize !== false ||
  compiler?.groupingIndexesDerivedFromEmittedPlacements?.length !== quotient ||
  compiler.groupingIndexesDerivedFromEmittedPlacements.some(
    (indexes) => indexes.length !== groupSize
  ) ||
  new Set(compiler.groupingIndexesDerivedFromEmittedPlacements.flat()).size !==
    quotient * groupSize ||
  compiler?.targetSizeProfilesCanvas?.length !== quotient ||
  compiler?.compilerPayloadUsedByCanary !== true
) {
  fail("compiler-contract");
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
  ungrouped?.totalUnitCount !== total ||
  ungrouped?.wrapperCount !== quotient - 1 ||
  ungrouped?.groupedMemberCount !== (quotient - 1) * groupSize ||
  ungrouped?.uniqueGroupedMemberCount !== (quotient - 1) * groupSize ||
  ungrouped?.ungroupedUnitCount !== remainderCount + groupSize ||
  ungrouped?.duplicateMembershipCount !== 0 ||
  ungrouped?.nestedGroupCount !== 0 ||
  ungrouped?.staleGroupReferenceCount !== 0 ||
  ungrouped?.membershipValid !== true ||
  canary.nativeRevisionState?.noOrphanWrapperOrStaleGroupReference !== true ||
  canary.nativeRevisionState?.preResetMembershipMatchesPostResetRebuild !==
    true ||
  canary.nativeRevisionState?.visualTransition
    ?.releasedMembersReturnedToSource !== true ||
  canary.nativeRevisionState?.visualTransition?.vacatedFirstGroupTarget !== true ||
  canary.nativeRevisionState?.visualTransition
    ?.occupiedTargetEnvelopeCountAfterUngroup !== quotient - 1 ||
  canary.nativeRevisionState?.visualTransition
    ?.emptyTargetEnvelopeCountAfterUngroup !== 1 ||
  canary.nativeRevisionState?.visualTransition
    ?.occupiedTargetEnvelopeIndexesAfterUngroup?.length !== quotient - 1 ||
  canary.nativeRevisionState?.visualTransition
    ?.occupiedTargetEnvelopeIndexesAfterUngroup?.includes(0)
) {
  fail("ungroup-regroup-revision");
}

const spatial = canary.spatialContractCandidate;
if (
  spatial?.allGroupVisualBoxesInsideGroupLane !== true ||
  spatial?.allGroupChromeBoxesInsideGroupLane !== true ||
  spatial?.allGroupsInsideDistinctTargetEnvelopes !== true ||
  spatial?.allGroupChromeBoxesSeparated !== true ||
  spatial?.groupLabelClearancePassed !== true ||
  spatial?.remainderLabelClearancePassed !== true ||
  spatial?.allWrappersInsideGroupLane !== true ||
  spatial?.allUngroupedInsideRemainderLane !== true ||
  spatial?.reopenedAllWrappersInsideGroupLane !== true ||
  spatial?.reopenedAllUngroupedInsideRemainderLane !== true ||
  spatial?.persistentVisualGroupingByOpenLane !== true ||
  spatial?.nativeUngroupVisuallyVacatesTarget !== true ||
  spatial?.occupiedTargetEnvelopeCount !== quotient ||
  spatial?.emptyTargetEnvelopeCount !== 0 ||
  spatial?.nativeOverlayIntersectionCount !== 0 ||
  !positiveBounds(spatial?.selectionOverlayExclusionZoneCssPx) ||
  !positiveBounds(spatial?.groupLaneCssPx) ||
  !positiveBounds(spatial?.remainderLaneCssPx) ||
  !positiveBounds(spatial?.selectedChromeBoxCssPx) ||
  spatial?.groupTargetEnvelopeBoxesCssPx?.length !== quotient ||
  spatial.groupTargetEnvelopeBoxesCssPx.some(
    (bounds) => !positiveBounds(bounds)
  ) ||
  spatial?.occupiedTargetEnvelopeIndexes?.length !== quotient ||
  spatial?.groupVisualBoxesCssPx?.length !== quotient ||
  spatial.groupVisualBoxesCssPx.some((bounds) => !positiveBounds(bounds)) ||
  spatial?.groupChromeBoxesCssPx?.length !== quotient ||
  spatial.groupChromeBoxesCssPx.some((bounds) => !positiveBounds(bounds)) ||
  spatial?.remainderBoxesCssPx?.length !== remainderCount ||
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

const product = canary.productContract;
if (
  product?.blueprintId !== canary.activityId ||
  product?.blueprintVersion !== blueprint.version ||
  product?.blueprintContentHash !== blueprint.contentHash ||
  product?.generatorId !== "curriculum.claim-evidence-items" ||
  product?.generatorVersion !== blueprint.generator.version ||
  product?.seed !== scenario.seed ||
  product?.itemId !== "division-remainder-1" ||
  typeof product?.questionText !== "string" ||
  typeof product?.correctValueText !== "string" ||
  product?.verifyInstructionText !==
    `② 모형을 ${groupSize}개씩 옮겨 가까이 놓고, ${groupSize}개를 골라 ‘그룹’을 누르세요.` ||
  product?.groupLaneLabelText !== `${groupSize}개씩 묶은 모형` ||
  product?.poolLabelText !== "예상한 답 고르기" ||
  product?.sourceLabelText !== "묶기 전 모형" ||
  product?.explanationLabelText !== "식과 까닭 쓰기" ||
  !/^[a-f0-9]{64}$/.test(product?.compiledPayloadHash ?? "") ||
  !/^[a-f0-9]{64}$/.test(product?.resolvedHash ?? "") ||
  product?.localValidationCanCreate !== true ||
  product?.localValidationIssueCodes?.length !== 0 ||
  product?.spatialContractId !==
    "division-grouping-no01sc-01-composition-v2" ||
  product?.spatialContractVersion !== "2.0.0" ||
  !positiveBounds(product?.poolPlacementCanvas)
) {
  fail("actual-product-contract");
}

const intrinsic = canary.intrinsicSpatialContractCandidate;
if (
  intrinsic?.contractVersion !== "2.0.0" ||
  intrinsic?.contract?.contractKind !== "intrinsic-element" ||
  intrinsic?.contract?.contractId !== "native-element-no01sc-01-v2" ||
  intrinsic?.contract?.toolKey !== "NO01SC" ||
  intrinsic?.contract?.variantId !== "NO01SC-01" ||
  intrinsic?.contract?.toolVersionFingerprint !==
    `bundle:${environment.servedAssetEvidence.sha256}:NO01SC-01` ||
  intrinsic?.contract?.minInteractiveCssSize?.width !== 44 ||
  intrinsic?.contract?.minInteractiveCssSize?.height !== 44 ||
  intrinsic?.evidence?.observations?.length !== 5 ||
  intrinsic?.evidence?.observations?.[1]?.state !== "selected" ||
  intrinsic?.evidence?.observations?.[1]?.chromeBox?.width <= 0 ||
  intrinsic?.evidence?.observations?.[1]?.chromeBox?.height <= 0
) {
  fail("intrinsic-spatial-contract-identity");
}
try {
  assertNativeSpatialLifecycleEvidence(
    intrinsic.contract,
    intrinsic.evidence
  );
} catch (error) {
  fail(`intrinsic-spatial-contract:${String(error)}`);
}

const composition = canary.activityCompositionSpatialContractCandidate;
if (
  composition?.contractVersion !== "2.0.0" ||
  composition?.contract?.contractKind !== "activity-composition" ||
  composition?.contract?.contractId !==
    "division-grouping-no01sc-01-composition-v2" ||
  composition?.contract?.toolKey !== "NO01SC" ||
  composition?.contract?.variantId !== "NO01SC-01" ||
  composition?.contract?.reserveAnchor !== "placement-top-left" ||
  composition?.contract?.composition?.layoutPresetId !== layoutId ||
  composition?.contract?.composition?.layoutContentHash !==
    expectedLayoutContentHash ||
  composition?.contract?.composition?.blueprintContentHash !==
    blueprint.contentHash ||
  composition?.contract?.composition?.canvas?.canvasUnitsToCssPx !==
    interactionContext.canvasUnitsToCssPx ||
  composition?.contract?.composition?.selectionOverlayExclusionZoneCssPx
    ?.x !== interactionContext.selectionOverlayCssPx.x ||
  composition?.contract?.composition?.selectionOverlayExclusionZoneCssPx
    ?.y !== interactionContext.selectionOverlayCssPx.y ||
  composition?.contract?.composition?.selectionOverlayExclusionZoneCssPx
    ?.width !== interactionContext.selectionOverlayCssPx.width ||
  composition?.contract?.composition?.selectionOverlayExclusionZoneCssPx
    ?.height !== interactionContext.selectionOverlayCssPx.height ||
  composition?.evidence?.observations?.length !== 5 ||
  composition?.evidence?.observations?.[0]?.placement?.width !==
    product.poolPlacementCanvas.width ||
  composition?.evidence?.observations?.[0]?.placement?.height !==
    product.poolPlacementCanvas.height
) {
  fail("activity-composition-spatial-contract-identity");
}
try {
  assertNativeSpatialLifecycleEvidence(
    composition.contract,
    composition.evidence
  );
} catch (error) {
  fail(`activity-composition-spatial-contract:${String(error)}`);
}

const claims = canary.claims?.NO01SC;
if (
  claims?.contracted?.adapterKey !== "counting-model" ||
  claims?.contracted?.variantId !== "NO01SC-01" ||
  claims?.contracted?.intrinsicSpatialContractId !==
    "native-element-no01sc-01-v2" ||
  claims?.contracted?.activityCompositionSpatialContractId !==
    "division-grouping-no01sc-01-composition-v2" ||
  claims?.verified?.compilerPayloadUsedByCanary !== true ||
  claims?.verified?.emittedObjectCount !== total ||
  claims?.verified?.exactNativeVariantOnly !== true ||
  claims?.verified?.maximumUnitsPerRow !== 5 ||
  claims?.verified?.answerStructureLeakedByInitialPlacement !== false ||
  claims?.verified?.groupsFormedFromEmittedPlacements !== true ||
  claims?.verified?.selectionOverlayAvoided !== true ||
  claims?.released?.toolAdapterReleased !== true ||
  claims?.released?.releasedVariantIds?.length !== 1 ||
  claims.released.releasedVariantIds[0] !== "NO01SC-01" ||
  claims?.released?.activityReleaseQualified !== true ||
  claims?.lifecycle?.nativeGroupUngroupRegroup !== true ||
  claims?.lifecycle?.saveReopenInFreshContext !== true ||
  claims?.lifecycle?.secondGetBodyAsserted !== true ||
  claims?.lifecycle?.roundTripDrift > 1
) {
  fail("tool-release-claims");
}

if (
  !Array.isArray(canary.screenshots) ||
  canary.screenshots.length !== 7 ||
  canary.screenshots.some(
    (pathValue) =>
      typeof pathValue !== "string" ||
      isAbsolute(pathValue) ||
      !pathValue.startsWith(
        ".mathcanvas-contract-lab/previews/wave18/division-"
      )
  )
) {
  fail("screenshots");
}

process.stdout.write(
  "division-counting-group-canary PASS: native group/ungroup/regroup, positive spatial boxes, save/reopen\n"
);
