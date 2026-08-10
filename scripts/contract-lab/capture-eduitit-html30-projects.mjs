#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";

const manifestPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-created-projects.json"
);
const outputDirectory = join(
  repositoryRoot,
  ".mathcanvas-contract-lab/previews/eduitit-html30"
);
const auditPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-reopen-audit.json"
);

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.projects?.length !== 30) {
  throw new Error("html30-capture-exact-project-count-required");
}
mkdirSync(outputDirectory, { recursive: true });

const session = await createLiveAuthHeadlessSession(resolveStateDirectory());
let context;
const observations = [];
try {
  context = await session.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  for (const project of manifest.projects) {
    const screenshotPath = join(
      outputDirectory,
      `${String(project.sequence).padStart(2, "0")}.png`
    );
    try {
      await page.goto(project.url, {
        waitUntil: "domcontentloaded",
        timeout: 90_000
      });
      await page.waitForSelector("svg#outermost", {
        state: "visible",
        timeout: 60_000
      });
      await page.waitForTimeout(1_500);
      const state = await page.evaluate(async (projectId) => {
        const token = window.localStorage.getItem("accessToken");
        const response = await fetch(`/api/project/${encodeURIComponent(projectId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          cache: "no-store"
        });
        const projectBody = response.ok ? await response.json() : null;
        const root = document.querySelector("svg#outermost");
        const rootRect = root?.getBoundingClientRect();
        const fixedSelectors = [
          "#top-toolbar",
          "#left-toolbar",
          "#right-toolbar",
          "#bottom-common-toolbar"
        ];
        return {
          responseStatus: response.status,
          projectTitle: projectBody?.projectTitle ?? null,
          persistedContentCount: projectBody?.contentsJson?.length ?? null,
          renderedProjectObjectCount: document.querySelectorAll('[id^="mc30-"]').length,
          canvasRootVisible:
            !!rootRect && rootRect.width > 0 && rootRect.height > 0,
          canvasRootBounds: rootRect
            ? {
                x: rootRect.x,
                y: rootRect.y,
                width: rootRect.width,
                height: rootRect.height
              }
            : null,
          fixedChromeVisible: fixedSelectors.every((selector) => {
            const element = document.querySelector(selector);
            const rect = element?.getBoundingClientRect();
            return !!rect && rect.width > 0 && rect.height > 0;
          }),
          viewport: { width: innerWidth, height: innerHeight },
          bodyScroll: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight
          }
        };
      }, project.projectId);
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      observations.push({
        sequence: project.sequence,
        projectId: project.projectId,
        url: project.url,
        screenshotPath: screenshotPath.replace(`${repositoryRoot}/`, ""),
        screenshotSha256: sha256File(screenshotPath),
        ...state,
        reopened: true
      });
      process.stdout.write(`REOPENED ${project.sequence}/30\n`);
    } catch (error) {
      observations.push({
        sequence: project.sequence,
        projectId: project.projectId,
        url: project.url,
        reopened: false,
        error: error instanceof Error ? error.message : String(error)
      });
      process.stdout.write(`FAILED ${project.sequence}/30\n`);
    }
  }
} finally {
  await context?.close().catch(() => undefined);
}

const passing = observations.filter(
  (entry) =>
    entry.reopened === true &&
    entry.responseStatus === 200 &&
    entry.canvasRootVisible === true &&
    entry.fixedChromeVisible === true &&
    entry.viewport?.width === 1280 &&
    entry.viewport?.height === 800 &&
    entry.bodyScroll?.width === 1280 &&
    entry.bodyScroll?.height === 800 &&
    Number(entry.persistedContentCount) > 0 &&
    Number(entry.renderedProjectObjectCount) > 0
).length;

const audit = {
  schemaVersion: "1.0.0",
  auditId: "eduitit-html30-single-reopen-batch-v1",
  auditedAt: new Date().toISOString(),
  requestedCount: 30,
  reopenedCount: observations.filter((entry) => entry.reopened).length,
  basicLoadPassCount: passing,
  viewport: { width: 1280, height: 800 },
  observations
};
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
process.stdout.write(`DONE reopened=${audit.reopenedCount}/30 basic=${passing}/30\n`);
