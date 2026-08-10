import { describe, expect, it } from "vitest";
import { CONTRACT_SCHEMA_VERSION } from "@mathcanvas/contracts";
import {
  teacherCurriculumCatalog,
  teacherTextbookUnits
} from "@mathcanvas/curriculum";
import { recommendActivity } from "./index.js";

const baseRequest = {
  schemaVersion: CONTRACT_SCHEMA_VERSION,
  requestId: "request-compare-1",
  prompt: "분모가 다른 두 분수의 크기를 눈으로 비교하는 활동지를 만들어 주세요.",
  createdAt: "2026-07-28T01:00:00.000Z"
} as const;

describe("활동 추천", () => {
  it("교사 화면이 고른 모든 활동을 출시 상태대로 라우팅한다", () => {
    // 교사 화면은 항상 성취기준 코드와 조작 방식을 함께 보낸다.
    // 이 조합에서 출시 활동은 전부 추천되어야 하고, 출시 전 활동은
    // 그 이유와 함께 막혀야 한다. 성취기준을 여러 계열이 공유해도
    // 요청한 조작 방식의 활동으로 라우팅해야 한다.
    const mismatches: string[] = [];
    for (const standard of teacherCurriculumCatalog) {
      for (const activity of standard.activities) {
        const unit = teacherTextbookUnits.find(
          (candidate) =>
            candidate.standardCodes.includes(standard.standardCode) &&
            candidate.activityIds.includes(activity.id)
        );
        const result = recommendActivity({
          schemaVersion: CONTRACT_SCHEMA_VERSION,
          requestId: `request-${activity.id}`,
          prompt: [
            activity.promptSeed,
            activity.learningNeeds[0]?.promptDetail ?? ""
          ].join(". "),
          requestedStandardCode: standard.standardCode,
          ...(unit ? { requestedGrade: unit.grade } : {}),
          problemCount: activity.defaultProblemCount,
          manipulation: activity.manipulation,
          createdAt: "2026-08-02T01:00:00.000Z"
        });
        const shouldSupport = activity.availability === "released";
        if (result.supported !== shouldSupport) {
          mismatches.push(
            `${activity.id}(${activity.availability}) -> supported=${result.supported} ${result.blockingReasons[0] ?? ""}`
          );
          continue;
        }
        if (shouldSupport) {
          if (result.standardCode !== standard.standardCode) {
            mismatches.push(
              `${activity.id} -> ${result.standardCode} (기대 ${standard.standardCode})`
            );
          }
          if (result.manipulation !== activity.manipulation) {
            mismatches.push(
              `${activity.id} -> ${result.manipulation} (기대 ${activity.manipulation})`
            );
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("출시 활동의 안전한 기본값을 추천한다", () => {
    const result = recommendActivity(baseRequest);
    expect(result.supported).toBe(true);
    expect(result.templateId).toBe(
      "fraction.compare.unlike-denominators.visual-v1"
    );
    expect(result.problemCount).toBe(4);
    expect(result.difficulty).toBe("normal");
    expect(result.recommendedGrade).toBe(5);
    expect(result.learningGoal).toContain("분모가 다른 분수의 크기");
    expect(result.blockingReasons).toEqual([]);
  });

  it("교사가 요청한 검증 범위 내 조건을 보존한다", () => {
    const result = recommendActivity({
      ...baseRequest,
      problemCount: 6,
      difficulty: "hard",
      requestedGrade: 6
    });
    expect(result.problemCount).toBe(6);
    expect(result.difficulty).toBe("hard");
    expect(result.recommendedGrade).toBe(6);
  });

  it("자연스러운 분수 크기 비교 요청도 같은 출시 활동에 연결한다", () => {
    const result = recommendActivity({
      ...baseRequest,
      prompt: "5학년 분수 크기 비교 활동지를 만들어 주세요."
    });
    expect(result.supported).toBe(true);
    expect(result.rationale.join(" ")).toContain("분모가 서로 다른");
    expect(
      recommendActivity({
        ...baseRequest,
        prompt: "통분하여 분모가 다른 분수의 크기를 비교하는 활동지",
        manipulation: "fraction-strip-common-start-drag"
      })
    ).toMatchObject({
      supported: true,
      templateId: "fraction.compare.unlike-denominators.visual-v1"
    });
    expect(
      recommendActivity({
        ...baseRequest,
        prompt: "number bond로 10을 만들며 두 수를 비교해 보세요."
      }).templateId
    ).toBe("number.make-10.cards-v1");
    expect(
      recommendActivity({
        ...baseRequest,
        prompt: "분자가 다른 두 분수의 크기를 비교하는 활동지"
      }).templateId
    ).toBe("fraction.compare.unlike-denominators.visual-v1");
  });

  it("미지원 요청은 막고 출시 활동의 검증된 variation만 추천한다", () => {
    const result = recommendActivity({
      ...baseRequest,
      prompt: "원의 넓이 활동지를 만들어 주세요."
    });
    expect(result.supported).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.blockingReasons).not.toHaveLength(0);

    const equivalent = recommendActivity({
      ...baseRequest,
      prompt: "동치분수 활동지를 만들어 주세요."
    });
    expect(equivalent).toMatchObject({
      supported: true,
      templateId: "fraction.equivalent.same-whole.visual-v1"
    });
    expect(equivalent.blockingReasons).toEqual([]);

    const makeTen = recommendActivity({
      ...baseRequest,
      prompt: "수 카드로 10 만들기 활동지를 만들어 주세요."
    });
    expect(makeTen).toMatchObject({
      supported: true,
      templateId: "number.make-10.cards-v1"
    });
    expect(makeTen.blockingReasons).toEqual([]);

    const equivalentHard = recommendActivity({
      ...baseRequest,
      prompt: "동치분수 활동지를 만들어 주세요.",
      difficulty: "hard"
    });
    expect(equivalentHard).toMatchObject({
      supported: false,
      t0Proposal: { problemCount: 4, difficulty: "normal" }
    });
    expect(equivalentHard.unsupportedRequests?.join(" ")).toContain(
      "기본값만"
    );

    const makeTenTooMany = recommendActivity({
      ...baseRequest,
      prompt: "수 카드로 10 만들기 활동지를 만들어 주세요.",
      problemCount: 6
    });
    expect(makeTenTooMany).toMatchObject({
      supported: false,
      t0Proposal: { problemCount: 5, difficulty: "normal" }
    });
    expect(makeTenTooMany.unsupportedRequests?.join(" ")).toContain(
      "5개까지"
    );

    const irrelevantKnob = recommendActivity({
      ...baseRequest,
      prompt: "동치분수 활동지를 만들어 주세요.",
      denominatorRelation: "coprime"
    });
    expect(irrelevantKnob.supported).toBe(false);
    expect(irrelevantKnob.unsupportedRequests?.join(" ")).toContain(
      "분수 크기 비교"
    );
  });

  it("공식 학년군과 맞지 않는 요청을 차단한다", () => {
    const result = recommendActivity({
      ...baseRequest,
      requestedGrade: 3
    });
    expect(result.supported).toBe(false);
    expect(result.blockingReasons.join(" ")).toContain("학년");
  });

  it("곱셈 TeacherIntent를 의미 역할 그대로 추천에 echo한다", () => {
    const teacherIntent = {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    } as const;
    const result = recommendActivity({
      ...baseRequest,
      requestId: "request-multiplication-teacher-intent",
      prompt: "같은 수씩 묶은 곱셈 배열의 두 수 뜻을 확인하는 활동",
      requestedStandardCode: "[2수01-10]",
      requestedGrade: 3,
      problemCount: 2,
      teacherIntent
    });
    expect(result).toMatchObject({
      supported: true,
      templateId: "number.multiplication.group-array-meaning-v1",
      manipulation: "multiplication-array-choice-drag",
      teacherIntent
    });
  });

  it("곱셈 TeacherIntent와 다른 활동·성취기준 조합을 명시적으로 차단한다", () => {
    const teacherIntent = {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    } as const;
    for (const override of [
      { manipulation: "fraction-strip-common-start-drag" },
      { requestedStandardCode: "[6수01-07]" }
    ] as const) {
      try {
        recommendActivity({
          ...baseRequest,
          prompt: "곱셈 배열에서 두 수의 뜻을 확인하는 활동",
          teacherIntent,
          ...override
        });
        throw new Error("expected-teacher-intent-rejection");
      } catch (error) {
        expect(error).toMatchObject({
          code: "teacher-intent-confirmation-required"
        });
      }
    }
  });

  it("스키마 범위를 벗어난 문제 수를 거부한다", () => {
    expect(() =>
      recommendActivity({ ...baseRequest, problemCount: 12 })
    ).toThrow("요청 형식");
  });
});
