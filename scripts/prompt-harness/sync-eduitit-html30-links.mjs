#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertLegacyHtml30WriterDisabled } from "../hooks/mathcanvas-harness-guard.mjs";

assertLegacyHtml30WriterDisabled("sync-eduitit-html30-links");

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const mathcanvasRoot = resolve(scriptDirectory, "..", "..");
const eduititRootArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--eduitit-root="));
const eduititRoot = eduititRootArgument
  ? resolve(eduititRootArgument.slice("--eduitit-root=".length))
  : resolve(mathcanvasRoot, "..", "..", "eduitit");
const harnessPath = join(
  mathcanvasRoot,
  "research/mathcanvas/eduitit-html30-prompt-harness.json"
);
const projectsPath = join(
  mathcanvasRoot,
  "research/mathcanvas/eduitit-html30-created-projects.json"
);
const bundleRoot = join(
  eduititRoot,
  "edu_materials/static/edu_materials/lesson_bundles"
);
const editorUrlPattern = /^https:\/\/mathcanvas\.vivasam\.com\/ko\/view\/([A-Za-z0-9_-]+)$/;
const anchorPattern = /<a\b[^>]*href="https:\/\/mathcanvas\.vivasam\.com\/ko\/view\/[^"]+"[^>]*>MathCanvas에서 열기<\/a>/g;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(code, detail = "") {
  throw new Error(`eduitit-html30-link-sync:${code}${detail ? `:${detail}` : ""}`);
}

const harness = readJson(harnessPath);
const projects = readJson(projectsPath);
if (
  harness.entries?.length !== 30 ||
  projects.projects?.length !== 30 ||
  projects.completedCount !== 30 ||
  projects.completed !== true
) {
  fail("exact-completed-count-required");
}

const harnessBySequence = new Map(
  harness.entries.map((entry) => [entry.sequence, entry])
);
const pendingWrites = [];

for (const project of [...projects.projects].sort(
  (left, right) => left.sequence - right.sequence
)) {
  const source = harnessBySequence.get(project.sequence);
  if (!source || source.lessonId !== project.lessonId) {
    fail("source-project-mismatch", String(project.sequence));
  }
  const urlMatch = project.url?.match(editorUrlPattern);
  if (!urlMatch || urlMatch[1] !== project.projectId) {
    fail("project-url-invalid", String(project.sequence));
  }

  const packageDirectory = join(bundleRoot, project.lessonId);
  const manifestPath = join(packageDirectory, "manifest.json");
  const htmlPath = join(packageDirectory, "source.html");
  if (!existsSync(manifestPath) || !existsSync(htmlPath)) {
    fail("package-file-missing", project.lessonId);
  }

  const manifest = readJson(manifestPath);
  if (
    manifest.schemaVersion !== 5 ||
    manifest.lessonId !== project.lessonId ||
    manifest.sequence !== project.sequence
  ) {
    fail("package-identity-mismatch", project.lessonId);
  }
  manifest.mathCanvasEditorUrl = project.url;

  const html = readFileSync(htmlPath, "utf8");
  const guideMatches = [
    ...html.matchAll(
      /<section class="section" data-section="guide">[\s\S]*?<\/section>/g
    )
  ];
  if (guideMatches.length !== 1) {
    fail("guide-section-exact-one-required", project.lessonId);
  }
  const guide = guideMatches[0][0];
  const existingAnchors = [...guide.matchAll(anchorPattern)];
  if (existingAnchors.length > 1) {
    fail("mathcanvas-anchor-duplicate", project.lessonId);
  }
  const anchor = `<a class="download secondary" href="${project.url}" target="_blank" rel="noopener noreferrer">MathCanvas에서 열기</a>`;
  const nextGuide = existingAnchors.length === 1
    ? guide.replace(anchorPattern, anchor)
    : guide.replace(/<\/section>$/, `${anchor}</section>`);
  const nextHtml = html.replace(guide, nextGuide);
  const finalAnchors = [...nextGuide.matchAll(anchorPattern)];
  if (
    finalAnchors.length !== 1 ||
    !nextGuide.includes(`href="${project.url}"`)
  ) {
    fail("mathcanvas-anchor-postcondition", project.lessonId);
  }

  pendingWrites.push({
    sequence: project.sequence,
    lessonId: project.lessonId,
    url: project.url,
    manifestPath,
    manifestText: `${JSON.stringify(manifest, null, 2)}\n`,
    htmlPath,
    htmlText: nextHtml
  });
}

for (const write of pendingWrites) {
  writeFileSync(write.manifestPath, write.manifestText, "utf8");
  writeFileSync(write.htmlPath, write.htmlText, "utf8");
  process.stdout.write(
    `LINKED ${write.sequence}/30 ${write.lessonId} ${write.url}\n`
  );
}

process.stdout.write(`DONE linked=${pendingWrites.length}/30\n`);
