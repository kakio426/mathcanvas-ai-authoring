import { describe, expect, it } from "vitest";
import { getLayoutPreset } from "./registry.js";

type Bounds = { x: number; y: number; width: number; height: number };

const contains = (container: Bounds, child: Bounds, inset = 0) =>
  child.x >= container.x + inset &&
  child.y >= container.y + inset &&
  child.x + child.width <= container.x + container.width - inset &&
  child.y + child.height <= container.y + container.height - inset;

const intersects = (left: Bounds, right: Bounds) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

describe("portfolio scale learner layout", () => {
  const preset = getLayoutPreset("portfolio-scale-v1");
  const token = (name: string) => preset.tokens[name]!;

  it("표와 모든 네이티브 조작물을 확인 영역 안에 넉넉하게 둔다", () => {
    const panel = token("item.array-panel");
    const groups = [
      ["item.native-number-target", ...Array.from({ length: 4 }, (_, index) =>
        `item.native-number-source-${index + 1}`)],
      Array.from({ length: 3 }, (_, index) => `item.native-place-${index + 1}`),
      ["item.native-fraction-1", "item.native-fraction-2", "item.native-fraction-target"],
      Array.from({ length: 4 }, (_, index) => `item.native-pattern-${index + 1}`),
      Array.from({ length: 3 }, (_, index) => `item.native-geometry-${index + 1}`),
      ["item.native-clock"],
      ["item.native-table-wide"]
    ];

    for (const group of groups) {
      const children = group.map(token);
      expect(children.every((child) => contains(panel, child, 15))).toBe(true);
      for (let left = 0; left < children.length; left += 1) {
        for (let right = left + 1; right < children.length; right += 1) {
          expect(intersects(children[left]!, children[right]!)).toBe(false);
        }
      }
    }

    const table = token("item.native-table-wide");
    expect(panel.y + panel.height - (table.y + table.height)).toBeGreaterThanOrEqual(100);
  });

  it("초등학생이 보고 집을 수 있는 최소 조작 크기를 보장한다", () => {
    for (let index = 1; index <= 4; index += 1) {
      expect(token(`item.native-number-source-${index}`).width).toBeGreaterThanOrEqual(180);
    }
    for (let index = 1; index <= 3; index += 1) {
      const geometry = token(`item.native-geometry-${index}`);
      expect(geometry.width).toBeGreaterThanOrEqual(420);
      expect(geometry.height).toBeGreaterThanOrEqual(260);
    }
    const clock = token("item.native-clock");
    expect(Math.min(clock.width, clock.height)).toBeGreaterThanOrEqual(260);
    for (let index = 1; index <= 3; index += 1) {
      const placeValue = token(`item.native-place-${index}`);
      expect(Math.min(placeValue.width, placeValue.height)).toBeGreaterThanOrEqual(220);
    }
  });

  it("확인 영역과 설명 영역을 겹치지 않게 분리한다", () => {
    const panel = token("item.array-panel");
    const explanation = token("item.explanation-box");
    const itemPanel = token("item.panel");
    expect(explanation.y - (panel.y + panel.height)).toBeGreaterThanOrEqual(20);
    expect(contains(itemPanel, explanation, 15)).toBe(true);
  });
});
