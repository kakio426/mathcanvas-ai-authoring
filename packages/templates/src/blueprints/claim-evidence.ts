import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint,
  type ActivityBlueprint
} from "@mathcanvas/contracts";
import {
  claimEvidenceActivityProfiles,
  type ClaimEvidenceActivityProfile
} from "@mathcanvas/curriculum";
import {
  CLAIM_EVIDENCE_GENERATOR_ID,
  CLAIM_EVIDENCE_GENERATOR_VERSION
} from "../item-generators/claim-evidence.js";
import {
  CHOICE_CARD_ROLES,
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "./choice-explanation-scaffold.js";

function makeClaimEvidenceBlueprint(
  profile: ClaimEvidenceActivityProfile
): ActivityBlueprint {
  const instructions = [
    "① 다른 사람의 생각 중 하나를 먼저 골라 놓으세요.",
    `② ${profile.evidenceHeading}에서 수학적 관계가 맞는지 직접 확인하세요.`,
    "③ 확인 결과가 다르면 선택을 고치고, 달라진 생각을 근거와 함께 쓰세요."
  ] as const;
  const scaffold = makeChoiceExplanationScaffoldRoles({
    instructions,
    instructionalIntents: [
      "조작 전에 학생 자신의 수학적 판단을 드러냅니다.",
      "정답 표시가 아니라 수학적 불변 관계로 선택을 확인하게 합니다.",
      "오개념과 검증 결과 사이의 갈등을 말이나 식으로 수정하게 합니다."
    ],
    questionIntent: "단원 핵심 개념에서 자주 갈리는 판단을 묻습니다.",
    predictionLabel: profile.predictionLabel,
    poolLabel: "서로 다른 생각",
    explanationLabel: profile.explanationLabel
  }).map((role) =>
    CHOICE_CARD_ROLES.includes(
      role.role as (typeof CHOICE_CARD_ROLES)[number]
    )
      ? {
          ...role,
          toolKey: "common.text",
          intentKind: "text",
          properties: { text: "", fontSize: 16 }
        }
      : role
  );

  return defineActivityBlueprint({
    schemaVersion: "1.0.0",
    id: profile.activityId,
    version: "1.0.0",
    title: profile.title,
    learningObjective: profile.learningObjective,
    curriculumBinding: {
      standardCode: profile.standardCode,
      domain: profile.domain,
      officialGoal: profile.officialGoal
    },
    generator: {
      id: CLAIM_EVIDENCE_GENERATOR_ID,
      version: CLAIM_EVIDENCE_GENERATOR_VERSION,
      parameters: {
        profileId: profile.profileId,
        problemCount: 2,
        difficulty: "normal"
      }
    },
    toolRoles: [
      ...scaffold,
      {
        role: "array-panel",
        scope: "each-item",
        layoutRole: "array-panel",
        idRole: "array-panel",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "학생의 선택을 정답 표식이 아닌 수학적 관계로 확인하는 증거판입니다.",
        properties: { fill: "#F5FBFF", stroke: "#4AA9D8" },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "group-label",
        scope: "each-item",
        layoutRole: "group-label",
        idRole: "group-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "무엇을 기준으로 검증할지 알려 줍니다.",
        properties: { text: "", fontSize: 25 },
        bindings: { text: "item.evidenceLabelText" },
        containerRole: "array-panel"
      },
      {
        role: "array-text",
        scope: "each-item",
        layoutRole: "array-text",
        idRole: "array-text",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "묶음, 같은 간격, 중간 계산 또는 같은 단위로 판단을 검증합니다.",
        properties: { text: "", fontSize: 25 },
        bindings: { text: "item.evidenceText" },
        containerRole: "array-panel"
      }
    ],
    layout: {
      tokenSet: "wave17-multiplication-array-v1",
      root: {
        id: "canvas",
        kind: "canvas",
        preset: "canvas.root",
        repeat: "once",
        children: [
          ...makeChoiceExplanationScaffoldLayoutChildren(),
          layoutBlock("array-panel", "slot", "item.array-panel", "each-item"),
          layoutBlock("group-label", "slot", "item.group-label", "each-item"),
          layoutBlock("array-text", "slot", "item.array-text", "each-item")
        ]
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
          verificationRoles: ["array-panel", "group-label", "array-text"]
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
            "group-label"
          ],
          promptRoles: ["question"],
          maximumInstructionLength: 74,
          maximumLabelLength: 24
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
            "group-label",
            "array-text",
            ...CHOICE_CARD_ROLES
          ],
          maximumFillRatio: 0.96
        }
      },
      {
        kind: "visual.labeled-pool-row",
        parameters: {
          labelRole: "pool-label",
          memberRoles: CHOICE_CARD_ROLES,
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
            "number",
            "question",
            "group-label",
            "array-text",
            "prediction-label",
            "prediction-box",
            "pool-label",
            ...CHOICE_CARD_ROLES,
            "explanation-label",
            "explanation-box"
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
        "근거로 확인",
        "생각 고치기"
      ],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: { problemCount: 2, difficulty: "normal" }
  });
}

export const claimEvidenceBlueprints: readonly ActivityBlueprint[] =
  claimEvidenceActivityProfiles.map(makeClaimEvidenceBlueprint);

export function findClaimEvidenceBlueprint(
  blueprintId: string
): ActivityBlueprint | undefined {
  return claimEvidenceBlueprints.find(
    (blueprint) => blueprint.id === blueprintId
  );
}
