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
  ] as const)(
    "%s: %i개를 %i개씩 묶는 실제 compiler payload가 중립적인 max-8 brick pool을 만든다",
    (
      seed,
      expectedTotal,
      expectedGroupSize,
      objectName,
      counter,
      groupName,
      groupLaneLabel
    ) => {
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

      const objectParticle = objectName === "색종이" ? "를" : "을";
      const predictInstruction = first.resolved.emissions.find(
        (emission) => emission.role === "instruction-predict"
      );
      const verifyInstruction = first.resolved.emissions.find(
        (emission) => emission.role === "instruction-verify"
      );
      const explainInstruction = first.resolved.emissions.find(
        (emission) => emission.role === "instruction-explain"
      );
      expect(predictInstruction?.itemId).toBe("division-remainder-1");
      expect(verifyInstruction?.itemId).toBe("division-remainder-1");
      expect(explainInstruction?.itemId).toBe("division-remainder-1");
      expect(predictInstruction?.toolIntent.properties.text).toBe(
        "① 묶기 전에 답 카드 하나를 ‘처음 고른 답’ 칸에 놓으세요."
      );
      expect(verifyInstruction?.toolIntent.properties.text).toBe(
        `② ${objectName}${objectParticle} ${expectedGroupSize}${counter}씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. ${expectedGroupSize}${counter}보다 적으면 오른쪽에 놓으세요.`
      );
      const groupParticle = groupName === "봉지" ? "와" : "과";
      expect(explainInstruction?.toolIntent.properties.text).toBe(
        `③ 만든 ${groupName}${groupParticle} 남은 ${objectName}${objectParticle} 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.`
      );
      const explanation = first.resolved.emissions.find(
        (emission) => emission.role === "explanation-label"
      );
      expect(explanation?.toolIntent.properties.text).toBe("식과 까닭 쓰기");
      expect(
        first.resolved.emissions.find(
          (emission) => emission.role === "pool-label"
        )?.toolIntent.properties.text
      ).toBe("답 카드 고르기");
      expect(
        first.resolved.emissions.find(
          (emission) => emission.role === "source-label"
        )?.toolIntent.properties.text
      ).toBe(`아직 묶지 않은 ${objectName}`);
      expect(
        first.resolved.emissions.find(
          (emission) => emission.role === "group-lane-label"
        )?.toolIntent.properties.text
      ).toBe(groupLaneLabel);
      expect(
        first.resolved.emissions.find(
          (emission) => emission.role === "remainder-lane-label"
        )?.toolIntent.properties.text
      ).toBe(`남은 ${objectName}`);
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

  it("이야기 속 물건·단위·결과 이름을 모형 같은 뭉뚱그린 말로 바꾸면 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const generic = structuredClone(resolved);
    const values = generic.items[0]!.values as Record<string, unknown>;
    const groupSize = Number(values.countableGroupSize);
    values.countableObjectName = "모형";
    values.countableCounter = "개";
    values.countableGroupName = "묶음";
    values.groupLaneLabelText = `${groupSize}개씩 만든 묶음`;
    values.sourceLaneLabelText = "아직 묶지 않은 모형";
    values.remainderLaneLabelText = "남은 모형";
    values.verifyInstructionText =
      `② 모형을 ${groupSize}개씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. ${groupSize}개보다 적으면 오른쪽에 놓으세요.`;
    values.explainInstructionText =
      "③ 만든 묶음과 남은 모형을 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.";
    const replacements = new Map([
      [
        "instruction-verify",
        values.verifyInstructionText
      ],
      ["instruction-explain", values.explainInstructionText],
      ["source-label", values.sourceLaneLabelText],
      ["group-lane-label", values.groupLaneLabelText],
      ["remainder-lane-label", "남은 모형"]
    ]);
    for (const [role, text] of replacements) {
      const emission = generic.emissions.find(
        (candidate) => candidate.role === role
      )!;
      emission.toolIntent.properties.text = text;
    }
    const report = validateForCreation(
      generic,
      compileActivity(generic),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "classroom-language-unclear" })
      ])
    );
    expect(report.canCreate).toBe(false);
  });

  it("작업판 라벨이 자기 칸의 세로 경계를 넘으면 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const crossing = structuredClone(resolved);
    const remainderLabel = crossing.emissions.find(
      (emission) => emission.role === "remainder-lane-label"
    )!;
    remainderLabel.bounds.x -= 70;
    const report = validateForCreation(
      crossing,
      compileActivity(crossing),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "text-clearance-insufficient" })
      ])
    );
    expect(report.canCreate).toBe(false);
  });

  it("이야기 대상의 이·가·을·를·과·와 조사가 틀리면 생성 전에 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    for (const [role, correct, incorrect] of [
      ["instruction-explain", "만든 봉지와", "만든 봉지과"],
      ["instruction-verify", "구슬을 6개씩", "구슬를 6개씩"]
    ] as const) {
      const wrongParticle = structuredClone(resolved);
      const instruction = wrongParticle.emissions.find(
        (emission) => emission.role === role
      )!;
      instruction.toolIntent.properties.text = String(
        instruction.toolIntent.properties.text
      ).replace(correct, incorrect);
      const report = validateForCreation(
        wrongParticle,
        compileActivity(wrongParticle),
        new Date(generatedAt)
      );
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "classroom-language-unclear" })
        ])
      );
      expect(report.canCreate).toBe(false);

      const mixedParticle = structuredClone(resolved);
      const mixedInstruction = mixedParticle.emissions.find(
        (emission) => emission.role === role
      )!;
      mixedInstruction.toolIntent.properties.text =
        `${String(mixedInstruction.toolIntent.properties.text)} ${incorrect}.`;
      const mixedReport = validateForCreation(
        mixedParticle,
        compileActivity(mixedParticle),
        new Date(generatedAt)
      );
      expect(
        mixedReport.issues.some(
          (issue) =>
            issue.code === "classroom-language-unclear" &&
            issue.message.includes("조사")
        )
      ).toBe(true);
      expect(mixedReport.canCreate).toBe(false);
    }
  });

  it("지시문·질문·답 카드의 이야기 대상·단위·결과 이름이 섞이면 막는다", () => {
    for (const mutation of ["object", "counter", "group"] as const) {
      const { resolved } = compileScenario("division-scenario-4");
      const broken = structuredClone(resolved);
      const values = broken.items[0]!.values as Record<string, unknown>;
      const setText = (role: string, text: string) => {
        broken.emissions.find(
          (emission) => emission.role === role
        )!.toolIntent.properties.text = text;
      };
      if (mutation === "object") {
        values.countableObjectName = "사과";
        values.verifyInstructionText =
          "② 사과를 6개씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. 6개보다 적으면 오른쪽에 놓으세요.";
        values.explainInstructionText =
          "③ 만든 봉지와 남은 사과를 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.";
        values.sourceLaneLabelText = "아직 묶지 않은 사과";
        values.remainderLaneLabelText = "남은 사과";
        setText("instruction-verify", String(values.verifyInstructionText));
        setText("instruction-explain", String(values.explainInstructionText));
        setText("source-label", String(values.sourceLaneLabelText));
        setText("remainder-lane-label", String(values.remainderLaneLabelText));
      } else if (mutation === "counter") {
        values.countableCounter = "알";
        values.verifyInstructionText =
          "② 구슬을 6알씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. 6알보다 적으면 오른쪽에 놓으세요.";
        values.groupLaneLabelText = "6알씩 담은 봉지";
        setText("instruction-verify", String(values.verifyInstructionText));
        setText("group-lane-label", String(values.groupLaneLabelText));
      } else {
        values.countableGroupName = "바구니";
        values.explainInstructionText =
          "③ 만든 바구니와 남은 구슬을 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.";
        values.groupLaneLabelText = "6개씩 담은 바구니";
        setText("instruction-explain", String(values.explainInstructionText));
        setText("group-lane-label", String(values.groupLaneLabelText));
      }
      const report = validateForCreation(
        broken,
        compileActivity(broken),
        new Date(generatedAt)
      );
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "classroom-language-unclear" })
        ])
      );
      expect(report.canCreate).toBe(false);
    }
  });

  it("학생 카드의 단위를 바꾸고 근거·교사 설명만 예전 단위로 남기면 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const staleTeacherStory = structuredClone(resolved);
    const values = staleTeacherStory.items[0]!.values as Record<
      string,
      unknown
    >;
    values.countableCounter = "알";
    values.questionText = String(values.questionText).replaceAll("개", "알");
    values.correctValueText = String(values.correctValueText).replaceAll(
      "개",
      "알"
    );
    values.verifyInstructionText =
      "② 구슬을 6알씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. 6알보다 적으면 오른쪽에 놓으세요.";
    values.groupLaneLabelText = "6알씩 담은 봉지";
    for (let index = 1; index <= 5; index += 1) {
      values[`candidate${index}`] = String(
        values[`candidate${index}`]
      ).replaceAll("개", "알");
      values[`candidate${index}Latex`] = String(
        values[`candidate${index}Latex`]
      ).replaceAll("개", "알");
    }
    const setText = (role: string, text: string) => {
      staleTeacherStory.emissions.find(
        (emission) => emission.role === role
      )!.toolIntent.properties.text = text;
    };
    setText("question", String(values.questionText));
    setText("instruction-verify", String(values.verifyInstructionText));
    setText("group-lane-label", String(values.groupLaneLabelText));
    Array.from(
      { length: 5 },
      (_unused, index) => `position-card-${index + 1}`
    ).forEach((role, index) => {
      setText(role, String(values[`candidate${index + 1}`]));
    });

    const report = validateForCreation(
      staleTeacherStory,
      compileActivity(staleTeacherStory),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "classroom-language-unclear" })
      ])
    );
    expect(report.canCreate).toBe(false);
  });

  it("학생 화면의 묶음 이름을 바꾸고 근거 문장만 예전 이름으로 남기면 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const staleEvidenceStory = structuredClone(resolved);
    const values = staleEvidenceStory.items[0]!.values as Record<
      string,
      unknown
    >;
    values.countableGroupName = "통";
    values.questionText = String(values.questionText).replaceAll(
      "봉지",
      "통"
    );
    values.correctValueText = String(values.correctValueText).replaceAll(
      "봉지",
      "통"
    );
    values.answerExplanation = String(values.answerExplanation).replaceAll(
      "봉지",
      "통"
    );
    values.explainInstructionText =
      "③ 만든 통과 남은 구슬을 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.";
    values.groupLaneLabelText = "6개씩 담은 통";
    for (let index = 1; index <= 5; index += 1) {
      values[`candidate${index}`] = String(
        values[`candidate${index}`]
      ).replaceAll("봉지", "통");
      values[`candidate${index}Latex`] = String(
        values[`candidate${index}Latex`]
      ).replaceAll("봉지", "통");
    }
    const setText = (role: string, text: string) => {
      staleEvidenceStory.emissions.find(
        (emission) => emission.role === role
      )!.toolIntent.properties.text = text;
    };
    setText("question", String(values.questionText));
    setText("instruction-explain", String(values.explainInstructionText));
    setText("group-lane-label", String(values.groupLaneLabelText));
    Array.from(
      { length: 5 },
      (_unused, index) => `position-card-${index + 1}`
    ).forEach((role, index) => {
      setText(role, String(values[`candidate${index + 1}`]));
    });

    const report = validateForCreation(
      staleEvidenceStory,
      compileActivity(staleEvidenceStory),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "classroom-language-unclear" })
      ])
    );
    expect(report.canCreate).toBe(false);
  });

  it("등록되지 않은 단위가 교사 설명에 섞여도 canonical story로 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const mixedCounter = structuredClone(resolved);
    const values = mixedCounter.items[0]!.values as Record<string, unknown>;
    values.answerExplanation = String(values.answerExplanation).replace(
      "30개",
      "30알"
    );
    const report = validateForCreation(
      mixedCounter,
      compileActivity(mixedCounter),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "classroom-language-unclear" })
      ])
    );
    expect(report.canCreate).toBe(false);
  });

  it("등록되지 않은 물건 이름이 근거 문장에 섞여도 canonical story로 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const mixedObject = structuredClone(resolved);
    const values = mixedObject.items[0]!.values as Record<string, unknown>;
    values.evidenceText = String(values.evidenceText).replace(
      "구슬을",
      "사과와 구슬을"
    );
    const report = validateForCreation(
      mixedObject,
      compileActivity(mixedObject),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "classroom-language-unclear" })
      ])
    );
    expect(report.canCreate).toBe(false);
  });

  it("item 값과 다른 문장이 학생 화면에 섞이면 exact role binding으로 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const mixedEmission = structuredClone(resolved);
    const question = mixedEmission.emissions.find(
      (emission) => emission.role === "question"
    )!;
    question.toolIntent.properties.text = `사과와 ${String(
      question.toolIntent.properties.text
    )}`;
    const report = validateForCreation(
      mixedEmission,
      compileActivity(mixedEmission),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "classroom-language-unclear" })
      ])
    );
    expect(report.canCreate).toBe(false);
  });

  it("조사가 맞아도 등록되지 않은 이야기 대상은 canonical story 밖이라 막는다", () => {
    const { resolved } = compileScenario("division-scenario-4");
    const apple = structuredClone(resolved);
    const values = apple.items[0]!.values as Record<string, unknown>;
    values.countableObjectName = "사과";
    values.sourceLaneLabelText = "아직 묶지 않은 사과";
    values.remainderLaneLabelText = "남은 사과";
    values.verifyInstructionText =
      "② 사과를 6개씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. 6개보다 적으면 오른쪽에 놓으세요.";
    values.explainInstructionText =
      "③ 만든 봉지와 남은 사과를 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.";
    values.questionText = String(values.questionText).replaceAll(
      "구슬",
      "사과"
    );
    values.evidenceLabelText = String(values.evidenceLabelText).replaceAll(
      "구슬",
      "사과"
    );
    values.evidenceText = String(values.evidenceText).replaceAll(
      "구슬",
      "사과"
    );
    values.answerExplanation = String(values.answerExplanation).replaceAll(
      "구슬",
      "사과"
    );
    for (const [role, text] of [
      ["instruction-verify", values.verifyInstructionText],
      ["instruction-explain", values.explainInstructionText],
      ["source-label", values.sourceLaneLabelText],
      ["remainder-lane-label", values.remainderLaneLabelText],
      ["question", values.questionText]
    ] as const) {
      const emission = apple.emissions.find(
        (candidate) => candidate.role === role
      )!;
      emission.toolIntent.properties.text = text;
    }
    const report = validateForCreation(
      apple,
      compileActivity(apple),
      new Date(generatedAt)
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "classroom-language-unclear" })
      ])
    );
    expect(report.canCreate).toBe(false);
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
