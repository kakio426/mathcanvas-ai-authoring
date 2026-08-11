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
    constructionMode: z
      .literal("student-constructed")
      .optional(),
    answerMode: z
      .literal("conditional-rubric")
      .optional(),
    ruleStatePath: stableIdSchema,
    decisionConstraintId: stableIdSchema,
    variantRoles: z
      .array(stableIdSchema)
      .min(3)
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
    stateConstruction: z
      .object({
        kind: z.literal("ordered-distinct-subset-from-pool"),
        sourceRoles: z
          .array(stableIdSchema)
          .min(3)
          .max(12)
          .refine((values) => new Set(values).size === values.length),
        slotRoles: z
          .array(stableIdSchema)
          .min(2)
          .max(12)
          .refine((values) => new Set(values).size === values.length),
        slotCount: z.number().int().min(2).max(12),
        minimumDistinctValues: z.number().int().min(2).max(12),
        allowsAnyOrderedSelection: z.literal(true),
        initialState: z.literal("empty")
      })
      .strict()
      .optional(),
    application: z
      .object({
        ruleStatePath: stableIdSchema,
        continuationTargetRoles: z
          .array(stableIdSchema)
          .min(4)
          .max(24)
          .refine((values) => new Set(values).size === values.length),
        period: z.number().int().min(2).max(12),
        minimumTargetCount: z.number().int().min(4).max(24),
        requiresVisibleComparison: z.literal(true),
        evidenceMode: z.literal("student-state-dependent")
      })
      .strict()
      .optional(),
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
  .strict()
  .superRefine((manifest, ctx) => {
    if (manifest.decision.mode !== "construct-rule") return;
    const decision = manifest.decision;
    const extensionPresent =
      decision.constructionMode !== undefined ||
      decision.answerMode !== undefined ||
      decision.stateConstruction !== undefined ||
      decision.application !== undefined;
    if (!extensionPresent) return;
    const requiredFields = [
      ["constructionMode", decision.constructionMode],
      ["answerMode", decision.answerMode],
      ["stateConstruction", decision.stateConstruction],
      ["application", decision.application]
    ] as const;
    for (const [field, value] of requiredFields) {
      if (value === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["decision", field],
          message:
            "student-constructed 확장은 네 필드를 함께 선언해야 합니다."
        });
      }
    }
    if (
      decision.constructionMode !== "student-constructed" ||
      decision.answerMode !== "conditional-rubric" ||
      decision.stateConstruction === undefined ||
      decision.application === undefined
    ) {
      return;
    }
    const construction = decision.stateConstruction;
    const application = decision.application;
    if (
      decision.minimumSurplus < 2 ||
      decision.distractors.length < 2 ||
      JSON.stringify(construction.sourceRoles) !==
        JSON.stringify(decision.variantRoles) ||
      JSON.stringify(construction.slotRoles) !==
        JSON.stringify(decision.ruleSlotRoles) ||
      construction.slotCount !== construction.slotRoles.length ||
      construction.minimumDistinctValues > construction.slotCount ||
      application.ruleStatePath !== decision.ruleStatePath ||
      application.period !== decision.ruleSlotRoles.length ||
      application.minimumTargetCount >
        application.continuationTargetRoles.length ||
      JSON.stringify(manifest.verification.roles) !==
        JSON.stringify([
          ...decision.ruleSlotRoles,
          ...application.continuationTargetRoles
        ])
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message:
          "student-constructed 결정·검증 역할·적용 경로가 서로 결속되지 않았습니다."
      });
    }
  });

export type CognitiveDemandManifest = z.infer<
  typeof cognitiveDemandManifestSchema
>;

export function defineCognitiveDemandManifest(
  input: CognitiveDemandManifest
): CognitiveDemandManifest {
  return cognitiveDemandManifestSchema.parse(input);
}
