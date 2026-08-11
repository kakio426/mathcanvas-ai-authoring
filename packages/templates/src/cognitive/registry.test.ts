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
});
