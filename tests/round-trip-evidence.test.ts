import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  NATIVE_DRAW_SHAPE_CONTRACTS
} from "../packages/mathcanvas-compiler/src/adapters/native-draw-contracts.js";
// @ts-expect-error contract-lab은 제품 TypeScript graph 밖의 격리된 ESM이다.
import { buildWave1CanaryPayload, compareRoundTripValues, countWave1ToolObjects, countWave1ToolObjectsWithPolicy, normalizeRoundTripValue, validateWave1CanaryGoldenBinding } from "../scripts/contract-lab/lib/round-trip-evidence.mjs";
// @ts-expect-error contract-lab은 제품 TypeScript graph 밖의 격리된 ESM이다.
import { assertSavedPayloadDelta, assertSavedPenElementsDelta, assertSingleFractionMovement, comparableFromProjectPayload, validateWave1CanaryRecoveryEvidence, validateWave2CanaryEvidence } from "../scripts/contract-lab/lib/canary-evidence.mjs";

describe("round-trip evidence fail-closed 계산", () => {
  const wave2DeltaFixture = (newObjectCount: number) => {
    const golden = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/golden/fraction-comparison.p0-v1.json",
          import.meta.url
        ),
        "utf8"
      )
    ).results.compiledProject.payload;
    const newObjects = Array.from(
      { length: newObjectCount },
      (_, index) => ({
        id: `unknown-wire-${index + 1}`,
        svgId: `unobserved-${index + 1}`,
        type: `mystery-${index + 1}`,
        x: index,
        y: index,
        coordinates: [[index, index]]
      })
    );
    return {
      initial: comparableFromProjectPayload(golden),
      saved: {
        ...structuredClone(golden),
        canvasOption: {
          ...structuredClone(golden.canvasOption),
          isCaptured: true
        },
        contentsJson: [
          ...structuredClone(golden.contentsJson),
          ...newObjects
        ],
        contentsJsonLength:
          golden.contentsJson.length + newObjects.length
      },
      newObjects
    };
  };

  it("Wave 2 delta는 골든 불변과 신규 1~4개만 허용한다", () => {
    for (const count of [1, 4]) {
      const fixture = wave2DeltaFixture(count);
      expect(() =>
        assertSavedPayloadDelta({
          initialComparable: fixture.initial,
          savedPayload: fixture.saved,
          newObjectIds: fixture.newObjects.map(
            (object: { id: string }) => object.id
          ),
          movedObjectId: fixture.newObjects[0]!.id
        })
      ).not.toThrow();
    }
    for (const count of [0, 5]) {
      const fixture = wave2DeltaFixture(count);
      expect(() =>
        assertSavedPayloadDelta({
          initialComparable: fixture.initial,
          savedPayload: fixture.saved,
          newObjectIds: fixture.newObjects.map(
            (object: { id: string }) => object.id
          ),
          movedObjectId: fixture.newObjects[0]?.id ?? ""
        })
      ).toThrow("canary-save-object-delta-invalid");
    }
    const mutated = wave2DeltaFixture(1);
    mutated.saved.contentsJson[0].x += 1;
    expect(() =>
      assertSavedPayloadDelta({
        initialComparable: mutated.initial,
        savedPayload: mutated.saved,
        newObjectIds: [mutated.newObjects[0]!.id],
        movedObjectId: mutated.newObjects[0]!.id
      })
    ).toThrow("canary-save-mutated-initial-objects");

    const penFixture = wave2DeltaFixture(1);
    penFixture.initial.canvasOption.penElements = [
      {
        id: "p-authored-1",
        d: "M 100,100 L 120,120",
        stroke: "#000",
        strokeWidth: 1,
        isColor: false
      },
      {
        id: "p-authored-2",
        d: "M 200,200 L 220,220",
        stroke: "#000",
        strokeWidth: 1,
        isColor: false
      }
    ];
    const penSaved = structuredClone(penFixture.initial);
    penSaved.canvasOption.isCaptured = true;
    penSaved.canvasOption.penElements = [
      penFixture.initial.canvasOption.penElements[1],
      {
        id: "p-ui-1",
        d: "M 300,300 L 320,320",
        stroke: "#000",
        strokeWidth: "1",
        isColor: false
      }
    ];
    expect(() =>
      assertSavedPayloadDelta({
        initialComparable: penFixture.initial,
        savedPayload: penSaved,
        newObjectIds: [],
        movedObjectId: ""
      })
    ).toThrow("canary-save-has-unexpected-canvas-metadata-change");
    expect(
      assertSavedPenElementsDelta({
        initialComparable: penFixture.initial,
        savedPayload: penSaved,
        expectedPenStrokeIds: ["p-authored-2", "p-ui-1"]
      })
    ).toMatchObject({
      initialPenStrokeIds: [
        "p-authored-1",
        "p-authored-2"
      ],
      savedPenStrokeIds: ["p-authored-2", "p-ui-1"],
      penElementSummaries: [
        expect.objectContaining({
          fieldNames: [
            "d",
            "id",
            "isColor",
            "stroke",
            "strokeWidth"
          ]
        }),
        expect.objectContaining({
          fieldTypes: expect.objectContaining({
            strokeWidth: "string"
          })
        })
      ]
    });
  });

  it("Wave 2 delta는 미관찰 svgId와 type을 단정하지 않고 기록한다", () => {
    const fixture = wave2DeltaFixture(1);
    const result = assertSavedPayloadDelta({
      initialComparable: fixture.initial,
      savedPayload: fixture.saved,
      newObjectIds: [fixture.newObjects[0]!.id],
      movedObjectId: fixture.newObjects[0]!.id
    });

    expect(result.wireSummaries).toEqual([
      expect.objectContaining({
        objectId: "unknown-wire-1",
        wireSvgId: "unobserved-1",
        wireType: "mystery-1"
      })
    ]);
  });

  it("Wave 2 metadata 거부는 값 없이 필드 shape만 기록한다", () => {
    const fixture = wave2DeltaFixture(1);
    fixture.initial.projectTitle = "a".repeat(88);
    fixture.initial.studyLevel = "elementary";
    fixture.initial.tags = ["x", "y", "z"];
    fixture.saved.projectTitle = "a".repeat(85);
    fixture.saved.studyLevel = null;
    fixture.saved.tags = ["x", "y"];

    expect(() =>
      assertSavedPayloadDelta({
        initialComparable: fixture.initial,
        savedPayload: fixture.saved,
        newObjectIds: [fixture.newObjects[0]!.id],
        movedObjectId: fixture.newObjects[0]!.id
      })
    ).toThrow(
      "canary-save-mutated-project-metadata:projectTitle:string(88)->string(85),studyLevel:string(10)->null,tags:array(3)->array(2)"
    );

    const derived = wave2DeltaFixture(1);
    derived.saved.tags = ["NO03FM"];
    expect(
      assertSavedPayloadDelta({
        initialComparable: derived.initial,
        savedPayload: derived.saved,
        newObjectIds: [derived.newObjects[0]!.id],
        movedObjectId: derived.newObjects[0]!.id
      }).derivedModuleIndexTags
    ).toEqual({
      relation: "module-index-derived-from-saved-contents",
      submittedTagCount: 3,
      savedTagCount: 1
    });
  });

  it("비유한 수와 임의 허용 오차를 거부한다", () => {
    expect(
      compareRoundTripValues({ value: Number.NaN }, { value: 5 })
    ).toMatchObject({
      normalizedEqual: false,
      unexpectedDifferenceCount: 1
    });
    expect(() =>
      compareRoundTripValues({ value: 1 }, { value: 1 }, 1)
    ).toThrow("unsupported-round-trip-tolerance");
  });

  it("소수점 정규화의 안전 정수 범위를 넘지 않는다", () => {
    expect(() => normalizeRoundTripValue(10_000)).toThrow(
      "round-trip-number-out-of-safe-range"
    );
    expect(normalizeRoundTripValue(2_900.0000000000005)).toBe(
      2_900.000000000001
    );
  });

  it("분수 모형을 감싸는 group-element도 같은 도구에 귀속한다", () => {
    const contents = [
      { id: "fraction", svgId: "NO03FM-08" },
      {
        id: "fraction-group",
        svgId: "group-element",
        ids: ["fraction"]
      },
      { id: "text", svgId: "input-text" },
      { id: "formula", svgId: "math-latex" },
      { id: "rectangle", svgId: "drawElem" }
    ];
    const current = countWave1ToolObjects(contents);
    const legacy = countWave1ToolObjectsWithPolicy(contents, {
      allowLegacyFractionGroups: true
    });

    expect(current.counts.get("NO03FM")).toBe(1);
    expect(current.unclassifiedObjectCount).toBe(1);
    expect(legacy.counts.get("NO03FM")).toBe(2);
    expect(legacy.unclassifiedObjectCount).toBe(0);
  });

  it("canary payload를 현재 골든과 고정 제목 overlay에 결속한다", () => {
    const golden = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/golden/fraction-comparison.p0-v1.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const runId = "20260729T101500Z";
    const payload = buildWave1CanaryPayload(
      golden.results.compiledProject.payload,
      runId
    );

    expect(
      validateWave1CanaryGoldenBinding({
        goldenPayload: golden.results.compiledProject.payload,
        expectedGoldenPayloadHash: golden.invariants.payloadHash,
        submittedPayload: payload,
        runId
      })
    ).toMatchObject({
      goldenPayloadHash: golden.invariants.payloadHash,
      submittedObjectCount: 59
    });
    expect(payload.projectTitle).toMatch(
      /^AI-CONTRACT-PROBE-20260729T101500Z · /
    );
    expect(() =>
      validateWave1CanaryGoldenBinding({
        goldenPayload: golden.results.compiledProject.payload,
        expectedGoldenPayloadHash: golden.invariants.payloadHash,
        submittedPayload: {
          ...payload,
          contentsJson: payload.contentsJson.slice(0, 4)
        },
        runId
      })
    ).toThrow("canary-payload-not-derived-from-golden");
  });

  it("canary 저장은 분수 한 개의 위치와 저장 lifecycle metadata만 허용한다", () => {
    const golden = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/golden/fraction-comparison.p0-v1.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const initial = buildWave1CanaryPayload(
      golden.results.compiledProject.payload,
      "20260729T101500Z"
    );
    const saved = structuredClone(initial);
    const fractionIndex = saved.contentsJson.findIndex(
      (object: { svgId?: string }) =>
        object.svgId?.startsWith("NO03FM-")
    );
    expect(fractionIndex).toBeGreaterThanOrEqual(0);
    saved.canvasOption.isCaptured = true;
    saved.contentsJsonLength = saved.contentsJson.length;
    saved.contentsJson[fractionIndex].x += 60;
    saved.contentsJson[fractionIndex]._x += 60;
    saved.contentsJson[fractionIndex].y += 20;
    saved.contentsJson[fractionIndex]._y += 20;

    expect(
      assertSingleFractionMovement({
        initialComparable: initial,
        savedPayload: saved,
        targetObjectId: saved.contentsJson[fractionIndex].id
      })
    ).toMatchObject({
      changedObjectIds: [saved.contentsJson[fractionIndex].id],
      changedFields: ["_x", "_y", "x", "y"],
      delta: { _x: 60, _y: 20, x: 60, y: 20 },
      automaticSaveMetadataFields: [
        "canvasOption.isCaptured"
      ]
    });

    const unsafe = structuredClone(saved);
    const otherIndex = fractionIndex === 0 ? 1 : 0;
    unsafe.contentsJson[otherIndex].unexpectedProbeMutation = true;
    expect(() =>
      assertSingleFractionMovement({
        initialComparable: initial,
        savedPayload: unsafe,
        targetObjectId: saved.contentsJson[fractionIndex].id
      })
    ).toThrow("canary-save-must-change-one-target");

    const offCanvas = structuredClone(saved);
    offCanvas.canvasOption.viewBox = [-9000, -9000, 1, 1];
    expect(() =>
      assertSingleFractionMovement({
        initialComparable: initial,
        savedPayload: offCanvas,
        targetObjectId: saved.contentsJson[fractionIndex].id
      })
    ).toThrow("canary-save-has-unexpected-canvas-metadata-change");

    const cornerOnly = structuredClone(saved);
    cornerOnly.canvasOption.viewBox = [2400, 2900, 240, 290];
    expect(() =>
      assertSingleFractionMovement({
        initialComparable: initial,
        savedPayload: cornerOnly,
        targetObjectId: saved.contentsJson[fractionIndex].id
      })
    ).toThrow("canary-save-has-unexpected-canvas-metadata-change");
  });

  it("recovery mutation 실패를 opaque crash 대신 구조화된 issue로 반환한다", () => {
    const golden = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/golden/fraction-comparison.p0-v1.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const evidence = JSON.parse(
      readFileSync(
        new URL(
          "../research/mathcanvas/wave1-current-golden-canary.roundtrip.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const artifacts = JSON.parse(
      readFileSync(
        new URL(
          "../research/mathcanvas/wave1-current-golden-canary.artifacts.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const target = artifacts.reconstructedSavedPayload.contentsJson.find(
      (object: { id?: string }) =>
        object.id === evidence.interaction.targetObjectId
    );
    target.fill = "#000000";

    expect(() =>
      validateWave1CanaryRecoveryEvidence({
        evidence,
        artifacts,
        goldenFixture: golden
      })
    ).not.toThrow();
    const validation = validateWave1CanaryRecoveryEvidence({
      evidence,
      artifacts,
      goldenFixture: golden
    });
    expect(validation.ok).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "recalculation" }),
        expect.objectContaining({ path: "interaction" })
      ])
    );

    const missingFieldEvidence = structuredClone(evidence);
    delete missingFieldEvidence.roundTrip.reconstructionConsistency;
    expect(() =>
      validateWave1CanaryRecoveryEvidence({
        evidence: missingFieldEvidence,
        artifacts,
        goldenFixture: golden
      })
    ).not.toThrow();
    expect(
      validateWave1CanaryRecoveryEvidence({
        evidence: missingFieldEvidence,
        artifacts,
        goldenFixture: golden
      }).issues
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "roundTrip.reconstructionConsistency"
        })
      ])
    );
  });

  it("Wave 2 공통 draw 증거를 artifact에서 재계산한다", () => {
    const golden = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/golden/fraction-comparison.p0-v1.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const evidence = JSON.parse(
      readFileSync(
        new URL(
          "../research/mathcanvas/wave2-common-draw-canary.roundtrip.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const artifacts = JSON.parse(
      readFileSync(
        new URL(
          "../research/mathcanvas/wave2-common-draw-canary.artifacts.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    const createCheckpoint = JSON.parse(
      readFileSync(
        new URL(
          "../research/mathcanvas/wave2-common-draw-canary.create-checkpoint.json",
          import.meta.url
        ),
        "utf8"
      )
    );

    expect(
      validateWave2CanaryEvidence({
        evidence,
        artifacts,
        createCheckpoint,
        goldenFixture: golden
      })
    ).toEqual({ ok: true, issues: [] });

    const initialIds = new Set(
      artifacts.initialReopenedComparable.contentsJson.map(
        (object: { id: string }) => object.id
      )
    );
    const newObjects =
      artifacts.finalReopenedComparable.contentsJson.filter(
        (object: { id: string }) => !initialIds.has(object.id)
      );
    for (const contract of NATIVE_DRAW_SHAPE_CONTRACTS.filter(
      (candidate) =>
        candidate.stableKey === "common.circle" ||
        candidate.stableKey === "common.point-line"
    )) {
      const observed = newObjects.filter(
        (object: { type: string }) =>
          new Set<string>(contract.wireTypes).has(object.type)
      );
      expect(
        observed.map((object: { type: string }) => object.type).sort()
      ).toEqual([...contract.wireTypes].sort());
      for (const object of observed) {
        expect(object.svgId).toBe(contract.wireSvgId);
        for (const field of contract.authoritativeGeometryFields) {
          expect(object).toHaveProperty(field);
        }
        for (const field of contract.absentGeometryFields) {
          expect(object).not.toHaveProperty(field);
        }
        expect(object).toMatchObject(
          contract.sessionObservedDefaults ?? {}
        );
      }
    }

    const mutatedEvidence = structuredClone(evidence);
    mutatedEvidence.discovery.wireObservations[0].wireType = "rect";
    expect(
      validateWave2CanaryEvidence({
        evidence: mutatedEvidence,
        artifacts,
        createCheckpoint,
        goldenFixture: golden
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "wireContract" })
      ])
    });

    const failedCheckpoint = structuredClone(createCheckpoint);
    failedCheckpoint.network.allowedWrites[0].status = 500;
    expect(
      validateWave2CanaryEvidence({
        evidence,
        artifacts,
        createCheckpoint: failedCheckpoint,
        goldenFixture: golden
      })
    ).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: "creationCheckpoint"
        })
      ])
    });
  });
});
