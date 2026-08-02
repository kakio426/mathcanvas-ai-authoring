import {
  getActivitySupportState,
  type ActivitySupportState,
  type CurriculumRecord,
  type GenerationRequest
} from "@mathcanvas/contracts";
import {
  barGraphInterpretationRecord,
  clockReadingRecord,
  equalityRelationRecord,
  equivalentFractionRecord,
  lengthMeasurementRecord,
  multiplicationMeaningRecord,
  numberCompositionRecord,
  placeValueRecord,
  probabilityComparisonRecord,
  repeatingPatternRecord,
  sameDenominatorFractionOperationsRecord,
  timeDurationRecord,
  unlikeDenominatorComparisonRecord,
  unlikeDenominatorFractionOperationsRecord
} from "./data.js";
import {
  CLAIM_EVIDENCE_MANIPULATION,
  claimEvidenceActivityProfiles
} from "./activity-profiles.js";
import {
  FACTOR_PAIR_MANIPULATION,
  factorPairActivityProfile
} from "./factor-pair-profile.js";
import {
  PARTIAL_OPERATION_MANIPULATION,
  partialOperationActivityProfiles
} from "./partial-operation-profile.js";

export interface TeacherLearningNeed {
  id: string;
  label: string;
  description: string;
  promptDetail: string;
}

export interface TeacherActivityOption {
  id: string;
  label: string;
  description: string;
  manipulation: NonNullable<GenerationRequest["manipulation"]>;
  promptSeed: string;
  defaultProblemCount: 1 | 2 | 4;
  availableProblemCounts: readonly (1 | 2 | 4 | 6)[];
  learningNeeds: readonly TeacherLearningNeed[];
  availability: ActivitySupportState;
}

type TeacherActivityInput = Omit<TeacherActivityOption, "availability">;

/**
 * 공식 원문과 대조하지 않고 소주제 묶음에서 파생한 위치 문자열임을 나타낸다.
 * `sourceLocator`가 이 접두어로 시작하면 검증된 출처 위치가 아니다.
 */
export const UNVERIFIED_LOCATOR_PREFIX = "[원문 미대조]" as const;

export interface TeacherCurriculumStandard {
  standardCode: string;
  gradeBand: CurriculumRecord["gradeBand"];
  domain: CurriculumRecord["domain"];
  focusLabel: string;
  standardSummary: string;
  /**
   * `official-goal`: 사람이 공식 원문과 대조해 data.ts에 기록한 목표 문구.
   * `activity-profile-goal`: 활동 프로필이 제공한 목표 문구. 아직 원문 미대조.
   * `source-position`: 목표 문구 없이 소주제 위치만 아는 상태.
   * 뒤의 두 상태는 `sourceLocator`가 `UNVERIFIED_LOCATOR_PREFIX`로 시작한다.
   */
  summaryKind: "official-goal" | "activity-profile-goal" | "source-position";
  sourceLocator: string;
  learningMapTopicId: string;
  activities: readonly TeacherActivityOption[];
}

export interface TeacherTextbookUnit {
  id: string;
  curriculumVersion: "2022 개정";
  publisher: "비상교육";
  grade: 1 | 2 | 3 | 4 | 5 | 6;
  semester: 1 | 2;
  unitNumber: number;
  title: string;
  sourceUrl: string;
  standardCodes: readonly string[];
  activityIds: readonly string[];
}

function learningNeed(
  id: string,
  label: string,
  description: string,
  promptDetail: string
): TeacherLearningNeed {
  return { id, label, description, promptDetail };
}

function learningMapTopicId(
  code: string,
  gradeBand: CurriculumRecord["gradeBand"],
  domain: CurriculumRecord["domain"]
): string {
  const domainSlug = {
    "수와 연산": "number-operations",
    "변화와 관계": "change-relationships",
    "도형과 측정": "geometry-measurement",
    "자료와 가능성": "data-probability"
  }[domain];
  const standardSlug = code
    .replace("[", "s")
    .replace("수", "-")
    .replace("]", "");
  return `kr.mt.math.${domainSlug}.g${gradeBand}.s${standardSlug.slice(1)}.representation`;
}

function standard(
  record: CurriculumRecord,
  activities: readonly TeacherActivityInput[]
): TeacherCurriculumStandard {
  const locatorSegments = record.officialSource.locator
    .split(">")
    .map((segment) => segment.trim());
  return {
    standardCode: record.code,
    gradeBand: record.gradeBand,
    domain: record.domain,
    focusLabel: locatorSegments.at(-2) ?? record.domain,
    standardSummary: record.officialGoal,
    summaryKind: "official-goal",
    sourceLocator: record.officialSource.locator,
    learningMapTopicId: learningMapTopicId(
      record.code,
      record.gradeBand,
      record.domain
    ),
    activities: activities.map((activity) => ({
      ...activity,
      availability: "released"
    }))
  };
}

const supportedTeacherCurriculumCatalog: readonly TeacherCurriculumStandard[] = [
  standard(placeValueRecord, [
    {
      id: "place-value-exchange",
      label: "자릿값과 묶음의 관계",
      description: "낱개 10개를 한 묶음으로 바꾸며 자릿값을 확인해요.",
      manipulation: "place-value-ten-exchange-drag",
      promptSeed: "자릿값을 십 모형 10개와 백 모형의 교환으로 이해하는 활동",
      defaultProblemCount: 2,
      availableProblemCounts: [2],
      learningNeeds: [
        learningNeed("ten-for-one", "10개를 한 묶음으로 바꾸지 못해요", "낱개 10개와 바로 윗자리 한 묶음의 관계를 헷갈려요.", "10개씩 묶으면 바로 윗자리 한 묶음이 된다는 관계를 스스로 확인하게 한다."),
        learningNeed("same-digit", "같은 숫자의 값이 항상 같다고 생각해요", "숫자가 놓인 자리에 따라 값이 달라지는 것을 놓쳐요.", "같은 숫자도 놓인 자리에 따라 나타내는 값이 달라짐을 모형으로 비교하게 한다."),
        learningNeed("model-number", "수 모형과 숫자를 연결하기 어려워요", "모형은 세지만 수로 나타낼 때 자릿값을 바꾸어 써요.", "수 모형의 묶음과 각 자리 숫자를 서로 연결해 설명하게 한다.")
      ]
    }
  ]),
  standard(numberCompositionRecord, [
    {
      id: "make-ten",
      label: "합이 10이 되는 두 수",
      description: "여러 수 카드 중 두 장을 골라 10을 만드는 관계를 찾아요.",
      manipulation: "number-card-make-ten-drag",
      promptSeed: "수 카드 두 장으로 10을 만들고 가르기와 모으기 관계를 설명하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("ten-pair", "합이 10이 되는 두 수를 바로 찾기 어려워요", "한 수를 보고 10이 되기 위해 필요한 수를 떠올리지 못해요.", "한 수와 10 사이의 차이를 이용해 짝이 되는 수를 찾게 한다."),
        learningNeed("one-pair", "한 가지 조합만 찾고 멈춰요", "10을 만드는 여러 두 수를 체계적으로 찾지 못해요.", "한 수가 1씩 커질 때 다른 수가 어떻게 달라지는지 비교하게 한다."),
        learningNeed("composition-expression", "수 카드와 덧셈식을 연결하기 어려워요", "두 수를 고를 수 있지만 가르기와 모으기 관계를 식으로 나타내지 못해요.", "고른 두 수를 덧셈식과 가르기 모형으로 함께 나타내게 한다.")
      ]
    }
  ]),
  standard(multiplicationMeaningRecord, [
    {
      id: "multiplication-array",
      label: "묶음과 곱셈의 뜻",
      description: "배열과 같은 수씩 묶는 상황을 곱셈식으로 연결해요.",
      manipulation: "multiplication-array-choice-drag",
      promptSeed: "같은 수씩 묶인 배열에서 곱셈의 의미를 찾는 활동",
      defaultProblemCount: 2,
      availableProblemCounts: [2],
      learningNeeds: [
        learningNeed("groups-size", "묶음 수와 한 묶음의 수를 바꾸어 생각해요", "몇 묶음인지와 한 묶음에 몇 개인지를 구분하기 어려워요.", "묶음의 수와 한 묶음의 수가 각각 식의 어느 수인지 설명하게 한다."),
        learningNeed("addition-link", "덧셈과 곱셈을 연결하기 어려워요", "같은 수의 반복 덧셈이 왜 곱셈이 되는지 설명하지 못해요.", "배열을 반복 덧셈과 곱셈식으로 각각 나타내어 비교하게 한다."),
        learningNeed("array-expression", "배열을 보고 곱셈식을 만들기 어려워요", "전체 수만 세고 배열의 구조를 식에 사용하지 못해요.", "행과 열 중 한 기준을 정해 같은 수씩 묶어 곱셈식을 만들게 한다.")
      ]
    }
  ]),
  standard(repeatingPatternRecord, [
    {
      id: "repeating-pattern-unit",
      label: "반복되는 규칙의 단위",
      description: "무늬 전체가 아니라 되풀이되는 가장 작은 묶음을 찾아요.",
      manipulation: "pattern-block-repeat-unit-drag",
      promptSeed: "무늬 배열에서 반복되는 가장 작은 단위를 찾고 규칙을 설명하는 활동",
      defaultProblemCount: 2,
      availableProblemCounts: [2],
      learningNeeds: [
        learningNeed("next-only", "다음 무늬만 맞히고 규칙은 설명하지 못해요", "눈에 보이는 다음 모양은 찾지만 무엇이 반복되는지 말하지 못해요.", "다음 무늬를 고른 뒤 반복되는 묶음을 따로 표시하게 한다."),
        learningNeed("unit-too-large", "반복 단위를 너무 크게 잡아요", "한 번 더 반복되는 부분까지 단위에 포함해요.", "같은 배열을 만드는 가장 작은 반복 묶음인지 비교하게 한다."),
        learningNeed("position-rule", "멀리 있는 위치의 무늬를 찾기 어려워요", "처음부터 하나씩 세지 않으면 특정 위치의 무늬를 알지 못해요.", "반복 단위의 길이를 이용해 특정 위치의 무늬를 판단하게 한다.")
      ]
    }
  ]),
  standard(clockReadingRecord, [
    {
      id: "clock-hour-boundary",
      label: "시곗바늘과 시각 읽기",
      description: "긴바늘과 짧은바늘의 위치를 함께 보고 시각을 읽어요.",
      manipulation: "clock-hour-hand-boundary-drag",
      promptSeed: "시계를 보고 몇 시 몇 분인지 읽고 두 바늘의 역할을 설명하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("hand-role", "긴바늘과 짧은바늘의 역할을 바꾸어 읽어요", "어느 바늘이 시와 분을 나타내는지 헷갈려요.", "각 바늘이 가리키는 눈금과 읽는 단위를 연결하게 한다."),
        learningNeed("hour-between", "짧은바늘이 두 수 사이에 있을 때 헷갈려요", "몇 분이 지나면 짧은바늘도 움직인다는 점을 놓쳐요.", "짧은바늘이 이미 지난 시를 기준으로 시각을 읽게 한다."),
        learningNeed("minute-scale", "분 눈금을 1분씩 세지 못해요", "숫자 사이의 작은 눈금과 5분 간격을 연결하기 어려워요.", "큰 숫자와 5분 간격을 이용해 분을 확인하게 한다.")
      ]
    }
  ]),
  standard(timeDurationRecord, [
    {
      id: "elapsed-time",
      label: "시각 사이의 걸린 시간",
      description: "두 시계를 비교해 몇 시간 몇 분이 지났는지 찾아요.",
      manipulation: "elapsed-time-clock-pair-drag",
      promptSeed: "두 시각 사이에 걸린 시간을 시간과 분의 관계로 구하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("subtract-digits", "시와 분을 숫자처럼 바로 빼요", "60분이 1시간이라는 관계를 사용하지 않고 각 숫자만 빼요.", "1시간을 60분으로 바꾸어 시간의 흐름을 구간으로 나타내게 한다."),
        learningNeed("cross-hour", "시간을 넘어가는 경우를 어려워해요", "정각을 지날 때 남은 분과 지난 분을 연결하지 못해요.", "시작 시각에서 다음 정각까지와 그 뒤 시간을 나누어 확인하게 한다."),
        learningNeed("time-vs-clock", "시각과 시간의 뜻을 섞어 써요", "몇 시인지와 얼마나 걸렸는지를 같은 말로 표현해요.", "시작·끝 시각과 그 사이에 걸린 시간을 서로 다른 단위로 말하게 한다.")
      ]
    }
  ]),
  standard(lengthMeasurementRecord, [
    {
      id: "broken-ruler-length",
      label: "눈금 사이의 길이",
      description: "0이 아닌 눈금에서 시작해도 단위가 몇 번 들어가는지 확인해요.",
      manipulation: "length-unit-iteration-drag",
      promptSeed: "자의 시작 눈금이 0이 아닐 때 1cm 단위를 반복하여 길이를 재는 활동",
      defaultProblemCount: 2,
      availableProblemCounts: [2],
      learningNeeds: [
        learningNeed("end-number", "자의 끝 숫자를 그대로 길이라고 생각해요", "시작 눈금이 0이 아닐 때도 끝 숫자만 읽어요.", "시작과 끝 눈금의 차이가 길이임을 1cm 단위로 확인하게 한다."),
        learningNeed("count-lines", "눈금 선의 개수를 세어요", "선과 선 사이의 간격이 길이의 단위라는 점을 놓쳐요.", "눈금 선이 아니라 1cm 간격이 몇 번 들어가는지 세게 한다."),
        learningNeed("unit-iteration", "1cm가 반복된다는 뜻을 이해하기 어려워요", "자를 읽을 수 있지만 길이 단위가 이어진다는 관계를 설명하지 못해요.", "1cm 조각을 빈틈없이 이어 붙여 측정값과 비교하게 한다.")
      ]
    }
  ]),
  standard(sameDenominatorFractionOperationsRecord, [
    {
      id: "same-denominator-sum",
      label: "분모가 같은 분수의 덧셈",
      description: "같은 크기의 단위를 모으며 계산 원리를 확인해요.",
      manipulation: "same-denominator-fraction-sum-drag",
      promptSeed: "분모가 같은 분수의 덧셈을 같은 크기의 분수 단위로 설명하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("add-denominator", "분모끼리도 더해요", "분수의 덧셈에서 분자와 분모를 모두 더하려고 해요.", "분모는 단위의 크기이고 분자는 그 단위의 개수임을 모형으로 확인하게 한다."),
        learningNeed("unit-meaning", "계산은 하지만 분모를 그대로 두는 까닭을 몰라요", "규칙은 기억하지만 같은 단위를 모은다는 뜻을 설명하지 못해요.", "같은 크기의 조각을 모을 때 단위의 이름은 변하지 않음을 설명하게 한다."),
        learningNeed("model-expression", "분수 모형과 계산식을 연결하기 어려워요", "그림에서 모은 양을 분수식으로 나타내지 못해요.", "모형의 조각 수와 식의 분자를 서로 연결해 쓰게 한다.")
      ]
    },
    {
      id: "same-denominator-over-one",
      label: "합이 1보다 큰 분수의 덧셈",
      description: "분수 조각을 모아 1을 만들고 남은 양을 함께 나타내요.",
      manipulation: "same-denominator-improper-sum-drag",
      promptSeed: "분모가 같은 분수의 합이 1보다 클 때 가분수와 대분수의 관계를 확인하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("stop-at-one", "합이 1을 넘으면 계산을 멈추거나 틀려요", "한 전체를 만들고도 남은 분수 조각을 함께 나타내지 못해요.", "한 전체를 만든 조각과 남은 조각을 나누어 세게 한다."),
        learningNeed("improper-mixed", "가분수와 대분수를 서로 연결하기 어려워요", "같은 양을 두 가지 분수 표현으로 나타내지 못해요.", "같은 모형을 가분수와 대분수로 각각 써서 비교하게 한다."),
        learningNeed("whole-unit", "전체가 바뀌면 분수의 크기도 같다고 생각해요", "분수 조각을 비교할 때 기준이 되는 전체를 확인하지 않아요.", "같은 전체를 기준으로 조각을 모아 1을 완성하게 한다.")
      ]
    }
  ]),
  standard(equalityRelationRecord, [
    {
      id: "balanced-equation",
      label: "등호 양쪽의 값",
      description: "여러 수 카드를 골라 양쪽 값이 같은 식을 만들어요.",
      manipulation: "number-card-balanced-equation-drag",
      promptSeed: "등호 양쪽의 값이 같은 식을 수 카드로 만들고 동치 관계를 설명하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("answer-sign", "등호를 ‘답이 나온다’는 기호로만 생각해요", "등호 왼쪽을 계산하고 오른쪽에는 답 하나만 와야 한다고 생각해요.", "등호가 양쪽 값이 같다는 관계를 나타냄을 여러 식으로 확인하게 한다."),
        learningNeed("left-to-right", "식은 왼쪽에서 오른쪽으로만 읽어야 한다고 생각해요", "수 하나가 등호 왼쪽에 오는 식을 낯설어해요.", "등호의 방향을 바꾸어도 두 양의 관계가 같음을 비교하게 한다."),
        learningNeed("surface-match", "같은 숫자가 보여야 두 식이 같다고 생각해요", "계산 결과가 같아도 식의 모양이 다르면 같지 않다고 판단해요.", "서로 다른 식을 계산하거나 모형으로 나타내어 양쪽 값을 비교하게 한다.")
      ]
    },
    {
      id: "balance-scale-sum",
      label: "양쪽 식의 균형",
      description: "접시저울처럼 양쪽에 같은 변화를 주어 관계를 확인해요.",
      manipulation: "balance-scale-sum-card-drag",
      promptSeed: "접시저울 모형으로 등호 양쪽의 합이 같아지는 관계를 찾는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("one-side-change", "한쪽만 바꾸어도 등식이 유지된다고 생각해요", "등호의 한쪽에 수를 더한 뒤 다른 쪽의 변화를 생각하지 않아요.", "한쪽의 변화가 균형에 어떤 영향을 주는지 저울로 확인하게 한다."),
        learningNeed("operation-balance", "양쪽에 같은 연산을 해야 하는 까닭을 몰라요", "규칙은 외우지만 값이 같은 관계를 유지한다는 뜻을 설명하지 못해요.", "양쪽에 같은 수를 더하거나 빼기 전후의 값을 비교하게 한다."),
        learningNeed("missing-number", "등식의 빈칸을 계산 순서로만 구해요", "양쪽의 값을 비교하지 않고 보이는 순서대로 계산해요.", "한쪽 값을 먼저 정한 뒤 균형을 맞추는 수를 찾게 한다.")
      ]
    }
  ]),
  standard(barGraphInterpretationRecord, [
    {
      id: "bar-graph-scale",
      label: "막대그래프의 눈금 한 칸",
      description: "자료와 눈금 간격을 비교해 한 칸이 나타내는 값을 정해요.",
      manipulation: "bar-graph-scale-unit-drag",
      promptSeed: "막대그래프에서 눈금 한 칸의 크기를 자료에 맞게 정하고 해석하는 활동",
      defaultProblemCount: 2,
      availableProblemCounts: [2],
      learningNeeds: [
        learningNeed("one-unit", "눈금 한 칸을 항상 1이라고 생각해요", "그래프의 자료 범위와 눈금 수를 확인하지 않고 한 칸을 1로 읽어요.", "전체 자료와 눈금 수를 비교해 한 칸의 값을 정하게 한다."),
        learningNeed("bar-height", "막대 높이만 비교하고 실제 값을 읽지 못해요", "어느 것이 더 큰지는 알지만 눈금값을 이용해 수로 해석하지 못해요.", "막대가 지난 눈금 수와 한 칸의 값을 곱해 자료값을 구하게 한다."),
        learningNeed("scale-choice", "자료에 알맞은 눈금 간격을 고르기 어려워요", "눈금이 부족하거나 지나치게 큰 간격을 선택해요.", "가장 큰 자료가 그래프 안에 들어가고 차이가 드러나는 눈금을 비교하게 한다.")
      ]
    }
  ]),
  standard(equivalentFractionRecord, [
    {
      id: "equivalent-fraction",
      label: "크기가 같은 분수",
      description: "같은 전체를 나눈 분수 띠를 겹쳐 크기가 같은 분수를 찾아요.",
      manipulation: "equivalent-fraction-strip-match",
      promptSeed: "분수 띠를 같은 시작점에서 비교하여 크기가 같은 분수와 통분의 원리를 찾는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4, 6],
      learningNeeds: [
        learningNeed("same-numbers", "분자와 분모가 달라지면 다른 크기라고 생각해요", "분수의 두 수가 다르면 같은 양일 수 없다고 판단해요.", "같은 전체의 분수 띠를 겹쳐 숫자가 달라도 길이가 같을 수 있음을 확인하게 한다."),
        learningNeed("multiply-both", "분자와 분모에 같은 수를 곱하는 까닭을 몰라요", "동치분수 만드는 절차는 알지만 단위가 어떻게 달라지는지 설명하지 못해요.", "한 조각을 같은 수의 더 작은 조각으로 나누어 전체 양이 유지됨을 설명하게 한다."),
        learningNeed("common-denominator", "통분한 뒤 원래 분수와 연결하지 못해요", "공통분모로 바꾼 수만 보고 같은 양이라는 점을 놓쳐요.", "통분 전후의 분수 띠 길이를 나란히 비교하게 한다.")
      ]
    }
  ]),
  standard(unlikeDenominatorComparisonRecord, [
    {
      id: "unlike-denominator-comparison",
      label: "분모가 다른 분수의 크기 비교",
      description: "같은 전체와 같은 시작점을 기준으로 두 분수의 크기를 비교해요.",
      manipulation: "fraction-strip-common-start-drag",
      promptSeed: "분모가 다른 두 분수의 크기를 같은 전체의 분수 띠로 비교하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4, 6],
      learningNeeds: [
        learningNeed("denominator-bigger", "분모가 크면 분수도 크다고 생각해요", "분모의 수만 비교하고 한 조각의 크기를 생각하지 않아요.", "같은 전체를 더 많이 나눌수록 한 조각은 작아짐을 분수 띠로 확인하게 한다."),
        learningNeed("numerator-only", "분자만 보고 크기를 비교해요", "분수 단위의 크기가 다른데도 조각 수만 비교해요.", "조각 수와 한 조각의 크기를 함께 고려해 두 분수 띠의 끝을 비교하게 한다."),
        learningNeed("different-whole", "서로 다른 전체를 기준으로 비교해요", "분수 모형의 전체 크기가 다른데도 색칠한 부분만 비교해요.", "같은 전체와 같은 시작점을 먼저 맞춘 뒤 크기를 판단하게 한다.")
      ]
    }
  ]),
  standard(unlikeDenominatorFractionOperationsRecord, [
    {
      id: "unlike-denominator-sum",
      label: "분모가 다른 분수의 덧셈",
      description: "분수 단위를 같게 바꾼 뒤 같은 크기의 조각을 모아요.",
      manipulation: "unlike-denominator-common-unit-drag",
      promptSeed: "분모가 다른 분수의 덧셈에서 통분하여 같은 분수 단위를 만드는 활동",
      defaultProblemCount: 2,
      availableProblemCounts: [2],
      learningNeeds: [
        learningNeed("add-both", "분자와 분모끼리 바로 더해요", "단위가 다른 분수 조각을 그대로 모으려고 해요.", "같은 크기의 분수 단위로 바꾼 뒤 조각 수를 더하게 한다."),
        learningNeed("why-common-unit", "통분은 하지만 왜 필요한지 설명하지 못해요", "계산 절차는 기억하지만 같은 단위끼리 더한다는 뜻을 놓쳐요.", "통분 전에는 조각 크기가 다르고 통분 후에는 같아짐을 모형으로 비교하게 한다."),
        learningNeed("model-calculation", "분수 모형과 계산 과정을 연결하기 어려워요", "통분한 수가 모형의 어느 조각을 뜻하는지 알지 못해요.", "통분 전후의 조각 수를 식의 분자와 분모에 연결해 설명하게 한다.")
      ]
    },
    {
      id: "unlike-denominator-difference",
      label: "분모가 다른 분수의 뺄셈",
      description: "분수 단위를 같게 바꾼 뒤 같은 크기의 조각을 덜어 내요.",
      manipulation: "unlike-denominator-common-unit-difference-drag",
      promptSeed: "분모가 다른 분수의 뺄셈에서 통분하여 같은 분수 단위를 만드는 활동",
      defaultProblemCount: 2,
      availableProblemCounts: [2],
      learningNeeds: [
        learningNeed("subtract-both", "분자와 분모끼리 바로 빼요", "크기가 다른 분수 단위를 그대로 빼려고 해요.", "같은 크기의 분수 단위로 바꾼 뒤 조각 수를 빼게 한다."),
        learningNeed("borrow-fraction", "빼는 수가 클 때 분수의 단위 바꾸기를 어려워해요", "한 전체를 같은 분수 단위로 바꾸어 사용하는 관계를 놓쳐요.", "한 전체를 공통분모의 조각으로 바꾸어 뺄 수 있는 양을 만들게 한다."),
        learningNeed("difference-meaning", "두 분수의 차를 모형으로 나타내기 어려워요", "계산값은 구하지만 무엇이 남은 양인지 설명하지 못해요.", "큰 분수에서 작은 분수만큼을 덜어 낸 뒤 남은 조각을 식과 연결하게 한다.")
      ]
    }
  ]),
  standard(probabilityComparisonRecord, [
    {
      id: "probability-comparison",
      label: "가능성이 더 큰 경우",
      description: "전체 공의 수와 원하는 공의 수를 함께 보고 가능성을 비교해요.",
      manipulation: "probability-fraction-strip-drag",
      promptSeed: "주머니 속 전체 공과 원하는 공의 비율을 나타내어 가능성을 비교하는 활동",
      defaultProblemCount: 4,
      availableProblemCounts: [2, 4],
      learningNeeds: [
        learningNeed("favorable-only", "원하는 공의 개수만 보고 판단해요", "전체 공의 수가 다른데도 원하는 공이 많은 쪽을 고르려고 해요.", "원하는 공의 수를 전체 공의 수와 함께 비율로 나타내어 비교하게 한다."),
        learningNeed("total-only", "전체가 많은 쪽이 항상 더 잘 나온다고 생각해요", "전체 수와 원하는 결과의 비율을 구분하지 못해요.", "같은 수의 원하는 공이 서로 다른 전체에 들어 있을 때 가능성을 비교하게 한다."),
        learningNeed("language-order", "가능성을 말로 순서 지어 표현하기 어려워요", "더 가능하다와 덜 가능하다를 수학적 근거 없이 사용해요.", "가능성의 크기를 비교한 뒤 전체 중 원하는 경우의 비율을 까닭으로 말하게 한다.")
      ]
    }
  ])
] as const;

function standardRange(
  bandNumber: 4 | 6,
  domainNumber: 1 | 2 | 3 | 4,
  first: number,
  last: number
): string[] {
  return Array.from(
    { length: last - first + 1 },
    (_, index) =>
      `[${bandNumber}수${String(domainNumber).padStart(2, "0")}-${String(first + index).padStart(2, "0")}]`
  );
}

function referenceGroup(
  gradeBand: "3-4" | "5-6",
  domain: TeacherCurriculumStandard["domain"],
  focusLabel: string,
  standardCodes: readonly string[]
): TeacherCurriculumStandard[] {
  return standardCodes.map((standardCode) => ({
    standardCode,
    gradeBand,
    domain,
    focusLabel,
    standardSummary: `교육과정에서 ‘${focusLabel}’ 소주제에 배치된 성취기준입니다.`,
    summaryKind: "source-position",
    // 이 위치 문자열은 소주제 묶음에서 코드 규칙으로 파생한 것이고,
    // 공식 PDF의 실제 쪽·항목과 대조한 결과가 아니다. 검증된 위치처럼
    // 읽히지 않도록 접두어로 상태를 함께 적는다.
    // 사람이 원문과 대조하면 data.ts의 CurriculumRecord로 옮기고
    // 그때부터 officialSource.locator(실제 쪽수)가 쓰인다.
    sourceLocator: `${UNVERIFIED_LOCATOR_PREFIX} 교육부 고시 제2022-33호 [별책 8] 수학과 교육과정 > 초등학교 ${gradeBand}학년군 > ${domain} > ${focusLabel} > ${standardCode}`,
    learningMapTopicId: learningMapTopicId(
      standardCode,
      gradeBand,
      domain
    ),
    activities: []
  }));
}

const curriculumReferences: readonly TeacherCurriculumStandard[] = [
  ...referenceGroup("3-4", "수와 연산", "다섯 자리 이상의 수", standardRange(4, 1, 1, 2)),
  ...referenceGroup("3-4", "수와 연산", "세 자리 수의 덧셈과 뺄셈", standardRange(4, 1, 3, 3)),
  ...referenceGroup("3-4", "수와 연산", "세 자리 수 범위의 곱셈", standardRange(4, 1, 4, 4)),
  ...referenceGroup("3-4", "수와 연산", "세 자리 수 범위의 나눗셈", standardRange(4, 1, 5, 7)),
  ...referenceGroup("3-4", "수와 연산", "자연수의 어림셈", standardRange(4, 1, 8, 8)),
  ...referenceGroup("3-4", "수와 연산", "분수", standardRange(4, 1, 9, 11)),
  ...referenceGroup("3-4", "수와 연산", "소수", standardRange(4, 1, 12, 14)),
  ...referenceGroup("3-4", "수와 연산", "분수의 덧셈과 뺄셈", standardRange(4, 1, 15, 15)),
  ...referenceGroup("3-4", "수와 연산", "소수의 덧셈과 뺄셈", standardRange(4, 1, 16, 16)),
  ...referenceGroup("3-4", "변화와 관계", "규칙을 수나 식으로 나타내기", standardRange(4, 2, 1, 2)),
  ...referenceGroup("3-4", "변화와 관계", "등호와 동치 관계", standardRange(4, 2, 3, 3)),
  ...referenceGroup("3-4", "도형과 측정", "도형의 기초", standardRange(4, 3, 1, 3)),
  ...referenceGroup("3-4", "도형과 측정", "평면도형의 이동", standardRange(4, 3, 4, 5)),
  ...referenceGroup("3-4", "도형과 측정", "원의 구성 요소", standardRange(4, 3, 6, 7)),
  ...referenceGroup("3-4", "도형과 측정", "여러 가지 삼각형", standardRange(4, 3, 8, 9)),
  ...referenceGroup("3-4", "도형과 측정", "여러 가지 사각형", standardRange(4, 3, 10, 10)),
  ...referenceGroup("3-4", "도형과 측정", "다각형", standardRange(4, 3, 11, 12)),
  ...referenceGroup("3-4", "도형과 측정", "시각과 시간", standardRange(4, 3, 13, 14)),
  ...referenceGroup("3-4", "도형과 측정", "길이", standardRange(4, 3, 15, 16)),
  ...referenceGroup("3-4", "도형과 측정", "들이", standardRange(4, 3, 17, 19)),
  ...referenceGroup("3-4", "도형과 측정", "무게", standardRange(4, 3, 20, 23)),
  ...referenceGroup("3-4", "도형과 측정", "각도", standardRange(4, 3, 24, 25)),
  ...referenceGroup("3-4", "자료와 가능성", "자료의 수집과 정리", standardRange(4, 4, 1, 3)),

  ...referenceGroup("5-6", "수와 연산", "자연수의 혼합 계산", standardRange(6, 1, 1, 1)),
  ...referenceGroup("5-6", "수와 연산", "수의 범위와 올림, 버림, 반올림", standardRange(6, 1, 2, 3)),
  ...referenceGroup("5-6", "수와 연산", "약수와 배수", standardRange(6, 1, 4, 5)),
  ...referenceGroup("5-6", "수와 연산", "분수의 덧셈과 뺄셈", standardRange(6, 1, 6, 8)),
  ...referenceGroup("5-6", "수와 연산", "분수의 곱셈과 나눗셈", standardRange(6, 1, 9, 11)),
  ...referenceGroup("5-6", "수와 연산", "분수와 소수의 관계", standardRange(6, 1, 12, 12)),
  ...referenceGroup("5-6", "수와 연산", "소수의 곱셈과 나눗셈", standardRange(6, 1, 13, 15)),
  ...referenceGroup("5-6", "변화와 관계", "대응 관계", standardRange(6, 2, 1, 1)),
  ...referenceGroup("5-6", "변화와 관계", "비와 비율", standardRange(6, 2, 2, 3)),
  ...referenceGroup("5-6", "변화와 관계", "비례식과 비례배분", standardRange(6, 2, 4, 5)),
  ...referenceGroup("5-6", "도형과 측정", "합동과 대칭", standardRange(6, 3, 1, 2)),
  ...referenceGroup("5-6", "도형과 측정", "직육면체와 정육면체", standardRange(6, 3, 3, 4)),
  ...referenceGroup("5-6", "도형과 측정", "각기둥과 각뿔", standardRange(6, 3, 5, 6)),
  ...referenceGroup("5-6", "도형과 측정", "원기둥, 원뿔, 구", standardRange(6, 3, 7, 8)),
  ...referenceGroup("5-6", "도형과 측정", "입체도형의 공간 감각", standardRange(6, 3, 9, 10)),
  ...referenceGroup("5-6", "도형과 측정", "다각형의 둘레와 넓이", standardRange(6, 3, 11, 14)),
  ...referenceGroup("5-6", "도형과 측정", "원주율과 원의 넓이", standardRange(6, 3, 15, 16)),
  ...referenceGroup("5-6", "도형과 측정", "입체도형의 겉넓이와 부피", standardRange(6, 3, 17, 19)),
  ...referenceGroup("5-6", "자료와 가능성", "자료의 수집과 정리", standardRange(6, 4, 1, 3)),
  ...referenceGroup("5-6", "자료와 가능성", "가능성", standardRange(6, 4, 4, 6))
] as const;

export const teacherCurriculumCatalog: readonly TeacherCurriculumStandard[] =
  [
    ...supportedTeacherCurriculumCatalog.filter(
      (standard) => standard.gradeBand === "1-2"
    ),
    ...curriculumReferences.map((reference) => {
      const supported = supportedTeacherCurriculumCatalog.find(
        (candidate) => candidate.standardCode === reference.standardCode
      );
      const claimEvidenceProfile = claimEvidenceActivityProfiles.find(
        (candidate) => candidate.standardCode === reference.standardCode
      );
      const factorPairProfile =
        factorPairActivityProfile.standardCode === reference.standardCode
          ? factorPairActivityProfile
          : undefined;
      const partialOperationProfile =
        partialOperationActivityProfiles.find(
          (candidate) => candidate.standardCode === reference.standardCode
        );
      const profileActivities: readonly TeacherActivityOption[] = [
        ...(claimEvidenceProfile
          ? [
              {
                id: claimEvidenceProfile.profileId,
                label: claimEvidenceProfile.activityLabel,
                description: claimEvidenceProfile.activityDescription,
                manipulation: CLAIM_EVIDENCE_MANIPULATION,
                promptSeed: claimEvidenceProfile.promptSeed,
                defaultProblemCount:
                  claimEvidenceProfile.presentation?.problemCount ?? 2,
                availableProblemCounts: [
                  claimEvidenceProfile.presentation?.problemCount ?? 2
                ],
                learningNeeds: claimEvidenceProfile.learningNeeds,
                availability:
                  getActivitySupportState(claimEvidenceProfile.activityId) ??
                  "verified"
              }
            ]
          : []),
        ...(factorPairProfile
          ? [
              {
                id: factorPairProfile.profileId,
                label: factorPairProfile.activityLabel,
                description: factorPairProfile.activityDescription,
                manipulation: FACTOR_PAIR_MANIPULATION,
                promptSeed: factorPairProfile.promptSeed,
                defaultProblemCount: 2 as const,
                availableProblemCounts: [2] as const,
                learningNeeds: factorPairProfile.learningNeeds,
                availability:
                  getActivitySupportState(factorPairProfile.activityId) ??
                  "verified"
              }
            ]
          : []),
        ...(partialOperationProfile
          ? [
              {
                id: partialOperationProfile.profileId,
                label: partialOperationProfile.activityLabel,
                description: partialOperationProfile.activityDescription,
                manipulation: PARTIAL_OPERATION_MANIPULATION,
                promptSeed: partialOperationProfile.promptSeed,
                defaultProblemCount: 2 as const,
                availableProblemCounts: [2] as const,
                learningNeeds: partialOperationProfile.learningNeeds,
                availability:
                  getActivitySupportState(partialOperationProfile.activityId) ??
                  "verified"
              }
            ]
          : [])
      ];
      const profileOfficialGoal =
        claimEvidenceProfile?.officialGoal ??
        factorPairProfile?.officialGoal ??
        partialOperationProfile?.officialGoal;
      return supported
        ? {
            ...reference,
            ...supported,
            focusLabel: reference.focusLabel,
            // 사람이 원문과 대조해 data.ts에 기록한 목표 문구가 이미 있으면
            // 활동 프로필의 미검증 문구로 덮어쓰지 않는다. 검토본이 우선이다.
            activities: [...supported.activities, ...profileActivities]
          }
        : {
            ...reference,
            ...(profileOfficialGoal
              ? {
                  standardSummary: profileOfficialGoal,
                  summaryKind: "activity-profile-goal" as const
                }
              : {}),
            activities: profileActivities
          };
    })
  ];

const textbookSources = {
  "1-1": "https://book.visang.com/books/info/5415",
  "1-2": "https://book.visang.com/books/info/5615",
  "2-1": "https://book.visang.com/books/info/5416",
  "2-2": "https://book.visang.com/books/info/5616",
  "3-1": "https://book.visang.com/books/info/5435",
  "3-2": "https://book.visang.com/books/info/5734",
  "4-1": "https://book.visang.com/books/info/5813",
  "4-2": "https://book.visang.com/books/info/5735",
  "5-1": "https://book.visang.com/books/info/5814",
  "5-2": "https://book.visang.com/books/info/5942",
  "6-1": "https://book.visang.com/books/info/5815",
  "6-2": "https://book.visang.com/books/info/5943"
} as const;

function textbookUnit(
  grade: TeacherTextbookUnit["grade"],
  semester: TeacherTextbookUnit["semester"],
  unitNumber: number,
  title: string,
  standardCodes: readonly string[] = [],
  activityIds: readonly string[] = []
): TeacherTextbookUnit {
  return {
    id: `${grade}-${semester}-${unitNumber}`,
    curriculumVersion: "2022 개정",
    publisher: "비상교육",
    grade,
    semester,
    unitNumber,
    title,
    sourceUrl: textbookSources[`${grade}-${semester}`],
    standardCodes,
    activityIds
  };
}

// 교과서의 실제 학년·학기·단원과 학년군 성취기준은 서로 다른 자료다.
// 아래 목록은 비상교육 2022 개정 교재 목차를 기준으로 하며, standardCodes에는
// standardCodes는 교육과정 연결, activityIds는 실제 생성까지 검증된 활동만 명시한다.
export const teacherTextbookUnits: readonly TeacherTextbookUnit[] = [
  textbookUnit(1, 1, 1, "9까지의 수"),
  textbookUnit(1, 1, 2, "여러 가지 모양"),
  textbookUnit(1, 1, 3, "덧셈과 뺄셈", ["[2수01-04]"], ["make-ten"]),
  textbookUnit(1, 1, 4, "비교하기"),
  textbookUnit(1, 1, 5, "50까지의 수"),
  textbookUnit(1, 2, 1, "100까지의 수"),
  textbookUnit(1, 2, 2, "덧셈과 뺄셈(1)"),
  textbookUnit(1, 2, 3, "모양과 시각"),
  textbookUnit(1, 2, 4, "덧셈과 뺄셈(2)"),
  textbookUnit(1, 2, 5, "규칙 찾기", ["[2수02-01]"], ["repeating-pattern-unit"]),
  textbookUnit(1, 2, 6, "덧셈과 뺄셈(3)"),

  textbookUnit(2, 1, 1, "세 자리 수", ["[2수01-02]"], ["place-value-exchange"]),
  textbookUnit(2, 1, 2, "여러 가지 도형"),
  textbookUnit(2, 1, 3, "덧셈과 뺄셈"),
  textbookUnit(2, 1, 4, "길이 재기", ["[2수03-10]"], ["broken-ruler-length"]),
  textbookUnit(2, 1, 5, "분류하기"),
  textbookUnit(2, 1, 6, "곱셈", ["[2수01-10]"], ["multiplication-array"]),
  textbookUnit(2, 2, 1, "네 자리 수"),
  textbookUnit(2, 2, 2, "곱셈구구"),
  textbookUnit(2, 2, 3, "길이 재기"),
  textbookUnit(2, 2, 4, "시각과 시간", ["[2수03-07]", "[2수03-08]"], ["clock-hour-boundary", "elapsed-time"]),
  textbookUnit(2, 2, 5, "표와 그래프"),
  textbookUnit(2, 2, 6, "규칙 찾기"),

  textbookUnit(3, 1, 1, "덧셈과 뺄셈", standardRange(4, 1, 3, 3)),
  textbookUnit(3, 1, 2, "평면도형", standardRange(4, 3, 1, 3)),
  textbookUnit(3, 1, 3, "나눗셈", standardRange(4, 1, 5, 5)),
  textbookUnit(3, 1, 4, "곱셈", standardRange(4, 1, 4, 4), ["partial-product"]),
  textbookUnit(3, 1, 5, "길이와 시간", [
    ...standardRange(4, 3, 13, 16)
  ]),
  textbookUnit(3, 1, 6, "분수와 소수", [
    ...standardRange(4, 1, 9, 10),
    ...standardRange(4, 1, 12, 13)
  ]),
  textbookUnit(3, 2, 1, "곱셈", standardRange(4, 1, 4, 4), ["partial-product"]),
  textbookUnit(3, 2, 2, "나눗셈", standardRange(4, 1, 5, 7), ["division-remainder", "partial-quotient"]),
  textbookUnit(3, 2, 3, "원", standardRange(4, 3, 6, 7)),
  textbookUnit(3, 2, 4, "분수", standardRange(4, 1, 9, 11)),
  textbookUnit(3, 2, 5, "들이와 무게", standardRange(4, 3, 17, 23)),
  textbookUnit(3, 2, 6, "그림그래프", standardRange(4, 4, 1, 1), ["picture-graph-key"]),

  textbookUnit(4, 1, 1, "큰 수", [
    ...standardRange(4, 1, 1, 2),
    ...standardRange(4, 1, 8, 8)
  ]),
  textbookUnit(4, 1, 2, "각도", standardRange(4, 3, 24, 25), ["angle-turn"]),
  textbookUnit(4, 1, 3, "곱셈과 나눗셈", standardRange(4, 1, 4, 7), ["partial-product", "partial-quotient"]),
  textbookUnit(4, 1, 4, "평면도형의 이동", standardRange(4, 3, 4, 5)),
  textbookUnit(4, 1, 5, "막대그래프", standardRange(4, 4, 1, 2), ["bar-graph-scale"]),
  textbookUnit(4, 1, 6, "규칙 찾기", standardRange(4, 2, 1, 3), ["balanced-equation", "balance-scale-sum"]),
  textbookUnit(4, 2, 1, "분수의 덧셈과 뺄셈", standardRange(4, 1, 15, 15), ["same-denominator-sum", "same-denominator-over-one"]),
  textbookUnit(4, 2, 2, "삼각형", standardRange(4, 3, 8, 9), ["triangle-classification"]),
  textbookUnit(4, 2, 3, "소수의 덧셈과 뺄셈", [
    ...standardRange(4, 1, 12, 14),
    ...standardRange(4, 1, 16, 16)
  ]),
  textbookUnit(4, 2, 4, "사각형", standardRange(4, 3, 10, 10)),
  textbookUnit(4, 2, 5, "꺾은선그래프", standardRange(4, 4, 2, 3)),
  textbookUnit(4, 2, 6, "다각형", standardRange(4, 3, 11, 12)),

  textbookUnit(5, 1, 1, "자연수의 혼합 계산", standardRange(6, 1, 1, 1), ["mixed-calculation-order"]),
  textbookUnit(5, 1, 2, "약수와 배수", standardRange(6, 1, 4, 5), ["factor-pair-array"]),
  textbookUnit(5, 1, 3, "대응 관계", standardRange(6, 2, 1, 1)),
  textbookUnit(5, 1, 4, "약분과 통분", standardRange(6, 1, 6, 7), ["equivalent-fraction", "unlike-denominator-comparison"]),
  textbookUnit(5, 1, 5, "분수의 덧셈과 뺄셈", standardRange(6, 1, 8, 8), ["unlike-denominator-sum", "unlike-denominator-difference"]),
  textbookUnit(5, 1, 6, "다각형의 둘레와 넓이", standardRange(6, 3, 11, 14)),
  textbookUnit(5, 2, 1, "수의 범위와 어림하기", standardRange(6, 1, 2, 3)),
  textbookUnit(5, 2, 2, "분수의 곱셈", standardRange(6, 1, 9, 9)),
  textbookUnit(5, 2, 3, "합동과 대칭", standardRange(6, 3, 1, 2), ["line-symmetry-distance"]),
  textbookUnit(5, 2, 4, "소수의 곱셈", standardRange(6, 1, 13, 13)),
  textbookUnit(5, 2, 5, "직육면체", standardRange(6, 3, 3, 4)),
  textbookUnit(5, 2, 6, "평균과 가능성", [
    ...standardRange(6, 4, 1, 1),
    ...standardRange(6, 4, 4, 6)
  ], ["probability-comparison"]),

  textbookUnit(6, 1, 1, "분수의 나눗셈", standardRange(6, 1, 10, 10)),
  textbookUnit(6, 1, 2, "각기둥과 각뿔", standardRange(6, 3, 5, 6)),
  textbookUnit(6, 1, 3, "소수의 나눗셈", standardRange(6, 1, 14, 14)),
  textbookUnit(6, 1, 4, "비와 비율", standardRange(6, 2, 2, 3), ["ratio-same-unit"]),
  textbookUnit(6, 1, 5, "여러 가지 그래프", standardRange(6, 4, 2, 3), ["graph-purpose"]),
  textbookUnit(6, 1, 6, "직육면체의 겉넓이와 부피", standardRange(6, 3, 17, 19)),
  textbookUnit(6, 2, 1, "분수의 나눗셈", [
    ...standardRange(6, 1, 10, 12)
  ]),
  textbookUnit(6, 2, 2, "소수의 나눗셈", standardRange(6, 1, 14, 15)),
  textbookUnit(6, 2, 3, "공간과 입체", standardRange(6, 3, 9, 10)),
  textbookUnit(6, 2, 4, "비례식과 비례배분", standardRange(6, 2, 4, 5)),
  textbookUnit(6, 2, 5, "원의 둘레와 넓이", standardRange(6, 3, 15, 16)),
  textbookUnit(6, 2, 6, "원기둥, 원뿔, 구", standardRange(6, 3, 7, 8))
] as const;

function assertTeacherTextbookCatalog(): void {
  const unitIds = new Set<string>();
  const standardCodes = new Set(
    teacherCurriculumCatalog.map((standard) => standard.standardCode)
  );

  for (const unit of teacherTextbookUnits) {
    if (unitIds.has(unit.id)) {
      throw new Error(`교과서 단원 ID가 중복되었습니다: ${unit.id}`);
    }
    unitIds.add(unit.id);
    for (const standardCode of unit.standardCodes) {
      if (!standardCodes.has(standardCode)) {
        throw new Error(`등록되지 않은 성취기준이 단원에 연결되었습니다: ${unit.id} ${standardCode}`);
      }
    }
    for (const activityId of unit.activityIds) {
      const owner = teacherCurriculumCatalog.find((standard) =>
        standard.activities.some((activity) => activity.id === activityId)
      );
      if (!owner || !unit.standardCodes.includes(owner.standardCode)) {
        throw new Error(`단원과 맞지 않는 활동이 연결되었습니다: ${unit.id} ${activityId}`);
      }
    }
  }

  for (const grade of [3, 4, 5, 6] as const) {
    for (const semester of [1, 2] as const) {
      const units = teacherTextbookUnits.filter(
        (unit) => unit.grade === grade && unit.semester === semester
      );
      const numbers = units.map((unit) => unit.unitNumber).sort((a, b) => a - b);
      if (units.length !== 6 || numbers.join(",") !== "1,2,3,4,5,6") {
        throw new Error(`${grade}학년 ${semester}학기 단원 편성을 확인해 주세요.`);
      }
    }
  }

  const upperGradeStandards = teacherCurriculumCatalog.filter(
    (standard) => standard.gradeBand === "3-4" || standard.gradeBand === "5-6"
  );
  const mappedStandardCodes = new Set(
    teacherTextbookUnits
      .filter((unit) => unit.grade >= 3)
      .flatMap((unit) => unit.standardCodes)
  );
  const unmapped = upperGradeStandards.filter(
    (standard) => !mappedStandardCodes.has(standard.standardCode)
  );
  if (upperGradeStandards.length !== 92 || unmapped.length > 0) {
    throw new Error(
      `3~6학년 성취기준 연결을 확인해 주세요: ${unmapped.map((standard) => standard.standardCode).join(", ")}`
    );
  }
}

assertTeacherTextbookCatalog();

export function findTeacherCurriculumStandard(
  standardCode: string
): TeacherCurriculumStandard | undefined {
  return teacherCurriculumCatalog.find(
    (candidate) => candidate.standardCode === standardCode
  );
}

export function findTeacherTextbookUnit(
  unitId: string
): TeacherTextbookUnit | undefined {
  return teacherTextbookUnits.find((candidate) => candidate.id === unitId);
}
