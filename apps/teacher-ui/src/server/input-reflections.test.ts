import { describe, expect, it } from "vitest";
import type { RecommendationSummary } from "@mathcanvas/authoring-runtime";
import {
  buildInputReflections,
  type TeacherRecommendationInput
} from "./input-reflections.js";

const input: TeacherRecommendationInput = {
  requestedGrade: 3,
  unitTitle: "1학기 4. 곱셈",
  standardCode: "[2수01-10]",
  activityId: "multiplication-array",
  activityLabel: "묶음 배열과 곱셈식 연결",
  manipulation: "multiplication-array-choice-drag",
  learningNeedLabel: "곱셈식 두 수의 뜻을 바꾸어 생각해요",
  contextNote: "",
  problemCount: 2
};

const recommendation: RecommendationSummary = {
  supported: true,
  templateId: "number.multiplication.group-array-meaning-v1",
  recommendedGrade: input.requestedGrade,
  standardCode: input.standardCode,
  problemCount: input.problemCount,
  manipulation: input.manipulation,
  rationale: ["선택한 활동을 추천했습니다."],
  caveats: [],
  blockingReasons: []
};

describe("교사 입력 반영 상태", () => {
  it("추천 echo와 일치하는 다섯 입력은 반영됨으로 표시한다", () => {
    const reflections = buildInputReflections(input, recommendation);
    expect(reflections.slice(0, 5).every(({ status }) => status === "applied"))
      .toBe(true);
    expect(reflections).toContainEqual(
      expect.objectContaining({
        inputLabel: "학생이 어려워하는 지점",
        status: "reference-only"
      })
    );
    expect(reflections.some(({ inputLabel }) => inputLabel === "수업 메모"))
      .toBe(false);
  });

  it("수업 메모가 있으면 80자 요약과 미반영 안내를 추가한다", () => {
    const reflections = buildInputReflections(
      { ...input, contextNote: "가".repeat(90) },
      recommendation
    );
    expect(reflections).toContainEqual(
      expect.objectContaining({
        inputLabel: "수업 메모",
        value: `${"가".repeat(80)}…`,
        status: "reference-only",
        note: expect.stringContaining("아직 문항 내용에는 반영되지 않습니다")
      })
    );
  });

  it("caveat와 미지원 요청은 각각 확인 필요로 표시한다", () => {
    const reflections = buildInputReflections(input, {
      ...recommendation,
      caveats: ["이 활동은 한 화면에서 진행됩니다."],
      unsupportedRequests: ["난이도 변경"]
    });
    expect(
      reflections.filter(({ status }) => status === "needs-review")
    ).toEqual([
      expect.objectContaining({
        value: "추천 제한 사항",
        note: expect.stringContaining("한 화면")
      }),
      expect.objectContaining({
        value: "지원하지 않는 요청",
        note: expect.stringContaining("난이도 변경")
      })
    ]);
  });

  it("추천 echo가 다르면 요청값과 추천값을 확인 필요로 보여 준다", () => {
    const reflections = buildInputReflections(input, {
      ...recommendation,
      recommendedGrade: 4,
      standardCode: "[4수01-05]",
      manipulation: "fraction-strip-common-start-drag",
      problemCount: 4
    });
    expect(
      reflections.filter(({ status }) => status === "needs-review")
    ).toHaveLength(5);
    expect(reflections.find(({ inputLabel }) => inputLabel === "학년")?.note)
      .toContain("4학년");
    expect(
      reflections.find(({ inputLabel }) => inputLabel === "문항 수")?.note
    ).toContain("4문항");
  });
});
