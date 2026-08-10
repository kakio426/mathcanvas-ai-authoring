import { z } from "zod";

export const MULTIPLICATION_ARRAY_ITEMS_PER_GROUP_RANGE = {
  min: 2,
  max: 6
} as const;
export const MULTIPLICATION_ARRAY_GROUP_COUNT_RANGE = {
  min: 2,
  max: 7
} as const;
export const MULTIPLICATION_ARRAY_MAX_TOTAL = 42 as const;
export const MULTIPLICATION_ARRAY_CONTEXT_OBJECT_IDS = [
  "ice-cream",
  "pencil",
  "baduk-stone",
  "sticker"
] as const;
export const MULTIPLICATION_ARRAY_CONTEXT_LABELS: Readonly<
  Record<(typeof MULTIPLICATION_ARRAY_CONTEXT_OBJECT_IDS)[number], string>
> = {
  "ice-cream": "아이스크림",
  pencil: "연필",
  "baduk-stone": "바둑돌",
  sticker: "붙임 딱지"
};
export const multiplicationArrayContextObjectIdSchema = z.enum(
  MULTIPLICATION_ARRAY_CONTEXT_OBJECT_IDS
);
export const multiplicationArrayMisconceptionIdSchema = z.literal(
  "groups-size-order"
);
export const multiplicationArrayTeacherIntentSchema = z
  .object({
    kind: z
      .literal("multiplication-array-v1")
      .describe("같은 수씩 묶인 곱셈 배열의 두 수 역할을 맞춥니다."),
    itemsPerGroup: z
      .number()
      .int()
      .min(MULTIPLICATION_ARRAY_ITEMS_PER_GROUP_RANGE.min)
      .max(MULTIPLICATION_ARRAY_ITEMS_PER_GROUP_RANGE.max)
      .describe("한 묶음 안에 들어가는 물건 수입니다."),
    groupCount: z
      .number()
      .int()
      .min(MULTIPLICATION_ARRAY_GROUP_COUNT_RANGE.min)
      .max(MULTIPLICATION_ARRAY_GROUP_COUNT_RANGE.max)
      .describe("같은 수씩 묶인 묶음의 개수입니다."),
    contextObjectId: multiplicationArrayContextObjectIdSchema.describe(
      "사물 맥락: ice-cream=아이스크림, pencil=연필, baduk-stone=바둑돌, sticker=붙임 딱지"
    ),
    misconceptionId: multiplicationArrayMisconceptionIdSchema.describe(
      "두 수의 역할을 바꾸어 생각하는 오개념은 groups-size-order만 지원합니다."
    )
  })
  .strict()
  .superRefine((value, context) => {
    if (value.itemsPerGroup === value.groupCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupCount"],
        message:
          "한 묶음의 수와 묶음 수가 같으면 두 수의 순서 오개념을 구별할 수 없습니다."
      });
    }
    if (value.itemsPerGroup * value.groupCount > MULTIPLICATION_ARRAY_MAX_TOTAL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupCount"],
        message: `전체 수는 ${MULTIPLICATION_ARRAY_MAX_TOTAL} 이하여야 합니다.`
      });
    }
  });

export type MultiplicationArrayContextObjectId = z.infer<
  typeof multiplicationArrayContextObjectIdSchema
>;
export type MultiplicationArrayTeacherIntent = z.infer<
  typeof multiplicationArrayTeacherIntentSchema
>;

export const DIVISION_GROUPING_TOTAL_RANGE = { min: 7, max: 42 } as const;
export const DIVISION_GROUPING_GROUP_SIZE_RANGE = { min: 2, max: 9 } as const;
export const DIVISION_GROUPING_QUOTIENT_RANGE = { min: 2, max: 7 } as const;
export const DIVISION_GROUPING_CONTEXT_OBJECT_IDS = [
  "candy",
  "pencil",
  "marble",
  "colored-paper"
] as const;
export const DIVISION_GROUPING_CONTEXT_LABELS: Readonly<
  Record<(typeof DIVISION_GROUPING_CONTEXT_OBJECT_IDS)[number], string>
> = {
  candy: "사탕",
  pencil: "연필",
  marble: "구슬",
  "colored-paper": "색종이"
};
export const divisionGroupingContextObjectIdSchema = z.enum(
  DIVISION_GROUPING_CONTEXT_OBJECT_IDS
);
export const divisionGroupingMisconceptionIdSchema = z.literal(
  "quotient-remainder-meaning"
);
export const divisionGroupingTeacherIntentSchema = z
  .object({
    kind: z
      .literal("division-grouping-v1")
      .describe("전체를 몇 개씩 묶는 포함제 나눗셈의 몫과 나머지를 맞춥니다."),
    totalCount: z
      .number()
      .int()
      .min(DIVISION_GROUPING_TOTAL_RANGE.min)
      .max(DIVISION_GROUPING_TOTAL_RANGE.max)
      .describe("묶기 전 물건의 전체 수입니다."),
    groupSize: z
      .number()
      .int()
      .min(DIVISION_GROUPING_GROUP_SIZE_RANGE.min)
      .max(DIVISION_GROUPING_GROUP_SIZE_RANGE.max)
      .describe("한 묶음에 넣을 물건 수입니다. 사람 수가 아닙니다."),
    contextObjectId: divisionGroupingContextObjectIdSchema.describe(
      "사물 맥락: candy=사탕, pencil=연필, marble=구슬, colored-paper=색종이. 사람에게 똑같이 나누는 맥락은 지원하지 않습니다."
    ),
    misconceptionId: divisionGroupingMisconceptionIdSchema.describe(
      "몫과 나머지가 각각 뜻하는 양을 확인하는 quotient-remainder-meaning만 지원합니다."
    )
  })
  .strict()
  .superRefine((value, context) => {
    const quotient = Math.floor(value.totalCount / value.groupSize);
    const remainder = value.totalCount % value.groupSize;
    if (
      quotient < DIVISION_GROUPING_QUOTIENT_RANGE.min ||
      quotient > DIVISION_GROUPING_QUOTIENT_RANGE.max
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalCount"],
        message: `만들어지는 묶음 수는 ${DIVISION_GROUPING_QUOTIENT_RANGE.min}~${DIVISION_GROUPING_QUOTIENT_RANGE.max}묶음이어야 합니다.`
      });
    }
    if (remainder === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalCount"],
        message: "몫과 나머지의 뜻을 확인하려면 나머지가 1 이상이어야 합니다."
      });
    }
  });

export type DivisionGroupingContextObjectId = z.infer<
  typeof divisionGroupingContextObjectIdSchema
>;
export type DivisionGroupingTeacherIntent = z.infer<
  typeof divisionGroupingTeacherIntentSchema
>;

export const FRACTION_COMPARISON_NUMERATOR_RANGE = { min: 1, max: 11 } as const;
export const FRACTION_COMPARISON_DENOMINATOR_RANGE = { min: 2, max: 12 } as const;
export const FRACTION_COMPARISON_NORMAL_DIFFERENCE_RANGE = {
  min: 0.15,
  max: 0.27
} as const;
export const fractionComparisonMisconceptionIdSchema = z.literal(
  "denominator-size-only"
);
export const fractionComparisonTeacherIntentSchema = z
  .object({
    kind: z
      .literal("fraction-comparison-v1")
      .describe("공통 분자가 같은 두 진분수의 크기 비교를 맞춥니다."),
    numerator: z
      .number()
      .int()
      .min(FRACTION_COMPARISON_NUMERATOR_RANGE.min)
      .max(FRACTION_COMPARISON_NUMERATOR_RANGE.max)
      .describe("왼쪽과 오른쪽 분수에 함께 쓰는 공통 분자입니다."),
    leftDenominator: z
      .number()
      .int()
      .min(FRACTION_COMPARISON_DENOMINATOR_RANGE.min)
      .max(FRACTION_COMPARISON_DENOMINATOR_RANGE.max)
      .describe("왼쪽 진분수의 분모입니다."),
    rightDenominator: z
      .number()
      .int()
      .min(FRACTION_COMPARISON_DENOMINATOR_RANGE.min)
      .max(FRACTION_COMPARISON_DENOMINATOR_RANGE.max)
      .describe("오른쪽 진분수의 분모이며 왼쪽 분모와 달라야 합니다."),
    misconceptionId: fractionComparisonMisconceptionIdSchema.describe(
      "분모가 클수록 분수도 크다고 생각하는 denominator-size-only만 지원합니다."
    )
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.numerator >= value.leftDenominator ||
      value.numerator >= value.rightDenominator
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leftNumerator"],
        message: "첫 버전은 두 진분수의 크기 비교만 지원합니다."
      });
    }
    if (value.leftDenominator === value.rightDenominator) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rightDenominator"],
        message: "두 분수의 분모는 달라야 합니다."
      });
    }
    const difference = Math.abs(
      value.numerator / value.leftDenominator -
        value.numerator / value.rightDenominator
    );
    if (
      difference < FRACTION_COMPARISON_NORMAL_DIFFERENCE_RANGE.min ||
      difference > FRACTION_COMPARISON_NORMAL_DIFFERENCE_RANGE.max
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rightDenominator"],
        message:
          "첫 버전은 눈으로 비교할 차이가 기본 난이도 범위인 분수 쌍만 지원합니다."
      });
    }
  });

export type FractionComparisonTeacherIntent = z.infer<
  typeof fractionComparisonTeacherIntentSchema
>;

export const teacherIntentSchema = z
  .union([
    multiplicationArrayTeacherIntentSchema,
    divisionGroupingTeacherIntentSchema,
    fractionComparisonTeacherIntentSchema
  ])
  .describe(
    "첫 문항에 실제 반영할 구조화 조건입니다. 지원되는 kind 하나를 고르고 필수 필드를 모두 채우며, 지원하지 않는 조건은 추측하지 않습니다."
  );
export type TeacherIntent = z.infer<typeof teacherIntentSchema>;
export type TeacherIntentKind = TeacherIntent["kind"];

export interface TeacherIntentFieldOption {
  readonly value: string;
  readonly label: string;
}

export interface TeacherIntentFieldDefinition {
  readonly key: string;
  readonly inputLabel: string;
  readonly control: "number" | "select" | "fixed";
  readonly section: "수학 조건" | "맥락과 오개념";
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly options?: readonly TeacherIntentFieldOption[];
}

export interface TeacherIntentCapability {
  readonly kind: TeacherIntentKind;
  readonly templateId: string;
  readonly manipulation: string;
  readonly standardCode: string;
  readonly recommendedGrade: number;
  readonly gradeRange: readonly [number, number];
  readonly maximumProblemCount: number;
  readonly defaultProblemCount: number;
  readonly denominatorRelation?: "mixed";
  readonly promptGuards?: readonly {
    readonly pattern: string;
    readonly message: string;
  }[];
  readonly title: string;
  readonly scopeNote: string;
  readonly defaultIntent: TeacherIntent;
  readonly fields: readonly TeacherIntentFieldDefinition[];
}

const contextOptions = (
  ids: readonly string[],
  labels: Readonly<Record<string, string>>
): readonly TeacherIntentFieldOption[] =>
  ids.map((value) => ({ value, label: labels[value] ?? value }));

export const TEACHER_INTENT_CAPABILITIES: readonly TeacherIntentCapability[] = [
  {
    kind: "multiplication-array-v1",
    templateId: "number.multiplication.group-array-meaning-v1",
    manipulation: "multiplication-array-choice-drag",
    standardCode: "[2수01-10]",
    recommendedGrade: 2,
    gradeRange: [1, 3],
    maximumProblemCount: 3,
    defaultProblemCount: 2,
    title: "곱셈 첫 문항 맞추기",
    scopeNote: "맞춤 조건은 첫 문항에만 적용합니다. 나머지 문항은 검증된 기본 구성으로 이어집니다.",
    defaultIntent: {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    },
    fields: [
      {
        key: "itemsPerGroup",
        inputLabel: "한 묶음의 수",
        control: "number",
        section: "수학 조건",
        unit: "개씩",
        min: MULTIPLICATION_ARRAY_ITEMS_PER_GROUP_RANGE.min,
        max: MULTIPLICATION_ARRAY_ITEMS_PER_GROUP_RANGE.max
      },
      {
        key: "groupCount",
        inputLabel: "묶음 수",
        control: "number",
        section: "수학 조건",
        unit: "묶음",
        min: MULTIPLICATION_ARRAY_GROUP_COUNT_RANGE.min,
        max: MULTIPLICATION_ARRAY_GROUP_COUNT_RANGE.max
      },
      {
        key: "contextObjectId",
        inputLabel: "사물 맥락",
        control: "select",
        section: "맥락과 오개념",
        options: contextOptions(
          MULTIPLICATION_ARRAY_CONTEXT_OBJECT_IDS,
          MULTIPLICATION_ARRAY_CONTEXT_LABELS
        )
      },
      {
        key: "misconceptionId",
        inputLabel: "확인할 오개념",
        control: "fixed",
        section: "맥락과 오개념",
        options: [{ value: "groups-size-order", label: "두 수의 뜻 바꾸기" }]
      }
    ]
  },
  {
    kind: "division-grouping-v1",
    templateId: "number.division.quotient-remainder.claim-evidence-v1",
    manipulation: "claim-evidence-revision-drag",
    standardCode: "[4수01-06]",
    recommendedGrade: 3,
    gradeRange: [3, 4],
    maximumProblemCount: 1,
    defaultProblemCount: 1,
    title: "나눗셈 첫 문항 맞추기",
    scopeNote: "맞춤 조건은 첫 문항에 적용하며, 전체를 몇 개씩 묶는 포함제 상황만 정확히 맞춥니다. 사람 수로 똑같이 나누는 상황은 아직 지원하지 않습니다.",
    promptGuards: [
      {
        pattern:
          "(?:\\d+\\s*명에게|사람들에게|똑같이\\s*나누|같은\\s*수로\\s*나누|공평하게\\s*나누)",
        message:
          "현재 나눗셈 맞춤은 전체를 몇 개씩 묶는 상황만 지원합니다. 사람 수로 똑같이 나누는 요청은 조건을 빼거나 몇 개씩 묶는 상황으로 바꿔 주세요."
      }
    ],
    defaultIntent: {
      kind: "division-grouping-v1",
      totalCount: 23,
      groupSize: 4,
      contextObjectId: "candy",
      misconceptionId: "quotient-remainder-meaning"
    },
    fields: [
      {
        key: "totalCount",
        inputLabel: "전체 수",
        control: "number",
        section: "수학 조건",
        unit: "개",
        min: DIVISION_GROUPING_TOTAL_RANGE.min,
        max: DIVISION_GROUPING_TOTAL_RANGE.max
      },
      {
        key: "groupSize",
        inputLabel: "한 묶음의 수",
        control: "number",
        section: "수학 조건",
        unit: "개씩",
        min: DIVISION_GROUPING_GROUP_SIZE_RANGE.min,
        max: DIVISION_GROUPING_GROUP_SIZE_RANGE.max
      },
      {
        key: "contextObjectId",
        inputLabel: "사물 맥락",
        control: "select",
        section: "맥락과 오개념",
        options: contextOptions(
          DIVISION_GROUPING_CONTEXT_OBJECT_IDS,
          DIVISION_GROUPING_CONTEXT_LABELS
        )
      },
      {
        key: "misconceptionId",
        inputLabel: "확인할 오개념",
        control: "fixed",
        section: "맥락과 오개념",
        options: [
          {
            value: "quotient-remainder-meaning",
            label: "몫과 나머지의 뜻"
          }
        ]
      }
    ]
  },
  {
    kind: "fraction-comparison-v1",
    templateId: "fraction.compare.unlike-denominators.visual-v1",
    manipulation: "fraction-strip-common-start-drag",
    standardCode: "[6수01-07]",
    recommendedGrade: 5,
    gradeRange: [5, 6],
    maximumProblemCount: 6,
    defaultProblemCount: 4,
    denominatorRelation: "mixed",
    title: "분수 비교 첫 문항 맞추기",
    scopeNote: "맞춤 조건은 첫 문항에 적용하며, 공통 분자가 같은 두 진분수를 같은 전체의 분수 띠로 비교합니다.",
    defaultIntent: {
      kind: "fraction-comparison-v1",
      numerator: 3,
      leftDenominator: 4,
      rightDenominator: 5,
      misconceptionId: "denominator-size-only"
    },
    fields: [
      {
        key: "numerator",
        inputLabel: "공통 분자",
        control: "number",
        section: "수학 조건",
        min: FRACTION_COMPARISON_NUMERATOR_RANGE.min,
        max: FRACTION_COMPARISON_NUMERATOR_RANGE.max
      },
      {
        key: "leftDenominator",
        inputLabel: "왼쪽 분모",
        control: "number",
        section: "수학 조건",
        min: FRACTION_COMPARISON_DENOMINATOR_RANGE.min,
        max: FRACTION_COMPARISON_DENOMINATOR_RANGE.max
      },
      {
        key: "rightDenominator",
        inputLabel: "오른쪽 분모",
        control: "number",
        section: "수학 조건",
        min: FRACTION_COMPARISON_DENOMINATOR_RANGE.min,
        max: FRACTION_COMPARISON_DENOMINATOR_RANGE.max
      },
      {
        key: "misconceptionId",
        inputLabel: "확인할 오개념",
        control: "fixed",
        section: "맥락과 오개념",
        options: [
          {
            value: "denominator-size-only",
            label: "분모가 크면 분수도 크다"
          }
        ]
      }
    ]
  }
] as const;

export function getTeacherIntentCapability(
  kind: TeacherIntentKind
): TeacherIntentCapability {
  const capability = TEACHER_INTENT_CAPABILITIES.find(
    (candidate) => candidate.kind === kind
  );
  if (!capability) throw new Error(`teacher-intent-capability-missing:${kind}`);
  return capability;
}

export function findTeacherIntentCapabilityForRoute(input: {
  readonly manipulation: string;
  readonly standardCode: string;
}): TeacherIntentCapability | undefined {
  return TEACHER_INTENT_CAPABILITIES.find(
    (candidate) =>
      candidate.manipulation === input.manipulation &&
      candidate.standardCode === input.standardCode
  );
}

export function createDefaultTeacherIntent(kind: TeacherIntentKind): TeacherIntent {
  return { ...getTeacherIntentCapability(kind).defaultIntent } as TeacherIntent;
}

export function formatTeacherIntentFieldValue(
  intent: TeacherIntent,
  field: TeacherIntentFieldDefinition
): string {
  const value = (intent as unknown as Readonly<Record<string, unknown>>)[field.key];
  const option = field.options?.find((candidate) => candidate.value === value);
  if (option) return option.label;
  return `${String(value)}${field.unit ?? ""}`;
}

export function assertTeacherIntentCapabilityRegistry(): void {
  const kinds = new Set<string>();
  const routes = new Set<string>();
  const templates = new Set<string>();
  for (const capability of TEACHER_INTENT_CAPABILITIES) {
    const route = `${capability.manipulation}:${capability.standardCode}`;
    if (kinds.has(capability.kind)) {
      throw new Error(`teacher-intent-kind-duplicate:${capability.kind}`);
    }
    if (routes.has(route)) {
      throw new Error(`teacher-intent-route-duplicate:${route}`);
    }
    if (templates.has(capability.templateId)) {
      throw new Error(
        `teacher-intent-template-duplicate:${capability.templateId}`
      );
    }
    kinds.add(capability.kind);
    routes.add(route);
    templates.add(capability.templateId);

    const defaultIntent = teacherIntentSchema.parse(capability.defaultIntent);
    if (defaultIntent.kind !== capability.kind) {
      throw new Error(
        `teacher-intent-default-kind-mismatch:${capability.kind}`
      );
    }
    if (
      capability.defaultProblemCount < 1 ||
      capability.defaultProblemCount > capability.maximumProblemCount
    ) {
      throw new Error(
        `teacher-intent-default-problem-count-invalid:${capability.kind}`
      );
    }
    const fieldKeys = capability.fields.map((field) => field.key);
    if (new Set(fieldKeys).size !== fieldKeys.length) {
      throw new Error(`teacher-intent-field-duplicate:${capability.kind}`);
    }
    const intentKeys = Object.keys(defaultIntent).filter((key) => key !== "kind");
    if (
      [...fieldKeys].sort().join(":") !== [...intentKeys].sort().join(":")
    ) {
      throw new Error(
        `teacher-intent-field-coverage-mismatch:${capability.kind}`
      );
    }
    const values = defaultIntent as unknown as Readonly<Record<string, unknown>>;
    for (const field of capability.fields) {
      if (field.control !== "number") {
        if (!field.options?.some((option) => option.value === values[field.key])) {
          throw new Error(
            `teacher-intent-field-option-missing:${capability.kind}:${field.key}`
          );
        }
      }
    }
    for (const guard of capability.promptGuards ?? []) {
      try {
        new RegExp(guard.pattern, "u");
      } catch {
        throw new Error(
          `teacher-intent-prompt-guard-invalid:${capability.kind}`
        );
      }
    }
  }
}

assertTeacherIntentCapabilityRegistry();
