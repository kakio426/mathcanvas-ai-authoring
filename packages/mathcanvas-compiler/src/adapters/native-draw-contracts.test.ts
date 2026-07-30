import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NATIVE_DRAW_SHAPE_CONTRACTS,
  assertContractedNativeDrawShape
} from "./native-draw-contracts.js";

describe("native draw contract seam", () => {
  it("control matrix의 native-draw-object 집합과 양방향으로 일치한다", () => {
    const matrix = JSON.parse(
      readFileSync(
        new URL(
          "../../../../research/mathcanvas/control-contract.matrix.json",
          import.meta.url
        ),
        "utf8"
      )
    ) as {
      toolMappings: Array<{
        controlId: string;
        contractFamily?: string;
      }>;
    };
    const matrixKeys = matrix.toolMappings
      .filter(
        (mapping) =>
          mapping.contractFamily === "native-draw-object"
      )
      .map((mapping) => mapping.controlId)
      .sort();
    const contractKeys = NATIVE_DRAW_SHAPE_CONTRACTS.map(
      (contract) => contract.stableKey
    ).sort();

    expect(contractKeys).toEqual(matrixKeys);
  });

  it("관찰된 공통 도형 계약만 contracted로 반환한다", () => {
    expect(
      assertContractedNativeDrawShape("common.rectangle")
    ).toMatchObject({
      wireSvgId: "drawElem",
      wireTypes: ["rect"],
      authoritativeGeometryFields: [
        "point1",
        "point2",
        "coordinates"
      ],
      absentGeometryFields: ["width", "height"]
    });
    expect(
      assertContractedNativeDrawShape("common.circle")
    ).toMatchObject({
      wireSvgId: "drawElem",
      wireTypes: ["circle"],
      coordinateRule: "two-point",
      point2Rules: { circle: "second-point" }
    });
    expect(
      assertContractedNativeDrawShape("common.point-line")
    ).toMatchObject({
      wireSvgId: "drawElem",
      wireTypes: ["dot", "line"],
      coordinateRule: "two-point",
      point2Rules: {
        dot: "degenerate-origin",
        line: "second-point"
      }
    });
  });

  it("공통 draw 계약에는 미확정 항목이 남지 않는다", () => {
    expect(
      NATIVE_DRAW_SHAPE_CONTRACTS.every(
        (contract) => contract.contractState === "contracted"
      )
    ).toBe(true);
    for (const contract of NATIVE_DRAW_SHAPE_CONTRACTS) {
      expect(contract.evidenceIds.length).toBeGreaterThan(0);
    }
  });
});
