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

const declaredRuleRepairSchema = z
  .object({
    kind: z.literal("declared-rule-independent-misplacement"),
    declaredRuleStatePath: stableIdSchema,
    repairRuleStateIndex: z.number().int().min(0).max(11),
    wrongItemProperty: stableIdSchema,
    wrongItemRoles: z
      .array(stableIdSchema)
      .length(1)
      .refine((values) => new Set(values).size === values.length),
    repairTargetRoles: z
      .array(stableIdSchema)
      .length(1)
      .refine((values) => new Set(values).size === values.length),
    repairBankRoles: z
      .array(stableIdSchema)
      .length(1)
      .refine((values) => new Set(values).size === values.length),
    beforeStatePath: stableIdSchema,
    afterStatePath: stableIdSchema,
    validAfterStateExamplesPath: stableIdSchema,
    afterStateDerivation: z
      .object({
        kind: z.literal("replace-at-declared-rule-index"),
        declaredRuleStatePath: stableIdSchema,
        repairRuleStateIndex: z.number().int().min(0).max(11),
        requiresConditionalMapping: z.literal(true)
      })
      .strict(),
    removeConstraintId: stableIdSchema,
    replacementConstraintId: stableIdSchema,
    requiresIndependentWrongState: z.literal(true),
    requiresBeforeAfterComparison: z.literal(true),
    evidenceMode: z.literal("student-state-dependent")
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.beforeStatePath === value.afterStatePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["afterStatePath"],
        message: "수정 전·후 상태 경로는 달라야 합니다."
      });
    }
    if (
      value.beforeStatePath === value.validAfterStateExamplesPath ||
      value.afterStatePath === value.validAfterStateExamplesPath
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validAfterStateExamplesPath"],
        message: "수정 전·후 상태 예시 경로는 관찰 상태 경로와 달라야 합니다."
      });
    }
    const roleSets = [
      value.wrongItemRoles,
      value.repairTargetRoles,
      value.repairBankRoles
    ];
    if (
      new Set(roleSets.flat()).size !==
      roleSets.reduce((sum, roles) => sum + roles.length, 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wrongItemRoles"],
        message: "오답·수정칸·바구니 역할은 서로 겹치면 안 됩니다."
      });
    }
  });

const declaredRuleStateLifecycleSchema = z
  .object({
    kind: z.literal("empty-selection-then-declared-repair"),
    statePath: stableIdSchema,
    selectionPhase: z.literal("rule-selection"),
    selectionOutputStatePath: stableIdSchema,
    writesDeclaredState: z.literal(true),
    phaseOrder: z.tuple([
      z.literal("rule-selection"),
      z.literal("remove-misaligned"),
      z.literal("place-replacement")
    ]),
    initialState: z.literal("empty"),
    declaredStateCardinality: z.number().int().min(2).max(12),
    declaredStateExamplesPath: stableIdSchema,
    selectionConstraintIdPrefix: stableIdSchema,
    requiresIndexedSelectionWrites: z.literal(true),
    repairRequiresDeclaredState: z.literal(true)
  })
  .strict()
  .refine(
    (value) => value.statePath !== value.selectionOutputStatePath,
    "초기 규칙 상태와 학생이 선언한 규칙 상태 경로는 달라야 합니다."
  );

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
        minimumDistinctPoolValues: z.number().int().min(3).max(12),
        minimumCopiesPerDistinctValue: z.number().int().min(3).max(12),
        sourceUseMode: z.literal("move-once-no-clone"),
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
        requiresSimultaneousRuleAndContinuation: z.literal(true),
        ruleStateIndexMode: z.literal("index-mod-period"),
        evidenceMode: z.literal("student-state-dependent")
      })
      .strict()
      .optional(),
    repair: declaredRuleRepairSchema.optional(),
    stateLifecycle: declaredRuleStateLifecycleSchema.optional(),
    distractors: z.array(distractorSchema).min(1).max(7)
  })
  .strict();

const changeRuleStateSchema = z
  .object({
    ruleStateKey: stableIdSchema,
    startValue: z.number().int().min(0).max(9),
    stepMagnitude: z.number().int().min(1).max(9),
    directionCode: z.union([z.literal(1), z.literal(2)]),
    direction: z.enum(["increase", "decrease"]),
    sequenceValues: z.array(z.number().int().min(0).max(9)).length(4),
    wrongIndex: z.number().int().min(0).max(3),
    wrongValue: z.number().int().min(0).max(9),
    repairValue: z.number().int().min(0).max(9)
  })
  .strict();

const changeRuleSourceSchema = z
  .object({
    roleId: stableIdSchema,
    ruleStateKey: stableIdSchema,
    value: z.number().int().min(0).max(9),
    variantId: z.string().regex(/^NO04NT-(?:0[1-9]|10)$/),
    decodedValue: z.union([
      z.number().int().min(0).max(9),
      z.enum(["increase", "decrease"])
    ]).optional()
  })
  .strict();

const changeRuleSourcePoolSchema = z
  .object({
    id: stableIdSchema,
    targetRole: stableIdSchema,
    toolKey: z.literal("NO04NT"),
    phase: z.enum([
      "rule-selection",
      "apply-declared-change",
      "repair-declared-change"
    ]),
    writesStatePath: stableIdSchema,
    writesStateIndex: z.number().int().min(0).max(3),
    writesStateIndexPath: stableIdSchema.optional(),
    mappingPath: stableIdSchema.optional(),
    stateField: z.enum(["startValue", "stepMagnitude", "direction"]).optional(),
    sourceValueProperty: z.literal("value"),
    valueDecoder: z.enum([
      "integer-0-9-v1",
      "positive-integer-1-9-v1",
      "direction-code-v1"
    ]),
    sources: z.array(changeRuleSourceSchema).length(4)
  })
  .strict();

const changeRuleSourceModelSchema = z
  .object({
    toolKey: z.literal("NO04NT"),
    sourceUseMode: z.literal("move-once-no-clone"),
    selectionCorrelation: z.literal("single-ruleStateKey-across-eight-writes"),
    validStateCount: z.literal(4),
    sourcePoolCount: z.literal(8),
    sourcesPerPool: z.literal(4),
    perStateRoleCount: z.literal(8),
    physicalSourceRoleCount: z.literal(32),
    sourcePools: z.array(changeRuleSourcePoolSchema).length(8),
    capacity: z
      .object({
        requiredPhysicalSources: z.literal(32),
        requiredControlWrites: z.literal(12),
        requiredApplicationWrites: z.literal(16),
        requiredRepairWrites: z.literal(4),
        requiredDerivedOutputs: z.literal(20),
        selectedPhysicalSourcesPerState: z.literal(8),
        requiredTargetActionsPerState: z.literal(8),
        cloneOrReuseAssumed: z.literal(false),
        requiresPairwiseDisjointRoleIds: z.literal(true)
      })
      .strict()
  })
  .strict();

const changeRuleWriteSchema = z
  .object({
    writeId: stableIdSchema,
    constraintId: stableIdSchema,
    stateId: stableIdSchema,
    ruleStateKey: stableIdSchema,
    ruleStateKeyProperty: z.literal("ruleStateKey"),
    sourceRoleId: stableIdSchema,
    sourcePoolId: stableIdSchema,
    targetRole: stableIdSchema,
    phase: z.enum([
      "rule-selection",
      "apply-declared-change",
      "repair-declared-change"
    ]),
    writesStatePath: stableIdSchema,
    writesStateIndex: z.number().int().min(0).max(3),
    writesStateIndexPath: stableIdSchema.optional(),
    mappingPath: stableIdSchema.optional(),
    stateField: z.enum(["startValue", "stepMagnitude", "direction"]).optional(),
    sourceValueProperty: z.literal("value"),
    valueDecoder: z.enum([
      "integer-0-9-v1",
      "positive-integer-1-9-v1",
      "direction-code-v1"
    ]),
    expectedSourceValue: z.number().int().min(0).max(9),
    expectedDecodedValue: z.union([
      z.number().int().min(0).max(9),
      z.enum(["increase", "decrease"])
    ])
  })
  .strict();

const changeRuleSourceWriteContractSchema = z
  .object({
    cardinality: z
      .object({
        validStateCount: z.literal(4),
        sourcePoolCount: z.literal(8),
        writesPerState: z.literal(8),
        writeCount: z.literal(32),
        controlWriteCount: z.literal(12),
        applicationWriteCount: z.literal(16),
        repairWriteCount: z.literal(4)
      })
      .strict(),
    writes: z.array(changeRuleWriteSchema).length(32)
  })
  .strict();

const changeRuleAnswerLeakContractSchema = z
  .object({
    mode: z.literal("unordered-field-set-across-emissions"),
    semanticKeys: z.tuple([
      z.literal("startValue"),
      z.literal("stepMagnitude"),
      z.literal("direction")
    ]),
    emissionScope: z.literal("locked-non-source"),
    scanSurfaces: z.tuple([
      z.literal("structured-properties"),
      z.literal("visible-text")
    ]),
    excludeSourceRoleIds: z.literal(true),
    numericMultiplicityAware: z.literal(true),
    rejectCompleteStateAcrossEmissions: z.literal(true),
    permutationCoverage: z
      .array(
        z.tuple([
          z.enum(["startValue", "stepMagnitude", "direction"]),
          z.enum(["startValue", "stepMagnitude", "direction"]),
          z.enum(["startValue", "stepMagnitude", "direction"])
        ])
      )
      .length(6)
  })
  .strict();

const changeRuleNativeEvidenceContractSchema = z
  .object({
    toolKey: z.literal("NO04NT"),
    releasedValueVariantMap: z
      .array(
        z
          .object({
            value: z.number().int().min(0).max(9),
            variantId: z.string().regex(/^NO04NT-(?:0[1-9]|10)$/)
          })
          .strict()
      )
      .length(10),
    expectedSourceRoleIds: z.array(stableIdSchema).length(32),
    expectedSourceRoleCount: z.literal(32),
    expectedTargetRoleIds: z.array(stableIdSchema).length(8),
    expectedTargetRoleCount: z.literal(8),
    renderedBounds: z
      .object({
        width: z.literal(80),
        height: z.literal(80),
        sourceConstant: z.literal("NUMBER_CARD_RENDERED_SIZE")
      })
      .strict(),
    minimumTargetBounds: z
      .object({ width: z.literal(188), height: z.literal(188) })
      .strict(),
    containment: z.literal("native-rendered-bounds"),
    requiresExactResolvedSourceIdValueVariantMatch: z.literal(true),
    requiresAllSourcesAndTargetsVisibleSimultaneously: z.literal(true),
    requiresPairwiseDisjointSourcePools: z.literal(true),
    requiresSourceTargetRegionDisjointness: z.literal(true)
  })
  .strict();

export const changeRuleDecisionSchema = z
  .object({
    mode: z.literal("construct-change-rule"),
    constructionMode: z.literal("student-constructed"),
    answerMode: z.literal("conditional-rubric"),
    ruleStatePath: stableIdSchema,
    stateFields: z.tuple([
      z.literal("startValue"),
      z.literal("stepMagnitude"),
      z.literal("direction")
    ]).readonly(),
    directionValues: z.tuple([
      z.literal("increase"),
      z.literal("decrease")
    ]).readonly(),
    minimumDistinctStartValues: z.number().int().min(2).max(8),
    minimumDistinctStepMagnitudes: z.number().int().min(2).max(8),
    initialState: z.literal("empty"),
    requiresStudentDeclaredState: z.literal(true),
    validStateCatalog: z.array(changeRuleStateSchema).length(4),
    sourceModel: changeRuleSourceModelSchema,
    sourceWriteContract: changeRuleSourceWriteContractSchema,
    answerLeakContract: changeRuleAnswerLeakContractSchema,
    nativeEvidenceContract: changeRuleNativeEvidenceContractSchema,
    distractors: z.array(distractorSchema).min(2).max(7),
    application: z
      .object({
        ruleStatePath: stableIdSchema,
        sequenceStatePath: stableIdSchema,
        minimumVisibleTerms: z.number().int().min(4).max(12),
        transition: z.literal("next-equals-current-plus-signed-step"),
        requiresAdjacentDifferenceEvidence: z.literal(true),
        requiresVisibleComparison: z.literal(true)
      })
      .strict(),
    repair: z
      .object({
        ruleStatePath: stableIdSchema,
        beforeStatePath: stableIdSchema,
        afterStatePath: stableIdSchema,
        wrongIndexPath: stableIdSchema,
        derivation: z.literal("replace-with-declared-transition-value"),
        requiresConditionalMapping: z.literal(true),
        requiresOnlyWrongIndexChanges: z.literal(true)
      })
      .strict()
  })
  .strict();

export const changeRuleRuntimeParametersSchema = changeRuleDecisionSchema.omit({
  minimumDistinctStartValues: true,
  minimumDistinctStepMagnitudes: true,
  requiresStudentDeclaredState: true
});

export function isBoundedChangeRuleDecision(
  decision: z.infer<typeof changeRuleDecisionSchema>
): boolean {
    const stateByKey = new Map(
      decision.validStateCatalog.map((state) => [state.ruleStateKey, state])
    );
    const sourcePools = decision.sourceModel.sourcePools;
    const sources = sourcePools.flatMap((pool) => pool.sources);
    const sourceByRole = new Map(sources.map((source) => [source.roleId, source]));
    const writeByRole = new Map(
      decision.sourceWriteContract.writes.map((write) => [write.sourceRoleId, write])
    );
    const stateKeys = [...stateByKey.keys()];
    const targetRoles = sourcePools.map((pool) => pool.targetRole);
    const poolIds = sourcePools.map((pool) => pool.id);
    const exactVariant = (value: number) =>
      `NO04NT-${String(value + 1).padStart(2, "0")}`;
    const catalogValid = decision.validStateCatalog.every((state) => {
      const signedStep = state.direction === "increase"
        ? state.stepMagnitude
        : -state.stepMagnitude;
      return (
        state.directionCode === (state.direction === "increase" ? 1 : 2) &&
        state.sequenceValues.every(
          (value, index) => value === state.startValue + signedStep * index
        ) &&
        state.repairValue === state.sequenceValues[state.wrongIndex] &&
        state.wrongValue !== state.repairValue
      );
    });
    const poolShapeValid =
      new Set(stateKeys).size === 4 &&
      new Set(poolIds).size === 8 &&
      new Set(targetRoles).size === 8 &&
      new Set(sources.map((source) => source.roleId)).size === 32 &&
      sourcePools.every(
        (pool) =>
          new Set(pool.sources.map((source) => source.ruleStateKey)).size === 4 &&
          pool.sources.every(
            (source) =>
              stateByKey.has(source.ruleStateKey) &&
              source.variantId === exactVariant(source.value)
          )
      );
    const writesValid =
      new Set(decision.sourceWriteContract.writes.map((write) => write.writeId)).size === 32 &&
      writeByRole.size === 32 &&
      decision.sourceWriteContract.writes.every((write) => {
        const source = sourceByRole.get(write.sourceRoleId);
        const pool = sourcePools.find((entry) => entry.id === write.sourcePoolId);
        return (
          source !== undefined &&
          pool !== undefined &&
          write.stateId === write.ruleStateKey &&
          write.ruleStateKey === source.ruleStateKey &&
          write.targetRole === pool.targetRole &&
          write.phase === pool.phase &&
          write.writesStatePath === pool.writesStatePath &&
          write.writesStateIndex === pool.writesStateIndex &&
          write.stateField === pool.stateField &&
          write.writesStateIndexPath === pool.writesStateIndexPath &&
          write.mappingPath === pool.mappingPath &&
          write.valueDecoder === pool.valueDecoder &&
          write.expectedSourceValue === source.value &&
          (source.decodedValue === undefined ||
            source.decodedValue === write.expectedDecodedValue)
        );
      });
    const permutationKeys = decision.answerLeakContract.permutationCoverage.map(
      (entry) => [...entry].sort().join("|")
    );
    const nativeValid =
      new Set(decision.nativeEvidenceContract.expectedSourceRoleIds).size === 32 &&
      decision.nativeEvidenceContract.expectedSourceRoleIds.every((role) =>
        sourceByRole.has(role)
      ) &&
      new Set(decision.nativeEvidenceContract.expectedTargetRoleIds).size === 8 &&
      decision.nativeEvidenceContract.expectedTargetRoleIds.every((role) =>
        targetRoles.includes(role)
      ) &&
      decision.nativeEvidenceContract.releasedValueVariantMap.every(
        ({ value, variantId }) => variantId === exactVariant(value)
      );
    return (
      catalogValid &&
      poolShapeValid &&
      writesValid &&
      new Set(permutationKeys).size === 1 &&
      new Set(
        decision.answerLeakContract.permutationCoverage.map((entry) => entry.join("|"))
      ).size === 6 &&
      nativeValid
    );
}

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
      constructRuleDecisionSchema,
      changeRuleDecisionSchema
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
    if (manifest.decision.mode === "construct-change-rule") {
      const decision = manifest.decision;
      if (!isBoundedChangeRuleDecision(decision)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["decision", "sourceModel"],
          message: "변화 규칙의 상태·32개 실물 수 카드·8개 쓰기 경로·native 증거가 서로 정확히 결속되어야 합니다."
        });
      }
      const misconceptionKeys = new Set(
        decision.distractors.map((entry) =>
          entry.misconception.normalize("NFKC").trim()
        )
      );
      const expectedRoles = [
        "rule-control-start",
        "rule-control-step",
        "rule-control-direction",
        "sequence-term-1",
        "sequence-term-2",
        "sequence-term-3",
        "sequence-term-4",
        "repair-target"
      ];
      if (
        misconceptionKeys.size !== decision.distractors.length ||
        decision.application.ruleStatePath !== decision.ruleStatePath ||
        decision.repair.ruleStatePath !== decision.ruleStatePath ||
        decision.application.sequenceStatePath === decision.ruleStatePath ||
        decision.repair.beforeStatePath === decision.repair.afterStatePath ||
        decision.repair.beforeStatePath === decision.ruleStatePath ||
        decision.repair.afterStatePath === decision.ruleStatePath ||
        JSON.stringify(manifest.verification.roles) !==
          JSON.stringify(expectedRoles)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["decision"],
          message: "변화 규칙 선언·적용·수정 경로와 관찰 역할은 서로 정확히 결속되어야 합니다."
        });
      }
      return;
    }
    if (manifest.decision.mode !== "construct-rule") return;
    const decision = manifest.decision;
    const extensionPresent =
      decision.constructionMode !== undefined ||
      decision.answerMode !== undefined ||
      decision.stateConstruction !== undefined ||
      decision.application !== undefined ||
      decision.repair !== undefined ||
      decision.stateLifecycle !== undefined;
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
    const repair = decision.repair;
    const lifecycle = decision.stateLifecycle;
    if ((repair === undefined) !== (lifecycle === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision", repair === undefined ? "repair" : "stateLifecycle"],
        message: "선언 규칙 수정 계약은 repair와 stateLifecycle을 함께 선언해야 합니다."
      });
      return;
    }
    const applicationRuleStatePath =
      lifecycle?.selectionOutputStatePath ?? decision.ruleStatePath;
    const allSemanticRoleSets = [
      decision.variantRoles,
      decision.ruleSlotRoles,
      application.continuationTargetRoles,
      ...(repair
        ? [repair.wrongItemRoles, repair.repairTargetRoles, repair.repairBankRoles]
        : [])
    ];
    const semanticRoles = allSemanticRoleSets.flat();
    const distinctDistractorKeys = new Set(
      decision.distractors.map((distractor) =>
        distractor.misconception.normalize("NFKC").trim()
      )
    );
    if (
      decision.minimumSurplus < 2 ||
      distinctDistractorKeys.size < 2 ||
      JSON.stringify(construction.sourceRoles) !==
        JSON.stringify(decision.variantRoles) ||
      JSON.stringify(construction.slotRoles) !==
        JSON.stringify(decision.ruleSlotRoles) ||
      construction.slotCount !== construction.slotRoles.length ||
      construction.minimumDistinctValues > construction.slotCount ||
      construction.minimumDistinctValues !== decision.ruleSlotRoles.length ||
      construction.minimumDistinctPoolValues < 3 ||
      construction.minimumCopiesPerDistinctValue < 3 ||
      construction.sourceUseMode !== "move-once-no-clone" ||
      decision.variantRoles.length <
        construction.minimumDistinctPoolValues *
          construction.minimumCopiesPerDistinctValue ||
      application.ruleStatePath !== applicationRuleStatePath ||
      application.period !== decision.ruleSlotRoles.length ||
      application.minimumTargetCount !==
        application.continuationTargetRoles.length ||
      application.minimumTargetCount % application.period !== 0 ||
      !application.requiresSimultaneousRuleAndContinuation ||
      application.ruleStateIndexMode !== "index-mod-period" ||
      construction.minimumCopiesPerDistinctValue <
        1 +
          application.continuationTargetRoles.length /
            application.period +
          (decision.repair?.repairTargetRoles.length ?? 0) ||
      JSON.stringify(manifest.verification.roles) !==
        JSON.stringify(
          decision.repair
            ? [
                ...decision.ruleSlotRoles,
                ...application.continuationTargetRoles,
                ...decision.repair.wrongItemRoles,
                ...decision.repair.repairTargetRoles,
                ...decision.repair.repairBankRoles
              ]
            : [
                ...decision.ruleSlotRoles,
                ...application.continuationTargetRoles
              ]
        ) ||
      new Set(semanticRoles).size !== semanticRoles.length ||
      (repair !== undefined &&
        lifecycle !== undefined &&
        (lifecycle.statePath !== decision.ruleStatePath ||
          lifecycle.initialState !== construction.initialState ||
          lifecycle.declaredStateCardinality !== construction.slotCount ||
          lifecycle.declaredStateExamplesPath !== decision.validRuleStatesPath ||
          lifecycle.selectionConstraintIdPrefix !== decision.decisionConstraintId ||
          repair.declaredRuleStatePath !== lifecycle.selectionOutputStatePath ||
          repair.wrongItemProperty !== decision.variantProperty ||
          repair.afterStateDerivation.declaredRuleStatePath !==
            repair.declaredRuleStatePath ||
          repair.afterStateDerivation.repairRuleStateIndex !==
            repair.repairRuleStateIndex))
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
