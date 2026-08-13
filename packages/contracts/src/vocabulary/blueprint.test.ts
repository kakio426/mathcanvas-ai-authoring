import { describe, expect, it } from "vitest";
import {
  defineActivityBlueprint,
  parseActivityBlueprint,
  type ActivityBlueprintBody
} from "./blueprint.js";

function baseBlueprint(
  predicateParameters: Record<string, unknown> = {}
): ActivityBlueprintBody {
  return {
    schemaVersion: "1.0.0",
    id: "blueprint-metadata-guard-fixture",
    version: "1.0.0",
    title: "Blueprint metadata guard fixture",
    learningObjective: "수의 변화를 나타낸다.",
    curriculumBinding: {
      standardCode: "[2수02-02]",
      domain: "변화와 관계",
      officialGoal: "자신이 정한 규칙에 따라 수를 배열할 수 있다."
    },
    generator: {
      id: "blueprint-metadata-guard-fixture",
      version: "1.0.0",
      parameters: {}
    },
    toolRoles: [
      {
        role: "source",
        scope: "each-item",
        layoutRole: "source",
        idRole: "source",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: false,
        movable: true,
        instructionalIntent: "수 카드를 옮깁니다.",
        properties: { fill: "white", stroke: "slategray" },
        bindings: {}
      },
      {
        role: "target",
        scope: "each-item",
        layoutRole: "target",
        idRole: "target",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "수 카드를 놓습니다.",
        properties: { fill: "white", stroke: "slategray" },
        bindings: {}
      }
    ],
    layout: {
      tokenSet: "blueprint-metadata-guard-fixture",
      root: {
        id: "canvas",
        kind: "canvas",
        preset: "canvas.root",
        repeat: "once",
        children: [
          {
            id: "source",
            kind: "slot",
            preset: "item.source",
            repeat: "each-item",
            children: []
          },
          {
            id: "target",
            kind: "slot",
            preset: "item.target",
            repeat: "each-item",
            children: []
          }
        ]
      }
    },
    constraints: [
      {
        id: "fill-target",
        kind: "fill-from-pool",
        sources: [{ scope: "each-item", role: "source" }],
        target: { scope: "each-item", role: "target" },
        parameters: {},
        requiresStudentAction: true
      }
    ],
    valuePredicates: [
      {
        kind: "cognitive.change-rule-state-contract",
        parameters: predicateParameters
      }
    ],
    instructions: ["수 카드를 놓으세요."],
    payload: {
      categoryId: "change-relationships",
      tags: ["blueprint-test"],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: {}
  };
}

const nativeMetadata = {
  nativeEvidenceContract: {
    renderedBounds: { width: 80, height: 80 },
    minimumTargetBounds: { width: 188, height: 188 }
  }
};

describe("blueprint predicate metadata guard", () => {
  it("allows only the four exact native metadata leaves and preserves parse parity", () => {
    const blueprint = defineActivityBlueprint(baseBlueprint(nativeMetadata));
    expect(parseActivityBlueprint(blueprint)).toEqual(blueprint);
  });

  it("continues to reject answer-shaped bounds outside the exact metadata paths", () => {
    const cases = [
      {
        ...baseBlueprint(nativeMetadata),
        generator: {
          ...baseBlueprint(nativeMetadata).generator,
          parameters: { width: 80 }
        }
      },
      {
        ...baseBlueprint(nativeMetadata),
        toolRoles: [
          {
            ...baseBlueprint(nativeMetadata).toolRoles[0]!,
            properties: { width: 80 }
          },
          baseBlueprint(nativeMetadata).toolRoles[1]!
        ]
      },
      baseBlueprint({
        nativeEvidenceContract: {
          otherBounds: { width: 80, height: 80 }
        }
      }),
      baseBlueprint({ answerShape: { width: 80 } })
    ];
    cases.forEach((candidate) =>
      expect(() => defineActivityBlueprint(candidate)).toThrow(
        /blueprint-key-forbidden/
      )
    );
  });

  it("uses the same guard before hash validation when parsing", () => {
    const blueprint = defineActivityBlueprint(baseBlueprint(nativeMetadata));
    const changed = structuredClone(blueprint) as typeof blueprint;
    changed.valuePredicates[0]!.parameters.nativeEvidenceContract = {
      renderedBounds: { width: 80, height: 80 },
      minimumTargetBounds: { width: 188, height: 188 },
      answer: { width: 80 }
    };
    expect(() => parseActivityBlueprint(changed)).toThrow(
      /blueprint-key-forbidden/
    );
  });
});
