#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  acquireManagedProfileLock,
  assertPathInside,
  defaultRawRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { stableJson } from "./lib/normalize.mjs";

const origin = "https://mathcanvas.vivasam.com";

function safePath(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.hash ? "<hash>" : ""}`;
  } catch {
    return "<invalid-url>";
  }
}

function isMathCanvasUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.origin === origin;
  } catch {
    return false;
  }
}

async function waitForAuthenticatedPage(page, timeoutMs) {
  const startedAt = Date.now();
  let confirmationClicked = false;
  while (Date.now() - startedAt < timeoutMs) {
    if (isMathCanvasUrl(page.url())) {
      const authStatus = await page
        .evaluate(async () => {
          try {
            const response = await fetch("/api/auth/me", {
              method: "GET",
              credentials: "include"
            });
            return response.status;
          } catch {
            return 0;
          }
        })
        .catch(() => 0);
      if (authStatus === 200) return true;
      if (!confirmationClicked) {
        const confirmation = page.getByRole("button", {
          name: "확인",
          exact: true
        });
        if (await confirmation.isVisible().catch(() => false)) {
          await confirmation.click();
          confirmationClicked = true;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function captureVisibleStructure(page) {
  return page.evaluate(() => {
    const clean = (value, limit = 240) =>
      String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit);
    const allowedAttribute = (name) =>
      name === "id" ||
      name === "class" ||
      name === "role" ||
      name === "aria-label" ||
      name === "title" ||
      name.startsWith("data-");
    const describe = (element) => {
      const attributes = Object.fromEntries(
        [...element.attributes]
          .filter((attribute) => allowedAttribute(attribute.name))
          .map((attribute) => [
            attribute.name,
            clean(attribute.value)
          ])
          .filter(([, value]) => value.length > 0)
      );
      return {
        tag: element.tagName.toLowerCase(),
        text: clean(element.textContent, 160),
        attributes
      };
    };
    const selector = [
      "button",
      "a",
      "[role='button']",
      "[aria-label]",
      "[title]",
      "[data-testid]",
      "[data-tool]",
      "[data-module]",
      "[class*='tool']",
      "[class*='Tool']",
      "[class*='menu']",
      "[class*='Menu']",
      "[class*='module']",
      "[class*='Module']",
      "[class*='item']",
      "[class*='Item']",
      "[class*='category']",
      "[class*='Category']",
      "img[alt]"
    ].join(",");
    return [...document.querySelectorAll(selector)]
      .filter((element) => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          bounds.width > 0 &&
          bounds.height > 0
        );
      })
      .slice(0, 2500)
      .map((element) => {
        const ancestors = [];
        let parent = element.parentElement;
        for (let depth = 0; parent && depth < 4; depth += 1) {
          ancestors.push(describe(parent));
          parent = parent.parentElement;
        }
        const bounds = element.getBoundingClientRect();
        return {
          ...describe(element),
          bounds: {
            x: Math.round(bounds.x),
            y: Math.round(bounds.y),
            width: Math.round(bounds.width),
            height: Math.round(bounds.height)
          },
          ancestors
        };
      });
  });
}

let context;
let releaseLock;
try {
  const options = parseArguments(process.argv.slice(2), {
    output: {
      type: "string",
      default: join(defaultRawRoot, "page-structure.raw.json")
    },
    screenshot: {
      type: "string",
      default: join(defaultRawRoot, "page-structure.raw.png")
    },
    "raw-root": { type: "string", default: defaultRawRoot },
    "state-dir": {
      type: "string",
      default: resolveStateDirectory()
    },
    path: { type: "string", default: "/ko/myCanvas" },
    "latest-owned-project": { type: "boolean" },
    "open-new-canvas-dialog": { type: "boolean" },
    "open-tool-settings": { type: "boolean" },
    headless: { type: "boolean" },
    "login-timeout-ms": { type: "string", default: "240000" }
  });
  const stateDirectory = resolveStateDirectory(options["state-dir"]);
  let sourcePath = String(options.path);
  if (options["latest-owned-project"]) {
    const snapshot = JSON.parse(
      readFileSync(join(stateDirectory, "creation-jobs.json"), "utf8")
    );
    const owned = [...(snapshot.jobs ?? [])]
      .reverse()
      .find(
        (entry) =>
          entry?.status === "succeeded" &&
          entry?.result?.ok === true &&
          typeof entry?.result?.projectId === "string"
      );
    if (!owned) {
      throw new Error(
        "creator-owned-project-unavailable: 성공한 생성 작업이 없습니다."
      );
    }
    sourcePath = `/ko/view/${encodeURIComponent(
      owned.result.projectId
    )}`;
  }
  if (!sourcePath.startsWith("/")) {
    throw new Error("--path는 MathCanvas origin 내부 경로여야 합니다.");
  }
  const timeoutMs = Number(options["login-timeout-ms"]);
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 0 ||
    timeoutMs > 600_000
  ) {
    throw new Error("--login-timeout-ms는 0~600000 정수여야 합니다.");
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
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  releaseLock = acquireManagedProfileLock(stateDirectory);
  const blockedRequests = [];
  const observedResponses = [];
  const consoleErrors = [];
  const pageErrors = [];
  context = await chromium.launchPersistentContext(
    join(stateDirectory, "chrome-profile"),
    {
      channel: "chrome",
      headless: options.headless === true,
      viewport: options.headless ? { width: 1440, height: 1000 } : null,
      args: options.headless ? [] : ["--start-maximized"]
    }
  );
  const attachDiagnostics = (targetPage) => {
    targetPage.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text().slice(0, 1000));
      }
    });
    targetPage.on("pageerror", (error) => {
      pageErrors.push(String(error).slice(0, 1000));
    });
  };
  context.pages().forEach(attachDiagnostics);
  context.on("page", attachDiagnostics);
  let page = context.pages()[0] ?? (await context.newPage());
  await context.route(`${origin}/**`, async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const path = safePath(request.url());
    if (
      ["PUT", "PATCH", "DELETE"].includes(method) ||
      (method === "POST" && path === "/api/project")
    ) {
      blockedRequests.push({ method, path });
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  context.on("response", (response) => {
    const request = response.request();
    if (!request.url().startsWith(origin)) return;
    observedResponses.push({
      method: request.method(),
      path: safePath(request.url()),
      status: response.status(),
      contentType: response.headers()["content-type"] ?? ""
    });
  });
  await page.goto(`${origin}${sourcePath}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  const authenticated = await waitForAuthenticatedPage(
    page,
    timeoutMs
  );
  if (!authenticated) {
    throw new Error(
      "auth-required: 전용 Chrome에서 로그인한 뒤 다시 실행하세요."
    );
  }
  await page.waitForTimeout(3000);
  if (options["open-new-canvas-dialog"]) {
    const candidateNames = ["새 캔버스", "새 캔버스 만들기"];
    let clicked = false;
    for (const name of candidateNames) {
      const candidate = page.getByRole("button", {
        name,
        exact: true
      });
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      throw new Error(
        "new-canvas-entry-unavailable: 새 캔버스 버튼을 찾지 못했습니다."
      );
    }
    await page.waitForTimeout(2000);
    const openedPage = context.pages().at(-1);
    if (openedPage && openedPage !== page) {
      page = openedPage;
      await page
        .waitForLoadState("domcontentloaded", { timeout: 30_000 })
        .catch(() => undefined);
    }
  }
  if (options["open-tool-settings"]) {
    const settings = page.getByText("도구 설정", {
      exact: true
    });
    if (!(await settings.first().isVisible().catch(() => false))) {
      throw new Error(
        "tool-settings-entry-unavailable: 도구 설정을 찾지 못했습니다."
      );
    }
    await settings.first().click();
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(3000);
  const candidates = await captureVisibleStructure(page);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  const pageUrl = new URL(page.url());
  const capture = {
    captureVersion: "1.0.0",
    capturedAt: new Date().toISOString(),
    origin,
    path: pageUrl.pathname,
    title: await page.title(),
    viewport: page.viewportSize(),
    candidates,
    observedResponses: observedResponses
      .sort((left, right) =>
        `${left.method}:${left.path}:${left.status}`.localeCompare(
          `${right.method}:${right.path}:${right.status}`
        )
      )
      .slice(0, 5000),
    blockedRequests,
    consoleErrors,
    pageErrors
  };
  writeFileSync(outputPath, stableJson(capture), {
    encoding: "utf8",
    mode: 0o600
  });
  process.stdout.write(
    `PASS captured ${capture.path} ${candidates.length} candidates ` +
      `${observedResponses.length} responses ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
