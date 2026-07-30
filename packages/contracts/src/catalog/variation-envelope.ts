import { z } from "zod";

const variationKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z][A-Za-z0-9]*$/);

export const variationTierSchema = z.enum(["T1", "T2"]);
export const variationValueSchema = z.union([
  z.string().min(1).max(80),
  z.number().int(),
  z.boolean()
]);

const integerKnobSchema = z
  .object({
    key: variationKeySchema,
    tier: variationTierSchema,
    kind: z.literal("bounded-integer"),
    min: z.number().int(),
    max: z.number().int(),
    default: z.number().int()
  })
  .strict();

const enumKnobSchema = z
  .object({
    key: variationKeySchema,
    tier: variationTierSchema,
    kind: z.literal("enum"),
    values: z.array(z.string().min(1).max(80)).min(1).max(32),
    default: z.string().min(1).max(80)
  })
  .strict();

export const variationKnobSchema = z.discriminatedUnion("kind", [
  integerKnobSchema,
  enumKnobSchema
]);

export const variationEnvelopeDeclarationSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    blueprintId: z.string().min(1).max(160),
    knobs: z.array(variationKnobSchema).max(8),
    pinned: z.record(variationValueSchema),
    expectedCombinationCount: z.number().int().min(1).max(256)
  })
  .strict()
  .superRefine((declaration, context) => {
    const keys = [
      ...declaration.knobs.map((knob) => knob.key),
      ...Object.keys(declaration.pinned)
    ];
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["knobs"],
        message: "variation key는 knob와 pinned 전체에서 유일해야 합니다."
      });
    }
    declaration.knobs.forEach((knob, index) => {
      const valid =
        knob.kind === "bounded-integer"
          ? knob.min <= knob.default &&
            knob.default <= knob.max &&
            knob.max - knob.min <= 255
          : new Set(knob.values).size === knob.values.length &&
            knob.values.includes(knob.default);
      if (!valid) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["knobs", index],
          message: "variation knob의 값과 기본값이 올바르지 않습니다."
        });
      }
    });
  });

export type VariationValue = z.infer<typeof variationValueSchema>;
export type VariationKnob = z.infer<typeof variationKnobSchema>;
export type VariationEnvelopeDeclaration = z.infer<
  typeof variationEnvelopeDeclarationSchema
>;
export type ResolvedVariation = Readonly<
  Record<string, VariationValue>
>;

function knobValues(knob: VariationKnob): VariationValue[] {
  if (knob.kind === "enum") return [...knob.values];
  return Array.from(
    { length: knob.max - knob.min + 1 },
    (_, index) => knob.min + index
  );
}

export function countVariationCombinations(
  declaration: VariationEnvelopeDeclaration
): number {
  return declaration.knobs.reduce(
    (count, knob) => count * knobValues(knob).length,
    1
  );
}

export function defineVariationEnvelope(
  input: z.input<typeof variationEnvelopeDeclarationSchema>
): VariationEnvelopeDeclaration {
  const declaration = variationEnvelopeDeclarationSchema.parse(input);
  const count = countVariationCombinations(declaration);
  if (count !== declaration.expectedCombinationCount) {
    throw new Error(
      `variation-count-mismatch:${declaration.blueprintId}:${count}:expected-${declaration.expectedCombinationCount}`
    );
  }
  return declaration;
}

export function resolveDeclaredVariation(
  declaration: VariationEnvelopeDeclaration,
  input: unknown
): ResolvedVariation {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error(
      `variation-input-invalid:${declaration.blueprintId}`
    );
  }
  const requested = input as Record<string, unknown>;
  const knownKeys = new Set([
    ...declaration.knobs.map((knob) => knob.key),
    ...Object.keys(declaration.pinned)
  ]);
  const unknownKey = Object.keys(requested).find(
    (key) => !knownKeys.has(key)
  );
  if (unknownKey) {
    throw new Error(
      `variation-key-unsupported:${declaration.blueprintId}:${unknownKey}`
    );
  }
  for (const [key, pinnedValue] of Object.entries(
    declaration.pinned
  )) {
    if (
      Object.hasOwn(requested, key) &&
      requested[key] !== pinnedValue
    ) {
      throw new Error(
        `variation-pinned-override:${declaration.blueprintId}:${key}`
      );
    }
  }
  const resolved: Record<string, VariationValue> = {
    ...declaration.pinned
  };
  for (const knob of declaration.knobs) {
    const value = Object.hasOwn(requested, knob.key)
      ? requested[knob.key]
      : knob.default;
    if (
      !knobValues(knob).some(
        (allowed) => Object.is(allowed, value)
      )
    ) {
      throw new Error(
        `variation-value-unsupported:${declaration.blueprintId}:${knob.key}`
      );
    }
    resolved[knob.key] = value as VariationValue;
  }
  return resolved;
}

export function enumerateVariationEnvelope(
  declaration: VariationEnvelopeDeclaration
): ResolvedVariation[] {
  let combinations: Array<Record<string, VariationValue>> = [
    { ...declaration.pinned }
  ];
  for (const knob of declaration.knobs) {
    combinations = combinations.flatMap((combination) =>
      knobValues(knob).map((value) => ({
        ...combination,
        [knob.key]: value
      }))
    );
  }
  if (combinations.length !== declaration.expectedCombinationCount) {
    throw new Error(
      `variation-enumeration-drift:${declaration.blueprintId}`
    );
  }
  return combinations;
}

export function assertVariationSuiteLimit(
  declarations: readonly VariationEnvelopeDeclaration[]
): number {
  const blueprintIds = declarations.map(
    (declaration) => declaration.blueprintId
  );
  if (new Set(blueprintIds).size !== blueprintIds.length) {
    throw new Error("variation-suite-blueprint-duplicate");
  }
  const count = declarations.reduce(
    (total, declaration) =>
      total + countVariationCombinations(declaration),
    0
  );
  if (count > 1024) {
    throw new Error(`variation-suite-cap-exceeded:${count}`);
  }
  return count;
}
