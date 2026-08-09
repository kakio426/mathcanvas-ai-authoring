import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertLearningPhaseRelease,
  canonicalOneScreenRegistryIsDeepFrozen,
  conservativeFontMetricsContentHash,
  conservativeFontMetricsTableSchema,
  learningPhaseContractSchema,
  oneProblemMinimumCssHeight,
  oneScreenInteractionEvidenceContentHash,
  oneScreenLayoutProfileContentHash,
  oneScreenLayoutProfileSchema,
  findCanonicalOneScreenProfile,
  studentOneScreenGeometryProfileSchema,
  twoProblemMinimumCssHeight,
  type NativeSpatialContract
} from "@mathcanvas/contracts";
import {
  measureConservativeText,
  resolveOneScreenLayout,
  resolveOneScreenLayoutFromPinnedInputs,
  type OneScreenPinnedLayoutRequest
} from "./one-screen-layout.js";

const root = resolve(import.meta.dirname, "../../../..");
const geometryProfileFileSha256 =
  "5af1498c3dd392eb7f2d771679b62eb435d37e1d636c3c9b74fbc34030b21732";
const fontMetricsFileSha256 =
  "3bd8f3703cee8b7eff76598d3c98cd267d5361caecac97ac45c72eea36f93fc6";

const geometryProfile = studentOneScreenGeometryProfileSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(root, "research/mathcanvas/student-one-screen-geometry-profile.json"),
      "utf8"
    )
  )
);
const fontMetrics = conservativeFontMetricsTableSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(
        root,
        "research/mathcanvas/pretendard-conservative-font-metrics-v1.json"
      ),
      "utf8"
    )
  )
);
const profile = oneScreenLayoutProfileSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(root, "research/mathcanvas/student-one-screen-large-v1.json"),
      "utf8"
    )
  )
);

const nativeContract: NativeSpatialContract = {
  contractKind: "intrinsic-element",
  contractId: "test-native-workbench-v1",
  toolKey: "TEST01",
  variantId: "TEST01-01",
  toolVersionFingerprint: "bundle:test-native-workbench-v1",
  minInteractiveSize: { width: 80, height: 80 },
  minInteractiveCssSize: { width: 44, height: 44 },
  reserveBox: { x: 0, y: 0, width: 200, height: 120 },
  reserveAnchor: "placement-top-left",
  roundTripStable: true,
  roundTripTolerance: 1,
  derivedFromEvidenceIds: ["test-native-one-screen-evidence-v1"]
};

function interactionEvidence(
  stateEnvelopesCss: [
    {
      state: "initial";
      relativeTo: "native-reserve-top-left";
      bounds: { x: number; y: number; width: number; height: number };
    },
    {
      state: "selected";
      relativeTo: "native-reserve-top-left";
      bounds: { x: number; y: number; width: number; height: number };
    },
    {
      state: "manipulated";
      relativeTo: "native-reserve-top-left";
      bounds: { x: number; y: number; width: number; height: number };
    }
  ] = [
    {
      state: "initial",
      relativeTo: "native-reserve-top-left",
      bounds: { x: 0, y: 0, width: 140, height: 110 }
    },
    {
      state: "selected",
      relativeTo: "native-reserve-top-left",
      bounds: { x: -10, y: -20, width: 160, height: 130 }
    },
    {
      state: "manipulated",
      relativeTo: "native-reserve-top-left",
      bounds: { x: 20, y: 10, width: 180, height: 140 }
    }
  ]
) {
  const body = {
    schemaVersion: "1.0.0" as const,
    evidenceId: "test-native-one-screen-evidence-v1",
    evidenceVersion: "1.0.0",
    nativeContractId: nativeContract.contractId,
    nativeContractVersion: "2.0.0" as const,
    sourceEvidence: {
      artifactPath: "research/mathcanvas/test-native-one-screen-evidence.json",
      fileSha256: "a".repeat(64),
      contentSha256: "b".repeat(64),
      nativeContractRecordHash: "c".repeat(64)
    },
    coverage: "activity-specific-pinned" as const,
    viewport: {
      width: 1280 as const,
      height: 800 as const,
      surfaceMode: "authoring-editor" as const,
      sidebarState: "expanded" as const
    },
    commonAnchor: {
      kind: "native-reserve-top-left" as const,
      reserveWidthCssPx:
        nativeContract.reserveBox.width * profile.geometryBinding.coordinateScaleX,
      reserveHeightCssPx:
        nativeContract.reserveBox.height * profile.geometryBinding.coordinateScaleY
    },
    stateEnvelopesCss,
    selectedChromeIncluded: true as const,
    manipulatedMovementIncluded: true as const,
    taskEnvelopeBounded: true as const
  };
  return {
    ...body,
    contentSha256: oneScreenInteractionEvidenceContentHash(body)
  };
}

function request(): OneScreenPinnedLayoutRequest {
  const nativeInteractionEvidence = interactionEvidence();
  return {
    problemCount: 1,
    profile,
    pinned: {
      geometryProfile,
      geometryProfileFileSha256,
      fontMetrics,
      fontMetricsFileSha256
    },
    text: {
      title: "같은 수만큼 묶으면 몇 묶음이 될까요?",
      predictionInstruction: "먼저 알맞은 답을 하나 고르세요.",
      confirmationInstruction: "모형을 4개씩 움직여 묶음을 직접 만드세요.",
      explanationInstruction: "만든 묶음과 남은 수를 근거로 설명하세요.",
      revisionInstruction: "확인한 결과가 다르면 처음 답을 고치세요.",
      candidates: ["3묶음, 2개", "4묶음, 1개", "5묶음, 3개"]
    },
    native: {
      contract: nativeContract,
      contractVersion: "2.0.0",
      interactionEvidence: nativeInteractionEvidence,
      expectedInteractionEvidenceContentSha256:
        nativeInteractionEvidence.contentSha256
    }
  };
}

describe("student-one-screen-large-v1 resolver", () => {
  it("같은 pinned 입력을 reserve-first 한 문제 배치로 byte-stable하게 푼다", () => {
    const first = resolveOneScreenLayoutFromPinnedInputs(request());
    const second = resolveOneScreenLayoutFromPinnedInputs(request());
    expect(second).toEqual(first);
    expect(first.reserveFirst).toBe(true);
    expect(first.regions.map((entry) => entry.phase)).toEqual([
      "title",
      "prediction",
      "mathematical-confirmation",
      "explanation",
      "revision"
    ]);
    expect(first.budget.overflowCssHeight).toBe(0);
    expect(first.budget.remainingCssHeight).toBeGreaterThan(0);
    expect(first.native.allocatedStateEnvelopeCss.height).toBe(170);
    expect(first.native.clearanceToNextPhaseCssPx).toBeGreaterThanOrEqual(18);
    expect(first.native.stateEnvelopesCss[1]!.boundsCss.x).toBeCloseTo(
      first.native.coreReserveBoundsCss.x - 10,
      6
    );
    expect(first.native.stateEnvelopesCss[1]!.boundsCss.y).toBeCloseTo(
      first.native.coreReserveBoundsCss.y - 20,
      6
    );
    expect(first.native.stateEnvelopesCss[2]!.boundsCss.x).toBeCloseTo(
      first.native.coreReserveBoundsCss.x + 20,
      6
    );
    expect(first.native.stateEnvelopesCss[2]!.boundsCss.y).toBeCloseTo(
      first.native.coreReserveBoundsCss.y + 10,
      6
    );
    for (const state of first.native.stateEnvelopesCss) {
      expect(state.boundsCss.y).toBeGreaterThanOrEqual(
        first.native.allocatedStateEnvelopeCss.y
      );
      expect(state.boundsCss.y + state.boundsCss.height).toBeLessThanOrEqual(
        first.native.allocatedStateEnvelopeCss.y +
          first.native.allocatedStateEnvelopeCss.height
      );
    }
  });

  it("제목·지시·보기 글자 하한과 보기 line-box 중앙을 deterministic하게 지킨다", () => {
    const base = request();
    const result = resolveOneScreenLayoutFromPinnedInputs({
      ...base,
      text: { ...base.text, candidates: ["1", "2", "3"] }
    });
    expect(result.title.measurement.fontSizeCssPx).toBe(40);
    expect(
      result.phaseInstructions.prediction.measurement.fontSizeCssPx
    ).toBe(30);
    for (const card of result.candidateCards) {
      expect(card.measurement.fontSizeCssPx).toBe(26);
      expect(card.measurement.lineHeightCssPx / 26).toBeGreaterThanOrEqual(
        1.35
      );
      expect(
        Math.abs(
          card.lineBoxCss.x + card.lineBoxCss.width / 2 -
            (card.boundsCss.x + card.boundsCss.width / 2)
        )
      ).toBeLessThanOrEqual(profile.spacing.centeringToleranceCssPx);
      expect(
        Math.abs(
          card.lineBoxCss.y + card.lineBoxCss.height / 2 -
            (card.boundsCss.y + card.boundsCss.height / 2)
        )
      ).toBeLessThanOrEqual(profile.spacing.centeringToleranceCssPx);
      expect(card.lineBoxCss.y - card.boundsCss.y).toBeGreaterThanOrEqual(18);
    }
  });

  it("한 문제 arithmetic를 재계산하고 두 문제는 축소 없이 unsupported로 막는다", () => {
    expect(oneProblemMinimumCssHeight(profile)).toBeCloseTo(580.4, 6);
    expect(twoProblemMinimumCssHeight(profile)).toBeCloseTo(1160.8, 6);
    expect(profile.problemCapacity.availableCssHeight).toBe(672);
    expect(() =>
      resolveOneScreenLayoutFromPinnedInputs({ ...request(), problemCount: 2 })
    ).toThrow("one-screen-two-problem-unsupported");
  });

  it("긴 보기나 큰 native envelope가 한 화면을 넘으면 글자를 줄이지 않고 실패한다", () => {
    const base = request();
    const longCandidate: OneScreenPinnedLayoutRequest = {
      ...base,
      text: {
        ...base.text,
        candidates: [
          "가".repeat(60),
          base.text.candidates[1],
          base.text.candidates[2]
        ]
      }
    };
    expect(() => resolveOneScreenLayoutFromPinnedInputs(longCandidate)).toThrow(
      "one-screen-vertical-overflow"
    );

    const tallInteractionEvidence = interactionEvidence([
      base.native.interactionEvidence.stateEnvelopesCss[0],
      base.native.interactionEvidence.stateEnvelopesCss[1],
      {
        ...base.native.interactionEvidence.stateEnvelopesCss[2],
        bounds: {
          ...base.native.interactionEvidence.stateEnvelopesCss[2].bounds,
          height: 300
        }
      }
    ]);
    const tallNative: OneScreenPinnedLayoutRequest = {
      ...base,
      native: {
        ...base.native,
        interactionEvidence: tallInteractionEvidence,
        expectedInteractionEvidenceContentSha256:
          tallInteractionEvidence.contentSha256
      }
    };
    expect(() => resolveOneScreenLayoutFromPinnedInputs(tallNative)).toThrow(
      "one-screen-vertical-overflow"
    );

    const upwardSelectedEvidence = interactionEvidence([
      base.native.interactionEvidence.stateEnvelopesCss[0],
      {
        ...base.native.interactionEvidence.stateEnvelopesCss[1],
        bounds: {
          ...base.native.interactionEvidence.stateEnvelopesCss[1].bounds,
          y: -220
        }
      },
      base.native.interactionEvidence.stateEnvelopesCss[2]
    ]);
    expect(() =>
      resolveOneScreenLayoutFromPinnedInputs({
        ...base,
        native: {
          ...base.native,
          interactionEvidence: upwardSelectedEvidence,
          expectedInteractionEvidenceContentSha256:
            upwardSelectedEvidence.contentSha256
        }
      })
    ).toThrow("one-screen-vertical-overflow");
  });

  it("font fingerprint·metrics hash·geometry hash가 stale이면 offline에서 닫는다", () => {
    const base = request();
    const staleFile: OneScreenPinnedLayoutRequest = {
      ...base,
      pinned: {
        ...base.pinned,
        fontMetricsFileSha256: "0".repeat(64)
      }
    };
    expect(() => resolveOneScreenLayoutFromPinnedInputs(staleFile)).toThrow(
      "one-screen-pinned-input-binding-invalid"
    );

    const staleMetrics = structuredClone(fontMetrics);
    staleMetrics.advanceEm.hangul = 0.9;
    const { contentSha256: _contentSha256, ...metricsBody } = staleMetrics;
    staleMetrics.contentSha256 = conservativeFontMetricsContentHash(metricsBody);
    const staleTable: OneScreenPinnedLayoutRequest = {
      ...base,
      pinned: {
        ...base.pinned,
        fontMetrics: staleMetrics
      }
    };
    expect(() => resolveOneScreenLayoutFromPinnedInputs(staleTable)).toThrow(
      "one-screen-pinned-input-binding-invalid"
    );

    const staleProfile = structuredClone(profile);
    staleProfile.geometryBinding.profileContentSha256 = "0".repeat(64);
    const { contentSha256: _profileHash, ...profileBody } = staleProfile;
    staleProfile.contentSha256 = oneScreenLayoutProfileContentHash(profileBody);
    const staleGeometry: OneScreenPinnedLayoutRequest = {
      ...base,
      profile: staleProfile
    };
    expect(() => resolveOneScreenLayoutFromPinnedInputs(staleGeometry)).toThrow(
      "one-screen-pinned-input-binding-invalid"
    );

    const changedInteraction = structuredClone(
      base.native.interactionEvidence
    );
    changedInteraction.stateEnvelopesCss[1].bounds.height -= 20;
    const {
      contentSha256: _interactionHash,
      ...changedInteractionBody
    } = changedInteraction;
    changedInteraction.contentSha256 =
      oneScreenInteractionEvidenceContentHash(changedInteractionBody);
    const staleInteraction: OneScreenPinnedLayoutRequest = {
      ...base,
      native: {
        ...base.native,
        interactionEvidence: changedInteraction
      }
    };
    expect(() => resolveOneScreenLayoutFromPinnedInputs(staleInteraction)).toThrow(
      "one-screen-native-interaction-evidence-invalid"
    );
  });

  it("production resolver는 frozen registry의 ID만 받고 R5 미승격 evidence를 닫는다", () => {
    expect(canonicalOneScreenRegistryIsDeepFrozen()).toBe(true);
    const mutableCopy = findCanonicalOneScreenProfile(
      profile.profileId,
      profile.profileVersion
    );
    mutableCopy.fontMetrics.advanceEm.hangul = 0.9;
    expect(
      findCanonicalOneScreenProfile(profile.profileId, profile.profileVersion)
        .fontMetrics.advanceEm.hangul
    ).toBe(1);
    expect(() =>
      resolveOneScreenLayout({
        problemCount: 1,
        profileId: profile.profileId,
        profileVersion: profile.profileVersion,
        interactionEvidenceId: "unreviewed-interaction-evidence-v1",
        text: request().text
      })
    ).toThrow("one-screen-interaction-not-registered");
  });

  it("상단 네 문장도 같은 metrics로 줄높이를 보존하고 좁은 상자에서 wrap을 예측한다", () => {
    const sentences = [
      "먼저 답을 고르세요.",
      "모형을 움직여 확인하세요.",
      "확인한 수학적 증거를 쓰세요.",
      "처음 답과 다르면 고치세요."
    ];
    const measurements = sentences.map((text) =>
      measureConservativeText(text, {
        fontSizeCssPx: 30,
        lineHeightRatio: 1.4,
        maximumWidthCssPx: 300,
        metrics: fontMetrics
      })
    );
    expect(measurements).toHaveLength(4);
    expect(
      measurements.every(
        (measurement) => measurement.lineHeightCssPx === 42
      )
    ).toBe(true);
    expect(
      measureConservativeText("가".repeat(30), {
        fontSizeCssPx: 30,
        lineHeightRatio: 1.4,
        maximumWidthCssPx: 300,
        metrics: fontMetrics
      }).lineCount
    ).toBe(3);
  });
});

describe("learning phase contract", () => {
  it("예상→native 확인→증거 설명→수정의 exact release evidence만 받는다", () => {
    expect(
      assertLearningPhaseRelease(profile.phaseContract, {
        phaseSequence: [
          "prediction",
          "mathematical-confirmation",
          "explanation",
          "revision"
        ],
        visibleRegionRoles: profile.phaseContract.regions.map(
          (region) => region.regionRole
        ),
        initialAnswerComplete: false,
        nativeMathematicalStateChanged: true,
        explanationUsesObservedEvidence: true,
        revisionReferencesPrediction: true,
        taskEnvelopeBounded: true
      }).revisionReferencesPrediction
    ).toBe(true);

    const duplicateRole = structuredClone(profile.phaseContract);
    duplicateRole.regions[3].regionRole = duplicateRole.regions[0].regionRole;
    expect(() => learningPhaseContractSchema.parse(duplicateRole)).toThrow();

    expect(() =>
      assertLearningPhaseRelease(profile.phaseContract, {
        phaseSequence: [
          "prediction",
          "mathematical-confirmation",
          "explanation",
          "revision"
        ],
        visibleRegionRoles: [
          profile.phaseContract.regions[1].regionRole,
          profile.phaseContract.regions[0].regionRole,
          profile.phaseContract.regions[2].regionRole,
          profile.phaseContract.regions[3].regionRole
        ],
        initialAnswerComplete: false,
        nativeMathematicalStateChanged: true,
        explanationUsesObservedEvidence: true,
        revisionReferencesPrediction: true,
        taskEnvelopeBounded: true
      })
    ).toThrow("learning-phase-visible-region-binding-invalid");
  });
});
