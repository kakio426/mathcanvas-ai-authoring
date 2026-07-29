import {
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CreationJobStore,
  MANAGED_BROWSER_VERSION,
  type BrowserConnection,
  type CreationResult,
  type MathCanvasBrowserRuntime
} from "@mathcanvas/managed-browser";
import { sha256Hex } from "@mathcanvas/contracts";
import { MathCanvasAuthoringService } from "./service.js";

const fixedClock = {
  now: () => new Date("2026-07-29T04:00:00.000Z")
};

function successResult(index: number): CreationResult {
  return {
    ok: true,
    completedAt: `2026-07-29T04:00:${String(index).padStart(2, "0")}.000Z`,
    projectId: `P_generated_${index}`,
    editorUrl:
      `https://mathcanvas.vivasam.com/ko/view/P_generated_${index}`
  };
}

class FakeBrowserRuntime implements MathCanvasBrowserRuntime {
  public readonly createCalls: Array<{
    payload: Record<string, unknown>;
    payloadHash: string;
    openEditor: boolean | undefined;
  }> = [];
  public readonly openedEditorUrls: string[] = [];
  public openCalls = 0;
  public creationResults: CreationResult[];
  public firstCreationGate: Promise<void> | undefined;

  public constructor(
    public connection: BrowserConnection = {
      runtimeVersion: MANAGED_BROWSER_VERSION,
      state: "ready",
      ready: true,
      checkedAt: fixedClock.now().toISOString(),
      currentUrl: "https://mathcanvas.vivasam.com/ko/myCanvas"
    },
    creationResults: CreationResult[] = []
  ) {
    this.creationResults = creationResults;
  }

  public async openWorkspace(): Promise<BrowserConnection> {
    this.openCalls += 1;
    return this.connection;
  }

  public async checkConnection(): Promise<BrowserConnection> {
    return this.connection;
  }

  public async createProject(
    payload: Record<string, unknown>,
    payloadHash: string,
    options?: { openEditor?: boolean }
  ): Promise<CreationResult> {
    this.createCalls.push({
      payload,
      payloadHash,
      openEditor: options?.openEditor
    });
    if (this.createCalls.length === 1 && this.firstCreationGate) {
      await this.firstCreationGate;
    }
    return (
      this.creationResults.shift() ??
      successResult(this.createCalls.length)
    );
  }

  public async openEditor(editorUrl: string): Promise<void> {
    this.openedEditorUrls.push(editorUrl);
  }

  public async close(): Promise<void> {}
}

function createService(
  runtime = new FakeBrowserRuntime(),
  store = new CreationJobStore(),
  draftSnapshotPath?: string
) {
  return new MathCanvasAuthoringService(
    runtime,
    store,
    fixedClock,
    draftSnapshotPath ? { draftSnapshotPath } : {}
  );
}

function recommend(service: MathCanvasAuthoringService, problemCount = 4) {
  return service.recommend({
    prompt:
      "분모가 다른 분수의 크기를 눈으로 비교하는 활동지를 만들어 주세요.",
    problemCount
  });
}

describe("MCP 서비스 흐름", () => {
  it("전용 Chrome을 열고 로그인 위치를 정확히 안내한다", async () => {
    const runtime = new FakeBrowserRuntime({
      runtimeVersion: MANAGED_BROWSER_VERSION,
      state: "login-required",
      ready: false,
      checkedAt: fixedClock.now().toISOString(),
      currentUrl: "https://mathcanvas.vivasam.com/ko/myCanvas"
    });
    const status = await createService(runtime).openWorkspace();
    expect(runtime.openCalls).toBe(1);
    expect(status.ready).toBe(false);
    expect(status.message).toContain("전용 Chrome");
    expect(status.message).toContain("내 캔버스");
  });

  it("추천한 문제 수만큼 한 문제짜리 새 캔버스를 만든다", async () => {
    const runtime = new FakeBrowserRuntime();
    const service = createService(runtime);
    const draft = recommend(service);

    expect(draft.supported).toBe(true);
    expect(draft.activitySetSummary).toMatchObject({
      canvasCount: 4,
      oneProblemPerCanvas: true
    });
    await expect(
      service.createActivitySet({
        draftId: draft.draftId!,
        setHash: draft.setHash!,
        teacherConfirmed: false
      })
    ).rejects.toThrow("명시적으로 승인");
    await expect(
      service.createActivitySet({
        draftId: draft.draftId!,
        setHash: "0".repeat(64),
        teacherConfirmed: true
      })
    ).rejects.toThrow("다릅니다");

    const created = await service.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });
    expect(created.status).toBe("succeeded");
    expect(created.validations).toHaveLength(4);
    expect(created.validations.every((value) => value.canCreate)).toBe(true);
    expect(created.teacherAnswerKey).toHaveLength(4);
    expect(created.items).toHaveLength(4);
    expect(created.items.map((item) => item.canvasIndex)).toEqual([
      1, 2, 3, 4
    ]);
    expect(runtime.createCalls).toHaveLength(4);
    expect(
      runtime.createCalls.every((call) => call.openEditor === false)
    ).toBe(true);
    expect(
      runtime.createCalls.map((call) =>
        String(call.payload.projectTitle)
      )
    ).toEqual([
      expect.stringContaining("1/4"),
      expect.stringContaining("2/4"),
      expect.stringContaining("3/4"),
      expect.stringContaining("4/4")
    ]);
    expect(runtime.openedEditorUrls).toEqual([
      "https://mathcanvas.vivasam.com/ko/view/P_generated_1"
    ]);
    expect(JSON.stringify(created)).not.toMatch(
      /accessToken|Authorization|Bearer/
    );

    const repeated = await service.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });
    expect(repeated.batchId).toBe(created.batchId);
    expect(runtime.createCalls).toHaveLength(4);
    expect(repeated.items.map((item) => item.projectId)).toEqual(
      created.items.map((item) => item.projectId)
    );
  });

  it.each([2, 4, 6])(
    "%i문제를 요청하면 정확히 같은 수의 새 캔버스를 계획한다",
    (problemCount) => {
      const result = recommend(createService(), problemCount);
      expect(result.activitySetSummary?.canvasCount).toBe(problemCount);
      expect(result.teacherAnswerKey).toHaveLength(problemCount);
    }
  );

  it("지원하지 않는 요청은 draft를 만들지 않는다", () => {
    const result = createService().recommend({
      prompt: "원의 넓이 활동지를 만들어 주세요."
    });
    expect(result.supported).toBe(false);
    expect(result.draftId).toBeUndefined();
  });

  it("중간 실패 뒤 성공한 캔버스는 건너뛰고 빠진 항목부터 다시 만든다", async () => {
    const runtime = new FakeBrowserRuntime(undefined, [
      successResult(1),
      {
        ok: false,
        completedAt: "2026-07-29T04:00:02.000Z",
        errorCode: "login-required",
        httpStatus: 401
      }
    ]);
    const service = createService(runtime);
    const draft = recommend(service);
    const first = await service.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });

    expect(first.status).toBe("partial");
    expect(first.items.map((item) => item.status)).toEqual([
      "succeeded",
      "failed",
      "queued",
      "queued"
    ]);
    expect(service.getBatchStatus(first.batchId).message).toContain(
      "빠진 항목"
    );
    expect(runtime.openedEditorUrls).toHaveLength(0);

    runtime.creationResults.push(
      successResult(2),
      successResult(3),
      successResult(4)
    );
    const retried = await service.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });
    expect(retried.status).toBe("succeeded");
    expect(retried.items[0]?.projectId).toBe("P_generated_1");
    expect(runtime.createCalls).toHaveLength(5);
    expect(runtime.openedEditorUrls).toEqual([
      "https://mathcanvas.vivasam.com/ko/view/P_generated_1"
    ]);
  });

  it("같은 승인 요청이 동시에 와도 캔버스를 중복 생성하지 않는다", async () => {
    let releaseFirstCreation: (() => void) | undefined;
    const runtime = new FakeBrowserRuntime();
    runtime.firstCreationGate = new Promise<void>((resolve) => {
      releaseFirstCreation = resolve;
    });
    const service = createService(runtime);
    const draft = recommend(service);
    const input = {
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    };

    const first = service.createActivitySet(input);
    await vi.waitFor(() => {
      expect(runtime.createCalls).toHaveLength(1);
    });
    const second = service.createActivitySet(input);
    releaseFirstCreation?.();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.batchId).toBe(secondResult.batchId);
    expect(runtime.createCalls).toHaveLength(4);
    expect(
      new Set(firstResult.items.map((item) => item.projectId)).size
    ).toBe(4);
  });

  it("서버 재시작 뒤 같은 배치를 다시 외부 쓰기 하지 않는다", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-managed-jobs-"));
    const jobSnapshotPath = join(directory, "creation-jobs.json");
    const draftSnapshotPath = join(directory, "drafts.json");
    const firstRuntime = new FakeBrowserRuntime();
    const firstService = createService(
      firstRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draftSnapshotPath
    );
    const draft = recommend(firstService);
    const created = await firstService.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });
    expect(firstRuntime.createCalls).toHaveLength(4);

    const restartedRuntime = new FakeBrowserRuntime();
    const restartedService = createService(
      restartedRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draftSnapshotPath
    );
    const repeated = await restartedService.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });
    expect(repeated.batchId).toBe(created.batchId);
    expect(repeated.items[0]?.projectId).toBe("P_generated_1");
    expect(restartedRuntime.createCalls).toHaveLength(0);
    expect(restartedRuntime.openedEditorUrls).toEqual([
      "https://mathcanvas.vivasam.com/ko/view/P_generated_1"
    ]);
  });

  it("저장된 작업 payload가 바뀌면 재시작 복구 중 외부 쓰기를 막는다", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-tamper-"));
    const jobSnapshotPath = join(directory, "creation-jobs.json");
    const draftSnapshotPath = join(directory, "drafts.json");
    const firstService = createService(
      new FakeBrowserRuntime(),
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draftSnapshotPath
    );
    const draft = recommend(firstService);
    await firstService.createActivitySet({
      draftId: draft.draftId!,
      setHash: draft.setHash!,
      teacherConfirmed: true
    });

    const snapshot = JSON.parse(
      readFileSync(jobSnapshotPath, "utf8")
    ) as {
      jobs: Array<{
        status: string;
        result?: unknown;
        job: {
          payloadHash: string;
          compiledProject: {
            payloadHash: string;
            payload: Record<string, unknown>;
          };
          validationReport: { compiledPayloadHash: string };
        };
      }>;
    };
    const stored = snapshot.jobs[0]!;
    stored.job.compiledProject.payload.projectTitle = "바뀐 활동지";
    const tamperedHash = sha256Hex(stored.job.compiledProject.payload);
    stored.job.payloadHash = tamperedHash;
    stored.job.compiledProject.payloadHash = tamperedHash;
    stored.job.validationReport.compiledPayloadHash = tamperedHash;
    stored.status = "creating";
    delete stored.result;
    writeFileSync(jobSnapshotPath, JSON.stringify(snapshot));

    const draftSnapshot = JSON.parse(
      readFileSync(draftSnapshotPath, "utf8")
    ) as {
      drafts: Array<{
        batch: {
          status: string;
          items: Array<{
            canvasIndex: number;
            status: string;
          }>;
        };
      }>;
    };
    const firstItem = draftSnapshot.drafts[0]!.batch.items[0]!;
    firstItem.status = "creating";
    draftSnapshot.drafts[0]!.batch.status = "creating";
    writeFileSync(draftSnapshotPath, JSON.stringify(draftSnapshot));

    const runtime = new FakeBrowserRuntime();
    const restarted = createService(
      runtime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draftSnapshotPath
    );
    await expect(
      restarted.createActivitySet({
        draftId: draft.draftId!,
        setHash: draft.setHash!,
        teacherConfirmed: true
      })
    ).rejects.toThrow("안전하게 중단");
    expect(runtime.createCalls).toHaveLength(0);
  });
});
