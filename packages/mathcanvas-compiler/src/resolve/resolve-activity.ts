import {
  ACTIVITY_SPEC_SCHEMA_VERSION,
  CONTRACT_SCHEMA_VERSION,
  mintResolvedId,
  parseActivityBlueprint,
  resolvedActivitySchema,
  resolvedToolIntentSchema,
  type ActivityBlueprint,
  type InteractionConstraint,
  type Recommendation,
  type ResolvedActivity,
  type ResolvedEmission,
  type ResolvedItem,
  type ResolvedToolIntent
} from "@mathcanvas/contracts";
import { evaluateInitialConstraint } from "../constraint-handlers/registry.js";
import { getLayoutPreset } from "../layout-presets/registry.js";
import { resolveLayout } from "./layout-resolver.js";

export interface ResolveActivityOptions {
  readonly activityId: string;
  readonly seed: string;
  readonly generatedAt: string;
  readonly templateVersion: string;
  readonly variation: Readonly<Record<string, unknown>>;
}

function readBinding(
  path: string,
  item: ResolvedItem | undefined
): unknown {
  const [scope, ...parts] = path.split(".");
  let value: unknown =
    scope === "item" ? item?.values : undefined;
  for (const part of parts) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function materializeIntent(
  role: ActivityBlueprint["toolRoles"][number],
  item: ResolvedItem | undefined
): ResolvedToolIntent {
  const properties: Record<string, unknown> = {
    kind: role.intentKind,
    toolKey: role.toolKey,
    ...role.properties
  };
  for (const [key, path] of Object.entries(role.bindings)) {
    const value = readBinding(path, item);
    if (value === undefined) {
      throw new Error(`blueprint-binding-unresolved:${role.role}:${path}`);
    }
    properties[key] = value;
  }
  const { kind, toolKey, ...intentProperties } = properties;
  return resolvedToolIntentSchema.parse({
    kind,
    toolKey,
    properties: intentProperties
  });
}

function resolveConstraints(
  declarations: readonly InteractionConstraint[],
  emissions: readonly ResolvedEmission[],
  items: readonly ResolvedItem[]
): ResolvedActivity["constraints"] {
  const byRole = (
    role: string,
    itemId: string | undefined
  ): ResolvedEmission[] =>
    emissions.filter(
      (emission) =>
        emission.role === role &&
        (itemId === undefined || emission.itemId === itemId)
    );
  const resolved: ResolvedActivity["constraints"][number][] = [];
  for (const declaration of declarations) {
    const itemIds =
      declaration.target.scope === "each-item" ||
      declaration.sources.some(
        (source) => source.scope === "each-item"
      )
        ? items.map((item) => item.id)
        : [undefined];
    for (const itemId of itemIds) {
      const target = byRole(declaration.target.role, itemId)[0];
      const sources = declaration.sources.flatMap((source) =>
        byRole(source.role, itemId)
      );
      if (!target || sources.length === 0) {
        throw new Error(
          `constraint-reference-missing:${declaration.id}:${itemId ?? "activity"}`
        );
      }
      const satisfiedInitially = evaluateInitialConstraint(
        declaration.kind,
        {
          sources,
          target,
          parameters: declaration.parameters
        }
      );
      resolved.push({
        id: `${declaration.id}:${itemId ?? "activity"}`,
        kind: declaration.kind,
        sourceIds: sources.map((source) => source.id),
        targetId: target.id,
        parameters: declaration.parameters,
        requiresStudentAction: declaration.requiresStudentAction,
        satisfiedInitially
      });
    }
  }
  return resolved;
}

export function resolveActivity(input: {
  blueprint: ActivityBlueprint;
  items: readonly ResolvedItem[];
  recommendation: Recommendation;
  options: ResolveActivityOptions;
}): ResolvedActivity {
  const blueprint = parseActivityBlueprint(input.blueprint);
  const { recommendation, options } = input;
  if (
    !recommendation.supported ||
    !recommendation.curriculum ||
    recommendation.standardCode !==
      blueprint.curriculumBinding.standardCode ||
    recommendation.learningGoal !== blueprint.learningObjective ||
    recommendation.recommendedGrade === undefined ||
    recommendation.difficulty === undefined
  ) {
    throw new Error("blueprint-recommendation-mismatch");
  }
  if (options.seed.length === 0) throw new Error("seed-required");
  if (Number.isNaN(Date.parse(options.generatedAt))) {
    throw new Error("generatedAt-invalid");
  }
  const items = input.items.map((item) => structuredClone(item));
  const layout = resolveLayout(
    blueprint.layout,
    items.map((item) => item.id),
    getLayoutPreset(blueprint.layout.tokenSet)
  );
  const slot = (role: string, itemId?: string) => {
    const found = layout.slots.find(
      (candidate) =>
        candidate.role === role && candidate.itemId === itemId
    );
    if (!found) {
      throw new Error(
        `resolved-layout-slot-missing:${role}:${itemId ?? "activity"}`
      );
    }
    return found;
  };
  const emissions: ResolvedEmission[] = [];
  for (const role of blueprint.toolRoles.filter(
    (candidate) => candidate.scope === "activity"
  )) {
    emissions.push({
      id: mintResolvedId(role.idRole, role.scope),
      role: role.role,
      bounds: slot(role.layoutRole).bounds,
      locked: role.locked,
      movable: role.movable,
      instructionalIntent: role.instructionalIntent,
      ...(slot(role.layoutRole).flowGroup
        ? { flowGroup: slot(role.layoutRole).flowGroup }
        : {}),
      ...(slot(role.layoutRole).collisionGroup
        ? {
            collisionGroup:
              slot(role.layoutRole).collisionGroup
          }
        : {}),
      toolIntent: materializeIntent(role, undefined)
    });
  }
  for (const item of items) {
    for (const role of blueprint.toolRoles.filter(
      (candidate) => candidate.scope === "each-item"
    )) {
      emissions.push({
        id: mintResolvedId(role.idRole, role.scope, item.id),
        role: role.role,
        itemId: item.id,
        bounds: slot(role.layoutRole, item.id).bounds,
        locked: role.locked,
        movable: role.movable,
        instructionalIntent: role.instructionalIntent,
        ...(slot(role.layoutRole, item.id).flowGroup
          ? {
              flowGroup:
                slot(role.layoutRole, item.id).flowGroup
            }
          : {}),
        ...(slot(role.layoutRole, item.id).collisionGroup
          ? {
              collisionGroup:
                slot(role.layoutRole, item.id).collisionGroup
            }
          : {}),
        ...(role.containerRole
          ? {
              containerId: mintResolvedId(
                role.containerRole,
                role.scope,
                item.id
              )
            }
          : {}),
        toolIntent: materializeIntent(role, item)
      });
    }
  }
  const constraints = resolveConstraints(
    blueprint.constraints,
    emissions,
    items
  );
  if (
    !constraints.some(
      (constraint) =>
        constraint.requiresStudentAction &&
        !constraint.satisfiedInitially
    )
  ) {
    throw new Error("activity-initial-state-already-solved");
  }
  const curriculum = recommendation.curriculum;
  return resolvedActivitySchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    id: options.activityId,
    seed: options.seed,
    title: blueprint.title,
    learningObjective: blueprint.learningObjective,
    curriculumReferences: [curriculum],
    recommendationSnapshot: recommendation,
    binding: {
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      blueprintContentHash: blueprint.contentHash,
      generatorId: blueprint.generator.id,
      generatorVersion: blueprint.generator.version,
      seed: options.seed,
      variation: options.variation
    },
    items,
    emissions,
    constraints,
    valuePredicates: blueprint.valuePredicates,
    layout: {
      width: layout.width,
      height: layout.height,
      viewBox: layout.viewBox,
      minGap: layout.minGap
    },
    instructions: blueprint.instructions,
    payload: {
      ...blueprint.payload,
      grade: recommendation.recommendedGrade,
      difficulty: recommendation.difficulty
    },
    provenance: {
      generatedAt: new Date(options.generatedAt).toISOString(),
      requestId: recommendation.requestId,
      curriculumSourceIds: [
        curriculum.officialSource.sourceId,
        ...curriculum.auxiliarySources.map((source) => source.sourceId)
      ],
      auxiliarySnapshotSha: curriculum.auxiliarySources[0]!.version
    },
    legacy: {
      sourceActivitySpecVersion: ACTIVITY_SPEC_SCHEMA_VERSION,
      templateId: blueprint.id,
      templateVersion: options.templateVersion
    }
  });
}
