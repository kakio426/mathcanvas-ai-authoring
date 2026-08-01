#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";
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
  balancedEquationCardsBlueprint
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

const generatedAt = "2026-07-31T08:00:00.000Z";
const rawOutput = join(
  defaultRawRoot,
  "wave5-equality-release-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave5-equality-release-canary.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "wave5",
  "equality.png"
);

function buildPreparedCase() {
  const curriculum = resolveCurriculum("[4수02-03]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "wave5-equality-release-canary",
    supported: true,
    templateId: balancedEquationCardsBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 4,
    standardCode: curriculum.record.code,
    learningGoal: balancedEquationCardsBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 3,
    difficulty: "normal",
    manipulation: "number-card-balanced-equation-drag",
    rationale: ["Wave 5 등호 관계 create-only canary입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    recommendation,
    {
      seed: "wave5-equality-release-v2",
      generatedAt,
      activityId: "wave5-equality-release-v2"
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
      `wave5-equality-local-validation-failed:${validation.issues
        .map((issue) => issue.code)
        .join(",")}`
    );
  }
  return { plan, resolved, compiled, validation };
}

let runtime;
let previewContext;
let releaseLock;
try {
  const prepared = buildPreparedCase();
  const stateDirectory = resolveStateDirectory();
  releaseLock = acquireManagedProfileLock(stateDirectory);

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
        `wave5-equality-create-failed:${creation.errorCode}`
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

  previewContext = await chromium.launchPersistentContext(
    join(stateDirectory, "chrome-profile"),
    {
      channel: "chrome",
      headless: true,
      viewport: { width: 1630, height: 2200 }
    }
  );
  await previewContext.route("**/*", async (route) => {
    const method = route.request().method().toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  const page = await previewContext.newPage();
  await page.goto(creation.editorUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll("[id]").length > 20 &&
      document.querySelectorAll('[id$="-answer-slot"]').length === 3,
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
    return {
      objectCount: contents.length,
      answerSlotCount: contents.filter((object) =>
        String(object?.id ?? "").endsWith("-answer-slot")
      ).length,
      numberCardCount: contents.filter((object) =>
        String(object?.id ?? "").includes("-piece-card-")
      ).length,
      topCellCount: contents.filter((object) =>
        String(object?.id ?? "").includes("-top-cell-")
      ).length,
      bottomCellCount: contents.filter((object) =>
        String(object?.id ?? "").includes("-bottom-cell-")
      ).length
    };
  }, creation.projectId);
  const domCheck = await page.evaluate(() => ({
    idCount: document.querySelectorAll("[id]").length,
    answerSlotCount:
      document.querySelectorAll('[id$="-answer-slot"]').length,
    numberCardCount:
      document.querySelectorAll('[id*="-piece-card-"]').length,
    topCellCount:
      document.querySelectorAll('[id*="-top-cell-"]').length,
    bottomCellCount:
      document.querySelectorAll('[id*="-bottom-cell-"]').length
  }));
  if (
    persistedShape.objectCount !==
      prepared.compiled.payload.contentsJson.length ||
    persistedShape.answerSlotCount !== 3 ||
    persistedShape.numberCardCount !== 18 ||
    persistedShape.topCellCount !== 54 ||
    persistedShape.bottomCellCount !== 54 ||
    domCheck.answerSlotCount !== 3 ||
    domCheck.numberCardCount !== 18 ||
    domCheck.topCellCount !== 54 ||
    domCheck.bottomCellCount !== 54
  ) {
    throw new Error(
      `wave5-equality-reopen-shape-mismatch:${JSON.stringify(domCheck)}`
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

  const observedAt = new Date().toISOString();
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: "wave5-equality-release-canary-v1",
    observedAt,
    blueprintId: prepared.plan.blueprint.id,
    blueprintVersion: prepared.plan.blueprint.version,
    blueprintContentHash: prepared.plan.blueprint.contentHash,
    layoutPresetContentHash: sha256Hex(
      getLayoutPreset(prepared.plan.blueprint.layout.tokenSet)
    ),
    payloadHash: prepared.compiled.payloadHash,
    problemCount: 3,
    curriculumStandard: "[4수02-03]",
    categoryId: prepared.compiled.payload.categoryId,
    categoryUnit: "Unit02",
    reusedReleasedTool: "NO04NT",
    status: "pass",
    createRequestCount: reusedExisting ? 0 : 1,
    existingProjectWriteCount: 0,
    localValidationIssueCount:
      prepared.validation.issues.length,
    reopenShape: domCheck,
    persistedShape,
    projectReferenceHash: sha256Hex(creation.projectId),
    editorPath: "/ko/view/<redacted-project>",
    previewPath:
      ".mathcanvas-contract-lab/previews/wave5/equality.png"
  };
  mkdirSync(dirname(evidenceOutput), {
    recursive: true,
    mode: 0o700
  });
  mkdirSync(dirname(rawOutput), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(evidenceOutput, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
  writeFileSync(
    rawOutput,
    stableJson({
      schemaVersion: "1.0.0",
      observedAt,
      payloadHash: prepared.compiled.payloadHash,
      creation
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `PASS WAVE5_EQUALITY ${reusedExisting ? "REUSED" : "CREATED"} ${creation.editorUrl}\n`
  );
  process.stdout.write(`PREVIEW ${previewOutput}\n`);
} finally {
  if (runtime) await runtime.close();
  if (previewContext) await previewContext.close();
  if (releaseLock) releaseLock();
}
