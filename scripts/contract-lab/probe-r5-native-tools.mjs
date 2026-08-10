#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  defaultResearchRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { assertNoSensitiveData, stableJson } from "./lib/normalize.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";

const origin = "https://mathcanvas.vivasam.com";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const targetTools = [
  ...["DP03PG-01", "DP03PG-02"].map((variantId) => ({
    moduleKey: "DP03PG",
    variantId,
    observedName: "그림그래프",
    mathematicalState: "legend-to-picture-count-relation"
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    moduleKey: "NO04NG",
    variantId: `NO04NG-${String(index + 1).padStart(2, "0")}`,
    observedName: "배열표",
    mathematicalState: "array-row-column-structure"
  })),
  ...["NO03FM-07", "NO03FM-17"].map((variantId) => ({
    moduleKey: "NO03FM",
    variantId,
    observedName: "분수 모형",
    mathematicalState: "equal-partition-whole-membership"
  })),
  ...["SM07CS-01", "SM07CS-02"].map((variantId) => ({
    moduleKey: "SM07CS",
    variantId,
    observedName: "원과 부채꼴",
    mathematicalState: "center-radius-relation"
  }))
];
const semanticVariantIds = new Set([
  "DP03PG-01",
  "NO04NG-03",
  "NO03FM-07",
  "SM07CS-01"
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalJson(child)])
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("r5-native-tools-non-finite-content-hash-input");
  }
  return value;
}

function contentSha256(value) {
  return sha256(JSON.stringify(canonicalJson(value)));
}

function projectPath(projectId) {
  return `/api/project/${encodeURIComponent(projectId)}`;
}

function summarizeBounds(bounds) {
  if (!bounds) return null;
  return Object.fromEntries(
    Object.entries(bounds).map(([key, value]) => [
      key,
      Number(value.toFixed(3))
    ])
  );
}

function buildModuleActivationMap(catalog, tools) {
  const moduleArr = {
    Unit01: {},
    Unit02: {},
    Unit03: {},
    Unit04: {}
  };
  const enabled = new Set(tools.map((tool) => tool.moduleKey));
  for (const tool of catalog.tools ?? []) {
    if (
      typeof tool?.moduleKey === "string" &&
      Object.hasOwn(moduleArr, tool.categoryId)
    ) {
      if (enabled.has(tool.moduleKey)) {
        moduleArr[tool.categoryId][tool.moduleKey] = true;
      }
    }
  }
  for (const target of tools) {
    const category = Object.values(moduleArr).find((entry) =>
      Object.hasOwn(entry, target.moduleKey)
    );
    if (!category || category[target.moduleKey] !== true) {
      throw new Error(`r5-native-tool-missing-from-catalog:${target.moduleKey}`);
    }
  }
  return moduleArr;
}

function sanitizeObject(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((child) => sanitizeObject(child));
  }
  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      ["id", "groupId", "categoryId"].includes(key)
    ) {
      return value.length === 0 ? "" : `<redacted-${key}>`;
    }
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([childKey, child]) => [
      childKey,
      sanitizeObject(child, childKey)
    ])
  );
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
  if (status !== 200) throw new Error("r5-native-tools-auth-required");
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
    const response = await fetch(`/api/project?${query}`, {
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
      projectId: matches.length === 1 ? matches[0]?.projectId : null
    };
  }, title);
}

async function currentItems(page) {
  return page.locator(".item.group").evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.id,
      svgId: element.querySelector("svg")?.id ?? null
    }))
  );
}

async function createFromPalette(page, variantId, pointerId) {
  const before = await currentItems(page);
  const icon = page.locator(`svg.icons[id="${variantId}"]`).first();
  await icon.waitFor({ state: "attached", timeout: 20_000 });
  await icon.evaluate(
    (element, id) => {
      const root = document.getElementById("math-parent-element");
      if (!root) throw new Error("r5-native-tools-canvas-root-missing");
      const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: 720,
        clientY: 360,
        pointerId: id,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1
      };
      element.dispatchEvent(new PointerEvent("pointerdown", init));
      root.dispatchEvent(
        new PointerEvent("pointerup", { ...init, buttons: 0 })
      );
    },
    pointerId
  );
  await page.waitForTimeout(500);
  const after = await currentItems(page);
  const added = after.filter(
    (candidate) =>
      !before.some((previous) => previous.id === candidate.id)
  );
  if (added.length !== 1) {
    throw new Error(
      `r5-native-tools-palette-create-mismatch:${variantId}:${JSON.stringify({
        before,
        after,
        added
      })}`
    );
  }
  return added[0].id;
}

async function inspectTarget(page, objectId) {
  const target = page.locator(`[id="${objectId}"]`).first();
  const bounds = summarizeBounds(await target.boundingBox());
  if (!bounds) throw new Error("r5-native-tools-target-not-visible");
  const descendants = await target.evaluate((root) =>
    [...root.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          className:
            typeof element.className === "string"
              ? element.className
              : element.getAttribute("class"),
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          contentEditable: element.getAttribute("contenteditable"),
          tabIndex: element.getAttribute("tabindex"),
          inputMode: element.getAttribute("inputmode"),
          text: String(element.textContent ?? "").trim().slice(0, 80),
          bounds: {
            x: Number(rect.x.toFixed(3)),
            y: Number(rect.y.toFixed(3)),
            width: Number(rect.width.toFixed(3)),
            height: Number(rect.height.toFixed(3))
          },
          visible:
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity || "1") > 0 &&
            rect.width > 0 &&
            rect.height > 0
        };
      })
      .filter(
        (entry) =>
          entry.visible &&
          (entry.id || entry.className || entry.role || entry.ariaLabel || entry.text)
      )
      .slice(0, 400)
  );
  const visibleControls = await page.evaluate(() => {
    const roots = [
      "#top-toolbar",
      "#left-toolbar",
      "#right-toolbar",
      "#bottom-common-toolbar",
      "[id^='accordion-text-toolbar']"
    ];
    return [...document.querySelectorAll(roots.join(","))]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      })
      .map((element) => ({
        selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
        text: String(element.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 600),
        bounds: (() => {
          const rect = element.getBoundingClientRect();
          return {
            x: Number(rect.x.toFixed(3)),
            y: Number(rect.y.toFixed(3)),
            width: Number(rect.width.toFixed(3)),
            height: Number(rect.height.toFixed(3))
          };
        })()
      }));
  });
  return { bounds, descendants, visibleControls };
}

async function dragLocator(page, locator, delta) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error("r5-native-tools-drag-handle-not-visible");
  const start = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y, {
    steps: 18
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function performSemanticInteraction(page, objectId, variantId) {
  const target = page.locator(`[id="${objectId}"]`).first();
  if (variantId === "DP03PG-01") {
    const graphColumn = target.locator("rect.pictograph-bg").first();
    const bounds = await graphColumn.boundingBox();
    if (!bounds) throw new Error("r5-picture-graph-column-not-visible");
    await page.mouse.click(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height - 18
    );
    await page.waitForTimeout(350);
    const categoryBox = target.locator(".category-box-wrapper").first();
    const plusLabels = categoryBox
      .locator("text")
      .filter({ hasText: /^\+$/ });
    const plusCount = await plusLabels.count();
    if (plusCount > 0) {
      await plusLabels.last().click({ force: true });
    } else {
      const categoryBounds = await categoryBox.boundingBox();
      if (!categoryBounds) {
        throw new Error("r5-picture-graph-category-box-not-visible");
      }
      await page.mouse.click(
        categoryBounds.x + 18,
        categoryBounds.y + categoryBounds.height - 20
      );
    }
    await page.waitForTimeout(500);
    return {
      operation: "select-picture-graph-column-and-add-one-unit",
      target: "first-category-lowest-visible-cell",
      observedPlusLabelCount: plusCount
    };
  }
  if (variantId === "NO04NG-03") {
    await dragLocator(
      page,
      target.locator(".x-axis-positive-handler").first(),
      { x: 48, y: 0 }
    );
    await dragLocator(
      page,
      target.locator(".y-axis-positive-handler").first(),
      { x: 0, y: -48 }
    );
    return {
      operation: "make-four-rows-by-six-columns-to-reveal-target-product",
      target: "positive-x-and-y-handles",
      initialTargetProductVisible: false,
      targetFactors: { rows: 4, columns: 6, product: 24 }
    };
  }
  if (variantId === "NO03FM-07") {
    await dragLocator(page, target.locator("path.resize").first(), {
      x: 280,
      y: 0
    });
    return {
      operation: "extend-equal-fraction-parts",
      target: "right-resize-handle"
    };
  }
  if (variantId === "SM07CS-01") {
    await dragLocator(
      page,
      target.locator(".resize.item-toolbar.item-focus").first(),
      { x: -55, y: -55 }
    );
    return {
      operation: "change-circle-radius",
      target: "radius-resize-handle"
    };
  }
  throw new Error(`r5-native-tools-semantic-variant-unknown:${variantId}`);
}

function changedTopLevelFields(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => stableJson(before[key]) !== stableJson(after[key]))
    .sort();
}

function semanticStateChanged(variantId, before, after) {
  if (variantId === "DP03PG-01") {
    return stableJson(before.graphValue) !== stableJson(after.graphValue);
  }
  if (variantId === "NO04NG-03") {
    return before.row !== after.row || before.column !== after.column;
  }
  if (variantId === "NO03FM-07") {
    return before.divider === after.divider && before.count !== after.count;
  }
  if (variantId === "SM07CS-01") {
    return (
      before.r !== after.r &&
      Math.abs(before.x - after.x) <= 0.001 &&
      Math.abs(before.y - after.y) <= 0.001
    );
  }
  return false;
}

function semanticStateSnapshot(object) {
  const scalarKeys = [
    "svgId",
    "width",
    "height",
    "x",
    "y",
    "row",
    "column",
    "count",
    "divider",
    "r",
    "angle",
    "isHorizontal",
    "labelCount",
    "categoryCnt",
    "selectedIndex"
  ];
  const scalars = Object.fromEntries(
    scalarKeys
      .filter((key) => object[key] !== undefined)
      .map((key) => [key, object[key]])
  );
  const structuredKeys = [
    "graphValue",
    "selectedRect",
    "point1",
    "point2",
    "label",
    "units"
  ];
  const structured = Object.fromEntries(
    structuredKeys
      .filter((key) => object[key] !== undefined)
      .map((key) => [key, object[key]])
  );
  return {
    ...scalars,
    ...structured,
    ...(object.svgId === "NO04NG-03" && Array.isArray(object.numbers)
      ? {
          multiplicationArray: {
            visibleRows: Number(object.row) - 1,
            visibleColumns: Number(object.column) - 1,
            target: {
              row: 4,
              column: 6,
              product:
                object.numbers.find(
                  (entry) => entry?.r === 4 && entry?.c === 6
                )?.num ?? null
            }
          }
        }
      : {}),
    numbersSha256: Array.isArray(object.numbers)
      ? sha256(stableJson(object.numbers))
      : null,
    coordinatesSha256: Array.isArray(object.coordinates)
      ? sha256(stableJson(object.coordinates))
      : null
  };
}

function unionBounds(entries) {
  if (entries.length === 0) return null;
  const left = Math.min(...entries.map((entry) => entry.x));
  const top = Math.min(...entries.map((entry) => entry.y));
  const right = Math.max(...entries.map((entry) => entry.x + entry.width));
  const bottom = Math.max(...entries.map((entry) => entry.y + entry.height));
  return summarizeBounds({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  });
}

function visualBoundsFromInspection(inspection) {
  const rootBounds = inspection.bounds ?? inspection.boundsCssPx;
  const chromePattern =
    /(?:item-toolbar|item-focus|resize|handler|setting-toggle|move-handler|rotate-move)/;
  const visualEntries = inspection.descendants
    .filter((entry) => !chromePattern.test(String(entry.className ?? "")))
    .map((entry) => entry.bounds)
    .filter(
      (bounds) =>
        bounds &&
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.width <= rootBounds.width + 0.01 &&
        bounds.height <= rootBounds.height + 0.01
    );
  return unionBounds(visualEntries) ?? rootBounds;
}

function compactObservation(observation) {
  const beforeState = semanticStateSnapshot(observation.initial.object);
  return {
    moduleKey: observation.moduleKey,
    variantId: observation.variantId,
    observedName: observation.observedName,
    mathematicalState: observation.mathematicalState,
    initial: {
      objectKeys: Object.keys(observation.initial.object).sort(),
      objectSha256: observation.initial.objectSha256,
      mathematicalState: beforeState,
      visualBoundsCssPx: visualBoundsFromInspection(observation.initial),
      selectedEnvelopeCssPx: observation.initial.boundsCssPx,
      screenshot: observation.initial.screenshot,
      screenshotSha256: observation.initial.screenshotSha256
    },
    semanticProbe: observation.semanticProbe
      ? {
          status: observation.semanticProbe.status,
          ...(observation.semanticProbe.operation
            ? { operation: observation.semanticProbe.operation }
            : {}),
          ...(observation.semanticProbe.error
            ? { error: observation.semanticProbe.error }
            : {}),
          changedTopLevelFields:
            observation.semanticProbe.changedTopLevelFields ?? [],
          before: beforeState,
          ...(observation.semanticProbe.object
            ? {
                after: semanticStateSnapshot(observation.semanticProbe.object),
                objectSha256: observation.semanticProbe.objectSha256,
                manipulatedEnvelopeCssPx:
                  observation.semanticProbe.boundsCssPx,
                screenshot: observation.semanticProbe.screenshot,
                screenshotSha256:
                  observation.semanticProbe.screenshotSha256
              }
            : {})
        }
      : null,
    semanticDecision: observation.semanticDecision,
    releaseQualified: false
  };
}

async function clickSaveAndCapture(page, capturedPayloads) {
  const before = capturedPayloads.length;
  const saveControl = page
    .locator("#top-toolbar div.cursor-pointer")
    .filter({ hasText: /^\s*저장\s*$/ })
    .first();
  if (!(await saveControl.isVisible().catch(() => false))) {
    throw new Error("r5-native-tools-save-control-missing");
  }
  await saveControl.click();
  const startedAt = Date.now();
  while (capturedPayloads.length === before && Date.now() - startedAt < 4_000) {
    await page.waitForTimeout(100);
  }
  if (capturedPayloads.length !== before + 1) {
    throw new Error("r5-native-tools-save-payload-not-captured");
  }
  return capturedPayloads.at(-1);
}

let authSession;
let context;
try {
  const options = parseArguments(process.argv.slice(2), {
    "source-title": { type: "string", required: true },
    output: {
      type: "string",
      default: join(defaultResearchRoot, "r5-native-tool-discovery.json")
    },
    "raw-output": {
      type: "string",
      default: join(defaultRawRoot, "r5-native-tool-discovery.raw.json")
    },
    "screenshot-dir": {
      type: "string",
      default: join(
        repositoryRoot,
        ".mathcanvas-contract-lab",
        "previews",
        "r5-native-tool-discovery"
      )
    },
    "research-root": { type: "string", default: defaultResearchRoot },
    "raw-root": { type: "string", default: defaultRawRoot },
    "state-dir": { type: "string", default: resolveStateDirectory() },
    "variant-filter": { type: "string", default: "" }
  });
  const requestedVariants = new Set(
    options["variant-filter"]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const selectedTools =
    requestedVariants.size === 0
      ? targetTools
      : targetTools.filter((tool) => requestedVariants.has(tool.variantId));
  if (
    selectedTools.length === 0 ||
    (requestedVariants.size > 0 &&
      selectedTools.length !== requestedVariants.size)
  ) {
    throw new Error(
      `r5-native-tools-variant-filter-invalid:${JSON.stringify([
        ...requestedVariants
      ])}`
    );
  }
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "R5 native tool discovery evidence"
  );
  const rawOutputPath = assertPathInside(
    options["raw-output"],
    options["raw-root"],
    "R5 native tool discovery raw evidence"
  );
  const screenshotDirectory = assertPathInside(
    options["screenshot-dir"],
    join(repositoryRoot, ".mathcanvas-contract-lab", "previews"),
    "R5 native tool discovery screenshots"
  );
  const catalog = JSON.parse(
    await import("node:fs").then(({ readFileSync }) =>
      readFileSync(
        join(repositoryRoot, "research", "mathcanvas", "tool-catalog.snapshot.json"),
        "utf8"
      )
    )
  );
  const moduleArr = buildModuleActivationMap(catalog, selectedTools);
  const blockedRequests = [];
  const capturedPayloads = [];
  let projectId;
  let injectedReadCount = 0;

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
      projectId &&
      method === "GET" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      const response = await route.fetch();
      const body = await response.json();
      body.contentsJson = [];
      body.contentsJsonLength = 0;
      body.canvasOption = {
        ...body.canvasOption,
        moduleArr: Object.fromEntries(
          Object.keys(moduleArr).map((categoryId) => [
            categoryId,
            {
              ...(body.canvasOption?.moduleArr?.[categoryId] ?? {}),
              ...moduleArr[categoryId]
            }
          ])
        )
      };
      injectedReadCount += 1;
      await route.fulfill({
        response,
        contentType: "application/json",
        body: JSON.stringify(body)
      });
      return;
    }
    if (safeMethods.has(method)) {
      await route.continue();
      return;
    }
    if (
      projectId &&
      method === "PUT" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      capturedPayloads.push(request.postDataJSON());
    }
    const pathWithSearch =
      url.origin === origin
        ? `${url.pathname}${url.search}`
        : `${url.origin}${url.pathname}${url.search}`;
    blockedRequests.push({
      method,
      path: projectId
        ? pathWithSearch.replaceAll(projectId, "<source-project>")
        : pathWithSearch
    });
    await route.abort("blockedbyclient");
  });

  const discoveryPage = await context.newPage();
  await discoveryPage.goto(`${origin}/ko`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await waitForAuthentication(discoveryPage);
  const project = await findProject(discoveryPage, options["source-title"]);
  await discoveryPage.close();
  if (
    project.status !== 200 ||
    project.matchCount !== 1 ||
    typeof project.projectId !== "string"
  ) {
    throw new Error(
      `r5-native-tools-source-project-invalid:${JSON.stringify({
        status: project.status,
        matchCount: project.matchCount
      })}`
    );
  }
  projectId = project.projectId;
  mkdirSync(screenshotDirectory, { recursive: true, mode: 0o700 });

  const observations = [];
  let semanticCaptureCount = 0;
  for (let index = 0; index < selectedTools.length; index += 1) {
    const target = selectedTools[index];
    process.stdout.write(`r5-native-tools:opening:${target.variantId}\n`);
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error?.message ?? error).slice(0, 500));
    });
    await page.goto(`${origin}/ko/view/${encodeURIComponent(projectId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });
    try {
      await page.waitForSelector(".playground", {
        state: "attached",
        timeout: 30_000
      });
    } catch (error) {
      const debugPath = join(
        screenshotDirectory,
        `${target.variantId.toLowerCase()}-editor-load-failed.png`
      );
      await page.screenshot({ path: debugPath }).catch(() => undefined);
      const diagnostics = await page
        .evaluate(() => ({
          url: location.href.replace(/[?#].*$/, ""),
          title: document.title,
          text: String(document.body?.innerText ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 600),
          rootIds: [...document.body.querySelectorAll(":scope > *")]
            .map((element) => element.id || element.tagName.toLowerCase())
            .slice(0, 30)
        }))
        .catch(() => null);
      throw new Error(
        `r5-native-tools-editor-load-failed:${target.moduleKey}:${JSON.stringify({
          diagnostics,
          pageErrors,
          originalError: String(error?.message ?? error).slice(0, 300)
        })}`
      );
    }
    await page.waitForTimeout(2_000);
    if ((await page.locator(".item.group").count()) !== 0) {
      throw new Error("r5-native-tools-injected-canvas-not-empty");
    }
    const objectId = await createFromPalette(
      page,
      target.variantId,
      500 + index
    );
    const inspection = await inspectTarget(page, objectId);
    const screenshotPath = join(
      screenshotDirectory,
      `${target.variantId.toLowerCase()}-created-selected.png`
    );
    await page.screenshot({ path: screenshotPath });
    const payload = await clickSaveAndCapture(page, capturedPayloads);
    const object = payload.contentsJson?.find(
      (candidate) => candidate?.id === objectId
    );
    if (!object || object.svgId !== target.variantId) {
      throw new Error(`r5-native-tools-saved-object-missing:${target.variantId}`);
    }
    let semanticProbe = null;
    if (semanticVariantIds.has(target.variantId)) {
      try {
        const operation = await performSemanticInteraction(
          page,
          objectId,
          target.variantId
        );
        const manipulatedInspection = await inspectTarget(page, objectId);
        const manipulatedScreenshotPath = join(
          screenshotDirectory,
          `${target.variantId.toLowerCase()}-manipulated.png`
        );
        await page.screenshot({ path: manipulatedScreenshotPath });
        const manipulatedPayload = await clickSaveAndCapture(
          page,
          capturedPayloads
        );
        semanticCaptureCount += 1;
        const manipulatedObject = manipulatedPayload.contentsJson?.find(
          (candidate) => candidate?.id === objectId
        );
        if (!manipulatedObject || manipulatedObject.svgId !== target.variantId) {
          throw new Error(
            `r5-native-tools-manipulated-object-missing:${target.variantId}`
          );
        }
        const sanitizedManipulatedObject = sanitizeObject(manipulatedObject);
        semanticProbe = {
          status: semanticStateChanged(
            target.variantId,
            object,
            manipulatedObject
          )
            ? "semantic-state-changed"
            : "no-semantic-state-change-observed",
          operation,
          changedTopLevelFields: changedTopLevelFields(
            object,
            manipulatedObject
          ),
          object: sanitizedManipulatedObject,
          objectSha256: sha256(stableJson(sanitizedManipulatedObject)),
          boundsCssPx: manipulatedInspection.bounds,
          screenshot: relative(repositoryRoot, manipulatedScreenshotPath),
          screenshotSha256: sha256(
            await import("node:fs").then(({ readFileSync }) =>
              readFileSync(manipulatedScreenshotPath)
            )
          )
        };
      } catch (error) {
        semanticProbe = {
          status: "interaction-probe-failed",
          error: String(error?.message ?? error).slice(0, 500)
        };
      }
    }
    observations.push({
      ...target,
      initial: {
        object: sanitizeObject(object),
        objectSha256: sha256(stableJson(sanitizeObject(object))),
        boundsCssPx: inspection.bounds,
        descendants: inspection.descendants,
        visibleControls: inspection.visibleControls,
        screenshot: relative(repositoryRoot, screenshotPath),
        screenshotSha256: sha256(
          await import("node:fs").then(({ readFileSync }) =>
            readFileSync(screenshotPath)
          )
        )
      },
      semanticProbe,
      semanticDecision:
        semanticProbe?.status === "semantic-state-changed"
          ? "candidate-semantic-state-observed"
          : "pending-isolated-interaction-probe",
      releaseQualified: false
    });
    await page.close();
  }

  await context.close();
  context = undefined;
  const expectedSaveCount = selectedTools.length + semanticCaptureCount;
  const putRequests = blockedRequests.filter(
    (request) =>
      request.method === "PUT" &&
      request.path === "/api/project/<source-project>"
  );
  const uploadRequests = blockedRequests.filter(
    (request) =>
      request.method === "POST" &&
      request.path === "/api/project/<source-project>/upload-image"
  );
  const telemetryRequests = blockedRequests.filter(
    (request) =>
      request.method === "POST" &&
      request.path === "https://lc.getunicorn.org/l"
  );
  if (
    capturedPayloads.length !== expectedSaveCount ||
    injectedReadCount !== selectedTools.length * 3 ||
    putRequests.length !== expectedSaveCount ||
    uploadRequests.length !== expectedSaveCount ||
    telemetryRequests.length < selectedTools.length ||
    telemetryRequests.length > selectedTools.length + 4
  ) {
    throw new Error(
      `r5-native-tools-request-audit-invalid:${JSON.stringify({
        capturedPayloadCount: capturedPayloads.length,
        injectedReadCount,
        blockedRequests
      })}`
    );
  }
  const expectedBlockedSignatures = new Set([
    "PUT /api/project/<source-project>",
    "POST /api/project/<source-project>/upload-image",
    "POST https://lc.getunicorn.org/l"
  ]);
  const unexpectedBlocked = blockedRequests.filter(
    (request) =>
      !expectedBlockedSignatures.has(`${request.method} ${request.path}`)
  );
  if (unexpectedBlocked.length > 0) {
    throw new Error(
      `r5-native-tools-unexpected-blocked-request:${JSON.stringify(
        unexpectedBlocked
      )}`
    );
  }

  const observedAt = new Date().toISOString();
  const environment = {
    viewport: { width: 1280, height: 800 },
    userChromeTouched: false,
    sourceProjectPersistedStateChanged: false,
    externalWriteCount: 0,
    interceptedPutCount: expectedSaveCount,
    injectedProjectReadCount: injectedReadCount,
    blockedTelemetryCount: telemetryRequests.length,
    blockedTelemetryPolicy:
      `exact POST https://lc.getunicorn.org/l without query; bounded ${selectedTools.length}..${selectedTools.length + 4} because editor bootstrap delivery timing varies`
  };
  const raw = {
    schemaVersion: "1.0.0",
    artifactId: "r5-native-tool-discovery-raw-v1",
    observedAt,
    mode: "dedicated-live-auth-read-only-response-injection",
    environment,
    observations,
    requestAudit: {
      blockedRequests,
      externalWriteCount: 0
    }
  };
  assertNoSensitiveData(raw);
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  mkdirSync(dirname(rawOutputPath), { recursive: true, mode: 0o700 });
  const rawText = stableJson(raw);
  writeFileSync(rawOutputPath, rawText, {
    encoding: "utf8",
    mode: 0o600
  });
  const compactObservations = observations.map(compactObservation);
  const semanticTargets = compactObservations.filter((observation) =>
    semanticVariantIds.has(observation.variantId)
  );
  const semanticPassCount = semanticTargets.filter(
    (observation) =>
      observation.semanticProbe?.status === "semantic-state-changed"
  ).length;
  const evidenceBody = {
    schemaVersion: "1.0.0",
    evidenceId:
      requestedVariants.size === 0
        ? "r5-native-tool-discovery-v1"
        : `r5-native-tool-discovery-${[...requestedVariants]
            .join("-")
            .toLowerCase()}-v1`,
    observedAt,
    mode: "dedicated-live-auth-read-only-response-injection",
    sourceEvidence: {
      rawArtifactPath: relative(repositoryRoot, rawOutputPath),
      rawFileSha256: sha256(rawText)
    },
    environment,
    observations: compactObservations,
    decision: {
      status:
        semanticTargets.length > 0 &&
        semanticPassCount === semanticTargets.length
          ? "isolated-semantic-probes-passed-reference-only"
          : "discovery-only",
      semanticPassCount,
      semanticTargetCount: semanticTargets.length,
      releaseQualified: false,
      staticOnlyVariantNotVisibleInPalette: "DP03PG-03",
      nextGate:
        "대표 4개 활동을 offline compile한 뒤 exact write manifest로 actual save/reopen lifecycle과 initial/selected/manipulated/reopened 화면을 검증한다."
    }
  };
  const evidence = {
    ...evidenceBody,
    contentSha256: contentSha256(evidenceBody)
  };
  assertNoSensitiveData(evidence);
  writeFileSync(outputPath, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
  process.stdout.write(
    `PASS R5 native tool discovery: ${observations.length} tools, external writes 0\n`
  );
} catch (error) {
  failCli(error);
} finally {
  await context?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
}
