import {
  MATHCANVAS_MODULE_MANIFEST,
  assertReleasedTool,
  type ToolManifestEntry
} from "@mathcanvas/contracts";

export interface NativeModuleVariantContract {
  readonly moduleKey: string;
  readonly contractState: "captured" | "released";
  readonly releasedVariantIds: readonly string[];
}

function hasModuleKey(
  entry: ToolManifestEntry
): entry is ToolManifestEntry & { readonly moduleKey: string } {
  return entry.moduleKey !== undefined;
}

const releasedFractionVariantIds = [
  ...Array.from(
    { length: 10 },
    (_, index) => `NO03FM-${String(index + 1).padStart(2, "0")}`
  ),
  "NO03FM-21",
  "NO03FM-22"
];

export const RELEASED_NUMBER_CARD_VARIANT_IDS = Array.from(
  { length: 10 },
  (_, index) => `NO04NT-${String(index + 1).padStart(2, "0")}`
);

export const NATIVE_MODULE_VARIANT_CONTRACTS:
  readonly NativeModuleVariantContract[] =
  MATHCANVAS_MODULE_MANIFEST
    .filter(hasModuleKey)
    .map((entry) => ({
      moduleKey: entry.moduleKey,
      contractState:
        entry.supportState === "released"
          ? "released" as const
          : "captured" as const,
      releasedVariantIds:
        entry.moduleKey === "NO03FM" &&
        entry.supportState === "released"
          ? releasedFractionVariantIds
          : entry.moduleKey === "NO04NT" &&
              entry.supportState === "released"
            ? RELEASED_NUMBER_CARD_VARIANT_IDS
            : []
    }));

export const RELEASED_MODULE_VARIANT_IDS = [
  ...new Set(
    NATIVE_MODULE_VARIANT_CONTRACTS.flatMap(
      (contract) => contract.releasedVariantIds
    )
  )
].sort();

export function assertReleasedModuleVariant(
  moduleKey: string,
  variantId: string
): NativeModuleVariantContract {
  const contract = NATIVE_MODULE_VARIANT_CONTRACTS.find(
    (candidate) => candidate.moduleKey === moduleKey
  );
  if (
    !contract ||
    contract.contractState !== "released" ||
    !contract.releasedVariantIds.includes(variantId)
  ) {
    throw new Error(
      `module-variant-not-released:${moduleKey}:${variantId}`
    );
  }
  assertReleasedTool(moduleKey);
  return contract;
}
