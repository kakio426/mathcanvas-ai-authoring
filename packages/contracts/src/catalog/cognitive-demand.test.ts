import { describe, expect, it } from "vitest";
import {
  cognitiveDemandManifestSchema,
  defineCognitiveDemandManifest
} from "./cognitive-demand.js";

const constructRuleManifest = () => ({
  schemaVersion: "1.0.0" as const,
  blueprintId: "pattern.rule-core-v1",
  blueprintVersion: "1.0.0",
  blueprintContentHash: "a".repeat(64),
  mathematicalDecision: "학생이 순서 있는 반복 규칙을 직접 구성하고 선언한다.",
  misconceptionConflict: "반복 단위의 순서를 중간에 바꾸거나 마지막 항만 복사한다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map" as const,
    commit: "b".repeat(40),
    usageSnapshotSha256: "c".repeat(64),
    standardCode: "[2수02-02]",
    topicIds: ["pattern.repeat"],
    prerequisiteTopicIds: [],
    observableEvidence: ["학생이 반복 단위와 경계를 선언한다."],
    assessmentPrompt: "반복 단위를 직접 구성하고 다음 항을 설명하게 하라.",
    caveat: "학습지도 저장소는 보조 자료다."
  },
  decision: {
    mode: "construct-rule" as const,
    ruleStatePath: "ruleState",
    decisionConstraintId: "construct-rule-slot",
    variantRoles: [
      "rule-variant-1",
      "rule-variant-2",
      "rule-variant-3"
    ],
    ruleSlotRoles: ["rule-slot-1", "rule-slot-2"],
    variantProperty: "orderedValues",
    validRuleStatesPath: "validRuleStates",
    surplusPath: "surplusRuleStates",
    minimumValidStates: 2,
    minimumSurplus: 1,
    distractors: [
      {
        predicateKind: "cognitive.rule-state-contract",
        misconception: "반복 단위의 순서를 중간에 바꾼다."
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "data-representation" as const,
    roles: ["rule-lane"],
    invariant: "모든 항이 같은 순서의 반복 단위를 따른다."
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath: "선언한 규칙과 맞지 않는 항을 고쳐 다시 설명한다.",
  limitations: {
    autoGrading: "none-by-design" as const,
    phaseOrder: "teacher-guided" as const
  }
});

const studentConstructedManifest = () => {
  const base = constructRuleManifest();
  return {
    ...base,
    decision: {
      ...base.decision,
      constructionMode: "student-constructed" as const,
      answerMode: "conditional-rubric" as const,
      ruleStatePath: "studentRuleState",
      variantRoles: [
        "rule-variant-1",
        "rule-variant-2",
        "rule-variant-3",
        "rule-variant-4",
        "rule-variant-5",
        "rule-variant-6",
        "rule-variant-7",
        "rule-variant-8",
        "rule-variant-9"
      ],
      validRuleStatesPath: "validRuleStateExamples",
      surplusPath: "surplusRuleStateExamples",
      minimumSurplus: 2,
      stateConstruction: {
        kind: "ordered-distinct-subset-from-pool" as const,
        sourceRoles: [
          "rule-variant-1",
          "rule-variant-2",
          "rule-variant-3",
          "rule-variant-4",
          "rule-variant-5",
          "rule-variant-6",
          "rule-variant-7",
          "rule-variant-8",
          "rule-variant-9"
        ],
        slotRoles: ["rule-slot-1", "rule-slot-2"],
        slotCount: 2,
        minimumDistinctValues: 2,
        minimumDistinctPoolValues: 3,
        minimumCopiesPerDistinctValue: 3,
        sourceUseMode: "move-once-no-clone" as const,
        allowsAnyOrderedSelection: true as const,
        initialState: "empty" as const
      },
      application: {
        ruleStatePath: "studentRuleState",
        continuationTargetRoles: [
          "continuation-slot-1",
          "continuation-slot-2",
          "continuation-slot-3",
          "continuation-slot-4"
        ],
        period: 2,
        minimumTargetCount: 4,
        requiresVisibleComparison: true as const,
        requiresSimultaneousRuleAndContinuation: true as const,
        ruleStateIndexMode: "index-mod-period" as const,
        evidenceMode: "student-state-dependent" as const
      },
      distractors: [
        {
          predicateKind: "cognitive.rule-state-contract",
          misconception: "같은 조각만 고른다."
        },
        {
          predicateKind: "cognitive.rule-state-contract",
          misconception: "순서를 중간에 바꾼다."
        }
      ]
    },
    verification: {
      ...base.verification,
      roles: [
        "rule-slot-1",
        "rule-slot-2",
        "continuation-slot-1",
        "continuation-slot-2",
        "continuation-slot-3",
        "continuation-slot-4"
      ]
    },
    explanation: { regionRole: "teacher-rubric" }
  };
};

const repairReadyManifest = () => {
  const manifest = structuredClone(studentConstructedManifest());
  manifest.decision.variantRoles.push(
    "rule-variant-10",
    "rule-variant-11",
    "rule-variant-12"
  );
  manifest.decision.stateConstruction!.sourceRoles.push(
    "rule-variant-10",
    "rule-variant-11",
    "rule-variant-12"
  );
  manifest.decision.stateConstruction!.minimumCopiesPerDistinctValue = 4;
  manifest.decision.application!.ruleStatePath = "declaredRuleState";
  const stateLifecycle = {
    kind: "empty-selection-then-declared-repair" as const,
    statePath: "studentRuleState",
    selectionPhase: "rule-selection" as const,
    selectionOutputStatePath: "declaredRuleState",
    writesDeclaredState: true as const,
    phaseOrder: [
      "rule-selection",
      "remove-misaligned",
      "place-replacement"
    ] as [
      "rule-selection",
      "remove-misaligned",
      "place-replacement"
    ],
    initialState: "empty" as const,
    declaredStateCardinality: 2,
    declaredStateExamplesPath: "validRuleStateExamples",
    selectionConstraintIdPrefix: "construct-rule-slot",
    requiresIndexedSelectionWrites: true as const,
    repairRequiresDeclaredState: true as const
  };
  const repair = {
    kind: "declared-rule-independent-misplacement" as const,
    declaredRuleStatePath: "declaredRuleState",
    repairRuleStateIndex: 1,
    wrongItemProperty: "orderedValues",
    wrongItemRoles: ["misaligned-item"],
    repairTargetRoles: ["repair-target"],
    repairBankRoles: ["repair-bank"],
    beforeStatePath: "initialArrangementState",
    afterStatePath: "repairedArrangementState",
    validAfterStateExamplesPath:
      "validRepairedArrangementStatesByDeclaredRuleState",
    afterStateDerivation: {
      kind: "replace-at-declared-rule-index" as const,
      declaredRuleStatePath: "declaredRuleState",
      repairRuleStateIndex: 1,
      requiresConditionalMapping: true as const
    },
    removeConstraintId: "remove-misaligned-item",
    replacementConstraintId: "repair-misaligned-item",
    requiresIndependentWrongState: true as const,
    requiresBeforeAfterComparison: true as const,
    evidenceMode: "student-state-dependent" as const
  };
  return {
    ...manifest,
    decision: {
      ...manifest.decision,
      repair,
      stateLifecycle
    },
    verification: {
      ...manifest.verification,
      roles: [
        ...manifest.decision.ruleSlotRoles,
        ...(manifest.decision.application?.continuationTargetRoles ?? []),
        ...repair.wrongItemRoles,
        ...repair.repairTargetRoles,
        ...repair.repairBankRoles
      ]
    }
  };
};

describe("construct-rule cognitive decision contract", () => {
  it("accepts an ordered rule-state decision with bound distractors", () => {
    const manifest = constructRuleManifest();
    expect(defineCognitiveDemandManifest(manifest).decision).toEqual(
      manifest.decision
    );
    expect(cognitiveDemandManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it("requires at least one misconception-bound distractor", () => {
    const manifest = constructRuleManifest();
    expect(() =>
      defineCognitiveDemandManifest({
        ...manifest,
        decision: { ...manifest.decision, distractors: [] }
      })
    ).toThrow();
  });

  it("does not accept the old select-one-only fields as a rule decision", () => {
    const manifest = constructRuleManifest();
    expect(() =>
      defineCognitiveDemandManifest({
        ...manifest,
        decision: {
          mode: "construct-rule",
          decisionConstraintId: "construct-rule-slot",
          ruleSlotRoles: ["rule-slot-1", "rule-slot-2"],
          correctValuePath: "correctValueText"
        }
      } as never)
    ).toThrow();
  });

  it("accepts the student-constructed conditional-rubric extension", () => {
    const manifest = studentConstructedManifest();
    expect(
      defineCognitiveDemandManifest(manifest).decision
    ).toMatchObject({
      constructionMode: "student-constructed",
      answerMode: "conditional-rubric",
      ruleStatePath: "studentRuleState",
      stateConstruction: {
        kind: "ordered-distinct-subset-from-pool",
        initialState: "empty"
      },
      application: {
        ruleStatePath: "studentRuleState",
        minimumTargetCount: 4
      }
    });
  });

  it("rejects a partial student-constructed extension instead of falling back to legacy", () => {
    const manifest = studentConstructedManifest();
    const partial = structuredClone(manifest);
    delete (partial.decision as { answerMode?: unknown }).answerMode;
    expect(() => defineCognitiveDemandManifest(partial)).toThrow();
  });

  it("requires two distinct misconception records for the student extension", () => {
    const manifest = studentConstructedManifest();
    manifest.decision.distractors[1] = {
      predicateKind: "cognitive.other",
      misconception: manifest.decision.distractors[0]!.misconception
    };
    expect(() => defineCognitiveDemandManifest(manifest)).toThrow();
  });

  it("rejects a repair contract with overlapping roles or state paths", () => {
    const manifest = repairReadyManifest();
    manifest.decision.repair.wrongItemRoles = ["repair-target"];
    expect(() =>
      defineCognitiveDemandManifest(manifest)
    ).toThrow();
  });

  it("accepts a well-shaped repair contract when verification roles are exact", () => {
    const manifest = repairReadyManifest();
    expect(
      defineCognitiveDemandManifest(manifest).decision
    ).toMatchObject({
      repair: manifest.decision.repair,
      stateLifecycle: manifest.decision.stateLifecycle,
      application: { ruleStatePath: "declaredRuleState" }
    });
  });

  it("requires repair and lifecycle together and binds every declared-state path", () => {
    const withoutLifecycle = repairReadyManifest();
    delete (withoutLifecycle.decision as { stateLifecycle?: unknown })
      .stateLifecycle;
    expect(() => defineCognitiveDemandManifest(withoutLifecycle)).toThrow();

    const withoutRepair = repairReadyManifest();
    delete (withoutRepair.decision as { repair?: unknown }).repair;
    expect(() => defineCognitiveDemandManifest(withoutRepair)).toThrow();

    const wrongApplicationPath = repairReadyManifest();
    wrongApplicationPath.decision.application!.ruleStatePath =
      "studentRuleState";
    expect(() =>
      defineCognitiveDemandManifest(wrongApplicationPath)
    ).toThrow();

    const wrongDerivation = repairReadyManifest();
    wrongDerivation.decision.repair.afterStateDerivation.repairRuleStateIndex =
      0;
    expect(() => defineCognitiveDemandManifest(wrongDerivation)).toThrow();
  });

  it("rejects repair roles that overlap any decision or application role", () => {
    for (const overlappingRole of [
      "rule-variant-1",
      "rule-slot-1",
      "continuation-slot-1"
    ]) {
      const manifest = repairReadyManifest();
      manifest.decision.repair.repairTargetRoles = [overlappingRole];
      expect(() => defineCognitiveDemandManifest(manifest)).toThrow();
    }
  });

  it("requires exactly one wrong item, repair target, and repair bank", () => {
    const manifest = repairReadyManifest();
    manifest.decision.repair.wrongItemRoles.push("misaligned-item-2");
    expect(() => defineCognitiveDemandManifest(manifest)).toThrow();
  });
});
