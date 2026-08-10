import {
  EDUITIT_HTML30_V2_SCHEMA_VERSION,
  eduititHtml30ActivitySpecV2Schema,
  type EduititHtml30ActivitySpecV2
} from "@mathcanvas/contracts";

type CatalogAffordance = EduititHtml30ActivitySpecV2["sourceBinding"]["catalogAffordance"];
type Answer = EduititHtml30ActivitySpecV2["learnerTask"]["answer"];
type MovableUnit = EduititHtml30ActivitySpecV2["nativePlan"]["movableUnits"][number];

export interface EduititHtml30PromptHarnessEntryInput {
  readonly sequence: number;
  readonly promptId: string;
  readonly lessonId: string;
  readonly title: string;
  readonly sourceBinding: {
    readonly slideHtmlSha256: string;
  };
  readonly catalogBinding: {
    readonly catalogEntryId: string;
    readonly alignmentStatus: "exact" | "needs-review";
    readonly snapshotSha256: string;
    readonly affordanceFamily: CatalogAffordance;
  };
}

export interface EduititHtml30PromptHarnessInput {
  readonly contentSha256: string;
  readonly entries: readonly EduititHtml30PromptHarnessEntryInput[];
}

interface ActivityConfig {
  readonly sequence: number;
  readonly question: string;
  readonly directions: readonly [string] | readonly [string, string];
  readonly answer: Answer;
  readonly mathematicalDecision: string;
  readonly toolKey: string;
  readonly variantIds: readonly string[];
  readonly semanticOperation: string;
  readonly initialState: Record<string, unknown>;
  readonly targetState: Record<string, unknown>;
  readonly invariant: string;
  readonly movableUnits: readonly MovableUnit[];
  readonly rejectableUnitIds?: readonly string[];
  readonly workbench:
    | {
        readonly variant: "single-native-workbench";
        readonly label: string;
        readonly purpose: string;
      }
    | {
        readonly variant: "composition-workbench";
        readonly sourceLabel: string;
        readonly sourcePurpose: string;
        readonly constructionLabel: string;
        readonly constructionPurpose: string;
      };
  readonly supportingToolKey?: string;
  readonly supportingVariantIds?: readonly string[];
}

function noAnswer(): Answer {
  return {
    kind: "none",
    reason: "construction-state-is-the-answer",
    regionRequired: false
  };
}

function compactExpression(expected: string): Answer {
  return {
    kind: "compact-expression",
    label: "답",
    expected,
    interaction: "math-input",
    regionRequired: true
  };
}

function compactChoice(
  choices: readonly [string, string] | readonly [string, string, string],
  correctIndex: number
): Answer {
  return {
    kind: "compact-choice",
    label: "답",
    choices: choices.map((text, index) => ({
      choiceId: `choice-${index + 1}`,
      text
    })),
    correctChoiceId: `choice-${correctIndex + 1}`,
    interaction: "native-choice-drop",
    regionRequired: true
  };
}

function singleObject(
  sequence: number,
  meaning: string,
  action: MovableUnit["studentAction"] = "native-control-drag"
): MovableUnit {
  return {
    unitId: `activity-${sequence}-native-object`,
    mathematicalMeaning: meaning,
    representation: {
      kind: "single-native-object",
      objectId: `mc30v2-${sequence}-native`
    },
    studentAction: action,
    startsIn: "native-stage",
    endsIn: "native-stage"
  };
}

function independentSet(
  sequence: number,
  name: string,
  count: number,
  meaning: string
): MovableUnit {
  return {
    unitId: `activity-${sequence}-${name}`,
    mathematicalMeaning: meaning,
    representation: {
      kind: "independent-native-set",
      memberIdPrefix: `mc30v2-${sequence}-${name}`,
      memberCount: count
    },
    studentAction: "direct-drag",
    startsIn: "source-tray",
    endsIn: "construction-area"
  };
}

function independentObjects(
  sequence: number,
  name: string,
  count: number,
  meaning: string
): readonly MovableUnit[] {
  return Array.from({ length: count }, (_, index) => ({
    unitId: `activity-${sequence}-${name}-${index + 1}`,
    mathematicalMeaning: `${meaning} ${index + 1}`,
    representation: {
      kind: "single-native-object" as const,
      objectId: `mc30v2-${sequence}-${name}-unit-${String(index + 1).padStart(2, "0")}`
    },
    studentAction: "direct-drag" as const,
    startsIn: "source-tray" as const,
    endsIn: "construction-area" as const
  }));
}

function nativeGroup(
  sequence: number,
  name: string,
  memberCount: number,
  meaning: string
): MovableUnit {
  const groupId = `mc30v2-${sequence}-${name}-group`;
  return {
    unitId: `activity-${sequence}-${name}`,
    mathematicalMeaning: meaning,
    representation: {
      kind: "canonical-native-group",
      groupId,
      memberIds: Array.from(
        { length: memberCount },
        (_, index) => `${groupId}-member-${index + 1}`
      ),
      persistedBeforeStudentUse: true,
      membersMoveAsOne: true
    },
    studentAction: "direct-drag",
    startsIn: "source-tray",
    endsIn: "construction-area"
  };
}

function stageNativeGroup(
  sequence: number,
  name: string,
  memberCount: number,
  meaning: string
): MovableUnit {
  const unit = nativeGroup(sequence, name, memberCount, meaning);
  return {
    ...unit,
    startsIn: "native-stage",
    endsIn: "native-stage"
  };
}

function repeatedGroups(
  sequence: number,
  name: string,
  groupCount: number,
  membersPerGroup: number,
  meaning: string
): readonly MovableUnit[] {
  return Array.from({ length: groupCount }, (_, index) =>
    nativeGroup(
      sequence,
      `${name}-${index + 1}`,
      membersPerGroup,
      `${meaning} ${index + 1}`
    )
  );
}

function compactLabeledGroups(
  sequence: number,
  name: string,
  groupCount: number,
  groupSize: number,
  meaning: string
): readonly MovableUnit[] {
  return Array.from({ length: groupCount }, (_, index) =>
    nativeGroup(
      sequence,
      `${name}-${index + 1}`,
      groupSize + 2,
      `${meaning} ${index + 1}`
    )
  );
}

const fractionVariantByDenominator: Readonly<Record<number, string>> = {
  4: "NO03FM-07",
  5: "NO03FM-06",
  7: "NO03FM-04",
  8: "NO03FM-03",
  10: "NO03FM-01"
};

const plausibleWrongPathBySequence: Readonly<Record<number, string>> = {
  1: "범례 5권을 적용하지 않고 그림 다섯 개를 책 다섯 권으로 읽는다.",
  2: "한 접시의 수와 접시 수 중 한 방향만 바꾸어 4×4 배열에서 멈춘다.",
  3: "한 줄의 수와 줄 수를 혼동해 6×6 배열에서 멈춘다.",
  4: "십의 자리 3을 두 번 센 6을 부분곱 60 대신 고른다.",
  5: "상자 세 개를 반영하지 않고 30 모형을 전체 부분곱으로 고른다.",
  6: "쿠키 수는 모두 쓰지만 여섯 칸의 수가 서로 다르게 나눈다.",
  7: "7개라는 묶음의 크기를 묶음 수로 읽어 묶음을 일곱 개 옮긴다.",
  8: "32를 만드는 데 필요한 네 묶음보다 한 묶음을 더 옮긴다.",
  9: "42장을 만드는 데 필요한 일곱 묶음보다 한 묶음을 더 옮긴다.",
  10: "다섯 조각이 전체를 채우기 전에 네 조각에서 멈춘다.",
  11: "조각 수만 다섯이면 된다고 보고 크기가 다른 분할을 그대로 받아들인다.",
  12: "고른 세 조각 대신 남은 네 조각을 분자로 나타낸다.",
  13: "먹은 네 조각 대신 남은 여섯 조각을 분자로 나타낸다.",
  14: "물건의 크기를 비교하지 않고 지우개에 m, 복도에 cm를 놓는다.",
  15: "아주 작은 두께와 먼 거리를 구분하지 않고 mm와 km를 바꾸어 놓는다.",
  16: "1m를 10cm로 바꾸어 100cm 묶음을 한 개만 옮긴다.",
  17: "일의 자리 1을 십으로 보아 30 모형을 필요한 부분곱으로 고른다.",
  18: "일의 자리 3을 세 번 곱하지 않고 3 모형을 필요한 부분곱으로 고른다.",
  19: "14의 십 자릿값을 놓치고 32 모형을 32×10의 부분곱으로 고른다.",
  20: "28을 만드는 데 필요한 네 묶음보다 한 묶음을 더 옮긴다.",
  21: "17개를 모두 쓰지만 다섯 칸을 같은 수로 나누지 않는다.",
  22: "몫과 나머지를 확인하면서 묶음 하나나 낱개를 필요 이상으로 넣는다.",
  23: "중심에서 원 위까지의 선분을 원을 가로지르는 지름과 혼동한다.",
  24: "반지름 하나의 길이를 그대로 지름으로 고르거나 세 배로 계산한다.",
  25: "색칠한 여섯 칸 대신 색칠하지 않은 네 칸을 분자로 나타낸다.",
  26: "네 조각이 전체 하나라는 관계를 쓰지 않고 11/4를 그대로 두거나 잘못 묶는다.",
  27: "분모가 같을 때 분자를 비교하지 않고 3/8을 더 크다고 고른다.",
  28: "1L를 1000mL가 아닌 500mL로 바꾼 카드를 식에 넣는다.",
  29: "1kg를 1000g가 아닌 100g으로 바꾼 300 카드를 식에 넣는다.",
  30: "그림 세 개의 차이에 범례 4명을 적용하지 않고 3명이나 8명을 고른다."
};

const wrongStateBySequence: Readonly<Record<number, Record<string, unknown>>> = {
  1: { category: "책", legendValue: 5, pictureCount: 4, actualCount: 20 },
  2: { rows: 4, columns: 4, product: 16 },
  3: { rows: 6, columns: 6, product: 36 },
  6: { total: 18, recipients: 6, distributions: [4, 4, 3, 3, 2, 2] },
  10: { denominator: 5, visibleParts: 4, wholeComplete: false },
  11: { referencePartsEqual: false, nativePartsEqual: false, nativeVisibleParts: 5 },
  12: { denominator: 7, numerator: 4 },
  13: { denominator: 10, numerator: 6 },
  21: { distributed: [3, 3, 3, 3, 2], quotient: null, remainder: 3 },
  23: { center: "O", visibleRadiusSegments: 1, radiusCanvasUnits: 260, endpointRelation: "on-circle" },
  24: { radiusCentimeters: 7, diameterAligned: false, angleDegrees: 270 },
  25: { denominator: 10, numerator: 4 },
  26: { completedWholes: 1, remainingParts: 7, mixedNumber: null },
  27: { fractions: ["3/8", "7/8"], leftEdgesAligned: true, greater: "3/8" },
  30: {
    legendValue: 4,
    categories: { A: 4, B: 2 },
    removedPictures: 1,
    actualDifference: 8
  }
};

const configs: readonly ActivityConfig[] = [
  {
    sequence: 1,
    question: "그림 한 개가 책 5권이라면, 25권은 그림 몇 개일까요?",
    directions: [
      "‘책’ 칸을 누르세요.",
      "나타난 +를 눌러 25권을 나타내세요."
    ],
    answer: noAnswer(),
    mathematicalDecision: "그림 수에 범례의 5권을 적용해 25권을 나타내는 그림 수를 결정한다.",
    toolKey: "DP03PG",
    variantIds: ["DP03PG-01"],
    semanticOperation: "책 범주의 그림 수를 직접 늘려 범례가 적용된 실제 수량을 만든다.",
    initialState: { category: "책", legendValue: 5, pictureCount: 3, actualCount: 15 },
    targetState: { category: "책", legendValue: 5, pictureCount: 5, actualCount: 25 },
    invariant: "그림 수 × 그림 한 개의 값 = 실제 수량",
    movableUnits: [singleObject(1, "범례 5권이 적용되는 책 그림그래프", "native-click")],
    workbench: {
      variant: "single-native-workbench",
      label: "책 그림그래프",
      purpose: "그림 수를 바꾸며 25권을 나타낸다."
    }
  },
  {
    sequence: 2,
    question: "귤이 한 접시에 4개씩 5접시라면 모두 몇 개일까요?",
    directions: [
      "곱셈표를 누르세요.",
      "나타난 오른쪽 점과 아래쪽 점을 끌어 4칸씩 5줄로 만드세요."
    ],
    answer: noAnswer(),
    mathematicalDecision: "한 줄의 4개와 5줄을 배열의 두 방향에 대응시켜 전체 20을 결정한다.",
    toolKey: "NO04NG",
    variantIds: ["NO04NG-03"],
    semanticOperation: "곱셈표의 가로와 세로 끝점을 바꾸어 5줄 4칸 배열을 만든다.",
    initialState: { rows: 3, columns: 3, product: 9 },
    targetState: { rows: 5, columns: 4, product: 20 },
    invariant: "한 줄의 수 × 줄 수 = 전체 수",
    movableUnits: [singleObject(2, "한 줄의 수와 줄 수가 만나는 곱셈표")],
    workbench: {
      variant: "single-native-workbench",
      label: "귤 곱셈표",
      purpose: "4칸씩 5줄인 배열을 만든다."
    }
  },
  {
    sequence: 3,
    question: "바둑돌이 한 줄에 6개씩 7줄이라면 모두 몇 개일까요?",
    directions: [
      "곱셈표를 누르세요.",
      "나타난 오른쪽 점과 아래쪽 점을 끌어 6칸씩 7줄로 만드세요."
    ],
    answer: noAnswer(),
    mathematicalDecision: "한 줄의 6개와 7줄을 배열의 두 방향에 대응시켜 전체 42를 결정한다.",
    toolKey: "NO04NG",
    variantIds: ["NO04NG-03"],
    semanticOperation: "곱셈표의 가로와 세로 끝점을 바꾸어 7줄 6칸 배열을 만든다.",
    initialState: { rows: 4, columns: 4, product: 16 },
    targetState: { rows: 7, columns: 6, product: 42 },
    invariant: "한 줄의 수 × 줄 수 = 전체 수",
    movableUnits: [singleObject(3, "한 줄의 수와 줄 수가 만나는 곱셈표")],
    workbench: {
      variant: "single-native-workbench",
      label: "바둑돌 곱셈표",
      purpose: "6칸씩 7줄인 배열을 만든다."
    }
  },
  {
    sequence: 4,
    question: "34를 두 번 모으면 모두 얼마일까요?",
    directions: ["부분곱 카드를 골라 아래 칸으로 옮겨 모으세요."],
    answer: noAnswer(),
    mathematicalDecision: "34 두 벌을 십과 일의 자릿값끼리 모아 6십 8로 합친다.",
    toolKey: "NO04PD",
    variantIds: ["NO04PD-04", "NO04PD-05"],
    semanticOperation: "부분곱 60과 8을 나타내는 place-value group을 같은 자릿값에 맞춰 합친다.",
    initialState: { candidatePartials: [60, 6, 8], selectedPartials: [], combined: null },
    targetState: { tens: 6, ones: 8, combined: 68 },
    invariant: "30×2와 4×2를 더하면 34×2와 같다.",
    movableUnits: [
      stageNativeGroup(4, "partial-60", 8, "30×2를 나타내는 60 모형"),
      stageNativeGroup(4, "partial-6", 8, "3×2로 잘못 계산한 6 모형"),
      stageNativeGroup(4, "partial-8", 10, "4×2를 나타내는 8 모형")
    ],
    rejectableUnitIds: ["activity-4-partial-6"],
    workbench: {
      variant: "single-native-workbench",
      label: "부분곱 모형",
      purpose: "필요한 부분곱을 골라 같은 자릿값에 맞춰 합친다."
    }
  },
  {
    sequence: 5,
    question: "공이 31개씩 든 상자가 3개라면 모두 몇 개일까요?",
    directions: ["부분곱 카드를 골라 아래 칸으로 옮겨 모으세요."],
    answer: noAnswer(),
    mathematicalDecision: "31 세 벌을 십과 일의 자릿값끼리 모아 9십 3으로 합친다.",
    toolKey: "NO04PD",
    variantIds: ["NO04PD-04", "NO04PD-05"],
    semanticOperation: "부분곱 90과 3을 나타내는 place-value group을 같은 자릿값에 맞춰 합친다.",
    initialState: { candidatePartials: [30, 90, 3], selectedPartials: [], combined: null },
    targetState: { tens: 9, ones: 3, combined: 93 },
    invariant: "30×3과 1×3을 더하면 31×3과 같다.",
    movableUnits: [
      stageNativeGroup(5, "partial-30", 5, "30을 한 번만 센 30 모형"),
      stageNativeGroup(5, "partial-90", 11, "30×3을 나타내는 90 모형"),
      stageNativeGroup(5, "partial-3", 5, "1×3을 나타내는 3 모형")
    ],
    rejectableUnitIds: ["activity-5-partial-30"],
    workbench: {
      variant: "single-native-workbench",
      label: "부분곱 모형",
      purpose: "필요한 부분곱을 골라 같은 자릿값에 맞춰 합친다."
    }
  },
  {
    sequence: 6,
    question: "쿠키 18개를 6명에게 똑같이 나누면 한 명은 몇 개일까요?",
    directions: ["쿠키를 여섯 칸에 한 개씩 번갈아 옮기세요."],
    answer: noAnswer(),
    mathematicalDecision: "18개를 6개의 같은 몫으로 나누어 각 몫이 3임을 결정한다.",
    toolKey: "NO01SC",
    variantIds: ["NO01SC-01"],
    semanticOperation: "독립된 쿠키 모형 18개를 여섯 수령 영역에 같은 수로 분배한다.",
    initialState: { total: 18, recipients: 6, distributions: [0, 0, 0, 0, 0, 0] },
    targetState: { total: 18, recipients: 6, distributions: [3, 3, 3, 3, 3, 3] },
    invariant: "전체 수 ÷ 사람 수 = 한 사람이 받는 수",
    movableUnits: [independentSet(6, "cookies", 18, "한 개씩 옮기는 쿠키")],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "쿠키 18개",
      sourcePurpose: "아직 나누지 않은 쿠키를 모아 둔다.",
      constructionLabel: "6명에게 나누기",
      constructionPurpose: "여섯 칸에 같은 수가 되도록 나눈다."
    }
  },
  {
    sequence: 7,
    question: "7×□=35에서 □에 알맞은 수는 얼마일까요?",
    directions: ["7개 묶음을 옮겨 모두 35개가 되게 하세요."],
    answer: noAnswer(),
    mathematicalDecision: "7개짜리 묶음이 다섯 번 모여 35가 됨을 결정한다.",
    toolKey: "NO01SC",
    variantIds: ["NO01SC-01"],
    semanticOperation: "7개를 뜻하는 native 묶음 카드를 construction area에 옮겨 35를 구성한다.",
    initialState: { groupSize: 7, availableGroups: 6, constructedGroups: 0 },
    targetState: { groupSize: 7, constructedGroups: 5, total: 35 },
    invariant: "한 묶음의 수 × 묶음 수 = 전체 수",
    movableUnits: compactLabeledGroups(7, "seven-set", 6, 7, "7개짜리 묶음"),
    rejectableUnitIds: ["activity-7-seven-set-6"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "7개 묶음",
      sourcePurpose: "한 번에 움직이는 7개 묶음을 준비한다.",
      constructionLabel: "35 만들기",
      constructionPurpose: "필요한 묶음만 옮겨 35를 만든다."
    }
  },
  {
    sequence: 8,
    question: "32÷8의 몫은 얼마일까요?",
    directions: ["8개 묶음을 옮겨 모두 32개가 되게 하세요."],
    answer: noAnswer(),
    mathematicalDecision: "8개짜리 묶음이 네 번 모여 32가 됨을 결정한다.",
    toolKey: "NO01SC",
    variantIds: ["NO01SC-01"],
    semanticOperation: "8개를 뜻하는 native 묶음 카드를 construction area에 옮겨 32를 구성한다.",
    initialState: { groupSize: 8, availableGroups: 5, constructedGroups: 0 },
    targetState: { groupSize: 8, constructedGroups: 4, total: 32 },
    invariant: "32÷8은 8개짜리 묶음의 수이다.",
    movableUnits: compactLabeledGroups(8, "eight-set", 5, 8, "8개짜리 묶음"),
    rejectableUnitIds: ["activity-8-eight-set-5"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "8개 묶음",
      sourcePurpose: "한 번에 움직이는 8개 묶음을 준비한다.",
      constructionLabel: "32 만들기",
      constructionPurpose: "필요한 묶음만 옮겨 32를 만든다."
    }
  },
  {
    sequence: 9,
    question: "붙임 딱지 42장을 6장씩 묶으면 몇 묶음일까요?",
    directions: ["6장 묶음을 옮겨 모두 42장이 되게 하세요."],
    answer: noAnswer(),
    mathematicalDecision: "6장짜리 묶음이 일곱 번 모여 42장이 됨을 결정한다.",
    toolKey: "NO01SC",
    variantIds: ["NO01SC-01"],
    semanticOperation: "6장을 뜻하는 native 묶음 카드를 construction area에 옮겨 42를 구성한다.",
    initialState: { groupSize: 6, availableGroups: 8, constructedGroups: 0 },
    targetState: { groupSize: 6, constructedGroups: 7, total: 42 },
    invariant: "한 묶음의 수 × 묶음 수 = 전체 수",
    movableUnits: compactLabeledGroups(9, "six-set", 8, 6, "6장짜리 묶음"),
    rejectableUnitIds: ["activity-9-six-set-8"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "6장 묶음",
      sourcePurpose: "한 번에 움직이는 6장 묶음을 준비한다.",
      constructionLabel: "42장 만들기",
      constructionPurpose: "필요한 묶음만 옮겨 42장을 만든다."
    }
  },
  {
    sequence: 10,
    question: "전체를 똑같이 5조각으로 나눈 한 조각은 얼마일까요?",
    directions: [
      "분수 띠를 누르세요.",
      "나타난 오른쪽 점을 끌어 전체를 똑같이 5조각으로 나누세요."
    ],
    answer: noAnswer(),
    mathematicalDecision: "같은 전체를 똑같이 다섯 조각으로 나눈 한 조각을 1/5로 결정한다.",
    toolKey: "NO03FM",
    variantIds: [fractionVariantByDenominator[5]!],
    semanticOperation: "분수 띠의 끝점을 늘려 똑같은 1/5 조각 다섯 개로 전체 1을 만든다.",
    initialState: { denominator: 5, visibleParts: 1, wholeComplete: false },
    targetState: { denominator: 5, visibleParts: 5, wholeComplete: true },
    invariant: "전체 1은 똑같은 1/5 조각 다섯 개이다.",
    movableUnits: [singleObject(10, "전체를 똑같이 5등분하는 분수 띠")],
    workbench: {
      variant: "single-native-workbench",
      label: "분수 띠",
      purpose: "같은 조각 다섯 개로 전체 1을 만든다."
    }
  },
  {
    sequence: 11,
    question: "크기가 다른 5조각 중 한 조각을 1/5이라고 해도 될까요?",
    directions: [
      "분수 띠를 누르세요.",
      "나타난 오른쪽 점을 끌어 전체를 5조각으로 나누세요."
    ],
    answer: compactChoice(["돼요", "안 돼요"], 1),
    mathematicalDecision: "조각 수만 같아서는 부족하고 다섯 조각의 크기가 모두 같아야 1/5임을 결정한다.",
    toolKey: "NO03FM",
    variantIds: [fractionVariantByDenominator[5]!],
    semanticOperation: "같지 않은 참고 분할과 비교하며 native 띠를 똑같은 5조각으로 만든다.",
    initialState: { referencePartsEqual: false, nativeVisibleParts: 1 },
    targetState: { referencePartsEqual: false, nativePartsEqual: true, nativeVisibleParts: 5 },
    invariant: "분수의 한 조각은 전체를 똑같이 나눈 조각이어야 한다.",
    movableUnits: [singleObject(11, "똑같은 1/5 조각을 만드는 분수 띠")],
    workbench: {
      variant: "single-native-workbench",
      label: "똑같이 나누기",
      purpose: "크기가 다른 조각을 같은 크기로 고친다."
    }
  },
  {
    sequence: 12,
    question: "전체 7조각 중 3조각을 고르면 얼마일까요?",
    directions: [
      "분수 띠를 누르세요.",
      "나타난 오른쪽 점을 끌어 7칸 중 3칸이 색칠되게 하세요."
    ],
    answer: noAnswer(),
    mathematicalDecision: "전체 조각 수 7을 분모로, 고른 조각 수 3을 분자로 결정한다.",
    toolKey: "NO03FM",
    variantIds: [fractionVariantByDenominator[7]!],
    semanticOperation: "분수 띠에서 같은 1/7 조각의 보이는 수를 3으로 바꾼다.",
    initialState: { denominator: 7, numerator: 1 },
    targetState: { denominator: 7, numerator: 3 },
    invariant: "전체 조각 수는 분모, 고른 조각 수는 분자이다.",
    movableUnits: [singleObject(12, "전체가 7등분된 분수 띠")],
    workbench: {
      variant: "single-native-workbench",
      label: "분수 띠",
      purpose: "같은 1/7 조각 세 개를 나타낸다."
    }
  },
  {
    sequence: 13,
    question: "피자 10조각 중 4조각을 먹으면 먹은 양은 얼마일까요?",
    directions: [
      "분수 띠를 누르세요.",
      "나타난 오른쪽 점을 끌어 10칸 중 4칸이 색칠되게 하세요."
    ],
    answer: noAnswer(),
    mathematicalDecision: "전체 조각 수 10을 분모로, 먹은 조각 수 4를 분자로 결정한다.",
    toolKey: "NO03FM",
    variantIds: [fractionVariantByDenominator[10]!],
    semanticOperation: "분수 띠에서 같은 1/10 조각의 보이는 수를 4로 바꾼다.",
    initialState: { denominator: 10, numerator: 1 },
    targetState: { denominator: 10, numerator: 4 },
    invariant: "전체 조각 수는 분모, 고른 조각 수는 분자이다.",
    movableUnits: [singleObject(13, "전체가 10등분된 분수 띠")],
    workbench: {
      variant: "single-native-workbench",
      label: "분수 띠",
      purpose: "같은 1/10 조각 네 개를 나타낸다."
    }
  },
  {
    sequence: 14,
    question: "지우개와 복도의 길이를 재기 편한 단위는 무엇일까요?",
    directions: ["단위 카드를 알맞은 물건 자리로 옮기세요."],
    answer: noAnswer(),
    mathematicalDecision: "지우개처럼 작은 길이에는 cm, 복도처럼 긴 길이에는 m를 대응한다.",
    toolKey: "NO04NT",
    variantIds: ["NO04NT-01", "NO04NT-03", "NO04NT-06"],
    semanticOperation: "숫자 카드와 단위 표기를 한 그룹으로 움직여 두 대상에 맞춘다.",
    initialState: { targets: ["지우개", "복도"], unitMatches: [] },
    targetState: { unitMatches: [{ target: "지우개", unit: "cm" }, { target: "복도", unit: "m" }] },
    invariant: "측정 단위는 대상의 실제 크기에 맞아야 한다.",
    movableUnits: [
      nativeGroup(14, "distractor-mm", 2, "비교할 mm 단위 카드"),
      nativeGroup(14, "unit-cm", 2, "지우개 길이에 알맞은 cm 단위 카드"),
      nativeGroup(14, "distractor-km", 2, "비교할 km 단위 카드"),
      nativeGroup(14, "unit-m", 2, "복도 길이에 알맞은 m 단위 카드")
    ],
    rejectableUnitIds: ["activity-14-distractor-mm", "activity-14-distractor-km"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "단위 카드",
      sourcePurpose: "숫자와 단위가 한 덩어리인 카드를 준비한다.",
      constructionLabel: "지우개 · 복도",
      constructionPurpose: "각 대상에 알맞은 단위 카드를 놓는다."
    },
    supportingToolKey: "NO01SC",
    supportingVariantIds: ["NO01SC-01"]
  },
  {
    sequence: 15,
    question: "단추의 두께와 도시 사이 거리를 재기 편한 단위는 무엇일까요?",
    directions: ["단위 카드를 알맞은 대상 자리로 옮기세요."],
    answer: noAnswer(),
    mathematicalDecision: "매우 작은 두께에는 mm, 매우 먼 거리에는 km를 대응한다.",
    toolKey: "NO04NT",
    variantIds: ["NO04NT-03", "NO04NT-06"],
    semanticOperation: "숫자 카드와 단위 표기를 한 그룹으로 움직여 두 대상에 맞춘다.",
    initialState: { targets: ["단추", "도시 사이"], unitMatches: [] },
    targetState: { unitMatches: [{ target: "단추", unit: "mm" }, { target: "도시 사이", unit: "km" }] },
    invariant: "측정 단위는 대상의 실제 크기에 맞아야 한다.",
    movableUnits: [
      nativeGroup(15, "distractor-cm", 2, "비교할 cm 단위 카드"),
      nativeGroup(15, "unit-mm", 2, "단추 두께에 알맞은 mm 단위 카드"),
      nativeGroup(15, "distractor-m", 2, "비교할 m 단위 카드"),
      nativeGroup(15, "unit-km", 2, "도시 사이 거리에 알맞은 km 단위 카드")
    ],
    rejectableUnitIds: ["activity-15-distractor-cm", "activity-15-distractor-m"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "단위 카드",
      sourcePurpose: "숫자와 단위가 한 덩어리인 카드를 준비한다.",
      constructionLabel: "단추 · 도시 사이",
      constructionPurpose: "각 대상에 알맞은 단위 카드를 놓는다."
    },
    supportingToolKey: "NO01SC",
    supportingVariantIds: ["NO01SC-01"]
  },
  {
    sequence: 16,
    question: "3m는 몇 cm일까요?",
    directions: ["100cm 묶음을 골라 3m가 되게 옮기세요."],
    answer: noAnswer(),
    mathematicalDecision: "1m와 같은 100cm를 세 번 모아 300cm로 바꾼다.",
    toolKey: "NO04NT",
    variantIds: ["NO04NT-01"],
    semanticOperation: "미리 그룹화한 100cm 카드 세 개를 construction area에 모은다.",
    initialState: { meters: 3, hundredCentimeterGroupsAvailable: 4, hundredCentimeterGroupsPlaced: 0 },
    targetState: { hundredCentimeterGroupsPlaced: 3, centimeters: 300 },
    invariant: "1m = 100cm",
    movableUnits: repeatedGroups(16, "hundred-cm", 4, 5, "100cm 묶음"),
    rejectableUnitIds: ["activity-16-hundred-cm-4"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "100cm 묶음",
      sourcePurpose: "필요한 수를 고를 수 있도록 100cm 묶음을 준비한다.",
      constructionLabel: "cm로 바꾸기",
      constructionPurpose: "100cm 묶음을 세 번 모아 300cm를 만든다."
    },
    supportingToolKey: "NO01SC",
    supportingVariantIds: ["NO01SC-01"]
  },
  {
    sequence: 17,
    question: "241을 세 번 모으면 모두 얼마일까요?",
    directions: ["부분곱 카드를 골라 아래 칸으로 옮겨 모으세요."],
    answer: noAnswer(),
    mathematicalDecision: "241 세 벌의 백·십·일을 각각 모아 7백 2십 3으로 합친다.",
    toolKey: "NO04PD",
    variantIds: ["NO04PD-03", "NO04PD-04", "NO04PD-05"],
    semanticOperation: "부분곱 600·120·3을 나타내는 place-value group을 같은 자릿값에 맞춰 합친다.",
    initialState: { candidatePartials: [600, 30, 120, 3], selectedPartials: [], combined: null },
    targetState: { hundreds: 7, tens: 2, ones: 3, combined: 723 },
    invariant: "200×3, 40×3, 1×3을 더하면 241×3과 같다.",
    movableUnits: [
      stageNativeGroup(17, "partial-600", 8, "200×3을 나타내는 600 모형"),
      stageNativeGroup(17, "partial-30", 5, "일의 자리 1을 십으로 본 30 모형"),
      stageNativeGroup(17, "partial-120", 5, "40×3을 나타내는 120 모형"),
      stageNativeGroup(17, "partial-3", 5, "1×3을 나타내는 3 모형")
    ],
    rejectableUnitIds: ["activity-17-partial-30"],
    workbench: {
      variant: "single-native-workbench",
      label: "부분곱 모형",
      purpose: "필요한 부분곱을 골라 같은 자릿값에 맞춰 합친다."
    }
  },
  {
    sequence: 18,
    question: "213을 세 번 모으면 모두 얼마일까요?",
    directions: ["부분곱 카드를 골라 아래 칸으로 옮겨 모으세요."],
    answer: noAnswer(),
    mathematicalDecision: "213 세 벌의 백·십·일을 각각 모아 6백 3십 9로 합친다.",
    toolKey: "NO04PD",
    variantIds: ["NO04PD-03", "NO04PD-04", "NO04PD-05"],
    semanticOperation: "부분곱 600·30·9를 나타내는 place-value group을 같은 자릿값에 맞춰 합친다.",
    initialState: { candidatePartials: [3, 600, 30, 9], selectedPartials: [], combined: null },
    targetState: { hundreds: 6, tens: 3, ones: 9, combined: 639 },
    invariant: "200×3, 10×3, 3×3을 더하면 213×3과 같다.",
    movableUnits: [
      stageNativeGroup(18, "partial-3", 5, "일의 자리 3을 한 번만 센 3 모형"),
      stageNativeGroup(18, "partial-600", 8, "200×3을 나타내는 600 모형"),
      stageNativeGroup(18, "partial-30", 5, "10×3을 나타내는 30 모형"),
      stageNativeGroup(18, "partial-9", 11, "3×3을 나타내는 9 모형")
    ],
    rejectableUnitIds: ["activity-18-partial-3"],
    workbench: {
      variant: "single-native-workbench",
      label: "부분곱 모형",
      purpose: "필요한 부분곱을 골라 같은 자릿값에 맞춰 합친다."
    }
  },
  {
    sequence: 19,
    question: "32×14의 값은 얼마일까요?",
    directions: ["부분곱 카드를 골라 아래 칸으로 옮겨 모으세요."],
    answer: noAnswer(),
    mathematicalDecision: "32×10과 32×4의 두 부분곱을 자릿값에 맞게 더해 448을 결정한다.",
    toolKey: "NO04PD",
    variantIds: ["NO04PD-03", "NO04PD-04", "NO04PD-05"],
    semanticOperation: "미리 그룹화한 두 부분곱의 자릿값 모형을 한 construction area에 합친다.",
    initialState: { candidatePartials: [320, 32, 128], selectedPartials: [], combined: null },
    targetState: { hundreds: 4, tens: 4, ones: 8, combined: 448 },
    invariant: "32×14 = 32×10 + 32×4",
    movableUnits: [
      stageNativeGroup(19, "partial-320", 7, "32×10을 나타내는 320 모형"),
      stageNativeGroup(19, "partial-32", 7, "14의 십 자릿값을 놓친 32 모형"),
      stageNativeGroup(19, "partial-128", 13, "32×4를 나타내는 128 모형")
    ],
    rejectableUnitIds: ["activity-19-partial-32"],
    workbench: {
      variant: "single-native-workbench",
      label: "부분곱 모형",
      purpose: "필요한 부분곱을 골라 같은 자릿값에 맞춰 합친다."
    }
  },
  {
    sequence: 20,
    question: "구슬 28개를 7개씩 묶으면 몇 묶음일까요?",
    directions: ["7개 묶음을 옮겨 모두 28개가 되게 하세요."],
    answer: noAnswer(),
    mathematicalDecision: "7개짜리 묶음이 네 번 모여 28개가 됨을 결정한다.",
    toolKey: "NO01SC",
    variantIds: ["NO01SC-01"],
    semanticOperation: "미리 그룹화한 7개 묶음을 construction area에 옮겨 28을 구성한다.",
    initialState: { groupSize: 7, availableGroups: 5, constructedGroups: 0 },
    targetState: { groupSize: 7, constructedGroups: 4, total: 28 },
    invariant: "전체 수 ÷ 한 묶음의 수 = 묶음 수",
    movableUnits: compactLabeledGroups(20, "seven-set", 5, 7, "7개짜리 구슬 묶음"),
    rejectableUnitIds: ["activity-20-seven-set-5"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "7개 묶음",
      sourcePurpose: "한 번에 움직이는 7개 묶음을 준비한다.",
      constructionLabel: "28개 만들기",
      constructionPurpose: "필요한 묶음만 옮겨 28개를 만든다."
    }
  },
  {
    sequence: 21,
    question: "17÷5의 몫과 나머지는 얼마일까요?",
    directions: ["모형을 다섯 칸에 한 개씩 옮기고 남은 모형은 남김 칸에 두세요."],
    answer: noAnswer(),
    mathematicalDecision: "17개를 5개의 같은 몫으로 나누어 몫 3과 나머지 2를 결정한다.",
    toolKey: "NO01SC",
    variantIds: ["NO01SC-01"],
    semanticOperation: "독립 모형 17개를 다섯 몫 영역과 나머지 영역에 분배한다.",
    initialState: { total: 17, divisor: 5, distributed: [0, 0, 0, 0, 0], remainder: 0 },
    targetState: { distributed: [3, 3, 3, 3, 3], quotient: 3, remainder: 2 },
    invariant: "17 = 5×몫 + 나머지이고 나머지는 5보다 작다.",
    movableUnits: [independentSet(21, "counters", 17, "나눌 모형 17개")],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "모형 17개",
      sourcePurpose: "아직 나누지 않은 모형을 모아 둔다.",
      constructionLabel: "5칸 · 남김 칸",
      constructionPurpose: "다섯 칸을 같게 채우고 남은 모형을 구분한다."
    }
  },
  {
    sequence: 22,
    question: "38÷6=6…2가 맞는지 어떻게 확인할 수 있을까요?",
    directions: ["묶음과 낱개를 골라 모두 38이 되게 놓으세요."],
    answer: noAnswer(),
    mathematicalDecision: "6개씩 6묶음과 나머지 2를 합쳐 처음 수 38이 되는지 확인한다.",
    toolKey: "NO01SC",
    variantIds: ["NO01SC-01"],
    semanticOperation: "미리 그룹화한 6개 묶음과 독립 낱개를 construction area에 합친다.",
    initialState: { sixGroupsAvailable: 7, singlesAvailable: 4, constructed: 0 },
    targetState: { sixGroupsUsed: 6, singlesUsed: 2, total: 38 },
    invariant: "나누는 수 × 몫 + 나머지 = 처음 수",
    movableUnits: [
      ...compactLabeledGroups(22, "six-set", 7, 6, "6개짜리 묶음"),
      ...independentObjects(22, "single", 4, "나머지로 고를 낱개")
    ],
    rejectableUnitIds: [
      "activity-22-six-set-7",
      "activity-22-single-3",
      "activity-22-single-4"
    ],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "6개 묶음 · 낱개",
      sourcePurpose: "38을 만들 재료를 두 종류로 준비한다.",
      constructionLabel: "38 확인하기",
      constructionPurpose: "6묶음과 낱개 2개를 합쳐 38을 만든다."
    }
  },
  {
    sequence: 23,
    question: "원을 누르면 나타나는 중심 O와 원 위 점 사이의 선분은 무엇일까요?",
    directions: [
      "원을 누르세요. 원 위 검은 점을 옮겨 선분 길이를 바꾸세요."
    ],
    answer: compactChoice(["반지름", "지름", "원의 둘레"], 0),
    mathematicalDecision: "원의 크기가 달라져도 중심 O에서 원 위까지의 선분을 반지름으로 결정한다.",
    toolKey: "SM07CS",
    variantIds: ["SM07CS-01"],
    semanticOperation: "중심을 고정한 채 원 위 검은 점을 움직여 중심에서 원 위까지의 선분 길이를 바꾼다.",
    initialState: { center: "O", visibleRadiusSegments: 0, radiusCanvasUnits: 200, endpointRelation: "on-circle" },
    targetState: { center: "O", visibleRadiusSegments: 1, radiusCanvasUnits: 140, endpointRelation: "on-circle" },
    invariant: "원의 중심과 원 위의 한 점을 이은 선분은 반지름이다.",
    movableUnits: [singleObject(23, "중심과 반지름 선분이 보이는 원")],
    workbench: {
      variant: "single-native-workbench",
      label: "중심 O가 있는 원",
      purpose: "원의 크기를 바꾸며 중심에서 원 위까지를 살핀다."
    }
  },
  {
    sequence: 24,
    question: "반지름이 7cm인 원의 지름은 몇 cm일까요?",
    directions: [
      "원을 누르면 나타나는 두 점을 옮겨 중심 O의 양쪽에 놓으세요."
    ],
    answer: compactChoice(["7cm", "14cm", "21cm"], 1),
    mathematicalDecision: "지름이 중심을 지나 이어진 반지름 두 개이므로 14cm라고 결정한다.",
    toolKey: "SM07CS",
    variantIds: ["SM07CS-02"],
    semanticOperation: "원 위 두 조절점을 중심 O의 양쪽에 맞춰 지름 관계를 만든다.",
    initialState: { radiusCentimeters: 7, diameterAligned: false, angleDegrees: 90 },
    targetState: { radiusCentimeters: 7, diameterAligned: true, angleDegrees: 180, diameterCentimeters: 14 },
    invariant: "지름 = 반지름 × 2",
    movableUnits: [singleObject(24, "중심과 두 반지름이 있는 원")],
    workbench: {
      variant: "single-native-workbench",
      label: "반지름과 지름",
      purpose: "반지름 두 개가 이어진 지름을 만든다."
    }
  },
  {
    sequence: 25,
    question: "10칸 중 6칸을 색칠하면 색칠한 부분은 얼마일까요?",
    directions: [
      "분수 띠를 누르세요.",
      "나타난 오른쪽 점을 끌어 10칸 중 6칸이 색칠되게 하세요."
    ],
    answer: noAnswer(),
    mathematicalDecision: "전체 칸 수 10을 분모로, 색칠한 칸 수 6을 분자로 결정한다.",
    toolKey: "NO03FM",
    variantIds: [fractionVariantByDenominator[10]!],
    semanticOperation: "분수 띠에서 같은 1/10 조각의 보이는 수를 6으로 바꾼다.",
    initialState: { denominator: 10, numerator: 1 },
    targetState: { denominator: 10, numerator: 6 },
    invariant: "전체 칸 수는 분모, 색칠한 칸 수는 분자이다.",
    movableUnits: [singleObject(25, "전체가 10등분된 분수 띠")],
    workbench: {
      variant: "single-native-workbench",
      label: "분수 띠",
      purpose: "같은 1/10 조각 여섯 개를 나타낸다."
    }
  },
  {
    sequence: 26,
    question: "11/4를 대분수로 나타내면 얼마일까요?",
    directions: ["1/4 조각을 4개씩 채우고 남은 조각은 남김 칸에 두세요."],
    answer: noAnswer(),
    mathematicalDecision: "1/4 조각 11개에서 전체 두 개와 1/4 조각 세 개를 결정한다.",
    toolKey: "NO03FM",
    variantIds: [fractionVariantByDenominator[4]!],
    semanticOperation: "독립된 1/4 native 조각 11개를 전체 슬롯과 남김 슬롯에 배치한다.",
    initialState: { quarterParts: 11, completedWholes: 0, remainingParts: 11 },
    targetState: { completedWholes: 2, remainingParts: 3, mixedNumber: "2 3/4" },
    invariant: "분모만큼 모인 조각은 전체 1이고 남은 조각 수는 분자이다.",
    movableUnits: [independentSet(26, "quarter-parts", 11, "각각 움직이는 1/4 조각")],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "1/4 조각 11개",
      sourcePurpose: "아직 전체로 묶지 않은 1/4 조각을 준비한다.",
      constructionLabel: "전체 · 남김",
      constructionPurpose: "네 조각씩 전체를 채우고 남은 조각을 구분한다."
    }
  },
  {
    sequence: 27,
    question: "3/8과 7/8 중 더 큰 분수는 무엇일까요?",
    directions: [
      "두 분수 띠의 왼쪽 끝을 맞추세요.",
      "색칠된 길이가 더 긴 띠를 찾으세요."
    ],
    answer: compactChoice(["3/8", "7/8", "같아요"], 1),
    mathematicalDecision: "같은 전체를 8등분했을 때 조각을 더 많이 가진 7/8이 큼을 결정한다.",
    toolKey: "NO03FM",
    variantIds: [fractionVariantByDenominator[8]!],
    semanticOperation: "3/8 띠와 7/8 띠를 같은 시작점에 맞춰 색칠 길이를 비교한다.",
    initialState: { fractions: ["3/8", "7/8"], leftEdgesAligned: false },
    targetState: { fractions: ["3/8", "7/8"], leftEdgesAligned: true, greater: "7/8" },
    invariant: "분모가 같으면 분자가 큰 분수가 더 크다.",
    movableUnits: [
      singleObject(27, "3/8 분수 띠", "direct-drag"),
      {
        ...singleObject(27, "7/8 분수 띠", "direct-drag"),
        unitId: "activity-27-native-object-second",
        representation: { kind: "single-native-object", objectId: "mc30v2-27-native-second" }
      }
    ],
    workbench: {
      variant: "single-native-workbench",
      label: "두 분수 띠",
      purpose: "같은 시작점에서 색칠된 길이를 비교한다."
    }
  },
  {
    sequence: 28,
    question: "2L 250mL는 모두 몇 mL일까요?",
    directions: ["수 카드를 골라 +의 빈칸에 2L 250mL를 mL로 나타내세요."],
    answer: noAnswer(),
    mathematicalDecision: "2L를 2000mL로 바꾸고 250mL를 더해 2250mL를 결정한다.",
    toolKey: "NO04NT",
    variantIds: ["NO04NT-01", "NO04NT-03", "NO04NT-06"],
    semanticOperation: "미리 그룹화한 수 카드를 고정된 더하기 기호 사이에 순서대로 배치한다.",
    initialState: { cardGroups: ["1000", "500", "1000", "250"], fixedOperators: ["+", "+"], expression: [] },
    targetState: { expression: ["1000", "+", "1000", "+", "250"], totalMilliliters: 2250 },
    invariant: "1L = 1000mL이고 바꾼 mL를 남은 mL와 더한다.",
    movableUnits: [
      nativeGroup(28, "number-1000-a", 5, "첫 번째 1000 수 카드"),
      nativeGroup(28, "number-500", 4, "500 수 카드(L를 500mL로 잘못 바꾼 값)"),
      nativeGroup(28, "number-1000-b", 5, "두 번째 1000 수 카드"),
      nativeGroup(28, "number-250", 4, "250 수 카드")
    ],
    rejectableUnitIds: ["activity-28-number-500"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "수 카드",
      sourcePurpose: "mL 식에 필요한 수를 고를 수 있도록 카드를 준비한다.",
      constructionLabel: "mL 식 만들기",
      constructionPurpose: "2L와 250mL를 한 mL 식으로 만든다."
    },
    supportingToolKey: "NO01SC",
    supportingVariantIds: ["NO01SC-01"]
  },
  {
    sequence: 29,
    question: "3kg 40g은 모두 몇 g일까요?",
    directions: ["수 카드를 골라 +의 빈칸에 3kg 40g을 g으로 나타내세요."],
    answer: noAnswer(),
    mathematicalDecision: "3kg을 3000g으로 바꾸고 40g을 더해 3040g을 결정한다.",
    toolKey: "NO04NT",
    variantIds: ["NO04NT-01", "NO04NT-04", "NO04NT-05"],
    semanticOperation: "미리 그룹화한 수 카드를 고정된 더하기 기호 양쪽에 배치한다.",
    initialState: { cardGroups: ["3000", "300", "40"], fixedOperators: ["+"], expression: [] },
    targetState: { expression: ["3000", "+", "40"], totalGrams: 3040 },
    invariant: "1kg = 1000g이고 바꾼 g을 남은 g과 더한다.",
    movableUnits: [
      nativeGroup(29, "number-3000", 5, "3000 수 카드"),
      nativeGroup(29, "number-300", 4, "kg를 100g으로 잘못 바꾼 300 수 카드"),
      nativeGroup(29, "number-40", 3, "40 수 카드")
    ],
    rejectableUnitIds: ["activity-29-number-300"],
    workbench: {
      variant: "composition-workbench",
      sourceLabel: "수 카드",
      sourcePurpose: "g 식에 필요한 수를 고를 수 있도록 카드를 준비한다.",
      constructionLabel: "g 식 만들기",
      constructionPurpose: "3kg과 40g을 한 g 식으로 만든다."
    },
    supportingToolKey: "NO01SC",
    supportingVariantIds: ["NO01SC-01"]
  },
  {
    sequence: 30,
    question: "그림 한 개가 4명일 때 A반 5개와 B반 2개는 몇 명 차이일까요?",
    directions: [
      "A반을 누르면 나타나는 −를 눌러 B반과 같게 만드세요."
    ],
    answer: compactChoice(["3명", "8명", "12명"], 2),
    mathematicalDecision: "그림 수 차이 3에 범례 4명을 적용해 실제 차이 12명을 결정한다.",
    toolKey: "DP03PG",
    variantIds: ["DP03PG-01"],
    semanticOperation: "A반 범주의 그림 수를 줄여 B반과 같은 수가 될 때까지의 차이를 드러낸다.",
    initialState: { legendValue: 4, categories: { A: 5, B: 2 } },
    targetState: { legendValue: 4, categories: { A: 2, B: 2 }, removedPictures: 3, actualDifference: 12 },
    invariant: "그림 수의 차이 × 그림 한 개의 값 = 실제 수량의 차이",
    movableUnits: [singleObject(30, "A반과 B반을 비교하는 그림그래프", "native-click")],
    workbench: {
      variant: "single-native-workbench",
      label: "두 반 그림그래프",
      purpose: "그림 수의 차이를 범례가 있는 그래프에서 확인한다."
    }
  }
];

function regions(config: ActivityConfig): EduititHtml30ActivitySpecV2["layoutIntent"]["regions"] {
  if (config.workbench.variant === "single-native-workbench") {
    return [
      {
        regionId: `activity-${config.sequence}-native-stage`,
        role: "native-stage",
        studentLabel: config.workbench.label,
        purpose: config.workbench.purpose
      }
    ];
  }
  return [
    {
      regionId: `activity-${config.sequence}-source-tray`,
      role: "source-tray",
      studentLabel: config.workbench.sourceLabel,
      purpose: config.workbench.sourcePurpose
    },
    {
      regionId: `activity-${config.sequence}-construction-area`,
      role: "construction-area",
      studentLabel: config.workbench.constructionLabel,
      purpose: config.workbench.constructionPurpose
    }
  ];
}

function affordancePlan(
  source: CatalogAffordance,
  toolKey: string,
  variantIds: readonly string[],
  config: ActivityConfig
): EduititHtml30ActivitySpecV2["nativePlan"]["core"] {
  return {
    family: source.family,
    toolKey,
    variantIds: [...variantIds],
    supportState: source.supportState,
    evidenceIds: [...source.evidenceIds],
    semanticOperation: config.semanticOperation,
    configuredInitialState: config.initialState,
    targetState: config.targetState,
    invariant: config.invariant,
    primaryMathematicalStateChanges: true
  };
}

function decisionContract(
  config: ActivityConfig
): EduititHtml30ActivitySpecV2["nativePlan"]["decisionContract"] {
  const plausibleWrongPath = plausibleWrongPathBySequence[config.sequence];
  if (!plausibleWrongPath) {
    throw new Error(`eduitit-html30-v2:plausible-wrong-path-missing:${config.sequence}`);
  }
  if (config.rejectableUnitIds) {
    return {
      mode: "movable-subset",
      distinguishablePossibilityCount: Math.max(3, config.movableUnits.length),
      initiallyUnresolved: true,
      lockedAnswerExposed: false,
      plausibleWrongPath,
      selfVerification: config.invariant,
      suppliedMovableUnitCount: config.movableUnits.length,
      rejectableUnitIds: [...config.rejectableUnitIds],
      solutionUsesFewerMovableUnitsThanSupplied: true
    };
  }
  const wrongState = wrongStateBySequence[config.sequence];
  if (!wrongState) {
    throw new Error(`eduitit-html30-v2:wrong-state-witness-missing:${config.sequence}`);
  }
  return {
    mode: "native-state-space",
    distinguishablePossibilityCount: 3,
    initiallyUnresolved: true,
    lockedAnswerExposed: false,
    plausibleWrongPath,
    selfVerification: config.invariant,
    reachableStateWitnesses: [config.initialState, wrongState, config.targetState]
  };
}

export function buildEduititHtml30ActivitySpecsV2(
  harness: EduititHtml30PromptHarnessInput
): readonly EduititHtml30ActivitySpecV2[] {
  if (harness.entries.length !== 30 || configs.length !== 30) {
    throw new Error("eduitit-html30-v2:exact-30-required");
  }
  const expectedSequences = configs.map((config) => config.sequence);
  const plausibleWrongPathSequences = Object.keys(plausibleWrongPathBySequence)
    .map(Number)
    .sort((left, right) => left - right);
  const expectedStateSpaceSequences = configs
    .filter((config) => !config.rejectableUnitIds)
    .map((config) => config.sequence);
  const wrongStateSequences = Object.keys(wrongStateBySequence)
    .map(Number)
    .sort((left, right) => left - right);
  if (
    JSON.stringify(plausibleWrongPathSequences) !== JSON.stringify(expectedSequences) ||
    JSON.stringify(wrongStateSequences) !== JSON.stringify(expectedStateSpaceSequences)
  ) {
    throw new Error("eduitit-html30-v2:decision-witness-key-drift");
  }
  return configs.map((config, index) => {
    const source = harness.entries[index];
    if (!source || source.sequence !== config.sequence) {
      throw new Error(`eduitit-html30-v2:source-sequence-drift:${config.sequence}`);
    }
    const catalogAffordance = source.catalogBinding.affordanceFamily;
    const core = affordancePlan(
      catalogAffordance,
      config.toolKey,
      config.variantIds,
      config
    );
    const supporting =
      config.supportingToolKey && config.supportingVariantIds
        ? affordancePlan(
            catalogAffordance,
            config.supportingToolKey,
            config.supportingVariantIds,
            config
          )
        : undefined;
    const hasCompactAnswer = config.answer.kind !== "none";
    const candidate: EduititHtml30ActivitySpecV2 = {
      schemaVersion: EDUITIT_HTML30_V2_SCHEMA_VERSION,
      activityId: `eduitit-html30-v2-${String(config.sequence).padStart(2, "0")}`,
      activityVersion: "1.0.0",
      sequence: config.sequence,
      title: source.title,
      sourceBinding: {
        promptHarnessContentSha256: harness.contentSha256,
        promptId: source.promptId,
        lessonId: source.lessonId,
        slideHtmlSha256: source.sourceBinding.slideHtmlSha256,
        catalogEntryId: source.catalogBinding.catalogEntryId,
        catalogSnapshotSha256: source.catalogBinding.snapshotSha256,
        alignmentStatus: source.catalogBinding.alignmentStatus,
        catalogAffordance
      },
      structure: {
        oneProblem: true,
        displayedHeading: "question-only",
        topDirectionBlock: false,
        predictionRegion: false,
        firstAnswerRegion: false,
        revisionRegion: false,
        writtenReasonRegion: false,
        penRequired: false,
        coreEvidence: "native-construction"
      },
      learnerTask: {
        question: config.question,
        localDirections: [...config.directions],
        constructionStateStatesAnswer: !hasCompactAnswer,
        answer: config.answer
      },
      mathematicalDecision: config.mathematicalDecision,
      nativePlan: {
        placementMode: "generator-preplaced",
        studentToolMenuRequired: false,
        keyboardModifiers: [],
        core,
        ...(supporting ? { supporting } : {}),
        decisionContract: decisionContract(config),
        movableUnits: [...config.movableUnits]
      },
      layoutIntent: {
        viewportCssPx: { width: 1280, height: 800 },
        mathCanvasZoomPercent: 100,
        persistedCanvasScale: 3,
        problemCount: 1,
        variant: config.workbench.variant,
        compositionFlow:
          config.workbench.variant === "single-native-workbench"
            ? "not-applicable"
            : "reserve-first-adaptive-source-tray",
        questionBandRatio: 0.1,
        workbenchBandRatio: hasCompactAnswer ? 0.82 : 0.9,
        answerBandRatio: hasCompactAnswer ? 0.08 : 0,
        semanticGapCssPx: 16,
        workbenchClearanceCssPx: 24,
        nativeReservePolicy: "measure-initial-selected-manipulated-before-layout",
        containmentPolicy: "visual-and-interaction-bounds-inside-workbench",
        regions: regions(config)
      },
      lifecycle: {
        state: "offline-design-candidate",
        externalWriteAllowed: false,
        releaseQualified: false,
        blockers: [
          "student-one-screen-100-v1 profile is not pinned",
          "activity-specific native reserve is not pinned",
          "actual save/reopen and fresh visual canary are pending"
        ]
      }
    };
    return eduititHtml30ActivitySpecV2Schema.parse(candidate);
  });
}
