import { z } from "zod";
import { sha256Hex } from "../hash.js";
import { jsonRecordSchema } from "../vocabulary/json.js";
import { spatialBoundsSchema } from "../vocabulary/native-spatial.js";

export const R5_NATIVE_TOOL_DISCOVERY_SCHEMA_VERSION = "1.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const repositoryScreenshotPathSchema = z
  .string()
  .regex(
    /^\.mathcanvas-contract-lab\/previews\/r5-native-tool-discovery\/[a-z0-9-]+\.png$/
  );

const expectedVariants = [
  "DP03PG-01",
  "DP03PG-02",
  "NO04NG-01",
  "NO04NG-02",
  "NO04NG-03",
  "NO04NG-04",
  "NO04NG-05",
  "NO04NG-06",
  "NO03FM-07",
  "NO03FM-17",
  "SM07CS-01",
  "SM07CS-02"
] as const;

const semanticVariantIds = new Set<string>([
  "DP03PG-01",
  "NO04NG-03",
  "NO03FM-07",
  "SM07CS-01"
]);

const expectedModuleByVariant = Object.fromEntries(
  expectedVariants.map((variantId) => [variantId, variantId.split("-")[0]])
) as Readonly<Record<string, string>>;

const expectedOperationByVariant: Readonly<Record<string, string>> = {
  "DP03PG-01": "select-picture-graph-column-and-add-one-unit",
  "NO04NG-03": "make-four-rows-by-six-columns-to-reveal-target-product",
  "NO03FM-07": "extend-equal-fraction-parts",
  "SM07CS-01": "change-circle-radius"
};

const discoveryEnvironmentSchema = z
  .object({
    viewport: z.object({ width: z.literal(1280), height: z.literal(800) }).strict(),
    userChromeTouched: z.literal(false),
    sourceProjectPersistedStateChanged: z.literal(false),
    externalWriteCount: z.literal(0),
    interceptedPutCount: z.literal(16),
    injectedProjectReadCount: z.literal(36),
    blockedTelemetryCount: z.number().int().min(12).max(16),
    blockedTelemetryPolicy: z
      .string()
      .regex(
        /^exact POST https:\/\/lc\.getunicorn\.org\/l without query; bounded 12\.\.16 because editor bootstrap delivery timing varies$/
      )
  })
  .strict();

const semanticProbeSchema = z
  .object({
    status: z.literal("semantic-state-changed"),
    operation: jsonRecordSchema,
    changedTopLevelFields: z.array(z.string().min(1)).min(1).max(32),
    before: jsonRecordSchema,
    after: jsonRecordSchema,
    objectSha256: sha256Schema,
    manipulatedEnvelopeCssPx: spatialBoundsSchema,
    screenshot: repositoryScreenshotPathSchema,
    screenshotSha256: sha256Schema
  })
  .strict();

const discoveryObservationSchema = z
  .object({
    moduleKey: z.enum(["DP03PG", "NO04NG", "NO03FM", "SM07CS"]),
    variantId: z.string().regex(/^(?:DP03PG|NO04NG|NO03FM|SM07CS)-\d{2}$/),
    observedName: z.string().min(1).max(80),
    mathematicalState: z.string().min(1).max(160),
    initial: z
      .object({
        objectKeys: z.array(z.string().min(1)).min(1).max(160),
        objectSha256: sha256Schema,
        mathematicalState: jsonRecordSchema,
        visualBoundsCssPx: spatialBoundsSchema,
        selectedEnvelopeCssPx: spatialBoundsSchema,
        screenshot: repositoryScreenshotPathSchema,
        screenshotSha256: sha256Schema
      })
      .strict(),
    semanticProbe: semanticProbeSchema.nullable(),
    semanticDecision: z.enum([
      "candidate-semantic-state-observed",
      "pending-isolated-interaction-probe"
    ]),
    releaseQualified: z.literal(false)
  })
  .strict();

const r5NativeToolDiscoveryEvidenceBaseSchema = z
  .object({
    schemaVersion: z.literal(R5_NATIVE_TOOL_DISCOVERY_SCHEMA_VERSION),
    evidenceId: z.literal("r5-native-tool-discovery-v1"),
    observedAt: z.string().datetime(),
    mode: z.literal("dedicated-live-auth-read-only-response-injection"),
    sourceEvidence: z
      .object({
        rawArtifactPath: z.literal(
          ".mathcanvas-contract-lab/raw/r5-native-tool-discovery.raw.json"
        ),
        rawFileSha256: sha256Schema
      })
      .strict(),
    environment: discoveryEnvironmentSchema,
    observations: z.array(discoveryObservationSchema).length(12),
    decision: z
      .object({
        status: z.literal("isolated-semantic-probes-passed-reference-only"),
        semanticPassCount: z.literal(4),
        semanticTargetCount: z.literal(4),
        releaseQualified: z.literal(false),
        staticOnlyVariantNotVisibleInPalette: z.literal("DP03PG-03"),
        nextGate: z.literal(
          "대표 4개 활동을 offline compile한 뒤 exact write manifest로 actual save/reopen lifecycle과 initial/selected/manipulated/reopened 화면을 검증한다."
        )
      })
      .strict()
  })
  .strict();

export const r5NativeToolDiscoveryEvidenceBodySchema =
  r5NativeToolDiscoveryEvidenceBaseSchema.superRefine((value, context) => {
    const variantIds = value.observations.map((entry) => entry.variantId);
    if (variantIds.join("|") !== expectedVariants.join("|")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["observations"],
        message: "R5 discovery variant set과 순서가 canonical 12종과 다릅니다."
      });
    }
    for (const [index, observation] of value.observations.entries()) {
      const semanticExpected = semanticVariantIds.has(observation.variantId);
      const expectedStem = observation.variantId.toLowerCase();
      if (
        observation.moduleKey !== expectedModuleByVariant[observation.variantId] ||
        observation.initial.screenshot !==
          `.mathcanvas-contract-lab/previews/r5-native-tool-discovery/${expectedStem}-created-selected.png` ||
        observation.initial.objectKeys.join("|") !==
          [...observation.initial.objectKeys].sort().join("|") ||
        new Set(observation.initial.objectKeys).size !==
          observation.initial.objectKeys.length
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["observations", index],
          message: "variant/module/screenshot/object-key binding이 올바르지 않습니다."
        });
      }
      if (
        semanticExpected !== (observation.semanticProbe !== null) ||
        observation.semanticDecision !==
          (semanticExpected
            ? "candidate-semantic-state-observed"
            : "pending-isolated-interaction-probe")
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["observations", index, "semanticProbe"],
          message: "대표 4종 semantic probe binding이 올바르지 않습니다."
        });
      }
      if (!observation.semanticProbe) continue;
      if (
        observation.semanticProbe.operation.operation !==
          expectedOperationByVariant[observation.variantId] ||
        observation.semanticProbe.screenshot !==
          `.mathcanvas-contract-lab/previews/r5-native-tool-discovery/${expectedStem}-manipulated.png`
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["observations", index, "semanticProbe", "operation"],
          message: "semantic operation 또는 manipulated screenshot이 다릅니다."
        });
      }
      assertSemanticTransition(observation, index, context);
    }
  });

type DiscoveryObservation = z.infer<typeof discoveryObservationSchema>;

function numberAt(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nestedRecord(
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function graphUnitCount(record: Record<string, unknown>): number | null {
  const graphValue = record.graphValue;
  if (!Array.isArray(graphValue)) return null;
  let total = 0;
  for (const row of graphValue) {
    if (!Array.isArray(row)) return null;
    for (const value of row) {
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      total += value;
    }
  }
  return total;
}

function addTransitionIssue(
  context: z.RefinementCtx,
  index: number,
  message: string
): void {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["observations", index, "semanticProbe"],
    message
  });
}

function assertSemanticTransition(
  observation: DiscoveryObservation,
  index: number,
  context: z.RefinementCtx
): void {
  const probe = observation.semanticProbe;
  if (!probe) return;
  const before = probe.before;
  const after = probe.after;
  if (observation.variantId === "DP03PG-01") {
    if (graphUnitCount(before) !== 0 || graphUnitCount(after) !== 1) {
      addTransitionIssue(
        context,
        index,
        "그림그래프는 빈 상태에서 그림 단위 하나를 더해야 합니다."
      );
    }
    return;
  }
  if (observation.variantId === "NO04NG-03") {
    const beforeArray = nestedRecord(before, "multiplicationArray");
    const afterArray = nestedRecord(after, "multiplicationArray");
    const beforeTarget = beforeArray
      ? nestedRecord(beforeArray, "target")
      : null;
    const afterTarget = afterArray ? nestedRecord(afterArray, "target") : null;
    if (
      numberAt(beforeArray ?? {}, "visibleRows") !== 5 ||
      numberAt(beforeArray ?? {}, "visibleColumns") !== 5 ||
      beforeTarget?.product !== null ||
      numberAt(afterArray ?? {}, "visibleRows") !== 4 ||
      numberAt(afterArray ?? {}, "visibleColumns") !== 6 ||
      numberAt(afterTarget ?? {}, "product") !== 24
    ) {
      addTransitionIssue(
        context,
        index,
        "곱셈표는 5×5에서 정답 24가 숨겨지고 4×6에서만 드러나야 합니다."
      );
    }
    return;
  }
  if (observation.variantId === "NO03FM-07") {
    if (
      numberAt(before, "divider") !== 4 ||
      numberAt(after, "divider") !== 4 ||
      numberAt(before, "count") !== 1 ||
      numberAt(after, "count") !== 4
    ) {
      addTransitionIssue(
        context,
        index,
        "분수 띠는 같은 1/4 조각 한 개에서 네 개로 늘어나야 합니다."
      );
    }
    return;
  }
  if (observation.variantId === "SM07CS-01") {
    const beforeRadius = numberAt(before, "r");
    const afterRadius = numberAt(after, "r");
    if (
      beforeRadius === null ||
      afterRadius === null ||
      beforeRadius <= afterRadius ||
      afterRadius <= 0 ||
      numberAt(before, "x") !== numberAt(after, "x") ||
      numberAt(before, "y") !== numberAt(after, "y")
    ) {
      addTransitionIssue(
        context,
        index,
        "원은 중심을 고정한 채 반지름만 바뀌어야 합니다."
      );
    }
  }
}

export type R5NativeToolDiscoveryEvidenceBody = z.infer<
  typeof r5NativeToolDiscoveryEvidenceBodySchema
>;

export function r5NativeToolDiscoveryContentHash(
  body: R5NativeToolDiscoveryEvidenceBody
): string {
  return sha256Hex(r5NativeToolDiscoveryEvidenceBodySchema.parse(body));
}

export const r5NativeToolDiscoveryEvidenceSchema =
  r5NativeToolDiscoveryEvidenceBaseSchema
    .extend({ contentSha256: sha256Schema })
    .strict()
    .superRefine((value, context) => {
      const { contentSha256, ...body } = value;
      const parsedBody = r5NativeToolDiscoveryEvidenceBodySchema.safeParse(body);
      if (!parsedBody.success) {
        for (const issue of parsedBody.error.issues) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: issue.path,
            message: issue.message
          });
        }
        return;
      }
      if (contentSha256 !== r5NativeToolDiscoveryContentHash(body)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contentSha256"],
          message: "R5 native discovery content hash가 본문과 다릅니다."
        });
      }
    });

export type R5NativeToolDiscoveryEvidence = z.infer<
  typeof r5NativeToolDiscoveryEvidenceSchema
>;

export function r5NativeDiscoveryExpectedVariants(): readonly string[] {
  return [...expectedVariants];
}
