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
  resolveStateDirectory
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  sanitizeUnknown,
  stableJson
} from "./lib/normalize.mjs";
import {
  ROUND_TRIP_NUMERIC_TOLERANCE,
  WAVE1_RELEASED_TOOL_KEYS,
  compareRoundTripValues,
  countWave1ToolObjectsWithPolicy,
  exactRoundTripHash,
  roundTripHash,
  validateWave1RoundTripEvidence
} from "./lib/round-trip-evidence.mjs";

const origin = "https://mathcanvas.vivasam.com";

function latestCreatorOwnedJob(snapshot) {
  return [...(snapshot.jobs ?? [])]
    .reverse()
    .find(
      (entry) =>
        entry?.status === "succeeded" &&
        entry?.result?.ok === true &&
        typeof entry?.result?.projectId === "string" &&
        entry?.job?.compiledProject?.payload
    );
}

function comparableFromPayload(payload) {
  return {
    projectTitle: payload.projectTitle,
    contentsJson: payload.contentsJson,
    canvasOption: payload.canvasOption,
    isShowMenuOnActivity: payload.isShowMenuOnActivity,
    isNoteworthy: payload.isNoteworthy,
    tags: payload.tags,
    studyLevel: payload.studyLevel,
    categoryId: payload.categoryId
  };
}

let context;
let releaseLock;
try {
  const options = parseArguments(process.argv.slice(2), {
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave1-released-baseline.roundtrip.json"
      )
    },
    "artifacts-output": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave1-released-baseline.artifacts.json"
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
    "round-trip evidence"
  );
  const artifactsPath = assertPathInside(
    options["artifacts-output"],
    options["research-root"],
    "round-trip artifacts"
  );
  const observedAt = new Date();
  const snapshot = JSON.parse(
    readFileSync(join(stateDirectory, "creation-jobs.json"), "utf8")
  );
  const record = latestCreatorOwnedJob(snapshot);
  if (!record) {
    throw new Error(
      "creator-owned-project-unavailable: 성공한 생성 작업이 없습니다."
    );
  }
  const submittedPayload = sanitizeUnknown(
    record.job.compiledProject.payload
  );
  assertNoSensitiveData(submittedPayload);
  if (
    exactRoundTripHash(submittedPayload) !== record.job.payloadHash
  ) {
    throw new Error("creator-owned-payload-hash-mismatch");
  }
  const submittedComparable = comparableFromPayload(submittedPayload);
  const submittedContents = submittedComparable.contentsJson;
  if (!Array.isArray(submittedContents)) {
    throw new Error("creator-owned-payload-invalid: contentsJson");
  }
  const submittedClassification =
    countWave1ToolObjectsWithPolicy(submittedContents, {
      allowLegacyFractionGroups: true
    });
  const fractionIds =
    submittedClassification.objectIdsByTool.get("NO03FM") ?? [];
  const movableFractionId = fractionIds.find((objectId) => {
    const object = submittedContents.find(
      (candidate) => candidate?.id === objectId
    );
    return (
      typeof object?.svgId === "string" &&
      object.svgId.startsWith("NO03FM-")
    );
  });
  if (!movableFractionId) {
    throw new Error("movable-fraction-unavailable");
  }

  releaseLock = acquireManagedProfileLock(stateDirectory);
  const observedWrites = [];
  context = await chromium.launchPersistentContext(
    join(stateDirectory, "chrome-profile"),
    {
      channel: "chrome",
      headless: options.headless === true,
      viewport: { width: 1440, height: 1000 }
    }
  );
  await context.route(`${origin}/**`, async (route) => {
    const method = route.request().method().toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      observedWrites.push({
        method,
        path: new URL(route.request().url()).pathname
      });
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(
    `${origin}/ko/view/${encodeURIComponent(record.result.projectId)}`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForFunction(
    (expectedCount) =>
      document.querySelectorAll(".item.group").length === expectedCount,
    submittedContents.length,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(3_000);

  const reopened = await page.evaluate(async (projectId) => {
    const response = await fetch(
      `/api/project/${encodeURIComponent(projectId)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`project-reopen-failed:${response.status}`);
    }
    const body = await response.json();
    return {
      comparable: {
        projectTitle: body.projectTitle,
        contentsJson: body.contentsJson,
        canvasOption: body.canvasOption,
        isShowMenuOnActivity: body.isShowMenuOnActivity,
        isNoteworthy: body.isNoteworthy ?? false,
        tags: body.tags,
        studyLevel: body.studyLevel,
        categoryId: body.category?.categoryId
      },
      render: {
        bodyText: document.body.innerText
          .replace(/\s+/g, " ")
          .trim(),
        visibleSvgCount: [...document.querySelectorAll("svg")].filter(
          (element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0;
          }
        ).length,
        mathFieldCount:
          document.querySelectorAll("math-field").length,
        itemGroupCount:
          document.querySelectorAll(".item.group").length,
        playgroundCount:
          document.querySelectorAll(".playground").length
      }
    };
  }, record.result.projectId);
  const reopenedComparable = sanitizeUnknown(reopened.comparable);
  assertNoSensitiveData(reopenedComparable);
  if (!Array.isArray(reopenedComparable.contentsJson)) {
    throw new Error("project-reopen-contract-invalid: contentsJson");
  }
  const reopenedClassification = countWave1ToolObjectsWithPolicy(
    reopenedComparable.contentsJson,
    { allowLegacyFractionGroups: true }
  );

  const objectIdsByTool = Object.fromEntries(
    WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => [
      toolKey,
      submittedClassification.objectIdsByTool.get(toolKey) ?? []
    ])
  );
  const renderedByTool = await page.evaluate((idsByTool) => {
    return Object.fromEntries(
      Object.entries(idsByTool).map(([toolKey, objectIds]) => [
        toolKey,
        objectIds.filter(
          (objectId) => document.getElementById(objectId) !== null
        ).length
      ])
    );
  }, objectIdsByTool);

  const target = page.locator(`#${movableFractionId}`);
  const box = await target.boundingBox();
  if (!box) throw new Error("fraction-render-target-missing");
  const transformBefore = await target.getAttribute("transform");
  await page.mouse.move(
    box.x + box.width / 2,
    box.y + box.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 60,
    box.y + box.height / 2 + 20,
    { steps: 10 }
  );
  await page.mouse.up();
  await page.waitForTimeout(500);
  const transformAfter = await target.getAttribute("transform");
  const postInteractionReopenedComparable = sanitizeUnknown(
    await page.evaluate(async (projectId) => {
      const response = await fetch(
        `/api/project/${encodeURIComponent(projectId)}`,
        { credentials: "include", cache: "no-store" }
      );
      const body = await response.json();
      return {
        projectTitle: body.projectTitle,
        contentsJson: body.contentsJson,
        canvasOption: body.canvasOption,
        isShowMenuOnActivity: body.isShowMenuOnActivity,
        isNoteworthy: body.isNoteworthy ?? false,
        tags: body.tags,
        studyLevel: body.studyLevel,
        categoryId: body.category?.categoryId
      };
    }, record.result.projectId)
  );
  assertNoSensitiveData(postInteractionReopenedComparable);

  const comparison = compareRoundTripValues(
    submittedComparable,
    reopenedComparable
  );
  const mutationComparison = compareRoundTripValues(
    reopenedComparable,
    postInteractionReopenedComparable
  );
  const persistedMutationCount =
    mutationComparison.numericDifferenceCount +
    mutationComparison.unexpectedDifferenceCount;
  const toolResults = WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => ({
    toolKey,
    submittedObjectCount:
      submittedClassification.counts.get(toolKey) ?? 0,
    reopenedObjectCount:
      reopenedClassification.counts.get(toolKey) ?? 0,
    renderedObjectCount: renderedByTool[toolKey] ?? 0
  }));
  const artifacts = {
    schemaVersion: "1.0.0",
    artifactId:
      "wave1-released-baseline-read-only-artifacts-v1",
    submittedPayload,
    submittedComparable,
    reopenedComparable,
    postInteractionReopenedComparable
  };
  assertNoSensitiveData(artifacts);
  const claims = Object.fromEntries(
    toolResults.map((result) => [
      result.toolKey,
      {
        lifecycle: {
          renderedObjectCount: result.renderedObjectCount,
          reopenedObjectCount: result.reopenedObjectCount
        },
        released: {
          comparableHash: roundTripHash(reopenedComparable),
          normalizedEqual: comparison.normalizedEqual
        },
        verified: {
          reopenedObjectCount: result.reopenedObjectCount,
          submittedObjectCount: result.submittedObjectCount
        }
      }
    ])
  );
  const evidence = {
    schemaVersion: "1.0.0",
    probeId: "wave1-released-baseline-read-only-v1",
    observedAt: observedAt.toISOString(),
    provenance: {
      source: "creator-owned-approved-job",
      creationStatus: "succeeded",
      creationCompletedAt: record.result.completedAt,
      submittedPayloadHash: exactRoundTripHash(submittedPayload),
      artifactsHash: exactRoundTripHash(artifacts)
    },
    claims,
    toolResults,
    roundTrip: {
      numericTolerance: ROUND_TRIP_NUMERIC_TOLERANCE,
      ...comparison,
      submittedComparableHash: roundTripHash(submittedComparable),
      reopenedComparableHash: roundTripHash(reopenedComparable)
    },
    render: {
      submittedObjectCount: submittedContents.length,
      itemGroupCount: reopened.render.itemGroupCount,
      playgroundCount: reopened.render.playgroundCount,
      visibleSvgCount: reopened.render.visibleSvgCount,
      mathFieldCount: reopened.render.mathFieldCount,
      containsProjectTitle: reopened.render.bodyText.includes(
        reopenedComparable.projectTitle
      ),
      containsInstruction: reopened.render.bodyText.includes(
        "두 띠를 출발선에 맞춰 비교해 보세요."
      )
    },
    interaction: {
      mode: "isolated-client-only",
      toolKey: "NO03FM",
      transformChanged:
        typeof transformBefore === "string" &&
        typeof transformAfter === "string" &&
        transformBefore !== transformAfter,
      persistedSourceUnchanged:
        mutationComparison.normalizedEqual &&
        persistedMutationCount === 0
    },
    writeBoundary: {
      mode: "block-all-writes",
      observedWriteRequestCount: observedWrites.length,
      persistedMutationCount
    }
  };
  const validation = validateWave1RoundTripEvidence(
    evidence,
    artifacts
  );
  if (!validation.ok) {
    throw new Error(
      `round-trip-evidence-invalid:${JSON.stringify(
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
    `PASS wave1 round-trip 4 tools ${submittedContents.length} objects ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
