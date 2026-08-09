import { z } from "zod";
import {
  assertNativeSpatialLifecycleEvidence,
  nativeActivityCompositionSpatialContractSchema,
  nativeIntrinsicSpatialContractSchema,
  nativeSpatialContractSchema,
  nativeSpatialEvidenceSchema,
  type NativeSpatialContract,
  type NativeSpatialEvidence
} from "../vocabulary/native-spatial.js";
import { sha256Hex } from "../hash.js";
import type { ActivityBlueprint } from "../vocabulary/blueprint.js";
import { stableIdSchema } from "../vocabulary/ids.js";
import {
  nativeSpatialIssueSchema,
  type NativeSpatialIssue
} from "./native-spatial-gates.js";

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const nativeSpatialActivityScopeEntrySchema = z
  .object({
    activityId: stableIdSchema,
    blueprintContentHash: hashSchema
  })
  .strict();

export const nativeSpatialActivityScopeSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    entries: z.array(nativeSpatialActivityScopeEntrySchema).max(64)
  })
  .strict()
  .superRefine((scope, context) => {
    const seen = new Set<string>();
    for (const entry of scope.entries) {
      if (seen.has(entry.activityId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries"],
          message: `activity scope 중복: ${entry.activityId}`
        });
      }
      seen.add(entry.activityId);
    }
  });

export type NativeSpatialActivityScope = z.infer<
  typeof nativeSpatialActivityScopeSchema
>;

export const nativeSpatialContractRecordKindSchema = z.enum([
  "intrinsic-element",
  "activity-composition"
]);

export const nativeSpatialUpstreamContractSchema = z
  .object({
    contractId: stableIdSchema,
    contractVersion: z.string().min(1).max(240),
    recordHash: hashSchema
  })
  .strict();

export function nativeSpatialContractRecordHash(record: {
  readonly recordKind: z.infer<typeof nativeSpatialContractRecordKindSchema>;
  readonly contractVersion: string;
  readonly contract: NativeSpatialContract;
  readonly evidence: NativeSpatialEvidence;
  readonly upstreamContracts: readonly z.infer<
    typeof nativeSpatialUpstreamContractSchema
  >[];
}): string {
  return sha256Hex({
    recordKind: record.recordKind,
    contractVersion: record.contractVersion,
    contract: record.contract,
    evidence: record.evidence,
    upstreamContracts: record.upstreamContracts
  });
}

export const nativeSpatialContractRecordSchema = z
  .object({
    recordKind: nativeSpatialContractRecordKindSchema,
    contractVersion: z.string().min(1).max(240),
    contract: nativeSpatialContractSchema,
    evidence: nativeSpatialEvidenceSchema,
    upstreamContracts: z.array(nativeSpatialUpstreamContractSchema).max(8),
    recordHash: hashSchema
  })
  .strict()
  .superRefine((record, context) => {
    if (record.recordKind !== record.contract.contractKind) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contract", "contractKind"],
        message: "record kind와 contract kind가 일치하지 않습니다."
      });
    }
    if (
      record.recordKind === "intrinsic-element" &&
      record.upstreamContracts.length > 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["upstreamContracts"],
        message: "intrinsic element contract는 upstream contract를 가질 수 없습니다."
      });
    }
    if (
      record.recordKind === "activity-composition" &&
      record.upstreamContracts.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["upstreamContracts"],
        message: "activity composition contract에는 intrinsic upstream이 필요합니다."
      });
    }
    if (record.recordKind === "intrinsic-element") {
      const result = nativeIntrinsicSpatialContractSchema.safeParse(
        record.contract
      );
      if (!result.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contract"],
          message: "intrinsic element record가 intrinsic contract schema와 다릅니다."
        });
      }
    }
    if (record.recordKind === "activity-composition") {
      const result = nativeActivityCompositionSpatialContractSchema.safeParse(
        record.contract
      );
      if (!result.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contract"],
          message: "activity composition record가 composition contract schema와 다릅니다."
        });
      } else {
        const interaction = record.evidence.environment.interactionContext;
        const composition = result.data.composition;
        const viewport = `${composition.releaseViewport.width}x${composition.releaseViewport.height}`;
        if (
          !interaction ||
          record.evidence.environment.viewport !== viewport ||
          interaction.surfaceMode !== composition.releaseViewport.surfaceMode ||
          interaction.sidebarState !== composition.releaseViewport.sidebarState ||
          interaction.zoomMode !== composition.releaseViewport.zoomMode ||
          interaction.pan.x !== composition.releaseViewport.pan.x ||
          interaction.pan.y !== composition.releaseViewport.pan.y ||
          Math.abs(
            interaction.canvasUnitsToCssPx -
              composition.canvas.canvasUnitsToCssPx
          ) > 1e-6 ||
          Math.max(
            Math.abs(
              interaction.selectionOverlayCssPx.x -
                composition.selectionOverlayExclusionZoneCssPx.x
            ),
            Math.abs(
              interaction.selectionOverlayCssPx.y -
                composition.selectionOverlayExclusionZoneCssPx.y
            ),
            Math.abs(
              interaction.selectionOverlayCssPx.width -
                composition.selectionOverlayExclusionZoneCssPx.width
            ),
            Math.abs(
              interaction.selectionOverlayCssPx.height -
                composition.selectionOverlayExclusionZoneCssPx.height
            )
          ) > 1e-6
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["evidence", "environment", "interactionContext"],
            message: "composition evidence의 interaction context가 계약과 일치하지 않습니다."
          });
        }
      }
    }
    if (record.recordHash !== nativeSpatialContractRecordHash(record)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recordHash"],
        message: "native spatial contract record hash가 현재 내용과 일치하지 않습니다."
      });
    }
  });

export type NativeSpatialContractRecord = z.infer<
  typeof nativeSpatialContractRecordSchema
>;

export const nativeSpatialContractCatalogSchema = z
  .object({
    schemaVersion: z.literal("2.0.0"),
    records: z.array(nativeSpatialContractRecordSchema).max(64)
  })
  .strict()
  .superRefine((catalog, context) => {
    const seen = new Set<string>();
    const byId = new Map(
      catalog.records.map((record) => [record.contract.contractId, record])
    );
    for (const record of catalog.records) {
      const id = record.contract.contractId;
      if (seen.has(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["records"],
          message: `contract 중복: ${id}`
        });
      }
      seen.add(id);
      for (const upstream of record.upstreamContracts) {
        const dependency = byId.get(upstream.contractId);
        if (
          !dependency ||
          dependency.recordKind !== "intrinsic-element" ||
          dependency.contractVersion !== upstream.contractVersion ||
          dependency.recordHash !== upstream.recordHash ||
          dependency.contract.toolKey !== record.contract.toolKey ||
          dependency.contract.variantId !== record.contract.variantId
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["records"],
            message: `composition upstream 불일치: ${id} -> ${upstream.contractId}`
          });
          continue;
        }
        if (
          record.recordKind === "activity-composition" &&
          record.contract.contractKind === "activity-composition" &&
          dependency.contract.contractKind === "intrinsic-element"
        ) {
          const scale = record.contract.composition.canvas.canvasUnitsToCssPx;
          const renderedWidth =
            dependency.contract.minInteractiveSize.width * scale;
          const renderedHeight =
            dependency.contract.minInteractiveSize.height * scale;
          if (
            renderedWidth < dependency.contract.minInteractiveCssSize.width ||
            renderedHeight < dependency.contract.minInteractiveCssSize.height
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["records"],
              message: `composition CSS interaction size 미달: ${id} -> ${upstream.contractId}`
            });
          }
        }
      }
    }
  });

export type NativeSpatialContractCatalog = z.infer<
  typeof nativeSpatialContractCatalogSchema
>;

type NativeSpatialRole = Pick<
  ActivityBlueprint["toolRoles"][number],
  "role" | "toolKey" | "spatialContractId" | "spatialContractVersion"
>;

export interface NativeSpatialBlueprintLike {
  readonly id: string;
  readonly contentHash: string;
  readonly layout: Pick<ActivityBlueprint["layout"], "tokenSet">;
  readonly toolRoles: readonly NativeSpatialRole[];
}

function isSemanticNativeTool(toolKey: string): boolean {
  return !toolKey.startsWith("common.");
}

function issue(
  activityId: string,
  gateId: NativeSpatialIssue["gateId"],
  fingerprint: string,
  detail: string
): NativeSpatialIssue {
  return nativeSpatialIssueSchema.parse({
    activityId,
    gateId,
    fingerprint,
    detail
  });
}

function lifecycleGate(error: unknown): NativeSpatialIssue["gateId"] {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("state-change") ||
    message.includes("manipulation") ||
    message.includes("undo-reset")
  ) {
    return "affordance.primary-math-state-change";
  }
  if (message.includes("reopen") || message.includes("round-trip")) {
    return "canary.native-state-change-and-roundtrip";
  }
  return "visual.native-reserve-box-fit";
}

export function collectNativeSpatialIssues(input: {
  readonly scope: NativeSpatialActivityScope;
  readonly catalog: NativeSpatialContractCatalog;
  readonly blueprints: readonly NativeSpatialBlueprintLike[];
}): { readonly changedActivityIds: readonly string[]; readonly issues: readonly NativeSpatialIssue[] } {
  const scope = nativeSpatialActivityScopeSchema.parse(input.scope);
  const catalog = nativeSpatialContractCatalogSchema.parse(input.catalog);
  const blueprints = new Map(input.blueprints.map((blueprint) => [blueprint.id, blueprint]));
  const records = new Map(
    catalog.records.map((record) => [record.contract.contractId, record])
  );
  const issues: NativeSpatialIssue[] = [];

  for (const entry of scope.entries) {
    const blueprint = blueprints.get(entry.activityId);
    if (!blueprint) {
      throw new Error(`native-spatial-scope-activity-missing:${entry.activityId}`);
    }
    if (blueprint.contentHash !== entry.blueprintContentHash) {
      throw new Error(`native-spatial-scope-stale:${entry.activityId}`);
    }
    for (const role of blueprint.toolRoles) {
      if (!isSemanticNativeTool(role.toolKey)) continue;
      if (!role.spatialContractId || !role.spatialContractVersion) {
        issues.push(
          issue(
            entry.activityId,
            "visual.native-reserve-box-fit",
            `${role.role}:missing-spatial-contract`,
            `native role ${role.role}(${role.toolKey})에 versioned spatial contract가 없습니다.`
          )
        );
        continue;
      }
      const record = records.get(role.spatialContractId);
      if (!record) {
        issues.push(
          issue(
            entry.activityId,
            "visual.native-reserve-box-fit",
            `${role.role}:unknown-spatial-contract:${role.spatialContractId}`,
            `native role ${role.role}이 catalog에 없는 spatial contract ${role.spatialContractId}를 사용합니다.`
          )
        );
        continue;
      }
      if (
        record.recordKind !== "activity-composition" ||
        record.contract.contractKind !== "activity-composition" ||
        record.contract.toolKey !== role.toolKey ||
        record.contractVersion !== role.spatialContractVersion ||
        record.contract.composition.blueprintContentHash !==
          blueprint.contentHash ||
        record.contract.composition.layoutPresetId !==
          blueprint.layout.tokenSet
      ) {
        issues.push(
          issue(
            entry.activityId,
            "affordance.semantic-native-preferred",
            `${role.role}:spatial-contract-binding-mismatch`,
            `native role ${role.role}의 tool/version과 spatial contract catalog가 일치하지 않습니다.`
          )
        );
        continue;
      }
      try {
        assertNativeSpatialLifecycleEvidence(record.contract, record.evidence);
      } catch (error) {
        issues.push(
          issue(
            entry.activityId,
            lifecycleGate(error),
            `${role.role}:lifecycle-evidence-invalid`,
            `native role ${role.role} lifecycle evidence가 유효하지 않습니다: ${String(error).slice(0, 700)}`
          )
        );
      }
    }
  }

  return {
    changedActivityIds: scope.entries.map((entry) => entry.activityId),
    issues
  };
}
