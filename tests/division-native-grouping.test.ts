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
import {
  analyzeCountingModelStructure,
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
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
    "%s: %i개를 %i개씩 묶는 실제 compiler payload가 중립적인 max-8 brick pool을 만든다",
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
        spatialContractId: "division-grouping-no01sc-01-composition-v2",
        spatialContractVersion: "2.0.0"
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
      expect(Math.max(...rowCounts)).toBe(8);
      expect(rowCounts).toEqual(
        [8, 7, 8, 8].reduce<readonly number[]>(
          (rows, capacity) => {
            const used = rows.reduce((sum, value) => sum + value, 0);
            return used >= expectedTotal
              ? rows
              : [...rows, Math.min(capacity, expectedTotal - used)];
          },
          []
        )
      );
      expect(expectedGroupSize).not.toBe(8);
      const positions = units.map((unit) => {
        if (typeof unit.x !== "number" || typeof unit.y !== "number") {
          throw new Error("counting-model-test-position-missing");
        }
        return { x: unit.x, y: unit.y };
      });
      const structure = analyzeCountingModelStructure(positions, {
        groupSize: expectedGroupSize,
        quotient: Math.floor(expectedTotal / expectedGroupSize),
        supportedGroupSizes: [4, 6, 7]
      });
      expect(structure.maximumUnitsPerRow).toBe(8);
      expect(structure.distinctColumnCount).toBeGreaterThan(rowCounts.length);
      expect(
        structure.completeRowOccupanciesMatchingSupportedGroupSize
      ).toEqual([]);
      expect(structure.answerStructureLeaked).toBe(false);
      expect(structure.transposedRectangleMatchingDivision).toBe(false);
      const xByRow = positions.reduce((rows, unit) => {
        const xs = rows.get(unit.y) ?? [];
        xs.push(unit.x);
        rows.set(unit.y, xs);
        return rows;
      }, new Map<number, number[]>());
      const xRows = [...xByRow.values()];
      const firstRowX = xRows[0]?.[0];
      const secondRowX = xRows[1]?.[0];
      if (firstRowX === undefined || secondRowX === undefined) {
        throw new Error("counting-model-test-row-missing");
      }
      expect(secondRowX - firstRowX).toBe(42);
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
      expect(report.issues).toEqual([]);
      expect(report.canCreate).toBe(true);

      const verifyInstruction = first.resolved.emissions.find(
        (emission) => emission.role === "instruction-verify"
      );
      expect(verifyInstruction?.itemId).toBe("division-remainder-1");
      expect(verifyInstruction?.toolIntent.properties.text).toBe(
        `② 모형을 ${expectedGroupSize}개씩 옮겨 가까이 놓고, ${expectedGroupSize}개를 골라 ‘그룹’을 누르세요.`
      );
      const explanation = first.resolved.emissions.find(
        (emission) => emission.role === "explanation-label"
      );
      expect(explanation?.toolIntent.properties.text).toBe("식과 까닭 쓰기");
      expect(
        first.resolved.emissions.find(
          (emission) => emission.role === "pool-label"
        )?.toolIntent.properties.text
      ).toBe("예상한 답 고르기");
      expect(
        first.resolved.emissions.find(
          (emission) => emission.role === "source-label"
        )?.toolIntent.properties.text
      ).toBe("묶기 전 모형");
      expect(
        first.resolved.emissions.find(
          (emission) => emission.role === "group-lane-label"
        )?.toolIntent.properties.text
      ).toBe(`${expectedGroupSize}개씩 묶은 모형`);
      const instructions = [
        "instruction-predict",
        "instruction-verify",
        "instruction-explain"
      ].map(
        (role) =>
          first.resolved.emissions.find(
            (emission) => emission.role === role
          )!
      );
      expect(
        instructions.map((instruction) => instruction.bounds.height)
      ).toEqual([53, 53, 53]);
      expect(
        instructions.slice(1).map(
          (instruction, index) =>
            instruction.bounds.y -
            (instructions[index]!.bounds.y +
              instructions[index]!.bounds.height)
        )
      ).toEqual([23, 23]);
      const question = first.resolved.emissions.find(
        (emission) => emission.role === "question"
      )!;
      expect(question.toolIntent.properties.fontSize).toBe(52);
      expect(question.bounds.height).toBe(86);
      expect(
        question.bounds.y -
          (instructions[2]!.bounds.y + instructions[2]!.bounds.height)
      ).toBe(32);
      const firstChoice = first.resolved.emissions.find(
        (emission) => emission.role === "position-card-1"
      )!;
      const firstBackdrop = first.resolved.emissions.find(
        (emission) => emission.role === "position-card-1-backdrop"
      )!;
      expect(firstChoice.toolIntent.properties).toMatchObject({
        fontSize: 32,
        centerInPlacement: true
      });
      expect(firstChoice.bounds.height).toBe(56);
      expect(firstBackdrop.bounds.height).toBe(70);
      expect(
        firstChoice.bounds.y - firstBackdrop.bounds.y
      ).toBe(7);
      expect(
        firstBackdrop.bounds.y + firstBackdrop.bounds.height -
          (firstChoice.bounds.y + firstChoice.bounds.height)
      ).toBe(7);
      expect(first.resolved.emissions).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: expect.stringMatching(/^group-slot-/) })
        ])
      );
    }
  );

  it("라벨의 컨테이너 여백이나 네이티브 선택 여유를 줄이면 생성 전에 막는다", () => {
    const { resolved } = compileScenario("division-scenario-7");
    const broken = structuredClone(resolved);
    const panel = broken.emissions.find(
      (emission) => emission.role === "choice-panel"
    )!;
    const label = broken.emissions.find(
      (emission) => emission.role === "pool-label"
    )!;
    label.bounds.y = panel.bounds.y + 2;
    const report = validateForCreation(
      broken,
      compileActivity(broken),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "text-clearance-insufficient" })
      ])
    );
    expect(report.canCreate).toBe(false);

    const sourceCollision = structuredClone(resolved);
    const sourceLabel = sourceCollision.emissions.find(
      (emission) => emission.role === "source-label"
    )!;
    const sourcePool = sourceCollision.emissions.find(
      (emission) => emission.role === "counting-model-pool"
    )!;
    sourcePool.bounds.y =
      sourceLabel.bounds.y + sourceLabel.bounds.height + 2;
    const sourceReport = validateForCreation(
      sourceCollision,
      compileActivity(sourceCollision),
      new Date(generatedAt)
    );
    expect(sourceReport.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "text-clearance-insufficient" })
      ])
    );
    expect(sourceReport.canCreate).toBe(false);

    const offCenterChoice = structuredClone(resolved);
    const firstChoice = offCenterChoice.emissions.find(
      (emission) => emission.role === "position-card-1"
    )!;
    firstChoice.bounds.x += 12;
    firstChoice.bounds.y += 8;
    const choiceReport = validateForCreation(
      offCenterChoice,
      compileActivity(offCenterChoice),
      new Date(generatedAt)
    );
    expect(choiceReport.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "text-clearance-insufficient" })
      ])
    );
    expect(choiceReport.canCreate).toBe(false);

    const unevenCardRow = structuredClone(resolved);
    const firstBackdrop = unevenCardRow.emissions.find(
      (emission) => emission.role === "position-card-1-backdrop"
    )!;
    firstBackdrop.bounds.x += 18;
    const cardRowReport = validateForCreation(
      unevenCardRow,
      compileActivity(unevenCardRow),
      new Date(generatedAt)
    );
    expect(cardRowReport.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "labeled-pool-row-invalid" })
      ])
    );
    expect(cardRowReport.canCreate).toBe(false);
  });

  it("의도적으로 제수 크기 행을 반복한 배치를 답 구조 유출로 판정한다", () => {
    const leaking = Array.from({ length: 23 }, (_, index) => ({
      x: (index % 4) * 84,
      y: Math.floor(index / 4) * 84
    }));
    expect(
      analyzeCountingModelStructure(leaking, {
        groupSize: 4,
        quotient: 5,
        supportedGroupSizes: [4, 6, 7]
      }).answerStructureLeaked
    ).toBe(true);

    const transposed = [5, 5, 5, 5, 3].flatMap((count, row) =>
      Array.from({ length: count }, (_, column) => ({
        x: column * 84 + (row % 2) * 28,
        y: row * 84
      }))
    );
    const transposedAnalysis = analyzeCountingModelStructure(transposed, {
      groupSize: 4,
      quotient: 5,
      supportedGroupSizes: [4, 6, 7]
    });
    expect(transposedAnalysis.transposedRectangleMatchingDivision).toBe(
      true
    );
    expect(transposedAnalysis.answerStructureLeaked).toBe(true);
  });

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
