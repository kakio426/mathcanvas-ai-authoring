import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  BAR_GRAPH_SCALE_UNIT_GENERATOR_ID,
  BAR_GRAPH_SCALE_UNIT_GENERATOR_VERSION
} from "../item-generators/bar-graph-scale-unit.js";
import {
  unlikeDenominatorCommonUnitSumBlueprint
} from "./unlike-denominator-common-unit-sum.js";

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
  contentHash: commonUnitContentHash,
  ...commonUnitBase
} = unlikeDenominatorCommonUnitSumBlueprint;
void commonUnitContentHash;

const inheritedToolRoles = commonUnitBase.toolRoles.map((role) => {
  if (role.role === "instruction-predict") {
    return {
      ...role,
      instructionalIntent:
        "막대를 움직이기 전에 파란 막대가 나타내는 값을 선택하게 합니다.",
      properties: {
        ...role.properties,
        text: "① 파란 막대가 몇 명인지 먼저 골라 놓으세요."
      }
    };
  }
  if (role.role === "instruction-verify") {
    return {
      ...role,
      instructionalIntent:
        "두 막대를 같은 눈금의 출발선에 맞추고 기준 막대로 한 칸의 값을 정하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "② 초록 막대와 파란 막대를 같은 색 줄의 왼쪽 선에 옮겨 놓고, 한 칸이 몇 명인지 쓰세요."
      }
    };
  }
  if (role.role === "instruction-explain") {
    return {
      ...role,
      instructionalIntent:
        "눈금 한 칸의 값으로 선택을 고치고 그래프를 읽은 방법을 설명하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "③ 처음 생각과 달랐다면 고쳐 놓고, 한 칸이 몇 명인지와 그 까닭을 쓰세요."
      }
    };
  }
  if (role.role === "work-panel") {
    return {
      ...role,
      instructionalIntent:
        "한 문항의 값 선택·막대 정렬·설명 영역을 묶습니다."
    };
  }
  if (role.role === "question") {
    return {
      ...role,
      toolKey: "common.text",
      intentKind: "text",
      instructionalIntent:
        "기준 막대의 값과 읽어야 할 막대를 자연스러운 문장으로 묻습니다.",
      properties: { text: "", fontSize: 34 },
      bindings: { text: "item.questionText" }
    };
  }
  if (role.role === "left-strip") {
    return {
      ...role,
      instructionalIntent:
        "값이 알려진 기준 자료를 나타내는 움직일 수 있는 초록 막대입니다.",
      properties: {
        ...role.properties,
        color: "#65C978",
        showLabel: false
      },
      bindings: { fraction: "item.referenceBar" }
    };
  }
  if (role.role === "left-strip-label") {
    return {
      ...role,
      instructionalIntent:
        "값이 알려진 기준 막대를 구별합니다.",
      bindings: { text: "item.referenceLabel" }
    };
  }
  if (role.role === "right-strip") {
    return {
      ...role,
      instructionalIntent:
        "눈금 한 칸의 값을 이용해 읽어야 하는 움직일 수 있는 파란 막대입니다.",
      properties: {
        ...role.properties,
        color: "#4B9FE8",
        showLabel: false
      },
      bindings: { fraction: "item.questionBar" }
    };
  }
  if (role.role === "right-strip-label") {
    return {
      ...role,
      instructionalIntent:
        "값을 알아내야 하는 막대를 구별합니다.",
      bindings: { text: "item.questionLabel" }
    };
  }
  if (role.role === "join-lane") {
    return {
      ...role,
      instructionalIntent:
        "두 막대를 서로 다른 행에서 같은 눈금 출발선에 맞추는 작업대입니다.",
      properties: {
        ...role.properties,
        fill: "#F8FAFC",
        stroke: "#65758B"
      }
    };
  }
  if (role.role === "join-lane-label") {
    return {
      ...role,
      instructionalIntent:
        "두 막대를 각자 놓을 눈금 행을 안내합니다.",
      properties: {
        ...role.properties,
        text: "눈금 맞추기"
      }
    };
  }
  if (role.role === "start-line") {
    return {
      ...role,
      instructionalIntent:
        "두 막대와 눈금이 함께 시작할 왼쪽 출발선을 표시합니다."
    };
  }
  if (role.role === "unit-ruler") {
    return {
      ...role,
      instructionalIntent:
        "막대 길이를 같은 크기의 칸으로 읽는 고정된 눈금입니다.",
      properties: {
        ...role.properties,
        color: "#E8EEF6",
        showLabel: false
      },
      bindings: { fraction: "item.scaleTrack" }
    };
  }
  if (role.role === "unit-ruler-label") {
    return {
      ...role,
      instructionalIntent:
        "아래 칸들이 막대그래프를 읽는 눈금임을 알립니다.",
      properties: {
        ...role.properties,
        text: "눈금"
      }
    };
  }
  if (role.role === "prediction-label") {
    return {
      ...role,
      instructionalIntent:
        "막대를 맞추기 전에 고른 값을 놓아 두는 곳을 알립니다.",
      properties: {
        ...role.properties,
        text: "내가 고른 수"
      }
    };
  }
  if (role.role === "choice-panel") {
    return {
      ...role,
      instructionalIntent:
        "막대 값에 대한 다섯 가지 생각을 한데 묶습니다."
    };
  }
  if (role.role === "pool-label") {
    return {
      ...role,
      instructionalIntent:
        "파란 막대의 값으로 고를 수 있는 수를 안내합니다."
    };
  }
  if (/^position-card-\d+$/.test(role.role)) {
    return {
      ...role,
      instructionalIntent:
        "막대의 값에 대한 서로 다른 생각 중 하나를 고르게 합니다."
    };
  }
  if (role.role === "explanation-label") {
    return {
      ...role,
      instructionalIntent:
        "눈금 한 칸의 값과 그래프를 읽은 까닭을 쓰게 합니다."
    };
  }
  if (role.role === "explanation-box") {
    return {
      ...role,
      instructionalIntent:
        "처음 선택을 고친 까닭과 눈금 한 칸의 값을 쓰는 빈 영역입니다."
    };
  }
  return role;
});

const toolRoles = [
  ...inheritedToolRoles,
  {
    role: "reference-lane",
    scope: "each-item" as const,
    layoutRole: "reference-lane",
    idRole: "reference-lane",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "초록 기준 막대를 놓는 첫 번째 눈금 행입니다.",
    properties: {
      fill: "#F2FAF4",
      stroke: "#65C978",
      strokeDashArray: "10 8"
    },
    bindings: {},
    containerRole: "work-panel"
  },
  {
    role: "question-lane",
    scope: "each-item" as const,
    layoutRole: "question-lane",
    idRole: "question-lane",
    toolKey: "common.rectangle",
    intentKind: "draw-rectangle" as const,
    locked: true,
    movable: false,
    instructionalIntent:
      "파란 막대를 놓는 두 번째 눈금 행입니다.",
    properties: {
      fill: "#F2F8FE",
      stroke: "#4B9FE8",
      strokeDashArray: "10 8"
    },
    bindings: {},
    containerRole: "work-panel"
  }
];

export const barGraphScaleUnitBlueprint =
  defineActivityBlueprint({
    ...commonUnitBase,
    id: "data.bar-graph.scale-unit.read-v1",
    version: "1.0.0",
    title: "눈금 한 칸의 크기를 정해 막대그래프를 읽는 활동",
    learningObjective:
      "기준 막대에서 눈금 한 칸의 크기를 정하고 다른 막대가 나타내는 값을 해석할 수 있다.",
    curriculumBinding: {
      standardCode: "[4수04-01]",
      domain: "자료와 가능성",
      officialGoal:
        "자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다."
    },
    generator: {
      id: BAR_GRAPH_SCALE_UNIT_GENERATOR_ID,
      version: BAR_GRAPH_SCALE_UNIT_GENERATOR_VERSION,
      parameters: { problemCount: 2, difficulty: "normal" }
    },
    toolRoles,
    layout: {
      tokenSet: "wave12-bar-graph-scale-v1",
      root: {
        ...commonUnitBase.layout.root,
        children: [
          ...commonUnitBase.layout.root.children,
          {
            id: "reference-lane",
            kind: "slot",
            preset: "item.reference-lane",
            repeat: "each-item",
            children: []
          },
          {
            id: "question-lane",
            kind: "slot",
            preset: "item.question-lane",
            repeat: "each-item",
            children: []
          }
        ]
      }
    },
    constraints: commonUnitBase.constraints.map((constraint) => {
      if (constraint.id === "place-left-strip") {
        return {
          ...constraint,
          id: "place-reference-bar",
          target: {
            scope: "each-item" as const,
            role: "reference-lane"
          }
        };
      }
      if (constraint.id === "place-right-strip") {
        return {
          ...constraint,
          id: "place-question-bar",
          target: {
            scope: "each-item" as const,
            role: "question-lane"
          }
        };
      }
      if (constraint.id === "select-common-unit-sum") {
        return {
          ...constraint,
          id: "select-bar-value"
        };
      }
      return constraint;
    }),
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "select-one",
          decisionConstraintId: "select-bar-value",
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctResultText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: [
            "left-strip",
            "right-strip",
            "join-lane",
            "reference-lane",
            "question-lane",
            "unit-ruler",
            "start-line"
          ]
        }
      },
      {
        kind: "values.bar-graph-scale-distractors",
        parameters: {
          totalCellsPath: "totalCells",
          peoplePerCellPath: "peoplePerCell",
          referenceCellsPath: "referenceCells",
          questionCellsPath: "questionCells",
          referenceValuePath: "referenceValue",
          questionValuePath: "questionValue",
          correctPath: "correctResultText",
          cellCountTextPath: "cellCountText",
          referenceCopyTextPath: "referenceCopyText",
          unitAsOneTextPath: "unitAsOneText",
          boundaryExtraTextPath: "boundaryExtraText",
          candidatePaths
        }
      },
      {
        kind: "geometry.bar-graph-scale-cells",
        parameters: {
          referenceBarRole: "left-strip",
          questionBarRole: "right-strip",
          workspaceRole: "join-lane",
          referenceLaneRole: "reference-lane",
          questionLaneRole: "question-lane",
          trackRole: "unit-ruler",
          startLineRole: "start-line",
          totalCellsPath: "totalCells",
          referenceCellsPath: "referenceCells",
          questionCellsPath: "questionCells"
        }
      },
      {
        kind: "visual.hidden-fraction-labels",
        parameters: {
          roles: ["left-strip", "right-strip", "unit-ruler"]
        }
      },
      {
        kind: "values.no-duplicate-combination",
        parameters: {
          valuePaths: [
            "totalCells",
            "referenceCells",
            "questionCells"
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
            "left-strip-label",
            "right-strip-label",
            "join-lane-label",
            "unit-ruler-label",
            "prediction-label",
            "pool-label",
            "explanation-label"
          ],
          promptRoles: ["question"],
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
            "question",
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
      "파란 막대가 몇 명인지 먼저 골라 놓으세요.",
      "초록 막대와 파란 막대를 같은 색 줄의 왼쪽 선에 옮겨 놓고, 한 칸이 몇 명인지 쓰세요.",
      "처음 생각과 달랐다면 고쳐 놓고, 한 칸이 몇 명인지와 그 까닭을 쓰세요."
    ],
    payload: {
      ...commonUnitBase.payload,
      categoryId:
        MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"]
          .categoryId,
      tags: [
        "막대그래프",
        "눈금",
        "그래프 읽기",
        "한 칸의 크기",
        "생각 고치기"
      ]
    }
  });
