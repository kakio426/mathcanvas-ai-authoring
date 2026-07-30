import { describe, expect, it } from "vitest";
import {
  CANVAS_PEN_ELEMENTS_CONTRACT,
  assertPenElementsWithinContract
} from "./canvas-pen-contract.js";

describe("canvas penElements contract seam", () => {
  it("관찰된 빈 배열만 허용한다", () => {
    expect(() => assertPenElementsWithinContract([])).not.toThrow();
    expect(() => assertPenElementsWithinContract([{}])).toThrow(
      "pen-elements-contract-unknown:non-empty"
    );
    expect(() => assertPenElementsWithinContract([[0, 0]])).toThrow(
      "pen-elements-contract-unknown:non-empty"
    );
  });

  it("contentsJson 객체 contract와 분리된 payload 경계를 명시한다", () => {
    expect(CANVAS_PEN_ELEMENTS_CONTRACT).toMatchObject({
      stableKey: "common.pen",
      contractFamily: "canvas-pen-elements",
      payloadPath: "canvasOption.penElements",
      contractState: "unknown",
      allowedValue: "empty-array-only"
    });
    expect(
      CANVAS_PEN_ELEMENTS_CONTRACT.unknownFields.length
    ).toBeGreaterThan(0);
    expect(CANVAS_PEN_ELEMENTS_CONTRACT.staticEvidence).toEqual({
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
    });
  });
});
