import { z } from "zod";
import { sha256Hex } from "../hash.js";
import { stableIdSchema } from "../vocabulary/ids.js";
import {
  nativeSpatialContractCatalogSchema,
  type NativeSpatialContractCatalog
} from "./native-spatial-harness.js";

export const NATIVE_AFFORDANCE_V2_SCHEMA_VERSION = "1.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const pathSchema = z.string().regex(/^[A-Za-z0-9._:-]+$/).max(160);

export const nativeAffordanceEvidenceRefSchema = z
  .object({
    id: z.string().min(1).max(500),
    file: z.string().regex(/^research\/mathcanvas\/[A-Za-z0-9._-]+\.json$/),
    sha256: sha256Schema,
    toolKey: stableIdSchema,
    claim: z.enum(["captured", "contracted", "verified", "released"])
  })
  .strict();

export const nativeAffordanceSpatialRefSchema = z
  .object({
    contractId: stableIdSchema,
    contractVersion: z.string().min(1).max(120),
    recordHash: sha256Schema,
    sourceFileSha256: sha256Schema
  })
  .strict();

export const nativeSemanticStateProjectionSchema = z
  .object({
    invariantPaths: z.array(pathSchema).min(1).max(16),
    ignoredPaths: z.array(pathSchema).min(1).max(16),
    normalization: z.literal("viewport-selection-translation-invariant")
  })
  .strict()
  .superRefine((value, context) => {
    const invariant = new Set(value.invariantPaths);
    const ignored = new Set(value.ignoredPaths);
    if (invariant.size !== value.invariantPaths.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["invariantPaths"],
        message: "semantic invariant path가 중복됩니다."
      });
    }
    if (ignored.size !== value.ignoredPaths.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ignoredPaths"],
        message: "semantic ignored path가 중복됩니다."
      });
    }
    for (const path of invariant) {
      if (
        [...ignored].some(
          (ignoredPath) =>
            path === ignoredPath ||
            path.startsWith(`${ignoredPath}.`) ||
            ignoredPath.startsWith(`${path}.`)
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ignoredPaths"],
          message: `겹치는 path를 invariant와 ignored에 함께 둘 수 없습니다: ${path}`
        });
      }
    }
    for (const requiredIgnoredPath of [
      "viewport.pan",
      "selection.ids",
      "placement.x",
      "placement.y"
    ]) {
      if (!ignored.has(requiredIgnoredPath)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ignoredPaths"],
          message: `viewport·selection·전체 이동 정규화 path가 필요합니다: ${requiredIgnoredPath}`
        });
      }
    }
  });

export const nativeAffordanceFamilyDecisionSchema = z.enum([
  "pending",
  "conditional-go",
  "no-go",
  "baseline-released"
]);

export const nativeAffordanceFamilySchema = z
  .object({
    schemaVersion: z.literal(NATIVE_AFFORDANCE_V2_SCHEMA_VERSION),
    affordanceFamilyId: stableIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    mathematicalDecision: z.string().min(1).max(500),
    preferredToolKey: stableIdSchema,
    candidateToolKeys: z.array(stableIdSchema).min(1).max(8),
    requiredSemanticOperation: z.string().min(1).max(500),
    semanticStateProjection: nativeSemanticStateProjectionSchema,
    supportState: z.enum(["captured", "contracted", "verified", "released"]),
    decision: nativeAffordanceFamilyDecisionSchema,
    evidenceRefs: z.array(nativeAffordanceEvidenceRefSchema).min(1).max(12),
    spatialContractRefs: z.array(nativeAffordanceSpatialRefSchema).max(8),
    releaseBlockers: z.array(z.string().min(1).max(500)).max(8)
  })
  .strict()
  .superRefine((value, context) => {
    const supportRank = {
      captured: 0,
      contracted: 1,
      verified: 2,
      released: 3
    } as const;
    const supportLevel = supportRank[value.supportState];
    if (!value.candidateToolKeys.includes(value.preferredToolKey)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredToolKey"],
        message: "preferred tool은 candidateToolKeys 중 하나여야 합니다."
      });
    }
    const evidenceIds = value.evidenceRefs.map((reference) => reference.id);
    if (new Set(evidenceIds).size !== evidenceIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "native evidence reference가 중복됩니다."
      });
    }
    if (
      value.evidenceRefs.some(
        (reference) => !value.candidateToolKeys.includes(reference.toolKey)
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "모든 native evidence는 candidate tool을 직접 가리켜야 합니다."
      });
    }
    if (
      (value.decision === "conditional-go" || value.decision === "no-go") &&
      value.releaseBlockers.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["releaseBlockers"],
        message: "조건부 GO·NO-GO 판단에는 남은 release blocker 또는 차단 사유가 필요합니다."
      });
    }
    if (
      value.decision === "no-go" &&
      value.supportState === "released"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportState"],
        message: "NO-GO native family를 released로 표시할 수 없습니다."
      });
    }
    if (
      value.decision === "baseline-released" &&
      value.supportState !== "released"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportState"],
        message: "baseline-released family는 released evidence를 가져야 합니다."
      });
    }
    const preferredClaims = value.evidenceRefs
      .filter((reference) => reference.toolKey === value.preferredToolKey)
      .map((reference) => supportRank[reference.claim]);
    const preferredEvidenceLevel = preferredClaims.length
      ? Math.max(...preferredClaims)
      : -1;
    if (preferredEvidenceLevel < supportLevel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message:
          "preferred native tool의 evidence claim이 family supportState보다 낮습니다."
      });
    }
    if (
      value.decision === "conditional-go" &&
      supportLevel < supportRank.contracted
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportState"],
        message: "conditional-go는 최소 contracted supportState여야 합니다."
      });
    }
    if (supportLevel >= supportRank.verified && value.decision === "pending") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message: "verified 이상 supportState를 pending decision으로 표시할 수 없습니다."
      });
    }
    if (
      value.supportState === "released" &&
      value.decision !== "baseline-released"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message: "released supportState는 baseline-released decision으로만 표시할 수 있습니다."
      });
    }
    if (
      value.decision === "baseline-released" &&
      (value.supportState !== "released" ||
        preferredEvidenceLevel < supportRank.released ||
        value.releaseBlockers.length > 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message:
          "baseline-released는 preferred released evidence와 blocker 없는 released support를 함께 가져야 합니다."
      });
    }
  });

export const nativeAffordanceFamilyCatalogSchema = z
  .object({
    schemaVersion: z.literal(NATIVE_AFFORDANCE_V2_SCHEMA_VERSION),
    families: z.array(nativeAffordanceFamilySchema).min(1).max(32)
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.families.map((family) => family.affordanceFamilyId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["families"],
        message: "affordanceFamily ID가 중복됩니다."
      });
    }
  });

export type NativeAffordanceEvidenceRef = z.infer<
  typeof nativeAffordanceEvidenceRefSchema
>;
export type NativeAffordanceSpatialRef = z.infer<
  typeof nativeAffordanceSpatialRefSchema
>;
export type NativeSemanticStateProjection = z.infer<
  typeof nativeSemanticStateProjectionSchema
>;
export type NativeAffordanceFamily = z.infer<
  typeof nativeAffordanceFamilySchema
>;
export type NativeAffordanceFamilyCatalog = z.infer<
  typeof nativeAffordanceFamilyCatalogSchema
>;

function readPath(value: unknown, path: string): unknown {
  let current = value;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * 배치·선택 chrome·viewport 이동을 제외하고 학습 관계만 해시한다.
 * 이 함수는 resolver의 좌표 입력이 아니라 native adapter의 관찰·검증
 * 경계에서만 사용한다.
 */
export function hashNativeSemanticState(
  state: unknown,
  projection: NativeSemanticStateProjection
): string {
  const parsedProjection = nativeSemanticStateProjectionSchema.parse(projection);
  const projected = Object.fromEntries(
    [...parsedProjection.invariantPaths].map((path) => [
      path,
      readPath(state, path)
    ])
  );
  return sha256Hex(projected);
}

export function defineNativeAffordanceFamily(
  input: z.input<typeof nativeAffordanceFamilySchema>
): NativeAffordanceFamily {
  return nativeAffordanceFamilySchema.parse(input);
}

/**
 * Affordance registry가 참조한 spatial record가 현재 pinned catalog의
 * contract/version/hash와 같은지 확인한다. 연구 evidence를 제품 payload로
 * 읽지는 않지만, registry drift는 계약 단계에서 즉시 닫는다.
 */
export function assertNativeAffordanceSpatialBinding(
  familyInput: NativeAffordanceFamily,
  catalogInput: NativeSpatialContractCatalog,
  catalogSourceSha256: string
): void {
  const family = nativeAffordanceFamilySchema.parse(familyInput);
  const catalog = nativeSpatialContractCatalogSchema.parse(catalogInput);
  if (!sha256Schema.safeParse(catalogSourceSha256).success) {
    throw new Error("native-affordance-spatial-source-hash-invalid");
  }
  const records = new Map(
    catalog.records.map((record) => [record.contract.contractId, record])
  );
  for (const reference of family.spatialContractRefs) {
    const record = records.get(reference.contractId);
    if (
      !record ||
      record.contractVersion !== reference.contractVersion ||
      record.recordHash !== reference.recordHash ||
      reference.sourceFileSha256 !== catalogSourceSha256 ||
      !family.candidateToolKeys.includes(record.contract.toolKey)
    ) {
      throw new Error(
        `native-affordance-spatial-binding-mismatch:${family.affordanceFamilyId}:${reference.contractId}`
      );
    }
  }
}
