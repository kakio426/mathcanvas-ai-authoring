import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  denominatorRelationSchema,
  difficultySchema,
  familyIdSchema,
  officialElementaryStandardSchema,
  problemFamilyManipulationSchema,
  problemParametersSchema,
  redactSensitiveText,
  teacherIntentSchema
} from "@mathcanvas/contracts";
import { PlanningError } from "@mathcanvas/planner";
import {
  AuthoringServiceError,
  MathCanvasAuthoringService
} from "./service.js";
import {
  buildLessonBundleRecommendationInput,
  lessonBundleWorksheetIntakeSchema,
  projectLessonBundleRecommendation
} from "./lesson-bundle.js";

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
        "처음에는 mathcanvas_open_workspace로 로그인 상태를 확인하세요. 로그인이 필요하면 전용 로그인 절차를 안내하고, 완료 후 mathcanvas_check_connection으로 확인하세요. 일반 활동 요청에는 mathcanvas_recommend_activity를 사용하세요. 수업 꾸러미는 먼저 선생님의 수동 제작본 허용 목록을 확인하고, 일치하는 항목이 없을 때만 mathcanvas_recommend_from_lesson_bundle을 사용하세요. 사용자가 명시적으로 승인한 뒤에만 mathcanvas_create_new_project를 호출하세요. 다른 사람의 프로젝트와 기존 AI 프로토타입 프로젝트는 재사용하지 않으며 기존 프로젝트 수정 도구는 제공하지 않습니다."
    }
  );

  server.registerTool(
    "mathcanvas_open_workspace",
    {
      title: "MathCanvas 로그인 상태 확인",
      description:
        "전용 headless Chrome에서 MathCanvas 로그인 상태를 확인합니다. 사용자 화면을 점유하거나 프로젝트를 만들거나 수정하지 않습니다.",
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
        "교사 요청을 공식 교육과정과 released ProblemFamily registry에 맞춰 분석하고 학년, 문제 수, 난이도, 조작 방식과 교사용 정답지를 추천합니다. problemParameters는 familyId와 역할 있는 조건값을 전달하며 registry가 선언한 범위 밖 조건은 확인 질문으로 차단합니다. teacherIntent는 기존 클라이언트 호환 입력입니다. 지원하지 않는 자유문장 조건을 임의로 채우지 마세요. 승인 재개용 로컬 초안을 저장하지만 MathCanvas 프로젝트는 만들지 않습니다.",
      inputSchema: z
        .object({
          prompt: z.string().min(5).max(2000),
          requestedFamilyId: familyIdSchema
            .describe(
              "ProblemFamily registry의 canonical familyId입니다. 같은 성취기준에 여러 문제군이 있을 때 이 값으로 선택합니다."
            )
            .optional(),
          requestedStandardCode: officialElementaryStandardSchema.shape.code
            .describe("2022 개정 초등 수학 공식 성취기준 코드입니다.")
            .optional(),
          requestedGrade: z.number().int().min(1).max(6).optional(),
          problemCount: z.number().int().min(1).max(6).optional(),
          difficulty: difficultySchema.optional(),
          denominatorRelation: denominatorRelationSchema.optional(),
          // 신규 family의 조작 문자열은 수동 enum에 추가하지 않는다. 실제 route
          // 지원 여부는 canonical ProblemFamily registry가 서버에서 검증한다.
          manipulation: problemFamilyManipulationSchema.optional(),
          problemParameters: problemParametersSchema
            .describe(
              "ProblemFamily registry의 familyId와 역할 있는 조건값입니다. registry에 없는 family·필드·값은 추측하거나 버리지 않고 거부합니다."
            )
            .optional(),
          teacherIntent: teacherIntentSchema
            .describe(
              "기존 클라이언트 호환 입력입니다. 새 호출은 problemParameters를 우선 사용하세요."
            )
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
            ...(input.requestedFamilyId === undefined
              ? {}
              : { requestedFamilyId: input.requestedFamilyId }),
            ...(input.requestedStandardCode === undefined
              ? {}
              : { requestedStandardCode: input.requestedStandardCode }),
            ...(input.requestedGrade === undefined
              ? {}
              : { requestedGrade: input.requestedGrade }),
            ...(input.problemCount === undefined
              ? {}
              : { problemCount: input.problemCount }),
            ...(input.difficulty === undefined
              ? {}
              : { difficulty: input.difficulty }),
            ...(input.denominatorRelation === undefined
              ? {}
              : {
                  denominatorRelation:
                    input.denominatorRelation
                }),
            ...(input.manipulation === undefined
              ? {}
              : { manipulation: input.manipulation }),
            ...(input.problemParameters === undefined
              ? {}
              : { problemParameters: input.problemParameters }),
            ...(input.teacherIntent === undefined
              ? {}
              : { teacherIntent: input.teacherIntent })
          })
        });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "mathcanvas_recommend_from_lesson_bundle",
    {
      title: "활동지에 맞는 새 MathCanvas 활동 준비",
      description:
        "검증된 통합 활동지 1장과 수업 근거를 받아 새 프로젝트용 활동을 추천합니다. 선생님 계정에서 화면 검수로 승인한 수동 제작본이 없는 경우에만 사용하며, 다른 사람 프로젝트나 이전 AI 프로토타입 프로젝트를 재사용하지 않습니다. 지원 활동이 없으면 자체 템플릿 제작 요청을 반환하고 프로젝트를 만들지 않습니다.",
      inputSchema: lessonBundleWorksheetIntakeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (input) => {
      try {
        const recommendation = service.recommend(
          buildLessonBundleRecommendationInput(input)
        );
        return toolResult({
          ok: true,
          ...projectLessonBundleRecommendation(input, recommendation)
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
