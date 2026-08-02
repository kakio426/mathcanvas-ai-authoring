#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CONTRACT_SCHEMA_VERSION, recommendationSchema, sha256Hex } from "../../packages/contracts/dist/index.js";
import {
  claimEvidenceActivityProfiles,
  resolveCurriculum
} from "../../packages/curriculum/dist/index.js";
import { compileActivity, getLayoutPreset, resolveActivity } from "../../packages/mathcanvas-compiler/dist/index.js";
import { ManagedChromeRuntime } from "../../packages/managed-browser/dist/index.js";
import {
  assertCognitiveManifestBound,
  claimEvidenceBlueprints,
  multiplicationArrayMeaningBlueprint,
  prepareRegisteredActivityForEnvelopeValidation,
  probabilityBagComparisonBlueprint,
  repeatingPatternUnitBlueprint
} from "../../packages/templates/dist/index.js";
import { validateForCreation } from "../../packages/validator/dist/index.js";
import { acquireManagedProfileLock, defaultRawRoot, defaultResearchRoot, repositoryRoot, resolveStateDirectory } from "./lib/paths.mjs";
import { stableJson } from "./lib/normalize.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";
import { minimumPairGap, occlusionCount } from "./lib/post-interaction-visual.mjs";

const generatedAt = "2026-08-01T03:00:00.000Z";
const legacyCases = [
  {
    probeId: "wave16-pattern-release-canary-v1",
    seed: "wave16-pattern-release-v1",
    blueprint: repeatingPatternUnitBlueprint,
    standardCode: "[2수02-01]",
    grade: 2,
    manipulation: "pattern-block-repeat-unit-drag",
    categoryUnit: "Unit02",
    releasedTools: ["SM02PB"],
    sourceRole: "completion-block-1",
    targetRole: "next-slot-1",
    action: "choose-repeat-unit-and-extend-pattern",
    evidenceName: "wave16-pattern-release-canary.json",
    previewName: "wave16/repeating-pattern.png"
  },
  {
    probeId: "wave17-multiplication-release-canary-v1",
    seed: "wave17-multiplication-release-v1",
    blueprint: multiplicationArrayMeaningBlueprint,
    standardCode: "[2수01-10]",
    grade: 2,
    manipulation: "multiplication-array-choice-drag",
    categoryUnit: "Unit01",
    releasedTools: [],
    sourceRole: "position-card-1",
    targetRole: "prediction-box",
    action: "choose-expression-and-check-grouped-array",
    evidenceName: "wave17-multiplication-release-canary.json",
    previewName: "wave17/multiplication-array.png"
  },
  {
    probeId: "wave17-probability-release-canary-v1",
    seed: "wave17-probability-release-v1",
    blueprint: probabilityBagComparisonBlueprint,
    standardCode: "[6수04-04]",
    grade: 6,
    manipulation: "probability-fraction-strip-drag",
    categoryUnit: "Unit04",
    releasedTools: ["NO03FM"],
    sourceRole: "left-strip",
    targetRole: "left-lane-surface",
    action: "choose-relation-and-align-probability-strips",
    evidenceName: "wave17-probability-release-canary.json",
    previewName: "wave17/probability-bag-comparison.png"
  }
];
const categoryUnitByDomain = {
  "수와 연산": "Unit01",
  "변화와 관계": "Unit02",
  "도형과 측정": "Unit03",
  "자료와 가능성": "Unit04"
};
const claimEvidenceCases = claimEvidenceActivityProfiles.map((profile) => {
  const blueprint = claimEvidenceBlueprints.find(
    (candidate) => candidate.id === profile.activityId
  );
  if (!blueprint) {
    throw new Error(`wave18-blueprint-missing:${profile.activityId}`);
  }
  return {
    probeId: `wave18-${profile.profileId}-release-canary-v1`,
    seed: profile.presentation
      ? `wave21-${profile.profileId}-readable-release-v4`
      : `wave18-${profile.profileId}-release-v1`,
    blueprint,
    problemCount: profile.presentation?.problemCount ?? 2,
    standardCode: profile.standardCode,
    grade: profile.recommendedGrade,
    manipulation: "claim-evidence-revision-drag",
    categoryUnit: categoryUnitByDomain[profile.domain],
    releasedTools: [],
    sourceRole: "position-card-1",
    targetRole: "prediction-box",
    action: "choose-claim-and-check-evidence",
    evidenceName: `wave18-${profile.profileId}-release-canary.json`,
    previewName: `wave18/${profile.profileId}.png`
  };
});
const cases = [...legacyCases, ...claimEvidenceCases];
const onlyBlueprintId = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length);
const wave18Only = process.argv.includes("--wave18");
const selectedCases = onlyBlueprintId
  ? cases.filter((entry) => entry.blueprint.id === onlyBlueprintId)
  : wave18Only
    ? claimEvidenceCases
    : cases;
if (onlyBlueprintId && selectedCases.length === 0) {
  throw new Error(`wave16-17-canary-activity-unknown:${onlyBlueprintId}`);
}

function prepareCase(entry) {
  const curriculum = resolveCurriculum(entry.standardCode);
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: entry.probeId,
    supported: true,
    templateId: entry.blueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: entry.grade,
    standardCode: curriculum.record.code,
    learningGoal: entry.blueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: entry.problemCount ?? 2,
    difficulty: "normal",
    ...(entry.blueprint.id === probabilityBagComparisonBlueprint.id ? { denominatorRelation: "mixed" } : {}),
    manipulation: entry.manipulation,
    rationale: ["실제 MathCanvas 저장·재열기·일회성 조작 canary입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = prepareRegisteredActivityForEnvelopeValidation(recommendation, {
    seed: entry.seed,
    generatedAt,
    activityId: entry.seed
  });
  assertCognitiveManifestBound(plan.blueprint);
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  const validation = validateForCreation(resolved, compiled, new Date(generatedAt));
  if (!validation.canCreate) {
    throw new Error(
      `${entry.probeId}-local-validation-failed:${JSON.stringify(
        validation.issues.map(({ code, role, message }) => ({
          code,
          role,
          message
        }))
      )}`
    );
  }
  return { plan, resolved, compiled, validation };
}

async function dragCenter(page, source, target, placement = "center") {
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  const destinationX = placement === "leading-edge"
    ? target.x + source.width / 2
    : target.x + target.width / 2;
  await page.mouse.move(destinationX, target.y + target.height / 2, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(250);
}

function targetOverflow(box, target) {
  return Math.max(
    0,
    target.x - box.x,
    target.y - box.y,
    box.x + box.width - (target.x + target.width),
    box.y + box.height - (target.y + target.height)
  );
}

const stateDirectory = resolveStateDirectory();
let releaseLock;
let authSession;
try {
  releaseLock = acquireManagedProfileLock(stateDirectory);
  authSession = await createLiveAuthHeadlessSession(stateDirectory);
  for (const entry of selectedCases) {
    const prepared = prepareCase(entry);
    const rawOutput = join(defaultRawRoot, entry.evidenceName.replace(".json", ".raw.json"));
    let creation;
    let reusedExisting = false;
    if (existsSync(rawOutput)) {
      const previous = JSON.parse(readFileSync(rawOutput, "utf8"));
      if (previous.payloadHash === prepared.compiled.payloadHash && previous.creation?.ok === true) {
        creation = previous.creation;
        reusedExisting = true;
      }
    }
    if (!creation) {
      const runtime = new ManagedChromeRuntime({ userDataDirectory: join(stateDirectory, "chrome-profile"), launcher: authSession.launcher, headless: true });
      try {
        creation = await runtime.createProject(prepared.compiled.payload, prepared.compiled.payloadHash);
      } finally {
        await runtime.close();
      }
      if (!creation.ok) throw new Error(`${entry.probeId}-create-failed:${creation.errorCode}`);
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

    let blockedProjectWriteRequestCount = 0;
    const context = await authSession.newContext({
      viewport: {
        width: 1700,
        height: (entry.problemCount ?? 2) === 1 ? 1300 : 2100
      }
    });
    try {
      await context.route("**/*", async (route) => {
        const method = route.request().method().toUpperCase();
        if (["GET", "HEAD", "OPTIONS"].includes(method)) return route.continue();
        if (new URL(route.request().url()).pathname.startsWith("/api/project")) blockedProjectWriteRequestCount += 1;
        return route.abort();
      });
      const page = await context.newPage();
      await page.goto(creation.editorUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      try {
        await page.waitForFunction(
          () => document.querySelectorAll("[id]").length > 20,
          undefined,
          { timeout: 30_000 }
        );
      } catch (error) {
        const failurePreview = join(
          repositoryRoot,
          ".mathcanvas-contract-lab",
          "previews",
          "visual-failures",
          `${entry.probeId}-reopen.png`
        );
        mkdirSync(dirname(failurePreview), { recursive: true, mode: 0o700 });
        await page.screenshot({ path: failurePreview, fullPage: true });
        const state = await page.evaluate(() => ({
          pathname: location.pathname.replace(/\/view\/[^/]+$/, "/view/<redacted-project>"),
          idCount: document.querySelectorAll("[id]").length,
          bodyText: document.body.innerText.trim().slice(0, 160)
        }));
        throw new Error(
          `${entry.probeId}-reopen-render-timeout:${JSON.stringify({ ...state, failurePreview })}`,
          { cause: error }
        );
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);

      const initialPreviewOutput = join(
        repositoryRoot,
        ".mathcanvas-contract-lab",
        "previews",
        entry.previewName.replace(/\.png$/, "-initial.png")
      );
      mkdirSync(dirname(initialPreviewOutput), {
        recursive: true,
        mode: 0o700
      });
      await page.screenshot({
        path: initialPreviewOutput,
        fullPage: true
      });

      const persistedShape = await page.evaluate(async (projectId) => {
        const response = await fetch(`/api/project/${encodeURIComponent(projectId)}`, { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error(`project-reopen-failed:${response.status}`);
        const body = await response.json();
        const contents = body?.contentsJson ?? [];
        return {
          objectCount: contents.length,
          candidateCount: contents.filter((object) => /^.*-position-card-\d+$/.test(String(object?.id ?? ""))).length,
          patternBlockCount: contents.filter((object) => String(object?.svgId ?? "").startsWith("SM02PB-")).length,
          arrayTextCount: contents.filter((object) => String(object?.id ?? "").endsWith("-array-text")).length,
          fractionStripCount: contents.filter((object) => String(object?.svgId ?? "").startsWith("NO03FM-")).length,
          patternModuleActive: body?.canvasOption?.moduleArr?.Unit03?.SM02PB === true,
          fractionModuleActive: body?.canvasOption?.moduleArr?.Unit01?.NO03FM === true
        };
      }, creation.projectId);

      const firstItem = prepared.resolved.items[0];
      const itemEmissions = prepared.resolved.emissions.filter((candidate) => candidate.itemId === firstItem.id);
      const byRole = (role) => itemEmissions.find((candidate) => candidate.role === role);
      const choiceWithText = (text) => itemEmissions.find(
        (candidate) => /^position-card-\d+$/.test(candidate.role) && candidate.toolIntent.properties.text === text
      );
      let interactionSteps;
      if (entry.blueprint.id === repeatingPatternUnitBlueprint.id) {
        const pieceWithVariant = (variant) => itemEmissions.find(
          (candidate) => candidate.role.startsWith("completion-block-") && candidate.toolIntent.properties.variant === variant
        );
        interactionSteps = [
          { source: choiceWithText(firstItem.values.correctValueText), target: byRole("prediction-box") },
          { source: pieceWithVariant(firstItem.values.sequenceVariant1), target: byRole("next-slot-1") },
          { source: pieceWithVariant(firstItem.values.sequenceVariant2), target: byRole("next-slot-2") }
        ];
      } else if (
        entry.blueprint.id === multiplicationArrayMeaningBlueprint.id ||
        claimEvidenceBlueprints.some(
          (blueprint) => blueprint.id === entry.blueprint.id
        )
      ) {
        interactionSteps = [
          { source: choiceWithText(firstItem.values.correctValueText), target: byRole("prediction-box") }
        ];
      } else {
        const relation = itemEmissions.find(
          (candidate) => ["less-symbol", "equal-symbol", "greater-symbol"].includes(candidate.role) &&
            candidate.toolIntent.properties.text === firstItem.values.correctRelation
        );
        interactionSteps = [
          { source: relation, target: byRole("relation-slot-surface") },
          { source: byRole("left-strip"), target: byRole("left-lane-surface"), placement: "leading-edge" },
          { source: byRole("right-strip"), target: byRole("right-lane-surface"), placement: "leading-edge" }
        ];
      }
      if (interactionSteps.some((step) => !step.source || !step.target)) {
        throw new Error(`${entry.probeId}-interaction-role-missing`);
      }
      const moveDistances = [];
      const movedBoxes = [];
      const targetBoxes = [];
      for (const step of interactionSteps) {
        const source = await page.locator(`[id="${step.source.id}"]`).boundingBox();
        const target = await page.locator(`[id="${step.target.id}"]`).boundingBox();
        if (!source || !target) throw new Error(`${entry.probeId}-interaction-box-missing`);
        await dragCenter(page, source, target, step.placement);
        const moved = await page.locator(`[id="${step.source.id}"]`).boundingBox();
        if (!moved) throw new Error(`${entry.probeId}-moved-box-missing`);
        moveDistances.push(Math.hypot(moved.x - source.x, moved.y - source.y));
        movedBoxes.push(moved);
        targetBoxes.push(target);
      }
      await page.keyboard.press("Escape");
      const viewport = page.viewportSize();
      await page.mouse.click(
        Math.max(50, (viewport?.width ?? 1700) - 120),
        Math.max(50, (viewport?.height ?? 2100) - 120)
      );
      await page.waitForTimeout(150);
      movedBoxes.length = 0;
      for (const step of interactionSteps) {
        const moved = await page.locator(`[id="${step.source.id}"]`).boundingBox();
        if (!moved) throw new Error(`${entry.probeId}-settled-box-missing`);
        movedBoxes.push(moved);
      }
      const moveDistance = Math.min(...moveDistances);
      if (moveDistance < 20) throw new Error(`${entry.probeId}-interaction-did-not-move:${moveDistance}`);
      const targetOverflows = movedBoxes.map((box, index) => targetOverflow(box, targetBoxes[index]));
      const maximumTargetOverflowPx = Math.max(...targetOverflows);
      const movedPairOverlapCount = movedBoxes.length > 1 ? occlusionCount(movedBoxes) : 0;
      const minimumMovedGap = movedBoxes.length > 1 ? minimumPairGap(movedBoxes) : null;
      const allMovedInsideTargets = maximumTargetOverflowPx <= 5;
      let commonStartResidualPx = null;
      if (entry.blueprint.id === probabilityBagComparisonBlueprint.id) {
        const startLineEmission = byRole("start-line");
        const startLineBox = startLineEmission
          ? await page.locator(`[id="${startLineEmission.id}"]`).boundingBox()
          : null;
        if (!startLineBox) throw new Error(`${entry.probeId}-start-line-box-missing`);
        const startAnchorX = startLineBox.x + startLineBox.width / 2;
        commonStartResidualPx = Math.max(
          ...interactionSteps
            .map((step, index) => ({ step, box: movedBoxes[index] }))
            .filter(({ step }) => step.placement === "leading-edge")
            .map(({ box }) => Math.abs(box.x - startAnchorX))
        );
      }
      if (
        !allMovedInsideTargets ||
        movedPairOverlapCount !== 0 ||
        (commonStartResidualPx !== null && commonStartResidualPx > 5)
      ) {
        const failurePreview = join(
          repositoryRoot,
          ".mathcanvas-contract-lab",
          "previews",
          "visual-failures",
          `${entry.probeId}.png`
        );
        mkdirSync(dirname(failurePreview), { recursive: true, mode: 0o700 });
        await page.screenshot({ path: failurePreview, fullPage: true });
        const placements = interactionSteps.map((step, index) => ({
          sourceRole: step.source.role,
          targetRole: step.target.role,
          movedBox: movedBoxes[index],
          targetBox: targetBoxes[index],
          overflow: targetOverflows[index]
        }));
        throw new Error(
          `${entry.probeId}-post-interaction-visual-invalid:${JSON.stringify({ maximumTargetOverflowPx, movedPairOverlapCount, minimumMovedGap, commonStartResidualPx, failurePreview, placements })}`
        );
      }

      const previewOutput = join(repositoryRoot, ".mathcanvas-contract-lab", "previews", entry.previewName);
      mkdirSync(dirname(previewOutput), { recursive: true, mode: 0o700 });
      await page.screenshot({ path: previewOutput, fullPage: true });
      const roleCount = (role) => prepared.resolved.emissions.filter((candidate) => candidate.role === role).length;
      const reopenShape = {
        idCount: await page.locator("[id]").count(),
        sourceRoleCount: roleCount(entry.sourceRole),
        targetRoleCount: roleCount(entry.targetRole),
        predictionBoxCount: roleCount("prediction-box"),
        explanationBoxCount: roleCount("explanation-box")
      };
      const evidence = {
        schemaVersion: "1.0.0",
        probeId: entry.probeId,
        observedAt: new Date().toISOString(),
        status: "pass",
        blueprintId: prepared.plan.blueprint.id,
        blueprintVersion: prepared.plan.blueprint.version,
        blueprintContentHash: prepared.plan.blueprint.contentHash,
        layoutPresetContentHash: sha256Hex(getLayoutPreset(prepared.plan.blueprint.layout.tokenSet)),
        payloadHash: prepared.compiled.payloadHash,
        projectReferenceHash: sha256Hex(creation.projectId),
        createRequestCount: 1,
        existingProjectWriteCount: blockedProjectWriteRequestCount,
        localValidationIssueCount: prepared.validation.issues.length,
        editorPath: "/ko/view/<redacted-project>",
        categoryUnit: entry.categoryUnit,
        releasedTools: entry.releasedTools,
        problemCount: prepared.resolved.items.length,
        persistedShape,
        reopenShape,
        interactionShape: {
          action: entry.action,
          moveDistance,
          movedRoleCount: interactionSteps.length,
          correctDecisionPlaced: true,
          allMovedInsideTargets,
          maximumTargetOverflowPx,
          movedPairOverlapCount,
          minimumMovedGap,
          commonStartResidualPx,
          transientOnly: true,
          existingProjectWriteCount: blockedProjectWriteRequestCount
        },
        previewPath: `.mathcanvas-contract-lab/previews/${entry.previewName}`,
        reusedExisting
      };
      const evidenceOutput = join(defaultResearchRoot, entry.evidenceName);
      mkdirSync(dirname(evidenceOutput), { recursive: true, mode: 0o700 });
      writeFileSync(evidenceOutput, stableJson(evidence), { encoding: "utf8", mode: 0o600 });
      writeFileSync(rawOutput, stableJson({ schemaVersion: "1.0.0", observedAt: evidence.observedAt, payloadHash: prepared.compiled.payloadHash, creation }), { encoding: "utf8", mode: 0o600 });
      process.stdout.write(
        `PASS ${entry.probeId} ${creation.editorUrl}\nINITIAL ${initialPreviewOutput}\nPREVIEW ${previewOutput}\n`
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await authSession?.close().catch(() => undefined);
  releaseLock?.();
}
// connectOverCDP의 외부 로그인 Chrome은 유지하므로 성공한 일회성 CLI는
// 증거와 lock을 모두 정리한 뒤 명시적으로 종료한다.
process.exit(0);
