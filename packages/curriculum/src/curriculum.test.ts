import { describe, expect, it } from "vitest";
import {
  CurriculumResolutionError,
  LEARNING_MAP_COMMIT,
  resolveCurriculum
} from "./index.js";

describe("교육과정 해석", () => {
  it("공식 목표를 보조 맵의 넓은 단원명보다 우선한다", () => {
    const result = resolveCurriculum();
    expect(result.record.officialGoal).toBe(
      "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다."
    );
    expect(result.record.gradeBand).toBe("5-6");
    expect(result.record.domain).toBe("수와 연산");
    expect(result.record.officialSource.sourceTextIncluded).toBe(false);
    expect(result.record.officialSource.url).toBe(
      "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4"
    );
    expect(result.warnings.join(" ")).toContain("후속 확인");
  });

  it("보조 맵 버전을 정확한 commit으로 고정한다", () => {
    expect(resolveCurriculum().auxiliarySnapshotSha).toBe(LEARNING_MAP_COMMIT);
    expect(LEARNING_MAP_COMMIT).toMatch(/^[a-f0-9]{40}$/);
  });

  it("지원하지 않는 성취기준을 조용히 추측하지 않는다", () => {
    expect(() => resolveCurriculum("[4수01-11]")).toThrow(
      CurriculumResolutionError
    );
  });

  it("사람이 검토한 레코드와 자동 합성 레코드를 구분한다", () => {
    const reviewed = resolveCurriculum("[6수01-07]");
    expect(reviewed.provenance).toBe("reviewed");
    expect(reviewed.record.officialSource.verificationStatus).toBe(
      "official-text-verified"
    );

    // 활동 프로필에서 조립한 레코드는 원문 대조를 자칭하지 않는다.
    const synthesized = resolveCurriculum("[4수03-24]");
    expect(synthesized.provenance).toBe("synthesized");
    expect(
      synthesized.record.officialSource.verificationStatus
    ).not.toBe("official-text-verified");
    expect(synthesized.record.reviewer).toContain("사람 검토 없음");
    expect(synthesized.warnings.join(" ")).toContain("자동 합성");
  });

  it("한 성취기준에 활동 프로필이 겹치면 경고로 드러낸다", () => {
    // [4수01-06]은 나눗셈 몫·나머지와 부분몫 두 활동이 함께 주장한다.
    const collided = resolveCurriculum("[4수01-06]");
    expect(collided.warnings.join(" ")).toContain("성취기준 배정을 분리");
  });
});
