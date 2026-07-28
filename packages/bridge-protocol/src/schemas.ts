import { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  compiledProjectSchema,
  validationReportSchema
} from "@mathcanvas/contracts";

export const BRIDGE_PROTOCOL_VERSION = "1.0.0" as const;

export const connectionStateSchema = z.enum([
  "bridge-not-paired",
  "mathcanvas-tab-missing",
  "login-required",
  "contract-mismatch",
  "ready"
]);

export const extensionHeartbeatSchema = z
  .object({
    protocolVersion: z.literal(BRIDGE_PROTOCOL_VERSION),
    instanceId: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/),
    extensionVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    state: connectionStateSchema,
    checkedAt: z.string().datetime(),
    mathCanvasTabUrl: z
      .string()
      .url()
      .refine((url) => url.startsWith("https://mathcanvas.vivasam.com/ko/"))
      .optional(),
    contractVersion: z.literal("1.0.0").optional(),
    detailCode: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/).optional()
  })
  .strict();

export const queuedCreationSchema = z
  .object({
    protocolVersion: z.literal(BRIDGE_PROTOCOL_VERSION),
    jobId: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/),
    approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    compiledProject: compiledProjectSchema,
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

export const extensionJobResultSchema = z
  .object({
    protocolVersion: z.literal(BRIDGE_PROTOCOL_VERSION),
    jobId: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/),
    instanceId: z.string().regex(/^[A-Za-z0-9._:-]{1,160}$/),
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    ok: z.boolean(),
    completedAt: z.string().datetime(),
    projectId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/).optional(),
    editorUrl: z
      .string()
      .url()
      .refine((url) =>
        url.startsWith("https://mathcanvas.vivasam.com/ko/view/")
      )
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

export const bridgeHealthSchema = z
  .object({
    protocolVersion: z.literal(BRIDGE_PROTOCOL_VERSION),
    localServer: z.literal("ready"),
    heartbeat: extensionHeartbeatSchema.nullable()
  })
  .strict();

export type ExtensionHeartbeat = z.infer<typeof extensionHeartbeatSchema>;
export type ConnectionState = z.infer<typeof connectionStateSchema>;
export type QueuedCreation = z.infer<typeof queuedCreationSchema>;
export type ExtensionJobResult = z.infer<typeof extensionJobResultSchema>;
