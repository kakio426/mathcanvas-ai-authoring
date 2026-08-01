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
  balanceScaleSumBlueprint
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

const generatedAt = "2026-07-31T09:00:00.000Z";
const rawOutput = join(
  defaultRawRoot,
  "wave5-balance-scale-release-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  "wave5-balance-scale-release-canary.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "wave5",
  "balance-scale.png"
);

function buildPreparedCase() {
  const curriculum = resolveCurriculum("[4수02-03]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "wave5-balance-scale-release-canary",
    supported: true,
    templateId: balanceScaleSumBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 4,
    standardCode: curriculum.record.code,
    learningGoal: balanceScaleSumBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 2,
    difficulty: "normal",
    manipulation: "balance-scale-sum-card-drag",
    rationale: [
      "Wave 5B 접시저울 create-only canary입니다."
    ],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    recommendation,
    {
      seed: "wave5-balance-scale-release-v2",
      generatedAt,
      activityId: "wave5-balance-scale-release-v2"
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
      `wave5-balance-scale-local-validation-failed:${validation.issues
        .map((issue) => issue.code)
        .join(",")}`
    );
  }
  return { plan, resolved, compiled, validation };
}

let runtime;
let previewContext;
let releaseLock;
let blockedProjectWriteRequestCount = 0;
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
      userDataDirectory: join(
        stateDirectory,
        "chrome-profile"
      ),
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
        `wave5-balance-scale-create-failed:${creation.errorCode}`
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
      viewport: { width: 1630, height: 1900 }
    }
  );
  await previewContext.route("**/*", async (route) => {
    const method = route.request().method().toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      await route.continue();
    } else {
      if (
        new URL(route.request().url()).pathname.startsWith(
          "/api/project"
        )
      ) {
        blockedProjectWriteRequestCount += 1;
      }
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
      document.querySelectorAll(
        '[id$="-balance-scale"]'
      ).length === 2 &&
      document.querySelectorAll(
        '[id*="-piece-card-"]'
      ).length === 10,
    undefined,
    { timeout: 30_000 }
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);

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
      const scales = contents.filter(
        (object) => object?.svgId === "CR07BS-01"
      );
      const scaleIds = new Set(
        scales.map((object) => object.id)
      );
      return {
        objectCount: contents.length,
        scaleCount: scales.length,
        fixedPlateMemberCount: contents.filter(
          (object) =>
            typeof object?.plate === "string" &&
            scaleIds.has(object.plate)
        ).length,
        candidateCardCount: contents.filter((object) =>
          String(object?.id ?? "").includes("-piece-card-")
        ).length,
        candidateWithPlateCount: contents.filter(
          (object) =>
            String(object?.id ?? "").includes("-piece-card-") &&
            typeof object?.plate === "string"
        ).length,
        tiltedScaleCount: scales.filter(
          (scale) =>
            scale?.plate?.left === 25 &&
            scale?.plate?.right === -25 &&
            scale?.line === scale?.leftLine
        ).length,
        disabledEquilibriumScaleCount: scales.filter(
          (scale) => scale?.canEquilibrium === false
        ).length,
        balanceModuleActive:
          body?.canvasOption?.moduleArr?.Unit02?.CR07BS ===
          true,
        numberCardModuleActive:
          body?.canvasOption?.moduleArr?.Unit01?.NO04NT ===
          true
      };
    },
    creation.projectId
  );
  const domShape = await page.evaluate(() => {
    const scales = Array.from(
      document.querySelectorAll(
        '[id$="-balance-scale"]'
      )
    );
    const visibleScaleCount = scales.filter((scale) => {
      const bounds = scale.getBoundingClientRect();
      const samplePoints = [
        [0.5, 0.28],
        [0.2, 0.3],
        [0.8, 0.3]
      ];
      const visibleSamples = samplePoints.filter(
        ([xRatio, yRatio]) => {
          const topElement = document.elementsFromPoint(
            bounds.left + bounds.width * xRatio,
            bounds.top + bounds.height * yRatio
          )[0];
          return (
            topElement
              ?.closest('[id$="-balance-scale"]')
              ?.getAttribute("id") === scale.getAttribute("id")
          );
        }
      ).length;
      return visibleSamples >= 2;
    }).length;
    return {
    scaleCount: scales.length,
    visibleScaleCount,
    fixedCardCount:
      document.querySelectorAll(
        '[id$="-fixed-card-a"], [id$="-fixed-card-b"]'
      ).length,
    candidateCardCount:
      document.querySelectorAll(
        '[id*="-piece-card-"]'
      ).length,
    predictionBoxCount:
      document.querySelectorAll(
        '[id$="-prediction-box"]'
      ).length,
    explanationBoxCount:
      document.querySelectorAll(
        '[id$="-explanation-box"]'
      ).length,
    leftTiltCount: scales.filter((scale) =>
      scale
        .querySelector(".plate-line")
        ?.getAttribute("d")
        ?.includes("M143,15")
    ).length
  };
  });
  if (
    persistedShape.objectCount !==
      prepared.compiled.payload.contentsJson.length ||
    persistedShape.scaleCount !== 2 ||
    persistedShape.fixedPlateMemberCount !== 4 ||
    persistedShape.candidateCardCount !== 10 ||
    persistedShape.candidateWithPlateCount !== 0 ||
    persistedShape.tiltedScaleCount !== 2 ||
    persistedShape.disabledEquilibriumScaleCount !== 2 ||
    !persistedShape.balanceModuleActive ||
    !persistedShape.numberCardModuleActive ||
    domShape.scaleCount !== 2 ||
    domShape.visibleScaleCount !== 2 ||
    domShape.fixedCardCount !== 4 ||
    domShape.candidateCardCount !== 10 ||
    domShape.predictionBoxCount !== 2 ||
    domShape.explanationBoxCount !== 2 ||
    domShape.leftTiltCount !== 2
  ) {
    throw new Error(
      `wave5-balance-scale-reopen-shape-mismatch:${JSON.stringify({
        persistedShape,
        domShape
      })}`
    );
  }

  const wrongItem = prepared.resolved.items.find(
    (item) =>
      Number(item.values.nearMissValue) >
      Number(item.values.correctResult)
  );
  const correctItem = prepared.resolved.items.find(
    (item) => item.id !== wrongItem?.id
  );
  if (!wrongItem || !correctItem) {
    throw new Error(
      "wave5-balance-scale-interaction-items-missing"
    );
  }
  const findPieceIndex = (item, value) => {
    for (let index = 1; index <= 5; index += 1) {
      if (Number(item.values[`piece${index}`]) === value) {
        return index;
      }
    }
    throw new Error(
      `wave5-balance-scale-piece-missing:${item.id}:${value}`
    );
  };
  const wrongCardId =
    `${wrongItem.id}-piece-card-${findPieceIndex(
      wrongItem,
      Number(wrongItem.values.nearMissValue)
    )}`;
  const correctCardId =
    `${correctItem.id}-piece-card-${findPieceIndex(
      correctItem,
      Number(correctItem.values.correctResult)
    )}`;
  const dragCardToRightPan = async (itemId, cardId) => {
    const cardBounds = await page.locator(`#${cardId}`).boundingBox();
    const panBounds = await page
      .locator(`#${itemId}-balance-scale path.plate-right`)
      .last()
      .boundingBox();
    if (!cardBounds || !panBounds) {
      throw new Error(
        `wave5-balance-scale-drag-target-missing:${itemId}:${cardId}`
      );
    }
    await page.mouse.move(
      cardBounds.x + cardBounds.width / 2,
      cardBounds.y + cardBounds.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      panBounds.x + panBounds.width / 2,
      panBounds.y + panBounds.height / 2,
      { steps: 30 }
    );
    await page.mouse.up();
    await page.waitForTimeout(600);
  };
  await dragCardToRightPan(wrongItem.id, wrongCardId);
  await dragCardToRightPan(correctItem.id, correctCardId);
  await page.waitForTimeout(1200);

  const interactionShape = await page.evaluate(
    ({ wrongItemId, correctItemId, wrongCardId, correctCardId }) => {
      const lineFor = (itemId) =>
        document
          .querySelector(
            `#${itemId}-balance-scale .plate-line`
          )
          ?.getAttribute("d");
      const buttonDisabledFor = (itemId) =>
        document
          .querySelector(
            `#${itemId}-balance-scale .equilibrium-button`
          )
          ?.classList.contains("no-equal") === true;
      const cardIsInsideRightPan = (itemId, cardId) => {
        const card = document.querySelector(`#${cardId}`);
        const pan = document.querySelector(
          `#${itemId}-balance-scale path.plate-right`
        );
        if (!card || !pan) return false;
        const cardBounds = card.getBoundingClientRect();
        const panBounds = pan.getBoundingClientRect();
        const cardCenterX =
          cardBounds.left + cardBounds.width / 2;
        const cardCenterY =
          cardBounds.top + cardBounds.height / 2;
        return (
          cardCenterX >= panBounds.left &&
          cardCenterX <= panBounds.right &&
          cardCenterY >= panBounds.top &&
          cardCenterY <= panBounds.bottom
        );
      };
      return {
        wrongLine: lineFor(wrongItemId),
        correctLine: lineFor(correctItemId),
        wrongButtonDisabled:
          buttonDisabledFor(wrongItemId),
        correctButtonDisabled:
          buttonDisabledFor(correctItemId),
        wrongCardOnRightPan: cardIsInsideRightPan(
          wrongItemId,
          wrongCardId
        ),
        correctCardOnRightPan: cardIsInsideRightPan(
          correctItemId,
          correctCardId
        )
      };
    },
    {
      wrongItemId: wrongItem.id,
      correctItemId: correctItem.id,
      wrongCardId,
      correctCardId
    }
  );
  if (
    interactionShape.wrongLine !==
      "M143,-35 L143,37 L575,87 L575,15" ||
    interactionShape.correctLine !==
      "M143,-10 L143,62 L575,62 L575,-10" ||
    !interactionShape.wrongButtonDisabled ||
    !interactionShape.correctButtonDisabled ||
    !interactionShape.wrongCardOnRightPan ||
    !interactionShape.correctCardOnRightPan ||
    blockedProjectWriteRequestCount !== 0
  ) {
    throw new Error(
      `wave5-balance-scale-interaction-mismatch:${JSON.stringify({
        interactionShape,
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
    probeId: "wave5-balance-scale-release-canary-v3",
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
    categoryUnit: "Unit02",
    releasedTools: ["CR07BS", "NO04NT"],
    problemCount: prepared.resolved.items.length,
    persistedShape,
    reopenShape: domShape,
    interactionShape,
    previewPath:
      ".mathcanvas-contract-lab/previews/wave5/balance-scale.png",
    reusedExisting
  };
  writeFileSync(
    evidenceOutput,
    stableJson(evidence),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `PASS balance-scale release canary ${creation.editorUrl}\n`
  );
} finally {
  await runtime?.close().catch(() => undefined);
  await previewContext?.close().catch(() => undefined);
  releaseLock?.();
}
