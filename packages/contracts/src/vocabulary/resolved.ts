import { z } from "zod";
import {
  ACTIVITY_SPEC_SCHEMA_VERSION,
  CONTRACT_SCHEMA_VERSION,
  curriculumRecordSchema,
  difficultySchema,
  recommendationSchema
} from "../schemas.js";
import {
  resolvedConstraintSchema,
  valuePredicateSchema
} from "./constraints.js";
import { stableIdSchema } from "./ids.js";
import { jsonRecordSchema } from "./json.js";

export const resolvedItemSchema = z
  .object({
    id: stableIdSchema,
    order: z.number().int().min(1).max(64),
    kind: stableIdSchema,
    values: jsonRecordSchema,
    provenance: z
      .object({
        generatorId: stableIdSchema,
        generatorVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
        seed: z.string().min(1).max(160)
      })
      .strict()
  })
  .strict();

export const resolvedToolIntentSchema = z
  .object({
    kind: stableIdSchema,
    toolKey: stableIdSchema,
    properties: jsonRecordSchema,
    spatialContractId: stableIdSchema.optional(),
    spatialContractVersion: z.string().min(1).max(240).optional()
  })
  .strict();

export const resolvedEmissionSchema = z
  .object({
    id: stableIdSchema,
    role: stableIdSchema,
    itemId: stableIdSchema.optional(),
    bounds: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().positive().finite(),
        height: z.number().positive().finite()
      })
      .strict(),
    renderedBounds: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().positive().finite(),
        height: z.number().positive().finite()
      })
      .strict()
      .optional(),
    locked: z.boolean(),
    movable: z.boolean(),
    instructionalIntent: z.string().min(1).max(300),
    flowGroup: stableIdSchema.optional(),
    collisionGroup: stableIdSchema.optional(),
    containerId: stableIdSchema.optional(),
    toolIntent: resolvedToolIntentSchema
  })
  .strict();

export const resolvedActivitySchema = z
  .object({
    schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
    id: stableIdSchema,
    seed: z.string().min(1).max(160),
    title: z.string().min(1).max(120),
    learningObjective: z.string().min(1).max(500),
    curriculumReferences: z.array(curriculumRecordSchema).min(1).max(4),
    recommendationSnapshot: recommendationSchema,
    binding: z
      .object({
        blueprintId: stableIdSchema,
        blueprintVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
        blueprintContentHash: z.string().regex(/^[a-f0-9]{64}$/),
        generatorId: stableIdSchema,
        generatorVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
        seed: z.string().min(1).max(160),
        variation: jsonRecordSchema
      })
      .strict(),
    items: z.array(resolvedItemSchema).min(1).max(64),
    emissions: z.array(resolvedEmissionSchema).min(1).max(512),
    constraints: z.array(resolvedConstraintSchema).min(1).max(256),
    valuePredicates: z.array(valuePredicateSchema).min(1).max(16),
    layout: z
      .object({
        width: z.number().positive().finite(),
        height: z.number().positive().finite(),
        viewBox: z.tuple([
          z.number().finite(),
          z.number().finite(),
          z.number().positive(),
          z.number().positive()
        ]),
        minGap: z.number().positive().finite()
      })
      .strict(),
    instructions: z.array(z.string().min(1).max(160)).min(1).max(8),
    payload: z
      .object({
        categoryId: z.string().min(1).max(80),
        tags: z.array(z.string().max(80)).max(20),
        studyLevel: z.literal("elementary"),
        isShowMenuOnActivity: z.boolean(),
        grade: z.number().int().min(1).max(12),
        difficulty: difficultySchema
      })
      .strict(),
    provenance: z
      .object({
        generatedAt: z.string().datetime(),
        requestId: stableIdSchema,
        curriculumSourceIds: z.array(stableIdSchema).min(1).max(12),
        auxiliarySnapshotSha: z.string().regex(/^[a-f0-9]{40}$/)
      })
      .strict(),
    legacy: z
      .object({
        sourceActivitySpecVersion: z.literal(
          ACTIVITY_SPEC_SCHEMA_VERSION
        ),
        templateId: stableIdSchema,
        templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/)
      })
      .strict()
  })
  .strict();

export type ResolvedItem = z.infer<typeof resolvedItemSchema>;
export type ResolvedToolIntent = z.infer<
  typeof resolvedToolIntentSchema
>;
export type ResolvedEmission = z.infer<typeof resolvedEmissionSchema>;
export type ResolvedActivity = z.infer<typeof resolvedActivitySchema>;
