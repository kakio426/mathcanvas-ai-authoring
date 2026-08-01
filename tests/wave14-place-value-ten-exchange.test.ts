import { describe, expect, it } from "vitest";
import {
  MATHCANVAS_PROJECT_CATEGORIES,
  recommendationSchema
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  PLACE_VALUE_TEN_EXCHANGE_CONFIGURATION_CAPACITY,
  placeValueExchangeIdeas,
  placeValueTenExchangeBlueprint,
  prepareRegisteredActivityForEnvelopeValidation
} from "@mathcanvas/templates";
import { compileActivity, resolveActivity } from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 14 십 모형 10개와 백 모형 1개 교환 활동", () => {
  it("먼저 수를 고르고 십 10개를 100칸에 연결해 선택을 고치게 한다", () => {
    const planned = recommendActivity({
      schemaVersion: "1.0.0",
      requestId: "wave14-place-value-test",
      prompt:
        "2학년 학생이 십 모형 10개를 백 모형 1개와 바꾸며 자릿값을 설명하는 활동지를 만들어 주세요.",
      requestedGrade: 2,
      problemCount: 3,
      createdAt: "2026-08-01T00:00:00.000Z"
    });
    expect(planned).toMatchObject({
      templateId: placeValueTenExchangeBlueprint.id,
      standardCode: "[2수01-02]",
      problemCount: 3,
      manipulation: "place-value-ten-exchange-drag"
    });
    const recommendation = recommendationSchema.parse({
      ...planned,
      supported: true,
      blockingReasons: []
    });
    const plan = prepareRegisteredActivityForEnvelopeValidation(
      recommendation,
      {
        seed: "wave14-place-value-test",
        generatedAt: "2026-08-01T00:00:00.000Z",
        activityId: "wave14-place-value-test"
      }
    );
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-08-01T00:00:00.000Z")
    );

    expect(PLACE_VALUE_TEN_EXCHANGE_CONFIGURATION_CAPACITY).toBe(153);
    expect(report.issues).toEqual([]);
    expect(report.canCreate).toBe(true);
    expect(resolved.items).toHaveLength(3);
    expect(
      new Set(resolved.items.map((item) => item.values.hundreds)).size
    ).toBe(3);
    expect(
      new Set(resolved.items.map((item) => item.values.tens)).size
    ).toBe(3);

    for (const item of resolved.items) {
      const hundreds = Number(item.values.hundreds);
      const tens = Number(item.values.tens);
      const ones = Number(item.values.ones);
      const candidates = [1, 2, 3, 4, 5].map((number) =>
        Number(item.values[`candidate${number}`])
      );
      expect(new Set(candidates)).toEqual(
        new Set(placeValueExchangeIdeas(hundreds, tens, ones))
      );
      expect(item.values.initialValue).toBe(
        hundreds * 100 + tens * 10 + ones
      );
      expect(item.values.initialDecompositionText).toBe(
        `${hundreds}백 + ${tens}십 + ${ones}일`
      );
      const exchangeTens = resolved.emissions.filter(
        (emission) =>
          emission.itemId === item.id &&
          emission.role.startsWith("exchange-ten-")
      );
      expect(exchangeTens).toHaveLength(10);
      expect(
        exchangeTens.every(
          (emission) =>
            emission.movable &&
            !emission.locked &&
            emission.toolIntent.kind === "place-value-model" &&
            emission.toolIntent.properties.value === 10
        )
      ).toBe(true);
      const slots = resolved.emissions.filter(
        (emission) =>
          emission.itemId === item.id &&
          emission.role.startsWith("exchange-slot-")
      );
      expect(slots).toHaveLength(10);
      expect(slots.every((slot) => slot.locked && !slot.movable)).toBe(true);
      const hundredGridRows = resolved.emissions.filter(
        (emission) =>
          emission.itemId === item.id &&
          emission.role.startsWith("hundred-grid-row-")
      );
      expect(hundredGridRows).toHaveLength(10);
      expect(
        hundredGridRows.every(
          (row) =>
            row.toolIntent.kind === "text" &&
            row.toolIntent.properties.text === "□□□□□□□□□□"
        )
      ).toBe(true);
      expect(
        resolved.constraints.filter(
          (constraint) =>
            constraint.id.includes(item.id) &&
            constraint.id.startsWith("place-ten-in-slot-")
        )
      ).toHaveLength(10);
    }

    const placeValueModels = compiled.payload.contentsJson.filter(
      (object) =>
        typeof object.svgId === "string" &&
        object.svgId.startsWith("NO04PD-")
    );
    expect(placeValueModels).toHaveLength(resolved.items.length * 10);
    expect(
      placeValueModels.every(
        (object) =>
          object.r === 60 &&
          Array.isArray(object.coordinates) &&
          JSON.stringify(object.coordinates) ===
            JSON.stringify([
              [-60, -60],
              [60, -60],
              [60, 60],
              [-60, 60]
            ])
      )
    ).toBe(true);
    expect(compiled.payload.categoryId).toBe(
      MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId
    );

    const broken = structuredClone(resolved);
    broken.items[0]!.values.concatenateCountsText = "999";
    expect(
      validateForCreation(broken, compileActivity(broken)).issues.map(
        (issue) => issue.code
      )
    ).toContain("place-value-ten-exchange-distractors-invalid");
  });
});
