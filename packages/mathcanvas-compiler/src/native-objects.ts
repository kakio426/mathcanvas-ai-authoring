import type {
  CanvasActivitySpec,
  VisualModel
} from "@mathcanvas/contracts";

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
  isFillChange: false,
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
  isMoveRotateHandler: false,
  isCenterGravityPolygon: false
} as const;

export function makeFractionObject(model: VisualModel): Record<string, unknown> {
  const { numerator, denominator } = model.fraction;
  const perWidth = model.wholeWidth / denominator;
  const geometricWidth = perWidth * numerator;
  const width = geometricWidth;
  const cx = (geometricWidth - perWidth) / 2;
  const left = -perWidth / 2;
  const right = geometricWidth - perWidth / 2;
  const groupId = `${model.id}-move-group`;
  return {
    ...objectCommon,
    x: model.bounds.x + perWidth / 2,
    y: model.bounds.y + model.segmentHeight / 2,
    _x: model.bounds.x + perWidth / 2,
    _y: model.bounds.y + model.segmentHeight / 2,
    cx,
    cy: 0,
    id: model.id,
    groupId,
    isGroup: true,
    fill: model.color,
    type: "rect",
    count: numerator,
    svgId: FRACTION_SVG_BY_DENOMINATOR[denominator],
    width,
    height: model.segmentHeight,
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
      [left, -model.segmentHeight / 2],
      [right, -model.segmentHeight / 2],
      [right, model.segmentHeight / 2],
      [left, model.segmentHeight / 2]
    ],
    defaultWidth: model.wholeWidth,
    isFillChange: false,
    isSplit: false,
    isMoveRotateHandler: false
  };
}

export function makeMoveOnlyGroupObject(
  model: VisualModel
): Record<string, unknown> {
  const groupId = `${model.id}-move-group`;
  return {
    ...objectCommon,
    x: model.bounds.x,
    y: model.bounds.y,
    _x: model.bounds.x,
    _y: model.bounds.y,
    cx: 0,
    cy: 0,
    id: groupId,
    fill: "#FFFFFF",
    svgId: "group-element",
    parent: null,
    groupId,
    ids: [model.id],
    viewBox: {
      x: model.bounds.x,
      y: model.bounds.y,
      width: model.bounds.width,
      height: model.bounds.height
    },
    padding: 8,
    isGroup: true,
    isBluePrint: true,
    playgroundIndex: 0,
    isMoveRotateHandler: false
  };
}

export interface TextObjectOptions {
  fontSize?: number;
  color?: string;
  editable?: boolean;
  fontSizeEditable?: boolean;
}

export function makeTextObject(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: TextObjectOptions = {}
): Record<string, unknown> {
  const editable = options.editable ?? false;
  return {
    ...objectCommon,
    x,
    y,
    _x: x,
    _y: y,
    cx: 0,
    cy: 0,
    id,
    fill: options.color ?? "#172033",
    text,
    svgId: "input-text",
    width,
    height,
    parent: { observer: null },
    isEyeOn: false,
    fontSize: options.fontSize ?? 40,
    clickCount: 1,
    isTextEdit: editable,
    playgroundIndex: 2,
    isMoveRotateHandler: false,
    isTextEditFontSize: options.fontSizeEditable ?? false,
    coordinates: []
  };
}

export function makeLatexObject(
  id: string,
  text: string,
  x: number,
  y: number,
  width = 100,
  height = 100,
  fontSize = 52
): Record<string, unknown> {
  return {
    ...objectCommon,
    x,
    y,
    _x: x,
    _y: y,
    cx: 0,
    cy: 0,
    id,
    fill: "transparent",
    text,
    svgId: "math-latex",
    width,
    height,
    parent: null,
    isEyeOn: false,
    fontSize,
    coordinates: [],
    isMoveRotateHandler: false,
    isTextEditFontSize: true
  };
}

export function makeRectangleObject(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke = "#8A94A6",
  strokeDashArray = "none"
): Record<string, unknown> {
  const point2X = x + width;
  const point2Y = y + height;
  return {
    ...objectCommon,
    x: 0,
    y: 0,
    _x: 0,
    _y: 0,
    cx: 0,
    cy: 0,
    id,
    fill,
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
    point1: [x, y],
    point2: [point2X, point2Y],
    radius: 12,
    stroke,
    coordinates: [
      [x, y],
      [point2X, y],
      [point2X, point2Y],
      [x, point2Y]
    ],
    curveOffset: 0,
    strokeWidth: 2,
    strokeType: 1,
    strokeDashArray,
    isStrokeChange: true,
    isMoveRotateHandler: false
  };
}

function addLockedRectangle(
  contents: Array<Record<string, unknown>>,
  lockedIds: string[],
  id: string,
  bounds: { x: number; y: number; width: number; height: number },
  fill: string,
  stroke: string,
  strokeDashArray = "none"
): void {
  contents.push(
    makeRectangleObject(
      id,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      fill,
      stroke,
      strokeDashArray
    )
  );
  lockedIds.push(id);
}

function addComposedFraction(
  contents: Array<Record<string, unknown>>,
  lockedIds: string[],
  idPrefix: string,
  numerator: number,
  denominator: number,
  bounds: { x: number; y: number; width: number; height: number },
  colors: { fill: string; stroke: string }
): void {
  const cardId = `${idPrefix}-card`;
  addLockedRectangle(
    contents,
    lockedIds,
    cardId,
    bounds,
    colors.fill,
    colors.stroke
  );

  const textSlot = (value: number) => {
    const width = String(value).length > 1 ? 50 : 40;
    return {
      x: bounds.x + (bounds.width - width) / 2,
      width
    };
  };
  const numeratorSlot = textSlot(numerator);
  const denominatorSlot = textSlot(denominator);
  const numeratorId = `${idPrefix}-numerator`;
  const lineId = `${idPrefix}-line`;
  const denominatorId = `${idPrefix}-denominator`;
  contents.push(
    makeTextObject(
      numeratorId,
      String(numerator),
      numeratorSlot.x,
      bounds.y,
      numeratorSlot.width,
      36,
      { fontSize: 32 }
    ),
    makeRectangleObject(
      lineId,
      bounds.x + 20,
      bounds.y + 52,
      bounds.width - 40,
      4,
      "#172033",
      "#172033"
    ),
    makeTextObject(
      denominatorId,
      String(denominator),
      denominatorSlot.x,
      bounds.y + 62,
      denominatorSlot.width,
      36,
      { fontSize: 32 }
    )
  );
  lockedIds.push(numeratorId, lineId, denominatorId);
}

export function buildNativeContents(spec: CanvasActivitySpec): {
  contents: Array<Record<string, unknown>>;
  lockedIds: string[];
} {
  const contents: Array<Record<string, unknown>> = [];
  const lockedIds: string[] = [];
  const problem = spec.problem;
  const mat = spec.fixedObjects.find(
    (object) => object.id === `${problem.id}-mat`
  );
  if (!mat) throw new Error(`${problem.id} 비교판이 없습니다.`);

  addLockedRectangle(
    contents,
    lockedIds,
    mat.id,
    mat.bounds,
    "#F7FAFC",
    "#9EB9CF"
  );

  addLockedRectangle(
    contents,
    lockedIds,
    `${problem.id}-source-panel`,
    { x: 60, y: 130, width: 500, height: 350 },
    "#FFF9F3",
    "#E7B181"
  );
  addLockedRectangle(
    contents,
    lockedIds,
    `${problem.id}-target-panel`,
    { x: 590, y: 130, width: 620, height: 350 },
    "#F1F8FF",
    "#9EB9CF"
  );
  addLockedRectangle(
    contents,
    lockedIds,
    `${problem.id}-symbol-panel`,
    { x: 40, y: 500, width: 1180, height: 130 },
    "#FFFDF5",
    "#D8B85B"
  );
  addLockedRectangle(
    contents,
    lockedIds,
    `${problem.id}-response-panel`,
    { x: 40, y: 645, width: 1180, height: 125 },
    "#F8FAFC",
    "#9AA9BA"
  );

  for (const model of spec.visualModels) {
    addLockedRectangle(
      contents,
      lockedIds,
      `${model.id}-source-card`,
      {
        x: 80,
        y: model.bounds.y - 15,
        width: 460,
        height: 110
      },
      model.role === "left-strip" ? "#FFF0E6" : "#EAFBFF",
      model.role === "left-strip" ? "#E98242" : "#32B9D6"
    );
  }

  for (const guide of spec.placementGuides) {
    const surfaceId = `${guide.id}-surface`;
    addLockedRectangle(
      contents,
      lockedIds,
      surfaceId,
      guide.bounds,
      "#FFFFFF",
      guide.kind === "relation-slot" ? "#D49A25" : "#718398",
      "10 8"
    );
  }

  const symbolObjects = spec.movableObjects.filter(
    (object) => object.kind === "comparison-symbol"
  );
  for (const symbol of symbolObjects) {
    addLockedRectangle(
      contents,
      lockedIds,
      `${symbol.id}-source-card`,
      symbol.bounds,
      "#FFFFFF",
      "#D49A25"
    );
  }

  const fixedTextObjects = spec.fixedObjects.filter(
    (object) =>
      object.text &&
      object.kind !== "comparison-mat" &&
      object.kind !== "common-start-line"
  );
  for (const fixed of fixedTextObjects) {
    const color = fixed.id.endsWith("start-label")
      ? "#D93636"
      : "#172033";
    const fontSize = fixed.kind === "instruction" ? 34 : 26;
    contents.push(
      makeTextObject(
        fixed.id,
        fixed.text!,
        fixed.bounds.x,
        fixed.bounds.y,
        fixed.bounds.width,
        fixed.bounds.height,
        { fontSize, color }
      )
    );
    lockedIds.push(fixed.id);
  }

  addComposedFraction(
    contents,
    lockedIds,
    `${problem.id}-left-fraction`,
    problem.left.numerator,
    problem.left.denominator,
    { x: 610, y: 205, width: 90, height: 110 },
    { fill: "#FFF0E6", stroke: "#E98242" }
  );
  addComposedFraction(
    contents,
    lockedIds,
    `${problem.id}-right-fraction`,
    problem.right.numerator,
    problem.right.denominator,
    { x: 610, y: 350, width: 90, height: 110 },
    { fill: "#EAFBFF", stroke: "#32B9D6" }
  );

  addComposedFraction(
    contents,
    lockedIds,
    `${problem.id}-relation-left-fraction`,
    problem.left.numerator,
    problem.left.denominator,
    { x: 690, y: 510, width: 100, height: 110 },
    { fill: "#FFF0E6", stroke: "#E98242" }
  );
  addComposedFraction(
    contents,
    lockedIds,
    `${problem.id}-relation-right-fraction`,
    problem.right.numerator,
    problem.right.denominator,
    { x: 915, y: 510, width: 100, height: 110 },
    { fill: "#EAFBFF", stroke: "#32B9D6" }
  );

  const start = spec.fixedObjects.find(
    (object) => object.id === `${problem.id}-start-line`
  );
  if (!start) throw new Error(`${problem.id} 출발선이 없습니다.`);
  contents.push(
    makeRectangleObject(
      start.id,
      start.bounds.x,
      start.bounds.y,
      start.bounds.width,
      start.bounds.height,
      "#E33F3F",
      "#E33F3F"
    )
  );
  lockedIds.push(start.id);

  for (const model of spec.visualModels) {
    contents.push(makeFractionObject(model), makeMoveOnlyGroupObject(model));
  }

  for (const object of symbolObjects) {
    contents.push(
      makeLatexObject(
        object.id,
        object.id.endsWith("less-symbol") ? "<" : ">",
        object.bounds.x,
        object.bounds.y,
        object.bounds.width,
        object.bounds.height,
        64
      )
    );
  }

  const response = spec.inputObjects[0];
  if (!response) throw new Error(`${problem.id} 비교 까닭 입력칸이 없습니다.`);
  const responseSurfaceId = `${response.id}-surface`;
  contents.push(
    makeRectangleObject(
      responseSurfaceId,
      response.bounds.x,
      response.bounds.y,
      response.bounds.width,
      response.bounds.height,
      "#FFFFFF",
      "#718398"
    )
  );
  lockedIds.push(responseSurfaceId);
  contents.push(
    makeTextObject(
      response.id,
      response.placeholder,
      response.bounds.x + 210,
      response.bounds.y,
      response.bounds.width - 210,
      response.bounds.height,
      {
        fontSize: 30,
        color: "#435065",
        editable: true,
        fontSizeEditable: false
      }
    )
  );

  return { contents, lockedIds };
}
