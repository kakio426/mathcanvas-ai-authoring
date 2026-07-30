import {
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  MATHCANVAS_PROJECT_CATEGORIES,
  VERIFIED_TEMPLATE_ID,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  FRACTION_PAIR_GENERATOR_ID,
  FRACTION_PAIR_GENERATOR_VERSION
} from "../item-generators/fraction-pair.js";

const block = (
  id: string,
  kind: "band" | "row" | "slot" | "anchor",
  preset: string,
  repeat: "once" | "each-item",
  groups: {
    flowGroup?: string;
    collisionGroup?: string;
  } = {}
) => ({ id, kind, preset, repeat, ...groups, children: [] });

export const fractionComparisonBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: VERIFIED_TEMPLATE_ID,
  version: "1.0.0",
  title: "분수 띠로 크기 비교하기",
  learningObjective:
    "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다.",
  curriculumBinding: {
    standardCode: "[6수01-07]",
    domain: "수와 연산",
    officialGoal:
      "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다."
  },
  generator: {
    id: FRACTION_PAIR_GENERATOR_ID,
    version: FRACTION_PAIR_GENERATOR_VERSION,
    parameters: {
      problemCount: 4,
      difficulty: "normal"
    }
  },
  toolRoles: [
    {
      role: "instruction-main",
      scope: "activity",
      layoutRole: "instruction-main",
      idRole: "instruction-main",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "활동의 핵심 조작을 안내합니다.",
      properties: {
        text: "분수 띠를 같은 출발선에 놓아요.",
        fontSize: 48
      },
      bindings: {}
    },
    {
      role: "instruction-symbol",
      scope: "activity",
      layoutRole: "instruction-symbol",
      idRole: "instruction-symbol",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "비교 기호 선택을 안내합니다.",
      properties: {
        text: "두 띠의 길이를 보고 기호를 놓아요.",
        fontSize: 38
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
      instructionalIntent: "수학적 이유 설명을 안내합니다.",
      properties: {
        text: "고른 기호를 띠의 길이와 같은 전체를 근거로 설명하세요.",
        fontSize: 38
      },
      bindings: {}
    },
    {
      role: "mat",
      scope: "each-item",
      layoutRole: "mat",
      idRole: "mat",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "문항 조작 영역의 시각적 경계를 제공합니다.",
      properties: { fill: "#F7FAFF", stroke: "#65758B" },
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
      properties: { fontSize: 34 },
      bindings: { text: "item.orderLabel" },
      containerRole: "mat"
    },
    {
      role: "prompt",
      scope: "each-item",
      layoutRole: "prompt",
      idRole: "prompt",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: true,
      movable: false,
      instructionalIntent: "비교할 두 분수를 수식으로 제시합니다.",
      properties: { fontSize: 48 },
      bindings: { text: "item.prompt" },
      containerRole: "mat"
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
      instructionalIntent: "조작 전 관계를 먼저 예상하도록 안내합니다.",
      properties: { text: "먼저 예상", fontSize: 24 },
      bindings: {},
      containerRole: "mat"
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
      instructionalIntent: "학생이 조작 전에 예상한 관계를 기록하는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {}
    },
    {
      role: "left-lane-surface",
      scope: "each-item",
      layoutRole: "left-lane",
      idRole: "left-lane-surface",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "첫 번째 띠를 놓는 목표 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#556274",
        strokeDashArray: "10 8"
      },
      bindings: {}
    },
    {
      role: "left-lane-label",
      scope: "each-item",
      layoutRole: "left-lane-label",
      idRole: "left-lane-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "첫 번째 띠의 목표 위치를 표시합니다.",
      properties: { text: "첫째 띠", fontSize: 24 },
      bindings: {},
      containerRole: "mat"
    },
    {
      role: "right-lane-surface",
      scope: "each-item",
      layoutRole: "right-lane",
      idRole: "right-lane-surface",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "두 번째 띠를 놓는 목표 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#556274",
        strokeDashArray: "10 8"
      },
      bindings: {}
    },
    {
      role: "right-lane-label",
      scope: "each-item",
      layoutRole: "right-lane-label",
      idRole: "right-lane-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "두 번째 띠의 목표 위치를 표시합니다.",
      properties: { text: "둘째 띠", fontSize: 24 },
      bindings: {},
      containerRole: "mat"
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
      instructionalIntent: "두 띠를 맞출 공통 출발선을 표시합니다.",
      properties: { fill: "#FF6B5D", stroke: "#FF6B5D" },
      bindings: {}
    },
    {
      role: "relation-slot-surface",
      scope: "each-item",
      layoutRole: "relation-slot",
      idRole: "relation-slot-surface",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "선택한 비교 기호를 놓는 목표 영역입니다.",
      properties: {
        fill: "#FFF4D8",
        stroke: "#D49420",
        strokeDashArray: "10 8"
      },
      bindings: {}
    },
    {
      role: "relation-slot-label",
      scope: "each-item",
      layoutRole: "relation-slot-label",
      idRole: "relation-slot-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "비교 기호의 목표 위치를 안내합니다.",
      properties: { text: "기호 놓는 곳", fontSize: 26 },
      bindings: {},
      containerRole: "mat"
    },
    {
      role: "explanation-label",
      scope: "each-item",
      layoutRole: "explanation-label",
      idRole: "explanation-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "수학적 근거를 쓰는 영역을 안내합니다.",
      properties: { text: "근거와 수정", fontSize: 24 },
      bindings: {},
      containerRole: "mat"
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
      instructionalIntent: "띠의 길이와 같은 전체를 근거로 설명하고 예상을 수정하는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {}
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
      instructionalIntent: "첫 번째 분수 띠를 출발선에 맞춥니다.",
      properties: { color: "#FFA26C" },
      bindings: { fraction: "item.left" }
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
      instructionalIntent: "두 번째 분수 띠를 출발선에 맞춥니다.",
      properties: { color: "#65F0FF" },
      bindings: { fraction: "item.right" }
    },
    {
      role: "less-symbol",
      scope: "each-item",
      layoutRole: "less-symbol",
      idRole: "less-symbol",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: false,
      movable: true,
      instructionalIntent: "두 분수의 크기를 보고 알맞은 기호를 고릅니다.",
      properties: { text: "<", fontSize: 64 },
      bindings: {}
    },
    {
      role: "greater-symbol",
      scope: "each-item",
      layoutRole: "greater-symbol",
      idRole: "greater-symbol",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: false,
      movable: true,
      instructionalIntent: "두 분수의 크기를 보고 알맞은 기호를 고릅니다.",
      properties: { text: ">", fontSize: 64 },
      bindings: {}
    },
    {
      role: "equal-symbol",
      scope: "each-item",
      layoutRole: "equal-symbol",
      idRole: "equal-symbol",
      toolKey: "common.formula",
      intentKind: "latex",
      locked: false,
      movable: true,
      instructionalIntent: "두 분수가 같은지도 후보로 검토합니다.",
      properties: { text: "=", fontSize: 64 },
      bindings: {}
    }
  ],
  layout: {
    tokenSet: "p3-cognitive-fraction-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        block("instruction-main", "row", "header.primary", "once", {
          flowGroup: "instructions"
        }),
        block(
          "instruction-symbol",
          "row",
          "header.secondary",
          "once",
          { flowGroup: "instructions" }
        ),
        block(
          "instruction-explain",
          "row",
          "header.tertiary",
          "once",
          { flowGroup: "instructions" }
        ),
        block("mat", "band", "item.panel", "each-item"),
        block("number", "slot", "item.number", "each-item"),
        block("prompt", "slot", "item.prompt", "each-item"),
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
        block("left-lane", "row", "item.left-lane", "each-item", {
          collisionGroup: "comparison-targets"
        }),
        block(
          "left-lane-label",
          "slot",
          "item.left-lane-label",
          "each-item",
          { collisionGroup: "comparison-targets" }
        ),
        block(
          "right-lane",
          "row",
          "item.right-lane",
          "each-item"
        ),
        block(
          "right-lane-label",
          "slot",
          "item.right-lane-label",
          "each-item"
        ),
        block(
          "start-line",
          "anchor",
          "item.start-line",
          "each-item"
        ),
        block(
          "relation-slot",
          "slot",
          "item.relation-slot",
          "each-item"
        ),
        block(
          "relation-slot-label",
          "slot",
          "item.relation-slot-label",
          "each-item"
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
        ),
        block(
          "left-strip",
          "slot",
          "item.left-source",
          "each-item"
        ),
        block(
          "right-strip",
          "slot",
          "item.right-source",
          "each-item"
        ),
        block(
          "less-symbol",
          "slot",
          "item.less-choice",
          "each-item"
        ),
        block(
          "greater-symbol",
          "slot",
          "item.greater-choice",
          "each-item"
        ),
        block(
          "equal-symbol",
          "slot",
          "item.equal-choice",
          "each-item"
        )
      ]
    }
  },
  constraints: [
    {
      id: "align-left-strip",
      kind: "align-edge-to",
      sources: [{ scope: "each-item", role: "left-strip" }],
      target: {
        scope: "each-item",
        role: "left-lane-surface"
      },
      parameters: { edge: "left" },
      requiresStudentAction: true
    },
    {
      id: "place-right-strip",
      kind: "place-in",
      sources: [{ scope: "each-item", role: "right-strip" }],
      target: { scope: "each-item", role: "right-lane-surface" },
      parameters: {},
      requiresStudentAction: true
    },
    {
      id: "select-relation",
      kind: "select-one-of",
      sources: [
        { scope: "each-item", role: "less-symbol" },
        { scope: "each-item", role: "greater-symbol" },
        { scope: "each-item", role: "equal-symbol" }
      ],
      target: {
        scope: "each-item",
        role: "relation-slot-surface"
      },
      parameters: { predicate: "magnitude-relation" },
      requiresStudentAction: true
    }
  ],
  valuePredicates: [
    {
      kind: "ratio.unlike-denominators",
      parameters: { leftPath: "left", rightPath: "right" }
    },
    {
      kind: "ratio.proper-range",
      parameters: { leftPath: "left", rightPath: "right" }
    },
    {
      kind: "ratio.min-visual-difference",
      parameters: {
        leftPath: "left",
        rightPath: "right",
        minimumRatio: MIN_VISUAL_FRACTION_DIFFERENCE_RATIO
      }
    },
    {
      kind: "ratio.no-duplicate",
      parameters: { leftPath: "left", rightPath: "right" }
    },
    {
      kind: "ratio.relation-consistent",
      parameters: {
        leftPath: "left",
        rightPath: "right",
        relationPath: "correctRelation"
      }
    },
    {
      kind: "ratio.visual-model-consistent",
      parameters: {
        valuePaths: ["left", "right"],
        sourceRoles: ["left-strip", "right-strip"]
      }
    },
    {
      kind: "geometry.same-whole-and-start",
      parameters: {
        sourceRoles: ["left-strip", "right-strip"],
        targetRoles: [
          "left-lane-surface",
          "right-lane-surface"
        ],
        anchorRole: "start-line"
      }
    },
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "select-one",
        decisionConstraintId: "select-relation",
        candidateRoles: [
          "less-symbol",
          "equal-symbol",
          "greater-symbol"
        ],
        candidateProperty: "text",
        correctValuePath: "correctRelation",
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: [
          "left-strip",
          "right-strip",
          "start-line"
        ]
      }
    }
  ],
  instructions: [
    "띠를 옮기기 전에 <, =, > 중 하나를 먼저 예상해 쓰세요.",
    "두 분수 띠를 같은 출발선에 놓아 확인하세요.",
    "띠의 길이를 보고 알맞은 기호 하나를 고르세요.",
    "예상과 달랐다면 고친 뒤, 같은 전체와 길이를 근거로 설명하세요."
  ],
  payload: {
    categoryId:
      MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId,
    tags: ["분수", "크기 비교", "직접 조작"],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: {
    problemCount: 4,
    difficulty: "normal"
  }
});
