export const TOOL_SUPPORT_STATES = [
  "captured",
  "contracted",
  "verified",
  "released"
] as const;

export type ToolSupportState =
  (typeof TOOL_SUPPORT_STATES)[number];

export const MATHCANVAS_UNIT_IDS = [
  "Unit01",
  "Unit02",
  "Unit03",
  "Unit04"
] as const;

export type MathCanvasUnitId =
  (typeof MATHCANVAS_UNIT_IDS)[number];

export const MATHCANVAS_PROJECT_CATEGORIES = {
  "수와 연산": {
    categoryId: "rJa0d46MAy",
    unitId: "Unit01"
  },
  "변화와 관계": {
    categoryId: "4l_eHBivNq",
    unitId: "Unit02"
  },
  "도형과 측정": {
    categoryId: "kaplNGyBBd",
    unitId: "Unit03"
  },
  "자료와 가능성": {
    categoryId: "ZS0MczMDuY",
    unitId: "Unit04"
  }
} as const;

export type ToolIntegrationTarget =
  | "tool-adapter"
  | "internal-editor-action";

export interface ToolSupportHistoryEntry {
  readonly state: ToolSupportState;
  readonly evidenceIds: readonly string[];
}

export interface ToolManifestEntry {
  readonly stableKey: string;
  readonly observedName: string;
  readonly surface: "math-palette" | "common-authoring";
  readonly integrationTarget: ToolIntegrationTarget;
  readonly supportState: ToolSupportState;
  readonly categoryId: MathCanvasUnitId | "bottom-common-toolbar";
  readonly moduleKey?: string;
  readonly nativeToolId?: string;
  readonly adapterKey?: string;
  readonly evidenceIds: readonly string[];
  readonly supportHistory: readonly ToolSupportHistoryEntry[];
  readonly lifecycleEvidenceIds?: readonly string[];
}

const moduleDefinitions: Readonly<
  Record<MathCanvasUnitId, readonly (readonly [string, string])[]>
> = {
  Unit01: [
    ["NO01LC", "연결 모형"],
    ["NO01NR", "수 구슬"],
    ["NO01SC", "수 세기 모형"],
    ["NO01TF", "십 배열판"],
    ["NO02CB", "색 막대"],
    ["NO02DM", "도미노"],
    ["NO03BT", "수 모형"],
    ["NO03FM", "분수 모형"],
    ["NO04NG", "배열표"],
    ["NO04NT", "수 카드"],
    ["NO04PC", "자릿값 카드"],
    ["NO04PD", "자릿값 모형"],
    ["NO07IC", "셈돌"],
    ["NO07NL", "수직선"],
    ["NO07PF", "소인수분해"],
    ["NO10VD", "벤 다이어그램"]
  ],
  Unit02: [
    ["CR02AB", "속성블록"],
    ["CR07AT", "대수 막대"],
    ["CR07BS", "접시저울"],
    ["CR07CP", "좌표평면"],
    ["CR10AB", "대수 블록"],
    ["CR10CS", "공간좌표(3D)"]
  ],
  Unit03: [
    ["SM02AD", "시계"],
    ["SM02PB", "패턴블록"],
    ["SM02TG", "칠교판"],
    ["SM03GB", "도형판"],
    ["SM04PM", "펜토미노"],
    ["SM05PG", "다각형"],
    ["SM05RP", "정다각형"],
    ["SM06PH", "다면체(3D)"],
    ["SM06UC", "쌓기나무(3D)"],
    ["SM07CS", "원과 부채꼴"],
    ["SM07PS", "정다면체(3D)"],
    ["SM07SR", "회전체(3D)"]
  ],
  Unit04: [
    ["DP02TG", "자료와 표"],
    ["DP03PG", "그림그래프"],
    ["DP04BC", "막대그래프"],
    ["DP05LC", "꺾은선그래프"],
    ["DP06RC", "비율 그래프"],
    ["DP07CF", "상대도수 그래프"],
    ["DP07FP", "도수분포다각형"],
    ["DP07FT", "도수분포표"],
    ["DP07HG", "히스토그램"],
    ["DP07MC", "자료와 대푯값"],
    ["DP07SL", "줄기와 잎 그림"],
    ["DP09BP", "상자 그림"]
  ]
};

function moduleEvidence(moduleKey: string): readonly string[] {
  return [
    `research/mathcanvas/tool-catalog.snapshot.json#tool=${moduleKey}`,
    `research/mathcanvas/bundle-contract.snapshot.json#tool=${moduleKey}`
  ];
}

function capturedSupportHistory(
  evidenceIds: readonly string[]
): readonly ToolSupportHistoryEntry[] {
  return [{ state: "captured", evidenceIds }];
}

function contractedSupportHistory(
  capturedEvidenceIds: readonly string[],
  contractedEvidenceIds: readonly string[]
): readonly ToolSupportHistoryEntry[] {
  return [
    {
      state: "captured",
      evidenceIds: capturedEvidenceIds
    },
    {
      state: "contracted",
      evidenceIds: contractedEvidenceIds
    }
  ];
}

interface ReleasedToolEvidence {
  readonly captured: readonly string[];
  readonly contracted: readonly string[];
  readonly verified: readonly string[];
  readonly released: readonly string[];
  readonly lifecycle: readonly string[];
}

function releasedSupportHistory(
  evidence: ReleasedToolEvidence
): readonly ToolSupportHistoryEntry[] {
  return [
    {
      state: "captured",
      evidenceIds: evidence.captured
    },
    {
      state: "contracted",
      evidenceIds: evidence.contracted
    },
    {
      state: "verified",
      evidenceIds: evidence.verified
    },
    {
      state: "released",
      evidenceIds: evidence.released
    }
  ];
}

const releasedToolEvidence = {
  DP04BC: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=DP04BC",
      "research/mathcanvas/graph-tool-contract.observations.json#tool=DP04BC"
    ],
    contracted: ["research/mathcanvas/graph-tool-object-template.json"],
    verified: [
      "research/mathcanvas/graph-tool-release-canary.json#tool=DP04BC"
    ],
    released: [
      "research/mathcanvas/graph-tool-release-canary.json#key=moduleActivation"
    ],
    lifecycle: [
      "research/mathcanvas/graph-tool-release-canary.json#key=reopenedObjectCount"
    ]
  },
  DP02TG: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=DP02TG",
      "research/mathcanvas/graph-tool-contract.observations.json#tool=DP02TG"
    ],
    contracted: ["research/mathcanvas/graph-tool-object-template.json#key=dataTable"],
    verified: [
      "research/mathcanvas/graph-tool-release-canary.json#tool=DP02TG"
    ],
    released: [
      "research/mathcanvas/graph-tool-release-canary.json#key=status"
    ],
    lifecycle: [
      "research/mathcanvas/graph-tool-release-canary.json#key=submittedObjectCount"
    ]
  },
  NO03FM: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM",
      "research/mathcanvas/bundle-contract.snapshot.json#tool=NO03FM"
    ],
    contracted: ["fixtures/mathcanvas/fraction-svg-map.json"],
    verified: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=verified:NO03FM"
    ],
    released: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM"
    ],
    lifecycle: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=lifecycle:NO03FM"
    ]
  },
  NO01SC: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC",
      "research/mathcanvas/bundle-contract.snapshot.json#tool=NO01SC"
    ],
    contracted: [
      "research/mathcanvas/module-variant-contract.static.json#tool=NO01SC",
      "research/mathcanvas/native-spatial-contract-catalog.json"
    ],
    verified: [
      "research/mathcanvas/division-counting-group-canary.json#claim=verified:NO01SC"
    ],
    released: [
      "research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC"
    ],
    lifecycle: [
      "research/mathcanvas/division-counting-group-canary.json#claim=lifecycle:NO01SC"
    ]
  },
  NO04NT: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT",
      "research/mathcanvas/bundle-contract.snapshot.json#tool=NO04NT"
    ],
    contracted: [
      "research/mathcanvas/module-variant-contract.static.json#tool=NO04NT",
      "research/mathcanvas/wave4-number-card-digit-mapping.ui.json"
    ],
    verified: [
      "research/mathcanvas/wave4-number-card-canary.roundtrip.json#claim=verified:NO04NT"
    ],
    released: [
      "research/mathcanvas/wave4-number-card-canary.roundtrip.json#claim=released:NO04NT"
    ],
    lifecycle: [
      "research/mathcanvas/wave4-number-card-canary.roundtrip.json#claim=lifecycle:NO04NT"
    ]
  },
  CR07BS: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=CR07BS",
      "research/mathcanvas/bundle-contract.snapshot.json#tool=CR07BS"
    ],
    contracted: [
      "research/mathcanvas/wave5-balance-scale-canary.roundtrip.json#key=variants"
    ],
    verified: [
      "research/mathcanvas/wave5-balance-scale-canary.roundtrip.json#key=lifecycle"
    ],
    released: [
      "research/mathcanvas/wave5-balance-scale-canary.roundtrip.json#key=canvasState"
    ],
    lifecycle: [
      "research/mathcanvas/wave5-balance-scale-canary.roundtrip.json#key=writeBoundary"
    ]
  },
  SM02AD: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=SM02AD",
      "research/mathcanvas/bundle-contract.snapshot.json#tool=SM02AD"
    ],
    contracted: [
      "research/mathcanvas/module-variant-contract.static.json#tool=SM02AD"
    ],
    verified: [
      "research/mathcanvas/wave6-clock-canary.roundtrip.json#key=lifecycle",
      "research/mathcanvas/wave6-clock-canary.roundtrip.json#key=variants"
    ],
    released: [
      "research/mathcanvas/wave6-clock-canary.roundtrip.json#key=interaction"
    ],
    lifecycle: [
      "research/mathcanvas/wave6-clock-canary.roundtrip.json#key=writeBoundary"
    ]
  },
  NO04PD: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD",
      "research/mathcanvas/bundle-contract.snapshot.json#tool=NO04PD"
    ],
    contracted: [
      "research/mathcanvas/module-variant-contract.static.json#tool=NO04PD"
    ],
    verified: [
      "research/mathcanvas/wave14-place-value-model-canary.roundtrip.json#key=lifecycle"
    ],
    released: [
      "research/mathcanvas/wave14-place-value-model-canary.roundtrip.json#key=interaction"
    ],
    lifecycle: [
      "research/mathcanvas/wave14-place-value-model-canary.roundtrip.json#key=savedWireExamples"
    ]
  },
  SM02PB: {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=SM02PB",
      "research/mathcanvas/bundle-contract.snapshot.json#tool=SM02PB"
    ],
    contracted: [
      "research/mathcanvas/module-variant-contract.static.json#tool=SM02PB"
    ],
    verified: [
      "research/mathcanvas/wave16-pattern-release-canary.json#key=persistedShape"
    ],
    released: [
      "research/mathcanvas/wave16-pattern-release-canary.json#key=interactionShape"
    ],
    lifecycle: [
      "research/mathcanvas/wave16-pattern-release-canary.json#key=reopenShape"
    ]
  },
  "common.rectangle": {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.rectangle"
    ],
    contracted: [
      "fixtures/mathcanvas/native-object-contract.json#key=drawRectangle"
    ],
    verified: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=verified:common.rectangle"
    ],
    released: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:common.rectangle"
    ],
    lifecycle: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=lifecycle:common.rectangle"
    ]
  },
  "common.point-line": {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.point-line",
      "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation"
    ],
    contracted: [
      "research/mathcanvas/angle-element-contract.static.json#key=nativeFactory"
    ],
    verified: [
      "research/mathcanvas/wave18-angle-turn-release-canary.json#key=persistedShape"
    ],
    released: [
      "research/mathcanvas/wave18-angle-turn-release-canary.json#key=interactionShape"
    ],
    lifecycle: [
      "research/mathcanvas/wave18-angle-turn-release-canary.json#key=reopenShape"
    ]
  },
  "common.text": {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.text"
    ],
    contracted: [
      "fixtures/mathcanvas/native-object-contract.json#key=inputText"
    ],
    verified: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=verified:common.text"
    ],
    released: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:common.text"
    ],
    lifecycle: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=lifecycle:common.text"
    ]
  },
  "common.formula": {
    captured: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.formula"
    ],
    contracted: [
      "fixtures/mathcanvas/native-object-contract.json#key=mathLatex"
    ],
    verified: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=verified:common.formula"
    ],
    released: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:common.formula"
    ],
    lifecycle: [
      "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=lifecycle:common.formula"
    ]
  }
} as const satisfies Readonly<Record<string, ReleasedToolEvidence>>;

type ReleasedToolKey = keyof typeof releasedToolEvidence;

function getReleasedToolEvidence(
  stableKey: string
): ReleasedToolEvidence {
  const evidence =
    releasedToolEvidence[stableKey as ReleasedToolKey];
  if (!evidence) {
    throw new Error(`released-tool-evidence-undefined:${stableKey}`);
  }
  return evidence;
}

function flattenReleasedToolEvidence(
  evidence: ReleasedToolEvidence
): readonly string[] {
  return [
    ...new Set([
      ...evidence.captured,
      ...evidence.contracted,
      ...evidence.verified,
      ...evidence.released,
      ...evidence.lifecycle
    ])
  ];
}

export function defineToolManifestEntry(
  entry: ToolManifestEntry
): ToolManifestEntry {
  if (
    entry.supportHistory.length === 0 ||
    entry.supportHistory[0]?.state !== "captured" ||
    entry.supportHistory.at(-1)?.state !== entry.supportState
  ) {
    throw new Error(`invalid-tool-support-history:${entry.stableKey}`);
  }
  const expectedHistory = TOOL_SUPPORT_STATES.slice(
    0,
    TOOL_SUPPORT_STATES.indexOf(entry.supportState) + 1
  );
  if (
    entry.supportHistory.length !== expectedHistory.length ||
    entry.supportHistory.some(
      (history, index) => history.state !== expectedHistory[index]
    )
  ) {
    throw new Error(`skipped-tool-support-state:${entry.stableKey}`);
  }
  const evidenceStateById = new Map<string, ToolSupportState>();
  for (const [index, history] of entry.supportHistory.entries()) {
    if (history.evidenceIds.length === 0) {
      throw new Error(
        `missing-tool-support-evidence:${entry.stableKey}:${history.state}`
      );
    }
    for (const evidenceId of history.evidenceIds) {
      const previousState = evidenceStateById.get(evidenceId);
      if (previousState && previousState !== history.state) {
        throw new Error(
          `reused-tool-support-evidence:${entry.stableKey}:${evidenceId}`
        );
      }
      evidenceStateById.set(evidenceId, history.state);
    }
    const next = entry.supportHistory[index + 1];
    if (
      next &&
      !canTransitionToolSupport(history.state, next.state)
    ) {
      throw new Error(
        `skipped-tool-support-state:${entry.stableKey}:${history.state}:${next.state}`
      );
    }
  }
  if (
    entry.supportState === "released" &&
    (!entry.adapterKey ||
      !entry.lifecycleEvidenceIds ||
      entry.lifecycleEvidenceIds.length === 0)
  ) {
    throw new Error(`released-tool-evidence-missing:${entry.stableKey}`);
  }
  return Object.freeze(entry);
}

export const MATHCANVAS_MODULE_MANIFEST: readonly ToolManifestEntry[] =
  MATHCANVAS_UNIT_IDS.flatMap((categoryId) =>
    moduleDefinitions[categoryId].map(
      ([moduleKey, observedName]): ToolManifestEntry => {
        const released =
          moduleKey === "NO01SC" ||
          moduleKey === "NO03FM" ||
          moduleKey === "NO04NT" ||
          moduleKey === "NO04PD" ||
          moduleKey === "CR07BS" ||
          moduleKey === "SM02AD" ||
          moduleKey === "SM02PB" ||
          moduleKey === "DP04BC" ||
          moduleKey === "DP02TG";
        const contracted = moduleKey === "CR07AT";
        const contractedEvidenceIds =
          moduleKey === "CR07AT"
            ? [
                "research/mathcanvas/wave5-algebra-rod-canary.roundtrip.json#key=lifecycle"
              ]
            : [];
        const evidenceIds = released
          ? flattenReleasedToolEvidence(
              getReleasedToolEvidence(moduleKey)
            )
          : [
              ...moduleEvidence(moduleKey),
              ...contractedEvidenceIds
            ];
        return defineToolManifestEntry({
          stableKey: moduleKey,
          observedName,
          surface: "math-palette",
          integrationTarget: "tool-adapter",
          supportState: released
            ? "released"
            : contracted
              ? "contracted"
              : "captured",
          categoryId,
          moduleKey,
          nativeToolId: moduleKey,
          ...(released
            ? {
                adapterKey:
                  moduleKey === "NO01SC"
                    ? "counting-model"
                    : moduleKey === "NO03FM"
                    ? "fraction-model"
                    : moduleKey === "NO04NT"
                      ? "number-card"
                      : moduleKey === "NO04PD"
                        ? "place-value-model"
                      : moduleKey === "CR07BS"
                        ? "balance-scale"
                      : moduleKey === "SM02AD"
                        ? "analog-clock"
                      : moduleKey === "DP04BC"
                        ? "bar-chart"
                      : moduleKey === "DP02TG"
                        ? "data-table"
                        : "pattern-block"
              }
            : {}),
          evidenceIds,
          supportHistory: released
            ? releasedSupportHistory(getReleasedToolEvidence(moduleKey))
            : contracted
              ? contractedSupportHistory(
                  moduleEvidence(moduleKey),
                  contractedEvidenceIds
                )
              : capturedSupportHistory(evidenceIds),
          ...(released
            ? {
                lifecycleEvidenceIds:
                  getReleasedToolEvidence(moduleKey).lifecycle
              }
            : {})
        });
      }
    )
  );

const commonManifestDefinitions = [
  {
    stableKey: "common.undo",
    observedName: "실행 취소",
    surface: "common-authoring",
    integrationTarget: "internal-editor-action",
    supportState: "captured",
    categoryId: "bottom-common-toolbar",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.undo"
    ]
  },
  {
    stableKey: "common.redo",
    observedName: "다시 실행",
    surface: "common-authoring",
    integrationTarget: "internal-editor-action",
    supportState: "captured",
    categoryId: "bottom-common-toolbar",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.redo"
    ]
  },
  {
    stableKey: "common.select",
    observedName: "선택",
    surface: "common-authoring",
    integrationTarget: "internal-editor-action",
    supportState: "captured",
    categoryId: "bottom-common-toolbar",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.select"
    ]
  },
  {
    stableKey: "common.pen",
    observedName: "펜",
    surface: "common-authoring",
    integrationTarget: "tool-adapter",
    supportState: "captured",
    categoryId: "bottom-common-toolbar",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.pen",
      "research/mathcanvas/common-draw-contract.observations.json#key=penObservation"
    ]
  },
  {
    stableKey: "common.eraser",
    observedName: "지우개",
    surface: "common-authoring",
    integrationTarget: "internal-editor-action",
    supportState: "captured",
    categoryId: "bottom-common-toolbar",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.eraser"
    ]
  },
  {
    stableKey: "common.point-line",
    observedName: "점 / 선",
    surface: "common-authoring",
    integrationTarget: "tool-adapter",
    supportState: "released",
    categoryId: "bottom-common-toolbar",
    nativeToolId: "angleElem",
    adapterKey: "point-line",
    lifecycleEvidenceIds: [
      "research/mathcanvas/wave18-angle-turn-release-canary.json#key=reopenShape"
    ],
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.point-line",
      "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation",
      "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=discovery"
    ],
    supportHistory: [
      {
        state: "captured",
        evidenceIds: [
          "research/mathcanvas/tool-catalog.snapshot.json#tool=common.point-line",
          "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation"
        ]
      },
      {
        state: "contracted",
        evidenceIds: [
          "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=discovery"
        ]
      }
    ]
  },
  {
    stableKey: "common.rectangle",
    observedName: "사각형",
    surface: "common-authoring",
    integrationTarget: "tool-adapter",
    supportState: "released",
    categoryId: "bottom-common-toolbar",
    nativeToolId: "drawElem",
    adapterKey: "draw-rectangle",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.rectangle",
      "fixtures/mathcanvas/native-object-contract.json",
      "packages/mathcanvas-compiler/src/compiler.test.ts"
    ]
  },
  {
    stableKey: "common.circle",
    observedName: "원",
    surface: "common-authoring",
    integrationTarget: "tool-adapter",
    supportState: "contracted",
    categoryId: "bottom-common-toolbar",
    nativeToolId: "drawElem",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.circle",
      "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation",
      "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=discovery"
    ],
    supportHistory: [
      {
        state: "captured",
        evidenceIds: [
          "research/mathcanvas/tool-catalog.snapshot.json#tool=common.circle",
          "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation"
        ]
      },
      {
        state: "contracted",
        evidenceIds: [
          "research/mathcanvas/wave2-common-draw-canary.roundtrip.json#key=discovery"
        ]
      }
    ]
  },
  {
    stableKey: "common.text",
    observedName: "텍스트",
    surface: "common-authoring",
    integrationTarget: "tool-adapter",
    supportState: "released",
    categoryId: "bottom-common-toolbar",
    nativeToolId: "input-text",
    adapterKey: "text",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.text",
      "fixtures/mathcanvas/native-object-contract.json",
      "packages/mathcanvas-compiler/src/compiler.test.ts"
    ]
  },
  {
    stableKey: "common.formula",
    observedName: "수식",
    surface: "common-authoring",
    integrationTarget: "tool-adapter",
    supportState: "released",
    categoryId: "bottom-common-toolbar",
    nativeToolId: "math-latex",
    adapterKey: "latex",
    evidenceIds: [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=common.formula",
      "fixtures/mathcanvas/native-object-contract.json",
      "packages/mathcanvas-compiler/src/compiler.test.ts"
    ]
  }
] as const;

export const COMMON_AUTHORING_MANIFEST: readonly ToolManifestEntry[] =
  commonManifestDefinitions.map((entry) => {
    const released = entry.supportState === "released";
    return defineToolManifestEntry({
      ...entry,
      evidenceIds: released
        ? flattenReleasedToolEvidence(
            getReleasedToolEvidence(entry.stableKey)
          )
        : entry.evidenceIds,
      supportHistory: released
        ? releasedSupportHistory(
            getReleasedToolEvidence(entry.stableKey)
          )
        : "supportHistory" in entry
          ? entry.supportHistory
          : capturedSupportHistory(entry.evidenceIds),
      ...(released
        ? {
            lifecycleEvidenceIds:
              getReleasedToolEvidence(entry.stableKey).lifecycle
          }
        : {})
    });
  });

export function assertUniqueReleasedToolEvidence(
  entries: readonly ToolManifestEntry[]
): void {
  const ownerByEvidenceId = new Map<string, string>();
  for (const entry of entries) {
    const releasedHistory = entry.supportHistory.find(
      (history) => history.state === "released"
    );
    if (!releasedHistory) continue;
    for (const evidenceId of releasedHistory.evidenceIds) {
      const previousOwner = ownerByEvidenceId.get(evidenceId);
      if (previousOwner && previousOwner !== entry.stableKey) {
        throw new Error(
          `shared-released-tool-evidence:${previousOwner}:${entry.stableKey}:${evidenceId}`
        );
      }
      ownerByEvidenceId.set(evidenceId, entry.stableKey);
    }
  }
}

const completeToolManifest: readonly ToolManifestEntry[] = [
  ...MATHCANVAS_MODULE_MANIFEST,
  ...COMMON_AUTHORING_MANIFEST
];
assertUniqueReleasedToolEvidence(completeToolManifest);

export const MATHCANVAS_TOOL_MANIFEST = completeToolManifest;

export function findToolManifestEntry(
  stableKey: string
): ToolManifestEntry | undefined {
  return MATHCANVAS_TOOL_MANIFEST.find(
    (entry) => entry.stableKey === stableKey
  );
}

export function assertReleasedTool(
  stableKey: string
): ToolManifestEntry {
  const entry = findToolManifestEntry(stableKey);
  if (!entry) {
    throw new Error(`unregistered-tool:${stableKey}`);
  }
  if (
    entry.integrationTarget !== "tool-adapter" ||
    entry.supportState !== "released" ||
    !entry.adapterKey
  ) {
    throw new Error(
      `tool-not-released:${stableKey}:${entry.supportState}`
    );
  }
  return entry;
}

export function canTransitionToolSupport(
  from: ToolSupportState,
  to: ToolSupportState
): boolean {
  const fromIndex = TOOL_SUPPORT_STATES.indexOf(from);
  const toIndex = TOOL_SUPPORT_STATES.indexOf(to);
  return toIndex === fromIndex || toIndex === fromIndex + 1;
}
