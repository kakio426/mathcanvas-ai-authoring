#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validatePortfolioStaticAttestation } from "./learning-design-policy.mjs";

const root = resolve(import.meta.dirname, "../..");
const staticPath = resolve(root, "reports/portfolio-scale/latest.json");
const livePath = resolve(
  root,
  ".mathcanvas-contract-lab/portfolio-scale-live-demo/latest.json"
);

const [staticReport, liveReport] = await Promise.all([
  readFile(staticPath, "utf8").then(JSON.parse),
  readFile(livePath, "utf8")
    .then(JSON.parse)
    .catch(() => {
      throw new Error(
        "portfolio-live-attestation-missing:" +
          "run-pnpm-portfolio-live-sync-with-current-static-sha"
      );
    })
]);
const staticAttestation = validatePortfolioStaticAttestation(staticReport);
const projects = Array.isArray(liveReport.projects) ? liveReport.projects : [];
const failures = [];
const requireCheck = (condition, code) => {
  if (!condition) failures.push(code);
};

requireCheck(liveReport.runMode === "all-97", "run-mode-not-all-97");
requireCheck(
  liveReport.staticReportId === staticAttestation.reportId,
  "static-report-id-mismatch"
);
requireCheck(
  liveReport.staticAttestationSha256 === staticAttestation.contentSha256,
  "static-attestation-sha-mismatch"
);
requireCheck(projects.length === 97, "project-count-not-97");
requireCheck(
  new Set(projects.map((project) => project.workItemId)).size === 97,
  "work-item-count-not-97"
);
requireCheck(
  new Set(projects.map((project) => project.standardCode)).size === 97,
  "standard-count-not-97"
);
requireCheck(
  new Set(projects.map((project) => project.projectId)).size === 97,
  "project-id-count-not-97"
);
requireCheck(
  projects.every((project) => project.exactRoundTrip === true),
  "exact-reopen-not-97"
);
requireCheck(
  projects.every((project) => project.usability?.passed === true),
  "usability-not-97"
);
requireCheck(
  projects.every(
    (project) =>
      typeof project.screenshotPath === "string" &&
      existsSync(project.screenshotPath)
  ),
  "screenshot-evidence-not-97"
);
requireCheck(
  projects.some((project) => project.interaction?.exactSavedReopen === true),
  "saved-interaction-reopen-missing"
);
requireCheck(
  liveReport.summary?.expectedProjectCount === 97 &&
    liveReport.summary?.createdOrReusedProjectCount === 97 &&
    liveReport.summary?.exactReopenCount === 97 &&
    liveReport.summary?.usabilityPassCount === 97 &&
    liveReport.summary?.exactSavedReopenCount >= 1,
  "summary-not-complete"
);

if (failures.length > 0) {
  throw new Error(`portfolio-live-attestation-invalid:${failures.join(",")}`);
}

console.log(
  `portfolio live attestation PASS: 97/97 exact reopen, 97/97 usable, ` +
    `static=${staticAttestation.contentSha256}`
);
