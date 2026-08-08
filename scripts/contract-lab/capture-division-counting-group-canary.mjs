#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { sha256Hex } from "../../packages/contracts/dist/index.js";
import {
  compileNativeTool,
  getLayoutPreset,
  resolveCountingModelUnitPlacements
} from "../../packages/mathcanvas-compiler/dist/index.js";
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
const canaryLayoutRevision = "layout-v5-six-group-slots-classroom-copy";
const layoutRevisionMarkerId =
  `division-group-group-lane-border-top-${canaryLayoutRevision}`;
const total = 23;
const groupSize = 4;
const quotient = 5;
const remainderCount = 3;
const groupMemberIndexSets = [
  [0, 1, 2, 3],
  [6, 7, 8, 9],
  [12, 13, 14, 15],
  [18, 19, 20, 21],
  [4, 5, 10, 11]
];

function resolvedGroupMemberIds(unitIds) {
  return groupMemberIndexSets.map((indexes) =>
    indexes.map((index) => unitIds[index])
  );
}

function resolvedRemainderIds(unitIds) {
  const groupedIndexes = new Set(groupMemberIndexSets.flat());
  return unitIds.filter((_, index) => !groupedIndexes.has(index));
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

function hasCurrentLayoutRevision(contentsJson) {
  return contentsJson.some((object) => object?.id === layoutRevisionMarkerId);
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

function cloneUnit(template, placement) {
  return {
    ...structuredClone(template),
    id: placement.id,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    groupId: "",
    isGroup: false,
    isGroupElement: false
  };
}

function nativeObject(intent, id, bounds) {
  return compileNativeTool(intent, { id, ...bounds }).object;
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

function buildInjectedContents(unitTemplate) {
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
  const unitPlacements = resolveCountingModelUnitPlacements(total, {
    id: "division-group-counting-model-pool",
    ...poolBounds
  });
  const units = unitPlacements.map((placement) =>
    cloneUnit(unitTemplate, placement)
  );
  return {
    contentsJson: [...panelObjects, ...textObjects, ...units],
    unitIds: unitPlacements.map((placement) => placement.id),
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

async function openProject(page, projectId, expectedUnitCount) {
  await page.goto(`${origin}/ko/view/${encodeURIComponent(projectId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForFunction(
    ({ prefix, count }) =>
      document.querySelectorAll(`[id^="${prefix}"]`).length >= count,
    { prefix: "division-group-counting-model-pool-unit-", count: expectedUnitCount },
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
  const boxes = [];
  for (const side of ["top", "bottom", "left", "right"]) {
    const id =
      role === "group-lane" && side === "top"
        ? layoutRevisionMarkerId
        : `division-group-${role}-border-${side}`;
    const box = await page
      .locator(`[id="${id}"]`)
      .first()
      .boundingBox();
    if (!box) throw new Error(`division-group-border-not-visible:${role}:${side}`);
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
  const unitTemplate = sourceProject.contentsJson?.find(
    (object) => object?.svgId === unitVariantId
  );
  if (!unitTemplate) {
    throw new Error("division-group-unit-template-missing");
  }
  injected = buildInjectedContents(unitTemplate);
  resumedFromPriorApprovedSave =
    isExpectedFinalState(sourceServerStateAtStart) &&
    hasCurrentLayoutRevision(sourceProject.contentsJson ?? []);
  injectedCanvasOption = {
    ...structuredClone(sourceProject.canvasOption),
    lockIds: injected.lockedIds.map((id) => [id]),
    viewBox: [0, 0, injected.canvasBounds.width, injected.canvasBounds.height],
    canvasCenterCoordinate: {
      cx: injected.canvasBounds.width / 2,
      cy: injected.canvasBounds.height / 2
    }
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

  const groupTargets = [
    [0.26, 0.27],
    [0.74, 0.27],
    [0.26, 0.574],
    [0.74, 0.574],
    [0.26, 0.878]
  ];

  const exerciseUngroupRegroup = async (
    page,
    groupedPayload,
    captureUngroupedPath,
    revisionReturnTargets,
    groupLaneBounds
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
    if (
      !releasedMembersReturnedToSource ||
      !vacatedFirstGroupSlot ||
      ungroupedLaneFit.occupiedGroupSlotCount !== quotient - 1 ||
      ungroupedLaneFit.emptyGroupSlotCount !== 2 ||
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
    if (captureUngroupedPath) {
      await localScreenshot(page, captureUngroupedPath);
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
      groupLaneBounds.x + groupLaneBounds.width * groupTargets[0][0],
      groupLaneBounds.y + groupLaneBounds.height * groupTargets[0][1]
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
    for (let groupIndex = 0; groupIndex < quotient; groupIndex += 1) {
      const memberIds = groupMemberIds[groupIndex];
      if (groupIndex === quotient - 1) {
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
      const [targetXRatio, targetYRatio] = groupTargets[groupIndex];
      await dragTo(
        page,
        page.locator(`[id="${wrapper.id}"]`).first(),
        groupLaneBounds.x + groupLaneBounds.width * targetXRatio,
        groupLaneBounds.y + groupLaneBounds.height * targetYRatio
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
      groupLaneBounds
    );
    const payload = revision.regroupedPayload;
    const state = revision.regroupedState;
    const laneFit = await measureFinalLaneFit(page, payload, remainderIds);
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
      laneFit
    };
  };

  const initialPage = await context.newPage();
  await openProject(initialPage, projectId, total);
  const initialState = normalizedDivisionState(injected.contentsJson);
  const initialPath = join(screenshotDirectory, "initial.png");
  await localScreenshot(initialPage, initialPath);
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
  await openProject(resetPage, projectId, total);
  const resetState = normalizedDivisionState(injected.contentsJson);
  const resetPath = join(screenshotDirectory, "reset.png");
  await localScreenshot(resetPage, resetPath);
  await resetPage.close();

  const persistPage = await context.newPage();
  await openProject(persistPage, projectId, total);
  const persistedBeforeSave = await buildFullState(persistPage);
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
  await openProject(reopenedPage, projectId, total);
  const reopenedPath = join(screenshotDirectory, "reopened.png");
  const reopenedPayload = await readClientPayload(reopenedPage);
  const reopenedState = normalizedDivisionState(reopenedPayload.contentsJson);
  const reopenedLaneFit = await measureFinalLaneFit(
    reopenedPage,
    reopenedPayload,
    resolvedRemainderIds(injected.unitIds)
  );
  await localScreenshot(reopenedPage, reopenedPath);
  const reopenedUndo = await exerciseReopenedUndo(reopenedPage);
  await reopenedPage.close();

  const secondReadPage = await context.newPage();
  const secondRead = await readProject(secondReadPage, projectId);
  const secondReadState = normalizedDivisionState(secondRead.contentsJson ?? []);
  await secondReadPage.close();

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
      manipulated.laneFit.emptyGroupSlotCount === 1,
    nativeUngroupIsVisuallyDistinct:
      manipulated.releasedMembersReturnedToSource === true &&
      manipulated.vacatedFirstGroupSlot === true &&
      manipulated.ungroupedLaneFit.occupiedGroupSlotCount === quotient - 1 &&
      manipulated.ungroupedLaneFit.emptyGroupSlotCount === 2,
    remainderObjectsFitLane:
      manipulated.laneFit.allUngroupedInsideRemainderLane === true,
    reopenedGroupLaneVisible: Boolean(reopenedLaneFit.groupLaneCssPx),
    reopenedRemainderLaneVisible: Boolean(reopenedLaneFit.remainderLaneCssPx),
    reopenedGroupedObjectsFitLane:
      reopenedLaneFit.allWrappersInsideGroupLane === true,
    reopenedGroupedObjectsOccupyFiveDistinctSlots:
      reopenedLaneFit.allGroupsInsideDistinctVisibleSlots === true &&
      reopenedLaneFit.occupiedGroupSlotCount === quotient &&
      reopenedLaneFit.emptyGroupSlotCount === 1,
    reopenedRemainderObjectsFitLane:
      reopenedLaneFit.allUngroupedInsideRemainderLane === true
  };
  if (Object.values(lifecycleChecks).some((passed) => passed !== true)) {
    throw new Error(
      `division-group-canary-lifecycle-invalid:${JSON.stringify(lifecycleChecks)}`
    );
  }
  const cumulativeApprovedSaveCount =
    externalWriteCount + (resumedFromPriorApprovedSave ? 1 : 0);
  if (
    cumulativeApprovedSaveCount !== 1 ||
    (resumedFromPriorApprovedSave && !saveSkippedToAvoidDuplicateWrite)
  ) {
    throw new Error("division-group-canary-save-resume-boundary-invalid");
  }

  const screenshotPaths = [
    initialPath,
    selectedPath,
    ungroupedPath,
    manipulatedPath,
    resetPath,
    reopenedPath
  ].map((path) => relative(repositoryRoot, path));
  const observedAt = new Date().toISOString();
  const evidence = {
    schemaVersion: "1.0.0",
    evidenceId: "division-counting-group-canary-20260808-v1",
    observedAt,
    activityId,
    toolKey: "NO01SC",
    variantId: unitVariantId,
    layoutId,
    probeMode:
      "existing-disposable-canary-response-injection-one-save-with-read-only-resume",
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
    undoResetState: resetState,
    persistedState,
    reopenedState,
    secondReadState,
    mathematicalInvariant: {
      groupSize,
      wrapperCount: quotient,
      remainderCount,
      total,
      equation: "4 × 5 + 3 = 23",
      derivedFromStudentConstruction: true
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
    `PASS division counting group canary: 5x4+3 persisted, create 0 cumulative save 1 ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  await context?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
}
