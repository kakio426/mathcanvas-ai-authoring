import { describe, expect, it } from "vitest";
import {
  MATHCANVAS_PROJECT_CATEGORIES,
  recommendationSchema
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  BROKEN_RULER_LENGTH_CONFIGURATION_CAPACITY,
  brokenRulerCandidateValues,
  brokenRulerLengthBlueprint,
  prepareRegisteredActivityForEnvelopeValidation
} from "@mathcanvas/templates";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

describe("Wave 13 1 cm 단위 반복 길이 재기 활동", () => {
  it("놓인 위치와 실제 길이를 구별하고 1 cm 막대로 선택을 고치게 한다", () => {
    const planned = recommendActivity({
      schemaVersion: "1.0.0",
      requestId: "wave13-broken-ruler-test",
      prompt:
        "2학년 학생이 자의 0이 아닌 눈금에서 시작한 연필의 길이를 1 cm 단위로 재는 활동지를 만들어 주세요.",
      requestedGrade: 2,
      problemCount: 3,
      createdAt: "2026-08-01T00:00:00.000Z"
    });
    expect(planned).toMatchObject({
      templateId: brokenRulerLengthBlueprint.id,
      standardCode: "[2수03-10]",
      problemCount: 3,
      manipulation: "length-unit-iteration-drag"
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
          seed: "wave13-broken-ruler-test",
          generatedAt: "2026-08-01T00:00:00.000Z",
          activityId: "wave13-broken-ruler-test"
        }
      );
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-08-01T00:00:00.000Z")
    );

    expect(BROKEN_RULER_LENGTH_CONFIGURATION_CAPACITY).toBe(64);
    expect(report.issues).toEqual([]);
    expect(report.canCreate).toBe(true);
    expect(resolved.items).toHaveLength(3);

    const emission = (itemId: string, role: string) => {
      const found = resolved.emissions.find(
        (candidate) =>
          candidate.itemId === itemId && candidate.role === role
      );
      expect(found).toBeDefined();
      return found!;
    };

    expect(
      new Set(resolved.items.map((item) => item.values.startMark)).size
    ).toBe(resolved.items.length);
    expect(
      new Set(
        resolved.items
          .slice(0, 2)
          .map((item) => item.values.totalUnits)
      ).size
    ).toBe(2);

    for (const item of resolved.items) {
      const totalUnits = Number(item.values.totalUnits);
      const startMark = Number(item.values.startMark);
      const length = Number(item.values.lengthCm);
      const endMark = Number(item.values.endMark);
      const candidates = [1, 2, 3, 4, 5].map((number) =>
        Number(item.values[`candidate${number}`])
      );
      expect([8, 12]).toContain(totalUnits);
      expect(startMark).toBeGreaterThanOrEqual(1);
      expect(endMark).toBe(startMark + length);
      expect(endMark).toBeLessThanOrEqual(totalUnits);
      expect(candidates).not.toContain(0);
      expect(item.values.questionText).toBe(
        "연필의 왼쪽 끝이 자의 시작점과 맞지 않습니다. 연필의 길이는 몇 cm입니까?"
      );
      expect(new Set(candidates)).toEqual(
        new Set(
          brokenRulerCandidateValues(
            totalUnits,
            startMark,
            length
          )
        )
      );

      const measuredBar = emission(item.id, "left-strip");
      const unitStick = emission(item.id, "right-strip");
      const lane = emission(item.id, "join-lane");
      const ruler = emission(item.id, "unit-ruler");
      expect(measuredBar.bounds.x).toBe(ruler.bounds.x);
      expect(measuredBar.bounds.width).toBe(ruler.bounds.width);
      expect(measuredBar.locked).toBe(true);
      expect(measuredBar.movable).toBe(false);
      expect(unitStick.bounds.x).toBe(ruler.bounds.x);
      expect(unitStick.bounds.width).toBe(ruler.bounds.width);
      expect(ruler.bounds.width % totalUnits).toBe(0);
      expect(lane.bounds.x).toBe(ruler.bounds.x);
      expect(lane.toolIntent.properties.fill).toBe("none");
      expect(measuredBar.renderedBounds).toMatchObject({
        x: ruler.bounds.x +
          ruler.bounds.width / totalUnits * startMark,
        width: ruler.bounds.width / totalUnits * length,
        height: measuredBar.bounds.height
      });
      expect(unitStick.renderedBounds).toMatchObject({
        x: ruler.bounds.x,
        width: ruler.bounds.width / totalUnits,
        height: unitStick.bounds.height
      });
      expect(
        lane.bounds.y + lane.bounds.height -
          (measuredBar.bounds.y + measuredBar.bounds.height)
      ).toBeGreaterThanOrEqual(unitStick.bounds.height);
      expect(
        resolved.constraints.some((constraint) =>
          constraint.id.startsWith(`place-left-strip:${item.id}`)
        )
      ).toBe(false);
      expect(
        resolved.constraints.find((constraint) =>
          constraint.id.startsWith(
            `iterate-one-centimeter-unit:${item.id}`
          )
        )?.satisfiedInitially
      ).toBe(false);

      const compiledBar = compiled.payload.contentsJson.find(
        (object) => object.id === measuredBar.id
      );
      expect(compiledBar).toBeDefined();
      const unitWidth = ruler.bounds.width / totalUnits;
      expect(compiledBar?.point1).toEqual([
        ruler.bounds.x + unitWidth * startMark,
        measuredBar.bounds.y
      ]);
      expect(compiledBar?.point2).toEqual([
        ruler.bounds.x + unitWidth * endMark,
        measuredBar.bounds.y + measuredBar.bounds.height
      ]);
    }

    const fractionModels = compiled.payload.contentsJson.filter(
      (object) =>
        typeof object.svgId === "string" &&
        object.svgId.startsWith("NO03FM-")
    );
    expect(fractionModels).toHaveLength(resolved.items.length * 2);
    expect(
      fractionModels.every((object) => object.isEyeOn === false)
    ).toBe(true);
    expect(compiled.payload.categoryId).toBe(
      MATHCANVAS_PROJECT_CATEGORIES["도형과 측정"].categoryId
    );

    const shifted = structuredClone(resolved);
    const firstItemId = shifted.items[0]!.id;
    const shiftedBar = shifted.emissions.find(
      (candidate) =>
        candidate.itemId === firstItemId &&
        candidate.role === "left-strip"
    );
    expect(shiftedBar).toBeDefined();
    if (shiftedBar) shiftedBar.bounds.x += 1;
    expect(
      validateForCreation(
        shifted,
        compileActivity(shifted)
      ).issues.map((issue) => issue.code)
    ).toContain("unit-ruler-offset-length-invalid");

    const mismatchedSpan = structuredClone(resolved);
    const firstPencil = mismatchedSpan.emissions.find(
      (candidate) =>
        candidate.itemId === mismatchedSpan.items[0]!.id &&
        candidate.role === "left-strip"
    )!;
    const firstSpan = firstPencil.toolIntent.properties.unitSpan as {
      from: number;
    };
    firstSpan.from += 1;
    expect(
      validateForCreation(
        mismatchedSpan,
        compileActivity(mismatchedSpan)
      ).issues.map((issue) => issue.code)
    ).toContain("unit-ruler-offset-length-invalid");

    const answerRevealingPencil = structuredClone(resolved);
    const revealingPencil = answerRevealingPencil.emissions.find(
      (candidate) =>
        candidate.itemId === answerRevealingPencil.items[0]!.id &&
        candidate.role === "left-strip"
    )!;
    revealingPencil.toolIntent = {
      kind: "fraction-model",
      toolKey: "NO03FM",
      properties: {
        fraction: {
          numerator: answerRevealingPencil.items[0]!.values.lengthCm,
          denominator: answerRevealingPencil.items[0]!.values.totalUnits
        },
        color: "#F6A94A",
        showLabel: false
      }
    };
    expect(
      validateForCreation(
        answerRevealingPencil,
        compileActivity(answerRevealingPencil)
      ).issues.map((issue) => issue.code)
    ).toContain("unit-ruler-offset-length-invalid");

    const movablePencil = structuredClone(resolved);
    const movedPencil = movablePencil.emissions.find(
      (candidate) =>
        candidate.itemId === movablePencil.items[0]!.id &&
        candidate.role === "left-strip"
    )!;
    movedPencil.locked = false;
    movedPencil.movable = true;
    expect(
      validateForCreation(
        movablePencil,
        compileActivity(movablePencil)
      ).issues.map((issue) => issue.code)
    ).toContain("unit-ruler-offset-length-invalid");

    const wrongUnit = structuredClone(resolved);
    const unit = wrongUnit.emissions.find(
      (candidate) =>
        candidate.itemId === wrongUnit.items[0]!.id &&
        candidate.role === "right-strip"
    )!;
    const unitFraction = unit.toolIntent.properties.fraction as {
      denominator: number;
    };
    unitFraction.denominator -= 1;
    expect(
      validateForCreation(
        wrongUnit,
        compileActivity(wrongUnit)
      ).issues.map((issue) => issue.code)
    ).toContain("unit-ruler-offset-length-invalid");

    const incompleteRuler = structuredClone(resolved);
    const ruler = incompleteRuler.emissions.find(
      (candidate) =>
        candidate.itemId === incompleteRuler.items[0]!.id &&
        candidate.role === "unit-ruler"
    )!;
    const rulerFraction = ruler.toolIntent.properties.fraction as {
      numerator: number;
    };
    rulerFraction.numerator -= 1;
    expect(
      validateForCreation(
        incompleteRuler,
        compileActivity(incompleteRuler)
      ).issues.map((issue) => issue.code)
    ).toContain("unit-ruler-offset-length-invalid");

    const zeroChoice = structuredClone(resolved);
    const firstChoice = zeroChoice.items[0]!;
    firstChoice.values.candidate3 = "0";
    firstChoice.values.candidate3Latex = "0";
    expect(
      validateForCreation(
        zeroChoice,
        compileActivity(zeroChoice)
      ).issues.map((issue) => issue.code)
    ).toContain("broken-ruler-length-distractors-invalid");
  });
});
