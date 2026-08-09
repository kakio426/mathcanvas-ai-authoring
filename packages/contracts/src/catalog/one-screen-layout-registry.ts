import {
  conservativeFontMetricsTableSchema,
  oneScreenLayoutProfileSchema,
  type ConservativeFontMetricsTable,
  type OneScreenInteractionEvidence,
  type OneScreenLayoutProfile
} from "../vocabulary/one-screen-layout.js";
import {
  studentOneScreenGeometryProfileSchema,
  type StudentOneScreenGeometryProfile
} from "./editor-geometry-v1.js";
import type { NativeSpatialContractRecord } from "./native-spatial-harness.js";

export interface CanonicalOneScreenProfileRecord {
  readonly profileFileSha256: string;
  readonly profile: OneScreenLayoutProfile;
  readonly geometryProfileFileSha256: string;
  readonly geometryProfile: StudentOneScreenGeometryProfile;
  readonly fontMetricsFileSha256: string;
  readonly fontMetrics: ConservativeFontMetricsTable;
}

export interface CanonicalOneScreenInteractionRecord {
  readonly evidenceFileSha256: string;
  readonly evidence: OneScreenInteractionEvidence;
  readonly nativeSpatialRecord: NativeSpatialContractRecord;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

const geometryProfile = studentOneScreenGeometryProfileSchema.parse({
  schemaVersion: "1.0.0",
  profileId: "student-one-screen-fixed-geometry-v1",
  profileVersion: "1.0.0",
  evidenceId: "r3-editor-geometry-1280-v1",
  evidenceFileSha256:
    "6079f27e1d09072324e7edbfff55d164ef9e3b734cc88dc3c2d3d203e404bc35",
  resolverInputPolicy: "pinned-offline-profile-only",
  liveMeasurementAllowed: false,
  viewport: "1280x800",
  surfaceMode: "authoring-editor",
  sidebarState: "expanded",
  zoomObservation: "fit-compatible-geometry-observed",
  guardCssPx: 8,
  transform: {
    source: "svg-getScreenCTM",
    screenBounds: { height: 800, width: 1280, x: 0, y: 0 },
    viewBox: {
      height: 1382.400024,
      width: 2211.840088,
      x: -499.455994,
      y: -129.584
    },
    preserveAspectRatio: "none",
    ctm: {
      a: 0.578703681,
      b: 0,
      c: 0,
      d: 0.578703693,
      e: 289.037021878,
      f: 74.990739204
    },
    inverse: {
      a: 1.728000069,
      b: 0,
      c: 0,
      d: 1.728000031,
      e: -499.455993652,
      f: -129.583999634
    },
    scaleX: 0.578703681,
    scaleY: 0.578703693,
    cornerResidualCssPx: 0,
    effectiveRenderedScaleUsage: "diagnostic-only"
  },
  fixedSafeCss: { height: 672, width: 976, x: 240, y: 64 },
  fixedSafeCanvas: {
    height: 1161.216,
    width: 1686.528,
    x: -84.735993,
    y: -18.992
  },
  singleReferenceInteractionDiagnostic: {
    coverage: "single-reference-diagnostic",
    activityId: "number.division.quotient-remainder.claim-evidence-v1",
    affordanceFamilyId: "native-counting-model-v1",
    usableAsGenericResolverInput: false,
    interactionSafeCss: { height: 616, width: 976, x: 240, y: 64 },
    interactionSafeCanvas: {
      height: 1064.448,
      width: 1686.528,
      x: -84.735993,
      y: -18.992
    }
  },
  tolerance: { geometryCssPx: 0.01, roundTripCssPx: 0.01 },
  eligibility: {
    fixedGeometryInputReady: true,
    interactionGeometryInputReady: false,
    blockers: ["affordance-family-dynamic-chrome-coverage-pending"],
    r4OverallComplete: false,
    releaseQualified: false
  },
  contentSha256:
    "5709aa3b23f66761436eeeea61e7805e3ea20290ef1a5b2a55f80be6a18eaff3"
});

const fontMetrics = conservativeFontMetricsTableSchema.parse({
  schemaVersion: "1.0.0",
  tableId: "pretendard-conservative-korean-v1",
  tableVersion: "1.0.0",
  fontFingerprint:
    "sha256:d77e1591965fe81b0592b97c8bc4323719e80bb4581d9065dc2acf87b7a5fb9c",
  sourceEvidence: {
    probeId: "r3-text-box-availability-v1",
    evidenceFileSha256:
      "c454a6aa2e25b4ecdab91b014d4ff73943042b48ab6267418f98b17e2117d283",
    observedFontFamily: "\"Pretendard Variable\", Pretendard"
  },
  method: "offline-conservative-codepoint-advance-v1",
  advanceEm: {
    hangul: 1,
    digit: 0.75,
    latin: 1,
    whitespace: 0.5,
    punctuation: 1,
    symbol: 1,
    emoji: 1.2,
    unknown: 1.2
  },
  limitations: [
    "실시간 DOM 폭을 resolver 입력으로 사용하지 않고 pinned font fingerprint에 맞는 보수적 codepoint advance만 사용한다.",
    "실제 glyph ink box가 아니라 줄바꿈과 상자 예산을 위한 상한 추정이며 fresh canary 시각 검증을 대체하지 않는다.",
    "Pretendard 이외 font fingerprint에서는 이 표를 선택할 수 없다."
  ],
  contentSha256:
    "d93380172a5c6af313e846739d58e1791e4af05044c7e14df9bad032e4b2c2f8"
});

const profile = oneScreenLayoutProfileSchema.parse({
  schemaVersion: "1.0.0",
  profileId: "student-one-screen-large-v1",
  profileVersion: "1.0.0",
  geometryBinding: {
    profileId: geometryProfile.profileId,
    profileVersion: geometryProfile.profileVersion,
    profileFileSha256:
      "5af1498c3dd392eb7f2d771679b62eb435d37e1d636c3c9b74fbc34030b21732",
    profileContentSha256: geometryProfile.contentSha256,
    fixedSafeCss: geometryProfile.fixedSafeCss,
    fixedSafeCanvas: geometryProfile.fixedSafeCanvas,
    coordinateScaleX: geometryProfile.transform.scaleX,
    coordinateScaleY: geometryProfile.transform.scaleY
  },
  fontMetricsBinding: {
    tableId: fontMetrics.tableId,
    tableVersion: fontMetrics.tableVersion,
    tableFileSha256:
      "3bd8f3703cee8b7eff76598d3c98cd267d5361caecac97ac45c72eea36f93fc6",
    tableContentSha256: fontMetrics.contentSha256,
    fontFingerprint: fontMetrics.fontFingerprint
  },
  viewport: {
    width: 1280,
    height: 800,
    surfaceMode: "authoring-editor",
    sidebarState: "expanded",
    scrollAllowed: false,
    canvasPanAllowed: false
  },
  typography: {
    fixedLearnerTextMinimumCssPx: 22,
    title: { minCssPx: 38, targetCssPx: 40, maxCssPx: 42, lineHeightRatio: 1.4 },
    question: { minCssPx: 28, targetCssPx: 30, maxCssPx: 32, lineHeightRatio: 1.4 },
    coreInstruction: { minCssPx: 28, targetCssPx: 30, maxCssPx: 32, lineHeightRatio: 1.4 },
    candidate: { minCssPx: 24, targetCssPx: 26, maxCssPx: 28, lineHeightRatio: 1.4 },
    mathLabel: { minCssPx: 24, targetCssPx: 26, maxCssPx: 28, lineHeightRatio: 1.4 },
    support: { minCssPx: 22, targetCssPx: 23, maxCssPx: 24, lineHeightRatio: 1.4 }
  },
  spacing: {
    outerPaddingXCssPx: 20,
    outerPaddingYCssPx: 12,
    semanticGroupGapCssPx: 18,
    internalGapCssPx: 8,
    candidateCardPaddingXCssPx: 20,
    candidateCardPaddingYCssPx: 18,
    candidateColumnGapCssPx: 12,
    candidateRowGapCssPx: 12,
    interProblemGapCssPx: 24,
    writingMinimumHeightCssPx: 44,
    nativeToNextPhaseClearanceCssPx: 18,
    centeringToleranceCssPx: 1
  },
  candidatePolicy: {
    minimumCount: 3,
    maximumCount: 3,
    columns: 3,
    horizontalAlignment: "center",
    verticalAlignment: "center"
  },
  nativePolicy: {
    reserveFirst: true,
    interactionEvidenceRequired: true,
    taskEnvelopeMustBeBounded: true,
    requiredStates: ["initial", "selected", "manipulated"]
  },
  problemCapacity: {
    supportedCounts: [1],
    assumedMinimumNativeReserveCssHeight: 120,
    oneProblemMinimumCssHeight: 580.4,
    twoProblemMinimumCssHeight: 1160.8,
    availableCssHeight: 672,
    twoProblemStatus: "unsupported",
    twoProblemReason:
      "큰 글자·세 후보·native reserve·설명 쓰기 하한을 유지하면 두 문제 최소 높이 1160.8px가 fixed-safe 672px를 넘으므로 구현하지 않는다."
  },
  phaseContract: {
    contractId: "prediction-confirmation-explanation-revision-v1",
    contractVersion: "1.0.0",
    sequence: [
      "prediction",
      "mathematical-confirmation",
      "explanation",
      "revision"
    ],
    regions: [
      {
        regionRole: "phase.prediction",
        visibleToLearner: true,
        requiresStudentAction: true,
        phase: "prediction",
        requiredAction: "record-initial-mathematical-decision",
        requiredArtifact: "prediction-record"
      },
      {
        regionRole: "phase.mathematical-confirmation",
        visibleToLearner: true,
        requiresStudentAction: true,
        phase: "mathematical-confirmation",
        requiredAction: "change-native-mathematical-state",
        requiredArtifact: "native-state-evidence"
      },
      {
        regionRole: "phase.explanation",
        visibleToLearner: true,
        requiresStudentAction: true,
        phase: "explanation",
        requiredAction: "explain-with-observed-evidence",
        requiredArtifact: "student-evidence-explanation"
      },
      {
        regionRole: "phase.revision",
        visibleToLearner: true,
        requiresStudentAction: true,
        phase: "revision",
        requiredAction: "revise-recorded-decision",
        requiredArtifact: "revised-prediction-record"
      }
    ],
    initialState: {
      answerComplete: false,
      nativeMathematicalStateComplete: false
    }
  },
  eligibility: {
    fixedGeometryReady: true,
    offlineTypographyReady: true,
    genericInteractionReady: false,
    requiresActivitySpecificInteractionEvidence: true,
    releaseQualified: false
  },
  contentSha256:
    "fe508889c50657b7d0a4e29db171aa3d581e6c7c0fcf1d5ec984b31db05e5b38"
});

const canonicalProfileRecords = deepFreeze([
  {
    profileFileSha256:
      "78eb7f79b27ac46c30ab81ff71467ede0f6f9feedec7232dbb3805f0804b9580",
    profile,
    geometryProfileFileSha256:
      "5af1498c3dd392eb7f2d771679b62eb435d37e1d636c3c9b74fbc34030b21732",
    geometryProfile,
    fontMetricsFileSha256:
      "3bd8f3703cee8b7eff76598d3c98cd267d5361caecac97ac45c72eea36f93fc6",
    fontMetrics
  }
] satisfies readonly CanonicalOneScreenProfileRecord[]);

// R4 intentionally contains no releasable activity interaction record. R5
// adds reviewed records here only after activity-specific canary evidence is
// file/content/hash pinned. An unknown ID therefore fails closed.
const canonicalInteractionRecords: readonly CanonicalOneScreenInteractionRecord[] =
  deepFreeze([] as CanonicalOneScreenInteractionRecord[]);

export function findCanonicalOneScreenProfile(
  profileId: string,
  profileVersion: string
): CanonicalOneScreenProfileRecord {
  const record = canonicalProfileRecords.find(
    (entry) =>
      entry.profile.profileId === profileId &&
      entry.profile.profileVersion === profileVersion
  );
  if (!record) throw new Error("one-screen-profile-not-registered");
  return structuredClone(record);
}

export function findCanonicalOneScreenInteraction(
  evidenceId: string
): CanonicalOneScreenInteractionRecord {
  const record = canonicalInteractionRecords.find(
    (entry) => entry.evidence.evidenceId === evidenceId
  );
  if (!record) throw new Error("one-screen-interaction-not-registered");
  return structuredClone(record);
}

export function canonicalOneScreenRegistryIsDeepFrozen(): boolean {
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object" || !Object.isFrozen(value)) {
      return false;
    }
    return Object.values(value as Record<string, unknown>).every((child) =>
      child && typeof child === "object" ? visit(child) : true
    );
  };
  return visit(canonicalProfileRecords) && visit(canonicalInteractionRecords);
}
