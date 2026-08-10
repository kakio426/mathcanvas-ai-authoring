import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  sha256Hex,
  type MultiplicationArrayTeacherIntent
} from "@mathcanvas/contracts";
import { resolveActivity } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import {
  buildRegisteredProblemPreviews,
  buildRegisteredTeacherAnswerKey,
  prepareRegisteredActivity,
  projectRegisteredApprovalView
} from "@mathcanvas/templates";

const goldenIntent: MultiplicationArrayTeacherIntent = {
  kind: "multiplication-array-v1",
  itemsPerGroup: 4,
  groupCount: 6,
  contextObjectId: "ice-cream",
  misconceptionId: "groups-size-order"
};

function prepare(intent: MultiplicationArrayTeacherIntent) {
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "teacher-intent-golden-request",
    prompt: "곱셈 배열에서 두 수의 뜻을 확인하는 활동을 만들어 주세요.",
    requestedStandardCode: "[2수01-10]",
    requestedGrade: 3,
    problemCount: 2,
    difficulty: "normal",
    manipulation: "multiplication-array-choice-drag",
    teacherIntent: intent,
    createdAt: "2026-08-10T00:00:00.000Z"
  });
  const resolved = resolveActivity(
    prepareRegisteredActivity(recommendation, {
      seed: "teacher-intent-fixed-seed",
      generatedAt: "2026-08-10T00:00:00.000Z",
      activityId: "teacher-intent-fixed-activity"
    })
  );
  const approvalView = projectRegisteredApprovalView(resolved);
  return {
    recommendation,
    resolved,
    approvalView,
    activitySpecHash: sha256Hex(approvalView),
    answerKey: buildRegisteredTeacherAnswerKey(resolved),
    problemPreviews: buildRegisteredProblemPreviews(resolved)
  };
}

describe("곱셈 TeacherIntent 결정적 세로 단면", () => {
  it("같은 seed와 같은 intent는 같은 resolved·approval·hash를 만든다", () => {
    const first = prepare(goldenIntent);
    const second = prepare(goldenIntent);
    expect(first.resolved).toEqual(second.resolved);
    expect(first.approvalView).toEqual(second.approvalView);
    expect(first.activitySpecHash).toBe(second.activitySpecHash);
  });

  it.each([
    ["itemsPerGroup", { ...goldenIntent, itemsPerGroup: 5 }],
    ["groupCount", { ...goldenIntent, groupCount: 7 }]
  ] as const)(
    "같은 seed에서 %s만 바꾸면 첫 문항과 hash가 함께 바뀐다",
    (_field, changedIntent) => {
      const baseline = prepare(goldenIntent);
      const changed = prepare(changedIntent);
      expect(changed.resolved.items[0]?.values.questionText).not.toBe(
        baseline.resolved.items[0]?.values.questionText
      );
      expect(changed.activitySpecHash).not.toBe(baseline.activitySpecHash);
    }
  );

  it("문항·정답·오개념 보기·정확한 미리보기가 같은 의미값을 사용한다", () => {
    const result = prepare(goldenIntent);
    const first = result.resolved.items[0];
    expect(first?.values).toMatchObject({
      each: 4,
      groups: 6,
      total: 24,
      correctValueText: "4\\times6",
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    });
    const candidates = Array.from(
      { length: 5 },
      (_, index) => String(first?.values[`candidate${index + 1}`])
    );
    expect(candidates).toContain("6\\times4");
    expect(result.answerKey[0]?.answer).toBe("4\\times6");
    expect(result.problemPreviews?.[0]).toEqual({
      problemNumber: 1,
      statements: [
        "한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요?"
      ]
    });
  });
});
