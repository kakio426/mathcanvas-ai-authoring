#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { stableJson } from "./lib/normalize.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";

const origin = "https://mathcanvas.vivasam.com";
const guardCssPx = 8;
const measurementToleranceCssPx = 0.01;
const suppressedTelemetryRequest = {
  method: "POST",
  origin: "https://lc.getunicorn.org",
  target: "/l",
  expectedCount: 1
};
const fixedChromeSelectors = {
  top: "#top-toolbar",
  left: "#left-toolbar",
  right: "#right-toolbar",
  bottom: "#bottom-common-toolbar"
};
const interactionReference = {
  coverage: "single-reference-diagnostic",
  activityId: "number.division.quotient-remainder.claim-evidence-v1",
  affordanceFamilyId: "native-counting-model-v1",
  toolKey: "NO01SC",
  variantId: "NO01SC-01",
  targetSelector: "#division-remainder-1-counting-model-pool-unit-01",
  targetRole: "counting-model-source-unit",
  observedSelectedCount: 7,
  genericResolverInputAllowed: false
};

function safeTarget(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}${parsed.hash ? "<hash>" : ""}`;
  } catch {
    return "<invalid-url>";
  }
}

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}:${canonicalJson(child)}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function objectSha256(value) {
  return sha256(canonicalJson(value));
}

function inverseMatrix(matrix) {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) {
    throw new Error("editor-geometry-singular-ctm");
  }
  return {
    a: round(matrix.d / determinant),
    b: round(-matrix.b / determinant),
    c: round(-matrix.c / determinant),
    d: round(matrix.a / determinant),
    e: round((matrix.c * matrix.f - matrix.d * matrix.e) / determinant),
    f: round((matrix.b * matrix.e - matrix.a * matrix.f) / determinant)
  };
}

function transformPoint(matrix, point) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

function transformBounds(matrix, bounds) {
  const points = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
  ].map((point) => transformPoint(matrix, point));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: round(Math.min(...xs)),
    y: round(Math.min(...ys)),
    width: round(Math.max(...xs) - Math.min(...xs)),
    height: round(Math.max(...ys) - Math.min(...ys))
  };
}

function maxNumericDrift(left, right, path = "root") {
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right);
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      throw new Error(`editor-geometry-stability-shape-drift:${path}`);
    }
    return left.reduce(
      (maximum, child, index) =>
        Math.max(maximum, maxNumericDrift(child, right[index], `${path}[${index}]`)),
      0
    );
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (JSON.stringify(leftKeys) !== JSON.stringify(rightKeys)) {
      throw new Error(`editor-geometry-stability-key-drift:${path}`);
    }
    return leftKeys.reduce(
      (maximum, key) =>
        Math.max(maximum, maxNumericDrift(left[key], right[key], `${path}.${key}`)),
      0
    );
  }
  if (left !== right) {
    throw new Error(`editor-geometry-stability-value-drift:${path}`);
  }
  return 0;
}

function deriveSafeRects(initial, selected) {
  const fixed = initial.fixedChrome;
  const fixedSafeCss = {
    x: round(fixed.left.bounds.x + fixed.left.bounds.width + guardCssPx),
    y: round(fixed.top.bounds.y + fixed.top.bounds.height + guardCssPx),
    width: 0,
    height: 0
  };
  const fixedRight = fixed.right.bounds.x - guardCssPx;
  const fixedBottom = fixed.bottom.bounds.y - guardCssPx;
  fixedSafeCss.width = round(fixedRight - fixedSafeCss.x);
  fixedSafeCss.height = round(fixedBottom - fixedSafeCss.y);
  const dynamicTop = Math.min(
    ...selected.dynamicChrome.boxes.map((entry) => entry.bounds.y)
  );
  const referenceInteractionSafeCss = {
    ...fixedSafeCss,
    height: round(
      Math.min(fixedBottom, dynamicTop - guardCssPx) - fixedSafeCss.y
    )
  };
  if (
    fixedSafeCss.width <= 0 ||
    fixedSafeCss.height <= 0 ||
    referenceInteractionSafeCss.height <= 0
  ) {
    throw new Error("editor-geometry-derived-safe-rect-empty");
  }
  const inverse = inverseMatrix(initial.canvas.ctm);
  return {
    guardCssPx,
    derivation:
      "fixed-edge-constraints-plus-single-reference-dynamic-diagnostic",
    fixedSafeCss,
    fixedSafeCanvas: transformBounds(inverse, fixedSafeCss),
    singleReferenceInteractionDiagnostic: {
      coverage: "single-reference-diagnostic",
      usableAsGenericResolverInput: false,
      interactionSafeCss: referenceInteractionSafeCss,
      interactionSafeCanvas: transformBounds(
        inverse,
        referenceInteractionSafeCss
      )
    }
  };
}

function staticSampleProjection(sample) {
  const { selectedCount: _selectedCount, ...editorState } = sample.editorState;
  return {
    viewport: sample.viewport,
    editorState,
    canvas: sample.canvas,
    fixedChrome: sample.fixedChrome,
    calibration: sample.calibration
  };
}

function assertExactCanvasFrame(sample) {
  const expected = { x: 0, y: 0, width: 1280, height: 800 };
  if (canonicalJson(sample.canvas.screenBounds) !== canonicalJson(expected)) {
    throw new Error("editor-geometry-screen-bounds-drift");
  }
  if (sample.canvas.cornerResidualCssPx > measurementToleranceCssPx) {
    throw new Error(
      `editor-geometry-corner-residual:${sample.canvas.cornerResidualCssPx}`
    );
  }
}

async function waitForAuthenticatedPage(page, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    let pageOrigin = "";
    try {
      pageOrigin = new URL(page.url()).origin;
    } catch {
      pageOrigin = "";
    }
    if (pageOrigin === origin) {
      const status = await page
        .evaluate(async () => {
          try {
            const response = await fetch("/api/auth/me", {
              method: "GET",
              credentials: "include",
              cache: "no-store"
            });
            return response.status;
          } catch {
            return 0;
          }
        })
        .catch(() => 0);
      if (status === 200) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function measureEditorGeometry(page, includeDynamicChrome) {
  const sample = await page.evaluate(
    ({ fixedSelectors, includeDynamic }) => {
      const roundBrowser = (value, digits = 6) => {
        const factor = 10 ** digits;
        return Math.round(Number(value) * factor) / factor;
      };
      const boundsOf = (element) => {
        const bounds = element.getBoundingClientRect();
        return {
          x: roundBrowser(bounds.x),
          y: roundBrowser(bounds.y),
          width: roundBrowser(bounds.width),
          height: roundBrowser(bounds.height)
        };
      };
      const visible = (element) => {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || 1) > 0 &&
          bounds.right > 0 &&
          bounds.left < window.innerWidth &&
          bounds.bottom > 0 &&
          bounds.top < window.innerHeight
        );
      };
      const exactVisible = (selector) => {
        const elements = [...document.querySelectorAll(selector)];
        if (elements.length !== 1 || !visible(elements[0])) {
          throw new Error(
            `editor-geometry-exact-visible-selector:${selector}:${elements.length}`
          );
        }
        return elements[0];
      };
      const matrixOf = (matrix) => ({
        a: roundBrowser(matrix.a, 9),
        b: roundBrowser(matrix.b, 9),
        c: roundBrowser(matrix.c, 9),
        d: roundBrowser(matrix.d, 9),
        e: roundBrowser(matrix.e, 9),
        f: roundBrowser(matrix.f, 9)
      });
      const transform = (matrix, x, y) => ({
        x: matrix.a * x + matrix.c * y + matrix.e,
        y: matrix.b * x + matrix.d * y + matrix.f
      });
      const boundsFromPoints = (points) => {
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        return {
          x: roundBrowser(Math.min(...xs)),
          y: roundBrowser(Math.min(...ys)),
          width: roundBrowser(Math.max(...xs) - Math.min(...xs)),
          height: roundBrowser(Math.max(...ys) - Math.min(...ys))
        };
      };

      const canvas = exactVisible("svg#outermost");
      const ctmValue = canvas.getScreenCTM();
      const viewBoxValue = canvas.viewBox?.baseVal;
      if (!ctmValue || !viewBoxValue || viewBoxValue.width <= 0 || viewBoxValue.height <= 0) {
        throw new Error("editor-geometry-canvas-transform-unavailable");
      }
      const ctm = matrixOf(ctmValue);
      const screenBounds = boundsOf(canvas);
      const viewBox = {
        x: roundBrowser(viewBoxValue.x),
        y: roundBrowser(viewBoxValue.y),
        width: roundBrowser(viewBoxValue.width),
        height: roundBrowser(viewBoxValue.height)
      };
      const projectedCorners = [
        transform(ctmValue, viewBoxValue.x, viewBoxValue.y),
        transform(ctmValue, viewBoxValue.x + viewBoxValue.width, viewBoxValue.y),
        transform(ctmValue, viewBoxValue.x, viewBoxValue.y + viewBoxValue.height),
        transform(
          ctmValue,
          viewBoxValue.x + viewBoxValue.width,
          viewBoxValue.y + viewBoxValue.height
        )
      ];
      const expectedCorners = [
        { x: screenBounds.x, y: screenBounds.y },
        { x: screenBounds.x + screenBounds.width, y: screenBounds.y },
        { x: screenBounds.x, y: screenBounds.y + screenBounds.height },
        {
          x: screenBounds.x + screenBounds.width,
          y: screenBounds.y + screenBounds.height
        }
      ];
      const cornerResidualCssPx = roundBrowser(
        Math.max(
          ...projectedCorners.map((point, index) =>
            Math.hypot(
              point.x - expectedCorners[index].x,
              point.y - expectedCorners[index].y
            )
          )
        )
      );

      const roots = [...document.querySelectorAll("#app, [data-v-app]")];
      let viewBoxStore = null;
      for (const root of roots) {
        const app = root.__vue_app__;
        const provided = app?._context?.provides;
        const candidates = [
          app?.config?.globalProperties?.$pinia,
          ...(provided ? Reflect.ownKeys(provided).map((key) => provided[key]) : [])
        ];
        for (const candidate of candidates) {
          if (!(candidate?._s instanceof Map)) continue;
          const store = candidate._s.get("viewBox");
          if (store) {
            viewBoxStore = store;
            break;
          }
        }
        if (viewBoxStore) break;
      }
      if (!viewBoxStore) {
        throw new Error("editor-geometry-viewbox-store-unavailable");
      }
      const storeViewBox = Array.isArray(viewBoxStore.viewBox)
        ? viewBoxStore.viewBox.map((value) => roundBrowser(value))
        : null;
      if (!storeViewBox || storeViewBox.length !== 4) {
        throw new Error("editor-geometry-store-viewbox-invalid");
      }

      const fixedChrome = Object.fromEntries(
        Object.entries(fixedSelectors).map(([role, selector]) => {
          const element = exactVisible(selector);
          return [
            role,
            {
              selector,
              bounds: boundsOf(element)
            }
          ];
        })
      );

      const dynamicBoxes = [];
      if (includeDynamic) {
        const darkBackground = (value) => {
          const match = value.match(
            /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/
          );
          if (!match) return null;
          const alpha = match[4] === undefined ? 1 : Number(match[4]);
          const luminance =
            Number(match[1]) * 0.2126 +
            Number(match[2]) * 0.7152 +
            Number(match[3]) * 0.0722;
          return alpha >= 0.75 && luminance <= 125
            ? { alpha, perceivedLuminance: luminance }
            : null;
        };
        const candidates = [...document.querySelectorAll("body *")].flatMap(
          (element) => {
            if (!visible(element)) return [];
            if (
              element.closest(
                Object.values(fixedSelectors).join(",")
              )
            ) {
              return [];
            }
            const bounds = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const darkColor = darkBackground(style.backgroundColor);
            const controlCount = [
              ...element.querySelectorAll(
                ".cursor-pointer, button, [role='button']"
              )
            ].filter(visible).length;
            if (
              bounds.top < window.innerHeight * 0.55 ||
              bounds.width < 180 ||
              bounds.width > 900 ||
              bounds.height < 28 ||
              bounds.height > 110 ||
              controlCount < 3 ||
              !darkColor
            ) {
              return [];
            }
            return [
              {
                role: "selection-context-toolbar",
                signature: {
                  strategy: "visible-dark-toolbar-outside-fixed-chrome-v1",
                  tag: element.tagName.toLowerCase(),
                  backgroundColor: style.backgroundColor,
                  backgroundAlpha: roundBrowser(darkColor.alpha, 6),
                  perceivedLuminance: roundBrowser(
                    darkColor.perceivedLuminance,
                    6
                  ),
                  controlCount
                },
                bounds: boundsOf(element),
                area: bounds.width * bounds.height
              }
            ];
          }
        );
        candidates.sort(
          (left, right) => left.area - right.area || left.bounds.x - right.bounds.x
        );
        for (const candidate of candidates) {
          const duplicate = dynamicBoxes.some(
            (entry) =>
              Math.abs(entry.bounds.x - candidate.bounds.x) <= 3 &&
              Math.abs(entry.bounds.y - candidate.bounds.y) <= 3 &&
              Math.abs(entry.bounds.width - candidate.bounds.width) <= 6 &&
              Math.abs(entry.bounds.height - candidate.bounds.height) <= 6
          );
          if (!duplicate) {
            const { area: _area, ...record } = candidate;
            dynamicBoxes.push(record);
          }
        }
        if (dynamicBoxes.length !== 1) {
          throw new Error(
            `editor-geometry-dynamic-toolbar-count:${dynamicBoxes.length}`
          );
        }
      }

      const reference = exactVisible(
        "#division-remainder-1-choice-panel"
      );
      const referenceBox = reference.getBBox();
      const referenceCtm = reference.getScreenCTM();
      if (!referenceCtm || referenceBox.width <= 0 || referenceBox.height <= 0) {
        throw new Error("editor-geometry-calibration-reference-invalid");
      }
      const referenceCanvasBox = {
        x: roundBrowser(referenceBox.x),
        y: roundBrowser(referenceBox.y),
        width: roundBrowser(referenceBox.width),
        height: roundBrowser(referenceBox.height)
      };
      const referenceProjectedCssBox = boundsFromPoints([
        transform(referenceCtm, referenceBox.x, referenceBox.y),
        transform(referenceCtm, referenceBox.x + referenceBox.width, referenceBox.y),
        transform(referenceCtm, referenceBox.x, referenceBox.y + referenceBox.height),
        transform(
          referenceCtm,
          referenceBox.x + referenceBox.width,
          referenceBox.y + referenceBox.height
        )
      ]);
      const referenceRenderedCssBox = boundsOf(reference);
      const inflation = {
        left: roundBrowser(referenceProjectedCssBox.x - referenceRenderedCssBox.x),
        top: roundBrowser(referenceProjectedCssBox.y - referenceRenderedCssBox.y),
        right: roundBrowser(
          referenceRenderedCssBox.x + referenceRenderedCssBox.width -
            (referenceProjectedCssBox.x + referenceProjectedCssBox.width)
        ),
        bottom: roundBrowser(
          referenceRenderedCssBox.y + referenceRenderedCssBox.height -
            (referenceProjectedCssBox.y + referenceProjectedCssBox.height)
        )
      };

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        editorState: {
          surfaceMode: "authoring-editor",
          sidebarState: viewBoxStore.isLeftToolbarFold ? "collapsed" : "expanded",
          leftToolbarFolded: Boolean(viewBoxStore.isLeftToolbarFold),
          topToolbarVisible: Boolean(viewBoxStore.isShowTopToolbar),
          fullScreen: Boolean(viewBoxStore.isFullScreen),
          storeScale: Number(viewBoxStore.scale),
          zoomObservation: "fit-compatible-geometry-observed",
          selectedCount: Array.isArray(viewBoxStore.selected)
            ? viewBoxStore.selected.length
            : Array.isArray(viewBoxStore.selectCanvasIds)
              ? viewBoxStore.selectCanvasIds.length
              : 0,
          storeViewBox
        },
        canvas: {
          selector: "svg#outermost",
          screenBounds,
          viewBox,
          preserveAspectRatio: canvas.getAttribute("preserveAspectRatio") || "",
          ctm,
          inverse: matrixOf(ctmValue.inverse()),
          determinant: roundBrowser(
            ctmValue.a * ctmValue.d - ctmValue.b * ctmValue.c,
            9
          ),
          scaleX: roundBrowser(Math.hypot(ctmValue.a, ctmValue.b), 9),
          scaleY: roundBrowser(Math.hypot(ctmValue.c, ctmValue.d), 9),
          skewRotationResidual: roundBrowser(
            Math.max(Math.abs(ctmValue.b), Math.abs(ctmValue.c)),
            9
          ),
          cornerResidualCssPx
        },
        fixedChrome,
        dynamicChrome: {
          state: includeDynamic ? "selected" : "initial",
          deduplicatedCandidateCount: dynamicBoxes.length,
          chosenSignatureSha256: null,
          boxes: dynamicBoxes
        },
        calibration: {
          referenceSelector: "#division-remainder-1-choice-panel",
          canvasBox: referenceCanvasBox,
          projectedCssBox: referenceProjectedCssBox,
          renderedBorderBox: referenceRenderedCssBox,
          inflationCssPx: inflation,
          effectiveScaleX: roundBrowser(
            referenceRenderedCssBox.width / referenceCanvasBox.width,
            9
          ),
          effectiveScaleY: roundBrowser(
            referenceRenderedCssBox.height / referenceCanvasBox.height,
            9
          ),
          deltaFromCoordinateScaleX: roundBrowser(
            referenceRenderedCssBox.width / referenceCanvasBox.width -
              Math.hypot(ctmValue.a, ctmValue.b),
            9
          ),
          deltaFromCoordinateScaleY: roundBrowser(
            referenceRenderedCssBox.height / referenceCanvasBox.height -
              Math.hypot(ctmValue.c, ctmValue.d),
            9
          ),
          usage: "diagnostic-only-not-coordinate-conversion"
        }
      };
    },
    {
      fixedSelectors: fixedChromeSelectors,
      includeDynamic: includeDynamicChrome
    }
  );
  sample.dynamicChrome.chosenSignatureSha256 =
    sample.dynamicChrome.boxes.length === 1
      ? objectSha256(sample.dynamicChrome.boxes[0])
      : null;
  return sample;
}

async function collectAssetFingerprint(page) {
  const urls = await page.evaluate(() => {
    const values = [
      ...performance.getEntriesByType("resource").map((entry) => entry.name),
      ...[...document.querySelectorAll("script[src]")].map((element) => element.src),
      ...[...document.querySelectorAll("link[rel='stylesheet'][href]")].map(
        (element) => element.href
      )
    ];
    return [...new Set(values)];
  });
  const assetUrls = urls
    .filter((value) => {
      try {
        const url = new URL(value);
        return (
          url.origin === origin &&
          /^\/assets\//.test(url.pathname) &&
          /\.(?:css|m?js)$/i.test(url.pathname)
        );
      } catch {
        return false;
      }
    })
    .sort();
  if (assetUrls.length === 0 || assetUrls.length > 24) {
    throw new Error(`editor-geometry-asset-count:${assetUrls.length}`);
  }
  const records = [];
  for (const urlValue of assetUrls) {
    const response = await page.context().request.get(urlValue);
    if (!response.ok()) {
      throw new Error(`editor-geometry-asset-fetch:${response.status()}`);
    }
    const body = await response.body();
    const url = new URL(urlValue);
    records.push({
      bytes: body.byteLength,
      path: `${url.pathname}${url.search}`,
      sha256: sha256(body)
    });
  }
  return {
    records,
    aggregateSha256: sha256(JSON.stringify(records))
  };
}

let context;
let liveAuthSession;
try {
  const options = parseArguments(process.argv.slice(2), {
    output: {
      type: "string",
      default: join(defaultRawRoot, "editor-geometry.raw.json")
    },
    "initial-screenshot": {
      type: "string",
      default: join(defaultRawRoot, "editor-geometry-initial.raw.png")
    },
    "selected-screenshot": {
      type: "string",
      default: join(defaultRawRoot, "editor-geometry-selected.raw.png")
    },
    "raw-root": { type: "string", default: defaultRawRoot },
    "state-dir": { type: "string", default: resolveStateDirectory() },
    path: { type: "string", required: true },
    "selection-target": {
      type: "string",
      default: interactionReference.targetSelector
    },
    headless: { type: "boolean" },
    "live-auth": { type: "boolean" },
    "login-timeout-ms": { type: "string", default: "120000" }
  });
  if (options.headless !== true || options["live-auth"] !== true) {
    throw new Error("editor-geometry-requires-headless-live-auth");
  }
  const sourcePath = String(options.path);
  if (!/^\/ko\/view\/[A-Za-z0-9_-]{1,160}$/.test(sourcePath)) {
    throw new Error("editor-geometry-requires-editor-path");
  }
  const selectionTarget = String(options["selection-target"]);
  if (selectionTarget !== interactionReference.targetSelector) {
    throw new Error("editor-geometry-selection-target-invalid");
  }
  const projectId = sourcePath.slice("/ko/view/".length);
  const projectApiPath = `/api/project/${projectId}`;
  const timeoutMs = Number(options["login-timeout-ms"]);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 600_000) {
    throw new Error("editor-geometry-login-timeout-invalid");
  }
  const outputPath = assertPathInside(
    options.output,
    options["raw-root"],
    "editor geometry raw output"
  );
  const initialScreenshotPath = assertPathInside(
    options["initial-screenshot"],
    options["raw-root"],
    "editor geometry initial screenshot"
  );
  const selectedScreenshotPath = assertPathInside(
    options["selected-screenshot"],
    options["raw-root"],
    "editor geometry selected screenshot"
  );
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });

  liveAuthSession = await createLiveAuthHeadlessSession(
    resolveStateDirectory(options["state-dir"])
  );
  context = await liveAuthSession.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  const blockedRequests = [];
  const suppressedTelemetryRequests = [];
  const observedResponses = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const requestUrl = new URL(request.url());
    const target = safeTarget(request.url());
    if (method !== "GET") {
      if (
        method === suppressedTelemetryRequest.method &&
        requestUrl.origin === suppressedTelemetryRequest.origin &&
        target === suppressedTelemetryRequest.target
      ) {
        suppressedTelemetryRequests.push({
          method,
          origin: requestUrl.origin,
          target,
          delivered: false
        });
        if (
          suppressedTelemetryRequests.length >
          suppressedTelemetryRequest.expectedCount
        ) {
          blockedRequests.push({
            method,
            origin: requestUrl.origin,
            target,
            reason: "telemetry-cardinality-overflow"
          });
        }
        await route.abort("blockedbyclient");
        return;
      }
      blockedRequests.push({
        method,
        origin: requestUrl.origin,
        target,
        reason: "non-get-request"
      });
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  context.on("response", (response) => {
    const request = response.request();
    let requestUrl;
    try {
      requestUrl = new URL(request.url());
    } catch {
      return;
    }
    if (requestUrl.origin !== origin) return;
    observedResponses.push({
      method: request.method(),
      target: safeTarget(request.url()),
      status: response.status()
    });
  });

  const page = await context.newPage();
  await page.goto(`${origin}${sourcePath}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  if (!(await waitForAuthenticatedPage(page, timeoutMs))) {
    throw new Error("auth-required: 현재 로그인 상태를 확인할 수 없습니다.");
  }
  await page.waitForTimeout(3000);
  const currentUrl = new URL(page.url());
  if (
    currentUrl.origin !== origin ||
    currentUrl.pathname !== sourcePath ||
    currentUrl.search !== "" ||
    currentUrl.hash !== ""
  ) {
    throw new Error("editor-geometry-editor-url-mismatch");
  }
  const projectResponses = observedResponses.filter(
    (response) =>
      response.method === "GET" && response.target === projectApiPath
  );
  if (
    projectResponses.length === 0 ||
    projectResponses.some((response) => response.status !== 200)
  ) {
    throw new Error(
      `editor-geometry-project-source:${projectResponses
        .map((response) => response.status)
        .join(",") || "missing"}`
    );
  }

  const browserFingerprint = sha256(
    await page.evaluate(() => navigator.userAgent)
  );
  const initialFirst = await measureEditorGeometry(page, false);
  await page.waitForTimeout(250);
  const initialSecond = await measureEditorGeometry(page, false);
  assertExactCanvasFrame(initialFirst);
  assertExactCanvasFrame(initialSecond);
  const initialDrift = maxNumericDrift(initialFirst, initialSecond);
  if (initialDrift > measurementToleranceCssPx) {
    throw new Error(`editor-geometry-initial-drift:${initialDrift}`);
  }
  await page.screenshot({ path: initialScreenshotPath, fullPage: true });

  const target = page.locator(selectionTarget);
  if (!(await target.isVisible().catch(() => false))) {
    throw new Error("editor-geometry-selection-target-unavailable");
  }
  await target.click({ force: true });
  await page.waitForTimeout(500);
  const selectedFirst = await measureEditorGeometry(page, true);
  await page.waitForTimeout(250);
  const selectedSecond = await measureEditorGeometry(page, true);
  assertExactCanvasFrame(selectedFirst);
  assertExactCanvasFrame(selectedSecond);
  const selectedDrift = maxNumericDrift(selectedFirst, selectedSecond);
  if (selectedDrift > measurementToleranceCssPx) {
    throw new Error(`editor-geometry-selected-drift:${selectedDrift}`);
  }
  if (
    selectedFirst.editorState.selectedCount !==
      interactionReference.observedSelectedCount ||
    selectedSecond.editorState.selectedCount !==
      interactionReference.observedSelectedCount
  ) {
    throw new Error("editor-geometry-selection-state-missing");
  }
  const staticFirstDrift = maxNumericDrift(
    staticSampleProjection(initialFirst),
    staticSampleProjection(selectedFirst)
  );
  const staticSecondDrift = maxNumericDrift(
    staticSampleProjection(initialSecond),
    staticSampleProjection(selectedSecond)
  );
  if (
    staticFirstDrift > measurementToleranceCssPx ||
    staticSecondDrift > measurementToleranceCssPx
  ) {
    throw new Error(
      `editor-geometry-static-state-drift:${Math.max(
        staticFirstDrift,
        staticSecondDrift
      )}`
    );
  }
  await page.screenshot({ path: selectedScreenshotPath, fullPage: true });
  const assetFingerprint = await collectAssetFingerprint(page);
  const derived = deriveSafeRects(initialSecond, selectedSecond);
  await page.waitForTimeout(250);
  await page.close({ runBeforeUnload: false });

  if (blockedRequests.length > 0) {
    throw new Error(
      `unsafe-request-observed:${blockedRequests
        .map(
          (request) =>
            `${request.method}:${request.origin}${request.target}:${request.reason}`
        )
        .join(",")}`
    );
  }
  if (
    suppressedTelemetryRequests.length !==
    suppressedTelemetryRequest.expectedCount
  ) {
    throw new Error(
      "suppressed-telemetry-cardinality-drift:" +
        `${suppressedTelemetryRequests.length}`
    );
  }
  const initialScreenshotSha256 = sha256(
    readFileSync(initialScreenshotPath)
  );
  const selectedScreenshotSha256 = sha256(
    readFileSync(selectedScreenshotPath)
  );
  const capture = {
    captureVersion: "editor-geometry-1.0.0",
    capturedAt: new Date().toISOString(),
    origin,
    path: sourcePath,
    provenance: {
      probeMode: "dedicated-live-auth-read-only",
      harnessVersion: "editor-geometry-probe:v1",
      browserFingerprint: `sha256:${browserFingerprint}`,
      assetFingerprint,
      screenshots: {
        initialSha256: initialScreenshotSha256,
        selectedSha256: selectedScreenshotSha256
      }
    },
    environment: {
      viewport: { width: 1280, height: 800 },
      devicePixelRatio: initialSecond.viewport.devicePixelRatio,
      surfaceMode: "authoring-editor",
      sidebarState: initialSecond.editorState.sidebarState,
      zoomObservation: initialSecond.editorState.zoomObservation,
      pan: {
        x: initialSecond.canvas.viewBox.x,
        y: initialSecond.canvas.viewBox.y
      },
      userChromeTouched: false,
      writePolicy: "GET-only-with-exact-aborted-telemetry"
    },
    interactionReference,
    networkAudit: {
      projectSource: {
        target: projectApiPath,
        responseStatuses: projectResponses.map((response) => response.status)
      },
      blockedRequests,
      suppressedTelemetryRequests
    },
    stability: {
      sampleCountPerState: 2,
      toleranceCssPx: measurementToleranceCssPx,
      initialMaxDrift: round(initialDrift),
      selectedMaxDrift: round(selectedDrift),
      initialFirst,
      initialSecond,
      selectedFirst,
      selectedSecond
    },
    derived,
    eligibility: {
      fixedGeometryInputReady: true,
      interactionGeometryInputReady: false,
      blockers: ["affordance-family-dynamic-chrome-coverage-pending"],
      note:
        "고정 chrome geometry만 R4 offline 입력 준비가 끝났고 interaction geometry는 단일 reference 진단이다."
    },
    limitations: [
      "single-reference dynamic chrome evidence는 7개 affordance family의 generic interaction geometry를 대표하지 않는다.",
      "selected toolbar와 현재 activity workbench 하단선은 screenshot에서 0px clearance로 맞닿아 8px interaction clearance 근거가 아니다.",
      "zoom은 UI mode assertion이 아니라 CTM-viewBox-screen corner relation과 호환되는 geometry observation이다."
    ],
    observedResponses: observedResponses.sort((left, right) =>
      `${left.method}:${left.target}:${left.status}`.localeCompare(
        `${right.method}:${right.target}:${right.status}`
      )
    )
  };
  const normalized = stableJson(capture);
  writeFileSync(outputPath, normalized, {
    encoding: "utf8",
    mode: 0o600
  });
  process.stdout.write(
    `PASS editor geometry ${sourcePath} scaleX=${initialSecond.canvas.scaleX} ` +
      `fixed=${derived.fixedSafeCss.width}x${derived.fixedSafeCss.height} ` +
      `referenceInteraction=${derived.singleReferenceInteractionDiagnostic.interactionSafeCss.width}x${derived.singleReferenceInteractionDiagnostic.interactionSafeCss.height} ` +
      `rawSha256=${sha256(normalized)} ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (liveAuthSession) await liveAuthSession.close().catch(() => undefined);
}
