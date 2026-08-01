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
  balanceScaleSumBlueprint,
  generateBalanceScaleSumActivity
} from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 5B 접시저울 활동", () => {
  it("오개념 카드와 실제 균형 구조를 함께 컴파일한다", () => {
    const balanceScale = MATHCANVAS_MODULE_MANIFEST.find(
      (entry) => entry.moduleKey === "CR07BS"
    );
    expect(balanceScale?.supportState).toBe("released");
    expect(balanceScale?.adapterKey).toBe("balance-scale");
    expect(balanceScale?.lifecycleEvidenceIds).toHaveLength(1);

    const gated = recommendActivity({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "wave5-balance-focused-test",
      prompt: "4학년 접시저울로 등호 양쪽이 같은 활동",
      requestedGrade: 4,
      problemCount: 2,
      difficulty: "normal",
      createdAt: "2026-07-31T09:00:00.000Z"
    });
    expect(gated.templateId).toBe(balanceScaleSumBlueprint.id);
    expect(gated.supported).toBe(true);

    const recommendation = recommendationSchema.parse({
      ...gated,
      supported: true,
      blockingReasons: []
    });
    const plan = generateBalanceScaleSumActivity(
      recommendation,
      {
        seed: "wave5-balance-focused-test",
        generatedAt: "2026-07-31T09:00:00.000Z",
        activityId: "wave5-balance-focused-test"
      }
    );
    assertCognitiveManifestBound(plan.blueprint);
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-07-31T09:00:00.000Z")
    );

    expect(report.canCreate).toBe(true);
    expect(report.issues).toEqual([]);
    expect(
      compiled.payload.canvasOption.moduleArr.Unit02!.CR07BS
    ).toBe(true);
    expect(
      compiled.payload.canvasOption.moduleArr.Unit01!.NO04NT
    ).toBe(true);
    expect(compiled.payload.canvasOption.CR07BSArr).toEqual([]);

    const scales = compiled.payload.contentsJson.filter(
      (object) => object.svgId === "CR07BS-01"
    );
    expect(scales).toHaveLength(2);
    for (const item of resolved.items) {
      const scale = compiled.payload.contentsJson.find(
        (object) =>
          object.id === `${item.id}-balance-scale`
      );
      const fixedCards = compiled.payload.contentsJson.filter(
        (object) =>
          object.plate === scale?.id
      );
      const pieces = Array.from(
        { length: 5 },
        (_, index) =>
          Number(item.values[`piece${index + 1}`])
      );
      expect(scale).toMatchObject({
        svgId: "CR07BS-01",
        line: "M143,15 L143,87 L575,37 L575,-35",
        plate: { left: 25, right: -25 },
        canEquilibrium: false
      });
      expect(fixedCards).toHaveLength(2);
      expect(new Set(pieces).size).toBe(5);
      expect(pieces).toContain(item.values.correctResult);
      expect(pieces).toContain(item.values.a);
      expect(pieces).toContain(item.values.b);
      expect(pieces).toContain(item.values.differenceValue);
      expect(
        Math.abs(
          Number(item.values.nearMissValue) -
            Number(item.values.correctResult)
        )
      ).toBe(1);
      expect(
        Number(item.values.a) + Number(item.values.b)
      ).toBe(item.values.correctResult);
    }
  });
});
