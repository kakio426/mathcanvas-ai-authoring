import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  EQUIVALENT_FRACTION_GENERATOR_ID,
  EQUIVALENT_FRACTION_GENERATOR_VERSION
} from "../item-generators/equivalent-fraction.js";

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

const candidateNumbers = [1, 2, 3, 4, 5, 6] as const;
const candidateRoles = candidateNumbers.map(
  (number) => `candidate-strip-${number}`
);
const candidatePaths = candidateNumbers.map(
  (number) => `candidate${number}`
);

export const equivalentFractionBlueprint = defineActivityBlueprint({
  schemaVersion: "1.0.0",
  id: "fraction.equivalent.same-whole.visual-v1",
  version: "2.1.0",
  title: "같은 크기의 분수 찾기",
  learningObjective:
    "같은 전체에서 크기가 같은 분수를 선택하고 분자와 분모의 변화를 설명할 수 있다.",
  curriculumBinding: {
    standardCode: "[6수01-06]",
    domain: "수와 연산",
    officialGoal:
      "크기가 같은 분수를 만드는 방법을 이해하고, 분수를 약분, 통분할 수 있다."
  },
  generator: {
    id: EQUIVALENT_FRACTION_GENERATOR_ID,
    version: EQUIVALENT_FRACTION_GENERATOR_VERSION,
    parameters: { problemCount: 4, difficulty: "normal" }
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
      instructionalIntent: "기준 분수와 같은 크기일 후보를 먼저 예상하게 합니다.",
      properties: {
        text: "① 분수 띠를 옮기기 전에, 기준 분수와 같은 크기인 분수를 예상해 써 보세요.",
        fontSize: 42
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
      instructionalIntent: "후보 띠를 같은 출발선에 놓아 검증하게 합니다.",
      properties: {
        text: "② 분수 띠 하나를 골라 기준 띠와 같은 출발선에 놓고 끝점을 비교해 보세요.",
        fontSize: 36
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
      instructionalIntent: "분자와 분모의 같은 배율 변화를 근거로 설명하게 합니다.",
      properties: {
        text: "③ 같은 크기가 되는 까닭을 쓰고, 처음 생각과 달랐다면 고쳐 보세요.",
        fontSize: 36
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
      instructionalIntent: "문항 조작 영역의 경계를 제공합니다.",
      properties: { fill: "#F7FAFF", stroke: "#65758B" },
      bindings: {}
    },
    {
      role: "candidate-pool",
      scope: "each-item",
      layoutRole: "candidate-pool",
      idRole: "candidate-pool",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "고를 수 있는 분수 띠를 하나의 묶음으로 구분합니다.",
      properties: { fill: "#F7FAFF", stroke: "#65758B" },
      bindings: {}
    },
    {
      role: "candidate-pool-label",
      scope: "each-item",
      layoutRole: "candidate-pool-label",
      idRole: "candidate-pool-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "학생이 고를 분수 띠 묶음을 안내합니다.",
      properties: { text: "분수 띠", fontSize: 22 },
      bindings: {},
      containerRole: "candidate-pool"
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
      instructionalIntent: "정답을 숨긴 기준 분수 식을 제시합니다.",
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
      instructionalIntent: "조작 전 예상을 안내합니다.",
      properties: { text: "예상한 분수", fontSize: 24 },
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
      instructionalIntent: "학생이 후보를 고르기 전에 예상한 분수를 기록하는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {}
    },
    {
      role: "reference-lane-surface",
      scope: "each-item",
      layoutRole: "reference-lane",
      idRole: "reference-lane-surface",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "기준 띠가 놓인 같은 전체 영역입니다.",
      properties: { fill: "#FFF7E8", stroke: "#D49420" },
      bindings: {}
    },
    {
      role: "reference-lane-label",
      scope: "each-item",
      layoutRole: "reference-lane-label",
      idRole: "reference-lane-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "기준 띠를 표시합니다.",
      properties: { text: "기준 띠", fontSize: 24 },
      bindings: {},
      containerRole: "mat"
    },
    {
      role: "reference-strip",
      scope: "each-item",
      layoutRole: "reference-strip",
      idRole: "reference-strip",
      toolKey: "NO03FM",
      intentKind: "fraction-model",
      locked: true,
      movable: false,
      instructionalIntent: "후보와 비교할 기준 분수 띠입니다.",
      properties: { color: "#FFA26C" },
      bindings: { fraction: "item.reference" }
    },
    {
      role: "target-lane-surface",
      scope: "each-item",
      layoutRole: "target-lane",
      idRole: "target-lane-surface",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent: "선택한 후보를 기준 띠와 맞대는 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#287EA8",
        strokeDashArray: "10 8"
      },
      bindings: {}
    },
    {
      role: "target-lane-label",
      scope: "each-item",
      layoutRole: "target-lane-label",
      idRole: "target-lane-label",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "선택 띠의 목표 위치를 표시합니다.",
      properties: { text: "고른 띠", fontSize: 24 },
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
      instructionalIntent: "기준과 후보가 공유할 출발선을 표시합니다.",
      properties: { fill: "#FF6B5D", stroke: "#FF6B5D" },
      bindings: {}
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
      instructionalIntent: "근거와 수정 영역을 안내합니다.",
      properties: { text: "같은 크기인 까닭", fontSize: 20 },
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
      instructionalIntent: "끝점과 분자·분모의 변화를 근거로 설명하는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {}
    },
    ...candidateNumbers.map((number) => ({
      role: `candidate-strip-${number}`,
      scope: "each-item" as const,
      layoutRole: `candidate-strip-${number}`,
      idRole: `candidate-strip-${number}`,
      toolKey: "NO03FM",
      intentKind: "fraction-model",
      locked: false,
      movable: true,
      instructionalIntent:
        "기준 분수와 같은 크기인지 판단할 후보 띠입니다.",
      properties: { color: "#65F0FF" },
      bindings: { fraction: `item.candidate${number}` }
    }))
  ],
  layout: {
    tokenSet: "p3-cognitive-equivalent-v1",
    root: {
      id: "canvas",
      kind: "canvas",
      preset: "canvas.root",
      repeat: "once",
      children: [
        block("instruction-main", "row", "header.primary", "once", {
          flowGroup: "instructions"
        }),
        block("instruction-symbol", "row", "header.secondary", "once", {
          flowGroup: "instructions"
        }),
        block("instruction-explain", "row", "header.tertiary", "once", {
          flowGroup: "instructions"
        }),
        block("mat", "band", "item.panel", "each-item", {
          flowGroup: "item-primary-flow"
        }),
        block(
          "candidate-pool",
          "band",
          "item.candidate-pool",
          "each-item",
          { flowGroup: "item-primary-flow" }
        ),
        block(
          "candidate-pool-label",
          "slot",
          "item.candidate-pool-label",
          "each-item"
        ),
        block("number", "slot", "item.number", "each-item"),
        block("prompt", "slot", "item.prompt", "each-item"),
        block(
          "prediction-label",
          "slot",
          "item.prediction-label",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        block(
          "prediction-box",
          "slot",
          "item.prediction-box",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        block(
          "reference-lane",
          "row",
          "item.reference-lane",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        block(
          "reference-lane-label",
          "slot",
          "item.reference-lane-label",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        block(
          "reference-strip",
          "slot",
          "item.reference-strip",
          "each-item"
        ),
        block(
          "target-lane",
          "row",
          "item.target-lane",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        block(
          "target-lane-label",
          "slot",
          "item.target-lane-label",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        block("start-line", "anchor", "item.start-line", "each-item"),
        block(
          "explanation-label",
          "slot",
          "item.explanation-label",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        block(
          "explanation-box",
          "slot",
          "item.explanation-box",
          "each-item",
          { collisionGroup: "equivalent-primary-zones" }
        ),
        ...candidateNumbers.map((number) =>
          block(
            `candidate-strip-${number}`,
            "slot",
            `item.candidate-${number}`,
            "each-item"
          )
        )
      ]
    }
  },
  constraints: [
    {
      id: "select-equivalent-strip",
      kind: "select-one-of",
      sources: candidateRoles.map((role) => ({
        scope: "each-item" as const,
        role
      })),
      target: {
        scope: "each-item",
        role: "target-lane-surface"
      },
      parameters: { predicate: "equivalent-fraction" },
      requiresStudentAction: true
    }
  ],
  valuePredicates: [
    {
      kind: "ratio.proper-range",
      parameters: { leftPath: "left", rightPath: "right" }
    },
    {
      kind: "ratio.equivalent",
      parameters: { leftPath: "left", rightPath: "right" }
    },
    {
      kind: "ratio.unlike-representation",
      parameters: { leftPath: "left", rightPath: "right" }
    },
    {
      kind: "ratio.no-duplicate",
      parameters: { leftPath: "left", rightPath: "right" }
    },
    {
      kind: "ratio.visual-model-consistent",
      parameters: {
        valuePaths: candidatePaths,
        sourceRoles: candidateRoles
      }
    },
    {
      kind: "ratio.one-side-change-distractor",
      parameters: {
        referencePath: "reference",
        correctPath: "correctCandidate",
        candidatePaths
      }
    },
    {
      kind: "ratio.additive-change-distractor",
      parameters: {
        referencePath: "reference",
        correctPath: "correctCandidate",
        candidatePaths
      }
    },
    {
      kind: "geometry.reference-target-same-whole-start",
      parameters: {
        referenceRole: "reference-strip",
        targetRole: "target-lane-surface",
        anchorRole: "start-line"
      }
    },
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "select-one",
        decisionConstraintId: "select-equivalent-strip",
        candidateRoles,
        candidateProperty: "fraction",
        correctValuePath: "correctCandidate",
        predictionRole: "prediction-box",
        explanationRole: "explanation-box",
        verificationRoles: [
          "reference-strip",
          "target-lane-surface",
          "start-line"
        ]
      }
    },
    {
      kind: "language.classroom-korean",
      parameters: {
        instructionRoles: [
          "instruction-main",
          "instruction-symbol",
          "instruction-explain"
        ],
        labelRoles: [
          "prediction-label",
          "reference-lane-label",
          "target-lane-label",
          "explanation-label",
          "candidate-pool-label"
        ],
        maximumInstructionLength: 90,
        maximumLabelLength: 12
      }
    },
    {
      kind: "visual.text-fit",
      parameters: {
        roles: [
          "instruction-main",
          "instruction-symbol",
          "instruction-explain",
          "prediction-label",
          "reference-lane-label",
          "target-lane-label",
          "explanation-label",
          "candidate-pool-label"
        ],
        maximumFillRatio: 0.96
      }
    },
    {
      kind: "visual.labeled-pool-row",
      parameters: {
        labelRole: "candidate-pool-label",
        memberRoles: candidateRoles,
        containerRole: "candidate-pool",
        rowCenterTolerance: 2,
        gapTolerance: 2,
        groupCenterTolerance: 2,
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
          "prompt",
          "prediction-label",
          "prediction-box",
          "reference-lane-surface",
          "reference-lane-label",
          "target-lane-surface",
          "target-lane-label",
          "explanation-label",
          "explanation-box",
          "candidate-pool-label",
          ...candidateRoles
        ]
      }
    }
  ],
  instructions: [
    "분수 띠를 옮기기 전에, 기준 분수와 같은 크기인 분수를 예상해 써 보세요.",
    "분수 띠 하나를 골라 기준 띠와 같은 출발선에 놓고 끝점을 비교해 보세요.",
    "같은 크기가 되는 까닭을 쓰고, 처음 생각과 달랐다면 고쳐 보세요."
  ],
  payload: {
    categoryId:
      MATHCANVAS_PROJECT_CATEGORIES["수와 연산"].categoryId,
    tags: ["동치분수", "약분", "통분", "오개념 비교", "직접 조작"],
    studyLevel: "elementary",
    isShowMenuOnActivity: true
  },
  variationDefaults: { problemCount: 4, difficulty: "normal" }
});
