import {
  eduititHtml30ActivitySpecV2Schema,
  eduititHtml30NativeReserveCandidateV2Schema,
  eduititHtml30ResolvedLayoutV2Schema,
  centerX,
  centerY,
  minimumClearance,
  translateBounds,
  type EduititHtml30ActivitySpecV2,
  type EduititHtml30NativeReserveCandidateV2,
  type EduititHtml30ResolvedLayoutV2,
  type SpatialBounds
} from "@mathcanvas/contracts";

const PROFILE = Object.freeze({
  profileId: "student-one-screen-100-v1" as const,
  profileVersion: "1.0.0" as const,
  viewportCssPx: Object.freeze({ width: 1280 as const, height: 800 as const }),
  mathCanvasZoomPercent: 100 as const,
  persistedCanvasScale: 3 as const,
  fixedSafeCss: Object.freeze({ x: 240, y: 64, width: 976, height: 672 }),
  canvas100Candidate: Object.freeze({
    derivation:
      "authenticated-live-screen-ctm" as const,
    sourceAssetPath: "/assets/index-fb571b04.js" as const,
    sourceAssetSha256:
      "bf2c027b6a146b038f1c49b20fb06464c7154d8da42f95977d491c18ff366584" as const,
    viewBox: Object.freeze([0, 0, 1536, 960] as const),
    cssToCanvasScaleX: 1.2 as const,
    cssToCanvasScaleY: 1.2 as const,
    screenOffsetCssPx: Object.freeze({ x: 112 as const, y: 28 as const }),
    fixedSafeCanvas: Object.freeze({
      x: 153.6,
      y: 43.2,
      width: 1171.2,
      height: 806.4
    }),
    liveObserved: true as const
  }),
  observationStatus: "authenticated-live-confirmed" as const
});

const REGION_GAP_CSS_PX = 24;
const REGION_INSET_CSS_PX = 16;
const REGION_VERTICAL_INSET_CSS_PX = 8;
const REGION_LABEL_HEIGHT_CSS_PX = 30.8;
const REGION_LABEL_GAP_CSS_PX = 4;
const INSTRUCTION_LINE_HEIGHT_CSS_PX = 30.8;
const INSTRUCTION_TO_REGION_GAP_CSS_PX = 12;
const RESERVE_MIN_CLEARANCE_CSS_PX = 24;
const RESERVE_SPLIT_ROUNDING_GUARD_CSS_PX = 0.5;

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

function rect(
  x: number,
  y: number,
  width: number,
  height: number
): SpatialBounds {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error("eduitit-html30-layout-v2:invalid-rect");
  }
  return {
    x: rounded(x),
    y: rounded(y),
    width: rounded(width),
    height: rounded(height)
  };
}

function inset(bounds: SpatialBounds, amount: number): SpatialBounds {
  return rect(
    bounds.x + amount,
    bounds.y + amount,
    bounds.width - amount * 2,
    bounds.height - amount * 2
  );
}

function right(bounds: SpatialBounds): number {
  return bounds.x + bounds.width;
}

function bottom(bounds: SpatialBounds): number {
  return bounds.y + bounds.height;
}

function sameStringSet(left: readonly string[], rightValues: readonly string[]): boolean {
  return (
    left.length === rightValues.length &&
    left.every((value, index) => value === rightValues[index])
  );
}

function bandRects(
  activity: EduititHtml30ActivitySpecV2
): {
  readonly questionRectCss: SpatialBounds;
  readonly workbenchRectCss: SpatialBounds;
  readonly answerRectCss: SpatialBounds | null;
} {
  const safe = PROFILE.fixedSafeCss;
  const hasAnswer = activity.learnerTask.answer.kind !== "none";
  const gapCount = hasAnswer ? 2 : 1;
  const availableHeight =
    safe.height - activity.layoutIntent.semanticGapCssPx * gapCount;
  const questionHeight = availableHeight * activity.layoutIntent.questionBandRatio;
  const workbenchHeight = availableHeight * activity.layoutIntent.workbenchBandRatio;
  const answerHeight = availableHeight * activity.layoutIntent.answerBandRatio;
  const questionRectCss = rect(safe.x, safe.y, safe.width, questionHeight);
  const workbenchRectCss = rect(
    safe.x,
    bottom(questionRectCss) + activity.layoutIntent.semanticGapCssPx,
    safe.width,
    workbenchHeight
  );
  const answerRectCss = hasAnswer
    ? rect(
        safe.x,
        bottom(workbenchRectCss) + activity.layoutIntent.semanticGapCssPx,
        safe.width,
        answerHeight
      )
    : null;
  const finalBottom = answerRectCss ? bottom(answerRectCss) : bottom(workbenchRectCss);
  if (Math.abs(finalBottom - bottom(safe)) > 0.01) {
    throw new Error("eduitit-html30-layout-v2:vertical-budget-drift");
  }
  return { questionRectCss, workbenchRectCss, answerRectCss };
}

function roleRects(
  activity: EduititHtml30ActivitySpecV2,
  workbenchRectCss: SpatialBounds,
  reserve: EduititHtml30NativeReserveCandidateV2
): {
  readonly instructionRectCss: SpatialBounds;
  readonly compositionOrientation:
    | "not-applicable"
    | "source-above"
    | "source-left";
  readonly roles: readonly {
    readonly role: EduititHtml30NativeReserveCandidateV2["regions"][number]["role"];
    readonly regionRectCss: SpatialBounds;
    readonly labelMode: "external" | "native-owned";
    readonly labelRectCss: SpatialBounds | null;
    readonly contentRectCss: SpatialBounds;
  }[];
} {
  const workbenchInner = inset(
    workbenchRectCss,
    activity.layoutIntent.workbenchClearanceCssPx
  );
  const instructionHeight =
    activity.learnerTask.localDirections.length * INSTRUCTION_LINE_HEIGHT_CSS_PX;
  const instructionRectCss = rect(
    workbenchInner.x,
    workbenchInner.y,
    workbenchInner.width,
    instructionHeight
  );
  const regionRow = rect(
    workbenchInner.x,
    bottom(instructionRectCss) + INSTRUCTION_TO_REGION_GAP_CSS_PX,
    workbenchInner.width,
    bottom(workbenchInner) -
      bottom(instructionRectCss) -
      INSTRUCTION_TO_REGION_GAP_CSS_PX
  );
  let compositionOrientation:
    | "not-applicable"
    | "source-above"
    | "source-left" = "not-applicable";
  const regionRects: readonly {
    readonly role: EduititHtml30NativeReserveCandidateV2["regions"][number]["role"];
    readonly rect: SpatialBounds;
  }[] =
    activity.layoutIntent.variant === "single-native-workbench"
      ? [{ role: "native-stage", rect: regionRow }]
      : (() => {
          const sourceReserve = reserve.regions.find(
            (region) => region.role === "source-tray"
          );
          const constructionReserve = reserve.regions.find(
            (region) => region.role === "construction-area"
          );
          if (!sourceReserve || !constructionReserve) {
            throw new Error("eduitit-html30-layout-v2:composition-reserve-missing");
          }
          const regionVerticalOverhead =
            REGION_VERTICAL_INSET_CSS_PX * 2 +
            REGION_LABEL_HEIGHT_CSS_PX +
            REGION_LABEL_GAP_CSS_PX;
          const availableHeight = regionRow.height - REGION_GAP_CSS_PX;
          const verticalSourceHeight =
            sourceReserve.union.height +
            regionVerticalOverhead +
            RESERVE_MIN_CLEARANCE_CSS_PX * 2 +
            RESERVE_SPLIT_ROUNDING_GUARD_CSS_PX;
          const verticalConstructionHeight =
            availableHeight - verticalSourceHeight;
          const minimumConstructionHeight =
            constructionReserve.union.height +
            regionVerticalOverhead +
            RESERVE_MIN_CLEARANCE_CSS_PX * 2;
          const verticalFits =
            verticalConstructionHeight >= minimumConstructionHeight - 0.01 &&
            verticalSourceHeight < verticalConstructionHeight &&
            sourceReserve.union.width +
                REGION_INSET_CSS_PX * 2 +
                RESERVE_MIN_CLEARANCE_CSS_PX * 2 <=
              regionRow.width &&
            constructionReserve.union.width +
                REGION_INSET_CSS_PX * 2 +
                RESERVE_MIN_CLEARANCE_CSS_PX * 2 <=
              regionRow.width;

          const availableWidth = regionRow.width - REGION_GAP_CSS_PX;
          const horizontalSourceWidth =
            sourceReserve.union.width +
            REGION_INSET_CSS_PX * 2 +
            RESERVE_MIN_CLEARANCE_CSS_PX * 2 +
            RESERVE_SPLIT_ROUNDING_GUARD_CSS_PX;
          const horizontalConstructionWidth =
            availableWidth - horizontalSourceWidth;
          const minimumConstructionWidth =
            constructionReserve.union.width +
            REGION_INSET_CSS_PX * 2 +
            RESERVE_MIN_CLEARANCE_CSS_PX * 2;
          const availableContentHeight =
            regionRow.height - regionVerticalOverhead;
          const horizontalFits =
            horizontalConstructionWidth >= minimumConstructionWidth - 0.01 &&
            horizontalSourceWidth < horizontalConstructionWidth &&
            sourceReserve.union.height + RESERVE_MIN_CLEARANCE_CSS_PX * 2 <=
              availableContentHeight &&
            constructionReserve.union.height +
                RESERVE_MIN_CLEARANCE_CSS_PX * 2 <=
              availableContentHeight;

          if (horizontalFits) {
            compositionOrientation = "source-left";
            return [
              {
                role: "source-tray" as const,
                rect: rect(
                  regionRow.x,
                  regionRow.y,
                  horizontalSourceWidth,
                  regionRow.height
                )
              },
              {
                role: "construction-area" as const,
                rect: rect(
                  regionRow.x + horizontalSourceWidth + REGION_GAP_CSS_PX,
                  regionRow.y,
                  horizontalConstructionWidth,
                  regionRow.height
                )
              }
            ];
          }
          if (!verticalFits) {
            throw new Error("eduitit-html30-layout-v2:composition-reserve-budget");
          }
          compositionOrientation = "source-above";
          return [
            {
              role: "source-tray" as const,
              rect: rect(
                regionRow.x,
                regionRow.y,
                regionRow.width,
                verticalSourceHeight
              )
            },
            {
              role: "construction-area" as const,
              rect: rect(
                regionRow.x,
                regionRow.y + verticalSourceHeight + REGION_GAP_CSS_PX,
                regionRow.width,
                verticalConstructionHeight
              )
            }
          ];
        })();
  return {
    instructionRectCss,
    compositionOrientation,
    roles: regionRects.map(({ role, rect: regionRectCss }) => {
      const labelMode =
        activity.nativePlan.core.toolKey === "DP03PG"
          ? "native-owned" as const
          : "external" as const;
      if (labelMode === "native-owned") {
        return {
          role,
          regionRectCss,
          labelMode,
          labelRectCss: null,
          contentRectCss: regionRectCss
        };
      }
      const labelRectCss = rect(
        regionRectCss.x + REGION_INSET_CSS_PX,
        regionRectCss.y + REGION_VERTICAL_INSET_CSS_PX,
        regionRectCss.width - REGION_INSET_CSS_PX * 2,
        REGION_LABEL_HEIGHT_CSS_PX
      );
      const contentTop = bottom(labelRectCss) + REGION_LABEL_GAP_CSS_PX;
      const contentRectCss = rect(
        regionRectCss.x + REGION_INSET_CSS_PX,
        contentTop,
        regionRectCss.width - REGION_INSET_CSS_PX * 2,
        bottom(regionRectCss) - REGION_VERTICAL_INSET_CSS_PX - contentTop
      );
      return { role, regionRectCss, labelMode, labelRectCss, contentRectCss };
    })
  };
}

export function resolveEduititHtml30LayoutCandidateV2(
  activityInput: EduititHtml30ActivitySpecV2,
  reserveInput: EduititHtml30NativeReserveCandidateV2
): EduititHtml30ResolvedLayoutV2 {
  const activity = eduititHtml30ActivitySpecV2Schema.parse(activityInput);
  const reserve = eduititHtml30NativeReserveCandidateV2Schema.parse(reserveInput);
  if (
    reserve.activityId !== activity.activityId ||
    reserve.layoutVariant !== activity.layoutIntent.variant
  ) {
    throw new Error("eduitit-html30-layout-v2:activity-reserve-binding");
  }
  const expectedToolKeys = [
    activity.nativePlan.core.toolKey,
    ...(activity.nativePlan.supporting
      ? [activity.nativePlan.supporting.toolKey]
      : [])
  ];
  if (!sameStringSet(reserve.toolKeys, expectedToolKeys)) {
    throw new Error("eduitit-html30-layout-v2:tool-binding");
  }
  const { questionRectCss, workbenchRectCss, answerRectCss } =
    bandRects(activity);
  const { instructionRectCss, compositionOrientation, roles } = roleRects(
    activity,
    workbenchRectCss,
    reserve
  );
  const placements = roles.map((role) => {
    const reserveRegion = reserve.regions.find(
      (candidate) => candidate.role === role.role
    );
    if (!reserveRegion) {
      throw new Error(`eduitit-html30-layout-v2:reserve-role-missing:${role.role}`);
    }
    const union = reserveRegion.union;
    if (
      union.width > role.contentRectCss.width + 0.01 ||
      union.height > role.contentRectCss.height + 0.01
    ) {
      throw new Error(`eduitit-html30-layout-v2:reserve-overflow:${role.role}`);
    }
    const translationCss = {
      x: rounded(centerX(role.contentRectCss) - centerX(union)),
      y: rounded(centerY(role.contentRectCss) - centerY(union))
    };
    const after = translateBounds(union, translationCss);
    const horizontalDelta = Math.abs(centerX(role.contentRectCss) - centerX(after));
    const verticalDelta = Math.abs(centerY(role.contentRectCss) - centerY(after));
    const edgeClearance = minimumClearance(role.contentRectCss, after);
    if (edgeClearance < RESERVE_MIN_CLEARANCE_CSS_PX - 0.01) {
      throw new Error(`eduitit-html30-layout-v2:reserve-clearance:${role.role}`);
    }
    return {
      role: role.role,
      regionRectCss: role.regionRectCss,
      labelMode: role.labelMode,
      labelRectCss: role.labelRectCss,
      contentRectCss: role.contentRectCss,
      reserveUnionBeforeTranslationCss: union,
      translationCss,
      reserveUnionAfterTranslationCss: {
        x: rounded(after.x),
        y: rounded(after.y),
        width: rounded(after.width),
        height: rounded(after.height)
      },
      horizontalCenterDeltaCssPx: rounded(horizontalDelta),
      verticalCenterDeltaCssPx: rounded(verticalDelta),
      minimumEdgeClearanceCssPx: rounded(
        edgeClearance
      )
    };
  });
  const sourcePlacement = placements.find(
    (placement) => placement.role === "source-tray"
  );
  const workbenchDominant =
    workbenchRectCss.height / PROFILE.fixedSafeCss.height >= 0.72;
  const sourceTraySmallerThanConstruction =
    !sourcePlacement ||
    sourcePlacement.regionRectCss.width * sourcePlacement.regionRectCss.height <
      (() => {
        const construction = placements.find(
          (placement) => placement.role === "construction-area"
        )!;
        return construction.regionRectCss.width * construction.regionRectCss.height;
      })();
  if (!workbenchDominant || !sourceTraySmallerThanConstruction) {
    throw new Error("eduitit-html30-layout-v2:workbench-share");
  }
  return eduititHtml30ResolvedLayoutV2Schema.parse({
    schemaVersion: "1.0.0",
    activityId: activity.activityId,
    profileId: PROFILE.profileId,
    profileVersion: PROFILE.profileVersion,
    viewportCssPx: PROFILE.viewportCssPx,
    mathCanvasZoomPercent: PROFILE.mathCanvasZoomPercent,
    persistedCanvasScale: PROFILE.persistedCanvasScale,
    canvas100Candidate: PROFILE.canvas100Candidate,
    fixedSafeCss: PROFILE.fixedSafeCss,
    questionRectCss,
    workbenchRectCss,
    instructionRectCss,
    answerRectCss,
    compositionOrientation,
    placements,
    typographyCssPx: {
      question: 28,
      instruction: 22,
      regionLabel: 22,
      answer: 24
    },
    checks: {
      oneProblem: true,
      noScroll: true,
      noCanvasPan: true,
      noNativeAutoScale: true,
      allEstimatedReserveStatesContained: true,
      actualReserveStatesVerified: false,
      allReserveUnionsCentered: true,
      workbenchDominant: true,
      sourceTraySmallerThanConstruction: true,
      externalWriteAllowed: false
    },
    blockers: [
      "100-percent editor geometry requires live confirmation",
      "reserve estimates require actual state-envelope replacement"
    ]
  });
}

export const EDUITIT_HTML30_100_PROFILE_V1 = PROFILE;
