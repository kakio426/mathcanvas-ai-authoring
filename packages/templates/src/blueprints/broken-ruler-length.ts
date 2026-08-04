import {
  MATHCANVAS_PROJECT_CATEGORIES,
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  BROKEN_RULER_LENGTH_GENERATOR_ID,
  BROKEN_RULER_LENGTH_GENERATOR_VERSION
} from "../item-generators/broken-ruler-length.js";
import { unlikeDenominatorCommonUnitSumBlueprint } from "./unlike-denominator-common-unit-sum.js";
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
  contentHash: commonUnitContentHash,
  ...commonUnitBase
} = unlikeDenominatorCommonUnitSumBlueprint;
void commonUnitContentHash;

const toolRoles = commonUnitBase.toolRoles.map((role) => {
  if (role.role === "instruction-predict") {
    return {
      ...role,
      instructionalIntent:
        "자를 움직이기 전에 두 끝 눈금으로 연필의 길이를 결정하게 합니다.",
      properties: {
        ...role.properties,
        text: "① 연필의 길이를 골라 놓으세요."
      }
    };
  }
  if (role.role === "instruction-verify") {
    return {
      ...role,
      instructionalIntent:
        "연필의 왼쪽 끝부터 1 cm 막대 하나를 반복해 옮기며 길이를 확인하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "② 연필 왼쪽 끝에서 1 cm 막대 한 개를 옮겨 가며 몇 번 놓이는지 세어 보세요."
      }
    };
  }
  if (role.role === "instruction-explain") {
    return {
      ...role,
      instructionalIntent:
        "처음 선택을 고치고 눈금선이 아닌 1 cm 간격을 센 까닭을 설명하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "③ 처음 생각과 다르면 카드를 바꾸고, 연필이 몇 cm인지와 그 까닭을 쓰세요."
      }
    };
  }
  if (role.role === "work-panel") {
    return {
      ...role,
      instructionalIntent:
        "한 문항의 길이 선택·단위 반복·설명 영역을 묶습니다."
    };
  }
  if (role.role === "question") {
    return {
      ...role,
      toolKey: "common.text",
      intentKind: "text",
      instructionalIntent:
        "0이 아닌 눈금에서 시작한 연필의 실제 길이를 화면에서 재어 묻게 합니다.",
      properties: { text: "", fontSize: 23 },
      bindings: { text: "item.questionText" }
    };
  }
  if (role.role === "left-strip") {
    return {
      ...role,
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle",
      locked: true,
      movable: false,
      instructionalIntent:
        "0이 아닌 두 눈금 사이에 놓인 연필을 분할선 없이 보여 줍니다.",
      properties: {
        fill: "#F6A94A",
        stroke: "#C47B19"
      },
      bindings: { unitSpan: "item.pencilSpan" }
    };
  }
  if (role.role === "left-strip-label") {
    return {
      ...role,
      instructionalIntent: "길이를 재는 연필을 구별합니다.",
      bindings: { text: "item.measuredBarLabel" }
    };
  }
  if (role.role === "right-strip") {
    return {
      ...role,
      instructionalIntent:
        "연필 길이에 1 cm가 몇 번 들어가는지 반복해 보는 움직일 수 있는 단위 막대입니다.",
      properties: {
        ...role.properties,
        color: "#58B5DC",
        showLabel: false
      },
      bindings: { fraction: "item.unitStick" }
    };
  }
  if (role.role === "right-strip-label") {
    return {
      ...role,
      instructionalIntent: "반복해서 옮길 1 cm 단위 막대를 구별합니다.",
      bindings: { text: "item.unitStickLabel" }
    };
  }
  if (role.role === "join-lane") {
    return {
      ...role,
      instructionalIntent:
        "연필을 따라 1 cm 막대 하나를 반복해 옮길 측정 줄입니다.",
      properties: {
        ...role.properties,
        fill: "none",
        stroke: "#65758B"
      }
    };
  }
  if (role.role === "join-lane-label") {
    return {
      ...role,
      instructionalIntent: "1 cm 막대를 반복해 옮길 곳을 안내합니다.",
      properties: {
        ...role.properties,
        text: "1 cm씩 놓기"
      }
    };
  }
  if (role.role === "start-line") {
    return {
      ...role,
      instructionalIntent: "자의 0 눈금과 측정 줄의 출발점을 표시합니다."
    };
  }
  if (role.role === "unit-ruler") {
    return {
      ...role,
      instructionalIntent:
        "서로 같은 1 cm 칸이 반복되는 고정된 자입니다.",
      properties: {
        ...role.properties,
        color: "#E8EEF6",
        showLabel: false
      },
      bindings: { fraction: "item.unitRuler" }
    };
  }
  if (role.role === "unit-ruler-label") {
    return {
      ...role,
      instructionalIntent: "각 칸이 1 cm인 자임을 안내합니다.",
      properties: {
        ...role.properties,
        text: "1 cm 눈금"
      }
    };
  }
  if (role.role === "prediction-label") {
    return {
      ...role,
      instructionalIntent: "자를 옮기기 전에 고른 길이를 놓아 둡니다.",
      properties: {
        ...role.properties,
        text: "내가 고른 길이"
      }
    };
  }
  if (role.role === "prediction-box") {
    return {
      ...role,
      instructionalIntent: "학생이 처음 고른 길이 카드를 놓는 빈 영역입니다."
    };
  }
  if (role.role === "choice-panel") {
    return {
      ...role,
      instructionalIntent:
        "두 끝 눈금과 단위 간격을 다르게 해석한 다섯 길이를 묶습니다."
    };
  }
  if (role.role === "pool-label") {
    return {
      ...role,
      instructionalIntent: "고를 수 있는 연필 길이의 단위를 안내합니다.",
      properties: {
        ...role.properties,
        text: "고를 수 있는 길이(cm)"
      }
    };
  }
  if (/^position-card-\d+$/.test(role.role)) {
    return {
      ...role,
      instructionalIntent:
        "연필 길이에 대한 서로 다른 생각 중 하나를 고르게 합니다."
    };
  }
  if (role.role === "explanation-label") {
    return {
      ...role,
      instructionalIntent:
        "연필의 길이와 1 cm 간격을 센 까닭을 쓰게 합니다.",
      properties: {
        ...role.properties,
        text: "길이와 까닭 쓰기"
      }
    };
  }
  if (role.role === "explanation-box") {
    return {
      ...role,
      instructionalIntent:
        "처음 선택을 고친 까닭과 1 cm가 반복된 횟수를 쓰는 빈 영역입니다."
    };
  }
  return role;
});

const requiredWave13RoleOverrides = [
  "instruction-predict",
  "instruction-verify",
  "instruction-explain",
  "work-panel",
  "question",
  "left-strip",
  "left-strip-label",
  "right-strip",
  "right-strip-label",
  "join-lane",
  "join-lane-label",
  "start-line",
  "unit-ruler",
  "unit-ruler-label",
  "prediction-label",
  "prediction-box",
  "choice-panel",
  "pool-label",
  ...candidateRoles,
  "explanation-label",
  "explanation-box"
] as const;
for (const roleName of requiredWave13RoleOverrides) {
  const baseIndex = commonUnitBase.toolRoles.findIndex(
    (role) => role.role === roleName
  );
  if (
    baseIndex < 0 ||
    toolRoles[baseIndex] === commonUnitBase.toolRoles[baseIndex]
  ) {
    throw new Error(`wave13-role-override-missing:${roleName}`);
  }
}

export const brokenRulerLengthBlueprint = defineActivityBlueprint(withStudentScreenQuality({
  ...commonUnitBase,
  id: "measure.length.unit-iteration.ruler-v1",
  version: "1.2.0",
  title: "1 cm 단위를 반복해 연필의 길이를 재는 활동",
  learningObjective:
    "길이 단위 1 cm를 알고, 같은 단위를 반복하여 물체의 길이를 측정하고 설명할 수 있다.",
  curriculumBinding: {
    standardCode: "[2수03-10]",
    domain: "도형과 측정",
    officialGoal:
      "길이 단위 1cm와 1m를 알고, 이를 이용하여 주변 사물의 길이를 측정할 수 있다."
  },
  generator: {
    id: BROKEN_RULER_LENGTH_GENERATOR_ID,
    version: BROKEN_RULER_LENGTH_GENERATOR_VERSION,
    parameters: { problemCount: 2, difficulty: "normal" }
  },
  toolRoles,
  layout: {
    tokenSet: "wave13-broken-ruler-v1",
    root: commonUnitBase.layout.root
  },
  constraints: commonUnitBase.constraints.flatMap((constraint) => {
    if (constraint.id === "place-left-strip") return [];
    if (constraint.id === "place-right-strip") {
      return [{ ...constraint, id: "iterate-one-centimeter-unit" }];
    }
    if (constraint.id === "select-common-unit-sum") {
      return [{ ...constraint, id: "select-measured-length" }];
    }
    return [constraint];
  }),
  valuePredicates: [
    {
      kind: "cognitive.release-contract",
      parameters: {
        mode: "select-one",
        decisionConstraintId: "select-measured-length",
        candidateRoles,
        candidateProperty: "text",
        correctValuePath: "correctLengthText",
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
      kind: "values.broken-ruler-length-distractors",
      parameters: {
        totalUnitsPath: "totalUnits",
        startMarkPath: "startMark",
        lengthPath: "lengthCm",
        endMarkPath: "endMark",
        correctPath: "correctLengthText",
        candidatePaths
      }
    },
    {
      kind: "geometry.unit-ruler-offset-length",
      parameters: {
        measuredBarRole: "left-strip",
        unitStickRole: "right-strip",
        measureLaneRole: "join-lane",
        rulerRole: "unit-ruler",
        startLineRole: "start-line",
        totalUnitsPath: "totalUnits",
        startMarkPath: "startMark",
        lengthPath: "lengthCm",
        endMarkPath: "endMark",
        spanPath: "pencilSpan"
      }
    },
    {
      kind: "visual.hidden-fraction-labels",
      parameters: {
        roles: ["right-strip", "unit-ruler"]
      }
    },
    {
      kind: "values.no-duplicate-combination",
      parameters: {
        valuePaths: ["totalUnits", "startMark", "lengthCm"]
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
    "연필의 길이를 골라 놓으세요.",
    "연필 왼쪽 끝에서 1 cm 막대 한 개를 옮겨 가며 몇 번 놓이는지 세어 보세요.",
    "처음 생각과 다르면 카드를 바꾸고, 연필이 몇 cm인지와 그 까닭을 쓰세요."
  ],
  payload: {
    ...commonUnitBase.payload,
    categoryId:
      MATHCANVAS_PROJECT_CATEGORIES["도형과 측정"].categoryId,
    tags: [
      "길이 재기",
      "1 cm",
      "단위 반복",
      "자",
      "눈금 간격",
      "생각 고치기"
    ]
  }
}));
