#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { sha256Hex } from "../../packages/contracts/dist/index.js";
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
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";

const origin = "https://mathcanvas.vivasam.com";
const moduleKey = "NO04PD";
const expectedVariantIds = Array.from(
  { length: 9 },
  (_, index) => `${moduleKey}-${String(index + 1).padStart(2, "0")}`
);
const rawOutput = join(
  defaultRawRoot,
  "wave14-place-value-model-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave14-place-value-model-canary.roundtrip.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "wave14",
  "place-value-model-contract.png"
);

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
      typeof tool?.moduleKey === "string" &&
      Object.hasOwn(moduleArr, tool.categoryId)
    ) {
      moduleArr[tool.categoryId][tool.moduleKey] =
        tool.moduleKey === moduleKey;
    }
  }
  if (moduleArr.Unit01[moduleKey] !== true) {
    throw new Error("place-value-model-missing-from-catalog");
  }
  return moduleArr;
}

function buildPayload() {
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
    categoryId: "rJa0d46MAy",
    contentsJson: [],
    isNoteworthy: false,
    isShowMenuOnActivity: true,
    projectTitle: "AI-CONTRACT-PROBE-W14-NO04PD",
    studyLevel: "elementary",
    tags: []
  };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)])
  );
}

function exactHash(value) {
  return JSON.stringify(stableValue(value));
}

async function currentItemIds(page) {
  return page
    .locator(".item.group")
    .evaluateAll((elements) => elements.map((element) => element.id));
}

async function createFromPalette(page, icon, pointerId) {
  const before = await currentItemIds(page);
  await icon.evaluate(
    (element, id) => {
      const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: 100 + id,
        clientY: 300 + id,
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
    pointerId
  );
  await page.waitForTimeout(180);
  const after = await currentItemIds(page);
  const added = after.filter((id) => !before.includes(id));
  if (added.length !== 1) {
    throw new Error(
      `place-value-palette-create-mismatch:${JSON.stringify({
        beforeCount: before.length,
        afterCount: after.length,
        added
      })}`
    );
  }
  return added[0];
}

async function dragItem(page, objectId, distance, pointerId) {
  const locator = page.locator(`[id="${objectId}"]`);
  const before = await locator.boundingBox();
  if (!before) throw new Error("place-value-drag-source-missing");
  await locator.evaluate(
    (element, { delta, id }) => {
      const root = document.getElementById("math-parent-element");
      if (!root) throw new Error("place-value-drag-root-missing");
      const bounds = element.getBoundingClientRect();
      const base = {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: id,
        pointerType: "mouse",
        isPrimary: true
      };
      element.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...base,
          clientX: bounds.x + bounds.width / 2,
          clientY: bounds.y + bounds.height / 2,
          buttons: 1
        })
      );
      root.dispatchEvent(
        new PointerEvent("pointermove", {
          ...base,
          clientX: bounds.x + bounds.width / 2 + delta,
          clientY: bounds.y + bounds.height / 2,
          buttons: 1
        })
      );
      root.dispatchEvent(
        new PointerEvent("pointerup", {
          ...base,
          clientX: bounds.x + bounds.width / 2 + delta,
          clientY: bounds.y + bounds.height / 2,
          buttons: 0
        })
      );
    },
    { delta: distance, id: pointerId }
  );
  await page.waitForTimeout(350);
  const after = await locator.boundingBox();
  if (!after) throw new Error("place-value-drag-target-missing");
  return {
    distance: Math.abs(after.x - before.x),
    verticalResidual: Math.abs(after.y - before.y),
    pointerId
  };
}

function nativeObjects(contentsJson) {
  return (contentsJson ?? []).filter(
    (object) =>
      typeof object?.svgId === "string" &&
      expectedVariantIds.includes(object.svgId)
  );
}

function assertVariantSet(contentsJson, phase) {
  const objects = nativeObjects(contentsJson);
  const variants = objects.map((object) => object.svgId).sort();
  if (
    objects.length !== expectedVariantIds.length ||
    new Set(variants).size !== expectedVariantIds.length ||
    exactHash(variants) !== exactHash(expectedVariantIds)
  ) {
    throw new Error(
      `${phase}-place-value-variant-set-mismatch:${JSON.stringify({
        expected: expectedVariantIds,
        observed: variants
      })}`
    );
  }
  return objects;
}

function sanitizeWire(objects) {
  return objects
    .map((object) => ({
      ...structuredClone(object),
      id: `<object-id:${object.svgId}>`
    }))
    .sort((left, right) => left.svgId.localeCompare(right.svgId));
}

let context;
let authSession;
let releaseLock;
try {
  const payload = buildPayload();
  const payloadHash = sha256Hex(payload);
  const stateDirectory = resolveStateDirectory();
  releaseLock = acquireManagedProfileLock(stateDirectory);
  authSession = await createLiveAuthHeadlessSession(stateDirectory);
  const createContext = await authSession.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const createPage = await createContext.newPage();
  await createPage.goto(`${origin}/ko`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  const createResult = await createPage.evaluate(async (projectPayload) => {
    const response = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      credentials: "include",
      body: JSON.stringify(projectPayload)
    });
    return {
      status: response.status,
      body: await response.json().catch(() => ({}))
    };
  }, payload);
  await createContext.close();
  if (
    createResult.status < 200 ||
    createResult.status >= 300 ||
    typeof createResult.body?.projectId !== "string"
  ) {
    throw new Error(
      `wave14-place-value-create-failed:${createResult.status}`
    );
  }
  const creation = {
    ok: true,
    projectId: createResult.body.projectId,
    editorUrl:
      `${origin}/ko/view/${encodeURIComponent(createResult.body.projectId)}`
  };

  let savedPayload;
  let saveStatus = 0;
  let saveArmed = false;
  let resolveSave;
  let rejectSave;
  const saveResponse = new Promise((resolve, reject) => {
    resolveSave = resolve;
    rejectSave = reject;
  });
  const blockedWrites = [];
  context = await authSession.newContext({
    viewport: { width: 1630, height: 1500 }
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      await route.continue();
      return;
    }
    const path = new URL(request.url()).pathname;
    const expectedPath = `/api/project/${encodeURIComponent(creation.projectId)}`;
    if (saveArmed && method === "PUT" && path === expectedPath) {
      savedPayload = request.postDataJSON();
      await route.continue();
      return;
    }
    blockedWrites.push({
      method,
      path: path.replaceAll(
        creation.projectId,
        "<redacted-project>"
      )
    });
    await route.abort("blockedbyclient");
  });
  context.on("response", (response) => {
    const request = response.request();
    const path = new URL(request.url()).pathname;
    if (
      request.method().toUpperCase() === "PUT" &&
      path === `/api/project/${encodeURIComponent(creation.projectId)}`
    ) {
      saveStatus = response.status();
      saveArmed = false;
      if (response.ok()) resolveSave(saveStatus);
      else rejectSave(new Error(`wave14-place-value-save-failed:${saveStatus}`));
    }
  });

  let page = await context.newPage();
  await page.goto(creation.editorUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForTimeout(2500);
  const icons = page.locator("svg.icons[id^='NO04PD-']");
  const observedVariantIds = await icons.evaluateAll((elements) =>
    elements.map((element) => element.id).sort()
  );
  if (exactHash(observedVariantIds) !== exactHash(expectedVariantIds)) {
    throw new Error(
      `place-value-palette-variant-mismatch:${JSON.stringify(observedVariantIds)}`
    );
  }
  const objectIds = [];
  for (let index = 0; index < expectedVariantIds.length; index += 1) {
    objectIds.push(
      await createFromPalette(page, icons.nth(index), 140 + index)
    );
  }
  const movement = await dragItem(page, objectIds[3], 90, 260);
  if (movement.distance < 30 || movement.verticalResidual > 5) {
    throw new Error(`place-value-model-drag-mismatch:${JSON.stringify(movement)}`);
  }

  const saveControl = page
    .locator("#top-toolbar div.cursor-pointer")
    .filter({ hasText: /^\s*저장\s*$/ })
    .first();
  if (!(await saveControl.isVisible().catch(() => false))) {
    throw new Error("place-value-save-control-unavailable");
  }
  saveArmed = true;
  await saveControl.click();
  await Promise.race([
    saveResponse,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("wave14-place-value-save-timeout")),
        30_000
      )
    )
  ]);
  if (!savedPayload || saveStatus < 200 || saveStatus >= 300) {
    throw new Error("wave14-place-value-save-boundary-invalid");
  }
  const savedObjects = assertVariantSet(savedPayload.contentsJson, "saved");
  mkdirSync(dirname(previewOutput), { recursive: true, mode: 0o700 });
  await page.screenshot({ path: previewOutput, fullPage: true });

  await page.close();
  page = await context.newPage();
  await page.goto(creation.editorUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  const reopened = await page.evaluate(async (projectId) => {
    const response = await fetch(
      `/api/project/${encodeURIComponent(projectId)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) throw new Error(`project-reopen-failed:${response.status}`);
    return response.json();
  }, creation.projectId);
  const reopenedObjects = assertVariantSet(
    reopened.contentsJson,
    "reopened"
  );
  const reopenedByVariant = new Map(
    reopenedObjects.map((object) => [object.svgId, object])
  );
  const identityPreserved = savedObjects.every(
    (object) => reopenedByVariant.get(object.svgId)?.id === object.id
  );
  const commonFieldNames = Object.keys(savedObjects[0])
    .filter((field) =>
      savedObjects.every((object) => Object.hasOwn(object, field))
    )
    .sort();
  const evidence = {
    schemaVersion: "1.0.0",
    evidenceId: "wave14-place-value-model-canary-roundtrip",
    observedAt: new Date().toISOString(),
    status: "pass",
    scope: {
      category: "수와 연산",
      categoryId: "rJa0d46MAy",
      moduleKey,
      observedName: "자릿값 모형"
    },
    lifecycle: {
      createdProjectCount: 1,
      existingProjectWriteCount: 0,
      saveCount: 1,
      paletteVariantCount: observedVariantIds.length,
      savedObjectCount: savedObjects.length,
      reopenedObjectCount: reopenedObjects.length,
      identityPreserved
    },
    interaction: {
      action: "drag-place-value-ten-piece",
      variantId: "NO04PD-04",
      distance: movement.distance,
      verticalResidual: movement.verticalResidual
    },
    variants: expectedVariantIds,
    commonFieldNames,
    savedWireExamples: sanitizeWire(savedObjects),
    blockedWrites,
    previewPath:
      ".mathcanvas-contract-lab/previews/wave14/place-value-model-contract.png"
  };
  assertNoSensitiveData(evidence);
  mkdirSync(dirname(evidenceOutput), { recursive: true, mode: 0o700 });
  mkdirSync(dirname(rawOutput), { recursive: true, mode: 0o700 });
  writeFileSync(evidenceOutput, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
  writeFileSync(
    rawOutput,
    stableJson({
      schemaVersion: "1.0.0",
      observedAt: evidence.observedAt,
      payloadHash,
      creation,
      savedPayload,
      reopened
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `PASS ${moduleKey} ${savedObjects.length} variants saved, moved, and reopened\n`
  );
  process.stdout.write(`PREVIEW ${previewOutput}\n`);
} finally {
  await context?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
  releaseLock?.();
}
