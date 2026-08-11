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
    // The repeat-rule ENGINE_CORE contract needs nine physical source roles
    // (three semantic values × three copies). Keep this declarative ceiling
    // symmetric with resolvedConstraintSchema and leave headroom for future
    // bounded pools without permitting unbounded payloads.
    sources: z.array(roleReferenceSchema).min(1).max(12),
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
    sourceIds: z.array(stableIdSchema).min(1).max(12),
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
