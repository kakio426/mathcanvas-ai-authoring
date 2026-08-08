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
  CLAIM_EVIDENCE_DOT_GROUPING_GENERATOR_VERSION,
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
import { makeDivisionQuotientRemainderBlueprint } from "./division-quotient-remainder.js";

function makeClaimEvidenceBlueprint(
  profile: ClaimEvidenceActivityProfile
): ActivityBlueprint {
  const isAngleTurn = profile.profileId === "angle-turn";
  const isDivisionRemainder = profile.profileId === "division-remainder";
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
          "② 파란 각의 두 끝점을 회색 두 변 위에 놓고 각도를 확인하세요.",
          "③ 측정값을 쓰고 처음 고른 답과 비교하세요."
        ]
      : isDivisionRemainder
        ? [
            "① 답 카드를 하나 골라 빈칸에 놓으세요.",
            "② 점을 한 묶음의 수만큼 펜으로 묶어 놓고, 남은 점을 확인하세요.",
            "③ 묶음 수와 남은 수를 쓰고, 처음 고른 답을 고치세요."
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
    version: isAngleTurn
      ? "3.4.0"
      : isDivisionRemainder
        ? "1.1.0"
        : presentation
          ? "2.0.0"
          : "1.0.0",
    title: profile.title,
    learningObjective: profile.learningObjective,
    curriculumBinding: {
      standardCode: profile.standardCode,
      domain: profile.domain,
      officialGoal: profile.officialGoal
    },
    generator: {
      id: CLAIM_EVIDENCE_GENERATOR_ID,
      version: isDivisionRemainder
        ? CLAIM_EVIDENCE_DOT_GROUPING_GENERATOR_VERSION
        : presentation
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
        ? [
            {
              role: "target-base-ray",
              scope: "each-item" as const,
              layoutRole: "target-base-ray",
              idRole: "target-base-ray",
              toolKey: "common.point-line",
              intentKind: "point-line",
              locked: true,
              movable: false,
              instructionalIntent:
                "학생이 재어야 할 회색 각의 기준 변입니다.",
              properties: {
                geometry: "line",
                ray: "base",
                stroke: "#5E6473"
              },
              bindings: { angleDegrees: "item.targetAngleDegrees" },
              containerRole: "array-panel"
            },
            {
              role: "target-turn-ray",
              scope: "each-item" as const,
              layoutRole: "target-turn-ray",
              idRole: "target-turn-ray",
              toolKey: "common.point-line",
              intentKind: "point-line",
              locked: true,
              movable: false,
              instructionalIntent:
                "학생이 재어야 할 회색 각의 회전한 변입니다.",
              properties: {
                geometry: "line",
                ray: "turn",
                stroke: "#5E6473"
              },
              bindings: { angleDegrees: "item.targetAngleDegrees" },
              containerRole: "array-panel"
            },
            {
              role: "measure-angle",
              scope: "each-item" as const,
              layoutRole: "measure-angle",
              idRole: "measure-angle",
              toolKey: "common.point-line",
              intentKind: "point-line",
              locked: false,
              movable: true,
              instructionalIntent:
                "파란 끝점을 회색 변에 맞추면 측정값이 즉시 바뀌는 세 점 각 측정선입니다.",
              properties: {
                geometry: "angle",
                stroke: "#1677D2"
              },
              bindings: { angleDegrees: "item.initialMeasureDegrees" },
              containerRole: "array-panel"
            }
          ]
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
            ? [
                layoutBlock("target-base-ray", "slot", "item.angle-model", "each-item"),
                layoutBlock("target-turn-ray", "slot", "item.angle-model", "each-item"),
                layoutBlock("measure-angle", "slot", "item.angle-model", "each-item")
              ]
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
            ...(isAngleTurn
              ? ["target-base-ray", "target-turn-ray", "measure-angle"]
              : []),
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
          maximumFillRatio: isDivisionRemainder ? 0.98 : 0.96
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
  claimEvidenceActivityProfiles.map((profile) =>
    profile.profileId === "division-remainder"
      ? makeDivisionQuotientRemainderBlueprint(profile)
      : makeClaimEvidenceBlueprint(profile)
  );

export function findClaimEvidenceBlueprint(
  blueprintId: string
): ActivityBlueprint | undefined {
  return claimEvidenceBlueprints.find(
    (blueprint) => blueprint.id === blueprintId
  );
}
