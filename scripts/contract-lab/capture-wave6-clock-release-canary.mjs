#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import {
  resolveCurriculum
} from "../../packages/curriculum/dist/index.js";
import {
  compileActivity,
  getLayoutPreset,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import {
  ManagedChromeRuntime
} from "../../packages/managed-browser/dist/index.js";
import {
  assertCognitiveManifestBound,
  clockHourHandBoundaryBlueprint
} from "../../packages/templates/dist/index.js";
import {
  prepareRegisteredActivityForEnvelopeValidation
} from "../../packages/templates/dist/registry.js";
import {
  validateForCreation
} from "../../packages/validator/dist/index.js";
import {
  acquireManagedProfileLock,
  defaultRawRoot,
  defaultResearchRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { stableJson } from "./lib/normalize.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";

const generatedAt = "2026-07-31T10:00:00.000Z";
const rawOutput = join(
  defaultRawRoot,
  "wave6-clock-release-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave6-clock-release-canary.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "wave6",
  "clock-boundary.png"
);

function rotationAngle(transform) {
  const match = String(transform ?? "").match(
    /rotate\(([-0-9.]+)/
  );
  if (!match) {
    throw new Error(`clock-rotation-unreadable:${transform}`);
  }
  return Number(match[1]);
}

function buildPreparedCase() {
  const curriculum = resolveCurriculum("[2수03-07]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "wave6-clock-release-canary-v2",
    supported: true,
    templateId: clockHourHandBoundaryBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 2,
    standardCode: curriculum.record.code,
    learningGoal:
      clockHourHandBoundaryBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 2,
    difficulty: "normal",
    manipulation: "clock-hour-hand-boundary-drag",
    rationale: [
      "Wave 6 기어식 시계 오개념 갈등 create-only canary입니다."
    ],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    recommendation,
    {
      seed: "wave6-clock-release-v2",
      generatedAt,
      activityId: "wave6-clock-release-v2"
    }
  );
  assertCognitiveManifestBound(plan.blueprint);
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  const validation = validateForCreation(
    resolved,
    compiled,
    new Date(generatedAt)
  );
  if (!validation.canCreate) {
    throw new Error(
      `wave6-clock-local-validation-failed:${validation.issues
        .map((issue) => issue.code)
        .join(",")}`
    );
  }
  return { plan, resolved, compiled, validation };
}

let runtime;
let previewContext;
let authSession;
let releaseLock;
let blockedProjectWriteRequestCount = 0;
try {
  const prepared = buildPreparedCase();
  const stateDirectory = resolveStateDirectory();
  releaseLock = acquireManagedProfileLock(stateDirectory);
  authSession = await createLiveAuthHeadlessSession(stateDirectory);

  let creation;
  let reusedExisting = false;
  if (existsSync(rawOutput)) {
    const previous = JSON.parse(readFileSync(rawOutput, "utf8"));
    if (
      previous.payloadHash === prepared.compiled.payloadHash &&
      previous.creation?.ok === true &&
      typeof previous.creation.editorUrl === "string"
    ) {
      creation = previous.creation;
      reusedExisting = true;
    }
  }
  if (!creation) {
    runtime = new ManagedChromeRuntime({
      userDataDirectory: join(
        stateDirectory,
        "chrome-profile"
      ),
      launcher: authSession.launcher,
      headless: true
    });
    creation = await runtime.createProject(
      prepared.compiled.payload,
      prepared.compiled.payloadHash
    );
    await runtime.close();
    runtime = undefined;
    if (!creation.ok) {
      throw new Error(
        `wave6-clock-create-failed:${creation.errorCode}`
      );
    }
    mkdirSync(dirname(rawOutput), {
      recursive: true,
      mode: 0o700
    });
    writeFileSync(
      rawOutput,
      stableJson({
        schemaVersion: "1.0.0",
        observedAt: new Date().toISOString(),
        payloadHash: prepared.compiled.payloadHash,
        creation
      }),
      { encoding: "utf8", mode: 0o600 }
    );
  }

  previewContext = await authSession.newContext({
    viewport: { width: 1630, height: 1900 }
  });
  await previewContext.route("**/*", async (route) => {
    const method = route.request().method().toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      await route.continue();
      return;
    }
    if (
      new URL(route.request().url()).pathname.startsWith(
        "/api/project"
      )
    ) {
      blockedProjectWriteRequestCount += 1;
    }
    await route.abort();
  });
  const page = await previewContext.newPage();
  await page.goto(creation.editorUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[id$="-clock"]').length === 2 &&
      Array.from(
        document.querySelectorAll('[id*="-position-card-"]')
      ).filter(
        (element) => !element.id.endsWith("-backdrop")
      ).length === 10,
    undefined,
    { timeout: 30_000 }
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const persistedShape = await page.evaluate(
    async (projectId) => {
      const response = await fetch(
        `/api/project/${encodeURIComponent(projectId)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(
          `project-reopen-failed:${response.status}`
        );
      }
      const body = await response.json();
      const contents = body?.contentsJson ?? [];
      const clocks = contents.filter(
        (object) => object?.svgId === "SM02AD-01"
      );
      return {
        objectCount: contents.length,
        clockCount: clocks.length,
        gearedClockCount: clocks.filter(
          (clock) => clock?.type === "geared"
        ).length,
        stoppedClockCount: clocks.filter(
          (clock) => clock?.isWorking === false
        ).length,
        initialMinuteCount: clocks.filter(
          (clock) => clock?.minutes === 0
        ).length,
        candidateTextCount: contents.filter(
          (object) =>
            object?.svgId === "input-text" &&
            String(object?.id ?? "").includes(
              "-position-card-"
            )
        ).length,
        clockModuleActive:
          body?.canvasOption?.moduleArr?.Unit03?.SM02AD ===
          true
      };
    },
    creation.projectId
  );
  const domShape = await page.evaluate(() => {
    const clocks = Array.from(
      document.querySelectorAll('[id$="-clock"]')
    );
    return {
      clockCount: clocks.length,
      visibleClockCount: clocks.filter((clock) => {
        const bounds = clock.getBoundingClientRect();
        const center = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2
        );
        return center?.closest('[id$="-clock"]') === clock;
      }).length,
      gearedClockCount: clocks.filter(
        (clock) =>
          clock.querySelector(".geared-clock") !== null
      ).length,
      candidateTextCount: Array.from(
        document.querySelectorAll(
          '[id*="-position-card-"]'
        )
      ).filter(
        (element) => !element.id.endsWith("-backdrop")
      ).length,
      predictionBoxCount:
        document.querySelectorAll(
          '[id$="-prediction-box"]'
        ).length,
      explanationBoxCount:
        document.querySelectorAll(
          '[id$="-explanation-box"]'
        ).length
    };
  });
  const itemCount = prepared.resolved.items.length;
  if (
    persistedShape.objectCount !==
      prepared.compiled.payload.contentsJson.length ||
    persistedShape.clockCount !== itemCount ||
    persistedShape.gearedClockCount !== itemCount ||
    persistedShape.stoppedClockCount !== itemCount ||
    persistedShape.initialMinuteCount !== itemCount ||
    persistedShape.candidateTextCount !== itemCount * 5 ||
    !persistedShape.clockModuleActive ||
    domShape.clockCount !== itemCount ||
    domShape.visibleClockCount !== itemCount ||
    domShape.gearedClockCount !== itemCount ||
    domShape.candidateTextCount !== itemCount * 5 ||
    domShape.predictionBoxCount !== itemCount ||
    domShape.explanationBoxCount !== itemCount
  ) {
    throw new Error(
      `wave6-clock-reopen-shape-mismatch:${JSON.stringify({
        persistedShape,
        domShape
      })}`
    );
  }

  const interactionItem = prepared.resolved.items[0];
  const clockId = `${interactionItem.id}-clock`;
  const clockBounds = await page
    .locator(`#${clockId} .geared-clock`)
    .boundingBox();
  const minutePointer = await page
    .locator(`#${clockId} .minute-handle`)
    .evaluate((handle) => {
      const bounds = handle.getBoundingClientRect();
      for (let row = 1; row <= 4; row += 1) {
        for (let column = 1; column <= 4; column += 1) {
          const x =
            bounds.left + (bounds.width * column) / 5;
          const y =
            bounds.top + (bounds.height * row) / 5;
          if (
            document
              .elementFromPoint(x, y)
              ?.classList.contains("minute-handle")
          ) {
            return { x, y };
          }
        }
      }
      return null;
    });
  if (!clockBounds || !minutePointer) {
    throw new Error("wave6-clock-minute-drag-target-missing");
  }
  const targetMinute = Number(
    interactionItem.values.targetMinute
  );
  const startHour = Number(
    interactionItem.values.startHour
  );
  const targetMinuteAngle = targetMinute * 6;
  const targetHourAngle =
    (startHour + targetMinute / 60) * 30;
  const centerX = clockBounds.x + clockBounds.width / 2;
  const centerY = clockBounds.y + clockBounds.height / 2;
  const radius =
    Math.min(clockBounds.width, clockBounds.height) * 0.34;
  await page.mouse.move(minutePointer.x, minutePointer.y);
  await page.mouse.down();
  for (let step = 1; step <= 72; step += 1) {
    const angle =
      ((targetMinuteAngle * step) / 72 / 180) * Math.PI;
    await page.mouse.move(
      centerX + Math.sin(angle) * radius,
      centerY - Math.cos(angle) * radius
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(700);
  const interactionDom = await page.evaluate((id) => {
    const clock = document.getElementById(id);
    return {
      minuteTransform: clock
        ?.querySelector(".minute-handle")
        ?.getAttribute("transform"),
      hourTransform: clock
        ?.querySelector(".hour-handle")
        ?.getAttribute("transform")
    };
  }, clockId);
  const afterMinuteAngle = rotationAngle(
    interactionDom.minuteTransform
  );
  const afterHourAngle = rotationAngle(
    interactionDom.hourTransform
  );
  const handAngleResidual = Math.abs(
    afterHourAngle - targetHourAngle
  );
  if (
    Math.abs(afterMinuteAngle - targetMinuteAngle) > 1 ||
    handAngleResidual > 0.6 ||
    blockedProjectWriteRequestCount !== 0
  ) {
    throw new Error(
      `wave6-clock-interaction-mismatch:${JSON.stringify({
        interactionDom,
        targetMinuteAngle,
        targetHourAngle,
        blockedProjectWriteRequestCount
      })}`
    );
  }

  mkdirSync(dirname(previewOutput), {
    recursive: true,
    mode: 0o700
  });
  await page.screenshot({
    path: previewOutput,
    fullPage: true
  });
  const interactionShape = {
    action: "drag-minute-hand-to-generated-minute",
    itemId: interactionItem.id,
    startHour,
    targetMinute,
    afterMinuteAngle,
    afterHourAngle,
    handAngleResidual,
    transientOnly: true,
    existingProjectWriteCount: 0
  };
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: "wave6-clock-release-canary-v2",
    observedAt: new Date().toISOString(),
    status: "pass",
    blueprintId: prepared.plan.blueprint.id,
    blueprintVersion: prepared.plan.blueprint.version,
    blueprintContentHash:
      prepared.plan.blueprint.contentHash,
    layoutPresetContentHash: sha256Hex(
      getLayoutPreset(
        prepared.plan.blueprint.layout.tokenSet
      )
    ),
    payloadHash: prepared.compiled.payloadHash,
    projectReferenceHash: sha256Hex(creation.projectId),
    createRequestCount: 1,
    existingProjectWriteCount: 0,
    localValidationIssueCount:
      prepared.validation.issues.length,
    editorPath: "/ko/view/<redacted-project>",
    categoryUnit: "Unit03",
    releasedTools: ["SM02AD"],
    problemCount: itemCount,
    persistedShape,
    reopenShape: domShape,
    interactionShape,
    previewPath:
      ".mathcanvas-contract-lab/previews/wave6/clock-boundary.png",
    reusedExisting
  };
  writeFileSync(
    evidenceOutput,
    stableJson(evidence),
    { encoding: "utf8", mode: 0o600 }
  );
  writeFileSync(
    rawOutput,
    stableJson({
      schemaVersion: "1.0.0",
      observedAt: evidence.observedAt,
      payloadHash: prepared.compiled.payloadHash,
      creation
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `PASS clock release canary ${creation.editorUrl}\n`
  );
  process.stdout.write(`PREVIEW ${previewOutput}\n`);
} finally {
  await runtime?.close().catch(() => undefined);
  await previewContext?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
  releaseLock?.();
}
