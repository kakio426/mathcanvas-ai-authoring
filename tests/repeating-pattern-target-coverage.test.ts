import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACTIVITY_IDS,
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex,
  type Recommendation
} from "@mathcanvas/contracts";
import {
  REPEATING_PATTERN_ASSESSMENT_TARGET_IDS,
  findAssessmentTargetSet,
  resolveCurriculum
} from "@mathcanvas/curriculum";
import {
  compileActivity,
  getLayoutPreset,
  resolveActivity
} from "@mathcanvas/compiler";
import {
  assertCognitiveManifestBound,
  buildRegisteredProblemPreviews,
  buildRegisteredTeacherAnswerKey,
  enumerateRegisteredVariationEnvelope,
  getProblemFamilyManifest,
  prepareRegisteredActivity,
  repeatingPatternUnitBlueprint
} from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";

const generatedAt = "2026-08-11T08:40:00.000Z";

function recommendation(
  variation: Readonly<Record<string, unknown>>
): Recommendation {
  const curriculum = resolveCurriculum("[2수02-01]");
  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "repeating-pattern-target-coverage",
    supported: true,
    templateId: ACTIVITY_IDS.repeatingPatternUnit,
    gradeBand: "1-2",
    recommendedGrade: 2,
    standardCode: "[2수02-01]",
    learningGoal: repeatingPatternUnitBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: variation.problemCount,
    difficulty: variation.difficulty,
    manipulation: "pattern-block-repeat-unit-drag",
    rationale: ["규칙을 찾고 서로 다른 표현으로 연결합니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}

function resolveVariation(
  variation: Readonly<Record<string, unknown>>,
  seed: string
) {
  const plan = prepareRegisteredActivity(recommendation(variation), {
    seed,
    generatedAt,
    activityId: `repeating-pattern-target-${seed}`
  });
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  const report = validateForCreation(
    resolved,
    compiled,
    new Date(generatedAt)
  );
  return { resolved, compiled, report };
}

describe("[2수02-01] 반복 규칙 live target coverage", () => {
  it("reviewed target 두 개를 현재 해시의 released family와 canary에 결속한다", () => {
    const set = findAssessmentTargetSet("[2수02-01]");
    const manifest = getProblemFamilyManifest(
      ACTIVITY_IDS.repeatingPatternUnit
    );
    const canary = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          "research/mathcanvas/wave16-pattern-release-canary.json"
        ),
        "utf8"
      )
    ) as Record<string, unknown>;

    expect(set).toMatchObject({
      completeness: "reviewed-complete",
      targetIds: Object.values(REPEATING_PATTERN_ASSESSMENT_TARGET_IDS)
    });
    expect(manifest).toMatchObject({
      assessmentTargetIds: Object.values(
        REPEATING_PATTERN_ASSESSMENT_TARGET_IDS
      ),
      releaseEvidence: {
        supportState: "released",
        lifecycleStage: "live-released"
      }
    });
    expect(canary).toMatchObject({
      status: "pass",
      blueprintId: ACTIVITY_IDS.repeatingPatternUnit,
      blueprintContentHash: repeatingPatternUnitBlueprint.contentHash,
      createRequestCount: 1,
      existingProjectWriteCount: 0,
      reusedExisting: false
    });
    expect(canary.layoutPresetContentHash).toBe(
      sha256Hex(
        getLayoutPreset(
          repeatingPatternUnitBlueprint.layout.tokenSet
        )
      )
    );
    expect(canary.reopenShape).toMatchObject({
      explanationBoxCount: 2,
      predictionBoxCount: 2,
      sourceRoleCount: 2,
      targetRoleCount: 2
    });
    expect(
      assertCognitiveManifestBound(repeatingPatternUnitBlueprint)
    ).toMatchObject({
      mathematicalDecision: expect.stringContaining("가장 짧게"),
      verification: {
        invariant: expect.stringContaining("순서가 끊기지 않고")
      }
    });
  });

  it("2·3문항 envelope를 결정적으로 컴파일하고 실제 무늬 미리보기까지 제공한다", () => {
    const variations = enumerateRegisteredVariationEnvelope(
      ACTIVITY_IDS.repeatingPatternUnit
    );
    expect(variations).toHaveLength(2);

    for (const [index, variation] of variations.entries()) {
      const seed = `repeating-pattern-envelope-${index + 1}`;
      const problemCount = variation.problemCount;
      if (typeof problemCount !== "number") {
        throw new Error("repeating-pattern-variation-problem-count-invalid");
      }
      const first = resolveVariation(variation, seed);
      const second = resolveVariation(variation, seed);
      expect(first.report.issues, JSON.stringify(variation)).toEqual([]);
      expect(first.report.canCreate).toBe(true);
      expect(first.resolved.items).toHaveLength(problemCount);
      expect(first.resolved.items).toEqual(second.resolved.items);
      expect(first.compiled.payloadHash).toBe(second.compiled.payloadHash);

      const beforeProjectionHash = sha256Hex(first.resolved);
      const previews = buildRegisteredProblemPreviews(first.resolved);
      const answers = buildRegisteredTeacherAnswerKey(first.resolved);
      expect(previews).toHaveLength(first.resolved.items.length);
      expect(answers).toHaveLength(first.resolved.items.length);
      expect(previews?.[0]?.statements).toEqual([
        "되풀이되는 가장 짧은 무늬는 몇 조각인가요?",
        expect.stringMatching(/^주어진 무늬: (.+ → ){5}.+$/),
        expect.stringContaining("이어 놓을 조각:"),
        expect.stringContaining("고를 수 있는 조각 수:")
      ]);
      expect(answers[0]).toMatchObject({
        answer: "3조각",
        explanation: expect.stringContaining("가장 짧은 반복 단위는 3조각")
      });
      expect(sha256Hex(first.resolved)).toBe(beforeProjectionHash);

      for (const item of first.resolved.items) {
        const sequence = Array.from(
          { length: 6 },
          (_, sequenceIndex) =>
            item.values[`sequenceVariant${sequenceIndex + 1}`]
        );
        const choices = Array.from(
          { length: 5 },
          (_, choiceIndex) =>
            item.values[`candidate${choiceIndex + 1}`]
        );
        const pieces = Array.from(
          { length: 5 },
          (_, pieceIndex) =>
            item.values[`completionVariant${pieceIndex + 1}`]
        );
        expect(sequence.slice(0, 3)).toEqual(sequence.slice(3));
        expect(new Set(choices)).toEqual(
          new Set(["1", "2", "3", "4", "5"])
        );
        expect(pieces).toEqual(
          expect.arrayContaining([
            sequence[0],
            sequence[1],
            1,
            3
          ])
        );
      }
    }
  });
});
