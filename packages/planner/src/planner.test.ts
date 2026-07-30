import { describe, expect, it } from "vitest";
import { CONTRACT_SCHEMA_VERSION } from "@mathcanvas/contracts";
import { recommendActivity } from "./index.js";

const baseRequest = {
  schemaVersion: CONTRACT_SCHEMA_VERSION,
  requestId: "request-compare-1",
  prompt: "분모가 다른 두 분수의 크기를 눈으로 비교하는 활동지를 만들어 주세요.",
  createdAt: "2026-07-28T01:00:00.000Z"
} as const;

describe("활동 추천", () => {
  it("첫 검증 패턴과 안전한 기본값을 추천한다", () => {
    const result = recommendActivity(baseRequest);
    expect(result.supported).toBe(true);
    expect(result.templateId).toBe(
      "fraction.compare.unlike-denominators.visual-v1"
    );
    expect(result.problemCount).toBe(4);
    expect(result.difficulty).toBe("normal");
    expect(result.recommendedGrade).toBe(5);
    expect(result.learningGoal).toContain("분모가 다른 분수의 크기");
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

  it("자연스러운 분수 크기 비교 요청도 첫 검증 패턴으로 추천한다", () => {
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

  it("스키마 범위를 벗어난 문제 수를 거부한다", () => {
    expect(() =>
      recommendActivity({ ...baseRequest, problemCount: 12 })
    ).toThrow("요청 형식");
  });
});
