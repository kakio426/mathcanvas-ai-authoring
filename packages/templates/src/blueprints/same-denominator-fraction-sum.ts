import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_ID,
  SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_VERSION
} from "../item-generators/same-denominator-fraction-sum.js";
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

const block = (
  id: string,
  kind: "band" | "row" | "slot",
  preset: string,
  repeat: "once" | "each-item",
  collisionGroup?: string,
  flowGroup?: string
) => ({
  id,
  kind,
  preset,
  repeat,
  ...(collisionGroup ? { collisionGroup } : {}),
  ...(flowGroup ? { flowGroup } : {}),
  children: []
});

const positionCardRole = (index: number) => ({
  role: `position-card-${index}`,
  scope: "each-item" as const,
  layoutRole: `position-card-${index}`,
  idRole: `position-card-${index}`,
  toolKey: "common.formula",
  intentKind: "latex",
  locked: false,
  movable: true,
  instructionalIntent:
    "분수의 합에 대한 서로 다른 생각 중 하나를 고르게 합니다.",
  properties: { text: "", fontSize: 32 },
  bindings: { text: `item.candidate${index}Latex` },
  containerRole: "choice-panel"
});

const positionCardBackdropRole = (index: number) => ({
  role: `position-card-${index}-backdrop`,
  scope: "each-item" as const,
  layoutRole: `position-card-${index}-backdrop`,
  idRole: `position-card-${index}-backdrop`,
  toolKey: "common.rectangle",
  intentKind: "draw-rectangle",
  locked: true,
  movable: false,
  instructionalIntent:
    "고를 수 있는 말을 한눈에 구별하도록 테두리를 제공합니다.",
  properties: {
    fill: "#F7FAFD",
    stroke: "#8291A7"
  },
  bindings: {},
  containerRole: "choice-panel"
});

export const sameDenominatorFractionSumBlueprint =
  defineActivityBlueprint(withStudentScreenQuality({
    schemaVersion: "1.0.0",
    id: "fraction.add.same-denominator.strips-v1",
    version: "1.0.0",
    title: "분수 띠를 이어 붙여 확인하는 같은 분모의 덧셈",
    learningObjective:
      "분모가 같은 분수의 덧셈 원리를 이해하고 계산할 수 있다.",
    curriculumBinding: {
      standardCode: "[4수01-15]",
      domain: "수와 연산",
      officialGoal:
        "분모가 같은 분수의 덧셈과 뺄셈의 계산 원리를 이해하고 그 계산을 할 수 있다."
    },
    generator: {
      id: SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_ID,
      version: SAME_DENOMINATOR_FRACTION_SUM_GENERATOR_VERSION,
      parameters: { problemCount: 2, difficulty: "normal" }
    },
    toolRoles: [
      {
        role: "instruction-predict",
        scope: "activity",
        layoutRole: "instruction-predict",
        idRole: "instruction-predict",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "분수 띠를 움직이기 전에 두 분수의 합을 결정하게 합니다.",
        properties: {
          text: "① 두 분수의 합을 먼저 골라 놓으세요.",
          fontSize: 31
        },
        bindings: {}
      },
      {
        role: "instruction-verify",
        scope: "activity",
        layoutRole: "instruction-verify",
        idRole: "instruction-verify",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "같은 크기의 단위 조각을 유지한 채 두 분수 띠를 이어 붙여 첫 생각을 확인하게 합니다.",
        properties: {
          text: "② 두 분수 띠를 같은 줄에 빈틈없이 이어 붙이세요. 색칠한 조각은 모두 몇 개인지 확인하세요.",
          fontSize: 31
        },
        bindings: {}
      },
      {
        role: "instruction-explain",
        scope: "activity",
        layoutRole: "instruction-explain",
        idRole: "instruction-explain",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "관찰 결과로 선택을 고치고 분모가 그대로인 까닭을 설명하게 합니다.",
        properties: {
          text: "③ 처음 생각과 달랐다면 고쳐 놓고, 분모가 그대로인 까닭을 쓰세요.",
          fontSize: 31
        },
        bindings: {}
      },
      {
        role: "work-panel",
        scope: "each-item",
        layoutRole: "work-panel",
        idRole: "work-panel",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "한 문항의 선택·분수 띠 조작·설명 영역을 묶습니다.",
        properties: { fill: "none", stroke: "#65758B" },
        bindings: {}
      },
      {
        role: "number",
        scope: "each-item",
        layoutRole: "number",
        idRole: "number",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "문항 순서를 표시합니다.",
        properties: { text: "", fontSize: 28 },
        bindings: { text: "item.orderLabel" },
        containerRole: "work-panel"
      },
      {
        role: "question",
        scope: "each-item",
        layoutRole: "question",
        idRole: "question",
        toolKey: "common.formula",
        intentKind: "latex",
        locked: true,
        movable: false,
        instructionalIntent:
          "더할 두 분수를 교과서식 분수 표기로 보여 줍니다.",
        properties: { text: "", fontSize: 42 },
        bindings: { text: "item.questionLatex" },
        containerRole: "work-panel"
      },
      {
        role: "left-strip",
        scope: "each-item",
        layoutRole: "left-strip",
        idRole: "left-strip",
        toolKey: "NO03FM",
        intentKind: "fraction-model",
        locked: false,
        movable: true,
        instructionalIntent:
          "같은 전체를 기준으로 첫 번째 분수만큼 색칠한 움직일 수 있는 띠입니다.",
        properties: { color: "#F6A94A" },
        bindings: { fraction: "item.left" },
        containerRole: "work-panel"
      },
      {
        role: "left-strip-label",
        scope: "each-item",
        layoutRole: "left-strip-label",
        idRole: "left-strip-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "첫 번째 분수 띠를 구별합니다.",
        properties: { text: "", fontSize: 23 },
        bindings: { text: "item.leftLabel" },
        containerRole: "work-panel"
      },
      {
        role: "right-strip",
        scope: "each-item",
        layoutRole: "right-strip",
        idRole: "right-strip",
        toolKey: "NO03FM",
        intentKind: "fraction-model",
        locked: false,
        movable: true,
        instructionalIntent:
          "같은 전체를 기준으로 두 번째 분수만큼 색칠한 움직일 수 있는 띠입니다.",
        properties: { color: "#58B5DC" },
        bindings: { fraction: "item.right" },
        containerRole: "work-panel"
      },
      {
        role: "right-strip-label",
        scope: "each-item",
        layoutRole: "right-strip-label",
        idRole: "right-strip-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "두 번째 분수 띠를 구별합니다.",
        properties: { text: "", fontSize: 23 },
        bindings: { text: "item.rightLabel" },
        containerRole: "work-panel"
      },
      {
        role: "join-lane",
        scope: "each-item",
        layoutRole: "join-lane",
        idRole: "join-lane",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "두 분수 띠를 같은 출발선에서 빈틈없이 이어 붙일 목표 영역입니다.",
        properties: {
          fill: "#FFFFFF",
          stroke: "#65758B",
          strokeDashArray: "10 8"
        },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "join-lane-label",
        scope: "each-item",
        layoutRole: "join-lane-label",
        idRole: "join-lane-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "두 띠를 이어 붙일 줄을 안내합니다.",
        properties: { text: "이어 놓기", fontSize: 23 },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "start-line",
        scope: "each-item",
        layoutRole: "start-line",
        idRole: "start-line",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "첫 번째 분수 띠를 놓을 공통 출발선을 표시합니다.",
        properties: { fill: "#EF5E58", stroke: "#EF5E58" },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "prediction-label",
        scope: "each-item",
        layoutRole: "prediction-label",
        idRole: "prediction-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "분수 띠를 움직이기 전에 고른 합을 남길 곳을 알립니다.",
        properties: { text: "내가 고른 합", fontSize: 23 },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "prediction-box",
        scope: "each-item",
        layoutRole: "prediction-box",
        idRole: "prediction-box",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "학생이 첫 선택을 놓아 두는 빈 영역입니다.",
        properties: {
          fill: "#FFFFFF",
          stroke: "#65758B",
          strokeDashArray: "8 6"
        },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "choice-panel",
        scope: "each-item",
        layoutRole: "choice-panel",
        idRole: "choice-panel",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "분수의 합에 대한 다섯 가지 생각을 한데 묶습니다.",
        properties: { fill: "#FFFFFF", stroke: "#B2BFCE" },
        bindings: {}
      },
      {
        role: "pool-label",
        scope: "each-item",
        layoutRole: "pool-label",
        idRole: "pool-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "고를 수 있는 분수를 안내합니다.",
        properties: { text: "고를 수 있는 답", fontSize: 23 },
        bindings: {},
        containerRole: "choice-panel"
      },
      ...candidateRoles.map((_, index) =>
        positionCardBackdropRole(index + 1)
      ),
      ...candidateRoles.map((_, index) =>
        positionCardRole(index + 1)
      ),
      {
        role: "explanation-label",
        scope: "each-item",
        layoutRole: "explanation-label",
        idRole: "explanation-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "분수 띠로 확인한 뒤 분모가 그대로인 까닭을 쓰게 합니다.",
        properties: { text: "까닭 쓰기", fontSize: 23 },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "explanation-box",
        scope: "each-item",
        layoutRole: "explanation-box",
        idRole: "explanation-box",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "처음 생각을 고친 까닭과 같은 크기 단위의 의미를 쓰는 빈 영역입니다.",
        properties: {
          fill: "#FFFFFF",
          stroke: "#65758B",
          strokeDashArray: "8 6"
        },
        bindings: {},
        containerRole: "work-panel"
      }
    ],
    layout: {
      tokenSet: "wave8-fraction-sum-v1",
      root: {
        id: "canvas",
        kind: "canvas",
        preset: "canvas.root",
        repeat: "once",
        children: [
          block("instruction-predict", "row", "header.primary", "once"),
          block("instruction-verify", "row", "header.secondary", "once"),
          block("instruction-explain", "row", "header.tertiary", "once"),
          block(
            "work-panel",
            "slot",
            "item.panel",
            "each-item"
          ),
          block("number", "slot", "item.number", "each-item"),
          block("question", "slot", "item.question", "each-item"),
          block(
            "left-strip",
            "slot",
            "item.left-strip",
            "each-item"
          ),
          block(
            "left-strip-label",
            "slot",
            "item.left-strip-label",
            "each-item"
          ),
          block(
            "right-strip",
            "slot",
            "item.right-strip",
            "each-item"
          ),
          block(
            "right-strip-label",
            "slot",
            "item.right-strip-label",
            "each-item"
          ),
          block(
            "join-lane",
            "slot",
            "item.join-lane",
            "each-item"
          ),
          block(
            "join-lane-label",
            "slot",
            "item.join-lane-label",
            "each-item"
          ),
          block(
            "start-line",
            "slot",
            "item.start-line",
            "each-item"
          ),
          block(
            "prediction-label",
            "slot",
            "item.prediction-label",
            "each-item"
          ),
          block(
            "prediction-box",
            "slot",
            "item.prediction-box",
            "each-item"
          ),
          block(
            "choice-panel",
            "band",
            "item.choice-panel",
            "each-item"
          ),
          block("pool-label", "slot", "item.pool-label", "each-item"),
          ...candidateRoles.map((role) =>
            block(
              `${role}-backdrop`,
              "slot",
              `item.${role}-backdrop`,
              "each-item"
            )
          ),
          ...candidateRoles.map((role) =>
            block(
              role,
              "slot",
              `item.${role}`,
              "each-item",
              "position-pool"
            )
          ),
          block(
            "explanation-label",
            "slot",
            "item.explanation-label",
            "each-item"
          ),
          block(
            "explanation-box",
            "slot",
            "item.explanation-box",
            "each-item"
          )
        ]
      }
    },
    constraints: [
      {
        id: "place-left-strip",
        kind: "place-in",
        sources: [
          { scope: "each-item", role: "left-strip" }
        ],
        target: { scope: "each-item", role: "join-lane" },
        parameters: {},
        requiresStudentAction: true
      },
      {
        id: "place-right-strip",
        kind: "place-in",
        sources: [
          { scope: "each-item", role: "right-strip" }
        ],
        target: { scope: "each-item", role: "join-lane" },
        parameters: {},
        requiresStudentAction: true
      },
      {
        id: "select-fraction-sum",
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
          decisionConstraintId: "select-fraction-sum",
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctResultLatex",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: [
            "left-strip",
            "right-strip",
            "join-lane",
            "start-line"
          ]
        }
      },
      {
        kind: "values.same-denominator-sum-distractors",
        parameters: {
          denominatorPath: "denominator",
          leftNumeratorPath: "leftNumerator",
          rightNumeratorPath: "rightNumerator",
          sumNumeratorPath: "sumNumerator",
          correctPath: "correctResultText",
          addBothTextPath: "addBothText",
          largerAddendTextPath: "largerAddendText",
          doubleCountTextPath: "doubleCountText",
          differenceTextPath: "differenceText",
          candidatePaths
        }
      },
      {
        kind: "geometry.same-denominator-sum-strips",
        parameters: {
          leftStripRole: "left-strip",
          rightStripRole: "right-strip",
          joinLaneRole: "join-lane",
          startLineRole: "start-line",
          denominatorPath: "denominator",
          leftNumeratorPath: "leftNumerator",
          rightNumeratorPath: "rightNumerator"
        }
      },
      {
        kind: "values.no-duplicate-combination",
        parameters: {
          valuePaths: [
            "denominator",
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
      "두 분수 띠를 같은 줄에 빈틈없이 이어 붙이세요. 색칠한 조각은 모두 몇 개인지 확인하세요.",
      "처음 생각과 달랐다면 고쳐 놓고, 분모가 그대로인 까닭을 쓰세요."
    ],
    payload: {
      categoryId:
        MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId,
      tags: [
        "분수의 덧셈",
        "같은 분모",
        "분수 띠",
        "단위 분수",
        "생각 고치기"
      ],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: { problemCount: 2, difficulty: "normal" }
  }));
