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
  brokenRulerLengthBlueprint,
  prepareRegisteredActivityForEnvelopeValidation
} from "../../packages/templates/dist/index.js";
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
import {
  createLiveAuthHeadlessSession
} from "./lib/live-auth-headless.mjs";

const generatedAt = "2026-08-01T01:00:00.000Z";
const probeId = "wave13-broken-ruler-release-canary-v1";
const seed = "wave13-broken-ruler-release-v1";
const rawOutput = join(
  defaultRawRoot,
  "wave13-broken-ruler-release-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave13-broken-ruler-release-canary.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "wave13",
  "broken-ruler-length.png"
);

function buildPreparedCase() {
  const curriculum = resolveCurriculum("[2수03-10]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: probeId,
    supported: true,
    templateId: brokenRulerLengthBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 2,
    standardCode: curriculum.record.code,
    learningGoal: brokenRulerLengthBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount:
      brokenRulerLengthBlueprint.generator.parameters.problemCount,
    difficulty: "normal",
    manipulation: "length-unit-iteration-drag",
    rationale: [
      "Wave 13 분할선 없는 연필과 1 cm 단위 반복의 create-only canary입니다."
    ],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    recommendation,
    { seed, generatedAt, activityId: seed }
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
      `wave13-local-validation-failed:${validation.issues
        .map((entry) => entry.code)
        .join(",")}`
    );
  }
  return { plan, resolved, compiled, validation };
}

async function dragCenter(page, source, target) {
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(350);
}

function centerDistance(left, right) {
  return Math.hypot(
    left.x + left.width / 2 - (right.x + right.width / 2),
    left.y + left.height / 2 - (right.y + right.height / 2)
  );
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
  authSession = await createLiveAuthHeadlessSession(
    stateDirectory
  );

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
      userDataDirectory: join(stateDirectory, "chrome-profile"),
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
        `wave13-create-failed:${creation.errorCode}`
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
    viewport: { width: 1630, height: 2300 }
  });
  await previewContext.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      await route.continue();
      return;
    }
    if (
      new URL(request.url()).pathname.startsWith("/api/project")
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
    (itemCount) =>
      document.querySelectorAll('[id$="-left-strip"]').length === itemCount &&
      document.querySelectorAll('[id$="-right-strip"]').length === itemCount &&
      document.querySelectorAll('[id$="-unit-ruler"]').length === itemCount &&
      Array.from(
        document.querySelectorAll('[id*="-position-card-"]')
      ).filter(
        (element) => !element.id.endsWith("-backdrop")
      ).length === itemCount * 5,
    prepared.resolved.items.length,
    { timeout: 30_000 }
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const expectedItems = prepared.resolved.items.map((item) => ({
    id: item.id,
    totalUnits: Number(item.values.totalUnits),
    startMark: Number(item.values.startMark),
    endMark: Number(item.values.endMark),
    lengthCm: Number(item.values.lengthCm)
  }));
  const persistedShape = await page.evaluate(
    async ({ projectId, expectedItems }) => {
      const response = await fetch(
        `/api/project/${encodeURIComponent(projectId)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`project-reopen-failed:${response.status}`);
      }
      const body = await response.json();
      const contents = body?.contentsJson ?? [];
      const lockIds = new Set(
        (body?.canvasOption?.lockIds ?? []).flat()
      );
      const pencils = contents.filter((object) =>
        String(object?.id ?? "").endsWith("-left-strip")
      );
      const sticks = contents.filter((object) =>
        String(object?.id ?? "").endsWith("-right-strip")
      );
      const rulers = contents.filter((object) =>
        String(object?.id ?? "").endsWith("-unit-ruler")
      );
      return {
        objectCount: contents.length,
        pencilCount: pencils.length,
        undividedPencilCount: pencils.filter(
          (pencil) =>
            pencil?.svgId === "drawElem" &&
            pencil?.type === "rect" &&
            pencil?.divider === undefined &&
            pencil?.count === undefined
        ).length,
        pencilPointMatchCount: pencils.filter((pencil) => {
          const expected = expectedItems.find(
            (item) => `${item.id}-left-strip` === pencil?.id
          );
          if (!expected) return false;
          const unit = 720 / expected.totalUnits;
          return (
            pencil?.point1?.[0] === 330 + unit * expected.startMark &&
            pencil?.point2?.[0] === 330 + unit * expected.endMark
          );
        }).length,
        lockedPencilCount: pencils.filter((pencil) =>
          lockIds.has(pencil?.id)
        ).length,
        unitStickCount: sticks.length,
        configuredUnitStickCount: sticks.filter((stick) => {
          const expected = expectedItems.find(
            (item) => `${item.id}-right-strip` === stick?.id
          );
          return (
            expected &&
            stick?.count === 1 &&
            stick?.divider === expected.totalUnits &&
            stick?.isEyeOn === false
          );
        }).length,
        unlockedUnitStickCount: sticks.filter(
          (stick) => !lockIds.has(stick?.id)
        ).length,
        unitRulerCount: rulers.length,
        configuredUnitRulerCount: rulers.filter((ruler) => {
          const expected = expectedItems.find(
            (item) => `${item.id}-unit-ruler` === ruler?.id
          );
          return (
            expected &&
            ruler?.count === expected.totalUnits &&
            ruler?.divider === expected.totalUnits &&
            ruler?.isEyeOn === false
          );
        }).length,
        lockedRulerCount: rulers.filter((ruler) =>
          lockIds.has(ruler?.id)
        ).length,
        transparentLaneCount: contents.filter(
          (object) =>
            String(object?.id ?? "").endsWith("-join-lane") &&
            object?.fill === "none"
        ).length,
        candidateTextCount: contents.filter(
          (object) =>
            String(object?.id ?? "").includes("-position-card-") &&
            !String(object?.id ?? "").endsWith("-backdrop") &&
            /^\d+$/.test(String(object?.text ?? ""))
        ).length,
        fractionModuleActive:
          body?.canvasOption?.moduleArr?.Unit01?.NO03FM === true
      };
    },
    { projectId: creation.projectId, expectedItems }
  );

  const domShape = await page.evaluate(() => {
    const visible = (element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    };
    const countVisible = (selector) => {
      const elements = Array.from(document.querySelectorAll(selector));
      return [elements.length, elements.filter(visible).length];
    };
    const [pencilCount, visiblePencilCount] = countVisible(
      '[id$="-left-strip"]'
    );
    const [unitStickCount, visibleUnitStickCount] = countVisible(
      '[id$="-right-strip"]'
    );
    const [unitRulerCount, visibleUnitRulerCount] = countVisible(
      '[id$="-unit-ruler"]'
    );
    return {
      pencilCount,
      visiblePencilCount,
      unitStickCount,
      visibleUnitStickCount,
      unitRulerCount,
      visibleUnitRulerCount,
      joinLaneCount:
        document.querySelectorAll('[id$="-join-lane"]').length,
      predictionBoxCount:
        document.querySelectorAll('[id$="-prediction-box"]').length,
      explanationBoxCount:
        document.querySelectorAll('[id$="-explanation-box"]').length,
      questionCount:
        document.querySelectorAll('[id$="-question"]').length,
      candidateTextCount: Array.from(
        document.querySelectorAll('[id*="-position-card-"]')
      ).filter(
        (element) => !element.id.endsWith("-backdrop")
      ).length
    };
  });

  const interactionItem = prepared.resolved.items[0];
  const pencilId = `${interactionItem.id}-left-strip`;
  const stickId = `${interactionItem.id}-right-strip`;
  const rulerId = `${interactionItem.id}-unit-ruler`;
  const laneId = `${interactionItem.id}-join-lane`;
  const beforePencil = await page.locator(`#${pencilId}`).boundingBox();
  const beforeStick = await page.locator(`#${stickId}`).boundingBox();
  const beforeRuler = await page.locator(`#${rulerId}`).boundingBox();
  const lane = await page.locator(`#${laneId}`).boundingBox();
  if (!beforePencil || !beforeStick || !beforeRuler || !lane) {
    throw new Error("wave13-interaction-target-missing");
  }
  const totalUnits = Number(interactionItem.values.totalUnits);
  const startMark = Number(interactionItem.values.startMark);
  const endMark = Number(interactionItem.values.endMark);
  const lengthCm = Number(interactionItem.values.lengthCm);
  const expectedCellWidth = beforeRuler.width / totalUnits;

  await dragCenter(page, beforePencil, {
    x: beforePencil.x + beforePencil.width / 2 + 60,
    y: beforePencil.y + beforePencil.height / 2 + 30
  });
  await page.keyboard.press("Escape");
  const afterLockedPencil = await page
    .locator(`#${pencilId}`)
    .boundingBox();
  await dragCenter(page, beforeRuler, {
    x: beforeRuler.x + beforeRuler.width / 2 + 60,
    y: beforeRuler.y + beforeRuler.height / 2 + 30
  });
  await page.keyboard.press("Escape");
  const afterLockedRuler = await page
    .locator(`#${rulerId}`)
    .boundingBox();
  if (!afterLockedPencil || !afterLockedRuler) {
    throw new Error("wave13-locked-object-missing-after-drag");
  }

  const iterationBounds = [];
  let currentStick = beforeStick;
  for (let index = 0; index < lengthCm; index += 1) {
    await dragCenter(page, currentStick, {
      x:
        beforePencil.x +
        expectedCellWidth * index +
        currentStick.width / 2,
      y: lane.y + lane.height - currentStick.height / 2 - 7
    });
    await page.keyboard.press("Escape");
    await page.mouse.click(40, 300);
    await page.waitForTimeout(150);
    const placedStick = await page.locator(`#${stickId}`).boundingBox();
    if (!placedStick) break;
    iterationBounds.push(placedStick);
    currentStick = placedStick;
  }
  const afterStick = iterationBounds.at(-1);
  if (!afterStick) {
    throw new Error("wave13-unit-stick-missing-after-drag");
  }

  const expectedPencilLeft =
    beforeRuler.x + expectedCellWidth * startMark;
  const expectedPencilRight =
    beforeRuler.x + expectedCellWidth * endMark;
  const pencilLeftResidual = Math.abs(
    beforePencil.x - expectedPencilLeft
  );
  const pencilRightResidual = Math.abs(
    beforePencil.x + beforePencil.width - expectedPencilRight
  );
  const pencilWidthResidual = Math.abs(
    beforePencil.width - expectedCellWidth * lengthCm
  );
  const stickWidthResidual = Math.abs(
    afterStick.width - expectedCellWidth
  );
  const iterationLeftResiduals = iterationBounds.map(
    (bounds, index) =>
      Math.abs(
        bounds.x -
          (beforePencil.x + expectedCellWidth * index)
      )
  );
  const stickLeftResidual = iterationLeftResiduals[0] ?? Infinity;
  const maxIterationLeftResidual = Math.max(
    ...iterationLeftResiduals
  );
  const finalStickRightResidual = Math.abs(
    afterStick.x +
      afterStick.width -
      (beforePencil.x + beforePencil.width)
  );
  const stickVerticalContainmentResidual = Math.max(
    ...iterationBounds.map((bounds) =>
      Math.max(
        0,
        lane.y - bounds.y,
        bounds.y + bounds.height - (lane.y + lane.height)
      )
    )
  );
  const lockedPencilResidual = centerDistance(
    beforePencil,
    afterLockedPencil
  );
  const lockedRulerResidual = centerDistance(
    beforeRuler,
    afterLockedRuler
  );
  const stickMoveDistance = centerDistance(beforeStick, afterStick);
  const lowerBandHeight =
    lane.y + lane.height -
    (beforePencil.y + beforePencil.height);

  if (
    pencilLeftResidual > 3 ||
    pencilRightResidual > 3 ||
    pencilWidthResidual > 3 ||
    stickWidthResidual > 3 ||
    stickLeftResidual > 5 ||
    iterationBounds.length !== lengthCm ||
    maxIterationLeftResidual > 5 ||
    finalStickRightResidual > 3 ||
    stickVerticalContainmentResidual > 3 ||
    lockedPencilResidual > 3 ||
    lockedRulerResidual > 3 ||
    stickMoveDistance < 30 ||
    lowerBandHeight + 1 < afterStick.height ||
    blockedProjectWriteRequestCount !== 0
  ) {
    throw new Error(
      `wave13-interaction-mismatch:${JSON.stringify({
        pencilLeftResidual,
        pencilRightResidual,
        pencilWidthResidual,
        stickWidthResidual,
        stickLeftResidual,
        iterationCount: iterationBounds.length,
        iterationLeftResiduals,
        maxIterationLeftResidual,
        finalStickRightResidual,
        stickVerticalContainmentResidual,
        lockedPencilResidual,
        lockedRulerResidual,
        stickMoveDistance,
        lowerBandHeight,
        beforePencil,
        beforeStick,
        beforeRuler,
        lane,
        afterStick,
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
  const evidence = {
    schemaVersion: "1.0.0",
    probeId,
    observedAt: new Date().toISOString(),
    status: "pass",
    blueprintId: prepared.plan.blueprint.id,
    blueprintVersion: prepared.plan.blueprint.version,
    blueprintContentHash: prepared.plan.blueprint.contentHash,
    layoutPresetContentHash: sha256Hex(
      getLayoutPreset(prepared.plan.blueprint.layout.tokenSet)
    ),
    payloadHash: prepared.compiled.payloadHash,
    projectReferenceHash: sha256Hex(creation.projectId),
    createRequestCount: 1,
    existingProjectWriteCount: blockedProjectWriteRequestCount,
    localValidationIssueCount: prepared.validation.issues.length,
    editorPath: "/ko/view/<redacted-project>",
    categoryUnit: "Unit03",
    releasedTools: ["NO03FM"],
    problemCount: prepared.resolved.items.length,
    persistedShape,
    reopenShape: domShape,
    interactionShape: {
      action: "repeat-one-centimeter-stick-along-pencil",
      itemId: interactionItem.id,
      totalUnits,
      startMark,
      endMark,
      lengthCm,
      rulerWidth: beforeRuler.width,
      pencilWidth: beforePencil.width,
      unitStickWidth: afterStick.width,
      unitStickHeight: afterStick.height,
      expectedCellWidth,
      pencilLeftResidual,
      pencilRightResidual,
      pencilWidthResidual,
      stickWidthResidual,
      stickLeftResidual,
      iterationCount: iterationBounds.length,
      maxIterationLeftResidual,
      finalStickRightResidual,
      stickVerticalContainmentResidual,
      lockedPencilResidual,
      lockedRulerResidual,
      stickMoveDistance,
      lowerBandHeight,
      transientOnly: true,
      existingProjectWriteCount: blockedProjectWriteRequestCount
    },
    previewPath:
      ".mathcanvas-contract-lab/previews/wave13/broken-ruler-length.png",
    reusedExisting
  };
  writeFileSync(evidenceOutput, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
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
    `PASS broken ruler length release canary ${creation.editorUrl}\n`
  );
  process.stdout.write(`PREVIEW ${previewOutput}\n`);
} finally {
  await runtime?.close().catch(() => undefined);
  await previewContext?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
  releaseLock?.();
}
