import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  eduititHtml30NativeReserveCandidateV2Schema,
  eduititHtml30ResolvedLayoutV2Schema,
  unionBounds,
  type EduititHtml30ActivitySpecV2,
  type EduititHtml30NativeReserveCandidateV2,
  type SpatialBounds
} from "@mathcanvas/contracts";
import {
  buildEduititHtml30ActivitySpecsV2,
  type EduititHtml30PromptHarnessInput
} from "@mathcanvas/templates";
import { resolveEduititHtml30LayoutCandidateV2 } from "./eduitit-html30-layout-v2.js";
import { buildEduititHtml30ReserveCandidatesV2 } from "./eduitit-html30-reserve-candidates-v2.js";

function harness(): EduititHtml30PromptHarnessInput {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "research/mathcanvas/eduitit-html30-prompt-harness.json"),
      "utf8"
    )
  ) as EduititHtml30PromptHarnessInput;
}

function activities(): readonly EduititHtml30ActivitySpecV2[] {
  return buildEduititHtml30ActivitySpecsV2(harness());
}

function region(
  role: "native-stage" | "source-tray" | "construction-area",
  bounds: readonly [SpatialBounds, SpatialBounds, SpatialBounds]
): EduititHtml30NativeReserveCandidateV2["regions"][number] {
  return {
    role,
    states: [
      { state: "initial", bounds: bounds[0] },
      { state: "selected", bounds: bounds[1] },
      { state: "manipulated", bounds: bounds[2] }
    ],
    union: unionBounds(bounds),
    minimumControlCssPx: 44,
    minimumGlyphCssPx: 22
  };
}

function reserve(
  activity: EduititHtml30ActivitySpecV2
): EduititHtml30NativeReserveCandidateV2 {
  const toolKeys = [
    activity.nativePlan.core.toolKey,
    ...(activity.nativePlan.supporting
      ? [activity.nativePlan.supporting.toolKey]
      : [])
  ];
  const regions =
    activity.layoutIntent.variant === "single-native-workbench"
      ? [
          region("native-stage", [
            { x: 0, y: 0, width: 320, height: 180 },
            { x: -20, y: -20, width: 360, height: 220 },
            { x: -10, y: -10, width: 340, height: 200 }
          ])
        ]
      : [
          region("source-tray", [
            { x: 0, y: 0, width: 160, height: 100 },
            { x: -10, y: -10, width: 180, height: 120 },
            { x: 0, y: 0, width: 170, height: 110 }
          ]),
          region("construction-area", [
            { x: 0, y: 0, width: 420, height: 140 },
            { x: -20, y: -10, width: 460, height: 160 },
            { x: -10, y: -5, width: 440, height: 150 }
          ])
        ];
  return eduititHtml30NativeReserveCandidateV2Schema.parse({
    schemaVersion: "1.0.0",
    reserveId: `${activity.activityId}-reserve`,
    activityId: activity.activityId,
    layoutVariant: activity.layoutIntent.variant,
    toolKeys,
    nativeScale: 1,
    measurementStatus: "offline-conservative-estimate",
    regions,
    actualEvidencePending: true
  });
}

describe("Eduitit HTML30 100% reserve-first layout candidate resolver", () => {
  it("30개 전체를 자동 축소 없이 해석하고 모든 reserve에 24px 이상 여백을 둔다", () => {
    const allActivities = activities();
    const allReserves = buildEduititHtml30ReserveCandidatesV2(allActivities);
    expect(allActivities).toHaveLength(30);
    expect(allReserves).toHaveLength(30);

    const allLayouts = allActivities.map((activity, index) =>
      resolveEduititHtml30LayoutCandidateV2(activity, allReserves[index]!)
    );
    expect(allLayouts).toHaveLength(30);
    expect(
      Math.min(
        ...allLayouts.flatMap((layout) =>
          layout.placements.map((placement) => placement.minimumEdgeClearanceCssPx)
        )
      )
    ).toBeGreaterThanOrEqual(24);
    expect(allLayouts.every((layout) => layout.checks.noNativeAutoScale)).toBe(true);
  });

  it("1280×800·실제 100%·scale=3에서 문제→작업판→작은 답 순서를 고정한다", () => {
    const withoutAnswer = resolveEduititHtml30LayoutCandidateV2(
      activities()[0]!,
      reserve(activities()[0]!)
    );
    const withAnswer = resolveEduititHtml30LayoutCandidateV2(
      activities()[10]!,
      reserve(activities()[10]!)
    );
    for (const result of [withoutAnswer, withAnswer]) {
      expect(result).toMatchObject({
        profileId: "student-one-screen-100-v1",
        viewportCssPx: { width: 1280, height: 800 },
        mathCanvasZoomPercent: 100,
        persistedCanvasScale: 3,
        fixedSafeCss: { x: 240, y: 64, width: 976, height: 672 },
        canvas100Candidate: {
          derivation: "authenticated-live-screen-ctm",
          screenOffsetCssPx: { x: 112, y: 28 },
          fixedSafeCanvas: { x: 153.6, y: 43.2, width: 1171.2, height: 806.4 },
          liveObserved: true
        }
      });
      expect(result.workbenchRectCss.y).toBeGreaterThan(
        result.questionRectCss.y + result.questionRectCss.height
      );
      expect(result.workbenchRectCss.height / result.fixedSafeCss.height).toBeGreaterThanOrEqual(
        0.72
      );
    }
    expect(withoutAnswer.answerRectCss).toBeNull();
    expect(withAnswer.answerRectCss!.y).toBeGreaterThan(
      withAnswer.workbenchRectCss.y + withAnswer.workbenchRectCss.height
    );
  });

  it("single과 composition의 모든 reserve union을 자기 content rect 정중앙에 둔다", () => {
    for (const activity of [activities()[0]!, activities()[5]!, activities()[16]!]) {
      const result = resolveEduititHtml30LayoutCandidateV2(
        activity,
        reserve(activity)
      );
      for (const placement of result.placements) {
        expect(placement.horizontalCenterDeltaCssPx).toBeLessThanOrEqual(0.001);
        expect(placement.verticalCenterDeltaCssPx).toBeLessThanOrEqual(0.001);
        expect(placement.minimumEdgeClearanceCssPx).toBeGreaterThan(0);
      }
    }
  });

  it("그림그래프는 중복 외부 라벨 없이 네이티브 전체 외곽을 작업 공간에 둔다", () => {
    for (const activity of [activities()[0]!, activities()[29]!]) {
      const result = resolveEduititHtml30LayoutCandidateV2(
        activity,
        buildEduititHtml30ReserveCandidatesV2(activities())[activity.sequence - 1]!
      );
      const stage = result.placements[0]!;
      expect(stage.labelMode).toBe("native-owned");
      expect(stage.labelRectCss).toBeNull();
      expect(stage.contentRectCss).toEqual(stage.regionRectCss);
    }
  });

  it("composition은 reserve에 따라 source tray를 앞에 두고 construction area를 더 크게 둔다", () => {
    const activity = activities()[5]!;
    const result = resolveEduititHtml30LayoutCandidateV2(
      activity,
      reserve(activity)
    );
    const source = result.placements.find((entry) => entry.role === "source-tray")!;
    const construction = result.placements.find(
      (entry) => entry.role === "construction-area"
    )!;
    expect(result.compositionOrientation).toBe("source-left");
    expect(source.regionRectCss.x + source.regionRectCss.width).toBeLessThan(
      construction.regionRectCss.x
    );
    expect(source.regionRectCss.width * source.regionRectCss.height).toBeLessThan(
      construction.regionRectCss.width * construction.regionRectCss.height
    );
    expect(result.checks.sourceTraySmallerThanConstruction).toBe(true);
  });

  it("selected/manipulated chrome를 포함한 union이 content rect를 넘으면 자동 축소 없이 거부한다", () => {
    const activity = activities()[0]!;
    const oversized = structuredClone(reserve(activity));
    oversized.regions[0]!.states[1].bounds.width = 2000;
    oversized.regions[0]!.union = unionBounds(
      oversized.regions[0]!.states.map((entry) => entry.bounds)
    );
    expect(() =>
      resolveEduititHtml30LayoutCandidateV2(activity, oversized)
    ).toThrow("eduitit-html30-layout-v2:reserve-overflow:native-stage");
  });

  it("임의 nativeScale·도구 swap·activity swap을 fail-closed한다", () => {
    const activity = activities()[0]!;
    const scaled = structuredClone(reserve(activity));
    (scaled.nativeScale as number) = 0.65;
    expect(() => resolveEduititHtml30LayoutCandidateV2(activity, scaled)).toThrow();

    const tool = structuredClone(reserve(activity));
    tool.toolKeys = ["NO04NT"];
    expect(() => resolveEduititHtml30LayoutCandidateV2(activity, tool)).toThrow(
      "eduitit-html30-layout-v2:tool-binding"
    );

    const swapped = structuredClone(reserve(activity));
    swapped.activityId = activities()[1]!.activityId;
    swapped.reserveId = `${swapped.activityId}-reserve`;
    expect(() => resolveEduititHtml30LayoutCandidateV2(activity, swapped)).toThrow(
      "eduitit-html30-layout-v2:activity-reserve-binding"
    );
  });

  it("resolved placement를 경계로 옮기거나 중앙 수치를 속이면 schema가 거부한다", () => {
    const activity = activities()[0]!;
    const result = structuredClone(
      resolveEduititHtml30LayoutCandidateV2(activity, reserve(activity))
    );
    result.placements[0]!.reserveUnionAfterTranslationCss.x =
      result.placements[0]!.contentRectCss.x;
    result.placements[0]!.translationCss.x =
      result.placements[0]!.reserveUnionAfterTranslationCss.x -
      result.placements[0]!.reserveUnionBeforeTranslationCss.x;
    result.placements[0]!.horizontalCenterDeltaCssPx = 0;
    result.placements[0]!.minimumEdgeClearanceCssPx = 0;
    expect(eduititHtml30ResolvedLayoutV2Schema.safeParse(result).success).toBe(false);
  });
});
