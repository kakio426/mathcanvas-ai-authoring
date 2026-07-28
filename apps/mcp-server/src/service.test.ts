import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BRIDGE_PROTOCOL_VERSION,
  BridgeJobStore
} from "@mathcanvas/bridge-protocol";
import { MathCanvasAuthoringService } from "./service.js";

const fixedClock = {
  now: () => new Date("2026-07-28T04:00:00.000Z")
};

describe("MCP 서비스 흐름", () => {
  it("연결이 없으면 정확한 준비 안내를 돌려준다", () => {
    const service = new MathCanvasAuthoringService(
      new BridgeJobStore(),
      fixedClock
    );
    const status = service.checkConnection();
    expect(status.ready).toBe(false);
    expect(status.message).toContain("내 캔버스");
  });

  it("추천 뒤 교사 승인과 같은 해시가 있어야 작업을 등록한다", () => {
    const store = new BridgeJobStore();
    store.recordHeartbeat({
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      instanceId: "extension-test",
      extensionVersion: "1.0.0",
      state: "ready",
      checkedAt: "2026-07-28T04:00:00.000Z",
      mathCanvasTabUrl: "https://mathcanvas.vivasam.com/ko/myCanvas",
      contractVersion: "1.0.0"
    });
    const service = new MathCanvasAuthoringService(store, fixedClock);
    const draft = service.recommend({
      prompt: "분모가 다른 분수의 크기를 눈으로 비교하는 활동지를 만들어 주세요."
    });
    expect(draft.supported).toBe(true);
    expect(() =>
      service.createNewProject({
        draftId: draft.draftId!,
        activitySpecHash: draft.activitySpecHash!,
        teacherConfirmed: false
      })
    ).toThrow("명시적으로 승인");
    expect(() =>
      service.createNewProject({
        draftId: draft.draftId!,
        activitySpecHash: "0".repeat(64),
        teacherConfirmed: true
      })
    ).toThrow("다릅니다");

    const created = service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(created.status).toBe("queued");
    expect(created.validation.canCreate).toBe(true);
    expect(created.teacherAnswerKey).toHaveLength(4);
    expect(created.teacherAnswerKey[0]?.answer).toMatch(
      /^\d+\/\d+ [<>] \d+\/\d+$/
    );
    expect(JSON.stringify(created)).not.toMatch(
      /accessToken|Authorization|Bearer/
    );
    expect(service.getJobStatus(created.jobId).status).toBe("queued");

    const repeated = service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(repeated.jobId).toBe(created.jobId);
    expect(repeated.payloadHash).toBe(created.payloadHash);
    expect(repeated.message).toContain("이미");
  });

  it("지원하지 않는 요청은 draft를 만들지 않는다", () => {
    const service = new MathCanvasAuthoringService(
      new BridgeJobStore(),
      fixedClock
    );
    const result = service.recommend({
      prompt: "원의 넓이 활동지를 만들어 주세요."
    });
    expect(result.supported).toBe(false);
    expect(result.draftId).toBeUndefined();
  });

  it("실패 코드를 교사가 바로 행동할 수 있는 안내로 바꾼다", () => {
    const store = new BridgeJobStore();
    const service = new MathCanvasAuthoringService(store, fixedClock);
    const draft = service.recommend({
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
    });
    const created = service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    const claimed = store.claimNext("extension-test", fixedClock.now())!;
    store.complete({
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      jobId: claimed.jobId,
      instanceId: "extension-test",
      payloadHash: claimed.payloadHash,
      ok: false,
      completedAt: "2026-07-28T04:00:01.000Z",
      errorCode: "login-required",
      httpStatus: 401
    });
    expect(service.getJobStatus(created.jobId).message).toContain(
      "다시 로그인"
    );
  });

  it("서버가 재시작되어도 creating 작업을 같은 ID로 이어간다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-jobs-"));
    const snapshotPath = join(directory, "bridge-jobs.json");
    const draftSnapshotPath = join(directory, "drafts.json");
    const firstStore = new BridgeJobStore({ snapshotPath });
    const firstService = new MathCanvasAuthoringService(
      firstStore,
      fixedClock,
      { draftSnapshotPath }
    );
    const draft = firstService.recommend({
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
    });
    const created = firstService.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    const firstClaim = firstStore.claimNext(
      "extension-persistent",
      fixedClock.now()
    )!;

    const restartedStore = new BridgeJobStore({ snapshotPath });
    const repeatedClaim = restartedStore.claimNext(
      "extension-persistent",
      fixedClock.now()
    )!;
    expect(repeatedClaim.jobId).toBe(firstClaim.jobId);
    expect(repeatedClaim.jobId).toBe(created.jobId);

    const restartedService = new MathCanvasAuthoringService(
      restartedStore,
      {
        now: () => new Date("2026-07-28T04:01:00.000Z")
      },
      { draftSnapshotPath }
    );
    const deduplicated = restartedService.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(deduplicated.jobId).toBe(created.jobId);
    expect(deduplicated.status).toBe("creating");

    restartedStore.complete({
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      jobId: repeatedClaim.jobId,
      instanceId: "extension-persistent",
      payloadHash: repeatedClaim.payloadHash,
      ok: true,
      completedAt: "2026-07-28T04:00:02.000Z",
      projectId: "P_persisted",
      editorUrl:
        "https://mathcanvas.vivasam.com/ko/view/P_persisted"
    });

    const newDraft = restartedService.recommend({
      prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
    });
    const newCreation = restartedService.createNewProject({
      draftId: newDraft.draftId!,
      activitySpecHash: newDraft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(newCreation.jobId).not.toBe(created.jobId);
    expect(newCreation.payloadHash).not.toBe(created.payloadHash);

    const finalStore = new BridgeJobStore({ snapshotPath });
    expect(finalStore.getStatus(created.jobId, fixedClock.now())).toMatchObject({
      status: "succeeded",
      result: { projectId: "P_persisted" }
    });
  });

  it("완료 작업 스냅샷을 설정한 개수로 제한한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-prune-"));
    const snapshotPath = join(directory, "bridge-jobs.json");
    const store = new BridgeJobStore({
      snapshotPath,
      maxStoredJobs: 2
    });
    const service = new MathCanvasAuthoringService(store, fixedClock);
    const completedIds: string[] = [];

    for (let index = 0; index < 3; index += 1) {
      const draft = service.recommend({
        prompt:
          "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
      });
      const created = service.createNewProject({
        draftId: draft.draftId!,
        activitySpecHash: draft.activitySpecHash!,
        teacherConfirmed: true
      });
      const claimed = store.claimNext("extension-prune", fixedClock.now())!;
      store.complete({
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        jobId: claimed.jobId,
        instanceId: "extension-prune",
        payloadHash: claimed.payloadHash,
        ok: true,
        completedAt: `2026-07-28T04:00:0${index}.000Z`,
        projectId: `P_pruned_${index}`,
        editorUrl:
          `https://mathcanvas.vivasam.com/ko/view/P_pruned_${index}`
      });
      completedIds.push(created.jobId);
    }

    const restarted = new BridgeJobStore({
      snapshotPath,
      maxStoredJobs: 2
    });
    expect(restarted.getStatus(completedIds[0]!)).toBeNull();
    expect(restarted.getStatus(completedIds[1]!)).not.toBeNull();
    expect(restarted.getStatus(completedIds[2]!)).not.toBeNull();
  });

  it("스냅샷이 없는 메모리 모드에서도 완료 작업 상한을 적용한다", () => {
    const store = new BridgeJobStore({ maxStoredJobs: 1 });
    const service = new MathCanvasAuthoringService(store, fixedClock);
    const completedIds: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const draft = service.recommend({
        prompt:
          "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요."
      });
      const created = service.createNewProject({
        draftId: draft.draftId!,
        activitySpecHash: draft.activitySpecHash!,
        teacherConfirmed: true
      });
      const claimed = store.claimNext("extension-memory", fixedClock.now())!;
      store.complete({
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        jobId: claimed.jobId,
        instanceId: "extension-memory",
        payloadHash: claimed.payloadHash,
        ok: true,
        completedAt: `2026-07-28T04:01:0${index}.000Z`,
        projectId: `P_memory_${index}`,
        editorUrl:
          `https://mathcanvas.vivasam.com/ko/view/P_memory_${index}`
      });
      completedIds.push(created.jobId);
    }
    expect(store.getStatus(completedIds[0]!)).toBeNull();
    expect(store.getStatus(completedIds[1]!)).not.toBeNull();
  });
});
