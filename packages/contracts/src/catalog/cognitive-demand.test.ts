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
    variantRoles: ["rule-variant-1", "rule-variant-2"],
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
          correctValuePath: "correctValueText"
        }
      } as never)
    ).toThrow();
  });
});
