import { z } from "zod";
import { sha256Hex } from "../hash.js";
import { blueprintLayoutSchema, countLayoutNodes } from "./layout.js";
import {
  interactionConstraintSchema,
  valuePredicateSchema
} from "./constraints.js";
import {
  stableIdSchema
} from "./ids.js";
import { jsonRecordSchema } from "./json.js";

const bindingPathSchema = z
  .string()
  .regex(/^(activity|item)(\.[A-Za-z0-9_-]+)+$/);

export const toolRoleSchema = z
  .object({
    role: stableIdSchema,
    scope: z.enum(["activity", "each-item"]),
    layoutRole: stableIdSchema,
    idRole: stableIdSchema,
    toolKey: stableIdSchema,
    intentKind: stableIdSchema,
    spatialContractId: stableIdSchema.optional(),
    spatialContractVersion: z.string().min(1).max(240).optional(),
    locked: z.boolean(),
    movable: z.boolean(),
    instructionalIntent: z.string().min(1).max(300),
    properties: jsonRecordSchema,
    bindings: z.record(bindingPathSchema),
    containerRole: stableIdSchema.optional()
  })
  .strict();

const blueprintBodySchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: stableIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: z.string().min(1).max(120),
    learningObjective: z.string().min(1).max(500),
    curriculumBinding: z
      .object({
        standardCode: z.string().min(1).max(80),
        domain: z.string().min(1).max(80),
        officialGoal: z.string().min(1).max(500)
      })
      .strict(),
    generator: z
      .object({
        id: stableIdSchema,
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        parameters: jsonRecordSchema
      })
      .strict(),
    toolRoles: z.array(toolRoleSchema).min(1).max(64),
    layout: blueprintLayoutSchema,
    constraints: z.array(interactionConstraintSchema).min(1).max(32),
    valuePredicates: z.array(valuePredicateSchema).min(1).max(16),
    instructions: z.array(z.string().min(1).max(160)).min(1).max(8),
    payload: z
      .object({
        categoryId: z.string().min(1).max(80),
        tags: z.array(z.string().min(1).max(80)).max(20),
        studyLevel: z.literal("elementary"),
        isShowMenuOnActivity: z.boolean()
      })
      .strict(),
    variationDefaults: jsonRecordSchema
  })
  .strict();

export const activityBlueprintSchema = blueprintBodySchema
  .extend({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/)
  })
  .strict()
  .superRefine((blueprint, context) => {
    const layout = countLayoutNodes(blueprint.layout.root);
    if (layout.count > 64) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layout"],
        message: "blueprint layout node는 64개를 넘을 수 없습니다."
      });
    }
    if (layout.depth > 8) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layout"],
        message: "blueprint layout 깊이는 8을 넘을 수 없습니다."
      });
    }
  });

export type ActivityBlueprint = z.infer<typeof activityBlueprintSchema>;
export type ActivityBlueprintBody = z.infer<typeof blueprintBodySchema>;

const forbiddenKeys = new Set([
  "x",
  "y",
  "width",
  "height",
  "contentsJson",
  "canvasOption",
  "answer",
  "answers",
  "answerKey",
  "correctAnswer",
  "correctRelation",
  "items",
  "generatedItems",
  "script"
]);

const allowedPredicateMetadataPaths = new Set([
  "valuePredicates.*.parameters.nativeEvidenceContract.renderedBounds.width",
  "valuePredicates.*.parameters.nativeEvidenceContract.renderedBounds.height",
  "valuePredicates.*.parameters.nativeEvidenceContract.minimumTargetBounds.width",
  "valuePredicates.*.parameters.nativeEvidenceContract.minimumTargetBounds.height"
]);

function isAllowedPredicateMetadataPath(path: readonly string[]): boolean {
  if (path.length !== 6) return false;
  const normalized = [
    path[0],
    path[1] === undefined ? undefined : "*",
    path[2],
    path[3],
    path[4],
    path[5]
  ];
  return (
    normalized.every((segment) => typeof segment === "string") &&
    allowedPredicateMetadataPaths.has(
      normalized.join(".")
    )
  );
}

function assertBlueprintValue(
  value: unknown,
  path: readonly string[] = []
): void {
  if (typeof value === "function") {
    throw new Error(`blueprint-function-forbidden:${path.join(".")}`);
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertBlueprintValue(child, [...path, String(index)])
    );
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (forbiddenKeys.has(key) && !isAllowedPredicateMetadataPath(childPath)) {
      throw new Error(
        `blueprint-key-forbidden:${childPath.join(".")}`
      );
    }
    assertBlueprintValue(child, childPath);
  }
}

export function blueprintContentHash(
  body: ActivityBlueprintBody
): string {
  return sha256Hex(body);
}

export function defineActivityBlueprint(
  input: ActivityBlueprintBody
): ActivityBlueprint {
  assertBlueprintValue(input);
  const body = blueprintBodySchema.parse(input);
  return activityBlueprintSchema.parse({
    ...body,
    contentHash: blueprintContentHash(body)
  });
}

export function parseActivityBlueprint(
  input: unknown
): ActivityBlueprint {
  assertBlueprintValue(input);
  const parsed = activityBlueprintSchema.parse(input);
  const { contentHash, ...body } = parsed;
  if (contentHash !== blueprintContentHash(body)) {
    throw new Error("blueprint-content-hash-mismatch");
  }
  return parsed;
}
