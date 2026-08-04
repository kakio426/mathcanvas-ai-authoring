import {
  defineActivityBlueprint
} from "@mathcanvas/contracts";
import {
  SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_ID,
  SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_VERSION
} from "../item-generators/same-denominator-improper-sum.js";
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
        "두 띠를 이어 붙여 합이 1의 금을 넘는지 직접 확인하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "② 두 분수 띠를 이어 붙이고, 1이 되는 금을 넘는지 확인하세요."
      }
    };
  }
  if (role.role === "instruction-explain") {
    return {
      ...role,
      instructionalIntent:
        "분자가 분모보다 큰 가분수가 합이 될 수 있는 까닭을 설명하게 합니다.",
      properties: {
        ...role.properties,
        text:
          "③ 처음 생각과 달랐다면 고쳐 놓고, 분자가 분모보다 커도 되는 까닭을 쓰세요."
      }
    };
  }
  return role;
});

export const sameDenominatorImproperSumBlueprint =
  defineActivityBlueprint(withStudentScreenQuality({
    ...wave8Base,
    id: "fraction.add.same-denominator.improper-sum-v1",
    version: "1.0.0",
    title: "1을 넘는 합을 분수 띠로 확인하는 같은 분모의 덧셈",
    generator: {
      id: SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_ID,
      version:
        SAME_DENOMINATOR_IMPROPER_SUM_GENERATOR_VERSION,
      parameters: { problemCount: 2, difficulty: "normal" }
    },
    toolRoles: [
      ...toolRoles,
      {
        role: "one-whole-boundary",
        scope: "each-item",
        layoutRole: "one-whole-boundary",
        idRole: "one-whole-boundary",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent:
          "두 전체 길이의 확인 줄에서 정확히 1이 되는 지점을 표시합니다.",
        properties: {
          fill: "#4B5A70",
          stroke: "#4B5A70"
        },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "one-whole-label",
        scope: "each-item",
        layoutRole: "one-whole-label",
        idRole: "one-whole-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent:
          "분수식을 미리 보여 주지 않고 1의 위치만 말로 안내합니다.",
        properties: {
          text: "여기까지가 1",
          fontSize: 22
        },
        bindings: {},
        containerRole: "work-panel"
      }
    ],
    layout: {
      tokenSet: "wave9-improper-sum-v1",
      root: {
        ...wave8Base.layout.root,
        children: [
          ...wave8Base.layout.root.children,
          {
            id: "one-whole-boundary",
            kind: "slot",
            preset: "item.one-whole-boundary",
            repeat: "each-item",
            children: []
          },
          {
            id: "one-whole-label",
            kind: "slot",
            preset: "item.one-whole-label",
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
            id: "select-improper-sum"
          }
        : constraint
    ),
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "select-one",
          decisionConstraintId: "select-improper-sum",
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctResultLatex",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: [
            "left-strip",
            "right-strip",
            "join-lane",
            "one-whole-boundary",
            "start-line"
          ]
        }
      },
      {
        kind: "values.improper-sum-distractors",
        parameters: {
          denominatorPath: "denominator",
          leftNumeratorPath: "leftNumerator",
          rightNumeratorPath: "rightNumerator",
          sumNumeratorPath: "sumNumerator",
          overflowNumeratorPath: "overflowNumerator",
          correctPath: "correctResultText",
          addBothTextPath: "addBothText",
          capAtOneTextPath: "capAtOneText",
          overflowOnlyTextPath: "overflowOnlyText",
          largerAddendTextPath: "largerAddendText",
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
          wholeBoundaryRole: "one-whole-boundary",
          wholeCount: 2,
          requireImproperSum: true,
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
            "one-whole-label",
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
            "one-whole-label",
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
            "one-whole-boundary",
            "one-whole-label",
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
      "두 분수 띠를 이어 붙이고, 1이 되는 금을 넘는지 확인하세요.",
      "처음 생각과 달랐다면 고쳐 놓고, 분자가 분모보다 커도 되는 까닭을 쓰세요."
    ],
    payload: {
      ...wave8Base.payload,
      tags: [
        "분수의 덧셈",
        "같은 분모",
        "가분수",
        "1을 넘는 합",
        "생각 고치기"
      ]
    }
  }));
