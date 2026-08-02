import {
  ACTIVITY_IDS,
  type GenerationRequest
} from "@mathcanvas/contracts";

export interface PartialOperationCardSeed {
  readonly text: string;
  readonly value: number;
  readonly partOperand: number;
  readonly operationKind: "multiply" | "divide" | "misconception";
  readonly misconception?: string;
}

export interface PartialOperationItemSeed {
  readonly context: string;
  readonly wholeOperand: number;
  readonly fixedOperand: number;
  readonly targetResult: number;
  readonly cards: readonly [
    PartialOperationCardSeed,
    PartialOperationCardSeed,
    PartialOperationCardSeed,
    PartialOperationCardSeed,
    PartialOperationCardSeed,
    PartialOperationCardSeed,
    PartialOperationCardSeed,
    PartialOperationCardSeed
  ];
  readonly solutions: readonly (readonly [number, number])[];
  readonly surplus: readonly number[];
}

export interface PartialOperationActivityProfile {
  readonly profileId: "partial-product" | "partial-quotient";
  readonly activityId:
    | typeof ACTIVITY_IDS.partialProductDecomposition
    | typeof ACTIVITY_IDS.partialQuotientDecomposition;
  readonly operationKind: "multiply" | "divide";
  readonly standardCode: "[4수01-04]" | "[4수01-06]";
  readonly gradeBand: "3-4";
  readonly recommendedGrade: 3 | 4;
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
  readonly modelLabel: string;
  readonly modelInstruction: string;
  readonly explanationLabel: string;
  readonly learningNeeds: readonly {
    id: string;
    label: string;
    description: string;
    promptDetail: string;
  }[];
  readonly items: readonly PartialOperationItemSeed[];
}

export const PARTIAL_OPERATION_MANIPULATION: NonNullable<
  GenerationRequest["manipulation"]
> = "partial-operation-expression-construction-drag";

const multiplicationItems: readonly PartialOperationItemSeed[] = [
  {
    context: "21개씩 4줄로 놓은 타일은 모두 몇 개인가요?",
    wholeOperand: 21,
    fixedOperand: 4,
    targetResult: 84,
    cards: [
      { text: "20\\times4", value: 80, partOperand: 20, operationKind: "multiply" },
      { text: "1\\times4", value: 4, partOperand: 1, operationKind: "multiply" },
      { text: "10\\times4", value: 40, partOperand: 10, operationKind: "multiply" },
      { text: "11\\times4", value: 44, partOperand: 11, operationKind: "multiply" },
      { text: "20+4", value: 24, partOperand: 20, operationKind: "misconception", misconception: "곱해야 할 두 수를 더한다." },
      { text: "21+4", value: 25, partOperand: 21, operationKind: "misconception", misconception: "전체 곱셈을 덧셈 한 번으로 바꾼다." },
      { text: "2\\times4", value: 8, partOperand: 2, operationKind: "misconception", misconception: "십의 자리 숫자 2를 20으로 보지 않는다." },
      { text: "4\\times4", value: 16, partOperand: 4, operationKind: "misconception", misconception: "두 수의 자릿값과 묶음 수를 혼동한다." }
    ],
    solutions: [[80, 4], [40, 44]],
    surplus: [24, 25, 8, 16]
  },
  {
    context: "32개씩 3줄로 놓은 타일은 모두 몇 개인가요?",
    wholeOperand: 32,
    fixedOperand: 3,
    targetResult: 96,
    cards: [
      { text: "30\\times3", value: 90, partOperand: 30, operationKind: "multiply" },
      { text: "2\\times3", value: 6, partOperand: 2, operationKind: "multiply" },
      { text: "20\\times3", value: 60, partOperand: 20, operationKind: "multiply" },
      { text: "12\\times3", value: 36, partOperand: 12, operationKind: "multiply" },
      { text: "30+3", value: 33, partOperand: 30, operationKind: "misconception", misconception: "곱셈을 두 수의 덧셈으로 계산한다." },
      { text: "32+3", value: 35, partOperand: 32, operationKind: "misconception", misconception: "전체 곱셈을 덧셈 한 번으로 바꾼다." },
      { text: "4\\times3", value: 12, partOperand: 4, operationKind: "misconception", misconception: "32를 자릿값에 맞게 나누지 않는다." },
      { text: "6\\times3", value: 18, partOperand: 6, operationKind: "misconception", misconception: "부분의 합이 32인지 확인하지 않는다." }
    ],
    solutions: [[90, 6], [60, 36]],
    surplus: [33, 35, 12, 18]
  }
];

const divisionItems: readonly PartialOperationItemSeed[] = [
  {
    context: "타일 84개를 4명에게 똑같이 나누면 한 명이 몇 개씩 받나요?",
    wholeOperand: 84,
    fixedOperand: 4,
    targetResult: 21,
    cards: [
      { text: "80\\div4", value: 20, partOperand: 80, operationKind: "divide" },
      { text: "4\\div4", value: 1, partOperand: 4, operationKind: "divide" },
      { text: "40\\div4", value: 10, partOperand: 40, operationKind: "divide" },
      { text: "44\\div4", value: 11, partOperand: 44, operationKind: "divide" },
      { text: "20+4", value: 24, partOperand: 20, operationKind: "misconception", misconception: "몫과 나누는 수를 더한다." },
      { text: "21+4", value: 25, partOperand: 21, operationKind: "misconception", misconception: "구한 몫에 나누는 수를 더한다." },
      { text: "8\\div4", value: 2, partOperand: 8, operationKind: "misconception", misconception: "나눈 두 부분의 합이 84인지 확인하지 않는다." },
      { text: "16\\div4", value: 4, partOperand: 16, operationKind: "misconception", misconception: "전체 84 중 일부만 나눈다." }
    ],
    solutions: [[20, 1], [10, 11]],
    surplus: [24, 25, 2, 4]
  },
  {
    context: "타일 96개를 3명에게 똑같이 나누면 한 명이 몇 개씩 받나요?",
    wholeOperand: 96,
    fixedOperand: 3,
    targetResult: 32,
    cards: [
      { text: "90\\div3", value: 30, partOperand: 90, operationKind: "divide" },
      { text: "6\\div3", value: 2, partOperand: 6, operationKind: "divide" },
      { text: "60\\div3", value: 20, partOperand: 60, operationKind: "divide" },
      { text: "36\\div3", value: 12, partOperand: 36, operationKind: "divide" },
      { text: "30+3", value: 33, partOperand: 30, operationKind: "misconception", misconception: "몫과 나누는 수를 더한다." },
      { text: "32+3", value: 35, partOperand: 32, operationKind: "misconception", misconception: "구한 몫에 나누는 수를 더한다." },
      { text: "12\\div3", value: 4, partOperand: 12, operationKind: "misconception", misconception: "나눈 두 부분의 합이 96인지 확인하지 않는다." },
      { text: "18\\div3", value: 6, partOperand: 18, operationKind: "misconception", misconception: "전체 96 중 일부만 나눈다." }
    ],
    solutions: [[30, 2], [20, 12]],
    surplus: [33, 35, 4, 6]
  }
];

export const partialOperationActivityProfiles: readonly PartialOperationActivityProfile[] = [
  {
    profileId: "partial-product",
    activityId: ACTIVITY_IDS.partialProductDecomposition,
    operationKind: "multiply",
    standardCode: "[4수01-04]",
    gradeBand: "3-4",
    recommendedGrade: 3,
    domain: "수와 연산",
    title: "곱하는 수를 나누어 부분곱 만들기",
    learningObjective: "두 자리 수를 여러 방법으로 나누어 곱하고, 부분곱의 합이 같은 까닭을 배열 모형으로 설명할 수 있다.",
    officialGoal: "곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
    activityLabel: "부분곱으로 곱셈 설명하기",
    activityDescription: "여러 식 카드에서 두 장을 골라 부분곱의 합을 만들고, 배열을 나누어 같은 곱인지 확인해요.",
    promptSeed: "두 자리 수와 한 자리 수의 곱을 서로 다른 두 부분곱의 합으로 만들고 배열 모형으로 설명하는 활동",
    misconceptionConflict: "각 자리 숫자만 곱하거나 곱해야 할 두 수를 더하는 생각을, 전체 배열의 줄 수와 칸 수가 보존되는 두 분할 방법에 충돌시킨다.",
    verificationInvariant: "배열을 세로로 어디에서 나누더라도 두 부분의 칸 수를 더하면 원래 전체 곱과 같아야 한다.",
    learningMapTopicId: "kr.mt.math.number-operations.g3-4.s4-01-04.representation",
    learningMapPrerequisiteTopicId: "kr.mt.math.number-operations.g3-4.s4-01-04.concept",
    modelLabel: "배열을 두 부분으로 나누어 보기",
    modelInstruction: "빈 배열을 어떻게 나누면 카드 두 장의 부분곱이 되나요?",
    explanationLabel: "두 방법의 답이 같은 까닭",
    learningNeeds: [
      { id: "digit-without-place", label: "자리 숫자만 곱해요", description: "십의 자리 2를 20이 아니라 2로 계산해요.", promptDetail: "배열의 열 수를 십과 일 또는 다른 두 수로 나누고 전체 열 수가 유지되는지 확인하게 한다." },
      { id: "add-instead-of-multiply", label: "두 수를 더해요", description: "곱셈 상황에서도 주어진 두 수를 한 번 더해요.", promptDetail: "같은 수씩 몇 줄인지 배열에 표시하고 각 부분의 칸 수를 세게 한다." }
    ],
    items: multiplicationItems
  },
  {
    profileId: "partial-quotient",
    activityId: ACTIVITY_IDS.partialQuotientDecomposition,
    operationKind: "divide",
    standardCode: "[4수01-06]",
    gradeBand: "3-4",
    recommendedGrade: 3,
    domain: "수와 연산",
    title: "나누어지는 수를 나누어 부분몫 만들기",
    learningObjective: "나누어지는 수를 여러 방법으로 나누고, 각 부분을 똑같이 나눈 몫의 합이 전체 몫과 같은 까닭을 설명할 수 있다.",
    officialGoal: "나누는 수가 한 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있으며, 나눗셈에서 몫과 나머지의 의미를 안다.",
    activityLabel: "부분몫으로 나눗셈 설명하기",
    activityDescription: "여러 식 카드에서 두 장을 골라 부분몫의 합을 만들고, 전체를 똑같이 나누어 확인해요.",
    promptSeed: "두 자리 수를 같은 수로 나누는 상황을 서로 다른 두 부분몫의 합으로 만들고 묶음 모형으로 설명하는 활동",
    misconceptionConflict: "전체 중 일부만 나누거나 몫에 나누는 수를 더하는 생각을, 두 부분의 전체 수와 한 사람 몫이 함께 보존되는 나눔에 충돌시킨다.",
    verificationInvariant: "나누어지는 두 부분의 합은 원래 전체와 같고, 각 부분을 같은 사람 수로 나눈 몫의 합은 한 사람의 전체 몫과 같아야 한다.",
    learningMapTopicId: "kr.mt.math.number-operations.g3-4.s4-01-06.representation",
    learningMapPrerequisiteTopicId: "kr.mt.math.number-operations.g3-4.s4-01-06.concept",
    modelLabel: "전체를 두 부분으로 나누어 보기",
    modelInstruction: "전체를 어떻게 두 부분으로 나누면 두 부분몫을 만들 수 있나요?",
    explanationLabel: "두 방법의 몫이 같은 까닭",
    learningNeeds: [
      { id: "divide-only-part", label: "전체 중 일부만 나눠요", description: "계산하기 쉬운 일부만 나눈 뒤 나머지 부분을 빠뜨려요.", promptDetail: "두 부분을 더한 수가 원래 전체인지 먼저 표시하게 한다." },
      { id: "quotient-divisor-confusion", label: "몫과 나누는 수를 섞어요", description: "구한 몫에 나누는 수를 더하거나 곱해요.", promptDetail: "각 부분을 같은 사람 수로 나누고 한 사람 몫끼리 더하게 한다." }
    ],
    items: divisionItems
  }
];

export function findPartialOperationActivityProfile(
  standardCode: string
): PartialOperationActivityProfile | undefined {
  return partialOperationActivityProfiles.find(
    (profile) => profile.standardCode === standardCode
  );
}
