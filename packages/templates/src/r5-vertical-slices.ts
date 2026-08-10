import {
  r5VerticalSliceSpecSchema,
  type OneScreenLayoutProfile,
  type R5NativeToolDiscoveryEvidence,
  type R5VerticalSliceSpec,
  type SpatialBounds,
  type WorksheetCatalogEntry
} from "@mathcanvas/contracts";
import { findWorksheetCatalogEntry } from "@mathcanvas/curriculum";

interface PedagogicalConfig {
  readonly sequence: 1 | 2 | 10 | 23;
  readonly catalogEntryId: string;
  readonly catalogSnapshotSha256: string;
  readonly toolKey: "DP03PG" | "NO04NG" | "NO03FM" | "SM07CS";
  readonly variantId: string;
  readonly nativeScale: number;
  readonly mathematicalDecision: string;
  readonly misconception: R5VerticalSliceSpec["misconception"];
  readonly learnerTask: R5VerticalSliceSpec["learnerTask"];
  readonly configuredInitialState: Record<string, unknown>;
  readonly targetState: Record<string, unknown>;
  readonly invariant: string;
}

const commonInstructions = {
  prediction: "먼저 답 카드를 하나 골라 예상 칸에 놓으세요.",
  revision: "처음 고른 답과 다르면 답 카드를 바꾸세요."
} as const;

const configs: readonly PedagogicalConfig[] = [
  {
    sequence: 1,
    catalogEntryId: "grade3-basic-practice-ppt-01",
    catalogSnapshotSha256:
      "8f4ecc96b76929678a4c17229e35c0702b252a937545b748956fb41459cd8892",
    toolKey: "DP03PG",
    variantId: "DP03PG-01",
    nativeScale: 0.78,
    mathematicalDecision:
      "그림 한 개가 뜻하는 5권을 그림 수에 적용해 20권까지 더 필요한 그림 수를 결정한다.",
    misconception: {
      misconceptionId: "picture-count-as-additional-count",
      statement:
        "지금 보이는 그림 3개나 목표의 전체 그림 4개를 더 놓을 그림 수로 답한다.",
      rejectedByObservedEvidence:
        "그림 3개는 15권이고 그림 한 개를 더한 4개에서 20권이 되는 native graph state가 두 답을 구별한다."
    },
    learnerTask: {
      question: "20권이 되려면 그림을 몇 개 더 놓을까요?",
      candidates: [
        {
          candidateId: "add-one-picture",
          text: "1개 더",
          interpretation: "3×5=15에서 5권 한 묶음을 한 번 더한다."
        },
        {
          candidateId: "repeat-visible-three",
          text: "3개 더",
          interpretation: "현재 보이는 그림 수 3을 그대로 더 놓을 수로 쓴다."
        },
        {
          candidateId: "repeat-target-four",
          text: "4개 더",
          interpretation: "목표에 필요한 전체 그림 수 4를 추가 그림 수와 혼동한다."
        }
      ],
      correctCandidateId: "add-one-picture",
      phaseSequence: [
        "prediction",
        "mathematical-confirmation",
        "explanation",
        "revision"
      ],
      instructions: {
        ...commonInstructions,
        mathematicalConfirmation:
          "‘책’ 칸의 +를 눌러 20권이 되게 그림을 더하세요.",
        explanation: "그림 수와 한 개의 값을 곱한 식으로 설명하세요."
      },
      explanationEvidence:
        "학생이 만든 그림 4개, 범례 1개=5권, 식 4×5=20을 함께 사용한다.",
      initialAnswerComplete: false
    },
    configuredInitialState: {
      legend: "그림 1개 = 책 5권",
      visiblePictureCount: 3,
      interpretedBookCount: 15,
      targetBookCount: 20,
      requiredAdditionalPictureCount: null
    },
    targetState: {
      legend: "그림 1개 = 책 5권",
      visiblePictureCount: 4,
      interpretedBookCount: 20,
      requiredAdditionalPictureCount: 1
    },
    invariant: "그림 수 × 그림 한 개가 뜻하는 5권 = 실제 책 수"
  },
  {
    sequence: 2,
    catalogEntryId: "grade3-basic-practice-ppt-02",
    catalogSnapshotSha256:
      "4a78eb818fd4191e281c5d56152f3395cf32b04a0c25d1ef5d912f2f02bb9e9c",
    toolKey: "NO04NG",
    variantId: "NO04NG-03",
    nativeScale: 0.65,
    mathematicalDecision:
      "한 줄의 6개와 4줄을 배열의 두 방향에 대응시켜 전체를 4×6으로 결정한다.",
    misconception: {
      misconceptionId: "multiply-factors-as-addends",
      statement: "4와 6을 같은 묶음 구조로 보지 않고 4+6=10으로 계산한다.",
      rejectedByObservedEvidence:
        "4줄 6칸의 교차 칸에 24가 나타나는 native multiplication table이 덧셈 10과 초기 4×5의 20을 구별한다."
    },
    learnerTask: {
      question: "6개씩 4줄이면 모두 몇 개일까요?",
      candidates: [
        {
          candidateId: "sum-factors-ten",
          text: "10개",
          interpretation: "4와 6을 더한다."
        },
        {
          candidateId: "initial-table-twenty",
          text: "20개",
          interpretation: "초기 5칸 표의 4×5 값을 목표 답으로 오해한다."
        },
        {
          candidateId: "four-by-six-twenty-four",
          text: "24개",
          interpretation: "6개씩 4줄을 4×6으로 나타낸다."
        }
      ],
      correctCandidateId: "four-by-six-twenty-four",
      phaseSequence: [
        "prediction",
        "mathematical-confirmation",
        "explanation",
        "revision"
      ],
      instructions: {
        ...commonInstructions,
        mathematicalConfirmation:
          "표의 끝점을 끌어 가로 6칸, 세로 4줄로 바꾸세요.",
        explanation:
          "표에서 4와 6이 만난 칸의 수를 곱셈식으로 써서 설명하세요."
      },
      explanationEvidence:
        "학생이 만든 4줄×6칸 배열, 교차 칸 24, 식 4×6=24를 함께 사용한다.",
      initialAnswerComplete: false
    },
    configuredInitialState: {
      visibleRows: 5,
      visibleColumns: 5,
      targetRow: 4,
      targetColumn: 6,
      targetProduct: null
    },
    targetState: {
      visibleRows: 4,
      visibleColumns: 6,
      targetRow: 4,
      targetColumn: 6,
      targetProduct: 24
    },
    invariant: "한 줄의 수 × 줄 수 = 배열의 전체 수"
  },
  {
    sequence: 10,
    catalogEntryId: "grade3-basic-practice-ppt-10",
    catalogSnapshotSha256:
      "eaf7bd42c43d325fcfbd5af1778f3c27ee055e6544bec5372772c8e3e27ff556",
    toolKey: "NO03FM",
    variantId: "NO03FM-07",
    nativeScale: 1,
    mathematicalDecision:
      "같은 전체 1을 이루려면 똑같은 1/4 조각이 정확히 네 개 필요하다고 결정한다.",
    misconception: {
      misconceptionId: "fraction-boundaries-as-parts",
      statement: "조각 사이의 선 세 개를 세어 1/4 조각이 세 개 필요하다고 답한다.",
      rejectedByObservedEvidence:
        "native fraction strip을 1/4 한 조각에서 4/4까지 늘리면 선이 아니라 같은 조각 네 개가 전체 1을 이룸이 보인다."
    },
    learnerTask: {
      question: "1/4 조각 몇 개가 모이면 1일까요?",
      candidates: [
        {
          candidateId: "three-quarter-parts",
          text: "3개",
          interpretation: "조각 사이 경계선의 수를 조각 수로 센다."
        },
        {
          candidateId: "four-quarter-parts",
          text: "4개",
          interpretation: "같은 1/4 조각 네 개가 4/4, 즉 전체 1을 이룬다."
        },
        {
          candidateId: "five-quarter-parts",
          text: "5개",
          interpretation: "전체 1을 넘는 5/4까지 한 조각 더 붙인다."
        }
      ],
      correctCandidateId: "four-quarter-parts",
      phaseSequence: [
        "prediction",
        "mathematical-confirmation",
        "explanation",
        "revision"
      ],
      instructions: {
        ...commonInstructions,
        mathematicalConfirmation:
          "띠의 끝점을 끌어 1/4 조각 4개로 만드세요.",
        explanation:
          "똑같은 1/4 조각이 몇 개 모여 전체 1이 되었는지 쓰세요."
      },
      explanationEvidence:
        "학생이 늘린 1/4 조각 네 개와 4/4=1 관계를 사용한다.",
      initialAnswerComplete: false
    },
    configuredInitialState: {
      divider: 4,
      equalPartCount: 1,
      fraction: "1/4",
      wholeComplete: false
    },
    targetState: {
      divider: 4,
      equalPartCount: 4,
      fraction: "4/4",
      wholeComplete: true
    },
    invariant: "전체 1은 똑같은 1/4 조각 네 개로 이루어진다."
  },
  {
    sequence: 23,
    catalogEntryId: "grade3-basic-practice-ppt-23",
    catalogSnapshotSha256:
      "8ed8ebe9a29b0b29c61b5c2c7829c7e370793f75d2f0b56bb7d23d037ab85386",
    toolKey: "SM07CS",
    variantId: "SM07CS-01",
    nativeScale: 0.82,
    mathematicalDecision:
      "원의 크기가 바뀌어도 중심 O에서 원 위까지 이은 선분은 반지름이라고 결정한다.",
    misconception: {
      misconceptionId: "center-to-circle-segment-as-diameter",
      statement: "중심에서 원 위 한 점까지만 이은 선분을 지름이라고 답한다.",
      rejectedByObservedEvidence:
        "중심 O를 고정하고 원의 크기를 바꾸면 중심에서 원 위까지의 한쪽 길이만 변하며, 원을 가로지르는 지름과 구별된다."
    },
    learnerTask: {
      question: "O에서 원 위까지 이은 선분은 무엇일까요?",
      candidates: [
        {
          candidateId: "circle-radius",
          text: "반지름",
          interpretation: "원의 중심과 원 위의 한 점을 이은 선분이다."
        },
        {
          candidateId: "circle-diameter",
          text: "지름",
          interpretation: "중심을 지나 원 위의 두 점을 잇는 선분과 혼동한다."
        },
        {
          candidateId: "circle-circumference",
          text: "원의 둘레",
          interpretation: "원의 경계 전체와 중심에서 경계까지의 선분을 혼동한다."
        }
      ],
      correctCandidateId: "circle-radius",
      phaseSequence: [
        "prediction",
        "mathematical-confirmation",
        "explanation",
        "revision"
      ],
      instructions: {
        ...commonInstructions,
        mathematicalConfirmation:
          "중심 O는 그대로 두고 검은 점을 끌어 원의 크기를 바꾸세요.",
        explanation: "O에서 원 위까지 이은 선분을 보고 설명하세요."
      },
      explanationEvidence:
        "중심 O의 고정, 원 위 검은 점, 바뀐 반지름 길이를 함께 사용한다.",
      initialAnswerComplete: false
    },
    configuredInitialState: {
      centerLabel: "O",
      center: { x: 0, y: 0 },
      radius: 200,
      relationName: null
    },
    targetState: {
      centerLabel: "O",
      center: { x: 0, y: 0 },
      radius: 80,
      relationName: "반지름"
    },
    invariant: "원의 중심과 원 위의 한 점을 이은 선분은 반지름이다."
  }
] as const;

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

function sourceUnion(bounds: readonly SpatialBounds[]): SpatialBounds {
  const left = Math.min(...bounds.map((entry) => entry.x));
  const top = Math.min(...bounds.map((entry) => entry.y));
  const right = Math.max(...bounds.map((entry) => entry.x + entry.width));
  const bottom = Math.max(...bounds.map((entry) => entry.y + entry.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function predictedEnvelope(
  bounds: SpatialBounds,
  union: SpatialBounds,
  scale: number
): SpatialBounds {
  return {
    x: rounded((bounds.x - union.x) * scale),
    y: rounded((bounds.y - union.y) * scale),
    width: rounded(bounds.width * scale),
    height: rounded(bounds.height * scale)
  };
}

function families(entry: WorksheetCatalogEntry): R5VerticalSliceSpec["families"] {
  return {
    blueprint: entry.blueprintFamily,
    variation: entry.variationPreset,
    affordance: entry.affordanceFamily.family,
    layout: entry.layoutFamily
  };
}

export function buildR5VerticalSliceSpecs(
  discovery: R5NativeToolDiscoveryEvidence,
  profile: OneScreenLayoutProfile
): readonly R5VerticalSliceSpec[] {
  return configs.map((config) => {
    const entry = findWorksheetCatalogEntry(config.catalogEntryId);
    const observation = discovery.observations.find(
      (candidate) => candidate.variantId === config.variantId
    );
    if (!entry) throw new Error(`r5-slice-catalog-missing:${config.catalogEntryId}`);
    if (
      !observation?.semanticProbe ||
      observation.moduleKey !== config.toolKey ||
      observation.semanticProbe.operation.operation !== configOperation(config)
    ) {
      throw new Error(`r5-slice-discovery-binding-missing:${config.variantId}`);
    }
    const sourceStates = [
      { state: "initial" as const, bounds: observation.initial.visualBoundsCssPx },
      { state: "selected" as const, bounds: observation.initial.selectedEnvelopeCssPx },
      {
        state: "manipulated" as const,
        bounds: observation.semanticProbe.manipulatedEnvelopeCssPx
      }
    ];
    const union = sourceUnion(sourceStates.map((state) => state.bounds));
    const predictedStates = sourceStates.map((state) => ({
      state: state.state,
      relativeTo: "native-union-top-left" as const,
      bounds: predictedEnvelope(state.bounds, union, config.nativeScale)
    })) as R5VerticalSliceSpec["spatialPreflight"]["predictedStateEnvelopesCss"];
    const predictedUnion = sourceUnion(
      predictedStates.map((state) => state.bounds)
    );
    return r5VerticalSliceSpecSchema.parse({
      schemaVersion: "1.0.0",
      sliceId: `r5-ppt-${String(config.sequence).padStart(2, "0")}-v1`,
      sliceVersion: "1.0.0",
      sequence: config.sequence,
      catalogEntryId: config.catalogEntryId,
      title: entry.title,
      catalogSnapshotSha256: config.catalogSnapshotSha256,
      families: families(entry),
      mathematicalDecision: config.mathematicalDecision,
      misconception: config.misconception,
      learnerTask: config.learnerTask,
      native: {
        toolKey: config.toolKey,
        variantId: config.variantId,
        discoveryEvidenceId: discovery.evidenceId,
        discoveryEvidenceContentSha256: discovery.contentSha256,
        initialObjectSha256: observation.initial.objectSha256,
        manipulatedObjectSha256: observation.semanticProbe.objectSha256,
        initialScreenshotSha256: observation.initial.screenshotSha256,
        manipulatedScreenshotSha256:
          observation.semanticProbe.screenshotSha256,
        operation: String(observation.semanticProbe.operation.operation),
        configuredInitialState: config.configuredInitialState,
        targetState: config.targetState,
        invariant: config.invariant,
        primaryMathematicalStateChanged: true,
        initialTargetAnswerVisible: false
      },
      spatialPreflight: {
        profileId: profile.profileId,
        profileVersion: profile.profileVersion,
        profileContentSha256: profile.contentSha256,
        problemCount: 1,
        nativeScale: config.nativeScale,
        sourceStateEnvelopesCss: sourceStates,
        predictedStateEnvelopesCss: predictedStates,
        predictedUnionCss: predictedUnion,
        maximumNativeReserveCssHeight: 211.6,
        oneScreenBudgetPass: true,
        actualInteractionEvidencePending: true
      },
      candidateState: "offline-design-candidate",
      releaseQualified: false,
      blockers: [
        "activity-specific interaction evidence is not registered",
        "actual save/reopen lifecycle is pending",
        "fresh glyph and chrome canary is pending"
      ]
    });
  });
}

function configOperation(config: PedagogicalConfig): string {
  if (config.variantId === "DP03PG-01") {
    return "select-picture-graph-column-and-add-one-unit";
  }
  if (config.variantId === "NO04NG-03") {
    return "make-four-rows-by-six-columns-to-reveal-target-product";
  }
  if (config.variantId === "NO03FM-07") return "extend-equal-fraction-parts";
  if (config.variantId === "SM07CS-01") return "change-circle-radius";
  throw new Error(`r5-slice-operation-unknown:${config.variantId}`);
}
