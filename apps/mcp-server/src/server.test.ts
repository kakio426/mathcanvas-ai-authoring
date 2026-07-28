import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { BridgeJobStore } from "@mathcanvas/bridge-protocol";
import { createMcpServer } from "./server.js";
import { MathCanvasAuthoringService } from "./service.js";

const closers: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

async function connectedClient() {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const service = new MathCanvasAuthoringService(new BridgeJobStore(), {
    now: () => new Date("2026-07-28T05:00:00.000Z")
  });
  const server = createMcpServer(service);
  const client = new Client({
    name: "mathcanvas-test-client",
    version: "1.0.0"
  });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport)
  ]);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}

describe("MCP 도구 seam", () => {
  it("Codex와 Claude가 사용할 네 도구를 등록한다", async () => {
    const client = await connectedClient();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "mathcanvas_check_connection",
      "mathcanvas_create_new_project",
      "mathcanvas_get_job_status",
      "mathcanvas_recommend_activity"
    ]);
  });

  it("외부 쓰기 없는 추천 도구가 로컬 draft와 승인 안내를 반환한다", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "mathcanvas_recommend_activity",
      arguments: {
        prompt:
          "분모가 다른 분수의 크기를 눈으로 비교하는 활동지를 만들어 주세요."
      }
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toContain("draft-");
    expect(JSON.stringify(result.structuredContent)).toContain(
      "이대로 만들어줘"
    );
    expect(JSON.stringify(result.structuredContent)).toContain(
      "minimumVisualDifferencePercent"
    );
    expect(JSON.stringify(result.structuredContent)).not.toContain(
      "visualModels"
    );
  });

  it("teacherConfirmed가 없으면 MCP 스키마 단계에서 쓰기를 막는다", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "mathcanvas_create_new_project",
      arguments: {
        draftId: "draft-not-approved",
        activitySpecHash: "0".repeat(64)
      }
    });
    expect(result.isError).toBe(true);
  });
});
