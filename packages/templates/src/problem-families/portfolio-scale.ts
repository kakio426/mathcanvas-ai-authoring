import {
  MATHCANVAS_PROJECT_CATEGORIES,
  createSeededRandom,
  defineActivityBlueprint,
  defineCognitiveDemandManifest,
  defineVariationEnvelope,
  type ActivityBlueprintBody,
  type Difficulty,
  type Recommendation,
  type ResolvedActivity,
  type ResolvedItem
} from "@mathcanvas/contracts";
import {
  CHOICE_CARD_ROLES,
  layoutBlock,
  makeChoiceExplanationScaffoldLayoutChildren,
  makeChoiceExplanationScaffoldRoles
} from "../blueprints/choice-explanation-scaffold.js";
import type {
  GenerateActivitySpecOptions,
  RegisteredProblemPreview,
  RegisteredTeacherAnswer
} from "./runtime-types.js";
import type {
  ProblemFamilyNativeModule,
  ProblemFamilyRegistrySource
} from "./types.js";
import rawData from "./portfolio-scale.generated.json" with { type: "json" };
import rawStudentQuestions from "./portfolio-scale.student-questions.json" with { type: "json" };
import rawStudentSupport from "./portfolio-scale.student-support.json" with { type: "json" };

type PortfolioRenderer =
  | "number-card"
  | "place-value"
  | "fraction"
  | "pattern"
  | "table-graph"
  | "geometry"
  | "clock"
  | "relation-board";

type TargetOutline = Readonly<{
  key: string;
  studentDecision: string;
  invariant: string;
  observableEvidence: string;
  misconceptionClass: string;
}>;

type PortfolioRecord = Readonly<{
  sequence: number;
  workItemId: string;
  standardCode: string;
  standardSlug: string;
  officialGoal: string;
  gradeBand: "1-2" | "3-4" | "5-6";
  domain: "수와 연산" | "변화와 관계" | "도형과 측정" | "자료와 가능성";
  archetypeId: string;
  engineClassIds: readonly string[];
  rendererKind: PortfolioRenderer;
  familyId: string;
  manipulation: string;
  targetOutlines: readonly TargetOutline[];
  learningMap: Readonly<{
    topicId: string;
    prerequisiteTopicIds: readonly string[];
    observableEvidence: readonly string[];
    assessmentPrompt: string;
  }>;
}>;

const data = rawData as unknown as Readonly<{
  source: Readonly<{
    learningMapCommit: string;
    learningMapUsageSha256: string;
  }>;
  standardCount: number;
  targetOutlineCount: number;
  records: readonly PortfolioRecord[];
}>;
const studentQuestions = rawStudentQuestions as Readonly<Record<string, string>>;
const studentSupport = rawStudentSupport as Readonly<Record<string, Readonly<{
  correctChoice: string;
  evidencePrompt: string;
}>>>;

const CANDIDATE_ROLES = CHOICE_CARD_ROLES.slice(0, 4);
const INSTRUCTIONS = [
  "① 문제를 읽고 맞다고 생각하는 카드를 골라 빈칸에 놓으세요.",
  "② 아래 그림이나 표를 보고 고른 카드가 맞는지 확인하세요.",
  "③ 생각이 바뀌면 다른 카드를 놓고 그 까닭을 말해 보세요."
] as const;

const scaffold = makeChoiceExplanationScaffoldRoles({
  instructions: INSTRUCTIONS,
  instructionalIntents: [
    "자료를 확인하기 전에 학생 자신의 판단을 먼저 드러냅니다.",
    "그림이나 표를 살펴보며 고른 답을 스스로 확인하게 합니다.",
    "자료와 맞지 않는 생각을 바꾸고 확인 근거를 교사에게 말하게 합니다."
  ],
  questionIntent: "학생이 그림이나 표를 보고 직접 판단할 수 있는 한 가지 질문을 묻습니다.",
  predictionLabel: "내가 고른 카드",
  poolLabel: "골라 볼 카드",
  explanationLabel: "그렇게 생각한 까닭",
  candidateCount: 4,
  centerCandidates: true,
  fontSizes: { instruction: 29, question: 27, label: 24, candidate: 21 }
}).map((role) =>
  CANDIDATE_ROLES.includes(role.role as (typeof CANDIDATE_ROLES)[number])
    ? {
        ...role,
        toolKey: "common.text",
        intentKind: "text" as const,
        properties: { text: "", fontSize: 21, centerInPlacement: true }
      }
    : role
);

const nativeRole = (
  role: string,
  slot: "native-1" | "native-2" | "native-3" | "native-4" | "native-wide-1" | "native-wide-2",
  input: Pick<ActivityBlueprintBody["toolRoles"][number], "toolKey" | "intentKind" | "properties" | "bindings" | "instructionalIntent" | "locked" | "movable">
): ActivityBlueprintBody["toolRoles"][number] => ({
  role,
  scope: "each-item",
  layoutRole: role,
  idRole: role,
  containerRole: "array-panel",
  ...input
});

function nativeRoles(renderer: PortfolioRenderer): ActivityBlueprintBody["toolRoles"] {
  if (renderer === "number-card") {
    return [
      ...[1, 2, 3, 4].map((index) => nativeRole(
        `native-model-${index}`,
        `native-${index}` as "native-1",
        {
          toolKey: "NO04NT",
          intentKind: "number-card",
          locked: false,
          movable: true,
          instructionalIntent: "수 카드를 움직여 수와 관계를 비교합니다.",
          properties: {},
          bindings: { value: `item.nativeValue${index}` }
        }
      )),
      nativeRole("native-target", "native-wide-1", {
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "수 카드를 옮겨 비교할 수 있는 넉넉한 빈 영역입니다.",
        properties: { fill: "#FFFFFF", stroke: "#2F80ED", strokeDashArray: "8 6" },
        bindings: {}
      })
    ];
  }
  if (renderer === "place-value") {
    return [1, 2, 3].map((index) => nativeRole(
      `native-model-${index}`,
      `native-${index}` as "native-1",
      {
        toolKey: "NO04PD",
        intentKind: "place-value-model",
        locked: false,
        movable: true,
        instructionalIntent: "일·십·백 모형을 움직여 자릿값 관계를 확인합니다.",
        properties: {},
        bindings: { value: `item.placeValue${index}` }
      }
    ));
  }
  if (renderer === "fraction") {
    return [
      ...[1, 2].map((index) => nativeRole(
        `native-model-${index}`,
        `native-${index}` as "native-1",
        {
          toolKey: "NO03FM",
          intentKind: "fraction-model",
          locked: false,
          movable: true,
          instructionalIntent: "분수 띠를 같은 출발선에 놓아 전체와 부분을 비교합니다.",
          properties: { color: index === 1 ? "#FFA26C" : "#65F0FF" },
          bindings: { fraction: `item.nativeFraction${index}` }
        }
      )),
      nativeRole("native-target", "native-wide-2", {
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "두 분수 띠를 같은 출발선에 놓아 비교하는 빈 영역입니다.",
        properties: { fill: "#FFFFFF", stroke: "#2F80ED", strokeDashArray: "8 6" },
        bindings: {}
      })
    ];
  }
  if (renderer === "pattern") {
    return [1, 2, 3, 4].map((index) => nativeRole(
      `native-model-${index}`,
      `native-${index}` as "native-1",
      {
        toolKey: "SM02PB",
        intentKind: "pattern-block",
        locked: false,
        movable: true,
        instructionalIntent: "패턴 블록의 모양과 순서를 바꾸어 관계를 확인합니다.",
        properties: {},
        bindings: { variant: `item.patternVariant${index}` }
      }
    ));
  }
  if (renderer === "table-graph") {
    return [nativeRole("native-model-1", "native-wide-1", {
        toolKey: "DP02TG",
        intentKind: "data-table",
        locked: true,
        movable: false,
        instructionalIntent: "범주와 개수를 표로 묶어 비교할 자료를 제공합니다.",
        properties: {},
        bindings: {
          title: "item.nativeTitle",
          categories: "item.nativeCategories",
          values: "item.nativeDataValues",
          categoryAxisName: "item.nativeCategoryAxis",
          valueColumnName: "item.nativeValueColumn"
        }
      })];
  }
  if (renderer === "geometry") {
    return [1, 2, 3].map((index) => nativeRole(
      `native-model-${index}`,
      `native-${index}` as "native-1",
      {
        toolKey: "common.point-line",
        intentKind: "point-line",
        locked: index !== 3,
        movable: index === 3,
        instructionalIntent: "점과 선을 움직여 도형의 방향·각·대응 관계를 확인합니다.",
        properties: {
          geometry: index === 3 ? "angle" : "line",
          ...(index === 1 ? { ray: "base" } : {}),
          ...(index === 2 ? { ray: "turn" } : {}),
          stroke: index === 3 ? "#1677D2" : "#5E6473"
        },
        bindings: { angleDegrees: `item.geometryAngle${index}` }
      }
    ));
  }
  if (renderer === "clock") {
    return [nativeRole("native-model-1", "native-wide-1", {
      toolKey: "SM02AD",
      intentKind: "analog-clock",
      locked: false,
      movable: true,
      instructionalIntent: "긴바늘과 짧은바늘의 연결을 움직여 시각 관계를 확인합니다.",
      properties: { clockType: "geared", isWorking: false },
      bindings: { hours: "item.nativeHour", minutes: "item.nativeMinute" }
    })];
  }
  return [];
}

function nativeRoleNames(renderer: PortfolioRenderer): string[] {
  return nativeRoles(renderer).map((role) => role.role);
}

function nativeLayout(renderer: PortfolioRenderer) {
  if (renderer === "number-card") {
    return [
      ...[1, 2, 3, 4].map((index) =>
        layoutBlock(
          `native-model-${index}`,
          "slot",
          `item.native-source-${index}`,
          "each-item"
        )
      ),
      layoutBlock(
        "native-target",
        "slot",
        "item.native-number-target",
        "each-item"
      )
    ];
  }
  if (renderer === "fraction") {
    return [
      layoutBlock("native-model-1", "slot", "item.native-1", "each-item"),
      layoutBlock("native-model-2", "slot", "item.native-2", "each-item"),
      layoutBlock("native-target", "slot", "item.native-wide-2", "each-item")
    ];
  }
  if (renderer === "table-graph") {
    return [
      layoutBlock(
        "native-model-1",
        "slot",
        "item.native-table-wide",
        "each-item"
      )
    ];
  }
  return nativeRoles(renderer).map((role, index) => {
    const wide = renderer === "clock";
    return layoutBlock(
      role.role,
      "slot",
      wide ? `item.native-wide-${index + 1}` : `item.native-${index + 1}`,
      "each-item"
    );
  });
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target]!, output[index]!];
  }
  return output;
}

type StudentCopy = Readonly<{
  question: string;
  correctChoice: string;
  evidenceLabel: string;
  evidencePrompt: string;
}>;

const RENDERER_COPY: Readonly<Record<PortfolioRenderer, Readonly<{
  evidenceLabel: string;
}>>> = {
  "number-card": {
    evidenceLabel: "수 카드"
  },
  "place-value": {
    evidenceLabel: "자릿값 모형"
  },
  fraction: {
    evidenceLabel: "분수 모형"
  },
  pattern: {
    evidenceLabel: "무늬 블록"
  },
  "table-graph": {
    evidenceLabel: "표와 그래프"
  },
  geometry: {
    evidenceLabel: "도형 그림"
  },
  clock: {
    evidenceLabel: "시계"
  },
  "relation-board": {
    evidenceLabel: "수와 모양"
  }
};

const STUDENT_COPY_OVERRIDES: Readonly<Record<string, StudentCopy>> = {
  "organize-classified-data-in-table": {
    question: "과일을 같은 종류끼리 모아 표로 나타내려면 어떻게 해야 할까요?",
    correctChoice: "과일을 하나씩 세어 알맞은 칸에 써요.",
    evidenceLabel: "좋아하는 과일 표",
    evidencePrompt: "과일별 개수와 전체 개수가 맞는지 살펴보세요."
  },
  "explain-table-usefulness": {
    question: "과일 표를 쓰면 무엇을 쉽게 알 수 있을까요?",
    correctChoice: "어떤 과일이 많고 적은지 바로 알 수 있어요.",
    evidenceLabel: "좋아하는 과일 표",
    evidencePrompt: "가장 많은 과일과 가장 적은 과일을 찾아보세요."
  },
  "choose-own-arrangement-rule": {
    question: "어떤 두 블록을 어떤 차례로 되풀이할까요?",
    correctChoice: "두 블록과 되풀이할 차례를 먼저 정해요.",
    evidenceLabel: "무늬 블록",
    evidencePrompt: "고른 두 블록이 같은 차례로 되풀이되는지 살펴보세요."
  },
  "construct-repeat-arrangement-following-rule": {
    question: "정한 차례대로 블록을 더 놓으려면 어떻게 해야 할까요?",
    correctChoice: "처음 정한 두 블록의 차례를 계속 지켜요.",
    evidenceLabel: "무늬 블록",
    evidencePrompt: "처음 두 블록과 다음 블록의 차례를 비교해 보세요."
  },
  "construct-change-arrangement-following-rule": {
    question: "수들이 같은 만큼 커지거나 작아지게 하려면 어떻게 해야 할까요?",
    correctChoice: "이웃한 두 수가 얼마씩 달라지는지 살펴봐요.",
    evidenceLabel: "수의 규칙",
    evidencePrompt: "앞 수와 다음 수가 얼마씩 달라지는지 살펴보세요."
  },
  "match-everyday-objects-to-solid-shapes": {
    question: "공, 캔, 상자는 어떤 모양과 닮았을까요?",
    correctChoice: "물건의 겉모양을 천천히 돌려 보며 살펴봐요.",
    evidenceLabel: "입체 모양",
    evidencePrompt: "둥근 면과 평평한 면이 있는지 살펴보세요."
  },
  "compose-shapes-with-solid-objects": {
    question: "상자와 캔 모양을 어떻게 놓으면 새 모양이 될까요?",
    correctChoice: "넓고 평평한 면이 아래로 오게 놓아요.",
    evidenceLabel: "입체 모양",
    evidencePrompt: "모양이 쓰러지지 않고 잘 서 있는지 살펴보세요."
  },
  "recognize-number-purpose-and-zero": {
    question: "아무것도 없을 때 쓰는 수는 무엇일까요?",
    correctChoice: "하나도 없으면 0으로 나타내요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "물건의 수와 수 카드가 맞는지 살펴보세요."
  },
  "count-cardinality-to-one-hundred": {
    question: "물건의 수를 빠뜨리지 않고 세려면 어떻게 해야 할까요?",
    correctChoice: "물건을 하나씩 짚으며 한 번만 세어요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "마지막에 말한 수와 물건의 수가 같은지 살펴보세요."
  },
  "read-and-write-numbers-to-one-hundred": {
    question: "수 카드에 적힌 수는 어떻게 읽을까요?",
    correctChoice: "십의 자리와 일의 자리를 차례로 살펴봐요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "숫자와 읽는 말이 서로 맞는지 살펴보세요."
  },
  "represent-classified-data-with-symbol-graph": {
    question: "조사한 물건 하나를 기호 하나로 나타내려면 어떻게 놓을까요?",
    correctChoice: "물건마다 기호를 하나씩 알맞은 칸에 놓아요.",
    evidenceLabel: "기호그래프",
    evidencePrompt: "물건 수와 기호 수가 같은지 살펴보세요."
  },
  "explain-symbol-graph-usefulness": {
    question: "기호그래프를 보면 무엇을 쉽게 알 수 있을까요?",
    correctChoice: "어느 것이 많고 적은지 바로 알 수 있어요.",
    evidenceLabel: "기호그래프",
    evidencePrompt: "기호가 가장 많은 칸과 적은 칸을 찾아보세요."
  },
  "construct-solid-with-cubes": {
    question: "쌓기나무로 주어진 모양을 어떻게 만들까요?",
    correctChoice: "아래 칸부터 놓고 위에 차례로 쌓아요.",
    evidenceLabel: "쌓기나무",
    evidencePrompt: "그림과 같은 자리에 쌓기나무가 있는지 살펴보세요."
  },
  "describe-cube-positions-and-directions": {
    question: "빨간 쌓기나무는 파란 쌓기나무의 어디에 있을까요?",
    correctChoice: "기준 쌓기나무를 먼저 찾고 위치를 말해요.",
    evidenceLabel: "쌓기나무",
    evidencePrompt: "위, 아래, 앞, 뒤, 옆 중 알맞은 말을 골라 보세요."
  },
  "match-everyday-objects-to-plane-shapes": {
    question: "접시, 창문, 표지판은 어떤 모양과 닮았을까요?",
    correctChoice: "물건의 가장자리 모양을 따라 살펴봐요.",
    evidenceLabel: "평면 모양",
    evidencePrompt: "삼각형, 사각형, 원 중 닮은 모양을 찾아보세요."
  },
  "compose-new-shapes-from-plane-shapes": {
    question: "삼각형과 사각형 조각을 어떻게 이어 새 모양을 만들까요?",
    correctChoice: "조각이 겹치지 않도록 변끼리 맞대어 놓아요.",
    evidenceLabel: "도형 조각",
    evidencePrompt: "조각 사이에 빈틈이나 겹친 곳이 없는지 살펴보세요."
  },
  "understand-number-sequence-to-four-digits": {
    question: "수들이 같은 만큼 커질 때 빈칸에는 어떤 수가 들어갈까요?",
    correctChoice: "이웃한 두 수가 얼마씩 달라지는지 살펴봐요.",
    evidenceLabel: "수의 차례",
    evidencePrompt: "앞 수와 다음 수의 차이가 같은지 살펴보세요."
  },
  "compare-numbers-to-four-digits": {
    question: "두 수 중 어느 수가 더 클까요?",
    correctChoice: "가장 높은 자리의 숫자부터 비교해요.",
    evidenceLabel: "자릿값 모형",
    evidencePrompt: "천, 백, 십, 일의 자리 순서로 비교해 보세요."
  },
  "recognize-basic-plane-shapes-intuitively": {
    question: "이 모양은 삼각형, 사각형, 원 중 무엇일까요?",
    correctChoice: "곧은 선과 꼭짓점의 수를 살펴봐요.",
    evidenceLabel: "평면 모양",
    evidencePrompt: "변과 꼭짓점이 몇 개인지 살펴보세요."
  },
  "draw-basic-plane-shapes": {
    question: "주어진 이름에 맞는 모양을 어떻게 그릴까요?",
    correctChoice: "변과 꼭짓점의 수가 맞게 그려요.",
    evidenceLabel: "평면 모양",
    evidencePrompt: "그린 모양의 변과 꼭짓점을 세어 보세요."
  },
  "model-addition-situations": {
    question: "두 무리를 합치면 모두 몇 개인지 어떻게 나타낼까요?",
    correctChoice: "두 무리의 수를 더해 덧셈식으로 나타내요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "두 부분의 수와 전체 수가 맞는지 살펴보세요."
  },
  "model-subtraction-situations": {
    question: "전체에서 몇 개를 덜어 내면 몇 개가 남을까요?",
    correctChoice: "전체 수에서 덜어 낸 수를 빼요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "남은 물건의 수와 뺄셈 결과를 비교해 보세요."
  },
  "connect-add-sub-actions-to-expressions": {
    question: "합치는 장면과 덜어 내는 장면에는 어떤 식이 맞을까요?",
    correctChoice: "합치면 덧셈, 덜어 내면 뺄셈으로 나타내요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "장면의 행동과 계산 기호가 맞는지 살펴보세요."
  },
  "find-common-properties-of-triangles": {
    question: "여러 삼각형에 모두 있는 것은 무엇일까요?",
    correctChoice: "곧은 변과 꼭짓점을 하나씩 세어 봐요.",
    evidenceLabel: "삼각형",
    evidencePrompt: "모든 삼각형에 변과 꼭짓점이 3개인지 살펴보세요."
  },
  "find-common-properties-of-quadrilaterals": {
    question: "여러 사각형에 모두 있는 것은 무엇일까요?",
    correctChoice: "곧은 변과 꼭짓점을 하나씩 세어 봐요.",
    evidenceLabel: "사각형",
    evidencePrompt: "모든 사각형에 변과 꼭짓점이 4개인지 살펴보세요."
  },
  "understand-and-calculate-two-digit-addition": {
    question: "두 자리 수의 덧셈은 어떻게 계산할까요?",
    correctChoice: "일의 자리끼리, 십의 자리끼리 더해요.",
    evidenceLabel: "자릿값 모형",
    evidencePrompt: "일이 10개 모이면 십 1개로 바꾸세요."
  },
  "understand-and-calculate-two-digit-subtraction": {
    question: "두 자리 수의 뺄셈은 어떻게 계산할까요?",
    correctChoice: "일의 자리끼리, 십의 자리끼리 빼요.",
    evidenceLabel: "자릿값 모형",
    evidencePrompt: "일이 모자라면 십 1개를 일 10개로 바꾸세요."
  },
  "compare-object-lengths": {
    question: "두 물건 중 어느 것이 더 길까요?",
    correctChoice: "두 물건의 한쪽 끝을 같은 곳에 맞춰요.",
    evidenceLabel: "길이 비교",
    evidencePrompt: "반대쪽 끝이 더 멀리 간 물건을 찾아보세요."
  },
  "compare-container-capacities": {
    question: "두 그릇 중 어느 그릇에 더 많이 담을 수 있을까요?",
    correctChoice: "같은 컵으로 몇 번 담기는지 비교해요.",
    evidenceLabel: "들이 비교",
    evidencePrompt: "같은 컵이 더 많이 들어가는 그릇을 찾아보세요."
  },
  "compare-object-masses": {
    question: "두 물건 중 어느 것이 더 무거울까요?",
    correctChoice: "두 물건을 같은 저울에 놓아 비교해요.",
    evidenceLabel: "무게 비교",
    evidencePrompt: "저울에서 더 아래로 내려간 쪽을 살펴보세요."
  },
  "compare-surface-areas": {
    question: "두 종이 중 어느 쪽이 더 넓을까요?",
    correctChoice: "두 종이를 겹치거나 같은 조각으로 덮어 봐요.",
    evidenceLabel: "넓이 비교",
    evidencePrompt: "남는 부분이나 필요한 조각 수를 비교해 보세요."
  },
  "construct-related-addition-subtraction-facts": {
    question: "같은 세 수로 덧셈식과 뺄셈식을 어떻게 만들까요?",
    correctChoice: "두 작은 수를 더해 큰 수가 되게 놓아요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "세 수가 두 식에서 같은 뜻으로 쓰였는지 살펴보세요."
  },
  "use-inverse-relation-to-check": {
    question: "덧셈과 뺄셈의 답은 어떻게 다시 확인할까요?",
    correctChoice: "덧셈은 뺄셈으로, 뺄셈은 덧셈으로 확인해요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "거꾸로 계산했을 때 처음 수가 나오는지 살펴보세요."
  },
  "calculate-addition-of-three-numbers": {
    question: "세 수의 덧셈은 어떤 두 수부터 더하면 쉬울까요?",
    correctChoice: "10이 되는 두 수나 더하기 쉬운 두 수부터 더해요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "더하는 차례를 바꾸어도 합이 같은지 살펴보세요."
  },
  "calculate-mixed-three-number-add-sub": {
    question: "덧셈과 뺄셈이 섞인 식은 어느 쪽부터 계산할까요?",
    correctChoice: "왼쪽에서 오른쪽으로 차례대로 계산해요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "첫 계산의 답을 다음 계산에 바르게 썼는지 살펴보세요."
  },
  "construct-add-sub-equation-with-box": {
    question: "모르는 수가 있는 자리에 무엇을 놓아 식을 만들까요?",
    correctChoice: "모르는 수의 자리에 네모를 놓아요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "장면의 수와 식의 수가 서로 맞는지 살펴보세요."
  },
  "solve-box-value": {
    question: "네모 안에는 어떤 수가 들어갈까요?",
    correctChoice: "덧셈은 뺄셈으로, 뺄셈은 덧셈으로 거꾸로 계산해요.",
    evidenceLabel: "수 카드",
    evidencePrompt: "찾은 수를 식에 넣어 계산해 보세요."
  },
  "understand-time-calendar-unit-relations": {
    question: "분, 시간, 일, 주 중 알맞은 시간 단위는 무엇일까요?",
    correctChoice: "얼마나 오래 걸리는 일인지 생각해 단위를 골라요.",
    evidenceLabel: "시간과 달력",
    evidencePrompt: "60분은 1시간, 7일은 1주인지 살펴보세요."
  },
  "apply-time-unit-relations-in-context": {
    question: "생활 속 기간을 알맞은 시간 단위로 어떻게 바꿀까요?",
    correctChoice: "시간 단위가 몇 묶음인지 차례로 세어요.",
    evidenceLabel: "시간과 달력",
    evidencePrompt: "바꾼 뒤에도 같은 기간인지 살펴보세요."
  },
  "understand-meter-centimeter-relation": {
    question: "1미터는 몇 센티미터일까요?",
    correctChoice: "1미터를 1센티미터씩 나누어 세어요.",
    evidenceLabel: "길이 단위",
    evidencePrompt: "1미터 안에 1센티미터가 100개인지 살펴보세요."
  },
  "convert-mixed-meter-centimeter-to-centimeter": {
    question: "몇 미터 몇 센티미터를 센티미터로 어떻게 바꿀까요?",
    correctChoice: "1미터를 100센티미터로 바꾸어 더해요.",
    evidenceLabel: "길이 단위",
    evidencePrompt: "미터 묶음과 남은 센티미터를 함께 세어 보세요."
  },
  "convert-centimeter-to-mixed-meter-centimeter": {
    question: "센티미터를 몇 미터 몇 센티미터로 어떻게 바꿀까요?",
    correctChoice: "센티미터를 100개씩 묶어 미터로 바꿔요.",
    evidenceLabel: "길이 단위",
    evidencePrompt: "100센티미터 묶음과 남은 수를 살펴보세요."
  },
  "construct-and-relate-multiplication-facts": {
    question: "같은 수씩 묶인 것을 곱셈으로 어떻게 나타낼까요?",
    correctChoice: "한 묶음의 수와 묶음 수를 곱해요.",
    evidenceLabel: "묶음과 곱셈",
    evidencePrompt: "모든 묶음에 같은 수가 들어 있는지 살펴보세요."
  },
  "calculate-one-digit-products": {
    question: "한 자리 수의 곱은 어떻게 구할까요?",
    correctChoice: "같은 수를 묶음 수만큼 더해 보아요.",
    evidenceLabel: "곱셈구구",
    evidencePrompt: "묶음 그림과 곱셈의 답이 같은지 살펴보세요."
  },
  "estimate-length-with-benchmarks": {
    question: "이 물건의 길이는 얼마쯤일까요?",
    correctChoice: "알고 있는 기준 길이와 나란히 비교해요.",
    evidenceLabel: "길이 어림",
    evidencePrompt: "1센티미터나 1미터 기준과 비교해 보세요."
  },
  "check-and-calibrate-length-sense": {
    question: "어림한 길이와 잰 길이가 다르면 어떻게 고칠까요?",
    correctChoice: "두 길이의 차이를 보고 다음 어림을 고쳐요.",
    evidenceLabel: "길이 어림",
    evidencePrompt: "어림한 값과 실제로 잰 값을 비교해 보세요."
  },
  "add-lengths-in-context": {
    question: "두 길이를 이어 붙이면 모두 얼마나 될까요?",
    correctChoice: "같은 길이 단위끼리 더해요.",
    evidenceLabel: "길이 카드",
    evidencePrompt: "두 길이와 더한 길이가 맞는지 살펴보세요."
  },
  "subtract-lengths-in-context": {
    question: "두 길이의 차이는 얼마나 될까요?",
    correctChoice: "두 길이의 시작점을 맞추고 남는 길이를 구해요.",
    evidenceLabel: "길이 카드",
    evidencePrompt: "긴 길이에서 짧은 길이를 뺀 값인지 살펴보세요."
  }
};

const BANNED_STUDENT_TERMS =
  /(R\d{2}|D\d{2}[A-Z]?|목표 윤곽|엔진|아키타입|검증|불변량|membership|피연산자|등분제|포함제|정례|반례|이동 벡터|원자료|집계|변인|확인할 생각|수학 자료|문제의 조건|…)/iu;

function targetConcept(targetKey: string, renderer: PortfolioRenderer): string {
  return /fraction/u.test(targetKey) ? "분수 띠" :
    /decimal/u.test(targetKey) ? "소수 카드" :
    /triangle/u.test(targetKey) ? "삼각형 그림" :
    /quadrilateral/u.test(targetKey) ? "사각형 그림" :
    /circle|circumference|radius|diameter|pi/u.test(targetKey) ? "원 그림" :
    /angle/u.test(targetKey) ? "각 그림" :
    /cube|cuboid|solid|prism|pyramid|cylinder|cone|sphere/u.test(targetKey) ? "입체도형 그림" :
    /area/u.test(targetKey) ? "넓이 그림" :
    /perimeter/u.test(targetKey) ? "둘레 그림" :
    /volume/u.test(targetKey) ? "부피 모형" :
    /length|meter|centimeter|millimeter|kilometer/u.test(targetKey) ? "길이와 자" :
    /capacity|liter|milliliter/u.test(targetKey) ? "들이 눈금" :
    /mass|kilogram|gram|tonne/u.test(targetKey) ? "저울과 무게" :
    /clock|time|minute|second|calendar/u.test(targetKey) ? "시계와 달력" :
    /table|graph|data|mean/u.test(targetKey) ? "표와 그래프" :
    /pattern|rule|arrangement/u.test(targetKey) ? "수와 모양의 규칙" :
    /add|subtract|calculation/u.test(targetKey) ? "계산식" :
    /multiply|multiplication/u.test(targetKey) ? "곱셈 그림" :
    /divide|division|quotient/u.test(targetKey) ? "나눗셈 그림" :
    /ratio|proportion/u.test(targetKey) ? "비와 비율" :
    /likelihood/u.test(targetKey) ? "가능성 그림" :
    /number|rounding|multiple/u.test(targetKey) ? "수 카드" :
    RENDERER_COPY[renderer].evidenceLabel;
}

function targetDistractors(
  targetKey: string,
  gradeBand: PortfolioRecord["gradeBand"]
): readonly [string, string, string] {
  if (/table|graph|data|mean/u.test(targetKey)) {
    return [
      "가장 큰 수 하나만 보고 답해요.",
      "표의 제목과 단위는 보지 않아요.",
      "전체 수가 달라도 그대로 답해요."
    ];
  }
  if (/fraction/u.test(targetKey)) {
    return [
      "전체 크기가 달라도 색칠한 칸 수만 봐요.",
      "분모가 크면 무조건 큰 분수라고 생각해요.",
      "분수 띠의 시작점을 맞추지 않고 비교해요."
    ];
  }
  if (/decimal/u.test(targetKey)) {
    return [
      "소수점을 맞추지 않고 숫자만 봐요.",
      "자릿값이 달라도 같은 자리라고 생각해요.",
      "답의 크기를 어림하지 않고 계산해요."
    ];
  }
  if (/pattern|rule|arrangement/u.test(targetKey)) {
    return [
      "처음 보이는 모양대로 아무렇게나 놓아요.",
      "되풀이되는 차례를 중간에 바꾸어요.",
      "빠지거나 다른 모양이 있어도 그대로 두어요."
    ];
  }
  if (/triangle|quadrilateral|circle|angle|line|ray|segment|polygon|shape|cube|cuboid|solid|prism|pyramid|cylinder|cone|sphere/u.test(targetKey)) {
    return [
      "눈에 띄는 한 부분만 보고 이름을 정해요.",
      "변과 꼭짓점의 수는 세지 않아요.",
      "돌리거나 뒤집으면 다른 모양이라고 생각해요."
    ];
  }
  if (/clock|time|minute|second|calendar/u.test(targetKey)) {
    return [
      "시침과 분침을 서로 바꾸어 읽어요.",
      "60분과 1시간은 다르다고 생각해요.",
      "얼마나 오래 걸리는지는 생각하지 않아요."
    ];
  }
  if (/length|meter|centimeter|millimeter|kilometer|capacity|liter|milliliter|mass|kilogram|gram|tonne|area|perimeter|volume/u.test(targetKey)) {
    return [
      "단위는 보지 않고 숫자만 비교해요.",
      "눈금의 시작점이 달라도 그대로 재요.",
      "재려는 크기와 맞지 않는 단위를 골라요."
    ];
  }
  if (/number|place|rounding|multiple|range|sequence/u.test(targetKey)) {
    return [
      "숫자가 놓인 자리는 보지 않고 읽어요.",
      "가장 낮은 자리부터 크기를 비교해요.",
      "앞뒤 수의 차이가 달라도 그대로 이어 써요."
    ];
  }
  if (/add|subtract|calculate|compute|solve|multiply|multiplication|product|divide|division|quotient/u.test(targetKey)) {
    return [
      "숫자의 자리를 맞추지 않고 왼쪽부터 계산해요.",
      "단위는 보지 않고 숫자만 계산해요.",
      "한 번 계산한 답은 다시 보지 않아요."
    ];
  }
  if (/compare|distinguish|classify|identify|select|choose|recognize|judge/u.test(targetKey)) {
    return [
      "눈에 띄는 한 곳만 보고 바로 골라요.",
      "서로 다른 곳은 보지 않고 같은 곳만 봐요.",
      "이름만 보고 모양이나 수는 보지 않아요."
    ];
  }
  if (/construct|draw|represent|compose|tile|model|set/u.test(targetKey)) {
    return [
      "처음 떠오른 모양대로 바로 만들어요.",
      "차례를 바꾸어도 괜찮다고 생각해요.",
      "빠진 곳이나 겹친 곳은 그대로 두어요."
    ];
  }
  if (/measure|estimate|convert|relate|connect|match/u.test(targetKey)) {
    return [
      "단위는 보지 않고 숫자만 비교해요.",
      "눈금의 시작점이 달라도 그대로 재요.",
      "바꾸기 전과 뒤의 양은 비교하지 않아요."
    ];
  }
  if (/explain|describe|justify|infer|reason|explore/u.test(targetKey)) {
    return [
      "답만 말하고 왜 그런지는 말하지 않아요.",
      "그림은 보지 않고 떠오른 말만 해요.",
      "한 곳만 보고 모두 그렇다고 생각해요."
    ];
  }
  if (/find|locate|count|read|interpret|order/u.test(targetKey)) {
    return [
      "눈에 띄는 한 곳만 보고 바로 답해요.",
      "처음과 끝만 보고 가운데는 건너뛰어요.",
      gradeBand === "1-2"
        ? "같은 것을 두 번 세어도 괜찮다고 생각해요."
        : "빠뜨린 곳이 있어도 그대로 답을 정해요."
    ];
  }
  return [
    "한 곳만 보고 모두 같다고 생각해요.",
    "차례나 단위가 달라도 그대로 답해요.",
    gradeBand === "1-2"
      ? "빠진 곳이 있어도 그대로 답을 정해요."
      : "다른 방법으로 답을 다시 살펴보지 않아요."
  ];
}

function makeStudentCopy(record: PortfolioRecord, target: TargetOutline): StudentCopy {
  const override = STUDENT_COPY_OVERRIDES[target.key];
  const registeredQuestion = studentQuestions[target.key];
  const registeredSupport = studentSupport[target.key];
  if (!registeredQuestion || !registeredSupport) {
    throw new Error(`portfolio-student-copy-missing:${record.familyId}:${target.key}`);
  }
  const studentCopy = {
    question: registeredQuestion,
    correctChoice: registeredSupport.correctChoice,
    evidenceLabel: override?.evidenceLabel ?? targetConcept(target.key, record.rendererKind),
    evidencePrompt: registeredSupport.evidencePrompt
  };
  const visibleCopy = [
    registeredQuestion,
    studentCopy.correctChoice,
    studentCopy.evidenceLabel,
    studentCopy.evidencePrompt
  ];
  if (visibleCopy.some((text) => BANNED_STUDENT_TERMS.test(text))) {
    throw new Error(`portfolio-student-copy-forbidden:${record.familyId}:${target.key}`);
  }
  return studentCopy;
}

function generateItems(record: PortfolioRecord, difficulty: Difficulty, seed: string): ResolvedItem[] {
  if (difficulty !== "normal") {
    throw new RangeError(`portfolio-difficulty-unsupported:${record.familyId}`);
  }
  const random = createSeededRandom(`${seed}:${record.familyId}`);
  return record.targetOutlines.map((target, index) => {
    const studentCopy = makeStudentCopy(record, target);
    const distractors = targetDistractors(target.key, record.gradeBand);
    const candidates = shuffle([
      studentCopy.correctChoice,
      ...distractors
    ], random);
    return {
      id: `${record.standardSlug}-${target.key}`,
      order: index + 1,
      kind: `portfolio-${record.rendererKind}-diagnostic`,
      values: {
        orderLabel: `${index + 1}번`,
        questionText: studentCopy.question,
        evidenceLabelText: studentCopy.evidenceLabel,
        evidenceText: studentCopy.evidencePrompt,
        correctValueText: studentCopy.correctChoice,
        correctAnswerText: studentCopy.correctChoice,
        answerExplanation: `${studentCopy.correctChoice} ${studentCopy.evidencePrompt}`,
        targetOutlineKey: target.key,
        misconceptionClass: target.misconceptionClass,
        nativeValue1: 1,
        nativeValue2: 3,
        nativeValue3: 5,
        nativeValue4: 7,
        placeValue1: 1,
        placeValue2: 10,
        placeValue3: 100,
        nativeFraction1: { numerator: 1, denominator: 2 },
        nativeFraction2: { numerator: 2, denominator: 3 },
        patternVariant1: 1,
        patternVariant2: 2,
        patternVariant3: 1,
        patternVariant4: 2,
        nativeTitle: record.gradeBand === "1-2"
          ? "좋아하는 과일 조사"
          : record.gradeBand === "3-4"
            ? "요일별 조사"
            : "모둠별 조사",
        nativeCategories: record.gradeBand === "1-2"
          ? ["사과", "바나나", "포도", "딸기", "수박", "귤"]
          : record.gradeBand === "3-4"
            ? ["월", "화", "수", "목", "금", "토"]
            : ["1모둠", "2모둠", "3모둠", "4모둠", "5모둠", "6모둠"],
        nativeDataValues: [2, 3, 1, 4, 2, 1],
        nativeCategoryAxis: record.gradeBand === "1-2" ? "과일" : "구분",
        nativeValueColumn: "개수",
        nativeGridValue: 1,
        nativeGridlineCount: 5,
        nativeValueAxis: "개수",
        nativeValueUnit: "개",
        geometryAngle1: 30,
        geometryAngle2: 90,
        geometryAngle3: 60,
        nativeHour: 3,
        nativeMinute: 30,
        ...Object.fromEntries(
          candidates.flatMap((candidate, candidateIndex) => [
            [`candidate${candidateIndex + 1}`, candidate],
            [`candidate${candidateIndex + 1}Latex`, candidate]
          ])
        ),
        difficulty
      },
      provenance: {
        generatorId: "portfolio.scale.target-outline-items",
        generatorVersion: "1.0.0",
        seed
      }
    };
  });
}

function makeModule(record: PortfolioRecord): ProblemFamilyNativeModule {
  const modelRoles = nativeRoles(record.rendererKind);
  const modelRoleNames = modelRoles.map((role) => role.role);
  const noOverlapModelRoleNames = modelRoleNames.filter(
    (role) => role !== "native-target"
  );
  const blueprint = defineActivityBlueprint({
    schemaVersion: "1.0.0",
    id: record.familyId,
    version: "1.0.0",
    title: `${record.domain} 문제를 그림과 자료로 풀기`,
    learningObjective: `${record.officialGoal} 내용을 학생 눈높이의 ${record.targetOutlines.length}개 문제로 연습한다.`,
    curriculumBinding: {
      standardCode: record.standardCode,
      domain: record.domain,
      officialGoal: record.officialGoal
    },
    generator: {
      id: "portfolio.scale.target-outline-items",
      version: "1.0.0",
      parameters: {
        problemCount: record.targetOutlines.length,
        difficulty: "normal",
        rendererKind: record.rendererKind,
        workItemId: record.workItemId
      }
    },
    toolRoles: [
      ...scaffold,
      {
        role: "array-panel",
        scope: "each-item",
        layoutRole: "array-panel",
        idRole: "array-panel",
        toolKey: "common.rectangle",
        intentKind: "draw-rectangle",
        locked: true,
        movable: false,
        instructionalIntent: "선택한 생각을 자료와 비교하는 확인 영역입니다.",
        properties: { fill: "#F5FBFF", stroke: "#4AA9D8" },
        bindings: {},
        containerRole: "work-panel"
      },
      {
        role: "group-label",
        scope: "each-item",
        layoutRole: "group-label",
        idRole: "group-label",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "사용한 엔진 계열과 자료 유형을 알려 줍니다.",
        properties: { text: "", fontSize: 22 },
        bindings: { text: "item.evidenceLabelText" },
        containerRole: "array-panel"
      },
      {
        role: "array-text",
        scope: "each-item",
        layoutRole: "array-text",
        idRole: "array-text",
        toolKey: "common.text",
        intentKind: "text",
        locked: true,
        movable: false,
        instructionalIntent: "화면에서 확인할 수 있는 관찰 증거를 제시합니다.",
        properties: { text: "", fontSize: 20 },
        bindings: { text: "item.evidenceText" },
        containerRole: "array-panel"
      },
      ...modelRoles
    ],
    layout: {
      tokenSet: "portfolio-scale-v1",
      root: {
        id: "canvas",
        kind: "canvas",
        preset: "canvas.root",
        repeat: "once",
        children: [
          ...makeChoiceExplanationScaffoldLayoutChildren(4),
          layoutBlock("array-panel", "slot", "item.array-panel", "each-item"),
          layoutBlock("group-label", "slot", "item.group-label", "each-item"),
          layoutBlock(
            "array-text",
            "slot",
            record.rendererKind === "table-graph"
              ? "item.array-text-table"
              : "item.array-text",
            "each-item"
          ),
          ...nativeLayout(record.rendererKind)
        ]
      }
    },
    constraints: [
      {
        id: "select-portfolio-claim",
        kind: "select-one-of",
        sources: CANDIDATE_ROLES.map((role) => ({ scope: "each-item", role })),
        target: { scope: "each-item", role: "prediction-box" },
        parameters: {},
        requiresStudentAction: true
      },
      ...(record.rendererKind === "number-card"
        ? [{
            id: "move-number-cards-to-evidence-target",
            kind: "fill-from-pool",
            sources: [1, 2, 3, 4].map((index) => ({
              scope: "each-item" as const,
              role: `native-model-${index}`
            })),
            target: { scope: "each-item" as const, role: "native-target" },
            parameters: {},
            requiresStudentAction: true
          }]
        : record.rendererKind === "fraction"
          ? [{
              id: "move-fraction-strips-to-evidence-target",
              kind: "fill-from-pool",
              sources: [1, 2].map((index) => ({
                scope: "each-item" as const,
                role: `native-model-${index}`
              })),
              target: { scope: "each-item" as const, role: "native-target" },
              parameters: {},
              requiresStudentAction: true
            }]
          : [])
    ],
    valuePredicates: [
      {
        kind: "cognitive.release-contract",
        parameters: {
          mode: "select-one",
          decisionConstraintId: "select-portfolio-claim",
          candidateRoles: CANDIDATE_ROLES,
          candidateProperty: "text",
          correctValuePath: "correctValueText",
          predictionRole: "prediction-box",
          explanationRole: "explanation-box",
          verificationRoles: ["array-panel", "group-label", "array-text", ...modelRoleNames]
        }
      },
      {
        kind: "language.classroom-korean",
        parameters: {
          instructionRoles: ["instruction-predict", "instruction-verify", "instruction-explain"],
          labelRoles: ["prediction-label", "pool-label", "explanation-label", "group-label"],
          promptRoles: ["question"],
          maximumInstructionLength: 74,
          maximumLabelLength: 42
        }
      },
      {
        kind: "visual.text-fit",
        parameters: {
          roles: [
            "instruction-predict", "instruction-verify", "instruction-explain", "question",
            "prediction-label", "pool-label", "explanation-label", "group-label", "array-text",
            ...CANDIDATE_ROLES
          ],
          maximumFillRatio: 0.98
        }
      },
      {
        kind: "visual.labeled-pool-row",
        parameters: {
          labelRole: "pool-label",
          memberRoles: CANDIDATE_ROLES,
          containerRole: "choice-panel",
          rowCenterTolerance: 2,
          gapTolerance: 2,
          groupCenterTolerance: 12,
          labelAlignmentTolerance: 2,
          minimumLabelGap: 12,
          maximumLabelGap: 30
        }
      },
      {
        kind: "visual.no-overlap",
        parameters: {
          roles: [
            "number", "question", "prediction-label", "prediction-box", "pool-label",
            ...CANDIDATE_ROLES, "group-label", "array-text", ...noOverlapModelRoleNames,
            "explanation-label", "explanation-box"
          ]
        }
      }
    ],
    instructions: [...INSTRUCTIONS],
    payload: {
      categoryId: MATHCANVAS_PROJECT_CATEGORIES[record.domain].categoryId,
      tags: [record.standardCode, "97시연", record.rendererKind.slice(0, 12)],
      studyLevel: "elementary",
      isShowMenuOnActivity: true
    },
    variationDefaults: {
      problemCount: record.targetOutlines.length,
      difficulty: "normal"
    }
  });

  const source: ProblemFamilyRegistrySource = {
    registrationKind: "portfolio-scale-adapter",
    familyId: record.familyId,
    templateId: record.familyId,
    activityId: record.familyId,
    standardCode: record.standardCode,
    supportedStandardCodes: [record.standardCode],
    gradeBand: record.gradeBand,
    domain: record.domain,
    learningGoal: blueprint.learningObjective,
    assessmentTargetIds: [],
    portfolioTargetOutlineKeys: record.targetOutlines.map((target) => target.key),
    engineClassIds: record.engineClassIds,
    manipulation: record.manipulation,
    generator: { id: blueprint.generator.id, version: blueprint.generator.version },
    blueprint: {
      contentHash: blueprint.contentHash,
      version: blueprint.version,
      layoutTokenSet: blueprint.layout.tokenSet
    },
    availableProblemCounts: [record.targetOutlines.length],
    supportedDifficulties: ["normal"],
    supportState: "verified",
    evidencePaths: ["reports/portfolio-scale/latest.json"]
  };

  const cognitiveManifest = defineCognitiveDemandManifest({
    schemaVersion: "1.0.0",
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    blueprintContentHash: blueprint.contentHash,
    mathematicalDecision: `학생은 ${record.targetOutlines.length}개 목표 윤곽마다 자료를 보기 전에 생각을 고르고 ${record.rendererKind} 자료와 비교한다.`,
    misconceptionConflict: "눈에 보이는 수 하나, 결과만 같음, 단위·순서 생략, 자료 미확인 생각을 목표별 관찰 증거와 충돌시킨다.",
    learningMap: {
      repository: "DECK6/korean-elementary-learning-map",
      commit: data.source.learningMapCommit,
      usageSnapshotSha256: data.source.learningMapUsageSha256,
      standardCode: record.standardCode,
      topicIds: [record.learningMap.topicId],
      prerequisiteTopicIds: [...record.learningMap.prerequisiteTopicIds],
      observableEvidence: [...record.learningMap.observableEvidence],
      assessmentPrompt: record.learningMap.assessmentPrompt,
      caveat: `97개 확장 진단 경로는 학습지도와 공식 교육과정 ${record.standardCode}을 연결하지만 정식 숙달 판정을 대신하지 않는다.`
    },
    decision: {
      mode: "select-one",
      constraintId: "select-portfolio-claim",
      candidateRoles: CANDIDATE_ROLES,
      candidateProperty: "text",
      correctValuePath: "correctValueText",
      distractors: [
        {
          predicateKind: "cognitive.release-contract",
          misconception: "자료의 관계·단위·전체 조건 중 일부만 보고도 판단이 맞다고 여긴다."
        }
      ]
    },
    prediction: { regionRole: "prediction-box" },
    verification: {
      kind: record.domain === "자료와 가능성"
        ? "data-representation"
        : record.domain === "도형과 측정"
          ? "coordinate-or-graph"
          : "countable-unit-model",
      roles: ["array-panel", "group-label", "array-text", ...modelRoleNames],
      invariant: "목표에 적힌 관계와 단위·순서·전체 조건을 화면 자료에서 모두 확인한 판단만 유지한다."
    },
    explanation: { regionRole: "explanation-box" },
    revisionPath: "네 생각 카드는 계속 움직일 수 있고 native 자료도 엔진 종류에 따라 움직이거나 비교할 수 있어 자료와 맞지 않으면 선택을 바꿀 수 있다.",
    limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
  });

  const variationEnvelope = defineVariationEnvelope({
    schemaVersion: "1.0.0",
    blueprintId: record.familyId,
    knobs: [],
    pinned: { problemCount: record.targetOutlines.length, difficulty: "normal" },
    expectedCombinationCount: 1
  });

  const prepare = (recommendation: Recommendation, options: GenerateActivitySpecOptions) => {
    if (
      recommendation.templateId !== record.familyId ||
      recommendation.standardCode !== record.standardCode ||
      recommendation.learningGoal !== blueprint.learningObjective ||
      recommendation.manipulation !== record.manipulation ||
      recommendation.problemCount !== record.targetOutlines.length ||
      recommendation.difficulty !== "normal" ||
      Number.isNaN(Date.parse(options.generatedAt))
    ) {
      throw new Error(`activity-recommendation-mismatch:${record.familyId}`);
    }
    return {
      blueprint,
      items: generateItems(record, "normal", options.seed),
      recommendation,
      options: {
        seed: options.seed,
        generatedAt: new Date(options.generatedAt).toISOString(),
        activityId: options.activityId ?? `${record.familyId}-${options.seed}`,
        templateVersion: blueprint.version,
        variation: { problemCount: record.targetOutlines.length, difficulty: "normal" }
      }
    };
  };

  const answerKey = (resolved: ResolvedActivity): RegisteredTeacherAnswer[] =>
    resolved.items.map((item) => ({
      problemNumber: item.order,
      answer: String(item.values.correctAnswerText),
      explanation: String(item.values.answerExplanation)
    }));

  const problemPreviews = (resolved: ResolvedActivity): RegisteredProblemPreview[] =>
    resolved.items.map((item) => ({
      problemNumber: item.order,
      statements: [
        String(item.values.questionText),
        String(item.values.evidenceLabelText),
        String(item.values.evidenceText)
      ]
    }));

  return {
    source,
    runtime: {
      familyId: record.familyId,
      blueprint,
      prepare,
      supportState: "verified",
      creationMode: "portfolio-pilot",
      generateItemsForVariation: (variation, seed) => {
        if (
          variation.problemCount !== record.targetOutlines.length ||
          variation.difficulty !== "normal"
        ) {
          throw new Error(`portfolio-variation-invalid:${record.familyId}`);
        }
        return generateItems(record, "normal", seed);
      },
      answerKey,
      problemPreviews
    },
    cognitiveManifest,
    variationEnvelope
  };
}

export const PORTFOLIO_SCALE_PROBLEM_FAMILY_MODULES:
  readonly ProblemFamilyNativeModule[] = data.records.map(makeModule);

export const PORTFOLIO_SCALE_COUNTS = Object.freeze({
  standards: data.standardCount,
  targetOutlines: data.targetOutlineCount,
  renderers: new Set(data.records.map((record) => record.rendererKind)).size
});
