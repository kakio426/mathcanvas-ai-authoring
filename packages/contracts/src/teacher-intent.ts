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
    kind: z.literal("multiplication-array-v1"),
    itemsPerGroup: z
      .number()
      .int()
      .min(MULTIPLICATION_ARRAY_ITEMS_PER_GROUP_RANGE.min)
      .max(MULTIPLICATION_ARRAY_ITEMS_PER_GROUP_RANGE.max),
    groupCount: z
      .number()
      .int()
      .min(MULTIPLICATION_ARRAY_GROUP_COUNT_RANGE.min)
      .max(MULTIPLICATION_ARRAY_GROUP_COUNT_RANGE.max),
    contextObjectId: multiplicationArrayContextObjectIdSchema,
    misconceptionId: multiplicationArrayMisconceptionIdSchema
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
