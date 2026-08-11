import { z } from "zod";
import { stableIdSchema } from "../vocabulary/ids.js";

const distractorSchema = z
  .object({
    role: stableIdSchema.optional(),
    predicateKind: stableIdSchema.optional(),
    misconception: z.string().min(1).max(300)
  })
  .strict()
  .refine(
    (value) =>
      value.role !== undefined ||
      value.predicateKind !== undefined,
    "오개념은 후보 역할 또는 실행 predicate에 결속되어야 합니다."
  );

const selectOneDecisionSchema = z
  .object({
    mode: z.literal("select-one"),
    constraintId: stableIdSchema,
    candidateRoles: z.array(stableIdSchema).min(3).max(8),
    candidateProperty: stableIdSchema,
    correctValuePath: stableIdSchema,
    distractors: z.array(distractorSchema).min(1).max(7)
  })
  .strict();

const constructDecisionSchema = z
  .object({
    mode: z.literal("construct"),
    slotRoles: z.array(stableIdSchema).min(2).max(4),
    pieceRoles: z.array(stableIdSchema).min(3).max(8),
    pieceProperty: stableIdSchema,
    totalPath: stableIdSchema,
    solutionSetPath: stableIdSchema,
    surplusPath: stableIdSchema,
    minimumSolutions: z.number().int().min(2).max(8),
    minimumSurplus: z.number().int().min(1).max(6),
    distractors: z.array(distractorSchema).min(1).max(7)
  })
  .strict();

const constructRuleDecisionSchema = z
  .object({
    mode: z.literal("construct-rule"),
    ruleStatePath: stableIdSchema,
    decisionConstraintId: stableIdSchema,
    variantRoles: z
      .array(stableIdSchema)
      .min(2)
      .max(12)
      .refine((values) => new Set(values).size === values.length),
    ruleSlotRoles: z
      .array(stableIdSchema)
      .min(2)
      .max(12)
      .refine((values) => new Set(values).size === values.length),
    variantProperty: stableIdSchema,
    validRuleStatesPath: stableIdSchema,
    surplusPath: stableIdSchema,
    minimumValidStates: z.number().int().min(2).max(12),
    minimumSurplus: z.number().int().min(1).max(8),
    distractors: z.array(distractorSchema).min(1).max(7)
  })
  .strict();

export const COGNITIVE_GATE_IDS = [
  "G0_MANIFEST_BOUND",
  "G1_DECISION_EXISTS",
  "G2_DISTRACTOR_SURPLUS",
  "G3_ANSWER_HIDDEN",
  "G4_NO_TRIVIAL_PATH",
  "G5_PREDICTION_REGION",
  "G6_EXPLANATION_REGION",
  "G7_SELF_VERIFIABLE",
  "G8_PER_ITEM_STRUGGLE"
] as const;

export const cognitiveDemandManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    blueprintId: stableIdSchema,
    blueprintVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    blueprintContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    mathematicalDecision: z.string().min(1).max(500),
    misconceptionConflict: z.string().min(1).max(500),
    learningMap: z
      .object({
        repository: z.literal(
          "DECK6/korean-elementary-learning-map"
        ),
        commit: z.string().regex(/^[a-f0-9]{40}$/),
        usageSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
        standardCode: z.string().min(1).max(80),
        topicIds: z.array(stableIdSchema).min(1).max(8),
        prerequisiteTopicIds: z.array(stableIdSchema).max(8),
        observableEvidence: z.array(z.string().min(1).max(500)).min(1).max(8),
        assessmentPrompt: z.string().min(1).max(1000),
        caveat: z.string().min(1).max(1000)
      })
      .strict(),
    decision: z.discriminatedUnion("mode", [
      selectOneDecisionSchema,
      constructDecisionSchema,
      constructRuleDecisionSchema
    ]),
    prediction: z.object({ regionRole: stableIdSchema }).strict(),
    verification: z
      .object({
        kind: z.enum([
          "same-whole-length",
          "countable-unit-model",
          "balance",
          "linked-time-hands",
          "elapsed-time-clock-pair",
          "common-unit-cells",
          "common-unit-remainder",
          "coordinate-or-graph",
          "data-representation"
        ]),
        roles: z.array(stableIdSchema).min(1).max(12),
        invariant: z.string().min(1).max(300)
      })
      .strict(),
    explanation: z.object({ regionRole: stableIdSchema }).strict(),
    revisionPath: z.string().min(1).max(500),
    limitations: z
      .object({
        autoGrading: z.literal("none-by-design"),
        phaseOrder: z.literal("teacher-guided")
      })
      .strict()
  })
  .strict();

export type CognitiveDemandManifest = z.infer<
  typeof cognitiveDemandManifestSchema
>;

export function defineCognitiveDemandManifest(
  input: CognitiveDemandManifest
): CognitiveDemandManifest {
  return cognitiveDemandManifestSchema.parse(input);
}
