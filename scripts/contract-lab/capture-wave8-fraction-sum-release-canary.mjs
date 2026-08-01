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
  barGraphScaleUnitBlueprint,
  prepareRegisteredActivityForEnvelopeValidation,
  sameDenominatorFractionSumBlueprint,
  sameDenominatorImproperSumBlueprint,
  unlikeDenominatorCommonUnitDifferenceBlueprint,
  unlikeDenominatorCommonUnitSumBlueprint
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

const generatedAt = "2026-07-31T14:00:00.000Z";
const improper = process.argv.includes("--improper");
const commonUnit = process.argv.includes("--common-unit");
const difference = process.argv.includes("--difference");
const barGraph = process.argv.includes("--bar-graph");
const commonUnitBased = commonUnit || difference || barGraph;
if (
  [improper, commonUnit, difference, barGraph].filter(Boolean)
    .length > 1
) {
  throw new Error("fraction-sum-canary-mode-conflict");
}
const wave = barGraph
  ? "wave12"
  : difference
    ? "wave11"
  : commonUnit
    ? "wave10"
    : improper
      ? "wave9"
      : "wave8";
const blueprint = barGraph
  ? barGraphScaleUnitBlueprint
  : commonUnitBased
    ? difference
    ? unlikeDenominatorCommonUnitDifferenceBlueprint
    : unlikeDenominatorCommonUnitSumBlueprint
  : improper
    ? sameDenominatorImproperSumBlueprint
    : sameDenominatorFractionSumBlueprint;
const probeId = barGraph
  ? "wave12-bar-graph-scale-release-canary-v1"
  : difference
    ? "wave11-common-unit-difference-release-canary-v1"
  : commonUnit
    ? "wave10-common-unit-release-canary-v2"
  : improper
    ? "wave9-improper-sum-release-canary-v3"
    : "wave8-fraction-sum-release-canary-v4";
const seed = barGraph
  ? "wave12-bar-graph-scale-release-v1"
  : difference
    ? "wave11-common-unit-difference-release-v1"
  : commonUnit
    ? "wave10-common-unit-release-v2"
  : improper
    ? "wave9-improper-sum-release-v3"
    : "wave8-fraction-sum-release-v4";
const rawOutput = join(
  defaultRawRoot,
  barGraph
    ? "wave12-bar-graph-scale-release-canary.raw.json"
    : difference
      ? "wave11-common-unit-difference-release-canary.raw.json"
    : commonUnit
      ? "wave10-common-unit-release-canary.raw.json"
    : improper
      ? "wave9-improper-sum-release-canary.raw.json"
      : "wave8-fraction-sum-release-canary.raw.json"
);
const evidenceOutput = join(
  defaultResearchRoot,
  barGraph
    ? "wave12-bar-graph-scale-release-canary.json"
    : difference
      ? "wave11-common-unit-difference-release-canary.json"
    : commonUnit
      ? "wave10-common-unit-release-canary.json"
    : improper
      ? "wave9-improper-sum-release-canary.json"
      : "wave8-fraction-sum-release-canary.json"
);
const previewOutput = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  wave,
  barGraph
    ? "bar-graph-scale.png"
    : difference
      ? "common-unit-difference.png"
    : commonUnit
      ? "common-unit-sum.png"
    : improper
      ? "improper-sum.png"
      : "fraction-sum.png"
);

function buildPreparedCase() {
  const curriculum = resolveCurriculum(
    barGraph
      ? "[4수04-01]"
      : commonUnitBased
        ? "[6수01-08]"
        : "[4수01-15]"
  );
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: probeId,
    supported: true,
    templateId: blueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: barGraph ? 4 : commonUnitBased ? 5 : 4,
    standardCode: curriculum.record.code,
    learningGoal:
      blueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 2,
    difficulty: "normal",
    manipulation: barGraph
      ? "bar-graph-scale-unit-drag"
      : commonUnitBased
        ? difference
        ? "unlike-denominator-common-unit-difference-drag"
        : "unlike-denominator-common-unit-drag"
      : improper
        ? "same-denominator-improper-sum-drag"
        : "same-denominator-fraction-sum-drag",
    rationale: [
      barGraph
        ? "Wave 12 눈금 한 칸의 값을 정해 막대그래프를 읽는 create-only canary입니다."
        : difference
          ? "Wave 11 공통 단위로 빼는 분모가 다른 분수 create-only canary입니다."
        : commonUnit
          ? "Wave 10 공통 단위로 더하는 분모가 다른 분수 create-only canary입니다."
        : improper
          ? "Wave 9 1을 넘는 같은 분모 분수 덧셈 create-only canary입니다."
          : "Wave 8 같은 분모 분수 덧셈 create-only canary입니다."
    ],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    recommendation,
    {
      seed,
      generatedAt,
      activityId: seed
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
      `${wave}-fraction-sum-local-validation-failed:${validation.issues
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
        `${wave}-fraction-sum-create-failed:${creation.errorCode}`
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
        '[id$="-left-strip"], [id$="-right-strip"]'
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

  const expectedFractions = prepared.resolved.items.flatMap(
    (item) => {
      if (barGraph) {
        return [
          {
            id: `${item.id}-left-strip`,
            numerator: Number(item.values.referenceCells),
            denominator: Number(item.values.totalCells)
          },
          {
            id: `${item.id}-right-strip`,
            numerator: Number(item.values.questionCells),
            denominator: Number(item.values.totalCells)
          },
          {
            id: `${item.id}-unit-ruler`,
            numerator: Number(item.values.totalCells),
            denominator: Number(item.values.totalCells)
          }
        ];
      }
      const leftDenominator = Number(
        commonUnitBased
          ? item.values.leftDenominator
          : item.values.denominator
      );
      const rightDenominator = Number(
        commonUnitBased
          ? item.values.rightDenominator
          : item.values.denominator
      );
      const fractions = [
        {
          id: `${item.id}-left-strip`,
          numerator: Number(item.values.leftNumerator),
          denominator: leftDenominator
        },
        {
          id: `${item.id}-right-strip`,
          numerator: Number(item.values.rightNumerator),
          denominator: rightDenominator
        }
      ];
      if (commonUnitBased) {
        fractions.push({
          id: `${item.id}-unit-ruler`,
          numerator: Number(item.values.commonDenominator),
          denominator: Number(item.values.commonDenominator)
        });
      }
      return fractions;
    }
  );
  const persistedShape = await page.evaluate(
    async ({ projectId, expectedFractions }) => {
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
      const strips = contents.filter((object) =>
        String(object?.svgId ?? "").startsWith("NO03FM-")
      );
      return {
        objectCount: contents.length,
        fractionStripCount: strips.length,
        configuredFractionMatchCount: strips.filter(
          (strip) => {
            const expected = expectedFractions.find(
              (candidate) => candidate.id === strip?.id
            );
            return (
              expected?.numerator === strip?.count &&
              expected?.denominator === strip?.divider
            );
          }
        ).length,
        leftStripCount: strips.filter((strip) =>
          String(strip?.id ?? "").endsWith("-left-strip")
        ).length,
        rightStripCount: strips.filter((strip) =>
          String(strip?.id ?? "").endsWith("-right-strip")
        ).length,
        unitRulerCount: strips.filter((strip) =>
          String(strip?.id ?? "").endsWith("-unit-ruler")
        ).length,
        unitRulerDividerMatchCount: strips.filter(
          (strip) =>
            String(strip?.id ?? "").endsWith("-unit-ruler") &&
            strip?.count === strip?.divider
        ).length,
        labelHiddenStripCount: strips.filter(
          (strip) => strip?.isEyeOn === false
        ).length,
        oneWholeBoundaryCount: contents.filter((object) =>
          String(object?.id ?? "").endsWith(
            "-one-whole-boundary"
          )
        ).length,
        candidateFormulaCount: contents.filter(
          (object) =>
            String(object?.id ?? "").includes(
              "-position-card-"
            ) &&
            !String(object?.id ?? "").endsWith("-backdrop") &&
            /^(?:\\frac\{\d+\}\{\d+\}|\d+)$/.test(
              String(object?.text ?? "")
            )
        ).length,
        fractionModuleActive:
          body?.canvasOption?.moduleArr?.Unit01?.NO03FM ===
          true
      };
    },
    {
      projectId: creation.projectId,
      expectedFractions
    }
  );
  const domShape = await page.evaluate(() => {
    const strips = Array.from(
      document.querySelectorAll(
        '[id$="-left-strip"], [id$="-right-strip"]'
      )
    );
    return {
      fractionStripCount: strips.length,
      visibleFractionStripCount: strips.filter((strip) => {
        const bounds = strip.getBoundingClientRect();
        const style = getComputedStyle(strip);
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      }).length,
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
        ).length,
      joinLaneCount:
        document.querySelectorAll('[id$="-join-lane"]').length,
      referenceLaneCount:
        document.querySelectorAll(
          '[id$="-reference-lane"]'
        ).length,
      questionLaneCount:
        document.querySelectorAll(
          '[id$="-question-lane"]'
        ).length,
      oneWholeBoundaryCount:
        document.querySelectorAll(
          '[id$="-one-whole-boundary"]'
        ).length,
      unitRulerCount:
        document.querySelectorAll(
          '[id$="-unit-ruler"]'
        ).length
    };
  });
  const itemCount = prepared.resolved.items.length;
  const expectedFractionCount =
    itemCount * (commonUnitBased ? 3 : 2);
  if (
    persistedShape.objectCount !==
      prepared.compiled.payload.contentsJson.length ||
    persistedShape.fractionStripCount !== expectedFractionCount ||
    persistedShape.configuredFractionMatchCount !==
      expectedFractionCount ||
    persistedShape.leftStripCount !== itemCount ||
    persistedShape.rightStripCount !== itemCount ||
    (commonUnitBased &&
      (persistedShape.unitRulerCount !== itemCount ||
        persistedShape.unitRulerDividerMatchCount !== itemCount)) ||
    (barGraph &&
      persistedShape.labelHiddenStripCount !== itemCount * 3) ||
    (improper &&
      persistedShape.oneWholeBoundaryCount !== itemCount) ||
    persistedShape.candidateFormulaCount !== itemCount * 5 ||
    !persistedShape.fractionModuleActive ||
    domShape.fractionStripCount !== itemCount * 2 ||
    domShape.visibleFractionStripCount !== itemCount * 2 ||
    domShape.candidateTextCount !== itemCount * 5 ||
    domShape.predictionBoxCount !== itemCount ||
    domShape.explanationBoxCount !== itemCount ||
    domShape.joinLaneCount !== itemCount ||
    (barGraph &&
      (domShape.referenceLaneCount !== itemCount ||
        domShape.questionLaneCount !== itemCount)) ||
    (commonUnitBased &&
      domShape.unitRulerCount !== itemCount) ||
    (improper &&
      domShape.oneWholeBoundaryCount !== itemCount)
  ) {
    throw new Error(
      `wave8-fraction-sum-reopen-shape-mismatch:${JSON.stringify({
        persistedShape,
        domShape
      })}`
    );
  }

  const interactionItem = prepared.resolved.items[0];
  const leftId = `${interactionItem.id}-left-strip`;
  const rightId = `${interactionItem.id}-right-strip`;
  const laneId = `${interactionItem.id}-join-lane`;
  const referenceLaneId =
    `${interactionItem.id}-reference-lane`;
  const questionLaneId =
    `${interactionItem.id}-question-lane`;
  const boundaryId =
    `${interactionItem.id}-one-whole-boundary`;
  const unitRulerId =
    `${interactionItem.id}-unit-ruler`;
  const beforeLeft = await page.locator(`#${leftId}`).boundingBox();
  const beforeRight = await page
    .locator(`#${rightId}`)
    .boundingBox();
  const lane = await page.locator(`#${laneId}`).boundingBox();
  const referenceLane = barGraph
    ? await page.locator(`#${referenceLaneId}`).boundingBox()
    : undefined;
  const questionLane = barGraph
    ? await page.locator(`#${questionLaneId}`).boundingBox()
    : undefined;
  const boundary = improper
    ? await page.locator(`#${boundaryId}`).boundingBox()
    : undefined;
  const unitRuler = commonUnitBased
    ? await page.locator(`#${unitRulerId}`).boundingBox()
    : undefined;
  if (
    !beforeLeft ||
    !beforeRight ||
    !lane ||
    (barGraph && (!referenceLane || !questionLane)) ||
    (improper && !boundary) ||
    (commonUnitBased && !unitRuler)
  ) {
    throw new Error(
      "wave8-fraction-sum-drag-target-missing"
    );
  }
  const leftTarget = barGraph ? referenceLane : lane;
  const rightTarget = barGraph ? questionLane : lane;
  await dragCenter(page, beforeLeft, {
    x: leftTarget.x + beforeLeft.width / 2,
    y: leftTarget.y + leftTarget.height / 2
  });
  await page.keyboard.press("Escape");
  await page.mouse.click(40, 300);
  await page.waitForTimeout(150);
  const afterLeft = await page.locator(`#${leftId}`).boundingBox();
  if (!afterLeft) {
    throw new Error(
      "wave8-fraction-sum-left-strip-after-drag-missing"
    );
  }
  await dragCenter(page, beforeRight, {
    x: barGraph
      ? rightTarget.x + beforeRight.width / 2
      : difference
        ? afterLeft.x +
          afterLeft.width -
          beforeRight.width / 2
        : afterLeft.x +
          afterLeft.width +
          beforeRight.width / 2,
    y: rightTarget.y + rightTarget.height / 2
  });
  await page.keyboard.press("Escape");
  await page.mouse.click(40, 300);
  await page.waitForTimeout(150);
  const afterRight = await page
    .locator(`#${rightId}`)
    .boundingBox();
  if (!afterRight) {
    throw new Error(
      "wave8-fraction-sum-right-strip-after-drag-missing"
    );
  }
  const startResidual = Math.abs(afterLeft.x - leftTarget.x);
  const questionStartResidual = Math.abs(
    afterRight.x - rightTarget.x
  );
  const initialReferenceOffset = barGraph
    ? Math.abs(beforeLeft.x - leftTarget.x)
    : 0;
  const initialQuestionOffset = barGraph
    ? Math.abs(beforeRight.x - rightTarget.x)
    : 0;
  const joinResidual = Math.abs(
    afterRight.x - (afterLeft.x + afterLeft.width)
  );
  const rightEdgeResidual = Math.abs(
    afterRight.x +
      afterRight.width -
      (afterLeft.x + afterLeft.width)
  );
  const endpointResidual = Math.abs(
    afterRight.x +
      afterRight.width -
      (lane.x + afterLeft.width + afterRight.width)
  );
  const joinedWidth =
    afterRight.x +
    afterRight.width -
    afterLeft.x;
  const uncoveredWidth = afterRight.x - afterLeft.x;
  const laneWidth = barGraph ? leftTarget.width : lane.width;
  const wholeWidth = laneWidth / (improper ? 2 : 1);
  const resultNumerator = Number(
    barGraph
      ? interactionItem.values.questionCells
      : commonUnitBased
        ? difference
          ? interactionItem.values.differenceCells
          : interactionItem.values.sumCells
      : interactionItem.values.sumNumerator
  );
  const resultDenominator = Number(
    barGraph
      ? interactionItem.values.totalCells
      : commonUnitBased
        ? interactionItem.values.commonDenominator
      : interactionItem.values.denominator
  );
  const expectedResultWidth =
    (wholeWidth * resultNumerator) / resultDenominator;
  const expectedJoinedWidth = difference
    ? 0
    : expectedResultWidth;
  const joinedWidthResidual = Math.abs(
    joinedWidth - expectedJoinedWidth
  );
  const uncoveredWidthResidual = difference
    ? Math.abs(uncoveredWidth - expectedResultWidth)
    : 0;
  const expectedCoveredWidth = difference
    ? (wholeWidth *
        Number(interactionItem.values.rightCells)) /
      Number(interactionItem.values.commonDenominator)
    : 0;
  const coveredWidthResidual = difference
    ? Math.abs(afterRight.width - expectedCoveredWidth)
    : 0;
  const actualRowPitch =
    afterRight.y +
    afterRight.height / 2 -
    (afterLeft.y + afterLeft.height / 2);
  const expectedRowPitch = barGraph
    ? rightTarget.y +
      rightTarget.height / 2 -
      (leftTarget.y + leftTarget.height / 2)
    : 0;
  const leftVerticalCenterResidual = barGraph
    ? Math.abs(
        afterLeft.y +
          afterLeft.height / 2 -
          (leftTarget.y + leftTarget.height / 2)
      )
    : 0;
  const rightVerticalCenterResidual = barGraph
    ? Math.abs(
        afterRight.y +
          afterRight.height / 2 -
          (rightTarget.y + rightTarget.height / 2)
      )
    : 0;
  const verticalRowResidual = Math.abs(
    barGraph
      ? Math.max(
          leftVerticalCenterResidual,
          rightVerticalCenterResidual
        )
      : actualRowPitch - expectedRowPitch
  );
  const rowSeparationGap = barGraph
    ? afterRight.y - (afterLeft.y + afterLeft.height)
    : 0;
  const verticalContainmentResidual = barGraph
    ? Math.max(
        0,
        leftTarget.y - afterLeft.y,
        afterLeft.y + afterLeft.height -
          (leftTarget.y + leftTarget.height),
        rightTarget.y - afterRight.y,
        afterRight.y + afterRight.height -
          (rightTarget.y + rightTarget.height)
      )
    : Math.max(
        0,
        lane.y - afterLeft.y,
        lane.y - afterRight.y,
        afterLeft.y + afterLeft.height -
          (lane.y + lane.height),
        afterRight.y + afterRight.height -
          (lane.y + lane.height)
      );
  const boundaryCenter = boundary
    ? boundary.x + boundary.width / 2
    : lane.x + wholeWidth;
  const expectedBoundaryCenter = lane.x + wholeWidth;
  const boundaryOffsetResidual = Math.abs(
    boundaryCenter - expectedBoundaryCenter
  );
  const joinedEndpoint =
    afterRight.x + afterRight.width;
  const crossedOneWhole =
    joinedEndpoint > boundaryCenter + 1;
  const overflowWidth = joinedEndpoint - boundaryCenter;
  const expectedOverflowWidth = improper
    ? (wholeWidth *
        Number(interactionItem.values.overflowNumerator)) /
      Number(interactionItem.values.denominator)
    : 0;
  const overflowWidthResidual = improper
    ? Math.abs(overflowWidth - expectedOverflowWidth)
    : 0;
  const commonUnitCellWidth =
    commonUnitBased && unitRuler
      ? unitRuler.width /
        Number(
          barGraph
            ? interactionItem.values.totalCells
            : interactionItem.values.commonDenominator
        )
      : 0;
  const expectedCommonUnitBoundary =
    commonUnitBased && unitRuler
      ? unitRuler.x +
        commonUnitCellWidth *
          Number(
            barGraph
              ? interactionItem.values.questionCells
              : difference
                ? interactionItem.values.differenceCells
                : interactionItem.values.sumCells
          )
      : 0;
  const observedCommonUnitBoundary = difference
    ? afterRight.x
    : joinedEndpoint;
  const cellBoundaryResidual = commonUnitBased
    ? Math.abs(
        observedCommonUnitBoundary -
          expectedCommonUnitBoundary
      )
    : 0;
  const rulerStartResidual =
    commonUnitBased && unitRuler
      ? Math.abs(
          unitRuler.x - (barGraph ? leftTarget.x : lane.x)
        )
      : 0;
  const rulerWidthResidual =
    commonUnitBased && unitRuler
      ? Math.abs(unitRuler.width - laneWidth)
      : 0;
  const containmentTolerance = barGraph ? 5 : 1;
  const withinOneWhole =
    commonUnitBased && unitRuler
      ? afterLeft.x >= unitRuler.x - containmentTolerance &&
        afterRight.x >= unitRuler.x - containmentTolerance &&
        afterLeft.x + afterLeft.width <=
          unitRuler.x + unitRuler.width +
            containmentTolerance &&
        joinedEndpoint <=
          unitRuler.x + unitRuler.width +
            containmentTolerance
      : true;
  const referenceEdgeResidual =
    barGraph && unitRuler
      ? Math.abs(
          afterLeft.x +
            afterLeft.width -
            (unitRuler.x +
              commonUnitCellWidth *
                Number(
                  interactionItem.values.referenceCells
                ))
        )
      : 0;
  const questionEdgeResidual =
    barGraph && unitRuler
      ? Math.abs(
          afterRight.x +
            afterRight.width -
            (unitRuler.x +
              commonUnitCellWidth *
                Number(
                  interactionItem.values.questionCells
                ))
        )
      : 0;
  const referenceBarWidthResidual =
    barGraph && unitRuler
      ? Math.abs(
          afterLeft.width -
            commonUnitCellWidth *
              Number(interactionItem.values.referenceCells)
        )
      : 0;
  const questionBarWidthResidual =
    barGraph && unitRuler
      ? Math.abs(
          afterRight.width -
            commonUnitCellWidth *
              Number(interactionItem.values.questionCells)
        )
      : 0;
  if (
    startResidual > 5 ||
    (barGraph && questionStartResidual > 5) ||
    (barGraph &&
      (initialReferenceOffset < commonUnitCellWidth / 2 ||
        initialQuestionOffset < commonUnitCellWidth / 2 ||
        rowSeparationGap < 10)) ||
    (!difference && !barGraph && joinResidual > 5) ||
    (difference && rightEdgeResidual > 5) ||
    (!improper && !commonUnitBased && endpointResidual > 7) ||
    (!difference && !barGraph && joinedWidthResidual > 5) ||
    (difference &&
      (uncoveredWidthResidual > 5 ||
        coveredWidthResidual > 5)) ||
    (improper &&
      (!crossedOneWhole ||
        boundaryOffsetResidual > 3 ||
        overflowWidthResidual > 5)) ||
    (commonUnitBased &&
      (!withinOneWhole ||
        rulerStartResidual > 3 ||
        rulerWidthResidual > 3 ||
        cellBoundaryResidual > 5)) ||
    (barGraph &&
      (referenceEdgeResidual > 5 ||
        questionEdgeResidual > 5 ||
        referenceBarWidthResidual > 3 ||
        questionBarWidthResidual > 3)) ||
    verticalRowResidual > 5 ||
    verticalContainmentResidual > 5 ||
    blockedProjectWriteRequestCount !== 0
  ) {
    throw new Error(
      `wave8-fraction-sum-interaction-mismatch:${JSON.stringify({
        startResidual,
        questionStartResidual,
        joinResidual,
        rightEdgeResidual,
        endpointResidual,
        joinedWidth,
        expectedJoinedWidth,
        joinedWidthResidual,
        uncoveredWidth,
        expectedResultWidth,
        uncoveredWidthResidual,
        expectedCoveredWidth,
        coveredWidthResidual,
        wholeWidth,
        boundary,
        boundaryOffsetResidual,
        crossedOneWhole,
        overflowWidth,
        expectedOverflowWidth,
        overflowWidthResidual,
        unitRuler,
        commonUnitCellWidth,
        expectedCommonUnitBoundary,
        observedCommonUnitBoundary,
        cellBoundaryResidual,
        rulerStartResidual,
        rulerWidthResidual,
        withinOneWhole,
        referenceEdgeResidual,
        questionEdgeResidual,
        referenceBarWidthResidual,
        questionBarWidthResidual,
        initialReferenceOffset,
        initialQuestionOffset,
        expectedRowPitch,
        actualRowPitch,
        leftVerticalCenterResidual,
        rightVerticalCenterResidual,
        rowSeparationGap,
        verticalRowResidual,
        verticalContainmentResidual,
        beforeLeft,
        beforeRight,
        lane,
        referenceLane,
        questionLane,
        afterLeft,
        afterRight,
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
    action: barGraph
      ? "align-bars-on-separate-scale-rows"
      : difference
        ? "cover-minuend-with-subtrahend-from-right"
        : "drag-two-fraction-strips-end-to-end",
    itemId: interactionItem.id,
    ...(barGraph
      ? {
          totalCells: Number(
            interactionItem.values.totalCells
          ),
          peoplePerCell: Number(
            interactionItem.values.peoplePerCell
          ),
          referenceCells: Number(
            interactionItem.values.referenceCells
          ),
          questionCells: Number(
            interactionItem.values.questionCells
          ),
          referenceValue: Number(
            interactionItem.values.referenceValue
          ),
          questionValue: Number(
            interactionItem.values.questionValue
          )
        }
      : {
          leftNumerator: Number(
            interactionItem.values.leftNumerator
          ),
          rightNumerator: Number(
            interactionItem.values.rightNumerator
          ),
          ...(commonUnitBased
            ? {
                leftDenominator: Number(
                  interactionItem.values.leftDenominator
                ),
                rightDenominator: Number(
                  interactionItem.values.rightDenominator
                ),
                commonDenominator: Number(
                  interactionItem.values.commonDenominator
                ),
                leftCells: Number(
                  interactionItem.values.leftCells
                ),
                rightCells: Number(
                  interactionItem.values.rightCells
                ),
                ...(difference
                  ? {
                      differenceCells: Number(
                        interactionItem.values
                          .differenceCells
                      )
                    }
                  : {
                      sumCells: Number(
                        interactionItem.values.sumCells
                      )
                    })
              }
            : {
                denominator: Number(
                  interactionItem.values.denominator
                ),
                sumNumerator: Number(
                  interactionItem.values.sumNumerator
                )
              })
        }),
    ...(improper
      ? {
          overflowNumerator: Number(
            interactionItem.values.overflowNumerator
          )
        }
      : {}),
    laneWidth,
    wholeWidth,
    leftStripWidth: afterLeft.width,
    rightStripWidth: afterRight.width,
    startResidual,
    ...(barGraph
      ? {
          questionStartResidual,
          initialReferenceOffset,
          initialQuestionOffset,
          questionLaneWidth: rightTarget.width,
          expectedRowPitch,
          actualRowPitch,
          leftVerticalCenterResidual,
          rightVerticalCenterResidual,
          rowSeparationGap,
          referenceEdgeResidual,
          questionEdgeResidual,
          referenceBarWidthResidual,
          questionBarWidthResidual
        }
      : difference
      ? {
          rightEdgeResidual,
          uncoveredWidth,
          uncoveredWidthResidual,
          coveredWidthResidual
        }
      : {
          joinResidual,
          joinedWidth,
          joinedWidthResidual
        }),
    ...(!improper && !commonUnitBased
      ? { endpointResidual }
      : {}),
    ...(improper
      ? {
          boundaryOffsetResidual,
          crossedOneWhole,
          overflowWidth,
          overflowWidthResidual
        }
      : {}),
    ...(commonUnitBased
      ? {
          unitRulerWidth: unitRuler.width,
          commonUnitCellWidth,
          rulerStartResidual,
          rulerWidthResidual,
          cellBoundaryResidual,
          withinOneWhole
        }
      : {}),
    verticalRowResidual,
    verticalContainmentResidual,
    transientOnly: true,
    existingProjectWriteCount:
      blockedProjectWriteRequestCount
  };
  const evidence = {
    schemaVersion: "1.0.0",
    probeId,
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
    existingProjectWriteCount:
      blockedProjectWriteRequestCount,
    localValidationIssueCount:
      prepared.validation.issues.length,
    editorPath: "/ko/view/<redacted-project>",
    categoryUnit: barGraph ? "Unit04" : "Unit01",
    releasedTools: ["NO03FM"],
    problemCount: itemCount,
    persistedShape,
    reopenShape: domShape,
    interactionShape,
    previewPath:
      barGraph
        ? ".mathcanvas-contract-lab/previews/wave12/bar-graph-scale.png"
        : difference
          ? ".mathcanvas-contract-lab/previews/wave11/common-unit-difference.png"
        : commonUnit
          ? ".mathcanvas-contract-lab/previews/wave10/common-unit-sum.png"
        : improper
          ? ".mathcanvas-contract-lab/previews/wave9/improper-sum.png"
          : ".mathcanvas-contract-lab/previews/wave8/fraction-sum.png",
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
    `PASS ${barGraph ? "bar graph scale" : difference ? "common-unit difference" : commonUnit ? "common-unit fraction sum" : improper ? "improper fraction sum" : "fraction sum"} release canary ${creation.editorUrl}\n`
  );
  process.stdout.write(`PREVIEW ${previewOutput}\n`);
} finally {
  await runtime?.close().catch(() => undefined);
  await previewContext?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
  releaseLock?.();
}
