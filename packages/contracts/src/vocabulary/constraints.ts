import { z } from "zod";
import { stableIdSchema } from "./ids.js";
import { jsonRecordSchema } from "./json.js";

export const roleReferenceSchema = z
  .object({
    scope: z.enum(["activity", "each-item"]),
    role: stableIdSchema
  })
  .strict();

export const interactionConstraintSchema = z
  .object({
    id: stableIdSchema,
    kind: stableIdSchema,
    sources: z.array(roleReferenceSchema).min(1).max(8),
    target: roleReferenceSchema,
    parameters: jsonRecordSchema,
    requiresStudentAction: z.boolean()
  })
  .strict();

export const valuePredicateSchema = z
  .object({
    kind: stableIdSchema,
    parameters: jsonRecordSchema
  })
  .strict();

export const resolvedConstraintSchema = z
  .object({
    id: stableIdSchema,
    kind: stableIdSchema,
    sourceIds: z.array(stableIdSchema).min(1).max(8),
    targetId: stableIdSchema,
    parameters: jsonRecordSchema,
    requiresStudentAction: z.boolean(),
    satisfiedInitially: z.boolean()
  })
  .strict();

export type InteractionConstraint = z.infer<
  typeof interactionConstraintSchema
>;
export type ValuePredicate = z.infer<typeof valuePredicateSchema>;
export type ResolvedConstraint = z.infer<typeof resolvedConstraintSchema>;
