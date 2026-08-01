#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";
import {
  acquireManagedProfileLock,
  defaultRawRoot,
  defaultResearchRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";

const origin = "https://mathcanvas.vivasam.com";
const categoryId = "4l_eHBivNq";
const moduleKey = "CR07BS";
const expectedScaleVariants = [
  "CR07BS-01",
  "CR07BS-02",
  "CR07BS-03",
  "CR07BS-04",
  "CR07BS-05"
];
const knownCardVariant = "NO04NT-04";
const projectPrefix = "AI-CONTRACT-PROBE-W5B-CR07BS";
const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const rawOutputPath = join(
  defaultRawRoot,
  "wave5-balance-scale-canary.raw.json"
);
const debugOutputPath = join(
  defaultRawRoot,
  "wave5-balance-scale-canary.debug.png"
);
const evidenceOutputPath = join(
  defaultResearchRoot,
  "wave5-balance-scale-canary.roundtrip.json"
);

function routePath(url) {
  const parsed = new URL(url);
  return parsed.origin === origin
    ? parsed.pathname
    : `${parsed.origin}${parsed.pathname}`;
}

function hash(value) {
  return createHash("sha256")
    .update(stableJson(value))
    .digest("hex");
}

function buildModuleActivationMap() {
  const catalog = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "research",
        "mathcanvas",
        "tool-catalog.snapshot.json"
      ),
      "utf8"
    )
  );
  const moduleArr = {
    Unit01: {},
    Unit02: {},
    Unit03: {},
    Unit04: {}
  };
  for (const tool of catalog.tools ?? []) {
    if (
      typeof tool?.moduleKey !== "string" ||
      !Object.hasOwn(moduleArr, tool.categoryId)
    ) {
      continue;
    }
    moduleArr[tool.categoryId][tool.moduleKey] =
      tool.moduleKey === moduleKey ||
      tool.moduleKey === "NO04NT";
  }
  if (
    moduleArr.Unit02[moduleKey] !== true ||
    moduleArr.Unit01.NO04NT !== true
  ) {
    throw new Error("balance-scale-required-modules-missing");
  }
  return moduleArr;
}

function buildProbePayload() {
  return {
    canvasOption: {
      canvasCenterCoordinate: { cx: 1200, cy: 1740 },
      CR07BSArr: [],
      CR07BSObj: {
        type1: 0.3,
        type2: 0.3,
        type3: 0.3,
        weight: 0
      },
      grid: {
        distance: { x: 40, y: 40 },
        isGrid: false,
        isGridToggle: false,
        type: "none"
      },
      isCaptured: false,
      lockIds: [],
      moduleArr: buildModuleActivationMap(),
      penElements: [],
      scale: 5,
      viewBox: [0, 0, 2400, 3480]
    },
    categoryId,
    contentsJson: [],
    isNoteworthy: false,
    isShowMenuOnActivity: true,
    projectTitle: `${projectPrefix}-${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}`,
    studyLevel: "elementary",
    tags: []
  };
}

async function waitForAuthentication(page, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = await page
      .evaluate(async () => {
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
      })
      .catch(() => 0);
    if (status === 200) return;
    await page.waitForTimeout(500);
  }
  throw new Error("auth-required");
}

async function getProject(page, projectId) {
  return page.evaluate(async (id) => {
    const response = await fetch(
      `/api/project/${encodeURIComponent(id)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`project-reopen-failed:${response.status}`);
    }
    return response.json();
  }, projectId);
}

async function currentItems(page) {
  return page.locator(".item.group").evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.id,
      svgId: element.querySelector("svg")?.id ?? null
    }))
  );
}

async function createFromPalette(
  page,
  variantId,
  point,
  pointerId
) {
  const before = await currentItems(page);
  const icon = page.locator(
    `svg.icons[id="${variantId}"]`
  );
  await icon.waitFor({ state: "attached", timeout: 15_000 });
  await icon.evaluate(
    (element, { x, y, id }) => {
      const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1
      };
      element.dispatchEvent(new PointerEvent("pointerdown", init));
      document
        .getElementById("math-parent-element")
        ?.dispatchEvent(
          new PointerEvent("pointerup", {
            ...init,
            buttons: 0
          })
        );
    },
    { ...point, id: pointerId }
  );
  await page.waitForTimeout(250);
  const after = await currentItems(page);
  const added = after.filter(
    (item) => !before.some((previous) => previous.id === item.id)
  );
  if (added.length !== 1) {
    throw new Error(
      `balance-scale-palette-create-mismatch:${variantId}:${JSON.stringify({
        before: before.length,
        after: after.length,
        added
      })}`
    );
  }
  return added[0].id;
}

async function plateCenter(page, scaleId, side) {
  return page.locator(
    `[id="${scaleId}"] path.plate-${side}[stroke-dasharray]`
  ).evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  });
}

async function moveItem(page, objectId, point) {
  const source = await page
    .locator(`[id="${objectId}"]`)
    .boundingBox();
  if (!source) {
    throw new Error(`balance-scale-item-bounds-missing:${objectId}`);
  }
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function clickEquilibrium(page, scaleId) {
  const button = page.locator(
    `[id="${scaleId}"] .equilibrium-button`
  );
  const className = await button.getAttribute("class");
  if (className?.includes("no-equal")) {
    throw new Error("balance-scale-equilibrium-unavailable");
  }
  await button.evaluate((element) => {
    const visibleShape = element.querySelector("rect");
    const bounds = visibleShape?.getBoundingClientRect();
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: bounds
        ? bounds.x + bounds.width / 2
        : 0,
      clientY: bounds
        ? bounds.y + bounds.height / 2
        : 0,
      pointerId: 990,
      pointerType: "mouse",
      isPrimary: true,
      buttons: 1
    };
    element.dispatchEvent(new PointerEvent("pointerdown", init));
    element.dispatchEvent(
      new PointerEvent("pointerup", {
        ...init,
        buttons: 0
      })
    );
  });
  await page.waitForTimeout(600);
}

function selectProbeObjects(contents) {
  return (contents ?? []).filter(
    (object) =>
      expectedScaleVariants.includes(object?.svgId) ||
      object?.svgId === knownCardVariant
  );
}

function assertPersistedState(project, phase) {
  const objects = selectProbeObjects(project.contentsJson);
  const scaleObjects = objects.filter((object) =>
    expectedScaleVariants.includes(object.svgId)
  );
  const observed = scaleObjects
    .map((object) => object.svgId)
    .sort();
  if (
    objects.length !== 6 ||
    observed.join("|") !==
      [...expectedScaleVariants].sort().join("|")
  ) {
    throw new Error(
      `${phase}-balance-scale-object-set-mismatch:${JSON.stringify({
        observed,
        objectCount: objects.length
      })}`
    );
  }
  const scale = scaleObjects.find(
    (object) => object.svgId === "CR07BS-01"
  );
  const unknown = scaleObjects.find(
    (object) => object.svgId === "CR07BS-02"
  );
  const card = objects.find(
    (object) => object.svgId === knownCardVariant
  );
  if (
    !scale ||
    !unknown ||
    !card ||
    unknown.plate !== scale.id ||
    card.plate !== scale.id ||
    scale.plate?.left !== 0 ||
    scale.plate?.right !== 0 ||
    project.canvasOption?.CR07BSObj?.type1 !== 3 ||
    !Array.isArray(project.canvasOption?.CR07BSArr) ||
    project.canvasOption.CR07BSArr.length < 1
  ) {
    throw new Error(
      `${phase}-balance-scale-semantic-state-mismatch:${JSON.stringify({
        scale: scale
          ? {
              id: scale.id,
              plate: scale.plate,
              canEquilibrium: scale.canEquilibrium
            }
          : null,
        unknownPlate: unknown?.plate,
        cardPlate: card?.plate,
        CR07BSObj: project.canvasOption?.CR07BSObj,
        CR07BSArr: project.canvasOption?.CR07BSArr
      })}`
    );
  }
  return { objects, scale, unknown, card };
}

function sanitizeObjects(objects) {
  const idMap = new Map(
    objects.map((object) => [
      object.id,
      `<object-id:${object.svgId}>`
    ])
  );
  return objects
    .map((object) => {
      const copy = structuredClone(object);
      copy.id = idMap.get(copy.id);
      if (typeof copy.plate === "string") {
        copy.plate = idMap.get(copy.plate) ?? "<scale-id>";
      }
      for (const key of ["leftIncluded", "rightIncluded"]) {
        if (Array.isArray(copy[key])) {
          copy[key] = copy[key].map(
            (id) => idMap.get(id) ?? "<object-id>"
          );
        }
      }
      return copy;
    })
    .sort((left, right) =>
      left.svgId.localeCompare(right.svgId)
    );
}

let context;
let releaseLock;
let page;
try {
  const stateDirectory = resolveStateDirectory();
  releaseLock = acquireManagedProfileLock(stateDirectory);
  const payload = buildProbePayload();
  const allowedWrites = [];
  const blockedWrites = [];
  const writeRequests = new Map();
  let projectId;
  let projectTitle;
  let createArmed = false;
  let saveArmed = false;
  let savedPayload;
  let resolveSave;
  let rejectSave;
  const saveResponse = new Promise((resolve, reject) => {
    resolveSave = resolve;
    rejectSave = reject;
  });

  context = await chromium.launchPersistentContext(
    join(stateDirectory, "chrome-profile"),
    {
      channel: "chrome",
      headless: true,
      viewport: { width: 1600, height: 1000 }
    }
  );
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (!writeMethods.has(method)) {
      await route.continue();
      return;
    }
    const requestOrigin = new URL(request.url()).origin;
    const path = routePath(request.url());
    if (
      requestOrigin === origin &&
      createArmed &&
      method === "POST" &&
      path === "/api/project" &&
      allowedWrites.length === 0
    ) {
      const record = { method, path, status: 0 };
      allowedWrites.push(record);
      writeRequests.set(request, record);
      await route.continue();
      return;
    }
    if (
      requestOrigin === origin &&
      saveArmed &&
      method === "PUT" &&
      path ===
        `/api/project/${encodeURIComponent(projectId)}` &&
      allowedWrites.length === 1
    ) {
      savedPayload = request.postDataJSON();
      const record = {
        method,
        path: "/api/project/<redacted-project>",
        status: 0
      };
      allowedWrites.push(record);
      writeRequests.set(request, record);
      saveArmed = false;
      await route.continue();
      return;
    }
    if (
      requestOrigin === origin &&
      method === "POST" &&
      path.endsWith("/upload-image")
    ) {
      blockedWrites.push({
        method,
        path: "/api/project/<redacted-project>/upload-image",
        reason: "optional-preview-upload-blocked"
      });
      await route.abort("blockedbyclient");
      return;
    }
    blockedWrites.push({ method, path });
    if (saveArmed) {
      rejectSave(
        new Error(`unexpected-write-blocked:${method}:${path}`)
      );
    }
    await route.abort("blockedbyclient");
  });
  context.on("response", (response) => {
    const request = response.request();
    const record = writeRequests.get(request);
    if (!record) return;
    record.status = response.status();
    if (record.method === "PUT") {
      if (response.ok()) resolveSave(response.status());
      else {
        rejectSave(
          new Error(`balance-scale-save-failed:${response.status()}`)
        );
      }
    }
  });

  page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await waitForAuthentication(page);

  if (existsSync(rawOutputPath)) {
    const checkpoint = JSON.parse(
      readFileSync(rawOutputPath, "utf8")
    );
    projectId = checkpoint.projectId;
    projectTitle = checkpoint.projectTitle;
    allowedWrites.push({
      method: "POST",
      path: "/api/project",
      status: 201,
      recovery: "raw-checkpoint"
    });
    const recovered = await getProject(page, projectId);
    if (selectProbeObjects(recovered.contentsJson).length === 6) {
      allowedWrites.push({
        method: "PUT",
        path: "/api/project/<redacted-project>",
        status: 200,
        recovery: "persisted-save-observed"
      });
    }
  } else {
    createArmed = true;
    const created = await page.evaluate(
      async (projectPayload) => {
        const response = await fetch("/api/project", {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=utf-8"
          },
          credentials: "include",
          body: JSON.stringify(projectPayload)
        });
        return {
          status: response.status,
          body: await response.json().catch(() => ({}))
        };
      },
      payload
    );
    createArmed = false;
    projectId = created.body?.projectId;
    projectTitle = payload.projectTitle;
    if (
      created.status < 200 ||
      created.status >= 300 ||
      typeof projectId !== "string" ||
      allowedWrites.length !== 1
    ) {
      throw new Error(
        `balance-scale-create-failed:${JSON.stringify(created)}`
      );
    }
    allowedWrites[0].status = created.status;
    mkdirSync(dirname(rawOutputPath), {
      recursive: true,
      mode: 0o700
    });
    writeFileSync(
      rawOutputPath,
      stableJson({
        schemaVersion: "1.0.0",
        projectId,
        projectTitle,
        payloadHash: hash(payload),
        state: "created-empty"
      }),
      { encoding: "utf8", mode: 0o600 }
    );
  }

  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(projectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForTimeout(3000);

  let reopened = await getProject(page, projectId);
  let savedState;
  if (selectProbeObjects(reopened.contentsJson).length !== 6) {
    let pointerId = 700;
    const scaleId = await createFromPalette(
      page,
      "CR07BS-01",
      { x: 820, y: 670 },
      pointerId++
    );
    const left = await plateCenter(page, scaleId, "left");
    const right = await plateCenter(page, scaleId, "right");
    const unknownId = await createFromPalette(
      page,
      "CR07BS-02",
      left,
      pointerId++
    );
    await createFromPalette(
      page,
      "CR07BS-03",
      { x: 1160, y: 470 },
      pointerId++
    );
    await createFromPalette(
      page,
      "CR07BS-04",
      { x: 1270, y: 470 },
      pointerId++
    );
    await createFromPalette(
      page,
      "CR07BS-05",
      { x: 1380, y: 470 },
      pointerId++
    );
    const cardId = await createFromPalette(
      page,
      knownCardVariant,
      right,
      pointerId++
    );
    await moveItem(page, unknownId, left);
    await moveItem(page, cardId, right);
    await clickEquilibrium(page, scaleId);

    const saveControl = page
      .locator("#top-toolbar div.cursor-pointer")
      .filter({ hasText: /^\s*저장\s*$/ })
      .first();
    if (!(await saveControl.isVisible().catch(() => false))) {
      throw new Error("balance-scale-save-control-unavailable");
    }
    saveArmed = true;
    await saveControl.click();
    const saveStatus = await Promise.race([
      saveResponse,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("balance-scale-save-timeout")),
          30_000
        )
      )
    ]);
    if (
      saveStatus < 200 ||
      saveStatus >= 300 ||
      allowedWrites.length !== 2 ||
      !savedPayload
    ) {
      throw new Error("balance-scale-save-boundary-invalid");
    }
    savedState = assertPersistedState(savedPayload, "saved");
    writeFileSync(
      rawOutputPath,
      stableJson({
        schemaVersion: "1.0.0",
        projectId,
        projectTitle,
        payloadHash: hash(payload),
        state: "saved",
        savedPayloadHash: hash(savedPayload)
      }),
      { encoding: "utf8", mode: 0o600 }
    );
    await page.close();
    page = await context.newPage();
    await page.goto(
      `${origin}/ko/view/${encodeURIComponent(projectId)}`,
      { waitUntil: "domcontentloaded", timeout: 30_000 }
    );
    await page.waitForSelector(".playground", {
      state: "attached",
      timeout: 30_000
    });
    await page.waitForTimeout(1500);
    reopened = await getProject(page, projectId);
  } else {
    savedState = assertPersistedState(reopened, "recovered");
  }
  const reopenedState = assertPersistedState(reopened, "reopened");

  const evidence = {
    schemaVersion: "1.0.0",
    evidenceId: "wave5-balance-scale-canary-roundtrip",
    observedAt: new Date().toISOString(),
    scope: {
      category: "변화와 관계",
      categoryId,
      moduleKey,
      observedName: "접시저울"
    },
    lifecycle: {
      createdProjectCount: 1,
      existingProjectWriteCount: 0,
      saveCount: 1,
      savedObjectCount: savedState.objects.length,
      reopenedObjectCount: reopenedState.objects.length,
      identityPreserved: savedState.objects.every((saved) =>
        reopenedState.objects.some(
          (object) =>
            object.id === saved.id &&
            object.svgId === saved.svgId
        )
      ),
      plateMembershipPreserved:
        reopenedState.unknown.plate === reopenedState.scale.id &&
        reopenedState.card.plate === reopenedState.scale.id,
      balanceStatePreserved:
        reopenedState.scale.plate.left === 0 &&
        reopenedState.scale.plate.right === 0,
      inferredType1Value:
        reopened.canvasOption.CR07BSObj.type1,
      relationCount:
        reopened.canvasOption.CR07BSArr.length
    },
    variants: expectedScaleVariants,
    compatibleReleasedTool: knownCardVariant,
    canvasState: {
      CR07BSArr: reopened.canvasOption.CR07BSArr,
      CR07BSObj: reopened.canvasOption.CR07BSObj
    },
    savedWireExamples: sanitizeObjects(savedState.objects),
    reopenedWireExamples: sanitizeObjects(
      reopenedState.objects
    ),
    writeBoundary: {
      allowedWrites,
      blockedWrites,
      existingProjectWriteCount: 0
    }
  };
  assertNoSensitiveData(evidence);
  mkdirSync(dirname(evidenceOutputPath), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(
    evidenceOutputPath,
    stableJson(evidence),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `PASS balance-scale canary ${projectId} ` +
      `${reopenedState.objects.length} objects, ` +
      `${evidence.lifecycle.relationCount} relation\n`
  );
} catch (error) {
  if (page && !page.isClosed()) {
    await page
      .screenshot({
        path: debugOutputPath,
        fullPage: true
      })
      .catch(() => undefined);
  }
  throw error;
} finally {
  await context?.close().catch(() => undefined);
  releaseLock?.();
}
