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

  it("공식 fixture 밖 성취기준을 조용히 추측하지 않는다", () => {
    expect(() => resolveCurriculum("[4수01-99]")).toThrow(
      CurriculumResolutionError
    );
  });

  it("활동별 상세 레코드와 공식 fixture 기본 레코드를 모두 검토본으로 해석한다", () => {
    const reviewed = resolveCurriculum("[6수01-07]");
    expect(reviewed.provenance).toBe("reviewed");
    expect(reviewed.record.officialSource.verificationStatus).toBe(
      "official-text-verified"
    );

    const fixtureBacked = resolveCurriculum("[4수01-12]");
    expect(fixtureBacked.provenance).toBe("reviewed");
    expect(fixtureBacked.record.officialSource.verificationStatus).toBe(
      "official-text-verified"
    );
    expect(fixtureBacked.record.officialGoal).toContain("소수 한 자리 수");
    expect(fixtureBacked.record.reviewer).toContain("dual-source");
  });

  it("3학년 pilot의 12개 primary standard를 공식 fixture와 상세 검토본으로 해석한다", () => {
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
      expect(catalogRecord?.standardSummary).toBe(result.record.officialGoal);
      expect(catalogRecord?.sourceLocator).toContain(code);
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

  it("121개 카탈로그 항목을 모두 공식 원문 검토 상태로 노출한다", () => {
    expect(teacherCurriculumCatalog).toHaveLength(121);
    for (const standard of teacherCurriculumCatalog) {
      expect(standard.summaryKind).toBe("official-goal");
      expect(standard.sourceLocator).not.toContain(UNVERIFIED_LOCATOR_PREFIX);
      const resolved = resolveCurriculum(standard.standardCode);
      expect(resolved.record.officialGoal).toBe(standard.standardSummary);
      expect(resolved.record.officialSource.verificationStatus).toBe(
        "official-text-verified"
      );
    }
  });

  it("활동 프로필 목표 대신 공식 fixture 목표를 카탈로그 권위로 사용한다", () => {
    const profileGoals = teacherCurriculumCatalog.filter(
      (standard) => standard.summaryKind === "activity-profile-goal"
    );
    expect(profileGoals).toHaveLength(0);
  });

  it("한 성취기준에 활동 프로필이 겹치면 경고로 드러낸다", () => {
    // [4수01-06]은 나눗셈 몫·나머지와 부분몫 두 활동이 함께 주장한다.
    const collided = resolveCurriculum("[4수01-06]");
    expect(collided.warnings.join(" ")).toContain("성취기준 배정을 분리");
  });
});
