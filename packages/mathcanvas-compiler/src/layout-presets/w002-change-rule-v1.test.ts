import { describe, expect, it } from "vitest";
import { NUMBER_CARD_RENDERED_SIZE } from "../adapters/native-rendered-bounds.js";
import { getLayoutPreset } from "./registry.js";

const semanticRoles = [
  "start-value-control",
  "step-magnitude-control",
  "direction-control",
  "sequence-term-1",
  "sequence-term-2",
  "sequence-term-3",
  "sequence-term-4",
  "repair-target",
  "rule-source-1",
  "rule-source-2",
  "rule-source-3"
] as const;

type Bounds = { x: number; y: number; width: number; height: number };
const intersects = (left: Bounds, right: Bounds) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

describe("W002 observable change-rule layout", () => {
  it("keeps three rule controls, four terms, and one repair target visible without overlap", () => {
    const preset = getLayoutPreset("w002-change-rule-v1");
    const panel = preset.tokens["item.panel"]!;
    const tokens = semanticRoles.map((role) => preset.tokens[`item.${role}`]!);
    expect(tokens.every((token) => token.width >= 188 && token.height >= 188)).toBe(true);
    expect(tokens.every((token) =>
      token.x >= panel.x && token.y >= panel.y &&
      token.x + token.width <= panel.x + panel.width &&
      token.y + token.height <= panel.y + panel.height
    )).toBe(true);
    for (let left = 0; left < tokens.length; left += 1) {
      for (let right = left + 1; right < tokens.length; right += 1) {
        expect(intersects(tokens[left]!, tokens[right]!)).toBe(false);
      }
    }
  });

  it("contains released native number-card bounds and leaves prior W002 layouts unchanged", () => {
    const preset = getLayoutPreset("w002-change-rule-v1");
    for (const role of semanticRoles) {
      const token = preset.tokens[`item.${role}`]!;
      expect(token.width).toBeGreaterThanOrEqual(NUMBER_CARD_RENDERED_SIZE);
      expect(token.height).toBeGreaterThanOrEqual(NUMBER_CARD_RENDERED_SIZE);
    }
    expect(getLayoutPreset("w002-repeat-repair-v1").tokens["item.repair-target"]?.width).toBe(188);
  });
});
