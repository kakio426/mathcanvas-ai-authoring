#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listRegisteredBlueprints
} from "../packages/templates/dist/index.js";

const require = createRequire(
  new URL("../packages/managed-browser/package.json", import.meta.url)
);
const { chromium } = require("playwright-core");
const root = new URL("../", import.meta.url);
const raw = JSON.parse(
  readFileSync(
    new URL(
      ".mathcanvas-contract-lab/raw/p3-release-canary.raw.json",
      root
    ),
    "utf8"
  )
);
const outputDirectory = new URL(
  ".mathcanvas-contract-lab/previews/p3/",
  root
);
mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
const context = await chromium.launchPersistentContext(
  join(
    process.env.HOME,
    ".mathcanvas-ai-authoring",
    "chrome-profile"
  ),
  {
    channel: "chrome",
    headless: true,
    viewport: { width: 1630, height: 1122 }
  }
);
await context.route("**/*", async (route) => {
  const method = route.request().method();
  return ["GET", "HEAD", "OPTIONS"].includes(method)
    ? route.continue()
    : route.abort();
});

const previews = [];
const blueprints = listRegisteredBlueprints();
let geometryFailed = false;
try {
  for (const result of raw.results) {
    if (result.status !== "pass" || !result.creation?.editorUrl) continue;
    const page = await context.newPage();
    await page.goto(result.creation.editorUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });
    await page.waitForFunction(
      () => document.querySelectorAll("[id]").length > 20,
      undefined,
      { timeout: 30_000 }
    );
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      for (const element of document.querySelectorAll("*")) {
        if (element.scrollTop > 0) element.scrollTop = 0;
        if (element.scrollLeft > 0) element.scrollLeft = 0;
      }
    });
    await page.waitForTimeout(1500);
    const blueprint = blueprints.find(
      (candidate) => candidate.id === result.blueprintId
    );
    if (!blueprint) {
      throw new Error(
        `release-preview-blueprint-missing:${result.blueprintId}`
      );
    }
    const poolContracts = blueprint.valuePredicates
      .filter(
        (predicate) =>
          predicate.kind === "visual.labeled-pool-row"
      )
      .map((predicate) => ({
        labelRole: predicate.parameters.labelRole,
        memberRoles: predicate.parameters.memberRoles
      }));
    const geometryChecks = await page.evaluate((contracts) => {
      const rect = (element) => {
        const bounds = element.getBoundingClientRect();
        return {
          x: bounds.x,
          y: bounds.y,
          right: bounds.right,
          bottom: bounds.bottom
        };
      };
      const overlaps = (left, right) =>
        Math.max(left.x, right.x) <
          Math.min(left.right, right.right) &&
        Math.max(left.y, right.y) <
          Math.min(left.bottom, right.bottom);
      const elements = Array.from(document.querySelectorAll("[id]"));
      return contracts.flatMap((contract) => {
        const suffix = `-${contract.labelRole}`;
        const labels = elements.filter((element) =>
          element.id.endsWith(suffix)
        );
        if (labels.length === 0) {
          return [{
            labelRole: contract.labelRole,
            itemPrefix: "",
            passed: false,
            missingRoles: [contract.labelRole],
            overlappingRoles: []
          }];
        }
        return labels.map((label) => {
          const itemPrefix = label.id.slice(0, -suffix.length);
          const labelRect = rect(label);
          const members = contract.memberRoles.map((role) => ({
            role,
            element: document.getElementById(
              `${itemPrefix}-${role}`
            )
          }));
          return {
            labelRole: contract.labelRole,
            itemPrefix,
            passed: members.every(
              ({ element }) =>
                element && !overlaps(labelRect, rect(element))
            ),
            missingRoles: members
              .filter(({ element }) => !element)
              .map(({ role }) => role),
            overlappingRoles: members
              .filter(
                ({ element }) =>
                  element && overlaps(labelRect, rect(element))
              )
              .map(({ role }) => role)
          };
        });
      });
    }, poolContracts);
    if (geometryChecks.some((check) => !check.passed)) {
      geometryFailed = true;
    }
    const fileName = `${result.blueprintId}.png`;
    const previewPath = fileURLToPath(
      new URL(fileName, outputDirectory)
    );
    await page.screenshot({
      path: previewPath,
      fullPage: false
    });
    previews.push({
      blueprintId: result.blueprintId,
      editorUrl: result.creation.editorUrl,
      previewPath,
      geometryChecks
    });
    await page.close();
  }
} finally {
  await context.close();
}
writeFileSync(
  new URL("index.json", outputDirectory),
  `${JSON.stringify({ observedAt: raw.observedAt, previews }, null, 2)}\n`,
  { encoding: "utf8", mode: 0o600 }
);
process.stdout.write(`PASS release previews ${previews.length}/3\n`);
if (geometryFailed) {
  throw new Error("release-preview-labeled-pool-overlap");
}
