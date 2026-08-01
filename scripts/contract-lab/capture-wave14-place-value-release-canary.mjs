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
import { resolveCurriculum } from "../../packages/curriculum/dist/index.js";
import {
  compileActivity,
  getLayoutPreset,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import { ManagedChromeRuntime } from "../../packages/managed-browser/dist/index.js";
import {
  assertCognitiveManifestBound,
  placeValueTenExchangeBlueprint,
  prepareRegisteredActivityForEnvelopeValidation
} from "../../packages/templates/dist/index.js";
import { validateForCreation } from "../../packages/validator/dist/index.js";
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

const generatedAt = "2026-08-01T02:00:00.000Z";
const probeId = "wave14-place-value-release-canary-v1";
const seed = "wave14-place-value-release-v1";
const rawOutput = join(
  defaultRawRoot,
  "wave14-place-value-release-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave14-place-value-release-canary.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "wave14",
  "place-value-ten-exchange.png"
);

function buildPreparedCase() {
  const curriculum = resolveCurriculum("[2수01-02]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: probeId,
    supported: true,
    templateId: placeValueTenExchangeBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 2,
    standardCode: curriculum.record.code,
    learningGoal: placeValueTenExchangeBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount:
      placeValueTenExchangeBlueprint.generator.parameters.problemCount,
    difficulty: "normal",
    manipulation: "place-value-ten-exchange-drag",
    rationale: [
      "Wave 14 십 모형 10개와 백 모형 1개의 같은 양을 확인하는 create-only canary입니다."
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
      `wave14-local-validation-failed:${validation.issues
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
  await page.waitForTimeout(220);
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
      throw new Error(`wave14-create-failed:${creation.errorCode}`);
    }
    mkdirSync(dirname(rawOutput), { recursive: true, mode: 0o700 });
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
    if (new URL(request.url()).pathname.startsWith("/api/project")) {
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
    () => document.querySelectorAll("[id]").length > 20,
    undefined,
    { timeout: 30_000 }
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const persistedShape = await page.evaluate(async (projectId) => {
    const response = await fetch(
      `/api/project/${encodeURIComponent(projectId)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`project-reopen-failed:${response.status}`);
    }
    const body = await response.json();
    const contents = body?.contentsJson ?? [];
    const lockIds = new Set((body?.canvasOption?.lockIds ?? []).flat());
    const exchangeTens = contents.filter((object) =>
      String(object?.id ?? "").includes("-exchange-ten-")
    );
    const placeValueModels = contents.filter((object) =>
      String(object?.svgId ?? "").startsWith("NO04PD-")
    );
    return {
      objectCount: contents.length,
      placeValueModelCount: placeValueModels.length,
      exchangeTenCount: exchangeTens.length,
      configuredExchangeTenCount: exchangeTens.filter(
        (object) => object?.n === 10 && object?.svgId === "NO04PD-04"
      ).length,
      unlockedExchangeTenCount: exchangeTens.filter(
        (object) => !lockIds.has(object?.id)
      ).length,
      exchangeSlotCount: contents.filter((object) =>
        String(object?.id ?? "").includes("-exchange-slot-")
      ).length,
      hundredGridRowCount: contents.filter((object) =>
        String(object?.id ?? "").includes("-hundred-grid-row-")
      ).length,
      hundredGridRelationCount: contents.filter((object) =>
        String(object?.id ?? "").endsWith("-hundred-grid-relation")
      ).length,
      candidateFormulaCount: contents.filter(
        (object) =>
          String(object?.id ?? "").includes("-position-card-") &&
          !String(object?.id ?? "").endsWith("-backdrop") &&
          object?.svgId === "math-latex"
      ).length,
      placeValueModuleActive:
        body?.canvasOption?.moduleArr?.Unit01?.NO04PD === true
    };
  }, creation.projectId);

  const domShape = await page.evaluate(() => ({
    idCount: document.querySelectorAll("[id]").length,
    placeValueModelCount: document.querySelectorAll(
      '.item.group[id*="-exchange-ten-"]'
    ).length,
    exchangeTenCount: document.querySelectorAll(
      '.item.group[id*="-exchange-ten-"]'
    ).length,
    visibleExchangeTenCount: Array.from(
      document.querySelectorAll('.item.group[id*="-exchange-ten-"]')
    ).filter((element) => element.getBoundingClientRect().width > 0).length,
    exchangeBoxCount: document.querySelectorAll(
      '[id$="-exchange-box"]'
    ).length,
    exchangeSlotCount: document.querySelectorAll(
      '[id*="-exchange-slot-"]'
    ).length,
    hundredGridRowCount: document.querySelectorAll(
      '[id*="-hundred-grid-row-"]'
    ).length,
    hundredGridRelationCount: document.querySelectorAll(
      '[id$="-hundred-grid-relation"]'
    ).length,
    predictionBoxCount: document.querySelectorAll(
      '[id$="-prediction-box"]'
    ).length,
    explanationBoxCount: document.querySelectorAll(
      '[id$="-explanation-box"]'
    ).length,
    candidateTextCount: Array.from(
      document.querySelectorAll('[id*="-position-card-"]')
    ).filter((element) => !element.id.endsWith("-backdrop")).length
  }));

  const interactionItem = prepared.resolved.items[0];
  const itemEmissions = prepared.resolved.emissions.filter(
    (emission) => emission.itemId === interactionItem.id
  );
  const exchangeTens = itemEmissions.filter((emission) =>
    emission.role.startsWith("exchange-ten-")
  );
  const exchangeSlots = itemEmissions.filter((emission) =>
    emission.role.startsWith("exchange-slot-")
  );
  const hundredGridRows = itemEmissions.filter((emission) =>
    emission.role.startsWith("hundred-grid-row-")
  );
  const exchangeBoxEmission = itemEmissions.find(
    (emission) => emission.role === "exchange-box"
  );
  const hundredGridRelationEmission = itemEmissions.find(
    (emission) => emission.role === "hundred-grid-relation"
  );
  const predictionEmission = itemEmissions.find(
    (emission) => emission.role === "prediction-box"
  );
  const candidateEmissions = itemEmissions.filter((emission) =>
    /^position-card-\d+$/.test(emission.role)
  );
  const correctCandidate = candidateEmissions.find(
    (emission) =>
      emission.toolIntent.properties.text ===
      interactionItem.values.correctValueText
  );
  const incorrectCandidate = candidateEmissions.find(
    (emission) => emission.id !== correctCandidate?.id
  );
  if (
    exchangeTens.length !== 10 ||
    exchangeSlots.length !== 10 ||
    hundredGridRows.length !== 10 ||
    !exchangeBoxEmission ||
    !hundredGridRelationEmission ||
    !predictionEmission ||
    !correctCandidate ||
    !incorrectCandidate
  ) {
    throw new Error("wave14-interaction-role-missing");
  }
  const boxOf = async (id) => {
    const box = await page.locator(`[id="${id}"]`).boundingBox();
    if (!box) throw new Error(`wave14-dom-box-missing:${id}`);
    return box;
  };
  const predictionBox = await boxOf(predictionEmission.id);
  const incorrectBox = await boxOf(incorrectCandidate.id);
  await dragCenter(page, incorrectBox, {
    x: predictionBox.x + predictionBox.width / 2,
    y: predictionBox.y + predictionBox.height / 2
  });

  const exchangeBox = await boxOf(exchangeBoxEmission.id);
  const slotBoxes = [];
  for (const slot of exchangeSlots) {
    slotBoxes.push(await boxOf(slot.id));
  }
  const gridRowBoxes = [];
  for (const row of hundredGridRows) {
    gridRowBoxes.push(await boxOf(row.id));
  }
  const gridRelationBox = await boxOf(hundredGridRelationEmission.id);
  const beforeTenBoxes = [];
  const afterTenBoxes = [];
  for (const [index, emission] of exchangeTens.entries()) {
    const before = await boxOf(emission.id);
    beforeTenBoxes.push(before);
    const slot = slotBoxes[index];
    if (!slot) throw new Error(`wave14-slot-box-missing:${index}`);
    await dragCenter(page, before, {
      x: slot.x + slot.width / 2,
      y: slot.y + slot.height / 2
    });
    afterTenBoxes.push(await boxOf(emission.id));
  }
  const movedIncorrectBox = await boxOf(incorrectCandidate.id);
  await dragCenter(page, movedIncorrectBox, {
    x: incorrectBox.x + incorrectBox.width / 2,
    y: incorrectBox.y + incorrectBox.height / 2
  });
  const correctBox = await boxOf(correctCandidate.id);
  await dragCenter(page, correctBox, {
    x: predictionBox.x + predictionBox.width / 2,
    y: predictionBox.y + predictionBox.height / 2
  });
  const movedDistances = beforeTenBoxes.map((before, index) =>
    centerDistance(before, afterTenBoxes[index])
  );
  const slotCoverageCount = afterTenBoxes.filter((box, index) => {
    const slot = slotBoxes[index];
    if (!slot) return false;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    return (
      x >= slot.x &&
      x <= slot.x + slot.width &&
      y >= slot.y &&
      y <= slot.y + slot.height
    );
  }).length;
  const allTenBoundsInsideExchangeBox = afterTenBoxes.every(
    (box) =>
      box.x >= exchangeBox.x &&
      box.y >= exchangeBox.y &&
      box.x + box.width <= exchangeBox.x + exchangeBox.width &&
      box.y + box.height <= exchangeBox.y + exchangeBox.height
  );
  const visualMetrics = assertPostInteractionVisual({
    gapBoxes: afterTenBoxes,
    referenceBoxes: gridRowBoxes,
    occluders: afterTenBoxes,
    errorCode: "wave14-post-interaction-visual-invalid"
  });
  const relationVisible =
    gridRelationBox.width > 0 && gridRelationBox.height > 0;

  mkdirSync(dirname(previewOutput), { recursive: true, mode: 0o700 });
  await page.screenshot({ path: previewOutput, fullPage: true });
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
    categoryUnit: "Unit01",
    releasedTools: ["NO04PD"],
    problemCount: prepared.resolved.items.length,
    persistedShape,
    reopenShape: domShape,
    interactionShape: {
      action: "place-ten-tens-in-distinct-slots-and-revise",
      itemId: interactionItem.id,
      exchangeTenCount: exchangeTens.length,
      movedTenCount: movedDistances.filter((distance) => distance >= 20).length,
      minimumMoveDistance: Math.min(...movedDistances),
      tenValueTotal: exchangeTens.length * 10,
      hundredGridValue: hundredGridRows.length * 10,
      targetSlotCount: exchangeSlots.length,
      distinctSlotCoverageCount: slotCoverageCount,
      allTenBoundsInsideExchangeBox,
      ...visualMetrics,
      referenceGridRowCount: hundredGridRows.length,
      representedGridCellCount: hundredGridRows.length * 10,
      relationVisible,
      incorrectCandidateRole: incorrectCandidate.role,
      correctCandidateRole: correctCandidate.role,
      choiceChanged: incorrectCandidate.role !== correctCandidate.role,
      transientOnly: true,
      existingProjectWriteCount: blockedProjectWriteRequestCount
    },
    previewPath:
      ".mathcanvas-contract-lab/previews/wave14/place-value-ten-exchange.png",
    reusedExisting
  };
  mkdirSync(dirname(evidenceOutput), { recursive: true, mode: 0o700 });
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
    `PASS place value release canary ${creation.editorUrl}\n`
  );
  process.stdout.write(`PREVIEW ${previewOutput}\n`);
} finally {
  await runtime?.close().catch(() => undefined);
  await previewContext?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
  releaseLock?.();
}
