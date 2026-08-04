#!/usr/bin/env node
import {
  mkdirSync,
  writeFileSync
} from "node:fs";
import { createHash } from "node:crypto";
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
  listRegisteredBlueprints,
  prepareRegisteredActivityForEnvelopeValidation
} from "../../packages/templates/dist/registry.js";
import {
  validateForCreation
} from "../../packages/validator/dist/index.js";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  acquireManagedProfileLock,
  defaultRawRoot,
  defaultResearchRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { stableJson } from "./lib/normalize.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";
import {
  classifyP3CanaryResult,
  validateP3ReleaseCanaryEvidence
} from "./validate-p3-release-canary.mjs";

const cases = [
  {
    blueprintId:
      "fraction.compare.unlike-denominators.visual-v1",
    standardCode: "[6수01-07]",
    grade: 5,
    difficulty: "normal",
    denominatorRelation: "mixed",
    manipulation: "fraction-strip-common-start-drag"
  },
  {
    blueprintId: "fraction.equivalent.same-whole.visual-v1",
    standardCode: "[6수01-06]",
    grade: 5,
    difficulty: "normal",
    manipulation: "equivalent-fraction-strip-match"
  },
  {
    blueprintId: "number.make-10.cards-v1",
    standardCode: "[2수01-04]",
    grade: 2,
    difficulty: "normal",
    manipulation: "number-card-make-ten-drag"
  }
];

function runId(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function waitForLogin(runtime, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const connection = await runtime.checkConnection({
      forceContractCheck: false,
      bringToFront: false
    });
    if (connection.ready) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("p3-canary-login-timeout");
}

function buildRecommendation(entry, learningGoal) {
  const curriculum = resolveCurriculum(entry.standardCode);
  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `p3-canary-${entry.blueprintId}`,
    supported: true,
    templateId: entry.blueprintId,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: entry.grade,
    standardCode: curriculum.record.code,
    learningGoal,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 4,
    difficulty: entry.difficulty,
    ...(entry.denominatorRelation
      ? { denominatorRelation: entry.denominatorRelation }
      : {}),
    manipulation: entry.manipulation,
    rationale: ["P3 release create-only canary입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}

let runtime;
let releaseLock;
let authSession;
try {
  const options = parseArguments(process.argv.slice(2), {
    "approve-create-only": {
      type: "boolean",
      required: true
    },
    "wait-for-login": {
      type: "boolean"
    },
    output: {
      type: "string",
      default: join(defaultResearchRoot, "p3-release-canary.json")
    },
    "raw-output": {
      type: "string",
      default: join(defaultRawRoot, "p3-release-canary.raw.json")
    }
  });
  if (options["approve-create-only"] !== true) {
    throw new Error("p3-canary-create-approval-required");
  }
  const observedAt = new Date();
  const id = runId(observedAt);
  const stateDirectory = resolveStateDirectory();
  releaseLock = acquireManagedProfileLock(stateDirectory);
  authSession = await createLiveAuthHeadlessSession(stateDirectory);
  runtime = new ManagedChromeRuntime({
    userDataDirectory: join(stateDirectory, "chrome-profile"),
    launcher: authSession.launcher,
    headless: true
  });
  if (options["wait-for-login"] === true) {
    await waitForLogin(runtime, 10 * 60 * 1000);
  }
  const preparedCases = cases.map((entry, index) => {
    const blueprint = listRegisteredBlueprints().find(
      (candidate) => candidate.id === entry.blueprintId
    );
    if (!blueprint) {
      throw new Error(
        `p3-canary-blueprint-unregistered:${entry.blueprintId}`
      );
    }
    const recommendation = buildRecommendation(
      entry,
      blueprint.learningObjective
    );
    const plan = prepareRegisteredActivityForEnvelopeValidation(
      recommendation,
      {
        seed: `p3-live-${id}-${index + 1}`,
        generatedAt: observedAt.toISOString(),
        activityId: `p3-live-${id}-${index + 1}`
      }
    );
    const title = `AI-CONTRACT-PROBE-P3-V1-${index + 1}`;
    const resolved = resolveActivity(plan);
    const canaryResolved = { ...resolved, title };
    const compiled = compileActivity(canaryResolved);
    const validation = validateForCreation(
      canaryResolved,
      compiled,
      observedAt
    );
    if (!validation.canCreate) {
      throw new Error(
        `p3-canary-local-validation-failed:${entry.blueprintId}:` +
          validation.issues.map((issue) => issue.code).join(",")
      );
    }
    return {
      entry,
      plan,
      title,
      blueprintContentHash: plan.blueprint.contentHash,
      layoutPresetContentHash: sha256Hex(
        getLayoutPreset(plan.blueprint.layout.tokenSet)
      ),
      payload: compiled.payload,
      payloadHash: compiled.payloadHash
    };
  });
  const rawResults = [];
  const results = [];
  for (const prepared of preparedCases) {
    const {
      entry,
      plan,
      title,
      blueprintContentHash,
      layoutPresetContentHash,
      payload,
      payloadHash
    } =
      prepared;
    const creation = await runtime.createProject(
      payload,
      payloadHash
    );
    const status = classifyP3CanaryResult(creation);
    rawResults.push({
      blueprintId: entry.blueprintId,
      blueprintContentHash,
      layoutPresetContentHash,
      title,
      payloadHash,
      status,
      creation
    });
    results.push({
      blueprintId: entry.blueprintId,
      blueprintContentHash,
      layoutPresetContentHash,
      variation: plan.options.variation,
      payloadHash,
      status,
      createRequestCount: creation.ok ? 1 : 0,
      existingProjectWriteCount: 0,
      ...(creation.ok
        ? {
            projectReferenceHash: digest(creation.projectId),
            editorPath: "/ko/view/<redacted-project>"
          }
        : {
            errorCode: creation.errorCode
          })
    });
    if (status !== "pass") break;
  }
  while (results.length < cases.length) {
    const entry = cases[results.length];
    results.push({
      blueprintId: entry.blueprintId,
      blueprintContentHash:
        preparedCases[results.length]?.blueprintContentHash ??
        "0".repeat(64),
      layoutPresetContentHash:
        preparedCases[results.length]?.layoutPresetContentHash ??
        "0".repeat(64),
      variation: {},
      payloadHash: "0".repeat(64),
      status: results.at(-1)?.status ?? "delivery-failed",
      createRequestCount: 0,
      existingProjectWriteCount: 0,
      errorCode: "not-attempted-after-blocker"
    });
  }
  const passCount = results.filter(
    (result) => result.status === "pass"
  ).length;
  const evidence = validateP3ReleaseCanaryEvidence({
    schemaVersion: "1.0.0",
    probeId: "p3-release-canary-v1",
    observedAt: observedAt.toISOString(),
    results,
    summary: {
      passCount,
      overallStatus: passCount === 3 ? "pass" : "blocked"
    }
  });
  mkdirSync(dirname(options.output), {
    recursive: true,
    mode: 0o700
  });
  mkdirSync(dirname(options["raw-output"]), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(options.output, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
  writeFileSync(
    options["raw-output"],
    stableJson({
      schemaVersion: "1.0.0",
      observedAt: observedAt.toISOString(),
      results: rawResults
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `P3_CANARY ${passCount}/3 ${evidence.summary.overallStatus}\n`
  );
  for (const result of rawResults) {
    process.stdout.write(
      `${result.blueprintId} ${result.status} ` +
        `${result.creation.editorUrl ?? result.creation.errorCode}\n`
    );
  }
  if (passCount !== 3) process.exitCode = 2;
} catch (error) {
  failCli(error);
} finally {
  if (runtime) await runtime.close();
  if (authSession) await authSession.close();
  if (releaseLock) releaseLock();
}
