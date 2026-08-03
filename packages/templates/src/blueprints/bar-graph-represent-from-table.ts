import {
  ACTIVITY_IDS,
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  BAR_GRAPH_REPRESENT_CELLS_GENERATOR_ID,
  BAR_GRAPH_REPRESENT_CELLS_GENERATOR_VERSION
} from "../item-generators/bar-graph-represent-cells.js";
import {
  CHOICE_CARD_ROLES,
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "./choice-explanation-scaffold.js";

const instructions = [
  "① 표를 보고, 막대를 몇 칸까지 그릴지 먼저 골라 놓으세요.",
  "② 그래프의 눈금 한 칸이 몇 명인지 세어 고른 칸 수를 확인하세요.",
  "③ 처음 고른 칸 수를 바꿀 수 있고, 그렇게 정한 까닭을 쓰세요."
] as const;

/**
 * 표의 자료를 막대그래프로 옮기는 활동이다. 학생이 정하는 것은 값이 아니라
 * 칸 수이고, 노리는 오개념은 "12명이니까 12칸"처럼 눈금 한 칸의 값을 1로
 * 보는 생각이다. 눈금 한 칸의 값은 화면에 적어 주되 나눗셈은 학생이 한다.
 */
export const barGraphRepresentFromTableBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: ACTIVITY_IDS.barGraphRepresentFromTable,
  version: "1.0.0",
  title: "표를 보고 막대그래프로 나타내기",
  learningObjective:
    "표의 자료를 막대그래프로 나타낼 때 눈금 한 칸의 값을 이용해 막대의 칸 수를 정하고 그 까닭을 설명할 수 있다.",
  curriculumBinding: {
    standardCode: "[4수04-01]",
    domain: "자료와 가능성",
    officialGoal:
      "자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다."
  },
  generator: {
    id: BAR_GRAPH_REPRESENT_CELLS_GENERATOR_ID,
    version: BAR_GRAPH_REPRESENT_CELLS_GENERATOR_VERSION,
    parameters: { problemCount: 2, difficulty: "normal" }
  },
  toolRoles: [
    ...makeChoiceExplanationScaffoldRoles({
      instructions,
      instructionalIntents: [
        "옮겨 그리기 전에 학생이 칸 수를 스스로 결정하게 합니다.",
        "정답 표시가 아니라 눈금 한 칸의 값으로 자기 선택을 검사하게 합니다.",
        "값과 칸 수의 관계를 말이나 식으로 수정하게 합니다."
      ],
      questionIntent:
        "표의 한 항목을 막대그래프에서 몇 칸으로 나타낼지 묻습니다.",
      predictionLabel: "내가 고른 칸 수",
      poolLabel: "고를 수 있는 칸 수",
      explanationLabel: "그렇게 정한 까닭"
    }),
    {
      role: "data-table",
      scope: "each-item",
      layoutRole: "data-table",
      idRole: "data-table",
      toolKey: "DP02TG",
      intentKind: "data-table",
      locked: true,
      movable: false,
      instructionalIntent:
        "막대그래프로 옮길 자료의 출처입니다. 항목과 사람 수를 함께 보여 줍니다.",
      properties: {},
      bindings: {
        title: "item.contextText",
        categories: "item.categories"
      },
      containerRole: "work-panel"
    },
    {
      role: "scale-label",
      scope: "each-item",
      layoutRole: "scale-label",
      idRole: "scale-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent:
        "눈금 한 칸의 값을 알려 줍니다. 칸 수는 학생이 계산합니다.",
      properties: { text: "", fontSize: 25 },
      bindings: { text: "item.scaleText" },
      containerRole: "work-panel"
    },
    {
      role: "bar-chart",
      scope: "each-item",
      layoutRole: "bar-chart",
      idRole: "bar-chart",
      toolKey: "DP04BC",
      intentKind: "bar-chart",
      locked: true,
      movable: false,
      instructionalIntent:
        "막대가 비어 있는 그래프입니다. 눈금을 세어 자기 선택을 확인합니다.",
      properties: {},
      bindings: {
        title: "item.contextText",
        categories: "item.categories",
        values: "item.barValues",
        valuePerGridline: "item.peoplePerCell",
        gridlineCount: "item.gridlineCount",
        valueAxisName: "item.valueAxisName",
        valueAxisUnit: "item.valueAxisUnit",
        categoryAxisName: "item.categoryLabelText"
      },
      containerRole: "work-panel"
    }
  ],
  layout: {
    tokenSet: "wave22-bar-graph-represent-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        ...makeChoiceExplanationScaffoldLayoutChildren(),
        layoutBlock("data-table", "slot", "item.data-table", "each-item"),
        layoutBlock("scale-label", "slot", "item.scale-label", "each-item"),
        layoutBlock("bar-chart", "slot", "item.bar-chart", "each-item")
      ]
    }
  },
  constraints: [
    {
      id: "select-bar-cell-count",
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
        decisionConstraintId: "select-bar-cell-count",
        candidateRoles: CHOICE_CARD_ROLES,
        candidateProperty: "text",
        correctValuePath: "correctValueText",
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: ["data-table", "scale-label", "bar-chart"]
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
          "scale-label"
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
          "scale-label",
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
          "data-table",
          "scale-label",
          "bar-chart",
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
    categoryId: MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"].categoryId,
    tags: ["막대그래프", "자료 나타내기", "눈금 한 칸", "까닭 쓰기"],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: { problemCount: 2, difficulty: "normal" }
});
