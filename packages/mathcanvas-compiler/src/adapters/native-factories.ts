import type {
  AnalogClockIntent,
  BalanceScaleIntent,
  BarChartIntent,
  DataTableIntent,
  FractionModelIntent,
  LatexIntent,
  NativeToolPlacement,
  NumberCardIntent,
  PatternBlockIntent,
  PlaceValueModelIntent,
  RectangleIntent,
  TextIntent
} from "./native-tool-contracts.js";
import { assertReleasedModuleVariant } from "./native-module-variant-contracts.js";
import { NUMBER_CARD_SVG_BY_VALUE } from "./number-card-digit-contract.js";
import {
  NUMBER_CARD_RENDERED_SIZE,
  PLACE_VALUE_MODEL_RENDERED_DIAMETER,
  resolveNativeRenderedBounds
} from "./native-rendered-bounds.js";
import { PATTERN_BLOCK_VARIANTS } from "./native-pattern-block-contract.js";
import {
  BAR_CHART_STRUCTURAL_FIELDS,
  BAR_CHART_SVG_ID,
  DATA_TABLE_STRUCTURAL_FIELDS,
  DATA_TABLE_SVG_ID,
  barChartAxisMaximum
} from "./native-graph-tool-contract.js";

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

export const PLACE_VALUE_SVG_BY_VALUE = {
  100: "NO04PD-03",
  10: "NO04PD-04",
  1: "NO04PD-05"
} as const satisfies Readonly<Record<PlaceValueModelIntent["value"], string>>;

const PLACE_VALUE_FILL_BY_VALUE = {
  100: "#7FD50F",
  10: "#18C5FF",
  1: "#FF5862"
} as const satisfies Readonly<Record<PlaceValueModelIntent["value"], string>>;

const ANALOG_CLOCK_DESIGN_DIAMETER = 360;

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
  const x = placement.x + perWidth / 2;
  const y = placement.y + placement.height / 2;
  return {
    ...objectCommon,
    x,
    y,
    _x: x,
    _y: y,
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
    isEyeOn: intent.showLabel !== false,
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
  const halfSize = NUMBER_CARD_RENDERED_SIZE / 2;
  const x = placement.x + placement.width / 2;
  const y = placement.y + placement.height / 2;
  return {
    ...objectCommon,
    x,
    y,
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
      [-halfSize, -halfSize],
      [halfSize, -halfSize],
      [halfSize, halfSize],
      [-halfSize, halfSize]
    ]
  };
}

export function makePlaceValueModelObject(
  intent: PlaceValueModelIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  const svgId = PLACE_VALUE_SVG_BY_VALUE[intent.value];
  if (!svgId) {
    throw new Error(`place-value-model-unsupported-value:${intent.value}`);
  }
  assertReleasedModuleVariant("NO04PD", svgId);
  const radius = PLACE_VALUE_MODEL_RENDERED_DIAMETER / 2;
  const x = placement.x + placement.width / 2;
  const y = placement.y + placement.height / 2;
  return {
    ...objectCommon,
    x,
    y,
    _x: 0,
    _y: 0,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: PLACE_VALUE_FILL_BY_VALUE[intent.value],
    svgId,
    parent: {},
    count: 1,
    n: intent.value,
    r: radius,
    numberFrameSnap: true,
    isEyeOn: false,
    isFillChange: false,
    isMoveRotateHandler: false,
    coordinates: [
      [-radius, -radius],
      [radius, -radius],
      [radius, radius],
      [-radius, radius]
    ]
  };
}

export function makePatternBlockObject(
  intent: PatternBlockIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  const contract = PATTERN_BLOCK_VARIANTS[intent.variant];
  if (!contract) {
    throw new Error(`pattern-block-variant-unsupported:${intent.variant}`);
  }
  assertReleasedModuleVariant("SM02PB", contract.svgId);
  const x = placement.x + placement.width / 2;
  const y = placement.y + placement.height / 2;
  const coordinates = contract.coordinates.map((point) => [...point]);
  const rendered = resolveNativeRenderedBounds(intent, placement);
  const surroundCoordinates = [
    [rendered.x - x, rendered.y - y],
    [rendered.x + rendered.width - x, rendered.y - y],
    [rendered.x + rendered.width - x, rendered.y + rendered.height - y],
    [rendered.x - x, rendered.y + rendered.height - y]
  ];
  return {
    ...objectCommon,
    x,
    y,
    _x: x,
    _y: y,
    cx: 0,
    cy: 0,
    id: placement.id,
    svgId: contract.svgId,
    color: contract.color,
    coordinates,
    surroundCoordinates,
    isMoveRotateHandler: true,
    isHorizontalFlip: true,
    isVerticalFlip: true,
    isBluePrint: true
  };
}

export function makeBalanceScaleObject(
  intent: BalanceScaleIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  if (intent.initialDirection !== "left") {
    throw new Error(
      `balance-scale-initial-direction-invalid:${intent.initialDirection}`
    );
  }
  assertReleasedModuleVariant("CR07BS", "CR07BS-01");
  const x = placement.x + placement.width / 2;
  const y = placement.y + placement.height - 110;
  const leftLine = "M143,15 L143,87 L575,37 L575,-35";
  const rightLine = "M143,-35 L143,37 L575,87 L575,15";
  const defaultLine = "M143,-10 L143,62 L575,62 L575,-10";
  return {
    ...objectCommon,
    x,
    y,
    _x: x,
    _y: y,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: "#ffffff",
    svgId: "CR07BS-01",
    parent: {
      variation: 25,
      mouseX: 0,
      mouseY: 0,
      isEquilibriumHandle: false,
      isPlateMoveHandle: false
    },
    coordinates: [],
    playgroundIndex: 0,
    isEyeOn: false,
    isFillChange: false,
    isMoveRotateHandler: false,
    leftArr: [
      [15, -35],
      [264, -35],
      [264, -275],
      [15, -275]
    ],
    rightArr: [
      [445, -35],
      [694, -35],
      [694, -275],
      [445, -275]
    ],
    leftIncluded: [],
    rightIncluded: [],
    leftArea: [],
    rightArea: [],
    mouseX: 0,
    mouseY: 0,
    defaultTransFromX: -356,
    defaultTransFromY: -61,
    leftLine,
    rightLine,
    defaultLine,
    line: leftLine,
    plate: { left: 25, right: -25 },
    canEquilibrium: false
  };
}

export function makeAnalogClockObject(
  intent: AnalogClockIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  if (
    !Number.isInteger(intent.hours) ||
    intent.hours < 1 ||
    intent.hours > 12 ||
    !Number.isInteger(intent.minutes) ||
    intent.minutes < 0 ||
    intent.minutes > 59 ||
    intent.clockType !== "geared" ||
    intent.isWorking !== false
  ) {
    throw new Error(
      `analog-clock-time-invalid:${intent.hours}:${intent.minutes}`
    );
  }
  assertReleasedModuleVariant("SM02AD", "SM02AD-01");
  const size = Math.min(placement.width, placement.height);
  const radius = ANALOG_CLOCK_DESIGN_DIAMETER / 2;
  const clockScale = size / ANALOG_CLOCK_DESIGN_DIAMETER;
  const x = placement.x + (placement.width - size) / 2;
  const y = placement.y + (placement.height - size) / 2;
  return {
    ...objectCommon,
    x,
    y,
    _x: x,
    _y: y,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: "#97A0B5",
    svgId: "SM02AD-01",
    type: "geared",
    parent: {
      beforeHours: null,
      boundingClientRect: null,
      changeTypeToggle: false,
      clocks: null,
      connectToggle: false,
      curClockType: null,
      currentAngle: null,
      defaultAngle: null,
      defaultScale: null,
      defaultX: null,
      defaultY: null,
      draggingHandle: null,
      editToggle: false,
      element: null,
      hours: 2,
      isCulAnalog: null,
      isSizeHandle: null,
      minuteGuidePrevMinute: null,
      minuteGuideRevolutionCount: null,
      minuteGuideToggle: false,
      minutes: 30,
      mirrorToggle: false,
      observer: null,
      revolutionCount: null,
      seconds: 0,
      startMinuteGuide: false,
      syncClock: null
    },
    r: radius,
    hours: intent.hours,
    minutes: intent.minutes,
    seconds: 0,
    timer: null,
    isWorking: false,
    isFirst: false,
    isAm: false,
    halfOrFull: "half",
    clockScale,
    clickPlace: 0,
    addMinutes: 0,
    defaultHours: null,
    defaultMinutes: null,
    revolutionCount: 0,
    globalCentroidFlg: true,
    hasMirror: false,
    isMinutesGuide: false,
    isEyeOn: false,
    isMoveRotateHandler: false,
    coordinates: [[radius, radius]],
    surroundCoordinates: [
      [0, 0],
      [ANALOG_CLOCK_DESIGN_DIAMETER, 0],
      [ANALOG_CLOCK_DESIGN_DIAMETER, ANALOG_CLOCK_DESIGN_DIAMETER],
      [0, ANALOG_CLOCK_DESIGN_DIAMETER]
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
  const rendered = resolveNativeRenderedBounds(intent, placement);
  return {
    ...objectCommon,
    x: rendered.x,
    y: rendered.y,
    _x: rendered.x,
    _y: rendered.y,
    cx: 0,
    cy: 0,
    id: placement.id,
    fill: "transparent",
    text: intent.text,
    svgId: "math-latex",
    width: rendered.width,
    height: rendered.height,
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
  const rendered = resolveNativeRenderedBounds(intent, placement);
  const point1X = rendered.x;
  const point2X = rendered.x + rendered.width;
  const point2Y = rendered.y + rendered.height;
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
    point1: [point1X, rendered.y],
    point2: [point2X, point2Y],
    radius: 12,
    stroke,
    coordinates: [
      [point1X, rendered.y],
      [point2X, rendered.y],
      [point2X, point2Y],
      [point1X, point2Y]
    ],
    curveOffset: 0,
    strokeWidth: 2,
    strokeType: 1,
    strokeDashArray,
    isStrokeChange: true,
    isMoveRotateHandler: false
  };
}

export function makeBarChartObject(
  intent: BarChartIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  assertReleasedModuleVariant("DP04BC", BAR_CHART_SVG_ID);
  if (
    intent.categories.length < 3 ||
    intent.categories.length > 6 ||
    intent.values.length !== intent.categories.length
  ) {
    throw new Error(
      `bar-chart-categories-invalid:${intent.categories.length}:${intent.values.length}`
    );
  }
  if (intent.valuePerGridline < 1 || intent.gridlineCount < 2) {
    throw new Error(
      `bar-chart-scale-invalid:${intent.valuePerGridline}:${intent.gridlineCount}`
    );
  }
  const maximum = barChartAxisMaximum(
    intent.gridlineCount,
    intent.valuePerGridline
  );
  // 자료가 축을 넘으면 학생이 막대를 끝까지 그릴 수 없다.
  for (const value of intent.values) {
    if (!Number.isFinite(value) || value < 0 || value > maximum) {
      throw new Error(`bar-chart-value-out-of-axis:${value}:${maximum}`);
    }
  }
  const empty = intent.categories.map(() => 0);
  return {
    ...BAR_CHART_STRUCTURAL_FIELDS,
    id: placement.id,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    svgId: BAR_CHART_SVG_ID,
    title: [intent.title],
    name: [intent.valueAxisName, intent.categoryAxisName],
    unit: [intent.valueAxisUnit, ""],
    label: [...intent.categories],
    labelCount: intent.categories.length,
    widthCount: intent.categories.length,
    heightCount: intent.gridlineCount,
    // start와 heightDeps가 다르면 MathCanvas는 start를 따른다. 항상 같게 둔다.
    heightDeps: intent.valuePerGridline,
    start: [String(intent.valuePerGridline)],
    firstGraphValue: [...intent.values],
    secondGraphValue: empty,
    isOnlyOneGraph: true,
    isWave: false
  };
}

export function makeDataTableObject(
  intent: DataTableIntent,
  placement: NativeToolPlacement
): Record<string, unknown> {
  assertReleasedModuleVariant("DP02TG", DATA_TABLE_SVG_ID);
  if (intent.categories.length < 3 || intent.categories.length > 6) {
    throw new Error(
      `data-table-categories-invalid:${intent.categories.length}`
    );
  }
  return {
    ...DATA_TABLE_STRUCTURAL_FIELDS,
    id: placement.id,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    svgId: DATA_TABLE_SVG_ID,
    title: [intent.title],
    name: [...intent.categories]
  };
}
