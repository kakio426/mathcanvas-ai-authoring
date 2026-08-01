import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_ID,
  CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_VERSION
} from "../item-generators/clock-hour-hand-boundary.js";

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
  toolKey: "common.text",
  intentKind: "text",
  locked: false,
  movable: true,
  instructionalIntent:
    "짧은바늘의 위치에 대한 서로 다른 생각 중 하나를 고르게 합니다.",
  properties: { text: "", fontSize: 20 },
  bindings: { text: `item.candidate${index}` },
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

export const clockHourHandBoundaryBlueprint =
  defineActivityBlueprint({
    schemaVersion: "1.0.0",
    id: "measure.time.clock.hour-hand-boundary-v1",
    version: "1.0.0",
    title: "긴바늘과 함께 움직이는 짧은바늘",
    learningObjective:
      "시계를 보고 시각을 ‘몇 시 몇 분’까지 읽을 수 있다.",
    curriculumBinding: {
      standardCode: "[2수03-07]",
      domain: "도형과 측정",
      officialGoal:
        "시계를 보고 시각을 ‘몇 시 몇 분’까지 읽을 수 있다."
    },
    generator: {
      id: CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_ID,
      version: CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_VERSION,
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
          "바늘을 움직이기 전에 짧은바늘의 위치를 결정하게 합니다.",
        properties: {
          text: "① 시계 바늘을 움직이기 전에, 짧은바늘이 어디쯤 갈지 하나 골라 놓으세요.",
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
          "기어식 시계를 직접 움직여 첫 생각을 확인하게 합니다.",
        properties: {
          text: "② 긴바늘을 시계가 가는 쪽으로 돌려, 짧은바늘의 움직임을 확인하세요.",
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
          "관찰 결과로 선택을 고치고 바늘의 관계를 설명하게 합니다.",
        properties: {
          text: "③ 처음 생각과 달랐다면 고쳐 놓고, 짧은바늘이 그렇게 움직인 까닭을 쓰세요.",
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
          "한 문항의 선택·시계 조작·설명 영역을 묶습니다.",
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
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "시작 시각과 긴바늘을 옮길 목표 분을 알려 줍니다.",
        properties: { text: "", fontSize: 30 },
        bindings: { text: "item.questionText" },
        containerRole: "work-panel"
      },
      {
        role: "clock",
        scope: "each-item",
        layoutRole: "clock",
        idRole: "clock",
        toolKey: "SM02AD",
        intentKind: "analog-clock",
        locked: false,
        movable: true,
        instructionalIntent:
          "긴바늘을 움직이면 짧은바늘도 비례해 움직이는 기어식 시계입니다.",
        properties: {
          clockType: "geared",
          isWorking: false
        },
        bindings: {
          hours: "item.startHour",
          minutes: "item.initialMinute"
        },
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
          "바늘을 움직이기 전에 고른 생각을 남길 곳을 알립니다.",
        properties: { text: "내가 고른 곳", fontSize: 23 },
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
          "짧은바늘의 위치에 대한 다섯 가지 생각을 한데 묶습니다.",
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
        instructionalIntent: "고를 수 있는 말을 안내합니다.",
        properties: { text: "고를 수 있는 말", fontSize: 23 },
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
          "시계로 확인한 뒤 바늘의 관계를 쓰게 합니다.",
        properties: { text: "확인한 뒤 쓴 까닭", fontSize: 23 },
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
          "처음 생각을 고친 까닭과 바늘의 관계를 쓰는 빈 영역입니다.",
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
      tokenSet: "wave6-clock-boundary-v1",
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
          block("clock", "slot", "item.clock", "each-item"),
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
        id: "select-hour-hand-position",
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
          decisionConstraintId: "select-hour-hand-position",
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctPositionText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: ["clock"]
        }
      },
      {
        kind: "values.clock-boundary-distractors",
        parameters: {
          startHourPath: "startHour",
          targetMinutePath: "targetMinute",
          nextHourPath: "nextHour",
          minuteNumberPath: "minuteNumber",
          correctPath: "correctPositionText",
          currentHourTextPath: "currentHourText",
          betweenStartTextPath: "betweenStartText",
          nextHourTextPath: "nextHourText",
          minuteNumberTextPath: "minuteNumberText",
          candidatePaths
        }
      },
      {
        kind: "visual.clock-time-consistent",
        parameters: {
          clockRole: "clock",
          hoursPath: "startHour",
          minutesPath: "initialMinute"
        }
      },
      {
        kind: "values.no-duplicate-combination",
        parameters: {
          valuePaths: ["startHour", "targetMinute"]
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
            "question",
            "prediction-label",
            "pool-label",
            ...candidateRoles,
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
            "clock",
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
      "시계 바늘을 움직이기 전에, 짧은바늘이 어디쯤 갈지 하나 골라 놓으세요.",
      "긴바늘을 시계가 가는 쪽으로 돌려, 짧은바늘의 움직임을 확인하세요.",
      "처음 생각과 달랐다면 고쳐 놓고, 짧은바늘이 그렇게 움직인 까닭을 쓰세요."
    ],
    payload: {
      categoryId:
        MATHCANVAS_PROJECT_CATEGORIES["도형과 측정"].categoryId,
      tags: [
        "시각과 시간",
        "시계 읽기",
        "긴바늘",
        "짧은바늘",
        "생각 고치기"
      ],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: { problemCount: 2, difficulty: "normal" }
  });
