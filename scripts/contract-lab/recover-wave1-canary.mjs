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
import { assertNoSensitiveData, stableJson } from "./lib/normalize.mjs";
import {
  ROUND_TRIP_NUMERIC_TOLERANCE,
  buildWave1CanaryPayload,
  compareRoundTripValues,
  countWave1ToolObjects,
  exactRoundTripHash,
  validateWave1CanaryGoldenBinding
} from "./lib/round-trip-evidence.mjs";
import {
  WAVE1_CANARY_RECOVERY_ARTIFACT_ID,
  WAVE1_CANARY_RECOVERY_PROBE_ID,
  WAVE1_CANARY_REDACTED_PROJECT_PATH,
  assertSingleFractionMovement,
  buildWave1CanaryRecoveryClaims,
  buildWave1CanaryRecoveryToolResults,
  comparableFromProjectPayload,
  projectComparison,
  validateWave1CanaryRecoveryEvidence
} from "./lib/canary-evidence.mjs";

const origin = "https://mathcanvas.vivasam.com";
const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
let context;
let releaseLock;

function restoreRoundTripEquivalentNumbers(initial, persisted) {
  if (
    typeof initial === "number" &&
    typeof persisted === "number" &&
    Number.isFinite(initial) &&
    Number.isFinite(persisted) &&
    Math.abs(initial - persisted) <=
      ROUND_TRIP_NUMERIC_TOLERANCE
  ) {
    return initial;
  }
  if (
    Array.isArray(initial) &&
    Array.isArray(persisted) &&
    initial.length === persisted.length
  ) {
    if (
      persisted.every(
        (value) =>
          value !== null &&
          typeof value === "object" &&
          typeof value.id === "string"
      )
    ) {
      const initialById = new Map(
        initial.map((value) => [value?.id, value])
      );
      if (
        persisted.every((value) => initialById.has(value.id))
      ) {
        return persisted.map((value) =>
          restoreRoundTripEquivalentNumbers(
            initialById.get(value.id),
            value
          )
        );
      }
    }
    return persisted.map((value, index) =>
      restoreRoundTripEquivalentNumbers(initial[index], value)
    );
  }
  if (
    initial !== null &&
    persisted !== null &&
    typeof initial === "object" &&
    typeof persisted === "object" &&
    !Array.isArray(initial) &&
    !Array.isArray(persisted)
  ) {
    return Object.fromEntries(
      Object.entries(persisted).map(([key, value]) => [
        key,
        Object.hasOwn(initial, key)
          ? restoreRoundTripEquivalentNumbers(
              initial[key],
              value
            )
          : value
      ])
    );
  }
  return persisted;
}

try {
  const options = parseArguments(process.argv.slice(2), {
    "run-id": { type: "string", required: true },
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
    headless: { type: "boolean", default: true }
  });
  const stateDirectory = resolveStateDirectory(options["state-dir"]);
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "canary recovery evidence"
  );
  const artifactsPath = assertPathInside(
    options["artifacts-output"],
    options["research-root"],
    "canary recovery artifacts"
  );
  const goldenFixture = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "fixtures",
        "golden",
        "fraction-comparison.p0-v1.json"
      ),
      "utf8"
    )
  );
  const goldenPayload =
    goldenFixture.results.compiledProject.payload;
  const runId = options["run-id"];
  const submittedPayload = buildWave1CanaryPayload(
    goldenPayload,
    runId
  );
  validateWave1CanaryGoldenBinding({
    goldenPayload,
    expectedGoldenPayloadHash:
      goldenFixture.invariants.payloadHash,
    submittedPayload,
    runId
  });
  const submittedComparable =
    comparableFromProjectPayload(submittedPayload);
  const blockedExternalWrites = [];
  const unexpectedWrites = [];

  releaseLock = acquireManagedProfileLock(stateDirectory);
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
    const parsed = new URL(request.url());
    if (parsed.origin !== origin) {
      blockedExternalWrites.push({
        method,
        path: `${parsed.origin}${parsed.pathname}`
      });
    } else {
      unexpectedWrites.push({
        method,
        path: parsed.pathname.replace(
          /^\/api\/project\/[^/]+/,
          WAVE1_CANARY_REDACTED_PROJECT_PATH
        )
      });
    }
    await route.abort("blockedbyclient");
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  const canaryProjectId = await page.evaluate(
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
        { credentials: "include", cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(
          `canary-recovery-query-failed:${response.status}`
        );
      }
      const body = await response.json();
      const exact = (body?.list ?? []).filter(
        (project) => project?.projectTitle === title
      );
      if (
        exact.length !== 1 ||
        typeof exact[0]?.projectId !== "string" ||
        !/^[A-Za-z0-9_-]{1,160}$/.test(exact[0].projectId)
      ) {
        throw new Error("canary-recovery-target-not-unique");
      }
      return exact[0].projectId;
    },
    submittedPayload.projectTitle
  );
  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(canaryProjectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForFunction(
    (count) =>
      document.querySelectorAll(".item.group").length === count,
    submittedComparable.contentsJson.length,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(1500);
  const finalReopenedComparable = comparableFromProjectPayload(
    await page.evaluate(async (projectId) => {
      const response = await fetch(
        `/api/project/${encodeURIComponent(projectId)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(
          `canary-recovery-get-failed:${response.status}`
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
    }, canaryProjectId)
  );
  const reconstructedSavedPayload = {
    projectTitle: finalReopenedComparable.projectTitle,
    tags: finalReopenedComparable.tags,
    contentsJson: restoreRoundTripEquivalentNumbers(
      submittedComparable.contentsJson,
      finalReopenedComparable.contentsJson
    ),
    canvasOption: finalReopenedComparable.canvasOption
  };
  const fractionIds =
    countWave1ToolObjects(
      submittedComparable.contentsJson
    ).objectIdsByTool.get("NO03FM") ?? [];
  const matchingMutations = [];
  const rejectedMutations = [];
  for (const candidateId of fractionIds) {
    try {
      const mutation = assertSingleFractionMovement({
        initialComparable: submittedComparable,
        savedPayload: reconstructedSavedPayload,
        targetObjectId: candidateId
      });
      matchingMutations.push({ targetObjectId: candidateId, mutation });
    } catch (error) {
      rejectedMutations.push({
        candidateId,
        reason:
          error instanceof Error ? error.message : String(error)
      });
    }
  }
  if (matchingMutations.length !== 1) {
    throw new Error(
      `canary-recovery-mutation-not-unique:` +
        `${matchingMutations.length}:` +
        JSON.stringify(rejectedMutations)
    );
  }
  const [{ targetObjectId, mutation }] = matchingMutations;
  const persistenceComparison = compareRoundTripValues(
    mutation.savedComparable,
    finalReopenedComparable
  );
  if (
    persistenceComparison.normalizedEqual !== true ||
    persistenceComparison.unexpectedDifferenceCount !== 0
  ) {
    throw new Error("canary-recovery-final-payload-mismatch");
  }
  const objectIds = finalReopenedComparable.contentsJson.map(
    (object) => object.id
  );
  const instructionText =
    goldenPayload.contentsJson.find(
      (object) => object.id === "instruction-main"
    )?.text ?? "";
  const renderFinal = await page.evaluate(
    ({ expectedIds, title, instruction }) => {
      const bodyText = document.body.innerText
        .replace(/\s+/g, " ")
        .trim();
      const renderedObjectIds = expectedIds.filter(
        (id) => document.getElementById(id) !== null
      );
      const visibleObjectIds = expectedIds.filter((id) => {
        const element = document.getElementById(id);
        if (!element) return false;
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      });
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
        renderedObjectIds,
        visibleObjectIds,
        containsProjectTitle: bodyText.includes(title),
        containsGoldenInstruction:
          bodyText.includes(instruction)
      };
    },
    {
      expectedIds: objectIds,
      title: finalReopenedComparable.projectTitle,
      instruction: instructionText
    }
  );
  if (unexpectedWrites.length !== 0) {
    throw new Error(
      `canary-recovery-unexpected-writes:${JSON.stringify(
        unexpectedWrites
      )}`
    );
  }
  const artifacts = {
    schemaVersion: "1.0.0",
    artifactId: WAVE1_CANARY_RECOVERY_ARTIFACT_ID,
    runId,
    submittedPayload,
    submittedComparable,
    reconstructedSavedPayload,
    finalReopenedComparable,
    render: { final: renderFinal },
    assertedOriginalOperations: [
      {
        method: "POST",
        path: "/api/project",
        payloadHash: exactRoundTripHash(submittedPayload),
        recovery: "exact-title-current-golden-binding"
      },
      {
        method: "PUT",
        path: WAVE1_CANARY_REDACTED_PROJECT_PATH,
        payloadHash: exactRoundTripHash(
          reconstructedSavedPayload
        ),
        recovery: "guarded-save-final-reopen"
      }
    ],
    readOnlyRecoveryBoundary: {
      observedProductWriteCount: 0,
      blockedExternalWrites,
      unexpectedWrites
    }
  };
  assertNoSensitiveData(artifacts);
  const toolResults =
    buildWave1CanaryRecoveryToolResults(artifacts);
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: WAVE1_CANARY_RECOVERY_PROBE_ID,
    observedAt: new Date().toISOString(),
    provenance: {
      source: "current-golden-guarded-save-recovery",
      runId,
      goldenFixtureId: goldenFixture.fixtureId,
      goldenFixtureVersion: goldenFixture.fixtureVersion,
      goldenPayloadHash: goldenFixture.invariants.payloadHash,
      submittedPayloadHash: exactRoundTripHash(submittedPayload),
      artifactsHash: exactRoundTripHash(artifacts)
    },
    claims: buildWave1CanaryRecoveryClaims(
      toolResults,
      exactRoundTripHash(finalReopenedComparable)
    ),
    toolResults,
    roundTrip: {
      numericTolerance: ROUND_TRIP_NUMERIC_TOLERANCE,
      reconstructionConsistency: {
        ...projectComparison(persistenceComparison),
        derivedFromFinalGet: true,
        independentlyCheckedPersistedFields: [
          "categoryId",
          "isNoteworthy",
          "isShowMenuOnActivity",
          "studyLevel"
        ]
      }
    },
    render: {
      submittedObjectCount: submittedComparable.contentsJson.length,
      finalItemGroupCount: renderFinal.itemGroupCount,
      finalVisibleObjectCount:
        renderFinal.visibleObjectIds.length
    },
    interaction: {
      toolKey: "NO03FM",
      targetObjectId,
      changedObjectIds: mutation.changedObjectIds,
      changedFields: mutation.changedFields,
      delta: mutation.delta,
      editorRehydration: mutation.editorRehydration,
      automaticSaveMetadataFields:
        mutation.automaticSaveMetadataFields,
      clientTransformChanged: true
    },
    writeBoundary: {
      mode: "read-only-recovery-after-one-create-one-save",
      assertedOriginalCreateCount: 1,
      assertedOriginalSaveCount: 1,
      measuredRecoveryWriteCount: 0,
      originalWriteCountMeasured: false,
      originalRawWriteLogPersisted: false
    },
    recoveryLimitation:
      "The original 2xx PUT and request body passed the guarded route, but the raw operation log was not persisted before the render assertion failed. The saved body is reconstructed from the current UI save contract and final GET, so reconstructionConsistency is not an independent PUT-to-GET measurement and original write counts are asserted, not measured."
  };
  assertNoSensitiveData(evidence);
  const validation = validateWave1CanaryRecoveryEvidence({
    evidence,
    artifacts,
    goldenFixture
  });
  if (!validation.ok) {
    throw new Error(
      `canary-recovery-evidence-invalid:${JSON.stringify(
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
    `PASS read-only recovery for current-golden canary ${runId}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
