import { describe, expect, it } from "vitest";
import {
  CurriculumResolutionError,
  LEARNING_MAP_COMMIT,
  UNVERIFIED_LOCATOR_PREFIX,
  resolveCurriculum,
  teacherCurriculumCatalog
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
    expect(() => resolveCurriculum("[4수01-12]")).toThrow(
      CurriculumResolutionError
    );
  });

  it("사람이 검토한 레코드와 자동 합성 레코드를 구분한다", () => {
    const reviewed = resolveCurriculum("[6수01-07]");
    expect(reviewed.provenance).toBe("reviewed");
    expect(reviewed.record.officialSource.verificationStatus).toBe(
      "official-text-verified"
    );

    // 아직 검토 레코드가 없는 활동 프로필은 원문 대조를 자칭하지 않는다.
    const synthesized = resolveCurriculum("[6수01-01]");
    expect(synthesized.provenance).toBe("synthesized");
    expect(
      synthesized.record.officialSource.verificationStatus
    ).not.toBe("official-text-verified");
    expect(synthesized.record.reviewer).toContain("사람 검토 없음");
    expect(synthesized.warnings.join(" ")).toContain("자동 합성");
  });

  it("3학년 pilot의 12개 primary standard를 teacher catalog와 같은 검토본으로 해석한다", () => {
    for (const code of [
      "[4수01-04]",
      "[4수01-05]",
      "[4수01-06]",
      "[4수01-09]",
      "[4수01-10]",
      "[4수01-11]",
      "[4수03-06]",
      "[4수03-15]",
      "[4수03-16]",
      "[4수03-18]",
      "[4수03-21]",
      "[4수04-01]"
    ]) {
      const result = resolveCurriculum(code);
      expect(result.provenance).toBe("reviewed");
      expect(result.record.officialSource.verificationStatus).toBe(
        "official-text-verified"
      );
      expect(result.record.officialSource.locator).toMatch(
        /^PDF physical \d+쪽/
      );
      const catalogRecord = teacherCurriculumCatalog.find(
        (standard) => standard.standardCode === code
      );
      expect(catalogRecord?.sourceLocator).toBe(
        result.record.officialSource.locator
      );
    }
  });

  it("출시할 기하 활동과 몫·나머지 활동의 공식 원문 위치를 검토본으로 고정한다", () => {
    for (const code of [
      "[4수01-06]",
      "[4수03-09]",
      "[4수03-24]",
      "[6수03-02]"
    ]) {
      const result = resolveCurriculum(code);
      expect(result.provenance).toBe("reviewed");
      expect(result.record.officialSource.verificationStatus).toBe(
        "official-text-verified"
      );
      expect(result.record.officialSource.locator).toMatch(
        /^PDF (physical )?\d+쪽/
      );
    }
  });

  it("파생한 출처 위치를 검증된 위치처럼 표시하지 않는다", () => {
    // 소주제 묶음에서 코드 규칙으로 만든 참조 항목은 원문 미대조 표시를 달고,
    // 사람이 원문을 확인한 항목은 실제 쪽수 위치를 그대로 쓴다.
    const derived = teacherCurriculumCatalog.filter(
      (standard) =>
        standard.summaryKind === "source-position" ||
        standard.summaryKind === "activity-profile-goal"
    );
    const reviewed = teacherCurriculumCatalog.filter(
      (standard) => standard.summaryKind === "official-goal"
    );
    expect(derived.length).toBeGreaterThan(0);
    expect(reviewed.length).toBeGreaterThan(0);
    for (const standard of derived) {
      expect(standard.sourceLocator.startsWith(UNVERIFIED_LOCATOR_PREFIX)).toBe(
        true
      );
    }
    for (const standard of reviewed) {
      expect(standard.sourceLocator).not.toContain(UNVERIFIED_LOCATOR_PREFIX);
    }
  });

  it("활동 프로필이 준 목표 문구를 검토된 목표로 승격하지 않는다", () => {
    // 목표 문구가 있다는 사실이 원문 대조를 뜻하지는 않는다.
    // 프로필에서 온 문구는 official-goal이 아니라 activity-profile-goal이다.
    const profileGoals = teacherCurriculumCatalog.filter(
      (standard) => standard.summaryKind === "activity-profile-goal"
    );
    expect(profileGoals.length).toBeGreaterThan(0);
    for (const standard of profileGoals.filter(
      ({ standardCode }) => standardCode !== "[4수01-06]"
    )) {
      expect(resolveCurriculum(standard.standardCode).provenance).toBe(
        "synthesized"
      );
    }
  });

  it("한 성취기준에 활동 프로필이 겹치면 경고로 드러낸다", () => {
    // [4수01-06]은 나눗셈 몫·나머지와 부분몫 두 활동이 함께 주장한다.
    const collided = resolveCurriculum("[4수01-06]");
    expect(collided.warnings.join(" ")).toContain("성취기준 배정을 분리");
  });
});
