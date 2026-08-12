import { describe, expect, it } from "vitest";
import {
  MATHCANVAS_PROJECT_CATEGORIES,
  PROBLEM_FAMILY_SCHEMA_VERSION
} from "@mathcanvas/contracts";
import { compileActivity, resolveActivity } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import { validateForCreation } from "@mathcanvas/validator";
import {
  buildRegisteredAppliedProblemParameters,
  buildRegisteredProblemPreviews,
  buildRegisteredTeacherAnswerKey,
  prepareRegisteredActivityForEnvelopeValidation
} from "../../../registry.js";
import { assertCognitiveManifestBound } from "../../../cognitive/registry.js";
import { validateProblemParameters } from "../../registry.js";
import {
  REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS,
  REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
  REPEAT_RULE_CONSTRUCTION_MANIPULATION,
  repeatRuleConstructionBlueprint,
  repeatRuleConstructionProblemFamilyModule,
  generateRepeatRuleConstructionItems,
  type RepeatRuleConstructionContextId
} from "./repeat-rule-construction.js";

const generatedAt = "2026-08-12T00:00:00.000Z";

function recommend(input: {
  readonly contextId: RepeatRuleConstructionContextId;
  readonly problemCount?: number;
  readonly prompt?: string;
}) {
  return recommendActivity({
    schemaVersion: "1.0.0",
    requestId: "repeat-rule-construction-envelope-test",
    prompt:
      input.prompt ??
      "2학년 학생이 패턴 블록 두 조각과 순서를 직접 정해 반복 규칙으로 선언하는 문제를 만들어 주세요.",
    requestedFamilyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
    requestedStandardCode: "[2수02-02]",
    requestedGrade: 2,
    problemCount: input.problemCount ?? 2,
    difficulty: "normal",
    problemParameters: {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
      values: { contextId: input.contextId }
    },
    createdAt: generatedAt
  });
}

function resolveEnvelope(contextId: RepeatRuleConstructionContextId) {
  const recommendation = recommend({ contextId });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    {
      ...recommendation,
      supported: true,
      blockingReasons: []
    },
    {
      seed: "repeat-rule-construction-envelope-seed",
      generatedAt,
      activityId: "repeat-rule-construction-envelope-activity"
    }
  );
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  const report = validateForCreation(
    resolved,
    compiled,
    new Date(generatedAt)
  );
  return { recommendation, resolved, compiled, report };
}

describe("[2수02-02] repeat rule construction native family", () => {
  it("학생이 보기 카드를 고르는 대신 두 패턴 블록과 순서를 직접 구성한다", () => {
    const result = resolveEnvelope("repeat-colors");
    expect(result.recommendation).toMatchObject({
      supported: false,
      templateId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
      standardCode: "[2수02-02]",
      manipulation: REPEAT_RULE_CONSTRUCTION_MANIPULATION,
      blockingReasons: [
        "이 활동은 새 화면을 확인하는 중이라 실제 생성에는 아직 공개되지 않았습니다."
      ]
    });
    expect(result.report.issues).toEqual([]);
    expect(result.report.canCreate).toBe(true);
    expect(result.resolved.items).toHaveLength(2);
    expect(result.compiled.payload.categoryId).toBe(
      MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId
    );

    const manifest = assertCognitiveManifestBound(repeatRuleConstructionBlueprint);
    expect(manifest.decision).toMatchObject({
      mode: "construct-rule",
      constructionMode: "student-constructed",
      answerMode: "conditional-rubric",
      ruleStatePath: "studentRuleState",
      variantProperty: "orderedValues",
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
      ruleSlotRoles: ["rule-slot-1", "rule-slot-2"]
    });
    if (manifest.decision.mode !== "construct-rule") {
      throw new Error("repeat-rule-construction-manifest-mode-drift");
    }
    expect(manifest.decision.stateConstruction).toMatchObject({
      sourceUseMode: "move-once-no-clone",
      minimumDistinctPoolValues: 3,
      minimumCopiesPerDistinctValue: 3,
      initialState: "empty"
    });
    expect(manifest.mathematicalDecision).toContain("직접 구성");
    expect(
      repeatRuleConstructionProblemFamilyModule.source.assessmentTargetIds
    ).toEqual(["change.pattern.repeat-rule.construct-v1"]);
    expect(
      repeatRuleConstructionProblemFamilyModule.source.solReviewScope
    ).toEqual({
      familyTrackId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    });

    const firstItem = result.resolved.items[0]!;
    expect(firstItem.values.studentRuleState).toEqual([]);
    expect(firstItem.values.intendedRuleState).toEqual([4, 5]);
    expect(firstItem.values.validRuleStates).toEqual([
      [4, 5],
      [5, 4]
    ]);
    expect(firstItem.values.surplusRuleStates).toEqual([
      [4, 4],
      [5, 5]
    ]);
    expect(firstItem.values.questionText).not.toContain("초록");

    const ruleSlots = ["rule-slot-1", "rule-slot-2"].map((role) =>
      result.resolved.emissions.find(
        (emission) => emission.role === role && emission.itemId === firstItem.id
      )
    );
    expect(ruleSlots).toHaveLength(2);
    expect(ruleSlots.every((slot) => slot?.locked && !slot.movable)).toBe(true);
    expect(
      ruleSlots.every((slot, index) =>
        result.resolved.constraints.some(
          (constraint) =>
            constraint.id ===
              `construct-rule-slot-${index + 1}:${firstItem.id}` &&
            constraint.kind === "fill-from-pool" &&
            constraint.targetId === slot?.id &&
            constraint.sourceIds.length === 9 &&
            !constraint.satisfiedInitially
        )
      )
    ).toBe(true);

    const continuationSlots = [1, 2, 3, 4].map((index) =>
      result.resolved.emissions.find(
        (emission) =>
          emission.role === `continuation-slot-${index}` &&
          emission.itemId === firstItem.id
      )
    );
    expect(continuationSlots).toHaveLength(4);
    expect(
      continuationSlots.every((slot) => slot?.locked && !slot.movable)
    ).toBe(true);
    expect(
      continuationSlots.every((slot, index) =>
        result.resolved.constraints.some(
          (constraint) =>
            constraint.id === `apply-rule-slot-${index + 1}:${firstItem.id}` &&
            constraint.targetId === slot?.id &&
            constraint.sourceIds.length === 9 &&
            constraint.parameters.ruleStatePath === "studentRuleState" &&
            constraint.parameters.ruleStateIndex === index % 2 &&
            !constraint.satisfiedInitially
        )
      )
    ).toBe(true);

    const variants = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) =>
      result.resolved.emissions.find(
        (emission) =>
          emission.role === `rule-variant-${index}` &&
          emission.itemId === firstItem.id
      )
    );
    expect(variants.every((variant) => variant?.movable && !variant.locked)).toBe(
      true
    );
    expect(
      variants.every(
        (variant) => typeof variant?.toolIntent.properties.orderedValues === "number"
      )
    ).toBe(true);
    expect(
      variants.map((_, index) =>
        repeatRuleConstructionBlueprint.toolRoles.find(
          (role) => role.role === `rule-variant-${index + 1}`
        )?.layoutRole
      )
    ).toEqual([
      "rule-source-1",
      "rule-source-2",
      "rule-source-3",
      "rule-source-4",
      "rule-source-5",
      "rule-source-6",
      "rule-source-7",
      "rule-source-8",
      "rule-source-9"
    ]);
    const sourceValues = variants.map(
      (variant) => variant?.toolIntent.properties.orderedValues
    );
    expect(
      [...new Set(sourceValues)].map(
        (value) => sourceValues.filter((candidate) => candidate === value).length
      )
    ).toEqual([3, 3, 3]);
    expect(
      result.resolved.emissions.some(
        (emission) => emission.role.startsWith("position-card-")
      )
    ).toBe(false);

    const answers = buildRegisteredTeacherAnswerKey(result.resolved);
    const previews = buildRegisteredProblemPreviews(result.resolved);
    const applied = buildRegisteredAppliedProblemParameters(result.resolved);
    expect(answers).toHaveLength(2);
    expect(answers[0]?.answer).toContain("초록 삼각형");
    expect(previews?.[0]?.statements).toEqual([
      expect.stringContaining("빈 규칙 칸"),
      "초기 상태: 두 규칙 칸은 비어 있고 학생이 패턴 블록을 직접 고릅니다.",
      expect.stringContaining("패턴 블록 바구니:"),
      expect.stringContaining("교사용 허용 규칙 상태:"),
      expect.stringContaining("교사용 거부 상태:"),
      "규칙 칸: rule-slot-1, rule-slot-2",
      expect.stringContaining("다음 네 칸에 계속"),
      expect.stringContaining("실제 응답·저장·재열기")
    ]);
    expect(applied).toEqual({
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
      values: { contextId: "repeat-colors" }
    });
  });

  it("두 context가 실제 rule envelope와 payload hash를 바꾼다", () => {
    const outputs = REPEAT_RULE_CONSTRUCTION_CONTEXT_IDS.map((contextId) =>
      resolveEnvelope(contextId)
    );
    expect(outputs.every((output) => output.report.issues.length === 0)).toBe(
      true
    );
    expect(outputs[0]?.resolved.items[0]?.values.intendedRuleState).toEqual([4, 5]);
    expect(outputs[1]?.resolved.items[0]?.values.intendedRuleState).toEqual([2, 3]);
    expect(outputs[0]?.compiled.payloadHash).not.toBe(
      outputs[1]?.compiled.payloadHash
    );
    expect(
      outputs.map((output) => output.resolved.items[0]?.values.surplusRuleStates)
    ).toEqual([
      [
        [4, 4],
        [5, 5]
      ],
      [
        [2, 2],
        [3, 3]
      ]
    ]);
  });

  it("같은 seed는 결정적이며 지원하지 않는 범위는 침묵 없이 거부한다", () => {
    const sameA = resolveEnvelope("repeat-colors");
    const sameB = resolveEnvelope("repeat-colors");
    expect(sameA.resolved.items).toEqual(sameB.resolved.items);
    expect(sameA.compiled.payloadHash).toBe(sameB.compiled.payloadHash);
    expect(() =>
      recommend({
        contextId: "repeat-colors",
        prompt: "세 조각 repeat-3 패턴으로 만들어 주세요."
      })
    ).toThrow("repeat-3");
    expect(() =>
      validateProblemParameters({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: REPEAT_RULE_CONSTRUCTION_FAMILY_ID,
        values: { contextId: "repeat-colors", extra: true }
      })
    ).toThrow("repeat-rule-construction-parameters-unsupported");
    expect(() =>
      generateRepeatRuleConstructionItems(
        { difficulty: "easy", problemCount: 2, contextId: "repeat-colors" },
        "unsupported-difficulty"
      )
    ).toThrow(RangeError);
  });
});
