import type {
  NativeToolIntent,
  NativeToolPlacement
} from "./native-tool-contracts.js";
import {
  patternBlockBounds,
  type PatternBlockVariant
} from "./native-pattern-block-contract.js";

export type NativeRenderedBounds = Omit<
  NativeToolPlacement,
  "id"
>;

// NO04PD is persisted by MathCanvas as a fixed r=60 disk regardless of the
// authoring token size. Treating the token box as its visual footprint lets a
// layout pass locally while the real editor overlaps adjacent disks.
export const PLACE_VALUE_MODEL_RENDERED_DIAMETER = 120;

// NO04NT uses fixed -40..40 coordinates. Its visible footprint does not grow
// with an oversized layout token, so collision checks must use the real card.
export const NUMBER_CARD_RENDERED_SIZE = 80;

export function resolveNativeRenderedBounds(
  intent: NativeToolIntent,
  placement: NativeToolPlacement
): NativeRenderedBounds {
  if (intent.kind === "fraction-model") {
    const { numerator, denominator } = intent.fraction;
    if (
      !Number.isInteger(numerator) ||
      !Number.isInteger(denominator) ||
      numerator < 1 ||
      denominator < 1 ||
      numerator > denominator
    ) {
      throw new Error("fraction-rendered-bounds-invalid");
    }
    return {
      x: placement.x,
      y: placement.y,
      width: placement.width * numerator / denominator,
      height: placement.height
    };
  }
  if (intent.kind === "draw-rectangle" && intent.unitSpan) {
    const { from, to, of } = intent.unitSpan;
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      !Number.isInteger(of) ||
      from < 0 ||
      from >= to ||
      to > of ||
      placement.width % of !== 0
    ) {
      throw new Error("rectangle-unit-span-invalid");
    }
    const unitWidth = placement.width / of;
    return {
      x: placement.x + unitWidth * from,
      y: placement.y,
      width: unitWidth * (to - from),
      height: placement.height
    };
  }
  if (intent.kind === "place-value-model") {
    const diameter = PLACE_VALUE_MODEL_RENDERED_DIAMETER;
    return {
      x: placement.x + placement.width / 2 - diameter / 2,
      y: placement.y + placement.height / 2 - diameter / 2,
      width: diameter,
      height: diameter
    };
  }
  if (intent.kind === "number-card") {
    const size = NUMBER_CARD_RENDERED_SIZE;
    return {
      x: placement.x + placement.width / 2 - size / 2,
      y: placement.y + placement.height / 2 - size / 2,
      width: size,
      height: size
    };
  }
  if (intent.kind === "pattern-block") {
    const rendered = patternBlockBounds(
      intent.variant as PatternBlockVariant
    );
    const centerX = placement.x + placement.width / 2;
    const centerY = placement.y + placement.height / 2;
    return {
      x: centerX + rendered.minX,
      y: centerY + rendered.minY,
      width: rendered.width,
      height: rendered.height
    };
  }
  // The geared clock is placement-scaled by its factory's clockScale. Unlike
  // fixed-size number cards and place-value disks, its layout bounds therefore
  // remain the source of truth for the rendered footprint.
  return {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height
  };
}
