#!/usr/bin/env node
import {
  createHash
} from "node:crypto";
import {
  mkdirSync,
  writeFileSync
} from "node:fs";
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
const suppressedTelemetryRequest = {
  method: "POST",
  origin: "https://lc.getunicorn.org",
  target: "/l",
  expectedCount: 1
};
const directSelectorEntries = [
  ["svg text", "svg#outermost text"],
  ["svg foreignObject", "svg#outermost foreignObject"],
  ["input", "svg#outermost input"],
  ["textarea", "svg#outermost textarea"],
  ["contenteditable", "svg#outermost [contenteditable='true']"],
  ["math-field", "svg#outermost math-field"]
];

function safePath(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}${parsed.hash ? "<hash>" : ""}`;
  } catch {
    return "<invalid-url>";
  }
}

function isMathCanvasUrl(value) {
  try {
    return new URL(value).origin === origin;
  } catch {
    return false;
  }
}

async function waitForAuthenticatedPage(page, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (isMathCanvasUrl(page.url())) {
      const authStatus = await page
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
      if (authStatus === 200) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function probeExactSelectors(page) {
  return page.evaluate((selectorEntries) => {
    const round = (value) => Math.round(Number(value) * 100) / 100;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0 &&
        bounds.width > 0 &&
        bounds.height > 0
      );
    };
    const intersects = (bounds, container) =>
      bounds.right > container.left &&
      bounds.left < container.right &&
      bounds.bottom > container.top &&
      bounds.top < container.bottom;
    const describe = (selectorName, element, typographyElements) => {
      const bounds = element.getBoundingClientRect();
      const fontSamples = typographyElements
        .map((typographyElement) => {
          const style = getComputedStyle(typographyElement);
          return {
            family: String(style.fontFamily || "").slice(0, 160),
            size: String(style.fontSize || "").slice(0, 40),
            weight: String(style.fontWeight || "").slice(0, 40),
            lineHeight: String(style.lineHeight || "").slice(0, 40)
          };
        })
        .filter(
          (sample, index, samples) =>
            samples.findIndex(
              (candidate) => JSON.stringify(candidate) === JSON.stringify(sample)
            ) === index
        )
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right))
        );
      return {
        selector: selectorName,
        tag: element.tagName.toLowerCase(),
        bounds: {
          x: round(bounds.x),
          y: round(bounds.y),
          width: round(bounds.width),
          height: round(bounds.height)
        },
        fontSamples,
        textLength: String(element.textContent || element.value || "").trim()
          .length
      };
    };

    const canvasRoot = document.querySelector("svg#outermost");
    if (!canvasRoot || !visible(canvasRoot)) {
      throw new Error("canvas-root-unavailable: svg#outermost");
    }
    const canvasBounds = canvasRoot.getBoundingClientRect();
    const viewportBounds = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    };
    if (!intersects(canvasBounds, viewportBounds)) {
      throw new Error("canvas-root-offscreen: svg#outermost");
    }
    const visibleInCanvas = (element) => {
      const bounds = element.getBoundingClientRect();
      return visible(element) && intersects(bounds, canvasBounds) &&
        intersects(bounds, viewportBounds);
    };
    const hasDirectText = (element) =>
      [...element.childNodes].some(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          String(node.textContent || "").trim().length > 0
      );
    const typographyElementsFor = (element) => {
      if (element.tagName.toLowerCase() !== "foreignobject") return [element];
      const typographyElements = [...element.querySelectorAll("*")].filter(
        (candidate) =>
          visibleInCanvas(candidate) &&
          (hasDirectText(candidate) ||
            ["input", "textarea", "math-field"].includes(
              candidate.tagName.toLowerCase()
            ))
      );
      if (typographyElements.length === 0) {
        throw new Error("direct-candidate-typography-unavailable:foreignObject");
      }
      if (typographyElements.length > 32) {
        throw new Error("direct-candidate-typography-overflow:foreignObject");
      }
      return typographyElements;
    };

    const selectorCounts = {};
    const visibleSelectorCounts = {};
    const directCandidates = [];
    const fontSamples = [];
    for (const [selectorName, selector] of selectorEntries) {
      const elements = [...document.querySelectorAll(selector)];
      const visibleElements = elements.filter(visibleInCanvas);
      if (visibleElements.length > 240) {
        throw new Error(`direct-candidate-overflow:${selectorName}`);
      }
      selectorCounts[selectorName] = elements.length;
      visibleSelectorCounts[selectorName] = visibleElements.length;
      visibleElements.forEach((element) => {
        const description = describe(
          selector,
          element,
          typographyElementsFor(element)
        );
        directCandidates.push(description);
        fontSamples.push(...description.fontSamples);
      });
      if (directCandidates.length > 240) {
        throw new Error("direct-candidate-overflow:total");
      }
    }

    const groupElements = [...canvasRoot.querySelectorAll("g.item.group")];
    const groupTextCount = groupElements.filter((element) =>
      String(element.textContent || "").trim()
    ).length;
    const candidateTagCounts = {};
    for (const candidate of directCandidates) {
      candidateTagCounts[candidate.tag] =
        (candidateTagCounts[candidate.tag] || 0) + 1;
    }
    const directTextBoxTags = [
      ...new Set(directCandidates.map((candidate) => candidate.tag))
    ].sort();
    return {
      selector: selectorEntries.map(([, selector]) => selector).join(","),
      selectorEntries: selectorEntries.map(([name, selector]) => ({
        name,
        selector
      })),
      selectorCounts,
      visibleSelectorCounts,
      candidateTagCounts,
      directTextBoxTags,
      directTextBoxCount: directCandidates.length,
      visibleBounds: directCandidates,
      canvasRoot: {
        selector: "svg#outermost",
        tag: "svg",
        id: "outermost",
        bounds: {
          x: round(canvasBounds.x),
          y: round(canvasBounds.y),
          width: round(canvasBounds.width),
          height: round(canvasBounds.height)
        }
      },
      groupWrapperCount: groupElements.filter(visibleInCanvas).length,
      groupTextCount,
      fontSamples,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      }
    };
  }, directSelectorEntries);
}

function fingerprintFontSamples(fontSamples) {
  const canonical = JSON.stringify(
    fontSamples
      .map((sample) => ({
        family: sample.family,
        lineHeight: sample.lineHeight,
        size: sample.size,
        weight: sample.weight
      }))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  );
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

let context;
let liveAuthSession;
try {
  const options = parseArguments(process.argv.slice(2), {
    output: {
      type: "string",
      default: join(defaultRawRoot, "text-box-availability.raw.json")
    },
    screenshot: {
      type: "string",
      default: join(defaultRawRoot, "text-box-availability.raw.png")
    },
    "raw-root": { type: "string", default: defaultRawRoot },
    "state-dir": { type: "string", default: resolveStateDirectory() },
    path: { type: "string", required: true },
    headless: { type: "boolean" },
    "live-auth": { type: "boolean" },
    "viewport-width": { type: "string", default: "1280" },
    "viewport-height": { type: "string", default: "800" },
    "login-timeout-ms": { type: "string", default: "120000" }
  });
  if (options.headless !== true || options["live-auth"] !== true) {
    throw new Error(
      "text-box-probe-requires-headless-live-auth: 사용자 Chrome 화면을 건드리지 않는 경로만 허용합니다."
    );
  }
  const sourcePath = String(options.path);
  if (!/^\/ko\/view\/[A-Za-z0-9_-]{1,160}$/.test(sourcePath)) {
    throw new Error(
      "text-box-probe-requires-editor-path: --path=/ko/view/<project>만 허용합니다."
    );
  }
  const projectId = sourcePath.slice("/ko/view/".length);
  const projectApiPath = `/api/project/${projectId}`;
  const timeoutMs = Number(options["login-timeout-ms"]);
  const viewportWidth = Number(options["viewport-width"]);
  const viewportHeight = Number(options["viewport-height"]);
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 0 ||
    timeoutMs > 600_000 ||
    !Number.isInteger(viewportWidth) ||
    !Number.isInteger(viewportHeight) ||
    viewportWidth < 320 ||
    viewportWidth > 3840 ||
    viewportHeight < 240 ||
    viewportHeight > 2400
  ) {
    throw new Error("probe 옵션은 유효한 정수 범위여야 합니다.");
  }
  const outputPath = assertPathInside(
    options.output,
    options["raw-root"],
    "raw output"
  );
  const screenshotPath = assertPathInside(
    options.screenshot,
    options["raw-root"],
    "raw screenshot"
  );
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });

  liveAuthSession = await createLiveAuthHeadlessSession(
    resolveStateDirectory(options["state-dir"])
  );
  context = await liveAuthSession.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    serviceWorkers: "block"
  });
  const blockedRequests = [];
  const suppressedTelemetryRequests = [];
  const observedResponses = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const requestOrigin = new URL(request.url()).origin;
    const path = safePath(request.url());
    if (method !== "GET") {
      if (
        method === suppressedTelemetryRequest.method &&
        requestOrigin === suppressedTelemetryRequest.origin &&
        path === suppressedTelemetryRequest.target
      ) {
        suppressedTelemetryRequests.push({
          method,
          origin: requestOrigin,
          path,
          delivered: false
        });
        if (
          suppressedTelemetryRequests.length >
          suppressedTelemetryRequest.expectedCount
        ) {
          blockedRequests.push({
            method,
            origin: requestOrigin,
            path,
            reason: "telemetry-cardinality-overflow"
          });
        }
        await route.abort("blockedbyclient");
        return;
      }
      blockedRequests.push({
        method,
        origin: requestOrigin,
        path,
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
      path: safePath(request.url()),
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
    throw new Error(
      `editor-path-mismatch: expected=${origin}${sourcePath} ` +
        `actual=${currentUrl.origin}${currentUrl.pathname}`
    );
  }
  const projectResponses = observedResponses.filter(
    (response) =>
      response.method === "GET" && response.path === projectApiPath
  );
  if (
    projectResponses.length === 0 ||
    projectResponses.some((response) => response.status !== 200)
  ) {
    const statuses = projectResponses.length > 0
      ? projectResponses.map((response) => response.status).join(",")
      : "missing";
    throw new Error(
      `project-source-unavailable: ${projectApiPath} statuses=${statuses}`
    );
  }
  const probe = await probeExactSelectors(page);
  const capturePath = currentUrl.pathname;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.waitForTimeout(250);
  await page.close({ runBeforeUnload: false });
  if (blockedRequests.length > 0) {
    throw new Error(
      `unsafe-request-observed: ${blockedRequests
        .map(
          (request) =>
            `${request.method}:${request.origin}${request.path}:${request.reason}`
        )
        .join(",")}`
    );
  }
  if (
    suppressedTelemetryRequests.length !==
    suppressedTelemetryRequest.expectedCount
  ) {
    throw new Error(
      "suppressed-telemetry-cardinality-drift: " +
        `expected=${suppressedTelemetryRequest.expectedCount} ` +
        `actual=${suppressedTelemetryRequests.length}`
    );
  }
  const capture = {
    captureVersion: "text-box-availability-1.1.0",
    capturedAt: new Date().toISOString(),
    origin,
    path: capturePath,
    viewport: { width: viewportWidth, height: viewportHeight },
    query: probe,
    fontFingerprint:
      probe.directTextBoxCount > 0
        ? fingerprintFontSamples(probe.fontSamples)
        : null,
    blockedRequests: blockedRequests.sort((left, right) =>
      `${left.method}:${left.origin}:${left.path}`.localeCompare(
        `${right.method}:${right.origin}:${right.path}`
      )
    ),
    suppressedTelemetryRequests: suppressedTelemetryRequests.sort(
      (left, right) =>
        `${left.method}:${left.origin}:${left.path}`.localeCompare(
          `${right.method}:${right.origin}:${right.path}`
        )
    ),
    observedResponses: observedResponses.sort((left, right) =>
      `${left.method}:${left.path}:${left.status}`.localeCompare(
        `${right.method}:${right.path}:${right.status}`
      )
    )
  };
  writeFileSync(outputPath, stableJson(capture), {
    encoding: "utf8",
    mode: 0o600
  });
  const rawSha256 = createHash("sha256")
    .update(stableJson(capture))
    .digest("hex");
  process.stdout.write(
    `PASS text-box probe ${capture.path} direct=${probe.directTextBoxCount} ` +
      `groups=${probe.groupWrapperCount} rawSha256=${rawSha256} ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (liveAuthSession) await liveAuthSession.close().catch(() => undefined);
}
