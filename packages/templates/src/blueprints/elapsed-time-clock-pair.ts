import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  ELAPSED_TIME_CLOCK_PAIR_GENERATOR_ID,
  ELAPSED_TIME_CLOCK_PAIR_GENERATOR_VERSION
} from "../item-generators/elapsed-time-clock-pair.js";

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
    "걸린 시간에 대한 서로 다른 생각 중 하나를 고르게 합니다.",
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

export const elapsedTimeClockPairBlueprint =
  defineActivityBlueprint({
    schemaVersion: "1.0.0",
    id: "measure.time.elapsed.clock-pair-v1",
    version: "1.0.0",
    title: "시계를 돌려 확인하는 걸린 시간",
    learningObjective:
      "1시간과 1분의 관계를 이해하고, 시간을 ‘시간’, ‘분’으로 표현할 수 있다.",
    curriculumBinding: {
      standardCode: "[2수03-08]",
      domain: "도형과 측정",
      officialGoal:
        "1시간과 1분의 관계를 이해하고, 시간을 ‘시간’, ‘분’으로 표현할 수 있다."
    },
    generator: {
      id: ELAPSED_TIME_CLOCK_PAIR_GENERATOR_ID,
      version: ELAPSED_TIME_CLOCK_PAIR_GENERATOR_VERSION,
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
          "시계를 움직이기 전에 걸린 시간을 결정하게 합니다.",
        properties: {
          text: "① 두 시각을 보고, 몇 분 걸렸을지 하나 골라 놓으세요.",
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
          text: "② 시작 시계의 긴바늘을 끝 시각까지 시계가 가는 쪽으로 돌려 확인하세요.",
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
          "관찰 결과로 선택을 고치고 시간과 분의 관계를 설명하게 합니다.",
        properties: {
          text: "③ 처음 생각과 달랐다면 고쳐 놓고, 1시간과 1분의 관계로 까닭을 쓰세요.",
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
          "시작 시각과 끝 시각을 알려 줍니다.",
        properties: { text: "", fontSize: 30 },
        bindings: { text: "item.questionText" },
        containerRole: "work-panel"
      },
      {
        role: "clock-start",
        scope: "each-item",
        layoutRole: "clock-start",
        idRole: "clock-start",
        toolKey: "SM02AD",
        intentKind: "analog-clock",
        locked: false,
        movable: true,
        instructionalIntent:
          "끝 시각까지 긴바늘을 돌려 걸린 시간을 확인하는 시작 시계입니다.",
        properties: {
          clockType: "geared",
          isWorking: false
        },
        bindings: {
          hours: "item.startHour",
          minutes: "item.startMinute"
        },
        containerRole: "work-panel"
      },
      {
        role: "start-clock-label",
        scope: "each-item",
        layoutRole: "start-clock-label",
        idRole: "start-clock-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "시작 시계를 구별합니다.",
        properties: { text: "", fontSize: 23 },
        bindings: { text: "item.startLabel" },
        containerRole: "work-panel"
      },
      {
        role: "clock-end",
        scope: "each-item",
        layoutRole: "clock-end",
        idRole: "clock-end",
        toolKey: "SM02AD",
        intentKind: "analog-clock",
        locked: true,
        movable: false,
        instructionalIntent:
          "시작 시계를 어디까지 돌릴지 보여 주는 끝 시계입니다.",
        properties: {
          clockType: "geared",
          isWorking: false
        },
        bindings: {
          hours: "item.endHour",
          minutes: "item.endMinute"
        },
        containerRole: "work-panel"
      },
      {
        role: "end-clock-label",
        scope: "each-item",
        layoutRole: "end-clock-label",
        idRole: "end-clock-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "끝 시계를 구별합니다.",
        properties: { text: "", fontSize: 23 },
        bindings: { text: "item.endLabel" },
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
          "시계를 움직이기 전에 고른 시간을 남길 곳을 알립니다.",
        properties: { text: "내가 고른 시간", fontSize: 23 },
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
          "걸린 시간에 대한 다섯 가지 생각을 한데 묶습니다.",
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
        instructionalIntent: "고를 수 있는 시간을 안내합니다.",
        properties: { text: "고를 수 있는 시간", fontSize: 23 },
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
          "시계로 확인한 뒤 시간과 분의 관계를 쓰게 합니다.",
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
          "처음 생각을 고친 까닭과 시간·분의 관계를 쓰는 빈 영역입니다.",
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
      tokenSet: "wave7-elapsed-time-v1",
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
            "clock-start",
            "slot",
            "item.clock-start",
            "each-item"
          ),
          block(
            "start-clock-label",
            "slot",
            "item.start-clock-label",
            "each-item"
          ),
          block(
            "clock-end",
            "slot",
            "item.clock-end",
            "each-item"
          ),
          block(
            "end-clock-label",
            "slot",
            "item.end-clock-label",
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
        id: "select-elapsed-time",
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
          decisionConstraintId: "select-elapsed-time",
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctResultText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: ["clock-start", "clock-end"]
        }
      },
      {
        kind: "values.elapsed-time-distractors",
        parameters: {
          startHourPath: "startHour",
          startMinutePath: "startMinute",
          endHourPath: "endHour",
          endMinutePath: "endMinute",
          elapsedMinutesPath: "elapsedMinutes",
          correctPath: "correctResultText",
          minuteDifferenceTextPath: "minuteDifferenceText",
          hourOnlyTextPath: "hourOnlyText",
          decimalBorrowTextPath: "decimalBorrowText",
          startMinuteTextPath: "startMinuteText",
          candidatePaths
        }
      },
      {
        kind: "visual.clock-pair-consistent",
        parameters: {
          startClockRole: "clock-start",
          endClockRole: "clock-end",
          startHourPath: "startHour",
          startMinutePath: "startMinute",
          endHourPath: "endHour",
          endMinutePath: "endMinute"
        }
      },
      {
        kind: "values.no-duplicate-combination",
        parameters: {
          valuePaths: [
            "startHour",
            "startMinute",
            "elapsedMinutes"
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
            "start-clock-label",
            "end-clock-label",
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
            "clock-start",
            "start-clock-label",
            "clock-end",
            "end-clock-label",
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
      "두 시각을 보고, 몇 분 걸렸을지 하나 골라 놓으세요.",
      "시작 시계의 긴바늘을 끝 시각까지 시계가 가는 쪽으로 돌려 확인하세요.",
      "처음 생각과 달랐다면 고쳐 놓고, 1시간과 1분의 관계로 까닭을 쓰세요."
    ],
    payload: {
      categoryId:
        MATHCANVAS_PROJECT_CATEGORIES["도형과 측정"].categoryId,
      tags: [
        "시각과 시간",
        "걸린 시간",
        "1시간과 60분",
        "긴바늘",
        "생각 고치기"
      ],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: { problemCount: 2, difficulty: "normal" }
  });
