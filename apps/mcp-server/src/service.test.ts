import {
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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

class FakeBrowserRuntime implements MathCanvasBrowserRuntime {
  public createCalls = 0;
  public openCalls = 0;

  public constructor(
    public connection: BrowserConnection = {
      runtimeVersion: MANAGED_BROWSER_VERSION,
      state: "ready",
      ready: true,
      checkedAt: fixedClock.now().toISOString(),
      currentUrl: "https://mathcanvas.vivasam.com/ko/myCanvas"
    },
    public creationResult: CreationResult = {
      ok: true,
      completedAt: "2026-07-29T04:00:01.000Z",
      projectId: "P_generated",
      editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_generated"
    }
  ) {}

  public async openWorkspace(): Promise<BrowserConnection> {
    this.openCalls += 1;
    return this.connection;
  }

  public async checkConnection(): Promise<BrowserConnection> {
    return this.connection;
  }

  public async createProject(): Promise<CreationResult> {
    this.createCalls += 1;
    return this.creationResult;
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

  it("추천 뒤 교사 승인과 같은 해시가 있어야 새 프로젝트를 만든다", async () => {
    const runtime = new FakeBrowserRuntime();
    const service = createService(runtime);
    const draft = service.recommend({
      prompt:
        "분모가 다른 분수의 크기를 눈으로 비교하는 활동지를 만들어 주세요."
    });
    expect(draft.supported).toBe(true);
    await expect(
      service.createNewProject({
        draftId: draft.draftId!,
        activitySpecHash: draft.activitySpecHash!,
        teacherConfirmed: false
      })
    ).rejects.toThrow("명시적으로 승인");
    await expect(
      service.createNewProject({
        draftId: draft.draftId!,
        activitySpecHash: "0".repeat(64),
        teacherConfirmed: true
      })
    ).rejects.toThrow("다릅니다");

    const created = await service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(created.status).toBe("succeeded");
    expect(created.validation.canCreate).toBe(true);
    expect(created.teacherAnswerKey).toHaveLength(4);
    expect(created.teacherAnswerKey[0]?.explanation).toContain("통분하면");
    expect(created.projectId).toBe("P_generated");
    expect(created.editorUrl).toContain("/ko/view/P_generated");
    expect(runtime.createCalls).toBe(1);
    expect(JSON.stringify(created)).not.toMatch(
      /accessToken|Authorization|Bearer/
    );

    const repeated = await service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(repeated.jobId).toBe(created.jobId);
    expect(runtime.createCalls).toBe(1);
  });

  it("지원하지 않는 요청은 draft를 만들지 않는다", () => {
    const result = createService().recommend({
      prompt: "원의 넓이 활동지를 만들어 주세요."
    });
    expect(result.supported).toBe(false);
    expect(result.draftId).toBeUndefined();
  });

  it("브라우저 실패 코드를 교사가 행동할 수 있는 안내로 바꾼다", async () => {
    const runtime = new FakeBrowserRuntime(undefined, {
      ok: false,
      completedAt: "2026-07-29T04:00:01.000Z",
      errorCode: "login-required",
      httpStatus: 401
    });
    const service = createService(runtime);
    const draft = service.recommend({
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
    });
    const created = await service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(created.status).toBe("failed");
    expect(service.getJobStatus(created.jobId).message).toContain(
      "다시 로그인"
    );
  });

  it("로그인 실패 뒤 같은 추천안과 같은 문제로 다시 생성할 수 있다", async () => {
    const runtime = new FakeBrowserRuntime(undefined, {
      ok: false,
      completedAt: "2026-07-29T04:00:01.000Z",
      errorCode: "login-required",
      httpStatus: 401
    });
    const service = createService(runtime);
    const draft = service.recommend({
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
    });
    const first = await service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(first.status).toBe("failed");

    runtime.creationResult = {
      ok: true,
      completedAt: "2026-07-29T04:00:02.000Z",
      projectId: "P_retry",
      editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_retry"
    };
    const retried = await service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(retried.status).toBe("succeeded");
    expect(retried.projectId).toBe("P_retry");
    expect(retried.activitySpecHash).toBe(draft.activitySpecHash);
    expect(retried.teacherAnswerKey).toEqual(first.teacherAnswerKey);
    expect(runtime.createCalls).toBe(2);
  });

  it("서버 재시작 뒤 같은 승인 결과를 다시 외부 쓰기 하지 않는다", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-managed-jobs-"));
    const jobSnapshotPath = join(directory, "creation-jobs.json");
    const draftSnapshotPath = join(directory, "drafts.json");
    const firstRuntime = new FakeBrowserRuntime();
    const firstService = createService(
      firstRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draftSnapshotPath
    );
    const draft = firstService.recommend({
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
    });
    const created = await firstService.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(firstRuntime.createCalls).toBe(1);

    const restartedRuntime = new FakeBrowserRuntime();
    const restartedService = createService(
      restartedRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draftSnapshotPath
    );
    const repeated = await restartedService.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(repeated.jobId).toBe(created.jobId);
    expect(repeated.projectId).toBe("P_generated");
    expect(restartedRuntime.createCalls).toBe(0);
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
    const draft = firstService.recommend({
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
    });
    await firstService.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
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

    const runtime = new FakeBrowserRuntime();
    const restarted = createService(
      runtime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draftSnapshotPath
    );
    await expect(
      restarted.createNewProject({
        draftId: draft.draftId!,
        activitySpecHash: draft.activitySpecHash!,
        teacherConfirmed: true
      })
    ).rejects.toThrow("안전하게 중단");
    expect(runtime.createCalls).toBe(0);
  });
});
