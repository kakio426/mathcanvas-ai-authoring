import { describe, expect, it } from "vitest";
import {
  CreationJobStore,
  MANAGED_BROWSER_VERSION,
  type MathCanvasBrowserRuntime
} from "@mathcanvas/managed-browser";
import { MathCanvasAuthoringService } from "../apps/mcp-server/src/service.js";

describe("추천부터 새 편집 화면까지의 모의 전체 흐름", () => {
  it("교사 승인 뒤 관리형 브라우저가 한 번만 생성하고 편집 URL을 돌려준다", async () => {
    const now = new Date("2026-07-29T06:00:00.000Z");
    const clock = { now: () => now };
    let creationCalls = 0;
    let capturedPayload: Record<string, unknown> | undefined;
    const runtime: MathCanvasBrowserRuntime = {
      async openWorkspace() {
        return {
          runtimeVersion: MANAGED_BROWSER_VERSION,
          state: "ready",
          ready: true,
          checkedAt: now.toISOString(),
          currentUrl: "https://mathcanvas.vivasam.com/ko/myCanvas"
        };
      },
      async checkConnection() {
        return this.openWorkspace();
      },
      async createProject(payload) {
        creationCalls += 1;
        capturedPayload = payload;
        return {
          ok: true,
          completedAt: "2026-07-29T06:00:01.000Z",
          projectId: "P_e2eGenerated",
          editorUrl:
            "https://mathcanvas.vivasam.com/ko/view/P_e2eGenerated"
        };
      },
      async close() {}
    };
    const service = new MathCanvasAuthoringService(
      runtime,
      new CreationJobStore(),
      clock
    );

    expect((await service.checkConnection()).ready).toBe(true);
    const draft = service.recommend({
      prompt:
        "분모가 다른 분수의 크기를 분수 띠로 직접 비교하는 활동지를 만들어 주세요.",
      requestedGrade: 5,
      problemCount: 4,
      difficulty: "normal"
    });
    expect(draft.supported).toBe(true);

    const creation = await service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(creation).toMatchObject({
      status: "succeeded",
      projectId: "P_e2eGenerated",
      editorUrl:
        "https://mathcanvas.vivasam.com/ko/view/P_e2eGenerated"
    });
    expect(creation.validation.canCreate).toBe(true);
    expect(capturedPayload).toMatchObject({
      categoryId: "rJa0d46MAy",
      isNoteworthy: false,
      studyLevel: "elementary"
    });
    expect(JSON.stringify(capturedPayload)).not.toMatch(
      /accessToken|Authorization|Bearer|password/i
    );

    await service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(creationCalls).toBe(1);
  });
});
