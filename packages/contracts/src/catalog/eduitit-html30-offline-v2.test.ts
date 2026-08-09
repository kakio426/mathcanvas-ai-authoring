import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../hash.js";
import {
  eduititHtml30OfflineDesignV2Schema,
  type EduititHtml30OfflineDesignV2
} from "./eduitit-html30-offline-v2.js";

function artifact(): EduititHtml30OfflineDesignV2 {
  return eduititHtml30OfflineDesignV2Schema.parse(
    JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          "research/mathcanvas/eduitit-html30-v2-offline-design.json"
        ),
        "utf8"
      )
    )
  );
}

function rehash(
  candidate: EduititHtml30OfflineDesignV2
): EduititHtml30OfflineDesignV2 {
  const { contentSha256: _contentSha256, ...body } = candidate;
  return {
    ...candidate,
    contentSha256: sha256Hex(body)
  };
}

describe("Eduitit HTML30 V2 offline design artifact", () => {
  it("현재 source-bound 30개 산출물을 받는다", () => {
    const current = artifact();
    expect(current.activities).toHaveLength(30);
    expect(current.reserves).toHaveLength(30);
    expect(current.layouts).toHaveLength(30);
    expect(current.attestation.minimumEdgeClearanceCssPx).toBeGreaterThanOrEqual(12);
    expect(current.attestation.canonicalPayloadsGenerated).toBe(false);
    expect(current.attestation.releaseQualified).toBe(false);
  });

  it("60%·다중 문제·외부 쓰기 승격을 다시 넣으면 거부한다", () => {
    const zoom = structuredClone(artifact());
    (zoom.activities[0]!.layoutIntent.mathCanvasZoomPercent as number) = 60;
    expect(eduititHtml30OfflineDesignV2Schema.safeParse(zoom).success).toBe(false);

    const count = structuredClone(artifact());
    (count.activities[0]!.layoutIntent.problemCount as number) = 2;
    expect(eduititHtml30OfflineDesignV2Schema.safeParse(count).success).toBe(false);

    const write = structuredClone(artifact());
    (write.attestation.externalWriteAllowed as boolean) = true;
    expect(eduititHtml30OfflineDesignV2Schema.safeParse(write).success).toBe(false);
  });

  it("activity와 다른 reserve를 넣고 전체 hash를 다시 계산해도 거부한다", () => {
    const candidate = structuredClone(artifact());
    candidate.reserves[0] = structuredClone(candidate.reserves[1]!);
    expect(
      eduititHtml30OfflineDesignV2Schema.safeParse(rehash(candidate)).success
    ).toBe(false);
  });

  it("실제 placement와 다른 최소 여백을 주장하고 다시 hash해도 거부한다", () => {
    const candidate = structuredClone(artifact());
    candidate.attestation.minimumEdgeClearanceCssPx += 1;
    expect(
      eduititHtml30OfflineDesignV2Schema.safeParse(rehash(candidate)).success
    ).toBe(false);
  });

  it("canonical group의 사전 결속을 풀면 거부한다", () => {
    const candidate = structuredClone(artifact());
    const grouped = candidate.activities
      .flatMap((activity) => activity.nativePlan.movableUnits)
      .find((unit) => unit.representation.kind === "canonical-native-group");
    if (!grouped || grouped.representation.kind !== "canonical-native-group") {
      throw new Error("test canonical group fixture missing");
    }
    (grouped.representation.membersMoveAsOne as boolean) = false;
    expect(eduititHtml30OfflineDesignV2Schema.safeParse(candidate).success).toBe(false);
  });
});
