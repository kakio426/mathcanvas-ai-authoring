import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertStudentOneScreenGeometryProfileBinding,
  editorGeometryEvidenceSchema,
  studentOneScreenGeometryProfileContentHash,
  studentOneScreenGeometryProfileSchema
} from "./editor-geometry-v1.js";
import { sha256Hex } from "../hash.js";

const evidencePath = resolve(
  process.cwd(),
  "research/mathcanvas/editor-geometry-evidence.json"
);
const profilePath = resolve(
  process.cwd(),
  "research/mathcanvas/student-one-screen-geometry-profile.json"
);
const manifestPath = resolve(
  process.cwd(),
  "research/mathcanvas/editor-geometry-manifest.json"
);

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fileSha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function evidenceFixture() {
  return readJson(evidencePath);
}

function profileFixture() {
  return readJson(profilePath);
}

function coherentTranslateEvidence(value: any, deltaCssPx: number) {
  for (const key of [
    "initialFirst",
    "initialSecond",
    "selectedFirst",
    "selectedSecond"
  ]) {
    const sample = value.stability[key];
    sample.canvas.ctm.e += deltaCssPx;
    sample.canvas.inverse.e = -sample.canvas.ctm.e / sample.canvas.ctm.a;
    sample.canvas.cornerResidualCssPx = 0;
    sample.calibration.projectedCssBox.x += deltaCssPx;
    sample.calibration.renderedBorderBox.x += deltaCssPx;
  }
  const inverseX = (cssX: number) =>
    (cssX - value.stability.initialSecond.canvas.ctm.e) /
    value.stability.initialSecond.canvas.ctm.a;
  value.derived.fixedSafeCanvas.x = inverseX(value.derived.fixedSafeCss.x);
  value.derived.singleReferenceInteractionDiagnostic.interactionSafeCanvas.x =
    inverseX(
      value.derived.singleReferenceInteractionDiagnostic.interactionSafeCss.x
    );
}

function transformBounds(matrix: any, bounds: any) {
  const points = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height]
  ].map(([x, y]) => ({
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f
  }));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function rederiveSafeRects(value: any) {
  const initial = value.stability.initialSecond;
  const selected = value.stability.selectedSecond;
  const fixed = initial.fixedChrome;
  const guard = value.derived.guardCssPx;
  const fixedSafeCss = {
    x: fixed.left.bounds.x + fixed.left.bounds.width + guard,
    y: fixed.top.bounds.y + fixed.top.bounds.height + guard,
    width:
      fixed.right.bounds.x -
      guard -
      (fixed.left.bounds.x + fixed.left.bounds.width + guard),
    height:
      fixed.bottom.bounds.y -
      guard -
      (fixed.top.bounds.y + fixed.top.bounds.height + guard)
  };
  const dynamicTop = selected.dynamicChrome.boxes[0].bounds.y;
  const interactionSafeCss = {
    ...fixedSafeCss,
    height:
      Math.min(fixed.bottom.bounds.y - guard, dynamicTop - guard) -
      fixedSafeCss.y
  };
  value.derived.fixedSafeCss = fixedSafeCss;
  value.derived.fixedSafeCanvas = transformBounds(
    initial.canvas.inverse,
    fixedSafeCss
  );
  value.derived.singleReferenceInteractionDiagnostic.interactionSafeCss =
    interactionSafeCss;
  value.derived.singleReferenceInteractionDiagnostic.interactionSafeCanvas =
    transformBounds(initial.canvas.inverse, interactionSafeCss);
}

describe("R3 editor geometry evidence와 R4 offline profile seam", () => {
  it("actual evidence·screenshots·asset·profile을 독립 manifest SHA에 결속한다", () => {
    const evidence = editorGeometryEvidenceSchema.parse(evidenceFixture());
    const profile = studentOneScreenGeometryProfileSchema.parse(
      profileFixture()
    );
    const manifest = readJson(manifestPath);

    expect(fileSha256(evidencePath)).toBe(
      manifest.sanitizedEvidenceSha256
    );
    expect(fileSha256(profilePath)).toBe(manifest.profileFileSha256);
    expect(evidence.evidenceId).toBe(manifest.evidenceId);
    expect(evidence.observedAt).toBe(manifest.observedAt);
    expect(evidence.provenance.rawSha256).toBe(manifest.rawSha256);
    expect(evidence.provenance.initialScreenshotSha256).toBe(
      manifest.initialScreenshotSha256
    );
    expect(evidence.provenance.selectedScreenshotSha256).toBe(
      manifest.selectedScreenshotSha256
    );
    expect(evidence.provenance.assetFingerprint.aggregateSha256).toBe(
      manifest.assetAggregateSha256
    );
    expect(profile.contentSha256).toBe(manifest.profileContentSha256);
    expect(evidence.environment.zoomObservation).toBe(
      manifest.zoomObservation
    );
    expect(evidence.interactionReference.coverage).toBe(
      manifest.interactionReferenceCoverage
    );
    expect(evidence.interactionReference.observedSelectedCount).toBe(
      manifest.observedSelectedCount
    );
    expect(evidence.eligibility.fixedGeometryInputReady).toBe(
      manifest.fixedGeometryInputReady
    );
    expect(evidence.eligibility.interactionGeometryInputReady).toBe(
      manifest.interactionGeometryInputReady
    );
    expect(evidence.eligibility.blockers).toContain(
      manifest.interactionBlocker
    );
    expect(
      assertStudentOneScreenGeometryProfileBinding(
        profile,
        evidence,
        manifest.sanitizedEvidenceSha256
      )
    ).toBe(true);
  });

  it("fixed safe rect와 단일 selected reference 진단을 8px guard로 분리한다", () => {
    const evidence = editorGeometryEvidenceSchema.parse(evidenceFixture());
    expect(evidence.derived.fixedSafeCss).toEqual({
      x: 240,
      y: 64,
      width: 976,
      height: 672
    });
    expect(
      evidence.derived.singleReferenceInteractionDiagnostic
        .interactionSafeCss
    ).toEqual({
      x: 240,
      y: 64,
      width: 976,
      height: 616
    });
    expect(
      evidence.stability.selectedSecond.dynamicChrome.boxes[0]?.bounds.y
    ).toBe(688);
    expect(evidence.eligibility).toMatchObject({
      fixedGeometryInputReady: true,
      interactionGeometryInputReady: false,
      blockers: ["affordance-family-dynamic-chrome-coverage-pending"]
    });
  });

  it("dynamic overlay 누락·guard 0·chrome role swap·safe rect 겹침을 차단한다", () => {
    const mutations = [
      (value: any) => {
        value.stability.selectedFirst.dynamicChrome.boxes = [];
        value.stability.selectedSecond.dynamicChrome.boxes = [];
      },
      (value: any) => {
        value.derived.guardCssPx = 0;
      },
      (value: any) => {
        value.stability.initialFirst.fixedChrome.top.selector =
          "#left-toolbar";
        value.stability.initialSecond.fixedChrome.top.selector =
          "#left-toolbar";
      },
      (value: any) => {
        value.derived.singleReferenceInteractionDiagnostic.interactionSafeCss.height =
          680;
      }
    ];
    for (const mutate of mutations) {
      const value = evidenceFixture();
      mutate(value);
      expect(editorGeometryEvidenceSchema.safeParse(value).success).toBe(false);
    }
  });

  it("singular·nonuniform·translation 누락·corner residual CTM 우회를 차단한다", () => {
    const mutations = [
      (value: any) => {
        value.stability.initialFirst.canvas.ctm.a = 0;
        value.stability.initialSecond.canvas.ctm.a = 0;
      },
      (value: any) => {
        value.stability.initialFirst.canvas.ctm.d = 0.7;
        value.stability.initialSecond.canvas.ctm.d = 0.7;
      },
      (value: any) => {
        value.stability.initialFirst.canvas.ctm.e = 0;
        value.stability.initialSecond.canvas.ctm.e = 0;
      },
      (value: any) => {
        value.stability.initialFirst.canvas.cornerResidualCssPx = 1;
        value.stability.initialSecond.canvas.cornerResidualCssPx = 1;
      }
    ];
    for (const mutate of mutations) {
      const value = evidenceFixture();
      mutate(value);
      expect(editorGeometryEvidenceSchema.safeParse(value).success).toBe(false);
    }
  });

  it("coherent CTM translation과 selected fixed chrome drift도 직접 재계산해 차단한다", () => {
    const translated = evidenceFixture();
    coherentTranslateEvidence(translated, 10);
    expect(editorGeometryEvidenceSchema.safeParse(translated).success).toBe(
      false
    );

    const selectedFixedDrift = evidenceFixture();
    selectedFixedDrift.stability.selectedFirst.fixedChrome.bottom.bounds.y =
      700;
    selectedFixedDrift.stability.selectedSecond.fixedChrome.bottom.bounds.y =
      700;
    expect(
      editorGeometryEvidenceSchema.safeParse(selectedFixedDrift).success
    ).toBe(false);
  });

  it("fixed chrome과 파생 safe rect를 함께 화면 밖으로 옮겨도 차단한다", () => {
    for (const [role, key, value] of [
      ["left", "x", -300],
      ["top", "y", -100],
      ["right", "x", 1400]
    ] as const) {
      const offscreen = evidenceFixture();
      for (const sampleName of [
        "initialFirst",
        "initialSecond",
        "selectedFirst",
        "selectedSecond"
      ]) {
        offscreen.stability[sampleName].fixedChrome[role].bounds[key] = value;
      }
      rederiveSafeRects(offscreen);
      expect(
        editorGeometryEvidenceSchema.safeParse(offscreen).success
      ).toBe(false);
    }
  });

  it("흰 dynamic toolbar·signature drift·arbitrary inflation을 차단한다", () => {
    const whiteToolbar = evidenceFixture();
    for (const key of ["selectedFirst", "selectedSecond"]) {
      const dynamic = whiteToolbar.stability[key].dynamicChrome;
      dynamic.boxes[0].signature.backgroundColor = "rgb(255, 255, 255)";
      dynamic.boxes[0].signature.backgroundAlpha = 1;
      dynamic.boxes[0].signature.perceivedLuminance = 255;
      dynamic.chosenSignatureSha256 = sha256Hex(dynamic.boxes[0]);
    }
    expect(
      editorGeometryEvidenceSchema.safeParse(whiteToolbar).success
    ).toBe(false);

    const inflationDrift = evidenceFixture();
    for (const key of [
      "initialFirst",
      "initialSecond",
      "selectedFirst",
      "selectedSecond"
    ]) {
      inflationDrift.stability[key].calibration.inflationCssPx.left = 100;
    }
    expect(
      editorGeometryEvidenceSchema.safeParse(inflationDrift).success
    ).toBe(false);

    const wrongReference = evidenceFixture();
    wrongReference.interactionReference.affordanceFamilyId =
      "native-array-model-v1";
    expect(
      editorGeometryEvidenceSchema.safeParse(wrongReference).success
    ).toBe(false);

    const candidateDrift = evidenceFixture();
    candidateDrift.stability.selectedFirst.dynamicChrome.deduplicatedCandidateCount =
      2;
    candidateDrift.stability.selectedSecond.dynamicChrome.deduplicatedCandidateCount =
      2;
    expect(
      editorGeometryEvidenceSchema.safeParse(candidateDrift).success
    ).toBe(false);

    const selectedCountDrift = evidenceFixture();
    selectedCountDrift.stability.selectedFirst.editorState.selectedCount = 1;
    selectedCountDrift.stability.selectedSecond.editorState.selectedCount = 1;
    expect(
      editorGeometryEvidenceSchema.safeParse(selectedCountDrift).success
    ).toBe(false);
  });

  it("rendered effective scale을 coordinate CTM에 주입하거나 asset·zoom·sidebar를 바꾸면 실패한다", () => {
    const mutations = [
      (value: any) => {
        const scale =
          value.stability.initialSecond.calibration.effectiveScaleX;
        value.stability.initialFirst.canvas.ctm.a = scale;
        value.stability.initialSecond.canvas.ctm.a = scale;
      },
      (value: any) => {
        value.provenance.assetFingerprint.records[0].sha256 = "0".repeat(64);
      },
      (value: any) => {
        value.stability.initialFirst.editorState.storeScale = 6;
        value.stability.initialSecond.editorState.storeScale = 6;
      },
      (value: any) => {
        value.environment.sidebarState = "collapsed";
      }
    ];
    for (const mutate of mutations) {
      const value = evidenceFixture();
      mutate(value);
      expect(editorGeometryEvidenceSchema.safeParse(value).success).toBe(false);
    }
  });

  it("profile은 browser가 아니라 evidence SHA·full CTM·safe rect만 offline 입력으로 받는다", () => {
    const evidence = editorGeometryEvidenceSchema.parse(evidenceFixture());
    const manifest = readJson(manifestPath);
    const staleEvidence = profileFixture();
    staleEvidence.evidenceFileSha256 = "f".repeat(64);
    const { contentSha256: _staleHash, ...staleBody } = staleEvidence;
    staleEvidence.contentSha256 =
      studentOneScreenGeometryProfileContentHash(staleBody);
    const parsedStale = studentOneScreenGeometryProfileSchema.parse(
      staleEvidence
    );
    expect(() =>
      assertStudentOneScreenGeometryProfileBinding(
        parsedStale,
        evidence,
        manifest.sanitizedEvidenceSha256
      )
    ).toThrow("student-one-screen-geometry-profile-drift");

    const missingTranslation = profileFixture();
    missingTranslation.transform.ctm.e = 0;
    const { contentSha256: _translationHash, ...translationBody } =
      missingTranslation;
    missingTranslation.contentSha256 =
      studentOneScreenGeometryProfileContentHash(translationBody);
    expect(
      studentOneScreenGeometryProfileSchema.safeParse(missingTranslation)
        .success
    ).toBe(false);

    const offscreenProfile = profileFixture();
    offscreenProfile.fixedSafeCss.x = -10;
    offscreenProfile.fixedSafeCanvas = transformBounds(
      offscreenProfile.transform.inverse,
      offscreenProfile.fixedSafeCss
    );
    const { contentSha256: _offscreenHash, ...offscreenBody } =
      offscreenProfile;
    offscreenProfile.contentSha256 =
      studentOneScreenGeometryProfileContentHash(offscreenBody);
    expect(
      studentOneScreenGeometryProfileSchema.safeParse(offscreenProfile)
        .success
    ).toBe(false);
  });
});
