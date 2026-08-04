import {
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_ID,
  UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_VERSION
} from "../item-generators/unlike-denominator-common-unit-sum.js";
import {
  sameDenominatorFractionSumBlueprint
} from "./same-denominator-fraction-sum.js";
import { withStudentScreenQuality } from "./student-screen-quality.js";

const candidateRoles = [
  "position-card-1",
  "position-card-2",
  "position-card-3",
  "position-card-4",
  "position-card-5"
] as const;
const candidatePaths = [
  "candidate1",
  "candidate2",
  "candidate3",
  "candidate4",
  "candidate5"
] as const;

const {
  contentHash: wave8ContentHash,
  ...wave8Base
} = sameDenominatorFractionSumBlueprint;
void wave8ContentHash;

const toolRoles = wave8Base.toolRoles.map((role) => {
  if (role.role === "instruction-verify") {
    return {
      ...role,
      instructionalIntent:
        "두 띠를 이어 붙인 길이를 공통 단위 자의 칸 수로 확인하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "② 두 분수 띠를 이어 붙여, 아래 자의 몇 칸인지 확인하세요."
      }
    };
  }
  if (role.role === "instruction-explain") {
    return {
      ...role,
      instructionalIntent:
        "통분한 단위와 분자 변화를 공통 단위 자를 근거로 설명하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "③ 처음 생각과 달랐다면 고쳐 놓고, 두 분모가 왜 그 칸 수로 바뀌는지 쓰세요."
      }
    };
  }
  return role;
});

export const unlikeDenominatorCommonUnitSumBlueprint =
  defineActivityBlueprint(withStudentScreenQuality({
    ...wave8Base,
    id: "fraction.add.unlike-denominators.common-unit-v1",
    version: "1.0.0",
    title: "같은 칸으로 바꾸어 더하는 분모가 다른 분수의 덧셈",
    learningObjective:
      "분모가 다른 두 진분수를 같은 크기의 단위로 바꾸어 더하고 그 방법을 설명할 수 있다.",
    curriculumBinding: {
      standardCode: "[6수01-08]",
      domain: "수와 연산",
      officialGoal:
        "분모가 다른 분수의 덧셈과 뺄셈의 계산 원리를 탐구하고 그 계산을 할 수 있다."
    },
    generator: {
      id: UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_ID,
      version:
        UNLIKE_DENOMINATOR_COMMON_UNIT_SUM_GENERATOR_VERSION,
      parameters: { problemCount: 2, difficulty: "normal" }
    },
    toolRoles: [
      ...toolRoles,
      {
        role: "unit-ruler",
        scope: "each-item",
        layoutRole: "unit-ruler",
        idRole: "unit-ruler",
        toolKey: "NO03FM",
        intentKind: "fraction-model",
        locked: true,
        movable: false,
        instructionalIntent:
          "두 분수를 같은 크기의 칸으로 바꾸어 읽는 고정된 한 전체 자입니다.",
        properties: { color: "#E8EEF6" },
        bindings: { fraction: "item.unit" },
        containerRole: "work-panel"
      },
      {
        role: "unit-ruler-label",
        scope: "each-item",
        layoutRole: "unit-ruler-label",
        idRole: "unit-ruler-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "아래 띠가 공통 단위로 나눈 자임을 안내합니다.",
        properties: {
          text: "같은 칸",
          fontSize: 23
        },
        bindings: {},
        containerRole: "work-panel"
      }
    ],
    layout: {
      tokenSet: "wave10-common-unit-v1",
      root: {
        ...wave8Base.layout.root,
        children: [
          ...wave8Base.layout.root.children,
          {
            id: "unit-ruler",
            kind: "slot",
            preset: "item.unit-ruler",
            repeat: "each-item",
            children: []
          },
          {
            id: "unit-ruler-label",
            kind: "slot",
            preset: "item.unit-ruler-label",
            repeat: "each-item",
            children: []
          }
        ]
      }
    },
    constraints: wave8Base.constraints.map((constraint) =>
      constraint.id === "select-fraction-sum"
        ? {
            ...constraint,
            id: "select-common-unit-sum"
          }
        : constraint
    ),
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "select-one",
          decisionConstraintId: "select-common-unit-sum",
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctResultLatex",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: [
            "left-strip",
            "right-strip",
            "join-lane",
            "unit-ruler",
            "start-line"
          ]
        }
      },
      {
        kind: "values.unlike-denominator-sum-distractors",
        parameters: {
          leftDenominatorPath: "leftDenominator",
          rightDenominatorPath: "rightDenominator",
          leftNumeratorPath: "leftNumerator",
          rightNumeratorPath: "rightNumerator",
          commonDenominatorPath: "commonDenominator",
          leftCellsPath: "leftCells",
          rightCellsPath: "rightCells",
          sumCellsPath: "sumCells",
          correctPath: "correctResultText",
          addBothTextPath: "addBothText",
          sameNumeratorTextPath: "sameNumeratorText",
          largerPartTextPath: "largerPartText",
          productTextPath: "productText",
          candidatePaths
        }
      },
      {
        kind: "geometry.common-unit-sum-strips",
        parameters: {
          leftStripRole: "left-strip",
          rightStripRole: "right-strip",
          joinLaneRole: "join-lane",
          unitRulerRole: "unit-ruler",
          startLineRole: "start-line",
          leftDenominatorPath: "leftDenominator",
          rightDenominatorPath: "rightDenominator",
          leftNumeratorPath: "leftNumerator",
          rightNumeratorPath: "rightNumerator",
          commonDenominatorPath: "commonDenominator",
          sumCellsPath: "sumCells"
        }
      },
      {
        kind: "values.no-duplicate-combination",
        parameters: {
          valuePaths: [
            "leftDenominator",
            "rightDenominator",
            "leftNumerator",
            "rightNumerator"
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
            "join-lane-label",
            "unit-ruler-label",
            "prediction-label",
            "pool-label",
            "explanation-label"
          ],
          maximumInstructionLength: 70,
          maximumLabelLength: 18
        }
      },
      {
        kind: "visual.text-fit",
        parameters: {
          roles: [
            "instruction-predict",
            "instruction-verify",
            "instruction-explain",
            "number",
            "left-strip-label",
            "right-strip-label",
            "join-lane-label",
            "unit-ruler-label",
            "prediction-label",
            "pool-label",
            "explanation-label"
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
            "left-strip",
            "left-strip-label",
            "right-strip",
            "right-strip-label",
            "join-lane-label",
            "start-line",
            "unit-ruler-label",
            "unit-ruler",
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
    instructions: [
      "두 분수의 합을 먼저 골라 놓으세요.",
      "두 분수 띠를 이어 붙여, 아래 자의 몇 칸인지 확인하세요.",
      "처음 생각과 달랐다면 고쳐 놓고, 두 분모가 왜 그 칸 수로 바뀌는지 쓰세요."
    ],
    payload: {
      ...wave8Base.payload,
      tags: [
        "분수의 덧셈",
        "분모가 다른 분수",
        "통분",
        "공통 단위",
        "생각 고치기"
      ]
    }
  }));
