import type {
  ActivityProblem,
  ActivitySpec,
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

export function makeFractionObject(model: VisualModel): Record<string, unknown> {
  const { numerator, denominator } = model.fraction;
  const perWidth = model.wholeWidth / denominator;
  const geometricWidth = perWidth * numerator;
  const width = Math.round(geometricWidth);
  const cx = (geometricWidth - perWidth) / 2;
  const left = -perWidth / 2;
  const right = geometricWidth - perWidth / 2;
  return {
    ...objectCommon,
    x: model.bounds.x,
    y: model.bounds.y,
    _x: model.bounds.x,
    _y: model.bounds.y,
    cx,
    cy: 0,
    id: model.id,
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
    defaultWidth: model.wholeWidth
  };
}

export function makeTextObject(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize = 40
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
    fill: "#000000",
    text,
    svgId: "input-text",
    width,
    height,
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

export function problemLabel(problem: ActivityProblem): string {
  return `\\frac{${problem.left.numerator}}{${problem.left.denominator}} \\; ? \\; \\frac{${problem.right.numerator}}{${problem.right.denominator}}`;
}

export function buildNativeContents(spec: ActivitySpec): {
  contents: Array<Record<string, unknown>>;
  lockedIds: string[];
} {
  const contents: Array<Record<string, unknown>> = [];
  const lockedIds: string[] = [];
  const instructions = spec.fixedObjects.filter(
    (object) => object.kind === "instruction"
  );
  for (const [index, instruction] of instructions.entries()) {
    if (!instruction.text) continue;
    contents.push(
      makeTextObject(
        instruction.id,
        instruction.text,
        instruction.bounds.x,
        instruction.bounds.y,
        instruction.bounds.width,
        instruction.bounds.height,
        index === 0 ? 48 : 38
      )
    );
    lockedIds.push(instruction.id);
  }

  for (const problem of spec.problems) {
    const mat = spec.fixedObjects.find(
      (object) => object.id === `${problem.id}-mat`
    );
    if (!mat) throw new Error(`${problem.id} 비교판이 없습니다.`);
    contents.push(
      makeRectangleObject(
        mat.id,
        mat.bounds.x,
        mat.bounds.y,
        mat.bounds.width,
        mat.bounds.height,
        "#F7FAFF",
        "#65758B"
      )
    );
    lockedIds.push(mat.id);

    const problemNumberId = `${problem.id}-number`;
    contents.push(
      makeTextObject(
        problemNumberId,
        `${problem.order}번`,
        mat.bounds.x + 40,
        mat.bounds.y + 16,
        120,
        54,
        34
      )
    );
    lockedIds.push(problemNumberId);

    const promptId = `${problem.id}-prompt`;
    contents.push(
      makeLatexObject(
        promptId,
        problemLabel(problem),
        mat.bounds.x + 760,
        mat.bounds.y + 8,
        360,
        70,
        48
      )
    );
    lockedIds.push(promptId);

    const lanes = spec.dropAreas.filter(
      (area) =>
        area.problemId === problem.id && area.kind === "comparison-lane"
    );
    for (const lane of lanes) {
      contents.push(
        makeRectangleObject(
          `${lane.id}-surface`,
          lane.bounds.x,
          lane.bounds.y,
          lane.bounds.width,
          lane.bounds.height,
          "#FFFFFF",
          "#556274",
          "10 8"
        )
      );
      lockedIds.push(`${lane.id}-surface`);
      const labelId = `${lane.id}-label`;
      contents.push(
        makeTextObject(
          labelId,
          lane.label,
          mat.bounds.x + 20,
          lane.bounds.y + 15,
          70,
          50,
          24
        )
      );
      lockedIds.push(labelId);
    }

    const start = spec.fixedObjects.find(
      (object) => object.id === `${problem.id}-start-line`
    );
    if (start) {
      contents.push(
        makeRectangleObject(
          start.id,
          start.bounds.x,
          start.bounds.y,
          start.bounds.width,
          start.bounds.height,
          "#FF6B5D",
          "#FF6B5D"
        )
      );
      lockedIds.push(start.id);
    }

    const relationSlot = spec.dropAreas.find(
      (area) =>
        area.problemId === problem.id && area.kind === "relation-slot"
    );
    if (relationSlot) {
      contents.push(
        makeRectangleObject(
          `${relationSlot.id}-surface`,
          relationSlot.bounds.x,
          relationSlot.bounds.y,
          relationSlot.bounds.width,
          relationSlot.bounds.height,
          "#FFF4D8",
          "#D49420",
          "10 8"
        )
      );
      lockedIds.push(`${relationSlot.id}-surface`);
      const labelId = `${relationSlot.id}-label`;
      contents.push(
        makeTextObject(
          labelId,
          relationSlot.label,
          relationSlot.bounds.x + relationSlot.bounds.width + 15,
          relationSlot.bounds.y + 36,
          180,
          42,
          26
        )
      );
      lockedIds.push(labelId);
    }

    const models = spec.visualModels.filter(
      (model) => model.problemId === problem.id
    );
    for (const model of models) {
      contents.push(makeFractionObject(model));
    }

    const symbolObjects = spec.movableObjects.filter(
      (object) =>
        object.problemId === problem.id &&
        object.kind === "comparison-symbol"
    );
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
  }
  return { contents, lockedIds };
}
