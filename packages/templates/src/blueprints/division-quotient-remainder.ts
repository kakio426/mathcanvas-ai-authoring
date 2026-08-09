import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint,
  type ActivityBlueprint,
  type ActivityBlueprintBody
} from "@mathcanvas/contracts";
import type { ClaimEvidenceActivityProfile } from "@mathcanvas/curriculum";
import {
  buildDivisionClassroomLanguage,
  CLAIM_EVIDENCE_GENERATOR_ID,
  CLAIM_EVIDENCE_NATIVE_GROUPING_GENERATOR_VERSION
} from "../item-generators/claim-evidence.js";
import {
  CHOICE_CARD_ROLES,
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "./choice-explanation-scaffold.js";
import { withStudentScreenQuality } from "./student-screen-quality.js";

const DIVISION_SPATIAL_CONTRACT_ID =
  "division-grouping-no01sc-01-composition-v2" as const;
const DIVISION_SPATIAL_CONTRACT_VERSION = "2.0.0" as const;
const CHOICE_VALUE_KEYS = CHOICE_CARD_ROLES.map(
  (_role, index) => `candidate${index + 1}`
);

function requiredDistinctTerms(
  values: readonly (string | undefined)[],
  field: string
): string[] {
  if (values.some((value) => !value?.trim())) {
    throw new Error(`division-native-story-term-missing:${field}`);
  }
  return [...new Set(values.map((value) => value!.trim()))];
}

function lineRole(role: string, instructionalIntent: string) {
  return {
    role,
    scope: "each-item" as const,
    layoutRole: role,
    idRole: role,
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent,
    properties: { fill: "#8FA2B8", stroke: "#8FA2B8" },
    bindings: {}
  };
}

function labelRole(input: {
  readonly role: string;
  readonly text?: string;
  readonly textBinding?: string;
  readonly fontSize: number;
  readonly instructionalIntent: string;
}) {
  return {
    role: input.role,
    scope: "each-item" as const,
    layoutRole: input.role,
    idRole: input.role,
    toolKey: "common.text",
    intentKind: "text" as const,
    locked: true,
    movable: false,
    instructionalIntent: input.instructionalIntent,
    properties: { text: input.text ?? "", fontSize: input.fontSize },
    bindings: input.textBinding ? { text: input.textBinding } : {}
  };
}

function withoutLegacyWorkPanel(
  roles: ReturnType<typeof makeChoiceExplanationScaffoldRoles>
): ActivityBlueprintBody["toolRoles"] {
  return roles
    .filter((role) => role.role !== "work-panel" && role.role !== "number")
    .map((role) => {
      if ("containerRole" in role && role.containerRole === "work-panel") {
        const { containerRole: _containerRole, ...rest } = role;
        return rest;
      }
      return role;
    })
    .map((role) => {
      const instructionBinding = (
        {
          "instruction-predict": "item.predictInstructionText",
          "instruction-verify": "item.verifyInstructionText",
          "instruction-explain": "item.explainInstructionText"
        } as Readonly<Record<string, string>>
      )[role.role];
      if (instructionBinding) {
        return {
          ...role,
          scope: "each-item" as const,
          properties: {
            ...role.properties,
            text: ""
          },
          bindings: { text: instructionBinding }
        };
      }
      const candidateIndex = CHOICE_CARD_ROLES.indexOf(
        role.role as (typeof CHOICE_CARD_ROLES)[number]
      );
      if (candidateIndex < 0) return role;
      return {
        ...role,
        toolKey: "common.text",
        intentKind: "text" as const,
        properties: {
          ...role.properties,
          text: "",
          centerInPlacement: true
        },
        bindings: { text: `item.candidate${candidateIndex + 1}` }
      };
    });
}

export function makeDivisionQuotientRemainderBlueprint(
  profile: ClaimEvidenceActivityProfile
): ActivityBlueprint {
  if (profile.profileId !== "division-remainder" || !profile.presentation) {
    throw new Error("division-native-profile-invalid");
  }
  const presentation = profile.presentation;
  const instructions = presentation.instructions;
  const allowedObjectNames = requiredDistinctTerms(
    profile.items.map((item) => item.countableObjectName),
    "countableObjectName"
  );
  const allowedCounters = requiredDistinctTerms(
    profile.items.map((item) => item.countableCounter),
    "countableCounter"
  );
  const allowedGroupNames = requiredDistinctTerms(
    profile.items.map((item) => item.countableGroupName),
    "countableGroupName"
  );
  const canonicalItemStories = profile.items.map((item) => {
    if (
      item.countableTotal === undefined ||
      item.countableGroupSize === undefined ||
      !item.countableObjectName ||
      !item.countableCounter ||
      !item.countableGroupName ||
      !item.countableGroupLaneLabelText
    ) {
      throw new Error("division-native-canonical-story-missing");
    }
    const classroomLanguage = buildDivisionClassroomLanguage({
      countableGroupSize: item.countableGroupSize,
      countableObjectName: item.countableObjectName,
      countableCounter: item.countableCounter,
      countableGroupName: item.countableGroupName,
      countableGroupLaneLabelText: item.countableGroupLaneLabelText
    });
    return {
      fields: {
        questionText: item.questionText,
        evidenceLabelText: item.evidenceLabelText,
        evidenceText: item.evidenceText,
        correctValueText: item.correctValueText,
        answerExplanation: item.answerExplanation,
        countableTotal: item.countableTotal,
        countableGroupSize: item.countableGroupSize,
        countableObjectName: item.countableObjectName,
        countableCounter: item.countableCounter,
        countableGroupName: item.countableGroupName,
        ...classroomLanguage
      },
      candidateSet: [...item.candidates].sort()
    };
  });
  const exactItemRoleBindings = [
    ["instruction-predict", "predictInstructionText"],
    ["instruction-verify", "verifyInstructionText"],
    ["instruction-explain", "explainInstructionText"],
    ["question", "questionText"],
    ["source-label", "sourceLaneLabelText"],
    ["group-lane-label", "groupLaneLabelText"],
    ["remainder-lane-label", "remainderLaneLabelText"],
    ...CHOICE_CARD_ROLES.map((role, index) => [
      role,
      CHOICE_VALUE_KEYS[index]!
    ])
  ].map(([role, valueKey]) => ({ role, valueKey }));
  const scaffoldRoles = withoutLegacyWorkPanel(
    makeChoiceExplanationScaffoldRoles({
      instructions,
      instructionalIntents: [
        "모형을 만지기 전에 학생 자신의 몫과 나머지 판단을 드러냅니다.",
        "수 세기 모형을 실제로 묶고 옮겨 예상한 답을 확인하게 합니다.",
        "묶음 수와 남은 수를 식과 말로 설명하고 처음 생각을 수정하게 합니다."
      ],
      questionIntent:
        "몫은 만든 묶음 수이고 나머지는 묶고 남은 수라는 뜻을 판단하게 합니다.",
      predictionLabel: profile.predictionLabel,
      poolLabel: presentation.poolLabel,
      explanationLabel: profile.explanationLabel,
      candidateCount: presentation.candidateCount,
      centerCandidates: true,
      fontSizes: {
        instruction: presentation.fontSizes.instruction,
        question: presentation.fontSizes.question,
        label: presentation.fontSizes.label,
        candidate: presentation.fontSizes.candidate
      }
    })
  );
  const arrayBorderRoles = ["top", "bottom", "left", "right"].map((edge) =>
    lineRole(
      `array-border-${edge}`,
      "수 세기 모형을 묶는 전체 작업 공간의 경계를 표시합니다."
    )
  );
  const separatorRoles = ["source-separator", "remainder-separator"].map(
    (role) =>
      lineRole(
        role,
        "아직 묶지 않은 것, 만든 묶음, 묶이지 않고 남은 것의 공간을 구분합니다."
      )
  );
  const customRoles: ActivityBlueprintBody["toolRoles"] = [
    ...arrayBorderRoles,
    ...separatorRoles,
    labelRole({
      role: "source-label",
      textBinding: "item.sourceLaneLabelText",
      fontSize: presentation.fontSizes.evidenceLabel,
      instructionalIntent:
        "아직 묶지 않은 이야기 속 물건을 직접 이름 붙여 안내합니다."
    }),
    labelRole({
      role: "group-lane-label",
      textBinding: "item.groupLaneLabelText",
      fontSize: presentation.fontSizes.evidenceLabel,
      instructionalIntent:
        "문제에 나온 한 묶음의 수를 유지하며 모형을 묶게 합니다."
    }),
    labelRole({
      role: "remainder-lane-label",
      textBinding: "item.remainderLaneLabelText",
      fontSize: 30,
      instructionalIntent:
        "더 묶지 못하고 남은 이야기 속 물건을 직접 이름 붙여 안내합니다."
    }),
    {
      role: "counting-model-pool",
      scope: "each-item",
      layoutRole: "counting-model-pool",
      idRole: "counting-model-pool",
      toolKey: "NO01SC",
      intentKind: "counting-model",
      spatialContractId: DIVISION_SPATIAL_CONTRACT_ID,
      spatialContractVersion: DIVISION_SPATIAL_CONTRACT_VERSION,
      locked: false,
      movable: true,
      instructionalIntent:
        "문제의 전체 수를 네이티브 낱개로 나타내고 학생이 직접 그룹·이동·해제하여 몫과 나머지를 확인합니다.",
      properties: {},
      bindings: { count: "item.countableTotal" }
    }
  ];
  const scaffoldLayout = makeChoiceExplanationScaffoldLayoutChildren(5)
    .filter((block) => block.id !== "work-panel" && block.id !== "number")
    .map((block) =>
      [
        "instruction-predict",
        "instruction-verify",
        "instruction-explain"
      ].includes(block.id)
        ? { ...block, repeat: "each-item" as const }
        : block
    );
  const customLayout = [
    ...["top", "bottom", "left", "right"].map((edge) =>
      layoutBlock(
        `array-border-${edge}`,
        "slot",
        `item.array-border-${edge}`,
        "each-item"
      )
    ),
    layoutBlock(
      "source-separator",
      "slot",
      "item.source-separator",
      "each-item"
    ),
    layoutBlock(
      "remainder-separator",
      "slot",
      "item.remainder-separator",
      "each-item"
    ),
    layoutBlock("source-label", "slot", "item.source-label", "each-item"),
    layoutBlock(
      "group-lane-label",
      "slot",
      "item.group-lane-label",
      "each-item"
    ),
    layoutBlock(
      "remainder-lane-label",
      "slot",
      "item.remainder-lane-label",
      "each-item"
    ),
    layoutBlock(
      "counting-model-pool",
      "slot",
      "item.counting-model-pool",
      "each-item"
    )
  ];

  return defineActivityBlueprint(
    withStudentScreenQuality(
      {
        schemaVersion: "1.0.0",
        id: profile.activityId,
        version: "2.5.0",
        title: profile.title,
        learningObjective: profile.learningObjective,
        curriculumBinding: {
          standardCode: profile.standardCode,
          domain: profile.domain,
          officialGoal: profile.officialGoal
        },
        generator: {
          id: CLAIM_EVIDENCE_GENERATOR_ID,
          version: CLAIM_EVIDENCE_NATIVE_GROUPING_GENERATOR_VERSION,
          parameters: {
            profileId: profile.profileId,
            problemCount: 1,
            difficulty: "normal"
          }
        },
        toolRoles: [...scaffoldRoles, ...customRoles],
        layout: {
          tokenSet: presentation.layoutTokenSet,
          root: {
            id: "canvas",
            kind: "canvas",
            preset: "canvas.root",
            repeat: "once",
            children: [...scaffoldLayout, ...customLayout]
          }
        },
        constraints: [
          {
            id: "select-mathematical-claim",
            kind: "select-one-of",
            sources: CHOICE_CARD_ROLES.map((role) => ({
              scope: "each-item" as const,
              role
            })),
            target: { scope: "each-item", role: "prediction-box" },
            parameters: {},
            requiresStudentAction: true
          }
        ],
        valuePredicates: [
          {
            kind: "cognitive.release-contract",
            parameters: {
              mode: "select-one",
              decisionConstraintId: "select-mathematical-claim",
              candidateRoles: CHOICE_CARD_ROLES,
              candidateProperty: "text",
              correctValuePath: "correctValueText",
              predictionRole: "prediction-box",
              explanationRole: "explanation-box",
              verificationRoles: [
                "counting-model-pool",
                "group-lane-label",
                "remainder-lane-label",
                "array-border-top"
              ]
            }
          },
          {
            kind: "language.classroom-korean",
            parameters: {
              instructionRoles: [
                "instruction-predict",
                "instruction-verify",
                "instruction-explain"
              ],
              labelRoles: [
                "prediction-label",
                "pool-label",
                "explanation-label",
                "source-label",
                "group-lane-label",
                "remainder-lane-label"
              ],
              promptRoles: ["question"],
              maximumInstructionLength: 74,
              maximumLabelLength: 24,
              canonicalItemStories,
              canonicalCandidateValueKeys: CHOICE_VALUE_KEYS,
              exactItemRoleBindings,
              requiredItemValueMentions: [
                {
                  valueKey: "countableObjectName",
                  allowedValues: allowedObjectNames,
                  forbiddenValues: ["모형", "물건", "것"],
                  roles: [
                    "instruction-verify",
                    "instruction-explain",
                    "source-label",
                    "remainder-lane-label",
                    "question"
                  ],
                  valueFields: [
                    "questionText",
                    "evidenceLabelText",
                    "evidenceText"
                  ]
                },
                {
                  valueKey: "countableCounter",
                  allowedValues: allowedCounters,
                  roles: [
                    "instruction-verify",
                    "group-lane-label",
                    "question",
                    ...CHOICE_CARD_ROLES
                  ],
                  valueFields: [
                    "questionText",
                    "evidenceLabelText",
                    "evidenceText",
                    "correctValueText",
                    "answerExplanation",
                    ...CHOICE_VALUE_KEYS
                  ]
                },
                {
                  valueKey: "countableGroupName",
                  allowedValues: allowedGroupNames,
                  roles: [
                    "instruction-explain",
                    "group-lane-label",
                    "question",
                    ...CHOICE_CARD_ROLES
                  ],
                  valueFields: [
                    "questionText",
                    "evidenceLabelText",
                    "evidenceText",
                    "correctValueText",
                    "answerExplanation",
                    ...CHOICE_VALUE_KEYS
                  ]
                }
              ],
              requiredItemParticleMentions: [
                {
                  valueKey: "countableObjectName",
                  particle: "object",
                  roles: ["instruction-verify", "instruction-explain"]
                },
                {
                  valueKey: "countableGroupName",
                  particle: "join",
                  roles: ["instruction-explain"]
                }
              ]
            }
          },
          {
            kind: "visual.text-fit",
            parameters: {
              roles: [
                "instruction-predict",
                "instruction-verify",
                "instruction-explain",
                "question",
                "prediction-label",
                "pool-label",
                "explanation-label",
                "source-label",
                "group-lane-label",
                ...CHOICE_CARD_ROLES
              ],
              maximumFillRatio: 0.96,
              roleMaximumFillRatios: {
                "instruction-verify": 1,
                "remainder-lane-label": 1
              }
            }
          },
          {
            kind: "visual.text-clearance",
            parameters: {
              containerInsets: [
                {
                  role: "pool-label",
                  containerRole: "choice-panel",
                  minimumTop: 10,
                  minimumRight: 20,
                  minimumBottom: 0,
                  minimumLeft: 18
                },
                {
                  role: "prediction-label",
                  containerRole: "prediction-box",
                  minimumTop: 10,
                  minimumRight: 20,
                  minimumBottom: 0,
                  minimumLeft: 20
                },
                {
                  role: "explanation-label",
                  containerRole: "explanation-box",
                  minimumTop: 10,
                  minimumRight: 20,
                  minimumBottom: 0,
                  minimumLeft: 20
                }
              ],
              verticalGaps: [
                {
                  beforeRole: "instruction-predict",
                  afterRole: "instruction-verify",
                  minimumGap: 23
                },
                {
                  beforeRole: "instruction-verify",
                  afterRole: "instruction-explain",
                  minimumGap: 23
                },
                {
                  beforeRole: "instruction-explain",
                  afterRole: "question",
                  minimumGap: 32
                },
                {
                  beforeRole: "pool-label",
                  afterRole: "position-card-1-backdrop",
                  minimumGap: 12
                },
                {
                  beforeRole: "array-border-top",
                  afterRole: "source-label",
                  minimumGap: 14
                },
                {
                  beforeRole: "source-label",
                  afterRole: "counting-model-pool",
                  minimumGap: 18
                },
                {
                  beforeRole: "array-border-top",
                  afterRole: "group-lane-label",
                  minimumGap: 14
                },
                {
                  beforeRole: "array-border-top",
                  afterRole: "remainder-lane-label",
                  minimumGap: 14
                }
              ],
              centerPairs: CHOICE_CARD_ROLES.map((role) => ({
                role,
                containerRole: `${role}-backdrop`,
                maximumOffsetX: 0,
                maximumOffsetY: 0
              })),
              horizontalLanes: [
                {
                  role: "source-label",
                  leftBoundaryRole: "array-border-left",
                  rightBoundaryRole: "source-separator",
                  minimumLeft: 2,
                  minimumRight: 2
                },
                {
                  role: "group-lane-label",
                  leftBoundaryRole: "source-separator",
                  rightBoundaryRole: "remainder-separator",
                  minimumLeft: 2,
                  minimumRight: 2
                },
                {
                  role: "remainder-lane-label",
                  leftBoundaryRole: "remainder-separator",
                  rightBoundaryRole: "array-border-right",
                  minimumLeft: 2,
                  minimumRight: 2
                }
              ]
            }
          },
          {
            kind: "visual.labeled-pool-row",
            parameters: {
              labelRole: "pool-label",
              memberRoles: CHOICE_CARD_ROLES.map(
                (role) => `${role}-backdrop`
              ),
              containerRole: "choice-panel",
              rowCenterTolerance: 2,
              gapTolerance: 2,
              groupCenterTolerance: 12,
              labelAlignmentTolerance: 2,
              minimumLabelGap: 12,
              maximumLabelGap: 24
            }
          },
          {
            kind: "visual.no-overlap",
            parameters: {
              roles: [
                "question",
                "prediction-label",
                "pool-label",
                "explanation-label",
                "source-label",
                "group-lane-label",
                "remainder-lane-label",
                ...CHOICE_CARD_ROLES
              ]
            }
          }
        ],
        instructions: [...instructions],
        payload: {
          categoryId: MATHCANVAS_PROJECT_CATEGORIES[profile.domain].categoryId,
          tags: [
            profile.activityLabel,
            "수학적 판단",
            "네이티브 모형으로 확인",
            "생각 고치기"
          ],
          studyLevel: "elementary",
          isShowMenuOnActivity: true
        },
        variationDefaults: { problemCount: 1, difficulty: "normal" }
      },
      {
        questionFontSize: presentation.fontSizes.question,
        compactGlyphRoles: [
          ...CHOICE_CARD_ROLES,
          "remainder-lane-label"
        ],
        compactGlyphMinimumFontSize: 22
      }
    )
  );
}
