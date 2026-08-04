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
  CLAIM_EVIDENCE_GENERATOR_VERSION,
  CLAIM_EVIDENCE_GENERATOR_V2_VERSION
} from "../item-generators/claim-evidence.js";
import {
  CHOICE_CARD_ROLES,
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "./choice-explanation-scaffold.js";
import { withStudentScreenQuality } from "./student-screen-quality.js";

function makeClaimEvidenceBlueprint(
  profile: ClaimEvidenceActivityProfile
): ActivityBlueprint {
  const isAngleTurn = profile.profileId === "angle-turn";
  const presentation = profile.presentation;
  const problemCount = presentation?.problemCount ?? 2;
  const candidateRoles = CHOICE_CARD_ROLES.slice(
    0,
    presentation?.candidateCount ?? CHOICE_CARD_ROLES.length
  );
  const instructions = presentation?.instructions ??
    (isAngleTurn
      ? [
          "① 답 카드를 하나 골라 빈칸에 놓으세요.",
          "② 작은 쪽 간격을 찾아 펜으로 점을 놓으며 세어 보세요.",
          "③ 센 칸 수를 □×30° 식으로 나타내고 답을 다시 확인하세요."
        ]
      : [
          "① 답 카드를 하나 골라 빈칸에 놓으세요.",
          `② ${profile.evidenceHeading}의 자료로 답이 맞는지 확인하세요.`,
          "③ 답을 바꿨다면, 무엇을 확인했는지 쓰세요."
        ]);
  const scaffold = makeChoiceExplanationScaffoldRoles({
    instructions,
    instructionalIntents: [
      "조작 전에 학생 자신의 수학적 판단을 드러냅니다.",
      "정답 표시가 아니라 수학적 불변 관계로 선택을 확인하게 합니다.",
      "오개념과 검증 결과 사이의 갈등을 말이나 식으로 수정하게 합니다."
    ],
    questionIntent: "단원 핵심 개념에서 자주 갈리는 판단을 묻습니다.",
    predictionLabel: profile.predictionLabel,
    poolLabel: presentation?.poolLabel ?? "답 카드",
    explanationLabel: profile.explanationLabel,
    ...(presentation
      ? { candidateCount: presentation.candidateCount }
      : {}),
    centerCandidates: presentation?.candidateAlignment === "center",
    ...(presentation
      ? {
          fontSizes: {
            instruction: presentation.fontSizes.instruction,
            question: presentation.fontSizes.question,
            label: presentation.fontSizes.label,
            candidate: presentation.fontSizes.candidate
          }
        }
      : {})
  }).map((role) =>
    CHOICE_CARD_ROLES.includes(
      role.role as (typeof CHOICE_CARD_ROLES)[number]
    ) && presentation?.candidateRenderer !== "formula"
      ? {
          ...role,
          toolKey: "common.text",
          intentKind: "text",
          properties: {
            text: "",
            fontSize: presentation?.fontSizes.candidate ?? 16
          }
        }
      : role
  );

  return defineActivityBlueprint(withStudentScreenQuality({
    schemaVersion: "1.0.0",
    id: profile.activityId,
    version: isAngleTurn ? "2.1.0" : presentation ? "2.0.0" : "1.0.0",
    title: profile.title,
    learningObjective: profile.learningObjective,
    curriculumBinding: {
      standardCode: profile.standardCode,
      domain: profile.domain,
      officialGoal: profile.officialGoal
    },
    generator: {
      id: CLAIM_EVIDENCE_GENERATOR_ID,
      version: presentation
        ? CLAIM_EVIDENCE_GENERATOR_V2_VERSION
        : CLAIM_EVIDENCE_GENERATOR_VERSION,
      parameters: {
        profileId: profile.profileId,
        problemCount,
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
        properties: {
          text: "",
          fontSize: presentation?.fontSizes.evidenceLabel ?? 25
        },
        bindings: { text: "item.evidenceLabelText" },
        containerRole: "array-panel"
      },
      ...(isAngleTurn
        ? [{
            role: "angle-clock",
            scope: "each-item" as const,
            layoutRole: "angle-clock",
            idRole: "angle-clock",
            toolKey: "SM02AD",
            intentKind: "analog-clock",
            locked: true,
            movable: false,
            instructionalIntent:
              "길이가 다른 두 바늘 사이의 같은 간격을 직접 표시하고 세게 합니다.",
            properties: {
              clockType: "geared",
              isWorking: false
            },
            bindings: {
              hours: "item.clockHour",
              minutes: "item.clockMinute"
            },
            containerRole: "array-panel"
          }]
        : []),
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
        properties: {
          text: "",
          fontSize: presentation?.fontSizes.evidenceText ?? 25
        },
        bindings: { text: "item.evidenceText" },
        containerRole: "array-panel"
      }
    ],
    layout: {
      tokenSet:
        presentation?.layoutTokenSet ??
        profile.layoutTokenSet ??
        "wave23-claim-evidence-v1",
      root: {
        id: "canvas",
        kind: "canvas",
        preset: "canvas.root",
        repeat: "once",
        children: [
          ...makeChoiceExplanationScaffoldLayoutChildren(
            presentation?.candidateCount
          ),
          layoutBlock("array-panel", "slot", "item.array-panel", "each-item"),
          layoutBlock("group-label", "slot", "item.group-label", "each-item"),
          ...(isAngleTurn
            ? [layoutBlock("angle-clock", "slot", "item.angle-clock", "each-item")]
            : []),
          layoutBlock(
            "array-text",
            "slot",
            isAngleTurn ? "item.angle-evidence-text" : "item.array-text",
            "each-item"
          )
        ]
      }
    },
    constraints: [
      {
        id: "select-mathematical-claim",
        kind: "select-one-of",
        sources: candidateRoles.map((role) => ({
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
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctValueText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: [
            "array-panel",
            "group-label",
            ...(isAngleTurn ? ["angle-clock"] : []),
            "array-text"
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
            ...candidateRoles
          ],
          maximumFillRatio: 0.96
        }
      },
      {
        kind: "visual.labeled-pool-row",
        parameters: {
          labelRole: "pool-label",
          memberRoles: candidateRoles,
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
            ...(isAngleTurn ? ["angle-clock"] : []),
            "array-text",
            "prediction-label",
            "prediction-box",
            "pool-label",
            ...candidateRoles,
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
    variationDefaults: { problemCount, difficulty: "normal" }
  }, { questionFontSize: 37 }));
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
