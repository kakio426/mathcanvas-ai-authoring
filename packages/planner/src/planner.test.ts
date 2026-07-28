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
  });

  it("지원하지 않는 요청을 자유 생성하지 않는다", () => {
    const result = recommendActivity({
      ...baseRequest,
      prompt: "원의 넓이 활동지를 만들어 주세요."
    });
    expect(result.supported).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.blockingReasons).not.toHaveLength(0);
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
