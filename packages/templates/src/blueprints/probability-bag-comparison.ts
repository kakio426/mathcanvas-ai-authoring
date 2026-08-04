import { MATHCANVAS_PROJECT_CATEGORIES, defineActivityBlueprint } from "@mathcanvas/contracts";
import { fractionComparisonBlueprint } from "./fraction-comparison.js";
import { PROBABILITY_BAG_PAIR_GENERATOR_ID, PROBABILITY_BAG_PAIR_GENERATOR_VERSION } from "../item-generators/probability-bag-pair.js";
import { withStudentScreenQuality } from "./student-screen-quality.js";

const { contentHash: _fractionHash, ...fractionBody } = fractionComparisonBlueprint;
const textByRole: Readonly<Record<string, string>> = {
  "instruction-main": "① 빨강 공이 나올 가능성이 더 큰 쪽을 기호로 골라 놓으세요.",
  "instruction-symbol": "② 빨강 공 수를 전체 공 수로 나타낸 두 띠를 같은 출발선에 놓으세요.",
  "instruction-explain": "③ 띠의 길이를 보고 기호를 고칠 수 있고, 전체 수와 빨강 수로 까닭을 쓰세요.",
  "choice-pool-label": "비교 기호",
  "prediction-label": "내가 고른 기호",
  "left-lane-label": "첫째",
  "right-lane-label": "둘째",
  "relation-slot-label": "기호 놓기",
  "explanation-label": "비교한 까닭"
};

export const probabilityBagComparisonBlueprint = defineActivityBlueprint(withStudentScreenQuality({
  ...fractionBody,
  id: "probability.compare.bag-ratios-v1",
  version: "1.1.0",
  title: "전체 공과 빨강 공 수로 두 주머니 가능성 비교하기",
  learningObjective: "두 주머니에서 원하는 색이 나올 가능성을 전체 수에 대한 원하는 색의 수로 나타내어 비교하고 설명할 수 있다.",
  curriculumBinding: { standardCode: "[6수04-04]", domain: "자료와 가능성", officialGoal: "사건이 일어날 가능성을 말로 표현하고 비교할 수 있다." },
  generator: { id: PROBABILITY_BAG_PAIR_GENERATOR_ID, version: PROBABILITY_BAG_PAIR_GENERATOR_VERSION, parameters: { problemCount: 2, difficulty: "normal", denominatorRelation: "mixed" } },
  toolRoles: [
    ...fractionBody.toolRoles.map((role) => {
      const text = textByRole[role.role];
      return text ? { ...role, properties: { ...role.properties, text } } : role;
    }),
    {
      role: "bag-context",
      scope: "each-item",
      layoutRole: "bag-context",
      idRole: "bag-context",
      toolKey: "common.text",
      intentKind: "text",
      locked: true,
      movable: false,
      instructionalIntent: "두 주머니의 전체 공 수와 빨강 공 수를 실제 문장으로 제시합니다.",
      properties: { text: "", fontSize: 21 },
      bindings: { text: "item.questionText" },
      containerRole: "mat"
    }
  ],
  layout: {
    tokenSet: "wave17-probability-bag-v1",
    root: {
      ...fractionBody.layout.root,
      children: [
        ...fractionBody.layout.root.children,
        { id: "bag-context", kind: "slot", preset: "item.bag-context", repeat: "each-item", children: [] }
      ]
    }
  },
  valuePredicates: fractionBody.valuePredicates.map((predicate) => {
    const roles = Array.isArray(predicate.parameters.roles)
      ? predicate.parameters.roles
      : [];
    if (predicate.kind === "language.classroom-korean") {
      return { ...predicate, parameters: { ...predicate.parameters, promptRoles: ["bag-context"] } };
    }
    if (predicate.kind === "visual.text-fit") {
      return { ...predicate, parameters: { ...predicate.parameters, roles: [...roles, "bag-context"] } };
    }
    if (predicate.kind === "visual.no-overlap") {
      return { ...predicate, parameters: { ...predicate.parameters, roles: [...roles, "bag-context"] } };
    }
    return predicate;
  }),
  instructions: [
    "빨강 공이 나올 가능성이 더 큰 쪽을 <, =, > 중에서 골라 놓으세요.",
    "각 주머니의 빨강 공 수를 전체 공 수에 대한 분수 띠로 나타내어 같은 출발선에서 비교하세요.",
    "알맞은 기호로 고치고 전체 공 수와 빨강 공 수를 들어 까닭을 쓰세요."
  ],
  payload: { categoryId: MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"].categoryId, tags: ["가능성", "전체와 부분", "분수 띠", "생각 고치기"], studyLevel: "elementary", isShowMenuOnActivity: true },
  variationDefaults: { problemCount: 2, difficulty: "normal", denominatorRelation: "mixed" }
}));
