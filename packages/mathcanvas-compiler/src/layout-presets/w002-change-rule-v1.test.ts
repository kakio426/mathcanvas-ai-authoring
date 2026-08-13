import { describe, expect, it } from "vitest";
import { NUMBER_CARD_RENDERED_SIZE } from "../adapters/native-rendered-bounds.js";
import { getLayoutPreset } from "./registry.js";
import {
  W002_CHANGE_RULE_SOURCE_ROLE_IDS,
  W002_CHANGE_RULE_TARGET_ROLES
} from "./w002-change-rule-v1.js";

type Bounds = { x: number; y: number; width: number; height: number };
const intersects = (left: Bounds, right: Bounds) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

describe("W002 observable change-rule layout", () => {
  it("contains 32 physical sources and eight 188px action targets without overlap", () => {
    const preset = getLayoutPreset("w002-change-rule-v1");
    const panel = preset.tokens["item.panel"]!;
    const sources = W002_CHANGE_RULE_SOURCE_ROLE_IDS.map(
      (role) => preset.tokens[`item.${role}`]!
    );
    const targets = W002_CHANGE_RULE_TARGET_ROLES.map(
      (role) => preset.tokens[`item.${role}`]!
    );
    expect(W002_CHANGE_RULE_SOURCE_ROLE_IDS).toHaveLength(32);
    expect(new Set(W002_CHANGE_RULE_SOURCE_ROLE_IDS).size).toBe(32);
    expect(sources).toHaveLength(32);
    expect(targets).toHaveLength(8);
    expect(sources.every((token) => token.width >= 80 && token.height >= 80)).toBe(true);
    expect(targets.every((token) => token.width >= 188 && token.height >= 188)).toBe(true);
    const all = [...sources, ...targets];
    expect(all.every((token) =>
      token.x >= panel.x && token.y >= panel.y &&
      token.x + token.width <= panel.x + panel.width &&
      token.y + token.height <= panel.y + panel.height
    )).toBe(true);
    for (let left = 0; left < all.length; left += 1) {
      for (let right = left + 1; right < all.length; right += 1) {
        expect(intersects(all[left]!, all[right]!)).toBe(false);
      }
    }
  });

  it("uses the released 80px number-card footprint and preserves prior W002 layouts", () => {
    const preset = getLayoutPreset("w002-change-rule-v1");
    for (const role of W002_CHANGE_RULE_SOURCE_ROLE_IDS) {
      const token = preset.tokens[`item.${role}`]!;
      expect(token.width).toBeGreaterThanOrEqual(NUMBER_CARD_RENDERED_SIZE);
      expect(token.height).toBeGreaterThanOrEqual(NUMBER_CARD_RENDERED_SIZE);
    }
    expect(NUMBER_CARD_RENDERED_SIZE).toBe(80);
    expect(getLayoutPreset("w002-repeat-repair-v1").tokens["item.repair-target"]?.width).toBe(188);
  });
});
