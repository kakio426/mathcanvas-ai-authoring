#!/usr/bin/env node
import {
  existsSync,
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
  defaultResearchRoot,
  defaultSanitizedRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";
import {
  compareRoundTripValues,
  exactRoundTripHash,
  validateCanaryGoldenBinding
} from "./lib/round-trip-evidence.mjs";
import {
  WAVE3_PEN_CANARY_CONTENT_COUNT,
  WAVE3_PEN_CANARY_TITLE_PREFIX,
  buildWave3PenCanaryPayload
} from "./lib/common-draw-contract.mjs";
import {
  WAVE1_CANARY_REDACTED_PROJECT_PATH,
  assertSavedPenElementsDelta,
  comparableFromProjectPayload
} from "./lib/canary-evidence.mjs";

const ORIGIN = "https://mathcanvas.vivasam.com";
const TITLE_PREFIX = WAVE3_PEN_CANARY_TITLE_PREFIX;
const EXPECTED_CONTENT_COUNT = WAVE3_PEN_CANARY_CONTENT_COUNT;
const EXPECTED_AUTHORED_PEN_COUNT = 2;
const EXPECTED_FINAL_PEN_COUNT = 2;
const ARTIFACT_ID = "wave3-pen-canary-artifacts-v1";
const PROBE_ID = "wave3-pen-canary-v1";
const CREATE_CHECKPOINT_ID =
  "wave3-pen-canary-create-checkpoint-v1";
const SAVE_CHECKPOINT_ID =
  "wave3-pen-canary-save-checkpoint-v1";
const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const goldenFixturePath = join(
  repositoryRoot,
  "fixtures",
  "golden",
  "fraction-comparison.p0-v1.json"
);

function canaryRunId(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function canonicalEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === undefined || right === undefined) return false;
  return exactRoundTripHash(left) === exactRoundTripHash(right);
}

function routePath(url) {
  const parsed = new URL(url);
  return parsed.origin === ORIGIN
    ? parsed.pathname
    : `${parsed.origin}${parsed.pathname}`;
}

function redactProjectPath(path, projectId) {
  return typeof projectId === "string" && path.includes(projectId)
    ? path.replaceAll(projectId, "<redacted-project>")
    : path;
}

function persistJson(path, value, { sensitive = false } = {}) {
  if (!sensitive) assertNoSensitiveData(value);
  mkdirSync(dirname(path), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(path, stableJson(value), {
    encoding: "utf8",
    mode: 0o600
  });
}

function buildWave3Payload(goldenPayload, runId) {
  return buildWave3PenCanaryPayload(goldenPayload, runId);
}

function validateWave3Payload({
  goldenPayload,
  expectedGoldenPayloadHash,
  submittedPayload,
  runId
}) {
  const base = buildWave3PenCanaryPayload(
    goldenPayload,
    runId
  );
  const baseWithoutPen = {
    ...base,
    canvasOption: {
      ...base.canvasOption,
      penElements: []
    }
  };
  validateCanaryGoldenBinding({
    goldenPayload,
    expectedGoldenPayloadHash,
    submittedPayload: baseWithoutPen,
    runId,
    titlePrefix: TITLE_PREFIX
  });
  const expected = buildWave3Payload(goldenPayload, runId);
  if (!canonicalEqual(expected, submittedPayload)) {
    throw new Error("wave3-payload-not-exact-approved-overlay");
  }
  return {
    submittedPayloadHash: exactRoundTripHash(submittedPayload),
    authoredPenStrokeIds: expected.canvasOption.penElements.map(
      (element) => element.id
    )
  };
}

function comparableWithoutPenLifecycle(comparable) {
  const canvasOption = { ...comparable.canvasOption };
  delete canvasOption.penElements;
  delete canvasOption.canvasCenterCoordinate;
  delete canvasOption.isCaptured;
  delete canvasOption.viewBox;
  return {
    ...comparable,
    canvasOption
  };
}

function summarizePenElement(element) {
  const d = typeof element?.d === "string" ? element.d : "";
  const numericTokens =
    d.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  return {
    strokeId: element?.id,
    fieldNames:
      element && typeof element === "object"
        ? Object.keys(element).sort()
        : [],
    fieldTypes:
      element && typeof element === "object"
        ? Object.fromEntries(
            Object.entries(element)
              .sort(([left], [right]) =>
                left.localeCompare(right)
              )
              .map(([field, value]) => [
                field,
                value === null
                  ? "null"
                  : Array.isArray(value)
                    ? "array"
                    : typeof value
              ])
          )
        : {},
    numericTokenCount: numericTokens.length,
    pointCount: Math.floor(numericTokens.length / 2),
    pathLength: d.length,
    ...(d.length > 0
      ? { pathSha256: exactRoundTripHash(d) }
      : {})
  };
}

function observeInitialPenContract(
  submittedComparable,
  reopenedComparable,
  expectedIds
) {
  const baselineComparison = compareRoundTripValues(
    comparableWithoutPenLifecycle(submittedComparable),
    comparableWithoutPenLifecycle(reopenedComparable)
  );
  const submitted = submittedComparable?.canvasOption?.penElements;
  const reopened = reopenedComparable?.canvasOption?.penElements;
  const submittedElements = Array.isArray(submitted)
    ? submitted
    : [];
  const reopenedElements = Array.isArray(reopened) ? reopened : [];
  const reopenedById = new Map(
    reopenedElements.map((element) => [element?.id, element])
  );
  const invalidShapeIds = expectedIds.filter((id) => {
    const element = reopenedById.get(id);
    return (
      typeof element?.d !== "string" ||
      element.d.length === 0 ||
      typeof element?.stroke !== "string" ||
      element.stroke.length === 0 ||
      !["string", "number"].includes(typeof element?.strokeWidth)
    );
  });
  const failureReason =
    baselineComparison.normalizedEqual !== true ||
    baselineComparison.unexpectedDifferenceCount !== 0
      ? "non-pen-roundtrip-mismatch"
      : submittedElements.length !==
            EXPECTED_AUTHORED_PEN_COUNT ||
          reopenedElements.length !==
            EXPECTED_AUTHORED_PEN_COUNT
        ? "authored-pen-count-not-preserved"
        : reopenedById.size !== expectedIds.length ||
            expectedIds.some((id) => !reopenedById.has(id))
          ? "authored-pen-id-set-not-preserved"
          : invalidShapeIds.length > 0
            ? "authored-pen-shape-not-preserved"
            : undefined;
  return {
    authoredCreatePersistence: failureReason === undefined,
    ...(failureReason ? { failureReason } : {}),
    baselineComparison,
    exactPenRoundTrip: canonicalEqual(
      submittedElements,
      reopenedElements
    ),
    submitted: submittedElements.map(summarizePenElement),
    reopened: reopenedElements.map(summarizePenElement),
    normalizationByStrokeId: expectedIds.map((id) => {
      const before = submittedElements.find(
        (element) => element.id === id
      );
      const after = reopenedById.get(id);
      if (!before || !after) {
        return {
          strokeId: id,
          exact: false,
          changedFields: ["<missing>"]
        };
      }
      return {
        strokeId: id,
        exact: canonicalEqual(before, after),
        changedFields: [
          ...new Set([
            ...Object.keys(before),
            ...Object.keys(after)
          ])
        ]
          .filter(
            (field) =>
              !canonicalEqual(before[field], after[field])
          )
          .sort()
      };
    })
  };
}

function readRecoveryState(path) {
  if (!existsSync(path)) {
    throw new Error("wave3-canary-recovery-state-unavailable");
  }
  const state = JSON.parse(readFileSync(path, "utf8"));
  if (
    state?.schemaVersion !== "1.0.0" ||
    !/^\d{8}T\d{6}Z$/.test(state?.runId ?? "") ||
    typeof state?.projectId !== "string" ||
    !/^[A-Za-z0-9_-]{1,160}$/.test(state.projectId) ||
    !/^[a-f0-9]{64}$/.test(state?.submittedPayloadHash ?? "") ||
    (state?.initialComparableHash !== undefined &&
      !/^[a-f0-9]{64}$/.test(state.initialComparableHash)) ||
    !["not-attempted", "attempted", "saved"].includes(
      state?.saveState
    )
  ) {
    throw new Error("wave3-canary-recovery-state-invalid");
  }
  return state;
}

function writeCheckpoint(path, checkpoint) {
  persistJson(path, checkpoint);
}

function readCheckpoint(path, checkpointId, runId) {
  if (!existsSync(path)) {
    throw new Error(`wave3-checkpoint-unavailable:${checkpointId}`);
  }
  const checkpoint = JSON.parse(readFileSync(path, "utf8"));
  if (
    checkpoint?.schemaVersion !== "1.0.0" ||
    checkpoint?.checkpointId !== checkpointId ||
    checkpoint?.runId !== runId
  ) {
    throw new Error(`wave3-checkpoint-invalid:${checkpointId}`);
  }
  return checkpoint;
}

function persistNegativeOutcome({
  outcome,
  failureReason,
  observedAt,
  runId,
  goldenFixture,
  submittedPayload,
  submittedPenSummaries,
  initialComparable,
  initialPenObservation,
  initialRender,
  staticContractFileHash,
  createCheckpoint,
  outputPath,
  artifactsPath,
  privateArtifactsHash,
  creationEvidenceMode,
  allowedWrites,
  projectReads,
  blockedWrites,
  blockedExternalWrites,
  blockedExistingProjectReads,
  blockedCanaryReadLimit
}) {
  const artifacts = {
    schemaVersion: "1.0.0",
    artifactId: ARTIFACT_ID,
    runId,
    outcome,
    provenance: {
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      ...(initialComparable
        ? {
            initialComparableHash:
              exactRoundTripHash(initialComparable)
          }
        : {}),
      ...(privateArtifactsHash
        ? { privateArtifactsHash }
        : {})
    },
    discovery: {
      authoredCreatePersistence: false,
      failureReason,
      submittedPenElementSummaries: submittedPenSummaries,
      ...(initialPenObservation
        ? {
            initialPenElementSummaries:
              initialPenObservation.reopened,
            nonPenInitialReopen:
              initialPenObservation.baselineComparison
          }
        : {}),
      ...(initialRender ? { initialRender } : {})
    },
    network: {
      allowedWrites,
      projectReads,
      blockedWrites,
      blockedExternalWrites,
      blockedExistingProjectReads,
      blockedCanaryReadLimit
    }
  };
  assertNoSensitiveData(artifacts);
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: PROBE_ID,
    observedAt,
    outcome,
    provenance: {
      source: "approved-new-canary-ui-pen",
      runId,
      goldenFixtureId: goldenFixture.fixtureId,
      goldenPayloadHash:
        goldenFixture.invariants.payloadHash,
      staticContractFileHash,
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      createCheckpointHash:
        exactRoundTripHash(createCheckpoint),
      artifactsHash: exactRoundTripHash(artifacts)
    },
    discovery: {
      authoredCreatePersistence: false,
      failureReason,
      submittedPenElementSummaries: submittedPenSummaries,
      initialPenElementSummaries:
        initialPenObservation?.reopened ?? [],
      ...(initialRender
        ? {
            initialRenderedPenStrokeIds:
              initialRender.pathIds,
            coordinateSpaceIdentity:
              initialRender.coordinateSpaceIdentity
          }
        : {})
    },
    writeBoundary: {
      mode: "one-create-no-save-negative-outcome",
      creationEvidenceMode,
      allowedCreateCount: 1,
      allowedSaveCount: 0,
      observedAllowedWriteCount: allowedWrites.length,
      projectReadCount: projectReads.length,
      blockedCanaryReadCount:
        blockedCanaryReadLimit.length,
      blockedWriteCount: blockedWrites.length,
      blockedExternalWriteCount:
        blockedExternalWrites.length,
      existingTeacherProjectReadCount: 0
    }
  };
  assertNoSensitiveData(evidence);
  persistJson(artifactsPath, artifacts);
  persistJson(outputPath, evidence);
}

async function waitForProjectResponse(page, projectId, action) {
  const expectedPath = `/api/project/${encodeURIComponent(
    projectId
  )}`;
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      routePath(response.url()) === expectedPath,
    { timeout: 30_000 }
  );
  await action();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(
      `wave3-project-reopen-failed:${response.status()}`
    );
  }
  return comparableFromProjectPayload(await response.json());
}

async function waitForRenderedProject(page, penCount) {
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForFunction(
    ({ contentCount, expectedPenCount }) =>
      document.querySelectorAll(".item.group").length ===
        contentCount &&
      document.querySelectorAll("#pen-board path").length ===
        expectedPenCount,
    {
      contentCount: EXPECTED_CONTENT_COUNT,
      expectedPenCount: penCount
    },
    { timeout: 30_000 }
  );
  await page.waitForTimeout(600);
}

async function waitForEditorReady(page) {
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForFunction(
    (contentCount) =>
      document.querySelectorAll(".item.group").length ===
        contentCount &&
      document.getElementById("pen-board") !== null,
    EXPECTED_CONTENT_COUNT,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(600);
}

async function rawPenRenderSnapshot(page) {
  return page.evaluate(() => {
    const outermost = document.getElementById("outermost");
    const penBoard = document.getElementById("pen-board");
    if (
      !(outermost instanceof SVGSVGElement) ||
      !(penBoard instanceof SVGSVGElement)
    ) {
      throw new Error("wave3-pen-svg-board-unavailable");
    }
    const paths = [...penBoard.querySelectorAll("path")].map(
      (path) => {
        const bbox = path.getBBox();
        const totalLength = path.getTotalLength();
        return {
          id: path.id,
          d: path.getAttribute("d"),
          stroke: path.getAttribute("stroke"),
          strokeWidth: path.getAttribute("stroke-width"),
          totalLength,
          bbox: {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height
          }
        };
      }
    );
    return {
      itemGroupCount:
        document.querySelectorAll(".item.group").length,
      outermostViewBox: outermost.getAttribute("viewBox"),
      penBoardViewBox: penBoard.getAttribute("viewBox"),
      paths
    };
  });
}

function summarizePenRender(snapshot, { strict = true } = {}) {
  const normalizeViewBox = (value) =>
    String(value ?? "")
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
  const outermostViewBox = normalizeViewBox(
    snapshot.outermostViewBox
  );
  const penBoardViewBox = normalizeViewBox(
    snapshot.penBoardViewBox
  );
  const coordinateSpaceIdentity =
    outermostViewBox.length === 4 &&
    penBoardViewBox.length === 4 &&
    canonicalEqual(outermostViewBox, penBoardViewBox);
  const paths = snapshot.paths.map((path) => {
    const pathLength =
      typeof path.d === "string" ? path.d.length : 0;
    return {
      id: path.id,
      stroke: path.stroke,
      strokeWidth: path.strokeWidth,
      totalLength: path.totalLength,
      bbox: path.bbox,
      pathLength,
      ...(pathLength > 0
        ? { pathSha256: exactRoundTripHash(path.d) }
        : {})
    };
  });
  const valid =
    snapshot.itemGroupCount !== EXPECTED_CONTENT_COUNT ||
    !coordinateSpaceIdentity ||
    paths.some(
      (path) =>
        typeof path.id !== "string" ||
        path.id.length === 0 ||
        path.pathLength <= 0 ||
        typeof path.pathSha256 !== "string" ||
        !Number.isFinite(path.totalLength) ||
        path.totalLength <= 0 ||
        !Object.values(path.bbox).every(
          (value) =>
            typeof value === "number" && Number.isFinite(value)
        ) ||
        (path.bbox.width <= 0 && path.bbox.height <= 0)
    )
      ? false
      : true;
  if (strict && !valid) {
    throw new Error("wave3-pen-render-invariant-invalid");
  }
  return {
    itemGroupCount: snapshot.itemGroupCount,
    pathCount: paths.length,
    pathIds: paths.map((path) => path.id).sort(),
    coordinateSpaceIdentity,
    outermostViewBox,
    penBoardViewBox,
    valid,
    paths
  };
}

async function clickCommonTool(page, tool) {
  const labels = {
    pen: ["펜 (P)", "Pen (P)"],
    eraser: ["지우개 (E)", "Eraser (E)"]
  }[tool];
  const result = await page.evaluate(
    ({ requestedTool, expectedLabels }) => {
      const toolbar = document.getElementById(
        "bottom-common-toolbar"
      );
      if (!toolbar) {
        return { ok: false, error: "common-toolbar-unavailable" };
      }
      const normalize = (value) =>
        String(value ?? "")
          .replace(/\s+/g, " ")
          .trim();
      const candidates = [...toolbar.querySelectorAll("*")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const values = [
            element.textContent,
            element.getAttribute("aria-label"),
            element.getAttribute("title"),
            element.getAttribute("data-tooltip")
          ].map(normalize);
          return {
            element,
            matchedLabel: expectedLabels.find((label) =>
              values.some((value) => value === label)
            ),
            rect,
            area: rect.width * rect.height
          };
        })
        .filter(
          (candidate) =>
            candidate.matchedLabel &&
            candidate.rect.width > 0 &&
            candidate.rect.height > 0
        )
        .sort((left, right) => left.area - right.area);
      const matched = candidates[0];
      if (!matched) {
        return {
          ok: false,
          error: `common-toolbar-control-unavailable:${requestedTool}`
        };
      }
      let clickable = matched.element;
      while (
        clickable.parentElement &&
        clickable.parentElement !== toolbar &&
        !(
          clickable instanceof HTMLButtonElement ||
          clickable.getAttribute("role") === "button" ||
          clickable.classList.contains("cursor-pointer") ||
          getComputedStyle(clickable).cursor === "pointer"
        )
      ) {
        clickable = clickable.parentElement;
      }
      clickable.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        })
      );
      return {
        ok: true,
        requestedTool,
        matchedLabel: matched.matchedLabel,
        tagName: clickable.tagName.toLowerCase()
      };
    },
    { requestedTool: tool, expectedLabels: labels }
  );
  if (result?.ok !== true) {
    throw new Error(
      result?.error ?? `wave3-tool-activation-failed:${tool}`
    );
  }
  await page.waitForTimeout(150);
  return result;
}

async function deriveUiPenGesture(page) {
  const gesture = await page.evaluate(() => {
    const outermost = document.getElementById("outermost");
    if (!(outermost instanceof SVGSVGElement)) return null;
    const box = outermost.getBoundingClientRect();
    const start = {
      x: box.left + box.width * 0.28,
      y: box.top + box.height * 0.68
    };
    const end = {
      x: box.left + box.width * 0.42,
      y: box.top + box.height * 0.73
    };
    return { start, end };
  });
  if (
    !gesture ||
    ![...Object.values(gesture.start), ...Object.values(gesture.end)]
      .every(Number.isFinite)
  ) {
    throw new Error("wave3-ui-pen-gesture-unavailable");
  }
  return gesture;
}

async function drawPenStroke(page, gesture) {
  await page.mouse.move(gesture.start.x, gesture.start.y);
  await page.mouse.down();
  await page.mouse.move(gesture.end.x, gesture.end.y, {
    steps: 16
  });
  await page.mouse.up();
}

async function clientPointOnPenPath(page, strokeId) {
  const point = await page.evaluate((id) => {
    const path = document.getElementById(id);
    if (!(path instanceof SVGPathElement)) return null;
    const length = path.getTotalLength();
    const local = path.getPointAtLength(length / 2);
    const matrix = path.getScreenCTM();
    if (!matrix) return null;
    const client = new DOMPoint(
      local.x,
      local.y
    ).matrixTransform(matrix);
    return { x: client.x, y: client.y };
  }, strokeId);
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    throw new Error("wave3-eraser-target-unavailable");
  }
  return point;
}

async function eraseAt(page, point) {
  await page.mouse.move(point.x - 4, point.y - 2);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.mouse.move(point.x + 4, point.y + 2, {
    steps: 4
  });
  await page.mouse.up();
}

async function clickSave(page) {
  const result = await page.evaluate(() => {
    const toolbar = document.getElementById("top-toolbar");
    if (!toolbar) {
      return { ok: false, error: "top-toolbar-unavailable" };
    }
    const labels = ["저장", "Save"];
    const normalize = (value) =>
      String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const candidates = [...toolbar.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const values = [
          element.textContent,
          element.getAttribute("aria-label"),
          element.getAttribute("title")
        ].map(normalize);
        return {
          element,
          label: labels.find((label) =>
            values.some((value) => value === label)
          ),
          rect,
          area: rect.width * rect.height
        };
      })
      .filter(
        (candidate) =>
          candidate.label &&
          candidate.rect.width > 0 &&
          candidate.rect.height > 0
      )
      .sort((left, right) => left.area - right.area);
    const matched = candidates[0];
    if (!matched) {
      return { ok: false, error: "save-control-unavailable" };
    }
    let clickable = matched.element;
    while (
      clickable.parentElement &&
      clickable.parentElement !== toolbar &&
      !(
        clickable instanceof HTMLButtonElement ||
        clickable.getAttribute("role") === "button" ||
        clickable.classList.contains("cursor-pointer") ||
        getComputedStyle(clickable).cursor === "pointer"
      )
    ) {
      clickable = clickable.parentElement;
    }
    clickable.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    return {
      ok: true,
      matchedLabel: matched.label,
      tagName: clickable.tagName.toLowerCase()
    };
  });
  if (result?.ok !== true) {
    throw new Error(
      result?.error ?? "wave3-save-control-unavailable"
    );
  }
  return result;
}

let context;
let releaseLock;
try {
  const options = parseArguments(process.argv.slice(2), {
    "approve-create-and-save": {
      type: "boolean",
      required: true
    },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.roundtrip.json"
      )
    },
    "artifacts-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.artifacts.json"
      )
    },
    "create-checkpoint-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.create-checkpoint.json"
      )
    },
    "save-checkpoint-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.save-checkpoint.json"
      )
    },
    "private-output": {
      type: "string",
      default: join(
        defaultSanitizedRoot,
        "wave3-pen-canary.private.json"
      )
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    },
    "private-root": {
      type: "string",
      default: defaultSanitizedRoot
    },
    "state-dir": {
      type: "string",
      default: resolveStateDirectory()
    },
    "resume-run-id": { type: "string" },
    headless: { type: "boolean", default: true }
  });
  if (options["approve-create-and-save"] !== true) {
    throw new Error(
      "explicit-wave3-create-and-save-approval-required"
    );
  }

  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "Wave 3 pen canary evidence"
  );
  const artifactsPath = assertPathInside(
    options["artifacts-output"],
    options["research-root"],
    "Wave 3 pen canary artifacts"
  );
  const createCheckpointPath = assertPathInside(
    options["create-checkpoint-output"],
    options["research-root"],
    "Wave 3 create checkpoint"
  );
  const saveCheckpointPath = assertPathInside(
    options["save-checkpoint-output"],
    options["research-root"],
    "Wave 3 save checkpoint"
  );
  const privateOutputPath = assertPathInside(
    options["private-output"],
    options["private-root"],
    "Wave 3 private evidence"
  );
  const stateDirectory = resolveStateDirectory(
    options["state-dir"]
  );
  const recoveryStatePath = join(
    stateDirectory,
    "wave3-canary-recovery.json"
  );
  const orphanMarkerPath = join(
    stateDirectory,
    "wave3-canary-orphan.json"
  );
  if (existsSync(orphanMarkerPath)) {
    throw new Error(
      "wave3-canary-orphan-marker-requires-manual-review"
    );
  }
  const goldenFixture = JSON.parse(
    readFileSync(goldenFixturePath, "utf8")
  );
  const goldenPayload =
    goldenFixture?.results?.compiledProject?.payload;
  const staticContractPath = assertPathInside(
    join(
      options["research-root"],
      "pen-contract.static.json"
    ),
    options["research-root"],
    "Wave 3 pen static contract"
  );
  const staticContractFileHash = exactRoundTripHash(
    JSON.parse(readFileSync(staticContractPath, "utf8"))
  );
  const observedAt = new Date();
  const resumeRunId = options["resume-run-id"];
  const runId =
    typeof resumeRunId === "string"
      ? resumeRunId
      : canaryRunId(observedAt);
  const submittedPayload = buildWave3Payload(
    goldenPayload,
    runId
  );
  const submittedBinding = validateWave3Payload({
    goldenPayload,
    expectedGoldenPayloadHash:
      goldenFixture?.invariants?.payloadHash,
    submittedPayload,
    runId
  });
  const submittedComparable =
    comparableFromProjectPayload(submittedPayload);
  const authoredIds = submittedBinding.authoredPenStrokeIds;

  releaseLock = acquireManagedProfileLock(stateDirectory);
  const allowedWrites = [];
  const blockedWrites = [];
  const blockedExternalWrites = [];
  const blockedExistingProjectReads = [];
  const blockedCanaryReadLimit = [];
  const projectReads = [];
  const writeRequests = new Map();
  let projectId;
  let createArmed = false;
  let saveArmed = false;
  let recoveredCreation;
  let resumeSaveOutcomeUncertain = false;
  let recoveryInitialComparableHash;
  let initialComparable;
  let savedPayload;
  let savedMutation;
  let expectedFinalIds = [];
  let resolvePutResponse;
  let rejectPutResponse;
  const putResponsePromise = new Promise((resolve, reject) => {
    resolvePutResponse = resolve;
    rejectPutResponse = reject;
  });

  context = await chromium.launchPersistentContext(
    join(stateDirectory, "chrome-profile"),
    {
      channel: "chrome",
      headless: options.headless === true,
      viewport: { width: 1600, height: 1000 }
    }
  );

  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const requestUrl = new URL(request.url());
    const path = routePath(request.url());
    if (
      method === "GET" &&
      requestUrl.origin === ORIGIN &&
      (path === "/api/project" ||
        path.startsWith("/api/project/"))
    ) {
      const expectedPath =
        typeof projectId === "string"
          ? `/api/project/${encodeURIComponent(projectId)}`
          : "";
      if (path !== expectedPath) {
        blockedExistingProjectReads.push({
          method,
          path:
            path === "/api/project"
              ? path
              : WAVE1_CANARY_REDACTED_PROJECT_PATH
        });
        await route.abort("blockedbyclient");
        return;
      }
      if (projectReads.length >= 3) {
        blockedCanaryReadLimit.push({
          method,
          path: WAVE1_CANARY_REDACTED_PROJECT_PATH
        });
        await route.abort("blockedbyclient");
        return;
      }
      projectReads.push({
        method,
        path: WAVE1_CANARY_REDACTED_PROJECT_PATH
      });
    }
    if (!writeMethods.has(method)) {
      await route.continue();
      return;
    }
    if (requestUrl.origin !== ORIGIN) {
      blockedExternalWrites.push({ method, path });
      await route.abort("blockedbyclient");
      return;
    }
    try {
      if (
        method === "POST" &&
        path === "/api/project" &&
        createArmed &&
        allowedWrites.length === 0
      ) {
        const requestPayload = request.postDataJSON();
        validateWave3Payload({
          goldenPayload,
          expectedGoldenPayloadHash:
            goldenFixture.invariants.payloadHash,
          submittedPayload: requestPayload,
          runId
        });
        const record = {
          method,
          path,
          payloadHash: exactRoundTripHash(requestPayload),
          status: 0
        };
        allowedWrites.push(record);
        writeRequests.set(request, record);
        await route.continue();
        return;
      }
      const expectedPutPath =
        typeof projectId === "string"
          ? `/api/project/${encodeURIComponent(projectId)}`
          : "";
      if (
        method === "PUT" &&
        path === expectedPutPath &&
        saveArmed &&
        allowedWrites.length ===
          (typeof resumeRunId === "string" ? 0 : 1)
      ) {
        const requestPayload = request.postDataJSON();
        savedMutation = assertSavedPenElementsDelta({
          initialComparable,
          savedPayload: requestPayload,
          expectedPenStrokeIds: expectedFinalIds
        });
        savedPayload = requestPayload;
        persistJson(
          recoveryStatePath,
          {
            schemaVersion: "1.0.0",
            runId,
            projectId,
            submittedPayloadHash:
              exactRoundTripHash(submittedPayload),
            initialComparableHash:
              exactRoundTripHash(initialComparable),
            saveState: "attempted"
          },
          { sensitive: true }
        );
        const record = {
          method,
          path: WAVE1_CANARY_REDACTED_PROJECT_PATH,
          payloadHash: exactRoundTripHash(requestPayload),
          status: 0
        };
        allowedWrites.push(record);
        writeRequests.set(request, record);
        saveArmed = false;
        await route.continue();
        return;
      }
      const uploadPath =
        typeof projectId === "string"
          ? `/api/project/${encodeURIComponent(
              projectId
            )}/upload-image`
          : "";
      if (method === "POST" && path === uploadPath) {
        blockedWrites.push({
          method,
          path:
            `${WAVE1_CANARY_REDACTED_PROJECT_PATH}/upload-image`
        });
        await route.abort("blockedbyclient");
        return;
      }
    } catch (error) {
      blockedWrites.push({
        method,
        path: redactProjectPath(path, projectId),
        reason:
          error instanceof Error ? error.message : String(error)
      });
      rejectPutResponse?.(error);
      await route.abort("blockedbyclient");
      return;
    }
    blockedWrites.push({
      method,
      path: redactProjectPath(path, projectId),
      reason: "write-not-in-wave3-canary-allowlist"
    });
    if (saveArmed) {
      rejectPutResponse?.(
        new Error(`unexpected-write-blocked:${method}:${path}`)
      );
    }
    await route.abort("blockedbyclient");
  });

  context.on("response", (response) => {
    const request = response.request();
    const record = writeRequests.get(request);
    if (!record) return;
    record.status = response.status();
    if (record.method !== "PUT") return;
    if (!response.ok()) {
      rejectPutResponse?.(
        new Error(`wave3-canary-save-failed:${response.status()}`)
      );
      return;
    }
    try {
      persistJson(
        recoveryStatePath,
        {
          schemaVersion: "1.0.0",
          runId,
          projectId,
          submittedPayloadHash:
            exactRoundTripHash(submittedPayload),
          initialComparableHash:
            exactRoundTripHash(initialComparable),
          saveState: "saved"
        },
        { sensitive: true }
      );
      writeCheckpoint(saveCheckpointPath, {
        schemaVersion: "1.0.0",
        checkpointId: SAVE_CHECKPOINT_ID,
        runId,
        observedAt: new Date().toISOString(),
        provenance: {
          submittedPayloadHash:
            exactRoundTripHash(submittedPayload),
          initialComparableHash:
            exactRoundTripHash(initialComparable),
          savedPayloadHash: exactRoundTripHash(savedPayload)
        },
        discovery: {
          penElementSummaries:
            savedMutation.penElementSummaries
        },
        network: { allowedWrites },
        phase: "save-response-captured-before-final-render"
      });
      resolvePutResponse?.(response.status());
    } catch (error) {
      rejectPutResponse?.(error);
    }
  });

  let page = context.pages()[0] ?? (await context.newPage());
  const authResponse = await page.goto(`${ORIGIN}/api/auth/me`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  if (authResponse?.status() !== 200) {
    throw new Error(
      "auth-required-before-wave3-create: 전용 Chrome에 다시 로그인한 뒤 실행하세요."
    );
  }
  if (blockedExistingProjectReads.length !== 0) {
    throw new Error("wave3-pre-create-project-read-attempted");
  }
  if (typeof resumeRunId === "string") {
    const recovery = readRecoveryState(recoveryStatePath);
    if (
      recovery.runId !== runId ||
      recovery.submittedPayloadHash !==
        exactRoundTripHash(submittedPayload) ||
      !["not-attempted", "attempted"].includes(
        recovery.saveState
      )
    ) {
      throw new Error("wave3-canary-resume-not-safe-for-save");
    }
    projectId = recovery.projectId;
    resumeSaveOutcomeUncertain =
      recovery.saveState === "attempted";
    recoveryInitialComparableHash =
      recovery.initialComparableHash;
    recoveredCreation = {
      method: "POST",
      path: "/api/project",
      payloadHash: exactRoundTripHash(submittedPayload),
      recovery: "private-state-exact-canary"
    };
  } else {
    if (existsSync(recoveryStatePath)) {
      throw new Error(
        "wave3-existing-recovery-state-requires-explicit-resume"
      );
    }
    createArmed = true;
    const createResult = await page.evaluate(
      async (payload) => {
        const response = await fetch("/api/project", {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=utf-8"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          return {
            ok: false,
            error: `wave3-canary-create-failed:${response.status}`,
            status: response.status
          };
        }
        const body = await response.json();
        return {
          ok:
            typeof body?.projectId === "string" &&
            /^[A-Za-z0-9_-]{1,160}$/.test(body.projectId),
          projectId: body?.projectId,
          status: response.status
        };
      },
      submittedPayload
    ).catch((error) => ({
      ok: false,
      error: String(error)
    }));
    createArmed = false;
    if (
      allowedWrites.length === 1 &&
      Number.isInteger(createResult?.status)
    ) {
      allowedWrites[0].status = createResult.status;
    }
    if (
      allowedWrites.length !== 1
    ) {
      throw new Error(
        createResult?.error ??
          "wave3-canary-create-response-invalid"
      );
    }
    if (
      createResult?.ok !== true ||
      typeof createResult?.projectId !== "string"
    ) {
      const observedCreateStatus = allowedWrites[0].status;
      if (
        Number.isInteger(observedCreateStatus) &&
        observedCreateStatus >= 200 &&
        observedCreateStatus < 300
      ) {
        persistJson(
          orphanMarkerPath,
          {
            schemaVersion: "1.0.0",
            markerId: "wave3-canary-orphan-v1",
            runId,
            submittedPayloadHash:
              exactRoundTripHash(submittedPayload),
            createStatus: observedCreateStatus,
            reason: "2xx-create-response-project-id-invalid"
          },
          { sensitive: true }
        );
      }
      const createCheckpoint = {
        schemaVersion: "1.0.0",
        checkpointId: CREATE_CHECKPOINT_ID,
        runId,
        observedAt: observedAt.toISOString(),
        provenance: {
          submittedPayloadHash:
            exactRoundTripHash(submittedPayload)
        },
        network: { allowedWrites },
        phase: "create-response-rejected-or-invalid"
      };
      writeCheckpoint(createCheckpointPath, createCheckpoint);
      persistNegativeOutcome({
        outcome: "authored-create-rejected",
        failureReason:
          createResult?.error ??
          "create-response-project-id-invalid",
        observedAt: observedAt.toISOString(),
        runId,
        goldenFixture,
        submittedPayload,
        submittedPenSummaries:
          submittedPayload.canvasOption.penElements.map(
            summarizePenElement
          ),
        staticContractFileHash,
        createCheckpoint,
        outputPath,
        artifactsPath,
        creationEvidenceMode: "observed-live-post",
        allowedWrites,
        projectReads,
        blockedWrites,
        blockedExternalWrites,
        blockedExistingProjectReads,
        blockedCanaryReadLimit
      });
      throw new Error(
        `wave3-negative-outcome-recorded:${createResult?.error ?? "create-response-invalid"}`
      );
    }
    projectId = createResult.projectId;
    if (
      allowedWrites[0].status < 200 ||
      allowedWrites[0].status >= 300
    ) {
      throw new Error("wave3-canary-create-boundary-invalid");
    }
    persistJson(
      recoveryStatePath,
      {
        schemaVersion: "1.0.0",
        runId,
        projectId,
        submittedPayloadHash:
          exactRoundTripHash(submittedPayload),
        saveState: "not-attempted"
      },
      { sensitive: true }
    );
    writeCheckpoint(createCheckpointPath, {
      schemaVersion: "1.0.0",
      checkpointId: CREATE_CHECKPOINT_ID,
      runId,
      observedAt: observedAt.toISOString(),
      provenance: {
        submittedPayloadHash:
          exactRoundTripHash(submittedPayload)
      },
      network: { allowedWrites },
      phase: "create-response-captured-before-ui-pen"
    });
  }

  initialComparable = await waitForProjectResponse(
    page,
    projectId,
    () =>
      page.goto(
        `${ORIGIN}/ko/view/${encodeURIComponent(projectId)}`,
        { waitUntil: "domcontentloaded", timeout: 30_000 }
      )
  );
  if (resumeSaveOutcomeUncertain) {
    if (
      typeof recoveryInitialComparableHash !== "string" ||
      exactRoundTripHash(initialComparable) !==
        recoveryInitialComparableHash
    ) {
      throw new Error(
        "wave3-ambiguous-save-observed-server-change"
      );
    }
    persistJson(
      recoveryStatePath,
      {
        schemaVersion: "1.0.0",
        runId,
        projectId,
        submittedPayloadHash:
          exactRoundTripHash(submittedPayload),
        initialComparableHash:
          exactRoundTripHash(initialComparable),
        saveState: "not-attempted"
      },
      { sensitive: true }
    );
  }
  const initialPenObservation = observeInitialPenContract(
    submittedComparable,
    initialComparable,
    authoredIds
  );
  if (
    initialPenObservation.authoredCreatePersistence !== true
  ) {
    const privateArtifacts = {
      schemaVersion: "1.0.0",
      artifactId:
        "wave3-pen-canary-private-negative-artifacts-v1",
      runId,
      submittedPayload,
      initialComparable
    };
    persistJson(privateOutputPath, privateArtifacts, {
      sensitive: true
    });
    const createCheckpoint = readCheckpoint(
      createCheckpointPath,
      CREATE_CHECKPOINT_ID,
      runId
    );
    persistNegativeOutcome({
      outcome: "authored-pen-not-persisted",
      failureReason:
        initialPenObservation.failureReason ??
        "authored-pen-persistence-not-observed",
      observedAt: observedAt.toISOString(),
      runId,
      goldenFixture,
      submittedPayload,
      submittedPenSummaries:
        initialPenObservation.submitted,
      initialComparable,
      initialPenObservation,
      staticContractFileHash,
      createCheckpoint,
      outputPath,
      artifactsPath,
      privateArtifactsHash:
        exactRoundTripHash(privateArtifacts),
      creationEvidenceMode:
        typeof resumeRunId === "string"
          ? "recovered-private-state"
          : "observed-live-post",
      allowedWrites,
      projectReads,
      blockedWrites,
      blockedExternalWrites,
      blockedExistingProjectReads,
      blockedCanaryReadLimit
    });
    throw new Error(
      `wave3-negative-outcome-recorded:${initialPenObservation.failureReason}`
    );
  }
  if (!resumeSaveOutcomeUncertain) {
    persistJson(
      recoveryStatePath,
      {
        schemaVersion: "1.0.0",
        runId,
        projectId,
        submittedPayloadHash:
          exactRoundTripHash(submittedPayload),
        initialComparableHash:
          exactRoundTripHash(initialComparable),
        saveState: "not-attempted"
      },
      { sensitive: true }
    );
  }
  await waitForEditorReady(page);
  const initialRawRender = await rawPenRenderSnapshot(page);
  const initialRender = summarizePenRender(initialRawRender, {
    strict: false
  });
  if (
    initialRender.valid !== true ||
    !canonicalEqual(initialRender.pathIds, [...authoredIds].sort())
  ) {
    const privateArtifacts = {
      schemaVersion: "1.0.0",
      artifactId:
        "wave3-pen-canary-private-negative-artifacts-v1",
      runId,
      submittedPayload,
      initialComparable,
      render: { initial: initialRawRender }
    };
    persistJson(privateOutputPath, privateArtifacts, {
      sensitive: true
    });
    const createCheckpoint = readCheckpoint(
      createCheckpointPath,
      CREATE_CHECKPOINT_ID,
      runId
    );
    persistNegativeOutcome({
      outcome: "authored-pen-not-rendered",
      failureReason: "authored-pen-dom-id-set-not-rendered",
      observedAt: observedAt.toISOString(),
      runId,
      goldenFixture,
      submittedPayload,
      submittedPenSummaries:
        initialPenObservation.submitted,
      initialComparable,
      initialPenObservation,
      initialRender,
      staticContractFileHash,
      createCheckpoint,
      outputPath,
      artifactsPath,
      privateArtifactsHash:
        exactRoundTripHash(privateArtifacts),
      creationEvidenceMode:
        typeof resumeRunId === "string"
          ? "recovered-private-state"
          : "observed-live-post",
      allowedWrites,
      projectReads,
      blockedWrites,
      blockedExternalWrites,
      blockedExistingProjectReads,
      blockedCanaryReadLimit
    });
    throw new Error(
      "wave3-negative-outcome-recorded:authored-pen-not-rendered"
    );
  }

  const toolbarActivations = [];
  toolbarActivations.push(await clickCommonTool(page, "pen"));
  const uiGesture = await deriveUiPenGesture(page);
  await drawPenStroke(page, uiGesture);
  await waitForRenderedProject(page, 3);
  const afterDrawRawRender = await rawPenRenderSnapshot(page);
  const afterDrawRender = summarizePenRender(afterDrawRawRender);
  const uiCreatedIds = afterDrawRender.pathIds.filter(
    (id) => !authoredIds.includes(id)
  );
  if (uiCreatedIds.length !== 1) {
    throw new Error("wave3-ui-created-pen-id-invalid");
  }
  const uiCreatedId = uiCreatedIds[0];

  toolbarActivations.push(await clickCommonTool(page, "eraser"));
  const erasedAuthoredId = authoredIds[1];
  const eraserTarget = await clientPointOnPenPath(
    page,
    erasedAuthoredId
  );
  await eraseAt(page, eraserTarget);
  await waitForRenderedProject(page, EXPECTED_FINAL_PEN_COUNT);
  const afterEraseRawRender = await rawPenRenderSnapshot(page);
  const afterEraseRender = summarizePenRender(afterEraseRawRender);
  expectedFinalIds = [authoredIds[0], uiCreatedId].sort();
  if (
    !canonicalEqual(
      afterEraseRender.pathIds,
      expectedFinalIds
    )
  ) {
    throw new Error("wave3-exact-one-authored-pen-erase-failed");
  }

  saveArmed = true;
  const saveActivation = await clickSave(page);
  const putStatus = await Promise.race([
    putResponsePromise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error("wave3-canary-save-response-timeout")
          ),
        30_000
      )
    )
  ]);
  const expectedAllowedWriteCount =
    typeof resumeRunId === "string" ? 1 : 2;
  if (
    putStatus < 200 ||
    putStatus >= 300 ||
    allowedWrites.length !== expectedAllowedWriteCount ||
    !savedPayload ||
    !savedMutation
  ) {
    throw new Error("wave3-canary-save-boundary-invalid");
  }
  await page.waitForTimeout(500);
  await page.close();

  page = await context.newPage();
  const finalComparable = await waitForProjectResponse(
    page,
    projectId,
    () =>
      page.goto(
        `${ORIGIN}/ko/view/${encodeURIComponent(projectId)}`,
        { waitUntil: "domcontentloaded", timeout: 30_000 }
      )
  );
  await waitForRenderedProject(page, EXPECTED_FINAL_PEN_COUNT);
  const finalComparison = compareRoundTripValues(
    savedMutation.savedComparable,
    finalComparable
  );
  if (
    finalComparison.normalizedEqual !== true ||
    finalComparison.unexpectedDifferenceCount !== 0
  ) {
    throw new Error("wave3-canary-saved-reopen-mismatch");
  }
  const finalRawRender = await rawPenRenderSnapshot(page);
  const finalRender = summarizePenRender(finalRawRender);
  if (!canonicalEqual(finalRender.pathIds, expectedFinalIds)) {
    throw new Error("wave3-final-pen-dom-id-set-invalid");
  }
  if (
    blockedExistingProjectReads.length !== 0 ||
    projectReads.length > 3
  ) {
    throw new Error("wave3-existing-project-read-boundary-invalid");
  }
  if (
    blockedWrites.some(
      (write) =>
        write?.method !== "POST" ||
        write?.path !==
          `${WAVE1_CANARY_REDACTED_PROJECT_PATH}/upload-image`
    )
  ) {
    throw new Error("wave3-unexpected-blocked-product-write");
  }

  const privateArtifacts = {
    schemaVersion: "1.0.0",
    artifactId: "wave3-pen-canary-private-artifacts-v1",
    runId,
    submittedPayload,
    initialComparable,
    savedPayload,
    savedComparable: savedMutation.savedComparable,
    finalComparable,
    render: {
      initial: initialRawRender,
      afterDraw: afterDrawRawRender,
      afterErase: afterEraseRawRender,
      final: finalRawRender
    }
  };
  persistJson(privateOutputPath, privateArtifacts, {
    sensitive: true
  });

  const artifacts = {
    schemaVersion: "1.0.0",
    artifactId: ARTIFACT_ID,
    runId,
    outcome: "roundtrip-pass",
    provenance: {
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      initialComparableHash:
        exactRoundTripHash(initialComparable),
      savedPayloadHash: exactRoundTripHash(savedPayload),
      finalComparableHash:
        exactRoundTripHash(finalComparable),
      privateArtifactsHash:
        exactRoundTripHash(privateArtifacts)
    },
    discovery: {
      initialPenObservation,
      savedPenElementSummaries:
        savedMutation.penElementSummaries,
      editorHydration: savedMutation.editorHydration,
      automaticSaveMetadataFields:
        savedMutation.automaticSaveMetadataFields
    },
    interaction: {
      toolbarActivations,
      uiGesture,
      uiCreatedId,
      erasedAuthoredId,
      expectedFinalIds,
      saveActivation
    },
    render: {
      initial: initialRender,
      afterDraw: afterDrawRender,
      afterErase: afterEraseRender,
      final: finalRender
    },
    network: {
      allowedWrites,
      ...(recoveredCreation ? { recoveredCreation } : {}),
      projectReads,
      blockedWrites,
      blockedExternalWrites,
      blockedExistingProjectReads,
      blockedCanaryReadLimit
    }
  };
  assertNoSensitiveData(artifacts);
  const createCheckpoint = readCheckpoint(
    createCheckpointPath,
    CREATE_CHECKPOINT_ID,
    runId
  );
  const saveCheckpoint = readCheckpoint(
    saveCheckpointPath,
    SAVE_CHECKPOINT_ID,
    runId
  );
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: PROBE_ID,
    observedAt: observedAt.toISOString(),
    outcome: "roundtrip-pass",
    provenance: {
      source: "approved-new-canary-ui-pen",
      runId,
      goldenFixtureId: goldenFixture.fixtureId,
      goldenPayloadHash:
        goldenFixture.invariants.payloadHash,
      staticContractFileHash,
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      createCheckpointHash:
        exactRoundTripHash(createCheckpoint),
      saveCheckpointHash:
        exactRoundTripHash(saveCheckpoint),
      artifactsHash: exactRoundTripHash(artifacts)
    },
    discovery: {
      authoredCreatePersistence:
        initialPenObservation.authoredCreatePersistence,
      exactAuthoredPenRoundTrip:
        initialPenObservation.exactPenRoundTrip,
      coordinateSpaceIdentity:
        initialRender.coordinateSpaceIdentity,
      initialPenElementSummaries:
        initialPenObservation.reopened,
      savedPenElementSummaries:
        savedMutation.penElementSummaries
    },
    roundTrip: {
      nonPenInitialReopen:
        initialPenObservation.baselineComparison,
      savedReopen: finalComparison
    },
    interaction: {
      uiCreatedStrokeCount: 1,
      erasedAuthoredStrokeCount: 1,
      initialPenCount: EXPECTED_AUTHORED_PEN_COUNT,
      finalPenCount: EXPECTED_FINAL_PEN_COUNT
    },
    writeBoundary: {
      mode: "one-create-one-save",
      creationEvidenceMode:
        typeof resumeRunId === "string"
          ? "recovered-private-state"
          : "observed-live-post",
      allowedCreateCount: 1,
      allowedSaveCount: 1,
      observedAllowedWriteCount: allowedWrites.length,
      projectReadCount: projectReads.length,
      blockedCanaryReadCount:
        blockedCanaryReadLimit.length,
      blockedWriteCount: blockedWrites.length,
      blockedExternalWriteCount:
        blockedExternalWrites.length,
      existingTeacherProjectReadCount: 0
    }
  };
  assertNoSensitiveData(evidence);
  if (
    artifacts.render.initial.pathCount !== 2 ||
    artifacts.render.afterDraw.pathCount !== 3 ||
    artifacts.render.afterErase.pathCount !== 2 ||
    artifacts.render.final.pathCount !== 2 ||
    evidence.interaction.uiCreatedStrokeCount !== 1 ||
    evidence.interaction.erasedAuthoredStrokeCount !== 1 ||
    evidence.provenance.artifactsHash !==
      exactRoundTripHash(artifacts)
  ) {
    throw new Error("wave3-canary-evidence-invariant-invalid");
  }
  persistJson(artifactsPath, artifacts);
  persistJson(outputPath, evidence);
  process.stdout.write(
    `PASS Wave 3 pen canary 2->3->2 strokes, one create, one save ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
