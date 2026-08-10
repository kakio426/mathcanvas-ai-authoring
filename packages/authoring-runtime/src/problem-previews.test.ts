import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex,
  type ActivityBlueprint,
  type Recommendation
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import { resolveActivity } from "@mathcanvas/compiler";
import {
  buildRegisteredTeacherAnswerKey,
  enumerateRegisteredVariationEnvelope,
  getRegisteredActivitySupportState,
  listRegisteredBlueprints,
  prepareRegisteredActivity
} from "@mathcanvas/templates";
import { projectProblemPreviews } from "./service.js";

const releasedControls: Readonly<
  Record<
    string,
    {
      manipulation: NonNullable<Recommendation["manipulation"]>;
      grade: number;
    }
  >
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
    manipulation: "unlike-denominator-common-unit-difference-drag",
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
  },
  "number.division.quotient-remainder.claim-evidence-v1": {
    manipulation: "claim-evidence-revision-drag",
    grade: 3
  },
  "measure.angle.turn-size.claim-evidence-v1": {
    manipulation: "claim-evidence-revision-drag",
    grade: 4
  },
  "geometry.triangle.classification.claim-evidence-v1": {
    manipulation: "claim-evidence-revision-drag",
    grade: 4
  },
  "geometry.symmetry.equal-distance.claim-evidence-v1": {
    manipulation: "claim-evidence-revision-drag",
    grade: 5
  }
};

function releasedRecommendation(
  blueprint: ActivityBlueprint,
  variation: Readonly<Record<string, unknown>>
): Recommendation {
  const control = releasedControls[blueprint.id];
  if (!control) {
    throw new Error(`honest-preview-control-missing:${blueprint.id}`);
  }
  const curriculum = resolveCurriculum(
    blueprint.curriculumBinding.standardCode
  );
  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `honest-preview-${blueprint.id}`,
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
      ? { denominatorRelation: variation.denominatorRelation }
      : {}),
    manipulation: control.manipulation,
    rationale: ["정직한 미리보기 전수 검증입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}

describe("문항 미리보기 프로젝션", () => {
  it("released 21종 모두 문항·정답 수를 맞추고 fallback 유형을 명시한다", () => {
    const releasedBlueprints = listRegisteredBlueprints().filter(
      (blueprint) =>
        getRegisteredActivitySupportState(blueprint.id) === "released"
    );
    expect(releasedBlueprints).toHaveLength(21);

    const fallbackBlueprintIds: string[] = [];
    for (const blueprint of releasedBlueprints) {
      const variation = enumerateRegisteredVariationEnvelope(blueprint.id)[0];
      expect(variation).toBeDefined();
      const resolved = resolveActivity(
        prepareRegisteredActivity(
          releasedRecommendation(blueprint, variation!),
          {
            seed: `honest-preview-${blueprint.id}`,
            generatedAt: "2026-08-10T00:00:00.000Z",
            activityId: `honest-preview-${blueprint.id}`
          }
        )
      );
      const beforeProjectionHash = sha256Hex(resolved);
      const answerKey = buildRegisteredTeacherAnswerKey(resolved);
      const previews = projectProblemPreviews(resolved, answerKey);

      expect(previews, blueprint.id).toHaveLength(resolved.items.length);
      expect(answerKey, blueprint.id).toHaveLength(resolved.items.length);
      expect(
        previews.map((preview) => preview.problemNumber),
        blueprint.id
      ).toEqual(
        [...resolved.items]
          .sort((left, right) => left.order - right.order)
          .map((item) => item.order)
      );
      expect(
        previews.every((preview) =>
          preview.statements.every((statement) => statement.length > 0)
        ),
        blueprint.id
      ).toBe(true);
      expect(sha256Hex(resolved), blueprint.id).toBe(beforeProjectionHash);
      if (
        previews.some(
          (preview) => preview.statementSource === "answer-explanation"
        )
      ) {
        fallbackBlueprintIds.push(blueprint.id);
      }
    }

    expect(fallbackBlueprintIds).toEqual([
      "measure.angle.turn-size.claim-evidence-v1",
      "geometry.triangle.classification.claim-evidence-v1",
      "geometry.symmetry.equal-distance.claim-evidence-v1",
      "fraction.equivalent.same-whole.visual-v1",
      "number.make-10.cards-v1",
      "relation.equal-sign.balanced-equation.cards-v1",
      "relation.equal-sign.balance-scale.sum-card-v1",
      "measure.time.clock.hour-hand-boundary-v1",
      "measure.time.elapsed.clock-pair-v1",
      "fraction.add.same-denominator.strips-v1",
      "fraction.add.same-denominator.improper-sum-v1",
      "fraction.add.unlike-denominators.common-unit-v1",
      "fraction.subtract.unlike-denominators.common-unit-v1",
      "data.bar-graph.scale-unit.read-v1",
      "measure.length.unit-iteration.ruler-v1",
      "number.place-value.regroup-ten-bundles-v1",
      "pattern.repeat-unit.pattern-blocks-v1",
      "probability.compare.bag-ratios-v1"
    ]);
  });
});
