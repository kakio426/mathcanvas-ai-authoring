import {
  CONTRACT_SCHEMA_VERSION,
  compiledProjectSchema,
  mathCanvasPayloadSchema,
  resolvedActivitySchema,
  sha256Hex,
  type CompiledProject,
  type ResolvedActivity
} from "@mathcanvas/contracts";
import { buildModuleActivationMap } from "../adapters/module-activation.js";
import {
  compileNativeTool,
  type NativeToolIntent
} from "../adapters/registry.js";

export const MATHCANVAS_CONTRACT_VERSION = "1.0.0" as const;
export const CREATE_PROJECT_ENDPOINT = "/api/project" as const;
export const ALLOWED_WRITE_METHOD = "POST" as const;

export function compileActivity(
  input: ResolvedActivity
): CompiledProject {
  const activity = resolvedActivitySchema.parse(input);
  const contentsJson: Array<Record<string, unknown>> = [];
  const nativeByEmissionId = new Map<
    string,
    Record<string, unknown>
  >();
  const lockedIds: string[] = [];
  const requiredModuleKeys = new Set<string>();
  for (const emission of activity.emissions) {
    const fragment = compileNativeTool(
      {
        kind: emission.toolIntent.kind,
        toolKey: emission.toolIntent.toolKey,
        ...emission.toolIntent.properties
      } as NativeToolIntent,
      { id: emission.id, ...emission.bounds }
    );
    contentsJson.push(fragment.object);
    nativeByEmissionId.set(emission.id, fragment.object);
    if (emission.locked) lockedIds.push(emission.id);
    fragment.requiredModuleKeys.forEach((key) =>
      requiredModuleKeys.add(key)
    );
  }
  for (const item of activity.items) {
    const itemEmissions = activity.emissions.filter(
      (emission) => emission.itemId === item.id
    );
    const scales = itemEmissions.filter(
      (emission) =>
        emission.toolIntent.kind === "balance-scale"
    );
    const plateMembers = itemEmissions.filter(
      (emission) =>
        emission.toolIntent.properties.balanceSide === "left" ||
        emission.toolIntent.properties.balanceSide === "right"
    );
    if (plateMembers.length === 0) continue;
    if (scales.length !== 1) {
      throw new Error(
        `balance-scale-item-cardinality:${item.id}:${scales.length}`
      );
    }
    const scaleId = scales[0]!.id;
    for (const emission of plateMembers) {
      const native = nativeByEmissionId.get(emission.id);
      if (!native) {
        throw new Error(
          `balance-scale-native-member-missing:${emission.id}`
        );
      }
      native.plate = scaleId;
    }
  }
  const difficultyLabel = {
    easy: "쉬움",
    normal: "보통",
    hard: "어려움"
  }[activity.payload.difficulty];
  const creationMarker = sha256Hex({
    activityId: activity.id,
    seed: activity.seed,
    templateId: activity.legacy.templateId,
    templateVersion: activity.legacy.templateVersion
  })
    .slice(0, 12)
    .toUpperCase();
  const payload = mathCanvasPayloadSchema.parse({
    projectTitle:
      `${activity.title.slice(0, 60)} · ${activity.payload.grade}학년 · ` +
      `${activity.items.length}문제 · ${difficultyLabel} ` +
      `[AI-${creationMarker}]`,
    categoryId: activity.payload.categoryId,
    contentsJson,
    canvasOption: {
      grid: {
        type: "none",
        isGrid: false,
        distance: { x: 40, y: 40 },
        isGridToggle: false
      },
      scale: 5,
      lockIds: lockedIds.map((id) => [id]),
      viewBox: activity.layout.viewBox,
      CR07BSArr: [],
      CR07BSObj: {
        type1: 0.3,
        type2: 0.3,
        type3: 0.3,
        weight: 0
      },
      moduleArr: buildModuleActivationMap([...requiredModuleKeys]),
      isCaptured: false,
      penElements: [],
      canvasCenterCoordinate: {
        cx: activity.layout.width / 2,
        cy: activity.layout.height / 2
      }
    },
    isShowMenuOnActivity: activity.payload.isShowMenuOnActivity,
    isNoteworthy: false,
    tags: activity.payload.tags,
    studyLevel: activity.payload.studyLevel
  });
  return compiledProjectSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    contractVersion: MATHCANVAS_CONTRACT_VERSION,
    sourceActivitySpecId: activity.id,
    sourceActivitySpecVersion:
      activity.legacy.sourceActivitySpecVersion,
    templateId: activity.legacy.templateId,
    templateVersion: activity.legacy.templateVersion,
    payloadHash: sha256Hex(payload),
    payload
  });
}
