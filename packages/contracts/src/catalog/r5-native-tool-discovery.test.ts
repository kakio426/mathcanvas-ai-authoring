import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../hash.js";
import {
  r5NativeToolDiscoveryEvidenceSchema,
  type R5NativeToolDiscoveryEvidence
} from "./r5-native-tool-discovery.js";

function fixture(): R5NativeToolDiscoveryEvidence {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "research/mathcanvas/r5-native-tool-discovery.json"),
      "utf8"
    )
  );
}

function rehash(value: R5NativeToolDiscoveryEvidence): void {
  const { contentSha256: _contentSha256, ...body } = value;
  value.contentSha256 = sha256Hex(body);
}

function semantic(
  value: R5NativeToolDiscoveryEvidence,
  variantId: string
) {
  const observation = value.observations.find(
    (candidate) => candidate.variantId === variantId
  );
  if (!observation?.semanticProbe) throw new Error(`semantic fixture missing: ${variantId}`);
  return observation.semanticProbe;
}

describe("R5 native tool discovery evidence", () => {
  it("12종 후보와 대표 4종의 실제 semantic transition을 reference-only로 고정한다", () => {
    const evidence = r5NativeToolDiscoveryEvidenceSchema.parse(fixture());
    expect(evidence.observations).toHaveLength(12);
    expect(evidence.decision.semanticPassCount).toBe(4);
    expect(evidence.environment.externalWriteCount).toBe(0);
    expect(evidence.decision.releaseQualified).toBe(false);
  });

  it("곱셈표가 초기부터 24를 보이거나 4×6 전이를 잃으면 self-rehash 뒤에도 거부한다", () => {
    const leaked = fixture();
    const before = semantic(leaked, "NO04NG-03").before as {
      multiplicationArray: { target: { product: number | null } };
    };
    before.multiplicationArray.target.product = 24;
    rehash(leaked);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(leaked).success).toBe(false);

    const wrongShape = fixture();
    const after = semantic(wrongShape, "NO04NG-03").after as {
      multiplicationArray: { visibleRows: number };
    };
    after.multiplicationArray.visibleRows = 5;
    rehash(wrongShape);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(wrongShape).success).toBe(false);
  });

  it("그림 수·같은 전체의 분할·중심 고정 관계 변조를 거부한다", () => {
    const graph = fixture();
    (semantic(graph, "DP03PG-01").before.graphValue as number[][])[0]![0] = 1;
    rehash(graph);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(graph).success).toBe(false);

    const fraction = fixture();
    semantic(fraction, "NO03FM-07").after.divider = 3;
    rehash(fraction);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(fraction).success).toBe(false);

    const circle = fixture();
    semantic(circle, "SM07CS-01").after.x =
      Number(semantic(circle, "SM07CS-01").after.x) + 1;
    rehash(circle);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(circle).success).toBe(false);
  });

  it("variant 순서·대표 operation·release 과장을 거부한다", () => {
    const reordered = fixture();
    [reordered.observations[0], reordered.observations[1]] = [
      reordered.observations[1]!,
      reordered.observations[0]!
    ];
    rehash(reordered);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(reordered).success).toBe(false);

    const operation = fixture();
    semantic(operation, "SM07CS-01").operation.operation = "move-circle";
    rehash(operation);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(operation).success).toBe(false);

    const promoted = fixture();
    (promoted.decision as { releaseQualified: boolean }).releaseQualified = true;
    rehash(promoted);
    expect(r5NativeToolDiscoveryEvidenceSchema.safeParse(promoted).success).toBe(false);
  });
});
