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

// MathCanvas input-text renders with a 1.5 line-height and its editor-owned
// textarea contributes 8 canvas units of vertical chrome to scrollHeight.
// Using fontSize alone (or the old 1.25 estimate) makes the persisted
// foreignObject shorter than the actual line box: the wrapper can be centered
// while the glyphs visibly sag and overflow below it.
export const MATHCANVAS_TEXT_LINE_HEIGHT_RATIO = 1.5;
export const MATHCANVAS_TEXT_VERTICAL_CHROME = 8;

function centeredLatexWidth(
  intent: Extract<NativeToolIntent, { kind: "latex" }>,
  maximumWidth: number
): number {
  const visibleText = intent.text
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "");
  const fontSize = intent.fontSize ?? 52;
  return Math.min(
    maximumWidth,
    Math.max(fontSize, visibleText.length * fontSize * 0.62)
  );
}

function textAdvanceFactor(character: string): number {
  if (/^[가-힣ㄱ-ㅎㅏ-ㅣ]$/.test(character)) return 1;
  if (/^[0-9A-Za-z]$/.test(character)) return 0.6;
  if (/^\s$/.test(character)) return 0.36;
  return 0.5;
}

export function centeredTextBounds(
  intent: Extract<NativeToolIntent, { kind: "text" }>,
  placement: NativeToolPlacement
): NativeRenderedBounds {
  const fontSize = intent.fontSize ?? 40;
  const estimatedWidth = Math.min(
    placement.width,
    Math.max(
      fontSize,
      [...intent.text].reduce(
        (sum, character) => sum + textAdvanceFactor(character) * fontSize,
        0
      )
    )
  );
  const estimatedHeight = Math.min(
    placement.height,
    fontSize * MATHCANVAS_TEXT_LINE_HEIGHT_RATIO +
      MATHCANVAS_TEXT_VERTICAL_CHROME
  );
  return {
    x: placement.x + (placement.width - estimatedWidth) / 2,
    y: placement.y + (placement.height - estimatedHeight) / 2,
    width: estimatedWidth,
    height: estimatedHeight
  };
}

export function resolveNativeRenderedBounds(
  intent: NativeToolIntent,
  placement: NativeToolPlacement
): NativeRenderedBounds {
  if (intent.kind === "text" && intent.centerInPlacement) {
    return centeredTextBounds(intent, placement);
  }
  if (intent.kind === "latex" && intent.centerInPlacement) {
    const width = centeredLatexWidth(intent, placement.width);
    return {
      x: placement.x + (placement.width - width) / 2,
      y: placement.y,
      width,
      height: placement.height
    };
  }
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
