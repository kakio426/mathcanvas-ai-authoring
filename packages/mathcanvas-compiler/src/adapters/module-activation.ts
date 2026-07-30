import {
  MATHCANVAS_MODULE_MANIFEST,
  MATHCANVAS_UNIT_IDS,
  assertReleasedTool,
  type MathCanvasUnitId,
  type ToolManifestEntry
} from "@mathcanvas/contracts";

export type ModuleActivationMap = Readonly<
  Record<MathCanvasUnitId, Readonly<Record<string, boolean>>>
>;

type ModuleManifestEntry = ToolManifestEntry & {
  readonly moduleKey: string;
};

function isModuleInCategory(
  entry: ToolManifestEntry,
  categoryId: MathCanvasUnitId
): entry is ModuleManifestEntry {
  return (
    entry.categoryId === categoryId &&
    entry.moduleKey !== undefined
  );
}

export function buildModuleActivationMap(
  requiredModuleKeys: readonly string[]
): ModuleActivationMap {
  const required = new Set(requiredModuleKeys);
  for (const moduleKey of required) {
    const contract = assertReleasedTool(moduleKey);
    if (
      contract.surface !== "math-palette" ||
      contract.moduleKey !== moduleKey
    ) {
      throw new Error(`not-a-mathcanvas-module:${moduleKey}`);
    }
  }
  return Object.fromEntries(
    MATHCANVAS_UNIT_IDS.map((categoryId) => [
      categoryId,
      Object.fromEntries(
        MATHCANVAS_MODULE_MANIFEST.filter(
          (entry): entry is ModuleManifestEntry =>
            isModuleInCategory(entry, categoryId)
        ).map((entry) => [
          entry.moduleKey,
          required.has(entry.moduleKey)
        ])
      )
    ])
  ) as ModuleActivationMap;
}
