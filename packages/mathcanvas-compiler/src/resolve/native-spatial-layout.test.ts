import { describe, expect, it } from "vitest";
import {
  resolveNativeReserveBounds,
  resolveReserveVerticalFlow,
  selectLayoutVariant
} from "./native-spatial-layout.js";

const contract = {
  contractId: "number-card.spatial.test-v1",
  toolKey: "NO04NT",
  variantId: "NO04NT-01",
  toolVersionFingerprint: "test-bundle-v1",
  minInteractiveSize: { width: 80, height: 80 },
  reserveBox: { x: -50, y: -50, width: 100, height: 100 },
  reserveAnchor: "placement-center" as const,
  roundTripStable: true,
  roundTripTolerance: 1,
  derivedFromEvidenceIds: ["test-evidence-v1"]
};

describe("native spatial layout pipeline", () => {
  it("selects a variant from content width without growth feedback", () => {
    expect(
      selectLayoutVariant(900, [
        { id: "horizontal", maxContentWidth: 800, itemPitch: 500 },
        { id: "stacked", maxContentWidth: 1200, itemPitch: 760 }
      ])
    ).toEqual({
      variant: { id: "stacked", maxContentWidth: 1200, itemPitch: 760 },
      fallbackCount: 1
    });
  });

  it("fails instead of endlessly retrying when every variant is too narrow", () => {
    expect(() =>
      selectLayoutVariant(1300, [
        { id: "horizontal", maxContentWidth: 800, itemPitch: 500 },
        { id: "stacked", maxContentWidth: 1200, itemPitch: 760 }
      ])
    ).toThrow("layout-variant-content-width-overflow");
  });

  it("reserves selected chrome around a centered native placement", () => {
    expect(
      resolveNativeReserveBounds(
        { x: 100, y: 200, width: 80, height: 80 },
        contract
      )
    ).toEqual({ x: 90, y: 190, width: 100, height: 100 });
  });

  it("accumulates reserve heights and keeps minGap once", () => {
    expect(
      resolveReserveVerticalFlow(
        [
          { id: "workbench", contentHeight: 200, reserveHeight: 300 },
          { id: "explanation", contentHeight: 180, reserveHeight: 180 }
        ],
        { originY: 100, minGap: 20, bottomPadding: 40 }
      )
    ).toEqual({
      nodes: [
        { id: "workbench", contentHeight: 200, reserveHeight: 300, y: 100 },
        { id: "explanation", contentHeight: 180, reserveHeight: 180, y: 420 }
      ],
      contentHeight: 540
    });
  });
});
