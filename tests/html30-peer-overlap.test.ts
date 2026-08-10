import { describe, expect, it } from "vitest";
import {
  findPeerClearanceViolations,
  findPeerOverlapPairs,
  resolveMovableRootBounds
} from "../scripts/contract-lab/lib/peer-overlap.mjs";

describe("HTML30 logical movable-root geometry", () => {
  it("derives one group envelope from every rendered member when the logical group id is not in the DOM", () => {
    expect(
      resolveMovableRootBounds(
        [
          { id: "group-a-member-1", bounds: { x: 10, y: 20, width: 30, height: 40 } },
          { id: "group-a-member-2", bounds: { x: 50, y: 30, width: 20, height: 10 } },
          { id: "single-b", bounds: { x: 90, y: 20, width: 20, height: 20 } }
        ],
        [
          { id: "group-a", memberIds: ["group-a-member-1", "group-a-member-2"] },
          { id: "single-b", memberIds: null }
        ]
      )
    ).toEqual({
      movableRootBounds: [
        { id: "group-a", bounds: { x: 10, y: 20, width: 60, height: 40 } },
        { id: "single-b", bounds: { x: 90, y: 20, width: 20, height: 20 } }
      ],
      missingMovableRootIds: []
    });
  });

  it("fails a logical group when even one declared member is not rendered", () => {
    expect(
      resolveMovableRootBounds(
        [{ id: "group-a-member-1", bounds: { x: 10, y: 20, width: 30, height: 40 } }],
        [{ id: "group-a", memberIds: ["group-a-member-1", "group-a-member-2"] }]
      )
    ).toEqual({ movableRootBounds: [], missingMovableRootIds: ["group-a"] });
  });
});

describe("HTML30 movable-root peer overlap gate", () => {
  it("detects actual two-dimensional overlap but ignores touching edges", () => {
    const entries = [
      { id: "group-a", bounds: { x: 10, y: 10, width: 100, height: 80 } },
      { id: "group-b", bounds: { x: 96, y: 30, width: 60, height: 40 } },
      { id: "group-c", bounds: { x: 156, y: 30, width: 60, height: 40 } }
    ];
    expect(findPeerOverlapPairs(entries)).toEqual([
      {
        leftId: "group-a",
        rightId: "group-b",
        overlapWidth: 14,
        overlapHeight: 40
      }
    ]);
  });

  it("rejects non-overlapping movable roots that still violate the semantic gap", () => {
    const entries = [
      { id: "group-a", bounds: { x: 10, y: 10, width: 100, height: 80 } },
      { id: "group-b", bounds: { x: 113, y: 10, width: 60, height: 80 } },
      { id: "group-c", bounds: { x: 190, y: 10, width: 60, height: 80 } }
    ];
    expect(findPeerOverlapPairs(entries)).toEqual([]);
    expect(findPeerClearanceViolations(entries, 16, 1.5)).toEqual([
      { leftId: "group-a", rightId: "group-b", clearance: 3 }
    ]);
  });

  it("fails closed for duplicate identities and non-finite geometry", () => {
    expect(() =>
      findPeerOverlapPairs([
        { id: "same", bounds: { x: 0, y: 0, width: 10, height: 10 } },
        { id: "same", bounds: { x: 20, y: 0, width: 10, height: 10 } }
      ])
    ).toThrow("peer-overlap:invalid-entry");
    expect(() =>
      findPeerOverlapPairs([
        { id: "bad", bounds: { x: Number.NaN, y: 0, width: 10, height: 10 } }
      ])
    ).toThrow("peer-overlap:invalid-entry");
  });
});
