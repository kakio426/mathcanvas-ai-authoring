import type {
  CompiledProject,
  ResolvedActivity,
  ResolvedEmission,
  ValidationIssue
} from "@mathcanvas/contracts";
import {
  COUNTING_MODEL_VARIANT_ID,
  FRACTION_SVG_BY_DENOMINATOR,
  NUMBER_CARD_SVG_BY_VALUE,
  PLACE_VALUE_SVG_BY_VALUE,
  resolveCountingModelUnitPlacements
} from "@mathcanvas/compiler";
import { PATTERN_BLOCK_VARIANTS } from "@mathcanvas/compiler";
import { issue } from "../layers/shared.js";

type NativeObject = Record<string, unknown>;
type Handler = (
  resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
) => void;

function fractionHandler(
  resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const fraction = emission.toolIntent.properties.fraction;
  if (
    fraction === null ||
    typeof fraction !== "object" ||
    Array.isArray(fraction)
  ) {
    issue(
      issues,
      "native-fraction-mismatch",
      "api-contract",
      `${emission.id}의 분수 입력이 올바르지 않습니다.`
    );
    return;
  }
  const numerator = (fraction as Record<string, unknown>).numerator;
  const denominator =
    (fraction as Record<string, unknown>).denominator;
  if (
    typeof numerator !== "number" ||
    typeof denominator !== "number"
  ) {
    issue(
      issues,
      "native-fraction-mismatch",
      "api-contract",
      `${emission.id}의 분수 입력이 올바르지 않습니다.`
    );
    return;
  }
  const expectedWidth = Math.round(
    (emission.bounds.width / denominator) * numerator
  );
  const expectedLabelVisibility =
    emission.toolIntent.properties.showLabel !== false;
  if (
    native.svgId !== FRACTION_SVG_BY_DENOMINATOR[denominator] ||
    native.count !== numerator ||
    native.divider !== denominator ||
    native.width !== expectedWidth ||
    native.isEyeOn !== expectedLabelVisibility
  ) {
    issue(
      issues,
      "native-fraction-mismatch",
      "api-contract",
      `${emission.id}의 native 모형 필드가 의미 입력과 다릅니다.`
    );
  }
  const nativeX = native.x;
  const nativeY = native.y;
  const coordinates = native.coordinates;
  if (
    typeof nativeX !== "number" ||
    typeof nativeY !== "number" ||
    !Array.isArray(coordinates)
  ) {
    issue(
      issues,
      "native-fraction-out-of-bounds",
      "layout",
      `${emission.id}의 실제 좌표가 캔버스 밖으로 나갑니다.`
    );
    return;
  }
  if (
    coordinates.some(
      (point) =>
        !Array.isArray(point) ||
        typeof point[0] !== "number" ||
        typeof point[1] !== "number" ||
        nativeX + point[0] < 0 ||
        nativeX + point[0] > resolved.layout.width ||
        nativeY + point[1] < 0 ||
        nativeY + point[1] > resolved.layout.height
    )
  ) {
    issue(
      issues,
      "native-fraction-out-of-bounds",
      "layout",
      `${emission.id}의 실제 좌표가 캔버스 밖으로 나갑니다.`
    );
    return;
  }
  const points = coordinates as [number, number][];
  const xCoordinates = points.map((point) => point[0]);
  const yCoordinates = points.map((point) => point[1]);
  const renderedWidth =
    Math.max(...xCoordinates) - Math.min(...xCoordinates);
  const renderedHeight =
    Math.max(...yCoordinates) - Math.min(...yCoordinates);
  const targetId = resolved.constraints.find((constraint) =>
    constraint.sourceIds.includes(emission.id)
  )?.targetId;
  const target = resolved.emissions.find(
    (candidate) => candidate.id === targetId
  );
  if (
    Math.abs(
      renderedWidth -
        (emission.bounds.width / denominator) * numerator
    ) > 0.001 ||
    (emission.movable &&
      (!target ||
        renderedWidth > target.bounds.width + 0.001 ||
        renderedHeight > target.bounds.height + 0.001))
  ) {
    issue(
      issues,
      "native-fraction-target-geometry-mismatch",
      "layout",
      `${emission.id}를 목표 영역에 맞출 수 없습니다.`
    );
  }
}

function latexHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  if (
    emission.movable &&
    (native.svgId !== "math-latex" ||
      native.fill !== "transparent" ||
      native.parent !== null ||
      native.isMoveRotateHandler !== false)
  ) {
    issue(
      issues,
      "native-symbol-contract-mismatch",
      "api-contract",
      `${emission.id}가 검증된 수식 객체 계약과 다릅니다.`
    );
  }
}

function numberCardHandler(
  resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const value = emission.toolIntent.properties.value;
  const parent = native.parent;
  const coordinates = native.coordinates;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    native.svgId !== NUMBER_CARD_SVG_BY_VALUE[value] ||
    native.fill !== "#2194FF" ||
    native.numberFrameSnap !== true ||
    parent === null ||
    typeof parent !== "object" ||
    Array.isArray(parent) ||
    (parent as Record<string, unknown>).variation !== 25 ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 4
  ) {
    issue(
      issues,
      "native-number-card-mismatch",
      "api-contract",
      `${emission.id}의 수 카드 native 계약이 의미 입력과 다릅니다.`
    );
    return;
  }
  const points = coordinates as unknown[];
  if (
    points.some(
      (point) =>
        !Array.isArray(point) ||
        typeof point[0] !== "number" ||
        typeof point[1] !== "number"
    )
  ) {
    issue(
      issues,
      "native-number-card-mismatch",
      "api-contract",
      `${emission.id}의 수 카드 좌표가 올바르지 않습니다.`
    );
    return;
  }
  const numericPoints = points as [number, number][];
  const width =
    Math.max(...numericPoints.map((point) => point[0])) -
    Math.min(...numericPoints.map((point) => point[0]));
  const height =
    Math.max(...numericPoints.map((point) => point[1])) -
    Math.min(...numericPoints.map((point) => point[1]));
  const balanceSide =
    emission.toolIntent.properties.balanceSide;
  if (balanceSide === "left" || balanceSide === "right") {
    const scale = resolved.emissions.find(
      (candidate) =>
        candidate.itemId === emission.itemId &&
        candidate.toolIntent.kind === "balance-scale"
    );
    const scaleX = scale
      ? scale.bounds.x + scale.bounds.width / 2
      : Number.NaN;
    const scaleY = scale
      ? scale.bounds.y + scale.bounds.height - 110
      : Number.NaN;
    const expectedXRange =
      balanceSide === "left"
        ? [scaleX - 341, scaleX - 92]
        : [scaleX + 89, scaleX + 338];
    const expectedYRange = [scaleY - 311, scaleY - 71];
    if (
      !scale ||
      emission.movable ||
      !emission.locked ||
      native.plate !== scale.id ||
      typeof native.x !== "number" ||
      typeof native.y !== "number" ||
      native.x < expectedXRange[0]! ||
      native.x > expectedXRange[1]! ||
      native.y < expectedYRange[0]! ||
      native.y > expectedYRange[1]!
    ) {
      issue(
        issues,
        "native-balance-member-mismatch",
        "api-contract",
        `${emission.id}가 지정한 저울 접시에 고정되지 않았습니다.`
      );
    }
    return;
  }
  const targetId = resolved.constraints.find((constraint) =>
    constraint.sourceIds.includes(emission.id)
  )?.targetId;
  const target = resolved.emissions.find(
    (candidate) => candidate.id === targetId
  );
  if (
    width !== 80 ||
    height !== 80 ||
    !target ||
    width > target.bounds.width ||
    height > target.bounds.height
  ) {
    issue(
      issues,
      "native-number-card-target-geometry-mismatch",
      "layout",
      `${emission.id}를 목표 영역에 맞출 수 없습니다.`
    );
  }
}

function placeValueModelHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const value = emission.toolIntent.properties.value;
  const coordinates = native.coordinates;
  if (
    (value !== 1 && value !== 10 && value !== 100) ||
    native.svgId !== PLACE_VALUE_SVG_BY_VALUE[value] ||
    native.n !== value ||
    native.count !== 1 ||
    native.numberFrameSnap !== true ||
    native.isEyeOn !== false ||
    native.isMoveRotateHandler !== false ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 4 ||
    coordinates.some(
      (point) =>
        !Array.isArray(point) ||
        typeof point[0] !== "number" ||
        typeof point[1] !== "number"
    )
  ) {
    issue(
      issues,
      "native-place-value-model-mismatch",
      "api-contract",
      `${emission.id}의 자릿값 모형 native 계약이 의미 입력과 다릅니다.`
    );
  }
}

function balanceScaleHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const initialDirection =
    emission.toolIntent.properties.initialDirection;
  const leftArr = native.leftArr;
  const rightArr = native.rightArr;
  const plate = native.plate;
  if (
    initialDirection !== "left" ||
    native.svgId !== "CR07BS-01" ||
    native.defaultTransFromX !== -356 ||
    native.defaultTransFromY !== -61 ||
    !Array.isArray(leftArr) ||
    leftArr.length !== 4 ||
    !Array.isArray(rightArr) ||
    rightArr.length !== 4 ||
    plate === null ||
    typeof plate !== "object" ||
    Array.isArray(plate) ||
    (plate as Record<string, unknown>).left !== 25 ||
    (plate as Record<string, unknown>).right !== -25 ||
    native.line !== native.leftLine ||
    native.canEquilibrium !== false
  ) {
    issue(
      issues,
      "native-balance-scale-mismatch",
      "api-contract",
      `${emission.id}의 접시저울 native 계약이 의미 입력과 다릅니다.`
    );
  }
}

function analogClockHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const hours = emission.toolIntent.properties.hours;
  const minutes = emission.toolIntent.properties.minutes;
  const coordinates = native.surroundCoordinates;
  if (
    typeof hours !== "number" ||
    !Number.isInteger(hours) ||
    hours < 1 ||
    hours > 12 ||
    typeof minutes !== "number" ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 59 ||
    emission.toolIntent.properties.clockType !== "geared" ||
    emission.toolIntent.properties.isWorking !== false ||
    native.svgId !== "SM02AD-01" ||
    native.type !== "geared" ||
    native.hours !== hours ||
    native.minutes !== minutes ||
    native.seconds !== 0 ||
    native.isWorking !== false ||
    native.isFirst !== false ||
    native.isMoveRotateHandler !== false ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 4
  ) {
    issue(
      issues,
      "native-analog-clock-mismatch",
      "api-contract",
      `${emission.id}의 기어식 시계 계약이 지정한 시각과 다릅니다.`
    );
  }
}

function patternBlockHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const variant = emission.toolIntent.properties.variant;
  const contract =
    typeof variant === "number" && Number.isInteger(variant)
      ? PATTERN_BLOCK_VARIANTS[
          variant as keyof typeof PATTERN_BLOCK_VARIANTS
        ]
      : undefined;
  if (
    !contract ||
    native.svgId !== contract.svgId ||
    native.color !== contract.color ||
    native.isMoveRotateHandler !== true ||
    native.isBluePrint !== true ||
    JSON.stringify(native.coordinates) !==
      JSON.stringify(contract.coordinates)
  ) {
    issue(
      issues,
      "native-pattern-block-mismatch",
      "api-contract",
      `${emission.id}의 패턴블록 계약이 지정한 조각과 다릅니다.`
    );
  }
}

function dataTableHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const properties = emission.toolIntent.properties;
  const categories = properties.categories;
  const values = properties.values;
  const title = properties.title;
  const categoryAxisName = properties.categoryAxisName;
  const valueColumnName = properties.valueColumnName;
  const validCategories =
    Array.isArray(categories) &&
    categories.length >= 3 &&
    categories.length <= 6 &&
    categories.every((value) => typeof value === "string" && value.length > 0);
  const validValues =
    Array.isArray(values) &&
    validCategories &&
    values.length === categories.length &&
    values.every(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value >= 0
    ) &&
    values.some((value) => value > 0);
  const nativeCategories = native.name;
  const nativeValues = native.tableCell;
  const nativeTitle = native.title;
  const nativeCategoryAxis = native.nameTag;
  const nativeValueColumn = native.countName;
  const nativeMatches =
    native.svgId === "DP02TG-02" &&
    Array.isArray(nativeCategories) &&
    JSON.stringify(nativeCategories) === JSON.stringify(categories) &&
    Array.isArray(nativeValues) &&
    JSON.stringify(nativeValues) ===
      JSON.stringify((values as number[]).map(String)) &&
    Array.isArray(nativeTitle) &&
    JSON.stringify(nativeTitle) === JSON.stringify([title]) &&
    Array.isArray(nativeCategoryAxis) &&
    JSON.stringify(nativeCategoryAxis) === JSON.stringify([categoryAxisName]) &&
    Array.isArray(nativeValueColumn) &&
    JSON.stringify(nativeValueColumn) === JSON.stringify([valueColumnName]);
  if (!validCategories || !validValues || !nativeMatches) {
    issue(
      issues,
      "native-data-table-mismatch",
      "api-contract",
      `${emission.id}의 자료와 표 native 계약이 의미 입력과 다릅니다.`
    );
  }
}

function pointLineHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  native: NativeObject,
  issues: ValidationIssue[]
): void {
  const properties = emission.toolIntent.properties;
  const geometry = properties.geometry;
  const angleDegrees = properties.angleDegrees;
  const emphasis = properties.emphasis;
  if (
    (geometry !== "line" && geometry !== "angle") ||
    typeof angleDegrees !== "number" ||
    !Number.isFinite(angleDegrees) ||
    angleDegrees <= 0 ||
    angleDegrees >= 180 ||
    (emphasis !== undefined && emphasis !== "large-elementary")
  ) {
    issue(
      issues,
      "native-point-line-mismatch",
      "api-contract",
      `${emission.id}의 각도 입력이 올바르지 않습니다.`
    );
    return;
  }
  const largeElementary = emphasis === "large-elementary";
  const rayLength = Math.min(
    emission.bounds.width * (largeElementary ? 0.47 : 0.35),
    emission.bounds.height * 0.78
  );
  const vertex = [
    emission.bounds.x + emission.bounds.width / 2,
    emission.bounds.y + emission.bounds.height - 20
  ];
  const radians = (-angleDegrees * Math.PI) / 180;
  const base = [vertex[0]! + rayLength, vertex[1]!];
  const turn = [
    vertex[0]! + Math.cos(radians) * rayLength,
    vertex[1]! + Math.sin(radians) * rayLength
  ];
  const samePoint = (actual: unknown, expected: number[]): boolean =>
    Array.isArray(actual) &&
    actual.length === 2 &&
    actual.every(
      (value, index) =>
        typeof value === "number" &&
        Math.abs(value - expected[index]!) < 0.001
    );

  const stroke = properties.stroke ??
    (geometry === "angle" ? "#1677D2" : "#5E6473");
  const pointsInsideBounds = [vertex, base, turn].every((point) => {
    const x = point[0];
    const y = point[1];
    return (
      x !== undefined &&
      y !== undefined &&
      x >= emission.bounds.x + 10 &&
      x <= emission.bounds.x + emission.bounds.width - 10 &&
      y >= emission.bounds.y + 10 &&
      y <= emission.bounds.y + emission.bounds.height - 10
    );
  });
  if (!pointsInsideBounds) {
    issue(
      issues,
      "native-point-line-out-of-bounds",
      "layout",
      `${emission.id}의 각 선이 제목 또는 상자 경계를 침범할 수 있습니다.`
    );
  }
  if (geometry === "line") {
    const ray = properties.ray;
    const endpoint = ray === "base" ? base : ray === "turn" ? turn : null;
    if (
      !endpoint ||
      native.svgId !== "drawElem" ||
      native.type !== "line" ||
      native.stroke !== stroke ||
      native.strokeWidth !== (largeElementary ? 12 : 8) ||
      native.radius !== (largeElementary ? 18 : 12) ||
      !samePoint(native.point1, vertex) ||
      !samePoint(native.point2, endpoint)
    ) {
      issue(
        issues,
        "native-point-line-mismatch",
        "api-contract",
        `${emission.id}의 목표 각 변이 지정한 각도와 다릅니다.`
      );
    }
    return;
  }

  if (
    native.svgId !== "angleElem" ||
    native.stroke !== stroke ||
    native.strokeWidth !== (largeElementary ? 8 : 4) ||
    native.isMoveRotateHandler !== true ||
    !samePoint(native.point1, base) ||
    !samePoint(native.point2, vertex) ||
    !samePoint(native.point3, turn) ||
    !Array.isArray(native.coordinates) ||
    native.coordinates.length !== 3
  ) {
    issue(
      issues,
      "native-point-line-mismatch",
      "api-contract",
      `${emission.id}의 세 점 각 측정선 계약이 다릅니다.`
    );
  }
}

function countingModelHandler(
  _resolved: ResolvedActivity,
  emission: ResolvedEmission,
  contentsJson: readonly NativeObject[],
  issues: ValidationIssue[]
): void {
  const count = emission.toolIntent.properties.count;
  if (typeof count !== "number") {
    issue(
      issues,
      "native-counting-model-mismatch",
      "api-contract",
      `${emission.id}의 수 세기 모형 개수가 올바르지 않습니다.`
    );
    return;
  }
  let expected;
  try {
    expected = resolveCountingModelUnitPlacements(count, {
      id: emission.id,
      ...emission.bounds
    });
  } catch {
    issue(
      issues,
      "native-counting-model-mismatch",
      "api-contract",
      `${emission.id}의 수 세기 모형 배치가 지원 범위를 벗어납니다.`
    );
    return;
  }
  const nativeById = new Map(
    contentsJson.flatMap((object) =>
      typeof object.id === "string"
        ? [[object.id, object] as const]
        : []
    )
  );
  const actualPoolIds = contentsJson
    .flatMap((object) =>
      typeof object.id === "string" &&
      object.id.startsWith(`${emission.id}-unit-`)
        ? [object.id]
        : []
    )
    .sort();
  const expectedIds = expected.map((unit) => unit.id).sort();
  const mismatch =
    JSON.stringify(actualPoolIds) !== JSON.stringify(expectedIds) ||
    expected.some((unit, index) => {
      const native = nativeById.get(unit.id);
      return (
        !native ||
        native.svgId !== COUNTING_MODEL_VARIANT_ID ||
        native.x !== unit.x ||
        native.y !== unit.y ||
        native._x !== unit.x ||
        native._y !== unit.y ||
        native.order !== index + 1 ||
        native.numberFrameSnap !== true ||
        native.isEyeOn !== false ||
        native.isGroup !== false ||
        native.groupId !== "" ||
        native.isGroupElement !== false ||
        native.isMoveRotateHandler !== false ||
        !Array.isArray(native.coordinates) ||
        native.coordinates.length !== 5
      );
    });
  if (mismatch) {
    issue(
      issues,
      "native-counting-model-mismatch",
      "api-contract",
      `${emission.id}의 native 낱개 수·ID·순서·중립 배치가 의미 입력과 다릅니다.`
    );
  }
}

const handlers: Readonly<Record<string, Handler | undefined>> = {
  "analog-clock": analogClockHandler,
  "balance-scale": balanceScaleHandler,
  "counting-model": undefined,
  "fraction-model": fractionHandler,
  latex: latexHandler,
  "number-card": numberCardHandler,
  "place-value-model": placeValueModelHandler,
  "pattern-block": patternBlockHandler,
  "data-table": dataTableHandler,
  "point-line": pointLineHandler,
  text: undefined,
  "draw-rectangle": undefined
};

export function validateRegisteredNativeEmissions(
  resolved: ResolvedActivity,
  compiled: CompiledProject,
  issues: ValidationIssue[]
): void {
  const nativeById = new Map(
    compiled.payload.contentsJson.flatMap((object) =>
      typeof object.id === "string"
        ? [[object.id, object] as const]
        : []
    )
  );
  for (const emission of resolved.emissions) {
    if (!(emission.toolIntent.kind in handlers)) {
      issue(
        issues,
        "native-handler-unregistered",
        "schema",
        `등록되지 않은 native 검증 규칙입니다: ${emission.toolIntent.kind}`
      );
      continue;
    }
    if (emission.toolIntent.kind === "counting-model") {
      countingModelHandler(
        resolved,
        emission,
        compiled.payload.contentsJson,
        issues
      );
      continue;
    }
    const native = nativeById.get(emission.id);
    if (!native) continue;
    handlers[emission.toolIntent.kind]?.(
      resolved,
      emission,
      native,
      issues
    );
  }
}
