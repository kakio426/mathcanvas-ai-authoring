#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  assertNativeSpatialLifecycleEvidence,
  recommendationSchema,
  sha256Hex
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

const origin = "https://mathcanvas.vivasam.com";
const activityId =
  "number.division.quotient-remainder.claim-evidence-v1";
const layoutId = "wave25-division-grouping-v1";
const sourceTitlePrefix = "AI-CONTRACT-PROBE-DIVNATIVE-";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const unitVariantId = "NO01SC-01";
const toolBundleSha256 =
  "bf2c027b6a146b038f1c49b20fb06464c7154d8da42f95977d491c18ff366584";
const toolVersionFingerprint = `bundle:${toolBundleSha256}:${unitVariantId}`;
const canaryLayoutRevision =
  "layout-v10-actual-blueprint-no-slot-label-overlap";
const layoutRevisionMarkerId =
  "division-remainder-1-array-border-top";
const groupSlotCount = 6;
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
  const compactFirstGroup = {
    4: [0, 1, 5, 6],
    6: [0, 1, 2, 5, 6, 7],
    7: [0, 1, 2, 3, 5, 6, 7]
  }[groupSize];
  if (!compactFirstGroup) {
    throw new Error(`division-group-size-unsupported:${groupSize}`);
  }
  const used = new Set(compactFirstGroup);
  const available = Array.from({ length: total }, (_, index) => index).filter(
    (index) => !used.has(index)
  );
  groupMemberIndexSets = [compactFirstGroup];
  for (let index = 1; index < quotient; index += 1) {
    groupMemberIndexSets.push(
      available.splice(0, groupSize)
    );
  }
  if (
    groupMemberIndexSets.some((indexes) => indexes.length !== groupSize) ||
    available.length !== remainderCount
  ) {
    throw new Error("division-group-scenario-partition-invalid");
  }
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

function maximumUnitsPerRow(contentsJson) {
  const rowCounts = new Map();
  for (const object of contentsJson.filter(
    (candidate) => candidate?.svgId === unitVariantId
  )) {
    const key = String(object.y);
    rowCounts.set(key, (rowCounts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...rowCounts.values());
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

function buildLegacyInjectedContents() {
  const preset = getLayoutPreset(layoutId);
  const rectangleAt = (id, bounds, fill, stroke = "#9EB9CF") =>
    nativeObject(
      {
        kind: "draw-rectangle",
        toolKey: "common.rectangle",
        fill,
        stroke
      },
      `division-group-${id}`,
      bounds
    );
  const rectangle = (role, fill, stroke = "#9EB9CF") =>
    rectangleAt(role, layoutBounds(preset, `item.${role}`), fill, stroke);
  const borderLines = (role, color, thickness = 4) => {
    const bounds = layoutBounds(preset, `item.${role}`);
    const topId =
      role === "group-lane"
        ? `${role}-border-top-${canaryLayoutRevision}`
        : `${role}-border-top`;
    return [
      rectangleAt(
        topId,
        { ...bounds, height: thickness },
        color,
        color
      ),
      rectangleAt(
        `${role}-border-bottom`,
        {
          x: bounds.x,
          y: bounds.y + bounds.height - thickness,
          width: bounds.width,
          height: thickness
        },
        color,
        color
      ),
      rectangleAt(
        `${role}-border-left`,
        { ...bounds, width: thickness },
        color,
        color
      ),
      rectangleAt(
        `${role}-border-right`,
        {
          x: bounds.x + bounds.width - thickness,
          y: bounds.y,
          width: thickness,
          height: bounds.height
        },
        color,
        color
      )
    ];
  };
  const text = (id, value, bounds, fontSize = 30) =>
    nativeObject(
      {
        kind: "text",
        toolKey: "common.text",
        text: value,
        fontSize
      },
      `division-group-${id}`,
      bounds
    );
  const itemBounds = (role) => layoutBounds(preset, `item.${role}`);
  const choiceValues = [
    "5묶음, 3자루",
    "4묶음, 3자루",
    "5묶음, 4자루",
    "6묶음, 1자루",
    "3묶음, 5자루"
  ];
  const panelObjects = [
    rectangle("choice-panel", "#F8FBFE", "#B8C7D5"),
    rectangle("prediction-box", "#FFFFFF", "#8EA9C1"),
    rectangle("explanation-box", "#FFFFFF", "#8EA9C1"),
    ...choiceValues.map((_, index) =>
      rectangle(
        `position-card-${index + 1}-backdrop`,
        "#FFFFFF",
        "#8EA9C1"
      )
    ),
    ...borderLines("array-panel", "#4AA9D8"),
    ...borderLines("source-panel", "#E7B181"),
    ...borderLines("group-lane", "#5EA9D6"),
    ...borderLines("remainder-lane", "#D8B85B"),
    ...Array.from({ length: 6 }, (_, index) =>
      borderLines(`group-slot-${index + 1}`, "#A9CFE4", 3)
    ).flat()
  ];
  const textObjects = [
    text(
      "instruction-predict",
      "① 답 카드를 하나 골라 처음 생각 칸에 놓으세요.",
      layoutBounds(preset, "header.primary"),
      30
    ),
    text(
      "instruction-verify",
      "② 모형 4개를 골라 ‘그룹’을 누른 뒤, 한 묶음으로 함께 옮기세요.",
      layoutBounds(preset, "header.secondary"),
      30
    ),
    text(
      "instruction-explain",
      "③ 남은 모형을 옮긴 뒤 식을 쓰고, 처음 생각과 다르면 고치세요.",
      layoutBounds(preset, "header.tertiary"),
      30
    ),
    text(
      "question",
      "연필 23자루를 4자루씩 묶으면 몇 묶음이고 몇 자루가 남을까요?",
      itemBounds("question"),
      37
    ),
    text(
      "pool-label",
      "예상한 답 고르기",
      itemBounds("pool-label"),
      28
    ),
    text(
      "prediction-label",
      "처음 생각",
      itemBounds("prediction-label"),
      28
    ),
    text(
      "source-label",
      "묶을 모형을 놓는 곳",
      itemBounds("source-label"),
      30
    ),
    text(
      "group-lane-label",
      "4개씩 묶은 곳",
      itemBounds("group-lane-label"),
      30
    ),
    text(
      "remainder-lane-label",
      "남은 모형",
      itemBounds("remainder-lane-label"),
      26
    ),
    text(
      "explanation-label",
      "묶음 수 × 한 묶음의 수 + 남은 수 = 전체 수를 쓰고,\n처음 생각과 다르면 고쳐 보세요.",
      itemBounds("explanation-label"),
      25
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      text(
        `group-slot-${index + 1}-label`,
        "묶음 자리",
        itemBounds(`group-slot-${index + 1}-label`),
        22
      )
    ),
    ...choiceValues.map((value, index) =>
      text(
        `position-card-${index + 1}`,
        value,
        itemBounds(`position-card-${index + 1}`),
        28
      )
    )
  ];
  const poolBounds = itemBounds("counting-model-pool");
  const countingFragment = compileNativeTool({
    kind: "counting-model",
    toolKey: "NO01SC",
    count: total
  }, {
    id: "division-group-counting-model-pool",
    ...poolBounds
  });
  if (
    countingFragment.kind !== "multi" ||
    countingFragment.objects.length !== total ||
    Object.hasOwn(countingFragment, "primaryObjectId")
  ) {
    throw new Error("division-group-compiler-multi-fragment-invalid");
  }
  const units = [...countingFragment.objects];
  return {
    contentsJson: [...panelObjects, ...textObjects, ...units],
    unitIds: units.map((unit) => unit.id),
    compilerFragment: {
      kind: countingFragment.kind,
      emittedObjectCount: countingFragment.objects.length,
      hasPrimaryObjectId: Object.hasOwn(
        countingFragment,
        "primaryObjectId"
      ),
      requiredModuleKeys: countingFragment.requiredModuleKeys
    },
    lockedIds: [...panelObjects, ...textObjects]
      .filter((object) => !String(object.id).includes("position-card-"))
      .map((object) => object.id),
    canvasBounds: {
      width: preset.tokens["canvas.root"].width,
      height: preset.canvasBaseHeight + preset.itemPitch
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

async function measureFinalLaneFit(
  page,
  payload,
  remainderIds,
  expectedGroupCount = quotient
) {
  const groupLaneBounds = await borderBounds(page, "group-lane");
  const remainderLaneBounds = await borderBounds(page, "remainder-lane");
  const groupSlotBounds = [];
  for (let slot = 1; slot <= 6; slot += 1) {
    groupSlotBounds.push(await borderBounds(page, `group-slot-${slot}`));
  }
  const groupVisualBoxes = [];
  const groupChromeBoxes = [];
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
  const allGroupChromeBoxesInsideGroupLane = groupChromeBoxes.every((box) =>
    contains(groupLaneBounds, box)
  );
  const occupiedGroupSlotIndexes = groupVisualBoxes.map((visualBox, index) =>
    groupSlotBounds.findIndex(
      (slotBounds) =>
        contains(slotBounds, visualBox) &&
        contains(slotBounds, groupChromeBoxes[index])
    )
  );
  const uniqueOccupiedGroupSlotIndexes = new Set(occupiedGroupSlotIndexes);
  const groupSlotsVisuallyValid =
    occupiedGroupSlotIndexes.every((index) => index >= 0) &&
    uniqueOccupiedGroupSlotIndexes.size === expectedGroupCount;
  return {
    allWrappersInsideGroupLane:
      allGroupVisualBoxesInsideGroupLane &&
      allGroupChromeBoxesInsideGroupLane,
    allGroupVisualBoxesInsideGroupLane,
    allGroupChromeBoxesInsideGroupLane,
    allGroupsInsideDistinctVisibleSlots: groupSlotsVisuallyValid,
    occupiedGroupSlotCount: uniqueOccupiedGroupSlotIndexes.size,
    emptyGroupSlotCount:
      groupSlotBounds.length - uniqueOccupiedGroupSlotIndexes.size,
    allUngroupedInsideRemainderLane: remainderBoxes.every((box) =>
      contains(remainderLaneBounds, box)
    ),
    groupLaneCssPx: summarizeBounds(groupLaneBounds),
    groupSlotBoxesCssPx: groupSlotBounds.map(summarizeBounds),
    occupiedGroupSlotIndexes: [...uniqueOccupiedGroupSlotIndexes].sort(
      (left, right) => left - right
    ),
    remainderLaneCssPx: summarizeBounds(remainderLaneBounds),
    groupVisualBoxesCssPx: groupVisualBoxes.map(summarizeBounds),
    groupChromeBoxesCssPx: groupChromeBoxes.map(summarizeBounds),
    remainderBoxesCssPx: remainderBoxes.map(summarizeBounds)
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
      harnessVersion: "division-counting-group-canary:v8"
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
    hasCurrentLayoutRevision(sourceProject.contentsJson ?? []);
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
    groupSlotBounds
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
    const vacatedFirstGroupSlot =
      !ungroupedLaneFit.occupiedGroupSlotIndexes.includes(0);
    if (captureUngroupedPath) {
      await localScreenshot(page, captureUngroupedPath);
    }
    if (
      !releasedMembersReturnedToSource ||
      !vacatedFirstGroupSlot ||
      ungroupedLaneFit.occupiedGroupSlotCount !== quotient - 1 ||
      ungroupedLaneFit.emptyGroupSlotCount !==
        groupSlotCount - (quotient - 1) ||
      ungroupedLaneFit.allGroupsInsideDistinctVisibleSlots !== true
    ) {
      throw new Error(
        `division-group-native-ungroup-visual-transition-invalid:${JSON.stringify({
          releasedMembersReturnedToSource,
          vacatedFirstGroupSlot,
          occupiedGroupSlotCount:
            ungroupedLaneFit.occupiedGroupSlotCount,
          emptyGroupSlotCount: ungroupedLaneFit.emptyGroupSlotCount,
          allGroupsInsideDistinctVisibleSlots:
            ungroupedLaneFit.allGroupsInsideDistinctVisibleSlots,
          occupiedGroupSlotIndexes:
            ungroupedLaneFit.occupiedGroupSlotIndexes,
          allGroupVisualBoxesInsideGroupLane:
            ungroupedLaneFit.allGroupVisualBoxesInsideGroupLane,
          allGroupChromeBoxesInsideGroupLane:
            ungroupedLaneFit.allGroupChromeBoxesInsideGroupLane,
          groupSlotBoxesCssPx: ungroupedLaneFit.groupSlotBoxesCssPx,
          groupVisualBoxesCssPx: ungroupedLaneFit.groupVisualBoxesCssPx,
          groupChromeBoxesCssPx: ungroupedLaneFit.groupChromeBoxesCssPx
        })}`
      );
    }
    await selectIdsForGroup(page, memberIds);
    await clickNamedControl(page, "그룹");
    const regroupedBeforeMove = await readClientPayload(page);
    const regroupedWrapper = regroupedBeforeMove.contentsJson.find(
      (object) =>
        object?.svgId === "group-element" &&
        Array.isArray(object.ids) &&
        object.ids.length === memberIds.length &&
        object.ids.every((id) => memberSet.has(id))
    );
    if (!regroupedWrapper) {
      throw new Error("division-group-native-regroup-wrapper-missing");
    }
    await dragTo(
      page,
      page.locator(`[id="${regroupedWrapper.id}"]`).first(),
      groupSlotBounds[0].x + groupSlotBounds[0].width / 2,
      groupSlotBounds[0].y + groupSlotBounds[0].height / 2
    );
    const regroupedPayload = await readClientPayload(page);
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
      vacatedFirstGroupSlot,
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
    const groupSlotBounds = await Promise.all(
      Array.from({ length: groupSlotCount }, (_, index) =>
        borderBounds(page, `group-slot-${index + 1}`)
      )
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
    for (let groupIndex = 0; groupIndex < quotient; groupIndex += 1) {
      const memberIds = groupMemberIds[groupIndex];
      if (groupIndex > 0) {
        for (const [index, id] of memberIds.entries()) {
          const target = revisionReturnTargets[index];
          await dragTo(
            page,
            page.locator(`[id="${id}"]`).first(),
            target.x,
            target.y
          );
        }
      }
      const selected = await selectIdsForGroup(page, memberIds);
      if (groupIndex === 0) {
        selectedChromeBox = selected;
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
      const targetSlot = groupSlotBounds[groupIndex];
      await dragTo(
        page,
        page.locator(`[id="${wrapper.id}"]`).first(),
        targetSlot.x + targetSlot.width / 2,
        targetSlot.y + targetSlot.height / 2
      );
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
      groupSlotBounds
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
      vacatedFirstGroupSlot: revision.vacatedFirstGroupSlot,
      regroupedState: revision.regroupedState,
      selectedChromeBox,
      selectedCompositionSpatial,
      compositionSpatial,
      laneFit
    };
  };

  const initialPage = await context.newPage();
  await openProject(initialPage, projectId, injected.unitIds);
  const initialState = normalizedDivisionState(injected.contentsJson);
  const initialCompositionSpatial = await measureCompositionSpatial(
    initialPage,
    { contentsJson: injected.contentsJson },
    injected.productContract.poolPlacementCanvas
  );
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
  await secondReadPage.close();

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
    groupedObjectsOccupyFiveDistinctSlots:
      manipulated.laneFit.allGroupsInsideDistinctVisibleSlots === true &&
      manipulated.laneFit.occupiedGroupSlotCount === quotient &&
      manipulated.laneFit.emptyGroupSlotCount === groupSlotCount - quotient,
    nativeUngroupIsVisuallyDistinct:
      manipulated.releasedMembersReturnedToSource === true &&
      manipulated.vacatedFirstGroupSlot === true &&
      manipulated.ungroupedLaneFit.occupiedGroupSlotCount === quotient - 1 &&
      manipulated.ungroupedLaneFit.emptyGroupSlotCount ===
        groupSlotCount - (quotient - 1),
    remainderObjectsFitLane:
      manipulated.laneFit.allUngroupedInsideRemainderLane === true,
    reopenedGroupLaneVisible: Boolean(reopenedLaneFit.groupLaneCssPx),
    reopenedRemainderLaneVisible: Boolean(reopenedLaneFit.remainderLaneCssPx),
    reopenedGroupedObjectsFitLane:
      reopenedLaneFit.allWrappersInsideGroupLane === true,
    reopenedGroupedObjectsOccupyFiveDistinctSlots:
      reopenedLaneFit.allGroupsInsideDistinctVisibleSlots === true &&
      reopenedLaneFit.occupiedGroupSlotCount === quotient &&
      reopenedLaneFit.emptyGroupSlotCount === groupSlotCount - quotient,
    reopenedRemainderObjectsFitLane:
      reopenedLaneFit.allUngroupedInsideRemainderLane === true,
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

  const screenshotPaths = [
    initialPath,
    selectedSinglePath,
    selectedPath,
    ungroupedPath,
    manipulatedPath,
    resetPath,
    reopenedPath
  ].map((path) => relative(repositoryRoot, path));
  const observedAt = new Date().toISOString();
  const intrinsicEvidenceId =
    "no01sc-01-intrinsic-spatial-canary-20260808-v1";
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
    contractVersion: "1.0.0",
    contract: {
      contractId: "native-element-no01sc-01-v1",
      toolKey: "NO01SC",
      variantId: unitVariantId,
      toolVersionFingerprint,
      minInteractiveSize: { width: 80, height: 80 },
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
    `division-grouping-no01sc-01-composition-${scenarioKey}-20260808-v1`;
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
    contractVersion: "1.0.0",
    contract: {
      contractId: "division-grouping-no01sc-01-composition-v1",
      toolKey: "NO01SC",
      variantId: unitVariantId,
      toolVersionFingerprint,
      minInteractiveSize: {
        width: compositionPlacement.width,
        height: compositionPlacement.height
      },
      reserveBox: {
        x: compositionReserve.x - compositionPlacement.x,
        y: compositionReserve.y - compositionPlacement.y,
        width: compositionReserve.width,
        height: compositionReserve.height
      },
      reserveAnchor: "placement-top-left",
      roundTripStable: true,
      roundTripTolerance: 1,
      derivedFromEvidenceIds: [compositionEvidenceId]
    },
    evidence: {
      evidenceId: compositionEvidenceId,
      observedAt,
      toolKey: "NO01SC",
      variantId: unitVariantId,
      toolVersionFingerprint,
      environment: {
        ...intrinsicReopened.environment,
        harnessVersion: `division-counting-group-product-canary:${scenarioKey}:v9`
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
    activityCompositionSpatialContractCandidate.contract,
    activityCompositionSpatialContractCandidate.evidence
  );
  const evidence = {
    schemaVersion: "1.0.0",
    evidenceId: `division-counting-group-product-canary-${scenarioKey}-20260808-v1`,
    observedAt,
    activityId,
    toolKey: "NO01SC",
    variantId: unitVariantId,
    layoutId,
    layoutRevision: canaryLayoutRevision,
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
      selectedChromeBoxCssPx: manipulated.selectedChromeBox
    },
    manipulatedState: manipulated.state,
    nativeRevisionState: {
      ungrouped: manipulated.ungroupedState,
      regrouped: manipulated.regroupedState,
      visualTransition: {
        releasedMembersReturnedToSource:
          manipulated.releasedMembersReturnedToSource,
        vacatedFirstGroupSlot: manipulated.vacatedFirstGroupSlot,
        occupiedGroupSlotCountAfterUngroup:
          manipulated.ungroupedLaneFit.occupiedGroupSlotCount,
        emptyGroupSlotCountAfterUngroup:
          manipulated.ungroupedLaneFit.emptyGroupSlotCount,
        occupiedGroupSlotIndexesAfterUngroup:
          manipulated.ungroupedLaneFit.occupiedGroupSlotIndexes
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
    compilerContract: {
      fragmentKind: injected.compilerFragment.kind,
      emittedObjectCount: injected.compilerFragment.emittedObjectCount,
      hasAmbiguousPrimaryObject:
        injected.compilerFragment.hasPrimaryObjectId,
      requiredModuleKeys: injected.compilerFragment.requiredModuleKeys,
      deterministicUnitIds: injected.unitIds,
      unitIdOrderHash: sha256Hex(injected.unitIds),
      neutralColumnCount: maximumUnitsPerRow(injected.contentsJson),
      supportedGroupSizes: [4, 6, 7],
      initialColumnsMatchSupportedGroupSize: false,
      initialPlacementReadsGroupSize: false,
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
      groupSlotBoxesCssPx: manipulated.laneFit.groupSlotBoxesCssPx,
      occupiedGroupSlotIndexes:
        manipulated.laneFit.occupiedGroupSlotIndexes,
      occupiedGroupSlotCount:
        manipulated.laneFit.occupiedGroupSlotCount,
      emptyGroupSlotCount: manipulated.laneFit.emptyGroupSlotCount,
      remainderLaneCssPx: manipulated.laneFit.remainderLaneCssPx,
      selectedChromeBoxCssPx: manipulated.selectedChromeBox,
      groupVisualBoxesCssPx: manipulated.laneFit.groupVisualBoxesCssPx,
      groupChromeBoxesCssPx: manipulated.laneFit.groupChromeBoxesCssPx,
      remainderBoxesCssPx: manipulated.laneFit.remainderBoxesCssPx,
      allGroupVisualBoxesInsideGroupLane:
        manipulated.laneFit.allGroupVisualBoxesInsideGroupLane,
      allGroupChromeBoxesInsideGroupLane:
        manipulated.laneFit.allGroupChromeBoxesInsideGroupLane,
      allGroupsInsideDistinctVisibleSlots:
        manipulated.laneFit.allGroupsInsideDistinctVisibleSlots,
      allWrappersInsideGroupLane:
        manipulated.laneFit.allWrappersInsideGroupLane,
      allUngroupedInsideRemainderLane:
        manipulated.laneFit.allUngroupedInsideRemainderLane,
      reopenedAllWrappersInsideGroupLane:
        reopenedLaneFit.allWrappersInsideGroupLane,
      reopenedAllUngroupedInsideRemainderLane:
        reopenedLaneFit.allUngroupedInsideRemainderLane,
      selectionChromeRequiredAfterDeselect: false,
      persistentVisualGroupingByLaneAndSlots: true,
      nativeUngroupVisuallyVacatesSlot: true
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
          intrinsicSpatialContractId: "native-element-no01sc-01-v1"
        },
        verified: {
          compilerPayloadUsedByCanary: true,
          emittedObjectCount: total,
          exactNativeVariantOnly: true,
          neutralColumnCount: 5,
          answerStructureLeakedByInitialColumns: false
        },
        released: {
          toolAdapterReleased: true,
          releasedVariantIds: [unitVariantId],
          activityReleaseQualified: false
        },
        lifecycle: {
          nativeGroupUngroupRegroup: true,
          saveReopenInFreshContext: true,
          secondGetBodyAsserted: true,
          roundTripDrift: round(intrinsicRoundTripDrift)
        }
      }
    },
    screenshots: screenshotPaths,
    qualityEvidenceScope: "native-workbench-only",
    releaseQualified: false,
    nextGate:
      "compiler adapter와 전체 학생 활동을 같은 공간 계약에 결속한 뒤 background product canary와 sol xhigh 시각 감사를 통과합니다."
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
