export type NativeDrawToolKey =
  | "common.circle"
  | "common.point-line"
  | "common.rectangle";

interface NativeDrawContractBase {
  readonly stableKey: NativeDrawToolKey;
  readonly contractFamily: "native-draw-object";
  readonly evidenceIds: readonly string[];
}

export interface ContractedNativeDrawShape
  extends NativeDrawContractBase {
  readonly contractState: "contracted";
  readonly wireSvgId: string;
  readonly wireTypes: readonly string[];
  readonly authoritativeGeometryFields: readonly string[];
  readonly absentGeometryFields: readonly string[];
  readonly coordinateRule?: "two-point";
  readonly point2Rules?: Readonly<
    Record<string, "degenerate-origin" | "second-point">
  >;
  readonly sessionObservedDefaults?: Readonly<{
    fill: string;
    radius: number;
    stroke: string;
    strokeType: number;
    strokeWidth: number;
  }>;
}

export interface UnknownNativeDrawShape
  extends NativeDrawContractBase {
  readonly contractState: "unknown";
  readonly unknownFields: readonly string[];
  readonly unknownReason: string;
}

export type NativeDrawShapeContract =
  | ContractedNativeDrawShape
  | UnknownNativeDrawShape;

export const NATIVE_DRAW_SHAPE_CONTRACTS = [
  {
    stableKey: "common.circle",
    contractFamily: "native-draw-object",
    contractState: "contracted",
    wireSvgId: "drawElem",
    wireTypes: ["circle"],
    authoritativeGeometryFields: [
      "point1",
      "point2",
      "coordinates"
    ],
    absentGeometryFields: ["width", "height"],
    coordinateRule: "two-point",
    point2Rules: { circle: "second-point" },
    sessionObservedDefaults: {
      fill: "transparent",
      radius: 0,
      stroke: "black",
      strokeType: 2,
      strokeWidth: 4
    },
    evidenceIds: [
      "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=discovery",
      "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=roundTrip"
    ]
  },
  {
    stableKey: "common.point-line",
    contractFamily: "native-draw-object",
    contractState: "contracted",
    wireSvgId: "drawElem",
    wireTypes: ["dot", "line"],
    authoritativeGeometryFields: [
      "point1",
      "point2",
      "coordinates"
    ],
    absentGeometryFields: ["width", "height"],
    coordinateRule: "two-point",
    point2Rules: {
      dot: "degenerate-origin",
      line: "second-point"
    },
    sessionObservedDefaults: {
      fill: "transparent",
      radius: 0,
      stroke: "black",
      strokeType: 2,
      strokeWidth: 4
    },
    evidenceIds: [
      "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=discovery",
      "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=roundTrip"
    ]
  },
  {
    stableKey: "common.rectangle",
    contractFamily: "native-draw-object",
    contractState: "contracted",
    wireSvgId: "drawElem",
    wireTypes: ["rect"],
    authoritativeGeometryFields: [
      "point1",
      "point2",
      "coordinates"
    ],
    absentGeometryFields: ["width", "height"],
    evidenceIds: [
      "fixtures/mathcanvas/native-object-contract.json#key=drawRectangle",
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=lifecycle:common.rectangle"
    ]
  }
] as const satisfies readonly NativeDrawShapeContract[];

export function getNativeDrawShapeContract(
  stableKey: string
): NativeDrawShapeContract | undefined {
  return NATIVE_DRAW_SHAPE_CONTRACTS.find(
    (contract) => contract.stableKey === stableKey
  );
}

export function assertContractedNativeDrawShape(
  stableKey: string
): ContractedNativeDrawShape {
  const contract = getNativeDrawShapeContract(stableKey);
  if (!contract) {
    throw new Error(`unregistered-draw-shape-contract:${stableKey}`);
  }
  if (contract.contractState !== "contracted") {
    throw new Error(`draw-shape-contract-unknown:${stableKey}`);
  }
  return contract;
}
