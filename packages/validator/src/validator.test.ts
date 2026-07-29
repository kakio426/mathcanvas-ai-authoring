import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  canvasActivityHash,
  sha256Hex,
  type CanvasActivitySpec,
  type CompiledCanvasProject
} from "@mathcanvas/contracts";
import { compileCanvasActivitySpec } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import {
  generateFractionComparisonActivitySet,
  splitActivitySetIntoCanvases
} from "@mathcanvas/templates";
import { validateForCreation } from "./index.js";

function fixture() {
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "validator-request",
    prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
    createdAt: "2026-07-28T00:00:00.000Z"
  });
  const set = generateFractionComparisonActivitySet(recommendation, {
    seed: "validator-seed",
    generatedAt: "2026-07-28T02:00:00.000Z"
  });
  const spec = splitActivitySetIntoCanvases(set)[0]!;
  return { spec, compiled: compileCanvasActivitySpec(spec) };
}

function rehash(spec: CanvasActivitySpec): CanvasActivitySpec {
  return {
    ...spec,
    canvasHash: canvasActivityHash(spec)
  };
}

function withPayload(
  compiled: CompiledCanvasProject,
  payload: CompiledCanvasProject["payload"]
): CompiledCanvasProject {
  return {
    ...compiled,
    payload,
    payloadHash: sha256Hex(payload)
  };
}

describe("한 문제 캔버스 생성 전 검증", () => {
  it("정상 캔버스는 생성할 수 있다", () => {
    const { spec, compiled } = fixture();
    const result = validateForCreation(
      spec,
      compiled,
      new Date("2026-07-28T03:00:00.000Z")
    );
    expect(result.canCreate).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.canvasSpecId).toBe(spec.canvasId);
  });

  it("두 번째 문제가 섞인 캔버스 사양을 스키마에서 차단한다", () => {
    const { spec, compiled } = fixture();
    const invalid = {
      ...spec,
      problems: [spec.problem, spec.problem]
    } as unknown as CanvasActivitySpec;
    const result = validateForCreation(invalid, compiled);
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "canvas-activity-spec-invalid"
    );
  });

  it("난이도 범위와 맞지 않는 분수 쌍을 차단한다", () => {
    const { spec } = fixture();
    const close = structuredClone(spec);
    close.problem.left = { numerator: 4, denominator: 9 };
    close.problem.right = { numerator: 3, denominator: 7 };
    close.problem.correctRelation = ">";
    for (const model of close.visualModels) {
      model.fraction =
        model.role === "left-strip"
          ? { numerator: 4, denominator: 9 }
          : { numerator: 3, denominator: 7 };
      model.bounds.width =
        (model.wholeWidth / model.fraction.denominator) *
        model.fraction.numerator;
    }
    const updated = rehash(close);
    const result = validateForCreation(
      updated,
      compileCanvasActivitySpec(updated)
    );
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "visual-difference-outside-difficulty-band"
    );
  });

  it("두 분수 띠 자리가 겹치면 차단한다", () => {
    const { spec } = fixture();
    const overlapping = structuredClone(spec);
    const secondLane = overlapping.placementGuides.find(
      (guide) => guide.id === "problem-1-right-lane"
    )!;
    secondLane.bounds.y = 260;
    const updated = rehash(overlapping);
    const result = validateForCreation(
      updated,
      compileCanvasActivitySpec(updated)
    );
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "comparison-lanes-overlap"
    );
  });

  it("끌기 전 띠가 빈 목표 자리나 출발선에 닿으면 차단한다", () => {
    const { spec } = fixture();
    const misplaced = structuredClone(spec);
    const model = misplaced.visualModels[0]!;
    const movable = misplaced.movableObjects.find(
      (object) => object.sourceModelId === model.id
    )!;
    model.bounds.x = model.commonStartX;
    movable.bounds.x = model.commonStartX;
    const updated = rehash(misplaced);
    const result = validateForCreation(
      updated,
      compileCanvasActivitySpec(updated)
    );
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "fraction-source-not-separated"
    );
  });

  it("준비 상자의 띠 끝만 보고 정답을 알 수 있으면 차단한다", () => {
    const { spec } = fixture();
    const revealing = structuredClone(spec);
    for (const model of revealing.visualModels) {
      model.bounds.x = 95;
      const movable = revealing.movableObjects.find(
        (object) => object.sourceModelId === model.id
      )!;
      movable.bounds.x = 95;
    }
    const updated = rehash(revealing);
    const result = validateForCreation(
      updated,
      compileCanvasActivitySpec(updated)
    );
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "source-layout-does-not-require-alignment"
    );
  });

  it("44×44보다 작은 기호 조작 영역을 차단한다", () => {
    const { spec } = fixture();
    const small = structuredClone(spec);
    small.movableObjects.find(
      (object) => object.id === "problem-1-less-symbol"
    )!.bounds.width = 40;
    const updated = rehash(small);
    const result = validateForCreation(
      updated,
      compileCanvasActivitySpec(updated)
    );
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "target-too-small"
    );
  });

  it("분수 띠의 변형 손잡이가 켜지면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const fraction = payload.contentsJson.find((object) =>
      String(object.svgId).startsWith("NO03FM")
    )!;
    fraction.isMoveRotateHandler = true;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-contract-mismatch"
    );
  });

  it("분수 띠의 이동 전용 그룹이 빠지면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.contentsJson = payload.contentsJson.filter(
      (object) => object.id !== "problem-1-left-strip-move-group"
    );
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-group-contract-mismatch"
    );
  });

  it("분수 띠가 이동 전용 그룹에서 풀리면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const fraction = payload.contentsJson.find(
      (object) => object.id === "problem-1-left-strip"
    )!;
    fraction.groupId = "";
    fraction.isGroup = false;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-contract-mismatch"
    );
  });

  it("실제 분수 좌표가 원래 자리와 다르면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const fraction = payload.contentsJson.find((object) =>
      String(object.svgId).startsWith("NO03FM")
    )!;
    fraction.x = Number(fraction.x) + 20;
    fraction._x = Number(fraction._x) + 20;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-geometry-mismatch"
    );
  });

  it("비교 까닭 입력칸이 잠기면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.lockIds.push([spec.inputObjects[0]!.id]);
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-response-input-contract-mismatch"
    );
  });

  it("학생 글자 크기를 24보다 작게 바꾸면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const label = payload.contentsJson.find(
      (object) => object.id === "problem-1-move-step-label"
    )!;
    label.fontSize = 20;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "student-font-too-small"
    );
  });

  it("새 활동지가 기본 120% 배율이 아니면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.scale = 5;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "project-contract-mismatch"
    );
  });

  it("분수 카드가 math-latex 분수식이 아니면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const formula = payload.contentsJson.find(
      (object) => object.id === "problem-1-left-fraction-formula"
    )!;
    formula.svgId = "input-text";
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-formula-invalid"
    );
  });

  it("분수 수식이 카드 밖으로 나가면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const formula = payload.contentsJson.find(
      (object) => object.id === "problem-1-left-fraction-formula"
    )!;
    formula.x = 300;
    formula._x = 300;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-formula-invalid"
    );
  });

  it("분수 수식이 카드 안에서 가운데를 벗어나면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const formula = payload.contentsJson.find(
      (object) => object.id === "problem-1-left-fraction-formula"
    )!;
    formula.x = Number(formula.x) + 4;
    formula._x = formula.x;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-formula-invalid"
    );
  });

  it("두 자리 분모의 수식 폭을 한 자리 폭으로 줄이면 차단한다", () => {
    const { spec: fixtureSpec } = fixture();
    const spec = structuredClone(fixtureSpec);
    spec.problem.left = { numerator: 7, denominator: 12 };
    spec.problem.right = { numerator: 2, denominator: 3 };
    spec.problem.correctRelation = "<";
    spec.canvasHash = canvasActivityHash(spec);
    const compiled = compileCanvasActivitySpec(spec);
    const payload = structuredClone(compiled.payload);
    const formula = payload.contentsJson.find(
      (object) => object.id === "problem-1-left-fraction-formula"
    )!;
    formula.width = 50;
    formula._width = 50;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-formula-invalid"
    );
  });

  it("분수 수식의 값이 문제와 다르면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const formula = payload.contentsJson.find(
      (object) => object.id === "problem-1-left-fraction-formula"
    )!;
    formula.text = "\\frac{1}{99}";
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "native-fraction-formula-invalid"
    );
  });

  it("기호 준비 카드가 기호 목적지와 겹치면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const card = payload.contentsJson.find(
      (object) => object.id === "problem-1-less-symbol-source-card"
    )!;
    card.point1 = [800, 530];
    card.point2 = [880, 610];
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "symbol-source-card-invalid"
    );
  });

  it("비교 기호가 준비 카드 가운데를 벗어나면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const symbol = payload.contentsJson.find(
      (object) => object.id === "problem-1-less-symbol"
    )!;
    symbol.y = Number(symbol.y) + 3;
    symbol._y = symbol.y;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "symbol-source-card-invalid"
    );
  });

  it("지원하지 않는 스냅 accepts가 섞이면 차단한다", () => {
    const { spec, compiled } = fixture();
    const invalid = structuredClone(spec) as CanvasActivitySpec & {
      accepts?: string[];
    };
    invalid.accepts = ["problem-1-left-movable"];
    const result = validateForCreation(invalid, compiled);
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "canvas-activity-spec-invalid"
    );
  });

  it("무결성 해시 변조를 차단한다", () => {
    const { spec, compiled } = fixture();
    const result = validateForCreation(spec, {
      ...compiled,
      payloadHash: "0".repeat(64)
    });
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "payload-hash-mismatch"
    );
  });

  it("움직일 기호가 잠겨 있으면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.lockIds.push(["problem-1-less-symbol"]);
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "movable-object-invalid"
    );
  });

  it("고정 비교판이 잠기지 않았으면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.lockIds = payload.canvasOption.lockIds.filter(
      (ids) => !ids.includes("problem-1-mat")
    );
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "fixed-object-invalid"
    );
  });

  it("시각 안내 표면이 빠지면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.contentsJson = payload.contentsJson.filter(
      (object) => object.id !== "problem-1-left-lane-surface"
    );
    payload.canvasOption.lockIds = payload.canvasOption.lockIds.filter(
      (ids) => !ids.includes("problem-1-left-lane-surface")
    );
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "placement-guide-surface-invalid"
    );
  });

  it("비교 까닭 입력 테두리가 빠지면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const surfaceId = `${spec.inputObjects[0]!.id}-surface`;
    payload.contentsJson = payload.contentsJson.filter(
      (object) => object.id !== surfaceId
    );
    payload.canvasOption.lockIds = payload.canvasOption.lockIds.filter(
      (ids) => !ids.includes(surfaceId)
    );
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "response-input-surface-invalid"
    );
  });

  it("‘까닭’ 안내가 응답 패널 밖으로 나가면 차단한다", () => {
    const { spec } = fixture();
    const changed = structuredClone(spec);
    const label = changed.fixedObjects.find(
      (object) => object.id === `${changed.problem.id}-response-label`
    )!;
    label.bounds.x = 0;
    changed.canvasHash = canvasActivityHash(changed);
    const compiled = compileCanvasActivitySpec(changed);
    const result = validateForCreation(changed, compiled);
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "response-label-not-integrated"
    );
  });

  it("‘까닭’ 안내와 빈 입력칸 사이 간격이 부족하면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const label = spec.fixedObjects.find(
      (object) => object.id === `${spec.problem.id}-response-label`
    )!;
    const response = payload.contentsJson.find(
      (object) => object.id === spec.inputObjects[0]!.id
    )!;
    response.x = label.bounds.x + label.bounds.width + 8;
    response._x = response.x;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "response-label-not-integrated"
    );
  });

  it("목표 안내와 출발선 이름이 겹치면 차단한다", () => {
    const { spec } = fixture();
    const overlapping = structuredClone(spec);
    const startLabel = overlapping.fixedObjects.find(
      (object) => object.id === `${overlapping.problem.id}-start-label`
    )!;
    startLabel.bounds.y = 170;
    const updated = rehash(overlapping);
    const result = validateForCreation(
      updated,
      compileCanvasActivitySpec(updated)
    );
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "target-instructions-overlap"
    );
  });

  it("컴파일러 전용 패널의 위치가 바뀌면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    const panel = payload.contentsJson.find(
      (object) => object.id === `${spec.problem.id}-symbol-panel`
    )!;
    panel.point1 = [40, 515];
    panel.point2 = [1240, 625];
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "layout-panel-contract-invalid"
    );
  });
});
