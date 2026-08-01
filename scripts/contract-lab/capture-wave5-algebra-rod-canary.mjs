#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
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
const moduleKey = "CR07AT";
const expectedVariantIds = Array.from(
  { length: 18 },
  (_, index) => `${moduleKey}-${String(index + 1).padStart(2, "0")}`
);
const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const rawOutputPath = join(
  defaultRawRoot,
  "wave5-algebra-rod-canary.raw.json"
);
const evidenceOutputPath = join(
  defaultResearchRoot,
  "wave5-algebra-rod-canary.roundtrip.json"
);

function runId(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function routePath(url) {
  const parsed = new URL(url);
  return parsed.origin === origin
    ? parsed.pathname
    : `${parsed.origin}${parsed.pathname}`;
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
      !Object.hasOwn(moduleArr, tool?.categoryId)
    ) {
      continue;
    }
    moduleArr[tool.categoryId][tool.moduleKey] =
      tool.moduleKey === moduleKey;
  }
  if (moduleArr.Unit02[moduleKey] !== true) {
    throw new Error("algebra-rod-module-missing-from-catalog");
  }
  return moduleArr;
}

function buildProbePayload(probeRunId) {
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
    projectTitle: `AI-CONTRACT-PROBE-W5A-CR07AT-${probeRunId}`,
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
          const response = await fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store"
          });
          return response.status;
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
      {
        credentials: "include",
        cache: "no-store"
      }
    );
    if (!response.ok) {
      throw new Error(`project-reopen-failed:${response.status}`);
    }
    return response.json();
  }, projectId);
}

function algebraRodObjects(contentsJson) {
  return (contentsJson ?? []).filter(
    (object) =>
      typeof object?.svgId === "string" &&
      expectedVariantIds.includes(object.svgId)
  );
}

function assertAllVariants(contentsJson, phase) {
  const objects = algebraRodObjects(contentsJson);
  const observed = objects.map((object) => object.svgId).sort();
  if (
    objects.length !== expectedVariantIds.length ||
    new Set(observed).size !== expectedVariantIds.length ||
    exactHash(observed) !== exactHash(expectedVariantIds)
  ) {
    throw new Error(
      `${phase}-variant-set-mismatch:${JSON.stringify({
        expected: expectedVariantIds,
        observed,
        totalObjects: contentsJson?.length ?? 0
      })}`
    );
  }
  if (
    objects.some(
      (object) =>
        typeof object.id !== "string" ||
        typeof object.svgId !== "string"
    )
  ) {
    throw new Error(`${phase}-identity-fields-missing`);
  }
  return objects;
}

function sanitizeWire(objects) {
  return objects
    .map((object) => {
      const copy = structuredClone(object);
      copy.id = `<object-id:${copy.svgId}>`;
      return copy;
    })
    .sort((left, right) => left.svgId.localeCompare(right.svgId));
}

function compareLifecycle(savedObjects, reopenedObjects) {
  const reopenedBySvgId = new Map(
    reopenedObjects.map((object) => [object.svgId, object])
  );
  const differences = [];
  const serverNormalizationFields = new Set();
  for (const saved of savedObjects) {
    const reopened = reopenedBySvgId.get(saved.svgId);
    if (!reopened) {
      differences.push({
        svgId: saved.svgId,
        reason: "missing-after-reopen"
      });
      continue;
    }
    if (saved.id !== reopened.id) {
      differences.push({
        svgId: saved.svgId,
        reason: "id-changed"
      });
    }
    if (exactHash(saved) !== exactHash(reopened)) {
      const fields = [
        ...new Set([
          ...Object.keys(saved),
          ...Object.keys(reopened)
        ])
      ]
        .filter(
          (field) =>
            exactHash(saved[field]) !== exactHash(reopened[field])
        )
        .sort();
      if (fields.every((field) => field === "x")) {
        fields.forEach((field) =>
          serverNormalizationFields.add(field)
        );
        continue;
      }
      differences.push({
        svgId: saved.svgId,
        reason: "wire-changed",
        fields
      });
    }
  }
  if (differences.length > 0) {
    throw new Error(
      `algebra-rod-reopen-mismatch:${JSON.stringify(differences)}`
    );
  }
  return [...serverNormalizationFields].sort();
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
  await page.waitForTimeout(100);
  const after = await currentItemIds(page);
  const added = after.filter((id) => !before.includes(id));
  if (added.length !== 1) {
    throw new Error(
      `algebra-rod-palette-create-mismatch:${JSON.stringify({
        beforeCount: before.length,
        afterCount: after.length,
        added
      })}`
    );
  }
  return added[0];
}

async function tapItem(page, objectId, pointerId) {
  await page.locator(`[id="${objectId}"]`).evaluate(
    (element, id) => {
      const bounds = element.getBoundingClientRect();
      const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: bounds.x + bounds.width / 2,
        clientY: bounds.y + bounds.height / 2,
        pointerId: id,
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
    },
    pointerId
  );
}

async function invertItem(page, objectId, pointerId) {
  const before = await currentItemIds(page);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!(await page.locator(`[id="${objectId}"]`).count())) break;
    await tapItem(page, objectId, pointerId + attempt);
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(300);
  const after = await currentItemIds(page);
  const added = after.filter((id) => !before.includes(id));
  if (
    added.length !== 1 ||
    after.includes(objectId) ||
    after.length !== before.length
  ) {
    throw new Error(
      `algebra-rod-sign-invert-mismatch:${JSON.stringify({
        objectId,
        beforeCount: before.length,
        afterCount: after.length,
        added
      })}`
    );
  }
  return added[0];
}

async function mergeOppositeItems(
  page,
  positiveObjectId,
  negativeObjectId,
  pointerId
) {
  const before = await currentItemIds(page);
  await page.locator(`[id="${positiveObjectId}"]`).evaluate(
    (element, { targetId, id }) => {
      const target = document.getElementById(targetId);
      const root = document.getElementById("math-parent-element");
      if (!target || !root) {
        throw new Error("algebra-rod-merge-target-unavailable");
      }
      const start = element.getBoundingClientRect();
      const end = target.getBoundingClientRect();
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
          clientX: start.x + start.width / 2,
          clientY: start.y + start.height / 2,
          buttons: 1
        })
      );
      root.dispatchEvent(
        new PointerEvent("pointermove", {
          ...base,
          clientX: end.x + end.width / 2,
          clientY: end.y + end.height / 2,
          buttons: 1
        })
      );
      root.dispatchEvent(
        new PointerEvent("pointerup", {
          ...base,
          clientX: end.x + end.width / 2,
          clientY: end.y + end.height / 2,
          buttons: 0
        })
      );
    },
    { targetId: negativeObjectId, id: pointerId }
  );
  await page.waitForTimeout(400);
  const after = await currentItemIds(page);
  const added = after.filter((id) => !before.includes(id));
  if (
    added.length !== 1 ||
    after.includes(positiveObjectId) ||
    after.includes(negativeObjectId) ||
    after.length !== before.length - 1
  ) {
    throw new Error(
      `algebra-rod-opposite-merge-mismatch:${JSON.stringify({
        positiveObjectId,
        negativeObjectId,
        beforeCount: before.length,
        afterCount: after.length,
        added
      })}`
    );
  }
  return added[0];
}

let context;
let releaseLock;
try {
  const observedAt = new Date();
  const probeRunId = runId(observedAt);
  const payload = buildProbePayload(probeRunId);
  const stateDirectory = resolveStateDirectory();
  releaseLock = acquireManagedProfileLock(stateDirectory);

  const allowedWrites = [];
  const blockedWrites = [];
  const writeRequests = new Map();
  let projectId;
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
    const path = routePath(request.url());
    const requestOrigin = new URL(request.url()).origin;
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
    const expectedSavePath =
      typeof projectId === "string"
        ? `/api/project/${encodeURIComponent(projectId)}`
        : "";
    if (
      requestOrigin === origin &&
      saveArmed &&
      method === "PUT" &&
      path === expectedSavePath &&
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
    const expectedUploadPath =
      typeof projectId === "string"
        ? `/api/project/${encodeURIComponent(projectId)}/upload-image`
        : "";
    if (
      requestOrigin === origin &&
      method === "POST" &&
      path === expectedUploadPath
    ) {
      blockedWrites.push({
        method,
        path: "/api/project/<redacted-project>/upload-image",
        reason: "optional-preview-upload-blocked"
      });
      await route.abort("blockedbyclient");
      return;
    }
    blockedWrites.push({
      method,
      path:
        typeof projectId === "string"
          ? path.replaceAll(projectId, "<redacted-project>")
          : path
    });
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
          new Error(`algebra-rod-save-failed:${response.status()}`)
        );
      }
    }
  });

  let page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await waitForAuthentication(page);

  const recovered = await page.evaluate(async () => {
    const query = new URLSearchParams({
      projectTitle: "AI-CONTRACT-PROBE-W5A-CR07AT",
      offset: "1",
      limit: "20",
      sortCondition: "createdAt",
      sortOrder: "desc"
    });
    const response = await fetch(`/api/project?${query.toString()}`, {
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) return null;
    const body = await response.json();
    const candidates = (body?.list ?? []).filter(
      (project) =>
        typeof project?.projectId === "string" &&
        typeof project?.projectTitle === "string" &&
        project.projectTitle.startsWith(
          "AI-CONTRACT-PROBE-W5A-CR07AT-"
        )
    );
    if (candidates.length !== 1) return null;
    const detailResponse = await fetch(
      `/api/project/${encodeURIComponent(candidates[0].projectId)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!detailResponse.ok) return null;
    const detail = await detailResponse.json();
    if (detail?.canvasOption?.moduleArr?.Unit02?.CR07AT !== true) {
      return null;
    }
    const svgIds = (detail?.contentsJson ?? [])
      .map((object) => object?.svgId)
      .filter((value) => typeof value === "string")
      .sort();
    const state =
      detail.contentsJson.length === 0
        ? "empty"
        : detail.contentsJson.length === 18 &&
            svgIds.every((value) => value.startsWith("CR07AT-"))
          ? "persisted"
          : null;
    if (!state) return null;
    return {
      projectId: candidates[0].projectId,
      projectTitle: candidates[0].projectTitle,
      state
    };
  });
  if (recovered) {
    projectId = recovered.projectId;
    payload.projectTitle = recovered.projectTitle;
    allowedWrites.push({
      method: "POST",
      path: "/api/project",
      status: 201,
      recovery: `exact-single-${recovered.state}-probe-project`
    });
    if (recovered.state === "persisted") {
      allowedWrites.push({
        method: "PUT",
        path: "/api/project/<redacted-project>",
        status: 200,
        recovery: "persisted-save-observed-before-evidence-write"
      });
    }
  } else {
    createArmed = true;
    const createResult = await page.evaluate(
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
    projectId = createResult.body?.projectId;
    if (
      createResult.status < 200 ||
      createResult.status >= 300 ||
      typeof projectId !== "string" ||
      allowedWrites.length !== 1
    ) {
      throw new Error(
        `algebra-rod-create-failed:${JSON.stringify(createResult)}`
      );
    }
    allowedWrites[0].status = createResult.status;
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

  const paletteVariantIds = expectedVariantIds.slice(0, 6);
  let savedObjects;
  let reopened;
  let reopenedObjects;
  let serverNormalizationFields = ["x"];
  if (recovered?.state === "persisted") {
    await page.waitForFunction(
      (expectedCount) =>
        document.querySelectorAll(".item.group").length ===
        expectedCount,
      expectedVariantIds.length,
      { timeout: 15_000 }
    );
    reopened = await getProject(page, projectId);
    reopenedObjects = assertAllVariants(
      reopened.contentsJson,
      "reopened"
    );
    savedObjects = reopenedObjects;
  } else {
    const paletteIcons = page.locator(
      "#accordion-text-toolbar-sub-0 svg.icons[id^='CR07AT-']"
    );
    const observedPaletteVariantIds =
      await paletteIcons.evaluateAll((icons) =>
        icons.map((icon) => icon.id).sort()
      );
    if (
      exactHash(observedPaletteVariantIds) !==
      exactHash(paletteVariantIds)
    ) {
      throw new Error(
        `algebra-rod-base-palette-mismatch:${JSON.stringify(
          observedPaletteVariantIds
        )}`
      );
    }
    let pointerId = 100;
    for (
      let index = 0;
      index < paletteVariantIds.length;
      index += 1
    ) {
      const icon = paletteIcons.nth(index);
      const copies = [];
      for (let copy = 0; copy < 4; copy += 1) {
        copies.push(
          await createFromPalette(page, icon, pointerId++)
        );
      }
      await page.waitForTimeout(400);
      const retainedNegative = await invertItem(
        page,
        copies[1],
        pointerId
      );
      pointerId += 4;
      await page.waitForTimeout(400);
      const mergeNegative = await invertItem(
        page,
        copies[2],
        pointerId
      );
      pointerId += 4;
      await mergeOppositeItems(
        page,
        copies[3],
        mergeNegative,
        pointerId++
      );
      if (
        !(await page.locator(`[id="${copies[0]}"]`).count()) ||
        !(await page
          .locator(`[id="${retainedNegative}"]`)
          .count())
      ) {
        throw new Error(
          "algebra-rod-derived-family-retention-failed"
        );
      }
    }
    if (
      (await page.locator(".item.group").count()) !==
      expectedVariantIds.length
    ) {
      throw new Error("algebra-rod-derived-variant-count-mismatch");
    }

    const saveControl = page
      .locator("#top-toolbar div.cursor-pointer")
      .filter({ hasText: /^\s*저장\s*$/ })
      .first();
    if (!(await saveControl.isVisible().catch(() => false))) {
      throw new Error("algebra-rod-save-control-unavailable");
    }
    saveArmed = true;
    await saveControl.click();
    const saveStatus = await Promise.race([
      saveResponse,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("algebra-rod-save-timeout")),
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
      throw new Error("algebra-rod-save-boundary-invalid");
    }
    savedObjects = assertAllVariants(
      savedPayload.contentsJson,
      "saved"
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
    reopened = await getProject(page, projectId);
    reopenedObjects = assertAllVariants(
      reopened.contentsJson,
      "reopened"
    );
    serverNormalizationFields = compareLifecycle(
      savedObjects,
      reopenedObjects
    );
  }

  const commonFieldNames = Object.keys(savedObjects[0])
    .filter((field) =>
      savedObjects.every((object) => Object.hasOwn(object, field))
    )
    .sort();
  const evidence = {
    schemaVersion: "1.0.0",
    evidenceId: "wave5-algebra-rod-canary-roundtrip",
    observedAt: observedAt.toISOString(),
    scope: {
      category: "변화와 관계",
      categoryId,
      moduleKey,
      observedName: "대수 막대"
    },
    lifecycle: {
      createdProjectCount: 1,
      existingProjectWriteCount: 0,
      saveCount: 1,
      basePaletteVariantCount: paletteVariantIds.length,
      signInversionCount: 12,
      oppositePairMergeCount: 6,
      savedObjectCount: savedObjects.length,
      reopenedObjectCount: reopenedObjects.length,
      identityPreserved: true,
      exactWirePreserved: false,
      wirePreservedAfterKnownNormalization: true,
      serverNormalizationFields
    },
    variants: expectedVariantIds,
    commonFieldNames,
    savedWireExamples: sanitizeWire(savedObjects),
    writeBoundary: {
      allowedWrites,
      blockedWrites
    }
  };
  assertNoSensitiveData(evidence);
  mkdirSync(dirname(rawOutputPath), { recursive: true });
  mkdirSync(dirname(evidenceOutputPath), { recursive: true });
  writeFileSync(
    rawOutputPath,
    stableJson({
      ...evidence,
      projectId,
      savedPayload,
      reopened
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  writeFileSync(
    evidenceOutputPath,
    stableJson(evidence),
    "utf8"
  );
  process.stdout.write(
    `PASS CR07AT ${savedObjects.length} variants ` +
      `saved and reopened with known x normalization ` +
      `(${evidenceOutputPath})\n`
  );
} catch (error) {
  process.stderr.write(
    `FAIL ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
