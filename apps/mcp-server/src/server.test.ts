import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { manipulationSchema } from "@mathcanvas/contracts";
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
  it("확장 프로그램 없는 여섯 도구를 등록한다", async () => {
    const client = await connectedClient();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "mathcanvas_check_connection",
      "mathcanvas_create_new_project",
      "mathcanvas_get_job_status",
      "mathcanvas_open_workspace",
      "mathcanvas_recommend_activity",
      "mathcanvas_recommend_from_lesson_bundle"
    ]);
    expect(JSON.stringify(tools)).not.toContain("확장 프로그램");
    const recommendTool = tools.tools.find(
      (tool) => tool.name === "mathcanvas_recommend_activity"
    );
    expect(JSON.stringify(recommendTool?.inputSchema)).toContain(
      "denominatorRelation"
    );
    expect(JSON.stringify(recommendTool?.inputSchema)).toContain(
      "teacherIntent"
    );
    expect(JSON.stringify(tools)).not.toMatch(
      /rawPayload|contentsJson|absoluteCoordinates|nativeToolId|toolKey/
    );
  });

  it("검증된 활동지 근거로는 외부 프로젝트를 재사용하지 않고 새 활동만 준비한다", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "mathcanvas_recommend_from_lesson_bundle",
      arguments: {
        schemaVersion: 1,
        intakeId: "g3s1-multiplication-array-transfer-65be8eb9",
        generatedAt: "2026-08-07T22:18:22.541Z",
        sourcePolicy: {
          reusableProjectSource: "owner-manual-curated",
          generatedProjectSource: "owner-mathcanvas-ai",
          prototypeProjectReuse: false,
          externalProjectReuse: false
        },
        lesson: {
          lessonId: "g3s1-multiplication-array-transfer",
          title: "줄과 칸으로 전체 수 찾기",
          gradeLabel: "초등 3학년 1학기",
          unit: "1. 곱셈",
          targetBehavior:
            "같은 묶음을 곱셈으로 나타내고 식과 한 문장으로 근거를 설명한다.",
          worksheetTitle: "줄과 칸으로 전체 수 찾기 통합 활동지",
          curriculumAnchorIds: ["[4수01-04]"]
        },
        worksheet: {
          filename:
            "g3s1-multiplication-array-transfer-worksheet.png",
          sha256:
            "65be8eb9aeac51dab319f53c21993bb9d1a5a87f6852116213e99ec68be0d9c8",
          width: 1024,
          height: 1536,
          inspectedAt: "2026-08-07T22:11:21.000Z",
          visualQa: {
            logoTitleSeparated: true,
            allQuestionTextLegible: true,
            choicesVisuallySeparated: true,
            answerSpacesPresent: true,
            noOverlapsOrClipping: true
          }
        },
        mathEvidence: {
          answerLabels: ["3×4=12자루", "6×7=42개"],
          misconceptions: [
            "한 묶음의 수와 묶음 수를 곱하지 않고 더한다."
          ],
          visualSummary: [
            "한 봉지에 3자루씩 4봉지",
            "한 줄에 6개씩 7줄"
          ]
        },
        recommendation: { problemCount: 2, difficulty: "normal" }
      }
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      route: "create-new-owner-project",
      sourcePolicy: {
        reusableProjectSource: "owner-manual-curated",
        prototypeProjectReuse: false,
        externalProjectReuse: false
      }
    });
    expect(JSON.stringify(result.structuredContent)).toContain(
      "number.multiplication.group-array-meaning-v1"
    );
    expect(result.structuredContent).toMatchObject({
      recommendation: {
        recommendation: { recommendedGrade: 3 }
      }
    });
  });

  it("추천 도구의 조작 방식 목록이 계약 스키마와 어긋나지 않는다", async () => {
    const client = await connectedClient();
    const tools = await client.listTools();
    const recommendTool = tools.tools.find(
      (tool) => tool.name === "mathcanvas_recommend_activity"
    );
    const exposed = new Set<string>(
      (
        (
          recommendTool?.inputSchema as {
            properties?: {
              manipulation?: { enum?: unknown[] };
            };
          }
        ).properties?.manipulation?.enum ?? []
      ).map(String)
    );

    // 등록된 활동의 조작 방식은 전부 MCP로도 요청할 수 있어야 한다.
    // 활동을 추가하고 이 목록을 갱신하지 않으면 MCP에서만 접근이 막힌다.
    const contracted = new Set<string>(manipulationSchema.options);
    expect([...contracted].filter((value) => !exposed.has(value))).toEqual([]);
    expect([...exposed].filter((value) => !contracted.has(value))).toEqual([]);
    expect(exposed.size).toBe(contracted.size);
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

  it("출시 활동 추천은 로컬 draft와 승인 안내를 반환한다", async () => {
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

  it("곱셈 TeacherIntent를 첫 문항에 반영하고 충돌하는 활동 조합은 차단한다", async () => {
    const client = await connectedClient();
    const teacherIntent = {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    };
    const result = await client.callTool({
      name: "mathcanvas_recommend_activity",
      arguments: {
        prompt: "곱셈 배열에서 두 수의 뜻을 확인하는 활동을 만들어 주세요.",
        requestedGrade: 3,
        problemCount: 2,
        manipulation: "multiplication-array-choice-drag",
        teacherIntent
      }
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: true,
      supported: true,
      recommendation: { teacherIntent }
    });
    expect(JSON.stringify(result.structuredContent)).toContain(
      "한 묶음에 아이스크림이 4개씩"
    );

    const conflict = await client.callTool({
      name: "mathcanvas_recommend_activity",
      arguments: {
        prompt: "분수 비교 활동을 만들어 주세요.",
        manipulation: "fraction-strip-common-start-drag",
        teacherIntent
      }
    });
    expect(conflict.isError).toBe(true);
    expect(conflict.structuredContent).toMatchObject({
      ok: false,
      errorCode: "teacher-intent-confirmation-required"
    });
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
