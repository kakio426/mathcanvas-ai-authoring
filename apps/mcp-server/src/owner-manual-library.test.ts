import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findApprovedOwnerManualProject,
  findOwnerManualLessonReview,
  ownerManualActivityLibrarySchema
} from "./owner-manual-library.js";

const libraryPath = join(
  process.cwd(),
  "config",
  "owner-manual-activity-library.json"
);

describe("선생님 수동 제작 MathCanvas 허용 목록", () => {
  it("프로토타입과 외부 프로젝트를 허용하지 않는다", () => {
    const library = ownerManualActivityLibrarySchema.parse(
      JSON.parse(readFileSync(libraryPath, "utf8"))
    );
    expect(library.policy).toMatchObject({
      manualOnly: true,
      loginRequired: true,
      visualInspectionRequired: true,
      prototypesAllowed: false,
      externalProjectsAllowed: false,
      exactLessonAllowlistRequired: true
    });
    expect(
      findOwnerManualLessonReview(
        library,
        "g3s1-multiplication-array-transfer"
      )
    ).toMatchObject({
      decision: "no-usable-manual",
      inspectedProjectIds: ["a9sw5l", "I9a004"]
    });
    expect(
      findApprovedOwnerManualProject(
        library,
        "g3s1-multiplication-array-transfer"
      )
    ).toBeUndefined();
    expect(
      library.projects.filter(
        (project) => project.reviewStatus === "rejected"
      )
    ).toHaveLength(2);
  });

  it("승인하지 않은 수동 제작본은 차시에 연결하지 못한다", () => {
    const invalid = {
      schemaVersion: 1,
      updatedAt: "2026-08-07T22:55:00.000Z",
      policy: {
        accountScope: "current-owner-my-canvas",
        loginRequired: true,
        visualInspectionRequired: true,
        manualOnly: true,
        prototypesAllowed: false,
        externalProjectsAllowed: false,
        exactLessonAllowlistRequired: true
      },
      lessonReviews: [
        {
          lessonId: "g3s1-multiplication-array-transfer",
          accountScope: "current-owner-my-canvas",
          accountDisplayName: "유병주 선생님",
          reviewedAt: "2026-08-07T22:55:00.000Z",
          inspectedProjectIds: ["a9sw5l"],
          decision: "no-usable-manual",
          searchNotes: ["곱셈 후보를 직접 열어 확인했습니다."]
        }
      ],
      projects: [
        {
          projectId: "a9sw5l",
          title: "한 자릿수 곱셈 풀어보기",
          editorUrl: "https://mathcanvas.vivasam.com/ko/view/a9sw5l",
          origin: "owner-manual",
          prototype: false,
          reviewedAt: "2026-08-07T22:51:00.000Z",
          reviewStatus: "rejected",
          compatibleLessonIds: [
            "g3s1-multiplication-array-transfer"
          ],
          conceptTags: ["곱셈"],
          reasons: ["수학적 설명 증거가 없습니다."]
        }
      ]
    };
    expect(() => ownerManualActivityLibrarySchema.parse(invalid)).toThrow(
      "반려한 수동 제작본은 차시에 연결할 수 없습니다."
    );
  });

  it("projectId와 편집 URL이 다른 수동 제작본은 거부한다", () => {
    const invalid = JSON.parse(readFileSync(libraryPath, "utf8"));
    invalid.projects[0].editorUrl =
      "https://mathcanvas.vivasam.com/ko/view/not-the-project";
    expect(() => ownerManualActivityLibrarySchema.parse(invalid)).toThrow(
      "수동 제작본 projectId와 편집 URL이 일치해야 합니다."
    );
  });
});
