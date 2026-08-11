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
  REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS,
  REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
  REPEATING_PATTERN_ARRANGEMENT_MANIPULATION,
  repeatingPatternArrangementBlueprint,
  repeatingPatternArrangementProblemFamilyModule,
  generateRepeatingPatternArrangementItems,
  type RepeatingPatternArrangementContextId
} from "./repeating-pattern-arrangement.js";

const generatedAt = "2026-08-11T00:00:00.000Z";

function recommend(input: {
  readonly contextId: RepeatingPatternArrangementContextId;
  readonly problemCount?: number;
}) {
  return recommendActivity({
    schemaVersion: "1.0.0",
    requestId: "repeating-pattern-arrangement-envelope-test",
    prompt:
      "2학년 학생이 자신이 정한 반복 또는 변화 규칙으로 배열을 만들고 어긋난 항을 고치는 문제를 만들어 주세요.",
    requestedFamilyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
    requestedStandardCode: "[2수02-02]",
    requestedGrade: 2,
    problemCount: input.problemCount ?? 2,
    difficulty: "normal",
    problemParameters: {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
      values: { contextId: input.contextId }
    },
    createdAt: generatedAt
  });
}

function resolveEnvelope(contextId: RepeatingPatternArrangementContextId) {
  const recommendation = recommend({ contextId });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    {
      ...recommendation,
      supported: true,
      blockingReasons: []
    },
    {
      seed: "repeating-pattern-arrangement-envelope-seed",
      generatedAt,
      activityId: "repeating-pattern-arrangement-envelope-activity"
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

describe("[2수02-02] 정한 규칙으로 배열 만들기 native family", () => {
  it("repeat envelope에서 규칙 후보·수정·다섯 칸 구성·정답 미리보기를 생성한다", () => {
    const result = resolveEnvelope("repeat-colors");
    expect(result.recommendation).toMatchObject({
      supported: false,
      templateId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
      standardCode: "[2수02-02]",
      manipulation: REPEATING_PATTERN_ARRANGEMENT_MANIPULATION,
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
      repeatingPatternArrangementBlueprint
    );
    expect(manifest).toMatchObject({
      mathematicalDecision: expect.stringContaining("직접 정해"),
      verification: {
        invariant: expect.stringContaining("일관되게 적용")
      }
    });
    expect(
      repeatingPatternArrangementProblemFamilyModule.source.assessmentTargetIds
    ).toHaveLength(2);
    expect(manifest.learningMap.topicIds).toEqual([
      "kr.mt.math.change-relationships.g1-2.s2-02-02.representation",
      "kr.mt.math.change-relationships.g1-2.s2-02-02.application"
    ]);

    const answers = buildRegisteredTeacherAnswerKey(result.resolved);
    const previews = buildRegisteredProblemPreviews(result.resolved);
    const applied = buildRegisteredAppliedProblemParameters(result.resolved);
    expect(answers).toHaveLength(2);
    expect(answers[0]).toMatchObject({
      answer: expect.stringContaining("노-파"),
      explanation: expect.stringContaining("노랑-파랑")
    });
    expect(previews?.[0]?.statements).toEqual([
      expect.stringContaining("어긋난 블록"),
      "처음 패턴 블록: 노란 육각형 → 노란 육각형 → 노란 육각형",
      "관찰 안내: 노랑 → □ → 노랑",
      "수정 자리: 두 번째 블록(처음에는 어긋난 조각)",
      "채울 자리: 앞의 빈 칸 3곳 → 다음 칸 2곳",
      expect.stringContaining("규칙 후보:"),
      expect.stringContaining("조각 바구니:"),
      "활동 단계: 어긋난 조각 고치기"
    ]);
    expect(applied).toEqual({
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
      values: { contextId: "repeat-colors" }
    });
    expect(result.resolved.items[0]?.values.ruleKind).toBe("repeat");
    expect(result.resolved.items[0]?.values.correctNext).toEqual([
      2,
      1
    ]);
    expect(result.resolved.items[0]?.values.phase).toBe("repair");
    expect(result.resolved.items[0]?.values.initialSequence).toEqual([1, 1, 1]);
    expect(result.resolved.items[1]?.values.correctSequence).toEqual([1, 2, 1]);
    expect(result.resolved.items[0]?.values.correctContinuation).toEqual([
      2,
      1,
      2,
      1,
      2
    ]);
    expect(
      result.resolved.constraints.some((constraint) =>
        constraint.id.startsWith("remove-misaligned-arrangement:")
      )
    ).toBe(true);
    expect(
      result.resolved.constraints.some((constraint) =>
        constraint.id.startsWith("repair-misaligned-arrangement:")
      )
    ).toBe(true);
    expect(
      [
        "sequence-block-4",
        "sequence-block-5",
        "sequence-block-6",
        "next-slot-1",
        "next-slot-2"
      ].every((role) =>
        result.resolved.constraints.some(
          (constraint) =>
            constraint.id === `complete-arrangement-${role}:${result.resolved.items[0]?.id}`
        )
      )
    ).toBe(true);
    const sequenceTwo = result.resolved.emissions.find(
      (emission) => emission.role === "sequence-block-2"
    );
    const misaligned = result.resolved.emissions.find(
      (emission) => emission.role === "misaligned-block"
    );
    expect(sequenceTwo).toMatchObject({ locked: true, movable: false });
    expect(misaligned).toMatchObject({ locked: false, movable: true });
    expect(
      result.resolved.constraints
        .filter((constraint) =>
          constraint.id.startsWith("complete-arrangement-") &&
          constraint.id.endsWith(`:${result.resolved.items[0]?.id}`)
        )
        .every((constraint) =>
          constraint.sourceIds.includes(misaligned?.id ?? "")
        )
    ).toBe(true);
    expect(
      result.resolved.emissions.some(
        (emission) => emission.toolIntent.toolKey === "SM02PB"
      )
    ).toBe(true);
    expect(repeatingPatternArrangementProblemFamilyModule.capability?.promptGuards).toEqual([]);
  });

  it("repeat/change 4개 context envelope를 모두 생성하고 수학 관계가 바뀐다", () => {
    const outputs = REPEATING_PATTERN_ARRANGEMENT_CONTEXT_IDS.map((contextId) =>
      resolveEnvelope(contextId)
    );
    expect(outputs.every((output) => output.report.issues.length === 0)).toBe(
      true
    );
    expect(outputs.map((output) => output.resolved.items[0]?.values.ruleKind)).toEqual([
      "repeat",
      "repeat",
      "change",
      "change"
    ]);
    expect(
      outputs.map((output) => String(output.resolved.items[0]?.values.correctAnswerText))
    ).toEqual([
      "노-파; 이어지는 다섯 칸: 파란 마름모, 노란 육각형, 파란 마름모, 노란 육각형, 파란 마름모",
      "노-파-빨; 이어지는 다섯 칸: 노란 육각형, 파란 마름모, 빨간 사다리꼴, 노란 육각형, 파란 마름모",
      "1칸↑; 이어지는 다섯 칸: 초록 삼각형, 주황 정사각형, 보라 마름모, 노란 육각형, 파란 마름모",
      "2칸↑; 이어지는 다섯 칸: 파란 마름모, 초록 삼각형, 보라 마름모, 파란 마름모, 초록 삼각형"
    ]);
    expect(
      outputs.map((output) => output.resolved.items[0]?.values.relationId)
    ).toEqual(["repeat-2", "repeat-3", "step-1", "step-2"]);
    expect(new Set(outputs.map((output) => output.compiled.payloadHash)).size).toBe(4);
  });

  it("같은 입력은 결정적이고 context 변경은 문항과 payload hash를 바꾼다", () => {
    const sameA = resolveEnvelope("change-odd-numbers");
    const sameB = resolveEnvelope("change-odd-numbers");
    const changed = resolveEnvelope("change-even-numbers");
    expect(sameA.resolved.items).toEqual(sameB.resolved.items);
    expect(sameA.compiled.payloadHash).toBe(sameB.compiled.payloadHash);
    expect(changed.resolved.items[0]?.values.correctContinuation).not.toEqual(
      sameA.resolved.items[0]?.values.correctContinuation
    );
    expect(changed.compiled.payloadHash).not.toBe(sameA.compiled.payloadHash);
  });

  it("지원하지 않는 문제 수·맥락·추가 조건을 침묵 없이 거부한다", () => {
    expect(recommend({ contextId: "repeat-colors", problemCount: 1 })).toMatchObject({
      supported: false,
      blockingReasons: expect.arrayContaining([expect.stringContaining("2문항")])
    });
    expect(() =>
      validateProblemParameters({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: REPEATING_PATTERN_ARRANGEMENT_FAMILY_ID,
        values: { contextId: "repeat-colors", extra: true }
      })
    ).toThrow("repeating-pattern-arrangement-parameters-unsupported");
    expect(() =>
      generateRepeatingPatternArrangementItems(
        { difficulty: "easy", problemCount: 2, contextId: "repeat-colors" },
        "unsupported-difficulty"
      )
    ).toThrow(RangeError);
  });
});
