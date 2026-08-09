/**
 * Candidate-only adapters for the three HTML30 tools that have isolated R5
 * semantic evidence but are not part of the released global adapter registry.
 * They are intentionally exported only through the HTML30 candidate compiler.
 */

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

export interface PictureGraphCandidateRequest {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly variantId?: "DP03PG-01" | "DP03PG-02";
  readonly labels: readonly [string, string, string];
  readonly graphValue: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number]
  ];
}

export function makePictureGraphCandidateObjectV2(
  request: PictureGraphCandidateRequest
): Record<string, unknown> {
  const variantId = request.variantId ?? "DP03PG-01";
  const horizontal = variantId === "DP03PG-02";
  return {
    ...objectCommon,
    id: request.id,
    x: request.x,
    y: request.y,
    _x: 0,
    _y: 0,
    cx: 0,
    cy: 0,
    svgId: variantId,
    fill: "#FFE100",
    elemSplice: true,
    globalCentroidFlg: true,
    coordinates: [[0, 0]],
    categoryBoxInfo: {
      widthCount: 2,
      x: request.x + (horizontal ? 414.535995 : 204.536011),
      y: request.y + (horizontal ? -67.115997 : 50.384003)
    },
    categoryCnt: 1,
    // MathCanvas' picture-graph constructor defaults to this visible pictograph.
    // An empty categoryId renders the graph grid but drops every configured mark.
    categoryId: "NO01SC-29",
    graphValue: request.graphValue.map((row) => [...row]),
    height: horizontal ? 80 : 64,
    heightCount: 5,
    heightDeps: 5,
    heightLengthArr: horizontal ? [1, 1, 1] : [5 / 3, 5 / 3, 5 / 3],
    isHorizontal: horizontal,
    isCategoryOn: false,
    item: [""],
    keys: ["title", "item", "units", "name", "label"],
    label: [...request.labels],
    labelCount: 3,
    name: [""],
    parent: {
      addValue: null,
      categoryMoveHandler: false,
      changePaintHandler: false,
      editSnapshots: {},
      flgCount: 0,
      graphHandler: false,
      handlerIndex: null,
      heightHandler: false,
      minusElemHandler: false,
      moveX: 0,
      moveY: 0,
      observer: {},
      plusElemHandler: false,
      reset: false,
      selectedCategoryCnt: 0,
      selectedSvgId: null,
      selectPaint: false,
      selectPictograph: false,
      settingHandler: false,
      startX: 0,
      startY: 0,
      widthHandler: false
    },
    selectedIndex: null,
    settingState: 0,
    title: [""],
    toolbarHeight: 64,
    toolbarWidth: 120,
    totalHeight: horizontal ? 240 : 360,
    units: ["1개", "5개", "10개"],
    width: horizontal ? 100 : 120,
    widthCount: 3
  };
}

function integerRange(length: number): readonly number[] {
  return Array.from({ length }, (_, index) => index + 1);
}

function multiplicationArrayGeometry(
  visibleRows: number,
  visibleColumns: number
): {
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
  readonly coordinates: readonly (readonly [number, number])[];
  readonly snaps: readonly (readonly [number, number])[];
  readonly numbers: readonly { r: number; c: number; num: number }[];
  readonly tempColors: readonly (readonly (string | null)[] | null)[];
} {
  const row = visibleRows + 1;
  const column = visibleColumns + 1;
  const snaps = Array.from({ length: row }, (_, rowIndex) =>
    Array.from({ length: column }, (_, columnIndex) =>
      [columnIndex * 80 + 40, rowIndex * 80 + 40] as const
    )
  ).flat();
  const edgeCoordinates = [
    ...Array.from(
      { length: column - 1 },
      (_, index) => [(index + 1) * 80 + 40, 40] as const
    ),
    ...Array.from(
      { length: row - 1 },
      (_, index) => [40, (index + 1) * 80 + 40] as const
    )
  ];
  const resizeCoordinates: (readonly [number, number])[] = [];
  for (let rowIndex = 1; rowIndex < row; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex < column; columnIndex += 1) {
      resizeCoordinates.push(
        [columnIndex * 80, rowIndex * 80 + 40],
        [columnIndex * 80 + 40, rowIndex * 80]
      );
    }
  }
  const numbers = Array.from({ length: visibleRows }, (_, rowIndex) =>
    Array.from({ length: visibleColumns }, (_, columnIndex) => ({
      r: rowIndex + 1,
      c: columnIndex + 1,
      num: (rowIndex + 1) * (columnIndex + 1)
    }))
  ).flat();
  const tempColors = [
    null,
    ...Array.from({ length: visibleRows }, () => [
      null,
      ...Array.from({ length: visibleColumns }, () => "#FFFFFF")
    ])
  ];
  return {
    row,
    column,
    width: column * 80,
    height: row * 80,
    coordinates: [...edgeCoordinates, ...resizeCoordinates],
    snaps,
    numbers,
    tempColors
  };
}

export interface MultiplicationArrayCandidateRequest {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly visibleRows: number;
  readonly visibleColumns: number;
}

export function makeMultiplicationArrayCandidateObjectV2(
  request: MultiplicationArrayCandidateRequest
): Record<string, unknown> {
  if (
    !Number.isInteger(request.visibleRows) ||
    !Number.isInteger(request.visibleColumns) ||
    request.visibleRows < 2 ||
    request.visibleRows > 10 ||
    request.visibleColumns < 2 ||
    request.visibleColumns > 10
  ) {
    throw new Error("html30-v2:multiplication-array-range");
  }
  const geometry = multiplicationArrayGeometry(
    request.visibleRows,
    request.visibleColumns
  );
  return {
    ...objectCommon,
    id: request.id,
    x: request.x,
    y: request.y,
    _x: 0,
    _y: 0,
    cx: 0,
    cy: 0,
    svgId: "NO04NG-03",
    fill: "#ffffff",
    globalCentroidFlg: true,
    column: geometry.column,
    coordinates: geometry.coordinates.map((point) => [...point]),
    headerCols: integerRange(geometry.column),
    headerRows: integerRange(geometry.row),
    height: geometry.height,
    items: [],
    keys: ["headerRows", "headerCols", "numbers"],
    maxColumn: 11,
    maxRow: 11,
    minColumn: 3,
    minRow: 3,
    multiSelect: false,
    numbers: geometry.numbers.map((entry) => ({ ...entry })),
    parent: {
      _elementCenter: { x: 0, y: 0 },
      _negXStep: 0,
      _negYStep: 0,
      column: 0,
      count: 0,
      dragging: false,
      editSnapshots: {},
      frame: null,
      grabbedInput: false,
      headerCols: [],
      headerRows: [],
      height: 0,
      isFillChange: false,
      isMoveHandle: false,
      isResizeEndHandle: false,
      isResizeHorizontalHandle: false,
      isResizeHorizontalLeftHandle: false,
      isResizePointerHandle: false,
      isResizeVerticalHandle: false,
      isResizeVerticalTopHandle: false,
      isSnapped: false,
      mouseX: 0,
      mouseY: 0,
      numbers: [],
      observer: {},
      p1: [],
      p2: [],
      reset: false,
      row: 0,
      tempColors: [[]],
      width: 0,
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 0
    },
    perHeight: 80,
    perWidth: 80,
    row: geometry.row,
    selectedRect: [],
    sign: "x",
    snaps: geometry.snaps.map((point) => [...point]),
    tempColors: geometry.tempColors.map((row) =>
      row === null ? null : [...row]
    ),
    width: geometry.width
  };
}

const circleCoordinates = [
  [0, 0],
  [200.00000000000003, 200],
  [-200, 200.00000000000003],
  [-200.00000000000006, -199.99999999999997],
  [199.99999999999997, -200.00000000000006]
] as const;

const countingTokenCoordinates = [
  [-40, -40],
  [40, -40],
  [40, 40],
  [-40, 40],
  [0, 0]
] as const;

export function makeCountingTokenCandidateObjectV2(
  id: string,
  x: number,
  y: number,
  order: number
): Record<string, unknown> {
  return {
    ...objectCommon,
    id,
    x,
    y,
    _x: x,
    _y: y,
    cx: 0,
    cy: 0,
    svgId: "NO01SC-01",
    fill: "#FF8E25",
    coordinates: countingTokenCoordinates.map((point) => [...point]),
    initCoordinates: countingTokenCoordinates.map((point) => [...point]),
    parent: {
      moveX: 0,
      moveY: 0,
      pictoGraphs: [],
      startX: x,
      startY: y,
      syncPictoGraph: null
    },
    order,
    numberFrameSnap: true
  };
}

function circleBase(id: string, x: number, y: number): Record<string, unknown> {
  return {
    ...objectCommon,
    id,
    x,
    y,
    _x: 0,
    _y: 0,
    cx: 0,
    cy: 0,
    fill: "#ffffff",
    centerText: "O",
    coordinates: circleCoordinates.map((point) => [...point]),
    isEyeOn: true,
    isFillChange: true,
    isStrokeChange: true,
    isSurroundRect: true,
    keypadID: 4,
    parent: {
      isRotateHandle: false,
      isSizeHandle: false,
      itemCenterOpt: { fill: "#000", stroke: "#000", strokeWidth: 6 },
      itemType: 0,
      mouseX: 0,
      mouseY: 0,
      newFlg: 0,
      prevCircle: null
    },
    r: 200,
    strokeType: 2
  };
}

export function makeCircleRadiusCandidateObjectV2(
  id: string,
  x: number,
  y: number
): Record<string, unknown> {
  return {
    ...circleBase(id, x, y),
    svgId: "SM07CS-01"
  };
}

export function makeCircleDiameterCandidateObjectV2(
  id: string,
  x: number,
  y: number
): Record<string, unknown> {
  return {
    ...circleBase(id, x, y),
    svgId: "SM07CS-02",
    angle: 90,
    beforeType: [1, 4],
    itemRotate: 0,
    point1: { x: 200, y: 0 },
    point2: { x: 0, y: -200 },
    type: 1
  };
}
