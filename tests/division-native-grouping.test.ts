import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex,
  type CompiledProject
} from "@mathcanvas/contracts";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  assertCognitiveManifestBound,
  findClaimEvidenceBlueprint,
  generateClaimEvidenceActivity
} from "@mathcanvas/templates";
import { compileActivity, resolveActivity } from "@mathcanvas/compiler";
import { validateForCreation } from "@mathcanvas/validator";

const generatedAt = "2026-08-08T00:00:00.000Z";
const blueprint = findClaimEvidenceBlueprint(
  "number.division.quotient-remainder.claim-evidence-v1"
)!;
const curriculum = resolveCurriculum("[4수01-06]");
const recommendation = recommendationSchema.parse({
  schemaVersion: CONTRACT_SCHEMA_VERSION,
  requestId: "division-native-integration",
  supported: true,
  templateId: blueprint.id,
  gradeBand: curriculum.record.gradeBand,
  recommendedGrade: 3,
  standardCode: curriculum.record.code,
  learningGoal: blueprint.learningObjective,
  prerequisites: curriculum.record.prerequisites,
  problemCount: 1,
  difficulty: "normal",
  manipulation: "claim-evidence-revision-drag",
  rationale: ["네이티브 모형으로 몫과 나머지의 뜻을 확인합니다."],
  confidence: 0.99,
  caveats: curriculum.warnings,
  blockingReasons: [],
  curriculum: curriculum.record
});

function compileScenario(seed: string) {
  const plan = generateClaimEvidenceActivity(recommendation, {
    seed,
    generatedAt
  });
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  return { plan, resolved, compiled };
}

function rehash(compiled: CompiledProject): CompiledProject {
  return {
    ...compiled,
    payloadHash: sha256Hex(compiled.payload)
  };
}

describe("몫과 나머지 네이티브 묶기 활동", () => {
  it.each([
    ["division-scenario-7", 23, 4],
    ["division-scenario-0", 29, 7],
    ["division-scenario-4", 31, 6]
  ] as const)(
    "%s: %i개를 %i개씩 묶는 실제 compiler payload가 중립적인 5열 모형 풀을 만든다",
    (seed, expectedTotal, expectedGroupSize) => {
      assertCognitiveManifestBound(blueprint);
      const first = compileScenario(seed);
      const second = compileScenario(seed);
      expect(first.compiled.payload).toEqual(second.compiled.payload);
      expect(first.plan.items).toHaveLength(1);
      expect(first.plan.items[0]!.values).toMatchObject({
        countableTotal: expectedTotal,
        countableGroupSize: expectedGroupSize
      });

      const pool = first.resolved.emissions.find(
        (emission) => emission.role === "counting-model-pool"
      )!;
      expect(pool.toolIntent).toMatchObject({
        kind: "counting-model",
        toolKey: "NO01SC",
        spatialContractId: "division-grouping-no01sc-01-composition-v1",
        spatialContractVersion: "1.0.0"
      });
      const units = first.compiled.payload.contentsJson.filter(
        (object) => object.svgId === "NO01SC-01"
      );
      expect(units).toHaveLength(expectedTotal);
      expect(units.map((unit) => unit.id)).toEqual(
        Array.from(
          { length: expectedTotal },
          (_, index) =>
            `${pool.id}-unit-${String(index + 1).padStart(2, "0")}`
        )
      );
      const rowCounts = [
        ...units
          .reduce((rows, unit) => {
            const key = String(unit.y);
            rows.set(key, (rows.get(key) ?? 0) + 1);
            return rows;
          }, new Map<string, number>())
          .values()
      ];
      expect(Math.max(...rowCounts)).toBe(5);
      expect(rowCounts.slice(0, -1).every((count) => count === 5)).toBe(
        true
      );
      expect(expectedGroupSize).not.toBe(5);
      expect(
        units.every(
          (unit) =>
            unit.isGroup === false &&
            unit.groupId === "" &&
            unit.isGroupElement === false &&
            typeof unit.x === "number" &&
            typeof unit.y === "number" &&
            unit.x - 42 >= pool.bounds.x &&
            unit.x + 42 <= pool.bounds.x + pool.bounds.width &&
            unit.y - 42 >= pool.bounds.y &&
            unit.y + 42 <= pool.bounds.y + pool.bounds.height
        )
      ).toBe(true);
      const locked = new Set(
        first.compiled.payload.canvasOption.lockIds.flat()
      );
      expect(units.some((unit) => locked.has(String(unit.id)))).toBe(false);
      expect(
        first.compiled.payload.canvasOption.moduleArr.Unit01?.NO01SC
      ).toBe(true);
      const report = validateForCreation(
        first.resolved,
        first.compiled,
        new Date(generatedAt)
      );
      expect(report.canCreate).toBe(true);
      expect(report.issues).toEqual([]);
    }
  );

  it("다중 네이티브 fragment의 누락·순서 변조·부분 잠금을 검증기가 차단한다", () => {
    const { resolved, compiled } = compileScenario("division-scenario-7");
    const firstUnit = compiled.payload.contentsJson.find(
      (object) => object.svgId === "NO01SC-01"
    )!;

    const missing = structuredClone(compiled);
    missing.payload.contentsJson = missing.payload.contentsJson.filter(
      (object) => object.id !== firstUnit.id
    );
    const missingCodes = validateForCreation(
      resolved,
      rehash(missing),
      new Date(generatedAt)
    ).issues.map((issue) => issue.code);
    expect(missingCodes).toContain("movable-object-missing");
    expect(missingCodes).toContain("native-counting-model-mismatch");

    const reordered = structuredClone(compiled);
    const reorderedUnit = reordered.payload.contentsJson.find(
      (object) => object.id === firstUnit.id
    )!;
    reorderedUnit.order = 99;
    expect(
      validateForCreation(
        resolved,
        rehash(reordered),
        new Date(generatedAt)
      ).issues.map((issue) => issue.code)
    ).toContain("native-counting-model-mismatch");

    const partiallyLocked = structuredClone(compiled);
    partiallyLocked.payload.canvasOption.lockIds.push([
      String(firstUnit.id)
    ]);
    expect(
      validateForCreation(
        resolved,
        rehash(partiallyLocked),
        new Date(generatedAt)
      ).issues.map((issue) => issue.code)
    ).toContain("movable-object-locked");
  });
});
