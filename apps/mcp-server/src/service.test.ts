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
import {
  writeVerifiedDraftFixture
} from "../../../tests/helpers/verified-draft-fixture.js";
import { MathCanvasAuthoringService } from "./service.js";

const fixedClock = {
  now: () => new Date("2026-07-29T04:00:00.000Z")
};

class FakeBrowserRuntime implements MathCanvasBrowserRuntime {
  public createCalls = 0;
  public openCalls = 0;
  public closeCalls = 0;

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

  public async close(): Promise<void> {
    this.closeCalls += 1;
  }
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
  it("v1·v2 저장 draft는 묵시 변환하지 않고 만료 오류로 격리한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-v1-draft-"));
    const snapshotPath = join(directory, "drafts.json");
    for (const version of [1, 2]) {
      writeFileSync(snapshotPath, JSON.stringify({ version, drafts: [] }));
      expect(() =>
        createService(
          new FakeBrowserRuntime(),
          new CreationJobStore(),
          snapshotPath
        )
      ).toThrow("이전 추천안 형식은 만료");
    }
  });

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
    expect(runtime.closeCalls).toBe(1);
    expect(status.ready).toBe(false);
    expect(status.message).toContain("전용 Chrome");
    expect(status.message).toContain("내 캔버스");
  });

  it("교사 승인과 동일한 해시로만 출시 활동을 한 번 생성한다", async () => {
    const runtime = new FakeBrowserRuntime();
    const directory = mkdtempSync(
      join(tmpdir(), "mathcanvas-service-verified-")
    );
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const service = createService(
      runtime,
      new CreationJobStore(),
      draft.snapshotPath
    );
    await expect(
      service.createNewProject({
        draftId: draft.draftId,
        activitySpecHash: draft.activitySpecHash,
        teacherConfirmed: false
      })
    ).rejects.toThrow("명시적으로 승인");
    await expect(
      service.createNewProject({
        draftId: draft.draftId,
        activitySpecHash: "0".repeat(64),
        teacherConfirmed: true
      })
    ).rejects.toThrow("다릅니다");
    const created = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(created).toMatchObject({
      status: "succeeded",
      projectId: "P_generated",
      editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_generated"
    });
    expect(created.validation.canCreate).toBe(true);
    expect(created.teacherAnswerKey).toHaveLength(4);
    expect(runtime.createCalls).toBe(1);
    const repeated = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
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
    const directory = mkdtempSync(
      join(tmpdir(), "mathcanvas-service-browser-failure-")
    );
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const service = createService(
      runtime,
      new CreationJobStore(),
      draft.snapshotPath
    );
    const created = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(created.status).toBe("failed");
    expect(service.getJobStatus(created.jobId).message).toContain(
      "다시 로그인"
    );
    expect(runtime.createCalls).toBe(1);
  });

  it("로그인 실패 뒤 같은 추천안으로 다시 생성할 수 있다", async () => {
    const runtime = new FakeBrowserRuntime(undefined, {
      ok: false,
      completedAt: "2026-07-29T04:00:01.000Z",
      errorCode: "login-required",
      httpStatus: 401
    });
    const directory = mkdtempSync(
      join(tmpdir(), "mathcanvas-service-retry-")
    );
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const service = createService(
      runtime,
      new CreationJobStore(),
      draft.snapshotPath
    );
    const first = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
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
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(retried).toMatchObject({
      status: "succeeded",
      projectId: "P_retry"
    });
    expect(retried.activitySpecHash).toBe(draft.activitySpecHash);
    expect(retried.teacherAnswerKey).toEqual(first.teacherAnswerKey);
    expect(runtime.createCalls).toBe(2);
  });

  it("서버 재시작 뒤 같은 승인 결과를 다시 외부 쓰기 하지 않는다", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-managed-jobs-"));
    const jobSnapshotPath = join(directory, "creation-jobs.json");
    const firstRuntime = new FakeBrowserRuntime();
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const firstService = createService(
      firstRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draft.snapshotPath
    );
    const created = await firstService.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(firstRuntime.createCalls).toBe(1);

    const restartedRuntime = new FakeBrowserRuntime();
    const restartedService = createService(
      restartedRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draft.snapshotPath
    );
    const repeated = await restartedService.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(repeated.jobId).toBe(created.jobId);
    expect(repeated.projectId).toBe("P_generated");
    expect(restartedRuntime.createCalls).toBe(0);
  });

  it("저장된 추천안이 바뀌면 재시작 중 격리한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-tamper-"));
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const snapshot = JSON.parse(
      readFileSync(draft.snapshotPath, "utf8")
    ) as {
      drafts: Array<{
        resolved: {
          title: string;
        };
      }>;
    };
    snapshot.drafts[0]!.resolved.title = "바뀐 활동지";
    writeFileSync(draft.snapshotPath, JSON.stringify(snapshot));

    const runtime = new FakeBrowserRuntime();
    expect(() =>
      createService(
        runtime,
        new CreationJobStore(),
        draft.snapshotPath
      )
    ).toThrow("올바르지 않습니다");
    expect(runtime.createCalls).toBe(0);
  });
});
