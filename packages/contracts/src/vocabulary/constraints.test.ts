import { describe, expect, it } from "vitest";
import {
  interactionConstraintSchema,
  resolvedConstraintSchema
} from "./constraints.js";

function roleReferences(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    scope: "each-item" as const,
    role: `source-${index + 1}`
  }));
}

function interaction(count: number) {
  return {
    id: "fill-rule-slot",
    kind: "fill-from-pool",
    sources: roleReferences(count),
    target: { scope: "each-item" as const, role: "rule-slot-1" },
    parameters: {},
    requiresStudentAction: true
  };
}

function resolved(count: number) {
  return {
    id: "fill-rule-slot:item-1",
    kind: "fill-from-pool",
    sourceIds: Array.from({ length: count }, (_, index) => `source-${index + 1}`),
    targetId: "rule-slot-1:item-1",
    parameters: {},
    requiresStudentAction: true,
    satisfiedInitially: false
  };
}

describe("constraint source capacity", () => {
  it("accepts the nine-source repeat-rule contract and the bounded ceiling", () => {
    expect(interactionConstraintSchema.safeParse(interaction(9)).success).toBe(
      true
    );
    expect(interactionConstraintSchema.safeParse(interaction(12)).success).toBe(
      true
    );
    expect(resolvedConstraintSchema.safeParse(resolved(9)).success).toBe(true);
    expect(resolvedConstraintSchema.safeParse(resolved(12)).success).toBe(true);
  });

  it("rejects thirteen sources symmetrically", () => {
    expect(interactionConstraintSchema.safeParse(interaction(13)).success).toBe(
      false
    );
    expect(resolvedConstraintSchema.safeParse(resolved(13)).success).toBe(false);
  });
});
