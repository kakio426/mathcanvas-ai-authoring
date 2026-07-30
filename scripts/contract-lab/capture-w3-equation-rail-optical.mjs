#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema
} from "../../packages/contracts/dist/index.js";
import {
  resolveCurriculum
} from "../../packages/curriculum/dist/index.js";
import {
  compileActivity,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import {
  MATHCANVAS_HOME_URL,
  createProjectInMathCanvas
} from "../../packages/managed-browser/dist/index.js";
import {
  generateMakeTenNumberCardsActivity,
  makeTenNumberCardsBlueprint
} from "../../packages/templates/dist/index.js";
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

function sha256File(path) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
}

let context;
let releaseLock;
try {
  const options = parseArguments(process.argv.slice(2), {
    "approve-create-only": {
      type: "boolean",
      required: true
    },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "w3-equation-rail-optical.json"
      )
    },
    screenshot: {
      type: "string",
      default: join(
        defaultRawRoot,
        "w3-equation-rail-optical.raw.png"
      )
    },
    "raw-output": {
      type: "string",
      default: join(
        defaultRawRoot,
        "w3-equation-rail-optical.raw.json"
      )
    }
  });
  if (options["approve-create-only"] !== true) {
    throw new Error("w3-optical-create-approval-required");
  }

  const observedAt = new Date();
  const stateDirectory = resolveStateDirectory();
  const profileDirectory = join(
    stateDirectory,
    "chrome-profile"
  );
  releaseLock = acquireManagedProfileLock(stateDirectory);

  const curriculum = resolveCurriculum("[2수01-04]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "w3-optical-canary",
    supported: true,
    templateId: makeTenNumberCardsBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 2,
    standardCode: curriculum.record.code,
    learningGoal: makeTenNumberCardsBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 2,
    difficulty: "normal",
    manipulation: "number-card-make-ten-drag",
    rationale: ["W3 수식 레일 광학 canary입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = generateMakeTenNumberCardsActivity(
    recommendation,
    {
      seed: "w3-equation-rail-optical-v1",
      generatedAt: observedAt.toISOString(),
      activityId: "w3-equation-rail-optical-v1"
    }
  );
  const resolved = resolveActivity(plan);
  const canaryResolved = {
    ...resolved,
    title: "AI-CONTRACT-PROBE-W3-RAIL-V1"
  };
  const compiled = compileActivity(canaryResolved);
  const validation = validateForCreation(
    canaryResolved,
    compiled,
    observedAt
  );
  if (!validation.canCreate) {
    throw new Error(
      `w3-optical-local-validation-failed:${validation.issues
        .map((issue) => issue.code)
        .join(",")}`
    );
  }

  const firstItem = resolved.items[0];
  const railRoles = [
    "left-slot",
    "plus-operator",
    "right-slot",
    "equals-operator",
    "total-value"
  ];
  const rail = railRoles.map((role) => {
    const emission = resolved.emissions.find(
      (candidate) =>
        candidate.itemId === firstItem.id &&
        candidate.role === role
    );
    if (!emission) {
      throw new Error(`w3-optical-rail-role-missing:${role}`);
    }
    return emission;
  });
  const centers = rail.map(
    (emission) =>
      emission.bounds.y + emission.bounds.height / 2
  );
  const gaps = rail.slice(1).map((emission, index) => {
    const previous = rail[index];
    return (
      emission.bounds.x -
      (previous.bounds.x + previous.bounds.width)
    );
  });

  context = await chromium.launchPersistentContext(
    profileDirectory,
    {
      channel: "chrome",
      headless: true,
      viewport: { width: 1920, height: 1080 }
    }
  );
  const pages = context.pages();
  const page = pages[0] ?? (await context.newPage());
  await page.goto(MATHCANVAS_HOME_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  const creation = await page.evaluate(
    createProjectInMathCanvas,
    {
      payload: compiled.payload,
      expectedPayloadHash: compiled.payloadHash
    }
  );
  if (!creation.ok || !creation.projectId) {
    throw new Error(
      `w3-optical-create-failed:${creation.errorCode ?? "unknown"}`
    );
  }
  const editorUrl =
    `https://mathcanvas.vivasam.com/ko/view/${creation.projectId}`;
  await page.goto(editorUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForTimeout(10_000);
  mkdirSync(dirname(options.screenshot), {
    recursive: true,
    mode: 0o700
  });
  await page.screenshot({
    path: options.screenshot,
    fullPage: true
  });

  const screenshotSha256 = sha256File(options.screenshot);
  mkdirSync(dirname(options.output), {
    recursive: true,
    mode: 0o700
  });
  mkdirSync(dirname(options["raw-output"]), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(
    options.output,
    stableJson({
      schemaVersion: "1.0.0",
      probeId: "w3-equation-rail-optical-v1",
      observedAt: observedAt.toISOString(),
      blueprintId: makeTenNumberCardsBlueprint.id,
      blueprintContentHash:
        makeTenNumberCardsBlueprint.contentHash,
      payloadHash: compiled.payloadHash,
      headless: true,
      createRequestCount: 1,
      existingProjectWriteCount: 0,
      editorPath: "/ko/view/<redacted-project>",
      structuralRail: {
        roles: railRoles,
        centerDelta:
          Math.max(...centers) - Math.min(...centers),
        gaps,
        renderer: "common.formula",
        fontSize: 64
      },
      screenshot: {
        rawPath:
          ".mathcanvas-contract-lab/raw/w3-equation-rail-optical.raw.png",
        sha256: screenshotSha256
      },
      opticalReview: {
        status: "captured",
        reviewer: "pending",
        observation:
          "실제 MathCanvas renderer의 첫 문항 수식 잉크 경계를 검토해야 합니다."
      }
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  writeFileSync(
    options["raw-output"],
    stableJson({
      schemaVersion: "1.0.0",
      observedAt: observedAt.toISOString(),
      projectId: creation.projectId,
      editorUrl,
      screenshotPath: options.screenshot,
      screenshotSha256
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `W3_OPTICAL_CAPTURED ${screenshotSha256} ${options.output}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  if (context) await context.close().catch(() => undefined);
  if (releaseLock) releaseLock();
}
