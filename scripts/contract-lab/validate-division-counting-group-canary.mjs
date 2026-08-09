#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  assertNativeSpatialLifecycleEvidence,
  recommendationSchema,
  sha256Hex,
  studentOneScreenGeometryProfileSchema
} from "../../packages/contracts/dist/index.js";
import { resolveCurriculum } from "../../packages/curriculum/dist/index.js";
import {
  compileActivity,
  getLayoutPreset,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import {
  assertCognitiveManifestBound,
  findClaimEvidenceBlueprint,
  generateClaimEvidenceActivity
} from "../../packages/templates/dist/index.js";
import {
  DIVISION_PRODUCT_STATIC_PROJECTION_POLICY,
  divisionProductStaticPayloadIdentity
} from "./lib/division-product-static-projection.mjs";

const root = resolve(import.meta.dirname, "../..");
const geometryProfilePath = resolve(
  root,
  "research/mathcanvas/student-one-screen-geometry-profile.json"
);
const geometryManifestPath = resolve(
  root,
  "research/mathcanvas/editor-geometry-manifest.json"
);
const geometryProfileBytes = readFileSync(geometryProfilePath);
const geometryProfileFileSha256 = createHash("sha256")
  .update(geometryProfileBytes)
  .digest("hex");
const geometryProfile = studentOneScreenGeometryProfileSchema.parse(
  JSON.parse(geometryProfileBytes.toString("utf8"))
);
const geometryManifest = JSON.parse(
  readFileSync(geometryManifestPath, "utf8")
);
if (
  geometryManifest.profileId !== geometryProfile.profileId ||
  geometryManifest.profileVersion !== geometryProfile.profileVersion ||
  geometryManifest.evidenceId !== geometryProfile.evidenceId ||
  geometryManifest.profileFileSha256 !== geometryProfileFileSha256 ||
  geometryManifest.profileContentSha256 !== geometryProfile.contentSha256 ||
  geometryManifest.fixedGeometryInputReady !== true ||
  geometryProfile.eligibility.fixedGeometryInputReady !== true
) {
  throw new Error(
    "division-counting-group-canary-invalid:pinned-geometry-profile"
  );
}
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
const classroomLanguageByScenario = {
  "23-by-4": {
    predict:
      "① 묶기 전에 답 카드 하나를 ‘처음 고른 답’ 칸에 놓으세요.",
    verify:
      "② 연필을 4자루씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. 4자루보다 적으면 오른쪽에 놓으세요.",
    explain:
      "③ 만든 묶음과 남은 연필을 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.",
    sourceLabel: "아직 묶지 않은 연필",
    groupLabel: "4자루씩 만든 묶음",
    remainderLabel: "남은 연필"
  },
  "29-by-7": {
    predict:
      "① 묶기 전에 답 카드 하나를 ‘처음 고른 답’ 칸에 놓으세요.",
    verify:
      "② 색종이를 7장씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. 7장보다 적으면 오른쪽에 놓으세요.",
    explain:
      "③ 만든 묶음과 남은 색종이를 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.",
    sourceLabel: "아직 묶지 않은 색종이",
    groupLabel: "7장씩 만든 묶음",
    remainderLabel: "남은 색종이"
  },
  "31-by-6": {
    predict:
      "① 묶기 전에 답 카드 하나를 ‘처음 고른 답’ 칸에 놓으세요.",
    verify:
      "② 구슬을 6개씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. 6개보다 적으면 오른쪽에 놓으세요.",
    explain:
      "③ 만든 봉지와 남은 구슬을 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.",
    sourceLabel: "아직 묶지 않은 구슬",
    groupLabel: "6개씩 담은 봉지",
    remainderLabel: "남은 구슬"
  }
};
const expectedClassroomLanguage =
  classroomLanguageByScenario[scenario.scenarioKey];
if (!expectedClassroomLanguage) {
  throw new Error(
    "division-counting-group-canary-invalid:classroom-language-scenario"
  );
}
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

function buildExpectedProduct() {
  const curriculum = resolveCurriculum(
    blueprint.curriculumBinding.standardCode
  );
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `division-group-product-canary-${scenario.scenarioKey}`,
    supported: true,
    templateId: blueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 3,
    standardCode: curriculum.record.code,
    learningGoal: blueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 1,
    difficulty: "normal",
    manipulation: "claim-evidence-revision-drag",
    rationale: [
      "실제 출시 블루프린트와 compiler payload의 저장·재열기 canary입니다."
    ],
    confidence: 0.99,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = generateClaimEvidenceActivity(recommendation, {
    seed: scenario.seed,
    generatedAt: "2026-08-08T00:00:00.000Z",
    activityId: `division-native-product-${scenario.scenarioKey}`
  });
  assertCognitiveManifestBound(plan.blueprint);
  const item = plan.items[0];
  if (
    plan.items.length !== 1 ||
    item?.values?.countableTotal !== total ||
    item?.values?.countableGroupSize !== groupSize
  ) {
    fail("current-product-scenario-drift");
  }
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  return {
    item,
    resolvedHash: sha256Hex(resolved),
    compiledPayloadHash: compiled.payloadHash,
    staticPayloadIdentity: divisionProductStaticPayloadIdentity(
      compiled.payload.contentsJson
    )
  };
}

const expectedProduct = buildExpectedProduct();

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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

function boundsClose(left, right, tolerance = 0.02) {
  return (
    positiveBounds(left) &&
    positiveBounds(right) &&
    ["x", "y", "width", "height"].every(
      (key) => Math.abs(left[key] - right[key]) <= tolerance
    )
  );
}

function validGeometryProfileReference(reference) {
  const expectedKeys = [
    "profileId",
    "profileVersion",
    "evidenceId",
    "profileFileSha256",
    "profileContentSha256",
    "viewport",
    "surfaceMode",
    "sidebarState",
    "guardCssPx",
    "fixedSafeCssPx"
  ];
  return (
    reference &&
    Object.keys(reference).sort().join(",") ===
      expectedKeys.sort().join(",") &&
    reference.profileId === geometryProfile.profileId &&
    reference.profileVersion === geometryProfile.profileVersion &&
    reference.evidenceId === geometryProfile.evidenceId &&
    reference.profileFileSha256 === geometryProfileFileSha256 &&
    reference.profileContentSha256 === geometryProfile.contentSha256 &&
    reference.viewport === geometryProfile.viewport &&
    reference.surfaceMode === geometryProfile.surfaceMode &&
    reference.sidebarState === geometryProfile.sidebarState &&
    reference.guardCssPx === geometryProfile.guardCssPx &&
    boundsClose(
      reference.fixedSafeCssPx,
      geometryProfile.fixedSafeCss,
      geometryProfile.tolerance.geometryCssPx
    )
  );
}

function unionBounds(boxes) {
  if (boxes.length === 0 || boxes.some((box) => !positiveBounds(box))) {
    return null;
  }
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function overlaps(left, right) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

function overlapsWithGap(left, right, gap) {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  );
}

function containsBounds(outer, inner, tolerance = 0) {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

function exactTrueChecks(value, expectedKeys) {
  return (
    value &&
    Object.keys(value).sort().join(",") ===
      [...expectedKeys].sort().join(",") &&
    expectedKeys.every((key) => value[key] === true)
  );
}

function validFixedChromeTaskClearance(record) {
  const guard = record?.guardCssPx;
  const chrome = record?.fixedChrome;
  const expectedChrome = {
    top: "#top-toolbar",
    left: "#left-toolbar",
    right: "#right-toolbar",
    bottom: "#bottom-common-toolbar"
  };
  const taskRoles = [
    "instruction-predict",
    "instruction-verify",
    "instruction-explain",
    "question",
    "choice-panel",
    "prediction-box",
    "explanation-box",
    "native-workbench"
  ];
  if (
    guard !== geometryProfile.guardCssPx ||
    !chrome ||
    Object.keys(chrome).sort().join(",") !==
      Object.keys(expectedChrome).sort().join(",") ||
    Object.entries(expectedChrome).some(
      ([role, selector]) =>
        chrome[role]?.selector !== selector ||
        !positiveBounds(chrome[role]?.bounds)
    ) ||
    !Array.isArray(record?.taskSurfacesCssPx) ||
    record.taskSurfacesCssPx.length !== taskRoles.length ||
    record.taskSurfacesCssPx
      .map(({ role }) => role)
      .sort()
      .join(",") !== [...taskRoles].sort().join(",") ||
    Object.values(record?.checks ?? {}).length !== 3 ||
    Object.values(record.checks).some((passed) => passed !== true)
  ) {
    return false;
  }
  const safe = {
    x: chrome.left.bounds.x + chrome.left.bounds.width + guard,
    y: chrome.top.bounds.y + chrome.top.bounds.height + guard,
    width:
      chrome.right.bounds.x - guard -
      (chrome.left.bounds.x + chrome.left.bounds.width + guard),
    height:
      chrome.bottom.bounds.y - guard -
      (chrome.top.bounds.y + chrome.top.bounds.height + guard)
  };
  const surfaces = record.taskSurfacesCssPx.map(({ bounds }) => bounds);
  const envelope = unionBounds(surfaces);
  if (
    !envelope ||
    !boundsClose(
      safe,
      geometryProfile.fixedSafeCss,
      geometryProfile.tolerance.geometryCssPx
    ) ||
    !boundsClose(record.fixedSafeCssPx, safe) ||
    !boundsClose(record.taskEnvelopeCssPx, envelope)
  ) {
    return false;
  }
  const clearance = {
    top: envelope.y - safe.y,
    right: safe.x + safe.width - (envelope.x + envelope.width),
    bottom: safe.y + safe.height - (envelope.y + envelope.height),
    left: envelope.x - safe.x
  };
  if (
    Object.entries(clearance).some(
      ([key, value]) =>
        value < -0.25 ||
        Math.abs(value - record.taskClearanceInsideSafeCssPx?.[key]) > 0.02
    )
  ) {
    return false;
  }
  const inflatedChrome = Object.values(chrome).map(({ bounds }) => ({
    x: bounds.x - guard,
    y: bounds.y - guard,
    width: bounds.width + guard * 2,
    height: bounds.height + guard * 2
  }));
  return surfaces.every((surface) =>
    inflatedChrome.every((fixed) => !overlaps(surface, fixed))
  );
}

function validSpatialState(state) {
  const lane = state?.groupLaneCssPx;
  const remainderLane = state?.remainderLaneCssPx;
  const targets = state?.groupTargetEnvelopeBoxesCssPx;
  const visuals = state?.groupVisualBoxesCssPx;
  const chromes = state?.groupChromeBoxesCssPx;
  const remainders = state?.remainderBoxesCssPx;
  if (
    !positiveBounds(lane) ||
    !positiveBounds(remainderLane) ||
    !Array.isArray(targets) ||
    targets.length !== quotient ||
    targets.some((bounds) => !positiveBounds(bounds)) ||
    !Array.isArray(visuals) ||
    visuals.length !== quotient ||
    visuals.some((bounds) => !positiveBounds(bounds)) ||
    !Array.isArray(chromes) ||
    chromes.length !== quotient ||
    chromes.some((bounds) => !positiveBounds(bounds)) ||
    !Array.isArray(remainders) ||
    remainders.length !== remainderCount ||
    remainders.some((bounds) => !positiveBounds(bounds))
  ) {
    return false;
  }
  const occupiedIndexes = visuals.map((visual, index) =>
    targets.findIndex(
      (target) =>
        containsBounds(target, visual, 3) &&
        containsBounds(target, chromes[index], 3)
    )
  );
  const uniqueOccupied = [...new Set(occupiedIndexes)].sort(
    (left, right) => left - right
  );
  const storedOccupied = [
    ...(state?.occupiedTargetEnvelopeIndexes ?? [])
  ].sort((left, right) => left - right);
  const separated = chromes.every((left, leftIndex) =>
    chromes.every(
      (right, rightIndex) =>
        leftIndex >= rightIndex || !overlapsWithGap(left, right, 4)
    )
  );
  return (
    visuals.every((bounds) => containsBounds(lane, bounds, 2)) &&
    chromes.every((bounds) => containsBounds(lane, bounds, 2)) &&
    remainders.every((bounds) =>
      containsBounds(remainderLane, bounds, 2)
    ) &&
    occupiedIndexes.every((index) => index >= 0) &&
    uniqueOccupied.length === quotient &&
    uniqueOccupied.join(",") === storedOccupied.join(",") &&
    state?.occupiedTargetEnvelopeCount === uniqueOccupied.length &&
    state?.emptyTargetEnvelopeCount ===
      targets.length - uniqueOccupied.length &&
    separated &&
    state?.allGroupVisualBoxesInsideGroupLane === true &&
    state?.allGroupChromeBoxesInsideGroupLane === true &&
    state?.allGroupsInsideDistinctTargetEnvelopes === true &&
    state?.allGroupChromeBoxesSeparated === true &&
    state?.allWrappersInsideGroupLane === true &&
    state?.allUngroupedInsideRemainderLane === true
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
const textMetrics = textClearance?.metrics;
const fixedChromeClearance = environment?.fixedChromeTaskClearance;
const expectedTextClearanceChecks = [
  "instructionRowsSeparated",
  "semanticTitleGap",
  "titleHierarchy",
  "textBoxesContainActualLineBoxes",
  "poolLabelPadded",
  "choiceLineBoxesCentered",
  "writingLabelsPadded",
  "workbenchLabelsPadded",
  "workbenchLabelsInsideOwnLanes",
  "sourceNativeUnitsClearLabel",
  "selectedSourceGroupClearsLabel"
];
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
  !exactTrueChecks(
    textClearance?.checks,
    expectedTextClearanceChecks
  ) ||
  textMetrics?.instructionPredictToVerifyCssPx < 12 ||
  textMetrics?.instructionVerifyToExplainCssPx < 12 ||
  textMetrics?.instructionExplainToQuestionCssPx < 18 ||
  textMetrics?.questionToResponseBandCssPx < 10 ||
  textMetrics?.questionToInstructionFontRatio < 1.7 ||
  textMetrics?.instructionFontSizeCanvas !== 30 ||
  textMetrics?.questionFontSizeCanvas !== 52 ||
  !Array.isArray(textMetrics?.textBoxOverflowCanvas) ||
  textMetrics.textBoxOverflowCanvas.length !== 15 ||
  textMetrics.textBoxOverflowCanvas.some(
    ({ vertical, horizontal }) => vertical > 1 || horizontal > 1
  ) ||
  !Array.isArray(textMetrics?.choiceLineBoxCenterOffsetsCssPx) ||
  textMetrics.choiceLineBoxCenterOffsetsCssPx.length !== 5 ||
  textMetrics.choiceLineBoxCenterOffsetsCssPx.some(
    ({ x, y }) => Math.abs(x) > 1 || Math.abs(y) > 1
  ) ||
  !Array.isArray(textMetrics?.workbenchLabelLaneInsetsCssPx) ||
  textMetrics.workbenchLabelLaneInsetsCssPx.length !== 3 ||
  textMetrics.workbenchLabelLaneInsetsCssPx.some(
    ({ left, right }) => left < 1 || right < 1
  ) ||
  !validGeometryProfileReference(environment?.geometryProfileReference) ||
  fixedChromeClearance?.stableAfterReopen !== true ||
  !validFixedChromeTaskClearance(fixedChromeClearance?.initial) ||
  !validFixedChromeTaskClearance(fixedChromeClearance?.reopened) ||
  !boundsClose(
    fixedChromeClearance.initial.fixedSafeCssPx,
    fixedChromeClearance.reopened.fixedSafeCssPx,
    1
  ) ||
  !boundsClose(
    fixedChromeClearance.initial.taskEnvelopeCssPx,
    fixedChromeClearance.reopened.taskEnvelopeCssPx,
    1
  )
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
  compiler?.initialStructureAnalysis?.maximumUnitsPerRow !== 8 ||
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
  !validSpatialState(spatial) ||
  !validSpatialState(spatial?.reopenedSpatial) ||
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
  product?.questionText !== expectedProduct.item.values.questionText ||
  product?.correctValueText !==
    expectedProduct.item.values.correctValueText ||
  product?.predictInstructionText !== expectedClassroomLanguage.predict ||
  product?.verifyInstructionText !== expectedClassroomLanguage.verify ||
  product?.explainInstructionText !== expectedClassroomLanguage.explain ||
  product?.groupLaneLabelText !== expectedClassroomLanguage.groupLabel ||
  product?.poolLabelText !== "답 카드 고르기" ||
  product?.sourceLabelText !== expectedClassroomLanguage.sourceLabel ||
  product?.remainderLabelText !==
    expectedClassroomLanguage.remainderLabel ||
  product?.explanationLabelText !== "식과 까닭 쓰기" ||
  product?.compiledPayloadHash !== expectedProduct.compiledPayloadHash ||
  product?.resolvedHash !== expectedProduct.resolvedHash ||
  product?.localValidationCanCreate !== true ||
  product?.localValidationIssueCodes?.length !== 0 ||
  product?.spatialContractId !==
    "division-grouping-no01sc-01-composition-v2" ||
  product?.spatialContractVersion !== "2.0.0" ||
  !positiveBounds(product?.poolPlacementCanvas)
) {
  fail("actual-product-contract");
}

const staticPayload = canary.learnerFacingStaticPayload;
const expectedStaticPayload = expectedProduct.staticPayloadIdentity;
const sourceAtStartMatchesExpected =
  staticPayload?.sourceAtStartSha256 === expectedStaticPayload.sha256;
if (
  staticPayload?.policy !== DIVISION_PRODUCT_STATIC_PROJECTION_POLICY ||
  staticPayload?.objectCount !== expectedStaticPayload.objectCount ||
  staticPayload?.expectedSha256 !== expectedStaticPayload.sha256 ||
  !/^[a-f0-9]{64}$/.test(staticPayload?.sourceAtStartSha256 ?? "") ||
  staticPayload?.sourceAtStartMatchesExpected !==
    sourceAtStartMatchesExpected ||
  staticPayload?.persistedSha256 !== expectedStaticPayload.sha256 ||
  staticPayload?.reopenedSha256 !== expectedStaticPayload.sha256 ||
  staticPayload?.secondReadSha256 !== expectedStaticPayload.sha256 ||
  staticPayload?.allPersistedStatesMatchExpected !== true ||
  (readOnlyResume && !sourceAtStartMatchesExpected)
) {
  fail("learner-facing-static-payload");
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
  claims?.verified?.maximumUnitsPerRow !== 8 ||
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

const screenshotDirectory =
  scenario.scenarioKey === "23-by-4"
    ? ".mathcanvas-contract-lab/previews/wave18/division-counting-group"
    : `.mathcanvas-contract-lab/previews/wave18/division-counting-group-${scenario.scenarioKey}`;
const expectedScreenshots = [
  ["initial", "initial.png"],
  ["selected-single-unit", "selected-single-unit.png"],
  ["selected-first-group", "selected-first-four.png"],
  ["ungrouped-first-group", "ungrouped-first-group.png"],
  ["full-grouped", "full-grouped.png"],
  ["reset", "reset.png"],
  ["reopened", "reopened.png"]
].map(([state, file]) => ({
  state,
  path: `${screenshotDirectory}/${file}`
}));
if (
  !Array.isArray(canary.screenshots) ||
  canary.screenshots.length !== expectedScreenshots.length ||
  canary.screenshots.some((entry, index) => {
    const expected = expectedScreenshots[index];
    if (
      !entry ||
      Object.keys(entry).sort().join(",") !== "path,sha256,state" ||
      entry.state !== expected.state ||
      entry.path !== expected.path ||
      isAbsolute(entry.path) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    ) {
      return true;
    }
    const absolutePath = resolve(root, entry.path);
    return (
      !absolutePath.startsWith(`${root}/`) ||
      !existsSync(absolutePath) ||
      fileSha256(absolutePath) !== entry.sha256
    );
  })
) {
  fail("screenshots");
}

process.stdout.write(
  "division-counting-group-canary PASS: native group/ungroup/regroup, positive spatial boxes, save/reopen\n"
);
