import { afterEach, describe, expect, it } from "vitest";
import {
  BRIDGE_PROTOCOL_VERSION,
  BridgeJobStore,
  createBridgeHttpServer
} from "@mathcanvas/bridge-protocol";
import { MathCanvasAuthoringService } from "../apps/mcp-server/src/service.js";

const servers: ReturnType<typeof createBridgeHttpServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => server.close(() => resolve()))
    )
  );
});

describe("추천부터 새 편집 화면까지의 모의 전체 흐름", () => {
  it("교사 승인 뒤 확장 프로그램이 한 번만 생성하고 성공을 돌려준다", async () => {
    const now = new Date();
    const clock = { now: () => now };
    const store = new BridgeJobStore();
    const service = new MathCanvasAuthoringService(store, clock);
    const secret = "c".repeat(64);
    const origin = "chrome-extension://mathcanvas-test";
    const instanceId = "extension-e2e";
    const server = createBridgeHttpServer({
      store,
      pairingSecret: secret
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("브리지 포트를 열지 못했습니다.");
    }
    const base = `http://127.0.0.1:${address.port}/bridge/v1`;
    const headers = {
      Origin: origin,
      "X-MathCanvas-Bridge-Secret": secret,
      "X-MathCanvas-Instance-Id": instanceId
    };

    const heartbeatResponse = await fetch(`${base}/heartbeat`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        instanceId,
        extensionVersion: "1.0.0",
        state: "ready",
        checkedAt: now.toISOString(),
        mathCanvasTabUrl:
          "https://mathcanvas.vivasam.com/ko/myCanvas",
        contractVersion: "1.0.0"
      })
    });
    expect(heartbeatResponse.status).toBe(200);
    expect(service.checkConnection().ready).toBe(true);

    const draft = service.recommend({
      prompt:
        "분모가 다른 분수의 크기를 분수 띠로 직접 비교하는 활동지를 만들어 주세요.",
      requestedGrade: 5,
      problemCount: 4,
      difficulty: "normal"
    });
    expect(draft.supported).toBe(true);

    const creation = service.createNewProject({
      draftId: draft.draftId!,
      activitySpecHash: draft.activitySpecHash!,
      teacherConfirmed: true
    });
    expect(creation.validation.canCreate).toBe(true);

    const claimResponse = await fetch(`${base}/jobs/next`, { headers });
    expect(claimResponse.status).toBe(200);
    const claim = (await claimResponse.json()) as {
      job: {
        jobId: string;
        payloadHash: string;
        compiledProject: {
          payload: Record<string, unknown>;
        };
      };
    };
    expect(claim.job.jobId).toBe(creation.jobId);
    expect(claim.job.compiledProject.payload).toMatchObject({
      categoryId: "rJa0d46MAy",
      isNoteworthy: false,
      studyLevel: "elementary"
    });
    expect(JSON.stringify(claim)).not.toMatch(
      /accessToken|Authorization|Bearer|password/i
    );

    const projectId = "P_e2eGenerated";
    const editorUrl =
      `https://mathcanvas.vivasam.com/ko/view/${projectId}`;
    const completedAt = new Date(now.getTime() + 1000).toISOString();
    const completion = {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      jobId: claim.job.jobId,
      instanceId,
      payloadHash: claim.job.payloadHash,
      ok: true,
      completedAt,
      projectId,
      editorUrl
    };
    const resultResponse = await fetch(
      `${base}/jobs/${claim.job.jobId}/result`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(completion)
      }
    );
    expect(resultResponse.status).toBe(200);

    const status = service.getJobStatus(creation.jobId);
    expect(status).toMatchObject({
      found: true,
      status: "succeeded",
      projectId,
      editorUrl
    });

    const retry = await fetch(`${base}/jobs/next`, { headers });
    expect((await retry.json()) as { job: unknown }).toEqual({ job: null });
  });
});
