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
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";
import {
  buildCanaryPayload,
  compareRoundTripValues,
  exactRoundTripHash,
  validateCanaryGoldenBinding
} from "./lib/round-trip-evidence.mjs";
import {
  WAVE2_CANARY_ARTIFACT_ID,
  WAVE2_CANARY_PROBE_ID,
  WAVE2_CANARY_TITLE_PREFIX,
  WAVE1_CANARY_REDACTED_PROJECT_PATH,
  assertSavedPayloadDelta,
  comparableFromProjectPayload
} from "./lib/canary-evidence.mjs";

const origin = "https://mathcanvas.vivasam.com";
const WAVE2_EXPECTED_INITIAL_OBJECT_COUNT = 59;
const WAVE2_MAXIMUM_NEW_OBJECT_COUNT = 4;
const WAVE2_CANARY_REDACTED_PROJECT_PATH =
  WAVE1_CANARY_REDACTED_PROJECT_PATH;
const goldenFixturePath = join(
  repositoryRoot,
  "fixtures",
  "golden",
  "fraction-comparison.p0-v1.json"
);
const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function canaryRunId(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function routePath(url) {
  const parsed = new URL(url);
  return parsed.origin === origin
    ? parsed.pathname
    : `${parsed.origin}${parsed.pathname}`;
}

function redactProjectPath(path, canaryProjectId) {
  if (
    typeof canaryProjectId === "string" &&
    path.includes(canaryProjectId)
  ) {
    return path.replaceAll(
      canaryProjectId,
      "<redacted-project>"
    );
  }
  return path;
}

function isProjectReadPath(path) {
  return path === "/api/project" || path.startsWith("/api/project/");
}

function persistJson(path, value) {
  assertNoSensitiveData(value);
  mkdirSync(dirname(path), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(path, stableJson(value), {
    encoding: "utf8",
    mode: 0o600
  });
}

async function getProjectComparable(page, canaryProjectId) {
  return page.evaluate(async (projectId) => {
    const response = await fetch(
      `/api/project/${encodeURIComponent(projectId)}`,
      {
        credentials: "include",
        cache: "no-store"
      }
    );
    if (!response.ok) {
      throw new Error(
        `wave2-project-reopen-failed:${response.status}`
      );
    }
    const payload = await response.json();
    return {
      projectTitle: payload.projectTitle,
      contentsJson: payload.contentsJson,
      canvasOption: payload.canvasOption,
      isShowMenuOnActivity: payload.isShowMenuOnActivity,
      isNoteworthy: payload.isNoteworthy ?? false,
      tags: payload.tags,
      studyLevel: payload.studyLevel,
      categoryId:
        payload.categoryId ?? payload.category?.categoryId
    };
  }, canaryProjectId);
}

async function waitForRenderedProject(page, objectCount) {
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForFunction(
    (expectedCount) =>
      document.querySelectorAll(".item.group").length ===
      expectedCount,
    objectCount,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(1200);
}

async function renderedObjectIds(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".item.group")]
      .map((element) => element.id)
      .filter(Boolean)
  );
}

async function captureRenderSnapshot(
  page,
  expectedObjectIds,
  newObjectIds = []
) {
  return page.evaluate(
    ({ objectIds, discoveredIds }) => {
      const renderedObjectIds = objectIds.filter(
        (objectId) => document.getElementById(objectId) !== null
      );
      return {
        itemGroupCount:
          document.querySelectorAll(".item.group").length,
        playgroundCount:
          document.querySelectorAll(".playground").length,
        renderedObjectIds,
        renderedNewObjectIds: discoveredIds.filter(
          (objectId) => document.getElementById(objectId) !== null
        )
      };
    },
    {
      objectIds: expectedObjectIds,
      discoveredIds: newObjectIds
    }
  );
}

async function clickCommonTool(page, requestedTool) {
  const labels = {
    "point-line": ["점 / 선 (L)", "Point / Line (L)"],
    circle: ["원 (O)", "Circle (O)"],
    select: ["선택 (V)", "Select (V)"]
  }[requestedTool];
  if (!labels) {
    throw new Error(
      `common-toolbar-tool-unsupported:${requestedTool}`
    );
  }
  const result = await page.evaluate(
    ({ tool, expectedLabels }) => {
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
          const labelsToCheck = [
            element.textContent,
            element.getAttribute("aria-label"),
            element.getAttribute("title"),
            element.getAttribute("data-tooltip")
          ].map(normalize);
          const matchedLabel = expectedLabels.find((label) =>
            labelsToCheck.some((value) => value === label)
          );
          return {
            element,
            matchedLabel,
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
          error: `common-toolbar-control-unavailable:${tool}`
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
      if (
        !(
          clickable instanceof HTMLElement ||
          clickable instanceof SVGElement
        )
      ) {
        return {
          ok: false,
          error: `common-toolbar-click-target-invalid:${tool}`
        };
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
        requestedTool: tool,
        matchedLabel: matched.matchedLabel,
        tagName: clickable.tagName.toLowerCase(),
        cursorClassAfterClick:
          document
            .getElementById("math-parent-element")
            ?.getAttribute("class") ?? ""
      };
    },
    { tool: requestedTool, expectedLabels: labels }
  );
  if (result?.ok !== true) {
    throw new Error(
      result?.error ??
        `common-toolbar-activation-failed:${requestedTool}`
    );
  }
  await page.waitForTimeout(150);
  return {
    ...result,
    cursorClassAfterClick:
      await page
        .locator("#math-parent-element")
        .getAttribute("class")
  };
}

async function deriveVisibleDrawGestures(page) {
  const result = await page.evaluate(() => {
    const canvas = document.getElementById("outermost");
    if (!(canvas instanceof SVGSVGElement)) return [];
    const canvasBox = canvas.getBoundingClientRect();
    const blockers = [
      ...document.querySelectorAll(
        ".item.group, #top-toolbar, #right-toolbar, #bottom-common-toolbar"
      )
    ].map((element) => element.getBoundingClientRect());
    const overlaps = (box, blocker) =>
      box.left < blocker.right + 12 &&
      box.right > blocker.left - 12 &&
      box.top < blocker.bottom + 12 &&
      box.bottom > blocker.top - 12;
    const cells = [];
    const width = 120;
    const height = 76;
    for (
      let x = Math.min(canvasBox.right, window.innerWidth) - width - 20;
      x >= Math.max(canvasBox.left, 20) + 20;
      x -= 28
    ) {
      for (
        let y = Math.max(canvasBox.top, 64) + 20;
        y + height <
        Math.min(canvasBox.bottom, window.innerHeight - 82);
        y += 28
      ) {
        const box = {
          left: x,
          right: x + width,
          top: y,
          bottom: y + height
        };
        if (
          blockers.some((blocker) => overlaps(box, blocker)) ||
          cells.some((cell) => overlaps(box, cell))
        ) {
          continue;
        }
        cells.push(box);
        if (cells.length === 3) {
          return [
            {
              start: {
                x: cells[0].left + width / 2,
                y: cells[0].top + height / 2
              },
              end: null
            },
            {
              start: {
                x: cells[1].left + 16,
                y: cells[1].top + height / 2
              },
              end: {
                x: cells[1].right - 16,
                y: cells[1].top + height / 2 + 12
              }
            },
            {
              start: {
                x: cells[2].left + width / 2 - 18,
                y: cells[2].top + height / 2
              },
              end: {
                x: cells[2].left + width / 2 + 28,
                y: cells[2].top + height / 2 + 20
              }
            }
          ];
        }
      }
    }
    return [];
  });
  if (!Array.isArray(result) || result.length !== 3) {
    throw new Error("wave2-visible-empty-draw-cells-unavailable");
  }
  return result;
}

async function waitForNewObjects(page, knownIds) {
  const previousCount = knownIds.size;
  await page.waitForFunction(
    (count) =>
      document.querySelectorAll(".item.group").length > count,
    previousCount,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(250);
  const currentIds = await renderedObjectIds(page);
  const additions = currentIds.filter(
    (objectId) => !knownIds.has(objectId)
  );
  if (
    additions.length < 1 ||
    currentIds.length >
      WAVE2_EXPECTED_INITIAL_OBJECT_COUNT +
        WAVE2_MAXIMUM_NEW_OBJECT_COUNT
  ) {
    throw new Error(
      `wave2-ui-object-cardinality-invalid:${JSON.stringify(
        additions
      )}`
    );
  }
  additions.forEach((objectId) => knownIds.add(objectId));
  return additions;
}

async function drawPoint(page, clientPoint) {
  await page.mouse.move(clientPoint.x, clientPoint.y);
  await page.mouse.down();
  await page.mouse.up();
}

async function drawSegment(page, start, end) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

function writeCreationCheckpoint({
  path,
  runId,
  observedAt,
  submittedPayload,
  allowedWrites
}) {
  const checkpoint = {
    schemaVersion: "1.0.0",
    checkpointId:
      "wave2-common-draw-canary-create-checkpoint-v1",
    runId,
    observedAt,
    provenance: {
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload)
    },
    network: {
      allowedWrites
    },
    phase: "create-response-captured-before-ui-draw"
  };
  persistJson(path, checkpoint);
}

function readCreationCheckpoint(path) {
  if (!existsSync(path)) {
    throw new Error("wave2-canary-create-checkpoint-unavailable");
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function persistRecoveryState(path, state) {
  mkdirSync(dirname(path), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(path, stableJson(state), {
    encoding: "utf8",
    mode: 0o600
  });
}

function readRecoveryState(path) {
  if (!existsSync(path)) {
    throw new Error("wave2-canary-recovery-state-unavailable");
  }
  const state = JSON.parse(readFileSync(path, "utf8"));
  if (
    state?.schemaVersion !== "1.0.0" ||
    !/^\d{8}T\d{6}Z$/.test(state?.runId ?? "") ||
    typeof state?.projectId !== "string" ||
    !/^[A-Za-z0-9_-]{1,160}$/.test(state.projectId) ||
    typeof state?.submittedPayloadHash !== "string" ||
    !["not-attempted", "attempted", "saved"].includes(
      state?.saveState
    )
  ) {
    throw new Error("wave2-canary-recovery-state-invalid");
  }
  return state;
}

function buildSaveCheckpoint({
  runId,
  observedAt,
  submittedPayload,
  initialComparable,
  savedPayload,
  savedMutation,
  allowedWrites
}) {
  return {
    schemaVersion: "1.0.0",
    checkpointId:
      "wave2-common-draw-canary-save-checkpoint-v1",
    runId,
    observedAt,
    provenance: {
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      initialComparableHash:
        exactRoundTripHash(initialComparable),
      savedPayloadHash: exactRoundTripHash(savedPayload)
    },
    savedPayload,
    savedComparable: savedMutation.savedComparable,
    discovery: {
      wireSummaries: savedMutation.wireSummaries
    },
    network: {
      allowedWrites
    },
    phase: "save-response-captured-before-final-render"
  };
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
        "wave2-common-draw-canary.roundtrip.json"
      )
    },
    "artifacts-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave2-common-draw-canary.artifacts.json"
      )
    },
    "create-checkpoint-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave2-common-draw-canary.create-checkpoint.json"
      )
    },
    "save-checkpoint-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave2-common-draw-canary.save-checkpoint.json"
      )
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
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
      "explicit-wave2-create-and-save-approval-required"
    );
  }
  const stateDirectory = resolveStateDirectory(
    options["state-dir"]
  );
  const recoveryStatePath = join(
    stateDirectory,
    "wave2-canary-recovery.json"
  );
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "Wave 2 canary evidence"
  );
  const artifactsPath = assertPathInside(
    options["artifacts-output"],
    options["research-root"],
    "Wave 2 canary artifacts"
  );
  const createCheckpointPath = assertPathInside(
    options["create-checkpoint-output"],
    options["research-root"],
    "Wave 2 create checkpoint"
  );
  const saveCheckpointPath = assertPathInside(
    options["save-checkpoint-output"],
    options["research-root"],
    "Wave 2 save checkpoint"
  );
  const goldenFixture = JSON.parse(
    readFileSync(goldenFixturePath, "utf8")
  );
  const goldenPayload =
    goldenFixture?.results?.compiledProject?.payload;
  const observedAt = new Date();
  const resumeRunId = options["resume-run-id"];
  const runId =
    typeof resumeRunId === "string"
      ? resumeRunId
      : canaryRunId(observedAt);
  const submittedPayload = buildCanaryPayload(
    goldenPayload,
    runId,
    WAVE2_CANARY_TITLE_PREFIX
  );
  validateCanaryGoldenBinding({
    goldenPayload,
    expectedGoldenPayloadHash:
      goldenFixture?.invariants?.payloadHash,
    submittedPayload,
    runId,
    titlePrefix: WAVE2_CANARY_TITLE_PREFIX
  });
  const submittedComparable =
    comparableFromProjectPayload(submittedPayload);

  releaseLock = acquireManagedProfileLock(stateDirectory);
  const allowedWrites = [];
  const blockedWrites = [];
  const blockedExternalWrites = [];
  const blockedExistingProjectReads = [];
  const writeRequests = new Map();
  let recoveredCreation;
  let resumeSaveOutcomeUncertain = false;
  let canaryProjectId;
  let createArmed = false;
  let saveArmed = false;
  let initialReopenedComparable;
  let savedPayload;
  let savedMutation;
  let movedObjectId;
  let newObjectIds = [];
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
      requestUrl.origin === origin &&
      isProjectReadPath(path)
    ) {
      const expectedCanaryRead =
        typeof canaryProjectId === "string"
          ? `/api/project/${encodeURIComponent(
              canaryProjectId
            )}`
          : "";
      if (path !== expectedCanaryRead) {
        blockedExistingProjectReads.push({ method, path });
        await route.abort("blockedbyclient");
        return;
      }
    }
    if (!writeMethods.has(method)) {
      await route.continue();
      return;
    }
    if (requestUrl.origin !== origin) {
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
        validateCanaryGoldenBinding({
          goldenPayload,
          expectedGoldenPayloadHash:
            goldenFixture.invariants.payloadHash,
          submittedPayload: requestPayload,
          runId,
          titlePrefix: WAVE2_CANARY_TITLE_PREFIX
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
        typeof canaryProjectId === "string"
          ? `/api/project/${encodeURIComponent(
              canaryProjectId
            )}`
          : "";
      if (
        method === "PUT" &&
        path === expectedPutPath &&
        saveArmed &&
        allowedWrites.length ===
          (typeof resumeRunId === "string" ? 0 : 1)
      ) {
        const requestPayload = request.postDataJSON();
        const mutation = assertSavedPayloadDelta({
          initialComparable: initialReopenedComparable,
          savedPayload: requestPayload,
          newObjectIds,
          movedObjectId,
          minimumNewObjectCount: 1,
          maximumNewObjectCount:
            WAVE2_MAXIMUM_NEW_OBJECT_COUNT
        });
        savedPayload = requestPayload;
        savedMutation = mutation;
        persistRecoveryState(recoveryStatePath, {
          schemaVersion: "1.0.0",
          runId,
          projectId: canaryProjectId,
          submittedPayloadHash:
            exactRoundTripHash(submittedPayload),
          saveState: "attempted"
        });
        const record = {
          method,
          path: WAVE2_CANARY_REDACTED_PROJECT_PATH,
          payloadHash: exactRoundTripHash(requestPayload),
          status: 0
        };
        allowedWrites.push(record);
        writeRequests.set(request, record);
        saveArmed = false;
        await route.continue();
        return;
      }
      const expectedUploadPath =
        typeof canaryProjectId === "string"
          ? `/api/project/${encodeURIComponent(
              canaryProjectId
            )}/upload-image`
          : "";
      if (
        method === "POST" &&
        path === expectedUploadPath
      ) {
        blockedWrites.push({
          method,
          path:
            `${WAVE2_CANARY_REDACTED_PROJECT_PATH}/upload-image`
        });
        await route.abort("blockedbyclient");
        return;
      }
    } catch (error) {
      blockedWrites.push({
        method,
        path: redactProjectPath(path, canaryProjectId),
        reason:
          error instanceof Error ? error.message : String(error)
      });
      rejectPutResponse?.(error);
      await route.abort("blockedbyclient");
      return;
    }
    blockedWrites.push({
      method,
      path: redactProjectPath(path, canaryProjectId),
      reason: "write-not-in-wave2-canary-allowlist"
    });
    if (saveArmed) {
      rejectPutResponse?.(
        new Error(`unexpected-write-blocked:${method}:${path}`)
      );
    }
    await route.abort("blockedbyclient");
  });
  context.on("response", async (response) => {
    const request = response.request();
    const record = writeRequests.get(request);
    if (!record) return;
    record.status = response.status();
    if (record.method !== "PUT") return;
    if (!response.ok()) {
      rejectPutResponse?.(
        new Error(`wave2-canary-save-failed:${response.status()}`)
      );
      return;
    }
    try {
      persistRecoveryState(recoveryStatePath, {
        schemaVersion: "1.0.0",
        runId,
        projectId: canaryProjectId,
        submittedPayloadHash:
          exactRoundTripHash(submittedPayload),
        saveState: "saved"
      });
      const checkpoint = buildSaveCheckpoint({
        runId,
        observedAt: observedAt.toISOString(),
        submittedPayload,
        initialComparable: initialReopenedComparable,
        savedPayload,
        savedMutation,
        allowedWrites
      });
      persistJson(saveCheckpointPath, checkpoint);
      resolvePutResponse?.(response.status());
    } catch (error) {
      rejectPutResponse?.(error);
    }
  });

  let page = context.pages()[0] ?? (await context.newPage());
  const authResponse = await page.goto(`${origin}/api/auth/me`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  if (authResponse?.status() !== 200) {
    throw new Error(
      "auth-required-before-wave2-create: 전용 Chrome에 다시 로그인한 뒤 실행하세요."
    );
  }
  if (blockedExistingProjectReads.length !== 0) {
    throw new Error(
      `pre-create-existing-project-read-attempted:${JSON.stringify(
        blockedExistingProjectReads
      )}`
    );
  }

  if (typeof resumeRunId === "string") {
    const recoveryState = readRecoveryState(recoveryStatePath);
    if (
      recoveryState.runId !== runId ||
      recoveryState.submittedPayloadHash !==
        exactRoundTripHash(submittedPayload) ||
      !["not-attempted", "attempted"].includes(
        recoveryState.saveState
      )
    ) {
      throw new Error(
        "wave2-canary-resume-not-safe-for-save"
      );
    }
    resumeSaveOutcomeUncertain =
      recoveryState.saveState === "attempted";
    canaryProjectId = recoveryState.projectId;
    recoveredCreation = {
      method: "POST",
      path: "/api/project",
      payloadHash: exactRoundTripHash(submittedPayload),
      recovery: "private-state-exact-canary"
    };
  } else {
    if (existsSync(recoveryStatePath)) {
      throw new Error(
        "wave2-canary-existing-recovery-state-requires-explicit-resume"
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
            error:
              `wave2-canary-create-failed:` +
              response.status,
            httpStatus: response.status
          };
        }
        const body = await response.json();
        return {
          ok:
            typeof body?.projectId === "string" &&
            /^[A-Za-z0-9_-]{1,160}$/.test(body.projectId),
          project: body?.projectId,
          httpStatus: response.status
        };
      },
      submittedPayload
    ).catch((error) => ({
      ok: false,
      error: String(error)
    }));
    createArmed = false;
    if (
      createResult?.ok !== true ||
      typeof createResult?.project !== "string"
    ) {
      throw new Error(
        createResult?.error ??
          "wave2-canary-create-response-invalid"
      );
    }
    canaryProjectId = createResult.project;
    allowedWrites[0].status = createResult.httpStatus;
    if (
      allowedWrites.length !== 1 ||
      allowedWrites[0].status < 200 ||
      allowedWrites[0].status >= 300
    ) {
      throw new Error("wave2-canary-create-boundary-invalid");
    }
    persistRecoveryState(recoveryStatePath, {
      schemaVersion: "1.0.0",
      runId,
      projectId: canaryProjectId,
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      saveState: "not-attempted"
    });
    writeCreationCheckpoint({
      path: createCheckpointPath,
      runId,
      observedAt: observedAt.toISOString(),
      submittedPayload,
      allowedWrites
    });
  }

  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(canaryProjectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await waitForRenderedProject(
    page,
    WAVE2_EXPECTED_INITIAL_OBJECT_COUNT
  );
  initialReopenedComparable =
    comparableFromProjectPayload(
      await getProjectComparable(page, canaryProjectId)
    );
  const initialComparison = compareRoundTripValues(
    submittedComparable,
    initialReopenedComparable
  );
  const initialReopenIsExact =
    initialComparison.normalizedEqual === true &&
    initialComparison.unexpectedDifferenceCount === 0;
  if (resumeSaveOutcomeUncertain) {
    if (!initialReopenIsExact) {
      throw new Error(
        "wave2-canary-ambiguous-save-observed-server-change"
      );
    }
    persistRecoveryState(recoveryStatePath, {
      schemaVersion: "1.0.0",
      runId,
      projectId: canaryProjectId,
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      saveState: "not-attempted"
    });
  }
  if (
    !initialReopenIsExact
  ) {
    throw new Error("wave2-canary-initial-reopen-mismatch");
  }
  const initialObjectIds =
    initialReopenedComparable.contentsJson.map(
      (object) => object.id
    );
  const knownIds = new Set(initialObjectIds);
  const initialRender = await captureRenderSnapshot(
    page,
    initialObjectIds
  );
  const toolbarActivations = [];
  const gestures = await deriveVisibleDrawGestures(page);

  toolbarActivations.push(
    await clickCommonTool(page, "point-line")
  );
  await drawPoint(page, gestures[0].start);
  const pointInteractionObjectIds =
    await waitForNewObjects(page, knownIds);

  toolbarActivations.push(
    await clickCommonTool(page, "point-line")
  );
  await drawSegment(
    page,
    gestures[1].start,
    gestures[1].end
  );
  const lineInteractionObjectIds =
    await waitForNewObjects(page, knownIds);

  toolbarActivations.push(
    await clickCommonTool(page, "circle")
  );
  await drawSegment(
    page,
    gestures[2].start,
    gestures[2].end
  );
  const circleInteractionObjectIds =
    await waitForNewObjects(page, knownIds);
  newObjectIds = [
    ...pointInteractionObjectIds,
    ...lineInteractionObjectIds,
    ...circleInteractionObjectIds
  ];
  if (
    newObjectIds.length < 1 ||
    newObjectIds.length > WAVE2_MAXIMUM_NEW_OBJECT_COUNT
  ) {
    throw new Error("wave2-new-object-count-outside-approval");
  }
  movedObjectId = circleInteractionObjectIds[0];
  const afterDrawRender = await captureRenderSnapshot(
    page,
    [...initialObjectIds, ...newObjectIds],
    newObjectIds
  );

  toolbarActivations.push(
    await clickCommonTool(page, "select")
  );
  const movedLocator = page.locator(
    `[id="${movedObjectId.replaceAll('"', '\\"')}"]`
  );
  const movedBox = await movedLocator.boundingBox();
  if (
    !movedBox ||
    movedBox.width <= 0 ||
    movedBox.height <= 0
  ) {
    throw new Error("wave2-new-object-render-box-unavailable");
  }
  const transformsBefore = Object.fromEntries(
    await Promise.all(
      newObjectIds.map(async (objectId) => [
        objectId,
        await page
          .locator(
            `[id="${objectId.replaceAll('"', '\\"')}"]`
          )
          .getAttribute("transform")
      ])
    )
  );
  const boxesBefore = Object.fromEntries(
    await Promise.all(
      newObjectIds.map(async (objectId) => [
        objectId,
        await page
          .locator(
            `[id="${objectId.replaceAll('"', '\\"')}"]`
          )
          .boundingBox()
      ])
    )
  );
  if (
    Object.values(boxesBefore).some(
      (box) => !box || box.width <= 0 || box.height <= 0
    )
  ) {
    throw new Error("wave2-new-object-render-box-unavailable");
  }
  const movedCenter = {
    x: movedBox.x + movedBox.width / 2,
    y: movedBox.y + movedBox.height / 2
  };
  await page.mouse.move(movedCenter.x, movedCenter.y);
  await page.mouse.down();
  await page.mouse.move(
    movedCenter.x + 54,
    movedCenter.y + 24,
    { steps: 12 }
  );
  await page.mouse.up();
  await page.waitForTimeout(600);
  const transformsAfter = Object.fromEntries(
    await Promise.all(
      newObjectIds.map(async (objectId) => [
        objectId,
        await page
          .locator(
            `[id="${objectId.replaceAll('"', '\\"')}"]`
          )
          .getAttribute("transform")
      ])
    )
  );
  const boxesAfter = Object.fromEntries(
    await Promise.all(
      newObjectIds.map(async (objectId) => [
        objectId,
        await page
          .locator(
            `[id="${objectId.replaceAll('"', '\\"')}"]`
          )
          .boundingBox()
      ])
    )
  );
  if (
    Object.values(boxesAfter).some(
      (box) => !box || box.width <= 0 || box.height <= 0
    )
  ) {
    throw new Error("wave2-new-object-render-box-unavailable");
  }
  const centerDisplacementByObjectId = Object.fromEntries(
    newObjectIds.map((objectId) => {
      const before = boxesBefore[objectId];
      const after = boxesAfter[objectId];
      return [
        objectId,
        Math.hypot(
          after.x +
            after.width / 2 -
            (before.x + before.width / 2),
          after.y +
            after.height / 2 -
            (before.y + before.height / 2)
        )
      ];
    })
  );
  const changedTransformObjectIds = newObjectIds.filter(
    (objectId) =>
      transformsBefore[objectId] !== transformsAfter[objectId]
  );
  const movedRenderObjectIds = newObjectIds.filter(
    (objectId) =>
      centerDisplacementByObjectId[objectId] > 4 ||
      changedTransformObjectIds.includes(objectId)
  );
  if (
    movedRenderObjectIds.length !== 1 ||
    movedRenderObjectIds[0] !== movedObjectId ||
    newObjectIds.some(
      (objectId) =>
        objectId !== movedObjectId &&
        (centerDisplacementByObjectId[objectId] > 1 ||
          changedTransformObjectIds.includes(objectId))
    )
  ) {
    throw new Error("wave2-single-client-move-not-observed");
  }
  const objectIdsAfterMove = await renderedObjectIds(page);
  if (
    objectIdsAfterMove.length !==
      WAVE2_EXPECTED_INITIAL_OBJECT_COUNT +
        newObjectIds.length
  ) {
    throw new Error(
      "wave2-drag-created-unexpected-object"
    );
  }

  const saveControl = page
    .locator("#top-toolbar div.cursor-pointer")
    .filter({ hasText: /^\s*저장\s*$/ })
    .first();
  if (!(await saveControl.isVisible().catch(() => false))) {
    throw new Error("wave2-canary-save-control-unavailable");
  }
  saveArmed = true;
  await saveControl.click();
  const putStatus = await Promise.race([
    putResponsePromise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error("wave2-canary-save-response-timeout")
          ),
        30_000
      )
    )
  ]);
  if (
    putStatus < 200 ||
    putStatus >= 300 ||
    allowedWrites.length !==
      (typeof resumeRunId === "string" ? 1 : 2) ||
    !savedPayload ||
    !savedMutation
  ) {
    throw new Error("wave2-canary-save-boundary-invalid");
  }
  await page.waitForTimeout(800);
  await page.close();

  page = await context.newPage();
  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(canaryProjectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await waitForRenderedProject(
    page,
    WAVE2_EXPECTED_INITIAL_OBJECT_COUNT +
      newObjectIds.length
  );
  const finalReopenedComparable =
    comparableFromProjectPayload(
      await getProjectComparable(page, canaryProjectId)
    );
  const persistenceComparison = compareRoundTripValues(
    savedMutation.savedComparable,
    finalReopenedComparable
  );
  if (
    persistenceComparison.normalizedEqual !== true ||
    persistenceComparison.unexpectedDifferenceCount !== 0
  ) {
    throw new Error("wave2-canary-saved-reopen-mismatch");
  }
  const finalObjectIds =
    finalReopenedComparable.contentsJson.map(
      (object) => object.id
    );
  const finalRender = await captureRenderSnapshot(
    page,
    finalObjectIds,
    newObjectIds
  );
  if (blockedExistingProjectReads.length !== 0) {
    throw new Error(
      `wave2-existing-project-read-attempted:${JSON.stringify(
        blockedExistingProjectReads
      )}`
    );
  }
  const expectedAllowedWriteCount =
    typeof resumeRunId === "string" ? 1 : 2;
  if (allowedWrites.length !== expectedAllowedWriteCount) {
    throw new Error("wave2-canary-unexpected-allowed-write-count");
  }
  const roleByObjectId = new Map([
    ...pointInteractionObjectIds.map((objectId) => [
      objectId,
      "point-click"
    ]),
    ...lineInteractionObjectIds.map((objectId) => [
      objectId,
      "point-line-drag"
    ]),
    ...circleInteractionObjectIds.map((objectId) => [
      objectId,
      "circle-drag"
    ])
  ]);
  const wireObservations = savedMutation.wireSummaries.map(
    (summary) => ({
      interactionRole: roleByObjectId.get(summary.objectId),
      ...summary
    })
  );

  const artifacts = {
    schemaVersion: "1.0.0",
    artifactId: WAVE2_CANARY_ARTIFACT_ID,
    runId,
    submittedPayload,
    submittedComparable,
    initialReopenedComparable,
    savedPayload,
    savedComparable: savedMutation.savedComparable,
    finalReopenedComparable,
    discovery: {
      wireObservations,
      editorHydration: savedMutation.editorHydration,
      ...(savedMutation.derivedModuleIndexTags
        ? {
            derivedModuleIndexTags:
              savedMutation.derivedModuleIndexTags
          }
        : {})
    },
    interaction: {
      toolbarActivations,
      gestures,
      newObjectIds,
      movedObjectId,
      transformsBefore,
      transformsAfter,
      changedTransformObjectIds,
      centerDisplacementByObjectId,
      movedRenderObjectIds
    },
    render: {
      initial: initialRender,
      afterDraw: afterDrawRender,
      final: finalRender
    },
    network: {
      allowedWrites,
      ...(recoveredCreation ? { recoveredCreation } : {}),
      blockedWrites,
      blockedExternalWrites,
      blockedExistingProjectReads
    }
  };
  assertNoSensitiveData(artifacts);
  const createCheckpoint = readCreationCheckpoint(
    createCheckpointPath
  );
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: WAVE2_CANARY_PROBE_ID,
    observedAt: observedAt.toISOString(),
    provenance: {
      source: "approved-new-canary-ui-draw",
      runId,
      goldenFixtureId: goldenFixture.fixtureId,
      goldenPayloadHash:
        goldenFixture.invariants.payloadHash,
      submittedPayloadHash:
        exactRoundTripHash(submittedPayload),
      createCheckpointHash:
        exactRoundTripHash(createCheckpoint),
      artifactsHash: exactRoundTripHash(artifacts)
    },
    discovery: {
      initialObjectCount:
        initialReopenedComparable.contentsJson.length,
      finalObjectCount:
        finalReopenedComparable.contentsJson.length,
      wireObservations,
      ...(savedMutation.derivedModuleIndexTags
        ? {
            derivedModuleIndexTags:
              savedMutation.derivedModuleIndexTags
          }
        : {})
    },
    roundTrip: {
      initialReopen: {
        normalizedEqual: initialComparison.normalizedEqual,
        unexpectedDifferenceCount:
          initialComparison.unexpectedDifferenceCount
      },
      savedReopen: {
        normalizedEqual: persistenceComparison.normalizedEqual,
        unexpectedDifferenceCount:
          persistenceComparison.unexpectedDifferenceCount
      }
    },
    interaction: {
      toolbarActivations,
      movedObjectId,
      changedTransformObjectIds,
      centerDisplacementByObjectId,
      movedRenderObjectIds
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
      blockedWriteCount: blockedWrites.length,
      blockedExternalWriteCount:
        blockedExternalWrites.length,
      existingTeacherProjectReadCount: 0
    }
  };
  assertNoSensitiveData(evidence);
  if (
    artifacts.discovery.wireObservations.length !==
      newObjectIds.length ||
    newObjectIds.length < 1 ||
    newObjectIds.length > WAVE2_MAXIMUM_NEW_OBJECT_COUNT ||
    initialRender.itemGroupCount !==
      WAVE2_EXPECTED_INITIAL_OBJECT_COUNT ||
    afterDrawRender.itemGroupCount !==
      WAVE2_EXPECTED_INITIAL_OBJECT_COUNT +
        newObjectIds.length ||
    finalRender.itemGroupCount !==
      WAVE2_EXPECTED_INITIAL_OBJECT_COUNT +
        newObjectIds.length ||
    finalRender.renderedNewObjectIds.length !==
      newObjectIds.length ||
    blockedWrites.some(
      (write) =>
        write?.method !== "POST" ||
        write?.path !==
          `${WAVE2_CANARY_REDACTED_PROJECT_PATH}/upload-image`
    ) ||
    (savedMutation.derivedModuleIndexTags !== undefined &&
      (savedMutation.derivedModuleIndexTags.relation !==
        "module-index-derived-from-saved-contents" ||
        savedMutation.derivedModuleIndexTags.savedTagCount < 1)) ||
    evidence.provenance.artifactsHash !==
      exactRoundTripHash(artifacts) ||
    movedRenderObjectIds.length !== 1 ||
    movedRenderObjectIds[0] !== movedObjectId
  ) {
    throw new Error("wave2-canary-evidence-invariant-invalid");
  }
  persistJson(artifactsPath, artifacts);
  persistJson(outputPath, evidence);
  process.stdout.write(
    `PASS Wave 2 common draw canary 59->${String(
      WAVE2_EXPECTED_INITIAL_OBJECT_COUNT +
        newObjectIds.length
    )} objects, one create, one save ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
