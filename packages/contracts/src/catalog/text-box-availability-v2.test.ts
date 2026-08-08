import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertTextBoxAvailabilityProbeBinding,
  textBoxFontFingerprint,
  textBoxAvailabilityProbeSchema
} from "./text-box-availability-v2.js";

function fixture() {
  return JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "research/mathcanvas/text-box-availability-probe.json"
      ),
      "utf8"
    )
  );
}

function fixturePath() {
  return resolve(
    process.cwd(),
    "research/mathcanvas/text-box-availability-probe.json"
  );
}

function manifest() {
  return JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "research/mathcanvas/text-box-availability-manifest.json"
      ),
      "utf8"
    )
  );
}

function completedDirectFixture() {
  const direct = fixture();
  direct.sourceEvidence.sourceKind = "dedicated-editor-diagnostics";
  direct.environment.viewport = "1280x800";
  direct.query.status = "completed";
  direct.query.selectorCounts = {
    "svg text": 1,
    "svg foreignObject": 0,
    input: 0,
    textarea: 0,
    contenteditable: 0,
    "math-field": 0
  };
  direct.query.visibleSelectorCounts = { ...direct.query.selectorCounts };
  direct.query.candidateTagCounts = { text: 1 };
  direct.query.directTextBoxTags = ["text"];
  direct.query.directTextBoxCount = 1;
  direct.query.visibleBounds = [
    {
      selector: "svg#outermost text",
      tag: "text",
      bounds: { x: 10, y: 10, width: 80, height: 32 },
      fontSamples: [{
        family: "Pretendard",
        size: "28px",
        weight: "400",
        lineHeight: "normal"
      }],
      textLength: 4
    }
  ];
  direct.query.selectorCounts["svg text"] = 1;
  direct.query.visibleSelectorCounts["svg text"] = 1;
  direct.query.groupWrapperCount = 22;
  direct.query.groupTextCount = 14;
  direct.query.canvasRoot = {
    selector: "svg#outermost",
    tag: "svg",
    id: "outermost",
    bounds: { x: 0, y: 0, width: 1280, height: 800 }
  };
  direct.decision.status = "resolved";
  direct.decision.directTextBoxQueryable = true;
  direct.decision.fallback = "dom-svg-text-box";
  direct.fontFingerprint = textBoxFontFingerprint(
    direct.query.visibleBounds.flatMap(
      (bound: { fontSamples: Array<{
        family: string;
        size: string;
        weight: string;
        lineHeight: string;
      }> }) => bound.fontSamples
    )
  );
  return direct;
}

function pendingFixture() {
  const pending = fixture();
  pending.sourceEvidence.sourceKind = "editor-diagnostics-context";
  pending.environment.viewport = null;
  pending.query.status = "pending-exact-selector-probe";
  pending.query.selectorCounts = null;
  pending.query.visibleSelectorCounts = null;
  pending.query.candidateTagCounts = {};
  pending.query.directTextBoxTags = [];
  pending.query.directTextBoxCount = null;
  pending.query.visibleBounds = [];
  pending.query.canvasRoot = null;
  pending.query.groupWrapperCount = null;
  pending.query.groupTextCount = null;
  pending.decision.status = "pending-exact-selector-probe";
  pending.decision.directTextBoxQueryable = null;
  pending.decision.fallback = "pending-exact-selector-probe";
  pending.fontFingerprint = null;
  return pending;
}

describe("R3 text box availability contract", () => {
  it("실제 editor probe를 exact manifest와 DOM/SVG 결정에 결속한다", () => {
    const result = textBoxAvailabilityProbeSchema.parse(fixture());
    const pinned = manifest();
    const fixtureSha = createHash("sha256")
      .update(readFileSync(fixturePath()))
      .digest("hex");
    expect(fixtureSha).toBe(pinned.sanitizedEvidenceSha256);
    expect(result.probeId).toBe(pinned.probeId);
    expect(result.observedAt).toBe(pinned.observedAt);
    expect(result.sourceEvidence.sourceKind).toBe(pinned.sourceKind);
    expect(result.sourceEvidence.rawSha256).toBe(pinned.rawSha256);
    expect(result.sourceEvidence.screenshotSha256).toBe(
      pinned.rawScreenshotSha256
    );
    expect(result.environment.editorPath).toBe(pinned.editorPath);
    expect(result.query.selector).toBe(pinned.selector);
    expect(result.decision.status).toBe(pinned.decisionStatus);
    expect(result.sourceEvidence.sourceKind).toBe(
      "dedicated-editor-diagnostics"
    );
    expect(result.environment.viewport).toBe("1280x800");
    expect(result.query.status).toBe("completed");
    expect(result.query.directTextBoxCount).toBe(15);
    expect(result.query.directTextBoxTags).toEqual(["foreignobject"]);
    expect(result.decision.status).toBe("resolved");
    expect(result.decision.fallback).toBe("dom-svg-text-box");
    expect(result.decision.directTextBoxQueryable).toBe(true);
    expect(result.decision.liveMeasurementAllowed).toBe(false);
  });

  it("pending probe에서 0/true·live measurement·임의 fallback을 차단한다", () => {
    const queryable = pendingFixture();
    queryable.decision.directTextBoxQueryable = true;
    expect(textBoxAvailabilityProbeSchema.safeParse(queryable).success).toBe(
      false
    );

    const liveMeasurement = pendingFixture();
    liveMeasurement.decision.liveMeasurementAllowed = true;
    expect(
      textBoxAvailabilityProbeSchema.safeParse(liveMeasurement).success
    ).toBe(false);

    const fakeFallback = pendingFixture();
    fakeFallback.decision.fallback = "font-fingerprint-conservative";
    expect(textBoxAvailabilityProbeSchema.safeParse(fakeFallback).success).toBe(
      false
    );
  });

  it("completed direct evidence는 count·tag·bounds와 DOM 결정에 biconditional로 결속된다", () => {
    const direct = completedDirectFixture();
    expect(textBoxAvailabilityProbeSchema.safeParse(direct).success).toBe(true);

    direct.query.directTextBoxCount = 0;
    expect(textBoxAvailabilityProbeSchema.safeParse(direct).success).toBe(false);
  });

  it("font fingerprint는 foreignObject의 실제 text-bearing descendant style에서 파생된다", () => {
    const actual = fixture();
    expect(textBoxAvailabilityProbeSchema.safeParse(actual).success).toBe(true);
    expect(actual.query.visibleBounds[3].fontSamples[0].size).toBe("45px");

    actual.query.visibleBounds[3].fontSamples[0].size = "16px";
    expect(textBoxAvailabilityProbeSchema.safeParse(actual).success).toBe(
      false
    );

    const duplicateStyle = completedDirectFixture();
    duplicateStyle.query.visibleBounds[0].fontSamples.push(
      structuredClone(duplicateStyle.query.visibleBounds[0].fontSamples[0])
    );
    duplicateStyle.fontFingerprint = textBoxFontFingerprint(
      duplicateStyle.query.visibleBounds.flatMap(
        (bound: { fontSamples: Array<{
          family: string;
          size: string;
          weight: string;
          lineHeight: string;
        }> }) => bound.fontSamples
      )
    );
    expect(
      textBoxAvailabilityProbeSchema.safeParse(duplicateStyle).success
    ).toBe(false);

    const emptySize = completedDirectFixture();
    emptySize.query.visibleBounds[0].fontSamples[0].size = "";
    emptySize.fontFingerprint = textBoxFontFingerprint(
      emptySize.query.visibleBounds.flatMap(
        (bound: { fontSamples: Array<{
          family: string;
          size: string;
          weight: string;
          lineHeight: string;
        }> }) => bound.fontSamples
      )
    );
    expect(textBoxAvailabilityProbeSchema.safeParse(emptySize).success).toBe(
      false
    );
  });

  it("completed evidence는 dedicated source·editor viewport·canvas root와 exact keys에 결속된다", () => {
    const legacySource = completedDirectFixture();
    legacySource.sourceEvidence.sourceKind = "editor-diagnostics-context";
    expect(textBoxAvailabilityProbeSchema.safeParse(legacySource).success).toBe(
      false
    );

    const missingViewport = completedDirectFixture();
    missingViewport.environment.viewport = null;
    expect(
      textBoxAvailabilityProbeSchema.safeParse(missingViewport).success
    ).toBe(false);

    const missingRoot = completedDirectFixture();
    missingRoot.query.canvasRoot = null;
    expect(textBoxAvailabilityProbeSchema.safeParse(missingRoot).success).toBe(
      false
    );

    const extraSelector = completedDirectFixture();
    extraSelector.query.selectorCounts.extra = 0;
    expect(
      textBoxAvailabilityProbeSchema.safeParse(extraSelector).success
    ).toBe(false);

    const wrongTag = completedDirectFixture();
    wrongTag.query.directTextBoxTags = ["span"];
    expect(textBoxAvailabilityProbeSchema.safeParse(wrongTag).success).toBe(
      false
    );

    const wrongBoundTag = completedDirectFixture();
    wrongBoundTag.query.visibleBounds[0].tag = "div";
    wrongBoundTag.query.candidateTagCounts = { div: 1 };
    wrongBoundTag.query.directTextBoxTags = ["div"];
    expect(
      textBoxAvailabilityProbeSchema.safeParse(wrongBoundTag).success
    ).toBe(false);

    const offCanvas = completedDirectFixture();
    offCanvas.query.visibleBounds[0].bounds.x = 5000;
    expect(textBoxAvailabilityProbeSchema.safeParse(offCanvas).success).toBe(
      false
    );

    const offscreenRoot = completedDirectFixture();
    offscreenRoot.query.visibleBounds = [];
    offscreenRoot.query.directTextBoxTags = [];
    offscreenRoot.query.directTextBoxCount = 0;
    offscreenRoot.query.candidateTagCounts = {};
    offscreenRoot.query.selectorCounts = {
      "svg text": 0,
      "svg foreignObject": 0,
      input: 0,
      textarea: 0,
      contenteditable: 0,
      "math-field": 0
    };
    offscreenRoot.query.visibleSelectorCounts = {
      ...offscreenRoot.query.selectorCounts
    };
    offscreenRoot.query.canvasRoot.bounds.x = 5000;
    offscreenRoot.decision.status = "observed-not-ready";
    offscreenRoot.decision.directTextBoxQueryable = false;
    offscreenRoot.decision.fallback = "font-fingerprint-conservative";
    offscreenRoot.fontFingerprint = null;
    expect(
      textBoxAvailabilityProbeSchema.safeParse(offscreenRoot).success
    ).toBe(false);

    const invalidViewport = completedDirectFixture();
    invalidViewport.query.visibleBounds = [];
    invalidViewport.query.directTextBoxTags = [];
    invalidViewport.query.directTextBoxCount = 0;
    invalidViewport.query.candidateTagCounts = {};
    invalidViewport.query.selectorCounts = {
      "svg text": 0,
      "svg foreignObject": 0,
      input: 0,
      textarea: 0,
      contenteditable: 0,
      "math-field": 0
    };
    invalidViewport.query.visibleSelectorCounts = {
      ...invalidViewport.query.selectorCounts
    };
    invalidViewport.decision.status = "observed-not-ready";
    invalidViewport.decision.directTextBoxQueryable = false;
    invalidViewport.decision.fallback = "font-fingerprint-conservative";
    invalidViewport.fontFingerprint = null;
    invalidViewport.environment.viewport = "0x0";
    expect(
      textBoxAvailabilityProbeSchema.safeParse(invalidViewport).success
    ).toBe(false);
  });

  it("font fallback은 metrics table 전까지 observed-not-ready이며 pixel fallback은 없다", () => {
    const observed = completedDirectFixture();
    observed.query.status = "completed";
    observed.query.selectorCounts = {
      "svg text": 0,
      "svg foreignObject": 0,
      input: 0,
      textarea: 0,
      contenteditable: 0,
      "math-field": 0
    };
    observed.query.visibleSelectorCounts = { ...observed.query.selectorCounts };
    observed.query.candidateTagCounts = {};
    observed.query.directTextBoxTags = [];
    observed.query.directTextBoxCount = 0;
    observed.query.visibleBounds = [];
    observed.fontFingerprint = null;
    observed.decision.status = "observed-not-ready";
    observed.decision.directTextBoxQueryable = false;
    observed.decision.fallback = "font-fingerprint-conservative";
    expect(textBoxAvailabilityProbeSchema.safeParse(observed).success).toBe(true);

    observed.decision.status = "resolved";
    expect(textBoxAvailabilityProbeSchema.safeParse(observed).success).toBe(false);

    observed.decision.metricsTable = {
      id: "text-metrics-student-one-screen-large-v1",
      version: "1.0.0",
      sha256: "a".repeat(64)
    };
    expect(textBoxAvailabilityProbeSchema.safeParse(observed).success).toBe(false);
  });

  it("sanitized evidence의 raw hash·time·selector·group count drift를 exact binding에서 차단한다", () => {
    const expected = textBoxAvailabilityProbeSchema.parse(fixture());
    const pinned = manifest();
    const pinnedExpected = structuredClone(expected);
    pinnedExpected.probeId = pinned.probeId;
    pinnedExpected.observedAt = pinned.observedAt;
    pinnedExpected.sourceEvidence.sourceKind = pinned.sourceKind;
    pinnedExpected.sourceEvidence.rawSha256 = pinned.rawSha256;
    pinnedExpected.sourceEvidence.screenshotSha256 =
      pinned.rawScreenshotSha256;
    pinnedExpected.environment.editorPath = pinned.editorPath;
    pinnedExpected.query.selector = pinned.selector;
    pinnedExpected.decision.status = pinned.decisionStatus;
    expect(assertTextBoxAvailabilityProbeBinding(expected, pinnedExpected)).toBe(
      true
    );
    for (const mutate of [
      (value: typeof expected) => {
        value.sourceEvidence.rawSha256 = "b".repeat(64);
      },
      (value: typeof expected) => {
        value.sourceEvidence.screenshotSha256 = "c".repeat(64);
      },
      (value: typeof expected) => {
        value.observedAt = "2026-07-29T07:05:27.933Z";
      },
      (value: typeof expected) => {
        value.query.selector = "svg text";
      },
      (value: typeof expected) => {
        value.query.groupWrapperCount = 22;
      }
    ]) {
      const mutated = structuredClone(expected);
      mutate(mutated);
      expect(() =>
        assertTextBoxAvailabilityProbeBinding(mutated, expected)
      ).toThrow("text-box-probe-evidence-drift");
    }
  });
});
