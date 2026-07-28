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
      "https://ncic.re.kr/bbs/eduNotice2022/view/543.do"
    );
    expect(result.warnings.join(" ")).toContain("분수의 덧셈과 뺄셈");
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
});
