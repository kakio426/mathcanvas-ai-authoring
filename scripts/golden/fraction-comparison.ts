import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTRACT_SCHEMA_VERSION,
  createApprovalReceipt,
  generationRequestSchema,
  recommendationSchema,
  sha256Hex
} from "@mathcanvas/contracts";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import {
  generateFractionComparisonActivity,
  projectRegisteredApprovalView
} from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";

export const P0_GOLDEN_FIXTURE_VERSION = "1.0.0" as const;
export const P0_GOLDEN_FIXTURE_ID =
  "fraction-comparison.p0-v1" as const;
export const P0_GOLDEN_SEED =
  "p0-fraction-comparison-seed-v1" as const;
export const P0_GOLDEN_REQUESTED_AT =
  "2026-07-29T00:00:00.000Z" as const;
export const P0_GOLDEN_GENERATED_AT =
  "2026-07-29T00:01:00.000Z" as const;
export const P0_GOLDEN_CHECKED_AT =
  "2026-07-29T00:02:00.000Z" as const;
export const P0_GOLDEN_APPROVED_AT =
  "2026-07-29T00:03:00.000Z" as const;
export const P0_GOLDEN_APPROVAL_EXPIRES_AT =
  "2026-07-29T00:18:00.000Z" as const;

export const p0GoldenFixturePath = fileURLToPath(
  new URL(
    "../../fixtures/golden/fraction-comparison.p0-v1.json",
    import.meta.url
  )
);
export const p3GoldenFixturePath = fileURLToPath(
  new URL(
    "../../fixtures/golden/fraction-comparison.p3-v1.json",
    import.meta.url
  )
);
const wave1HistoricalArtifactPath = fileURLToPath(
  new URL(
    "../../research/mathcanvas/wave1-current-golden-canary.artifacts.json",
    import.meta.url
  )
);

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)])
    );
  }
  return value;
}

export function stablePrettyJson(value: unknown): string {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function buildP0FractionComparisonGolden() {
  const artifacts = JSON.parse(
    readFileSync(wave1HistoricalArtifactPath, "utf8")
  ) as {
    runId: string;
    submittedPayload: {
      projectTitle: string;
      contentsJson: unknown[];
      [key: string]: unknown;
    };
  };
  const payload = structuredClone(artifacts.submittedPayload);
  payload.projectTitle = payload.projectTitle.replace(
    /^AI-CONTRACT-PROBE-[^ ]+ · /,
    ""
  );
  const payloadHash = sha256Hex(payload);
  if (
    payloadHash !==
      "fa0b8e750338ef3a083b22e64e1fc820fa680b8bfd8fb20781e31a661bace861" ||
    payload.contentsJson.length !== 59
  ) {
    throw new Error("p0-historical-canary-drift");
  }

  return {
    fixtureVersion: P0_GOLDEN_FIXTURE_VERSION,
    fixtureId: P0_GOLDEN_FIXTURE_ID,
    inputs: {
      sourceArtifact:
        "research/mathcanvas/wave1-current-golden-canary.artifacts.json",
      runId: artifacts.runId
    },
    results: {
      compiledProject: {
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        sourceActivitySpecId:
          "p0-fraction-comparison-golden-v1",
        sourceActivitySpecVersion: "1.0.0",
        templateId:
          "fraction.compare.unlike-denominators.visual-v1",
        templateVersion: "1.0.0",
        payloadHash,
        payload
      }
    },
    invariants: {
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      payloadHash,
      submittedObjectCount: payload.contentsJson.length,
      sourceKind: "historical-live-canary"
    }
  };
}

export function buildP3FractionComparisonGolden() {
  const request = generationRequestSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "p0-golden-request-v1",
    prompt:
      "분모가 다른 분수의 크기를 분수 띠로 직접 비교하는 활동지를 만들어 주세요.",
    requestedGrade: 5,
    problemCount: 4,
    difficulty: "normal",
    manipulation: "fraction-strip-common-start-drag",
    createdAt: P0_GOLDEN_REQUESTED_AT
  });
  const gatedRecommendation = recommendActivity(request);
  const recommendation = recommendationSchema.parse({
    ...gatedRecommendation,
    supported: true,
    blockingReasons: []
  });
  const plan = generateFractionComparisonActivity(
    recommendation,
    {
      seed: P0_GOLDEN_SEED,
      generatedAt: P0_GOLDEN_GENERATED_AT,
      activityId: "p0-fraction-comparison-golden-v1"
    }
  );
  const resolved = resolveActivity(plan);
  const activitySpec = projectRegisteredApprovalView(resolved);
  const compiledProject = compileActivity(resolved);
  const validationReport = validateForCreation(
    resolved,
    compiledProject,
    new Date(P0_GOLDEN_CHECKED_AT)
  );
  const approvalReceipt = createApprovalReceipt(
    activitySpec,
    new Date(P0_GOLDEN_APPROVED_AT),
    new Date(P0_GOLDEN_APPROVAL_EXPIRES_AT)
  );
  return {
    fixtureVersion: "1.0.0",
    fixtureId: "fraction-comparison.p3-v1",
    inputs: {
      request,
      seed: P0_GOLDEN_SEED,
      generatedAt: P0_GOLDEN_GENERATED_AT,
      checkedAt: P0_GOLDEN_CHECKED_AT,
      approvedAt: P0_GOLDEN_APPROVED_AT,
      approvalExpiresAt: P0_GOLDEN_APPROVAL_EXPIRES_AT
    },
    results: {
      recommendation,
      activitySpec,
      compiledProject,
      approvalReceipt,
      validationReport
    },
    invariants: {
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      activitySpecHash: sha256Hex(activitySpec),
      payloadHash: compiledProject.payloadHash,
      approvalHash: approvalReceipt.approvalHash,
      compiledPayloadHash: validationReport.compiledPayloadHash,
      validationCanCreate: validationReport.canCreate,
      validationIssueCodes: validationReport.issues.map(
        (value) => value.code
      )
    }
  };
}

export function readP0FractionComparisonGolden(): unknown {
  return JSON.parse(readFileSync(p0GoldenFixturePath, "utf8"));
}

export function writeP0FractionComparisonGolden(): void {
  mkdirSync(dirname(p0GoldenFixturePath), { recursive: true });
  writeFileSync(
    p0GoldenFixturePath,
    stablePrettyJson(buildP0FractionComparisonGolden()),
    "utf8"
  );
  writeFileSync(
    p3GoldenFixturePath,
    stablePrettyJson(buildP3FractionComparisonGolden()),
    "utf8"
  );
}
