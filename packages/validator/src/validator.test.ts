import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex,
  type CompiledProject
} from "@mathcanvas/contracts";
import {
  compileActivity,
  resolveActivity
} from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import { resolveCurriculum } from "@mathcanvas/curriculum";
import {
  equivalentFractionBlueprint,
  generateEquivalentFractionActivity,
  generateFractionComparisonActivity,
  generateMakeTenNumberCardsActivity,
  makeTenNumberCardsBlueprint
} from "@mathcanvas/templates";
import { validateForCreation } from "./index.js";

function fixture() {
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "validator-request",
    prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
    createdAt: "2026-07-28T00:00:00.000Z"
  });
  const plan = generateFractionComparisonActivity(recommendation, {
    seed: "validator-seed",
    generatedAt: "2026-07-28T02:00:00.000Z"
  });
  const resolved = resolveActivity(plan);
  return { resolved, compiled: compileActivity(resolved) };
}

function equivalentFixture() {
  const request = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "validator-equivalent-request",
    prompt: "동치분수 활동지를 만들어 주세요.",
    createdAt: "2026-07-30T00:00:00.000Z"
  });
  const curriculum = resolveCurriculum("[6수01-06]");
  const recommendation = recommendationSchema.parse({
    ...request,
    supported: true,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 5,
    standardCode: curriculum.record.code,
    learningGoal: equivalentFractionBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 4,
    difficulty: "normal",
    manipulation: "equivalent-fraction-strip-match",
    rationale: ["검증용 동치분수 활동입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = generateEquivalentFractionActivity(
    recommendation,
    {
      seed: "validator-equivalent-seed",
      generatedAt: "2026-07-30T00:01:00.000Z"
    }
  );
  const resolved = resolveActivity(plan);
  return { resolved, compiled: compileActivity(resolved) };
}

function makeTenFixture() {
  const curriculum = resolveCurriculum("[2수01-04]");
  const recommendation = recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "validator-make-ten-request",
    supported: true,
    templateId: makeTenNumberCardsBlueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: 2,
    standardCode: curriculum.record.code,
    learningGoal: makeTenNumberCardsBlueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: 4,
    difficulty: "normal",
    manipulation: "number-card-make-ten-drag",
    rationale: ["검증용 10 만들기 구성 활동입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
  const plan = generateMakeTenNumberCardsActivity(
    recommendation,
    {
      seed: "validator-make-ten-seed",
      generatedAt: "2026-07-30T00:01:00.000Z"
    }
  );
  const resolved = resolveActivity(plan);
  return { resolved, compiled: compileActivity(resolved) };
}

describe("생성 전 검증", () => {
  it("blueprint id와 제목이 달라도 같은 제약에는 같은 판정을 낸다", () => {
    const { resolved } = fixture();
    const variant = structuredClone(resolved);
    variant.binding.blueprintId = "another.activity";
    variant.title = "다른 활동";
    const original = validateForCreation(
      resolved,
      compileActivity(resolved)
    );
    const changed = validateForCreation(
      variant,
      compileActivity(variant)
    );
    expect(changed.issues.map((issue) => issue.code)).toEqual(
      original.issues.map((issue) => issue.code)
    );
  });

  it("초기 학생 제약은 미충족이고 완성 상태 변조는 거부된다", () => {
    const { resolved } = fixture();
    expect(
      resolved.constraints.some(
        (constraint) =>
          constraint.requiresStudentAction &&
          !constraint.satisfiedInitially
      )
    ).toBe(true);
    const solved = structuredClone(resolved);
    solved.constraints.forEach((constraint) => {
      constraint.satisfiedInitially = true;
    });
    const report = validateForCreation(
      solved,
      compileActivity(solved)
    );
    expect(report.issues.map((issue) => issue.code)).toContain(
      "activity-initial-state-already-solved"
    );
  });

  it("정상 활동은 생성할 수 있다", () => {
    const { resolved, compiled } = fixture();
    const report = validateForCreation(
      resolved,
      compiled,
      new Date("2026-07-28T03:00:00.000Z")
    );
    expect(report.canCreate).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("눈으로 구별하기 어려운 분수 띠 쌍을 차단한다", () => {
    const { resolved } = fixture();
    const close = structuredClone(resolved);
    const first = close.items[0]!;
    first.values.left = { numerator: 4, denominator: 9 };
    first.values.right = { numerator: 3, denominator: 7 };
    first.values.correctRelation = ">";
    for (const model of close.emissions.filter(
      (value) =>
        value.itemId === first.id &&
        value.toolIntent.kind === "fraction-model"
    )) {
      if (model.toolIntent.kind !== "fraction-model") continue;
      model.toolIntent.properties.fraction =
        model.role === "left-strip"
          ? { numerator: 4, denominator: 9 }
          : { numerator: 3, denominator: 7 };
    }
    const report = validateForCreation(close, compileActivity(close));
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "visual-difference-too-small"
    );
  });

  it("순서만 바꾼 같은 분수 비교를 다시 내지 못하게 한다", () => {
    const { resolved } = fixture();
    const duplicate = structuredClone(resolved);
    const first = duplicate.items[0]!;
    const second = duplicate.items[1]!;
    second.values.left = structuredClone(first.values.right);
    second.values.right = structuredClone(first.values.left);
    second.values.correctRelation =
      first.values.correctRelation === "<" ? ">" : "<";
    for (const model of duplicate.emissions.filter(
      (value) =>
        value.itemId === second.id &&
        value.toolIntent.kind === "fraction-model"
    )) {
      if (model.toolIntent.kind !== "fraction-model") continue;
      model.toolIntent.properties.fraction =
        model.role === "left-strip"
          ? (structuredClone(second.values.left) as {
              numerator: number;
              denominator: number;
            })
          : (structuredClone(second.values.right) as {
              numerator: number;
              denominator: number;
            });
    }
    const report = validateForCreation(
      duplicate,
      compileActivity(duplicate)
    );
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "duplicate-fraction-comparison"
    );
  });

  it("학생 지시문 상자가 겹치면 차단한다", () => {
    const { resolved } = fixture();
    const overlapping = structuredClone(resolved);
    const secondInstruction = overlapping.emissions.find(
      (object) => object.id === "instruction-symbol"
    )!;
    secondInstruction.bounds.y = 150;
    const report = validateForCreation(
      overlapping,
      compileActivity(overlapping)
    );
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "instruction-overlap"
    );
  });

  it("학생 지시문 사이가 최소 간격보다 좁으면 차단한다", () => {
    const { resolved } = fixture();
    const tooClose = structuredClone(resolved);
    const secondInstruction = tooClose.emissions.find(
      (object) => object.id === "instruction-symbol"
    )!;
    secondInstruction.bounds.y = 190;
    const report = validateForCreation(
      tooClose,
      compileActivity(tooClose)
    );
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "instruction-gap-too-small"
    );
  });

  it("MathCanvas 분수 너비 변조를 차단한다", () => {
    const { resolved, compiled } = fixture();
    const contents = structuredClone(compiled.payload.contentsJson);
    const fraction = contents.find((object) =>
      String(object.svgId).startsWith("NO03FM")
    )!;
    fraction.width = Number(fraction.width) + 20;
    const payload = { ...compiled.payload, contentsJson: contents };
    const tampered: CompiledProject = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, tampered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "native-fraction-mismatch"
    );
  });

  it("실제 분수 좌표 폭이 놓기 칸과 맞지 않으면 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const fraction = payload.contentsJson.find((object) =>
      String(object.svgId).startsWith("NO03FM")
    )!;
    const coordinates = fraction.coordinates as number[][];
    coordinates[1]![0] = Number(coordinates[1]![0]) + 5;
    coordinates[2]![0] = Number(coordinates[2]![0]) + 5;
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "native-fraction-target-geometry-mismatch"
    );
  });

  it("실제 분수 좌표가 캔버스 밖이면 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const fraction = payload.contentsJson.find((object) =>
      String(object.svgId).startsWith("NO03FM")
    )!;
    fraction.x = -1000;
    fraction._x = -1000;
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "native-fraction-out-of-bounds"
    );
  });

  it("무결성 해시 변조를 차단한다", () => {
    const { resolved, compiled } = fixture();
    const report = validateForCreation(resolved, {
      ...compiled,
      payloadHash: "0".repeat(64)
    });
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "payload-hash-mismatch"
    );
  });

  it("지원하지 않는 svgId와 draw type을 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.contentsJson[0]!.svgId = "UNKNOWN-OBJECT";
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "unsupported-svg-id"
    );

    const drawPayload = structuredClone(compiled.payload);
    const rectangle = drawPayload.contentsJson.find(
      (object) => object.svgId === "drawElem"
    );
    expect(rectangle).toBeDefined();
    if (!rectangle) return;
    rectangle.type = "circle";
    const drawReport = validateForCreation(resolved, {
      ...compiled,
      payload: drawPayload,
      payloadHash: sha256Hex(drawPayload)
    });
    expect(drawReport.canCreate).toBe(false);
    expect(
      drawReport.issues.map((value) => value.code)
    ).toContain("unsupported-draw-type");
  });

  it("계약을 모르는 비어 있지 않은 penElements를 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.penElements = [
      {
        id: "p-static-shape",
        d: "M 100,100 L 120,120",
        stroke: "#000",
        strokeWidth: 1,
        isColor: false
      }
    ];
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "unsupported-pen-elements"
    );
  });

  it("움직일 기호가 잠겨 있으면 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.lockIds.push(["problem-1-less-symbol"]);
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "movable-object-locked"
    );
  });

  it("고정 비교판이 잠기지 않았으면 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.lockIds = payload.canvasOption.lockIds.filter(
      (ids) => !ids.includes("problem-1-mat")
    );
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "fixed-object-unlocked"
    );
  });

  it("놓기 영역이 실제 고정 표면과 연결되지 않으면 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.contentsJson = payload.contentsJson.filter(
      (object) => object.id !== "problem-1-left-lane-surface"
    );
    payload.canvasOption.lockIds = payload.canvasOption.lockIds.filter(
      (ids) => !ids.includes("problem-1-left-lane-surface")
    );
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "drop-surface-invalid"
    );
  });

  it("분수 이외 네이티브 객체의 필드 변조도 차단한다", () => {
    const { resolved, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const surface = payload.contentsJson.find(
      (object) => object.svgId === "drawElem"
    )!;
    surface.point2 = [9999, 9999];
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(resolved, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "compiled-project-not-canonical"
    );
  });

  it("인지적 요구와 수식 정렬 게이트의 핵심 우회를 묶어 차단한다", () => {
    const base = fixture().resolved;
    const issueCodes = (
      mutate: (resolved: typeof base) => void
    ): string[] => {
      const altered = structuredClone(base);
      mutate(altered);
      return validateForCreation(
        altered,
        compileActivity(altered)
      ).issues.map((entry) => entry.code);
    };

    expect(
      issueCodes((resolved) => {
        const first = resolved.items[0]!;
        const instruction = resolved.emissions.find(
          (emission) => emission.id === "instruction-main"
        )!;
        instruction.toolIntent.properties.text =
          first.values.correctRelation;
      })
    ).toContain("cognitive-answer-visible");

    expect(
      issueCodes((resolved) => {
        const candidate = resolved.emissions.find(
          (emission) =>
            emission.itemId === resolved.items[0]!.id &&
            emission.role === "less-symbol"
        )!;
        candidate.movable = false;
        candidate.locked = true;
      })
    ).toContain("cognitive-decision-missing");

    expect(
      issueCodes((resolved) => {
        const firstId = resolved.items[0]!.id;
        resolved.emissions = resolved.emissions.filter(
          (emission) =>
            emission.itemId !== firstId ||
            emission.role !== "prediction-box"
        );
      })
    ).toContain("cognitive-prediction-region-missing");

    expect(
      issueCodes((resolved) => {
        const firstId = resolved.items[0]!.id;
        resolved.constraints.forEach((constraint) => {
          if (constraint.id.endsWith(`:${firstId}`)) {
            constraint.satisfiedInitially = true;
          }
        });
      })
    ).toContain("cognitive-item-already-solved");

    expect(
      issueCodes((resolved) => {
        resolved.valuePredicates.push({
          kind: "visual.equation-rail",
          parameters: {
            roles: [
              "less-symbol",
              "equal-symbol",
              "greater-symbol"
            ],
            operatorRoles: [
              "less-symbol",
              "equal-symbol",
              "greater-symbol"
            ],
            centerTolerance: 2,
            maxGapDelta: 8,
            fontSize: 64
          }
        });
        const equal = resolved.emissions.find(
          (emission) =>
            emission.itemId === resolved.items[0]!.id &&
            emission.role === "equal-symbol"
        )!;
        equal.bounds.y += 12;
      })
    ).toContain("equation-rail-center-mismatch");

    const equivalentBase = equivalentFixture().resolved;
    const equivalentIssueCodes = (
      mutate: (resolved: typeof equivalentBase) => void
    ): string[] => {
      const altered = structuredClone(equivalentBase);
      mutate(altered);
      return validateForCreation(
        altered,
        compileActivity(altered)
      ).issues.map((entry) => entry.code);
    };

    expect(
      equivalentIssueCodes((resolved) => {
        const first = resolved.items[0]!;
        const correct = first.values.correctCandidate;
        const duplicate = resolved.emissions.find(
          (emission) =>
            emission.itemId === first.id &&
            emission.role.startsWith("candidate-strip-") &&
            JSON.stringify(
              emission.toolIntent.properties.fraction
            ) !== JSON.stringify(correct)
        )!;
        duplicate.toolIntent.properties.fraction =
          structuredClone(correct);
      })
    ).toContain("cognitive-distractor-space-invalid");

    expect(
      equivalentIssueCodes((resolved) => {
        const first = resolved.items[0]!;
        const target = resolved.emissions.find(
          (emission) =>
            emission.itemId === first.id &&
            emission.role === "target-lane-surface"
        )!;
        target.bounds.x += 1;
      })
    ).toContain("reference-whole-start-violated");

    expect(
      equivalentIssueCodes((resolved) => {
        const firstId = resolved.items[0]!.id;
        resolved.emissions = resolved.emissions.filter(
          (emission) =>
            emission.itemId !== firstId ||
            emission.role !== "explanation-box"
        );
      })
    ).toContain("cognitive-explanation-region-missing");

    expect(
      equivalentIssueCodes((resolved) => {
        const firstId = resolved.items[0]!.id;
        resolved.emissions = resolved.emissions.filter(
          (emission) =>
            emission.itemId !== firstId ||
            emission.role !== "start-line"
        );
      })
    ).toContain("cognitive-self-verification-missing");

    expect(
      equivalentIssueCodes((resolved) => {
        const firstId = resolved.items[0]!.id;
        const prediction = resolved.emissions.find(
          (emission) =>
            emission.itemId === firstId &&
            emission.role === "prediction-box"
        )!;
        const reference = resolved.emissions.find(
          (emission) =>
            emission.itemId === firstId &&
            emission.role === "reference-lane-surface"
        )!;
        prediction.bounds = structuredClone(reference.bounds);
      })
    ).toContain("visual-region-overlap");

    expect(
      equivalentIssueCodes((resolved) => {
        const first = resolved.items[0]!;
        const reference = first.values.reference as {
          numerator: number;
          denominator: number;
        };
        const correct = first.values.correctCandidate as {
          numerator: number;
          denominator: number;
        };
        for (let number = 1; number <= 6; number += 1) {
          const path = `candidate${number}`;
          const candidate = first.values[path] as {
            numerator: number;
            denominator: number;
          };
          if (
            (candidate.numerator === reference.numerator &&
              candidate.denominator === correct.denominator) ||
            (candidate.numerator === correct.numerator &&
              candidate.denominator === reference.denominator)
          ) {
            const replacement = structuredClone(reference);
            first.values[path] = replacement;
            resolved.emissions.find(
              (emission) =>
                emission.itemId === first.id &&
                emission.role === `candidate-strip-${number}`
            )!.toolIntent.properties.fraction = replacement;
          }
        }
      })
    ).toContain("one-side-change-distractor-missing");

    expect(
      equivalentIssueCodes((resolved) => {
        const first = resolved.items[0]!;
        const reference = first.values.reference as {
          numerator: number;
          denominator: number;
        };
        for (let number = 1; number <= 6; number += 1) {
          const path = `candidate${number}`;
          const candidate = first.values[path] as {
            numerator: number;
            denominator: number;
          };
          if (
            candidate.numerator - reference.numerator !== 0 &&
            candidate.numerator - reference.numerator ===
              candidate.denominator - reference.denominator
          ) {
            const replacement = structuredClone(reference);
            first.values[path] = replacement;
            resolved.emissions.find(
              (emission) =>
                emission.itemId === first.id &&
                emission.role === `candidate-strip-${number}`
            )!.toolIntent.properties.fraction = replacement;
          }
        }
      })
    ).toContain("additive-change-distractor-missing");

    const makeTenBase = makeTenFixture().resolved;
    const makeTenIssueCodes = (
      mutate: (resolved: typeof makeTenBase) => void
    ): string[] => {
      const altered = structuredClone(makeTenBase);
      mutate(altered);
      return validateForCreation(
        altered,
        compileActivity(altered)
      ).issues.map((entry) => entry.code);
    };

    expect(
      makeTenIssueCodes((resolved) => {
        const first = resolved.items[0]!;
        const piece = resolved.emissions.find(
          (emission) =>
            emission.itemId === first.id &&
            emission.role === "piece-card-1"
        )!;
        piece.movable = false;
        piece.locked = true;
      })
    ).toContain("cognitive-decision-missing");

    expect(
      makeTenIssueCodes((resolved) => {
        const first = resolved.items[0]!;
        resolved.emissions = resolved.emissions.filter(
          (emission) =>
            emission.itemId !== first.id ||
            emission.role !== "frame-cell-10"
        );
      })
    ).toContain("countable-unit-frame-invalid");

    expect(
      makeTenIssueCodes((resolved) => {
        const first = resolved.items[0]!;
        const plus = resolved.emissions.find(
          (emission) =>
            emission.itemId === first.id &&
            emission.role === "plus-operator"
        )!;
        plus.bounds.x += 20;
      })
    ).toContain("equation-rail-spacing-uneven");
  });
});
