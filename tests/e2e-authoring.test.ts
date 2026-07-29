import { describe, expect, it } from "vitest";
import {
  CreationJobStore,
  MANAGED_BROWSER_VERSION,
  type MathCanvasBrowserRuntime
} from "@mathcanvas/managed-browser";
import { MathCanvasAuthoringService } from "../apps/mcp-server/src/service.js";

describe("추천부터 새 편집 화면까지의 모의 전체 흐름", () => {
  it("교사 승인 뒤 문제별 새 캔버스를 만들고 첫 편집 화면을 연다", async () => {
    const now = new Date("2026-07-29T06:00:00.000Z");
    const clock = { now: () => now };
    let creationCalls = 0;
    const capturedPayloads: Record<string, unknown>[] = [];
    const openedEditorUrls: string[] = [];
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
        capturedPayloads.push(payload);
        return {
          ok: true,
          completedAt: "2026-07-29T06:00:01.000Z",
          projectId: `P_e2eGenerated_${creationCalls}`,
          editorUrl:
            `https://mathcanvas.vivasam.com/ko/view/P_e2eGenerated_${creationCalls}`
        };
      },
      async openEditor(editorUrl) {
        openedEditorUrls.push(editorUrl);
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

    const creation = await service.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });
    expect(creation.status).toBe("succeeded");
    expect(creation.items).toHaveLength(4);
    expect(creation.validations.every((value) => value.canCreate)).toBe(
      true
    );
    expect(capturedPayloads[0]).toMatchObject({
      categoryId: "rJa0d46MAy",
      isNoteworthy: false,
      studyLevel: "elementary"
    });
    expect(
      capturedPayloads.map((payload) => String(payload.projectTitle))
    ).toEqual([
      expect.stringContaining("1/4"),
      expect.stringContaining("2/4"),
      expect.stringContaining("3/4"),
      expect.stringContaining("4/4")
    ]);
    expect(JSON.stringify(capturedPayloads)).not.toMatch(
      /accessToken|Authorization|Bearer|password/i
    );
    expect(openedEditorUrls).toEqual([
      "https://mathcanvas.vivasam.com/ko/view/P_e2eGenerated_1"
    ]);

    await service.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });
    expect(creationCalls).toBe(4);
  });
});
