#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
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
const total = 23;
const groupSize = 4;
const quotient = 5;
const remainderCount = 3;

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

function contains(outer, inner, tolerance = 2) {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
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
    ungroupedUnitCount: units.filter(
      (unit) => unit.isGroup !== true || !unit.groupId
    ).length,
    membershipValid
  };
  return {
    ...summary,
    semanticHash: sha256Hex(summary)
  };
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
    return [
      rectangleAt(
        `${role}-border-top`,
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
    ...borderLines("array-panel", "#4AA9D8"),
    ...borderLines("source-panel", "#E7B181"),
    ...borderLines("group-lane", "#5EA9D6"),
    ...borderLines("remainder-lane", "#D8B85B")
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
      "② 모형을 4개씩 선택해 ‘그룹’을 누르고, 만든 묶음을 아래 큰 칸에 놓으세요.",
      layoutBounds(preset, "header.secondary"),
      30
    ),
    text(
      "instruction-explain",
      "③ 남은 모형을 옮긴 뒤 식을 쓰고, 처음 답이 다르면 고치세요.",
      layoutBounds(preset, "header.tertiary"),
      30
    ),
    text(
      "question",
      "연필 23자루를 4자루씩 묶으면 몇 묶음이고 몇 자루가 남을까요?",
      itemBounds("question"),
      37
    ),
    text("pool-label", "고를 답", itemBounds("pool-label"), 28),
    text(
      "prediction-label",
      "처음 생각",
      itemBounds("prediction-label"),
      28
    ),
    text(
      "source-label",
      "모형 23개 — 아직 묶지 않았어요",
      itemBounds("source-label"),
      30
    ),
    text(
      "group-lane-label",
      "4개씩 묶은 것",
      itemBounds("group-lane-label"),
      30
    ),
    text(
      "remainder-lane-label",
      "남은 것",
      itemBounds("remainder-lane-label"),
      30
    ),
    text(
      "explanation-label",
      "묶음 수 × 한 묶음의 수 + 남은 수 = 전체 수를 쓰고, 답을 고쳐 보세요.",
      itemBounds("explanation-label"),
      27
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
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/project/${encodeURIComponent(id)}`, {
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`division-group-project-read-failed:${response.status}`);
    }
    return response.json();
  }, projectId);
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

async function selectIdsForGroup(page, ids) {
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
    const box = await page
      .locator(`[id="division-group-${role}-border-${side}"]`)
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
  const screenshotDirectory = assertPathInside(
    options["screenshot-dir"],
    join(repositoryRoot, ".mathcanvas-contract-lab", "previews"),
    "division group canary screenshots"
  );
  mkdirSync(screenshotDirectory, { recursive: true, mode: 0o700 });

  const sourceTitle = `${sourceTitlePrefix}${options["run-id"]}`;
  const blockedRequests = [];
  const blockedSavePayloads = [];
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
    typeof found.projectId !== "string"
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
  const unitTemplate = sourceProject.contentsJson?.find(
    (object) => object?.svgId === unitVariantId
  );
  if (!unitTemplate) {
    throw new Error("division-group-unit-template-missing");
  }
  injected = buildInjectedContents(unitTemplate);
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

  const captureBlockedSave = async (page) => {
    const before = blockedSavePayloads.length;
    await clickNamedControl(page, "저장");
    await page.waitForTimeout(350);
    if (blockedSavePayloads.length !== before + 1) {
      throw new Error("division-group-save-payload-not-captured");
    }
    return blockedSavePayloads.at(-1);
  };

  const persistCurrentState = async (page) => {
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
    [0.18, 0.34],
    [0.5, 0.34],
    [0.82, 0.34],
    [0.34, 0.73],
    [0.66, 0.73]
  ];

  const buildFullState = async (page, captureSelectedPath) => {
    const groupLaneBounds = await borderBounds(page, "group-lane");
    const remainderLaneBounds = await borderBounds(page, "remainder-lane");
    if (!groupLaneBounds || !remainderLaneBounds) {
      throw new Error("division-group-lane-not-visible");
    }
    let selectedChromeBox;
    for (let groupIndex = 0; groupIndex < quotient; groupIndex += 1) {
      const memberIds = injected.unitIds.slice(
        groupIndex * groupSize,
        (groupIndex + 1) * groupSize
      );
      const selected = await selectIdsForGroup(page, memberIds);
      if (groupIndex === 0) {
        selectedChromeBox = selected;
        if (captureSelectedPath) {
          await page.screenshot({ path: captureSelectedPath, fullPage: true });
        }
      }
      await clickNamedControl(page, "그룹");
      const payload = await captureBlockedSave(page);
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
    const remainderIds = injected.unitIds.slice(quotient * groupSize);
    for (const [index, id] of remainderIds.entries()) {
      await dragTo(
        page,
        page.locator(`[id="${id}"]`).first(),
        remainderLaneBounds.x + remainderLaneBounds.width * 0.5,
        remainderLaneBounds.y + remainderLaneBounds.height * (0.36 + index * 0.2)
      );
    }
    const payload = await captureBlockedSave(page);
    const state = normalizedDivisionState(payload.contentsJson);
    const wrapperBoxes = [];
    for (const wrapper of payload.contentsJson.filter(
      (object) => object?.svgId === "group-element"
    )) {
      const box = await page.locator(`[id="${wrapper.id}"]`).first().boundingBox();
      if (!box) throw new Error("division-group-wrapper-not-visible");
      wrapperBoxes.push(summarizeBounds(box));
    }
    const remainderBoxes = [];
    for (const id of remainderIds) {
      const box = await page.locator(`[id="${id}"]`).first().boundingBox();
      if (!box) throw new Error("division-group-remainder-not-visible");
      remainderBoxes.push(summarizeBounds(box));
    }
    return {
      payload,
      state,
      selectedChromeBox,
      laneFit: {
        allWrappersInsideGroupLane: wrapperBoxes.every((box) =>
          contains(groupLaneBounds, box)
        ),
        allUngroupedInsideRemainderLane: remainderBoxes.every((box) =>
          contains(remainderLaneBounds, box)
        ),
        groupLaneCssPx: summarizeBounds(groupLaneBounds),
        remainderLaneCssPx: summarizeBounds(remainderLaneBounds),
        wrapperBoxesCssPx: wrapperBoxes,
        remainderBoxesCssPx: remainderBoxes
      }
    };
  };

  const initialPage = await context.newPage();
  await openProject(initialPage, projectId, total);
  const initialState = normalizedDivisionState(injected.contentsJson);
  const initialPath = join(screenshotDirectory, "initial.png");
  await localScreenshot(initialPage, initialPath);
  const selectedPath = join(screenshotDirectory, "selected-first-four.png");
  const manipulated = await buildFullState(initialPage, selectedPath);
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

  const reopenedPage = await context.newPage();
  await openProject(reopenedPage, projectId, total);
  const reopenedPath = join(screenshotDirectory, "reopened.png");
  await localScreenshot(reopenedPage, reopenedPath);
  const reopenedState = normalizedDivisionState(
    persistedProject.contentsJson ?? []
  );
  const reopenedGroupLane = await borderBounds(reopenedPage, "group-lane");
  const reopenedRemainderLane = await borderBounds(reopenedPage, "remainder-lane");
  await reopenedPage.close();

  const secondReadPage = await context.newPage();
  const secondRead = await readProject(secondReadPage, projectId);
  const secondReadState = normalizedDivisionState(secondRead.contentsJson ?? []);
  await secondReadPage.close();

  const finalStateValid = (state) =>
    state.totalUnitCount === total &&
    state.wrapperCount === quotient &&
    state.wrapperMemberCounts.length === quotient &&
    state.wrapperMemberCounts.every((count) => count === groupSize) &&
    state.groupedMemberCount === quotient * groupSize &&
    state.uniqueGroupedMemberCount === quotient * groupSize &&
    state.duplicateMembershipCount === 0 &&
    state.nestedGroupCount === 0 &&
    state.ungroupedUnitCount === remainderCount &&
    state.membershipValid === true;
  if (
    initialState.wrapperCount !== 0 ||
    initialState.ungroupedUnitCount !== total ||
    resetState.semanticHash !== initialState.semanticHash ||
    !finalStateValid(manipulated.state) ||
    !finalStateValid(persistedBeforeSave.state) ||
    !finalStateValid(persistedState) ||
    !finalStateValid(reopenedState) ||
    !finalStateValid(secondReadState) ||
    persistedState.semanticHash !== persistedBeforeSave.state.semanticHash ||
    reopenedState.semanticHash !== persistedState.semanticHash ||
    secondReadState.semanticHash !== persistedState.semanticHash ||
    manipulated.laneFit.allWrappersInsideGroupLane !== true ||
    manipulated.laneFit.allUngroupedInsideRemainderLane !== true ||
    !reopenedGroupLane ||
    !reopenedRemainderLane
  ) {
    throw new Error("division-group-canary-lifecycle-invalid");
  }

  const screenshotPaths = [
    initialPath,
    selectedPath,
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
    probeMode: "existing-disposable-canary-response-injection-one-save",
    environment: {
      viewport: { width: 1280, height: 800 },
      profileScope: "dedicated-mathcanvas-profile",
      userChromeTouched: false,
      serviceWorkersBlocked: true,
      injectedProjectReadCount: injectedReadCount
    },
    writeBoundary: {
      existingDisposableProjectReused: true,
      createCount: 0,
      allowedSaveCount: externalWriteCount,
      allowedSaveStatus,
      unexpectedExternalWriteCount: 0,
      blockedNonSafeRequestCount: blockedRequests.length
    },
    initialState,
    selectedState: {
      semanticHash: initialState.semanticHash,
      selectedMemberCount: groupSize,
      selectionMethod: "shift-click-native-multi-select",
      selectedChromeBoxCssPx: manipulated.selectedChromeBox
    },
    manipulatedState: manipulated.state,
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
      remainderLaneCssPx: manipulated.laneFit.remainderLaneCssPx,
      selectedChromeBoxCssPx: manipulated.selectedChromeBox,
      wrapperBoxesCssPx: manipulated.laneFit.wrapperBoxesCssPx,
      remainderBoxesCssPx: manipulated.laneFit.remainderBoxesCssPx,
      allWrappersInsideGroupLane: true,
      allUngroupedInsideRemainderLane: true,
      selectionChromeRequiredAfterDeselect: false,
      persistentVisualGroupingByLane: true
    },
    roundTrip: {
      serverStateMatchesClientSave:
        persistedState.semanticHash === persistedBeforeSave.state.semanticHash,
      firstReopenMatchesServer:
        reopenedState.semanticHash === persistedState.semanticHash,
      secondReadMatchesServer:
        secondReadState.semanticHash === persistedState.semanticHash
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
    `PASS division counting group canary: 5x4+3 persisted, create 0 save 1 ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  await context?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
}
