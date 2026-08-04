import {
  ACTIVITY_IDS,
  type GenerationRequest
} from "@mathcanvas/contracts";

export interface ClaimEvidenceItemSeed {
  readonly questionText: string;
  readonly evidenceLabelText: string;
  readonly evidenceText: string;
  readonly correctValueText: string;
  readonly candidates:
    | readonly [string, string, string, string]
    | readonly [string, string, string, string, string];
  readonly answerExplanation: string;
}

export interface ClaimEvidenceActivityProfile {
  readonly profileId: string;
  readonly activityId: (typeof ACTIVITY_IDS)[keyof typeof ACTIVITY_IDS];
  readonly standardCode: string;
  readonly gradeBand: "3-4" | "5-6";
  readonly recommendedGrade: 3 | 4 | 5 | 6;
  readonly domain:
    | "수와 연산"
    | "변화와 관계"
    | "도형과 측정"
    | "자료와 가능성";
  readonly title: string;
  readonly learningObjective: string;
  readonly officialGoal: string;
  readonly activityLabel: string;
  readonly activityDescription: string;
  readonly promptSeed: string;
  readonly predictionLabel: string;
  readonly evidenceHeading: string;
  readonly explanationLabel: string;
  readonly misconceptionConflict: string;
  readonly verificationInvariant: string;
  readonly learningMapTopicId: string;
  readonly learningMapModule: string;
  readonly learningNeeds: readonly {
    id: string;
    label: string;
    description: string;
    promptDetail: string;
  }[];
  readonly presentation?: {
    readonly problemCount: 1 | 2;
    readonly candidateCount: 4 | 5;
    readonly layoutTokenSet: string;
    readonly poolLabel: string;
    readonly candidateRenderer: "text" | "formula";
    readonly candidateAlignment: "start" | "center";
    readonly fontSizes: {
      readonly instruction: number;
      readonly question: number;
      readonly label: number;
      readonly candidate: number;
      readonly evidenceLabel: number;
      readonly evidenceText: number;
    };
    readonly instructions: readonly [string, string, string];
  };
  readonly items: readonly ClaimEvidenceItemSeed[];
}

export const CLAIM_EVIDENCE_MANIPULATION: NonNullable<
  GenerationRequest["manipulation"]
> = "claim-evidence-revision-drag";

export const claimEvidenceActivityProfiles: readonly ClaimEvidenceActivityProfile[] = [
  {
    profileId: "division-remainder",
    activityId: ACTIVITY_IDS.divisionRemainderClaim,
    standardCode: "[4수01-06]",
    gradeBand: "3-4",
    recommendedGrade: 3,
    domain: "수와 연산",
    title: "묶어 보고 몫과 나머지 설명하기",
    learningObjective:
      "나눗셈 상황에서 몫과 나머지가 뜻하는 양을 묶음으로 확인하고 설명할 수 있다.",
    officialGoal:
      "나누는 수가 한 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있으며, 나눗셈에서 몫과 나머지의 의미를 안다.",
    activityLabel: "몫과 나머지의 뜻",
    activityDescription:
      "답만 계산하지 않고 실제 묶음에서 몫과 나머지가 무엇을 뜻하는지 확인해요.",
    promptSeed: "나눗셈에서 몫과 나머지의 의미를 묶음으로 확인하는 활동",
    predictionLabel: "처음 판단",
    evidenceHeading: "묶음으로 확인하기",
    explanationLabel: "몫과 나머지의 뜻 쓰기",
    misconceptionConflict:
      "나누는 수와 몫을 바꾸거나 남은 수를 몫에 포함하는 생각을 실제 묶음과 충돌시킨다.",
    verificationInvariant:
      "전체 수는 (한 묶음의 수 × 묶음 수) + 남은 수와 같고, 남은 수는 한 묶음의 수보다 작아야 한다.",
    learningMapTopicId:
      "kr.mt.math.number-operations.g3-4.s4-01-06.representation",
    learningMapModule: "세 자리 수 범위의 나눗셈",
    learningNeeds: [
      {
        id: "quotient-remainder-meaning",
        label: "몫과 나머지가 무엇을 뜻하는지 헷갈려요",
        description: "계산은 하지만 상황에서 몫과 나머지가 가리키는 양을 설명하지 못해요.",
        promptDetail: "묶음 수와 남은 수를 각각 말로 설명하게 한다."
      },
      {
        id: "remainder-size",
        label: "나머지가 나누는 수보다 커도 된다고 생각해요",
        description: "더 만들 수 있는 묶음이 남았는데도 계산을 끝내요.",
        promptDetail: "남은 것으로 한 묶음을 더 만들 수 있는지 확인하게 한다."
      }
    ],
    items: [
      {
        questionText: "연필 23자루를 4자루씩 묶으면 몇 묶음이고 몇 자루가 남을까요?",
        evidenceLabelText: "4자루씩 묶기",
        evidenceText: "4개짜리 5묶음 + 3개\n23 = 4 × 5 + 3",
        correctValueText: "5묶음, 3자루 남음",
        candidates: ["5묶음, 3자루 남음", "4묶음, 3자루 남음", "5묶음, 4자루 남음", "6묶음, 1자루 남음", "3묶음, 5자루 남음"],
        answerExplanation: "4자루씩 5묶음은 20자루이고 3자루가 남습니다."
      },
      {
        questionText: "구슬 31개를 6개씩 봉지에 담으면 몇 봉지이고 몇 개가 남을까요?",
        evidenceLabelText: "6개씩 묶기",
        evidenceText: "6개짜리 5묶음 + 1개\n31 = 6 × 5 + 1",
        correctValueText: "5봉지, 1개 남음",
        candidates: ["5봉지, 1개 남음", "6봉지, 1개 남음", "5봉지, 5개 남음", "4봉지, 7개 남음", "1봉지, 5개 남음"],
        answerExplanation: "6개씩 5봉지는 30개이고 1개가 남습니다."
      },
      {
        questionText: "색종이 29장을 7장씩 나누면 몇 묶음이고 몇 장이 남을까요?",
        evidenceLabelText: "7장씩 묶기",
        evidenceText: "7개짜리 4묶음 + 1개\n29 = 7 × 4 + 1",
        correctValueText: "4묶음, 1장 남음",
        candidates: ["4묶음, 1장 남음", "3묶음, 8장 남음", "4묶음, 7장 남음", "5묶음, 1장 남음", "1묶음, 4장 남음"],
        answerExplanation: "7장씩 4묶음은 28장이고 1장이 남습니다."
      }
    ]
  },
  {
    profileId: "angle-turn",
    activityId: ACTIVITY_IDS.angleMeasureClaim,
    standardCode: "[4수03-24]",
    gradeBand: "3-4",
    recommendedGrade: 4,
    domain: "도형과 측정",
    title: "회전한 양으로 각의 크기 판단하기",
    learningObjective:
      "각의 크기를 변의 길이가 아니라 한 변이 회전한 양으로 판단하고 설명할 수 있다.",
    officialGoal: "각의 크기의 단위인 1도(°)를 알고, 각도기를 이용하여 각의 크기를 측정하고 어림할 수 있다.",
    activityLabel: "각의 크기",
    activityDescription:
      "변이 길어 보이는 정도가 아니라 두 방향 사이의 회전량으로 각도를 판단해요.",
    promptSeed: "각의 크기를 변의 길이가 아닌 회전량으로 판단하는 활동",
    predictionLabel: "처음 판단",
    evidenceHeading: "같은 간격으로 확인하기",
    explanationLabel: "각의 기준 쓰기",
    misconceptionConflict:
      "변이 길거나 끝점 사이가 멀면 각이 더 크다는 생각을 같은 중심과 같은 회전 간격으로 충돌시킨다.",
    verificationInvariant:
      "각의 크기는 두 변 사이에서 회전한 양이며 변의 길이를 늘이거나 줄여도 변하지 않는다.",
    learningMapTopicId:
      "kr.mt.math.geometry-measurement.g3-4.s4-03-24.representation",
    learningMapModule: "각도",
    learningNeeds: [
      {
        id: "arm-length",
        label: "변이 길면 각도 더 크다고 생각해요",
        description: "각의 크기와 변의 길이를 구분하기 어려워요.",
        promptDetail: "변의 길이를 바꾸어도 방향 사이의 회전량은 같음을 확인하게 한다."
      },
      {
        id: "interval-count",
        label: "각도기 숫자만 보고 눈금 간격을 놓쳐요",
        description: "시작 방향과 몇 칸 회전했는지를 함께 보지 못해요.",
        promptDetail: "같은 크기의 회전 간격이 몇 번 들어가는지 세게 한다."
      }
    ],
    items: [
      {
        questionText: "한 변이 3시 방향이고 다른 변이 5시 방향일 때 작은 각은 몇 도일까요?",
        evidenceLabelText: "시계 한 칸은 30°",
        evidenceText: "시계 한 칸 = 30°\n3시에서 5시까지 작은 쪽의 칸 수를 세어 보세요.",
        correctValueText: "60°",
        candidates: ["60°", "30°", "90°", "120°", "150°"],
        answerExplanation: "3시 방향에서 5시 방향까지 같은 간격 두 칸이므로 60°입니다."
      },
      {
        questionText: "한 변이 12시 방향이고 다른 변이 4시 방향일 때 작은 각은 몇 도일까요?",
        evidenceLabelText: "시계 한 칸은 30°",
        evidenceText: "시계 한 칸 = 30°\n12시에서 4시까지 작은 쪽의 칸 수를 세어 보세요.",
        correctValueText: "120°",
        candidates: ["120°", "90°", "60°", "150°", "180°"],
        answerExplanation: "12시 방향에서 4시 방향까지 같은 간격 네 칸이므로 120°입니다."
      },
      {
        questionText: "한 변이 8시 방향이고 다른 변이 11시 방향일 때 작은 각은 몇 도일까요?",
        evidenceLabelText: "시계 한 칸은 30°",
        evidenceText: "시계 한 칸 = 30°\n8시에서 11시까지 작은 쪽의 칸 수를 세어 보세요.",
        correctValueText: "90°",
        candidates: ["90°", "60°", "120°", "30°", "150°"],
        answerExplanation: "8시 방향에서 11시 방향까지 같은 간격 세 칸이므로 90°입니다."
      }
    ]
  },
  {
    profileId: "mixed-calculation-order",
    activityId: ACTIVITY_IDS.mixedCalculationClaim,
    standardCode: "[6수01-01]",
    gradeBand: "5-6",
    recommendedGrade: 5,
    domain: "수와 연산",
    title: "혼합 계산 순서를 정하고 답 확인하기",
    learningObjective:
      "자연수의 혼합 계산에서 계산 순서를 판단하고 중간 계산을 근거로 설명할 수 있다.",
    officialGoal: "덧셈, 뺄셈, 곱셈, 나눗셈의 혼합 계산에서 계산하는 순서를 알고, 혼합 계산을 할 수 있다.",
    activityLabel: "혼합 계산의 계산 순서",
    activityDescription:
      "계산 결과를 먼저 고른 뒤, 중간 계산을 직접 써 보며 계산 순서를 확인해요.",
    promptSeed: "자연수의 혼합 계산에서 계산 순서를 판단하고 중간 계산으로 검증하는 활동",
    predictionLabel: "내가 고른 답",
    evidenceHeading: "중간 계산",
    explanationLabel: "계산 순서와 까닭",
    misconceptionConflict:
      "모든 연산을 왼쪽부터 하거나 덧셈을 곱셈보다 먼저 하는 생각을 단계별 중간 계산과 충돌시킨다.",
    verificationInvariant:
      "괄호를 먼저 계산하고, 곱셈과 나눗셈을 덧셈과 뺄셈보다 먼저 하며 같은 순위는 왼쪽부터 계산한다.",
    learningMapTopicId:
      "kr.mt.math.number-operations.g5-6.s6-01-01.representation",
    learningMapModule: "자연수의 혼합 계산",
    learningNeeds: [
      {
        id: "left-to-right-only",
        label: "연산 종류와 상관없이 왼쪽부터 계산해요",
        description: "곱셈·나눗셈과 덧셈·뺄셈의 순서를 구분하지 못해요.",
        promptDetail: "먼저 계산할 부분을 고르고 중간 식을 반드시 남기게 한다."
      },
      {
        id: "same-rank-order",
        label: "곱셈은 항상 나눗셈보다 먼저라고 생각해요",
        description: "같은 순위의 연산은 왼쪽부터 계산한다는 점을 놓쳐요.",
        promptDetail: "곱셈과 나눗셈이 함께 있을 때 왼쪽 연산부터 단계별로 확인하게 한다."
      }
    ],
    presentation: {
      problemCount: 1,
      candidateCount: 4,
      layoutTokenSet: "wave21-claim-evidence-v2",
      poolLabel: "계산 결과 카드",
      candidateRenderer: "formula",
      candidateAlignment: "center",
      fontSizes: {
        instruction: 40,
        question: 52,
        label: 38,
        candidate: 70,
        evidenceLabel: 38,
        evidenceText: 42
      },
      instructions: [
        "① 식을 보고 계산 결과 카드를 하나 골라 ‘내가 고른 답’에 놓으세요.",
        "② ‘중간 계산’의 빈칸을 계산 순서대로 채워 답을 확인하세요.",
        "③ 답을 바꿨다면, 바꾼 까닭을 계산 순서와 함께 쓰세요."
      ]
    },
    items: [
      {
        questionText: "48 ÷ 6 × 3 + 5의 계산 결과는 무엇일까요?",
        evidenceLabelText: "중간 계산",
        evidenceText: "48 ÷ 6 = □\n□ × 3 = □\n□ + 5 = □",
        correctValueText: "29",
        candidates: ["29", "13", "24", "53"],
        answerExplanation: "나눗셈과 곱셈을 왼쪽부터 계산한 뒤 5를 더하면 29입니다."
      },
      {
        questionText: "72 - 8 × 6 + 4의 계산 결과는 무엇일까요?",
        evidenceLabelText: "중간 계산",
        evidenceText: "8 × 6 = □\n72 - □ + 4 = □",
        correctValueText: "28",
        candidates: ["28", "388", "20", "24"],
        answerExplanation: "8×6을 먼저 계산하고 뺄셈과 덧셈을 왼쪽부터 계산하면 28입니다."
      },
      {
        questionText: "(36 + 12) ÷ 6 × 2의 계산 결과는 무엇일까요?",
        evidenceLabelText: "중간 계산",
        evidenceText: "36 + 12 = □\n□ ÷ 6 = □\n□ × 2 = □",
        correctValueText: "16",
        candidates: ["16", "38", "4", "96"],
        answerExplanation: "괄호 안을 먼저 계산하고 나눗셈과 곱셈을 왼쪽부터 계산하면 16입니다."
      }
    ]
  },
  {
    profileId: "ratio-same-unit",
    activityId: ACTIVITY_IDS.ratioMeaningClaim,
    standardCode: "[6수02-02]",
    gradeBand: "5-6",
    recommendedGrade: 6,
    domain: "변화와 관계",
    title: "두 양을 같은 단위로 바꾸어 비로 나타내기",
    learningObjective:
      "두 양을 같은 단위로 바꾸어 비로 나타내고 같은 비가 되는 관계를 설명할 수 있다.",
    officialGoal: "두 양의 크기를 비교하는 상황을 통해 비의 개념을 이해하고, 두 양의 관계를 비로 나타낼 수 있다.",
    activityLabel: "비를 나타내는 두 양의 기준",
    activityDescription:
      "숫자만 나란히 쓰지 않고 무엇을 무엇과 비교하는지와 단위를 확인해요.",
    promptSeed: "두 양을 같은 단위로 바꾸고 비교 순서를 정해 비로 나타내는 활동",
    predictionLabel: "처음 나타낸 비",
    evidenceHeading: "같은 단위와 묶음으로 확인하기",
    explanationLabel: "비의 순서와 단위 쓰기",
    misconceptionConflict:
      "서로 다른 단위를 그대로 비교하거나 비교 순서를 바꾸는 생각을 같은 단위의 묶음과 충돌시킨다.",
    verificationInvariant:
      "비교하는 두 양은 같은 단위로 나타내야 하며, 기준량과 비교하는 양의 순서를 유지해야 한다.",
    learningMapTopicId:
      "kr.mt.math.change-relationships.g5-6.s6-02-02.representation",
    learningMapModule: "비와 비율",
    learningNeeds: [
      {
        id: "ratio-order",
        label: "비의 앞 수와 뒤 수를 바꾸어 써요",
        description: "어느 양을 어느 양과 비교하는지 순서를 놓쳐요.",
        promptDetail: "문장에서 먼저 말한 비교하는 양과 기준량을 표시하게 한다."
      },
      {
        id: "ratio-unit",
        label: "서로 다른 단위를 그대로 비로 써요",
        description: "m와 cm처럼 단위가 다른 두 수를 바로 나란히 써요.",
        promptDetail: "두 양을 같은 단위로 바꾼 뒤 묶음 수를 비교하게 한다."
      }
    ],
    items: [
      {
        questionText: "빨간 구슬 12개와 파란 구슬 18개의 가장 간단한 비는 무엇일까요?",
        evidenceLabelText: "6개씩 같은 묶음",
        evidenceText: "빨강: 6개씩 2묶음\n파랑: 6개씩 3묶음",
        correctValueText: "2 : 3",
        candidates: ["2 : 3", "3 : 2", "12 : 6", "6 : 18", "12 : 30"],
        answerExplanation: "12:18의 두 수를 6으로 나누면 2:3입니다."
      },
      {
        questionText: "1 m와 40 cm를 cm 단위로 나타낸 가장 간단한 비는 무엇일까요?",
        evidenceLabelText: "먼저 같은 단위로",
        evidenceText: "1 m = 100 cm\n두 양을 cm로 바꾼 뒤 같은 수로 나누어 보세요.",
        correctValueText: "5 : 2",
        candidates: ["5 : 2", "1 : 40", "2 : 5", "10 : 4", "100 : 4"],
        answerExplanation: "1 m를 100 cm로 바꾸면 100:40이고, 두 수를 20으로 나누면 5:2입니다."
      },
      {
        questionText: "주스 750 mL와 물 500 mL의 가장 간단한 비는 무엇일까요?",
        evidenceLabelText: "250 mL씩 같은 묶음",
        evidenceText: "750 mL와 500 mL를 같은 크기의 묶음으로 나누세요.\n주스와 물의 순서를 지키세요.",
        correctValueText: "3 : 2",
        candidates: ["3 : 2", "2 : 3", "750 : 250", "5 : 2", "3 : 5"],
        answerExplanation: "두 양을 250 mL 묶음으로 나타내면 3묶음과 2묶음이므로 3:2입니다."
      }
    ]
  },
  {
    profileId: "picture-graph-key",
    activityId: ACTIVITY_IDS.pictureGraphKeyClaim,
    standardCode: "[4수04-01]",
    gradeBand: "3-4",
    recommendedGrade: 3,
    domain: "자료와 가능성",
    title: "그림 한 개의 값으로 그림그래프 해석하기",
    learningObjective:
      "그림그래프의 그림 한 개와 일부가 나타내는 값을 사용하여 자료를 해석하고 설명할 수 있다.",
    officialGoal: "자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다.",
    activityLabel: "그림그래프의 그림 한 개 값",
    activityDescription:
      "그림의 개수만 세지 않고 그림 한 개와 반쪽 그림이 나타내는 값을 사용해요.",
    promptSeed: "그림그래프의 기준 그림과 일부 그림이 나타내는 값을 해석하는 활동",
    predictionLabel: "처음 읽은 값",
    evidenceHeading: "그림의 기준값으로 확인하기",
    explanationLabel: "그래프를 읽은 방법 쓰기",
    misconceptionConflict:
      "그림 한 개를 자료 하나로 세거나 반쪽 그림을 무시하는 생각을 그림의 기준값과 충돌시킨다.",
    verificationInvariant:
      "그림의 개수가 아니라 그림 한 개가 나타내는 값과 일부 그림의 비율을 곱해 자료값을 구해야 한다.",
    learningMapTopicId:
      "kr.mt.math.data-probability.g3-4.s4-04-01.representation",
    learningMapModule: "자료의 수집과 정리",
    learningNeeds: [
      {
        id: "picture-key",
        label: "그림 한 개를 자료 한 개로 세어요",
        description: "범례에 적힌 그림 한 개의 값을 확인하지 않아요.",
        promptDetail: "그림 수와 그림 한 개의 값을 곱하여 자료값을 구하게 한다."
      },
      {
        id: "partial-picture",
        label: "반쪽 그림이 나타내는 값을 어려워해요",
        description: "일부 그림을 한 개로 세거나 빼고 계산해요.",
        promptDetail: "반쪽 그림은 기준값의 절반임을 전체 그림과 비교하게 한다."
      }
    ],
    items: [
      {
        questionText: "별 한 개가 4명을 나타낼 때 별 3개는 몇 명일까요?",
        evidenceLabelText: "별 1개 = 4명",
        evidenceText: "그림 수 × 그림 한 개의 값\n별 3개와 한 개의 값을 사용하세요.",
        correctValueText: "12명",
        candidates: ["12명", "3명", "7명", "16명", "8명"],
        answerExplanation: "별 한 개가 4명이므로 별 3개는 4×3=12명입니다."
      },
      {
        questionText: "사과 한 개가 10상자를 나타낼 때 사과 2개와 반쪽은 몇 상자일까요?",
        evidenceLabelText: "사과 1개 = 10상자",
        evidenceText: "그림 2개와 반쪽 그림\n반쪽 그림은 한 개 값의 절반입니다.",
        correctValueText: "25상자",
        candidates: ["25상자", "20상자", "30상자", "15상자", "2.5상자"],
        answerExplanation: "사과 두 개는 20상자이고 반쪽은 5상자이므로 모두 25상자입니다."
      },
      {
        questionText: "자동차 한 대가 6대를 나타낼 때 자동차 4대는 몇 대일까요?",
        evidenceLabelText: "그림 1개 = 자동차 6대",
        evidenceText: "그림 수 × 그림 한 개의 값\n그림 4개와 한 개의 값을 사용하세요.",
        correctValueText: "24대",
        candidates: ["24대", "10대", "4대", "18대", "30대"],
        answerExplanation: "그림 한 개가 자동차 6대이므로 그림 네 개는 6×4=24대입니다."
      }
    ]
  },
  {
    profileId: "triangle-classification",
    activityId: ACTIVITY_IDS.triangleClassificationClaim,
    standardCode: "[4수03-09]",
    gradeBand: "3-4",
    recommendedGrade: 4,
    domain: "도형과 측정",
    title: "측정값을 근거로 삼각형 분류하기",
    learningObjective:
      "삼각형의 각의 크기를 근거로 직각삼각형, 예각삼각형, 둔각삼각형을 분류하고 설명할 수 있다.",
    officialGoal: "여러 가지 모양의 삼각형에 대한 분류 활동을 통하여 직각삼각형, 예각삼각형, 둔각삼각형을 이해한다.",
    activityLabel: "삼각형 분류",
    activityDescription:
      "겉모양만 보고 이름을 붙이지 않고 변의 길이와 각의 크기를 근거로 판단해요.",
    promptSeed: "변의 길이와 각의 크기를 근거로 삼각형을 분류하는 활동",
    predictionLabel: "처음 분류",
    evidenceHeading: "변과 각의 측정값으로 확인하기",
    explanationLabel: "분류 기준 쓰기",
    misconceptionConflict:
      "삼각형의 방향이나 뾰족해 보이는 정도로 분류하는 생각을 실제 변의 길이와 각의 크기와 충돌시킨다.",
    verificationInvariant:
      "삼각형의 이름은 놓인 방향이 아니라 같은 변의 수와 직각·예각·둔각의 유무 같은 성질로 정한다.",
    learningMapTopicId:
      "kr.mt.math.geometry-measurement.g3-4.s4-03-09.representation",
    learningMapModule: "여러 가지 삼각형",
    learningNeeds: [
      {
        id: "visual-shape-only",
        label: "삼각형의 모양만 보고 분류해요",
        description: "변의 길이나 각의 크기를 재지 않고 눈에 보이는 인상으로 판단해요.",
        promptDetail: "분류 전에 어떤 변과 각을 확인할지 기준을 말하게 한다."
      },
      {
        id: "orientation",
        label: "도형이 돌아가면 다른 삼각형이라고 생각해요",
        description: "삼각형의 방향과 성질을 구분하지 못해요.",
        promptDetail: "같은 측정값을 가진 도형을 돌려 놓고 분류가 유지되는지 확인하게 한다."
      }
    ],
    items: [
      {
        questionText: "세 각이 30°, 60°, 90°인 삼각형은 각에 따라 무엇일까요?",
        evidenceLabelText: "90°인 각 찾기",
        evidenceText: "한 각 = 90°\n직각이 한 개 있음",
        correctValueText: "직각삼각형",
        candidates: ["직각삼각형", "예각삼각형", "둔각삼각형", "정삼각형", "분류할 수 없음"],
        answerExplanation: "90°인 각이 하나 있으므로 직각삼각형입니다."
      },
      {
        questionText: "세 각이 50°, 60°, 70°인 삼각형은 각에 따라 무엇일까요?",
        evidenceLabelText: "세 각 모두 90°보다 작음",
        evidenceText: "50° < 90°\n60° < 90°\n70° < 90°",
        correctValueText: "예각삼각형",
        candidates: ["예각삼각형", "직각삼각형", "둔각삼각형", "정삼각형", "분류할 수 없음"],
        answerExplanation: "세 각이 모두 90°보다 작으므로 예각삼각형입니다."
      },
      {
        questionText: "세 각이 35°, 35°, 110°인 삼각형은 각에 따라 무엇일까요?",
        evidenceLabelText: "90°보다 큰 각 찾기",
        evidenceText: "110° > 90°\n둔각이 한 개 있음",
        correctValueText: "둔각삼각형",
        candidates: ["둔각삼각형", "예각삼각형", "직각삼각형", "정삼각형", "분류할 수 없음"],
        answerExplanation: "90°보다 큰 110°의 각이 있으므로 둔각삼각형입니다."
      }
    ]
  },
  {
    profileId: "line-symmetry-distance",
    activityId: ACTIVITY_IDS.lineSymmetryClaim,
    standardCode: "[6수03-02]",
    gradeBand: "5-6",
    recommendedGrade: 5,
    domain: "도형과 측정",
    title: "대칭축에서 같은 거리로 대응점 찾기",
    learningObjective:
      "선대칭도형에서 대응점과 대칭축 사이의 거리가 같다는 성질로 위치를 판단하고 설명할 수 있다.",
    officialGoal: "실생활과 연결하여 선대칭도형과 점대칭도형을 이해하고 그릴 수 있다.",
    activityLabel: "선대칭 대응점",
    activityDescription:
      "좌우 모양이 비슷해 보이는지만 보지 않고 대칭축까지의 거리와 수직 관계를 확인해요.",
    promptSeed: "대칭축까지의 같은 거리와 수직 관계로 대응점의 위치를 판단하는 활동",
    predictionLabel: "처음 고른 대응점",
    evidenceHeading: "대칭축까지의 거리로 확인하기",
    explanationLabel: "대응점을 찾은 방법 쓰기",
    misconceptionConflict:
      "대칭축 건너편의 아무 점이나 대응점이라고 보는 생각을 축까지의 같은 거리와 수직 관계와 충돌시킨다.",
    verificationInvariant:
      "대응하는 두 점을 이은 선분은 대칭축과 수직이고 두 점은 대칭축에서 같은 거리에 있어야 한다.",
    learningMapTopicId:
      "kr.mt.math.geometry-measurement.g5-6.s6-03-02.representation",
    learningMapModule: "합동과 대칭",
    learningNeeds: [
      {
        id: "same-distance",
        label: "대칭축까지의 거리를 다르게 잡아요",
        description: "반대쪽이라는 점만 보고 축에서 같은 칸인지 확인하지 않아요.",
        promptDetail: "원래 점과 후보점에서 대칭축까지의 수직 거리를 각각 세게 한다."
      },
      {
        id: "perpendicular",
        label: "비스듬한 위치도 대응점이라고 생각해요",
        description: "두 대응점을 이은 선분이 대칭축과 수직이어야 함을 놓쳐요.",
        promptDetail: "대응점끼리 이은 선분과 대칭축이 이루는 각을 확인하게 한다."
      }
    ],
    items: [
      {
        questionText: "세로 대칭축 왼쪽 3칸에 있는 점의 대응점은 어느 위치일까요?",
        evidenceLabelText: "축까지 같은 거리",
        evidenceText: "왼쪽 점 — 3칸 — 대칭축 — 3칸 — 오른쪽 점",
        correctValueText: "오른쪽 3칸",
        candidates: ["오른쪽 3칸", "오른쪽 2칸", "오른쪽 4칸", "왼쪽 3칸", "축 위"],
        answerExplanation: "대응점은 대칭축 반대쪽에서 같은 거리인 오른쪽 3칸에 있습니다."
      },
      {
        questionText: "가로 대칭축 위쪽 2칸에 있는 점의 대응점은 어느 위치일까요?",
        evidenceLabelText: "축과 수직으로 같은 거리",
        evidenceText: "위쪽 점 — 2칸 — 대칭축 — 2칸 — 아래쪽 점",
        correctValueText: "아래쪽 2칸",
        candidates: ["아래쪽 2칸", "아래쪽 1칸", "위쪽 2칸", "오른쪽 2칸", "축 위"],
        answerExplanation: "가로 대칭축과 수직인 방향으로 반대쪽 같은 거리인 아래쪽 2칸입니다."
      },
      {
        questionText: "대칭축에서 왼쪽 4칸인 점과 대응하는 점까지의 전체 거리는 몇 칸일까요?",
        evidenceLabelText: "양쪽 거리를 더하기",
        evidenceText: "대응하는 두 점은 축에서 같은 거리입니다.\n왼쪽 거리와 오른쪽 거리를 더하세요.",
        correctValueText: "8칸",
        candidates: ["8칸", "4칸", "6칸", "2칸", "16칸"],
        answerExplanation: "두 점이 축에서 각각 4칸 떨어져 있으므로 전체 거리는 8칸입니다."
      }
    ]
  },
  {
    profileId: "graph-purpose",
    activityId: ACTIVITY_IDS.graphPurposeClaim,
    standardCode: "[6수04-03]",
    gradeBand: "5-6",
    recommendedGrade: 6,
    domain: "자료와 가능성",
    title: "알고 싶은 내용에 맞는 그래프 선택하기",
    learningObjective:
      "자료의 특징과 알고 싶은 내용에 맞는 그래프를 선택하고 그 까닭을 설명할 수 있다.",
    officialGoal: "탐구 문제를 설정하고, 그에 맞는 자료를 수집, 정리하여 적절한 그래프로 나타내고 해석할 수 있다.",
    activityLabel: "자료에 알맞은 그래프",
    activityDescription:
      "익숙한 그래프를 무조건 고르지 않고 변화, 비율, 항목 비교 중 무엇을 볼지 판단해요.",
    promptSeed: "자료에서 알고 싶은 내용에 따라 알맞은 그래프를 선택하고 근거를 설명하는 활동",
    predictionLabel: "처음 고른 그래프",
    evidenceHeading: "자료의 목적과 구조로 확인하기",
    explanationLabel: "그래프를 고른 까닭 쓰기",
    misconceptionConflict:
      "모든 자료를 막대그래프로 나타내거나 모양이 익숙한 그래프를 고르는 생각을 자료의 시간성·전체비율·항목비교 목적과 충돌시킨다.",
    verificationInvariant:
      "시간에 따른 변화는 꺾은선그래프, 전체에 대한 비율은 띠·원그래프, 항목의 크기 비교는 막대그래프가 잘 드러낸다.",
    learningMapTopicId:
      "kr.mt.math.data-probability.g5-6.s6-04-03.representation",
    learningMapModule: "자료의 수집과 정리",
    learningNeeds: [
      {
        id: "graph-habit",
        label: "자료와 상관없이 익숙한 그래프를 골라요",
        description: "그래프로 무엇을 알아보려는지 생각하지 않아요.",
        promptDetail: "시간 변화, 항목 비교, 전체 비율 중 자료의 목적을 먼저 고르게 한다."
      },
      {
        id: "part-whole",
        label: "전체에 대한 비율을 막대 높이만으로 비교해요",
        description: "전체를 100으로 보아 부분의 비율을 나타내는 그래프의 장점을 놓쳐요.",
        promptDetail: "각 부분의 합이 전체가 되는 자료인지 먼저 확인하게 한다."
      }
    ],
    items: [
      {
        questionText: "한 주 동안 매일의 기온 변화를 알아보기 좋은 그래프는 무엇일까요?",
        evidenceLabelText: "시간에 따른 변화",
        evidenceText: "월 → 화 → 수 → 목 → 금\n이어진 시간 순서의 오르내림을 확인",
        correctValueText: "꺾은선그래프",
        candidates: ["꺾은선그래프", "원그래프", "띠그래프", "그림그래프", "점 하나"],
        answerExplanation: "시간 순서에 따른 값의 변화를 보려면 꺾은선그래프가 알맞습니다."
      },
      {
        questionText: "우리 반 학생들이 좋아하는 운동의 전체 비율을 보기 좋은 그래프는 무엇일까요?",
        evidenceLabelText: "전체를 100%로 나누기",
        evidenceText: "축구 + 야구 + 농구 + 기타 = 100%\n부분이 전체에서 차지하는 비율을 확인",
        correctValueText: "원그래프",
        candidates: ["원그래프", "꺾은선그래프", "수직선", "점그래프", "좌표평면"],
        answerExplanation: "전체에서 각 운동이 차지하는 비율을 보려면 원그래프가 알맞습니다."
      },
      {
        questionText: "여섯 학급의 책 수를 한눈에 비교하기 좋은 그래프는 무엇일까요?",
        evidenceLabelText: "항목별 크기 비교",
        evidenceText: "1반  2반  3반  4반  5반  6반\n각 항목의 막대 길이를 같은 눈금으로 비교",
        correctValueText: "막대그래프",
        candidates: ["막대그래프", "원그래프", "꺾은선그래프", "띠그래프", "시계"],
        answerExplanation: "여러 학급의 수량을 항목별로 비교하려면 막대그래프가 알맞습니다."
      }
    ]
  }
] as const;

export function findClaimEvidenceActivityProfile(
  standardCode: string
): ClaimEvidenceActivityProfile | undefined {
  return claimEvidenceActivityProfiles.find(
    (profile) => profile.standardCode === standardCode
  );
}
