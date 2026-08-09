import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  parseActivityBlueprint,
  recommendationSchema
} from "@mathcanvas/contracts";
import { recommendActivity } from "@mathcanvas/planner";
import {
  FRACTION_PAIR_VARIATION_CAPACITY_CELLS,
  VISUAL_DIFFERENCE_BANDS,
  equivalentFractionBlueprint,
  fractionComparisonBlueprint,
  findClaimEvidenceBlueprint,
  CLAIM_EVIDENCE_NATIVE_GROUPING_GENERATOR_VERSION,
  generateClaimEvidenceItems,
  generateFractionComparisonActivity,
  generateMultiplicationArrayMeaningItems,
  makeTenNumberCardsBlueprint,
  resolveRegisteredVariation
} from "./index.js";

function recommendation(
  overrides: Record<string, unknown> = {}
) {
  const gated = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "template-request",
    prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
    createdAt: "2026-07-28T00:00:00.000Z",
    ...overrides
  });
  return recommendationSchema.parse({
    ...gated,
    supported: true,
    blockingReasons: []
  });
}

describe("분수 비교 템플릿", () => {
  it("몫과 나머지 활동은 그림판 점 대신 네이티브 수 세기 모형으로 예상-확인-수정하게 한다", () => {
    const blueprint = findClaimEvidenceBlueprint(
      "number.division.quotient-remainder.claim-evidence-v1"
    );
    expect(blueprint?.version).toBe("2.5.0");
    expect(blueprint?.generator.version).toBe(
      CLAIM_EVIDENCE_NATIVE_GROUPING_GENERATOR_VERSION
    );
    expect(blueprint?.variationDefaults.problemCount).toBe(1);
    expect(blueprint?.instructions).toEqual([
      expect.stringContaining("묶기 전에 답 카드 하나"),
      expect.stringContaining("한 묶음보다 적으면 오른쪽에 놓으세요"),
      expect.stringContaining("묶이지 않고 남은 것")
    ]);
    expect(
      blueprint?.toolRoles.find((role) => role.role === "counting-model-pool")
    ).toMatchObject({
      toolKey: "NO01SC",
      intentKind: "counting-model",
      spatialContractId: "division-grouping-no01sc-01-composition-v2",
      spatialContractVersion: "2.0.0",
      locked: false,
      movable: true,
      bindings: { count: "item.countableTotal" }
    });
    expect(
      blueprint?.toolRoles.some(
        (role) =>
          role.intentKind === "counting-model" || role.toolKey === "NO01SC"
      )
    ).toBe(true);
    expect(
      blueprint?.toolRoles.some(
        (role) => role.intentKind.includes("pen") || role.toolKey.includes("pen")
      )
    ).toBe(false);
    expect(blueprint?.toolRoles).toHaveLength(30);
    expect(blueprint?.layout.root.children).toHaveLength(30);
    expect(
      blueprint?.toolRoles.some((role) =>
        /^group-slot-\d+-(label|border)/.test(role.role)
      )
    ).toBe(false);
    for (const [role, binding] of [
      ["instruction-predict", "item.predictInstructionText"],
      ["instruction-verify", "item.verifyInstructionText"],
      ["instruction-explain", "item.explainInstructionText"]
    ] as const) {
      expect(
        blueprint?.toolRoles.find((candidate) => candidate.role === role)
      ).toMatchObject({
        scope: "each-item",
        bindings: { text: binding }
      });
    }

    const scenarios = [
      [
        "division-scenario-7",
        23,
        4,
        "연필",
        "자루",
        "묶음",
        "4자루씩 만든 묶음"
      ],
      [
        "division-scenario-0",
        29,
        7,
        "색종이",
        "장",
        "묶음",
        "7장씩 만든 묶음"
      ],
      [
        "division-scenario-4",
        31,
        6,
        "구슬",
        "개",
        "봉지",
        "6개씩 담은 봉지"
      ]
    ] as const;
    for (const [
      seed,
      expectedTotal,
      expectedGroupSize,
      objectName,
      counter,
      groupName,
      groupLaneLabel
    ] of scenarios) {
      const [item] = generateClaimEvidenceItems(
        {
          profileId: "division-remainder",
          difficulty: "normal",
          problemCount: 1
        },
        seed
      );
      expect(item).toBeDefined();
      expect(item!.values.countableTotal).toBe(expectedTotal);
      expect(item!.values.countableGroupSize).toBe(expectedGroupSize);
      expect(item!.values.groupLaneLabelText).toBe(groupLaneLabel);
      expect(item!.values.sourceLaneLabelText).toBe(
        `아직 묶지 않은 ${objectName}`
      );
      expect(item!.values.remainderLaneLabelText).toBe(`남은 ${objectName}`);
      const objectParticle = objectName === "색종이" ? "를" : "을";
      expect(item!.values.verifyInstructionText).toBe(
        `② ${objectName}${objectParticle} ${expectedGroupSize}${counter}씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. ${expectedGroupSize}${counter}보다 적으면 오른쪽에 놓으세요.`
      );
      expect(item!.values.explainInstructionText).toContain(
        `만든 ${groupName}${groupName === "봉지" ? "와" : "과"} 남은 ${objectName}${objectName === "색종이" ? "를" : "을"} 보고 식과 까닭을 쓰세요.`
      );
      expect(String(item!.values.evidenceText)).not.toContain("●");
      expect(item!.provenance.generatorVersion).toBe("1.6.0");
      const candidates = Array.from(
        { length: 5 },
        (_, index) => String(item!.values[`candidate${index + 1}`])
      );
      expect(
        candidates.filter(
          (candidate) => candidate === item!.values.correctValueText
        )
      ).toHaveLength(1);
      const remainderValues = candidates.map((candidate) =>
        Number(candidate.match(/,\s*(\d+)/)?.[1])
      );
      expect(
        remainderValues.some((remainder) => remainder >= expectedGroupSize)
      ).toBe(true);
    }
    expect(() =>
      generateClaimEvidenceItems(
        {
          profileId: "division-remainder",
          difficulty: "normal",
          problemCount: 2
        },
        "division-two-problems-forbidden"
      )
    ).toThrow(/1문항/);
  });

  it("blueprint의 절대 좌표, raw payload, 함수, 직접 정답을 거부한다", () => {
    const base = generateFractionComparisonActivity(
      recommendation(),
      {
        seed: "blueprint-negative",
        generatedAt: "2026-07-28T02:00:00.000Z"
      }
    ).blueprint;
    const cases: unknown[] = [];
    const absolute = structuredClone(base) as unknown as Record<
      string,
      unknown
    >;
    absolute.x = 10;
    cases.push(absolute);
    const raw = structuredClone(base) as unknown as Record<
      string,
      unknown
    >;
    raw.contentsJson = [];
    cases.push(raw);
    cases.push({
      ...base,
      variationDefaults: {
        ...base.variationDefaults,
        run: () => true
      }
    });
    const answered = structuredClone(base) as unknown as {
      generator: { parameters: Record<string, unknown> };
    };
    answered.generator.parameters.correctRelation = ">";
    cases.push(answered);
    cases.forEach((candidate) =>
      expect(() => parseActivityBlueprint(candidate)).toThrow(
        /blueprint-(key|function)-forbidden/
      )
    );
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        problemCount: 1
      })
    ).toThrow("variation-value-unsupported");
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        problemCount: 7
      })
    ).toThrow("variation-value-unsupported");
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        problemCount: 4,
        unknownKnob: true
      })
    ).toThrow("variation-key-unsupported");
    expect(() =>
      resolveRegisteredVariation(fractionComparisonBlueprint.id, {
        denominatorRelation: "random"
      })
    ).toThrow("variation-value-unsupported");
    expect(() =>
      resolveRegisteredVariation(equivalentFractionBlueprint.id, {
        problemCount: 4,
        difficulty: "hard"
      })
    ).toThrow("variation-pinned-override");
    expect(() =>
      resolveRegisteredVariation(equivalentFractionBlueprint.id, {
        denominatorRelation: "mixed"
      })
    ).toThrow("variation-key-unsupported");
    expect(() =>
      resolveRegisteredVariation(makeTenNumberCardsBlueprint.id, {
        problemCount: 6
      })
    ).toThrow("variation-value-unsupported");
  });

  it("고정 seed와 generator version에서 의미 문항과 provenance가 byte-stable하다", () => {
    const options = {
      seed: "generator-stability",
      generatedAt: "2026-07-28T02:00:00.000Z"
    };
    const first = generateFractionComparisonActivity(
      recommendation(),
      options
    );
    const second = generateFractionComparisonActivity(
      recommendation(),
      options
    );
    expect(first.items).toEqual(second.items);
    expect(
      new Set(
        first.items.map(
          (item) =>
            `${item.provenance.generatorId}:${item.provenance.generatorVersion}:${item.provenance.seed}`
        )
      ).size
    ).toBe(1);
    const multiplicationItems = generateMultiplicationArrayMeaningItems(
      { difficulty: "normal", problemCount: 3 },
      "classroom-korean-particles"
    );
    expect(
      multiplicationItems.map((item) => item.values.questionText)
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("연필이 3개씩"),
        expect.stringContaining("4봉지를"),
        expect.stringContaining("바둑돌이 6개씩"),
        expect.stringContaining("7줄을"),
        expect.stringContaining("붙임 딱지가 5개씩")
      ])
    );
    expect(
      multiplicationItems.map((item) => item.provenance.generatorVersion)
    ).toEqual(["1.2.0", "1.2.0", "1.2.0"]);
  });

  it.each(["easy", "normal", "hard"] as const)(
    "%s 난이도에서 정확한 서로 다른 분모 문제를 만든다",
    (difficulty) => {
      const plan = generateFractionComparisonActivity(
        recommendation({ difficulty }),
        {
          seed: `seed-${difficulty}`,
          generatedAt: "2026-07-28T02:00:00.000Z"
        }
      );
      expect(plan.items).toHaveLength(4);
      const comparisonKeys = plan.items.map((item) => {
        const left = item.values.left as {
          numerator: number;
          denominator: number;
        };
        const right = item.values.right as {
          numerator: number;
          denominator: number;
        };
        return (
        [
          `${left.numerator}/${left.denominator}`,
          `${right.numerator}/${right.denominator}`
        ]
          .sort()
          .join("|")
        );
      });
      expect(new Set(comparisonKeys).size).toBe(comparisonKeys.length);
      for (const item of plan.items) {
        const left = item.values.left as {
          numerator: number;
          denominator: number;
        };
        const right = item.values.right as {
          numerator: number;
          denominator: number;
        };
        expect(left.denominator).not.toBe(right.denominator);
        const relation =
          left.numerator * right.denominator >
          right.numerator * left.denominator
            ? ">"
            : "<";
        expect(item.values.correctRelation).toBe(relation);
        expect(
          Math.abs(
            left.numerator / left.denominator -
              right.numerator / right.denominator
          )
        ).toBeGreaterThanOrEqual(
          MIN_VISUAL_FRACTION_DIFFERENCE_RATIO
        );
      }
    }
  );

  it("같은 입력에서 같은 명세를 만든다", () => {
    const options = {
      seed: "same-seed",
      generatedAt: "2026-07-28T02:00:00.000Z"
    };
    expect(
      generateFractionComparisonActivity(recommendation(), options)
    ).toEqual(generateFractionComparisonActivity(recommendation(), options));
  });

  it("쉬움에서 어려움으로 갈수록 눈으로 구별할 길이 차이가 줄어든다", () => {
    expect(FRACTION_PAIR_VARIATION_CAPACITY_CELLS).toBe(9);
    expect(VISUAL_DIFFERENCE_BANDS.easy.min).toBeGreaterThan(
      VISUAL_DIFFERENCE_BANDS.normal.max
    );
    expect(VISUAL_DIFFERENCE_BANDS.normal.min).toBeGreaterThanOrEqual(
      VISUAL_DIFFERENCE_BANDS.hard.max
    );
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const plan = generateFractionComparisonActivity(
        recommendation({ difficulty, problemCount: 6 }),
        {
          seed: `difficulty-band-${difficulty}`,
          generatedAt: "2026-07-28T02:00:00.000Z"
        }
      );
      for (const item of plan.items) {
        const left = item.values.left as {
          numerator: number;
          denominator: number;
        };
        const right = item.values.right as {
          numerator: number;
          denominator: number;
        };
        const difference = Math.abs(
          left.numerator / left.denominator -
            right.numerator / right.denominator
        );
        expect(difference).toBeGreaterThanOrEqual(
          VISUAL_DIFFERENCE_BANDS[difficulty].min
        );
        expect(difference).toBeLessThanOrEqual(
          VISUAL_DIFFERENCE_BANDS[difficulty].max
        );
      }
    }
  });

  it("문제마다 같은 전체와 실제 수학 판단이 있는 조작을 만든다", () => {
    const plan = generateFractionComparisonActivity(recommendation(), {
      seed: "visual-seed",
      generatedAt: "2026-07-28T02:00:00.000Z"
    });
    expect(plan.blueprint.toolRoles.filter((role) => role.movable))
      .toHaveLength(5);
    expect(
      plan.blueprint.toolRoles
        .filter((role) => role.movable)
        .map((role) => role.instructionalIntent)
        .join(" ")
    ).toContain("크기");
    expect(
      plan.blueprint.instructions[2]
    ).toContain("기호");
    expect(
      plan.blueprint.instructions[2]
    ).toContain("까닭");
    expect(
      plan.blueprint.constraints.some(
        (constraint) => constraint.requiresStudentAction
      )
    ).toBe(true);
  });
});
