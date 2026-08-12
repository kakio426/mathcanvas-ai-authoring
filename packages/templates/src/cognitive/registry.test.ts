import { describe, expect, it } from "vitest";
import {
  defineCognitiveDemandManifest,
  type CognitiveDemandManifest
} from "@mathcanvas/contracts";
import { expectedCognitiveRuntimePredicate } from "./registry.js";

const manifest: CognitiveDemandManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: "pattern.rule-core-v1",
  blueprintVersion: "1.0.0",
  blueprintContentHash: "a".repeat(64),
  mathematicalDecision: "학생이 순서 있는 반복 규칙을 직접 구성하고 선언한다.",
  misconceptionConflict: "반복 단위의 순서를 중간에 바꾸거나 마지막 항만 복사한다.",
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
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
    mode: "construct-rule",
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
    kind: "data-representation",
    roles: ["rule-lane"],
    invariant: "모든 항이 같은 순서의 반복 단위를 따른다."
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath: "선언한 규칙과 맞지 않는 항을 고쳐 다시 설명한다.",
  limitations: {
    autoGrading: "none-by-design",
    phaseOrder: "teacher-guided"
  }
});

describe("cognitive runtime predicate binding", () => {
  it("uses the dedicated rule-state predicate without a correctValuePath", () => {
    expect(expectedCognitiveRuntimePredicate(manifest)).toEqual({
      kind: "cognitive.rule-state-contract",
      parameters: {
        mode: "construct-rule",
        ruleStatePath: "ruleState",
        decisionConstraintId: "construct-rule-slot",
        validRuleStatesPath: "validRuleStates",
        surplusPath: "surplusRuleStates",
        variantRoles: [
          "rule-variant-1",
          "rule-variant-2",
          "rule-variant-3"
        ],
        ruleSlotRoles: ["rule-slot-1", "rule-slot-2"],
        variantProperty: "orderedValues",
        continuationRuleStatePath: "ruleState",
        explanationRuleStatePath: "ruleState",
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: ["rule-lane"],
        minimumValidStates: 2,
        minimumSurplus: 1,
        distractors: manifest.decision.distractors
      }
    });
    expect(
      "correctValuePath" in expectedCognitiveRuntimePredicate(manifest).parameters
    ).toBe(false);
  });

  it("projects the student-constructed rule contract without a fixed answer path", () => {
    const studentManifest: CognitiveDemandManifest =
      defineCognitiveDemandManifest({
        ...manifest,
        decision: {
          ...manifest.decision,
          constructionMode: "student-constructed",
          answerMode: "conditional-rubric",
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
            kind: "ordered-distinct-subset-from-pool",
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
            sourceUseMode: "move-once-no-clone",
            allowsAnyOrderedSelection: true,
            initialState: "empty"
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
            requiresVisibleComparison: true,
            requiresSimultaneousRuleAndContinuation: true,
            ruleStateIndexMode: "index-mod-period",
            evidenceMode: "student-state-dependent"
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
        } as never,
        verification: {
          kind: "data-representation",
          roles: [
            "rule-slot-1",
            "rule-slot-2",
            "continuation-slot-1",
            "continuation-slot-2",
            "continuation-slot-3",
            "continuation-slot-4"
          ],
          invariant: "학생이 정한 규칙과 다음 배열이 일치한다."
        },
        explanation: { regionRole: "teacher-rubric" }
      });
    const projected = expectedCognitiveRuntimePredicate(
      studentManifest
    );
    expect(projected.parameters).toMatchObject({
      constructionMode: "student-constructed",
      answerMode: "conditional-rubric",
      ruleStatePath: "studentRuleState",
      continuationRuleStatePath: "studentRuleState",
      explanationRuleStatePath: "studentRuleState",
      studentInputRoles: [],
      stateConstruction: {
        kind: "ordered-distinct-subset-from-pool",
        initialState: "empty"
      },
      application: {
        ruleStatePath: "studentRuleState",
        period: 2
      }
    });
    expect(projected.parameters).not.toHaveProperty(
      "correctValuePath"
    );
  });

  it("projects the repair phase lifecycle and separate declared-state path", () => {
    const repairManifest = defineCognitiveDemandManifest({
      ...manifest,
      decision: {
        ...manifest.decision,
        constructionMode: "student-constructed",
        answerMode: "conditional-rubric",
        ruleStatePath: "studentRuleState",
        variantRoles: Array.from({ length: 12 }, (_, index) => `rule-variant-${index + 1}`),
        validRuleStatesPath: "validRuleStateExamples",
        surplusPath: "surplusRuleStateExamples",
        minimumSurplus: 2,
        stateConstruction: {
          kind: "ordered-distinct-subset-from-pool",
          sourceRoles: Array.from({ length: 12 }, (_, index) => `rule-variant-${index + 1}`),
          slotRoles: ["rule-slot-1", "rule-slot-2"],
          slotCount: 2,
          minimumDistinctValues: 2,
          minimumDistinctPoolValues: 3,
          minimumCopiesPerDistinctValue: 4,
          sourceUseMode: "move-once-no-clone",
          allowsAnyOrderedSelection: true,
          initialState: "empty"
        },
        application: {
          ruleStatePath: "studentRuleState",
          continuationTargetRoles: ["continuation-slot-1", "continuation-slot-2", "continuation-slot-3", "continuation-slot-4"],
          period: 2,
          minimumTargetCount: 4,
          requiresVisibleComparison: true,
          requiresSimultaneousRuleAndContinuation: true,
          ruleStateIndexMode: "index-mod-period",
          evidenceMode: "student-state-dependent"
        },
        stateLifecycle: {
          kind: "empty-selection-then-declared-repair",
          statePath: "studentRuleState",
          declaredStatePath: "declaredRuleState",
          phaseOrder: ["rule-selection", "remove-misaligned", "place-replacement"],
          initialState: "empty",
          declaredStateCardinality: 2,
          declaredStateExamplesPath: "validRuleStateExamples",
          selectionConstraintIdPrefix: "construct-rule-slot",
          requiresIndexedSelectionWrites: true,
          repairRequiresDeclaredState: true
        },
        repair: {
          kind: "declared-rule-independent-misplacement",
          declaredRuleStatePath: "declaredRuleState",
          repairRuleStateIndex: 1,
          wrongItemProperty: "orderedValues",
          wrongItemRoles: ["misaligned-item"],
          repairTargetRoles: ["repair-target"],
          repairBankRoles: ["repair-bank"],
          beforeStatePath: "initialArrangementState",
          afterStatePath: "repairedArrangementState",
          validAfterStateExamplesPath: "validRepairedArrangementStates",
          removeConstraintId: "remove-misaligned-item",
          replacementConstraintId: "repair-misaligned-item",
          requiresIndependentWrongState: true,
          requiresBeforeAfterComparison: true,
          evidenceMode: "student-state-dependent"
        },
        distractors: [
          { predicateKind: "cognitive.rule-state-contract", misconception: "어긋난 조각도 같은 규칙이라고 본다." },
          { predicateKind: "cognitive.rule-state-contract", misconception: "고친 뒤 다음 무늬의 순서를 확인하지 않는다." }
        ]
      } as never,
      verification: {
        kind: "data-representation",
        roles: ["rule-slot-1", "rule-slot-2", "continuation-slot-1", "continuation-slot-2", "continuation-slot-3", "continuation-slot-4", "misaligned-item", "repair-target", "repair-bank"],
        invariant: "선언한 규칙에 맞게 어긋난 항을 고친다."
      },
      explanation: { regionRole: "teacher-rubric" }
    });
    expect(expectedCognitiveRuntimePredicate(repairManifest).parameters).toMatchObject({
      stateLifecycle: { statePath: "studentRuleState", declaredStatePath: "declaredRuleState" },
      repair: { declaredRuleStatePath: "declaredRuleState" }
    });
  });
});
