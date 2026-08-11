import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  compileActivity,
  getLayoutPreset,
  resolveActivity
} from "@mathcanvas/compiler";
import {
  enumerateRegisteredVariationEnvelope,
  listProblemFamilyManifests,
  listRegisteredBlueprints,
  prepareRegisteredActivityForEnvelopeValidation
} from "@mathcanvas/templates";

interface BaselineRow {
  familyId: string;
  blueprintContentHash: string;
  layoutPresetContentHash: string;
  payloadHash: string;
}

const fixture = JSON.parse(
  readFileSync(
    resolve(
      import.meta.dirname,
      "../fixtures/golden/problem-family-released-v1.json"
    ),
    "utf8"
  )
) as {
  generatedAt: string;
  releasedFamilyCount: number;
  rows: BaselineRow[];
};

function recommendedGrade(standardCode: string): number {
  if (standardCode.startsWith("[2수")) return 2;
  if (standardCode === "[4수01-06]") return 3;
  if (standardCode.startsWith("[4수")) return 4;
  if (standardCode === "[6수04-04]") return 6;
  return 5;
}

describe("Phase 1 released family hash 기준선", () => {
  it("21개 legacy adapter의 blueprint·layout·payload hash가 이관 전과 같다", () => {
    const manifests = listProblemFamilyManifests().filter(
      (manifest) => manifest.releaseEvidence.supportState === "released"
    );
    const blueprints = new Map(
      listRegisteredBlueprints().map((blueprint) => [blueprint.id, blueprint])
    );
    const actual: BaselineRow[] = manifests.map((manifest) => {
      const blueprint = blueprints.get(manifest.familyId);
      if (!blueprint) {
        throw new Error(`baseline-blueprint-missing:${manifest.familyId}`);
      }
      const variation = enumerateRegisteredVariationEnvelope(
        manifest.familyId
      )[0]!;
      const curriculum = resolveCurriculum(
        blueprint.curriculumBinding.standardCode
      );
      const recommendation = recommendationSchema.parse({
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        requestId: `phase1-baseline-${manifest.familyId}`,
        supported: true,
        templateId: manifest.familyId,
        gradeBand: curriculum.record.gradeBand,
        recommendedGrade: recommendedGrade(curriculum.record.code),
        standardCode: curriculum.record.code,
        learningGoal: blueprint.learningObjective,
        prerequisites: curriculum.record.prerequisites,
        problemCount: variation.problemCount,
        difficulty: variation.difficulty,
        ...(variation.denominatorRelation
          ? { denominatorRelation: variation.denominatorRelation }
          : {}),
        manipulation: manifest.manipulation,
        rationale: ["Phase 1 legacy adapter hash baseline."],
        confidence: 0.98,
        caveats: curriculum.warnings,
        blockingReasons: [],
        curriculum: curriculum.record
      });
      const plan = prepareRegisteredActivityForEnvelopeValidation(
        recommendation,
        {
          seed: `phase1-baseline-${manifest.familyId}`,
          generatedAt: fixture.generatedAt,
          activityId: `phase1-baseline-${manifest.familyId}`
        }
      );
      const compiled = compileActivity(resolveActivity(plan));
      return {
        familyId: manifest.familyId,
        blueprintContentHash: blueprint.contentHash,
        layoutPresetContentHash: sha256Hex(
          getLayoutPreset(blueprint.layout.tokenSet)
        ),
        payloadHash: compiled.payloadHash
      };
    });

    expect(manifests).toHaveLength(fixture.releasedFamilyCount);
    expect(actual).toEqual(fixture.rows);
  });
});
