import { z } from "zod";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const ownerGeneratedTemplateApprovalsSchema = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: z.string().datetime(),
    policy: z
      .object({
        previousPrototypeApprovalAllowed: z.literal(false),
        freshCanaryRequired: z.literal(true),
        exactLessonApprovalRequired: z.literal(true),
        blueprintHashBindingRequired: z.literal(true)
      })
      .strict(),
    approvals: z.array(
      z
        .object({
          lessonId: identifier,
          templateId: identifier,
          blueprintContentHash: sha256,
          approvedAt: z.string().datetime(),
          evidencePaths: z.array(z.string().min(1).max(500)).min(2).max(12),
          reviewer: z.literal("owner-loop-visual-qa")
        })
        .strict()
    )
  })
  .strict();

export function findOwnerGeneratedTemplateApproval(
  value: unknown,
  lessonId: string,
  templateId: string,
  blueprintContentHash: string
) {
  const approvals = ownerGeneratedTemplateApprovalsSchema.parse(value);
  return approvals.approvals.find(
    (approval) =>
      approval.lessonId === lessonId &&
      approval.templateId === templateId &&
      approval.blueprintContentHash === blueprintContentHash
  );
}
