import type {
  FractionModelIntent,
  LatexIntent,
  NativeToolPlacement,
  NumberCardIntent,
  RectangleIntent,
  TextIntent
} from "./native-tool-contracts.js";
import { assertReleasedModuleVariant } from "./native-module-variant-contracts.js";
import { NUMBER_CARD_SVG_BY_VALUE } from "./number-card-digit-contract.js";

export {
  NUMBER_CARD_DIGIT_CONTRACT_EVIDENCE,
  NUMBER_CARD_DIGIT_VARIANTS,
  NUMBER_CARD_SVG_BY_VALUE
} from "./number-card-digit-contract.js";

export const FRACTION_SVG_BY_DENOMINATOR: Readonly<Record<number, string>> = {
  1: "NO03FM-10",
  2: "NO03FM-09",
  3: "NO03FM-08",
  4: "NO03FM-07",
  5: "NO03FM-06",
  6: "NO03FM-05",
  7: "NO03FM-04",
  8: "NO03FM-03",
  9: "NO03FM-02",
  10: "NO03FM-01",
  11: "NO03FM-21",
  12: "NO03FM-22"
};

const objectCommon = {
  rx: 0,
  ry: 0,
  scale: 1,
  rotate: 0,
  stroke: "#000000",
  groupId: "",
  isGroup: false,
  isMerge: false,
  isSplit: false,
  isStackUp: false,
  sizeScale: 1,
  clickCount: 1,
  elemSplice: false,
  isTextEdit: false,
  strokeType: 1,
  fillOpacity: 1,
  isBluePrint: false,
  strokeWidth: 4,
  isFillChange: true,
  initSizeScale: 1,
  isGroupGridOn: false,
  strokeOpacity: 1,
  isGroupElement: false,
  isStrokeChange: false,
  isSurroundRect: false,
  isVerticalFlip: false,
  isColorInverted: false,
  playgroundIndex: 1,
  strokeDashArray: "",
  isHorizontalFlip: false,
  isTextEditFontSize: false,
  isMoveRotateHandler: true,
  isCenterGravityPolygon: false
} as const;

export function makeFractionObject(
  intent: FractionModelIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  const { numerator, denominator } = intent.fraction;
  const perWidth = placement.width / denominator;
  const geometricWidth = perWidth * numerator;
  const width = Math.round(geometricWidth);
  const cx = (geometricWidth - perWidth) / 2;
  const left = -perWidth / 2;
  const right = geometricWidth - perWidth / 2;
  return {
    ...objectCommon,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    cx,
    cy: 0,
    id: placement.id,
    fill: intent.color,
    type: "rect",
    count: numerator,
    svgId: FRACTION_SVG_BY_DENOMINATOR[denominator],
    width,
    height: placement.height,
    parent: {
      mouseX: 0,
      mouseY: 0,
      isAngleHandle: false,
      isResizeHandle: false
    },
    divider: denominator,
    isEyeOn: true,
    perWidth,
    isDecimal: false,
    coordinates: [
      [left, -placement.height / 2],
      [right, -placement.height / 2],
      [right, placement.height / 2],
      [left, placement.height / 2]
    ],
    defaultWidth: placement.width
  };
}

export function makeNumberCardObject(
  intent: NumberCardIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  if (!Number.isInteger(intent.value) || intent.value < 0 || intent.value > 9) {
    throw new Error(`number-card-value-out-of-range:${intent.value}`);
  }
  const svgId = NUMBER_CARD_SVG_BY_VALUE[intent.value];
  if (!svgId) {
    throw new Error(`Unsupported number card value: ${intent.value}`);
  }
  assertReleasedModuleVariant("NO04NT", svgId);
  return {
    ...objectCommon,
    x: placement.x,
    y: placement.y,
    _x: 0,
    _y: 0,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: "#2194FF",
    svgId,
    parent: { variation: 25 },
    isEyeOn: false,
    isHFlip: false,
    isVFlip: false,
    isCardBack: false,
    numberFrameSnap: true,
    isHorizontalFlip: true,
    isVerticalFlip: true,
    coordinates: [
      [-40, -40],
      [40, -40],
      [40, 40],
      [-40, 40]
    ]
  };
}

export function makeTextObject(
  intent: TextIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  const fontSize = intent.fontSize ?? 40;
  return {
    ...objectCommon,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: "#000000",
    text: intent.text,
    svgId: "input-text",
    width: placement.width,
    height: placement.height,
    parent: { observer: null },
    isEyeOn: false,
    fontSize,
    clickCount: 0,
    isTextEdit: true,
    playgroundIndex: 2,
    isMoveRotateHandler: false,
    isTextEditFontSize: true,
    coordinates: []
  };
}

export function makeLatexObject(
  intent: LatexIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  const fontSize = intent.fontSize ?? 52;
  return {
    ...objectCommon,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: "transparent",
    text: intent.text,
    svgId: "math-latex",
    width: placement.width,
    height: placement.height,
    parent: null,
    isEyeOn: false,
    fontSize,
    coordinates: [],
    isMoveRotateHandler: false,
    isTextEditFontSize: true
  };
}

export function makeRectangleObject(
  intent: RectangleIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  const point2X = placement.x + placement.width;
  const point2Y = placement.y + placement.height;
  const stroke = intent.stroke ?? "#8A94A6";
  const strokeDashArray = intent.strokeDashArray ?? "none";
  return {
    ...objectCommon,
    x: 0,
    y: 0,
    _x: 0,
    _y: 0,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: intent.fill,
    text: "",
    type: "rect",
    svgId: "drawElem",
    parent: {
      r: null,
      endX: null,
      endY: null,
      defaultX: null,
      defaultY: null,
      isCircle1: false,
      isCircle2: false,
      curveMaxOffset: 140,
      isCurveHandler: false,
      isRadiusHandler: false
    },
    point1: [placement.x, placement.y],
    point2: [point2X, point2Y],
    radius: 12,
    stroke,
    coordinates: [
      [placement.x, placement.y],
      [point2X, placement.y],
      [point2X, point2Y],
      [placement.x, point2Y]
    ],
    curveOffset: 0,
    strokeWidth: 2,
    strokeType: 1,
    strokeDashArray,
    isStrokeChange: true,
    isMoveRotateHandler: false
  };
}
