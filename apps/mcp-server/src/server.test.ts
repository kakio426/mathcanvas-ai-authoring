import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import {
  CreationJobStore,
  MANAGED_BROWSER_VERSION,
  type MathCanvasBrowserRuntime
} from "@mathcanvas/managed-browser";
import { createMcpServer } from "./server.js";
import { MathCanvasAuthoringService } from "./service.js";

const closers: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

async function connectedClient(runtimeOverride?: MathCanvasBrowserRuntime) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const defaultRuntime: MathCanvasBrowserRuntime = {
    async openWorkspace() {
      return {
        runtimeVersion: MANAGED_BROWSER_VERSION,
        state: "login-required",
        ready: false,
        checkedAt: "2026-07-29T05:00:00.000Z",
        currentUrl: "https://mathcanvas.vivasam.com/ko/myCanvas"
      };
    },
    async checkConnection() {
      return this.openWorkspace();
    },
    async createProject() {
      return {
        ok: true,
        completedAt: "2026-07-29T05:00:01.000Z",
        projectId: "P_mcp",
        editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_mcp"
      };
    },
    async openEditor() {},
    async close() {}
  };
  const runtime = runtimeOverride ?? defaultRuntime;
  const service = new MathCanvasAuthoringService(
    runtime,
    new CreationJobStore(),
    { now: () => new Date("2026-07-29T05:00:00.000Z") }
  );
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
  it("확장 프로그램 없는 다섯 도구를 등록한다", async () => {
    const client = await connectedClient();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "mathcanvas_check_connection",
      "mathcanvas_create_activity_set",
      "mathcanvas_get_batch_status",
      "mathcanvas_open_workspace",
      "mathcanvas_recommend_activity"
    ]);
    expect(JSON.stringify(tools)).not.toContain("확장 프로그램");
  });

  it("전용 Chrome 열기 도구가 로그인 위치를 반환한다", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "mathcanvas_open_workspace",
      arguments: {}
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toContain(
      "login-required"
    );
    expect(JSON.stringify(result.structuredContent)).toContain("내 캔버스");
  });

  it("추천 도구가 로컬 draft와 승인 안내를 반환한다", async () => {
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
    expect(JSON.stringify(result.structuredContent)).not.toContain(
      "visualModels"
    );
  });

  it("teacherConfirmed가 없으면 MCP 스키마 단계에서 쓰기를 막는다", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "mathcanvas_create_activity_set",
      arguments: {
        draftId: "draft-not-approved",
        setHash: "0".repeat(64)
      }
    });
    expect(result.isError).toBe(true);
  });

  it("브라우저 도구 예외도 인증 문자열을 지우고 MCP 오류로 반환한다", async () => {
    const runtime: MathCanvasBrowserRuntime = {
      async openWorkspace() {
        throw new Error(
          "Authorization: Bearer secret-browser-token-1234567890"
        );
      },
      async checkConnection() {
        return this.openWorkspace();
      },
      async createProject() {
        throw new Error("not used");
      },
      async openEditor() {},
      async close() {}
    };
    const client = await connectedClient(runtime);
    const result = await client.callTool({
      name: "mathcanvas_open_workspace",
      arguments: {}
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).not.toContain(
      "secret-browser-token"
    );
    expect(JSON.stringify(result.content)).toContain("[REDACTED]");
    expect(JSON.stringify(result.structuredContent)).toContain(
      "unexpected-error"
    );
  });
});
