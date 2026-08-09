interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pointBounds(points: readonly unknown[], offsetX: number, offsetY: number): Bounds | null {
  const parsed = points
    .map((point) =>
      Array.isArray(point) &&
      finiteNumber(point[0]) !== null &&
      finiteNumber(point[1]) !== null
        ? [finiteNumber(point[0])!, finiteNumber(point[1])!] as const
        : null
    )
    .filter((point): point is readonly [number, number] => point !== null);
  if (parsed.length === 0) return null;
  const xs = parsed.map((point) => point[0] + offsetX);
  const ys = parsed.map((point) => point[1] + offsetY);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function objectBounds(object: Record<string, unknown>): Bounds {
  const x = finiteNumber(object.x) ?? 0;
  const y = finiteNumber(object.y) ?? 0;
  const coordinates = Array.isArray(object.coordinates) ? object.coordinates : [];
  const absoluteCoordinates = object.svgId === "drawElem";
  const fromPoints = pointBounds(
    coordinates,
    absoluteCoordinates ? 0 : x,
    absoluteCoordinates ? 0 : y
  );
  if (fromPoints && fromPoints.width > 0 && fromPoints.height > 0) {
    return fromPoints;
  }
  const width = finiteNumber(object.width);
  const height = finiteNumber(object.height);
  if (width !== null && height !== null && width > 0 && height > 0) {
    return { x, y, width, height };
  }
  const radius = finiteNumber(object.r);
  if (radius !== null && radius > 0) {
    return { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 };
  }
  throw new Error(`canonical-native-group-v2:bounds-unavailable:${String(object.id)}`);
}

function unionBounds(bounds: readonly Bounds[]): Bounds {
  const left = Math.min(...bounds.map((value) => value.x));
  const top = Math.min(...bounds.map((value) => value.y));
  const right = Math.max(...bounds.map((value) => value.x + value.width));
  const bottom = Math.max(...bounds.map((value) => value.y + value.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export interface CanonicalNativeGroupV2 {
  readonly wrapper: Record<string, unknown>;
  readonly members: readonly Record<string, unknown>[];
}

/**
 * Persists the same wrapper/member relation MathCanvas emits after its native
 * group command. The wrapper is returned separately because MathCanvas stores
 * all group wrappers before ordinary canvas objects.
 */
export function makeCanonicalNativeGroupV2(
  groupId: string,
  memberObjects: readonly Record<string, unknown>[],
  padding = 8
): CanonicalNativeGroupV2 {
  if (memberObjects.length < 2 || new Set(memberObjects.map((item) => item.id)).size !== memberObjects.length) {
    throw new Error(`canonical-native-group-v2:member-cardinality:${groupId}`);
  }
  const ids = memberObjects.map((object) => {
    if (typeof object.id !== "string" || object.id.length === 0) {
      throw new Error(`canonical-native-group-v2:member-id:${groupId}`);
    }
    return object.id;
  });
  const memberUnion = unionBounds(memberObjects.map(objectBounds));
  const viewBox = {
    x: memberUnion.x - padding,
    y: memberUnion.y - padding,
    width: memberUnion.width + padding * 2,
    height: memberUnion.height + padding * 2
  };
  const members = memberObjects.map((object) => ({
    ...structuredClone(object),
    groupId,
    isGroup: true,
    isGroupElement: false
  }));
  return {
    wrapper: {
      x: viewBox.x,
      y: viewBox.y,
      _x: viewBox.x,
      _y: viewBox.y,
      cx: 0,
      cy: 0,
      rx: 0,
      ry: 0,
      id: groupId,
      ids: [...ids].reverse(),
      fill: "#ffffff",
      scale: 1,
      rotate: 0,
      stroke: "#000000",
      groupId,
      padding,
      parent: null,
      viewBox,
      svgId: "group-element",
      sizeScale: 1,
      clickCount: 1,
      coordinates: [],
      elemSplice: false,
      isBluePrint: true,
      fillOpacity: 1,
      initSizeScale: 1,
      isGroup: true,
      isGroupElement: false,
      isGroupGridOn: false,
      isMerge: false,
      isSplit: false,
      isStackUp: false,
      isEyeOn: false,
      isFillChange: false,
      isMoveRotateHandler: false,
      isStrokeChange: false,
      isSurroundRect: false,
      isTextEdit: false,
      isTextEditFontSize: false,
      isVerticalFlip: false,
      isHorizontalFlip: false,
      isColorInverted: false,
      isCenterGravityPolygon: false,
      playgroundIndex: 0,
      strokeDashArray: "",
      strokeOpacity: 1,
      strokeType: 1,
      strokeWidth: 4
    },
    members
  };
}
