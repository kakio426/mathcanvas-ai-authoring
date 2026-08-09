#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  assertNativeSpatialLifecycleEvidence,
  recommendationSchema,
  sha256Hex,
  studentOneScreenGeometryProfileSchema
} from "../../packages/contracts/dist/index.js";
import { resolveCurriculum } from "../../packages/curriculum/dist/index.js";
import {
  assertCognitiveManifestBound,
  findClaimEvidenceBlueprint,
  generateClaimEvidenceActivity
} from "../../packages/templates/dist/index.js";
import {
  compileActivity,
  compileNativeTool,
  analyzeCountingModelStructure,
  getLayoutPreset,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import { validateForCreation } from "../../packages/validator/dist/index.js";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  defaultResearchRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";
import {
  DIVISION_PRODUCT_STATIC_PROJECTION_POLICY,
  divisionProductStaticPayloadIdentity
} from "./lib/division-product-static-projection.mjs";

const origin = "https://mathcanvas.vivasam.com";
const activityId =
  "number.division.quotient-remainder.claim-evidence-v1";
const layoutId = "wave25-division-grouping-v1";
const sourceTitlePrefix = "AI-CONTRACT-PROBE-DIVNATIVE-";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const unitVariantId = "NO01SC-01";
const geometryProfilePath = join(
  repositoryRoot,
  "research/mathcanvas/student-one-screen-geometry-profile.json"
);
const geometryManifestPath = join(
  repositoryRoot,
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
  throw new Error("division-group-pinned-geometry-profile-invalid");
}
let toolBundleSha256;
let toolVersionFingerprint;
const layoutPreset = getLayoutPreset(layoutId);
const layoutContentHash = sha256Hex({ layoutId, preset: layoutPreset });
const layoutPresetContentHash = sha256Hex(layoutPreset);
const canaryLayoutRevision = `layout-${layoutContentHash.slice(0, 16)}`;
const layoutRevisionMarkerId =
  "division-remainder-1-array-border-top";
const productItemId = "division-remainder-1";
const scenarioCatalog = {
  "23-by-4": {
    seed: "division-scenario-7",
    total: 23,
    groupSize: 4,
    quotient: 5,
    remainderCount: 3
  },
  "29-by-7": {
    seed: "division-scenario-0",
    total: 29,
    groupSize: 7,
    quotient: 4,
    remainderCount: 1
  },
  "31-by-6": {
    seed: "division-scenario-4",
    total: 31,
    groupSize: 6,
    quotient: 5,
    remainderCount: 1
  }
};
let scenarioKey = "23-by-4";
let scenarioSeed = scenarioCatalog[scenarioKey].seed;
let total = scenarioCatalog[scenarioKey].total;
let groupSize = scenarioCatalog[scenarioKey].groupSize;
let quotient = scenarioCatalog[scenarioKey].quotient;
let remainderCount = scenarioCatalog[scenarioKey].remainderCount;
let groupMemberIndexSets = [];

function configureScenario(key) {
  const selected = scenarioCatalog[key];
  if (!selected) {
    throw new Error(`division-group-scenario-unsupported:${key}`);
  }
  scenarioKey = key;
  scenarioSeed = selected.seed;
  total = selected.total;
  groupSize = selected.groupSize;
  quotient = selected.quotient;
  remainderCount = selected.remainderCount;
  groupMemberIndexSets = [];
}

configureScenario(scenarioKey);

function resolvedGroupMemberIds(unitIds) {
  return groupMemberIndexSets.map((indexes) =>
    indexes.map((index) => unitIds[index])
  );
}

function resolvedRemainderIds(unitIds) {
  const groupedIndexes = new Set(groupMemberIndexSets.flat());
  return unitIds.filter((_, index) => !groupedIndexes.has(index));
}

function groupTargetSizeProfiles() {
  const lane = layoutBounds(layoutPreset, "item.group-lane");
  // Runtime lane bounds include the four-unit top and bottom borders that
  // flank this token. Mirror that measured envelope instead of pretending the
  // compact token height is the whole usable lane.
  const measuredLaneHeight = lane.height + 8;
  const paddingY = 8;
  const headingHeight = 70;
  const columnGap = 8;
  const rowGap = 8;
  const columnCount = quotient <= 4 ? 2 : 3;
  const width =
    (lane.width - columnGap * (columnCount - 1)) / columnCount;
  const height =
    (measuredLaneHeight - paddingY * 2 - headingHeight - rowGap) / 2;
  return Array.from({ length: quotient }, () => ({ width, height }));
}

function configureGroupMemberIndexSets(contentsJson, unitIds) {
  const byId = new Map(
    contentsJson
      .filter((object) => object?.svgId === unitVariantId)
      .map((object) => [object.id, object])
  );
  unitIds.forEach((id) => {
    const object = byId.get(id);
    if (!object || !Number.isFinite(object.x) || !Number.isFinite(object.y)) {
      throw new Error(`division-group-unit-placement-missing:${id}`);
    }
  });
  // The initial pool remains answer-neutral. During the learner action the
  // emitted native units are taken in stable reading order, moved into a
  // canonical two-row cluster, and only then grouped. Group membership must
  // never depend on an answer-shaped source geometry.
  groupMemberIndexSets = Array.from({ length: quotient }, (_, groupIndex) =>
    Array.from(
      { length: groupSize },
      (_, memberIndex) => groupIndex * groupSize + memberIndex
    )
  );
  const grouped = new Set(groupMemberIndexSets.flat());
  if (
    groupMemberIndexSets.some((indexes) => indexes.length !== groupSize) ||
    groupMemberIndexSets.length !== quotient ||
    unitIds.length - grouped.size !== remainderCount
  ) {
    throw new Error(
      `division-group-scenario-partition-invalid:${JSON.stringify({
        groupSize,
        quotient,
        remainderCount,
        targetSizes: groupTargetSizeProfiles(),
        resolvedGroupCount: groupMemberIndexSets.length
      })}`
    );
  }
}

function projectPath(projectId) {
  return `/api/project/${encodeURIComponent(projectId)}`;
}

function round(value) {
  return Number(value.toFixed(3));
}

function summarizeBounds(bounds) {
  if (!bounds) return null;
  return {
    x: round(bounds.x),
    y: round(bounds.y),
    width: round(bounds.width),
    height: round(bounds.height)
  };
}

function unionBounds(boxes) {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function contains(outer, inner, tolerance = 2) {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

function maxBoundsDrift(left, right) {
  return Math.max(
    Math.abs(left.x - right.x),
    Math.abs(left.y - right.y),
    Math.abs(left.width - right.width),
    Math.abs(left.height - right.height)
  );
}

function normalizedUnitState(contentsJson, unitId) {
  const unit = contentsJson.find((object) => object?.id === unitId);
  if (!unit || unit.svgId !== unitVariantId) {
    throw new Error("division-group-intrinsic-unit-state-missing");
  }
  const state = {
    x: round(Number(unit.x)),
    y: round(Number(unit.y)),
    scale: round(Number(unit.scale ?? 1)),
    rotate: round(Number(unit.rotate ?? 0)),
    isGroup: unit.isGroup === true,
    hasGroupId:
      typeof unit.groupId === "string" && unit.groupId.length > 0
  };
  return {
    ...state,
    persistedMathematicalStateHash: sha256Hex(state)
  };
}

function cssBoundsToCanvas(bounds, referenceCss, referenceCanvas) {
  const scaleX = referenceCss.width / referenceCanvas.width;
  const scaleY = referenceCss.height / referenceCanvas.height;
  if (
    !Number.isFinite(scaleX) ||
    !Number.isFinite(scaleY) ||
    scaleX <= 0 ||
    scaleY <= 0
  ) {
    throw new Error("division-group-canvas-transform-invalid");
  }
  return {
    x: round(
      referenceCanvas.x + (bounds.x - referenceCss.x) / scaleX
    ),
    y: round(
      referenceCanvas.y + (bounds.y - referenceCss.y) / scaleY
    ),
    width: round(bounds.width / scaleX),
    height: round(bounds.height / scaleY)
  };
}

function hasLayoutRevision(contentsJson, revision) {
  return (
    revision === canaryLayoutRevision &&
    contentsJson.some((object) => object?.id === layoutRevisionMarkerId)
  );
}

function hasCurrentLayoutRevision(contentsJson) {
  return hasLayoutRevision(contentsJson, canaryLayoutRevision);
}

function normalizedDivisionState(contentsJson) {
  const units = contentsJson.filter(
    (object) => object?.svgId === unitVariantId
  );
  const wrappers = contentsJson.filter(
    (object) => object?.svgId === "group-element"
  );
  const membership = wrappers.flatMap((wrapper) =>
    Array.isArray(wrapper.ids) ? wrapper.ids : []
  );
  const uniqueMembership = new Set(membership);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const wrapperGroupIds = new Set(
    wrappers
      .map((wrapper) => wrapper.groupId)
      .filter((groupId) => typeof groupId === "string" && groupId.length > 0)
  );
  const membershipValid = wrappers.every(
    (wrapper) =>
      Array.isArray(wrapper.ids) &&
      wrapper.ids.every((id) => {
        const member = unitById.get(id);
        return (
          member?.isGroup === true &&
          typeof member.groupId === "string" &&
          member.groupId.length > 0 &&
          member.groupId === wrapper.groupId
        );
      })
  );
  const nestedGroupCount = membership.filter((id) =>
    wrappers.some((wrapper) => wrapper.id === id)
  ).length;
  const groupedMemberSets = wrappers
    .map((wrapper) =>
      (Array.isArray(wrapper.ids) ? [...wrapper.ids] : [])
        .sort()
        .join("|")
    )
    .sort();
  const ungroupedUnitIds = units
    .filter((unit) => unit.isGroup !== true || !unit.groupId)
    .map((unit) => unit.id)
    .sort();
  const staleGroupReferenceCount = units.filter(
    (unit) =>
      (unit.isGroup === true ||
        (typeof unit.groupId === "string" && unit.groupId.length > 0)) &&
      !wrapperGroupIds.has(unit.groupId)
  ).length;
  const summary = {
    totalUnitCount: units.length,
    wrapperCount: wrappers.length,
    wrapperMemberCounts: wrappers
      .map((wrapper) =>
        Array.isArray(wrapper.ids) ? wrapper.ids.length : 0
      )
      .sort((left, right) => left - right),
    groupedMemberCount: membership.length,
    uniqueGroupedMemberCount: uniqueMembership.size,
    duplicateMembershipCount:
      membership.length - uniqueMembership.size,
    nestedGroupCount,
    ungroupedUnitCount: ungroupedUnitIds.length,
    staleGroupReferenceCount,
    groupedMemberSets,
    ungroupedUnitIds,
    membershipValid
  };
  return {
    ...summary,
    semanticHash: sha256Hex(summary)
  };
}

function isExpectedFinalState(state) {
  return (
    state.totalUnitCount === total &&
    state.wrapperCount === quotient &&
    state.wrapperMemberCounts.length === quotient &&
    state.wrapperMemberCounts.every((count) => count === groupSize) &&
    state.groupedMemberCount === quotient * groupSize &&
    state.uniqueGroupedMemberCount === quotient * groupSize &&
    state.duplicateMembershipCount === 0 &&
    state.nestedGroupCount === 0 &&
    state.ungroupedUnitCount === remainderCount &&
    state.staleGroupReferenceCount === 0 &&
    state.membershipValid === true
  );
}

function nativeObject(intent, id, bounds) {
  const fragment = compileNativeTool(intent, { id, ...bounds });
  if (fragment.kind !== "single") {
    throw new Error(`division-group-single-fragment-required:${id}`);
  }
  return fragment.object;
}

function layoutBounds(preset, tokenKey) {
  const token = preset.tokens[tokenKey];
  if (!token) throw new Error(`division-group-layout-token-missing:${tokenKey}`);
  return {
    x: token.x,
    y: token.y + (token.scope === "item" ? preset.itemOriginY : 0),
    width: token.width,
    height: token.height
  };
}

function buildInjectedContents() {
  const blueprint = findClaimEvidenceBlueprint(activityId);
  if (!blueprint) {
    throw new Error("division-group-product-blueprint-missing");
  }
  const curriculum = resolveCurriculum(blueprint.curriculumBinding.standardCode);
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `division-group-product-canary-${scenarioKey}`,
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
    seed: scenarioSeed,
    generatedAt: "2026-08-08T00:00:00.000Z",
    activityId: `division-native-product-${scenarioKey}`
  });
  assertCognitiveManifestBound(plan.blueprint);
  const item = plan.items[0];
  if (
    plan.items.length !== 1 ||
    item?.values?.countableTotal !== total ||
    item?.values?.countableGroupSize !== groupSize
  ) {
    throw new Error("division-group-product-scenario-seed-drift");
  }
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  const validation = validateForCreation(
    resolved,
    compiled,
    new Date("2026-08-08T00:00:00.000Z")
  );
  if (!validation.canCreate || validation.issues.length > 0) {
    throw new Error(
      `division-group-product-local-validation-failed:${JSON.stringify(
        validation.issues.map(({ code, role, message }) => ({
          code,
          role,
          message
        }))
      )}`
    );
  }
  const pool = resolved.emissions.find(
    (emission) => emission.role === "counting-model-pool"
  );
  if (!pool || pool.id !== `${productItemId}-counting-model-pool`) {
    throw new Error("division-group-product-pool-emission-missing");
  }
  const countingFragment = compileNativeTool(
    {
      kind: pool.toolIntent.kind,
      toolKey: pool.toolIntent.toolKey,
      ...pool.toolIntent.properties
    },
    { id: pool.id, ...pool.bounds }
  );
  if (
    countingFragment.kind !== "multi" ||
    countingFragment.objects.length !== total ||
    Object.hasOwn(countingFragment, "primaryObjectId")
  ) {
    throw new Error("division-group-product-compiler-multi-fragment-invalid");
  }
  const unitIds = countingFragment.objects.map((object) => object.id);
  const compiledUnitIds = compiled.payload.contentsJson
    .filter((object) => object?.svgId === unitVariantId)
    .map((object) => object.id);
  if (JSON.stringify(unitIds) !== JSON.stringify(compiledUnitIds)) {
    throw new Error("division-group-product-unit-order-drift");
  }
  const emittedText = (role) =>
    resolved.emissions.find(
      (emission) => emission.itemId === item.id && emission.role === role
    )?.toolIntent?.properties?.text;
  return {
    contentsJson: compiled.payload.contentsJson,
    unitIds,
    compilerFragment: {
      kind: countingFragment.kind,
      emittedObjectCount: countingFragment.objects.length,
      hasPrimaryObjectId: Object.hasOwn(
        countingFragment,
        "primaryObjectId"
      ),
      requiredModuleKeys: countingFragment.requiredModuleKeys
    },
    lockedIds: compiled.payload.canvasOption.lockIds.flat(),
    canvasOption: compiled.payload.canvasOption,
    canvasBounds: {
      width: resolved.layout.width,
      height: resolved.layout.height
    },
    productContract: {
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      blueprintContentHash: blueprint.contentHash,
      generatorId: blueprint.generator.id,
      generatorVersion: blueprint.generator.version,
      seed: scenarioSeed,
      itemId: item.id,
      questionText: item.values.questionText,
      correctValueText: item.values.correctValueText,
      predictInstructionText: emittedText("instruction-predict"),
      verifyInstructionText: emittedText("instruction-verify"),
      explainInstructionText: emittedText("instruction-explain"),
      groupLaneLabelText: item.values.groupLaneLabelText,
      poolLabelText: emittedText("pool-label"),
      sourceLabelText: emittedText("source-label"),
      remainderLabelText: emittedText("remainder-lane-label"),
      explanationLabelText: emittedText("explanation-label"),
      compiledPayloadHash: compiled.payloadHash,
      compiledProjectTitle: compiled.payload.projectTitle,
      resolvedHash: sha256Hex(resolved),
      localValidationCanCreate: validation.canCreate,
      localValidationIssueCodes: validation.issues.map((issue) => issue.code),
      spatialContractId: pool.toolIntent.spatialContractId,
      spatialContractVersion: pool.toolIntent.spatialContractVersion,
      poolPlacementCanvas: pool.bounds
    }
  };
}

async function waitForAuthentication(page) {
  const status = await page.evaluate(async () => {
    try {
      return (
        await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store"
        })
      ).status;
    } catch {
      return 0;
    }
  });
  if (status !== 200) throw new Error("division-group-canary-auth-required");
}

async function findProject(page, title) {
  return page.evaluate(async (projectTitle) => {
    const query = new URLSearchParams({
      projectTitle,
      offset: "1",
      limit: "100",
      sortCondition: "createdAt",
      sortOrder: "desc"
    });
    const response = await fetch(`/api/project?${query.toString()}`, {
      credentials: "include",
      cache: "no-store"
    });
    const body = await response.json();
    const matches = (body?.list ?? []).filter(
      (project) => project?.projectTitle === projectTitle
    );
    return {
      status: response.status,
      matchCount: matches.length,
      projectId:
        matches.length === 1 ? matches[0]?.projectId : undefined
    };
  }, title);
}

async function readProject(page, projectId) {
  if (!page.url().startsWith(`${origin}/`)) {
    await page.goto(`${origin}/ko`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });
    await waitForAuthentication(page);
  }
  return page.evaluate(async ({ id, baseOrigin }) => {
    const response = await fetch(
      `${baseOrigin}/api/project/${encodeURIComponent(id)}`,
      {
        credentials: "include",
        cache: "no-store"
      }
    );
    if (!response.ok) {
      throw new Error(`division-group-project-read-failed:${response.status}`);
    }
    return response.json();
  }, { id: projectId, baseOrigin: origin });
}

async function openProject(page, projectId, expectedUnitIds) {
  await page.goto(`${origin}/ko/view/${encodeURIComponent(projectId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForFunction(
    (ids) => ids.every((id) => document.getElementById(id)),
    expectedUnitIds,
    { timeout: 30_000 }
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1_000);
}

async function captureServedAssetEvidence(page) {
  const resourceUrls = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => typeof name === "string")
  );
  const scriptUrls = [...new Set(resourceUrls)]
    .filter((value) => {
      const url = new URL(value);
      return (
        url.origin === origin &&
        /\.(?:m?js)(?:$|\?)/i.test(`${url.pathname}${url.search}`)
      );
    })
    .sort();
  if (scriptUrls.length === 0) {
    throw new Error("division-group-served-script-assets-missing");
  }
  const records = [];
  for (const urlValue of scriptUrls) {
    const response = await page.context().request.get(urlValue);
    if (!response.ok()) {
      throw new Error(
        `division-group-served-script-fetch-failed:${response.status()}`
      );
    }
    const body = await response.body();
    const url = new URL(urlValue);
    records.push({
      path: `${url.pathname}${url.search}`,
      sha256: createHash("sha256").update(body).digest("hex")
    });
  }
  return {
    resourceCount: records.length,
    resourcePaths: records.map((record) => record.path),
    sha256: createHash("sha256")
      .update(JSON.stringify(records))
      .digest("hex")
  };
}

async function clickNamedControl(page, label) {
  const control = page
    .locator("div.cursor-pointer")
    .filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) })
    .first();
  if (!(await control.isVisible().catch(() => false))) {
    throw new Error(`division-group-control-missing:${label}`);
  }
  await control.click({ force: true });
  await page.waitForTimeout(300);
}

async function measureVisibleOverlayToolbars(page) {
  const boxes = await page.evaluate(() => {
    const visible = (element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0
      );
    };
    const darkBackground = (value) => {
      const match = value.match(
        /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/
      );
      if (!match) return false;
      const alpha = match[4] === undefined ? 1 : Number(match[4]);
      const luminance =
        Number(match[1]) * 0.2126 +
        Number(match[2]) * 0.7152 +
        Number(match[3]) * 0.0722;
      return alpha >= 0.75 && luminance <= 125;
    };
    const candidates = [...document.querySelectorAll("body *")].flatMap(
      (element) => {
        if (!visible(element)) return [];
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const controlCount = [
          ...element.querySelectorAll(".cursor-pointer, button, [role='button']")
        ].filter(visible).length;
        if (
          bounds.top < window.innerHeight * 0.55 ||
          bounds.width < 180 ||
          bounds.width > 900 ||
          bounds.height < 28 ||
          bounds.height > 110 ||
          controlCount < 3 ||
          !darkBackground(style.backgroundColor)
        ) {
          return [];
        }
        return [
          {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            area: bounds.width * bounds.height,
            controlCount
          }
        ];
      }
    );
    candidates.sort(
      (left, right) => left.area - right.area || left.x - right.x
    );
    const distinct = [];
    for (const candidate of candidates) {
      const duplicate = distinct.some(
        (entry) =>
          Math.abs(entry.x - candidate.x) <= 3 &&
          Math.abs(entry.y - candidate.y) <= 3 &&
          Math.abs(entry.width - candidate.width) <= 6 &&
          Math.abs(entry.height - candidate.height) <= 6
      );
      if (!duplicate) distinct.push(candidate);
    }
    return distinct.slice(0, 4);
  });
  if (boxes.length === 0) {
    throw new Error("division-group-overlay-toolbar-not-measured");
  }
  return boxes.map(({ x, y, width, height }) =>
    summarizeBounds({ x, y, width, height })
  );
}

async function measureReleaseInteractionContext(
  page,
  overlayToolbarBoxes,
  expectedProjectId
) {
  const referenceCss = await borderBounds(page, "array-panel");
  const referenceCanvas = layoutBounds(layoutPreset, "item.array-panel");
  const scaleX = referenceCss.width / referenceCanvas.width;
  const scaleY = referenceCss.height / referenceCanvas.height;
  if (Math.abs(scaleX - scaleY) > 0.002) {
    throw new Error(
      `division-group-nonuniform-render-scale:${scaleX}:${scaleY}`
    );
  }
  const pageState = await page.evaluate(() => {
    const viewBoxCandidates = [...document.querySelectorAll("svg")]
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        const attribute = element
          .getAttribute("viewBox")
          ?.trim()
          .split(/[\s,]+/)
          .map(Number);
        const base = element.viewBox?.baseVal;
        const viewBox =
          Array.isArray(attribute) &&
          attribute.length === 4 &&
          attribute.every(Number.isFinite)
            ? attribute
            : base && base.width > 0 && base.height > 0
              ? [base.x, base.y, base.width, base.height]
              : null;
        return {
          viewBox,
          width: bounds.width,
          height: bounds.height,
          area: bounds.width * bounds.height
        };
      })
      .filter(
        (candidate) =>
          candidate.viewBox &&
          candidate.width >= 600 &&
          candidate.height >= 400
      )
      .sort((left, right) => right.area - left.area);
    const viewBox = viewBoxCandidates[0]?.viewBox ?? null;
    const visible = (element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    };
    const expandedSidebar = [...document.querySelectorAll("body *")].some(
      (element) => {
        if (!visible(element)) return false;
        const bounds = element.getBoundingClientRect();
        return (
          bounds.left <= 12 &&
          bounds.top <= 120 &&
          bounds.width >= 180 &&
          bounds.width <= 320 &&
          bounds.height >= window.innerHeight * 0.7
        );
      }
    );
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      pathname: location.pathname,
      viewBox:
        Array.isArray(viewBox) &&
        viewBox.length === 4 &&
        viewBox.every(Number.isFinite)
          ? viewBox
          : null,
      viewBoxCandidateCount: viewBoxCandidates.length,
      expandedSidebar
    };
  });
  if (
    pageState.viewport.width !== 1280 ||
    pageState.viewport.height !== 800 ||
    pageState.pathname !== `/ko/view/${expectedProjectId}` ||
    !pageState.viewBox ||
    pageState.expandedSidebar !== true
  ) {
    throw new Error(
      `division-group-release-context-invalid:${JSON.stringify(pageState)}`
    );
  }
  const uniqueOverlayToolbarBoxes = [];
  for (const box of overlayToolbarBoxes) {
    if (
      !uniqueOverlayToolbarBoxes.some(
        (candidate) =>
          Math.abs(candidate.x - box.x) <= 1 &&
          Math.abs(candidate.y - box.y) <= 1 &&
          Math.abs(candidate.width - box.width) <= 1 &&
          Math.abs(candidate.height - box.height) <= 1
      )
    ) {
      uniqueOverlayToolbarBoxes.push(box);
    }
  }
  const selectionOverlayCssPx = unionBounds(uniqueOverlayToolbarBoxes);
  if (!selectionOverlayCssPx) {
    throw new Error("division-group-selection-overlay-empty");
  }
  return {
    viewport: pageState.viewport,
    devicePixelRatio: pageState.devicePixelRatio,
    surfaceMode: "authoring-editor",
    sidebarState: "expanded",
    zoomMode: "fit",
    pan: { x: round(pageState.viewBox[0]), y: round(pageState.viewBox[1]) },
    viewBox: pageState.viewBox.map(round),
    canvasUnitsToCssPx: Number(((scaleX + scaleY) / 2).toFixed(6)),
    selectionOverlayCssPx: summarizeBounds(selectionOverlayCssPx),
    overlayToolbarBoxesCssPx:
      uniqueOverlayToolbarBoxes.map(summarizeBounds)
  };
}

async function readSelectedNativeIds(page) {
  return page.evaluate(() => {
    const roots = [...document.querySelectorAll("#app, [data-v-app]")];
    for (const root of roots) {
      const app = root.__vue_app__;
      const provided = app?._context?.provides;
      const candidates = [
        app?.config?.globalProperties?.$pinia,
        ...(provided
          ? Reflect.ownKeys(provided).map((key) => provided[key])
          : [])
      ];
      for (const value of candidates) {
        if (!(value?._s instanceof Map)) continue;
        for (const [storeId, store] of value._s.entries()) {
          const selectedIds = Array.isArray(store?.selected)
            ? store.selected.map((entry) =>
                typeof entry === "string" ? entry : entry?.id
              )
            : Array.isArray(store?.selectedIds)
              ? store.selectedIds
              : Array.isArray(store?.selectCanvasIds)
                ? store.selectCanvasIds
                : null;
          if (
            Array.isArray(selectedIds) &&
            selectedIds.every((id) => typeof id === "string")
          ) {
            return {
              storeId: String(storeId),
              selectedIds: [...selectedIds]
            };
          }
        }
      }
    }
    return null;
  });
}

async function inspectClientStateAccess(page) {
  return page.evaluate(() => {
    const vueElements = [...document.querySelectorAll("*")]
      .map((element) => ({
        tag: element.tagName,
        id: element.id || null,
        vueKeys: Object.getOwnPropertyNames(element).filter((key) =>
          key.startsWith("__vue")
        )
      }))
      .filter((entry) => entry.vueKeys.length > 0)
      .slice(0, 20);
    const app = document.querySelector("#app")?.__vue_app__;
    const provided = app?._context?.provides;
    return {
      windowKeys: Object.getOwnPropertyNames(window)
        .filter((key) => /pinia|vue|store/i.test(key))
        .slice(0, 40),
      vueElements,
      appKeys: app ? Object.keys(app).sort() : [],
      globalPropertyKeys: app?.config?.globalProperties
        ? Object.keys(app.config.globalProperties).sort()
        : [],
      provided: provided
        ? Reflect.ownKeys(provided).map((key) => {
            const value = provided[key];
            return {
              key: String(key),
              valueKeys:
                value && typeof value === "object"
                  ? Object.keys(value).sort().slice(0, 40)
                  : [],
              hasStoreMap: value?._s instanceof Map,
              stores:
                value?._s instanceof Map
                  ? [...value._s.entries()].map(([storeId, store]) => ({
                      storeId: String(storeId),
                      relevantKeys: Object.keys(store)
                        .filter((storeKey) =>
                          /select|object|undo|redo|history/i.test(storeKey)
                        )
                        .sort()
                        .slice(0, 80)
                    }))
                  : []
            };
          })
        : []
    };
  });
}

async function inspectSelectionState(page) {
  return page.evaluate(() => {
    const app = document.querySelector("#app")?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const store = pinia?._s?.get("viewBox");
    const summarize = (value) => {
      if (Array.isArray(value)) {
        return value.map((entry) =>
          typeof entry === "string"
            ? entry
            : entry && typeof entry === "object"
              ? { id: entry.id ?? null, svgId: entry.svgId ?? null }
              : String(entry)
        );
      }
      if (value && typeof value === "object") {
        return {
          id: value.id ?? null,
          svgId: value.svgId ?? null,
          keys: Object.keys(value).sort().slice(0, 40)
        };
      }
      return value ?? null;
    };
    return {
      storeFound: Boolean(store),
      selectCanvasIds: summarize(store?.selectCanvasIds),
      selected: summarize(store?.selected),
      prevObject: summarize(store?.prevObject),
      multiSelectRect: summarize(store?.multiSelectRect),
      stateKeys: store?.$state ? Object.keys(store.$state).sort() : [],
      groupControlVisible: [...document.querySelectorAll("div.cursor-pointer")]
        .some((element) => element.textContent?.trim() === "그룹")
    };
  });
}

async function readClientPayload(page) {
  const contentsJson = await page.evaluate(() => {
    const app = document.querySelector("#app")?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const elements = pinia?._s?.get("viewBox")?.elements;
    if (!Array.isArray(elements)) return null;
    return JSON.parse(JSON.stringify(elements));
  });
  if (!Array.isArray(contentsJson)) {
    throw new Error("division-group-client-elements-unavailable");
  }
  return { contentsJson };
}

async function exerciseReopenedUndo(page) {
  const before = normalizedDivisionState(
    (await readClientPayload(page)).contentsJson
  );
  const invoked = await page.evaluate(() => {
    const app = document.querySelector("#app")?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const history = pinia?._s?.get("history");
    if (typeof history?.undo !== "function") return false;
    history.undo();
    return true;
  });
  await page.waitForTimeout(250);
  const after = normalizedDivisionState(
    (await readClientPayload(page)).contentsJson
  );
  return {
    invoked,
    beforeHash: before.semanticHash,
    afterHash: after.semanticHash,
    mathematicalStateUnchanged: before.semanticHash === after.semanticHash
  };
}

async function assertSelectedNativeIds(page, expectedIds) {
  const selection = await readSelectedNativeIds(page);
  if (!selection) {
    const access = await inspectClientStateAccess(page);
    throw new Error(
      `division-group-selection-store-unavailable:${JSON.stringify(access)}`
    );
  }
  const actual = [...selection.selectedIds].sort();
  const expected = [...expectedIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const diagnostics = await inspectSelectionState(page);
    throw new Error(
      `division-group-selected-id-mismatch:${expected.length}:${actual.length}:${JSON.stringify(diagnostics)}`
    );
  }
  return selection;
}

async function clearSelection(page) {
  await page.keyboard.press("Escape");
  const workbench = await borderBounds(page, "array-panel");
  const blankPoint = await page.evaluate((workbenchBounds) => {
    const rect = {
      left: workbenchBounds.x,
      top: workbenchBounds.y,
      right: workbenchBounds.x + workbenchBounds.width,
      bottom: workbenchBounds.y + workbenchBounds.height,
      width: workbenchBounds.width,
      height: workbenchBounds.height
    };
    const app = document.querySelector("#app")?.__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const elements = pinia?._s?.get("viewBox")?.elements;
    if (!Array.isArray(elements)) return null;
    const occupied = elements.flatMap((object) => {
      const element = document.getElementById(String(object?.id ?? ""));
      if (!element) return [];
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 ? [bounds] : [];
    });
    const left = Math.max(rect.left + 6, 6);
    const right = Math.min(rect.right - 6, window.innerWidth - 6);
    const top = Math.max(rect.top + 6, 6);
    const bottom = Math.min(rect.bottom - 6, window.innerHeight - 6);
    for (let y = bottom; y >= top; y -= 18) {
      for (let x = left; x <= right; x += 18) {
        if (
          occupied.some(
            (bounds) =>
              x >= bounds.left - 3 &&
              x <= bounds.right + 3 &&
              y >= bounds.top - 3 &&
              y <= bounds.bottom + 3
          )
        ) {
          continue;
        }
        const hit = document.elementFromPoint(x, y);
        if (
          hit &&
          !hit.closest(
            "button, input, textarea, [role='button'], .cursor-pointer"
          )
        ) {
          return { x, y };
        }
      }
    }
    return null;
  }, workbench);
  if (!blankPoint) {
    const diagnostics = await page.evaluate((workbenchBounds) => {
      const app = document.querySelector("#app")?.__vue_app__;
      const pinia = app?.config?.globalProperties?.$pinia;
      const elements = pinia?._s?.get("viewBox")?.elements;
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        workbench: workbenchBounds,
        elementCount: Array.isArray(elements) ? elements.length : null
      };
    }, workbench);
    throw new Error(
      `division-group-blank-canvas-point-missing:${JSON.stringify(diagnostics)}`
    );
  }
  await page.mouse.click(blankPoint.x, blankPoint.y);
  await page.waitForTimeout(180);
  const selection = await readSelectedNativeIds(page);
  if (!selection) {
    const access = await inspectClientStateAccess(page);
    throw new Error(
      `division-group-selection-store-unavailable:${JSON.stringify(access)}`
    );
  }
  if (selection.selectedIds.length !== 0) {
    throw new Error(
      `division-group-selection-not-cleared:${selection.selectedIds.length}:${JSON.stringify(selection.selectedIds.slice(0, 8))}`
    );
  }
}

async function selectIdsForGroup(page, ids) {
  await clearSelection(page);
  const boxes = [];
  for (const id of ids) {
    const box = await page.locator(`[id="${id}"]`).first().boundingBox();
    if (!box) throw new Error(`division-group-unit-not-visible:${id}`);
    boxes.push(box);
  }
  const left = Math.min(...boxes.map((box) => box.x)) - 5;
  const top = Math.min(...boxes.map((box) => box.y)) - 5;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + 5;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + 5;
  await page.keyboard.down("Shift");
  try {
    for (const box of boxes) {
      await page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    }
  } finally {
    await page.keyboard.up("Shift");
  }
  await page.waitForTimeout(220);
  await assertSelectedNativeIds(page, ids);
  return summarizeBounds({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  });
}

async function dragTo(page, locator, targetX, targetY) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("division-group-drag-object-not-visible");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(260);
}

async function arrangeNativeMembersInTarget(page, ids, target) {
  const beforeBoxes = [];
  for (const id of ids) {
    const box = await page.locator(`[id="${id}"]`).first().boundingBox();
    if (!box) throw new Error(`division-group-unit-not-visible:${id}`);
    beforeBoxes.push(box);
  }
  const columns = Math.ceil(ids.length / 2);
  const rows = Math.ceil(ids.length / columns);
  const memberWidth = Math.max(...beforeBoxes.map((box) => box.width));
  const memberHeight = Math.max(...beforeBoxes.map((box) => box.height));
  const innerPadding = 6;
  const availableGapX =
    columns <= 1
      ? 0
      : (target.width - innerPadding * 2 - columns * memberWidth) /
        (columns - 1);
  const availableGapY =
    rows <= 1
      ? 0
      : (target.height - innerPadding * 2 - rows * memberHeight) /
        (rows - 1);
  if (availableGapX < 2 || availableGapY < 2) {
    throw new Error(
      `division-group-canonical-cluster-overflow:${JSON.stringify({
        memberCount: ids.length,
        columns,
        rows,
        memberWidth: round(memberWidth),
        memberHeight: round(memberHeight),
        target: summarizeBounds(target),
        availableGapX: round(availableGapX),
        availableGapY: round(availableGapY)
      })}`
    );
  }
  const gapX = Math.min(6, availableGapX);
  const gapY = Math.min(6, availableGapY);
  const clusterWidth = columns * memberWidth + (columns - 1) * gapX;
  const clusterHeight = rows * memberHeight + (rows - 1) * gapY;
  const firstCenterX =
    target.x + (target.width - clusterWidth) / 2 + memberWidth / 2;
  const firstCenterY =
    target.y + (target.height - clusterHeight) / 2 + memberHeight / 2;
  for (const [index, id] of ids.entries()) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    await dragTo(
      page,
      page.locator(`[id="${id}"]`).first(),
      firstCenterX + column * (memberWidth + gapX),
      firstCenterY + row * (memberHeight + gapY)
    );
  }
  const afterBoxes = [];
  for (const id of ids) {
    const box = await page.locator(`[id="${id}"]`).first().boundingBox();
    if (!box) throw new Error(`division-group-unit-not-visible:${id}`);
    afterBoxes.push(box);
  }
  const allMembersInsideTarget = afterBoxes.every((box) =>
    contains(target, box, 3)
  );
  const clusterBounds = unionBounds(afterBoxes);
  if (!allMembersInsideTarget || !clusterBounds) {
    throw new Error(
      `division-group-canonical-cluster-placement-invalid:${JSON.stringify({
        target: summarizeBounds(target),
        clusterBounds: summarizeBounds(clusterBounds),
        allMembersInsideTarget
      })}`
    );
  }
  return {
    columns,
    rows,
    gapXCssPx: round(gapX),
    gapYCssPx: round(gapY),
    clusterBoundsCssPx: summarizeBounds(clusterBounds),
    allMembersInsideTarget
  };
}

async function borderBounds(page, role) {
  const boxFor = async (id) => {
    const box = await page.locator(`[id="${id}"]`).first().boundingBox();
    if (!box) throw new Error(`division-group-border-not-visible:${role}:${id}`);
    return box;
  };
  const prefix = productItemId;
  if (
    role === "array-panel" ||
    role === "source-panel" ||
    role === "group-lane" ||
    role === "remainder-lane"
  ) {
    const [top, bottom, left, right, sourceSeparator, remainderSeparator] =
      await Promise.all([
        boxFor(`${prefix}-array-border-top`),
        boxFor(`${prefix}-array-border-bottom`),
        boxFor(`${prefix}-array-border-left`),
        boxFor(`${prefix}-array-border-right`),
        boxFor(`${prefix}-source-separator`),
        boxFor(`${prefix}-remainder-separator`)
      ]);
    const outer = {
      x: left.x,
      y: top.y,
      width: right.x + right.width - left.x,
      height: bottom.y + bottom.height - top.y
    };
    if (role === "array-panel") return outer;
    if (role === "source-panel") {
      return {
        x: outer.x,
        y: outer.y,
        width: sourceSeparator.x + sourceSeparator.width - outer.x,
        height: outer.height
      };
    }
    if (role === "group-lane") {
      return {
        x: sourceSeparator.x + sourceSeparator.width,
        y: outer.y,
        width:
          remainderSeparator.x -
          (sourceSeparator.x + sourceSeparator.width),
        height: outer.height
      };
    }
    return {
      x: remainderSeparator.x + remainderSeparator.width,
      y: outer.y,
      width:
        outer.x + outer.width -
        (remainderSeparator.x + remainderSeparator.width),
      height: outer.height
    };
  }
  const boxes = [];
  for (const side of ["top", "bottom", "left", "right"]) {
    const id = `${prefix}-${role}-border-${side}`;
    const box = await boxFor(id);
    boxes.push(box);
  }
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function groupTargetEnvelopes(groupLaneBounds, expectedGroupCount = quotient) {
  // Five-quotient cases use five of six stable 3×2 cells. The four-quotient
  // 29÷7 case uses four wider 2×2 cells because a seven-member selected group
  // has four native units in its first row. The source arrangement never
  // chooses these cells, so the target geometry does not pre-state the answer.
  const paddingX = 0;
  const paddingY = groupLaneBounds.height * (8 / 458);
  const headingHeight = groupLaneBounds.height * (70 / 458);
  const columnGap = groupLaneBounds.width * (8 / 764);
  const rowGap = groupLaneBounds.height * (8 / 458);
  const usable = {
    x: groupLaneBounds.x + paddingX,
    y: groupLaneBounds.y + paddingY + headingHeight,
    width: groupLaneBounds.width - paddingX * 2,
    height: groupLaneBounds.height - paddingY * 2 - headingHeight
  };
  const columnCount = expectedGroupCount <= 4 ? 2 : 3;
  const cellWidth =
    (usable.width - columnGap * (columnCount - 1)) / columnCount;
  const cellHeight = (usable.height - rowGap) / 2;
  return Array.from({ length: columnCount * 2 }, (_, index) => {
    const row = Math.floor(index / columnCount);
    const column = index % columnCount;
    return {
      x: usable.x + column * (cellWidth + columnGap),
      y: usable.y + row * (cellHeight + rowGap),
      width: cellWidth,
      height: cellHeight
    };
  }).slice(0, expectedGroupCount);
}

function boxesOverlap(left, right, gap = 0) {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  );
}

async function measureFinalLaneFit(
  page,
  payload,
  remainderIds,
  expectedGroupCount = quotient
) {
  const groupLaneBounds = await borderBounds(page, "group-lane");
  const remainderLaneBounds = await borderBounds(page, "remainder-lane");
  const targetEnvelopes = groupTargetEnvelopes(
    groupLaneBounds,
    Math.max(expectedGroupCount, quotient)
  );
  const groupVisualBoxes = [];
  const groupChromeBoxes = [];
  const overlayToolbarBoxes = [];
  for (const wrapper of payload.contentsJson.filter(
    (object) => object?.svgId === "group-element"
  )) {
    const memberBoxes = [];
    for (const memberId of wrapper.ids ?? []) {
      const memberBox = await page
        .locator(`[id="${memberId}"]`)
        .first()
        .boundingBox();
      if (!memberBox) {
        throw new Error("division-group-member-not-visible");
      }
      memberBoxes.push(memberBox);
    }
    const visualBox = unionBounds(memberBoxes);
    if (!visualBox || visualBox.width <= 0 || visualBox.height <= 0) {
      throw new Error("division-group-visual-box-empty");
    }
    groupVisualBoxes.push(visualBox);

    await clearSelection(page);
    await page.locator(`[id="${wrapper.ids[0]}"]`).first().click({ force: true });
    await page.waitForTimeout(160);
    const chromeBox = await page
      .locator(`[id="${wrapper.id}"]`)
      .first()
      .boundingBox();
    if (!chromeBox || chromeBox.width <= 0 || chromeBox.height <= 0) {
      throw new Error("division-group-chrome-box-empty");
    }
    groupChromeBoxes.push(chromeBox);
    overlayToolbarBoxes.push(...(await measureVisibleOverlayToolbars(page)));
  }
  await clearSelection(page);

  const remainderBoxes = [];
  for (const id of remainderIds) {
    const box = await page.locator(`[id="${id}"]`).first().boundingBox();
    if (!box) throw new Error("division-group-remainder-not-visible");
    remainderBoxes.push(box);
  }
  const allGroupVisualBoxesInsideGroupLane = groupVisualBoxes.every((box) =>
    contains(groupLaneBounds, box)
  );
  const groupLaneLabelBox = await page
    .locator(`[id="${productItemId}-group-lane-label"]`)
    .first()
    .boundingBox();
  const remainderLaneLabelBox = await page
    .locator(`[id="${productItemId}-remainder-lane-label"]`)
    .first()
    .boundingBox();
  if (!groupLaneLabelBox || !remainderLaneLabelBox) {
    throw new Error("division-group-lane-label-box-missing");
  }
  const groupLabelToNearestVisualCssPx = round(
    Math.min(...groupVisualBoxes.map((box) => box.y)) -
      (groupLaneLabelBox.y + groupLaneLabelBox.height)
  );
  const remainderLabelToNearestVisualCssPx =
    remainderBoxes.length > 0
      ? round(
          Math.min(...remainderBoxes.map((box) => box.y)) -
            (remainderLaneLabelBox.y + remainderLaneLabelBox.height)
        )
      : null;
  const allGroupChromeBoxesInsideGroupLane = groupChromeBoxes.every((box) =>
    contains(groupLaneBounds, box)
  );
  const occupiedTargetEnvelopeIndexes = groupVisualBoxes.map(
    (visualBox, index) =>
      targetEnvelopes.findIndex(
        (envelope) =>
          contains(envelope, visualBox) &&
          contains(envelope, groupChromeBoxes[index])
      )
  );
  const uniqueOccupiedTargetEnvelopeIndexes = new Set(
    occupiedTargetEnvelopeIndexes
  );
  const allGroupsInsideDistinctTargetEnvelopes =
    occupiedTargetEnvelopeIndexes.every((index) => index >= 0) &&
    uniqueOccupiedTargetEnvelopeIndexes.size === expectedGroupCount;
  const allGroupChromeBoxesSeparated = groupChromeBoxes.every(
    (left, leftIndex) =>
      groupChromeBoxes.every(
        (right, rightIndex) =>
          leftIndex >= rightIndex || !boxesOverlap(left, right, 4)
      )
  );
  return {
    allWrappersInsideGroupLane:
      allGroupVisualBoxesInsideGroupLane &&
      allGroupChromeBoxesInsideGroupLane,
    allGroupVisualBoxesInsideGroupLane,
    allGroupChromeBoxesInsideGroupLane,
    allGroupsInsideDistinctTargetEnvelopes,
    allGroupChromeBoxesSeparated,
    groupLabelClearancePassed: groupLabelToNearestVisualCssPx >= 6,
    remainderLabelClearancePassed:
      remainderLabelToNearestVisualCssPx === null ||
      remainderLabelToNearestVisualCssPx >= 6,
    groupLabelToNearestVisualCssPx,
    remainderLabelToNearestVisualCssPx,
    occupiedTargetEnvelopeCount:
      uniqueOccupiedTargetEnvelopeIndexes.size,
    emptyTargetEnvelopeCount:
      targetEnvelopes.length - uniqueOccupiedTargetEnvelopeIndexes.size,
    allUngroupedInsideRemainderLane: remainderBoxes.every((box) =>
      contains(remainderLaneBounds, box)
    ),
    groupLaneCssPx: summarizeBounds(groupLaneBounds),
    groupTargetEnvelopeBoxesCssPx: targetEnvelopes.map(summarizeBounds),
    occupiedTargetEnvelopeIndexes: [
      ...uniqueOccupiedTargetEnvelopeIndexes
    ].sort((left, right) => left - right),
    remainderLaneCssPx: summarizeBounds(remainderLaneBounds),
    groupVisualBoxesCssPx: groupVisualBoxes.map(summarizeBounds),
    groupChromeBoxesCssPx: groupChromeBoxes.map(summarizeBounds),
    remainderBoxesCssPx: remainderBoxes.map(summarizeBounds),
    overlayToolbarBoxesCssPx: overlayToolbarBoxes.map(summarizeBounds)
  };
}
async function measureStandaloneUnitSpatial(
  page,
  unitId,
  contentsJson,
  screenshotPath
) {
  await clearSelection(page);
  const unit = page.locator(`[id="${unitId}"]`).first();
  const visualCss = await unit.boundingBox();
  if (!visualCss || visualCss.width <= 0 || visualCss.height <= 0) {
    throw new Error("division-group-intrinsic-visual-box-empty");
  }
  await unit.click({ force: true });
  await page.waitForTimeout(160);
  const chromeCss = await unit.locator(".item-focus").first().boundingBox();
  if (!chromeCss || chromeCss.width <= 0 || chromeCss.height <= 0) {
    throw new Error("division-group-intrinsic-chrome-box-empty");
  }
  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }
  const referenceCss = await borderBounds(page, "array-panel");
  const referenceCanvas = layoutBounds(
    getLayoutPreset(layoutId),
    "item.array-panel"
  );
  const visualBox = cssBoundsToCanvas(
    visualCss,
    referenceCss,
    referenceCanvas
  );
  const chromeBox = cssBoundsToCanvas(
    chromeCss,
    referenceCss,
    referenceCanvas
  );
  const centerX = chromeBox.x + chromeBox.width / 2;
  const centerY = chromeBox.y + chromeBox.height / 2;
  const placement = {
    x: round(centerX - 40),
    y: round(centerY - 40),
    width: 80,
    height: 80
  };
  const reserveBox = {
    x: round(centerX - 42),
    y: round(centerY - 42),
    width: 84,
    height: 84
  };
  const environment = await page.evaluate(() => ({
    devicePixelRatio: window.devicePixelRatio,
    fontFamily: getComputedStyle(document.body).fontFamily
  }));
  await clearSelection(page);
  return {
    placement,
    visualBox,
    chromeBox,
    reserveBox,
    taskEnvelope: reserveBox,
    ...normalizedUnitState(contentsJson, unitId),
    environment: {
      viewport: "1280x800",
      devicePixelRatio: environment.devicePixelRatio,
      fontFingerprint: `sha256:${sha256Hex(environment.fontFamily)}`,
      assetFingerprint: `sha256:${toolBundleSha256}`,
      harnessVersion: "division-counting-group-canary:v10"
    }
  };
}

async function measureCompositionSpatial(
  page,
  payload,
  poolPlacementCanvas,
  chromeCssOverride
) {
  const unitBoxes = [];
  for (const object of payload.contentsJson.filter(
    (candidate) => candidate?.svgId === unitVariantId
  )) {
    const box = await page
      .locator(`[id="${object.id}"]`)
      .first()
      .boundingBox();
    if (!box) {
      throw new Error("division-group-composition-unit-not-visible");
    }
    unitBoxes.push(box);
  }
  const visualCss = unionBounds(unitBoxes);
  const chromeCss = chromeCssOverride ?? visualCss;
  if (!visualCss || !chromeCss) {
    throw new Error("division-group-composition-bounds-empty");
  }
  const referenceCss = await borderBounds(page, "array-panel");
  const referenceCanvas = layoutBounds(
    getLayoutPreset(layoutId),
    "item.array-panel"
  );
  return {
    placement: { ...poolPlacementCanvas },
    visualBox: cssBoundsToCanvas(
      visualCss,
      referenceCss,
      referenceCanvas
    ),
    chromeBox: cssBoundsToCanvas(
      chromeCss,
      referenceCss,
      referenceCanvas
    ),
    reserveBox: { ...referenceCanvas },
    taskEnvelope: { ...referenceCanvas },
    persistedMathematicalStateHash: normalizedDivisionState(
      payload.contentsJson
    ).semanticHash
  };
}

async function measureNativeUnitBoxes(page, unitIds) {
  const boxes = [];
  for (const id of unitIds) {
    const box = await page.locator(`[id="${id}"]`).first().boundingBox();
    if (!box) {
      throw new Error(`division-group-native-unit-box-missing:${id}`);
    }
    boxes.push(summarizeBounds(box));
  }
  return boxes;
}

async function measureClassroomTextClearance(page, sourceUnitBoxesCssPx) {
  const box = async (id) => {
    const bounds = await page.locator(`[id="${id}"]`).first().boundingBox();
    if (!bounds) {
      throw new Error(`division-group-text-clearance-box-missing:${id}`);
    }
    return bounds;
  };
  const textBox = async (id) => {
    const root = page.locator(`[id="${id}"]`).first();
    const outer = await root.boundingBox();
    if (!outer) {
      throw new Error(`division-group-text-clearance-box-missing:${id}`);
    }
    const content = await root.evaluate((element) => {
      const isVisible = (candidate) => {
        const bounds = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || 1) > 0 &&
          bounds.width > 0 &&
          bounds.height > 0
        );
      };
      const preferred = [
        ...element.querySelectorAll("foreignObject .input.textarea")
      ].filter(isVisible);
      const fallback = [
        ...element.querySelectorAll(
          "foreignObject .input, foreignObject textarea, foreignObject input, foreignObject [contenteditable='true']"
        )
      ].filter(isVisible);
      const candidates = preferred.length > 0 ? preferred : fallback;
      const unique = [...new Set(candidates)];
      if (unique.length !== 1) {
        throw new Error(
          `mathcanvas-text-bearing-element-ambiguous:${unique.length}`
        );
      }
      const textElement = unique[0];
      const bounds = textElement.getBoundingClientRect();
      const style = getComputedStyle(textElement);
      return {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        },
        clientWidth: textElement.clientWidth,
        clientHeight: textElement.clientHeight,
        scrollWidth: textElement.scrollWidth,
        scrollHeight: textElement.scrollHeight,
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.parseFloat(style.lineHeight),
        paddingTop: Number.parseFloat(style.paddingTop),
        paddingRight: Number.parseFloat(style.paddingRight),
        paddingBottom: Number.parseFloat(style.paddingBottom),
        paddingLeft: Number.parseFloat(style.paddingLeft)
      };
    });
    return {
      outer,
      content: {
        ...content,
        bounds: summarizeBounds(content.bounds)
      }
    };
  };
  const prefix = productItemId;
  const [
    instructionPredict,
    instructionVerify,
    instructionExplain,
    question,
    choicePanel,
    poolLabel,
    firstChoiceBackdrop,
    predictionBox,
    predictionLabel,
    explanationBox,
    explanationLabel,
    sourceLabel,
    groupLaneLabel,
    remainderLaneLabel,
    arrayPanel,
    sourceLane,
    groupLane,
    remainderLane
  ] = await Promise.all([
    textBox(`${prefix}-instruction-predict`),
    textBox(`${prefix}-instruction-verify`),
    textBox(`${prefix}-instruction-explain`),
    textBox(`${prefix}-question`),
    box(`${prefix}-choice-panel`),
    textBox(`${prefix}-pool-label`),
    box(`${prefix}-position-card-1-backdrop`),
    box(`${prefix}-prediction-box`),
    textBox(`${prefix}-prediction-label`),
    box(`${prefix}-explanation-box`),
    textBox(`${prefix}-explanation-label`),
    textBox(`${prefix}-source-label`),
    textBox(`${prefix}-group-lane-label`),
    textBox(`${prefix}-remainder-lane-label`),
    borderBounds(page, "array-panel"),
    borderBounds(page, "source-panel"),
    borderBounds(page, "group-lane"),
    borderBounds(page, "remainder-lane")
  ]);
  const choicePairs = await Promise.all(
    Array.from({ length: 5 }, async (_, index) => ({
      text: await textBox(`${prefix}-position-card-${index + 1}`),
      backdrop: await box(
        `${prefix}-position-card-${index + 1}-backdrop`
      )
    }))
  );
  const actualBounds = (measured) => measured.content?.bounds ?? measured;
  const textMeasurements = [
    instructionPredict,
    instructionVerify,
    instructionExplain,
    question,
    poolLabel,
    predictionLabel,
    explanationLabel,
    sourceLabel,
    groupLaneLabel,
    remainderLaneLabel,
    ...choicePairs.map(({ text }) => text)
  ];
  const verticalGap = (before, after) =>
    round(
      actualBounds(after).y -
        (actualBounds(before).y + actualBounds(before).height)
    );
  const insets = (container, child) => ({
    top: round(child.y - container.y),
    right: round(
      container.x + container.width - (child.x + child.width)
    ),
    bottom: round(
      container.y + container.height - (child.y + child.height)
    ),
    left: round(child.x - container.x)
  });
  const metrics = {
    instructionPredictToVerifyCssPx: verticalGap(
      instructionPredict,
      instructionVerify
    ),
    instructionVerifyToExplainCssPx: verticalGap(
      instructionVerify,
      instructionExplain
    ),
    instructionExplainToQuestionCssPx: verticalGap(
      instructionExplain,
      question
    ),
    questionToResponseBandCssPx: verticalGap(question, choicePanel),
    instructionFontSizeCanvas: instructionPredict.content.fontSize,
    questionFontSizeCanvas: question.content.fontSize,
    questionToInstructionFontRatio: round(
      question.content.fontSize / instructionPredict.content.fontSize
    ),
    poolLabelInsetsCssPx: insets(
      choicePanel,
      actualBounds(poolLabel)
    ),
    poolLabelToFirstCardCssPx: verticalGap(
      poolLabel,
      firstChoiceBackdrop
    ),
    choiceLineBoxCenterOffsetsCssPx: choicePairs.map(
      ({ text, backdrop }, index) => ({
        choice: index + 1,
        x: round(
          actualBounds(text).x + actualBounds(text).width / 2 -
            (backdrop.x + backdrop.width / 2)
        ),
        y: round(
          actualBounds(text).y + actualBounds(text).height / 2 -
            (backdrop.y + backdrop.height / 2)
        )
      })
    ),
    choiceLineBoxInsetsCssPx: choicePairs.map(
      ({ text, backdrop }, index) => ({
        choice: index + 1,
        ...insets(backdrop, actualBounds(text))
      })
    ),
    textBoxOverflowCanvas: textMeasurements.map((measurement, index) => ({
      index: index + 1,
      vertical: round(
        measurement.content.scrollHeight - measurement.content.clientHeight
      ),
      horizontal: round(
        measurement.content.scrollWidth - measurement.content.clientWidth
      )
    })),
    choiceLineBoxDiagnostics: choicePairs.map(({ text }, index) => ({
      choice: index + 1,
      clientHeight: text.content.clientHeight,
      scrollHeight: text.content.scrollHeight,
      fontSize: text.content.fontSize,
      lineHeight: text.content.lineHeight
    })),
    predictionLabelInsetsCssPx: insets(
      predictionBox,
      actualBounds(predictionLabel)
    ),
    explanationLabelInsetsCssPx: insets(
      explanationBox,
      actualBounds(explanationLabel)
    ),
    sourceLabelTopFromWorkbenchCssPx: round(
      actualBounds(sourceLabel).y - arrayPanel.y
    ),
    sourceLabelToNearestNativeUnitCssPx: round(
      Math.min(
        ...sourceUnitBoxesCssPx
          .filter(
            (unit) =>
              unit.x <
                actualBounds(sourceLabel).x +
                  actualBounds(sourceLabel).width &&
              unit.x + unit.width > actualBounds(sourceLabel).x
          )
          .map(
            (unit) =>
              unit.y -
              (actualBounds(sourceLabel).y +
                actualBounds(sourceLabel).height)
          )
      )
    ),
    groupLabelTopFromWorkbenchCssPx: round(
      actualBounds(groupLaneLabel).y - arrayPanel.y
    ),
    remainderLabelTopFromWorkbenchCssPx: round(
      actualBounds(remainderLaneLabel).y - arrayPanel.y
    ),
    workbenchLabelLaneInsetsCssPx: [
      {
        role: "source-label",
        ...insets(sourceLane, actualBounds(sourceLabel))
      },
      {
        role: "group-lane-label",
        ...insets(groupLane, actualBounds(groupLaneLabel))
      },
      {
        role: "remainder-lane-label",
        ...insets(remainderLane, actualBounds(remainderLaneLabel))
      }
    ]
  };
  const checks = {
    instructionRowsSeparated:
      metrics.instructionPredictToVerifyCssPx >= 12 &&
      metrics.instructionVerifyToExplainCssPx >= 12,
    semanticTitleGap:
      metrics.instructionExplainToQuestionCssPx >= 18 &&
      metrics.questionToResponseBandCssPx >= 10,
    titleHierarchy:
      metrics.questionToInstructionFontRatio >= 1.7,
    textBoxesContainActualLineBoxes:
      metrics.textBoxOverflowCanvas.every(
        ({ vertical, horizontal }) => vertical <= 1 && horizontal <= 1
      ),
    poolLabelPadded:
      metrics.poolLabelInsetsCssPx.top >= 5 &&
      metrics.poolLabelInsetsCssPx.left >= 10 &&
      metrics.poolLabelInsetsCssPx.right >= 10 &&
      metrics.poolLabelToFirstCardCssPx >= 6.5,
    choiceLineBoxesCentered:
      metrics.choiceLineBoxCenterOffsetsCssPx.every(
        ({ x, y }) => Math.abs(x) <= 1 && Math.abs(y) <= 1
      ) &&
      metrics.choiceLineBoxInsetsCssPx.every(
        ({ top, right, bottom, left }) =>
          top >= 4 && right >= 4 && bottom >= 4 && left >= 4
      ),
    writingLabelsPadded:
      metrics.predictionLabelInsetsCssPx.top >= 6 &&
      metrics.predictionLabelInsetsCssPx.left >= 10 &&
      metrics.predictionLabelInsetsCssPx.right >= 10 &&
      metrics.explanationLabelInsetsCssPx.top >= 6 &&
      metrics.explanationLabelInsetsCssPx.left >= 10 &&
      metrics.explanationLabelInsetsCssPx.right >= 10,
    workbenchLabelsPadded:
      metrics.sourceLabelTopFromWorkbenchCssPx >= 10 &&
      metrics.groupLabelTopFromWorkbenchCssPx >= 10 &&
      metrics.remainderLabelTopFromWorkbenchCssPx >= 10,
    workbenchLabelsInsideOwnLanes:
      metrics.workbenchLabelLaneInsetsCssPx.every(
        ({ left, right }) => left >= 1 && right >= 1
      ),
    sourceNativeUnitsClearLabel:
      metrics.sourceLabelToNearestNativeUnitCssPx >= 6
  };
  if (Object.values(checks).some((passed) => passed !== true)) {
    throw new Error(
      `division-group-text-clearance-invalid:${JSON.stringify({
        checks,
        metrics
      })}`
    );
  }
  return { checks, metrics };
}

async function measureFixedChromeTaskClearance(page) {
  const guardCssPx = 8;
  const fixedChrome = await page.evaluate(() => {
    const definitions = {
      top: "#top-toolbar",
      left: "#left-toolbar",
      right: "#right-toolbar",
      bottom: "#bottom-common-toolbar"
    };
    const result = {};
    for (const [role, selector] of Object.entries(definitions)) {
      const candidates = [...document.querySelectorAll(selector)];
      if (candidates.length !== 1) {
        throw new Error(
          `fixed-chrome-selector-ambiguous:${role}:${candidates.length}`
        );
      }
      const element = candidates[0];
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        bounds.width <= 0 ||
        bounds.height <= 0 ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity || 1) <= 0
      ) {
        throw new Error(`fixed-chrome-not-visible:${role}`);
      }
      result[role] = {
        selector,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      };
    }
    return result;
  });
  const prefix = productItemId;
  const taskSurfaces = [
    [
      "instruction-predict",
      await page
        .locator(`[id="${prefix}-instruction-predict"]`)
        .first()
        .boundingBox()
    ],
    [
      "instruction-verify",
      await page
        .locator(`[id="${prefix}-instruction-verify"]`)
        .first()
        .boundingBox()
    ],
    [
      "instruction-explain",
      await page
        .locator(`[id="${prefix}-instruction-explain"]`)
        .first()
        .boundingBox()
    ],
    [
      "question",
      await page
        .locator(`[id="${prefix}-question"]`)
        .first()
        .boundingBox()
    ],
    [
      "choice-panel",
      await page
        .locator(`[id="${prefix}-choice-panel"]`)
        .first()
        .boundingBox()
    ],
    [
      "prediction-box",
      await page
        .locator(`[id="${prefix}-prediction-box"]`)
        .first()
        .boundingBox()
    ],
    [
      "explanation-box",
      await page
        .locator(`[id="${prefix}-explanation-box"]`)
        .first()
        .boundingBox()
    ],
    ["native-workbench", await borderBounds(page, "array-panel")]
  ].map(([role, bounds]) => {
    if (!bounds) {
      throw new Error(`division-group-task-surface-missing:${role}`);
    }
    return { role, bounds };
  });
  const fixedSafeCssPx = {
    x:
      fixedChrome.left.bounds.x +
      fixedChrome.left.bounds.width +
      guardCssPx,
    y:
      fixedChrome.top.bounds.y +
      fixedChrome.top.bounds.height +
      guardCssPx,
    width:
      fixedChrome.right.bounds.x -
      guardCssPx -
      (fixedChrome.left.bounds.x +
        fixedChrome.left.bounds.width +
        guardCssPx),
    height:
      fixedChrome.bottom.bounds.y -
      guardCssPx -
      (fixedChrome.top.bounds.y +
        fixedChrome.top.bounds.height +
        guardCssPx)
  };
  const taskEnvelope = unionBounds(
    taskSurfaces.map(({ bounds }) => bounds)
  );
  if (!taskEnvelope) {
    throw new Error("division-group-task-envelope-empty");
  }
  const inflatedFixedChrome = Object.fromEntries(
    Object.entries(fixedChrome).map(([role, entry]) => [
      role,
      {
        x: entry.bounds.x - guardCssPx,
        y: entry.bounds.y - guardCssPx,
        width: entry.bounds.width + guardCssPx * 2,
        height: entry.bounds.height + guardCssPx * 2
      }
    ])
  );
  const taskWithinFixedSafe = contains(
    fixedSafeCssPx,
    taskEnvelope,
    0.25
  );
  const taskAvoidsInflatedFixedChrome = taskSurfaces.every(
    ({ bounds }) =>
      Object.values(inflatedFixedChrome).every(
        (chrome) => !boxesOverlap(bounds, chrome)
      )
  );
  const result = {
    guardCssPx,
    fixedChrome: Object.fromEntries(
      Object.entries(fixedChrome).map(([role, entry]) => [
        role,
        {
          selector: entry.selector,
          bounds: summarizeBounds(entry.bounds)
        }
      ])
    ),
    fixedSafeCssPx: summarizeBounds(fixedSafeCssPx),
    taskSurfacesCssPx: taskSurfaces.map(({ role, bounds }) => ({
      role,
      bounds: summarizeBounds(bounds)
    })),
    taskEnvelopeCssPx: summarizeBounds(taskEnvelope),
    taskClearanceInsideSafeCssPx: {
      top: round(taskEnvelope.y - fixedSafeCssPx.y),
      right: round(
        fixedSafeCssPx.x + fixedSafeCssPx.width -
          (taskEnvelope.x + taskEnvelope.width)
      ),
      bottom: round(
        fixedSafeCssPx.y + fixedSafeCssPx.height -
          (taskEnvelope.y + taskEnvelope.height)
      ),
      left: round(taskEnvelope.x - fixedSafeCssPx.x)
    },
    checks: {
      exactVisibleFixedChrome: true,
      taskWithinFixedSafe,
      taskAvoidsInflatedFixedChrome
    }
  };
  if (Object.values(result.checks).some((passed) => passed !== true)) {
    throw new Error(
      `division-group-fixed-chrome-clearance-invalid:${JSON.stringify(result)}`
    );
  }
  return result;
}

async function localScreenshot(page, path) {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(120);
  await page.screenshot({ path, fullPage: true });
}

let context;
let authSession;
try {
  const options = parseArguments(process.argv.slice(2), {
    "run-id": { type: "string", required: true },
    scenario: { type: "string", default: "23-by-4" },
    "approve-replace-existing-canary": { type: "boolean", default: false },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "division-counting-group-canary.json"
      )
    },
    "raw-output": {
      type: "string",
      default: join(
        defaultRawRoot,
        "division-counting-group-canary.raw.json"
      )
    },
    "approval-evidence": {
      type: "string",
      default: join(
        defaultRawRoot,
        "division-native-semantic-probe.raw.json"
      )
    },
    "screenshot-dir": {
      type: "string",
      default: join(
        repositoryRoot,
        ".mathcanvas-contract-lab",
        "previews",
        "wave18",
        "division-counting-group"
      )
    },
    "research-root": { type: "string", default: defaultResearchRoot },
    "raw-root": { type: "string", default: defaultRawRoot },
    "state-dir": { type: "string", default: resolveStateDirectory() }
  });
  configureScenario(options.scenario);
  if (options["approve-replace-existing-canary"] !== true) {
    throw new Error("division-group-canary-explicit-approval-required");
  }
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "division group canary evidence"
  );
  const rawOutputPath = assertPathInside(
    options["raw-output"],
    options["raw-root"],
    "division group canary raw evidence"
  );
  const approvalEvidencePath = assertPathInside(
    options["approval-evidence"],
    options["raw-root"],
    "division group canary approval evidence"
  );
  const screenshotDirectory = assertPathInside(
    options["screenshot-dir"],
    join(repositoryRoot, ".mathcanvas-contract-lab", "previews"),
    "division group canary screenshots"
  );
  mkdirSync(screenshotDirectory, { recursive: true, mode: 0o700 });

  let previousPublishedEvidence;
  try {
    previousPublishedEvidence = JSON.parse(readFileSync(outputPath, "utf8"));
  } catch {
    previousPublishedEvidence = undefined;
  }

  const sourceTitle = `${sourceTitlePrefix}${options["run-id"]}`;
  const approvalEvidence = JSON.parse(
    readFileSync(approvalEvidencePath, "utf8")
  );
  if (
    approvalEvidence?.runId !== options["run-id"] ||
    approvalEvidence?.projectTitle !== sourceTitle ||
    approvalEvidence?.sourceProject?.projectTitle !== sourceTitle ||
    typeof approvalEvidence?.projectId !== "string" ||
    approvalEvidence.projectId.length < 4 ||
    approvalEvidence?.evidence?.environment?.externalWriteCount !== 0
  ) {
    throw new Error("division-group-canary-approval-evidence-invalid");
  }
  const approvedProjectId = approvalEvidence.projectId;
  const blockedRequests = [];
  const blockedSavePayloads = [];
  const reopenBlockedRequests = [];
  let injectionEnabled = true;
  let allowNextSave = false;
  let externalWriteCount = 0;
  let injectedReadCount = 0;
  let allowedSavePayload;
  let allowedSaveStatus;
  let saveResolved;
  let projectId;
  let injected;
  let injectedCanvasOption;
  let sourceIdentityVerified = false;
  let sourceServerStateAtStart;
  let priorApprovedSaveObserved = false;
  let priorApprovedVersionCount = 0;
  let resumedFromPriorApprovedSave = false;
  let saveSkippedToAvoidDuplicateWrite = false;
  let reopenProjectReadCount = 0;
  let reopenPutAttemptCount = 0;
  let servedAssetEvidence;
  let expectedStaticPayloadIdentity;
  let sourceStaticPayloadIdentity;

  authSession = await createLiveAuthHeadlessSession(
    resolveStateDirectory(options["state-dir"])
  );
  context = await authSession.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    if (
      injectionEnabled &&
      injected &&
      projectId &&
      method === "GET" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      const response = await route.fetch();
      const body = await response.json();
      body.contentsJson = injected.contentsJson;
      body.contentsJsonLength = injected.contentsJson.length;
      body.canvasOption = injectedCanvasOption;
      injectedReadCount += 1;
      await route.fulfill({
        response,
        contentType: "application/json",
        body: JSON.stringify(body)
      });
      return;
    }
    if (
      projectId &&
      method === "PUT" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      const payload = request.postDataJSON();
      if (allowNextSave && externalWriteCount === 0) {
        if (!sourceIdentityVerified || projectId !== approvedProjectId) {
          throw new Error("division-group-save-target-not-approved");
        }
        const response = await route.fetch();
        allowedSaveStatus = response.status();
        if (response.ok()) {
          externalWriteCount += 1;
          allowedSavePayload = payload;
          allowNextSave = false;
          injectionEnabled = false;
        }
        await route.fulfill({ response });
        saveResolved?.();
        return;
      }
      blockedSavePayloads.push(payload);
    }
    if (safeMethods.has(method)) {
      await route.continue();
      return;
    }
    blockedRequests.push({
      method,
      path: url.origin === origin ? url.pathname : `${url.origin}${url.pathname}`
    });
    await route.abort("blockedbyclient");
  });

  const discoveryPage = await context.newPage();
  await discoveryPage.goto(`${origin}/ko`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await waitForAuthentication(discoveryPage);
  const found = await findProject(discoveryPage, sourceTitle);
  if (
    found.status !== 200 ||
    found.matchCount !== 1 ||
    typeof found.projectId !== "string" ||
    found.projectId !== approvedProjectId
  ) {
    throw new Error(
      `division-group-source-project-invalid:${JSON.stringify({
        status: found.status,
        matchCount: found.matchCount
      })}`
    );
  }
  projectId = found.projectId;
  const sourceProject = await readProject(discoveryPage, projectId);
  const sourceTags = new Set(
    Array.isArray(sourceProject.tags) ? sourceProject.tags : []
  );
  const approvedSourceTags = new Set([
    "NO01SC",
    "NO01NR",
    "NO07IC",
    "NO04NG"
  ]);
  if (
    sourceProject.projectTitle !== sourceTitle ||
    !sourceTitle.startsWith(sourceTitlePrefix) ||
    !sourceTags.has("NO01SC") ||
    [...sourceTags].some((tag) => !approvedSourceTags.has(tag))
  ) {
    throw new Error(
      `division-group-source-project-marker-invalid:${JSON.stringify({
        titleMatches: sourceProject.projectTitle === sourceTitle,
        titleHasDisposablePrefix: String(
          sourceProject.projectTitle ?? ""
        ).startsWith(sourceTitlePrefix),
        tags: [...sourceTags].sort(),
        contentsJsonLength: sourceProject.contentsJsonLength ??
          sourceProject.contentsJson?.length ??
          null
      })}`
    );
  }
  sourceIdentityVerified = true;
  sourceServerStateAtStart = normalizedDivisionState(
    sourceProject.contentsJson ?? []
  );
  injected = buildInjectedContents();
  expectedStaticPayloadIdentity = divisionProductStaticPayloadIdentity(
    injected.contentsJson
  );
  sourceStaticPayloadIdentity = divisionProductStaticPayloadIdentity(
    sourceProject.contentsJson ?? []
  );
  configureGroupMemberIndexSets(injected.contentsJson, injected.unitIds);
  const countingStructureAnalysis = analyzeCountingModelStructure(
    injected.contentsJson
      .filter((object) => object?.svgId === unitVariantId)
      .map((object) => ({ x: Number(object.x), y: Number(object.y) })),
    {
      groupSize,
      quotient,
      supportedGroupSizes: [4, 6, 7]
    }
  );
  if (countingStructureAnalysis.answerStructureLeaked) {
    throw new Error(
      `division-group-initial-structure-leak:${JSON.stringify(
        countingStructureAnalysis
      )}`
    );
  }
  const previousLayoutRevision =
    previousPublishedEvidence?.layoutRevision;
  const previousApprovedVersionCount = Number(
    previousPublishedEvidence?.writeBoundary?.cumulativeApprovedSaveCount ?? 0
  );
  if (
    isExpectedFinalState(sourceServerStateAtStart) &&
    typeof previousLayoutRevision === "string" &&
    previousLayoutRevision.length > 0 &&
    Number.isInteger(previousApprovedVersionCount) &&
    previousApprovedVersionCount > 0 &&
    hasLayoutRevision(
      sourceProject.contentsJson ?? [],
      previousLayoutRevision
    )
  ) {
    priorApprovedVersionCount = previousApprovedVersionCount;
  }
  priorApprovedSaveObserved = priorApprovedVersionCount > 0;
  resumedFromPriorApprovedSave =
    priorApprovedSaveObserved &&
    hasCurrentLayoutRevision(sourceProject.contentsJson ?? []) &&
    sourceStaticPayloadIdentity.objectCount ===
      expectedStaticPayloadIdentity.objectCount &&
    sourceStaticPayloadIdentity.sha256 ===
      expectedStaticPayloadIdentity.sha256;
  injectedCanvasOption = {
    ...structuredClone(injected.canvasOption),
    lockIds: injected.lockedIds.map((id) => [id])
  };
  await discoveryPage.close();

  const persistCurrentState = async (page) => {
    if (resumedFromPriorApprovedSave) {
      saveSkippedToAvoidDuplicateWrite = true;
      injectionEnabled = false;
      return;
    }
    allowNextSave = true;
    const saved = new Promise((resolve) => {
      saveResolved = resolve;
    });
    await clickNamedControl(page, "저장");
    await Promise.race([
      saved,
      new Promise((resolve) => setTimeout(resolve, 8_000))
    ]);
    saveResolved = undefined;
    if (externalWriteCount !== 1 || allowedSaveStatus < 200 || allowedSaveStatus >= 300) {
      throw new Error(
        `division-group-persist-failed:${allowedSaveStatus ?? "missing"}`
      );
    }
  };

  const exerciseUngroupRegroup = async (
    page,
    groupedPayload,
    captureUngroupedPath,
    revisionReturnTargets,
    groupTargetBounds
  ) => {
    const memberIds = resolvedGroupMemberIds(injected.unitIds)[0];
    const memberSet = new Set(memberIds);
    const wrapper = groupedPayload.contentsJson.find(
      (object) =>
        object?.svgId === "group-element" &&
        Array.isArray(object.ids) &&
        object.ids.length === memberIds.length &&
        object.ids.every((id) => memberSet.has(id))
    );
    if (!wrapper) {
      throw new Error("division-group-revision-wrapper-missing");
    }
    if (captureUngroupedPath) {
      await localScreenshot(
        page,
        captureUngroupedPath.replace(
          "ungrouped-first-group",
          "grouped-before-ungroup-debug"
        )
      );
    }
    await clearSelection(page);
    const memberLocator = page.locator(`[id="${memberIds[0]}"]`).first();
    if (!(await memberLocator.isVisible().catch(() => false))) {
      throw new Error("division-group-revision-member-not-visible");
    }
    await memberLocator.click({ force: true });
    await page.waitForTimeout(180);
    const groupSelection = await readSelectedNativeIds(page);
    const allowedSelectionIds = new Set([wrapper.id, ...memberIds]);
    if (
      !groupSelection ||
      groupSelection.selectedIds.length === 0 ||
      groupSelection.selectedIds.some((id) => !allowedSelectionIds.has(id))
    ) {
      throw new Error("division-group-revision-selection-invalid");
    }
    await clickNamedControl(page, "그룹 해제");
    for (const [index, id] of memberIds.entries()) {
      const target = revisionReturnTargets[index];
      await dragTo(
        page,
        page.locator(`[id="${id}"]`).first(),
        target.x,
        target.y
      );
    }
    const ungroupedPayload = await readClientPayload(page);
    const ungroupedState = normalizedDivisionState(
      ungroupedPayload.contentsJson
    );
    const releasedMembers = ungroupedPayload.contentsJson.filter((object) =>
      memberSet.has(object?.id)
    );
    if (
      ungroupedState.wrapperCount !== quotient - 1 ||
      ungroupedState.groupedMemberCount !== (quotient - 1) * groupSize ||
      ungroupedState.ungroupedUnitCount !== remainderCount + groupSize ||
      ungroupedState.duplicateMembershipCount !== 0 ||
      ungroupedState.nestedGroupCount !== 0 ||
      ungroupedState.staleGroupReferenceCount !== 0 ||
      releasedMembers.length !== groupSize ||
      releasedMembers.some(
        (member) =>
          member.isGroup === true ||
          (typeof member.groupId === "string" && member.groupId.length > 0)
      )
    ) {
      throw new Error("division-group-native-ungroup-invalid");
    }
    const sourceBounds = await borderBounds(page, "source-panel");
    const releasedMemberBoxes = [];
    for (const id of memberIds) {
      const box = await page.locator(`[id="${id}"]`).first().boundingBox();
      if (!box) throw new Error("division-group-released-member-not-visible");
      releasedMemberBoxes.push(box);
    }
    const ungroupedLaneFit = await measureFinalLaneFit(
      page,
      ungroupedPayload,
      resolvedRemainderIds(injected.unitIds),
      quotient - 1
    );
    const releasedMembersReturnedToSource = releasedMemberBoxes.every((box) =>
      contains(sourceBounds, box)
    );
    const vacatedFirstGroupTarget =
      !ungroupedLaneFit.occupiedTargetEnvelopeIndexes.includes(0);
    if (captureUngroupedPath) {
      await localScreenshot(page, captureUngroupedPath);
    }
    if (
      !releasedMembersReturnedToSource ||
      !vacatedFirstGroupTarget ||
      ungroupedLaneFit.occupiedTargetEnvelopeCount !== quotient - 1 ||
      ungroupedLaneFit.emptyTargetEnvelopeCount !== 1 ||
      ungroupedLaneFit.allGroupsInsideDistinctTargetEnvelopes !== true ||
      ungroupedLaneFit.allGroupChromeBoxesSeparated !== true ||
      ungroupedLaneFit.groupLabelClearancePassed !== true ||
      ungroupedLaneFit.remainderLabelClearancePassed !== true
    ) {
      throw new Error(
        `division-group-native-ungroup-visual-transition-invalid:${JSON.stringify({
          releasedMembersReturnedToSource,
          vacatedFirstGroupTarget,
          occupiedTargetEnvelopeCount:
            ungroupedLaneFit.occupiedTargetEnvelopeCount,
          emptyTargetEnvelopeCount:
            ungroupedLaneFit.emptyTargetEnvelopeCount,
          allGroupsInsideDistinctTargetEnvelopes:
            ungroupedLaneFit.allGroupsInsideDistinctTargetEnvelopes,
          occupiedTargetEnvelopeIndexes:
            ungroupedLaneFit.occupiedTargetEnvelopeIndexes,
          allGroupVisualBoxesInsideGroupLane:
            ungroupedLaneFit.allGroupVisualBoxesInsideGroupLane,
          allGroupChromeBoxesInsideGroupLane:
            ungroupedLaneFit.allGroupChromeBoxesInsideGroupLane,
          groupTargetEnvelopeBoxesCssPx:
            ungroupedLaneFit.groupTargetEnvelopeBoxesCssPx,
          groupVisualBoxesCssPx: ungroupedLaneFit.groupVisualBoxesCssPx,
          groupChromeBoxesCssPx: ungroupedLaneFit.groupChromeBoxesCssPx
        })}`
      );
    }
    await arrangeNativeMembersInTarget(
      page,
      memberIds,
      groupTargetBounds[0]
    );
    await selectIdsForGroup(page, memberIds);
    await clickNamedControl(page, "그룹");
    const regroupedPayload = await readClientPayload(page);
    const regroupedWrapper = regroupedPayload.contentsJson.find(
      (object) =>
        object?.svgId === "group-element" &&
        Array.isArray(object.ids) &&
        object.ids.length === memberIds.length &&
        object.ids.every((id) => memberSet.has(id))
    );
    if (!regroupedWrapper) {
      throw new Error("division-group-native-regroup-wrapper-missing");
    }
    const regroupedState = normalizedDivisionState(
      regroupedPayload.contentsJson
    );
    if (
      regroupedState.wrapperCount !== quotient ||
      regroupedState.wrapperMemberCounts.length !== quotient ||
      regroupedState.wrapperMemberCounts.some((count) => count !== groupSize) ||
      regroupedState.groupedMemberCount !== quotient * groupSize ||
      regroupedState.ungroupedUnitCount !== remainderCount ||
      regroupedState.duplicateMembershipCount !== 0 ||
      regroupedState.nestedGroupCount !== 0 ||
      regroupedState.staleGroupReferenceCount !== 0 ||
      !regroupedState.membershipValid
    ) {
      throw new Error("division-group-native-regroup-invalid");
    }
    return {
      ungroupedPayload,
      ungroupedState,
      ungroupedLaneFit,
      releasedMembersReturnedToSource,
      vacatedFirstGroupTarget,
      regroupedPayload,
      regroupedState
    };
  };

  const buildFullState = async (
    page,
    captureSelectedPath,
    captureUngroupedPath
  ) => {
    const groupLaneBounds = await borderBounds(page, "group-lane");
    const remainderLaneBounds = await borderBounds(page, "remainder-lane");
    const groupTargetBounds = groupTargetEnvelopes(
      groupLaneBounds,
      quotient
    );
    if (!groupLaneBounds || !remainderLaneBounds) {
      throw new Error("division-group-lane-not-visible");
    }
    const groupMemberIds = resolvedGroupMemberIds(injected.unitIds);
    const revisionReturnTargets = [];
    for (const id of groupMemberIds[0]) {
      const box = await page.locator(`[id="${id}"]`).first().boundingBox();
      if (!box) throw new Error("division-group-revision-target-missing");
      revisionReturnTargets.push({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      });
    }
    let selectedChromeBox;
    let selectedCompositionSpatial;
    let selectedOverlayToolbarBoxes = [];
    const formationEvidence = [];
    const emittedUnitsById = new Map(
      injected.contentsJson
        .filter((object) => object?.svgId === unitVariantId)
        .map((object) => [object.id, object])
    );
    for (let groupIndex = 0; groupIndex < quotient; groupIndex += 1) {
      const memberIds = groupMemberIds[groupIndex];
      const beforeGrouping = await readClientPayload(page);
      const beforeById = new Map(
        beforeGrouping.contentsJson.map((object) => [object?.id, object])
      );
      const sourcePlacementVerified = memberIds.every((id) => {
        const emitted = emittedUnitsById.get(id);
        const current = beforeById.get(id);
        return (
          emitted?.svgId === unitVariantId &&
          current?.svgId === unitVariantId &&
          current.isGroup !== true &&
          !current.groupId &&
          Math.abs(Number(current.x) - Number(emitted.x)) <= 1 &&
          Math.abs(Number(current.y) - Number(emitted.y)) <= 1
        );
      });
      if (!sourcePlacementVerified) {
        throw new Error(
          `division-group-source-placement-drift:${groupIndex + 1}`
        );
      }
      const target = groupTargetBounds[groupIndex];
      const canonicalCluster = await arrangeNativeMembersInTarget(
        page,
        memberIds,
        target
      );
      formationEvidence.push({
        groupIndex: groupIndex + 1,
        memberIds: [...memberIds],
        sourcePlacementVerified,
        formedByNativeDrag: true,
        ...canonicalCluster
      });
      const selected = await selectIdsForGroup(page, memberIds);
      if (groupIndex === 0) {
        selectedChromeBox = selected;
        selectedOverlayToolbarBoxes =
          await measureVisibleOverlayToolbars(page);
        selectedCompositionSpatial = await measureCompositionSpatial(
          page,
          await readClientPayload(page),
          injected.productContract.poolPlacementCanvas,
          selected
        );
        if (captureSelectedPath) {
          await page.screenshot({ path: captureSelectedPath, fullPage: true });
        }
      }
      await clickNamedControl(page, "그룹");
      const payload = await readClientPayload(page);
      const memberSet = new Set(memberIds);
      const wrapper = payload.contentsJson.find(
        (object) =>
          object?.svgId === "group-element" &&
          Array.isArray(object.ids) &&
          object.ids.length === memberIds.length &&
          object.ids.every((id) => memberSet.has(id))
      );
      if (!wrapper) {
        throw new Error(`division-group-wrapper-missing:${groupIndex + 1}`);
      }
    }
    const remainderIds = resolvedRemainderIds(injected.unitIds);
    for (const [index, id] of remainderIds.entries()) {
      await dragTo(
        page,
        page.locator(`[id="${id}"]`).first(),
        remainderLaneBounds.x + remainderLaneBounds.width * 0.5,
        remainderLaneBounds.y + remainderLaneBounds.height * (0.36 + index * 0.2)
      );
    }
    const groupedPayload = await readClientPayload(page);
    const groupedState = normalizedDivisionState(groupedPayload.contentsJson);
    const revision = await exerciseUngroupRegroup(
      page,
      groupedPayload,
      captureUngroupedPath,
      revisionReturnTargets,
      groupTargetBounds
    );
    const payload = revision.regroupedPayload;
    const state = revision.regroupedState;
    const laneFit = await measureFinalLaneFit(page, payload, remainderIds);
    const compositionSpatial = await measureCompositionSpatial(
      page,
      payload,
      injected.productContract.poolPlacementCanvas,
      unionBounds([
        ...laneFit.groupChromeBoxesCssPx,
        ...laneFit.remainderBoxesCssPx
      ])
    );
    return {
      payload,
      state,
      groupedState,
      ungroupedState: revision.ungroupedState,
      ungroupedLaneFit: revision.ungroupedLaneFit,
      releasedMembersReturnedToSource:
        revision.releasedMembersReturnedToSource,
      vacatedFirstGroupTarget: revision.vacatedFirstGroupTarget,
      regroupedState: revision.regroupedState,
      formationEvidence,
      selectedChromeBox,
      selectedOverlayToolbarBoxes,
      selectedCompositionSpatial,
      compositionSpatial,
      laneFit
    };
  };

  const initialPage = await context.newPage();
  await openProject(initialPage, projectId, injected.unitIds);
  servedAssetEvidence = await captureServedAssetEvidence(initialPage);
  toolBundleSha256 = servedAssetEvidence.sha256;
  toolVersionFingerprint = `bundle:${toolBundleSha256}:${unitVariantId}`;
  const initialState = normalizedDivisionState(injected.contentsJson);
  const initialCompositionSpatial = await measureCompositionSpatial(
    initialPage,
    { contentsJson: injected.contentsJson },
    injected.productContract.poolPlacementCanvas
  );
  const initialOverlayToolbarBoxes =
    await measureVisibleOverlayToolbars(initialPage);
  const initialUnitBoxesCssPx = await measureNativeUnitBoxes(
    initialPage,
    injected.unitIds
  );
  let classroomTextClearance = await measureClassroomTextClearance(
    initialPage,
    initialUnitBoxesCssPx
  );
  const initialFixedChromeTaskClearance =
    await measureFixedChromeTaskClearance(initialPage);
  const intrinsicUnitId = resolvedRemainderIds(injected.unitIds)[0];
  const initialPath = join(screenshotDirectory, "initial.png");
  await localScreenshot(initialPage, initialPath);
  const selectedSinglePath = join(
    screenshotDirectory,
    "selected-single-unit.png"
  );
  const intrinsicInitialSelected = await measureStandaloneUnitSpatial(
    initialPage,
    intrinsicUnitId,
    injected.contentsJson,
    selectedSinglePath
  );
  const selectedPath = join(screenshotDirectory, "selected-first-four.png");
  const ungroupedPath = join(screenshotDirectory, "ungrouped-first-group.png");
  const manipulated = await buildFullState(
    initialPage,
    selectedPath,
    ungroupedPath
  );
  const selectedSourceLabel = await initialPage
    .locator(`[id="${productItemId}-source-label"]`)
    .first()
    .boundingBox();
  if (!selectedSourceLabel || !manipulated.selectedChromeBox) {
    throw new Error("division-group-selected-source-clearance-box-missing");
  }
  const selectedSourceLabelGapCssPx = round(
    manipulated.selectedChromeBox.y -
      (selectedSourceLabel.y + selectedSourceLabel.height)
  );
  classroomTextClearance = {
    checks: {
      ...classroomTextClearance.checks,
      selectedSourceGroupClearsLabel: selectedSourceLabelGapCssPx >= 6
    },
    metrics: {
      ...classroomTextClearance.metrics,
      selectedSourceLabelGapCssPx
    }
  };
  if (
    Object.values(classroomTextClearance.checks).some(
      (passed) => passed !== true
    )
  ) {
    throw new Error(
      `division-group-selected-source-clearance-invalid:${JSON.stringify(
        classroomTextClearance
      )}`
    );
  }
  const releaseInteractionContext = await measureReleaseInteractionContext(
    initialPage,
    [
      ...initialOverlayToolbarBoxes,
      ...manipulated.selectedOverlayToolbarBoxes,
      ...manipulated.laneFit.overlayToolbarBoxesCssPx
    ],
    projectId
  );
  const nativeBoxesCheckedAgainstOverlay = [
    ...initialUnitBoxesCssPx,
    ...manipulated.laneFit.groupVisualBoxesCssPx,
    ...manipulated.laneFit.groupChromeBoxesCssPx,
    ...manipulated.laneFit.remainderBoxesCssPx
  ];
  const nativeOverlayIntersections = nativeBoxesCheckedAgainstOverlay.filter(
    (box) => boxesOverlap(box, releaseInteractionContext.selectionOverlayCssPx)
  );
  if (nativeOverlayIntersections.length > 0) {
    throw new Error(
      `division-group-native-overlay-intersection:${JSON.stringify({
        overlay: releaseInteractionContext.selectionOverlayCssPx,
        intersections: nativeOverlayIntersections
      })}`
    );
  }
  const manipulatedPath = join(screenshotDirectory, "full-grouped.png");
  await localScreenshot(initialPage, manipulatedPath);
  await initialPage.close();

  const resetPage = await context.newPage();
  await openProject(resetPage, projectId, injected.unitIds);
  const resetState = normalizedDivisionState(injected.contentsJson);
  const resetCompositionSpatial = await measureCompositionSpatial(
    resetPage,
    { contentsJson: injected.contentsJson },
    injected.productContract.poolPlacementCanvas
  );
  const intrinsicUndoReset = await measureStandaloneUnitSpatial(
    resetPage,
    intrinsicUnitId,
    injected.contentsJson
  );
  const resetPath = join(screenshotDirectory, "reset.png");
  await localScreenshot(resetPage, resetPath);
  await resetPage.close();

  const persistPage = await context.newPage();
  await openProject(persistPage, projectId, injected.unitIds);
  const persistedBeforeSave = await buildFullState(persistPage);
  const intrinsicManipulated = await measureStandaloneUnitSpatial(
    persistPage,
    intrinsicUnitId,
    persistedBeforeSave.payload.contentsJson
  );
  await persistCurrentState(persistPage);
  await persistPage.close();

  const serverPage = await context.newPage();
  const persistedProject = await readProject(serverPage, projectId);
  const persistedState = normalizedDivisionState(
    persistedProject.contentsJson ?? []
  );
  const persistedStaticPayloadIdentity =
    divisionProductStaticPayloadIdentity(
      persistedProject.contentsJson ?? []
    );
  await serverPage.close();

  await context.close();
  context = await authSession.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    if (
      method === "GET" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      reopenProjectReadCount += 1;
    }
    if (
      method === "PUT" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      reopenPutAttemptCount += 1;
    }
    if (safeMethods.has(method)) {
      await route.continue();
      return;
    }
    reopenBlockedRequests.push({
      method,
      path: url.origin === origin ? url.pathname : `${url.origin}${url.pathname}`
    });
    await route.abort("blockedbyclient");
  });

  const reopenedPage = await context.newPage();
  await openProject(reopenedPage, projectId, injected.unitIds);
  const reopenedPath = join(screenshotDirectory, "reopened.png");
  const reopenedPayload = await readClientPayload(reopenedPage);
  const reopenedState = normalizedDivisionState(reopenedPayload.contentsJson);
  const reopenedStaticPayloadIdentity =
    divisionProductStaticPayloadIdentity(reopenedPayload.contentsJson);
  const intrinsicReopened = await measureStandaloneUnitSpatial(
    reopenedPage,
    intrinsicUnitId,
    reopenedPayload.contentsJson
  );
  const reopenedLaneFit = await measureFinalLaneFit(
    reopenedPage,
    reopenedPayload,
    resolvedRemainderIds(injected.unitIds)
  );
  const reopenedReleaseInteractionContext =
    await measureReleaseInteractionContext(
      reopenedPage,
      [
        ...reopenedLaneFit.overlayToolbarBoxesCssPx,
        ...manipulated.selectedOverlayToolbarBoxes
      ],
      projectId
    );
  const reopenedFixedChromeTaskClearance =
    await measureFixedChromeTaskClearance(reopenedPage);
  const fixedChromeTaskClearanceStableAfterReopen =
    maxBoundsDrift(
      initialFixedChromeTaskClearance.fixedSafeCssPx,
      reopenedFixedChromeTaskClearance.fixedSafeCssPx
    ) <= 1 &&
    maxBoundsDrift(
      initialFixedChromeTaskClearance.taskEnvelopeCssPx,
      reopenedFixedChromeTaskClearance.taskEnvelopeCssPx
    ) <= 1;
  for (const fixedChromeRecord of [
    initialFixedChromeTaskClearance,
    reopenedFixedChromeTaskClearance
  ]) {
    if (
      fixedChromeRecord.guardCssPx !== geometryProfile.guardCssPx ||
      maxBoundsDrift(
        fixedChromeRecord.fixedSafeCssPx,
        geometryProfile.fixedSafeCss
      ) > geometryProfile.tolerance.geometryCssPx
    ) {
      throw new Error(
        "division-group-fixed-chrome-not-bound-to-pinned-geometry-profile"
      );
    }
  }
  const reopenedNativeOverlayIntersections = [
    ...reopenedLaneFit.groupVisualBoxesCssPx,
    ...reopenedLaneFit.groupChromeBoxesCssPx,
    ...reopenedLaneFit.remainderBoxesCssPx
  ].filter((box) =>
    boxesOverlap(box, releaseInteractionContext.selectionOverlayCssPx)
  );
  const reopenedCompositionSpatial = await measureCompositionSpatial(
    reopenedPage,
    reopenedPayload,
    injected.productContract.poolPlacementCanvas,
    unionBounds([
      ...reopenedLaneFit.groupChromeBoxesCssPx,
      ...reopenedLaneFit.remainderBoxesCssPx
    ])
  );
  await localScreenshot(reopenedPage, reopenedPath);
  const reopenedUndo = await exerciseReopenedUndo(reopenedPage);
  await reopenedPage.close();

  const secondReadPage = await context.newPage();
  const secondRead = await readProject(secondReadPage, projectId);
  const secondReadState = normalizedDivisionState(secondRead.contentsJson ?? []);
  const secondReadStaticPayloadIdentity =
    divisionProductStaticPayloadIdentity(secondRead.contentsJson ?? []);
  await secondReadPage.close();

  for (const identity of [
    persistedStaticPayloadIdentity,
    reopenedStaticPayloadIdentity,
    secondReadStaticPayloadIdentity
  ]) {
    if (
      identity.policy !== DIVISION_PRODUCT_STATIC_PROJECTION_POLICY ||
      identity.objectCount !== expectedStaticPayloadIdentity.objectCount ||
      identity.sha256 !== expectedStaticPayloadIdentity.sha256
    ) {
      throw new Error(
        `division-group-static-payload-drift:${JSON.stringify({
          expected: expectedStaticPayloadIdentity,
          observed: identity
        })}`
      );
    }
  }

  const intrinsicRoundTripDrift = Math.max(
    maxBoundsDrift(
      intrinsicManipulated.visualBox,
      intrinsicReopened.visualBox
    ),
    maxBoundsDrift(
      intrinsicManipulated.chromeBox,
      intrinsicReopened.chromeBox
    ),
    maxBoundsDrift(
      intrinsicManipulated.reserveBox,
      intrinsicReopened.reserveBox
    )
  );
  const compositionRoundTripDrift = Math.max(
    maxBoundsDrift(
      persistedBeforeSave.compositionSpatial.visualBox,
      reopenedCompositionSpatial.visualBox
    ),
    maxBoundsDrift(
      persistedBeforeSave.compositionSpatial.chromeBox,
      reopenedCompositionSpatial.chromeBox
    ),
    maxBoundsDrift(
      persistedBeforeSave.compositionSpatial.reserveBox,
      reopenedCompositionSpatial.reserveBox
    )
  );

  const lifecycleChecks = {
    initialIsUngrouped:
      initialState.wrapperCount === 0 &&
      initialState.ungroupedUnitCount === total,
    resetMatchesInitial: resetState.semanticHash === initialState.semanticHash,
    manipulatedIsExpected: isExpectedFinalState(manipulated.state),
    persistedBeforeSaveIsExpected: isExpectedFinalState(
      persistedBeforeSave.state
    ),
    persistedServerIsExpected: isExpectedFinalState(persistedState),
    reopenedIsExpected: isExpectedFinalState(reopenedState),
    secondReadIsExpected: isExpectedFinalState(secondReadState),
    rebuiltMembershipIsDeterministic:
      JSON.stringify(manipulated.state.groupedMemberSets) ===
      JSON.stringify(persistedBeforeSave.state.groupedMemberSets),
    persistedMatchesBuilt:
      persistedState.semanticHash === persistedBeforeSave.state.semanticHash,
    reopenedMatchesServer:
      reopenedState.semanticHash === persistedState.semanticHash,
    secondReadMatchesServer:
      secondReadState.semanticHash === persistedState.semanticHash,
    learnerFacingStaticPayloadMatchesCurrent:
      persistedStaticPayloadIdentity.sha256 ===
        expectedStaticPayloadIdentity.sha256 &&
      reopenedStaticPayloadIdentity.sha256 ===
        expectedStaticPayloadIdentity.sha256 &&
      secondReadStaticPayloadIdentity.sha256 ===
        expectedStaticPayloadIdentity.sha256,
    persistedUsesCurrentLayout:
      hasCurrentLayoutRevision(persistedProject.contentsJson ?? []),
    reopenedUsesCurrentLayout:
      hasCurrentLayoutRevision(reopenedPayload.contentsJson),
    secondReadUsesCurrentLayout:
      hasCurrentLayoutRevision(secondRead.contentsJson ?? []),
    freshContextReadTwice: reopenProjectReadCount >= 2,
    noPutDuringReopen: reopenPutAttemptCount === 0,
    reopenedUndoInvoked: reopenedUndo.invoked === true,
    reopenedUndoPreservesMathematics:
      reopenedUndo.mathematicalStateUnchanged === true,
    groupedObjectsFitLane:
      manipulated.laneFit.allWrappersInsideGroupLane === true,
    groupsFormedFromEmittedPlacements:
      manipulated.formationEvidence.length === quotient &&
      manipulated.formationEvidence.every(
        (formation) =>
          formation.sourcePlacementVerified === true &&
          formation.formedByNativeDrag === true &&
          formation.allMembersInsideTarget === true
      ),
    groupedObjectsOccupyDistinctTargetEnvelopes:
      manipulated.laneFit.allGroupsInsideDistinctTargetEnvelopes === true &&
      manipulated.laneFit.allGroupChromeBoxesSeparated === true &&
      manipulated.laneFit.groupLabelClearancePassed === true &&
      manipulated.laneFit.remainderLabelClearancePassed === true &&
      manipulated.laneFit.occupiedTargetEnvelopeCount === quotient &&
      manipulated.laneFit.emptyTargetEnvelopeCount === 0,
    nativeUngroupIsVisuallyDistinct:
      manipulated.releasedMembersReturnedToSource === true &&
      manipulated.vacatedFirstGroupTarget === true &&
      manipulated.ungroupedLaneFit.occupiedTargetEnvelopeCount ===
        quotient - 1 &&
      manipulated.ungroupedLaneFit.emptyTargetEnvelopeCount === 1,
    remainderObjectsFitLane:
      manipulated.laneFit.allUngroupedInsideRemainderLane === true,
    reopenedGroupLaneVisible: Boolean(reopenedLaneFit.groupLaneCssPx),
    reopenedRemainderLaneVisible: Boolean(reopenedLaneFit.remainderLaneCssPx),
    reopenedGroupedObjectsFitLane:
      reopenedLaneFit.allWrappersInsideGroupLane === true,
    reopenedGroupedObjectsOccupyDistinctTargetEnvelopes:
      reopenedLaneFit.allGroupsInsideDistinctTargetEnvelopes === true &&
      reopenedLaneFit.allGroupChromeBoxesSeparated === true &&
      reopenedLaneFit.groupLabelClearancePassed === true &&
      reopenedLaneFit.remainderLabelClearancePassed === true &&
      reopenedLaneFit.occupiedTargetEnvelopeCount === quotient &&
      reopenedLaneFit.emptyTargetEnvelopeCount === 0,
    reopenedRemainderObjectsFitLane:
      reopenedLaneFit.allUngroupedInsideRemainderLane === true,
    initialPlacementDoesNotLeakAnswerStructure:
      countingStructureAnalysis.answerStructureLeaked === false,
    actualClassroomTextClearancePassed:
      Object.values(classroomTextClearance.checks).every(
        (passed) => passed === true
      ),
    taskEnvelopeAvoidsFixedEditorChrome:
      Object.values(initialFixedChromeTaskClearance.checks).every(
        (passed) => passed === true
      ) &&
      Object.values(reopenedFixedChromeTaskClearance.checks).every(
        (passed) => passed === true
      ),
    fixedChromeTaskClearanceStableAfterReopen:
      fixedChromeTaskClearanceStableAfterReopen,
    nativeObjectsAvoidMeasuredEditorOverlays:
      nativeOverlayIntersections.length === 0 &&
      reopenedNativeOverlayIntersections.length === 0,
    renderedNativeTargetMeetsClassroomMinimum:
      80 * releaseInteractionContext.canvasUnitsToCssPx >= 44,
    releaseContextStableAfterReopen:
      Math.abs(
        reopenedReleaseInteractionContext.canvasUnitsToCssPx -
          releaseInteractionContext.canvasUnitsToCssPx
      ) <= 0.001 &&
      maxBoundsDrift(
        reopenedReleaseInteractionContext.selectionOverlayCssPx,
        releaseInteractionContext.selectionOverlayCssPx
      ) <= 1 &&
      reopenedReleaseInteractionContext.sidebarState ===
        releaseInteractionContext.sidebarState &&
      reopenedReleaseInteractionContext.zoomMode ===
        releaseInteractionContext.zoomMode,
    intrinsicUndoResetMatchesInitial:
      intrinsicUndoReset.persistedMathematicalStateHash ===
      intrinsicInitialSelected.persistedMathematicalStateHash,
    intrinsicManipulationChangesPersistedState:
      intrinsicManipulated.persistedMathematicalStateHash !==
      intrinsicInitialSelected.persistedMathematicalStateHash,
    intrinsicReopenMatchesManipulated:
      intrinsicReopened.persistedMathematicalStateHash ===
      intrinsicManipulated.persistedMathematicalStateHash,
    intrinsicRoundTripWithinTolerance: intrinsicRoundTripDrift <= 1,
    compositionRoundTripWithinTolerance: compositionRoundTripDrift <= 1,
    compilerEmitsNativeMultiObjectPool:
      injected.compilerFragment.kind === "multi" &&
      injected.compilerFragment.emittedObjectCount === total &&
      injected.compilerFragment.hasPrimaryObjectId === false &&
      JSON.stringify(injected.compilerFragment.requiredModuleKeys) ===
        JSON.stringify(["NO01SC"])
  };
  if (Object.values(lifecycleChecks).some((passed) => passed !== true)) {
    throw new Error(
      `division-group-canary-lifecycle-invalid:${JSON.stringify(lifecycleChecks)}`
    );
  }
  const cumulativeApprovedSaveCount =
    externalWriteCount + priorApprovedVersionCount;
  const expectedCumulativeSaveCount = resumedFromPriorApprovedSave
    ? priorApprovedVersionCount
    : priorApprovedVersionCount + 1;
  if (
    cumulativeApprovedSaveCount !== expectedCumulativeSaveCount ||
    (resumedFromPriorApprovedSave && !saveSkippedToAvoidDuplicateWrite)
  ) {
    throw new Error("division-group-canary-save-resume-boundary-invalid");
  }

  const screenshotEvidence = [
    ["initial", initialPath],
    ["selected-single-unit", selectedSinglePath],
    ["selected-first-group", selectedPath],
    ["ungrouped-first-group", ungroupedPath],
    ["full-grouped", manipulatedPath],
    ["reset", resetPath],
    ["reopened", reopenedPath]
  ].map(([state, path]) => ({
    state,
    path: relative(repositoryRoot, path),
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex")
  }));
  const observedAt = new Date().toISOString();
  const intrinsicEvidenceId =
    "no01sc-01-intrinsic-spatial-canary-20260808-v2";
  const intrinsicObservation = (state, measurement, screenshotPath) => ({
    state,
    placement: measurement.placement,
    visualBox: measurement.visualBox,
    chromeBox: measurement.chromeBox,
    reserveBox: measurement.reserveBox,
    taskEnvelope: measurement.taskEnvelope,
    persistedMathematicalStateHash:
      measurement.persistedMathematicalStateHash,
    screenshotPath: relative(repositoryRoot, screenshotPath)
  });
  const intrinsicSpatialContractCandidate = {
    contractVersion: "2.0.0",
    contract: {
      contractKind: "intrinsic-element",
      contractId: "native-element-no01sc-01-v2",
      toolKey: "NO01SC",
      variantId: unitVariantId,
      toolVersionFingerprint,
      minInteractiveSize: { width: 80, height: 80 },
      minInteractiveCssSize: { width: 44, height: 44 },
      reserveBox: { x: -42, y: -42, width: 84, height: 84 },
      reserveAnchor: "placement-center",
      roundTripStable: true,
      roundTripTolerance: 1,
      derivedFromEvidenceIds: [intrinsicEvidenceId]
    },
    evidence: {
      evidenceId: intrinsicEvidenceId,
      observedAt,
      toolKey: "NO01SC",
      variantId: unitVariantId,
      toolVersionFingerprint,
      environment: intrinsicReopened.environment,
      observations: [
        intrinsicObservation(
          "initial",
          intrinsicInitialSelected,
          initialPath
        ),
        intrinsicObservation(
          "selected",
          intrinsicInitialSelected,
          selectedSinglePath
        ),
        intrinsicObservation(
          "manipulated",
          intrinsicManipulated,
          manipulatedPath
        ),
        intrinsicObservation(
          "undo-reset",
          intrinsicUndoReset,
          resetPath
        ),
        intrinsicObservation(
          "reopened",
          intrinsicReopened,
          reopenedPath
        )
      ],
      persistedStateChanged: true,
      roundTripReferenceState: "manipulated",
      roundTripDrift: round(intrinsicRoundTripDrift),
      roundTripDriftWithinTolerance: intrinsicRoundTripDrift <= 1,
      nonPointerInteraction: "unavailable"
    }
  };
  const compositionEvidenceId =
    `division-grouping-no01sc-01-composition-${scenarioKey}-20260808-v2`;
  const compositionPlacement =
    injected.productContract.poolPlacementCanvas;
  const compositionReserve = layoutBounds(
    getLayoutPreset(layoutId),
    "item.array-panel"
  );
  const compositionObservation = (
    state,
    measurement,
    screenshotPath
  ) => ({
    state,
    placement: measurement.placement,
    visualBox: measurement.visualBox,
    chromeBox: measurement.chromeBox,
    reserveBox: measurement.reserveBox,
    taskEnvelope: measurement.taskEnvelope,
    persistedMathematicalStateHash:
      measurement.persistedMathematicalStateHash,
    screenshotPath: relative(repositoryRoot, screenshotPath)
  });
  const activityCompositionSpatialContractCandidate = {
    contractVersion: "2.0.0",
    contract: {
      contractKind: "activity-composition",
      contractId: "division-grouping-no01sc-01-composition-v2",
      toolKey: "NO01SC",
      variantId: unitVariantId,
      toolVersionFingerprint,
      minInteractiveSize: {
        width: compositionPlacement.width,
        height: compositionPlacement.height
      },
      minInteractiveCssSize: { width: 44, height: 44 },
      reserveBox: {
        x: compositionReserve.x - compositionPlacement.x,
        y: compositionReserve.y - compositionPlacement.y,
        width: compositionReserve.width,
        height: compositionReserve.height
      },
      reserveAnchor: "placement-top-left",
      roundTripStable: true,
      roundTripTolerance: 1,
      derivedFromEvidenceIds: [compositionEvidenceId],
      composition: {
        layoutPresetId: layoutId,
        layoutContentHash,
        blueprintContentHash: injected.productContract.blueprintContentHash,
        canvas: {
          width: injected.canvasBounds.width,
          height: injected.canvasBounds.height,
          canvasBaseHeight: layoutPreset.canvasBaseHeight,
          itemPitch: layoutPreset.itemPitch,
          itemCount: 1,
          canvasUnitsToCssPx:
            releaseInteractionContext.canvasUnitsToCssPx
        },
        releaseViewport: {
          width: releaseInteractionContext.viewport.width,
          height: releaseInteractionContext.viewport.height,
          devicePixelRatio: releaseInteractionContext.devicePixelRatio,
          surfaceMode: releaseInteractionContext.surfaceMode,
          sidebarState: releaseInteractionContext.sidebarState,
          zoomMode: releaseInteractionContext.zoomMode,
          pan: releaseInteractionContext.pan
        },
        semanticRegions: [
          {
            id: "prediction-region",
            bounds: layoutBounds(layoutPreset, "item.prediction-box")
          },
          {
            id: "source-pool",
            bounds: layoutBounds(layoutPreset, "item.counting-model-pool")
          },
          {
            id: "group-lane",
            bounds: layoutBounds(layoutPreset, "item.group-lane")
          },
          {
            id: "remainder-lane",
            bounds: layoutBounds(layoutPreset, "item.remainder-lane")
          },
          {
            id: "explanation-region",
            bounds: layoutBounds(layoutPreset, "item.explanation-box")
          }
        ],
        selectionOverlayExclusionZoneCssPx:
          releaseInteractionContext.selectionOverlayCssPx,
        minGap: layoutPreset.minGap,
        labelClearance: 12,
        zOrder: [
          "locked-guides",
          "native-counting-units",
          "native-group-chrome",
          "fixed-editor-toolbars"
        ],
        manipulatedStateEnvelopes: [
          {
            id: "grouped-clusters",
            bounds: layoutBounds(layoutPreset, "item.group-lane")
          },
          {
            id: "remainder-units",
            bounds: layoutBounds(layoutPreset, "item.remainder-lane")
          }
        ]
      }
    },
    evidence: {
      evidenceId: compositionEvidenceId,
      observedAt,
      toolKey: "NO01SC",
      variantId: unitVariantId,
      toolVersionFingerprint,
      environment: {
        ...intrinsicReopened.environment,
        harnessVersion: `division-counting-group-product-canary:${scenarioKey}:v10`,
        interactionContext: {
          surfaceMode: releaseInteractionContext.surfaceMode,
          sidebarState: releaseInteractionContext.sidebarState,
          zoomMode: releaseInteractionContext.zoomMode,
          pan: releaseInteractionContext.pan,
          canvasUnitsToCssPx:
            releaseInteractionContext.canvasUnitsToCssPx,
          selectionOverlayCssPx:
            releaseInteractionContext.selectionOverlayCssPx
        }
      },
      observations: [
        compositionObservation(
          "initial",
          initialCompositionSpatial,
          initialPath
        ),
        compositionObservation(
          "selected",
          manipulated.selectedCompositionSpatial,
          selectedPath
        ),
        compositionObservation(
          "manipulated",
          persistedBeforeSave.compositionSpatial,
          manipulatedPath
        ),
        compositionObservation(
          "undo-reset",
          resetCompositionSpatial,
          resetPath
        ),
        compositionObservation(
          "reopened",
          reopenedCompositionSpatial,
          reopenedPath
        )
      ],
      persistedStateChanged: true,
      roundTripReferenceState: "manipulated",
      roundTripDrift: round(compositionRoundTripDrift),
      roundTripDriftWithinTolerance: compositionRoundTripDrift <= 1,
      nonPointerInteraction: "unavailable"
    }
  };
  assertNativeSpatialLifecycleEvidence(
    intrinsicSpatialContractCandidate.contract,
    intrinsicSpatialContractCandidate.evidence
  );
  assertNativeSpatialLifecycleEvidence(
    activityCompositionSpatialContractCandidate.contract,
    activityCompositionSpatialContractCandidate.evidence
  );
  const evidence = {
    schemaVersion: "2.0.0",
    status: "pass",
    evidenceId: `division-counting-group-product-canary-${scenarioKey}-20260808-v2`,
    observedAt,
    activityId,
    toolKey: "NO01SC",
    variantId: unitVariantId,
    layoutId,
    layoutRevision: canaryLayoutRevision,
    layoutPresetContentHash,
    blueprintContentHash: injected.productContract.blueprintContentHash,
    interactionShape: {
      initial: true,
      selected: true,
      manipulated: true,
      undoReset: true,
      reopened: true
    },
    scenario: {
      scenarioKey,
      seed: scenarioSeed,
      total,
      groupSize,
      quotient,
      remainderCount
    },
    probeMode:
      "existing-disposable-canary-actual-blueprint-compiler-payload-one-versioned-save-with-read-only-resume",
    environment: {
      viewport: { width: 1280, height: 800 },
      profileScope: "dedicated-mathcanvas-profile",
      userChromeTouched: false,
      serviceWorkersBlocked: true,
      servedAssetEvidence,
      releaseInteractionContext,
      classroomTextClearance,
      geometryProfileReference: {
        profileId: geometryProfile.profileId,
        profileVersion: geometryProfile.profileVersion,
        evidenceId: geometryProfile.evidenceId,
        profileFileSha256: geometryProfileFileSha256,
        profileContentSha256: geometryProfile.contentSha256,
        viewport: geometryProfile.viewport,
        surfaceMode: geometryProfile.surfaceMode,
        sidebarState: geometryProfile.sidebarState,
        guardCssPx: geometryProfile.guardCssPx,
        fixedSafeCssPx: geometryProfile.fixedSafeCss
      },
      fixedChromeTaskClearance: {
        initial: initialFixedChromeTaskClearance,
        reopened: reopenedFixedChromeTaskClearance,
        stableAfterReopen: fixedChromeTaskClearanceStableAfterReopen
      },
      nativeOverlayIntersectionCount: nativeOverlayIntersections.length,
      injectedProjectReadCount: injectedReadCount,
      reopenedInFreshBrowserContext: true,
      reopenProjectReadCount
    },
    writeBoundary: {
      existingDisposableProjectReused: true,
      approvalEvidenceMatched: sourceIdentityVerified,
      disposableTitleMarkerMatched: sourceTitle.startsWith(sourceTitlePrefix),
      createCount: 0,
      allowedSaveCountThisExecution: externalWriteCount,
      priorApprovedSaveObserved,
      priorApprovedVersionCount,
      resumedFromPriorApprovedSave,
      saveSkippedToAvoidDuplicateWrite,
      cumulativeApprovedSaveCount,
      allowedSaveStatus,
      unexpectedExternalWriteCount: 0,
      blockedNonSafeRequestCount: blockedRequests.length,
      reopenPutAttemptCount,
      reopenBlockedNonSafeRequestCount: reopenBlockedRequests.length
    },
    initialState,
    selectedState: {
      semanticHash: initialState.semanticHash,
      selectedMemberCount: groupSize,
      selectionMethod: "shift-click-native-multi-select",
      selectedChromeBoxCssPx: manipulated.selectedChromeBox,
      groupsFormedFromEmittedPlacements:
        manipulated.formationEvidence.every(
          (formation) =>
            formation.sourcePlacementVerified === true &&
            formation.formedByNativeDrag === true &&
            formation.allMembersInsideTarget === true
        ),
      formationEvidence: manipulated.formationEvidence
    },
    manipulatedState: manipulated.state,
    nativeRevisionState: {
      ungrouped: manipulated.ungroupedState,
      regrouped: manipulated.regroupedState,
      visualTransition: {
        releasedMembersReturnedToSource:
          manipulated.releasedMembersReturnedToSource,
        vacatedFirstGroupTarget:
          manipulated.vacatedFirstGroupTarget,
        occupiedTargetEnvelopeCountAfterUngroup:
          manipulated.ungroupedLaneFit.occupiedTargetEnvelopeCount,
        emptyTargetEnvelopeCountAfterUngroup:
          manipulated.ungroupedLaneFit.emptyTargetEnvelopeCount,
        occupiedTargetEnvelopeIndexesAfterUngroup:
          manipulated.ungroupedLaneFit.occupiedTargetEnvelopeIndexes
      },
      noOrphanWrapperOrStaleGroupReference:
        manipulated.ungroupedState.staleGroupReferenceCount === 0,
      preResetMembershipMatchesPostResetRebuild:
        JSON.stringify(manipulated.state.groupedMemberSets) ===
        JSON.stringify(persistedBeforeSave.state.groupedMemberSets)
    },
    intrinsicSpatialContractCandidate,
    activityCompositionSpatialContractCandidate,
    undoResetState: resetState,
    persistedState,
    reopenedState,
    secondReadState,
    mathematicalInvariant: {
      groupSize,
      wrapperCount: quotient,
      remainderCount,
      total,
      equation: `${groupSize} × ${quotient} + ${remainderCount} = ${total}`,
      derivedFromStudentConstruction: true
    },
    productContract: injected.productContract,
    learnerFacingStaticPayload: {
      policy: DIVISION_PRODUCT_STATIC_PROJECTION_POLICY,
      objectCount: expectedStaticPayloadIdentity.objectCount,
      expectedSha256: expectedStaticPayloadIdentity.sha256,
      sourceAtStartSha256: sourceStaticPayloadIdentity.sha256,
      sourceAtStartMatchesExpected:
        sourceStaticPayloadIdentity.objectCount ===
          expectedStaticPayloadIdentity.objectCount &&
        sourceStaticPayloadIdentity.sha256 ===
          expectedStaticPayloadIdentity.sha256,
      persistedSha256: persistedStaticPayloadIdentity.sha256,
      reopenedSha256: reopenedStaticPayloadIdentity.sha256,
      secondReadSha256: secondReadStaticPayloadIdentity.sha256,
      allPersistedStatesMatchExpected: true
    },
    compilerContract: {
      fragmentKind: injected.compilerFragment.kind,
      emittedObjectCount: injected.compilerFragment.emittedObjectCount,
      hasAmbiguousPrimaryObject:
        injected.compilerFragment.hasPrimaryObjectId,
      requiredModuleKeys: injected.compilerFragment.requiredModuleKeys,
      deterministicUnitIds: injected.unitIds,
      unitIdOrderHash: sha256Hex(injected.unitIds),
      supportedGroupSizes: [4, 6, 7],
      initialStructureAnalysis: countingStructureAnalysis,
      initialColumnsMatchSupportedGroupSize:
        countingStructureAnalysis.completeRowOccupanciesMatchingSupportedGroupSize
          .length > 0,
      answerStructureLeaked:
        countingStructureAnalysis.answerStructureLeaked,
      initialPlacementReadsGroupSize: false,
      groupingIndexesDerivedFromEmittedPlacements: groupMemberIndexSets,
      targetSizeProfilesCanvas: groupTargetSizeProfiles(),
      compilerPayloadUsedByCanary: true
    },
    spatialContractCandidate: {
      placementCanvas: layoutBounds(
        getLayoutPreset(layoutId),
        "item.counting-model-pool"
      ),
      reserveBoxCanvas: layoutBounds(
        getLayoutPreset(layoutId),
        "item.array-panel"
      ),
      taskEnvelopeCanvas: layoutBounds(
        getLayoutPreset(layoutId),
        "item.array-panel"
      ),
      groupLaneCssPx: manipulated.laneFit.groupLaneCssPx,
      groupTargetEnvelopeBoxesCssPx:
        manipulated.laneFit.groupTargetEnvelopeBoxesCssPx,
      occupiedTargetEnvelopeIndexes:
        manipulated.laneFit.occupiedTargetEnvelopeIndexes,
      occupiedTargetEnvelopeCount:
        manipulated.laneFit.occupiedTargetEnvelopeCount,
      emptyTargetEnvelopeCount:
        manipulated.laneFit.emptyTargetEnvelopeCount,
      remainderLaneCssPx: manipulated.laneFit.remainderLaneCssPx,
      selectedChromeBoxCssPx: manipulated.selectedChromeBox,
      groupVisualBoxesCssPx: manipulated.laneFit.groupVisualBoxesCssPx,
      groupChromeBoxesCssPx: manipulated.laneFit.groupChromeBoxesCssPx,
      remainderBoxesCssPx: manipulated.laneFit.remainderBoxesCssPx,
      reopenedSpatial: {
        groupLaneCssPx: reopenedLaneFit.groupLaneCssPx,
        groupTargetEnvelopeBoxesCssPx:
          reopenedLaneFit.groupTargetEnvelopeBoxesCssPx,
        occupiedTargetEnvelopeIndexes:
          reopenedLaneFit.occupiedTargetEnvelopeIndexes,
        occupiedTargetEnvelopeCount:
          reopenedLaneFit.occupiedTargetEnvelopeCount,
        emptyTargetEnvelopeCount:
          reopenedLaneFit.emptyTargetEnvelopeCount,
        remainderLaneCssPx: reopenedLaneFit.remainderLaneCssPx,
        groupVisualBoxesCssPx: reopenedLaneFit.groupVisualBoxesCssPx,
        groupChromeBoxesCssPx: reopenedLaneFit.groupChromeBoxesCssPx,
        remainderBoxesCssPx: reopenedLaneFit.remainderBoxesCssPx,
        allGroupVisualBoxesInsideGroupLane:
          reopenedLaneFit.allGroupVisualBoxesInsideGroupLane,
        allGroupChromeBoxesInsideGroupLane:
          reopenedLaneFit.allGroupChromeBoxesInsideGroupLane,
        allGroupsInsideDistinctTargetEnvelopes:
          reopenedLaneFit.allGroupsInsideDistinctTargetEnvelopes,
        allGroupChromeBoxesSeparated:
          reopenedLaneFit.allGroupChromeBoxesSeparated,
        allWrappersInsideGroupLane:
          reopenedLaneFit.allWrappersInsideGroupLane,
        allUngroupedInsideRemainderLane:
          reopenedLaneFit.allUngroupedInsideRemainderLane
      },
      allGroupVisualBoxesInsideGroupLane:
        manipulated.laneFit.allGroupVisualBoxesInsideGroupLane,
      allGroupChromeBoxesInsideGroupLane:
        manipulated.laneFit.allGroupChromeBoxesInsideGroupLane,
      allGroupsInsideDistinctTargetEnvelopes:
        manipulated.laneFit.allGroupsInsideDistinctTargetEnvelopes,
      allGroupChromeBoxesSeparated:
        manipulated.laneFit.allGroupChromeBoxesSeparated,
      groupLabelClearancePassed:
        manipulated.laneFit.groupLabelClearancePassed,
      remainderLabelClearancePassed:
        manipulated.laneFit.remainderLabelClearancePassed,
      groupLabelToNearestVisualCssPx:
        manipulated.laneFit.groupLabelToNearestVisualCssPx,
      remainderLabelToNearestVisualCssPx:
        manipulated.laneFit.remainderLabelToNearestVisualCssPx,
      allWrappersInsideGroupLane:
        manipulated.laneFit.allWrappersInsideGroupLane,
      allUngroupedInsideRemainderLane:
        manipulated.laneFit.allUngroupedInsideRemainderLane,
      reopenedAllWrappersInsideGroupLane:
        reopenedLaneFit.allWrappersInsideGroupLane,
      reopenedAllUngroupedInsideRemainderLane:
        reopenedLaneFit.allUngroupedInsideRemainderLane,
      selectionOverlayExclusionZoneCssPx:
        releaseInteractionContext.selectionOverlayCssPx,
      overlayToolbarBoxesCssPx:
        releaseInteractionContext.overlayToolbarBoxesCssPx,
      nativeOverlayIntersectionCount: nativeOverlayIntersections.length,
      selectionChromeRequiredAfterDeselect: false,
      persistentVisualGroupingByOpenLane: true,
      nativeUngroupVisuallyVacatesTarget: true
    },
    roundTrip: {
      serverStateMatchesClientSave:
        persistedState.semanticHash === persistedBeforeSave.state.semanticHash,
      firstReopenMatchesServer:
        reopenedState.semanticHash === persistedState.semanticHash,
      secondReadMatchesServer:
        secondReadState.semanticHash === persistedState.semanticHash,
      currentLayoutRevisionPersisted:
        hasCurrentLayoutRevision(persistedProject.contentsJson ?? []) &&
        hasCurrentLayoutRevision(reopenedPayload.contentsJson) &&
        hasCurrentLayoutRevision(secondRead.contentsJson ?? []),
      reopenedFromFreshBrowserContext: true,
      secondGetResponseBodyAsserted: true,
      undoAfterReopenLeavesMathematicalStateUnchanged:
        reopenedUndo.mathematicalStateUnchanged
    },
    claims: {
      NO01SC: {
        contracted: {
          adapterKey: "counting-model",
          variantId: unitVariantId,
          intrinsicSpatialContractId: "native-element-no01sc-01-v2",
          activityCompositionSpatialContractId:
            "division-grouping-no01sc-01-composition-v2"
        },
        verified: {
          compilerPayloadUsedByCanary: true,
          emittedObjectCount: total,
          exactNativeVariantOnly: true,
          maximumUnitsPerRow:
            countingStructureAnalysis.maximumUnitsPerRow,
          answerStructureLeakedByInitialPlacement:
            countingStructureAnalysis.answerStructureLeaked,
          groupsFormedFromEmittedPlacements: true,
          selectionOverlayAvoided:
            nativeOverlayIntersections.length === 0
        },
        released: {
          toolAdapterReleased: true,
          releasedVariantIds: [unitVariantId],
          activityReleaseQualified: true
        },
        lifecycle: {
          nativeGroupUngroupRegroup: true,
          saveReopenInFreshContext: true,
          secondGetBodyAsserted: true,
          roundTripDrift: round(intrinsicRoundTripDrift)
        }
      }
    },
    screenshots: screenshotEvidence,
    qualityEvidenceScope: "full-activity-1280x800-background-canary",
    releaseQualified: true,
    nextGate:
      "released: 네이티브 공간 계약, background product canary, 품질·시각 감사와 sol xhigh 검토를 통과했습니다."
  };
  assertNoSensitiveData(evidence);
  const raw = {
    schemaVersion: "1.0.0",
    observedAt,
    runId: options["run-id"],
    projectId,
    sourceTitle,
    sourceProject,
    injected,
    allowedSavePayload,
    blockedSavePayloads,
    blockedRequests,
    reopenBlockedRequests,
    reopenedUndo,
    evidence
  };
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  mkdirSync(dirname(rawOutputPath), { recursive: true, mode: 0o700 });
  writeFileSync(outputPath, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
  writeFileSync(rawOutputPath, stableJson(raw), {
    encoding: "utf8",
    mode: 0o600
  });
  process.stdout.write(
    `PASS division counting group product canary ${scenarioKey}: compiler ${total}-unit pool, ${groupSize}x${quotient}+${remainderCount} persisted, create 0 versioned saves ${cumulativeApprovedSaveCount} ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  await context?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
}
