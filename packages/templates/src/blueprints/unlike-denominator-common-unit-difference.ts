import {
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_ID,
  UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_VERSION
} from "../item-generators/unlike-denominator-common-unit-difference.js";
import {
  unlikeDenominatorCommonUnitSumBlueprint
} from "./unlike-denominator-common-unit-sum.js";
import { withStudentScreenQuality } from "./student-screen-quality.js";

const candidatePaths = [
  "candidate1",
  "candidate2",
  "candidate3",
  "candidate4",
  "candidate5"
] as const;

const {
  contentHash: sumContentHash,
  ...commonUnitBase
} = unlikeDenominatorCommonUnitSumBlueprint;
void sumContentHash;

const toolRoles = commonUnitBase.toolRoles.map((role) => {
  if (role.role === "instruction-predict") {
    return {
      ...role,
      instructionalIntent:
        "분수 띠를 움직이기 전에 두 분수의 차를 결정하게 합니다.",
      properties: {
        ...role.properties,
        text: "① 두 분수의 차를 먼저 골라 놓으세요."
      }
    };
  }
  if (role.role === "instruction-verify") {
    return {
      ...role,
      instructionalIntent:
        "처음 띠의 오른쪽을 덮어 남은 공통 단위 칸 수로 첫 생각을 확인하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "② 처음 띠를 맨 왼쪽에 붙여 놓고, 덮는 띠의 오른쪽 끝을 처음 띠의 끝에 맞추세요."
      }
    };
  }
  if (role.role === "instruction-explain") {
    return {
      ...role,
      instructionalIntent:
        "남은 공통 단위 칸 수로 선택을 고치고 뺄셈 방법을 설명하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "③ 처음 생각과 달랐다면 고쳐 놓고, 남은 부분이 왜 그 칸 수인지 쓰세요."
      }
    };
  }
  if (role.role === "left-strip") {
    return {
      ...role,
      instructionalIntent:
        "뺄셈에서 처음 양을 나타내며 맨 왼쪽에 놓는 움직일 수 있는 띠입니다."
    };
  }
  if (role.role === "right-strip") {
    return {
      ...role,
      instructionalIntent:
        "처음 띠의 오른쪽 부분을 덮어 빼는 양을 나타내는 움직일 수 있는 띠입니다.",
      properties: {
        ...role.properties,
        color: "#3F5B7A"
      }
    };
  }
  if (role.role === "join-lane") {
    return {
      ...role,
      instructionalIntent:
        "처음 띠를 왼쪽에 놓고 덮는 띠의 오른쪽 끝을 맞출 목표 영역입니다."
    };
  }
  if (role.role === "join-lane-label") {
    return {
      ...role,
      instructionalIntent:
        "두 띠를 겹쳐 남은 부분을 확인할 줄을 안내합니다.",
      properties: {
        ...role.properties,
        text: "띠 덮어 보기"
      }
    };
  }
  if (role.role === "prediction-label") {
    return {
      ...role,
      instructionalIntent:
        "띠를 움직이기 전에 고른 차를 남길 곳을 알립니다.",
      properties: {
        ...role.properties,
        text: "내가 고른 차"
      }
    };
  }
  if (role.role === "question") {
    return {
      ...role,
      instructionalIntent:
        "뺄 두 분수를 교과서식 분수 표기로 보여 줍니다."
    };
  }
  if (role.role === "choice-panel") {
    return {
      ...role,
      instructionalIntent:
        "분수의 차에 대한 다섯 가지 생각을 한데 묶습니다."
    };
  }
  if (role.role === "explanation-label") {
    return {
      ...role,
      instructionalIntent:
        "남은 공통 단위 칸을 근거로 뺄셈 방법을 쓰게 합니다."
    };
  }
  if (/^position-card-\d+$/.test(role.role)) {
    return {
      ...role,
      instructionalIntent:
        "분수의 차에 대한 서로 다른 생각 중 하나를 고르게 합니다."
    };
  }
  return role;
});

export const unlikeDenominatorCommonUnitDifferenceBlueprint =
  defineActivityBlueprint(withStudentScreenQuality({
    ...commonUnitBase,
    id: "fraction.subtract.unlike-denominators.common-unit-v1",
    version: "1.0.0",
    title: "덮어 보고 남은 칸을 읽는 분모가 다른 분수의 뺄셈",
    learningObjective:
      "분모가 다른 두 진분수를 같은 크기의 단위로 바꾸어 빼고 그 방법을 설명할 수 있다.",
    curriculumBinding: {
      standardCode: "[6수01-08]",
      domain: "수와 연산",
      officialGoal:
        "분모가 다른 분수의 덧셈과 뺄셈의 계산 원리를 탐구하고 그 계산을 할 수 있다."
    },
    generator: {
      id:
        UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_ID,
      version:
        UNLIKE_DENOMINATOR_COMMON_UNIT_DIFFERENCE_GENERATOR_VERSION,
      parameters: { problemCount: 2, difficulty: "normal" }
    },
    toolRoles,
    layout: {
      ...commonUnitBase.layout,
      tokenSet: "common-unit-lane-v1"
    },
    constraints: commonUnitBase.constraints.map((constraint) =>
      constraint.id === "select-common-unit-sum"
        ? {
            ...constraint,
            id: "select-common-unit-difference"
          }
        : constraint
    ),
    valuePredicates: commonUnitBase.valuePredicates.map(
      (predicate) => {
        if (predicate.kind === "cognitive.release-contract") {
          return {
            ...predicate,
            parameters: {
              ...predicate.parameters,
              decisionConstraintId:
                "select-common-unit-difference"
            }
          };
        }
        if (
          predicate.kind ===
          "values.unlike-denominator-sum-distractors"
        ) {
          return {
            kind:
              "values.unlike-denominator-difference-distractors",
            parameters: {
              leftDenominatorPath: "leftDenominator",
              rightDenominatorPath: "rightDenominator",
              leftNumeratorPath: "leftNumerator",
              rightNumeratorPath: "rightNumerator",
              commonDenominatorPath: "commonDenominator",
              leftCellsPath: "leftCells",
              rightCellsPath: "rightCells",
              differenceCellsPath: "differenceCells",
              correctPath: "correctResultText",
              oneSideCommonTextPath: "oneSideCommonText",
              coveredPartTextPath: "coveredPartText",
              minuendOnlyTextPath: "minuendOnlyText",
              denominatorSumTextPath: "denominatorSumText",
              candidatePaths
            }
          };
        }
        if (
          predicate.kind === "geometry.common-unit-sum-strips"
        ) {
          return {
            ...predicate,
            kind: "geometry.common-unit-lane-strips",
            parameters: {
              ...predicate.parameters,
              sumCellsPath: "differenceCells",
              leftCellsPath: "leftCells",
              rightCellsPath: "rightCells",
              differenceCellsPath: "differenceCells"
            }
          };
        }
        return predicate;
      }
    ),
    instructions: [
      "두 분수의 차를 먼저 골라 놓으세요.",
      "처음 띠를 맨 왼쪽에 붙여 놓고, 덮는 띠의 오른쪽 끝을 처음 띠의 끝에 맞추세요.",
      "처음 생각과 달랐다면 고쳐 놓고, 남은 부분이 왜 그 칸 수인지 쓰세요."
    ],
    payload: {
      ...commonUnitBase.payload,
      tags: [
        "분수의 뺄셈",
        "분모가 다른 분수",
        "통분",
        "공통 단위",
        "덮어 보기",
        "생각 고치기"
      ]
    }
  }));
