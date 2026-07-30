import type {
  CompiledProject,
  ResolvedActivity,
  ResolvedEmission,
  ValidationIssue
} from "@mathcanvas/contracts";
import {
  FRACTION_SVG_BY_DENOMINATOR,
  NUMBER_CARD_SVG_BY_VALUE
} from "@mathcanvas/compiler";
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
  if (
    native.svgId !== FRACTION_SVG_BY_DENOMINATOR[denominator] ||
    native.count !== numerator ||
    native.divider !== denominator ||
    native.width !== expectedWidth
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

const handlers: Readonly<Record<string, Handler | undefined>> = {
  "fraction-model": fractionHandler,
  latex: latexHandler,
  "number-card": numberCardHandler,
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
