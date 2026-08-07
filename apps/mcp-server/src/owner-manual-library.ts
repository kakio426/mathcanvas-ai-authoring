import { z } from "zod";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/);

const lessonReviewSchema = z
  .object({
    lessonId: identifier,
    accountScope: z.literal("current-owner-my-canvas"),
    accountDisplayName: z.string().trim().min(1).max(120),
    reviewedAt: z.string().datetime(),
    inspectedProjectIds: z.array(identifier).max(30),
    decision: z.enum(["approved-existing", "no-usable-manual"]),
    selectedProjectId: identifier.optional(),
    searchNotes: z.array(z.string().trim().min(1).max(500)).min(1).max(12)
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.decision === "approved-existing" &&
      value.selectedProjectId === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedProjectId"],
        message: "기존 수동 제작본을 선택한 차시는 projectId를 기록해야 합니다."
      });
    }
    if (
      value.decision === "no-usable-manual" &&
      value.selectedProjectId !== undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedProjectId"],
        message: "사용 가능한 수동 제작본이 없는 차시에는 projectId를 기록할 수 없습니다."
      });
    }
  });

const manualProjectReviewSchema = z
  .object({
    projectId: identifier,
    title: z.string().trim().min(1).max(300),
    editorUrl: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.origin === "https://mathcanvas.vivasam.com" &&
          url.pathname === `/ko/view/${url.pathname.split("/").at(-1)}`
        );
      }),
    origin: z.literal("owner-manual"),
    prototype: z.literal(false),
    reviewedAt: z.string().datetime(),
    reviewStatus: z.enum(["approved", "rejected"]),
    compatibleLessonIds: z.array(identifier).max(30),
    conceptTags: z.array(z.string().trim().min(1).max(80)).max(20),
    reasons: z.array(z.string().trim().min(1).max(500)).min(1).max(12)
  })
  .strict()
  .superRefine((value, context) => {
    if (new URL(value.editorUrl).pathname.split("/").at(-1) !== value.projectId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["editorUrl"],
        message: "수동 제작본 projectId와 편집 URL이 일치해야 합니다."
      });
    }
    if (
      value.reviewStatus === "approved" &&
      value.compatibleLessonIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compatibleLessonIds"],
        message: "승인한 수동 제작본은 호환 차시를 명시해야 합니다."
      });
    }
    if (
      value.reviewStatus === "rejected" &&
      value.compatibleLessonIds.length > 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compatibleLessonIds"],
        message: "반려한 수동 제작본은 차시에 연결할 수 없습니다."
      });
    }
  });

export const ownerManualActivityLibrarySchema = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: z.string().datetime(),
    policy: z
      .object({
        accountScope: z.literal("current-owner-my-canvas"),
        loginRequired: z.literal(true),
        visualInspectionRequired: z.literal(true),
        manualOnly: z.literal(true),
        prototypesAllowed: z.literal(false),
        externalProjectsAllowed: z.literal(false),
        exactLessonAllowlistRequired: z.literal(true)
      })
      .strict(),
    lessonReviews: z.array(lessonReviewSchema).max(30),
    projects: z.array(manualProjectReviewSchema).max(500)
  })
  .strict()
  .superRefine((value, context) => {
    const projectIds = new Set<string>();
    for (const [index, project] of value.projects.entries()) {
      if (projectIds.has(project.projectId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["projects", index, "projectId"],
          message: "수동 제작본 projectId는 중복될 수 없습니다."
        });
      }
      projectIds.add(project.projectId);
    }
    const lessonIds = new Set<string>();
    for (const [index, review] of value.lessonReviews.entries()) {
      if (lessonIds.has(review.lessonId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lessonReviews", index, "lessonId"],
          message: "차시별 수동 제작본 검수 기록은 하나만 둘 수 있습니다."
        });
      }
      lessonIds.add(review.lessonId);

      const inspected = review.inspectedProjectIds.map((projectId) =>
        value.projects.find((project) => project.projectId === projectId)
      );
      if (inspected.some((project) => project === undefined)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lessonReviews", index, "inspectedProjectIds"],
          message: "검수한 projectId는 projects 목록에 있어야 합니다."
        });
      }

      if (review.decision === "approved-existing") {
        const selected = value.projects.find(
          (project) => project.projectId === review.selectedProjectId
        );
        if (
          !selected ||
          selected.reviewStatus !== "approved" ||
          !selected.compatibleLessonIds.includes(review.lessonId) ||
          !review.inspectedProjectIds.includes(selected.projectId)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["lessonReviews", index, "selectedProjectId"],
            message:
              "선택한 프로젝트는 이 차시에 승인되고 직접 검수한 수동 제작본이어야 합니다."
          });
        }
      }
    }
  });

export type OwnerManualActivityLibrary = z.infer<
  typeof ownerManualActivityLibrarySchema
>;

export function findOwnerManualLessonReview(
  value: unknown,
  lessonId: string
) {
  const library = ownerManualActivityLibrarySchema.parse(value);
  return library.lessonReviews.find((review) => review.lessonId === lessonId);
}

export function findApprovedOwnerManualProject(
  value: unknown,
  lessonId: string
) {
  const library = ownerManualActivityLibrarySchema.parse(value);
  const review = library.lessonReviews.find(
    (candidate) => candidate.lessonId === lessonId
  );
  if (
    review?.decision !== "approved-existing" ||
    review.selectedProjectId === undefined
  ) {
    return undefined;
  }
  return library.projects.find(
    (project) => project.projectId === review.selectedProjectId
  );
}
