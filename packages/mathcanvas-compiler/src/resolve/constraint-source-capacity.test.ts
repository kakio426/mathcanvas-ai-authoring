import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint,
  type Recommendation,
  type ResolvedItem
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import { resolveActivity } from "./resolve-activity.js";

const sourceRoles = Array.from({ length: 9 }, (_, index) => `rule-source-${index + 1}`);
const curriculum = resolveCurriculum("[2수02-02]");

function block(id: string, preset: string) {
  return {
    id,
    kind: "slot" as const,
    preset,
    repeat: "each-item" as const,
    children: []
  };
}

const blueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: "w002-constraint-source-capacity-fixture",
  version: "1.0.0",
  title: "9 source resolve fixture",
  learningObjective: "9개의 원천을 한 칸의 조작 제약에 연결한다.",
  curriculumBinding: {
    standardCode: curriculum.record.code,
    domain: "변화와 관계",
    officialGoal: curriculum.record.officialGoal
  },
  generator: {
    id: "w002-constraint-source-capacity-fixture",
    version: "1.0.0",
    parameters: {}
  },
  toolRoles: [
    ...sourceRoles.map((role) => ({
      role,
      scope: "each-item" as const,
      layoutRole: role,
      idRole: role,
      toolKey: "common.rectangle" as const,
      intentKind: "draw-rectangle" as const,
      locked: false,
      movable: true,
      instructionalIntent: "원천 블록입니다.",
      properties: { fill: "#FFFFFF", stroke: "#334155" },
      bindings: {},
      containerRole: "piece-bank"
    })),
    {
      role: "rule-slot-1",
      scope: "each-item" as const,
      layoutRole: "rule-slot-1",
      idRole: "rule-slot-1",
      toolKey: "common.rectangle" as const,
      intentKind: "draw-rectangle" as const,
      locked: true,
      movable: false,
      instructionalIntent: "규칙 칸입니다.",
      properties: { fill: "#FFFFFF", stroke: "#334155" },
      bindings: {},
      containerRole: "pattern-track"
    }
  ],
  layout: {
    tokenSet: "w002-repeat-rule-construction-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        block("pattern-track", "item.pattern-track"),
        ...sourceRoles.map((role) => block(role, `item.${role}`)),
        block("rule-slot-1", "item.rule-slot-1")
      ]
    }
  },
  constraints: [
    {
      id: "fill-rule-slot-1",
      kind: "fill-from-pool",
      sources: sourceRoles.map((role) => ({
        scope: "each-item" as const,
        role
      })),
      target: { scope: "each-item", role: "rule-slot-1" },
      parameters: {},
      requiresStudentAction: true
    }
  ],
  valuePredicates: [{ kind: "test.fixture", parameters: {} }],
  instructions: ["아홉 원천 중 필요한 블록을 규칙 칸에 놓으세요."],
  payload: {
    categoryId: MATHCANVAS_PROJECT_CATEGORIES["변화와 관계"].categoryId,
    tags: ["9-source"],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: {}
});

const recommendation = {
  schemaVersion: CONTRACT_SCHEMA_VERSION,
  supported: true,
  blockingReasons: [],
  templateId: blueprint.id,
  gradeBand: curriculum.record.gradeBand,
  standardCode: curriculum.record.code,
  learningGoal: blueprint.learningObjective,
  prerequisites: curriculum.record.prerequisites,
  rationale: ["9개 원천 용량 회귀 테스트입니다."],
  confidence: 1,
  caveats: [],
  recommendedGrade: 2,
  manipulation: "pattern-block-repeat-unit-drag",
  difficulty: "normal",
  problemCount: 1,
  requestId: "w002-constraint-source-capacity-fixture",
  curriculum: curriculum.record
} as Recommendation;

const item: ResolvedItem = {
  id: "w002-constraint-source-capacity-item-1",
  order: 1,
  kind: "w002-constraint-source-capacity",
  values: {},
  provenance: {
    generatorId: blueprint.generator.id,
    generatorVersion: blueprint.generator.version,
    seed: "w002-constraint-source-capacity-seed"
  }
};

describe("resolved nine-source constraint capacity", () => {
  it("resolves all nine source emissions without truncation", () => {
    const resolved = resolveActivity({
      blueprint,
      items: [item],
      recommendation,
      options: {
        activityId: "w002-constraint-source-capacity-activity",
        seed: "w002-constraint-source-capacity-seed",
        generatedAt: "2026-08-12T00:00:00.000Z",
        templateVersion: blueprint.version,
        variation: {}
      }
    });
    expect(resolved.constraints).toHaveLength(1);
    expect(resolved.constraints[0]?.sourceIds).toHaveLength(9);
    expect(new Set(resolved.constraints[0]?.sourceIds).size).toBe(9);
  });
});
