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
  DATA_TABLE_CONTEXT_IDS,
  DATA_TABLE_ORGANIZE_FAMILY_ID,
  DATA_TABLE_ORGANIZE_MANIPULATION,
  dataTableOrganizeBlueprint,
  generateDataTableOrganizeItems,
  type DataTableContextId
} from "./data-table-organize.js";

const generatedAt = "2026-08-11T00:00:00.000Z";

function recommend(input: {
  readonly contextId: DataTableContextId;
  readonly problemCount?: number;
}) {
  return recommendActivity({
    schemaVersion: "1.0.0",
    requestId: "data-table-organize-envelope-test",
    prompt:
      "2학년 학생이 원자료를 표로 정리하고 표로 나타내면 편리한 점을 설명하는 문제를 만들어 주세요.",
    requestedFamilyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
    requestedStandardCode: "[2수04-02]",
    requestedGrade: 2,
    problemCount: input.problemCount ?? 2,
    difficulty: "normal",
    problemParameters: {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
      values: { contextId: input.contextId }
    },
    createdAt: generatedAt
  });
}

function resolveEnvelope(contextId: DataTableContextId) {
  const recommendation = recommend({ contextId });
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    {
      ...recommendation,
      supported: true,
      blockingReasons: []
    },
    {
      seed: "data-table-organize-envelope-seed",
      generatedAt,
      activityId: "data-table-organize-envelope-activity"
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

describe("[2수04-02] 자료를 표로 정리하기 native family", () => {
  it("원자료·임시 표·정답·교사용 미리보기를 offline 생성한다", () => {
    const result = resolveEnvelope("fruit");

    expect(result.recommendation).toMatchObject({
      supported: false,
      templateId: DATA_TABLE_ORGANIZE_FAMILY_ID,
      standardCode: "[2수04-02]",
      manipulation: DATA_TABLE_ORGANIZE_MANIPULATION,
      blockingReasons: [
        "이 활동은 새 화면을 확인하는 중이라 실제 생성에는 아직 공개되지 않았습니다."
      ]
    });
    expect(result.report.issues).toEqual([]);
    expect(result.report.canCreate).toBe(true);
    expect(result.resolved.items).toHaveLength(2);
    expect(result.compiled.payload.categoryId).toBe(
      MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"].categoryId
    );
    expect(assertCognitiveManifestBound(dataTableOrganizeBlueprint)).toMatchObject({
      mathematicalDecision: expect.stringContaining("원자료"),
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    });

    const answers = buildRegisteredTeacherAnswerKey(result.resolved);
    const previews = buildRegisteredProblemPreviews(result.resolved);
    const applied = buildRegisteredAppliedProblemParameters(result.resolved);
    expect(answers).toHaveLength(2);
    expect(answers[0]).toMatchObject({
      answer: "3개",
      explanation: expect.stringContaining("사과가 3번")
    });
    expect(answers[1]).toMatchObject({
      answer: "개수 비교",
      explanation: expect.stringContaining("범주별 개수")
    });
    expect(previews?.[0]?.statements).toEqual([
      expect.stringContaining("과일 자료"),
      "사과·포도·사과·바나나·사과·포도",
      "표 범주: 사과, 바나나, 포도",
      expect.stringContaining("선택:")
    ]);
    expect(applied).toEqual({
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
      values: { contextId: "fruit" }
    });

    expect(result.resolved.items[0]?.values.tableValues).toEqual([1, 1, 1]);
    expect(result.resolved.items[0]?.values.correctTableValues).toEqual([3, 1, 2]);
    expect(result.resolved.items[1]?.values.tableValues).toEqual([3, 1, 2]);
    expect(result.resolved.items[0]?.values.rawDataText).toContain("사과");
    for (const item of result.resolved.items) {
      expect(item.values.contextId).toBe("fruit");
      expect(item.values.categories).toEqual(["사과", "바나나", "포도"]);
      expect(
        [1, 2, 3, 4, 5].map((index) => String(item.values[`candidate${index}`]))
      ).toHaveLength(5);
    }
  });

  it("등록한 4개 자료 맥락 envelope를 모두 생성·컴파일·검증한다", () => {
    for (const contextId of DATA_TABLE_CONTEXT_IDS) {
      const result = resolveEnvelope(contextId);
      expect(result.report.issues, contextId).toEqual([]);
      expect(result.resolved.items).toHaveLength(2);
      expect(
        result.resolved.items.every((item) => item.values.contextId === contextId)
      ).toBe(true);
    }
  });

  it("같은 입력은 결정적이고 맥락 변경은 문항과 payload hash를 함께 바꾼다", () => {
    const sameA = resolveEnvelope("vehicles");
    const sameB = resolveEnvelope("vehicles");
    const changed = resolveEnvelope("toys");

    expect(sameA.resolved.items).toEqual(sameB.resolved.items);
    expect(sameA.compiled.payloadHash).toBe(sameB.compiled.payloadHash);
    expect(changed.resolved.items[0]?.values.questionText).not.toBe(
      sameA.resolved.items[0]?.values.questionText
    );
    expect(changed.compiled.payloadHash).not.toBe(sameA.compiled.payloadHash);
  });

  it("지원하지 않는 문제 수·맥락·추가 조건을 침묵 없이 거부한다", () => {
    expect(recommend({ contextId: "fruit", problemCount: 1 })).toMatchObject({
      supported: false,
      blockingReasons: expect.arrayContaining([
        expect.stringContaining("2문항")
      ])
    });
    expect(() =>
      validateProblemParameters({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: DATA_TABLE_ORGANIZE_FAMILY_ID,
        values: { contextId: "fruit", extra: true }
      })
    ).toThrow("data-table-organize-parameters-unsupported");
    expect(() =>
      generateDataTableOrganizeItems(
        { difficulty: "easy", problemCount: 2, contextId: "fruit" },
        "unsupported-difficulty"
      )
    ).toThrow(RangeError);
  });
});
