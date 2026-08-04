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
  elapsedTimeClockPairBlueprint
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
import { assertPostInteractionVisual } from "./lib/post-interaction-visual.mjs";

const generatedAt = "2026-07-31T10:00:00.000Z";
const rawOutput = join(
  defaultRawRoot,
  "wave7-elapsed-time-release-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave7-elapsed-time-release-canary.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "wave7",
  "elapsed-time.png"
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

function modulo(value, divisor = 360) {
  return ((value % divisor) + divisor) % divisor;
}

function circularResidual(actual, expected) {
  const delta = Math.abs(
    modulo(actual) - modulo(expected)
  );
  return Math.min(delta, 360 - delta);
}

function buildPreparedCase() {
  const curriculum = resolveCurriculum("[2수03-08]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "wave7-elapsed-time-release-canary-v1",
    supported: true,
    templateId: elapsedTimeClockPairBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 2,
    standardCode: curriculum.record.code,
    learningGoal:
      elapsedTimeClockPairBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 2,
    difficulty: "normal",
    manipulation: "elapsed-time-clock-pair-drag",
    rationale: [
      "Wave 7 걸린 시간 60진법 갈등 create-only canary입니다."
    ],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    recommendation,
    {
      seed: "wave7-elapsed-time-release-v1",
      generatedAt,
      activityId: "wave7-elapsed-time-release-v1"
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
      `wave7-elapsed-time-local-validation-failed:${validation.issues
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
        `wave7-elapsed-time-create-failed:${creation.errorCode}`
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
      document.querySelectorAll(
        '[id$="-clock-start"], [id$="-clock-end"]'
      ).length === 4 &&
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

  const expectedClockTimes = prepared.resolved.items.flatMap(
    (item) => [
      {
        id: `${item.id}-clock-start`,
        hours: Number(item.values.startHour),
        minutes: Number(item.values.startMinute)
      },
      {
        id: `${item.id}-clock-end`,
        hours: Number(item.values.endHour),
        minutes: Number(item.values.endMinute)
      }
    ]
  );
  const persistedShape = await page.evaluate(
    async ({ projectId, expectedClockTimes }) => {
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
        configuredTimeMatchCount: clocks.filter((clock) => {
          const expected = expectedClockTimes.find(
            (candidate) => candidate.id === clock?.id
          );
          return (
            expected?.hours === clock?.hours &&
            expected?.minutes === clock?.minutes
          );
        }).length,
        startClockCount: clocks.filter(
          (clock) =>
            String(clock?.id ?? "").endsWith("-clock-start")
        ).length,
        endClockCount: clocks.filter(
          (clock) =>
            String(clock?.id ?? "").endsWith("-clock-end")
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
    {
      projectId: creation.projectId,
      expectedClockTimes
    }
  );
  const domShape = await page.evaluate(() => {
    const clocks = Array.from(
      document.querySelectorAll(
        '[id$="-clock-start"], [id$="-clock-end"]'
      )
    );
    return {
      clockCount: clocks.length,
      visibleClockCount: clocks.filter((clock) => {
        const bounds = clock.getBoundingClientRect();
        const center = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2
        );
        return (
          center?.closest(
            '[id$="-clock-start"], [id$="-clock-end"]'
          ) === clock
        );
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
    persistedShape.clockCount !== itemCount * 2 ||
    persistedShape.gearedClockCount !== itemCount * 2 ||
    persistedShape.stoppedClockCount !== itemCount * 2 ||
    persistedShape.configuredTimeMatchCount !== itemCount * 2 ||
    persistedShape.startClockCount !== itemCount ||
    persistedShape.endClockCount !== itemCount ||
    persistedShape.candidateTextCount !== itemCount * 5 ||
    !persistedShape.clockModuleActive ||
    domShape.clockCount !== itemCount * 2 ||
    domShape.visibleClockCount !== itemCount * 2 ||
    domShape.gearedClockCount !== itemCount * 2 ||
    domShape.candidateTextCount !== itemCount * 5 ||
    domShape.predictionBoxCount !== itemCount ||
    domShape.explanationBoxCount !== itemCount
  ) {
    throw new Error(
      `wave7-elapsed-time-reopen-shape-mismatch:${JSON.stringify({
        persistedShape,
        domShape
      })}`
    );
  }

  const interactionItem = prepared.resolved.items[0];
  const itemEmissions = prepared.resolved.emissions.filter(
    (emission) => emission.itemId === interactionItem.id
  );
  const startClockEmission = itemEmissions.find(
    (emission) => emission.role === "clock-start"
  );
  const endClockEmission = itemEmissions.find(
    (emission) => emission.role === "clock-end"
  );
  const workPanelEmission = itemEmissions.find(
    (emission) => emission.role === "work-panel"
  );
  if (!startClockEmission || !endClockEmission || !workPanelEmission) {
    throw new Error("wave7-elapsed-time-visual-role-missing");
  }
  const clockId = `${interactionItem.id}-clock-start`;
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
    throw new Error("wave7-elapsed-time-minute-drag-target-missing");
  }
  const startHour = Number(
    interactionItem.values.startHour
  );
  const startMinute = Number(
    interactionItem.values.startMinute
  );
  const endHour = Number(interactionItem.values.endHour);
  const endMinute = Number(interactionItem.values.endMinute);
  const elapsedMinutes = Number(
    interactionItem.values.elapsedMinutes
  );
  const startMinuteAngle = startMinute * 6;
  const endMinuteAngle = endMinute * 6;
  const startHourAngle =
    ((startHour % 12) + startMinute / 60) * 30;
  const endHourAngle =
    ((endHour % 12) + endMinute / 60) * 30;
  const centerX = clockBounds.x + clockBounds.width / 2;
  const centerY = clockBounds.y + clockBounds.height / 2;
  const radius =
    Math.min(clockBounds.width, clockBounds.height) * 0.34;
  const beforeInteractionDom = await page.evaluate((id) => {
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
  const beforeMinuteAngle = rotationAngle(
    beforeInteractionDom.minuteTransform
  );
  const beforeHourAngle = rotationAngle(
    beforeInteractionDom.hourTransform
  );
  await page.mouse.move(minutePointer.x, minutePointer.y);
  await page.mouse.down();
  for (let step = 1; step <= 72; step += 1) {
    const angle =
      ((startMinuteAngle +
        (elapsedMinutes * 6 * step) / 72) /
        180) *
      Math.PI;
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
  const endClockBounds = await page
    .locator(`#${endClockEmission.id} .geared-clock`)
    .boundingBox();
  const workPanelBounds = await page
    .locator(`[id="${workPanelEmission.id}"]`)
    .boundingBox();
  if (!endClockBounds || !workPanelBounds) {
    throw new Error("wave7-elapsed-time-visual-box-missing");
  }
  const canvasScale =
    workPanelBounds.width / workPanelEmission.bounds.width;
  const clockRenderedSizeResidual = Math.max(
    Math.abs(
      clockBounds.width / canvasScale - startClockEmission.bounds.width
    ),
    Math.abs(
      clockBounds.height / canvasScale - startClockEmission.bounds.height
    ),
    Math.abs(
      endClockBounds.width / canvasScale - endClockEmission.bounds.width
    ),
    Math.abs(
      endClockBounds.height / canvasScale - endClockEmission.bounds.height
    )
  );
  const visualMetrics = assertPostInteractionVisual({
    gapBoxes: [clockBounds, endClockBounds],
    referenceBoxes: [endClockBounds],
    occluders: [clockBounds],
    errorCode: "wave7-elapsed-time-post-interaction-visual-invalid"
  });
  const beforeMinuteResidual = circularResidual(
    beforeMinuteAngle,
    startMinuteAngle
  );
  const beforeHourResidual = circularResidual(
    beforeHourAngle,
    startHourAngle
  );
  const minuteAngleResidual = circularResidual(
    afterMinuteAngle,
    endMinuteAngle
  );
  const handAngleResidual = circularResidual(
    afterHourAngle,
    endHourAngle
  );
  if (
    beforeMinuteResidual > 1 ||
    beforeHourResidual > 0.6 ||
    minuteAngleResidual > 1 ||
    handAngleResidual > 0.6 ||
    endHour === startHour ||
    blockedProjectWriteRequestCount !== 0
  ) {
    throw new Error(
      `wave7-elapsed-time-interaction-mismatch:${JSON.stringify({
        interactionDom,
        beforeInteractionDom,
        startMinuteAngle,
        startHourAngle,
        endMinuteAngle,
        endHourAngle,
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
    action: "drag-start-clock-to-end-time",
    itemId: interactionItem.id,
    startHour,
    startMinute,
    endHour,
    endMinute,
    elapsedMinutes,
    beforeMinuteAngle,
    beforeHourAngle,
    afterMinuteAngle,
    afterHourAngle,
    beforeMinuteResidual,
    beforeHourResidual,
    minuteAngleResidual,
    handAngleResidual,
    clockRenderedSizeResidual,
    ...visualMetrics,
    transientOnly: true,
    existingProjectWriteCount: 0
  };
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: "wave7-elapsed-time-release-canary-v1",
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
      ".mathcanvas-contract-lab/previews/wave7/elapsed-time.png",
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
    `PASS elapsed time release canary ${creation.editorUrl}\n`
  );
  process.stdout.write(`PREVIEW ${previewOutput}\n`);
} finally {
  await runtime?.close().catch(() => undefined);
  await previewContext?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
  releaseLock?.();
}
