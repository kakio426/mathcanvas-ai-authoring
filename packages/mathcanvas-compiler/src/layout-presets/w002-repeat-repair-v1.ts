import type { LayoutPreset } from "@mathcanvas/contracts";

const sourceRoles = Array.from(
  { length: 12 },
  (_, index) => `rule-source-${index + 1}`
);

export const W002_REPEAT_REPAIR_TOKEN_SET =
  "w002-repeat-repair-v1" as const;

/**
 * Dedicated geometry for the declared-rule repair family.
 *
 * This is intentionally separate from wave16 and the repeat-rule construction
 * preset.  The repair phase needs twelve physical source pieces, two rule
 * slots, four continuation targets, and independent wrong/repair/bank roles
 * visible at the same time.  Every landing surface reserves 188px so the
 * released SM02PB variants fit without relying on a later scale or overlap.
 */
export const w002RepeatRepairLayoutPreset: LayoutPreset = {
  itemOriginY: 360,
  itemPitch: 1900,
  canvasBaseHeight: 520,
  minGap: 16,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 4000, height: 520 },
    "header.primary": { scope: "canvas", x: 220, y: 44, width: 3560, height: 58 },
    "header.secondary": { scope: "canvas", x: 220, y: 124, width: 3560, height: 58 },
    "header.tertiary": { scope: "canvas", x: 220, y: 204, width: 3560, height: 58 },
    "item.panel": { scope: "item", x: 50, y: 20, width: 3900, height: 1800 },
    "item.number": { scope: "item", x: 90, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 220, y: 36, width: 3560, height: 66 },
    "item.pattern-track": { scope: "item", x: 80, y: 130, width: 3720, height: 500 },
    "item.pattern-label": { scope: "item", x: 110, y: 148, width: 440, height: 42 },
    "item.rule-label": { scope: "item", x: 120, y: 196, width: 310, height: 36 },
    "item.continuation-label": { scope: "item", x: 560, y: 196, width: 820, height: 36 },
    "item.repair-label": { scope: "item", x: 1510, y: 196, width: 1080, height: 36 },
    "item.rule-slot-1": { scope: "item", x: 120, y: 238, width: 188, height: 188 },
    "item.rule-slot-2": { scope: "item", x: 328, y: 238, width: 188, height: 188 },
    "item.continuation-slot-1": { scope: "item", x: 560, y: 238, width: 188, height: 188 },
    "item.continuation-slot-2": { scope: "item", x: 768, y: 238, width: 188, height: 188 },
    "item.continuation-slot-3": { scope: "item", x: 976, y: 238, width: 188, height: 188 },
    "item.continuation-slot-4": { scope: "item", x: 1184, y: 238, width: 188, height: 188 },
    "item.misaligned-item": { scope: "item", x: 1510, y: 238, width: 188, height: 188 },
    "item.repair-target": { scope: "item", x: 1718, y: 238, width: 188, height: 188 },
    "item.repair-bank": { scope: "item", x: 1926, y: 238, width: 188, height: 188 },
    "item.piece-bank": { scope: "item", x: 80, y: 690, width: 2480, height: 900 },
    "item.piece-bank-label": { scope: "item", x: 120, y: 710, width: 460, height: 42 },
    ...Object.fromEntries(
      sourceRoles.map((role, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        return [
          `item.${role}`,
          {
            scope: "item" as const,
            x: 120 + column * 208,
            y: 770 + row * 208,
            width: 188,
            height: 188
          }
        ];
      })
    ),
    "item.prediction-label": { scope: "item", x: 2740, y: 690, width: 720, height: 42 },
    "item.prediction-box": { scope: "item", x: 2740, y: 740, width: 1040, height: 250 },
    "item.explanation-label": { scope: "item", x: 2740, y: 1030, width: 720, height: 42 },
    "item.explanation-box": { scope: "item", x: 2740, y: 1080, width: 1040, height: 400 }
  }
};
