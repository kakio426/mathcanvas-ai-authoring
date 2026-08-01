import { describe, expect, it } from "vitest";
import {
  MATHCANVAS_PROJECT_CATEGORIES,
  recommendationSchema
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  BAR_GRAPH_SCALE_CONFIGURATION_CAPACITY,
  barGraphScaleUnitBlueprint,
  prepareRegisteredActivityForEnvelopeValidation
} from "@mathcanvas/templates";
import {
  compileActivity,
  compileNativeTool,
  resolveActivity
} from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 12 막대그래프 눈금 한 칸의 값 활동", () => {
  it("기준 막대로 눈금 한 칸을 정하고 다섯 오개념 답을 고쳐 읽게 한다", () => {
    const planned = recommendActivity({
      schemaVersion: "1.0.0",
      requestId: "wave12-bar-graph-scale-test",
      prompt:
        "4학년 막대그래프에서 눈금 한 칸의 크기를 정해 그래프를 읽는 활동지를 만들어 주세요.",
      requestedGrade: 4,
      createdAt: "2026-07-31T00:00:00.000Z"
    });
    expect(planned).toMatchObject({
      templateId: barGraphScaleUnitBlueprint.id,
      standardCode: "[4수04-01]",
      problemCount: 3,
      manipulation: "bar-graph-scale-unit-drag"
    });
    const recommendation = recommendationSchema.parse({
      ...planned,
      supported: true,
      blockingReasons: []
    });
    const plan =
      prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: "wave12-bar-graph-scale-test",
          generatedAt: "2026-07-31T00:00:00.000Z",
          activityId: "wave12-bar-graph-scale-test"
        }
      );
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-07-31T00:00:00.000Z")
    );

    expect(BAR_GRAPH_SCALE_CONFIGURATION_CAPACITY).toBe(189);
    expect(report.issues).toEqual([]);
    expect(report.canCreate).toBe(true);
    expect(resolved.items).toHaveLength(3);
    expect(
      new Set(
        resolved.items.map((item) =>
          Number(item.values.peoplePerCell)
        )
      ).size
    ).toBe(3);
    expect(
      resolved.items.every((item) => {
        const totalCells = Number(item.values.totalCells);
        const peoplePerCell = Number(
          item.values.peoplePerCell
        );
        const referenceCells = Number(
          item.values.referenceCells
        );
        const questionCells = Number(
          item.values.questionCells
        );
        const referenceValue = Number(
          item.values.referenceValue
        );
        const questionValue = Number(
          item.values.questionValue
        );
        const candidates = [1, 2, 3, 4, 5].map((number) =>
          String(item.values[`candidate${number}`])
        );
        return (
          (totalCells === 10 || totalCells === 12) &&
          [2, 5, 10].includes(peoplePerCell) &&
          questionCells > referenceCells &&
          referenceValue === referenceCells * peoplePerCell &&
          questionValue === questionCells * peoplePerCell &&
          new Set(candidates).size === 5 &&
          candidates.every((value) => Number(value) <= 100) &&
          [
            questionValue,
            questionCells,
            referenceValue,
            referenceValue + (questionCells - referenceCells),
            (questionCells + 1) * peoplePerCell
          ].every((value) => candidates.includes(String(value)))
        );
      })
    ).toBe(true);

    const emission = (itemId: string, role: string) => {
      const found = resolved.emissions.find(
        (candidate) =>
          candidate.itemId === itemId && candidate.role === role
      );
      expect(found).toBeDefined();
      return found!;
    };
    for (const item of resolved.items) {
      const referenceBar = emission(item.id, "left-strip");
      const questionBar = emission(item.id, "right-strip");
      const referenceLane = emission(item.id, "reference-lane");
      const questionLane = emission(item.id, "question-lane");
      const scaleTrack = emission(item.id, "unit-ruler");
      expect(referenceBar.bounds.x).not.toBe(referenceLane.bounds.x);
      expect(questionBar.bounds.x).not.toBe(questionLane.bounds.x);
      expect(referenceBar.bounds.x).not.toBe(questionBar.bounds.x);
      expect(referenceLane.bounds.x).toBe(questionLane.bounds.x);
      expect(referenceLane.bounds.x).toBe(scaleTrack.bounds.x);
      expect(
        referenceLane.bounds.y + referenceLane.bounds.height
      ).toBeLessThan(questionLane.bounds.y);
      expect(
        resolved.constraints.find((constraint) =>
          constraint.id.startsWith(`place-reference-bar:${item.id}`)
        )?.satisfiedInitially
      ).toBe(false);
      expect(
        resolved.constraints.find((constraint) =>
          constraint.id.startsWith(`place-question-bar:${item.id}`)
        )?.satisfiedInitially
      ).toBe(false);
    }

    const overlappedRows = structuredClone(resolved);
    const firstItemId = overlappedRows.items[0]!.id;
    const referenceLaneForTamper = overlappedRows.emissions.find(
      (candidate) =>
        candidate.itemId === firstItemId &&
        candidate.role === "reference-lane"
    );
    const questionLaneForTamper = overlappedRows.emissions.find(
      (candidate) =>
        candidate.itemId === firstItemId &&
        candidate.role === "question-lane"
    );
    expect(referenceLaneForTamper).toBeDefined();
    expect(questionLaneForTamper).toBeDefined();
    if (referenceLaneForTamper && questionLaneForTamper) {
      Object.assign(questionLaneForTamper.bounds, {
        y: referenceLaneForTamper.bounds.y
      });
    }
    const overlappedCompiled = compileActivity(overlappedRows);
    expect(
      validateForCreation(
        overlappedRows,
        overlappedCompiled
      ).issues.map((issue) => issue.code)
    ).toContain("bar-graph-scale-geometry-invalid");

    const preAligned = structuredClone(resolved);
    const preAlignedBar = preAligned.emissions.find(
      (candidate) =>
        candidate.itemId === firstItemId &&
        candidate.role === "left-strip"
    );
    const preAlignedLane = preAligned.emissions.find(
      (candidate) =>
        candidate.itemId === firstItemId &&
        candidate.role === "reference-lane"
    );
    expect(preAlignedBar).toBeDefined();
    expect(preAlignedLane).toBeDefined();
    if (preAlignedBar && preAlignedLane) {
      Object.assign(preAlignedBar.bounds, {
        x: preAlignedLane.bounds.x
      });
    }
    const preAlignedCompiled = compileActivity(preAligned);
    expect(
      validateForCreation(
        preAligned,
        preAlignedCompiled
      ).issues.map((issue) => issue.code)
    ).toContain("bar-graph-scale-geometry-invalid");

    const fractionModels =
      compiled.payload.contentsJson.filter(
        (object) =>
          typeof object.svgId === "string" &&
          object.svgId.startsWith("NO03FM-")
      );
    expect(fractionModels).toHaveLength(
      resolved.items.length * 3
    );
    expect(
      fractionModels.every((object) => object.isEyeOn === false)
    ).toBe(true);
    expect(
      compiled.payload.canvasOption.moduleArr.Unit01!.NO03FM
    ).toBe(true);
    expect(compiled.payload.categoryId).toBe(
      MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"].categoryId
    );

    const defaultLabelObject = compileNativeTool(
      {
        kind: "fraction-model",
        toolKey: "NO03FM",
        fraction: { numerator: 3, denominator: 10 },
        color: "#65C978"
      },
      {
        id: "default-label-regression",
        x: 100,
        y: 100,
        width: 720,
        height: 70
      }
    ).object;
    expect(defaultLabelObject.isEyeOn).toBe(true);

    const tampered = structuredClone(compiled);
    const firstFraction = tampered.payload.contentsJson.find(
      (object) =>
        typeof object.svgId === "string" &&
        object.svgId.startsWith("NO03FM-")
    );
    expect(firstFraction).toBeDefined();
    if (firstFraction) firstFraction.isEyeOn = true;
    expect(
      validateForCreation(resolved, tampered).issues.map(
        (issue) => issue.code
      )
    ).toContain("native-fraction-mismatch");
  });
});
