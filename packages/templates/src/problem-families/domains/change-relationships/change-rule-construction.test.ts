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
  CHANGE_RULE_CONTEXT_IDS,
  CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
  CHANGE_RULE_CONSTRUCTION_MANIPULATION,
  changeRuleConstructionBlueprint,
  changeRuleConstructionProblemFamilyModule,
  generateChangeRuleConstructionItems,
  type ChangeRuleContextId
} from "./change-rule-construction.js";

const generatedAt = "2026-08-12T00:00:00.000Z";

function recommend(input: {
  readonly contextId: ChangeRuleContextId;
  readonly prompt?: string;
}) {
  return recommendActivity({
    schemaVersion: "1.0.0",
    requestId: "change-rule-construction-envelope-test",
    prompt:
      input.prompt ??
      "2학년 학생이 시작값·변화량·방향을 직접 정하고 수 배열을 만드는 문제를 만들어 주세요.",
    requestedFamilyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
    requestedStandardCode: "[2수02-02]",
    requestedGrade: 2,
    problemCount: 2,
    difficulty: "normal",
    problemParameters: {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
      values: { contextId: input.contextId }
    },
    createdAt: generatedAt
  });
}

function resolveEnvelope(contextId: ChangeRuleContextId) {
  const recommendation = recommend({ contextId });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    {
      ...recommendation,
      supported: true,
      blockingReasons: []
    },
    {
      seed: "change-rule-construction-envelope-seed",
      generatedAt,
      activityId: "change-rule-construction-envelope-activity"
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

describe("[2수02-02] change rule construction native family", () => {
  it("학생이 시작값·변화량·방향을 직접 구성하고 네 항과 오류 교정을 연결한다", () => {
    const result = resolveEnvelope("change-counts");
    expect(result.recommendation).toMatchObject({
      supported: false,
      templateId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
      standardCode: "[2수02-02]",
      manipulation: CHANGE_RULE_CONSTRUCTION_MANIPULATION,
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

    const manifest = assertCognitiveManifestBound(changeRuleConstructionBlueprint);
    expect(manifest).toMatchObject({
      mathematicalDecision: expect.stringContaining("직접 선언"),
      decision: {
        mode: "construct-change-rule",
        constructionMode: "student-constructed",
        answerMode: "conditional-rubric",
        ruleStatePath: "studentChangeRuleState",
        validStateCatalog: expect.arrayContaining([
          expect.objectContaining({ ruleStateKey: "inc-1-by-1" }),
          expect.objectContaining({ ruleStateKey: "dec-6-by-2" })
        ])
      },
      verification: {
        invariant: expect.stringContaining("signed step")
      }
    });
    expect(changeRuleConstructionProblemFamilyModule.source.assessmentTargetIds).toEqual([
      "change.pattern.change-rule.construct-v1"
    ]);
    expect(changeRuleConstructionProblemFamilyModule.source.solReviewScope).toEqual({
      familyTrackId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
      scopeId: "W002-FAMILY_TRACK-change-rule"
    });

    const firstItem = result.resolved.items[0]!;
    expect(firstItem.values.studentChangeRuleState).toEqual([]);
    expect(firstItem.values.constructedSequenceState).toEqual([]);
    expect(firstItem.values.initialChangeSequenceState).toEqual([]);
    expect(firstItem.values.repairedChangeSequenceState).toEqual([]);
    expect(firstItem.values.validChangeRuleStates).toHaveLength(4);
    expect(firstItem.values.validRepairedChangeStatesByRuleState).toHaveLength(4);
    expect(firstItem.values.questionText).not.toContain("1, 2, 3");

    const sources = result.resolved.emissions.filter(
      (emission) =>
        emission.itemId === firstItem.id && emission.toolIntent.toolKey === "NO04NT"
    );
    expect(sources).toHaveLength(32);
    expect(sources.every((source) => source.movable && !source.locked)).toBe(true);
    expect(
      new Set(sources.map((source) => source.toolIntent.properties.value)).size
    ).toBe(10);

    const targets = result.resolved.emissions.filter(
      (emission) =>
        emission.itemId === firstItem.id &&
        [
          "rule-control-start",
          "rule-control-step",
          "rule-control-direction",
          "sequence-term-1",
          "sequence-term-2",
          "sequence-term-3",
          "sequence-term-4",
          "repair-target"
        ].includes(emission.role)
    );
    expect(targets).toHaveLength(8);
    expect(targets.every((target) => target.locked && !target.movable)).toBe(true);
    expect(
      targets.every((target) => target.toolIntent.properties.value === undefined)
    ).toBe(true);

    const constraints = result.resolved.constraints.filter((constraint) =>
      constraint.id.endsWith(`:${firstItem.id}`)
    );
    expect(constraints).toHaveLength(8);
    expect(constraints.every((constraint) => constraint.kind === "fill-from-pool")).toBe(
      true
    );
    expect(
      constraints.every(
        (constraint) =>
          constraint.sourceIds.length === 4 &&
          constraint.parameters.requiresStudentAction !== false &&
          constraint.satisfiedInitially !== true
      )
    ).toBe(true);
    expect(
      constraints.some(
        (constraint) => constraint.parameters.phase === "repair-declared-change"
      )
    ).toBe(true);

    const answers = buildRegisteredTeacherAnswerKey(result.resolved);
    const previews = buildRegisteredProblemPreviews(result.resolved);
    const applied = buildRegisteredAppliedProblemParameters(result.resolved);
    expect(answers).toHaveLength(2);
    expect(answers[0]?.answer).toContain("조건부");
    expect(answers[0]?.answer).not.toContain("1, 2, 3, 4");
    expect(previews?.[0]?.statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining("32개"),
        expect.stringContaining("compile-time envelope"),
        expect.stringContaining("조건부")
      ])
    );
    expect(applied).toEqual({
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
      values: { contextId: "change-counts" }
    });
  });

  it("두 context가 실제 payload를 바꾸고 같은 seed는 결정적이다", () => {
    const outputs = CHANGE_RULE_CONTEXT_IDS.map((contextId) =>
      resolveEnvelope(contextId)
    );
    expect(outputs.every((output) => output.report.issues.length === 0)).toBe(true);
    expect(outputs[0]?.compiled.payloadHash).not.toBe(
      outputs[1]?.compiled.payloadHash
    );
    expect(outputs[0]?.resolved.items).toEqual(
      resolveEnvelope("change-counts").resolved.items
    );
  });

  it("범위 밖 repeat·자동채점·고정 정답 주장은 거부한다", () => {
    expect(() =>
      recommend({
        contextId: "change-counts",
        prompt: "repeat-3 규칙으로 만들어 주세요."
      })
    ).toThrow("수의 시작값");
    expect(() =>
      recommend({
        contextId: "change-counts",
        prompt: "자동 채점과 응답 저장이 되는 고정 정답 문제를 만들어 주세요."
      })
    ).toThrow("자동");
    expect(() =>
      validateProblemParameters({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: CHANGE_RULE_CONSTRUCTION_FAMILY_ID,
        values: { contextId: "change-counts", extra: true }
      })
    ).toThrow("change-rule-construction-parameters-unsupported");
    expect(() =>
      generateChangeRuleConstructionItems(
        { difficulty: "easy", problemCount: 2, contextId: "change-counts" },
        "unsupported-difficulty"
      )
    ).toThrow(RangeError);
  });
});
