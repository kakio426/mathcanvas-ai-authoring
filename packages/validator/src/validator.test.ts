import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  sha256Hex,
  type CompiledProject
} from "@mathcanvas/contracts";
import { compileActivitySpec } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import { generateFractionComparisonActivity } from "@mathcanvas/templates";
import { validateForCreation } from "./index.js";

function fixture() {
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "validator-request",
    prompt: "분모가 다른 분수의 크기를 비교하는 활동지를 만들어 주세요.",
    createdAt: "2026-07-28T00:00:00.000Z"
  });
  const spec = generateFractionComparisonActivity(recommendation, {
    seed: "validator-seed",
    generatedAt: "2026-07-28T02:00:00.000Z"
  });
  return { spec, compiled: compileActivitySpec(spec) };
}

describe("생성 전 검증", () => {
  it("정상 활동은 생성할 수 있다", () => {
    const { spec, compiled } = fixture();
    const report = validateForCreation(
      spec,
      compiled,
      new Date("2026-07-28T03:00:00.000Z")
    );
    expect(report.canCreate).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("눈으로 구별하기 어려운 분수 띠 쌍을 차단한다", () => {
    const { spec } = fixture();
    const close = structuredClone(spec);
    close.problems[0]!.left = { numerator: 4, denominator: 9 };
    close.problems[0]!.right = { numerator: 3, denominator: 7 };
    close.problems[0]!.correctRelation = ">";
    for (const model of close.visualModels.filter(
      (value) => value.problemId === close.problems[0]!.id
    )) {
      model.fraction =
        model.role === "left-strip"
          ? { numerator: 4, denominator: 9 }
          : { numerator: 3, denominator: 7 };
    }
    const report = validateForCreation(close, compileActivitySpec(close));
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "visual-difference-too-small"
    );
  });

  it("순서만 바꾼 같은 분수 비교를 다시 내지 못하게 한다", () => {
    const { spec } = fixture();
    const duplicate = structuredClone(spec);
    const first = duplicate.problems[0]!;
    const second = duplicate.problems[1]!;
    second.left = structuredClone(first.right);
    second.right = structuredClone(first.left);
    second.correctRelation = first.correctRelation === "<" ? ">" : "<";
    for (const model of duplicate.visualModels.filter(
      (value) => value.problemId === second.id
    )) {
      model.fraction =
        model.role === "left-strip"
          ? structuredClone(second.left)
          : structuredClone(second.right);
    }
    const report = validateForCreation(
      duplicate,
      compileActivitySpec(duplicate)
    );
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "duplicate-fraction-comparison"
    );
  });

  it("학생 지시문 상자가 겹치면 차단한다", () => {
    const { spec } = fixture();
    const overlapping = structuredClone(spec);
    const secondInstruction = overlapping.fixedObjects.find(
      (object) => object.id === "instruction-symbol"
    )!;
    secondInstruction.bounds.y = 150;
    const report = validateForCreation(
      overlapping,
      compileActivitySpec(overlapping)
    );
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "instruction-overlap"
    );
  });

  it("학생 지시문 사이가 최소 간격보다 좁으면 차단한다", () => {
    const { spec } = fixture();
    const tooClose = structuredClone(spec);
    const secondInstruction = tooClose.fixedObjects.find(
      (object) => object.id === "instruction-symbol"
    )!;
    secondInstruction.bounds.y = 190;
    const report = validateForCreation(
      tooClose,
      compileActivitySpec(tooClose)
    );
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "instruction-gap-too-small"
    );
  });

  it("MathCanvas 분수 너비 변조를 차단한다", () => {
    const { spec, compiled } = fixture();
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
    const report = validateForCreation(spec, tampered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "native-fraction-mismatch"
    );
  });

  it("무결성 해시 변조를 차단한다", () => {
    const { spec, compiled } = fixture();
    const report = validateForCreation(spec, {
      ...compiled,
      payloadHash: "0".repeat(64)
    });
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "payload-hash-mismatch"
    );
  });

  it("지원하지 않는 svgId를 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.contentsJson[0]!.svgId = "UNKNOWN-OBJECT";
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(spec, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "unsupported-svg-id"
    );
  });

  it("움직일 기호가 잠겨 있으면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.lockIds.push(["problem-1-less-symbol"]);
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(spec, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "movable-object-locked"
    );
  });

  it("고정 비교판이 잠기지 않았으면 차단한다", () => {
    const { spec, compiled } = fixture();
    const payload = structuredClone(compiled.payload);
    payload.canvasOption.lockIds = payload.canvasOption.lockIds.filter(
      (ids) => !ids.includes("problem-1-mat")
    );
    const altered = {
      ...compiled,
      payload,
      payloadHash: sha256Hex(payload)
    };
    const report = validateForCreation(spec, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "fixed-object-unlocked"
    );
  });

  it("놓기 영역이 실제 고정 표면과 연결되지 않으면 차단한다", () => {
    const { spec, compiled } = fixture();
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
    const report = validateForCreation(spec, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "drop-surface-invalid"
    );
  });

  it("분수 이외 네이티브 객체의 필드 변조도 차단한다", () => {
    const { spec, compiled } = fixture();
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
    const report = validateForCreation(spec, altered);
    expect(report.canCreate).toBe(false);
    expect(report.issues.map((value) => value.code)).toContain(
      "compiled-project-not-canonical"
    );
  });
});
