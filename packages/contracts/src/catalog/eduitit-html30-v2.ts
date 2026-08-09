import { z } from "zod";
import { jsonRecordSchema } from "../vocabulary/json.js";
import { stableIdSchema } from "../vocabulary/ids.js";
import { worksheetFamilyRefSchema } from "./worksheet-v2.js";

export const EDUITIT_HTML30_V2_SCHEMA_VERSION = "2.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const semanticVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const toolKeySchema = z.string().regex(/^[A-Z]{2}\d{2}[A-Z]{2}$/);
const forbiddenLearnerCopy =
  /(?:①|②|③|Shift|SHIFT|시프트|예상(?:한|해서|하기| 답)?|처음 고른|답을 바꾸|수정하세요|까닭(?:을|도)? 쓰|설명(?:을)? 쓰|펜으로|적으세요)/;

const learnerQuestionSchema = z
  .string()
  .trim()
  .min(8)
  .max(48)
  .refine((value) => !value.includes("\n") && value.endsWith("?"), {
    message: "문제는 한 줄의 물음표 문장이어야 합니다."
  })
  .refine((value) => !forbiddenLearnerCopy.test(value), {
    message: "문제에 HTML30에서 금지한 단계·필기 문구를 사용할 수 없습니다."
  });

const localDirectionSchema = z
  .string()
  .trim()
  .min(6)
  .max(44)
  .refine(
    (value) =>
      !value.includes("\n") &&
      /[.]$/.test(value) &&
      !forbiddenLearnerCopy.test(value),
    {
      message:
        "작업판 안내는 한 줄의 짧은 행동 문장이어야 하며 단계·필기 문구를 포함할 수 없습니다."
    }
  );

const compactLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .refine((value) => !value.includes("\n") && !forbiddenLearnerCopy.test(value));

const sourceBindingSchema = z
  .object({
    promptHarnessContentSha256: sha256Schema,
    promptId: stableIdSchema,
    lessonId: stableIdSchema,
    slideHtmlSha256: sha256Schema,
    catalogEntryId: z.string().regex(/^grade3-basic-practice-ppt-\d{2}$/),
    catalogSnapshotSha256: sha256Schema,
    alignmentStatus: z.enum(["exact", "needs-review"]),
    catalogAffordance: z
      .object({
        family: worksheetFamilyRefSchema,
        candidateToolKeys: z.array(toolKeySchema).min(1).max(2),
        supportState: z.enum(["captured", "contracted", "verified", "released"]),
        evidenceIds: z.array(z.string().trim().min(1).max(500)).min(1).max(8)
      })
      .strict()
  })
  .strict();

const compactChoiceSchema = z
  .object({
    kind: z.literal("compact-choice"),
    label: compactLabelSchema,
    choices: z
      .array(
        z
          .object({
            choiceId: stableIdSchema,
            text: compactLabelSchema
          })
          .strict()
      )
      .min(2)
      .max(3),
    correctChoiceId: stableIdSchema,
    interaction: z.literal("native-choice-drop"),
    regionRequired: z.literal(true)
  })
  .strict();

const compactExpressionSchema = z
  .object({
    kind: z.literal("compact-expression"),
    label: compactLabelSchema,
    expected: z.string().trim().min(1).max(24),
    interaction: z.enum(["math-input", "native-card-construction"]),
    regionRequired: z.literal(true)
  })
  .strict();

const noAnswerSchema = z
  .object({
    kind: z.literal("none"),
    reason: z.literal("construction-state-is-the-answer"),
    regionRequired: z.literal(false)
  })
  .strict();

const answerContractSchema = z.discriminatedUnion("kind", [
  noAnswerSchema,
  compactChoiceSchema,
  compactExpressionSchema
]);

const independentNativeSetSchema = z
  .object({
    kind: z.literal("independent-native-set"),
    memberIdPrefix: stableIdSchema,
    memberCount: z.number().int().min(1).max(64)
  })
  .strict();

const singleNativeObjectSchema = z
  .object({
    kind: z.literal("single-native-object"),
    objectId: stableIdSchema
  })
  .strict();

const canonicalNativeGroupSchema = z
  .object({
    kind: z.literal("canonical-native-group"),
    groupId: stableIdSchema,
    memberIds: z.array(stableIdSchema).min(2).max(32),
    persistedBeforeStudentUse: z.literal(true),
    membersMoveAsOne: z.literal(true)
  })
  .strict();

const movableUnitRepresentationSchema = z.discriminatedUnion("kind", [
  independentNativeSetSchema,
  singleNativeObjectSchema,
  canonicalNativeGroupSchema
]);

const movableUnitSchema = z
  .object({
    unitId: stableIdSchema,
    mathematicalMeaning: z.string().trim().min(2).max(120),
    representation: movableUnitRepresentationSchema,
    studentAction: z.enum([
      "direct-drag",
      "native-control-drag",
      "native-click",
      "native-card-drop"
    ]),
    startsIn: z.enum(["native-stage", "source-tray"]),
    endsIn: z.enum(["native-stage", "construction-area"])
  })
  .strict();

const decisionContractCommon = {
  distinguishablePossibilityCount: z.number().int().min(3).max(128),
  initiallyUnresolved: z.literal(true),
  lockedAnswerExposed: z.literal(false),
  plausibleWrongPath: z.string().trim().min(4).max(160),
  selfVerification: z.string().trim().min(4).max(220)
};

const decisionContractSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("native-state-space"),
      ...decisionContractCommon
    })
    .strict(),
  z
    .object({
      mode: z.literal("movable-subset"),
      ...decisionContractCommon,
      suppliedMovableUnitCount: z.number().int().min(3).max(20),
      rejectableUnitIds: z.array(stableIdSchema).min(1).max(10),
      solutionUsesFewerMovableUnitsThanSupplied: z.literal(true)
    })
    .strict()
]);

const nativeAffordancePlanSchema = z
  .object({
    family: worksheetFamilyRefSchema,
    toolKey: toolKeySchema,
    variantIds: z.array(z.string().regex(/^[A-Z]{2}\d{2}[A-Z]{2}-\d{2}$/)).min(1).max(12),
    supportState: z.enum(["captured", "contracted", "verified", "released"]),
    evidenceIds: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
    semanticOperation: z.string().trim().min(4).max(180),
    configuredInitialState: jsonRecordSchema,
    targetState: jsonRecordSchema,
    invariant: z.string().trim().min(4).max(220),
    primaryMathematicalStateChanges: z.literal(true)
  })
  .strict();

const workbenchRegionSchema = z
  .object({
    regionId: stableIdSchema,
    role: z.enum(["native-stage", "source-tray", "construction-area"]),
    studentLabel: compactLabelSchema,
    purpose: z.string().trim().min(4).max(100)
  })
  .strict();

const layoutIntentSchema = z
  .object({
    viewportCssPx: z
      .object({ width: z.literal(1280), height: z.literal(800) })
      .strict(),
    mathCanvasZoomPercent: z.literal(100),
    persistedCanvasScale: z.literal(3),
    problemCount: z.literal(1),
    variant: z.enum([
      "single-native-workbench",
      "composition-workbench"
    ]),
    compositionFlow: z.enum([
      "not-applicable",
      "reserve-first-adaptive-source-tray"
    ]),
    questionBandRatio: z.number().min(0.1).max(0.18),
    workbenchBandRatio: z.number().min(0.72).max(0.9),
    answerBandRatio: z.number().min(0).max(0.1),
    semanticGapCssPx: z.literal(16),
    workbenchClearanceCssPx: z.number().min(24).max(48),
    nativeReservePolicy: z.literal("measure-initial-selected-manipulated-before-layout"),
    containmentPolicy: z.literal("visual-and-interaction-bounds-inside-workbench"),
    regions: z.array(workbenchRegionSchema).min(1).max(2)
  })
  .strict();

export const eduititHtml30ActivitySpecV2Schema = z
  .object({
    schemaVersion: z.literal(EDUITIT_HTML30_V2_SCHEMA_VERSION),
    activityId: z.string().regex(/^eduitit-html30-v2-\d{2}$/),
    activityVersion: semanticVersionSchema,
    sequence: z.number().int().min(1).max(30),
    title: z.string().trim().min(1).max(80),
    sourceBinding: sourceBindingSchema,
    structure: z
      .object({
        oneProblem: z.literal(true),
        displayedHeading: z.literal("question-only"),
        topDirectionBlock: z.literal(false),
        predictionRegion: z.literal(false),
        firstAnswerRegion: z.literal(false),
        revisionRegion: z.literal(false),
        writtenReasonRegion: z.literal(false),
        penRequired: z.literal(false),
        coreEvidence: z.literal("native-construction")
      })
      .strict(),
    learnerTask: z
      .object({
        question: learnerQuestionSchema,
        localDirections: z.array(localDirectionSchema).min(1).max(2),
        constructionStateStatesAnswer: z.boolean(),
        answer: answerContractSchema
      })
      .strict(),
    mathematicalDecision: z.string().trim().min(8).max(220),
    nativePlan: z
      .object({
        placementMode: z.literal("generator-preplaced"),
        studentToolMenuRequired: z.literal(false),
        keyboardModifiers: z.tuple([]),
        core: nativeAffordancePlanSchema,
        supporting: nativeAffordancePlanSchema.optional(),
        decisionContract: decisionContractSchema,
        movableUnits: z.array(movableUnitSchema).min(1).max(20)
      })
      .strict(),
    layoutIntent: layoutIntentSchema,
    lifecycle: z
      .object({
        state: z.literal("offline-design-candidate"),
        externalWriteAllowed: z.literal(false),
        releaseQualified: z.literal(false),
        blockers: z.tuple([
          z.literal("student-one-screen-100-v1 profile is not pinned"),
          z.literal("activity-specific native reserve is not pinned"),
          z.literal("actual save/reopen and fresh visual canary are pending")
        ])
      })
      .strict()
  })
  .strict()
  .superRefine((value, context) => {
    const expectedActivityId = `eduitit-html30-v2-${String(value.sequence).padStart(2, "0")}`;
    const expectedCatalogEntryId = `grade3-basic-practice-ppt-${String(value.sequence).padStart(2, "0")}`;
    if (value.activityId !== expectedActivityId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activityId"],
        message: "activityId는 sequence에서 결정되어야 합니다."
      });
    }
    if (value.sourceBinding.catalogEntryId !== expectedCatalogEntryId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceBinding", "catalogEntryId"],
        message: "catalog entry가 sequence와 일치해야 합니다."
      });
    }
    const answerIsNone = value.learnerTask.answer.kind === "none";
    if (answerIsNone !== value.learnerTask.constructionStateStatesAnswer) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["learnerTask", "answer"],
        message: "조작 결과가 답이면 답 칸을 만들지 않고, 아니면 작은 답 영역만 둡니다."
      });
    }
    if (value.learnerTask.answer.kind === "compact-choice") {
      const ids = value.learnerTask.answer.choices.map((choice) => choice.choiceId);
      const texts = value.learnerTask.answer.choices.map((choice) => choice.text);
      if (
        new Set(ids).size !== ids.length ||
        new Set(texts).size !== texts.length ||
        !ids.includes(value.learnerTask.answer.correctChoiceId)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["learnerTask", "answer", "choices"],
          message: "작은 답 선택지는 서로 다르고 정답 ID를 포함해야 합니다."
        });
      }
    }
    const source = value.sourceBinding.catalogAffordance;
    const plans = [value.nativePlan.core, value.nativePlan.supporting].filter(
      (plan): plan is z.infer<typeof nativeAffordancePlanSchema> => Boolean(plan)
    );
    if (
      value.nativePlan.core.family.id !== source.family.id ||
      value.nativePlan.core.family.version !== source.family.version ||
      value.nativePlan.core.supportState !== source.supportState
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nativePlan", "core"],
        message: "core affordance는 source catalog family와 support state에 정확히 결속되어야 합니다."
      });
    }
    if (
      plans.some((plan) => !source.candidateToolKeys.includes(plan.toolKey)) ||
      new Set(plans.map((plan) => plan.toolKey)).size !== plans.length ||
      plans.length > 2
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nativePlan"],
        message: "core 1개와 선택적 supporting 1개만 catalog 후보 도구에서 사용할 수 있습니다."
      });
    }
    const subsetDecisionSequences = new Set([
      4, 5, 7, 8, 9, 14, 15, 16, 17, 18, 19, 20, 28, 29
    ]);
    const expectedDecisionMode = subsetDecisionSequences.has(value.sequence)
      ? "movable-subset"
      : "native-state-space";
    if (value.nativePlan.decisionContract.mode !== expectedDecisionMode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nativePlan", "decisionContract", "mode"],
        message: "각 HTML30 활동은 검토된 수학적 선택 방식에 정확히 결속되어야 합니다."
      });
    }
    if (value.nativePlan.decisionContract.mode === "movable-subset") {
      const contract = value.nativePlan.decisionContract;
      const movableIds = value.nativePlan.movableUnits.map((unit) => unit.unitId);
      if (
        contract.suppliedMovableUnitCount !== movableIds.length ||
        contract.rejectableUnitIds.length >= movableIds.length ||
        new Set(contract.rejectableUnitIds).size !== contract.rejectableUnitIds.length ||
        contract.rejectableUnitIds.some((unitId) => !movableIds.includes(unitId))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nativePlan", "decisionContract", "rejectableUnitIds"],
          message:
            "부분 선택 활동은 실제 제공물보다 적게 사용하며, 제공물 안의 거절 가능한 대안을 정확히 밝혀야 합니다."
        });
      }
    }
    const regionRoles = value.layoutIntent.regions.map((region) => region.role);
    const expectedRoles: readonly (typeof regionRoles)[number][] =
      value.layoutIntent.variant === "single-native-workbench"
        ? ["native-stage"]
        : ["source-tray", "construction-area"];
    if (
      regionRoles.length !== expectedRoles.length ||
      expectedRoles.some((role) => !regionRoles.includes(role)) ||
      (value.layoutIntent.variant === "single-native-workbench" &&
        value.layoutIntent.compositionFlow !== "not-applicable") ||
      (value.layoutIntent.variant === "composition-workbench" &&
        value.layoutIntent.compositionFlow !==
          "reserve-first-adaptive-source-tray") ||
      new Set(value.layoutIntent.regions.map((region) => region.regionId)).size !==
        value.layoutIntent.regions.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layoutIntent", "regions"],
        message: "layout variant와 작업 공간 역할이 정확히 일치해야 합니다."
      });
    }
    const totalRatio =
      value.layoutIntent.questionBandRatio +
      value.layoutIntent.workbenchBandRatio +
      value.layoutIntent.answerBandRatio;
    const expectedAnswerRatio = value.learnerTask.answer.kind === "none" ? 0 : 0.08;
    if (
      Math.abs(totalRatio - 1) > 1e-9 ||
      Math.abs(value.layoutIntent.answerBandRatio - expectedAnswerRatio) > 1e-9
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layoutIntent"],
        message: "문제·작업판·작은 답 영역의 비율은 정확히 한 화면을 이루어야 합니다."
      });
    }
    for (const unit of value.nativePlan.movableUnits) {
      if (unit.representation.kind === "canonical-native-group") {
        if (
          new Set(unit.representation.memberIds).size !==
          unit.representation.memberIds.length
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["nativePlan", "movableUnits"],
            message: "canonical native group의 구성원 ID는 중복될 수 없습니다."
          });
        }
      }
    }
  });

export type EduititHtml30ActivitySpecV2 = z.infer<
  typeof eduititHtml30ActivitySpecV2Schema
>;

export const eduititHtml30ActivitySetV2Schema = z
  .object({
    schemaVersion: z.literal(EDUITIT_HTML30_V2_SCHEMA_VERSION),
    setId: z.literal("eduitit-html30-native-first-v2"),
    setVersion: semanticVersionSchema,
    sourceHarness: z
      .object({
        path: z.literal("research/mathcanvas/eduitit-html30-prompt-harness.json"),
        fileSha256: sha256Schema,
        contentSha256: sha256Schema
      })
      .strict(),
    entries: z.array(eduititHtml30ActivitySpecV2Schema).length(30),
    externalWriteAllowed: z.literal(false),
    releaseQualifiedCount: z.literal(0)
  })
  .strict()
  .superRefine((value, context) => {
    const sequences = value.entries.map((entry) => entry.sequence);
    const expected = Array.from({ length: 30 }, (_, index) => index + 1);
    if (
      sequences.some((sequence, index) => sequence !== expected[index]) ||
      new Set(value.entries.map((entry) => entry.activityId)).size !== 30 ||
      value.entries.some(
        (entry) =>
          entry.sourceBinding.promptHarnessContentSha256 !==
          value.sourceHarness.contentSha256
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "30개 sequence·activityId·prompt harness binding이 정확해야 합니다."
      });
    }
  });

export type EduititHtml30ActivitySetV2 = z.infer<
  typeof eduititHtml30ActivitySetV2Schema
>;
