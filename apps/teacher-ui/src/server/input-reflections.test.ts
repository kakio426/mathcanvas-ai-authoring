import { describe, expect, it } from "vitest";
import type { RecommendationSummary } from "@mathcanvas/authoring-runtime";
import type { TeacherIntent } from "@mathcanvas/contracts";
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

  it("곱셈 TeacherIntent가 추천과 실제 첫 문항에 맞으면 네 조건을 반영됨으로 표시한다", () => {
    const teacherIntent = {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    } as const;
    const reflections = buildInputReflections(
      {
        ...input,
        teacherIntent,
        appliedTeacherIntent: teacherIntent
      },
      { ...recommendation, teacherIntent }
    );
    const intentRows = reflections.filter((reflection) =>
      ["한 묶음의 수", "묶음 수", "사물 맥락", "확인할 오개념"].includes(
        reflection.inputLabel
      )
    );
    expect(intentRows).toHaveLength(4);
    expect(intentRows.every(({ status }) => status === "applied")).toBe(true);
    expect(intentRows.map(({ value }) => value)).toEqual([
      "4개씩",
      "6묶음",
      "아이스크림",
      "두 수의 뜻 바꾸기"
    ]);
    expect(intentRows.every(({ note }) => note.includes("첫 문항"))).toBe(true);
  });

  it("실제 첫 문항 값이 다르면 TeacherIntent 조건을 확인 필요로 표시한다", () => {
    const teacherIntent = {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    } as const;
    const reflections = buildInputReflections(
      {
        ...input,
        teacherIntent,
        appliedTeacherIntent: { ...teacherIntent, itemsPerGroup: 5 }
      },
      { ...recommendation, teacherIntent }
    );
    expect(
      reflections.find(({ inputLabel }) => inputLabel === "한 묶음의 수")
    ).toMatchObject({ status: "needs-review" });
    expect(
      reflections.find(({ inputLabel }) => inputLabel === "묶음 수")
    ).toMatchObject({ status: "applied" });
  });

  it.each([
    [
      "나눗셈",
      {
        kind: "division-grouping-v1",
        totalCount: 23,
        groupSize: 4,
        contextObjectId: "candy",
        misconceptionId: "quotient-remainder-meaning"
      },
      "[4수01-06]",
      "claim-evidence-revision-drag",
      ["23개", "4개씩", "사탕", "몫과 나머지의 뜻"]
    ],
    [
      "분수",
      {
        kind: "fraction-comparison-v1",
        numerator: 3,
        leftDenominator: 4,
        rightDenominator: 5,
        misconceptionId: "denominator-size-only"
      },
      "[6수01-07]",
      "fraction-strip-common-start-drag",
      ["3", "4", "5", "분모가 크면 분수도 크다"]
    ]
  ] as const)(
    "%s TeacherIntent도 같은 선언형 반영표에서 실제 적용값까지 대조한다",
    (_name, intent, standardCode, manipulation, expectedValues) => {
      const teacherIntent = intent as TeacherIntent;
      const reflections = buildInputReflections(
        {
          ...input,
          standardCode,
          manipulation,
          teacherIntent,
          appliedTeacherIntent: teacherIntent
        },
        {
          ...recommendation,
          standardCode,
          manipulation,
          teacherIntent
        }
      );
      const intentRows = reflections.slice(-expectedValues.length);
      expect(intentRows.map(({ value }) => value)).toEqual(expectedValues);
      expect(intentRows.every(({ status }) => status === "applied")).toBe(true);
      expect(intentRows.every(({ note }) => note.includes("첫 문항"))).toBe(true);
    }
  );
});
