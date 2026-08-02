import {
  ACTIVITY_IDS,
  type GenerationRequest
} from "@mathcanvas/contracts";

export interface FactorPairItemSeed {
  readonly context: string;
  readonly target: number;
  readonly candidates: readonly [number, number, number, number, number, number, number, number];
  readonly solutions: readonly (readonly [number, number])[];
  readonly surplus: readonly number[];
}

export interface FactorPairActivityProfile {
  readonly profileId: "factor-pair-array";
  readonly activityId: typeof ACTIVITY_IDS.factorPairArray;
  readonly standardCode: "[6수01-04]";
  readonly gradeBand: "5-6";
  readonly recommendedGrade: 5;
  readonly domain: "수와 연산";
  readonly title: string;
  readonly learningObjective: string;
  readonly officialGoal: string;
  readonly activityLabel: string;
  readonly activityDescription: string;
  readonly promptSeed: string;
  readonly misconceptionConflict: string;
  readonly verificationInvariant: string;
  readonly learningMapTopicId: string;
  readonly learningMapPrerequisiteTopicId: string;
  readonly learningNeeds: readonly {
    id: string;
    label: string;
    description: string;
    promptDetail: string;
  }[];
  readonly items: readonly FactorPairItemSeed[];
}

export const FACTOR_PAIR_MANIPULATION: NonNullable<
  GenerationRequest["manipulation"]
> = "factor-pair-array-construction-drag";

export const factorPairActivityProfile: FactorPairActivityProfile = {
  profileId: "factor-pair-array",
  activityId: ACTIVITY_IDS.factorPairArray,
  standardCode: "[6수01-04]",
  gradeBand: "5-6",
  recommendedGrade: 5,
  domain: "수와 연산",
  title: "서로 다른 직사각형 배열로 약수쌍 찾기",
  learningObjective:
    "자연수를 두 수의 곱으로 여러 방법으로 나타내고, 각 수가 약수인 까닭을 배열로 설명할 수 있다.",
  officialGoal: "약수, 공약수, 최대공약수를 이해하고 구할 수 있다.",
  activityLabel: "직사각형 배열로 약수 찾기",
  activityDescription:
    "여러 수 카드에서 약수쌍을 골라 곱셈식을 만들고, 빈 격자에 직사각형 배열로 확인해요.",
  promptSeed:
    "여러 수 카드에서 곱이 목표 수가 되는 약수쌍을 두 가지 이상 찾고 배열로 설명하는 활동",
  misconceptionConflict:
    "목표 수보다 작은 수는 모두 약수라는 생각과 한 번 나누어떨어지는지만 확인하는 생각을, 남김없는 직사각형 배열과 여러 약수쌍에 충돌시킨다.",
  verificationInvariant:
    "가로 수와 세로 수를 곱한 칸 수가 목표 수와 같고 빈칸이나 남는 칸이 없어야 두 수가 한 약수쌍이다.",
  learningMapTopicId:
    "kr.mt.math.number-operations.g5-6.s6-01-04.representation",
  learningMapPrerequisiteTopicId:
    "kr.mt.math.number-operations.g5-6.s6-01-04.concept",
  learningNeeds: [
    {
      id: "smaller-is-factor",
      label: "작은 수는 모두 약수라고 생각해요",
      description:
        "어떤 수보다 작기만 하면 그 수의 약수라고 판단해요.",
      promptDetail:
        "고른 두 수로 직사각형을 만들 때 칸이 남거나 부족한지 확인하게 한다."
    },
    {
      id: "single-factor-pair",
      label: "약수쌍을 한 가지만 찾고 멈춰요",
      description:
        "한 곱셈식을 찾은 뒤 다른 방법을 체계적으로 찾지 못해요.",
      promptDetail:
        "가로와 세로를 바꾸는 것과 다른 약수쌍을 찾는 것을 구분하여 두 배열을 비교하게 한다."
    },
    {
      id: "factor-product-link",
      label: "약수와 곱셈식을 연결하기 어려워요",
      description:
        "나누어떨어지는 수는 찾지만 두 약수가 곱셈식에서 짝을 이룬다는 점을 설명하지 못해요.",
      promptDetail:
        "배열의 가로·세로와 곱셈식의 두 수를 짝지어 설명하게 한다."
    }
  ],
  items: [
    {
      context: "정사각형 타일 12개를 남김없이 직사각형으로 놓으려 합니다.",
      target: 12,
      candidates: [1, 2, 3, 4, 5, 6, 7, 8],
      solutions: [[2, 6], [3, 4]],
      surplus: [1, 5, 7, 8]
    },
    {
      context: "정사각형 타일 24개를 남김없이 직사각형으로 놓으려 합니다.",
      target: 24,
      candidates: [2, 3, 4, 5, 6, 7, 8, 9],
      solutions: [[3, 8], [4, 6]],
      surplus: [2, 5, 7, 9]
    }
  ]
};
