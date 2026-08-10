import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  oneScreenLayoutProfileSchema,
  r5NativeToolDiscoveryEvidenceSchema,
  r5VerticalSliceSpecSchema,
  type R5NativeToolDiscoveryEvidence
} from "@mathcanvas/contracts";
import { buildR5VerticalSliceSpecs } from "./r5-vertical-slices.js";

function json(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function fixtures() {
  return {
    discovery: r5NativeToolDiscoveryEvidenceSchema.parse(
      json("research/mathcanvas/r5-native-tool-discovery.json")
    ),
    profile: oneScreenLayoutProfileSchema.parse(
      json("research/mathcanvas/student-one-screen-large-v1.json")
    )
  };
}

describe("R5 four representation vertical slices", () => {
  it("자료·배열·같은 전체·원의 관계를 서로 다른 native state로 설계한다", () => {
    const { discovery, profile } = fixtures();
    const entries = buildR5VerticalSliceSpecs(discovery, profile);
    expect(entries.map((entry) => entry.sequence)).toEqual([1, 2, 10, 23]);
    expect(entries.map((entry) => entry.native.variantId)).toEqual([
      "DP03PG-01",
      "NO04NG-03",
      "NO03FM-07",
      "SM07CS-01"
    ]);
    expect(new Set(entries.map((entry) => entry.families.blueprint.id)).size).toBe(4);
    expect(entries.every((entry) => entry.releaseQualified === false)).toBe(true);
  });

  it("학생 화면은 예상→native 확인→증거 설명→수정과 서로 다른 보기 3개를 가진다", () => {
    const { discovery, profile } = fixtures();
    for (const entry of buildR5VerticalSliceSpecs(discovery, profile)) {
      expect(entry.learnerTask.phaseSequence).toEqual([
        "prediction",
        "mathematical-confirmation",
        "explanation",
        "revision"
      ]);
      expect(entry.learnerTask.candidates).toHaveLength(3);
      expect(new Set(entry.learnerTask.candidates.map((candidate) => candidate.text)).size).toBe(3);
      expect(entry.learnerTask.explanationEvidence.length).toBeGreaterThan(10);
      expect(entry.learnerTask.initialAnswerComplete).toBe(false);
      expect(entry.native.initialTargetAnswerVisible).toBe(false);
    }
  });

  it("곱셈표는 24를 숨긴 5×5에서 4×6으로 바뀔 때만 목표값을 드러낸다", () => {
    const { discovery, profile } = fixtures();
    const multiplication = buildR5VerticalSliceSpecs(discovery, profile).find(
      (entry) => entry.sequence === 2
    )!;
    expect(multiplication.native.configuredInitialState).toMatchObject({
      visibleRows: 5,
      visibleColumns: 5,
      targetProduct: null
    });
    expect(multiplication.native.targetState).toMatchObject({
      visibleRows: 4,
      visibleColumns: 6,
      targetProduct: 24
    });
    expect(multiplication.learnerTask.candidates.map((candidate) => candidate.text)).toEqual([
      "10개",
      "20개",
      "24개"
    ]);
  });

  it("대표 operation이 discovery에서 바뀌면 canonical spec 생성을 거부한다", () => {
    const { discovery, profile } = fixtures();
    const mutated = structuredClone(discovery) as R5NativeToolDiscoveryEvidence;
    const circle = mutated.observations.find(
      (entry) => entry.variantId === "SM07CS-01"
    )!;
    circle.semanticProbe!.operation.operation = "move-circle-only";
    expect(() => buildR5VerticalSliceSpecs(mutated, profile)).toThrow(
      "r5-slice-discovery-binding-missing:SM07CS-01"
    );
  });

  it("scaled common-anchor envelope가 211.6px를 넘거나 보기 정답 ID가 없으면 거부한다", () => {
    const { discovery, profile } = fixtures();
    const entry = structuredClone(
      buildR5VerticalSliceSpecs(discovery, profile)[0]!
    );
    entry.spatialPreflight.predictedStateEnvelopesCss[2].bounds.height = 220;
    entry.spatialPreflight.predictedUnionCss.height = 220;
    expect(r5VerticalSliceSpecSchema.safeParse(entry).success).toBe(false);

    const missingAnswer = structuredClone(
      buildR5VerticalSliceSpecs(discovery, profile)[0]!
    );
    missingAnswer.learnerTask.correctCandidateId = "not-in-candidates";
    expect(r5VerticalSliceSpecSchema.safeParse(missingAnswer).success).toBe(false);
  });
});
