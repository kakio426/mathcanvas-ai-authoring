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
    secondLane.bounds.y = 350;
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
      (object) => object.id === "problem-1-left-lane-label"
    )!;
    label.fontSize = 20;
    const result = validateForCreation(spec, withPayload(compiled, payload));
    expect(result.canCreate).toBe(false);
    expect(result.issues.map((value) => value.code)).toContain(
      "student-font-too-small"
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
});
