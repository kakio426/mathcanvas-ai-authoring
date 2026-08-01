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
const categoryId = "kaplNGyBBd";
const moduleKey = "SM02AD";
const variantIds = ["SM02AD-01", "SM02AD-02"];
const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const titlePrefix = "AI-CONTRACT-PROBE-W6-SM02AD-";
const rawOutput = join(
  defaultRawRoot,
  "wave6-clock-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave6-clock-canary.roundtrip.json"
);
const interactionPreview = join(
  defaultRawRoot,
  "wave6-clock-interaction.raw.png"
);

function runId(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
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

function routePath(url) {
  const parsed = new URL(url);
  return parsed.origin === origin
    ? parsed.pathname
    : `${parsed.origin}${parsed.pathname}`;
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
  if (moduleArr.Unit03[moduleKey] !== true) {
    throw new Error("clock-module-missing-from-catalog");
  }
  return moduleArr;
}

function buildPayload(probeRunId) {
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
    projectTitle: `${titlePrefix}${probeRunId}`,
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
      { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`clock-project-reopen-failed:${response.status}`);
    }
    return response.json();
  }, projectId);
}

function clockObjects(contentsJson) {
  return (contentsJson ?? []).filter((object) =>
    variantIds.includes(object?.svgId)
  );
}

function assertClockVariants(contentsJson, phase) {
  const objects = clockObjects(contentsJson);
  const observed = objects.map((object) => object.svgId).sort();
  if (
    objects.length !== 2 ||
    exactHash(observed) !== exactHash(variantIds)
  ) {
    throw new Error(
      `${phase}-clock-variant-mismatch:${JSON.stringify(observed)}`
    );
  }
  const analog = objects.find(
    (object) => object.svgId === "SM02AD-01"
  );
  const digital = objects.find(
    (object) => object.svgId === "SM02AD-02"
  );
  if (
    !analog ||
    !digital ||
    typeof analog.hours !== "number" ||
    typeof analog.minutes !== "number" ||
    typeof digital.hours !== "string" ||
    typeof digital.minutes !== "string" ||
    analog.isWorking !== false ||
    digital.isWorking !== false
  ) {
    throw new Error(`${phase}-clock-wire-shape-invalid`);
  }
  return objects;
}

function compareLifecycle(savedObjects, reopenedObjects) {
  const reopenedByVariant = new Map(
    reopenedObjects.map((object) => [object.svgId, object])
  );
  const differences = [];
  const serverNormalizationFields = new Set();
  for (const saved of savedObjects) {
    const reopened = reopenedByVariant.get(saved.svgId);
    if (!reopened || saved.id !== reopened.id) {
      differences.push({
        svgId: saved.svgId,
        reason: !reopened ? "missing" : "identity-changed"
      });
      continue;
    }
    if (exactHash(saved) === exactHash(reopened)) continue;
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
    if (
      fields.every(
        (field) => field === "x" || field === "parent"
      )
    ) {
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
  if (differences.length > 0) {
    throw new Error(
      `clock-reopen-mismatch:${JSON.stringify(differences)}`
    );
  }
  return [...serverNormalizationFields].sort();
}

function sanitizeWire(objects) {
  return objects
    .map((object) => ({
      ...structuredClone(object),
      id: `<object-id:${object.svgId}>`
    }))
    .sort((left, right) =>
      left.svgId.localeCompare(right.svgId)
    );
}

function rotationAngle(transform) {
  const match = /^rotate\(([-\d.]+)/.exec(transform ?? "");
  if (!match) {
    throw new Error(`clock-rotation-invalid:${transform}`);
  }
  return Number(match[1]);
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

async function currentItemIds(page) {
  return page
    .locator(".item.group")
    .evaluateAll((elements) =>
      elements.map((element) => element.id)
    );
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
  await page.waitForTimeout(250);
  const after = await currentItemIds(page);
  const added = after.filter((id) => !before.includes(id));
  if (added.length !== 1) {
    throw new Error(
      `clock-palette-create-mismatch:${JSON.stringify(added)}`
    );
  }
  return added[0];
}

async function selectItem(page, objectId, pointerId) {
  const bounds = await page
    .locator(`[id="${objectId}"]`)
    .boundingBox();
  if (!bounds) {
    throw new Error(`clock-object-not-visible:${objectId}`);
  }
  const hitTarget = await page.evaluate(
    ({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return {
        tag: element?.tagName,
        id: element?.id,
        className:
          typeof element?.className === "string"
            ? element.className
            : element?.getAttribute("class"),
        closestItemId:
          element?.closest(".item.group")?.id ?? null
      };
    },
    {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    }
  );
  process.stdout.write(
    `clock-canary:hit-${JSON.stringify(hitTarget)}\n`
  );
  await page.keyboard.press("Escape");
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  );
  await page.waitForTimeout(250);
}

async function clickVisibleText(page, text) {
  const matches = page.getByText(text, { exact: true });
  for (let index = 0; index < (await matches.count()); index += 1) {
    const candidate = matches.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return;
    }
    const clickableAncestor = candidate.locator(
      "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' cursor-pointer ')][1]"
    );
    if (
      (await clickableAncestor.count()) > 0 &&
      (await clickableAncestor.isVisible().catch(() => false))
    ) {
      await clickableAncestor.click();
      return;
    }
  }
  const diagnostics = await page.evaluate((label) => ({
    bodyIncludesLabel:
      document.body.innerText.includes(label),
    selectedIds: Array.from(
      document.querySelectorAll(".item.group.selected")
    ).map((element) => element.id),
    labeledControls: Array.from(
      document.querySelectorAll(
        "[title], [aria-label], [data-tooltip], [data-tooltip-content]"
      )
    )
      .map((element) => ({
        tag: element.tagName,
        title: element.getAttribute("title"),
        ariaLabel: element.getAttribute("aria-label"),
        dataTooltip:
          element.getAttribute("data-tooltip") ??
          element.getAttribute("data-tooltip-content")
      }))
      .filter((entry) =>
        JSON.stringify(entry).includes(label)
      )
      .slice(0, 10)
  }), text);
  throw new Error(
    `clock-control-unavailable:${text}:${JSON.stringify(
      diagnostics
    )}`
  );
}

let context;
let releaseLock;
try {
  const observedAt = new Date();
  const payload = buildPayload(runId(observedAt));
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
      viewport: { width: 1600, height: 1100 }
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
    const optionalUpload =
      typeof projectId === "string" &&
      method === "POST" &&
      path ===
        `/api/project/${encodeURIComponent(projectId)}/upload-image`;
    blockedWrites.push({
      method,
      path: optionalUpload
        ? "/api/project/<redacted-project>/upload-image"
        : typeof projectId === "string"
          ? path.replaceAll(projectId, "<redacted-project>")
          : path,
      reason: optionalUpload
        ? "optional-preview-upload-blocked"
        : "unexpected-write-blocked"
    });
    if (saveArmed && !optionalUpload) {
      rejectSave(
        new Error(`unexpected-write-blocked:${method}:${path}`)
      );
    }
    await route.abort("blockedbyclient");
  });
  context.on("response", (response) => {
    const record = writeRequests.get(response.request());
    if (!record) return;
    record.status = response.status();
    if (record.method === "PUT") {
      if (response.ok()) resolveSave(response.status());
      else {
        rejectSave(
          new Error(`clock-save-failed:${response.status()}`)
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
  process.stdout.write("clock-canary:authenticated\n");
  const recovered = await page.evaluate(
    async (prefix) => {
      const query = new URLSearchParams({
        offset: "1",
        limit: "20",
        sortCondition: "createdAt",
        sortOrder: "desc"
      });
      const response = await fetch(
        `/api/project?${query.toString()}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!response.ok) return null;
      const body = await response.json();
      const candidates = (body?.list ?? []).filter(
        (project) =>
          typeof project?.projectId === "string" &&
          typeof project?.projectTitle === "string" &&
          project.projectTitle.startsWith(prefix)
      );
      if (candidates.length !== 1) return null;
      const detail = await (
        await fetch(
          `/api/project/${encodeURIComponent(
            candidates[0].projectId
          )}`,
          { credentials: "include", cache: "no-store" }
        )
      ).json();
      const clocks = (detail?.contentsJson ?? []).filter(
        (object) =>
          object?.svgId === "SM02AD-01" ||
          object?.svgId === "SM02AD-02"
      );
      const state =
        detail?.contentsJson?.length === 0
          ? "empty"
          : clocks.length === 2
            ? "persisted"
            : null;
      if (!state) return null;
      return {
        projectId: candidates[0].projectId,
        projectTitle: candidates[0].projectTitle,
        state
      };
    },
    titlePrefix
  );
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
        recovery: "persisted-save-observed"
      });
    }
    process.stdout.write(
      `clock-canary:recovered-${recovered.state}\n`
    );
  } else {
    createArmed = true;
    const creation = await page.evaluate(
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
    projectId = creation.body?.projectId;
    if (
      creation.status < 200 ||
      creation.status >= 300 ||
      typeof projectId !== "string" ||
      allowedWrites.length !== 1
    ) {
      throw new Error(
        `clock-create-failed:${JSON.stringify(creation)}`
      );
    }
    allowedWrites[0].status = creation.status;
    process.stdout.write("clock-canary:created\n");
  }

  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(projectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForTimeout(2500);
  process.stdout.write("clock-canary:editor-ready\n");

  let savedObjects;
  let reopened;
  let reopenedObjects;
  let serverNormalizationFields = recovered?.state === "persisted"
    ? ["parent"]
    : [];
  if (recovered?.state === "persisted") {
    reopened = await getProject(page, projectId);
    reopenedObjects = assertClockVariants(
      reopened.contentsJson,
      "reopened"
    );
    savedObjects = reopenedObjects;
  } else {
    const paletteIcons = page.locator(
      "#accordion-text-toolbar-sub-0 svg.icons[id^='SM02AD-']"
    );
    const observedVariants = await paletteIcons.evaluateAll(
      (icons) => icons.map((icon) => icon.id).sort()
    );
    if (exactHash(observedVariants) !== exactHash(variantIds)) {
      throw new Error(
        `clock-palette-variant-mismatch:${JSON.stringify(
          observedVariants
        )}`
      );
    }
    process.stdout.write("clock-canary:palette-ready\n");
    const objectIds = [];
    for (let index = 0; index < 2; index += 1) {
      const objectId = await createFromPalette(
        page,
        paletteIcons.nth(index),
        300 + index
      );
      objectIds.push(objectId);
      process.stdout.write(
        `clock-canary:created-${variantIds[index]}\n`
      );
      await clickVisibleText(page, "선택 (V)");
      await selectItem(page, objectId, 400 + index);
      process.stdout.write(
        `clock-canary:selected-${variantIds[index]}\n`
      );
      await clickVisibleText(page, "정지");
      process.stdout.write(
        `clock-canary:paused-${variantIds[index]}\n`
      );
      await page.waitForTimeout(300);
    }
    if (objectIds.length !== 2) {
      throw new Error("clock-object-count-invalid");
    }

    const saveControl = page
      .locator("#top-toolbar div.cursor-pointer")
      .filter({ hasText: /^\s*저장\s*$/ })
      .first();
    if (!(await saveControl.isVisible().catch(() => false))) {
      throw new Error("clock-save-control-unavailable");
    }
    saveArmed = true;
    process.stdout.write("clock-canary:saving\n");
    await saveControl.click();
    const saveStatus = await Promise.race([
      saveResponse,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("clock-save-timeout")),
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
      throw new Error("clock-save-boundary-invalid");
    }
    savedObjects = assertClockVariants(
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
    reopenedObjects = assertClockVariants(
      reopened.contentsJson,
      "reopened"
    );
    serverNormalizationFields = compareLifecycle(
      savedObjects,
      reopenedObjects
    );
  }

  const transientAnalogId = await createFromPalette(
    page,
    page
      .locator(
        "#accordion-text-toolbar-sub-0 svg.icons[id='SM02AD-01']"
      )
      .first(),
    900
  );
  await clickVisibleText(page, "정지");
  await page.waitForTimeout(300);
  const beforeInteraction = await page.evaluate((objectId) => {
    const clock = document.getElementById(objectId);
    return {
      minuteTransform: clock
        ?.querySelector(".minute-handle")
        ?.getAttribute("transform"),
      hourTransform: clock
        ?.querySelector(".hour-handle")
        ?.getAttribute("transform")
    };
  }, transientAnalogId);
  const gearedBounds = await page
    .locator(`#${transientAnalogId} .geared-clock`)
    .boundingBox();
  const minutePointer = await page
    .locator(`#${transientAnalogId} .minute-handle`)
    .evaluate((handle) => {
      const bounds = handle.getBoundingClientRect();
      for (let row = 1; row <= 4; row += 1) {
        for (let column = 1; column <= 4; column += 1) {
          const x =
            bounds.left + (bounds.width * column) / 5;
          const y =
            bounds.top + (bounds.height * row) / 5;
          if (
            document
              .elementFromPoint(x, y)
              ?.classList.contains("minute-handle")
          ) {
            return { x, y };
          }
        }
      }
      return null;
    });
  if (!gearedBounds || !minutePointer) {
    throw new Error("clock-minute-drag-target-missing");
  }
  const centerX =
    gearedBounds.x + gearedBounds.width / 2;
  const centerY =
    gearedBounds.y + gearedBounds.height / 2;
  const radius =
    Math.min(gearedBounds.width, gearedBounds.height) * 0.34;
  const targetAngle = (330 * Math.PI) / 180;
  await page.mouse.move(minutePointer.x, minutePointer.y);
  await page.mouse.down();
  await page.mouse.move(
    centerX + Math.sin(targetAngle) * radius,
    centerY - Math.cos(targetAngle) * radius,
    { steps: 40 }
  );
  await page.mouse.up();
  await page.waitForTimeout(600);
  const afterInteraction = await page.evaluate((objectId) => {
    const clock = document.getElementById(objectId);
    return {
      minuteTransform: clock
        ?.querySelector(".minute-handle")
        ?.getAttribute("transform"),
      hourTransform: clock
        ?.querySelector(".hour-handle")
        ?.getAttribute("transform")
    };
  }, transientAnalogId);
  const beforeMinuteAngle = rotationAngle(
    beforeInteraction.minuteTransform
  );
  const afterMinuteAngle = rotationAngle(
    afterInteraction.minuteTransform
  );
  const afterHourAngle = rotationAngle(
    afterInteraction.hourTransform
  );
  const handAngleResidual = Math.abs(
    modulo(afterHourAngle, 30) -
      modulo(afterMinuteAngle, 360) / 12
  );
  const unexpectedProjectWrites = blockedWrites.filter(
    (write) =>
      String(write.path).startsWith(
        "/api/project/<redacted-project>"
      ) &&
      write.reason !== "optional-preview-upload-blocked"
  );
  if (
    Math.abs(afterMinuteAngle - 330) > 1 ||
    Math.abs(afterMinuteAngle - beforeMinuteAngle) < 1 ||
    handAngleResidual > 0.6 ||
    unexpectedProjectWrites.length > 0
  ) {
    throw new Error(
      `clock-geared-interaction-mismatch:${JSON.stringify({
        beforeInteraction,
        afterInteraction,
        handAngleResidual,
        unexpectedProjectWrites
      })}`
    );
  }
  mkdirSync(dirname(interactionPreview), {
    recursive: true
  });
  await page.screenshot({
    path: interactionPreview,
    fullPage: true
  });
  const interaction = {
    action: "drag-minute-hand-to-55-minutes",
    beforeMinuteAngle,
    afterMinuteAngle,
    afterHourAngle,
    handAngleResidual,
    transientOnly: true,
    existingProjectWriteCount: 0
  };

  const evidence = {
    schemaVersion: "1.0.0",
    evidenceId: "wave6-clock-canary-roundtrip",
    observedAt: observedAt.toISOString(),
    scope: {
      category: "도형과 측정",
      categoryId,
      moduleKey,
      observedName: "시계"
    },
    lifecycle: {
      createdProjectCount: 1,
      existingProjectWriteCount: 0,
      saveCount: 1,
      savedObjectCount: savedObjects.length,
      reopenedObjectCount: reopenedObjects.length,
      identityPreserved: true,
      stoppedTimePreserved: true,
      wirePreservedAfterKnownNormalization: true,
      serverNormalizationFields,
      recoveryState:
        recovered?.state === "persisted"
          ? "save-completed-before-evidence-finalization"
          : "fresh-round-trip"
    },
    variants: {
      analogGeared: "SM02AD-01",
      digital: "SM02AD-02"
    },
    interaction,
    savedWireExamples: sanitizeWire(savedObjects),
    writeBoundary: {
      allowedWrites,
      blockedWrites
    }
  };
  assertNoSensitiveData(evidence);
  mkdirSync(dirname(rawOutput), { recursive: true });
  mkdirSync(dirname(evidenceOutput), { recursive: true });
  writeFileSync(
    rawOutput,
    stableJson({
      ...evidence,
      projectId,
      savedPayload,
      reopened
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  writeFileSync(
    evidenceOutput,
    stableJson(evidence),
    "utf8"
  );
  process.stdout.write(
    `PASS SM02AD 2 variants saved and reopened (${evidenceOutput})\n`
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
