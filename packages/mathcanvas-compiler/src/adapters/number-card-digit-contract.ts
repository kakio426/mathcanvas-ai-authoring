export const NUMBER_CARD_DIGIT_CONTRACT_EVIDENCE =
  "research/mathcanvas/wave4-number-card-digit-mapping.ui.json" as const;

export const NUMBER_CARD_DIGIT_VARIANTS = [
  { value: 0, variantId: "NO04NT-01" },
  { value: 1, variantId: "NO04NT-02" },
  { value: 2, variantId: "NO04NT-03" },
  { value: 3, variantId: "NO04NT-04" },
  { value: 4, variantId: "NO04NT-05" },
  { value: 5, variantId: "NO04NT-06" },
  { value: 6, variantId: "NO04NT-07" },
  { value: 7, variantId: "NO04NT-08" },
  { value: 8, variantId: "NO04NT-09" },
  { value: 9, variantId: "NO04NT-10" }
] as const;

export const NUMBER_CARD_SVG_BY_VALUE: Readonly<Record<number, string>> =
  Object.fromEntries(
    NUMBER_CARD_DIGIT_VARIANTS.map(({ value, variantId }) => [
      value,
      variantId
    ])
  );
