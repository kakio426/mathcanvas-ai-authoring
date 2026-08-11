import type { LayoutPreset } from "@mathcanvas/contracts";

const sourceRoles = Array.from({ length: 9 }, (_, index) => `rule-source-${index + 1}`);

export const W002_REPEAT_RULE_CONSTRUCTION_TOKEN_SET =
  "w002-repeat-rule-construction-v1" as const;

/**
 * Dedicated geometry for the student-constructed repeat rule family.
 *
 * The existing wave16 preset is intentionally not amended: it only has two
 * 188px continuation targets and 120px pattern slots. This preset gives the
 * nine physical source pieces, two rule slots, and four visible continuation
 * targets their own non-overlapping 188px landing surfaces.
 */
export const w002RepeatRuleConstructionLayoutPreset: LayoutPreset = {
  itemOriginY: 360,
  itemPitch: 1500,
  canvasBaseHeight: 460,
  minGap: 16,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 2800, height: 460 },
    "header.primary": { scope: "canvas", x: 220, y: 44, width: 2360, height: 58 },
    "header.secondary": { scope: "canvas", x: 220, y: 124, width: 2360, height: 58 },
    "header.tertiary": { scope: "canvas", x: 220, y: 204, width: 2360, height: 58 },
    "item.panel": { scope: "item", x: 50, y: 20, width: 2700, height: 1400 },
    "item.number": { scope: "item", x: 90, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 220, y: 36, width: 2460, height: 66 },
    "item.pattern-track": { scope: "item", x: 100, y: 130, width: 1820, height: 300 },
    "item.pattern-label": { scope: "item", x: 130, y: 148, width: 420, height: 42 },
    "item.rule-label": { scope: "item", x: 140, y: 196, width: 310, height: 36 },
    "item.continuation-label": { scope: "item", x: 900, y: 196, width: 700, height: 36 },
    "item.rule-slot-1": { scope: "item", x: 150, y: 238, width: 188, height: 188 },
    "item.rule-slot-2": { scope: "item", x: 370, y: 238, width: 188, height: 188 },
    "item.continuation-slot-1": { scope: "item", x: 900, y: 238, width: 188, height: 188 },
    "item.continuation-slot-2": { scope: "item", x: 1108, y: 238, width: 188, height: 188 },
    "item.continuation-slot-3": { scope: "item", x: 1316, y: 238, width: 188, height: 188 },
    "item.continuation-slot-4": { scope: "item", x: 1524, y: 238, width: 188, height: 188 },
    "item.piece-bank": { scope: "item", x: 100, y: 470, width: 1780, height: 860 },
    "item.piece-bank-label": { scope: "item", x: 140, y: 492, width: 420, height: 42 },
    ...Object.fromEntries(
      sourceRoles.map((role, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        return [
          `item.${role}`,
          {
            scope: "item" as const,
            x: 160 + column * 220,
            y: 550 + row * 220,
            width: 188,
            height: 188
          }
        ];
      })
    ),
    "item.prediction-label": { scope: "item", x: 1980, y: 470, width: 520, height: 42 },
    "item.prediction-box": { scope: "item", x: 1980, y: 520, width: 650, height: 210 },
    "item.explanation-label": { scope: "item", x: 1980, y: 780, width: 520, height: 42 },
    "item.explanation-box": { scope: "item", x: 1980, y: 830, width: 650, height: 330 }
  }
};
