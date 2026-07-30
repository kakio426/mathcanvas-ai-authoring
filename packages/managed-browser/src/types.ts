import { z } from "zod";
import {
  compiledCanvasProjectSchema,
  validationReportSchema
} from "@mathcanvas/contracts";

export const MANAGED_BROWSER_VERSION = "2.0.0" as const;
export const MATHCANVAS_HOME_URL =
  "https://mathcanvas.vivasam.com/ko/myCanvas" as const;
export const MATHCANVAS_ORIGIN =
  "https://mathcanvas.vivasam.com" as const;

export const browserConnectionStateSchema = z.enum([
  "browser-launch-failed",
  "login-required",
  "contract-mismatch",
  "ready"
]);

export const browserConnectionSchema = z
  .object({
    runtimeVersion: z.literal(MANAGED_BROWSER_VERSION),
    state: browserConnectionStateSchema,
    ready: z.boolean(),
    checkedAt: z.string().datetime(),
    currentUrl: z.string().url().optional(),
    detailCode: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/).optional()
  })
  .strict()
  .refine(
    (connection) => connection.ready === (connection.state === "ready"),
    "ready 값은 연결 상태와 일치해야 합니다."
  );

export const creationResultSchema = z
  .object({
    ok: z.boolean(),
    completedAt: z.string().datetime(),
    projectId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/).optional(),
    editorUrl: z
      .string()
      .url()
      .refine((url) => {
        const parsed = new URL(url);
        return (
          parsed.origin === MATHCANVAS_ORIGIN &&
          parsed.pathname.startsWith("/ko/view/")
        );
      })
      .optional(),
    errorCode: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/).optional(),
    httpStatus: z.number().int().min(100).max(599).optional()
  })
  .strict()
  .superRefine((result, context) => {
    if (result.ok && (!result.projectId || !result.editorUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "성공 결과에는 프로젝트 ID와 편집 URL이 필요합니다."
      });
    }
    if (!result.ok && !result.errorCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "실패 결과에는 오류 코드가 필요합니다."
      });
    }
  });

export const queuedCreationSchema = z
  .object({
    jobId: z.string().regex(/^job-[A-Za-z0-9-]+$/),
    approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    compiledProject: compiledCanvasProjectSchema,
    validationReport: validationReportSchema
  })
  .strict()
  .refine(
    (job) =>
      job.compiledProject.payloadHash === job.payloadHash &&
      job.validationReport.compiledPayloadHash === job.payloadHash &&
      job.validationReport.canCreate,
    "검증된 payload 해시가 작업과 일치해야 합니다."
  );

export type BrowserConnectionState = z.infer<
  typeof browserConnectionStateSchema
>;
export type BrowserConnection = z.infer<typeof browserConnectionSchema>;
export type CreationResult = z.infer<typeof creationResultSchema>;
export type QueuedCreation = z.infer<typeof queuedCreationSchema>;

export interface MathCanvasBrowserRuntime {
  openWorkspace(): Promise<BrowserConnection>;
  checkConnection(options?: {
    forceContractCheck?: boolean;
    bringToFront?: boolean;
    requiredModules?: string[];
  }): Promise<BrowserConnection>;
  createProject(
    payload: Record<string, unknown>,
    expectedPayloadHash: string,
    options?: { openEditor?: boolean }
  ): Promise<CreationResult>;
  openEditor(editorUrl: string): Promise<void>;
  close(): Promise<void>;
}
