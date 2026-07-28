import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { redactSensitiveText } from "@mathcanvas/contracts";
import { PlanningError } from "@mathcanvas/planner";
import {
  AuthoringServiceError,
  MathCanvasAuthoringService
} from "./service.js";

function toolResult(value: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value
  };
}

function toolError(error: unknown) {
  const value = {
    ok: false,
    errorCode:
      error instanceof AuthoringServiceError
        ? error.code
        : error instanceof PlanningError
          ? error.code
        : "unexpected-error",
    message:
      error instanceof Error
        ? redactSensitiveText(error.message)
        : "알 수 없는 오류가 생겼습니다."
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
    isError: true
  };
}

export function createMcpServer(service: MathCanvasAuthoringService): McpServer {
  const server = new McpServer(
    { name: "mathcanvas-ai-authoring", version: "0.2.0" },
    {
      instructions:
        "처음에는 mathcanvas_open_workspace로 MathCanvas 전용 Chrome을 여세요. 교사가 그 창에서 로그인하고 ‘내 캔버스’까지 이동하면 mathcanvas_check_connection으로 확인하세요. 활동 요청에는 mathcanvas_recommend_activity를 사용하고 추천안을 사용자에게 보여 주세요. 사용자가 명시적으로 승인한 뒤에만 mathcanvas_create_new_project를 호출하세요. 기존 프로젝트 수정 도구는 제공하지 않습니다."
    }
  );

  server.registerTool(
    "mathcanvas_open_workspace",
    {
      title: "MathCanvas 전용 Chrome 열기",
      description:
        "이 도구만 사용하는 전용 Chrome 창을 열고 MathCanvas 로그인 화면을 보여 줍니다. 프로젝트를 만들거나 수정하지 않습니다.",
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => {
      try {
        return toolResult({
          ok: true,
          ...(await service.openWorkspace())
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "mathcanvas_check_connection",
    {
      title: "MathCanvas 연결 확인",
      description:
        "MathCanvas 전용 Chrome의 로그인과 API 계약 상태를 읽기 전용으로 확인합니다. 창이 없으면 자동으로 열지만 프로젝트를 만들거나 수정하지 않습니다.",
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      try {
        return toolResult({
          ok: true,
          ...(await service.checkConnection())
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "mathcanvas_recommend_activity",
    {
      title: "MathCanvas 활동 추천",
      description:
        "교사 요청을 공식 교육과정과 검증된 템플릿에 맞춰 분석하고 학년, 문제 수, 난이도, 조작 방식과 교사용 정답지를 추천합니다. 승인 재개용 로컬 초안을 저장하지만 MathCanvas 프로젝트는 만들지 않습니다.",
      inputSchema: z
        .object({
          prompt: z.string().min(5).max(2000),
          requestedGrade: z.number().int().min(1).max(6).optional(),
          problemCount: z.number().int().min(2).max(6).optional(),
          difficulty: z.enum(["easy", "normal", "hard"]).optional(),
          manipulation: z
            .literal("fraction-strip-common-start-drag")
            .optional()
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (input) => {
      try {
        return toolResult({
          ok: true,
          ...service.recommend({
            prompt: input.prompt,
            ...(input.requestedGrade === undefined
              ? {}
              : { requestedGrade: input.requestedGrade }),
            ...(input.problemCount === undefined
              ? {}
              : { problemCount: input.problemCount }),
            ...(input.difficulty === undefined
              ? {}
              : { difficulty: input.difficulty }),
            ...(input.manipulation === undefined
              ? {}
              : { manipulation: input.manipulation })
          })
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "mathcanvas_create_new_project",
    {
      title: "새 MathCanvas 활동지 만들기",
      description:
        "교사가 직전에 확인한 추천안을 명시적으로 승인했을 때만 새 프로젝트를 만듭니다. 반드시 사용자가 '이대로 만들어줘'처럼 승인한 뒤 호출하세요. 기존 프로젝트는 수정하지 않습니다.",
      inputSchema: z
        .object({
          draftId: z.string().regex(/^draft-[A-Za-z0-9-]+$/),
          activitySpecHash: z.string().regex(/^[a-f0-9]{64}$/),
          teacherConfirmed: z.literal(true)
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (input) => {
      try {
        return toolResult({
          ok: true,
          ...(await service.createNewProject(input))
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "mathcanvas_get_job_status",
    {
      title: "MathCanvas 생성 상태 확인",
      description:
        "새 프로젝트 생성 작업의 진행 상태와 성공 시 편집 URL을 확인합니다. 프로젝트를 수정하지 않습니다.",
      inputSchema: z
        .object({
          jobId: z.string().regex(/^job-[A-Za-z0-9-]+$/)
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ jobId }) => {
      try {
        return toolResult({
          ok: true,
          ...service.getJobStatus(jobId)
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  return server;
}
