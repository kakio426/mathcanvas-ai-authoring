import {
  assertNativeSpatialContract,
  findCanonicalOneScreenInteraction,
  findCanonicalOneScreenProfile,
  conservativeFontMetricsTableSchema,
  oneScreenInteractionEvidenceSchema,
  oneScreenLayoutProfileSchema,
  nativeSpatialContractRecordSchema,
  studentOneScreenGeometryProfileSchema,
  type ConservativeFontMetricsTable,
  type LearningPhase,
  type NativeSpatialContract,
  type OneScreenInteractionEvidence,
  type OneScreenLayoutProfile,
  type SpatialBounds,
  type StudentOneScreenGeometryProfile
} from "@mathcanvas/contracts";

const sha256Pattern = /^[a-f0-9]{64}$/;

export interface OneScreenPinnedInputs {
  readonly geometryProfile: StudentOneScreenGeometryProfile;
  readonly geometryProfileFileSha256: string;
  readonly fontMetrics: ConservativeFontMetricsTable;
  readonly fontMetricsFileSha256: string;
}

export interface OneScreenNativeStateEnvelope {
  readonly state: "initial" | "selected" | "manipulated";
  readonly relativeTo: "native-reserve-top-left";
  readonly bounds: SpatialBounds;
}

export interface PinnedOneScreenNativeRequirement {
  readonly contract: NativeSpatialContract;
  readonly contractVersion: "2.0.0";
  readonly interactionEvidence: OneScreenInteractionEvidence;
  readonly expectedInteractionEvidenceContentSha256: string;
}

export interface OneScreenTextInput {
  readonly title: string;
  readonly predictionInstruction: string;
  readonly confirmationInstruction: string;
  readonly explanationInstruction: string;
  readonly revisionInstruction: string;
  readonly candidates: readonly [string, string, string];
}

export interface OneScreenPinnedLayoutRequest {
  readonly problemCount: number;
  readonly profile: OneScreenLayoutProfile;
  readonly pinned: OneScreenPinnedInputs;
  readonly text: OneScreenTextInput;
  readonly native: PinnedOneScreenNativeRequirement;
}

export interface OneScreenLayoutRequest {
  readonly problemCount: number;
  readonly profileId: string;
  readonly profileVersion: string;
  readonly interactionEvidenceId: string;
  readonly text: OneScreenTextInput;
}

export interface ConservativeTextMeasurement {
  readonly text: string;
  readonly fontSizeCssPx: number;
  readonly lineHeightCssPx: number;
  readonly lineCount: number;
  readonly maxLineWidthCssPx: number;
  readonly heightCssPx: number;
}

export interface OneScreenTextBox {
  readonly boundsCss: SpatialBounds;
  readonly boundsCanvas: SpatialBounds;
  readonly lineBoxCss: SpatialBounds;
  readonly lineBoxCanvas: SpatialBounds;
  readonly measurement: ConservativeTextMeasurement;
  readonly fontSizeCanvasUnits: number;
  readonly lineHeightCanvasUnits: number;
  readonly horizontalAlignment: "left" | "center";
  readonly verticalAlignment: "center";
}

export interface OneScreenResolvedRegion {
  readonly phase: LearningPhase | "title";
  readonly role: string;
  readonly boundsCss: SpatialBounds;
  readonly boundsCanvas: SpatialBounds;
}

export interface OneScreenLayoutResult {
  readonly profileId: string;
  readonly profileVersion: string;
  readonly problemCount: 1;
  readonly reserveFirst: true;
  readonly fixedSafeCss: SpatialBounds;
  readonly fixedSafeCanvas: SpatialBounds;
  readonly regions: readonly OneScreenResolvedRegion[];
  readonly title: OneScreenTextBox;
  readonly phaseInstructions: Readonly<Record<LearningPhase, OneScreenTextBox>>;
  readonly candidateCards: readonly OneScreenTextBox[];
  readonly native: {
    readonly contractId: string;
    readonly contractVersion: string;
    readonly interactionEvidenceId: string;
    readonly interactionEvidenceContentSha256: string;
    readonly coreReserveCss: { readonly width: number; readonly height: number };
    readonly coreReserveBoundsCss: SpatialBounds;
    readonly coreReserveBoundsCanvas: SpatialBounds;
    readonly allocatedStateEnvelopeCss: SpatialBounds;
    readonly allocatedStateEnvelopeCanvas: SpatialBounds;
    readonly stateEnvelopesCss: readonly (OneScreenNativeStateEnvelope & {
      readonly boundsCss: SpatialBounds;
      readonly boundsCanvas: SpatialBounds;
    })[];
    readonly clearanceToNextPhaseCssPx: number;
  };
  readonly writingBoxCss: SpatialBounds;
  readonly writingBoxCanvas: SpatialBounds;
  readonly budget: {
    readonly availableCssHeight: number;
    readonly usedCssHeight: number;
    readonly remainingCssHeight: number;
    readonly overflowCssHeight: 0;
  };
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-6;
}

function boundsEqual(left: SpatialBounds, right: SpatialBounds): boolean {
  return (
    approximatelyEqual(left.x, right.x) &&
    approximatelyEqual(left.y, right.y) &&
    approximatelyEqual(left.width, right.width) &&
    approximatelyEqual(left.height, right.height)
  );
}

function boundsUnion(bounds: readonly SpatialBounds[]): SpatialBounds {
  const left = Math.min(...bounds.map((entry) => entry.x));
  const top = Math.min(...bounds.map((entry) => entry.y));
  const right = Math.max(
    ...bounds.map((entry) => entry.x + entry.width)
  );
  const bottom = Math.max(
    ...bounds.map((entry) => entry.y + entry.height)
  );
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function assertPinnedBindings(
  profileInput: OneScreenLayoutProfile,
  pinned: OneScreenPinnedInputs
): {
  profile: OneScreenLayoutProfile;
  geometry: StudentOneScreenGeometryProfile;
  metrics: ConservativeFontMetricsTable;
} {
  const profile = oneScreenLayoutProfileSchema.parse(profileInput);
  const geometry = studentOneScreenGeometryProfileSchema.parse(
    pinned.geometryProfile
  );
  const metrics = conservativeFontMetricsTableSchema.parse(
    pinned.fontMetrics
  );
  if (
    !sha256Pattern.test(pinned.geometryProfileFileSha256) ||
    !sha256Pattern.test(pinned.fontMetricsFileSha256) ||
    profile.geometryBinding.profileId !== geometry.profileId ||
    profile.geometryBinding.profileVersion !== geometry.profileVersion ||
    profile.geometryBinding.profileFileSha256 !==
      pinned.geometryProfileFileSha256 ||
    profile.geometryBinding.profileContentSha256 !== geometry.contentSha256 ||
    !boundsEqual(profile.geometryBinding.fixedSafeCss, geometry.fixedSafeCss) ||
    !boundsEqual(
      profile.geometryBinding.fixedSafeCanvas,
      geometry.fixedSafeCanvas
    ) ||
    !approximatelyEqual(
      profile.geometryBinding.coordinateScaleX,
      geometry.transform.scaleX
    ) ||
    !approximatelyEqual(
      profile.geometryBinding.coordinateScaleY,
      geometry.transform.scaleY
    ) ||
    geometry.eligibility.fixedGeometryInputReady !== true ||
    profile.fontMetricsBinding.tableId !== metrics.tableId ||
    profile.fontMetricsBinding.tableVersion !== metrics.tableVersion ||
    profile.fontMetricsBinding.tableFileSha256 !==
      pinned.fontMetricsFileSha256 ||
    profile.fontMetricsBinding.tableContentSha256 !== metrics.contentSha256 ||
    profile.fontMetricsBinding.fontFingerprint !== metrics.fontFingerprint
  ) {
    throw new Error("one-screen-pinned-input-binding-invalid");
  }
  return { profile, geometry, metrics };
}

function advanceCategory(character: string): keyof ConservativeFontMetricsTable["advanceEm"] {
  const codePoint = character.codePointAt(0) ?? 0;
  if (/\s/u.test(character)) return "whitespace";
  if (/^[0-9]$/u.test(character)) return "digit";
  if (/^[A-Za-z]$/u.test(character)) return "latin";
  if (/^[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]$/u.test(character)) {
    return "hangul";
  }
  if (/^[.,!?;:'"()[\]{}<>·…，。！？、]$/u.test(character)) {
    return "punctuation";
  }
  if (codePoint > 0xffff) return "emoji";
  if (/^[+\-×÷=<>≤≥%₩$#@&|/\\]$/u.test(character)) return "symbol";
  return "unknown";
}

function characterWidthCssPx(
  character: string,
  fontSizeCssPx: number,
  metrics: ConservativeFontMetricsTable
): number {
  return fontSizeCssPx * metrics.advanceEm[advanceCategory(character)];
}

export function measureConservativeText(
  text: string,
  options: {
    readonly fontSizeCssPx: number;
    readonly lineHeightRatio: number;
    readonly maximumWidthCssPx: number;
    readonly metrics: ConservativeFontMetricsTable;
  }
): ConservativeTextMeasurement {
  const normalized = text.normalize("NFC");
  if (
    normalized.trim().length === 0 ||
    !Number.isFinite(options.fontSizeCssPx) ||
    options.fontSizeCssPx < 22 ||
    !Number.isFinite(options.lineHeightRatio) ||
    options.lineHeightRatio < 1.35 ||
    !Number.isFinite(options.maximumWidthCssPx) ||
    options.maximumWidthCssPx <= 0
  ) {
    throw new Error("one-screen-text-measurement-input-invalid");
  }
  const metrics = conservativeFontMetricsTableSchema.parse(options.metrics);
  const lineWidths: number[] = [];
  for (const explicitLine of normalized.split("\n")) {
    if (explicitLine.length === 0) {
      lineWidths.push(0);
      continue;
    }
    let width = 0;
    for (const character of [...explicitLine]) {
      const advance = characterWidthCssPx(
        character,
        options.fontSizeCssPx,
        metrics
      );
      if (width > 0 && width + advance > options.maximumWidthCssPx) {
        lineWidths.push(width);
        width = advance;
      } else {
        width += advance;
      }
    }
    lineWidths.push(width);
  }
  const lineHeightCssPx =
    options.fontSizeCssPx * options.lineHeightRatio;
  return {
    text: normalized,
    fontSizeCssPx: options.fontSizeCssPx,
    lineHeightCssPx,
    lineCount: lineWidths.length,
    maxLineWidthCssPx: Math.max(0, ...lineWidths),
    heightCssPx: lineWidths.length * lineHeightCssPx
  };
}

function textBox(
  text: string,
  boundsCss: SpatialBounds,
  options: {
    readonly fontSizeCssPx: number;
    readonly lineHeightRatio: number;
    readonly paddingXCssPx: number;
    readonly paddingYCssPx: number;
    readonly metrics: ConservativeFontMetricsTable;
    readonly horizontalAlignment: "left" | "center";
    readonly profile: OneScreenLayoutProfile;
  }
): OneScreenTextBox {
  const maximumWidthCssPx = boundsCss.width - options.paddingXCssPx * 2;
  const measurement = measureConservativeText(text, {
    fontSizeCssPx: options.fontSizeCssPx,
    lineHeightRatio: options.lineHeightRatio,
    maximumWidthCssPx,
    metrics: options.metrics
  });
  if (
    maximumWidthCssPx <= 0 ||
    measurement.heightCssPx + options.paddingYCssPx * 2 > boundsCss.height + 1e-6
  ) {
    throw new Error("one-screen-text-box-overflow");
  }
  const lineBoxCss = {
    x:
      options.horizontalAlignment === "center"
        ? boundsCss.x + (boundsCss.width - measurement.maxLineWidthCssPx) / 2
        : boundsCss.x + options.paddingXCssPx,
    y: boundsCss.y + (boundsCss.height - measurement.heightCssPx) / 2,
    width: measurement.maxLineWidthCssPx,
    height: measurement.heightCssPx
  };
  return {
    boundsCss,
    boundsCanvas: cssToCanvas(boundsCss, options.profile),
    lineBoxCss,
    lineBoxCanvas: cssToCanvas(lineBoxCss, options.profile),
    measurement,
    fontSizeCanvasUnits:
      options.fontSizeCssPx /
      options.profile.geometryBinding.coordinateScaleY,
    lineHeightCanvasUnits:
      measurement.lineHeightCssPx /
      options.profile.geometryBinding.coordinateScaleY,
    horizontalAlignment: options.horizontalAlignment,
    verticalAlignment: "center"
  };
}

function cssToCanvas(
  bounds: SpatialBounds,
  profile: OneScreenLayoutProfile
): SpatialBounds {
  const css = profile.geometryBinding.fixedSafeCss;
  const canvas = profile.geometryBinding.fixedSafeCanvas;
  return {
    x:
      canvas.x +
      (bounds.x - css.x) / profile.geometryBinding.coordinateScaleX,
    y:
      canvas.y +
      (bounds.y - css.y) / profile.geometryBinding.coordinateScaleY,
    width: bounds.width / profile.geometryBinding.coordinateScaleX,
    height: bounds.height / profile.geometryBinding.coordinateScaleY
  };
}

function validateNativeRequirement(
  requirement: PinnedOneScreenNativeRequirement,
  profile: OneScreenLayoutProfile
): {
  contract: NativeSpatialContract;
  coreWidthCssPx: number;
  coreHeightCssPx: number;
  stateEnvelopes: readonly OneScreenNativeStateEnvelope[];
} {
  const contract = assertNativeSpatialContract(requirement.contract);
  const evidence = oneScreenInteractionEvidenceSchema.parse(
    requirement.interactionEvidence
  );
  const coreWidthCssPx =
    contract.reserveBox.width * profile.geometryBinding.coordinateScaleX;
  const coreHeightCssPx =
    contract.reserveBox.height * profile.geometryBinding.coordinateScaleY;
  if (
    requirement.contractVersion !== "2.0.0" ||
    !sha256Pattern.test(
      requirement.expectedInteractionEvidenceContentSha256
    ) ||
    evidence.contentSha256 !==
      requirement.expectedInteractionEvidenceContentSha256 ||
    evidence.coverage !== "activity-specific-pinned" ||
    evidence.taskEnvelopeBounded !== true ||
    evidence.nativeContractId !== contract.contractId ||
    evidence.nativeContractVersion !== requirement.contractVersion ||
    !contract.derivedFromEvidenceIds.includes(evidence.evidenceId) ||
    evidence.viewport.width !== profile.viewport.width ||
    evidence.viewport.height !== profile.viewport.height ||
    evidence.viewport.surfaceMode !== profile.viewport.surfaceMode ||
    evidence.viewport.sidebarState !== profile.viewport.sidebarState ||
    evidence.commonAnchor.kind !== "native-reserve-top-left" ||
    !approximatelyEqual(
      evidence.commonAnchor.reserveWidthCssPx,
      coreWidthCssPx
    ) ||
    !approximatelyEqual(
      evidence.commonAnchor.reserveHeightCssPx,
      coreHeightCssPx
    )
  ) {
    throw new Error("one-screen-native-interaction-evidence-invalid");
  }
  if (contract.contractKind === "activity-composition") {
    const viewport = contract.composition.releaseViewport;
    if (
      viewport.width !== profile.viewport.width ||
      viewport.height !== profile.viewport.height ||
      viewport.surfaceMode !== profile.viewport.surfaceMode ||
      viewport.sidebarState !== profile.viewport.sidebarState ||
      viewport.zoomMode !== "fit"
    ) {
      throw new Error("one-screen-native-release-viewport-mismatch");
    }
  }
  return {
    contract,
    coreWidthCssPx,
    coreHeightCssPx,
    stateEnvelopes: evidence.stateEnvelopesCss
  };
}

function region(
  phase: OneScreenResolvedRegion["phase"],
  role: string,
  boundsCss: SpatialBounds,
  profile: OneScreenLayoutProfile
): OneScreenResolvedRegion {
  return {
    phase,
    role,
    boundsCss,
    boundsCanvas: cssToCanvas(boundsCss, profile)
  };
}

export function resolveOneScreenLayoutFromPinnedInputs(
  request: OneScreenPinnedLayoutRequest
): OneScreenLayoutResult {
  const { profile, metrics } = assertPinnedBindings(
    request.profile,
    request.pinned
  );
  if (request.problemCount !== 1) {
    if (request.problemCount === 2) {
      throw new Error("one-screen-two-problem-unsupported");
    }
    throw new Error("one-screen-problem-count-unsupported");
  }
  if (request.text.candidates.length !== 3) {
    throw new Error("one-screen-candidate-count-invalid");
  }

  // Reserve-first means this maximum is settled before any text block gets a
  // y coordinate. Text never shrinks or nudges the native mathematical state.
  const native = validateNativeRequirement(request.native, profile);
  const nativeLocalUnion = boundsUnion([
    { x: 0, y: 0, width: native.coreWidthCssPx, height: native.coreHeightCssPx },
    ...native.stateEnvelopes.map((entry) => entry.bounds)
  ]);
  const stateWidth = nativeLocalUnion.width;
  const stateHeight = nativeLocalUnion.height;

  const safe = profile.geometryBinding.fixedSafeCss;
  const inner = {
    x: safe.x + profile.spacing.outerPaddingXCssPx,
    y: safe.y + profile.spacing.outerPaddingYCssPx,
    width: safe.width - profile.spacing.outerPaddingXCssPx * 2,
    height: safe.height - profile.spacing.outerPaddingYCssPx * 2
  };
  if (stateWidth > inner.width + 1e-6) {
    throw new Error("one-screen-native-horizontal-overflow");
  }

  const titleMeasurement = measureConservativeText(request.text.title, {
    fontSizeCssPx: profile.typography.title.targetCssPx,
    lineHeightRatio: profile.typography.title.lineHeightRatio,
    maximumWidthCssPx: inner.width,
    metrics
  });
  const instructionStyle = profile.typography.coreInstruction;
  const instructions = {
    prediction: measureConservativeText(
      request.text.predictionInstruction,
      {
        fontSizeCssPx: instructionStyle.targetCssPx,
        lineHeightRatio: instructionStyle.lineHeightRatio,
        maximumWidthCssPx: inner.width,
        metrics
      }
    ),
    "mathematical-confirmation": measureConservativeText(
      request.text.confirmationInstruction,
      {
        fontSizeCssPx: instructionStyle.targetCssPx,
        lineHeightRatio: instructionStyle.lineHeightRatio,
        maximumWidthCssPx: inner.width,
        metrics
      }
    ),
    explanation: measureConservativeText(
      request.text.explanationInstruction,
      {
        fontSizeCssPx: instructionStyle.targetCssPx,
        lineHeightRatio: instructionStyle.lineHeightRatio,
        maximumWidthCssPx: inner.width,
        metrics
      }
    ),
    revision: measureConservativeText(
      request.text.revisionInstruction,
      {
        fontSizeCssPx: instructionStyle.targetCssPx,
        lineHeightRatio: instructionStyle.lineHeightRatio,
        maximumWidthCssPx: inner.width,
        metrics
      }
    )
  } satisfies Record<LearningPhase, ConservativeTextMeasurement>;

  const candidateWidth =
    (inner.width - profile.spacing.candidateColumnGapCssPx * 2) / 3;
  const candidateMeasurements = request.text.candidates.map((candidate) =>
    measureConservativeText(candidate, {
      fontSizeCssPx: profile.typography.candidate.targetCssPx,
      lineHeightRatio: profile.typography.candidate.lineHeightRatio,
      maximumWidthCssPx:
        candidateWidth - profile.spacing.candidateCardPaddingXCssPx * 2,
      metrics
    })
  );
  const candidateHeight =
    Math.max(...candidateMeasurements.map((entry) => entry.heightCssPx)) +
    profile.spacing.candidateCardPaddingYCssPx * 2;

  const titleHeight = titleMeasurement.heightCssPx;
  const predictionHeight =
    instructions.prediction.heightCssPx +
    profile.spacing.internalGapCssPx +
    candidateHeight;
  const confirmationHeight =
    instructions["mathematical-confirmation"].heightCssPx +
    profile.spacing.internalGapCssPx +
    stateHeight;
  const explanationHeight =
    instructions.explanation.heightCssPx +
    profile.spacing.internalGapCssPx +
    profile.spacing.writingMinimumHeightCssPx;
  const revisionHeight = instructions.revision.heightCssPx;
  const contentHeight =
    titleHeight +
    predictionHeight +
    confirmationHeight +
    explanationHeight +
    revisionHeight +
    profile.spacing.semanticGroupGapCssPx * 4;
  const usedCssHeight =
    contentHeight + profile.spacing.outerPaddingYCssPx * 2;
  if (usedCssHeight > safe.height + 1e-6) {
    throw new Error(
      `one-screen-vertical-overflow:${(usedCssHeight - safe.height).toFixed(3)}`
    );
  }

  let cursor = inner.y;
  const titleBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: titleHeight
  };
  const title = textBox(request.text.title, titleBounds, {
    fontSizeCssPx: profile.typography.title.targetCssPx,
    lineHeightRatio: profile.typography.title.lineHeightRatio,
    paddingXCssPx: 0,
    paddingYCssPx: 0,
    metrics,
    horizontalAlignment: "left",
    profile
  });
  cursor += titleHeight + profile.spacing.semanticGroupGapCssPx;

  const predictionBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: predictionHeight
  };
  const predictionInstructionBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: instructions.prediction.heightCssPx
  };
  const candidateY =
    predictionInstructionBounds.y +
    predictionInstructionBounds.height +
    profile.spacing.internalGapCssPx;
  const candidateCards = request.text.candidates.map((candidate, index) => {
    const boundsCss = {
      x:
        inner.x +
        index * (candidateWidth + profile.spacing.candidateColumnGapCssPx),
      y: candidateY,
      width: candidateWidth,
      height: candidateHeight
    };
    return textBox(candidate, boundsCss, {
      fontSizeCssPx: profile.typography.candidate.targetCssPx,
      lineHeightRatio: profile.typography.candidate.lineHeightRatio,
      paddingXCssPx: profile.spacing.candidateCardPaddingXCssPx,
      paddingYCssPx: profile.spacing.candidateCardPaddingYCssPx,
      metrics,
      horizontalAlignment: "center",
      profile
    });
  });
  cursor += predictionHeight + profile.spacing.semanticGroupGapCssPx;

  const confirmationBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: confirmationHeight
  };
  const confirmationInstructionBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: instructions["mathematical-confirmation"].heightCssPx
  };
  const stateAllocationCss = {
    x: inner.x + (inner.width - stateWidth) / 2,
    y:
      confirmationInstructionBounds.y +
      confirmationInstructionBounds.height +
      profile.spacing.internalGapCssPx,
    width: stateWidth,
    height: stateHeight
  };
  const commonTranslation = {
    x: stateAllocationCss.x - nativeLocalUnion.x,
    y: stateAllocationCss.y - nativeLocalUnion.y
  };
  const coreReserveBoundsCss = {
    x: commonTranslation.x,
    y: commonTranslation.y,
    width: native.coreWidthCssPx,
    height: native.coreHeightCssPx
  };
  const stateEnvelopesCss = native.stateEnvelopes.map((entry) => ({
    ...entry,
    boundsCss: {
      x: commonTranslation.x + entry.bounds.x,
      y: commonTranslation.y + entry.bounds.y,
      width: entry.bounds.width,
      height: entry.bounds.height
    },
    boundsCanvas: cssToCanvas(
      {
        x: commonTranslation.x + entry.bounds.x,
        y: commonTranslation.y + entry.bounds.y,
        width: entry.bounds.width,
        height: entry.bounds.height
      },
      profile
    )
  }));
  cursor += confirmationHeight + profile.spacing.semanticGroupGapCssPx;

  const explanationBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: explanationHeight
  };
  const explanationInstructionBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: instructions.explanation.heightCssPx
  };
  const writingBoxCss = {
    x: inner.x,
    y:
      explanationInstructionBounds.y +
      explanationInstructionBounds.height +
      profile.spacing.internalGapCssPx,
    width: inner.width,
    height: profile.spacing.writingMinimumHeightCssPx
  };
  cursor += explanationHeight + profile.spacing.semanticGroupGapCssPx;

  const revisionBounds = {
    x: inner.x,
    y: cursor,
    width: inner.width,
    height: revisionHeight
  };
  const instructionBox = (
    text: string,
    boundsCss: SpatialBounds
  ): OneScreenTextBox =>
    textBox(text, boundsCss, {
      fontSizeCssPx: instructionStyle.targetCssPx,
      lineHeightRatio: instructionStyle.lineHeightRatio,
      paddingXCssPx: 0,
      paddingYCssPx: 0,
      metrics,
      horizontalAlignment: "left",
      profile
    });

  const regions = [
    region("title", "title", titleBounds, profile),
    region(
      "prediction",
      profile.phaseContract.regions[0].regionRole,
      predictionBounds,
      profile
    ),
    region(
      "mathematical-confirmation",
      profile.phaseContract.regions[1].regionRole,
      confirmationBounds,
      profile
    ),
    region(
      "explanation",
      profile.phaseContract.regions[2].regionRole,
      explanationBounds,
      profile
    ),
    region(
      "revision",
      profile.phaseContract.regions[3].regionRole,
      revisionBounds,
      profile
    )
  ];

  const nativeBottom = stateAllocationCss.y + stateAllocationCss.height;
  const nextPhaseTop = explanationBounds.y;
  const actualNativeClearance = nextPhaseTop - nativeBottom;
  if (
    actualNativeClearance + 1e-6 <
    Math.max(
      profile.spacing.nativeToNextPhaseClearanceCssPx,
      profile.spacing.semanticGroupGapCssPx
    )
  ) {
    throw new Error("one-screen-native-next-phase-clearance-invalid");
  }

  return {
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    problemCount: 1,
    reserveFirst: true,
    fixedSafeCss: safe,
    fixedSafeCanvas: profile.geometryBinding.fixedSafeCanvas,
    regions,
    title,
    phaseInstructions: {
      prediction: instructionBox(
        request.text.predictionInstruction,
        predictionInstructionBounds
      ),
      "mathematical-confirmation": instructionBox(
        request.text.confirmationInstruction,
        confirmationInstructionBounds
      ),
      explanation: instructionBox(
        request.text.explanationInstruction,
        explanationInstructionBounds
      ),
      revision: instructionBox(
        request.text.revisionInstruction,
        revisionBounds
      )
    },
    candidateCards,
    native: {
      contractId: native.contract.contractId,
      contractVersion: request.native.contractVersion,
      interactionEvidenceId:
        request.native.interactionEvidence.evidenceId,
      interactionEvidenceContentSha256:
        request.native.interactionEvidence.contentSha256,
      coreReserveCss: {
        width: native.coreWidthCssPx,
        height: native.coreHeightCssPx
      },
      coreReserveBoundsCss,
      coreReserveBoundsCanvas: cssToCanvas(coreReserveBoundsCss, profile),
      allocatedStateEnvelopeCss: stateAllocationCss,
      allocatedStateEnvelopeCanvas: cssToCanvas(
        stateAllocationCss,
        profile
      ),
      stateEnvelopesCss,
      clearanceToNextPhaseCssPx: actualNativeClearance
    },
    writingBoxCss,
    writingBoxCanvas: cssToCanvas(writingBoxCss, profile),
    budget: {
      availableCssHeight: safe.height,
      usedCssHeight,
      remainingCssHeight: safe.height - usedCssHeight,
      overflowCssHeight: 0
    }
  };
}

/**
 * Production entry point. The request carries identities and learner text,
 * never a caller-controlled profile, metrics table, contract, or expected
 * evidence hash. R5 promotes interaction records into the frozen registry
 * only after their source file and native contract record are independently
 * pinned.
 */
export function resolveOneScreenLayout(
  request: OneScreenLayoutRequest
): OneScreenLayoutResult {
  const canonicalProfile = findCanonicalOneScreenProfile(
    request.profileId,
    request.profileVersion
  );
  const canonicalInteraction = findCanonicalOneScreenInteraction(
    request.interactionEvidenceId
  );
  const nativeSpatialRecord = nativeSpatialContractRecordSchema.parse(
    canonicalInteraction.nativeSpatialRecord
  );
  if (
    canonicalInteraction.evidence.sourceEvidence.nativeContractRecordHash !==
      nativeSpatialRecord.recordHash ||
    canonicalInteraction.evidence.nativeContractId !==
      nativeSpatialRecord.contract.contractId ||
    nativeSpatialRecord.contractVersion !== "2.0.0" ||
    !sha256Pattern.test(canonicalInteraction.evidenceFileSha256)
  ) {
    throw new Error("one-screen-canonical-interaction-binding-invalid");
  }
  return resolveOneScreenLayoutFromPinnedInputs({
    problemCount: request.problemCount,
    profile: canonicalProfile.profile,
    pinned: {
      geometryProfile: canonicalProfile.geometryProfile,
      geometryProfileFileSha256:
        canonicalProfile.geometryProfileFileSha256,
      fontMetrics: canonicalProfile.fontMetrics,
      fontMetricsFileSha256: canonicalProfile.fontMetricsFileSha256
    },
    text: request.text,
    native: {
      contract: nativeSpatialRecord.contract,
      contractVersion: "2.0.0",
      interactionEvidence: canonicalInteraction.evidence,
      expectedInteractionEvidenceContentSha256:
        canonicalInteraction.evidence.contentSha256
    }
  });
}
