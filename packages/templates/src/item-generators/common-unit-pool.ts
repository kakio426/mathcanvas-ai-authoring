export const COMMON_UNIT_WHOLE_WIDTH = 720;

export type FractionValue = {
  readonly numerator: number;
  readonly denominator: number;
};

export type CommonUnitDenominators = {
  readonly leftDenominator: number;
  readonly rightDenominator: number;
  readonly commonDenominator: number;
};

export function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(left: number, right: number): number {
  return (left * right) / gcd(left, right);
}

export function shuffled<T>(
  values: readonly T[],
  random: () => number
): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [output[index], output[swapWith]] = [
      output[swapWith]!,
      output[index]!
    ];
  }
  return output;
}

export function sameFractionValue(
  left: FractionValue,
  right: FractionValue
): boolean {
  return (
    left.numerator * right.denominator ===
    right.numerator * left.denominator
  );
}

export function reducedFractionKey(value: FractionValue): string {
  const divisor = gcd(value.numerator, value.denominator);
  return (
    `${value.numerator / divisor}/` +
    `${value.denominator / divisor}`
  );
}

export function fractionText(value: FractionValue): string {
  return `${value.numerator}/${value.denominator}`;
}

export function fractionLatex(value: FractionValue): string {
  return `\\frac{${value.numerator}}{${value.denominator}}`;
}

export function enumerateCommonUnitDenominators(
  orientation: "increasing" | "both"
): CommonUnitDenominators[] {
  const output: CommonUnitDenominators[] = [];
  for (
    let leftDenominator = 2;
    leftDenominator <= 12;
    leftDenominator += 1
  ) {
    const firstRight =
      orientation === "increasing" ? leftDenominator + 1 : 2;
    for (
      let rightDenominator = firstRight;
      rightDenominator <= 12;
      rightDenominator += 1
    ) {
      if (leftDenominator === rightDenominator) continue;
      const commonDenominator = lcm(
        leftDenominator,
        rightDenominator
      );
      if (
        commonDenominator > 12 ||
        commonDenominator <=
          Math.max(leftDenominator, rightDenominator) ||
        COMMON_UNIT_WHOLE_WIDTH % leftDenominator !== 0 ||
        COMMON_UNIT_WHOLE_WIDTH % rightDenominator !== 0 ||
        COMMON_UNIT_WHOLE_WIDTH % commonDenominator !== 0
      ) {
        continue;
      }
      output.push({
        leftDenominator,
        rightDenominator,
        commonDenominator
      });
    }
  }
  return output;
}

export function selectDistinctCommonUnitConfigurations<T>(
  pool: readonly T[],
  random: () => number,
  count: number,
  groupKey: (configuration: T) => string
): T[] {
  const selected: T[] = [];
  const seen = new Set<string>();
  for (const configuration of shuffled(pool, random)) {
    const key = groupKey(configuration);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(configuration);
    if (selected.length === count) break;
  }
  return selected;
}
