import {
  EDUITIT_HTML30_LAYOUT_V2_SCHEMA_VERSION,
  eduititHtml30NativeReserveCandidateV2Schema,
  unionBounds,
  type EduititHtml30ActivitySpecV2,
  type EduititHtml30NativeReserveCandidateV2,
  type SpatialBounds
} from "@mathcanvas/contracts";

interface ReserveSize {
  readonly width: number;
  readonly height: number;
}

interface ReserveEstimate {
  readonly single?: ReserveSize;
  readonly source?: ReserveSize;
  readonly construction?: ReserveSize;
}

const estimates: readonly ReserveEstimate[] = [
  { single: { width: 760, height: 335 } },
  { single: { width: 620, height: 360 } },
  { single: { width: 620, height: 360 } },
  { single: { width: 780, height: 320 } },
  { single: { width: 620, height: 320 } },
  { source: { width: 600, height: 134 }, construction: { width: 820, height: 100 } },
  { source: { width: 320, height: 330 }, construction: { width: 420, height: 260 } },
  { source: { width: 320, height: 275 }, construction: { width: 420, height: 260 } },
  { source: { width: 320, height: 390 }, construction: { width: 420, height: 260 } },
  { single: { width: 720, height: 180 } },
  { single: { width: 720, height: 200 } },
  { single: { width: 720, height: 180 } },
  { single: { width: 720, height: 180 } },
  { source: { width: 300, height: 380 }, construction: { width: 420, height: 280 } },
  { source: { width: 300, height: 380 }, construction: { width: 420, height: 280 } },
  { source: { width: 300, height: 300 }, construction: { width: 420, height: 280 } },
  { single: { width: 720, height: 320 } },
  { single: { width: 780, height: 320 } },
  { single: { width: 848, height: 320 } },
  { source: { width: 320, height: 245 }, construction: { width: 420, height: 260 } },
  { source: { width: 600, height: 134 }, construction: { width: 820, height: 100 } },
  { source: { width: 320, height: 390 }, construction: { width: 420, height: 260 } },
  { single: { width: 335, height: 335 } },
  { single: { width: 335, height: 335 } },
  { single: { width: 720, height: 180 } },
  { source: { width: 720, height: 90 }, construction: { width: 820, height: 160 } },
  { single: { width: 720, height: 240 } },
  { source: { width: 300, height: 300 }, construction: { width: 420, height: 180 } },
  { source: { width: 300, height: 210 }, construction: { width: 430, height: 180 } },
  { single: { width: 760, height: 335 } }
];

function stateBounds(size: ReserveSize): readonly [SpatialBounds, SpatialBounds, SpatialBounds] {
  const insetX = Math.min(12, size.width / 8);
  const insetY = Math.min(12, size.height / 8);
  return [
    {
      x: insetX,
      y: insetY,
      width: size.width - insetX * 2,
      height: size.height - insetY * 2
    },
    { x: 0, y: 0, width: size.width, height: size.height },
    {
      x: insetX / 2,
      y: insetY / 2,
      width: size.width - insetX,
      height: size.height - insetY
    }
  ];
}

function region(
  role: "native-stage" | "source-tray" | "construction-area",
  size: ReserveSize
): EduititHtml30NativeReserveCandidateV2["regions"][number] {
  const bounds = stateBounds(size);
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

export function buildEduititHtml30ReserveCandidatesV2(
  activities: readonly EduititHtml30ActivitySpecV2[]
): readonly EduititHtml30NativeReserveCandidateV2[] {
  if (activities.length !== 30 || estimates.length !== 30) {
    throw new Error("eduitit-html30-reserves-v2:exact-30-required");
  }
  return activities.map((activity, index) => {
    const estimate = estimates[index];
    if (!estimate || activity.sequence !== index + 1) {
      throw new Error(`eduitit-html30-reserves-v2:sequence-drift:${index + 1}`);
    }
    const isSingle = activity.layoutIntent.variant === "single-native-workbench";
    const regions = isSingle
      ? estimate.single
        ? [region("native-stage", estimate.single)]
        : null
      : estimate.source && estimate.construction
        ? [
            region("source-tray", estimate.source),
            region("construction-area", estimate.construction)
          ]
        : null;
    if (!regions) {
      throw new Error(`eduitit-html30-reserves-v2:variant-estimate-drift:${activity.sequence}`);
    }
    return eduititHtml30NativeReserveCandidateV2Schema.parse({
      schemaVersion: EDUITIT_HTML30_LAYOUT_V2_SCHEMA_VERSION,
      reserveId: `${activity.activityId}-reserve`,
      activityId: activity.activityId,
      layoutVariant: activity.layoutIntent.variant,
      toolKeys: [
        activity.nativePlan.core.toolKey,
        ...(activity.nativePlan.supporting
          ? [activity.nativePlan.supporting.toolKey]
          : [])
      ],
      nativeScale: 1,
      measurementStatus: "offline-conservative-estimate",
      regions,
      actualEvidencePending: true
    });
  });
}
