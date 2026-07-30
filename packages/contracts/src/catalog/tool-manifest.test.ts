import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MATHCANVAS_MODULE_MANIFEST,
  MATHCANVAS_TOOL_MANIFEST,
  assertReleasedTool,
  assertUniqueReleasedToolEvidence,
  canTransitionToolSupport,
  defineToolManifestEntry
} from "./tool-manifest.js";
import {
  parseEvidenceFragment,
  resolveEvidenceFragment
} from "./evidence-reference.js";

describe("MathCanvas tool manifest", () => {
  it("live catalog의 46개 module과 하단 10개 항목을 정확히 덮는다", () => {
    const catalog = JSON.parse(
      readFileSync(
        new URL(
          "../../../../research/mathcanvas/tool-catalog.snapshot.json",
          import.meta.url
        ),
        "utf8"
      )
    ) as {
      tools: Array<{
        stableKey: string;
        observedName: string;
      }>;
    };
    expect(MATHCANVAS_MODULE_MANIFEST).toHaveLength(46);
    expect(MATHCANVAS_TOOL_MANIFEST).toHaveLength(56);
    expect(
      MATHCANVAS_TOOL_MANIFEST.map((entry) => ({
        stableKey: entry.stableKey,
        observedName: entry.observedName,
        categoryId: entry.categoryId,
        moduleKey: entry.moduleKey ?? null,
        surface: entry.surface
      })).sort((left, right) =>
        left.stableKey.localeCompare(right.stableKey)
      )
    ).toEqual(
      (
        catalog.tools as Array<{
          stableKey: string;
          observedName: string;
          categoryId: string;
          moduleKey?: string;
          surfaceKind: string;
        }>
      )
        .map((tool) => ({
          stableKey: tool.stableKey,
          observedName: tool.observedName,
          categoryId: tool.categoryId,
          moduleKey: tool.moduleKey ?? null,
          surface: tool.surfaceKind
        }))
        .sort((left, right) =>
          left.stableKey.localeCompare(right.stableKey)
        )
    );
    const matrix = JSON.parse(
      readFileSync(
        new URL(
          "../../../../research/mathcanvas/control-contract.matrix.json",
          import.meta.url
        ),
        "utf8"
      )
    ) as {
      toolMappings: Array<{
        controlId: string;
        integrationTarget: string;
      }>;
    };
    const integrationByTool = new Map(
      matrix.toolMappings.map((mapping) => [
        mapping.controlId,
        mapping.integrationTarget
      ])
    );
    for (const entry of MATHCANVAS_TOOL_MANIFEST) {
      expect(integrationByTool.get(entry.stableKey)).toBe(
        entry.integrationTarget
      );
    }
  });

  it("검증된 adapter만 released로 조회한다", () => {
    expect(assertReleasedTool("NO03FM").adapterKey).toBe(
      "fraction-model"
    );
    expect(assertReleasedTool("common.text").adapterKey).toBe("text");
    for (const entry of MATHCANVAS_TOOL_MANIFEST.filter(
      (candidate) => candidate.supportState === "released"
    )) {
      expect(entry.supportHistory.map((history) => history.state)).toEqual([
        "captured",
        "contracted",
        "verified",
        "released"
      ]);
      expect(entry.lifecycleEvidenceIds?.length).toBeGreaterThan(0);
      const stageEvidence = entry.supportHistory.flatMap(
        (history) => history.evidenceIds
      );
      expect(new Set(stageEvidence).size).toBe(stageEvidence.length);
    }
    expect(() => assertReleasedTool("NO01NR")).toThrow(
      "tool-not-released:NO01NR:captured"
    );
    for (const stableKey of [
      "common.point-line",
      "common.circle"
    ]) {
      const contracted = MATHCANVAS_TOOL_MANIFEST.find(
        (entry) => entry.stableKey === stableKey
      );
      expect(contracted?.supportState).toBe("contracted");
      expect(
        contracted?.supportHistory.map((history) => history.state)
      ).toEqual(["captured", "contracted"]);
      expect(() => assertReleasedTool(stableKey)).toThrow(
        `tool-not-released:${stableKey}:contracted`
      );
    }
    expect(() => assertReleasedTool("unknown")).toThrow(
      "unregistered-tool:unknown"
    );
  });

  it("support state를 한 단계씩만 올린다", () => {
    expect(canTransitionToolSupport("captured", "contracted")).toBe(true);
    expect(canTransitionToolSupport("captured", "verified")).toBe(false);
    expect(canTransitionToolSupport("contracted", "released")).toBe(false);
    expect(canTransitionToolSupport("released", "released")).toBe(true);
    expect(() =>
      defineToolManifestEntry({
        stableKey: "invalid",
        observedName: "잘못된 도구",
        surface: "math-palette",
        integrationTarget: "tool-adapter",
        supportState: "released",
        categoryId: "Unit01",
        moduleKey: "INVALID",
        nativeToolId: "INVALID",
        adapterKey: "invalid",
        evidenceIds: ["captured", "released"],
        lifecycleEvidenceIds: ["round-trip"],
        supportHistory: [
          { state: "captured", evidenceIds: ["captured"] },
          { state: "released", evidenceIds: ["released"] }
        ]
      })
    ).toThrow("skipped-tool-support-state:invalid");
  });

  it("서로 다른 support 단계가 같은 증거를 재사용하지 못한다", () => {
    expect(() =>
      defineToolManifestEntry({
        stableKey: "duplicate-evidence",
        observedName: "중복 증거 도구",
        surface: "math-palette",
        integrationTarget: "tool-adapter",
        supportState: "released",
        categoryId: "Unit01",
        moduleKey: "DUPLICATE",
        nativeToolId: "DUPLICATE",
        adapterKey: "duplicate",
        evidenceIds: ["capture", "contract", "round-trip"],
        lifecycleEvidenceIds: ["round-trip"],
        supportHistory: [
          { state: "captured", evidenceIds: ["capture"] },
          { state: "contracted", evidenceIds: ["contract"] },
          { state: "verified", evidenceIds: ["round-trip"] },
          { state: "released", evidenceIds: ["round-trip"] }
        ]
      })
    ).toThrow(
      "reused-tool-support-evidence:duplicate-evidence:round-trip"
    );
  });

  it("released 도구의 모든 evidence pointer가 실제 근거로 해석된다", () => {
    for (const entry of MATHCANVAS_TOOL_MANIFEST.filter(
      (candidate) => candidate.supportState === "released"
    )) {
      const evidenceIds = [
        ...entry.supportHistory.flatMap(
          (history) => history.evidenceIds
        ),
        ...(entry.lifecycleEvidenceIds ?? [])
      ];
      for (const evidenceId of evidenceIds) {
        const reference = parseEvidenceFragment(evidenceId);
        const document = JSON.parse(
          readFileSync(
            new URL(
              `../../../../${reference.filePath}`,
              import.meta.url
            ),
            "utf8"
          )
        ) as unknown;
        expect(
          resolveEvidenceFragment(document, reference.fragment),
          `${entry.stableKey}: ${evidenceId}`
        ).not.toBeUndefined();
      }
    }
  });

  it("captured를 포함한 manifest evidence pointer가 모두 해석된다", () => {
    for (const entry of MATHCANVAS_TOOL_MANIFEST) {
      for (const evidenceId of entry.evidenceIds) {
        const reference = parseEvidenceFragment(evidenceId);
        const document = JSON.parse(
          readFileSync(
            new URL(
              `../../../../${reference.filePath}`,
              import.meta.url
            ),
            "utf8"
          )
        ) as unknown;
        expect(
          resolveEvidenceFragment(document, reference.fragment),
          `${entry.stableKey}: ${evidenceId}`
        ).not.toBeUndefined();
      }
    }
  });

  it("서로 다른 도구가 같은 released 근거를 공유하지 못한다", () => {
    const source = MATHCANVAS_TOOL_MANIFEST.find(
      (entry) => entry.stableKey === "common.text"
    );
    expect(source).toBeDefined();
    if (!source) return;
    const duplicateEvidence = "shared-release-evidence";
    const withSharedEvidence = (stableKey: string) => ({
      ...source,
      stableKey,
      supportHistory: source.supportHistory.map((history) =>
        history.state === "released"
          ? { ...history, evidenceIds: [duplicateEvidence] }
          : history
      )
    });
    expect(() =>
      assertUniqueReleasedToolEvidence([
        withSharedEvidence("first"),
        withSharedEvidence("second")
      ])
    ).toThrow(
      "shared-released-tool-evidence:first:second:shared-release-evidence"
    );
  });
});
