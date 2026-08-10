#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  mathCanvasPayloadSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";
import { normalizeMathCanvasSerializedNumbers } from "./lib/division-product-static-projection.mjs";
import {
  findPeerClearanceViolations,
  findPeerOverlapPairs,
  resolveMovableRootBounds
} from "./lib/peer-overlap.mjs";
import { repositoryRoot, resolveStateDirectory } from "./lib/paths.mjs";

const manifestPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-created-projects.json"
);
const artifactPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json"
);
const offlineArtifactPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-offline-design.json"
);
const outputDirectory = join(
  repositoryRoot,
  "research/mathcanvas/evidence/eduitit-html30-v2"
);
const auditPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-reopen-audit.json"
);
const fixedSafeCss = Object.freeze({ x: 240, y: 64, width: 976, height: 672 });
const expectedScreenCtm = Object.freeze({
  a: 5 / 6,
  b: 0,
  c: 0,
  d: 5 / 6,
  e: 112,
  f: 28
});
const capturePolicyVersion = "html30-v2-live-geometry-role-v3";
const peerOverlapToleranceCssPx = 1.5;
const peerMinimumClearanceCssPx = 16;

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requestedSequences() {
  const optionIndex = process.argv.indexOf("--sequences");
  if (optionIndex < 0) return Array.from({ length: 30 }, (_, index) => index + 1);
  const parsed = (process.argv[optionIndex + 1] ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  if (
    parsed.length === 0 ||
    new Set(parsed).size !== parsed.length ||
    parsed.some(
      (sequence) => !Number.isInteger(sequence) || sequence < 1 || sequence > 30
    )
  ) {
    throw new Error("html30-v2-capture:sequences-invalid");
  }
  return parsed.sort((left, right) => left - right);
}

function persistedPayload(project) {
  return mathCanvasPayloadSchema.parse({
    projectTitle: project.projectTitle,
    categoryId: project.category?.categoryId,
    contentsJson: project.contentsJson,
    canvasOption: project.canvasOption,
    isShowMenuOnActivity: project.isShowMenuOnActivity,
    isNoteworthy: project.isNoteworthy ?? false,
    tags: project.tags,
    studyLevel: project.studyLevel
  });
}

const manifest = readJson(manifestPath);
const artifact = readJson(artifactPath);
const offlineArtifact = readJson(offlineArtifactPath);
if (
  manifest.completed !== true ||
  manifest.projects?.length !== 30 ||
  artifact.candidates?.length !== 30 ||
  manifest.sourceArtifactContentSha256 !== artifact.contentSha256 ||
  offlineArtifact.layouts?.length !== 30 ||
  artifact.sourceBindings?.offlineDesign?.contentSha256 !==
    offlineArtifact.contentSha256
) {
  throw new Error("html30-v2-capture:exact-completed-source-required");
}
mkdirSync(outputDirectory, { recursive: true });
const candidateBySequence = new Map(
  artifact.candidates.map((candidate) => [candidate.sequence, candidate])
);
const layoutByActivity = new Map(
  offlineArtifact.layouts.map((layout) => [layout.activityId, layout])
);
const activityById = new Map(
  offlineArtifact.activities.map((activity) => [activity.activityId, activity])
);
const captureSequences = requestedSequences();
const captureSequenceSet = new Set(captureSequences);
const previousAudit =
  captureSequences.length < 30 && existsSync(auditPath)
    ? readJson(auditPath)
    : null;

function isBasicPass(entry) {
  return (
    entry.reopened === true &&
    entry.responseStatus === 200 &&
    entry.persistedPayloadEquivalent === true &&
    entry.canvasRootVisible === true &&
    entry.fixedChrome?.every((item) => item.visible) === true &&
    entry.screenCtmMatched === true &&
    Number(entry.taskElementCount) > 0 &&
    entry.taskEnvelope !== null &&
    entry.outOfSafeTaskIds?.length === 0 &&
    entry.chromeOverlapTaskIds?.length === 0 &&
    entry.missingMovableRootIds?.length === 0 &&
    entry.peerOverlapToleranceCssPx === peerOverlapToleranceCssPx &&
    entry.peerOverlapPairs?.length === 0 &&
    entry.peerMinimumClearanceCssPx === peerMinimumClearanceCssPx &&
    entry.peerClearanceViolations?.length === 0 &&
    entry.nativeOutOfContentIds?.length === 0 &&
    entry.answerOutOfBandIds?.length === 0 &&
    entry.viewport?.width === 1280 &&
    entry.viewport?.height === 800 &&
    entry.bodyScroll?.width === 1280 &&
    entry.bodyScroll?.height === 800
  );
}

function reusableObservation(entry) {
  const candidate = candidateBySequence.get(entry.sequence);
  const project = manifest.projects.find((item) => item.sequence === entry.sequence);
  const screenshotPath = entry.screenshotPath?.startsWith("/")
    ? entry.screenshotPath
    : join(repositoryRoot, entry.screenshotPath ?? "");
  const priorPolicy = previousAudit?.capturePolicyVersion ?? capturePolicyVersion;
  if (
    priorPolicy !== capturePolicyVersion ||
    !candidate ||
    !project ||
    entry.projectId !== project.projectId ||
    entry.url !== project.url ||
    entry.expectedPayloadHash !== candidate.payloadHash ||
    (entry.sourceLayoutContentSha256 !== undefined &&
      entry.sourceLayoutContentSha256 !== candidate.sourceLayoutContentSha256) ||
    !existsSync(screenshotPath) ||
    sha256File(screenshotPath) !== entry.screenshotSha256 ||
    !isBasicPass(entry)
  ) {
    throw new Error(`html30-v2-capture:stale-reuse:${entry.sequence}`);
  }
  return {
    ...entry,
    capturePolicyVersion,
    screenshotPath: relative(repositoryRoot, screenshotPath),
    sourceLayoutContentSha256: candidate.sourceLayoutContentSha256
  };
}

const session = await createLiveAuthHeadlessSession(resolveStateDirectory());
let context;
const observations = (previousAudit?.observations ?? [])
  .filter((entry) => !captureSequenceSet.has(entry.sequence))
  .map(reusableObservation);
try {
  context = await session.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  const blockedNonGet = [];
  await context.route("**/*", async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      await route.continue();
      return;
    }
    blockedNonGet.push({ method, url: route.request().url() });
    await route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  for (const project of [...manifest.projects]
    .filter((entry) => captureSequenceSet.has(entry.sequence))
    .sort((left, right) => left.sequence - right.sequence)) {
    const candidate = candidateBySequence.get(project.sequence);
    const layout = candidate ? layoutByActivity.get(candidate.activityId) : null;
    const activity = candidate ? activityById.get(candidate.activityId) : null;
    if (
      !candidate ||
      !layout ||
      !activity ||
      candidate.payloadHash !== project.payloadHash ||
      candidate.sourceLayoutContentSha256 !== sha256Hex(layout)
    ) {
      throw new Error(`html30-v2-capture:candidate-manifest-drift:${project.sequence}`);
    }
    const nativeMovableRootSpecs = activity.nativePlan.movableUnits.flatMap((unit) => {
      const representation = unit.representation;
      if (representation.kind === "canonical-native-group") {
        const group = candidate.payload.contentsJson.find(
          (item) =>
            item.id === representation.groupId &&
            item.isGroup === true &&
            Array.isArray(item.ids)
        );
        if (!group || group.ids.length === 0) {
          throw new Error(
            `html30-v2-capture:canonical-group-members-missing:${project.sequence}:${representation.groupId}`
          );
        }
        return [{ id: representation.groupId, memberIds: [...group.ids] }];
      }
      if (representation.kind === "independent-native-set") {
        return Array.from(
          { length: representation.memberCount },
          (_, index) => ({
            id: `${representation.memberIdPrefix}-unit-${String(index + 1).padStart(2, "0")}`,
            memberIds: null
          })
        );
      }
      if (representation.kind === "single-native-object") {
        return [{ id: representation.objectId, memberIds: null }];
      }
      return [];
    });
    const answerMovableRootSpecs = candidate.payload.contentsJson.flatMap((item) =>
      typeof item.id === "string" &&
      new RegExp(`^${activity.activityId}-answer-choice-\\d+-group$`).test(item.id) &&
      item.isGroup === true &&
      Array.isArray(item.ids) &&
      item.ids.length > 0
        ? [{ id: item.id, memberIds: [...item.ids] }]
        : []
    );
    const movableRootSpecs = [
      ...nativeMovableRootSpecs,
      ...answerMovableRootSpecs
    ];
    const screenshotPath = join(
      outputDirectory,
      `${String(project.sequence).padStart(2, "0")}.png`
    );
    const blockedStart = blockedNonGet.length;
    try {
      await page.goto(project.url, {
        waitUntil: "domcontentloaded",
        timeout: 90_000
      });
      await page.waitForSelector("svg#outermost", {
        state: "visible",
        timeout: 60_000
      });
      await page.waitForTimeout(1_200);
      const state = await page.evaluate(async ({
        projectId,
        fixedSafeCss,
        expectedScreenCtm,
        layoutProjection
      }) => {
        const rectValue = (rect) => ({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        });
        const right = (rect) => rect.x + rect.width;
        const bottom = (rect) => rect.y + rect.height;
        const intersects = (left, rightRect) =>
          left.x < right(rightRect) &&
          right(left) > rightRect.x &&
          left.y < bottom(rightRect) &&
          bottom(left) > rightRect.y;
        const inside = (outer, inner, tolerance = 1.5) =>
          inner.x >= outer.x - tolerance &&
          inner.y >= outer.y - tolerance &&
          right(inner) <= right(outer) + tolerance &&
          bottom(inner) <= bottom(outer) + tolerance;
        const union = (rects) => {
          if (rects.length === 0) return null;
          const minX = Math.min(...rects.map((rect) => rect.x));
          const minY = Math.min(...rects.map((rect) => rect.y));
          const maxX = Math.max(...rects.map(right));
          const maxY = Math.max(...rects.map(bottom));
          return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        };
        const token = window.localStorage.getItem("accessToken");
        const response = await fetch(`/api/project/${encodeURIComponent(projectId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          cache: "no-store"
        });
        const projectBody = response.ok ? await response.json() : null;
        const root = document.querySelector("svg#outermost");
        const rootRect = root?.getBoundingClientRect();
        const chrome = [
          "#top-toolbar",
          "#left-toolbar",
          "#right-toolbar",
          "#bottom-common-toolbar"
        ].map((selector) => {
          const element = document.querySelector(selector);
          const rect = element?.getBoundingClientRect();
          return {
            selector,
            visible: !!rect && rect.width > 0 && rect.height > 0,
            bounds: rect ? rectValue(rect) : null
          };
        });
        const taskElements = [
          ...document.querySelectorAll(
            '[id^="eduitit-html30-v2-"], [id^="mc30v2-"]'
          )
        ].flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
            ? [{ id: element.id, bounds: rectValue(rect) }]
            : [];
        });
        const taskEnvelope = union(taskElements.map((entry) => entry.bounds));
        const outOfSafeTaskIds = taskElements
          .filter((entry) => !inside(fixedSafeCss, entry.bounds))
          .map((entry) => entry.id);
        const nativeOutOfContentIds = taskElements
          .filter((entry) => entry.id.startsWith("mc30v2-"))
          .filter(
            (entry) =>
              !layoutProjection.contentRects.some((contentRect) =>
                inside(contentRect, entry.bounds)
              )
          )
          .map((entry) => entry.id);
        const nativeElementBounds = taskElements.filter(
          (entry) =>
            entry.id.startsWith("mc30v2-") ||
            /-answer-choice-\d+-group-(?:card|text)$/.test(entry.id)
        );
        const answerElements = taskElements.filter((entry) =>
          /-answer-(?:label|choice|drop)/.test(entry.id)
        );
        const answerOutOfBandIds = answerElements
          .filter(
            (entry) =>
              !layoutProjection.answerRectCss ||
              !inside(layoutProjection.answerRectCss, entry.bounds)
          )
          .map((entry) => entry.id);
        const visibleChromeBounds = chrome.flatMap((entry) =>
          entry.visible && entry.bounds ? [entry.bounds] : []
        );
        const chromeOverlapTaskIds = taskElements
          .filter((entry) =>
            visibleChromeBounds.some((chromeBounds) =>
              intersects(entry.bounds, chromeBounds)
            )
          )
          .map((entry) => entry.id);
        const matrix = root?.getScreenCTM();
        const screenCtm = matrix
          ? {
              a: matrix.a,
              b: matrix.b,
              c: matrix.c,
              d: matrix.d,
              e: matrix.e,
              f: matrix.f
            }
          : null;
        const screenCtmMatched =
          screenCtm !== null &&
          Object.entries(expectedScreenCtm).every(
            ([key, expected]) => Math.abs(screenCtm[key] - expected) <= 0.01
          );
        return {
          responseStatus: response.status,
          projectBody,
          canvasRootVisible: !!rootRect && rootRect.width > 0 && rootRect.height > 0,
          canvasRootBounds: rootRect
            ? { x: rootRect.x, y: rootRect.y, width: rootRect.width, height: rootRect.height }
            : null,
          fixedChrome: chrome,
          screenCtm,
          screenCtmMatched,
          fixedSafeCss,
          taskEnvelope,
          taskElementCount: taskElements.length,
          outOfSafeTaskIds,
          chromeOverlapTaskIds,
          nativeOutOfContentIds,
          nativeElementBounds,
          answerOutOfBandIds,
          viewport: { width: innerWidth, height: innerHeight },
          bodyScroll: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight
          }
        };
      }, {
        projectId: project.projectId,
        fixedSafeCss,
        expectedScreenCtm,
        layoutProjection: {
          contentRects: layout.placements.map((placement) => placement.contentRectCss),
          answerRectCss: layout.answerRectCss
        }
      });
      const { movableRootBounds, missingMovableRootIds } =
        resolveMovableRootBounds(state.nativeElementBounds, movableRootSpecs);
      const peerOverlapPairs = findPeerOverlapPairs(
        movableRootBounds,
        peerOverlapToleranceCssPx
      );
      const peerClearanceViolations = findPeerClearanceViolations(
        movableRootBounds,
        peerMinimumClearanceCssPx,
        peerOverlapToleranceCssPx
      );
      const reopenedPayload = state.projectBody
        ? persistedPayload(state.projectBody)
        : null;
      const reopenedPayloadHash = reopenedPayload ? sha256Hex(reopenedPayload) : null;
      const expectedNormalizedPayloadHash = sha256Hex(
        normalizeMathCanvasSerializedNumbers(candidate.payload)
      );
      const reopenedNormalizedPayloadHash = reopenedPayload
        ? sha256Hex(normalizeMathCanvasSerializedNumbers(reopenedPayload))
        : null;
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      observations.push({
        capturePolicyVersion,
        sequence: project.sequence,
        projectId: project.projectId,
        url: project.url,
        expectedPayloadHash: candidate.payloadHash,
        sourceLayoutContentSha256: candidate.sourceLayoutContentSha256,
        reopenedPayloadHash,
        persistedPayloadExact: reopenedPayloadHash === candidate.payloadHash,
        normalizationPolicy: "geometry-ieee754-tail-15-significant-digits-v1",
        expectedNormalizedPayloadHash,
        reopenedNormalizedPayloadHash,
        persistedPayloadEquivalent:
          reopenedNormalizedPayloadHash === expectedNormalizedPayloadHash,
        screenshotPath: relative(repositoryRoot, screenshotPath),
        screenshotSha256: sha256File(screenshotPath),
        responseStatus: state.responseStatus,
        canvasRootVisible: state.canvasRootVisible,
        canvasRootBounds: state.canvasRootBounds,
        fixedChrome: state.fixedChrome,
        screenCtm: state.screenCtm,
        screenCtmMatched: state.screenCtmMatched,
        fixedSafeCss: state.fixedSafeCss,
        taskEnvelope: state.taskEnvelope,
        taskElementCount: state.taskElementCount,
        movableRootBounds,
        missingMovableRootIds,
        peerOverlapToleranceCssPx,
        peerOverlapPairs,
        peerMinimumClearanceCssPx,
        peerClearanceViolations,
        outOfSafeTaskIds: state.outOfSafeTaskIds,
        chromeOverlapTaskIds: state.chromeOverlapTaskIds,
        nativeOutOfContentIds: state.nativeOutOfContentIds,
        nativeElementBounds: state.nativeElementBounds,
        answerOutOfBandIds: state.answerOutOfBandIds,
        viewport: state.viewport,
        bodyScroll: state.bodyScroll,
        blockedNonGetCount: blockedNonGet.length - blockedStart,
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
  await session.close().catch(() => undefined);
}

const basicPassCount = observations.filter(isBasicPass).length;
const audit = {
  schemaVersion: "1.0.0",
  auditId: "eduitit-html30-v2-single-reopen-batch",
  capturePolicyVersion,
  auditedAt: new Date().toISOString(),
  sourceArtifactContentSha256: artifact.contentSha256,
  requestedCount: 30,
  capturedSequences: captureSequences,
  reopenedCount: observations.filter((entry) => entry.reopened).length,
  basicPassCount,
  viewport: { width: 1280, height: 800 },
  peerOverlapToleranceCssPx,
  peerMinimumClearanceCssPx,
  observations: observations.sort((left, right) => left.sequence - right.sequence)
};
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
process.stdout.write(
  `DONE reopened=${audit.reopenedCount}/30 basic=${basicPassCount}/30\n`
);
