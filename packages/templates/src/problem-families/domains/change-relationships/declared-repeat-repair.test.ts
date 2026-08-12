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
  DECLARED_REPEAT_REPAIR_CONTEXT_IDS,
  DECLARED_REPEAT_REPAIR_FAMILY_ID,
  DECLARED_REPEAT_REPAIR_MANIPULATION,
  declaredRepeatRepairBlueprint,
  declaredRepeatRepairProblemFamilyModule,
  generateDeclaredRepeatRepairItems,
  type DeclaredRepeatRepairContextId
} from "./declared-repeat-repair.js";

const generatedAt = "2026-08-12T00:00:00.000Z";

function recommend(input: {
  readonly contextId: DeclaredRepeatRepairContextId;
  readonly problemCount?: number;
  readonly prompt?: string;
}) {
  return recommendActivity({
    schemaVersion: "1.0.0",
    requestId: "declared-repeat-repair-envelope-test",
    prompt:
      input.prompt ??
      "2학년 학생이 두 패턴 블록의 순서를 직접 정하고, 어긋난 블록을 고친 뒤 같은 규칙으로 배열을 완성하는 문제를 만들어 주세요.",
    requestedFamilyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
    requestedStandardCode: "[2수02-02]",
    requestedGrade: 2,
    problemCount: input.problemCount ?? 2,
    difficulty: "normal",
    problemParameters: {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
      values: { contextId: input.contextId }
    },
    createdAt: generatedAt
  });
}

function resolveEnvelope(contextId: DeclaredRepeatRepairContextId) {
  const recommendation = recommend({ contextId });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    {
      ...recommendation,
      supported: true,
      blockingReasons: []
    },
    {
      seed: "declared-repeat-repair-envelope-seed",
      generatedAt,
      activityId: "declared-repeat-repair-envelope-activity"
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

const expectedValidStates = (values: readonly number[]) =>
  values.flatMap((left) =>
    values
      .filter((right) => right !== left)
      .map((right) => [left, right])
  );

describe("[2수02-02] declared repeat repair native family", () => {
  it("학생의 선언 상태가 어긋난 항 교체와 다음 네 칸에 조건부로 결속된다", () => {
    const result = resolveEnvelope("repeat-colors");
    expect(result.recommendation).toMatchObject({
      supported: false,
      templateId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
      standardCode: "[2수02-02]",
      manipulation: DECLARED_REPEAT_REPAIR_MANIPULATION,
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

    const manifest = assertCognitiveManifestBound(
      declaredRepeatRepairBlueprint
    );
    expect(manifest.decision).toMatchObject({
      mode: "construct-rule",
      constructionMode: "student-constructed",
      answerMode: "conditional-rubric",
      ruleStatePath: "studentRuleState",
      decisionConstraintId: "construct-rule-slot",
      variantProperty: "orderedValues",
      validRuleStatesPath: "validRuleStateExamples",
      surplusPath: "surplusRuleStateExamples",
      minimumValidStates: 6,
      minimumSurplus: 3,
      stateConstruction: {
        sourceUseMode: "move-once-no-clone",
        minimumDistinctPoolValues: 3,
        minimumCopiesPerDistinctValue: 4,
        initialState: "empty"
      },
      application: {
        ruleStatePath: "declaredRuleState",
        period: 2,
        minimumTargetCount: 4,
        evidenceMode: "student-state-dependent"
      },
      repair: {
        declaredRuleStatePath: "declaredRuleState",
        repairRuleStateIndex: 1,
        beforeStatePath: "initialArrangementState",
        afterStatePath: "repairedArrangementState",
        validAfterStateExamplesPath:
          "validRepairedArrangementStatesByDeclaredRuleState",
        removeConstraintId: "remove-misaligned-item",
        replacementConstraintId: "repair-misaligned-item",
        evidenceMode: "student-state-dependent"
      },
      stateLifecycle: {
        statePath: "studentRuleState",
        selectionOutputStatePath: "declaredRuleState",
        phaseOrder: [
          "rule-selection",
          "remove-misaligned",
          "place-replacement"
        ],
        requiresIndexedSelectionWrites: true
      }
    });
    expect(manifest.learningMap.topicIds).toEqual([
      "kr.mt.math.change-relationships.g1-2.s2-02-02.application"
    ]);
    expect(manifest.learningMap.prerequisiteTopicIds).toEqual([
      "kr.mt.math.change-relationships.g1-2.s2-02-02.concept",
      "kr.mt.math.change-relationships.g1-2.s2-02-02.representation"
    ]);
    expect(
      declaredRepeatRepairProblemFamilyModule.source.assessmentTargetIds
    ).toEqual(["change.pattern.declared-repeat.repair-v1"]);
    expect(
      declaredRepeatRepairProblemFamilyModule.source.solReviewScope
    ).toEqual({
      familyTrackId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
      scopeId: "W002-FAMILY_TRACK-repeat-repair"
    });
    expect(
      declaredRepeatRepairProblemFamilyModule.source.supportState
    ).toBe("verified");

    const item = result.resolved.items[0]!;
    expect(item.values).toMatchObject({
      studentRuleState: [],
      declaredRuleState: [],
      initialArrangementState: [],
      repairedArrangementState: [],
      misalignedVariant: 2,
      validRuleStateExamples: [
        [4, 5],
        [4, 6],
        [5, 4],
        [5, 6],
        [6, 4],
        [6, 5]
      ],
      surplusRuleStateExamples: [
        [4, 4],
        [5, 5],
        [6, 6]
      ]
    });

    const itemConstraints = result.resolved.constraints.filter((constraint) =>
      constraint.id.endsWith(":" + item.id)
    );
    expect(itemConstraints).toHaveLength(8);

    const sourceEmissions = Array.from({ length: 12 }, (_, index) =>
      result.resolved.emissions.find(
        (emission) =>
          emission.itemId === item.id &&
          emission.role === "rule-variant-" + (index + 1)
      )
    );
    expect(
      sourceEmissions.every(
        (emission) => emission?.movable && !emission.locked
      )
    ).toBe(true);
    const sourceValues = sourceEmissions.map(
      (emission) => emission?.toolIntent.properties.orderedValues
    );
    expect([...new Set(sourceValues)].sort()).toEqual([4, 5, 6]);
    expect(
      [4, 5, 6].map(
        (value) =>
          sourceValues.filter((candidate) => candidate === value).length
      )
    ).toEqual([4, 4, 4]);
    expect(sourceValues).not.toContain(item.values.misalignedVariant);

    const variantIds = sourceEmissions.map((emission) => emission?.id);
    for (const index of [0, 1]) {
      expect(
        itemConstraints.find(
          (constraint) =>
            constraint.id ===
            "construct-rule-slot-" + (index + 1) + ":" + item.id
        )
      ).toMatchObject({
        kind: "fill-from-pool",
        sourceIds: variantIds,
        parameters: {
          phase: "rule-selection",
          initialRuleStatePath: "studentRuleState",
          writesRuleStatePath: "declaredRuleState",
          ruleStateIndex: index,
          sourceValueProperty: "orderedValues"
        },
        requiresStudentAction: true,
        satisfiedInitially: false
      });
    }
    for (const index of [0, 1, 2, 3]) {
      expect(
        itemConstraints.find(
          (constraint) =>
            constraint.id ===
            "apply-rule-slot-" + (index + 1) + ":" + item.id
        )
      ).toMatchObject({
        kind: "fill-from-pool",
        sourceIds: variantIds,
        parameters: {
          phase: "apply-declared-rule",
          ruleStatePath: "declaredRuleState",
          ruleStateIndex: index % 2,
          sourceValueProperty: "orderedValues"
        },
        requiresStudentAction: true,
        satisfiedInitially: false
      });
    }
    expect(
      itemConstraints.find(
        (constraint) =>
          constraint.id === "remove-misaligned-item:" + item.id
      )
    ).toMatchObject({
      kind: "place-in",
      parameters: {
        phase: "remove-misaligned",
        declaredRuleStatePath: "declaredRuleState",
        repairRuleStateIndex: 1,
        wrongItemProperty: "orderedValues",
        beforeStatePath: "initialArrangementState",
        afterStatePath: "repairedArrangementState"
      },
      requiresStudentAction: true,
      satisfiedInitially: false
    });
    expect(
      itemConstraints.find(
        (constraint) =>
          constraint.id === "repair-misaligned-item:" + item.id
      )
    ).toMatchObject({
      kind: "fill-from-pool",
      sourceIds: variantIds,
      parameters: {
        phase: "place-replacement",
        declaredRuleStatePath: "declaredRuleState",
        repairRuleStateIndex: 1,
        writesStatePath: "repairedArrangementState",
        conditionalMappingPath:
          "validRepairedArrangementStatesByDeclaredRuleState"
      },
      requiresStudentAction: true,
      satisfiedInitially: false
    });

    const mappings = item.values
      .validRepairedArrangementStatesByDeclaredRuleState as Array<{
      declaredRuleState: number[];
      beforeState: number[];
      afterState: number[];
    }>;
    expect(mappings).toHaveLength(6);
    expect(
      new Set(
        mappings.map((mapping) =>
          JSON.stringify(mapping.declaredRuleState)
        )
      ).size
    ).toBe(6);
    for (const mapping of mappings) {
      expect(mapping.beforeState).toEqual([
        mapping.declaredRuleState[0],
        item.values.misalignedVariant
      ]);
      expect(mapping.afterState).toEqual(mapping.declaredRuleState);
    }

    const semanticTargets = [
      "rule-slot-1",
      "rule-slot-2",
      "continuation-slot-1",
      "continuation-slot-2",
      "continuation-slot-3",
      "continuation-slot-4",
      "repair-target",
      "repair-bank"
    ].map((role) =>
      result.resolved.emissions.find(
        (emission) => emission.itemId === item.id && emission.role === role
      )
    );
    expect(
      semanticTargets.every(
        (emission) =>
          emission?.locked &&
          !emission.movable &&
          emission.toolIntent.properties.orderedValues === undefined &&
          emission.toolIntent.properties.variant === undefined
      )
    ).toBe(true);

    const answers = buildRegisteredTeacherAnswerKey(result.resolved);
    const previews = buildRegisteredProblemPreviews(result.resolved);
    const applied = buildRegisteredAppliedProblemParameters(result.resolved);
    expect(answers).toHaveLength(2);
    expect(answers[0]?.answer).toContain("학생이 선언한");
    expect(answers[0]?.answer).not.toMatch(
      /초록|주황|보라|노란|파란|빨간/
    );
    expect(previews?.[0]?.statements).toEqual([
      expect.stringContaining("내 규칙"),
      "초기 상태: 학생 규칙, 선언 규칙, 수정 전 배열, 수정 후 배열은 모두 비어 있습니다.",
      expect.stringContaining("세 종류×네 개"),
      "독립된 어긋난 블록: 파란 마름모",
      expect.stringContaining("교사용 허용 선언 6가지:"),
      expect.stringContaining("교사용 거부 선언 3가지:"),
      expect.stringContaining("교사용 조건부 수정표:"),
      "학생 조작 8개: 규칙 선언 2개, 어긋난 블록 빼기 1개, 알맞은 블록 놓기 1개, 다음 배열 채우기 4개.",
      expect.stringContaining("학생이 실제로 선언한"),
      expect.stringContaining("실제 응답·저장·재열기와 자동 채점")
    ]);
    expect(applied).toEqual({
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
      values: { contextId: "repeat-colors" }
    });
  });

  it("두 context×두 문항이 12-source·6 valid·3 surplus envelope를 결정적으로 만든다", () => {
    const outputs = DECLARED_REPEAT_REPAIR_CONTEXT_IDS.map((contextId) =>
      resolveEnvelope(contextId)
    );
    expect(outputs.every((output) => output.report.issues.length === 0)).toBe(
      true
    );
    for (const output of outputs) {
      expect(output.resolved.items).toHaveLength(2);
      for (const item of output.resolved.items) {
        const sourceValues = Array.from({ length: 12 }, (_, index) =>
          output.resolved.emissions.find(
            (emission) =>
              emission.itemId === item.id &&
              emission.role === "rule-variant-" + (index + 1)
          )?.toolIntent.properties.orderedValues
        );
        const distinct = ([...new Set(sourceValues)] as number[]).sort(
          (left, right) => left - right
        );
        expect(distinct).toHaveLength(3);
        expect(
          distinct.map(
            (value) =>
              sourceValues.filter((candidate) => candidate === value).length
          )
        ).toEqual([4, 4, 4]);
        expect(item.values.validRuleStateExamples).toEqual(
          expectedValidStates(distinct)
        );
        expect(item.values.surplusRuleStateExamples).toEqual(
          distinct.map((value) => [value, value])
        );
        expect(distinct).not.toContain(item.values.misalignedVariant);
        expect(item.values.studentRuleState).toEqual([]);
        expect(item.values.declaredRuleState).toEqual([]);
        expect(item.values.initialArrangementState).toEqual([]);
        expect(item.values.repairedArrangementState).toEqual([]);
      }
    }
    expect(outputs[0]?.compiled.payloadHash).not.toBe(
      outputs[1]?.compiled.payloadHash
    );
    const sameA = resolveEnvelope("repeat-colors");
    const sameB = resolveEnvelope("repeat-colors");
    expect(sameA.resolved.items).toEqual(sameB.resolved.items);
    expect(sameA.compiled.payloadHash).toBe(sameB.compiled.payloadHash);
  });

  it("정답 순서·repeat-3·수 변화·응답 저장 요구와 범위 밖 파라미터를 침묵 없이 거부한다", () => {
    expect(() =>
      recommend({
        contextId: "repeat-colors",
        prompt: "세 조각 repeat-3 패턴으로 만들어 주세요."
      })
    ).toThrow("repeat-3");
    expect(() =>
      recommend({
        contextId: "repeat-colors",
        prompt: "초록 다음 주황이 정답인 순서로 고정해 주세요."
      })
    ).toThrow("미리 정한 정답 순서");
    expect(() =>
      recommend({
        contextId: "repeat-colors",
        prompt: "시작값과 변화량을 정하는 수 배열로 만들어 주세요."
      })
    ).toThrow("change-rule");
    expect(() =>
      recommend({
        contextId: "repeat-colors",
        prompt: "학생 응답 저장과 자동 채점을 보장해 주세요."
      })
    ).toThrow("응답 저장");
    expect(() =>
      validateProblemParameters({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: DECLARED_REPEAT_REPAIR_FAMILY_ID,
        values: { contextId: "repeat-colors", extra: true }
      })
    ).toThrow("declared-repeat-repair-parameters-unsupported");
    expect(() =>
      generateDeclaredRepeatRepairItems(
        {
          difficulty: "easy",
          problemCount: 2,
          contextId: "repeat-colors"
        },
        "unsupported-difficulty"
      )
    ).toThrow(RangeError);
  });
});
