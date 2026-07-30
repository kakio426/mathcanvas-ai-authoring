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
  defaultResearchRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";
import {
  ROUND_TRIP_NUMERIC_TOLERANCE,
  WAVE1_RELEASED_TOOL_KEYS,
  buildWave1CanaryPayload,
  compareRoundTripValues,
  countWave1ToolObjects,
  exactRoundTripHash,
  validateWave1CanaryGoldenBinding
} from "./lib/round-trip-evidence.mjs";
import {
  WAVE1_CANARY_ARTIFACT_ID,
  WAVE1_CANARY_PROBE_ID,
  WAVE1_CANARY_REDACTED_PROJECT_PATH,
  assertSingleFractionMovement,
  buildWave1CanaryClaims,
  comparableFromProjectPayload,
  projectComparison,
  validateWave1CanaryEvidence
} from "./lib/canary-evidence.mjs";

const origin = "https://mathcanvas.vivasam.com";
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

function redactedProjectPath(path, canaryProjectId) {
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

function summarizeContentDifferences(
  initialContents,
  savedContents,
  targetId
) {
  const initialById = new Map(
    (initialContents ?? []).map((object) => [object?.id, object])
  );
  const fieldCounts = new Map();
  const eyeTransitions = new Map();
  const changed = [];
  for (const savedObject of savedContents ?? []) {
    const initialObject = initialById.get(savedObject?.id);
    if (!initialObject) continue;
    const fields = [
      ...new Set([
        ...Object.keys(initialObject),
        ...Object.keys(savedObject)
      ])
    ]
      .filter(
        (field) => {
          const initialHas = Object.hasOwn(initialObject, field);
          const savedHas = Object.hasOwn(savedObject, field);
          if (initialHas !== savedHas) return true;
          return (
            exactRoundTripHash(initialObject[field]) !==
            exactRoundTripHash(savedObject[field])
          );
        }
      )
      .sort();
    if (fields.length === 0) continue;
    changed.push({ id: savedObject.id, fields });
    for (const field of fields) {
      fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1);
    }
    if (fields.includes("isEyeOn")) {
      const transition =
        `${String(initialObject.isEyeOn)}->` +
        String(savedObject.isEyeOn);
      eyeTransitions.set(
        transition,
        (eyeTransitions.get(transition) ?? 0) + 1
      );
    }
  }
  const parentChanged = changed.filter((entry) =>
    entry.fields.includes("parent")
  );
  return {
    changedObjectCount: changed.length,
    changedFieldCounts: Object.fromEntries(
      [...fieldCounts.entries()].sort(([left], [right]) =>
        left.localeCompare(right)
      )
    ),
    targetFields:
      changed.find((entry) => entry.id === targetId)?.fields ?? [],
    eyeTransitions: Object.fromEntries(eyeTransitions),
    parentSamples: parentChanged.slice(0, 4).map((entry) => ({
      id: entry.id,
      initial: initialById.get(entry.id)?.parent,
      saved: (savedContents ?? []).find(
        (object) => object?.id === entry.id
      )?.parent
    })),
    targetParent: (() => {
      const savedTarget = (savedContents ?? []).find(
        (object) => object?.id === targetId
      );
      return {
        initial: initialById.get(targetId)?.parent,
        saved: savedTarget?.parent
      };
    })(),
    samples: changed.slice(0, 8)
  };
}

async function waitForAuthentication(page, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = await page
      .evaluate(async () => {
        try {
          const response = await fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store"
          });
          return response.status;
        } catch {
          return 0;
        }
      })
      .catch(() => 0);
    if (status === 200) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(
    "auth-required: 전용 Chrome에서 로그인한 뒤 다시 실행하세요."
  );
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
      throw new Error(`project-reopen-failed:${response.status}`);
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
  await page.waitForTimeout(1500);
}

async function captureRenderSnapshot(
  page,
  objectIds,
  projectTitle,
  instructionText
) {
  return page.evaluate(
    ({ expectedObjectIds, expectedTitle, expectedInstruction }) => {
      const bodyText = document.body.innerText
        .replace(/\s+/g, " ")
        .trim();
      return {
        itemGroupCount:
          document.querySelectorAll(".item.group").length,
        playgroundCount:
          document.querySelectorAll(".playground").length,
        visibleSvgCount: [...document.querySelectorAll("svg")].filter(
          (element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0;
          }
        ).length,
        mathFieldCount:
          document.querySelectorAll("math-field").length,
        renderedObjectIds: expectedObjectIds.filter(
          (objectId) => document.getElementById(objectId) !== null
        ),
        containsProjectTitle: bodyText.includes(expectedTitle),
        containsGoldenInstruction:
          bodyText.includes(expectedInstruction)
      };
    },
    {
      expectedObjectIds: objectIds,
      expectedTitle: projectTitle,
      expectedInstruction: instructionText
    }
  );
}

function toolResultsFromArtifacts(artifacts) {
  const submitted = countWave1ToolObjects(
    artifacts.submittedComparable.contentsJson
  );
  const initial = countWave1ToolObjects(
    artifacts.initialReopenedComparable.contentsJson
  );
  const final = countWave1ToolObjects(
    artifacts.finalReopenedComparable.contentsJson
  );
  return WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => {
    const submittedIds =
      submitted.objectIdsByTool.get(toolKey) ?? [];
    const finalIds = final.objectIdsByTool.get(toolKey) ?? [];
    return {
      toolKey,
      submittedObjectCount: submitted.counts.get(toolKey) ?? 0,
      initialReopenedObjectCount:
        initial.counts.get(toolKey) ?? 0,
      finalReopenedObjectCount:
        final.counts.get(toolKey) ?? 0,
      initialRenderedObjectCount:
        artifacts.render.initial.renderedObjectIds.filter((id) =>
          submittedIds.includes(id)
        ).length,
      finalRenderedObjectCount:
        artifacts.render.final.renderedObjectIds.filter((id) =>
          finalIds.includes(id)
        ).length
    };
  });
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
        "wave1-current-golden-canary.roundtrip.json"
      )
    },
    "artifacts-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave1-current-golden-canary.artifacts.json"
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
    headless: { type: "boolean", default: true },
    "login-timeout-ms": {
      type: "string",
      default: "30000"
    }
  });
  if (options["approve-create-and-save"] !== true) {
    throw new Error("explicit-create-and-save-approval-required");
  }
  const loginTimeoutMs = Number(options["login-timeout-ms"]);
  if (
    !Number.isInteger(loginTimeoutMs) ||
    loginTimeoutMs < 0 ||
    loginTimeoutMs > 600_000
  ) {
    throw new Error("--login-timeout-ms는 0~600000 정수여야 합니다.");
  }
  const stateDirectory = resolveStateDirectory(options["state-dir"]);
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "canary evidence"
  );
  const artifactsPath = assertPathInside(
    options["artifacts-output"],
    options["research-root"],
    "canary artifacts"
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
  const submittedPayload = buildWave1CanaryPayload(
    goldenPayload,
    runId
  );
  validateWave1CanaryGoldenBinding({
    goldenPayload,
    expectedGoldenPayloadHash:
      goldenFixture?.invariants?.payloadHash,
    submittedPayload,
    runId
  });
  const submittedComparable =
    comparableFromProjectPayload(submittedPayload);
  const submittedClassification = countWave1ToolObjects(
    submittedComparable.contentsJson
  );
  if (
    submittedComparable.contentsJson.length !== 59 ||
    submittedClassification.unclassifiedObjectCount !== 0
  ) {
    throw new Error("current-golden-canary-contract-unexpected");
  }

  releaseLock = acquireManagedProfileLock(stateDirectory);
  const allowedWrites = [];
  const blockedWrites = [];
  const blockedExternalWrites = [];
  const unexpectedWrites = [];
  const writeRequests = new Map();
  let recoveredCreation;
  let canaryProjectId;
  let createArmed = false;
  let saveArmed = false;
  let initialReopenedComparable;
  let targetObjectId;
  let savedPayload;
  let savedMutation;
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
    if (!writeMethods.has(method)) {
      await route.continue();
      return;
    }
    const requestUrl = new URL(request.url());
    const path = routePath(request.url());
    try {
      if (requestUrl.origin !== origin) {
        blockedExternalWrites.push({ method, path });
        await route.abort("blockedbyclient");
        return;
      }
      if (
        method === "POST" &&
        path === "/api/project" &&
        createArmed &&
        allowedWrites.length === 0
      ) {
        const requestPayload = request.postDataJSON();
        validateWave1CanaryGoldenBinding({
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
        typeof canaryProjectId === "string"
          ? `/api/project/${encodeURIComponent(canaryProjectId)}`
          : "";
      if (
        method === "PUT" &&
        path === expectedPutPath &&
        saveArmed &&
        allowedWrites.length ===
          (typeof resumeRunId === "string" ? 0 : 1)
      ) {
        const requestPayload = request.postDataJSON();
        let mutation;
        try {
          mutation = assertSingleFractionMovement({
            initialComparable: initialReopenedComparable,
            savedPayload: requestPayload,
            targetObjectId
          });
        } catch (error) {
          throw new Error(
            `${error instanceof Error ? error.message : String(error)}` +
              `:shape=${JSON.stringify({
                keys: Object.keys(requestPayload).sort(),
                contentsJsonLength:
                  requestPayload?.contentsJsonLength,
                actualContentsLength:
                  requestPayload?.contentsJson?.length,
                canvasKeys: Object.keys(
                  requestPayload?.canvasOption ?? {}
                ).sort(),
                changedCanvasKeys: [
                  ...new Set([
                    ...Object.keys(
                      initialReopenedComparable?.canvasOption ?? {}
                    ),
                    ...Object.keys(
                      requestPayload?.canvasOption ?? {}
                    )
                  ])
                ]
                  .filter(
                    (key) =>
                      exactRoundTripHash(
                        initialReopenedComparable.canvasOption[key]
                      ) !==
                      exactRoundTripHash(
                        requestPayload.canvasOption[key]
                      )
                  )
                  .sort(),
                contentDifferences: summarizeContentDifferences(
                  initialReopenedComparable?.contentsJson,
                  requestPayload?.contentsJson,
                  targetObjectId
                )
              })}`
          );
        }
        savedPayload = requestPayload;
        savedMutation = mutation;
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
            `${WAVE1_CANARY_REDACTED_PROJECT_PATH}/upload-image`
        });
        await route.abort("blockedbyclient");
        return;
      }
    } catch (error) {
      unexpectedWrites.push({
        method,
        path: redactedProjectPath(path, canaryProjectId),
        reason:
          error instanceof Error ? error.message : String(error)
      });
      if (saveArmed) rejectPutResponse?.(error);
      await route.abort("blockedbyclient");
      return;
    }

    unexpectedWrites.push({
      method,
      path: redactedProjectPath(path, canaryProjectId),
      reason: "write-not-in-canary-allowlist"
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
    if (record.method === "PUT") {
      if (response.ok()) {
        resolvePutResponse?.(response.status());
      } else {
        rejectPutResponse?.(
          new Error(`canary-save-failed:${response.status()}`)
        );
      }
    }
  });

  let page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await waitForAuthentication(page, loginTimeoutMs);
  if (unexpectedWrites.length !== 0) {
    throw new Error(
      `pre-canary-unexpected-writes:${JSON.stringify(
        unexpectedWrites
      )}`
    );
  }

  if (typeof resumeRunId === "string") {
    const resumeResult = await page.evaluate(
      async (title) => {
        const query = new URLSearchParams({
          projectTitle: title,
          offset: "1",
          limit: "100",
          sortCondition: "createdAt",
          sortOrder: "desc"
        });
        const response = await fetch(
          `/api/project?${query.toString()}`,
          {
            credentials: "include",
            cache: "no-store"
          }
        );
        if (!response.ok) {
          return {
            ok: false,
            error: `canary-resume-query-failed:${response.status}`
          };
        }
        const body = await response.json();
        const exact = (body?.list ?? []).filter(
          (project) => project?.projectTitle === title
        );
        return {
          ok:
            exact.length === 1 &&
            typeof exact[0]?.projectId === "string" &&
            /^[A-Za-z0-9_-]{1,160}$/.test(exact[0].projectId),
          project: exact[0]?.projectId,
          exactMatchCount: exact.length
        };
      },
      submittedPayload.projectTitle
    );
    if (
      resumeResult?.ok !== true ||
      typeof resumeResult?.project !== "string" ||
      resumeResult.exactMatchCount !== 1
    ) {
      throw new Error(
        resumeResult?.error ?? "canary-resume-target-not-unique"
      );
    }
    canaryProjectId = resumeResult.project;
    recoveredCreation = {
      method: "POST",
      path: "/api/project",
      payloadHash: exactRoundTripHash(submittedPayload),
      recovery: "exact-title-and-payload-reopened",
      exactMatchCount: 1
    };
  } else {
    createArmed = true;
    const createResult = await page.evaluate(
      async ({ payload, title }) => {
        const query = new URLSearchParams({
          projectTitle: title,
          offset: "1",
          limit: "100",
          sortCondition: "createdAt",
          sortOrder: "desc"
        });
        const existingResponse = await fetch(
          `/api/project?${query.toString()}`,
          {
            credentials: "include",
            cache: "no-store"
          }
        );
        if (!existingResponse.ok) {
          return {
            ok: false,
            error:
              `canary-collision-check-failed:` +
              existingResponse.status
          };
        }
        const existingBody = await existingResponse.json();
        if (
          Array.isArray(existingBody?.list) &&
          existingBody.list.some(
            (project) => project?.projectTitle === title
          )
        ) {
          return { ok: false, error: "canary-title-collision" };
        }
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
            error: `canary-create-failed:${response.status}`,
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
      {
        payload: submittedPayload,
        title: submittedPayload.projectTitle
      }
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
        createResult?.error ?? "canary-create-response-invalid"
      );
    }
    canaryProjectId = createResult.project;
    allowedWrites[0].status = createResult.httpStatus;
    if (
      allowedWrites.length !== 1 ||
      allowedWrites[0].status < 200 ||
      allowedWrites[0].status >= 300
    ) {
      throw new Error("canary-create-write-boundary-invalid");
    }
  }

  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(canaryProjectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await waitForRenderedProject(
    page,
    submittedComparable.contentsJson.length
  );
  initialReopenedComparable =
    comparableFromProjectPayload(
      await getProjectComparable(page, canaryProjectId)
    );
  const initialComparison = compareRoundTripValues(
    submittedComparable,
    initialReopenedComparable
  );
  if (
    initialComparison.normalizedEqual !== true ||
    initialComparison.unexpectedDifferenceCount !== 0
  ) {
    throw new Error("canary-initial-reopen-mismatch");
  }
  const objectIds = initialReopenedComparable.contentsJson.map(
    (object) => object.id
  );
  const goldenInstructionText =
    goldenPayload.contentsJson.find(
      (object) => object.id === "instruction-main"
    )?.text ?? "";
  const initialRender = await captureRenderSnapshot(
    page,
    objectIds,
    initialReopenedComparable.projectTitle,
    goldenInstructionText
  );

  const fractionObjectIds =
    countWave1ToolObjects(
      initialReopenedComparable.contentsJson
    ).objectIdsByTool.get("NO03FM") ?? [];
  let target;
  for (const candidateId of fractionObjectIds) {
    const candidate = page.locator(
      `[id="${candidateId.replaceAll('"', '\\"')}"]`
    );
    const box = await candidate.boundingBox().catch(() => null);
    if (
      box &&
      box.width > 0 &&
      box.height > 0 &&
      box.x + box.width / 2 > 0 &&
      box.x + box.width / 2 < 1600 &&
      box.y + box.height / 2 > 56 &&
      box.y + box.height / 2 < 1000
    ) {
      targetObjectId = candidateId;
      target = { locator: candidate, box };
      break;
    }
  }
  if (!target || typeof targetObjectId !== "string") {
    throw new Error("visible-canary-fraction-unavailable");
  }
  const transformBefore =
    await target.locator.getAttribute("transform");
  const centerX = target.box.x + target.box.width / 2;
  const centerY = target.box.y + target.box.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 60, centerY + 20, {
    steps: 12
  });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const transformAfter =
    await target.locator.getAttribute("transform");
  if (
    typeof transformBefore !== "string" ||
    typeof transformAfter !== "string" ||
    transformBefore === transformAfter
  ) {
    throw new Error("canary-fraction-client-move-not-observed");
  }

  const saveControl = page
    .locator("#top-toolbar div.cursor-pointer")
    .filter({ hasText: /^\s*저장\s*$/ })
    .first();
  if (!(await saveControl.isVisible().catch(() => false))) {
    throw new Error("canary-save-control-unavailable");
  }
  saveArmed = true;
  await saveControl.click();
  const putStatus = await Promise.race([
    putResponsePromise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("canary-save-response-timeout")),
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
    throw new Error("canary-save-write-boundary-invalid");
  }
  await page.waitForTimeout(1000);
  await page.close();

  page = await context.newPage();
  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(canaryProjectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await waitForRenderedProject(
    page,
    submittedComparable.contentsJson.length
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
    throw new Error("canary-saved-reopen-mismatch");
  }
  const finalRender = await captureRenderSnapshot(
    page,
    objectIds,
    finalReopenedComparable.projectTitle,
    goldenInstructionText
  );
  if (unexpectedWrites.length !== 0) {
    throw new Error(
      `canary-unexpected-writes:${JSON.stringify(unexpectedWrites)}`
    );
  }

  const artifacts = {
    schemaVersion: "1.0.0",
    artifactId: WAVE1_CANARY_ARTIFACT_ID,
    runId,
    submittedPayload,
    submittedComparable,
    initialReopenedComparable,
    savedPayload,
    savedComparable: savedMutation.savedComparable,
    finalReopenedComparable,
    render: {
      initial: initialRender,
      final: finalRender
    },
    network: {
      allowedWrites,
      ...(recoveredCreation ? { recoveredCreation } : {}),
      blockedWrites,
      blockedExternalWrites,
      unexpectedWrites
    }
  };
  assertNoSensitiveData(artifacts);
  const toolResults = toolResultsFromArtifacts(artifacts);
  const finalComparableHash = exactRoundTripHash(
    finalReopenedComparable
  );
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: WAVE1_CANARY_PROBE_ID,
    observedAt: observedAt.toISOString(),
    provenance: {
      source: "current-golden-approved-canary",
      runId,
      goldenFixtureId: goldenFixture.fixtureId,
      goldenFixtureVersion: goldenFixture.fixtureVersion,
      goldenPayloadHash: goldenFixture.invariants.payloadHash,
      submittedPayloadHash: exactRoundTripHash(submittedPayload),
      artifactsHash: exactRoundTripHash(artifacts)
    },
    claims: buildWave1CanaryClaims(
      toolResults,
      finalComparableHash
    ),
    toolResults,
    roundTrip: {
      numericTolerance: ROUND_TRIP_NUMERIC_TOLERANCE,
      initialReopen: projectComparison(initialComparison),
      savedReopen: projectComparison(persistenceComparison)
    },
    render: {
      submittedObjectCount: submittedComparable.contentsJson.length,
      initialItemGroupCount: initialRender.itemGroupCount,
      finalItemGroupCount: finalRender.itemGroupCount
    },
    interaction: {
      toolKey: "NO03FM",
      targetObjectId,
      changedObjectIds: savedMutation.changedObjectIds,
      changedFields: savedMutation.changedFields,
      delta: savedMutation.delta,
      editorRehydration: savedMutation.editorRehydration,
      automaticSaveMetadataFields:
        savedMutation.automaticSaveMetadataFields,
      clientTransformChanged: transformBefore !== transformAfter
    },
    writeBoundary: {
      mode: "one-create-one-save",
      creationEvidenceMode:
        typeof resumeRunId === "string"
          ? "recovered-exact-server-project"
          : "observed-live-post",
      allowedCreateCount: 1,
      allowedSaveCount: 1,
      observedAllowedWriteCount: allowedWrites.length,
      blockedAncillaryWriteCount: blockedWrites.length,
      blockedExternalWriteCount: blockedExternalWrites.length,
      unexpectedWriteCount: 0
    }
  };
  assertNoSensitiveData(evidence);
  const validation = validateWave1CanaryEvidence({
    evidence,
    artifacts,
    goldenFixture
  });
  if (!validation.ok) {
    throw new Error(
      `canary-evidence-invalid:${JSON.stringify(
        validation.issues
      )}`
    );
  }
  mkdirSync(dirname(outputPath), {
    recursive: true,
    mode: 0o700
  });
  mkdirSync(dirname(artifactsPath), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(artifactsPath, stableJson(artifacts), {
    encoding: "utf8",
    mode: 0o600
  });
  writeFileSync(outputPath, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
  process.stdout.write(
    `PASS current-golden canary ${submittedComparable.contentsJson.length} objects, one create, one save ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
