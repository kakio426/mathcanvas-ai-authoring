import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  MATHCANVAS_MODULE_MANIFEST,
  recommendationSchema
} from "@mathcanvas/contracts";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import {
  assertCognitiveManifestBound,
  balancedEquationCardsBlueprint,
  generateBalancedEquationCardsActivity
} from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 5 등호 관계 활동", () => {
  it("CR07AT는 조사 근거로 막고, 수 카드 활동은 사고 흐름과 정렬을 통과한다", () => {
    const algebraRods = MATHCANVAS_MODULE_MANIFEST.find(
      (entry) => entry.moduleKey === "CR07AT"
    );
    expect(algebraRods?.supportState).toBe("contracted");
    expect(algebraRods?.adapterKey).toBeUndefined();

    const gated = recommendActivity({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "wave5-focused-test",
      prompt: "4학년 등호 양쪽의 값을 같게 하는 수 카드 활동",
      requestedGrade: 4,
      problemCount: 3,
      difficulty: "normal",
      createdAt: "2026-07-31T08:00:00.000Z"
    });
    expect(gated.templateId).toBe(
      balancedEquationCardsBlueprint.id
    );
    expect(gated.supported).toBe(true);

    const recommendation = recommendationSchema.parse({
      ...gated,
      supported: true,
      blockingReasons: []
    });
    const plan = generateBalancedEquationCardsActivity(
      recommendation,
      {
        seed: "wave5-focused-test",
        generatedAt: "2026-07-31T08:00:00.000Z",
        activityId: "wave5-focused-test"
      }
    );
    assertCognitiveManifestBound(plan.blueprint);
    const resolved = resolveActivity({
      blueprint: plan.blueprint,
      items: plan.items,
      recommendation: plan.recommendation,
      options: plan.options
    });
    const compiled = compileActivity(resolved);
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-07-31T08:00:00.000Z")
    );

    expect(report.canCreate).toBe(true);
    expect(report.issues).toEqual([]);
    expect(
      compiled.payload.canvasOption.moduleArr.Unit01!.NO04NT
    ).toBe(true);
    for (const item of resolved.items) {
      const pieces = Array.from(
        { length: 6 },
        (_, index) => item.values[`piece${index + 1}`]
      );
      expect(
        Number(item.values.a) + Number(item.values.b)
      ).toBe(
        Number(item.values.c) + Number(item.values.solution)
      );
      expect(pieces).toContain(item.values.solution);
      expect(pieces).toContain(item.values.operationalAnswer);
      expect(pieces).toContain(item.values.mirrorValue);
      expect(
        Math.abs(
          Number(item.values.nearMissValue) -
            Number(item.values.solution)
        )
      ).toBe(1);
    }
  });
});
