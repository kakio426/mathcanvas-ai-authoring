import { describe, expect, it } from "vitest";
import { getLayoutPreset } from "./registry.js";
import {
  PATTERN_BLOCK_VARIANTS,
  patternBlockBounds
} from "../adapters/native-pattern-block-contract.js";

const tokenSet = "w002-repeat-repair-v1";
const roles = [
  ...Array.from({ length: 12 }, (_, index) => `rule-source-${index + 1}`),
  "rule-slot-1",
  "rule-slot-2",
  "continuation-slot-1",
  "continuation-slot-2",
  "continuation-slot-3",
  "continuation-slot-4",
  "misaligned-item",
  "repair-target",
  "repair-bank"
];

function intersects(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number }
) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

describe("W002 declared-rule repair layout", () => {
  it("reserves 188px for all 21 simultaneous semantic roles", () => {
    const preset = getLayoutPreset(tokenSet);
    const tokens = roles.map((role) => preset.tokens[`item.${role}`]);
    expect(tokens.every(Boolean)).toBe(true);
    expect(tokens.every((token) => token?.width === 188 && token?.height === 188)).toBe(
      true
    );
    for (let leftIndex = 0; leftIndex < tokens.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < tokens.length; rightIndex += 1) {
        expect(intersects(tokens[leftIndex]!, tokens[rightIndex]!)).toBe(false);
      }
    }
  });

  it("contains every released native pattern-block bound and leaves wave16 unchanged", () => {
    const preset = getLayoutPreset(tokenSet);
    for (const variant of Object.keys(PATTERN_BLOCK_VARIANTS).map(Number) as Array<keyof typeof PATTERN_BLOCK_VARIANTS>) {
      const bounds = patternBlockBounds(variant);
      expect(bounds.width).toBeLessThanOrEqual(188);
      expect(bounds.height).toBeLessThanOrEqual(188);
    }
    expect(getLayoutPreset("wave16-repeating-pattern-v1").tokens["item.next-slot-1"]).toEqual({
      scope: "item",
      x: 1120,
      y: 175,
      width: 188,
      height: 188
    });
    expect(preset.tokens["item.repair-target"]?.width).toBe(188);
  });
});
