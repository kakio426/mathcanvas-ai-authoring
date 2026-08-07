import { z } from "zod";
import type { MathCanvasAuthoringService } from "@mathcanvas/authoring-runtime";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const shortText = z.string().trim().min(1).max(500);

export const OWNER_TEMPLATE_SOURCE_POLICY = Object.freeze({
  reusableProjectSource: "owner-manual-curated",
  generatedProjectSource: "owner-mathcanvas-ai",
  prototypeProjectReuse: false,
  externalProjectReuse: false
} as const);

export const lessonBundleWorksheetIntakeSchema = z
  .object({
    schemaVersion: z.literal(1),
    intakeId: identifier,
    generatedAt: z.string().datetime(),
    sourcePolicy: z
      .object({
        reusableProjectSource: z.literal("owner-manual-curated"),
        generatedProjectSource: z.literal("owner-mathcanvas-ai"),
        prototypeProjectReuse: z.literal(false),
        externalProjectReuse: z.literal(false)
      })
      .strict(),
    lesson: z
      .object({
        lessonId: identifier,
        title: shortText,
        gradeLabel: shortText,
        unit: shortText,
        targetBehavior: z.string().trim().min(5).max(1000),
        worksheetTitle: shortText,
        curriculumAnchorIds: z.array(shortText).max(8)
      })
      .strict(),
    worksheet: z
      .object({
        filename: z.string().regex(/^[A-Za-z0-9._-]+\.png$/),
        sha256,
        width: z.number().int().positive().max(10000),
        height: z.number().int().positive().max(10000),
        inspectedAt: z.string().datetime(),
        visualQa: z
          .object({
            logoTitleSeparated: z.literal(true),
            allQuestionTextLegible: z.literal(true),
            choicesVisuallySeparated: z.literal(true),
            answerSpacesPresent: z.literal(true),
            noOverlapsOrClipping: z.literal(true)
          })
          .strict()
      })
      .strict(),
    mathEvidence: z
      .object({
        answerLabels: z.array(shortText).min(1).max(20),
        misconceptions: z.array(shortText).max(12),
        visualSummary: z.array(shortText).min(1).max(20)
      })
      .strict(),
    recommendation: z
      .object({
        problemCount: z.number().int().min(2).max(3).default(2),
        difficulty: z.literal("normal").default("normal")
      })
      .strict()
  })
  .strict();

export type LessonBundleWorksheetIntake = z.infer<
  typeof lessonBundleWorksheetIntakeSchema
>;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function takeUnique(values: readonly string[], limit: number): string[] {
  return [...new Set(values.map(compact).filter(Boolean))].slice(0, limit);
}

function gradeFromLabel(value: string): number | undefined {
  const match = /(?:초등\s*)?(\d)학년/.exec(value);
  if (!match) return undefined;
  const grade = Number(match[1]);
  return Number.isInteger(grade) && grade >= 1 && grade <= 6
    ? grade
    : undefined;
}

export function buildLessonBundleRecommendationInput(
  value: unknown
): Parameters<MathCanvasAuthoringService["recommend"]>[0] {
  const intake = lessonBundleWorksheetIntakeSchema.parse(value);
  const answers = takeUnique(intake.mathEvidence.answerLabels, 8).join(" / ");
  const misconceptions = takeUnique(
    intake.mathEvidence.misconceptions,
    4
  ).join(" / ");
  const visuals = takeUnique(intake.mathEvidence.visualSummary, 6).join(" / ");
  const requestedGrade = gradeFromLabel(intake.lesson.gradeLabel);
  const prompt = compact(
    [
      `${intake.lesson.title} 활동지와 연결된 MathCanvas 탐구 활동을 만듭니다.`,
      `수업 목표: ${intake.lesson.targetBehavior}`,
      `활동지에서 확인한 수학 내용: ${visuals}`,
      `정답 근거: ${answers}`,
      misconceptions ? `드러낼 오개념: ${misconceptions}` : "",
      "학생이 먼저 수학적으로 선택하고, 조작 결과로 확인한 뒤 처음 생각을 설명하거나 고치게 해 주세요."
    ]
      .filter(Boolean)
      .join(" ")
  ).slice(0, 2000);

  return {
    prompt,
    ...(requestedGrade === undefined ? {} : { requestedGrade }),
    problemCount: intake.recommendation.problemCount,
    difficulty: intake.recommendation.difficulty
  };
}

export type LessonBundleRoute =
  | "create-new-owner-project"
  | "build-owner-template";

export function projectLessonBundleRecommendation(
  value: unknown,
  recommendation: ReturnType<MathCanvasAuthoringService["recommend"]>
) {
  const intake = lessonBundleWorksheetIntakeSchema.parse(value);
  const route: LessonBundleRoute = recommendation.supported
    ? "create-new-owner-project"
    : "build-owner-template";
  return {
    intake: {
      intakeId: intake.intakeId,
      lessonId: intake.lesson.lessonId,
      worksheetFilename: intake.worksheet.filename,
      worksheetSha256: intake.worksheet.sha256
    },
    sourcePolicy: OWNER_TEMPLATE_SOURCE_POLICY,
    route,
    recommendation,
    ...(route === "build-owner-template"
      ? {
          templateBuildRequest: {
            schemaVersion: 1 as const,
            status: "owner-template-required" as const,
            lesson: intake.lesson,
            worksheet: {
              filename: intake.worksheet.filename,
              sha256: intake.worksheet.sha256,
              width: intake.worksheet.width,
              height: intake.worksheet.height
            },
            mathEvidence: intake.mathEvidence,
            requiredGates: [
              "registered-blueprint-and-item-generator",
              "cognitive-manifest",
              "runtime-value-predicates",
              "classroom-korean-and-text-fit",
              "pnpm-cognitive-verify",
              "pnpm-check",
              "fresh-student-screen-canary-before-release",
              "new-project-visual-review-before-use"
            ],
            prohibitedSources: [
              "another-teacher-project",
              "external-project-copy",
              "unverified-template",
              "previous-ai-prototype-project"
            ]
          }
        }
      : {})
  };
}
