import { describe, expect, it } from "vitest";
import {
  PATTERN_BLOCK_VARIANTS,
  patternBlockBounds
} from "../adapters/native-pattern-block-contract.js";
import { getLayoutPreset } from "./registry.js";

const tokenSet = "w002-repeat-repair-v1";
const sourceRoles = Array.from(
  { length: 12 },
  (_, index) => `rule-source-${index + 1}`
);
const semanticRoles = [
  ...sourceRoles,
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

type Bounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function intersects(left: Bounds, right: Bounds) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function contains(container: Bounds, child: Bounds) {
  return (
    child.x >= container.x &&
    child.y >= container.y &&
    child.x + child.width <= container.x + container.width &&
    child.y + child.height <= container.y + container.height
  );
}

describe("W002 declared-rule repair layout", () => {
  it("registers 21 simultaneous non-overlapping 188px semantic surfaces", () => {
    const preset = getLayoutPreset(tokenSet);
    const panel = preset.tokens["item.panel"]!;
    const tokens = semanticRoles.map(
      (role) => preset.tokens[`item.${role}`]
    );
    expect(tokens.every(Boolean)).toBe(true);
    expect(
      tokens.every(
        (token) =>
          token?.width === 188 &&
          token.height === 188 &&
          contains(panel, token)
      )
    ).toBe(true);
    for (let leftIndex = 0; leftIndex < tokens.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < tokens.length;
        rightIndex += 1
      ) {
        expect(intersects(tokens[leftIndex]!, tokens[rightIndex]!)).toBe(
          false
        );
      }
    }
  });

  it("keeps all twelve move-once sources inside the dedicated piece bank", () => {
    const preset = getLayoutPreset(tokenSet);
    const bank = preset.tokens["item.piece-bank"]!;
    expect(
      sourceRoles.every((role) =>
        contains(bank, preset.tokens[`item.${role}`]!)
      )
    ).toBe(true);
  });

  it("contains every released SM02PB native bound and leaves prior presets unchanged", () => {
    const preset = getLayoutPreset(tokenSet);
    for (const variant of Object.keys(PATTERN_BLOCK_VARIANTS).map(
      Number
    ) as Array<keyof typeof PATTERN_BLOCK_VARIANTS>) {
      const bounds = patternBlockBounds(variant);
      expect(bounds.width).toBeLessThanOrEqual(188);
      expect(bounds.height).toBeLessThanOrEqual(188);
    }
    expect(
      getLayoutPreset("wave16-repeating-pattern-v1").tokens[
        "item.next-slot-1"
      ]
    ).toEqual({
      scope: "item",
      x: 1120,
      y: 175,
      width: 188,
      height: 188
    });
    expect(
      getLayoutPreset("w002-repeat-rule-construction-v1").tokens[
        "item.continuation-slot-4"
      ]
    ).toEqual({
      scope: "item",
      x: 1524,
      y: 238,
      width: 188,
      height: 188
    });
    expect(preset.tokens["item.repair-target"]?.width).toBe(188);
  });
});
