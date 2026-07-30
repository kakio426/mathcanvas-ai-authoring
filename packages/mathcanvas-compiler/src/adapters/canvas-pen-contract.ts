export interface CanvasPenElementsContract {
  readonly stableKey: "common.pen";
  readonly contractFamily: "canvas-pen-elements";
  readonly payloadPath: "canvasOption.penElements";
  readonly contractState: "unknown";
  readonly allowedValue: "empty-array-only";
  readonly staticEvidence: Readonly<{
    wireFields: readonly [
      "d",
      "id",
      "isColor",
      "stroke",
      "strokeWidth"
    ];
    rehydrateReadFields: readonly [
      "d",
      "id",
      "stroke",
      "strokeWidth"
    ];
    degenerateStrokeRule: Readonly<{
      minimumNumericTokens: 4;
      allPointsEqualRejected: true;
      totalLengthMustBeFinite: true;
      totalLengthMustBePositive: true;
    }>;
    coordinateSpace: "outermost-svg-user-space";
    lockable: false;
    studentErasable: true;
    moduleActivation: "none";
    tagContribution: "none";
  }>;
  readonly unknownFields: readonly string[];
  readonly unknownReason: string;
  readonly evidenceIds: readonly string[];
}

export const CANVAS_PEN_ELEMENTS_CONTRACT: CanvasPenElementsContract = {
  stableKey: "common.pen",
  contractFamily: "canvas-pen-elements",
  payloadPath: "canvasOption.penElements",
  contractState: "unknown",
  allowedValue: "empty-array-only",
  staticEvidence: {
    wireFields: [
      "d",
      "id",
      "isColor",
      "stroke",
      "strokeWidth"
    ],
    rehydrateReadFields: [
      "d",
      "id",
      "stroke",
      "strokeWidth"
    ],
    degenerateStrokeRule: {
      minimumNumericTokens: 4,
      allPointsEqualRejected: true,
      totalLengthMustBeFinite: true,
      totalLengthMustBePositive: true
    },
    coordinateSpace: "outermost-svg-user-space",
    lockable: false,
    studentErasable: true,
    moduleActivation: "none",
    tagContribution: "none"
  },
  unknownFields: [
    "authoredCreatePersistence",
    "coordinateSpaceIdentity",
    "isColorPersistence",
    "serverNormalization",
    "strokeWidthWireType"
  ],
  unknownReason:
    "bundle에서 UI 생성·재수화 shape는 확인했지만 비어 있지 않은 penElements의 서버 저장 lifecycle을 관찰하지 않았습니다.",
  evidenceIds: [
    "research/mathcanvas/common-draw-contract.observations.json#key=penObservation",
    "research/mathcanvas/pen-contract.static.json#key=staticContract"
  ]
};

export function assertPenElementsWithinContract(
  penElements: unknown
): asserts penElements is readonly [] {
  if (!Array.isArray(penElements) || penElements.length !== 0) {
    throw new Error("pen-elements-contract-unknown:non-empty");
  }
}
