import type {
  CompiledProject,
  ResolvedActivity,
  ResolvedEmission,
  ValidationIssue
} from "@mathcanvas/contracts";
import {
  FRACTION_SVG_BY_DENOMINATOR,
  NUMBER_CARD_SVG_BY_VALUE,
  PLACE_VALUE_SVG_BY_VALUE
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

const handlers: Readonly<Record<string, Handler | undefined>> = {
  "analog-clock": analogClockHandler,
  "balance-scale": balanceScaleHandler,
  "fraction-model": fractionHandler,
  latex: latexHandler,
  "number-card": numberCardHandler,
  "place-value-model": placeValueModelHandler,
  "pattern-block": patternBlockHandler,
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
    const native = nativeById.get(emission.id);
    if (!native) continue;
    if (!(emission.toolIntent.kind in handlers)) {
      issue(
        issues,
        "native-handler-unregistered",
        "schema",
        `등록되지 않은 native 검증 규칙입니다: ${emission.toolIntent.kind}`
      );
      continue;
    }
    handlers[emission.toolIntent.kind]?.(
      resolved,
      emission,
      native,
      issues
    );
  }
}
