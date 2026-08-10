import { describe, expect, it } from "vitest";
import { TEACHER_INTENT_CAPABILITIES } from "@mathcanvas/contracts";
import { buildCurriculumCatalogResponse } from "./curriculum-catalog.js";

describe("교사용 교육과정 catalog의 TeacherIntent 노출", () => {
  it("registry의 세 capability만 정확한 성취기준·조작 경로에 표시한다", () => {
    const catalog = buildCurriculumCatalogResponse();
    const exposed = catalog.standards.flatMap((standard) =>
      standard.activities.flatMap((activity) =>
        activity.teacherIntentCapability
          ? [
              {
                kind: activity.teacherIntentCapability,
                standardCode: standard.standardCode
              }
            ]
          : []
      )
    );
    expect(exposed).toHaveLength(TEACHER_INTENT_CAPABILITIES.length);
    expect(exposed.map(({ kind }) => kind).sort()).toEqual(
      TEACHER_INTENT_CAPABILITIES.map(({ kind }) => kind).sort()
    );
    for (const capability of TEACHER_INTENT_CAPABILITIES) {
      expect(exposed).toContainEqual({
        kind: capability.kind,
        standardCode: capability.standardCode
      });
    }
  });
});
