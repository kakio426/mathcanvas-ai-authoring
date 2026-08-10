import { z } from "zod";
import { sha256Hex } from "../hash.js";
import {
  eduititHtml30NativeReserveCandidateV2Schema,
  eduititHtml30ResolvedLayoutV2Schema,
  contains,
  translateBounds
} from "./eduitit-html30-layout-v2.js";
import { eduititHtml30ActivitySpecV2Schema } from "./eduitit-html30-v2.js";

export const EDUITIT_HTML30_OFFLINE_V2_SCHEMA_VERSION = "1.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

function pinnedSourceFile<const Path extends string>(path: Path) {
  return z
    .object({
      path: z.literal(path),
      fileSha256: sha256Schema
    })
    .strict();
}

const sourceBindingsSchema = z
  .object({
    promptHarness: z
      .object({
        path: z.literal("research/mathcanvas/eduitit-html30-prompt-harness.json"),
        fileSha256: sha256Schema,
        contentSha256: sha256Schema
      })
      .strict(),
    activityContract: pinnedSourceFile(
      "packages/contracts/src/catalog/eduitit-html30-v2.ts"
    ),
    layoutContract: pinnedSourceFile(
      "packages/contracts/src/catalog/eduitit-html30-layout-v2.ts"
    ),
    offlineContract: pinnedSourceFile(
      "packages/contracts/src/catalog/eduitit-html30-offline-v2.ts"
    ),
    activityTemplate: pinnedSourceFile(
      "packages/templates/src/eduitit-html30-v2.ts"
    ),
    reserveBuilder: pinnedSourceFile(
      "packages/mathcanvas-compiler/src/resolve/eduitit-html30-reserve-candidates-v2.ts"
    ),
    layoutResolver: pinnedSourceFile(
      "packages/mathcanvas-compiler/src/resolve/eduitit-html30-layout-v2.ts"
    ),
    artifactBuilder: pinnedSourceFile(
      "scripts/prompt-harness/build-eduitit-html30-v2-offline.mjs"
    )
  })
  .strict();

const attestationSchema = z
  .object({
    exactActivityCount: z.literal(30),
    allSourceBindingsExact: z.literal(true),
    allOneProblem: z.literal(true),
    allAtMathCanvas100Percent: z.literal(true),
    allForbiddenRegionsAbsent: z.literal(true),
    allToolsPreplaced: z.literal(true),
    allKeyboardModifiersAbsent: z.literal(true),
    allCanonicalGroupsPersisted: z.literal(true),
    allToolBindingsExact: z.literal(true),
    allEstimatedReserveStatesContained: z.literal(true),
    actualReserveStatesVerified: z.literal(false),
    allReserveUnionsCentered: z.literal(true),
    allNativeAutoScaleDisabled: z.literal(true),
    minimumEdgeClearanceCssPx: z.number().finite().min(24),
    externalWriteAllowed: z.literal(false),
    canonicalPayloadsGenerated: z.literal(false),
    liveValidationPending: z.literal(true),
    releaseQualified: z.literal(false),
    blockers: z.tuple([
      z.literal("canonical native payload compilation is pending"),
      z.literal("live 100-percent editor geometry confirmation is pending"),
      z.literal("actual initial-selected-manipulated reserve capture is pending"),
      z.literal("save-reopen and fresh visual review are pending")
    ])
  })
  .strict();

const offlineBodyBaseSchema = z
  .object({
    schemaVersion: z.literal(EDUITIT_HTML30_OFFLINE_V2_SCHEMA_VERSION),
    artifactId: z.literal("eduitit-html30-native-first-offline-design-v2"),
    artifactVersion: z.literal("1.0.0"),
    sourceBindings: sourceBindingsSchema,
    activities: z.array(eduititHtml30ActivitySpecV2Schema).length(30),
    reserves: z.array(eduititHtml30NativeReserveCandidateV2Schema).length(30),
    layouts: z.array(eduititHtml30ResolvedLayoutV2Schema).length(30),
    attestation: attestationSchema
  })
  .strict();

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function addOfflineBodyIssues(
  value: z.infer<typeof offlineBodyBaseSchema>,
  context: z.RefinementCtx
): void {
  const expectedSequences = Array.from({ length: 30 }, (_, index) => index + 1);
  const activitySequences = value.activities.map((activity) => activity.sequence);
  if (!sameStrings(activitySequences.map(String), expectedSequences.map(String))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["activities"],
      message: "offline design activity sequence는 1부터 30까지 정확해야 합니다."
    });
  }

  let allSourceBindingsExact = true;
  let allOneProblem = true;
  let allAtMathCanvas100Percent = true;
  let allForbiddenRegionsAbsent = true;
  let allToolsPreplaced = true;
  let allKeyboardModifiersAbsent = true;
  let allCanonicalGroupsPersisted = true;
  let allToolBindingsExact = true;
  let allEstimatedReserveStatesContained = true;
  let allReserveUnionsCentered = true;
  let allNativeAutoScaleDisabled = true;
  let minimumEdgeClearanceCssPx = Number.POSITIVE_INFINITY;

  for (let index = 0; index < 30; index += 1) {
    const activity = value.activities[index]!;
    const reserve = value.reserves[index]!;
    const layout = value.layouts[index]!;
    const expectedActivityId = `eduitit-html30-v2-${String(index + 1).padStart(2, "0")}`;

    allSourceBindingsExact &&=
      activity.activityId === expectedActivityId &&
      activity.sourceBinding.promptHarnessContentSha256 ===
        value.sourceBindings.promptHarness.contentSha256;
    allOneProblem &&= activity.structure.oneProblem && activity.layoutIntent.problemCount === 1;
    allAtMathCanvas100Percent &&=
      activity.layoutIntent.mathCanvasZoomPercent === 100 &&
      activity.layoutIntent.persistedCanvasScale === 3 &&
      layout.mathCanvasZoomPercent === 100 &&
      layout.persistedCanvasScale === 3;
    allForbiddenRegionsAbsent &&=
      !activity.structure.topDirectionBlock &&
      !activity.structure.predictionRegion &&
      !activity.structure.firstAnswerRegion &&
      !activity.structure.revisionRegion &&
      !activity.structure.writtenReasonRegion &&
      !activity.structure.penRequired;
    allToolsPreplaced &&=
      activity.nativePlan.placementMode === "generator-preplaced" &&
      !activity.nativePlan.studentToolMenuRequired;
    allKeyboardModifiersAbsent &&= activity.nativePlan.keyboardModifiers.length === 0;
    allCanonicalGroupsPersisted &&= activity.nativePlan.movableUnits.every(
      (unit) =>
        unit.representation.kind !== "canonical-native-group" ||
        (unit.representation.persistedBeforeStudentUse &&
          unit.representation.membersMoveAsOne)
    );

    const expectedToolKeys = [
      activity.nativePlan.core.toolKey,
      ...(activity.nativePlan.supporting
        ? [activity.nativePlan.supporting.toolKey]
        : [])
    ];
    allToolBindingsExact &&= sameStrings(reserve.toolKeys, expectedToolKeys);
    allSourceBindingsExact &&=
      reserve.activityId === expectedActivityId &&
      layout.activityId === expectedActivityId;
    allReserveUnionsCentered &&=
      layout.checks.allReserveUnionsCentered &&
      layout.placements.every(
        (placement) =>
          placement.horizontalCenterDeltaCssPx <= 0.01 &&
          placement.verticalCenterDeltaCssPx <= 0.01
      );
    allNativeAutoScaleDisabled &&=
      reserve.nativeScale === 1 && layout.checks.noNativeAutoScale;

    for (const placement of layout.placements) {
      minimumEdgeClearanceCssPx = Math.min(
        minimumEdgeClearanceCssPx,
        placement.minimumEdgeClearanceCssPx
      );
      const region = reserve.regions.find(
        (candidate) => candidate.role === placement.role
      );
      if (!region) {
        allEstimatedReserveStatesContained = false;
        continue;
      }
      allEstimatedReserveStatesContained &&=
        layout.checks.allEstimatedReserveStatesContained &&
        region.states.every((state) =>
          contains(
            placement.contentRectCss,
            translateBounds(state.bounds, placement.translationCss)
          )
        );
    }
  }

  const expectedAttestation = {
    exactActivityCount: 30,
    allSourceBindingsExact,
    allOneProblem,
    allAtMathCanvas100Percent,
    allForbiddenRegionsAbsent,
    allToolsPreplaced,
    allKeyboardModifiersAbsent,
    allCanonicalGroupsPersisted,
    allToolBindingsExact,
    allEstimatedReserveStatesContained,
    actualReserveStatesVerified: false,
    allReserveUnionsCentered,
    allNativeAutoScaleDisabled,
    minimumEdgeClearanceCssPx
  };
  for (const [key, expected] of Object.entries(expectedAttestation)) {
    const actual = value.attestation[key as keyof typeof expectedAttestation];
    if (
      typeof expected === "number"
        ? Math.abs(Number(actual) - expected) > 0.01
        : actual !== expected
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attestation", key],
        message: `${key}는 실제 30개 activity·reserve·layout에서 파생되어야 합니다.`
      });
    }
  }
}

export const eduititHtml30OfflineDesignBodyV2Schema = offlineBodyBaseSchema.superRefine(
  addOfflineBodyIssues
);

export type EduititHtml30OfflineDesignBodyV2 = z.infer<
  typeof eduititHtml30OfflineDesignBodyV2Schema
>;

export function eduititHtml30OfflineDesignContentHashV2(
  body: EduititHtml30OfflineDesignBodyV2
): string {
  return sha256Hex(eduititHtml30OfflineDesignBodyV2Schema.parse(body));
}

export const eduititHtml30OfflineDesignV2Schema = offlineBodyBaseSchema
  .extend({ contentSha256: sha256Schema })
  .strict()
  .superRefine((value, context) => {
    const { contentSha256, ...body } = value;
    const parsed = eduititHtml30OfflineDesignBodyV2Schema.safeParse(body);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: issue.path,
          message: issue.message
        });
      }
      return;
    }
    if (contentSha256 !== eduititHtml30OfflineDesignContentHashV2(parsed.data)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentSha256"],
        message: "offline design content hash는 정규화된 본문과 일치해야 합니다."
      });
    }
  });

export type EduititHtml30OfflineDesignV2 = z.infer<
  typeof eduititHtml30OfflineDesignV2Schema
>;
