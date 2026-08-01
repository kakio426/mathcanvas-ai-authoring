import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  createApprovalReceipt,
  recommendationSchema,
  sha256Hex,
  verifyApprovalReceipt,
  type ActivityBlueprint,
  type Recommendation
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import {
  buildRegisteredTeacherAnswerKey,
  enumerateRegisteredVariationEnvelope,
  equivalentFractionBlueprint,
  equivalentFractionTemplateDefinition,
  generateEquivalentFractionActivity,
  generateEquivalentFractionItems,
  generateMakeTenNumberCardsActivity,
  getRegisteredActivitySupportState,
  listRegisteredBlueprints,
  makeTenNumberCardsBlueprint,
  makeTenNumberCardsTemplateDefinition,
  projectRegisteredApprovalView
} from "@mathcanvas/templates";
import {
  prepareRegisteredActivityForEnvelopeValidation
} from "../packages/templates/src/registry.js";
import { validateForCreation } from "@mathcanvas/validator";

function recommendation(
  blueprint: ActivityBlueprint,
  manipulation: NonNullable<Recommendation["manipulation"]>,
  grade: number
): Recommendation {
  const curriculum = resolveCurriculum(
    blueprint.curriculumBinding.standardCode
  );
  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `p2-${blueprint.id}`,
    supported: true,
    templateId: blueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: grade,
    standardCode: curriculum.record.code,
    learningGoal: blueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 4,
    difficulty: "normal",
    manipulation,
    rationale: ["P2 구조 적합성 검증 활동입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}

function envelopeRecommendation(
  blueprint: ActivityBlueprint,
  variation: Readonly<Record<string, unknown>>
): Recommendation {
  const curriculum = resolveCurriculum(
    blueprint.curriculumBinding.standardCode
  );
  const controls: Record<
    string,
    {
      manipulation: NonNullable<Recommendation["manipulation"]>;
      grade: number;
    }
  > = {
    "fraction.compare.unlike-denominators.visual-v1": {
      manipulation: "fraction-strip-common-start-drag",
      grade: 5
    },
    "fraction.equivalent.same-whole.visual-v1": {
      manipulation: "equivalent-fraction-strip-match",
      grade: 5
    },
    "number.make-10.cards-v1": {
      manipulation: "number-card-make-ten-drag",
      grade: 2
    },
    "relation.equal-sign.balanced-equation.cards-v1": {
      manipulation: "number-card-balanced-equation-drag",
      grade: 4
    },
    "relation.equal-sign.balance-scale.sum-card-v1": {
      manipulation: "balance-scale-sum-card-drag",
      grade: 4
    },
    "measure.time.clock.hour-hand-boundary-v1": {
      manipulation: "clock-hour-hand-boundary-drag",
      grade: 2
    },
    "measure.time.elapsed.clock-pair-v1": {
      manipulation: "elapsed-time-clock-pair-drag",
      grade: 2
    },
    "fraction.add.same-denominator.strips-v1": {
      manipulation: "same-denominator-fraction-sum-drag",
      grade: 4
    },
    "fraction.add.same-denominator.improper-sum-v1": {
      manipulation: "same-denominator-improper-sum-drag",
      grade: 4
    },
    "fraction.add.unlike-denominators.common-unit-v1": {
      manipulation: "unlike-denominator-common-unit-drag",
      grade: 5
    },
    "fraction.subtract.unlike-denominators.common-unit-v1": {
      manipulation:
        "unlike-denominator-common-unit-difference-drag",
      grade: 5
    },
    "data.bar-graph.scale-unit.read-v1": {
      manipulation: "bar-graph-scale-unit-drag",
      grade: 4
    },
    "measure.length.unit-iteration.ruler-v1": {
      manipulation: "length-unit-iteration-drag",
      grade: 2
    },
    "number.place-value.regroup-ten-bundles-v1": {
      manipulation: "place-value-ten-exchange-drag",
      grade: 2
    },
    "pattern.repeat-unit.pattern-blocks-v1": {
      manipulation: "pattern-block-repeat-unit-drag",
      grade: 2
    },
    "number.multiplication.group-array-meaning-v1": {
      manipulation: "multiplication-array-choice-drag",
      grade: 2
    },
    "probability.compare.bag-ratios-v1": {
      manipulation: "probability-fraction-strip-drag",
      grade: 6
    }
  };
  const control = controls[blueprint.id];
  if (!control) {
    throw new Error(`p3-envelope-control-missing:${blueprint.id}`);
  }
  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `p3-envelope-${blueprint.id}`,
    supported: true,
    templateId: blueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: control.grade,
    standardCode: curriculum.record.code,
    learningGoal: blueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: variation.problemCount,
    difficulty: variation.difficulty,
    ...(variation.denominatorRelation
      ? {
          denominatorRelation:
            variation.denominatorRelation
        }
      : {}),
    manipulation: control.manipulation,
    rationale: ["P3 variation envelope 전수 검증입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}

describe("P2 구조 적합성", () => {
  it("동치분수와 10 만들기를 같은 frozen core로 재현·컴파일·검증한다", () => {
    const cases = [
      {
        blueprint: equivalentFractionBlueprint,
        definition: equivalentFractionTemplateDefinition,
        support: "released",
        plan: () =>
          generateEquivalentFractionActivity(
            recommendation(
              equivalentFractionBlueprint,
              "equivalent-fraction-strip-match",
              5
            ),
            {
              seed: "p2-equivalent-seed",
              generatedAt: "2026-07-30T00:00:00.000Z",
              activityId: "p2-equivalent"
            }
          )
      },
      {
        blueprint: makeTenNumberCardsBlueprint,
        definition: makeTenNumberCardsTemplateDefinition,
        support: "released",
        plan: () =>
          generateMakeTenNumberCardsActivity(
            recommendation(
              makeTenNumberCardsBlueprint,
              "number-card-make-ten-drag",
              2
            ),
            {
              seed: "p2-make-ten-seed",
              generatedAt: "2026-07-30T00:00:00.000Z",
              activityId: "p2-make-ten"
            }
          )
      }
    ] as const;

    for (const entry of cases) {
      expect(entry.definition).toMatchObject({
        id: entry.blueprint.id,
        version: entry.blueprint.version,
        supportedStandards: [
          entry.blueprint.curriculumBinding.standardCode
        ]
      });
      const first = resolveActivity(entry.plan());
      const second = resolveActivity(entry.plan());
      expect(sha256Hex(first)).toBe(sha256Hex(second));
      expect(
        first.constraints.every(
          (constraint) =>
            constraint.requiresStudentAction &&
            !constraint.satisfiedInitially
        )
      ).toBe(true);
      const compiled = compileActivity(first);
      expect(
        validateForCreation(
          first,
          compiled,
          new Date("2026-07-30T00:01:00.000Z")
        )
      ).toMatchObject({ canCreate: true, issues: [] });
      const approvalView = projectRegisteredApprovalView(first);
      const approvedAt = new Date("2026-07-30T00:01:00.000Z");
      const receipt = createApprovalReceipt(
        approvalView,
        approvedAt,
        new Date("2026-07-30T00:11:00.000Z")
      );
      expect(
        verifyApprovalReceipt(approvalView, receipt, approvedAt)
      ).toBe(true);
      expect(buildRegisteredTeacherAnswerKey(first)).toHaveLength(4);
      expect(getRegisteredActivitySupportState(entry.blueprint.id)).toBe(
        entry.support
      );
    }

    const equivalent = resolveActivity(cases[0].plan());
    expect(
      equivalent.items.every((item) => {
        const left = item.values.left as {
          numerator: number;
          denominator: number;
        };
        const right = item.values.right as {
          numerator: number;
          denominator: number;
        };
        return (
          left.numerator * right.denominator ===
          right.numerator * left.denominator
        );
      })
    ).toBe(true);
    for (let seed = 0; seed < 20; seed += 1) {
      const items = generateEquivalentFractionItems(
        { difficulty: "normal", problemCount: 4 },
        `p2-diversity-${seed}`
      );
      const directions = new Set(
        items.map((item) => {
          const left = item.values.left as {
            denominator: number;
          };
          const right = item.values.right as {
            denominator: number;
          };
          return right.denominator > left.denominator
            ? "expand"
            : "reduce";
        })
      );
      const factors = new Set(
        items.map((item) => {
          const left = item.values.left as {
            denominator: number;
          };
          const right = item.values.right as {
            denominator: number;
          };
          return (
            Math.max(left.denominator, right.denominator) /
            Math.min(left.denominator, right.denominator)
          );
        })
      );
      expect(directions).toEqual(new Set(["expand", "reduce"]));
      expect(factors.has(3)).toBe(true);
    }
    const invalidEquivalent = structuredClone(equivalent);
    (
      invalidEquivalent.items[0]!.values.right as {
        numerator: number;
      }
    ).numerator += 1;
    expect(
      validateForCreation(
        invalidEquivalent,
        compileActivity(invalidEquivalent)
      ).issues.map((issue) => issue.code)
    ).toContain("ratios-not-equivalent");

    const repeatedEquivalent = structuredClone(equivalent);
    repeatedEquivalent.items[1]!.values = structuredClone(
      repeatedEquivalent.items[0]!.values
    );
    expect(
      validateForCreation(
        repeatedEquivalent,
        compileActivity(repeatedEquivalent)
      ).issues.map((issue) => issue.code)
    ).toContain("duplicate-fraction-comparison");

    const unvariedEquivalent = structuredClone(equivalent);
    unvariedEquivalent.items[0]!.values.right = structuredClone(
      unvariedEquivalent.items[0]!.values.left
    );
    expect(
      validateForCreation(
        unvariedEquivalent,
        compileActivity(unvariedEquivalent)
      ).issues.map((issue) => issue.code)
    ).toContain("ratio-representation-not-varied");

    const outOfRangeEquivalent = structuredClone(equivalent);
    outOfRangeEquivalent.items[0]!.values.left = {
      numerator: 3,
      denominator: 3
    };
    const outOfRangeLeftStrip = outOfRangeEquivalent.emissions.find(
      (emission) =>
        emission.itemId === outOfRangeEquivalent.items[0]!.id &&
        emission.role === "reference-strip"
    )!;
    outOfRangeLeftStrip.toolIntent.properties.fraction = {
      numerator: 3,
      denominator: 3
    };
    expect(
      validateForCreation(
        outOfRangeEquivalent,
        compileActivity(outOfRangeEquivalent)
      ).issues.map((issue) => issue.code)
    ).toContain("proper-range-violated");

    const makeTen = resolveActivity(cases[1].plan());
    expect(
      makeTen.items.every(
        (item) => {
          const solutions = item.values.solutions as Array<
            [number, number]
          >;
          return (
            solutions.length === 2 &&
            solutions.every(
              ([left, right]) => left + right === 10
            ) &&
            (item.values.surplusPieces as number[]).length === 2
          );
        }
      )
    ).toBe(true);
    expect(
      compileActivity(makeTen).payload.contentsJson.filter((object) =>
        String(object.svgId).startsWith("NO04NT-")
      )
    ).toHaveLength(24);
    const invalidMakeTen = structuredClone(makeTen);
    invalidMakeTen.items[0]!.values.solutions = [[1, 1]];
    expect(
      validateForCreation(
        invalidMakeTen,
        compileActivity(invalidMakeTen)
      ).issues.map((issue) => issue.code)
    ).toContain("construction-solution-invalid");

    const discreteMismatch = structuredClone(makeTen);
    const mismatchedCard = discreteMismatch.emissions.find(
      (emission) => emission.role === "piece-card-1"
    )!;
    mismatchedCard.toolIntent.properties.value =
      Number(mismatchedCard.toolIntent.properties.value) === 9 ? 8 : 9;
    expect(
      validateForCreation(
        discreteMismatch,
        compileActivity(discreteMismatch)
      ).issues.map((issue) => issue.code)
    ).toContain("visual-discrete-value-mismatch");

    const missingNearMiss = structuredClone(makeTen);
    missingNearMiss.items[0]!.values.nearMissCombinations = [];
    expect(
      validateForCreation(
        missingNearMiss,
        compileActivity(missingNearMiss)
      ).issues.map((issue) => issue.code)
    ).toContain("near-miss-combination-missing");

    const nativeMismatch = structuredClone(compileActivity(makeTen));
    const nativeCard = nativeMismatch.payload.contentsJson.find((object) =>
      String(object.svgId).startsWith("NO04NT-")
    )!;
    nativeCard.svgId =
      nativeCard.svgId === "NO04NT-01" ? "NO04NT-02" : "NO04NT-01";
    nativeMismatch.payloadHash = sha256Hex(nativeMismatch.payload);
    expect(
      validateForCreation(makeTen, nativeMismatch).issues.map(
        (issue) => issue.code
      )
    ).toContain("native-number-card-mismatch");

    const targetGeometryMismatch = structuredClone(makeTen);
    targetGeometryMismatch.emissions.find(
      (emission) => emission.role === "left-slot"
    )!.bounds.width = 70;
    expect(
      validateForCreation(
        targetGeometryMismatch,
        compileActivity(targetGeometryMismatch)
      ).issues.map((issue) => issue.code)
    ).toContain("native-number-card-target-geometry-mismatch");

    let envelopeRunCount = 0;
    for (const blueprint of listRegisteredBlueprints()) {
      for (const variation of enumerateRegisteredVariationEnvelope(
        blueprint.id
      )) {
        const plan =
          prepareRegisteredActivityForEnvelopeValidation(
            envelopeRecommendation(blueprint, variation),
            {
              seed:
                `p3-envelope-${blueprint.id}-` +
                JSON.stringify(variation),
              generatedAt: "2026-07-30T00:00:00.000Z",
              activityId: `p3-envelope-${envelopeRunCount + 1}`
            }
          );
        expect(plan.options.variation).toEqual(variation);
        const resolved = resolveActivity(plan);
        const compiled = compileActivity(resolved);
        expect(
          validateForCreation(
            resolved,
            compiled,
            new Date("2026-07-30T00:01:00.000Z")
          )
        ).toMatchObject({ canCreate: true, issues: [] });
        expect(
          resolved.constraints.some(
            (constraint) =>
              constraint.requiresStudentAction &&
              !constraint.satisfiedInitially
          )
        ).toBe(true);
        expect(
          resolved.emissions.every((emission) => {
            const role = blueprint.toolRoles.find(
              (candidate) => candidate.role === emission.role
            );
            return (
              role?.locked === emission.locked &&
              role.movable === emission.movable &&
              emission.bounds.x >= 0 &&
              emission.bounds.y >= 0 &&
              emission.bounds.x + emission.bounds.width <=
                resolved.layout.width &&
              emission.bounds.y + emission.bounds.height <=
                resolved.layout.height
            );
          })
        ).toBe(true);
        const approvalView =
          projectRegisteredApprovalView(resolved);
        const receipt = createApprovalReceipt(
          approvalView,
          new Date("2026-07-30T00:01:00.000Z"),
          new Date("2026-07-30T00:11:00.000Z")
        );
        expect(
          verifyApprovalReceipt(
            approvalView,
            receipt,
            new Date("2026-07-30T00:01:00.000Z")
          )
        ).toBe(true);
        expect(buildRegisteredTeacherAnswerKey(resolved)).toHaveLength(
          variation.problemCount as number
        );
        envelopeRunCount += 1;
      }
    }
    expect(envelopeRunCount).toBe(89);
  }, 10_000);
});
