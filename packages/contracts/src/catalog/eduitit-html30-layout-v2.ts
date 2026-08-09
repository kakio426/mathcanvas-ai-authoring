import { z } from "zod";
import { spatialBoundsSchema, type SpatialBounds } from "../vocabulary/native-spatial.js";

export const EDUITIT_HTML30_LAYOUT_V2_SCHEMA_VERSION = "1.0.0" as const;

const toolKeySchema = z.string().regex(/^[A-Z]{2}\d{2}[A-Z]{2}$/);
const reserveStateSchema = z.enum(["initial", "selected", "manipulated"]);

const reserveStateEntrySchema = z
  .object({
    state: reserveStateSchema,
    bounds: spatialBoundsSchema
  })
  .strict();

const reserveRegionSchema = z
  .object({
    role: z.enum(["native-stage", "source-tray", "construction-area"]),
    states: z.tuple([
      reserveStateEntrySchema.extend({ state: z.literal("initial") }).strict(),
      reserveStateEntrySchema.extend({ state: z.literal("selected") }).strict(),
      reserveStateEntrySchema.extend({ state: z.literal("manipulated") }).strict()
    ]),
    union: spatialBoundsSchema,
    minimumControlCssPx: z.number().min(44).max(96),
    minimumGlyphCssPx: z.number().min(22).max(40)
  })
  .strict();

export const eduititHtml30NativeReserveCandidateV2Schema = z
  .object({
    schemaVersion: z.literal(EDUITIT_HTML30_LAYOUT_V2_SCHEMA_VERSION),
    reserveId: z.string().regex(/^eduitit-html30-v2-\d{2}-reserve$/),
    activityId: z.string().regex(/^eduitit-html30-v2-\d{2}$/),
    layoutVariant: z.enum([
      "single-native-workbench",
      "composition-workbench"
    ]),
    toolKeys: z.array(toolKeySchema).min(1).max(2),
    nativeScale: z.literal(1),
    measurementStatus: z.literal("offline-conservative-estimate"),
    regions: z.array(reserveRegionSchema).min(1).max(2),
    actualEvidencePending: z.literal(true)
  })
  .strict()
  .superRefine((value, context) => {
    if (value.reserveId !== `${value.activityId}-reserve`) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reserveId"],
        message: "reserveId는 activityId에서 결정되어야 합니다."
      });
    }
    const roles = value.regions.map((region) => region.role);
    const expectedRoles: readonly (typeof roles)[number][] =
      value.layoutVariant === "single-native-workbench"
        ? ["native-stage"]
        : ["source-tray", "construction-area"];
    if (
      roles.length !== expectedRoles.length ||
      expectedRoles.some((role) => !roles.includes(role)) ||
      new Set(value.toolKeys).size !== value.toolKeys.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["regions"],
        message: "layout variant의 reserve region과 tool key가 정확해야 합니다."
      });
    }
    for (const [index, region] of value.regions.entries()) {
      const derived = unionBounds(region.states.map((entry) => entry.bounds));
      if (!sameBounds(derived, region.union)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["regions", index, "union"],
          message: "reserve union은 initial·selected·manipulated bounds에서 파생되어야 합니다."
        });
      }
    }
  });

export type EduititHtml30NativeReserveCandidateV2 = z.infer<
  typeof eduititHtml30NativeReserveCandidateV2Schema
>;

const placementSchema = z
  .object({
    role: z.enum(["native-stage", "source-tray", "construction-area"]),
    regionRectCss: spatialBoundsSchema,
    labelMode: z.enum(["external", "native-owned"]),
    labelRectCss: spatialBoundsSchema.nullable(),
    contentRectCss: spatialBoundsSchema,
    reserveUnionBeforeTranslationCss: spatialBoundsSchema,
    translationCss: z
      .object({ x: z.number().finite(), y: z.number().finite() })
      .strict(),
    reserveUnionAfterTranslationCss: spatialBoundsSchema,
    horizontalCenterDeltaCssPx: z.number().nonnegative().max(0.01),
    verticalCenterDeltaCssPx: z.number().nonnegative().max(0.01),
    minimumEdgeClearanceCssPx: z.number().min(24)
  })
  .strict();

export const eduititHtml30ResolvedLayoutV2Schema = z
  .object({
    schemaVersion: z.literal(EDUITIT_HTML30_LAYOUT_V2_SCHEMA_VERSION),
    activityId: z.string().regex(/^eduitit-html30-v2-\d{2}$/),
    profileId: z.literal("student-one-screen-100-v1"),
    profileVersion: z.literal("1.0.0"),
    viewportCssPx: z
      .object({ width: z.literal(1280), height: z.literal(800) })
      .strict(),
    mathCanvasZoomPercent: z.literal(100),
    persistedCanvasScale: z.literal(3),
    canvas100Candidate: z
      .object({
        derivation: z.literal("authenticated-live-screen-ctm"),
        sourceAssetPath: z.literal("/assets/index-fb571b04.js"),
        sourceAssetSha256: z.literal(
          "bf2c027b6a146b038f1c49b20fb06464c7154d8da42f95977d491c18ff366584"
        ),
        viewBox: z.tuple([
          z.literal(0),
          z.literal(0),
          z.literal(1536),
          z.literal(960)
        ]),
        cssToCanvasScaleX: z.literal(1.2),
        cssToCanvasScaleY: z.literal(1.2),
        screenOffsetCssPx: z
          .object({ x: z.literal(112), y: z.literal(28) })
          .strict(),
        fixedSafeCanvas: spatialBoundsSchema,
        liveObserved: z.literal(true)
      })
      .strict(),
    fixedSafeCss: spatialBoundsSchema,
    questionRectCss: spatialBoundsSchema,
    workbenchRectCss: spatialBoundsSchema,
    instructionRectCss: spatialBoundsSchema,
    answerRectCss: spatialBoundsSchema.nullable(),
    compositionOrientation: z.enum([
      "not-applicable",
      "source-above",
      "source-left"
    ]),
    placements: z.array(placementSchema).min(1).max(2),
    typographyCssPx: z
      .object({
        question: z.literal(28),
        instruction: z.literal(22),
        regionLabel: z.literal(22),
        answer: z.literal(24)
      })
      .strict(),
    checks: z
      .object({
        oneProblem: z.literal(true),
        noScroll: z.literal(true),
        noCanvasPan: z.literal(true),
        noNativeAutoScale: z.literal(true),
        allReserveStatesContained: z.literal(true),
        allReserveUnionsCentered: z.literal(true),
        workbenchDominant: z.literal(true),
        sourceTraySmallerThanConstruction: z.literal(true),
        externalWriteAllowed: z.literal(false)
      })
      .strict(),
    blockers: z.tuple([
      z.literal("100-percent editor geometry requires live confirmation"),
      z.literal("reserve estimates require actual state-envelope replacement")
    ])
  })
  .strict()
  .superRefine((value, context) => {
    const expectedFixedSafeCanvas = {
      x:
        (value.fixedSafeCss.x - value.canvas100Candidate.screenOffsetCssPx.x) *
        value.canvas100Candidate.cssToCanvasScaleX,
      y:
        (value.fixedSafeCss.y - value.canvas100Candidate.screenOffsetCssPx.y) *
        value.canvas100Candidate.cssToCanvasScaleY,
      width:
        value.fixedSafeCss.width * value.canvas100Candidate.cssToCanvasScaleX,
      height:
        value.fixedSafeCss.height * value.canvas100Candidate.cssToCanvasScaleY
    };
    if (!sameBounds(expectedFixedSafeCanvas, value.canvas100Candidate.fixedSafeCanvas)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["canvas100Candidate", "fixedSafeCanvas"],
        message: "100% canvas safe rect는 인증 화면 CTM의 offset과 1.2 inverse scale에서 파생되어야 합니다."
      });
    }
    const sourcePlacement = value.placements.find(
      (placement) => placement.role === "source-tray"
    );
    const constructionPlacement = value.placements.find(
      (placement) => placement.role === "construction-area"
    );
    if (!sourcePlacement && value.compositionOrientation !== "not-applicable") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compositionOrientation"],
        message: "single workbench에는 composition 방향이 없어야 합니다."
      });
    }
    if (sourcePlacement && constructionPlacement) {
      const sourceArea =
        sourcePlacement.regionRectCss.width * sourcePlacement.regionRectCss.height;
      const constructionArea =
        constructionPlacement.regionRectCss.width *
        constructionPlacement.regionRectCss.height;
      const sourceBefore =
        value.compositionOrientation === "source-above"
          ? sourcePlacement.regionRectCss.y + sourcePlacement.regionRectCss.height <=
            constructionPlacement.regionRectCss.y
          : value.compositionOrientation === "source-left"
            ? sourcePlacement.regionRectCss.x + sourcePlacement.regionRectCss.width <=
              constructionPlacement.regionRectCss.x
            : false;
      if (!sourceBefore || sourceArea >= constructionArea) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["compositionOrientation"],
          message: "source tray는 선택한 방향에서 construction 앞에 있고 면적이 더 작아야 합니다."
        });
      }
    }
    for (const [index, placement] of value.placements.entries()) {
      const labelBindingValid =
        placement.labelMode === "native-owned"
          ? placement.labelRectCss === null
          : placement.labelRectCss !== null &&
            contains(placement.regionRectCss, placement.labelRectCss);
      if (
        !labelBindingValid ||
        !contains(placement.regionRectCss, placement.contentRectCss) ||
        !contains(
          placement.contentRectCss,
          placement.reserveUnionAfterTranslationCss
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["placements", index],
          message: "label·content·reserve가 자기 작업 공간 안에 있어야 합니다."
        });
      }
      const centeredX =
        centerX(placement.contentRectCss) -
        centerX(placement.reserveUnionAfterTranslationCss);
      const centeredY =
        centerY(placement.contentRectCss) -
        centerY(placement.reserveUnionAfterTranslationCss);
      const expectedAfter = translateBounds(
        placement.reserveUnionBeforeTranslationCss,
        placement.translationCss
      );
      const clearance = minimumClearance(
        placement.contentRectCss,
        placement.reserveUnionAfterTranslationCss
      );
      if (
        !sameBounds(expectedAfter, placement.reserveUnionAfterTranslationCss) ||
        Math.abs(centeredX) > 0.01 ||
        Math.abs(centeredY) > 0.01 ||
        Math.abs(placement.horizontalCenterDeltaCssPx - Math.abs(centeredX)) > 0.01 ||
        Math.abs(placement.verticalCenterDeltaCssPx - Math.abs(centeredY)) > 0.01 ||
        Math.abs(placement.minimumEdgeClearanceCssPx - clearance) > 0.01
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["placements", index],
          message: "reserve translation·center·clearance는 실제 bounds에서 파생되어야 합니다."
        });
      }
    }
  });

export type EduititHtml30ResolvedLayoutV2 = z.infer<
  typeof eduititHtml30ResolvedLayoutV2Schema
>;

function approximately(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.01;
}

export function sameBounds(left: SpatialBounds, right: SpatialBounds): boolean {
  return (
    approximately(left.x, right.x) &&
    approximately(left.y, right.y) &&
    approximately(left.width, right.width) &&
    approximately(left.height, right.height)
  );
}

export function unionBounds(bounds: readonly SpatialBounds[]): SpatialBounds {
  const left = Math.min(...bounds.map((entry) => entry.x));
  const top = Math.min(...bounds.map((entry) => entry.y));
  const right = Math.max(...bounds.map((entry) => entry.x + entry.width));
  const bottom = Math.max(...bounds.map((entry) => entry.y + entry.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function translateBounds(
  bounds: SpatialBounds,
  translation: { readonly x: number; readonly y: number }
): SpatialBounds {
  return {
    x: bounds.x + translation.x,
    y: bounds.y + translation.y,
    width: bounds.width,
    height: bounds.height
  };
}

export function contains(outer: SpatialBounds, inner: SpatialBounds): boolean {
  return (
    inner.x >= outer.x - 0.01 &&
    inner.y >= outer.y - 0.01 &&
    inner.x + inner.width <= outer.x + outer.width + 0.01 &&
    inner.y + inner.height <= outer.y + outer.height + 0.01
  );
}

export function centerX(bounds: SpatialBounds): number {
  return bounds.x + bounds.width / 2;
}

export function centerY(bounds: SpatialBounds): number {
  return bounds.y + bounds.height / 2;
}

export function minimumClearance(
  outer: SpatialBounds,
  inner: SpatialBounds
): number {
  return Math.min(
    inner.x - outer.x,
    inner.y - outer.y,
    outer.x + outer.width - (inner.x + inner.width),
    outer.y + outer.height - (inner.y + inner.height)
  );
}
