import {
  buildDivisionGroupingTeacherIntentCanonicalStory,
  type DivisionGroupingTeacherIntentCanonicalStory,
  type ResolvedActivity,
  type ResolvedEmission,
  type ValidationIssue,
  type ValuePredicate
} from "@mathcanvas/contracts";
import { issue } from "../layers/shared.js";

type Ratio = { numerator: number; denominator: number };
type Handler = (
  resolved: ResolvedActivity,
  predicate: ValuePredicate,
  issues: ValidationIssue[]
) => void;

function parameter(
  predicate: ValuePredicate,
  key: string
): unknown {
  return predicate.parameters[key];
}

function stringParameter(
  predicate: ValuePredicate,
  key: string
): string {
  const value = parameter(predicate, key);
  if (typeof value !== "string") {
    throw new Error(`predicate-parameter-invalid:${predicate.kind}:${key}`);
  }
  return value;
}

function ratio(
  values: Record<string, unknown>,
  path: string
): Ratio | undefined {
  const value = values[path];
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  const numerator = (value as Record<string, unknown>).numerator;
  const denominator = (value as Record<string, unknown>).denominator;
  return typeof numerator === "number" &&
    typeof denominator === "number"
    ? { numerator, denominator }
    : undefined;
}

function ratioPair(
  values: Record<string, unknown>,
  predicate: ValuePredicate
): readonly [Ratio, Ratio] | undefined {
  const left = ratio(
    values,
    stringParameter(predicate, "leftPath")
  );
  const right = ratio(
    values,
    stringParameter(predicate, "rightPath")
  );
  return left && right ? [left, right] : undefined;
}

function reducedKey(value: Ratio): string {
  let left = Math.abs(value.numerator);
  let right = Math.abs(value.denominator);
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  const divisor = left || 1;
  return `${value.numerator / divisor}/${value.denominator / divisor}`;
}

function byRole(
  resolved: ResolvedActivity,
  itemId: string,
  role: string
): ResolvedEmission | undefined {
  return resolved.emissions.find(
    (emission) =>
      emission.itemId === itemId && emission.role === role
  );
}

function activityRole(
  resolved: ResolvedActivity,
  role: string
): ResolvedEmission | undefined {
  return resolved.emissions.find(
    (emission) =>
      emission.itemId === undefined && emission.role === role
  );
}

function stringArrayParameter(
  predicate: ValuePredicate,
  key: string,
  minimum = 1
): string[] {
  const value = parameter(predicate, key);
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    !value.every((entry) => typeof entry === "string")
  ) {
    throw new Error(
      `predicate-parameter-invalid:${predicate.kind}:${key}`
    );
  }
  return value;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return left === right;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) =>
        sameValue(entry, right[index])
      )
    );
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        sameValue(leftRecord[key], rightRecord[key])
    )
  );
}

function containsValue(
  value: unknown,
  needle: unknown
): boolean {
  if (sameValue(value, needle)) return true;
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsValue(entry, needle));
  }
  return Object.values(value).some((entry) =>
    containsValue(entry, needle)
  );
}

function containsTextFragment(
  value: unknown,
  needle: unknown
): boolean {
  if (
    typeof value !== "string" ||
    (typeof needle !== "string" && typeof needle !== "number")
  ) {
    return false;
  }
  const visible = value.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
  const answer = String(needle)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/gu, "");
  if (answer.length === 0) return false;
  if (/^[+-]?\d+(?:[.,]\d+)?$/u.test(answer)) {
    const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`,
      "u"
    ).test(visible);
  }
  return visible.includes(answer);
}

function containsVisibleTextValue(
  properties: Record<string, unknown>,
  needle: unknown
): boolean {
  return Object.entries(properties).some(([key, value]) => {
    if (/(?:text|latex|label|title|expression)$/iu.test(key)) {
      return containsTextFragment(value, needle);
    }
    if (!value || typeof value !== "object") return false;
    return containsVisibleTextValue(
      value as Record<string, unknown>,
      needle
    );
  });
}

type NumericPair = readonly [number, number];

function numericPairList(value: unknown): NumericPair[] | undefined {
  if (
    !Array.isArray(value) ||
    !value.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        pair.every(
          (entry) =>
            typeof entry === "number" &&
            Number.isInteger(entry)
        )
    )
  ) {
    return undefined;
  }
  return value as NumericPair[];
}

function orderedRuleStateList(
  value: unknown
): unknown[][] | undefined {
  if (
    !Array.isArray(value) ||
    !value.every(
      (state) => Array.isArray(state) && state.length >= 2
    )
  ) {
    return undefined;
  }
  return value as unknown[][];
}

function numericValues(
  values: Record<string, unknown>,
  paths: readonly string[]
): number[] | undefined {
  const output = paths.map((path) => values[path]);
  return output.every(
    (value) => typeof value === "number" && Number.isInteger(value)
  )
    ? (output as number[])
    : undefined;
}

function pairKey(pair: NumericPair): string {
  return [...pair].sort((left, right) => left - right).join("+");
}

function allPairs(values: readonly number[]): NumericPair[] {
  const output: NumericPair[] = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      output.push([values[left]!, values[right]!]);
    }
  }
  return output;
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.length === right.length &&
    left.every((value) => right.includes(value))
  );
}

const handlers: Record<string, Handler> = {
  "ratio.equivalent": (resolved, predicate, issues) => {
    for (const item of resolved.items) {
      const pair = ratioPair(item.values, predicate);
      if (
        pair &&
        pair[0].numerator * pair[1].denominator !==
          pair[1].numerator * pair[0].denominator
      ) {
        issue(
          issues,
          "ratios-not-equivalent",
          "mathematics",
          `${item.id}의 두 표현은 같은 값을 나타내지 않습니다.`
        );
      }
    }
  },
  "ratio.unlike-representation": (resolved, predicate, issues) => {
    for (const item of resolved.items) {
      const pair = ratioPair(item.values, predicate);
      if (
        pair &&
        pair[0].numerator === pair[1].numerator &&
        pair[0].denominator === pair[1].denominator
      ) {
        issue(
          issues,
          "ratio-representation-not-varied",
          "pedagogy",
          `${item.id}가 같은 분수 표현을 되풀이합니다.`
        );
      }
    }
  },
  "ratio.proper-range": (resolved, predicate, issues) => {
    for (const item of resolved.items) {
      const pair = ratioPair(item.values, predicate);
      if (
        pair &&
        pair.some(
          (value) =>
            value.numerator <= 0 ||
            value.numerator >= value.denominator
        )
      ) {
        issue(
          issues,
          "proper-range-violated",
          "mathematics",
          `${item.id}의 값 범위가 올바르지 않습니다.`
        );
      }
    }
  },
  "ratio.unlike-denominators": (resolved, predicate, issues) => {
    for (const item of resolved.items) {
      const pair = ratioPair(item.values, predicate);
      if (pair && pair[0].denominator === pair[1].denominator) {
        issue(
          issues,
          "denominators-not-unlike",
          "mathematics",
          `${item.id}의 두 단위가 서로 다르지 않습니다.`
        );
      }
    }
  },
  "ratio.no-duplicate": (resolved, predicate, issues) => {
    const seen = new Set<string>();
    for (const item of resolved.items) {
      const pair = ratioPair(item.values, predicate);
      if (!pair) continue;
      const key = pair.map(reducedKey).sort().join("|");
      if (seen.has(key)) {
        issue(
          issues,
          "duplicate-fraction-comparison",
          "pedagogy",
          `${item.id}는 앞 문항과 같은 비교입니다.`
        );
      }
      seen.add(key);
    }
  },
  "ratio.relation-consistent": (resolved, predicate, issues) => {
    const relationPath = stringParameter(
      predicate,
      "relationPath"
    );
    for (const item of resolved.items) {
      const pair = ratioPair(item.values, predicate);
      if (!pair) continue;
      const leftCross =
        pair[0].numerator * pair[1].denominator;
      const rightCross =
        pair[1].numerator * pair[0].denominator;
      const expected =
        leftCross > rightCross
          ? ">"
          : leftCross < rightCross
            ? "<"
            : "=";
      if (
        expected === "=" ||
        item.values[relationPath] !== expected
      ) {
        issue(
          issues,
          "relation-incorrect",
          "mathematics",
          `${item.id}의 관계 값이 실제 크기와 다릅니다.`
        );
      }
    }
  },
  "ratio.min-visual-difference": (
    resolved,
    predicate,
    issues
  ) => {
    const minimum = parameter(predicate, "minimumRatio");
    if (typeof minimum !== "number") {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:minimumRatio`
      );
    }
    for (const item of resolved.items) {
      const pair = ratioPair(item.values, predicate);
      if (
        pair &&
        Math.abs(
          pair[0].numerator / pair[0].denominator -
            pair[1].numerator / pair[1].denominator
        ) < minimum
      ) {
        issue(
          issues,
          "visual-difference-too-small",
          "pedagogy",
          `${item.id}의 시각적 길이 차이가 너무 작습니다.`
        );
      }
    }
  },
  "ratio.visual-model-consistent": (
    resolved,
    predicate,
    issues
  ) => {
    const valuePaths = parameter(predicate, "valuePaths");
    const sourceRoles = parameter(predicate, "sourceRoles");
    if (
      !Array.isArray(valuePaths) ||
      valuePaths.length < 2 ||
      !valuePaths.every((value) => typeof value === "string") ||
      !Array.isArray(sourceRoles) ||
      sourceRoles.length !== valuePaths.length ||
      !sourceRoles.every((value) => typeof value === "string")
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:pairs`
      );
    }
    for (const item of resolved.items) {
      const mismatch = valuePaths.some((path, index) => {
        const expected = ratio(item.values, path);
        const model = byRole(
          resolved,
          item.id,
          sourceRoles[index]!
        );
        const actual = model?.toolIntent.properties.fraction;
        return (
          !expected ||
          actual === null ||
          typeof actual !== "object" ||
          Array.isArray(actual) ||
          (actual as Record<string, unknown>).numerator !==
            expected.numerator ||
          (actual as Record<string, unknown>).denominator !==
            expected.denominator
        );
      });
      if (mismatch) {
        issue(
          issues,
          "visual-fraction-mismatch",
          "mathematics",
          `${item.id}의 시각 모형과 의미 값이 다릅니다.`
        );
      }
    }
  },
  "ratio.one-side-change-distractor": (
    resolved,
    predicate,
    issues
  ) => {
    const referencePath = stringParameter(
      predicate,
      "referencePath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      3
    );
    for (const item of resolved.items) {
      const reference = ratio(item.values, referencePath);
      const correct = ratio(item.values, correctPath);
      const candidates = candidatePaths
        .map((path) => ratio(item.values, path))
        .filter((value): value is Ratio => value !== undefined);
      const embodied =
        reference &&
        correct &&
        candidates.some(
          (candidate) =>
            reducedKey(candidate) !== reducedKey(correct) &&
            ((candidate.numerator === reference.numerator &&
              candidate.denominator === correct.denominator) ||
              (candidate.numerator === correct.numerator &&
                candidate.denominator ===
                  reference.denominator))
        );
      if (!embodied) {
        issue(
          issues,
          "one-side-change-distractor-missing",
          "pedagogy",
          `${item.id}에 분자나 분모 한쪽만 바꾸는 오개념 후보가 없습니다.`
        );
      }
    }
  },
  "ratio.additive-change-distractor": (
    resolved,
    predicate,
    issues
  ) => {
    const referencePath = stringParameter(
      predicate,
      "referencePath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      3
    );
    for (const item of resolved.items) {
      const reference = ratio(item.values, referencePath);
      const correct = ratio(item.values, correctPath);
      const candidates = candidatePaths
        .map((path) => ratio(item.values, path))
        .filter((value): value is Ratio => value !== undefined);
      const embodied =
        reference &&
        correct &&
        candidates.some((candidate) => {
          const numeratorDelta =
            candidate.numerator - reference.numerator;
          const denominatorDelta =
            candidate.denominator - reference.denominator;
          return (
            numeratorDelta !== 0 &&
            numeratorDelta === denominatorDelta &&
            reducedKey(candidate) !== reducedKey(correct)
          );
        });
      if (!embodied) {
        issue(
          issues,
          "additive-change-distractor-missing",
          "pedagogy",
          `${item.id}에 분자와 분모를 같은 수만큼 바꾸는 오개념 후보가 없습니다.`
        );
      }
    }
  },
  "aggregate.equals": (resolved, predicate, issues) => {
    const paths = parameter(predicate, "valuePaths");
    const expected = parameter(predicate, "expected");
    if (
      !Array.isArray(paths) ||
      paths.length < 2 ||
      !paths.every((value) => typeof value === "string") ||
      typeof expected !== "number"
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:aggregate`
      );
    }
    for (const item of resolved.items) {
      const values = paths.map((path) => item.values[path]);
      if (
        values.some((value) => typeof value !== "number") ||
        (values as number[]).reduce((sum, value) => sum + value, 0) !==
          expected
      ) {
        issue(
          issues,
          "aggregate-value-mismatch",
          "mathematics",
          `${item.id}의 부분을 모은 값이 전체와 다릅니다.`
        );
      }
    }
  },
  "values.balanced-equation-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const aPath = stringParameter(predicate, "aPath");
    const bPath = stringParameter(predicate, "bPath");
    const cPath = stringParameter(predicate, "cPath");
    const solutionPath = stringParameter(
      predicate,
      "solutionPath"
    );
    const operationalAnswerPath = stringParameter(
      predicate,
      "operationalAnswerPath"
    );
    const mirrorValuePath = stringParameter(
      predicate,
      "mirrorValuePath"
    );
    const nearMissValuePath = stringParameter(
      predicate,
      "nearMissValuePath"
    );
    const surplusPath = stringParameter(
      predicate,
      "surplusPath"
    );
    const unitCellCountPath = stringParameter(
      predicate,
      "unitCellCountPath"
    );
    const piecePaths = stringArrayParameter(
      predicate,
      "piecePaths",
      4
    );
    const minimumSurplus = parameter(
      predicate,
      "minimumSurplus"
    );
    if (
      typeof minimumSurplus !== "number" ||
      !Number.isInteger(minimumSurplus) ||
      minimumSurplus < 1
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:minimumSurplus`
      );
    }
    for (const item of resolved.items) {
      const a = item.values[aPath];
      const b = item.values[bPath];
      const c = item.values[cPath];
      const solution = item.values[solutionPath];
      const operationalAnswer =
        item.values[operationalAnswerPath];
      const mirrorValue = item.values[mirrorValuePath];
      const nearMissValue = item.values[nearMissValuePath];
      const pieces = numericValues(item.values, piecePaths);
      const surplus = item.values[surplusPath];
      const unitCellCount =
        item.values[unitCellCountPath];
      const integers = [
        a,
        b,
        c,
        solution,
        operationalAnswer,
        mirrorValue,
        nearMissValue
      ];
      const valid =
        integers.every(
          (value) =>
            typeof value === "number" &&
            Number.isInteger(value) &&
            value >= 0 &&
            value <= 9
        ) &&
        pieces !== undefined &&
        pieces.length === piecePaths.length &&
        new Set(pieces).size === pieces.length &&
        typeof a === "number" &&
        typeof b === "number" &&
        typeof c === "number" &&
        typeof solution === "number" &&
        typeof unitCellCount === "number" &&
        Number.isInteger(unitCellCount) &&
        unitCellCount >= 1 &&
        a + b === c + solution &&
        operationalAnswer === a + b &&
        mirrorValue === c &&
        typeof nearMissValue === "number" &&
        Math.abs(nearMissValue - solution) === 1 &&
        pieces.filter((value) => value === solution).length === 1 &&
        pieces.includes(operationalAnswer as number) &&
        pieces.includes(mirrorValue as number) &&
        pieces.includes(nearMissValue) &&
        pieces.every(
          (value) => c + value <= unitCellCount
        ) &&
        Array.isArray(surplus) &&
        surplus.length >= minimumSurplus &&
        surplus.every(
          (value) =>
            typeof value === "number" &&
            Number.isInteger(value) &&
            pieces.includes(value)
        );
      if (!valid) {
        issue(
          issues,
          "balanced-equation-distractor-structure-invalid",
          "pedagogy",
          `${item.id}의 카드에는 정답과 등호 오개념을 드러내는 그럴듯한 선택지가 필요합니다.`
        );
      }
    }
  },
  "values.balance-card-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const aPath = stringParameter(predicate, "aPath");
    const bPath = stringParameter(predicate, "bPath");
    const correctPath = stringParameter(
      predicate,
      "correctPath"
    );
    const differencePath = stringParameter(
      predicate,
      "differencePath"
    );
    const nearMissPath = stringParameter(
      predicate,
      "nearMissPath"
    );
    const surplusPath = stringParameter(
      predicate,
      "surplusPath"
    );
    const piecePaths = stringArrayParameter(
      predicate,
      "piecePaths",
      5
    );
    for (const item of resolved.items) {
      const a = item.values[aPath];
      const b = item.values[bPath];
      const correct = item.values[correctPath];
      const difference = item.values[differencePath];
      const nearMiss = item.values[nearMissPath];
      const pieces = numericValues(item.values, piecePaths);
      const surplus = item.values[surplusPath];
      const valid =
        [a, b, correct, difference, nearMiss].every(
          (value) =>
            typeof value === "number" &&
            Number.isInteger(value) &&
            value >= 0 &&
            value <= 9
        ) &&
        typeof a === "number" &&
        typeof b === "number" &&
        typeof correct === "number" &&
        typeof difference === "number" &&
        typeof nearMiss === "number" &&
        a + b === correct &&
        Math.abs(a - b) === difference &&
        Math.abs(nearMiss - correct) === 1 &&
        pieces !== undefined &&
        pieces.length === 5 &&
        new Set(pieces).size === 5 &&
        [a, b, correct, difference, nearMiss].every(
          (value) => pieces.includes(value)
        ) &&
        pieces.filter((value) => value === correct).length === 1 &&
        Array.isArray(surplus) &&
        surplus.length === 4 &&
        surplus.every(
          (value) =>
            typeof value === "number" &&
            Number.isInteger(value) &&
            value !== correct &&
            pieces.includes(value)
        );
      if (!valid) {
        issue(
          issues,
          "balance-card-distractors-invalid",
          "pedagogy",
          `${item.id}에 덧셈 결과·두 수 반복·차·1 차이 오답을 구별할 카드가 없습니다.`
        );
      }
    }
  },
  "values.clock-boundary-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const startHourPath = stringParameter(
      predicate,
      "startHourPath"
    );
    const targetMinutePath = stringParameter(
      predicate,
      "targetMinutePath"
    );
    const nextHourPath = stringParameter(
      predicate,
      "nextHourPath"
    );
    const minuteNumberPath = stringParameter(
      predicate,
      "minuteNumberPath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const misconceptionPaths = [
      stringParameter(predicate, "currentHourTextPath"),
      stringParameter(predicate, "betweenStartTextPath"),
      stringParameter(predicate, "nextHourTextPath"),
      stringParameter(predicate, "minuteNumberTextPath")
    ];
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      5
    );
    for (const item of resolved.items) {
      const startHour = item.values[startHourPath];
      const targetMinute = item.values[targetMinutePath];
      const nextHour = item.values[nextHourPath];
      const minuteNumber = item.values[minuteNumberPath];
      const correct = item.values[correctPath];
      const misconceptions = misconceptionPaths.map(
        (path) => item.values[path]
      );
      const candidates = candidatePaths.map(
        (path) => item.values[path]
      );
      const expectedNext =
        startHour === 12 ? 1 : Number(startHour) + 1;
      const valid =
        typeof startHour === "number" &&
        Number.isInteger(startHour) &&
        startHour >= 1 &&
        startHour <= 12 &&
        typeof targetMinute === "number" &&
        (targetMinute === 50 || targetMinute === 55) &&
        nextHour === expectedNext &&
        minuteNumber === targetMinute / 5 &&
        typeof correct === "string" &&
        misconceptions.every(
          (value) => typeof value === "string"
        ) &&
        candidates.every(
          (value) => typeof value === "string"
        ) &&
        new Set(candidates).size === 5 &&
        [correct, ...misconceptions].every(
          (value) =>
            typeof value === "string" &&
            candidates.includes(value)
        );
      if (!valid) {
        issue(
          issues,
          "clock-boundary-distractors-invalid",
          "pedagogy",
          `${item.id}에 짧은바늘 고정·성급한 다음 시·분침 숫자 혼동을 드러내는 선택지가 없습니다.`
        );
      }
    }
  },
  "visual.clock-time-consistent": (
    resolved,
    predicate,
    issues
  ) => {
    const clockRole = stringParameter(predicate, "clockRole");
    const hoursPath = stringParameter(predicate, "hoursPath");
    const minutesPath = stringParameter(predicate, "minutesPath");
    for (const item of resolved.items) {
      const clock = byRole(resolved, item.id, clockRole);
      if (
        !clock ||
        clock.toolIntent.kind !== "analog-clock" ||
        clock.toolIntent.properties.hours !==
          item.values[hoursPath] ||
        clock.toolIntent.properties.minutes !==
          item.values[minutesPath] ||
        clock.toolIntent.properties.clockType !== "geared" ||
        clock.toolIntent.properties.isWorking !== false
      ) {
        issue(
          issues,
          "clock-time-visual-mismatch",
          "mathematics",
          `${item.id}의 시계가 문항의 시작 시각과 맞지 않습니다.`
        );
      }
    }
  },
  "values.same-denominator-sum-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const denominatorPath = stringParameter(
      predicate,
      "denominatorPath"
    );
    const leftNumeratorPath = stringParameter(
      predicate,
      "leftNumeratorPath"
    );
    const rightNumeratorPath = stringParameter(
      predicate,
      "rightNumeratorPath"
    );
    const sumNumeratorPath = stringParameter(
      predicate,
      "sumNumeratorPath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const misconceptionPaths = [
      stringParameter(predicate, "addBothTextPath"),
      stringParameter(predicate, "largerAddendTextPath"),
      stringParameter(predicate, "doubleCountTextPath"),
      stringParameter(predicate, "differenceTextPath")
    ];
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      5
    );
    const candidateLatexPaths = candidatePaths.map(
      (path) => `${path}Latex`
    );
    const correctLatexPath = correctPath.endsWith("Text")
      ? `${correctPath.slice(0, -4)}Latex`
      : `${correctPath}Latex`;
    for (const item of resolved.items) {
      const denominator = item.values[denominatorPath];
      const leftNumerator = item.values[leftNumeratorPath];
      const rightNumerator = item.values[rightNumeratorPath];
      const sumNumerator = item.values[sumNumeratorPath];
      const correct = item.values[correctPath];
      const misconceptions = misconceptionPaths.map(
        (path) => item.values[path]
      );
      const candidates = candidatePaths.map(
        (path) => item.values[path]
      );
      const expectedSum =
        Number(leftNumerator) + Number(rightNumerator);
      const expectedMisconceptions = [
        `${expectedSum}/${Number(denominator) * 2}`,
        `${Math.max(
          Number(leftNumerator),
          Number(rightNumerator)
        )}/${String(denominator)}`,
        `${expectedSum + 1}/${String(denominator)}`,
        `${Math.abs(
          Number(leftNumerator) - Number(rightNumerator)
        )}/${String(denominator)}`
      ];
      const parsedCandidates = candidates.map((value) => {
        if (typeof value !== "string") return undefined;
        const match = /^(\d+)\/(\d+)$/.exec(value);
        if (!match) return undefined;
        return {
          numerator: Number(match[1]),
          denominator: Number(match[2])
        };
      });
      const candidateLatex = parsedCandidates.map((value) =>
        value
          ? `\\frac{${value.numerator}}{${value.denominator}}`
          : undefined
      );
      const valid =
        typeof denominator === "number" &&
        Number.isInteger(denominator) &&
        denominator >= 3 &&
        denominator <= 10 &&
        typeof leftNumerator === "number" &&
        Number.isInteger(leftNumerator) &&
        leftNumerator > 0 &&
        typeof rightNumerator === "number" &&
        Number.isInteger(rightNumerator) &&
        rightNumerator > 0 &&
        leftNumerator !== rightNumerator &&
        sumNumerator === expectedSum &&
        expectedSum < denominator &&
        correct === `${expectedSum}/${denominator}` &&
        misconceptions.every(
          (value, index) =>
            value === expectedMisconceptions[index]
        ) &&
        candidates.every(
          (value) => typeof value === "string"
        ) &&
        new Set(candidates).size === 5 &&
        [correct, ...misconceptions].every(
          (value) =>
            typeof value === "string" &&
            candidates.includes(value)
        ) &&
        parsedCandidates.every(
          (value): value is Ratio => value !== undefined
        ) &&
        new Set(
          parsedCandidates
            .filter((value): value is Ratio => value !== undefined)
            .map(reducedKey)
        ).size === 5 &&
        item.values[correctLatexPath] ===
          `\\frac{${expectedSum}}{${String(denominator)}}` &&
        candidateLatex.every(
          (value, index) =>
            value !== undefined &&
            item.values[candidateLatexPaths[index]!] === value
        );
      if (!valid) {
        issue(
          issues,
          "same-denominator-sum-distractors-invalid",
          "pedagogy",
          `${item.id}에 분모까지 더하기·큰 덧수 유지·경계 중복 세기·빼기 오개념을 드러내는 선택지가 없습니다.`
        );
      }
    }
  },
  "values.unlike-denominator-sum-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const leftDenominatorPath = stringParameter(
      predicate,
      "leftDenominatorPath"
    );
    const rightDenominatorPath = stringParameter(
      predicate,
      "rightDenominatorPath"
    );
    const leftNumeratorPath = stringParameter(
      predicate,
      "leftNumeratorPath"
    );
    const rightNumeratorPath = stringParameter(
      predicate,
      "rightNumeratorPath"
    );
    const commonDenominatorPath = stringParameter(
      predicate,
      "commonDenominatorPath"
    );
    const leftCellsPath = stringParameter(
      predicate,
      "leftCellsPath"
    );
    const rightCellsPath = stringParameter(
      predicate,
      "rightCellsPath"
    );
    const sumCellsPath = stringParameter(
      predicate,
      "sumCellsPath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const misconceptionPaths = [
      stringParameter(predicate, "addBothTextPath"),
      stringParameter(predicate, "sameNumeratorTextPath"),
      stringParameter(predicate, "largerPartTextPath"),
      stringParameter(predicate, "productTextPath")
    ];
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      5
    );
    const candidateLatexPaths = candidatePaths.map(
      (path) => `${path}Latex`
    );
    const correctLatexPath = correctPath.endsWith("Text")
      ? `${correctPath.slice(0, -4)}Latex`
      : `${correctPath}Latex`;
    const gcd = (left: number, right: number): number => {
      let a = Math.abs(left);
      let b = Math.abs(right);
      while (b !== 0) [a, b] = [b, a % b];
      return a || 1;
    };
    const seenReducedAdditions = new Set<string>();
    for (const item of resolved.items) {
      const leftDenominator = item.values[leftDenominatorPath];
      const rightDenominator = item.values[rightDenominatorPath];
      const leftNumerator = item.values[leftNumeratorPath];
      const rightNumerator = item.values[rightNumeratorPath];
      const commonDenominator =
        item.values[commonDenominatorPath];
      const leftCells = item.values[leftCellsPath];
      const rightCells = item.values[rightCellsPath];
      const sumCells = item.values[sumCellsPath];
      const expectedCommon =
        (Number(leftDenominator) *
          Number(rightDenominator)) /
        gcd(
          Number(leftDenominator),
          Number(rightDenominator)
        );
      const expectedLeftCells =
        Number(leftNumerator) *
        (expectedCommon / Number(leftDenominator));
      const expectedRightCells =
        Number(rightNumerator) *
        (expectedCommon / Number(rightDenominator));
      const expectedSum =
        expectedLeftCells + expectedRightCells;
      const reducedAdditionKey = [
        reducedKey({
          numerator: Number(leftNumerator),
          denominator: Number(leftDenominator)
        }),
        reducedKey({
          numerator: Number(rightNumerator),
          denominator: Number(rightDenominator)
        })
      ]
        .sort()
        .join("+");
      const duplicateReducedAddition =
        seenReducedAdditions.has(reducedAdditionKey);
      seenReducedAdditions.add(reducedAdditionKey);
      const correct = item.values[correctPath];
      const misconceptions = misconceptionPaths.map(
        (path) => item.values[path]
      );
      const expectedMisconceptions = [
        `${Number(leftNumerator) + Number(rightNumerator)}/` +
          `${Number(leftDenominator) + Number(rightDenominator)}`,
        `${Number(leftNumerator) + Number(rightNumerator)}/` +
          `${expectedCommon}`,
        `${Math.max(
          expectedLeftCells,
          expectedRightCells
        )}/${expectedCommon}`,
        `${Number(leftNumerator) * Number(rightNumerator)}/` +
          `${Number(leftDenominator) * Number(rightDenominator)}`
      ];
      const candidates = candidatePaths.map(
        (path) => item.values[path]
      );
      const parsedCandidates = candidates.map((value) => {
        if (typeof value !== "string") return undefined;
        const match = /^(\d+)\/(\d+)$/.exec(value);
        if (!match) return undefined;
        return {
          numerator: Number(match[1]),
          denominator: Number(match[2])
        };
      });
      const valid =
        typeof leftDenominator === "number" &&
        Number.isInteger(leftDenominator) &&
        leftDenominator >= 2 &&
        typeof rightDenominator === "number" &&
        Number.isInteger(rightDenominator) &&
        rightDenominator > leftDenominator &&
        rightDenominator <= 12 &&
        typeof leftNumerator === "number" &&
        Number.isInteger(leftNumerator) &&
        leftNumerator > 0 &&
        leftNumerator < leftDenominator &&
        gcd(leftNumerator, leftDenominator) === 1 &&
        typeof rightNumerator === "number" &&
        Number.isInteger(rightNumerator) &&
        rightNumerator > 0 &&
        rightNumerator < rightDenominator &&
        gcd(rightNumerator, rightDenominator) === 1 &&
        !duplicateReducedAddition &&
        commonDenominator === expectedCommon &&
        expectedCommon <= 12 &&
        expectedCommon > rightDenominator &&
        720 % leftDenominator === 0 &&
        720 % rightDenominator === 0 &&
        720 % expectedCommon === 0 &&
        leftCells === expectedLeftCells &&
        rightCells === expectedRightCells &&
        sumCells === expectedSum &&
        expectedSum < expectedCommon &&
        correct === `${expectedSum}/${expectedCommon}` &&
        misconceptions.every(
          (value, index) =>
            value === expectedMisconceptions[index]
        ) &&
        candidates.every(
          (value) => typeof value === "string"
        ) &&
        new Set(candidates).size === 5 &&
        [correct, ...misconceptions].every(
          (value) =>
            typeof value === "string" &&
            candidates.includes(value)
        ) &&
        parsedCandidates.every(
          (value): value is Ratio => value !== undefined
        ) &&
        new Set(
          parsedCandidates
            .filter((value): value is Ratio => value !== undefined)
            .map(reducedKey)
        ).size === 5 &&
        item.values[correctLatexPath] ===
          `\\frac{${expectedSum}}{${expectedCommon}}` &&
        parsedCandidates.every(
          (value, index) =>
            value !== undefined &&
            item.values[candidateLatexPaths[index]!] ===
              `\\frac{${value.numerator}}{${value.denominator}}`
        );
      if (!valid) {
        issue(
          issues,
          "unlike-denominator-sum-distractors-invalid",
          "pedagogy",
          `${item.id}에 분모끼리 더하기·분자 유지·큰 부분만 읽기·곱셈 혼동 오개념을 드러내는 선택지가 없습니다.`
        );
      }
    }
  },
  "values.unlike-denominator-difference-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const leftDenominatorPath = stringParameter(
      predicate,
      "leftDenominatorPath"
    );
    const rightDenominatorPath = stringParameter(
      predicate,
      "rightDenominatorPath"
    );
    const leftNumeratorPath = stringParameter(
      predicate,
      "leftNumeratorPath"
    );
    const rightNumeratorPath = stringParameter(
      predicate,
      "rightNumeratorPath"
    );
    const commonDenominatorPath = stringParameter(
      predicate,
      "commonDenominatorPath"
    );
    const leftCellsPath = stringParameter(
      predicate,
      "leftCellsPath"
    );
    const rightCellsPath = stringParameter(
      predicate,
      "rightCellsPath"
    );
    const differenceCellsPath = stringParameter(
      predicate,
      "differenceCellsPath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const misconceptionPaths = [
      stringParameter(predicate, "oneSideCommonTextPath"),
      stringParameter(predicate, "coveredPartTextPath"),
      stringParameter(predicate, "minuendOnlyTextPath"),
      stringParameter(predicate, "denominatorSumTextPath")
    ];
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      5
    );
    const candidateLatexPaths = candidatePaths.map(
      (path) => `${path}Latex`
    );
    const correctLatexPath = correctPath.endsWith("Text")
      ? `${correctPath.slice(0, -4)}Latex`
      : `${correctPath}Latex`;
    const gcd = (left: number, right: number): number => {
      let a = Math.abs(left);
      let b = Math.abs(right);
      while (b !== 0) [a, b] = [b, a % b];
      return a || 1;
    };
    const seenDenominatorPairs = new Set<string>();
    const seenReducedDifferences = new Set<string>();
    for (const item of resolved.items) {
      const leftDenominator = item.values[leftDenominatorPath];
      const rightDenominator = item.values[rightDenominatorPath];
      const leftNumerator = item.values[leftNumeratorPath];
      const rightNumerator = item.values[rightNumeratorPath];
      const commonDenominator =
        item.values[commonDenominatorPath];
      const leftCells = item.values[leftCellsPath];
      const rightCells = item.values[rightCellsPath];
      const differenceCells =
        item.values[differenceCellsPath];
      const expectedCommon =
        (Number(leftDenominator) *
          Number(rightDenominator)) /
        gcd(
          Number(leftDenominator),
          Number(rightDenominator)
        );
      const expectedLeftCells =
        Number(leftNumerator) *
        (expectedCommon / Number(leftDenominator));
      const expectedRightCells =
        Number(rightNumerator) *
        (expectedCommon / Number(rightDenominator));
      const expectedDifference =
        expectedLeftCells - expectedRightCells;
      const denominatorPairKey = [
        Number(leftDenominator),
        Number(rightDenominator)
      ]
        .sort((left, right) => left - right)
        .join(":");
      const reducedDifferenceKey = [
        reducedKey({
          numerator: Number(leftNumerator),
          denominator: Number(leftDenominator)
        }),
        reducedKey({
          numerator: Number(rightNumerator),
          denominator: Number(rightDenominator)
        })
      ].join("-");
      const duplicateDenominatorPair =
        seenDenominatorPairs.has(denominatorPairKey);
      const duplicateReducedDifference =
        seenReducedDifferences.has(reducedDifferenceKey);
      seenDenominatorPairs.add(denominatorPairKey);
      seenReducedDifferences.add(reducedDifferenceKey);
      const correct = item.values[correctPath];
      const misconceptions = misconceptionPaths.map(
        (path) => item.values[path]
      );
      const expectedMisconceptions = [
        `${expectedLeftCells - Number(rightNumerator)}/` +
          `${expectedCommon}`,
        `${expectedRightCells}/${expectedCommon}`,
        `${expectedLeftCells}/${expectedCommon}`,
        `${expectedDifference}/` +
          `${Number(leftDenominator) + Number(rightDenominator)}`
      ];
      const candidates = candidatePaths.map(
        (path) => item.values[path]
      );
      const parsedCandidates = candidates.map((value) => {
        if (typeof value !== "string") return undefined;
        const match = /^(\d+)\/(\d+)$/.exec(value);
        if (!match) return undefined;
        return {
          numerator: Number(match[1]),
          denominator: Number(match[2])
        };
      });
      const valid =
        typeof leftDenominator === "number" &&
        Number.isInteger(leftDenominator) &&
        leftDenominator >= 2 &&
        leftDenominator <= 12 &&
        typeof rightDenominator === "number" &&
        Number.isInteger(rightDenominator) &&
        rightDenominator >= 2 &&
        rightDenominator <= 12 &&
        rightDenominator !== leftDenominator &&
        typeof leftNumerator === "number" &&
        Number.isInteger(leftNumerator) &&
        leftNumerator > 0 &&
        leftNumerator < leftDenominator &&
        gcd(leftNumerator, leftDenominator) === 1 &&
        typeof rightNumerator === "number" &&
        Number.isInteger(rightNumerator) &&
        rightNumerator > 0 &&
        rightNumerator < rightDenominator &&
        gcd(rightNumerator, rightDenominator) === 1 &&
        !duplicateDenominatorPair &&
        !duplicateReducedDifference &&
        commonDenominator === expectedCommon &&
        expectedCommon <= 12 &&
        expectedCommon >
          Math.max(leftDenominator, rightDenominator) &&
        720 % leftDenominator === 0 &&
        720 % rightDenominator === 0 &&
        720 % expectedCommon === 0 &&
        leftCells === expectedLeftCells &&
        rightCells === expectedRightCells &&
        differenceCells === expectedDifference &&
        expectedDifference >= 1 &&
        expectedDifference < expectedCommon &&
        gcd(expectedDifference, expectedCommon) === 1 &&
        correct ===
          `${expectedDifference}/${expectedCommon}` &&
        misconceptions.every(
          (value, index) =>
            value === expectedMisconceptions[index]
        ) &&
        candidates.every(
          (value) => typeof value === "string"
        ) &&
        new Set(candidates).size === 5 &&
        [correct, ...misconceptions].every(
          (value) =>
            typeof value === "string" &&
            candidates.includes(value)
        ) &&
        parsedCandidates.every(
          (value): value is Ratio =>
            value !== undefined &&
            Number.isInteger(value.numerator) &&
            Number.isInteger(value.denominator) &&
            value.numerator >= 1 &&
            value.numerator < value.denominator
        ) &&
        new Set(
          parsedCandidates
            .filter((value): value is Ratio => value !== undefined)
            .map(reducedKey)
        ).size === 5 &&
        item.values[correctLatexPath] ===
          `\\frac{${expectedDifference}}{${expectedCommon}}` &&
        parsedCandidates.every(
          (value, index) =>
            value !== undefined &&
            item.values[candidateLatexPaths[index]!] ===
              `\\frac{${value.numerator}}{${value.denominator}}`
        );
      if (!valid) {
        issue(
          issues,
          "unlike-denominator-difference-distractors-invalid",
          "pedagogy",
          `${item.id}에 한쪽만 통분하기·덮은 양 읽기·빼기 생략·분모 합 오개념을 드러내는 선택지가 없습니다.`
        );
      }
    }
  },
  "geometry.common-unit-sum-strips": (
    resolved,
    predicate,
    issues
  ) => {
    const leftStripRole = stringParameter(
      predicate,
      "leftStripRole"
    );
    const rightStripRole = stringParameter(
      predicate,
      "rightStripRole"
    );
    const joinLaneRole = stringParameter(
      predicate,
      "joinLaneRole"
    );
    const unitRulerRole = stringParameter(
      predicate,
      "unitRulerRole"
    );
    const startLineRole = stringParameter(
      predicate,
      "startLineRole"
    );
    const leftDenominatorPath = stringParameter(
      predicate,
      "leftDenominatorPath"
    );
    const rightDenominatorPath = stringParameter(
      predicate,
      "rightDenominatorPath"
    );
    const leftNumeratorPath = stringParameter(
      predicate,
      "leftNumeratorPath"
    );
    const rightNumeratorPath = stringParameter(
      predicate,
      "rightNumeratorPath"
    );
    const commonDenominatorPath = stringParameter(
      predicate,
      "commonDenominatorPath"
    );
    const sumCellsPath = stringParameter(
      predicate,
      "sumCellsPath"
    );
    for (const item of resolved.items) {
      const leftDenominator =
        item.values[leftDenominatorPath];
      const rightDenominator =
        item.values[rightDenominatorPath];
      const leftNumerator = item.values[leftNumeratorPath];
      const rightNumerator = item.values[rightNumeratorPath];
      const commonDenominator =
        item.values[commonDenominatorPath];
      const sumCells = item.values[sumCellsPath];
      const left = byRole(resolved, item.id, leftStripRole);
      const right = byRole(resolved, item.id, rightStripRole);
      const lane = byRole(resolved, item.id, joinLaneRole);
      const ruler = byRole(resolved, item.id, unitRulerRole);
      const startLine = byRole(
        resolved,
        item.id,
        startLineRole
      );
      const leftFraction =
        left?.toolIntent.kind === "fraction-model"
          ? ratio(
              {
                fraction:
                  left.toolIntent.properties.fraction
              },
              "fraction"
            )
          : undefined;
      const rightFraction =
        right?.toolIntent.kind === "fraction-model"
          ? ratio(
              {
                fraction:
                  right.toolIntent.properties.fraction
              },
              "fraction"
            )
          : undefined;
      const rulerFraction =
        ruler?.toolIntent.kind === "fraction-model"
          ? ratio(
              {
                fraction:
                  ruler.toolIntent.properties.fraction
              },
              "fraction"
            )
          : undefined;
      const valid =
        left &&
        right &&
        lane &&
        ruler &&
        startLine &&
        left.movable &&
        !left.locked &&
        right.movable &&
        !right.locked &&
        !ruler.movable &&
        ruler.locked &&
        leftFraction?.numerator === leftNumerator &&
        leftFraction?.denominator === leftDenominator &&
        rightFraction?.numerator === rightNumerator &&
        rightFraction?.denominator === rightDenominator &&
        rulerFraction?.numerator === commonDenominator &&
        rulerFraction?.denominator === commonDenominator &&
        Number(commonDenominator) %
          Number(leftDenominator) ===
          0 &&
        Number(commonDenominator) %
          Number(rightDenominator) ===
          0 &&
        Number(commonDenominator) >
          Math.max(
            Number(leftDenominator),
            Number(rightDenominator)
          ) &&
        Number(sumCells) < Number(commonDenominator) &&
        left.bounds.x === right.bounds.x &&
        left.bounds.x === lane.bounds.x &&
        left.bounds.x === ruler.bounds.x &&
        left.bounds.width === right.bounds.width &&
        left.bounds.width === lane.bounds.width &&
        left.bounds.width === ruler.bounds.width &&
        startLine.bounds.x + startLine.bounds.width / 2 ===
          lane.bounds.x &&
        ruler.bounds.y >=
          lane.bounds.y + lane.bounds.height;
      if (!valid) {
        issue(
          issues,
          "common-unit-sum-strip-geometry-invalid",
          "pedagogy",
          `${item.id}의 두 분수 띠와 공통 단위 자가 같은 전체·출발선·칸 단위를 사용하지 않습니다.`
        );
      }
    }
  },
  "values.improper-sum-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const denominatorPath = stringParameter(
      predicate,
      "denominatorPath"
    );
    const leftNumeratorPath = stringParameter(
      predicate,
      "leftNumeratorPath"
    );
    const rightNumeratorPath = stringParameter(
      predicate,
      "rightNumeratorPath"
    );
    const sumNumeratorPath = stringParameter(
      predicate,
      "sumNumeratorPath"
    );
    const overflowNumeratorPath = stringParameter(
      predicate,
      "overflowNumeratorPath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const misconceptionPaths = [
      stringParameter(predicate, "addBothTextPath"),
      stringParameter(predicate, "capAtOneTextPath"),
      stringParameter(predicate, "overflowOnlyTextPath"),
      stringParameter(predicate, "largerAddendTextPath")
    ];
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      5
    );
    const candidateLatexPaths = candidatePaths.map(
      (path) => `${path}Latex`
    );
    const correctLatexPath = correctPath.endsWith("Text")
      ? `${correctPath.slice(0, -4)}Latex`
      : `${correctPath}Latex`;
    for (const item of resolved.items) {
      const denominator = item.values[denominatorPath];
      const leftNumerator = item.values[leftNumeratorPath];
      const rightNumerator = item.values[rightNumeratorPath];
      const sumNumerator = item.values[sumNumeratorPath];
      const overflowNumerator =
        item.values[overflowNumeratorPath];
      const correct = item.values[correctPath];
      const misconceptions = misconceptionPaths.map(
        (path) => item.values[path]
      );
      const candidates = candidatePaths.map(
        (path) => item.values[path]
      );
      const expectedSum =
        Number(leftNumerator) + Number(rightNumerator);
      const expectedOverflow =
        expectedSum - Number(denominator);
      const expectedMisconceptions = [
        `${expectedSum}/${Number(denominator) * 2}`,
        `${String(denominator)}/${String(denominator)}`,
        `${expectedOverflow}/${String(denominator)}`,
        `${Math.max(
          Number(leftNumerator),
          Number(rightNumerator)
        )}/${String(denominator)}`
      ];
      const parsedCandidates = candidates.map((value) => {
        if (typeof value !== "string") return undefined;
        const match = /^(\d+)\/(\d+)$/.exec(value);
        if (!match) return undefined;
        return {
          numerator: Number(match[1]),
          denominator: Number(match[2])
        };
      });
      const candidateLatex = parsedCandidates.map((value) =>
        value
          ? `\\frac{${value.numerator}}{${value.denominator}}`
          : undefined
      );
      const valid =
        typeof denominator === "number" &&
        Number.isInteger(denominator) &&
        denominator >= 4 &&
        denominator <= 10 &&
        typeof leftNumerator === "number" &&
        Number.isInteger(leftNumerator) &&
        leftNumerator > 0 &&
        leftNumerator < denominator &&
        typeof rightNumerator === "number" &&
        Number.isInteger(rightNumerator) &&
        rightNumerator > 0 &&
        rightNumerator < denominator &&
        leftNumerator !== rightNumerator &&
        sumNumerator === expectedSum &&
        expectedSum > denominator &&
        expectedSum <= denominator * 2 - 2 &&
        overflowNumerator === expectedOverflow &&
        correct === `${expectedSum}/${denominator}` &&
        misconceptions.every(
          (value, index) =>
            value === expectedMisconceptions[index]
        ) &&
        candidates.every(
          (value) => typeof value === "string"
        ) &&
        new Set(candidates).size === 5 &&
        [correct, ...misconceptions].every(
          (value) =>
            typeof value === "string" &&
            candidates.includes(value)
        ) &&
        parsedCandidates.every(
          (value): value is Ratio => value !== undefined
        ) &&
        new Set(
          parsedCandidates
            .filter((value): value is Ratio => value !== undefined)
            .map(reducedKey)
        ).size === 5 &&
        item.values[correctLatexPath] ===
          `\\frac{${expectedSum}}{${String(denominator)}}` &&
        candidateLatex.every(
          (value, index) =>
            value !== undefined &&
            item.values[candidateLatexPaths[index]!] === value
        );
      if (!valid) {
        issue(
          issues,
          "improper-sum-distractors-invalid",
          "pedagogy",
          `${item.id}에 분모까지 더하기·1에서 멈추기·넘은 부분만 읽기·큰 덧수 유지 오개념을 드러내는 선택지가 없습니다.`
        );
      }
    }
  },
  "geometry.same-denominator-sum-strips": (
    resolved,
    predicate,
    issues
  ) => {
    const leftStripRole = stringParameter(
      predicate,
      "leftStripRole"
    );
    const rightStripRole = stringParameter(
      predicate,
      "rightStripRole"
    );
    const joinLaneRole = stringParameter(
      predicate,
      "joinLaneRole"
    );
    const startLineRole = stringParameter(
      predicate,
      "startLineRole"
    );
    const wholeCountValue = parameter(
      predicate,
      "wholeCount"
    );
    const wholeCount =
      wholeCountValue === undefined ? 1 : wholeCountValue;
    const requireImproperSumValue = parameter(
      predicate,
      "requireImproperSum"
    );
    const requireImproperSum =
      requireImproperSumValue === true;
    const wholeBoundaryRoleValue = parameter(
      predicate,
      "wholeBoundaryRole"
    );
    if (
      !Number.isInteger(wholeCount) ||
      Number(wholeCount) < 1 ||
      Number(wholeCount) > 2 ||
      !(
        requireImproperSumValue === undefined ||
        typeof requireImproperSumValue === "boolean"
      ) ||
      !(
        wholeBoundaryRoleValue === undefined ||
        typeof wholeBoundaryRoleValue === "string"
      ) ||
      (Number(wholeCount) > 1 &&
        typeof wholeBoundaryRoleValue !== "string")
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:whole`
      );
    }
    const denominatorPath = stringParameter(
      predicate,
      "denominatorPath"
    );
    const leftNumeratorPath = stringParameter(
      predicate,
      "leftNumeratorPath"
    );
    const rightNumeratorPath = stringParameter(
      predicate,
      "rightNumeratorPath"
    );
    for (const item of resolved.items) {
      const denominator = item.values[denominatorPath];
      const leftNumerator = item.values[leftNumeratorPath];
      const rightNumerator = item.values[rightNumeratorPath];
      const left = byRole(resolved, item.id, leftStripRole);
      const right = byRole(resolved, item.id, rightStripRole);
      const lane = byRole(resolved, item.id, joinLaneRole);
      const startLine = byRole(resolved, item.id, startLineRole);
      const wholeBoundary =
        typeof wholeBoundaryRoleValue === "string"
          ? byRole(
              resolved,
              item.id,
              wholeBoundaryRoleValue
            )
          : undefined;
      const leftFraction =
        left?.toolIntent.kind === "fraction-model"
          ? ratio(
              {
                fraction:
                  left.toolIntent.properties.fraction
              },
              "fraction"
            )
          : undefined;
      const rightFraction =
        right?.toolIntent.kind === "fraction-model"
          ? ratio(
              {
                fraction:
                  right.toolIntent.properties.fraction
              },
              "fraction"
            )
          : undefined;
      const valid =
        left &&
        right &&
        lane &&
        startLine &&
        left.movable &&
        !left.locked &&
        right.movable &&
        !right.locked &&
        leftFraction?.numerator === leftNumerator &&
        leftFraction?.denominator === denominator &&
        rightFraction?.numerator === rightNumerator &&
        rightFraction?.denominator === denominator &&
        left.bounds.x === right.bounds.x &&
        left.bounds.x === lane.bounds.x &&
        left.bounds.width === right.bounds.width &&
        left.bounds.width * Number(wholeCount) ===
          lane.bounds.width &&
        startLine.bounds.x + startLine.bounds.width / 2 ===
          lane.bounds.x &&
        (Number(wholeCount) === 1 ||
          (wholeBoundary &&
            wholeBoundary.bounds.x +
              wholeBoundary.bounds.width / 2 ===
              lane.bounds.x + left.bounds.width)) &&
        (requireImproperSum
          ? Number(leftNumerator) +
              Number(rightNumerator) >
              Number(denominator) &&
            Number(leftNumerator) +
              Number(rightNumerator) <
              Number(denominator) * 2
          : Number(leftNumerator) +
              Number(rightNumerator) <
            Number(denominator));
      if (!valid) {
        issue(
          issues,
          "same-denominator-sum-strip-geometry-invalid",
          "pedagogy",
          `${item.id}의 두 분수 띠가 같은 전체·같은 단위와 공통 출발선을 사용하지 않습니다.`
        );
      }
    }
  },
  "values.elapsed-time-distractors": (
    resolved,
    predicate,
    issues
  ) => {
    const startHourPath = stringParameter(
      predicate,
      "startHourPath"
    );
    const startMinutePath = stringParameter(
      predicate,
      "startMinutePath"
    );
    const endHourPath = stringParameter(
      predicate,
      "endHourPath"
    );
    const endMinutePath = stringParameter(
      predicate,
      "endMinutePath"
    );
    const elapsedMinutesPath = stringParameter(
      predicate,
      "elapsedMinutesPath"
    );
    const correctPath = stringParameter(predicate, "correctPath");
    const misconceptionPaths = [
      stringParameter(predicate, "minuteDifferenceTextPath"),
      stringParameter(predicate, "hourOnlyTextPath"),
      stringParameter(predicate, "decimalBorrowTextPath"),
      stringParameter(predicate, "startMinuteTextPath")
    ];
    const candidatePaths = stringArrayParameter(
      predicate,
      "candidatePaths",
      5
    );
    for (const item of resolved.items) {
      const startHour = item.values[startHourPath];
      const startMinute = item.values[startMinutePath];
      const endHour = item.values[endHourPath];
      const endMinute = item.values[endMinutePath];
      const elapsedMinutes = item.values[elapsedMinutesPath];
      const correct = item.values[correctPath];
      const misconceptions = misconceptionPaths.map(
        (path) => item.values[path]
      );
      const candidates = candidatePaths.map(
        (path) => item.values[path]
      );
      const expectedEndHour =
        startHour === 12 ? 1 : Number(startHour) + 1;
      const expectedEndMinute =
        Number(startMinute) + Number(elapsedMinutes) - 60;
      const expectedMisconceptions = [
        `${Math.abs(
          Number(endMinute) - Number(startMinute)
        )}분`,
        "60분",
        `${100 - Number(startMinute) + Number(endMinute)}분`,
        `${String(startMinute)}분`
      ];
      const valid =
        typeof startHour === "number" &&
        Number.isInteger(startHour) &&
        startHour >= 1 &&
        startHour <= 12 &&
        typeof startMinute === "number" &&
        Number.isInteger(startMinute) &&
        startMinute >= 35 &&
        startMinute <= 55 &&
        startMinute % 5 === 0 &&
        typeof elapsedMinutes === "number" &&
        Number.isInteger(elapsedMinutes) &&
        elapsedMinutes >= 15 &&
        elapsedMinutes <= 45 &&
        elapsedMinutes % 5 === 0 &&
        Number(startMinute) + elapsedMinutes >= 60 &&
        endHour === expectedEndHour &&
        endMinute === expectedEndMinute &&
        correct === `${elapsedMinutes}분` &&
        misconceptions.every(
          (value, index) =>
            value === expectedMisconceptions[index]
        ) &&
        candidates.every(
          (value) => typeof value === "string"
        ) &&
        new Set(candidates).size === 5 &&
        [correct, ...misconceptions].every(
          (value) =>
            typeof value === "string" &&
            candidates.includes(value)
        );
      if (!valid) {
        issue(
          issues,
          "elapsed-time-distractors-invalid",
          "pedagogy",
          `${item.id}에 분끼리 빼기·60분 고정·100분 빌림 오개념을 드러내는 선택지가 없습니다.`
        );
      }
    }
  },
  "visual.clock-pair-consistent": (
    resolved,
    predicate,
    issues
  ) => {
    const startClockRole = stringParameter(
      predicate,
      "startClockRole"
    );
    const endClockRole = stringParameter(
      predicate,
      "endClockRole"
    );
    const startHourPath = stringParameter(
      predicate,
      "startHourPath"
    );
    const startMinutePath = stringParameter(
      predicate,
      "startMinutePath"
    );
    const endHourPath = stringParameter(
      predicate,
      "endHourPath"
    );
    const endMinutePath = stringParameter(
      predicate,
      "endMinutePath"
    );
    for (const item of resolved.items) {
      const startClock = byRole(
        resolved,
        item.id,
        startClockRole
      );
      const endClock = byRole(resolved, item.id, endClockRole);
      const clockMatches = (
        clock: ResolvedEmission | undefined,
        hourPath: string,
        minutePath: string
      ) =>
        clock?.toolIntent.kind === "analog-clock" &&
        clock.toolIntent.properties.hours ===
          item.values[hourPath] &&
        clock.toolIntent.properties.minutes ===
          item.values[minutePath] &&
        clock.toolIntent.properties.clockType === "geared" &&
        clock.toolIntent.properties.isWorking === false;
      if (
        !clockMatches(
          startClock,
          startHourPath,
          startMinutePath
        ) ||
        !clockMatches(endClock, endHourPath, endMinutePath)
      ) {
        issue(
          issues,
          "clock-pair-visual-mismatch",
          "mathematics",
          `${item.id}의 시작·끝 시계가 문항 시각과 맞지 않습니다.`
        );
      }
    }
  },
  "values.no-duplicate-combination": (
    resolved,
    predicate,
    issues
  ) => {
    const paths = parameter(predicate, "valuePaths");
    if (
      !Array.isArray(paths) ||
      paths.length < 2 ||
      !paths.every((value) => typeof value === "string")
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:valuePaths`
      );
    }
    const seen = new Set<string>();
    for (const item of resolved.items) {
      const key = paths
        .map((path) => item.values[path])
        .sort()
        .join("|");
      if (seen.has(key)) {
        issue(
          issues,
          "duplicate-value-combination",
          "pedagogy",
          `${item.id}가 앞 문항과 같은 수 조합입니다.`
        );
      }
      seen.add(key);
    }
  },
  "values.construction-solution-set": (
    resolved,
    predicate,
    issues
  ) => {
    const piecePaths = stringArrayParameter(
      predicate,
      "piecePaths",
      3
    );
    const solutionSetPath = stringParameter(
      predicate,
      "solutionSetPath"
    );
    const totalPath = stringParameter(predicate, "totalPath");
    const slotCount = parameter(predicate, "slotCount");
    const minimumSolutions = parameter(
      predicate,
      "minimumSolutions"
    );
    if (
      slotCount !== 2 ||
      typeof minimumSolutions !== "number" ||
      !Number.isInteger(minimumSolutions) ||
      minimumSolutions < 2
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:construction`
      );
    }
    for (const item of resolved.items) {
      const pieces = numericValues(item.values, piecePaths);
      const total = item.values[totalPath];
      const solutions = numericPairList(
        item.values[solutionSetPath]
      );
      const actual =
        pieces && typeof total === "number"
          ? allPairs(pieces).filter(
              (pair) => pair[0] + pair[1] === total
            )
          : [];
      const valid =
        pieces &&
        new Set(pieces).size === pieces.length &&
        typeof total === "number" &&
        Number.isInteger(total) &&
        solutions &&
        solutions.length >= minimumSolutions &&
        sameStringSet(
          solutions.map(pairKey),
          actual.map(pairKey)
        );
      if (!valid) {
        issue(
          issues,
          "construction-solution-invalid",
          "mathematics",
          `${item.id}의 카드 풀과 가능한 구성 해 집합이 일치하지 않습니다.`
        );
      }
    }
  },
  "values.product-construction-solution-set": (
    resolved,
    predicate,
    issues
  ) => {
    const piecePaths = stringArrayParameter(
      predicate,
      "piecePaths",
      3
    );
    const solutionSetPath = stringParameter(
      predicate,
      "solutionSetPath"
    );
    const totalPath = stringParameter(predicate, "totalPath");
    const slotCount = parameter(predicate, "slotCount");
    const minimumSolutions = parameter(
      predicate,
      "minimumSolutions"
    );
    if (
      slotCount !== 2 ||
      typeof minimumSolutions !== "number" ||
      !Number.isInteger(minimumSolutions) ||
      minimumSolutions < 2
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:product-construction`
      );
    }
    for (const item of resolved.items) {
      const pieces = numericValues(item.values, piecePaths);
      const total = item.values[totalPath];
      const solutions = numericPairList(
        item.values[solutionSetPath]
      );
      const actual =
        pieces && typeof total === "number"
          ? allPairs(pieces).filter(
              (pair) => pair[0] * pair[1] === total
            )
          : [];
      const valid =
        pieces &&
        new Set(pieces).size === pieces.length &&
        typeof total === "number" &&
        Number.isInteger(total) &&
        solutions &&
        solutions.length >= minimumSolutions &&
        sameStringSet(
          solutions.map(pairKey),
          actual.map(pairKey)
        );
      if (!valid) {
        issue(
          issues,
          "product-construction-solution-invalid",
          "mathematics",
          `${item.id}의 수 카드와 곱이 목표 수가 되는 약수쌍이 일치하지 않습니다.`
        );
      }
    }
  },
  "values.partial-operation-card-set": (
    resolved,
    predicate,
    issues
  ) => {
    const cardsPath = stringParameter(predicate, "cardsPath");
    const solutionSetPath = stringParameter(
      predicate,
      "solutionSetPath"
    );
    const operationKindPath = stringParameter(
      predicate,
      "operationKindPath"
    );
    const wholeOperandPath = stringParameter(
      predicate,
      "wholeOperandPath"
    );
    const fixedOperandPath = stringParameter(
      predicate,
      "fixedOperandPath"
    );
    const totalPath = stringParameter(predicate, "totalPath");

    for (const item of resolved.items) {
      const cards = item.values[cardsPath];
      const operationKind = item.values[operationKindPath];
      const wholeOperand = item.values[wholeOperandPath];
      const fixedOperand = item.values[fixedOperandPath];
      const total = item.values[totalPath];
      const solutions = numericPairList(
        item.values[solutionSetPath]
      );
      const typedCards = Array.isArray(cards)
        ? cards.filter(
            (card): card is Record<string, unknown> =>
              card !== null &&
              typeof card === "object" &&
              !Array.isArray(card)
          )
        : [];
      const basicValid =
        (operationKind === "multiply" ||
          operationKind === "divide") &&
        typeof wholeOperand === "number" &&
        Number.isInteger(wholeOperand) &&
        typeof fixedOperand === "number" &&
        Number.isInteger(fixedOperand) &&
        fixedOperand > 0 &&
        typeof total === "number" &&
        Number.isInteger(total) &&
        typedCards.length === 8 &&
        solutions !== undefined;
      const expectedTotal =
        operationKind === "multiply"
          ? Number(wholeOperand) * Number(fixedOperand)
          : Number(wholeOperand) / Number(fixedOperand);
      const values = typedCards.map((card) => card.value);
      const validExpressionCards = typedCards.filter(
        (card) => card.operationKind === operationKind
      );
      const expressionCardsValid = validExpressionCards.every(
        (card) => {
          const part = card.partOperand;
          const value = card.value;
          const text = card.text;
          if (
            typeof part !== "number" ||
            !Number.isInteger(part) ||
            typeof value !== "number" ||
            !Number.isInteger(value) ||
            typeof text !== "string"
          ) {
            return false;
          }
          const expectedValue =
            operationKind === "multiply"
              ? part * Number(fixedOperand)
              : part / Number(fixedOperand);
          const expectedText =
            operationKind === "multiply"
              ? `${part}\\times${String(fixedOperand)}`
              : `${part}\\div${String(fixedOperand)}`;
          return (
            Number.isInteger(expectedValue) &&
            value === expectedValue &&
            text === expectedText
          );
        }
      );
      const misconceptionCardsValid = typedCards
        .filter((card) => card.operationKind === "misconception")
        .every(
          (card) =>
            typeof card.text === "string" &&
            card.text.length > 0 &&
            typeof card.value === "number" &&
            Number.isInteger(card.value) &&
            typeof card.misconception === "string" &&
            card.misconception.length > 0
        );
      const actualPairs = values.every(
        (value) => typeof value === "number" && Number.isInteger(value)
      )
        ? allPairs(values as number[]).filter(
            ([left, right]) => left + right === total
          )
        : [];
      const solutionPartsValid =
        solutions?.every(([left, right]) => {
          const leftCard = validExpressionCards.find(
            (card) => card.value === left
          );
          const rightCard = validExpressionCards.find(
            (card) => card.value === right
          );
          return (
            typeof leftCard?.partOperand === "number" &&
            typeof rightCard?.partOperand === "number" &&
            leftCard.partOperand + rightCard.partOperand === wholeOperand
          );
        }) ?? false;
      const valid =
        basicValid &&
        expectedTotal === total &&
        new Set(values).size === values.length &&
        validExpressionCards.length === 4 &&
        typedCards.length - validExpressionCards.length === 4 &&
        expressionCardsValid &&
        misconceptionCardsValid &&
        solutionPartsValid &&
        sameStringSet(
          (solutions ?? []).map(pairKey),
          actualPairs.map(pairKey)
        );
      if (!valid) {
        issue(
          issues,
          "partial-operation-card-set-invalid",
          "mathematics",
          `${item.id}의 식 카드, 부분 계산, 가능한 두 분해 방법이 서로 맞지 않습니다.`
        );
      }
    }
  },
  "values.surplus-piece-present": (
    resolved,
    predicate,
    issues
  ) => {
    const piecePaths = stringArrayParameter(
      predicate,
      "piecePaths",
      3
    );
    const solutionSetPath = stringParameter(
      predicate,
      "solutionSetPath"
    );
    const surplusPath = stringParameter(
      predicate,
      "surplusPath"
    );
    const minimumSurplus = parameter(
      predicate,
      "minimumSurplus"
    );
    if (
      typeof minimumSurplus !== "number" ||
      !Number.isInteger(minimumSurplus) ||
      minimumSurplus < 1
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:minimumSurplus`
      );
    }
    for (const item of resolved.items) {
      const pieces = numericValues(item.values, piecePaths);
      const solutions = numericPairList(
        item.values[solutionSetPath]
      );
      const declared = item.values[surplusPath];
      const used = new Set(solutions?.flat() ?? []);
      const actual = pieces?.filter((piece) => !used.has(piece));
      const valid =
        Array.isArray(declared) &&
        declared.every(
          (value) =>
            typeof value === "number" &&
            Number.isInteger(value)
        ) &&
        actual !== undefined &&
        actual.length >= minimumSurplus &&
        sameStringSet(
          (declared as number[]).map(String),
          actual.map(String)
        );
      if (!valid) {
        issue(
          issues,
          "construction-surplus-missing",
          "pedagogy",
          `${item.id}에 해에 쓰이지 않는 버릴 수 있는 카드가 충분하지 않습니다.`
        );
      }
    }
  },
  "values.near-miss-combination": (
    resolved,
    predicate,
    issues
  ) => {
    const piecePaths = stringArrayParameter(
      predicate,
      "piecePaths",
      3
    );
    const nearMissPath = stringParameter(
      predicate,
      "nearMissPath"
    );
    const totalPath = stringParameter(predicate, "totalPath");
    for (const item of resolved.items) {
      const pieces = numericValues(item.values, piecePaths);
      const total = item.values[totalPath];
      const declared = numericPairList(item.values[nearMissPath]);
      const actual =
        pieces && typeof total === "number"
          ? allPairs(pieces).filter(
              (pair) =>
                Math.abs(pair[0] + pair[1] - total) === 1
            )
          : [];
      if (
        !declared ||
        declared.length < 1 ||
        !sameStringSet(
          declared.map(pairKey),
          actual.map(pairKey)
        )
      ) {
        issue(
          issues,
          "near-miss-combination-missing",
          "pedagogy",
          `${item.id}에 10과 하나 차이 나는 그럴듯한 오답 조합이 없습니다.`
        );
      }
    }
  },
  "visual.discrete-model-consistent": (
    resolved,
    predicate,
    issues
  ) => {
    const paths = parameter(predicate, "valuePaths");
    const roles = parameter(predicate, "sourceRoles");
    if (
      !Array.isArray(paths) ||
      !Array.isArray(roles) ||
      paths.length !== roles.length ||
      !paths.every((value) => typeof value === "string") ||
      !roles.every((value) => typeof value === "string")
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:pairs`
      );
    }
    for (const item of resolved.items) {
      const mismatch = paths.some((path, index) => {
        const model = byRole(resolved, item.id, roles[index]!);
        return (
          !model ||
          model.toolIntent.properties.value !== item.values[path]
        );
      });
      if (mismatch) {
        issue(
          issues,
          "visual-discrete-value-mismatch",
          "mathematics",
          `${item.id}의 수 카드와 의미 값이 다릅니다.`
        );
      }
    }
  },
  "geometry.same-whole-and-start": (
    resolved,
    predicate,
    issues
  ) => {
    const sourceRoles = parameter(predicate, "sourceRoles");
    const targetRoles = parameter(predicate, "targetRoles");
    const anchorRole = stringParameter(predicate, "anchorRole");
    if (
      !Array.isArray(sourceRoles) ||
      sourceRoles.length !== 2 ||
      !sourceRoles.every((value) => typeof value === "string") ||
      !Array.isArray(targetRoles) ||
      targetRoles.length !== 2 ||
      !targetRoles.every((value) => typeof value === "string")
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:roles`
      );
    }
    for (const item of resolved.items) {
      const sources = sourceRoles.map((role) =>
        byRole(resolved, item.id, role)
      );
      const targets = targetRoles.map((role) =>
        byRole(resolved, item.id, role)
      );
      const anchor = byRole(resolved, item.id, anchorRole);
      if (
        sources.some((value) => !value) ||
        targets.some((value) => !value) ||
        !anchor ||
        sources[0]!.bounds.width !== sources[1]!.bounds.width ||
        targets[0]!.bounds.x !== targets[1]!.bounds.x ||
        targets[0]!.bounds.width !== targets[1]!.bounds.width ||
        anchor.bounds.x + anchor.bounds.width / 2 !==
          targets[0]!.bounds.x
      ) {
        issue(
          issues,
          "same-whole-violated",
          "pedagogy",
          `${item.id}의 공통 전체와 출발선이 일치하지 않습니다.`
        );
      }
    }
  },
  "geometry.reference-target-same-whole-start": (
    resolved,
    predicate,
    issues
  ) => {
    const referenceRole = stringParameter(
      predicate,
      "referenceRole"
    );
    const targetRole = stringParameter(predicate, "targetRole");
    const anchorRole = stringParameter(predicate, "anchorRole");
    for (const item of resolved.items) {
      const reference = byRole(
        resolved,
        item.id,
        referenceRole
      );
      const target = byRole(resolved, item.id, targetRole);
      const anchor = byRole(resolved, item.id, anchorRole);
      if (
        !reference ||
        !target ||
        !anchor ||
        !reference.locked ||
        reference.bounds.x !== target.bounds.x ||
        reference.bounds.width !== target.bounds.width ||
        anchor.bounds.x + anchor.bounds.width / 2 !==
          target.bounds.x
      ) {
        issue(
          issues,
          "reference-whole-start-violated",
          "pedagogy",
          `${item.id}의 기준 띠와 선택 띠가 같은 전체와 출발선을 사용하지 않습니다.`
        );
      }
    }
  },
  "geometry.countable-unit-frame": (
    resolved,
    predicate,
    issues
  ) => {
    const cellRoles = stringArrayParameter(
      predicate,
      "cellRoles",
      2
    );
    const expectedCountPath = stringParameter(
      predicate,
      "expectedCountPath"
    );
    const rowCount = parameter(predicate, "rowCount");
    const columnCount = parameter(predicate, "columnCount");
    if (
      typeof rowCount !== "number" ||
      typeof columnCount !== "number" ||
      !Number.isInteger(rowCount) ||
      !Number.isInteger(columnCount) ||
      rowCount < 1 ||
      columnCount < 1
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:grid`
      );
    }
    for (const item of resolved.items) {
      const cells = cellRoles.map((role) =>
        byRole(resolved, item.id, role)
      );
      const present = cells.filter(
        (cell): cell is ResolvedEmission => cell !== undefined
      );
      const xValues = [
        ...new Set(present.map((cell) => cell.bounds.x))
      ];
      const yValues = [
        ...new Set(present.map((cell) => cell.bounds.y))
      ];
      const expectedCount = item.values[expectedCountPath];
      const first = present[0];
      const valid =
        expectedCount === rowCount * columnCount &&
        cellRoles.length === expectedCount &&
        present.length === cellRoles.length &&
        present.every(
          (cell) =>
            cell.locked &&
            !cell.movable &&
            cell.bounds.width === first?.bounds.width &&
            cell.bounds.height === first?.bounds.height
        ) &&
        xValues.length === columnCount &&
        yValues.length === rowCount &&
        xValues.every((x) =>
          yValues.every((y) =>
            present.some(
              (cell) =>
                cell.bounds.x === x && cell.bounds.y === y
            )
          )
        );
      if (!valid) {
        issue(
          issues,
          "countable-unit-frame-invalid",
          "pedagogy",
          `${item.id}의 열 칸 모형이 셀 수 있는 2차원 단위 구조가 아닙니다.`
        );
      }
    }
  },
  "geometry.factor-array-board": (
    resolved,
    predicate,
    issues
  ) => {
    const role = stringParameter(predicate, "role");
    const textPath = stringParameter(predicate, "textPath");
    const rowCountPath = stringParameter(
      predicate,
      "rowCountPath"
    );
    const columnCountPath = stringParameter(
      predicate,
      "columnCountPath"
    );
    for (const item of resolved.items) {
      const board = byRole(resolved, item.id, role);
      const text = item.values[textPath];
      const rowCount = item.values[rowCountPath];
      const columnCount = item.values[columnCountPath];
      const rows = typeof text === "string" ? text.split("\n") : [];
      const valid =
        board?.locked === true &&
        board.movable === false &&
        board.toolIntent.toolKey === "common.text" &&
        board.toolIntent.properties.text === text &&
        typeof rowCount === "number" &&
        typeof columnCount === "number" &&
        Number.isInteger(rowCount) &&
        Number.isInteger(columnCount) &&
        rows.length === rowCount &&
        rows.every(
          (row) => [...row].filter((character) => character === "□").length === columnCount
        );
      if (!valid) {
        issue(
          issues,
          "factor-array-board-invalid",
          "pedagogy",
          `${item.id}의 약수쌍 배열판이 빈 단위 격자로 구성되지 않았습니다.`
        );
      }
    }
  },
  "cognitive.release-contract": (
    resolved,
    predicate,
    issues
  ) => {
    const mode = stringParameter(predicate, "mode");
    const predictionRole = stringParameter(
      predicate,
      "predictionRole"
    );
    const explanationRole = stringParameter(
      predicate,
      "explanationRole"
    );
    const verificationRoles = stringArrayParameter(
      predicate,
      "verificationRoles"
    );

    for (const item of resolved.items) {
      if (mode === "select-one") {
        const decisionConstraintId = stringParameter(
          predicate,
          "decisionConstraintId"
        );
        const candidateRoles = stringArrayParameter(
          predicate,
          "candidateRoles",
          3
        );
        const candidateProperty = stringParameter(
          predicate,
          "candidateProperty"
        );
        const correctValuePath = stringParameter(
          predicate,
          "correctValuePath"
        );
        const candidates = candidateRoles.map((role) =>
          byRole(resolved, item.id, role)
        );
        const correctValue = item.values[correctValuePath];
        const decision = resolved.constraints.find(
          (constraint) =>
            constraint.id === `${decisionConstraintId}:${item.id}`
        );
        const candidateIds = candidates
          .filter(
            (candidate): candidate is ResolvedEmission =>
              candidate !== undefined
          )
          .map((candidate) => candidate.id);

        if (
          candidates.some(
            (candidate) =>
              !candidate?.movable || candidate.locked
          ) ||
          !decision ||
          decision.kind !== "select-one-of" ||
          decision.satisfiedInitially ||
          candidateIds.length !== candidateRoles.length ||
          decision.sourceIds.length !== candidateIds.length ||
          candidateIds.some(
            (candidateId) =>
              !decision.sourceIds.includes(candidateId)
          )
        ) {
          issue(
            issues,
            "cognitive-decision-missing",
            "pedagogy",
            `${item.id}에 되돌릴 수 있는 수학적 선택이 없습니다.`
          );
        }

        const matchingCandidates = candidates.filter(
          (candidate) =>
            sameValue(
              candidate?.toolIntent.properties[candidateProperty],
              correctValue
            )
        );
        if (
          matchingCandidates.length !== 1 ||
          candidates.length - matchingCandidates.length < 1
        ) {
          issue(
            issues,
            "cognitive-distractor-space-invalid",
            "pedagogy",
            `${item.id}의 후보에는 정확한 선택 1개와 버릴 수 있는 대안이 필요합니다.`
          );
        }

        const answerLeak = resolved.emissions.some(
          (emission) =>
            (emission.itemId === item.id ||
              emission.itemId === undefined) &&
            !candidateRoles.includes(emission.role) &&
            (containsValue(
              emission.toolIntent.properties,
              correctValue
            ) ||
              containsVisibleTextValue(
                emission.toolIntent.properties,
                correctValue
              ))
        );
        if (correctValue === undefined || answerLeak) {
          issue(
            issues,
            "cognitive-answer-visible",
            "pedagogy",
            `${item.id}의 정답이 학생 행동 전에 노출됩니다.`
          );
        }
      } else if (mode === "construct") {
        const slotRoles = stringArrayParameter(
          predicate,
          "slotRoles",
          2
        );
        const pieceRoles = stringArrayParameter(
          predicate,
          "pieceRoles",
          3
        );
        const pieceProperty = stringParameter(
          predicate,
          "pieceProperty"
        );
        const totalPath = stringParameter(
          predicate,
          "totalPath"
        );
        const solutionSetPath = stringParameter(
          predicate,
          "solutionSetPath"
        );
        const surplusPath = stringParameter(
          predicate,
          "surplusPath"
        );
        const minimumSolutions = parameter(
          predicate,
          "minimumSolutions"
        );
        const minimumSurplus = parameter(
          predicate,
          "minimumSurplus"
        );
        if (
          typeof minimumSolutions !== "number" ||
          typeof minimumSurplus !== "number" ||
          !Number.isInteger(minimumSolutions) ||
          !Number.isInteger(minimumSurplus)
        ) {
          throw new Error(
            `predicate-parameter-invalid:${predicate.kind}:construct`
          );
        }
        const pieces = pieceRoles.map((role) =>
          byRole(resolved, item.id, role)
        );
        const slots = slotRoles.map((role) =>
          byRole(resolved, item.id, role)
        );
        const pieceIds = pieces
          .filter(
            (piece): piece is ResolvedEmission =>
              piece !== undefined
          )
          .map((piece) => piece.id);
        const decisions = slots.map((slot) =>
          resolved.constraints.find(
            (constraint) =>
              constraint.targetId === slot?.id &&
              constraint.kind === "fill-from-pool"
          )
        );
        const decisionInvalid =
          pieces.some(
            (piece) => !piece?.movable || piece.locked
          ) ||
          slots.some(
            (slot) => !slot?.locked || slot.movable
          ) ||
          pieceIds.length !== pieceRoles.length ||
          decisions.some(
            (decision) =>
              !decision ||
              decision.satisfiedInitially ||
              decision.sourceIds.length !== pieceIds.length ||
              pieceIds.some(
                (pieceId) =>
                  !decision.sourceIds.includes(pieceId)
              )
          );
        if (decisionInvalid) {
          issue(
            issues,
            "cognitive-decision-missing",
            "pedagogy",
            `${item.id}에 여러 후보에서 두 수를 구성하는 되돌릴 수 있는 판단이 없습니다.`
          );
        }

        const pieceValues = pieces.map(
          (piece) => piece?.toolIntent.properties[pieceProperty]
        );
        const solutions = numericPairList(
          item.values[solutionSetPath]
        );
        const surplus = item.values[surplusPath];
        const total = item.values[totalPath];
        const distractorSpaceInvalid =
          pieceValues.some((value) => value === undefined) ||
          !solutions ||
          solutions.length < minimumSolutions ||
          !Array.isArray(surplus) ||
          surplus.length < minimumSurplus ||
          surplus.some(
            (value) =>
              !pieceValues.some((pieceValue) =>
                sameValue(pieceValue, value)
              )
          );
        if (distractorSpaceInvalid) {
          issue(
            issues,
            "cognitive-distractor-space-invalid",
            "pedagogy",
            `${item.id}에는 여러 해와 해에 쓰이지 않는 후보가 함께 있어야 합니다.`
          );
        }

        const answerLeak =
          solutions?.some((solution) =>
            resolved.emissions.some(
              (emission) =>
                (emission.itemId === item.id ||
                  emission.itemId === undefined) &&
                !pieceRoles.includes(emission.role) &&
                containsValue(
                  emission.toolIntent.properties,
                  solution
                )
            )
          ) ?? false;
        if (typeof total !== "number" || !solutions || answerLeak) {
          issue(
            issues,
            "cognitive-answer-visible",
            "pedagogy",
            `${item.id}의 구성 해가 학생 행동 전에 노출되었거나 누락되었습니다.`
          );
        }
      } else {
        throw new Error(
          `predicate-parameter-invalid:${predicate.kind}:mode`
        );
      }

      const prediction = byRole(
        resolved,
        item.id,
        predictionRole
      );
      if (!prediction || !prediction.locked) {
        issue(
          issues,
          "cognitive-prediction-region-missing",
          "pedagogy",
          `${item.id}에 빈 예측 영역이 없습니다.`
        );
      }

      const explanation = byRole(
        resolved,
        item.id,
        explanationRole
      );
      if (!explanation || !explanation.locked) {
        issue(
          issues,
          "cognitive-explanation-region-missing",
          "pedagogy",
          `${item.id}에 수학적 근거를 남길 영역이 없습니다.`
        );
      }

      if (
        verificationRoles.some(
          (role) => !byRole(resolved, item.id, role)
        )
      ) {
        issue(
          issues,
          "cognitive-self-verification-missing",
          "pedagogy",
          `${item.id}에 답을 검사할 수학적 불변량 표현이 없습니다.`
        );
      }

      const itemOpenConstraints = resolved.constraints.filter(
        (constraint) =>
          constraint.id.endsWith(`:${item.id}`) &&
          constraint.requiresStudentAction &&
          !constraint.satisfiedInitially
      );
      if (itemOpenConstraints.length === 0) {
        issue(
          issues,
          "cognitive-item-already-solved",
          "pedagogy",
          `${item.id}가 처음부터 해결된 상태입니다.`
        );
      }
    }
  },
  "cognitive.rule-state-contract": (
    resolved,
    predicate,
    issues
  ) => {
    const mode = stringParameter(predicate, "mode");
    const ruleStatePath = stringParameter(predicate, "ruleStatePath");
    const validRuleStatesPath = stringParameter(
      predicate,
      "validRuleStatesPath"
    );
    const surplusPath = stringParameter(predicate, "surplusPath");
    const variantRoles = stringArrayParameter(
      predicate,
      "variantRoles",
      2
    );
    const variantProperty = stringParameter(
      predicate,
      "variantProperty"
    );
    const continuationRuleStatePath = stringParameter(
      predicate,
      "continuationRuleStatePath"
    );
    const explanationRuleStatePath = stringParameter(
      predicate,
      "explanationRuleStatePath"
    );
    const predictionRole = stringParameter(
      predicate,
      "predictionRole"
    );
    const explanationRole = stringParameter(
      predicate,
      "explanationRole"
    );
    const verificationRoles = stringArrayParameter(
      predicate,
      "verificationRoles"
    );
    const minimumValidStates = parameter(
      predicate,
      "minimumValidStates"
    );
    const minimumSurplus = parameter(
      predicate,
      "minimumSurplus"
    );
    const distractors = parameter(predicate, "distractors");
    if (
      mode !== "construct-rule" ||
      continuationRuleStatePath !== ruleStatePath ||
      explanationRuleStatePath !== ruleStatePath ||
      typeof minimumValidStates !== "number" ||
      !Number.isInteger(minimumValidStates) ||
      minimumValidStates < 2 ||
      typeof minimumSurplus !== "number" ||
      !Number.isInteger(minimumSurplus) ||
      minimumSurplus < 1 ||
      !Array.isArray(distractors) ||
      distractors.length < 1 ||
      distractors.some(
        (entry) =>
          !entry ||
          typeof entry !== "object" ||
          typeof (entry as Record<string, unknown>).misconception !==
            "string" ||
          !(
            typeof (entry as Record<string, unknown>).role ===
              "string" ||
            typeof (entry as Record<string, unknown>).predicateKind ===
              "string"
          )
      )
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:rule-state-contract`
      );
    }

    for (const item of resolved.items) {
      const variants = variantRoles.map((role) =>
        byRole(resolved, item.id, role)
      );
      const variantIds = variants
        .filter(
          (variant): variant is ResolvedEmission =>
            variant !== undefined
        )
        .map((variant) => variant.id);
      const validRuleStates = orderedRuleStateList(
        item.values[validRuleStatesPath]
      );
      const surplusRuleStates = orderedRuleStateList(
        item.values[surplusPath]
      );
      const validStateKeys = validRuleStates?.map((state) =>
        JSON.stringify(state)
      );
      const distinctValidStates =
        validStateKeys && new Set(validStateKeys).size === validStateKeys.length;
      const surplusIsRejectable = surplusRuleStates?.every(
        (state) =>
          !validRuleStates?.some((validState) =>
            sameValue(validState, state)
          )
      );
      const hasOpenVariantDecision = resolved.constraints.some(
        (constraint) =>
          constraint.requiresStudentAction &&
          !constraint.satisfiedInitially &&
          (constraint.sourceIds.some((id) => variantIds.includes(id)) ||
            variantIds.includes(constraint.targetId))
      );
      const variantInvalid =
        variants.some(
          (variant) =>
            !variant?.movable ||
            variant.locked ||
            variant.toolIntent.properties[variantProperty] === undefined
        ) ||
        variantIds.length !== variantRoles.length ||
        !hasOpenVariantDecision;
      if (variantInvalid) {
        issue(
          issues,
          "cognitive-rule-state-decision-missing",
          "pedagogy",
          `${item.id}에 학생이 순서 있는 규칙 상태를 직접 구성하는 열린 조작이 없습니다.`
        );
      }

      const envelopeInvalid =
        item.values[ruleStatePath] === undefined ||
        !validRuleStates ||
        !distinctValidStates ||
        validRuleStates.length < minimumValidStates ||
        !surplusRuleStates ||
        surplusRuleStates.length < minimumSurplus ||
        !surplusIsRejectable;
      if (envelopeInvalid) {
        issue(
          issues,
          "cognitive-rule-state-envelope-invalid",
          "mathematics",
          `${item.id}에 서로 다른 유효 규칙 상태와 거부 가능한 잉여 상태가 충분하지 않습니다.`
        );
      }

      const answerLeak =
        validRuleStates?.some((state) =>
          resolved.emissions.some(
            (emission) =>
              (emission.itemId === item.id ||
                emission.itemId === undefined) &&
              !variantRoles.includes(emission.role) &&
              containsValue(emission.toolIntent.properties, state)
          )
        ) ?? true;
      if (answerLeak) {
        issue(
          issues,
          "cognitive-rule-state-answer-visible",
          "pedagogy",
          `${item.id}의 유효 규칙 상태가 학생의 구성 전에 화면에 노출됩니다.`
        );
      }

      const prediction = byRole(
        resolved,
        item.id,
        predictionRole
      );
      if (!prediction || !prediction.locked) {
        issue(
          issues,
          "cognitive-prediction-region-missing",
          "pedagogy",
          `${item.id}에 빈 예측 영역이 없습니다.`
        );
      }
      const explanation = byRole(
        resolved,
        item.id,
        explanationRole
      );
      if (!explanation || !explanation.locked) {
        issue(
          issues,
          "cognitive-explanation-region-missing",
          "pedagogy",
          `${item.id}에 수학적 근거를 남길 영역이 없습니다.`
        );
      }
      if (
        verificationRoles.some(
          (role) => !byRole(resolved, item.id, role)
        )
      ) {
        issue(
          issues,
          "cognitive-self-verification-missing",
          "pedagogy",
          `${item.id}에 규칙 상태를 대조할 수학적 불변량 표현이 없습니다.`
        );
      }
      const itemOpenConstraints = resolved.constraints.filter(
        (constraint) =>
          constraint.id.endsWith(`:${item.id}`) &&
          constraint.requiresStudentAction &&
          !constraint.satisfiedInitially
      );
      if (itemOpenConstraints.length === 0) {
        issue(
          issues,
          "cognitive-item-already-solved",
          "pedagogy",
          `${item.id}가 처음부터 해결된 상태입니다.`
        );
      }
    }
  },
  "language.classroom-korean": (
    resolved,
    predicate,
    issues
  ) => {
    const instructionRoles = stringArrayParameter(
      predicate,
      "instructionRoles"
    );
    const labelRoles = stringArrayParameter(
      predicate,
      "labelRoles"
    );
    const promptRoles = Array.isArray(
      predicate.parameters.promptRoles
    )
      ? stringArrayParameter(predicate, "promptRoles")
      : [];
    const maximumInstructionLength = parameter(
      predicate,
      "maximumInstructionLength"
    );
    const maximumLabelLength = parameter(
      predicate,
      "maximumLabelLength"
    );
    const rawRequiredItemValueMentions = parameter(
      predicate,
      "requiredItemValueMentions"
    );
    const requiredItemValueMentions =
      rawRequiredItemValueMentions === undefined
        ? []
        : Array.isArray(rawRequiredItemValueMentions)
          ? rawRequiredItemValueMentions.map((entry) => {
              if (
                !entry ||
                typeof entry !== "object" ||
                typeof (entry as { valueKey?: unknown }).valueKey !==
                  "string" ||
                !Array.isArray(
                  (entry as { roles?: unknown }).roles
                ) ||
                (entry as { roles: unknown[] }).roles.length === 0 ||
                !(entry as { roles: unknown[] }).roles.every(
                  (role) => typeof role === "string" && role.length > 0
                ) ||
                ("valueFields" in entry &&
                  (!Array.isArray(
                    (entry as { valueFields?: unknown }).valueFields
                  ) ||
                    (entry as { valueFields: unknown[] }).valueFields.length ===
                      0 ||
                    !(entry as { valueFields: unknown[] }).valueFields.every(
                      (field) =>
                        typeof field === "string" && field.length > 0
                    ))) ||
                ("allowedValues" in entry &&
                  (!Array.isArray(
                    (entry as { allowedValues?: unknown }).allowedValues
                  ) ||
                    (entry as { allowedValues: unknown[] }).allowedValues
                      .length === 0 ||
                    !(entry as { allowedValues: unknown[] }).allowedValues.every(
                      (value) =>
                        typeof value === "string" && value.trim().length > 0
                    ) ||
                    new Set(
                      (entry as { allowedValues: string[] }).allowedValues
                    ).size !==
                      (entry as { allowedValues: string[] }).allowedValues
                        .length)) ||
                ("forbiddenValues" in entry &&
                  (!Array.isArray(
                    (entry as { forbiddenValues?: unknown })
                      .forbiddenValues
                  ) ||
                    !(
                      entry as { forbiddenValues: unknown[] }
                    ).forbiddenValues.every(
                      (value) =>
                        typeof value === "string" &&
                        value.trim().length > 0
                    )))
              ) {
                throw new Error(
                  `predicate-parameter-invalid:${predicate.kind}:requiredItemValueMentions`
                );
              }
              return entry as {
                readonly valueKey: string;
                readonly roles: readonly string[];
                readonly valueFields?: readonly string[];
                readonly allowedValues?: readonly string[];
                readonly forbiddenValues?: readonly string[];
              };
            })
          : (() => {
              throw new Error(
                `predicate-parameter-invalid:${predicate.kind}:requiredItemValueMentions`
              );
            })();
    const rawRequiredItemParticleMentions = parameter(
      predicate,
      "requiredItemParticleMentions"
    );
    const requiredItemParticleMentions =
      rawRequiredItemParticleMentions === undefined
        ? []
        : Array.isArray(rawRequiredItemParticleMentions)
          ? rawRequiredItemParticleMentions.map((entry) => {
              if (
                !entry ||
                typeof entry !== "object" ||
                typeof (entry as { valueKey?: unknown }).valueKey !==
                  "string" ||
                !["subject", "object", "join"].includes(
                  String((entry as { particle?: unknown }).particle)
                ) ||
                !Array.isArray(
                  (entry as { roles?: unknown }).roles
                ) ||
                (entry as { roles: unknown[] }).roles.length === 0 ||
                !(entry as { roles: unknown[] }).roles.every(
                  (role) => typeof role === "string" && role.length > 0
                )
              ) {
                throw new Error(
                  `predicate-parameter-invalid:${predicate.kind}:requiredItemParticleMentions`
                );
              }
              return entry as {
                readonly valueKey: string;
                readonly particle: "subject" | "object" | "join";
                readonly roles: readonly string[];
              };
            })
          : (() => {
              throw new Error(
                `predicate-parameter-invalid:${predicate.kind}:requiredItemParticleMentions`
              );
            })();
    const rawCanonicalItemStories = parameter(
      predicate,
      "canonicalItemStories"
    );
    const canonicalItemStories =
      rawCanonicalItemStories === undefined
        ? []
        : Array.isArray(rawCanonicalItemStories)
          ? rawCanonicalItemStories.map((entry) => {
              const fields =
                entry && typeof entry === "object" && !Array.isArray(entry)
                  ? (entry as { fields?: unknown }).fields
                  : undefined;
              const candidateSet =
                entry && typeof entry === "object" && !Array.isArray(entry)
                  ? (entry as { candidateSet?: unknown }).candidateSet
                  : undefined;
              if (
                !fields ||
                typeof fields !== "object" ||
                Array.isArray(fields) ||
                Object.keys(fields).length === 0 ||
                Object.entries(fields).some(
                  ([key, value]) =>
                    key.length === 0 ||
                    !(
                      typeof value === "string" ||
                      typeof value === "boolean" ||
                      (typeof value === "number" && Number.isFinite(value))
                    )
                ) ||
                !Array.isArray(candidateSet) ||
                candidateSet.length === 0 ||
                !candidateSet.every(
                  (value) =>
                    typeof value === "string" && value.trim().length > 0
                ) ||
                new Set(candidateSet).size !== candidateSet.length
              ) {
                throw new Error(
                  `predicate-parameter-invalid:${predicate.kind}:canonicalItemStories`
                );
              }
              return {
                fields: fields as Readonly<
                  Record<string, string | number | boolean>
                >,
                candidateSet: candidateSet as readonly string[]
              };
            })
          : (() => {
              throw new Error(
                `predicate-parameter-invalid:${predicate.kind}:canonicalItemStories`
              );
            })();
    const canonicalCandidateValueKeys =
      canonicalItemStories.length === 0
        ? []
        : stringArrayParameter(
            predicate,
            "canonicalCandidateValueKeys"
          );
    const teacherIntentCanonicalStory:
      | DivisionGroupingTeacherIntentCanonicalStory
      | undefined =
      resolved.recommendationSnapshot.teacherIntent?.kind ===
      "division-grouping-v1"
        ? buildDivisionGroupingTeacherIntentCanonicalStory(
            resolved.recommendationSnapshot.teacherIntent
          )
        : undefined;
    const rawExactItemRoleBindings = parameter(
      predicate,
      "exactItemRoleBindings"
    );
    const exactItemRoleBindings =
      rawExactItemRoleBindings === undefined
        ? []
        : Array.isArray(rawExactItemRoleBindings)
          ? rawExactItemRoleBindings.map((entry) => {
              const role =
                entry && typeof entry === "object"
                  ? (entry as { role?: unknown }).role
                  : undefined;
              const valueKey =
                entry && typeof entry === "object"
                  ? (entry as { valueKey?: unknown }).valueKey
                  : undefined;
              if (
                typeof role !== "string" ||
                role.length === 0 ||
                typeof valueKey !== "string" ||
                valueKey.length === 0
              ) {
                throw new Error(
                  `predicate-parameter-invalid:${predicate.kind}:exactItemRoleBindings`
                );
              }
              return { role, valueKey } as const;
            })
          : (() => {
              throw new Error(
                `predicate-parameter-invalid:${predicate.kind}:exactItemRoleBindings`
              );
            })();
    if (
      (canonicalItemStories.length > 0 &&
        (canonicalCandidateValueKeys.length === 0 ||
          exactItemRoleBindings.length === 0)) ||
      new Set(canonicalCandidateValueKeys).size !==
        canonicalCandidateValueKeys.length ||
      canonicalItemStories.some(
        (story) =>
          story.candidateSet.length !== canonicalCandidateValueKeys.length
      ) ||
      new Set(exactItemRoleBindings.map((binding) => binding.role)).size !==
        exactItemRoleBindings.length
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:canonicalStoryBinding`
      );
    }
    if (
      typeof maximumInstructionLength !== "number" ||
      typeof maximumLabelLength !== "number" ||
      !Number.isInteger(maximumInstructionLength) ||
      !Number.isInteger(maximumLabelLength) ||
      maximumInstructionLength < 20 ||
      maximumLabelLength < 2
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:length`
      );
    }

    const systemPhrases = [
      "먼저 예상",
      "세어 확인",
      "근거와 수정",
      "수 카드 모음",
      "검증",
      "불변량",
      "후보"
    ];
    const actionPattern =
      /(고르|골라|놓|나타내|확인|찾|비교|쓰|써|고치|옮기|바꾸|몇|무엇|어느|어디|입니까|인가요|까요)/;
    const particlePhrases = (
      value: string,
      particle: "subject" | "object" | "join"
    ): { readonly expected: string; readonly invalid: string } | undefined => {
      const last = value.at(-1)?.codePointAt(0);
      if (last === undefined || last < 0xac00 || last > 0xd7a3) {
        return undefined;
      }
      const hasFinalConsonant = (last - 0xac00) % 28 !== 0;
      const [suffix, invalidSuffix] =
        particle === "subject"
          ? hasFinalConsonant
            ? ["이", "가"]
            : ["가", "이"]
          : particle === "object"
            ? hasFinalConsonant
              ? ["을", "를"]
              : ["를", "을"]
            : hasFinalConsonant
              ? ["과", "와"]
              : ["와", "과"];
      return {
        expected: `${value}${suffix}`,
        invalid: `${value}${invalidSuffix}`
      };
    };
    const textOf = (
      emission: ResolvedEmission | undefined
    ): string | undefined => {
      const text = emission?.toolIntent.properties.text;
      return typeof text === "string" ? text.trim() : undefined;
    };

    const sequenceMarkers = ["①", "②", "③", "④", "⑤", "⑥"];
    for (const [index, role] of instructionRoles.entries()) {
      const activityInstruction = activityRole(resolved, role);
      const emissions = activityInstruction
        ? [activityInstruction]
        : resolved.items
            .map((item) => byRole(resolved, item.id, role))
            .filter(
              (emission): emission is ResolvedEmission =>
                emission !== undefined
            );
      if (emissions.length === 0) {
        issue(
          issues,
          "classroom-language-unclear",
          "pedagogy",
          `${role} 지시문이 학생의 대상과 행동을 자연스러운 교실 문장으로 안내하지 않습니다.`
        );
        continue;
      }
      for (const emission of emissions) {
        const text = textOf(emission);
        if (
          !text ||
          Array.from(text).length > maximumInstructionLength ||
          !text.endsWith("세요.") ||
          !actionPattern.test(text) ||
          (instructionRoles.length >= 3 &&
            !text.startsWith(`${sequenceMarkers[index]} `)) ||
          systemPhrases.some((phrase) => text.includes(phrase))
        ) {
          issue(
            issues,
            "classroom-language-unclear",
            "pedagogy",
            `${role} 지시문이 학생의 대상과 행동을 자연스러운 교실 문장으로 안내하지 않습니다.`
          );
        }
      }
    }

    for (const item of resolved.items) {
      for (const role of promptRoles) {
        const text = textOf(byRole(resolved, item.id, role));
        if (
          !text ||
          Array.from(text).length > maximumInstructionLength ||
          !/[.?]$/.test(text) ||
          !/(몇|어느|무엇|어떻게|왜|어디)/.test(text) ||
          systemPhrases.some((phrase) => text.includes(phrase))
        ) {
          issue(
            issues,
            "classroom-language-unclear",
            "pedagogy",
            `${item.id}의 ${role} 문장이 학생이 화면에서 해결할 질문을 자연스럽게 묻지 않습니다.`
          );
        }
      }
      for (const role of labelRoles) {
        const text = textOf(byRole(resolved, item.id, role));
        if (
          !text ||
          Array.from(text).length > maximumLabelLength ||
          /[.!?]$/.test(text) ||
          /(?:하|해|보)세요/.test(text) ||
          systemPhrases.some((phrase) => text.includes(phrase))
        ) {
          issue(
            issues,
            "classroom-language-unclear",
            "pedagogy",
            `${item.id}의 ${role} 라벨이 학생이 할 일을 바로 알 수 있는 교실 용어가 아닙니다.`
          );
        }
      }
      for (const requirement of requiredItemValueMentions) {
        const requiredValue = item.values[requirement.valueKey];
        const normalizedRequiredValue =
          typeof requiredValue === "string" ? requiredValue.trim() : "";
        const forbiddenValues = requirement.forbiddenValues ?? [];
        const projectedValue = teacherIntentCanonicalStory
          ? (
              teacherIntentCanonicalStory.fields as unknown as Readonly<
                Record<string, unknown>
              >
            )[requirement.valueKey]
          : undefined;
        const allowedValues = [
          ...(requirement.allowedValues ?? []),
          ...(typeof projectedValue === "string" ? [projectedValue] : [])
        ].filter((value, index, all) => all.indexOf(value) === index);
        const conflictingValues = allowedValues.filter(
          (value) => value !== normalizedRequiredValue
        );
        if (
          normalizedRequiredValue.length === 0 ||
          forbiddenValues.includes(normalizedRequiredValue) ||
          (allowedValues.length > 0 &&
            !allowedValues.includes(normalizedRequiredValue))
        ) {
          issue(
            issues,
            "classroom-language-unclear",
            "pedagogy",
            `${item.id}의 ${requirement.valueKey}가 이야기 속 대상을 구체적으로 이름 붙이지 않습니다.`
          );
        }
        for (const role of requirement.roles) {
          const text = textOf(byRole(resolved, item.id, role));
          if (
            normalizedRequiredValue.length === 0 ||
            !text?.includes(normalizedRequiredValue) ||
            conflictingValues.some((value) => text.includes(value))
          ) {
            issue(
              issues,
              "classroom-language-unclear",
              "pedagogy",
              `${item.id}의 ${role} 문장이 ${requirement.valueKey}에 기록된 교실 대상을 직접 이름 붙이지 않습니다.`
            );
          }
        }
        for (const field of requirement.valueFields ?? []) {
          const fieldValue = item.values[field];
          if (
            normalizedRequiredValue.length === 0 ||
            typeof fieldValue !== "string" ||
            !fieldValue.includes(normalizedRequiredValue) ||
            conflictingValues.some((value) => fieldValue.includes(value))
          ) {
            issue(
              issues,
              "classroom-language-unclear",
              "pedagogy",
              `${item.id}의 ${field}가 ${requirement.valueKey}에 기록된 교실 대상과 일치하지 않습니다.`
            );
          }
        }
      }
      for (const requirement of requiredItemParticleMentions) {
        const rawValue = item.values[requirement.valueKey];
        const normalizedValue =
          typeof rawValue === "string" ? rawValue.trim() : "";
        const phrases = particlePhrases(
          normalizedValue,
          requirement.particle
        );
        for (const role of requirement.roles) {
          const text = textOf(byRole(resolved, item.id, role));
          if (
            !phrases ||
            !text?.includes(phrases.expected) ||
            text.includes(phrases.invalid)
          ) {
            issue(
              issues,
              "classroom-language-unclear",
              "pedagogy",
              `${item.id}의 ${role} 문장이 ${requirement.valueKey}에 맞는 조사를 사용하지 않습니다.`
            );
          }
        }
      }
      const applicableCanonicalItemStories = teacherIntentCanonicalStory
        ? [teacherIntentCanonicalStory]
        : canonicalItemStories;
      if (applicableCanonicalItemStories.length > 0) {
        const candidateValues = canonicalCandidateValueKeys.map(
          (key) => item.values[key]
        );
        const candidatesAreMirrored = canonicalCandidateValueKeys.every(
          (key) => item.values[`${key}Latex`] === item.values[key]
        );
        const actualCandidateSet = candidateValues.every(
          (value): value is string => typeof value === "string"
        )
          ? [...candidateValues].sort()
          : [];
        const matchingStories = applicableCanonicalItemStories.filter(
          (story) =>
            Object.entries(story.fields).every(
              ([key, expected]) => item.values[key] === expected
            ) &&
            JSON.stringify(actualCandidateSet) ===
              JSON.stringify([...story.candidateSet].sort())
        );
        if (!candidatesAreMirrored || matchingStories.length !== 1) {
          issue(
            issues,
            "classroom-language-unclear",
            "pedagogy",
            `${item.id}의 질문·근거·정답·설명·답 카드가 등록된 한 이야기와 정확히 일치하지 않습니다.`
          );
        }
      }
      for (const binding of exactItemRoleBindings) {
        const expected = item.values[binding.valueKey];
        const actual = textOf(byRole(resolved, item.id, binding.role));
        if (typeof expected !== "string" || actual !== expected) {
          issue(
            issues,
            "classroom-language-unclear",
            "pedagogy",
            `${item.id}의 ${binding.role} 화면 문장이 ${binding.valueKey}의 canonical 이야기와 일치하지 않습니다.`
          );
        }
      }
    }
  },
  "visual.text-fit": (resolved, predicate, issues) => {
    const roles = stringArrayParameter(predicate, "roles");
    const maximumFillRatio = parameter(
      predicate,
      "maximumFillRatio"
    );
    const rawRoleMaximumFillRatios =
      parameter(predicate, "roleMaximumFillRatios") ?? {};
    const roleMaximumFillRatios =
      rawRoleMaximumFillRatios !== null &&
      typeof rawRoleMaximumFillRatios === "object" &&
      !Array.isArray(rawRoleMaximumFillRatios)
        ? (rawRoleMaximumFillRatios as Record<string, unknown>)
        : undefined;
    if (
      typeof maximumFillRatio !== "number" ||
      !Number.isFinite(maximumFillRatio) ||
      maximumFillRatio <= 0 ||
      maximumFillRatio > 1 ||
      !roleMaximumFillRatios ||
      Object.entries(roleMaximumFillRatios).some(
        ([role, ratio]) =>
          !roles.includes(role) ||
          typeof ratio !== "number" ||
          !Number.isFinite(ratio) ||
          ratio <= 0 ||
          ratio > 1
      )
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:maximumFillRatio`
      );
    }

    const estimatedLineWidth = (
      text: string,
      fontSize: number
    ): number =>
      Array.from(text).reduce((width, character) => {
        if (/\s/u.test(character)) {
          return width + fontSize * 0.36;
        }
        if (/[A-Za-z0-9<>=+\-.,!?()\[\]①②③④⑤⑥‘’“”]/u.test(character)) {
          return width + fontSize * 0.62;
        }
        return width + fontSize;
      }, 0);

    const estimatedWidth = (
      text: string,
      fontSize: number
    ): number =>
      Math.max(
        ...text.split(/\r?\n/u).map((line) =>
          estimatedLineWidth(line, fontSize)
        ),
        0
      );

    const check = (
      emission: ResolvedEmission | undefined,
      context: string
    ): void => {
      const text = emission?.toolIntent.properties.text;
      const fontSize =
        emission?.toolIntent.properties.fontSize;
      const roleMaximumFillRatioValue = emission
        ? roleMaximumFillRatios[emission.role]
        : undefined;
      const roleMaximumFillRatio =
        typeof roleMaximumFillRatioValue === "number"
          ? roleMaximumFillRatioValue
          : maximumFillRatio;
      const measuredText =
        emission?.toolIntent.kind === "latex" && typeof text === "string"
          ? text.replace(/\\[A-Za-z]+/g, "X").replace(/[{}]/g, "")
          : text;
      if (
        !emission ||
        typeof measuredText !== "string" ||
        typeof fontSize !== "number" ||
        estimatedWidth(measuredText, fontSize) >
          emission.bounds.width * roleMaximumFillRatio
      ) {
        issue(
          issues,
          "text-region-overflow-risk",
          "layout",
          `${context}의 고정 문구가 지정한 너비를 넘을 수 있습니다.`
        );
      }
    };

    for (const role of roles) {
      const activityEmission = activityRole(resolved, role);
      if (activityEmission) {
        check(activityEmission, role);
        continue;
      }
      for (const item of resolved.items) {
        check(
          byRole(resolved, item.id, role),
          `${item.id}의 ${role}`
        );
      }
    }
  },
  "visual.text-clearance": (resolved, predicate, issues) => {
    const containerInsets = parameter(predicate, "containerInsets");
    const verticalGaps = parameter(predicate, "verticalGaps");
    const centerPairs = parameter(predicate, "centerPairs") ?? [];
    const horizontalLanes =
      parameter(predicate, "horizontalLanes") ?? [];
    if (
      !Array.isArray(containerInsets) ||
      !Array.isArray(verticalGaps) ||
      !Array.isArray(centerPairs) ||
      !Array.isArray(horizontalLanes)
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:rules`
      );
    }
    const record = (value: unknown): Record<string, unknown> | undefined =>
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : undefined;
    const nonnegative = (
      rule: Record<string, unknown>,
      key: string
    ): number | undefined => {
      const value = rule[key] ?? 0;
      return typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
        ? value
        : undefined;
    };
    const scopedRole = (
      itemId: string,
      role: unknown
    ): ResolvedEmission | undefined =>
      typeof role === "string"
        ? activityRole(resolved, role) ?? byRole(resolved, itemId, role)
        : undefined;

    for (const item of resolved.items) {
      for (const rawRule of containerInsets) {
        const rule = record(rawRule);
        const role = rule?.role;
        const containerRole = rule?.containerRole;
        const minimumTop = rule ? nonnegative(rule, "minimumTop") : undefined;
        const minimumRight = rule
          ? nonnegative(rule, "minimumRight")
          : undefined;
        const minimumBottom = rule
          ? nonnegative(rule, "minimumBottom")
          : undefined;
        const minimumLeft = rule
          ? nonnegative(rule, "minimumLeft")
          : undefined;
        if (
          typeof role !== "string" ||
          typeof containerRole !== "string" ||
          minimumTop === undefined ||
          minimumRight === undefined ||
          minimumBottom === undefined ||
          minimumLeft === undefined
        ) {
          throw new Error(
            `predicate-parameter-invalid:${predicate.kind}:containerInsets`
          );
        }
        const child = scopedRole(item.id, role);
        const container = scopedRole(item.id, containerRole);
        const left = child && container
          ? child.bounds.x - container.bounds.x
          : Number.NEGATIVE_INFINITY;
        const top = child && container
          ? child.bounds.y - container.bounds.y
          : Number.NEGATIVE_INFINITY;
        const right = child && container
          ? container.bounds.x + container.bounds.width -
            (child.bounds.x + child.bounds.width)
          : Number.NEGATIVE_INFINITY;
        const bottom = child && container
          ? container.bounds.y + container.bounds.height -
            (child.bounds.y + child.bounds.height)
          : Number.NEGATIVE_INFINITY;
        if (
          !child ||
          !container ||
          left < minimumLeft ||
          top < minimumTop ||
          right < minimumRight ||
          bottom < minimumBottom
        ) {
          issue(
            issues,
            "text-clearance-insufficient",
            "layout",
            `${item.id}의 ${role} 글자 영역이 ${containerRole} 안쪽 여백을 확보하지 못했습니다.`
          );
        }
      }

      for (const rawRule of verticalGaps) {
        const rule = record(rawRule);
        const beforeRole = rule?.beforeRole;
        const afterRole = rule?.afterRole;
        const minimumGap = rule ? nonnegative(rule, "minimumGap") : undefined;
        if (
          typeof beforeRole !== "string" ||
          typeof afterRole !== "string" ||
          minimumGap === undefined
        ) {
          throw new Error(
            `predicate-parameter-invalid:${predicate.kind}:verticalGaps`
          );
        }
        const before = scopedRole(item.id, beforeRole);
        const after = scopedRole(item.id, afterRole);
        const gap = before && after
          ? after.bounds.y - (before.bounds.y + before.bounds.height)
          : Number.NEGATIVE_INFINITY;
        if (!before || !after || gap < minimumGap) {
          issue(
            issues,
            "text-clearance-insufficient",
            "layout",
            `${item.id}의 ${beforeRole}와 ${afterRole} 사이 글자 여백이 부족합니다.`
          );
        }
      }

      for (const rawRule of centerPairs) {
        const rule = record(rawRule);
        const role = rule?.role;
        const containerRole = rule?.containerRole;
        const maximumOffsetX = rule
          ? nonnegative(rule, "maximumOffsetX")
          : undefined;
        const maximumOffsetY = rule
          ? nonnegative(rule, "maximumOffsetY")
          : undefined;
        if (
          typeof role !== "string" ||
          typeof containerRole !== "string" ||
          maximumOffsetX === undefined ||
          maximumOffsetY === undefined
        ) {
          throw new Error(
            `predicate-parameter-invalid:${predicate.kind}:centerPairs`
          );
        }
        const child = scopedRole(item.id, role);
        const container = scopedRole(item.id, containerRole);
        const offsetX = child && container
          ? Math.abs(
              child.bounds.x + child.bounds.width / 2 -
                (container.bounds.x + container.bounds.width / 2)
            )
          : Number.POSITIVE_INFINITY;
        const offsetY = child && container
          ? Math.abs(
              child.bounds.y + child.bounds.height / 2 -
                (container.bounds.y + container.bounds.height / 2)
            )
          : Number.POSITIVE_INFINITY;
        if (
          !child ||
          !container ||
          offsetX > maximumOffsetX ||
          offsetY > maximumOffsetY
        ) {
          issue(
            issues,
            "text-clearance-insufficient",
            "layout",
            `${item.id}의 ${role} 글자 영역이 ${containerRole} 가운데에 놓이지 않았습니다.`
          );
        }
      }

      for (const rawRule of horizontalLanes) {
        const rule = record(rawRule);
        const role = rule?.role;
        const leftBoundaryRole = rule?.leftBoundaryRole;
        const rightBoundaryRole = rule?.rightBoundaryRole;
        const minimumLeft = rule
          ? nonnegative(rule, "minimumLeft")
          : undefined;
        const minimumRight = rule
          ? nonnegative(rule, "minimumRight")
          : undefined;
        if (
          typeof role !== "string" ||
          typeof leftBoundaryRole !== "string" ||
          typeof rightBoundaryRole !== "string" ||
          minimumLeft === undefined ||
          minimumRight === undefined
        ) {
          throw new Error(
            `predicate-parameter-invalid:${predicate.kind}:horizontalLanes`
          );
        }
        const child = scopedRole(item.id, role);
        const leftBoundary = scopedRole(item.id, leftBoundaryRole);
        const rightBoundary = scopedRole(item.id, rightBoundaryRole);
        const left = child && leftBoundary
          ? child.bounds.x -
            (leftBoundary.bounds.x + leftBoundary.bounds.width)
          : Number.NEGATIVE_INFINITY;
        const right = child && rightBoundary
          ? rightBoundary.bounds.x -
            (child.bounds.x + child.bounds.width)
          : Number.NEGATIVE_INFINITY;
        if (
          !child ||
          !leftBoundary ||
          !rightBoundary ||
          left < minimumLeft ||
          right < minimumRight
        ) {
          issue(
            issues,
            "text-clearance-insufficient",
            "layout",
            `${item.id}의 ${role} 글자 영역이 ${leftBoundaryRole}와 ${rightBoundaryRole} 사이에 놓이지 않았습니다.`
          );
        }
      }
    }
  },
  "visual.labeled-pool-row": (
    resolved,
    predicate,
    issues
  ) => {
    const labelRole = stringParameter(predicate, "labelRole");
    const memberRoles = stringArrayParameter(
      predicate,
      "memberRoles",
      2
    );
    const alignmentRolesValue = parameter(
      predicate,
      "alignmentRoles"
    );
    const alignmentRoles =
      alignmentRolesValue === undefined
        ? memberRoles
        : stringArrayParameter(predicate, "alignmentRoles", 2);
    if (alignmentRoles.length !== memberRoles.length) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:alignmentRoles`
      );
    }
    const containerRole = stringParameter(
      predicate,
      "containerRole"
    );
    const rowCenterTolerance = parameter(
      predicate,
      "rowCenterTolerance"
    );
    const gapTolerance = parameter(predicate, "gapTolerance");
    const groupCenterTolerance = parameter(
      predicate,
      "groupCenterTolerance"
    );
    const labelAlignmentTolerance = parameter(
      predicate,
      "labelAlignmentTolerance"
    );
    const minimumLabelGap = parameter(
      predicate,
      "minimumLabelGap"
    );
    const maximumLabelGap = parameter(
      predicate,
      "maximumLabelGap"
    );
    const metrics = [
      rowCenterTolerance,
      gapTolerance,
      groupCenterTolerance,
      labelAlignmentTolerance,
      minimumLabelGap,
      maximumLabelGap
    ];
    if (
      metrics.some(
        (value) =>
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0
      ) ||
      (minimumLabelGap as number) >
        (maximumLabelGap as number)
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:metrics`
      );
    }

    for (const item of resolved.items) {
      const label = byRole(resolved, item.id, labelRole);
      const container = byRole(
        resolved,
        item.id,
        containerRole
      );
      const members = alignmentRoles.map((role) =>
        byRole(resolved, item.id, role)
      );
      if (
        !label ||
        !container ||
        members.some((member) => !member)
      ) {
        issue(
          issues,
          "labeled-pool-row-invalid",
          "layout",
          `${item.id}의 라벨이 있는 카드 모음이 완전하지 않습니다.`
        );
        continue;
      }

      const present = members as ResolvedEmission[];
      const contained = [label, ...present].every(
        (emission) =>
          emission.bounds.x >= container.bounds.x &&
          emission.bounds.y >= container.bounds.y &&
          emission.bounds.x + emission.bounds.width <=
            container.bounds.x + container.bounds.width &&
          emission.bounds.y + emission.bounds.height <=
            container.bounds.y + container.bounds.height
      );
      const rows: ResolvedEmission[][] = [];
      for (const member of [...present].sort((left, right) => {
        const vertical =
          left.bounds.y +
          left.bounds.height / 2 -
          (right.bounds.y + right.bounds.height / 2);
        return vertical || left.bounds.x - right.bounds.x;
      })) {
        const center =
          member.bounds.y + member.bounds.height / 2;
        const row = rows.find((candidate) => {
          const candidateCenter =
            candidate.reduce(
              (sum, emission) =>
                sum +
                emission.bounds.y +
                emission.bounds.height / 2,
              0
            ) / candidate.length;
          return (
            Math.abs(center - candidateCenter) <=
            (rowCenterTolerance as number)
          );
        });
        if (row) {
          row.push(member);
        } else {
          rows.push([member]);
        }
      }
      const orderedRows = rows
        .map((row) =>
          [...row].sort(
            (left, right) => left.bounds.x - right.bounds.x
          )
        )
        .sort(
          (left, right) =>
            left[0]!.bounds.y - right[0]!.bounds.y
        );
      const rowMetrics = orderedRows.map((row) => {
        const centers = row.map(
          (emission) =>
            emission.bounds.y + emission.bounds.height / 2
        );
        const gaps = row.slice(1).map((emission, index) => {
          const previous = row[index]!;
          return (
            emission.bounds.x -
            (previous.bounds.x + previous.bounds.width)
          );
        });
        const left = row[0]!.bounds.x;
        const last = row.at(-1)!;
        const right = last.bounds.x + last.bounds.width;
        return {
          left,
          centers,
          gaps,
          center: (left + right) / 2,
          top: Math.min(
            ...row.map((emission) => emission.bounds.y)
          ),
          bottom: Math.max(
            ...row.map(
              (emission) =>
                emission.bounds.y + emission.bounds.height
            )
          )
        };
      });
      const containerCenter =
        container.bounds.x + container.bounds.width / 2;
      const groupLeft = Math.min(
        ...rowMetrics.map((row) => row.left)
      );
      const verticalGaps = rowMetrics
        .slice(1)
        .map(
          (row, index) =>
            row.top - rowMetrics[index]!.bottom
        );
      const labelGap =
        rowMetrics[0]!.top -
        (label.bounds.y + label.bounds.height);
      const valid =
        contained &&
        rowMetrics.every(
          (row) =>
            Math.max(...row.centers) -
              Math.min(...row.centers) <=
              (rowCenterTolerance as number) &&
            row.gaps.every((gap) => gap >= 0) &&
            (row.gaps.length < 2 ||
              Math.max(...row.gaps) -
                Math.min(...row.gaps) <=
                (gapTolerance as number)) &&
            Math.abs(row.center - containerCenter) <=
              (groupCenterTolerance as number)
        ) &&
        verticalGaps.every((gap) => gap >= 0) &&
        (verticalGaps.length < 2 ||
          Math.max(...verticalGaps) -
            Math.min(...verticalGaps) <=
            (gapTolerance as number)) &&
        Math.abs(label.bounds.x - groupLeft) <=
          (labelAlignmentTolerance as number) &&
        labelGap >= (minimumLabelGap as number) &&
        labelGap <= (maximumLabelGap as number);
      if (!valid) {
        issue(
          issues,
          "labeled-pool-row-invalid",
          "layout",
          `${item.id}의 선택 묶음이 컨테이너 안에서 가운데·등간격 행과 위쪽 라벨로 정렬되지 않았습니다.`
        );
      }
    }
  },
  "visual.no-overlap": (resolved, predicate, issues) => {
    const roles = stringArrayParameter(predicate, "roles", 2);
    for (const item of resolved.items) {
      const regions = roles.map((role) =>
        byRole(resolved, item.id, role)
      );
      if (regions.some((region) => !region)) {
        issue(
          issues,
          "visual-region-missing",
          "layout",
          `${item.id}의 겹침 검사 영역이 누락되었습니다.`
        );
        continue;
      }
      for (let left = 0; left < regions.length; left += 1) {
        for (
          let right = left + 1;
          right < regions.length;
          right += 1
        ) {
          const leftBounds =
            regions[left]!.renderedBounds ?? regions[left]!.bounds;
          const rightBounds =
            regions[right]!.renderedBounds ?? regions[right]!.bounds;
          const writingPair = [
            ["prediction-label", "prediction-box"],
            ["explanation-label", "explanation-box"],
            ["answer-label", "answer-box"]
          ].find(
            ([labelRole, boxRole]) =>
              (regions[left]!.role === labelRole &&
                regions[right]!.role === boxRole) ||
              (regions[right]!.role === labelRole &&
                regions[left]!.role === boxRole)
          );
          if (writingPair) {
            const label =
              regions[left]!.role === writingPair[0]
                ? leftBounds
                : rightBounds;
            const box =
              regions[left]!.role === writingPair[1]
                ? leftBounds
                : rightBounds;
            const contained =
              label.x >= box.x &&
              label.y >= box.y &&
              label.x + label.width <= box.x + box.width &&
              label.y + label.height <= box.y + box.height;
            if (contained) continue;
          }
          const overlaps =
            leftBounds.x < rightBounds.x + rightBounds.width &&
            leftBounds.x + leftBounds.width > rightBounds.x &&
            leftBounds.y < rightBounds.y + rightBounds.height &&
            leftBounds.y + leftBounds.height > rightBounds.y;
          if (overlaps) {
            issue(
              issues,
              "visual-region-overlap",
              "layout",
              `${item.id}의 ${regions[left]!.role}와 ${regions[right]!.role} 영역이 겹칩니다.`
            );
          }
        }
      }
    }
  },
  "visual.equation-rail": (
    resolved,
    predicate,
    issues
  ) => {
    const roles = stringArrayParameter(predicate, "roles", 3);
    const operatorRoles = stringArrayParameter(
      predicate,
      "operatorRoles"
    );
    const centerTolerance = parameter(
      predicate,
      "centerTolerance"
    );
    const maxGapDelta = parameter(predicate, "maxGapDelta");
    const fontSize = parameter(predicate, "fontSize");
    if (
      typeof centerTolerance !== "number" ||
      typeof maxGapDelta !== "number" ||
      typeof fontSize !== "number"
    ) {
      throw new Error(
        `predicate-parameter-invalid:${predicate.kind}:metrics`
      );
    }
    for (const item of resolved.items) {
      const rail = roles.map((role) =>
        byRole(resolved, item.id, role)
      );
      if (rail.some((emission) => !emission)) {
        issue(
          issues,
          "equation-rail-role-missing",
          "layout",
          `${item.id}의 수식 정렬 요소가 빠졌습니다.`
        );
        continue;
      }
      const present = rail as ResolvedEmission[];
      const centers = present.map(
        (emission) =>
          emission.bounds.y + emission.bounds.height / 2
      );
      if (
        Math.max(...centers) - Math.min(...centers) >
        centerTolerance
      ) {
        issue(
          issues,
          "equation-rail-center-mismatch",
          "layout",
          `${item.id}의 항과 연산자가 같은 수식 중심선에 있지 않습니다.`
        );
      }
      const gaps = present.slice(1).map((emission, index) => {
        const previous = present[index]!;
        return emission.bounds.x -
          (previous.bounds.x + previous.bounds.width);
      });
      if (
        gaps.some((gap) => gap < 0) ||
        Math.max(...gaps) - Math.min(...gaps) > maxGapDelta
      ) {
        issue(
          issues,
          "equation-rail-spacing-uneven",
          "layout",
          `${item.id}의 연산자 주변 간격이 고르지 않습니다.`
        );
      }
      const operators = operatorRoles.map((role) =>
        byRole(resolved, item.id, role)
      );
      if (
        operators.some(
          (operator) =>
            !operator ||
            operator.toolIntent.toolKey !== "common.formula" ||
            operator.toolIntent.properties.fontSize !== fontSize
        )
      ) {
        issue(
          issues,
          "equation-operator-style-mismatch",
          "layout",
          `${item.id}의 연산자가 같은 수식 렌더러와 크기를 사용하지 않습니다.`
        );
      }
    }
  }
};

handlers["values.bar-graph-scale-distractors"] = (
  resolved,
  predicate,
  issues
) => {
  const totalCellsPath = stringParameter(
    predicate,
    "totalCellsPath"
  );
  const peoplePerCellPath = stringParameter(
    predicate,
    "peoplePerCellPath"
  );
  const referenceCellsPath = stringParameter(
    predicate,
    "referenceCellsPath"
  );
  const questionCellsPath = stringParameter(
    predicate,
    "questionCellsPath"
  );
  const referenceValuePath = stringParameter(
    predicate,
    "referenceValuePath"
  );
  const questionValuePath = stringParameter(
    predicate,
    "questionValuePath"
  );
  const correctPath = stringParameter(predicate, "correctPath");
  const misconceptionPaths = [
    stringParameter(predicate, "cellCountTextPath"),
    stringParameter(predicate, "referenceCopyTextPath"),
    stringParameter(predicate, "unitAsOneTextPath"),
    stringParameter(predicate, "boundaryExtraTextPath")
  ];
  const candidatePaths = stringArrayParameter(
    predicate,
    "candidatePaths",
    5
  );
  const seenPeoplePerCell = new Set<number>();
  for (const item of resolved.items) {
    const totalCells = item.values[totalCellsPath];
    const peoplePerCell = item.values[peoplePerCellPath];
    const referenceCells = item.values[referenceCellsPath];
    const questionCells = item.values[questionCellsPath];
    const referenceValue = item.values[referenceValuePath];
    const questionValue = item.values[questionValuePath];
    const expectedReferenceValue =
      Number(referenceCells) * Number(peoplePerCell);
    const expectedQuestionValue =
      Number(questionCells) * Number(peoplePerCell);
    const expectedMisconceptions = [
      String(questionCells),
      String(referenceValue),
      String(
        Number(referenceValue) +
          (Number(questionCells) - Number(referenceCells))
      ),
      String(
        (Number(questionCells) + 1) * Number(peoplePerCell)
      )
    ];
    const candidates = candidatePaths.map(
      (path) => item.values[path]
    );
    const duplicatePeoplePerCell =
      typeof peoplePerCell === "number" &&
      seenPeoplePerCell.has(peoplePerCell);
    if (typeof peoplePerCell === "number") {
      seenPeoplePerCell.add(peoplePerCell);
    }
    const valid =
      (totalCells === 10 || totalCells === 12) &&
      (peoplePerCell === 2 ||
        peoplePerCell === 5 ||
        peoplePerCell === 10) &&
      Number.isInteger(referenceCells) &&
      Number(referenceCells) >= 2 &&
      Number(referenceCells) <= Number(totalCells) - 3 &&
      Number.isInteger(questionCells) &&
      Number(questionCells) > Number(referenceCells) &&
      Number(questionCells) <= Number(totalCells) - 1 &&
      referenceValue === expectedReferenceValue &&
      questionValue === expectedQuestionValue &&
      expectedReferenceValue <= 100 &&
      expectedQuestionValue <= 100 &&
      !duplicatePeoplePerCell &&
      item.values[correctPath] === String(expectedQuestionValue) &&
      misconceptionPaths.every(
        (path, index) =>
          item.values[path] === expectedMisconceptions[index]
      ) &&
      candidates.every((value) => typeof value === "string") &&
      new Set(candidates).size === 5 &&
      [
        String(expectedQuestionValue),
        ...expectedMisconceptions
      ].every((value) => candidates.includes(value)) &&
      candidatePaths.every(
        (path) =>
          item.values[`${path}Latex`] === item.values[path]
      );
    if (!valid) {
      issue(
        issues,
        "bar-graph-scale-distractors-invalid",
        "pedagogy",
        `${item.id}에 눈금 칸 수를 값으로 읽기·기준값 복사·한 칸을 1로 읽기·경계 하나 더 세기 오개념을 드러내는 선택지가 없습니다.`
      );
    }
  }
};

handlers["geometry.bar-graph-scale-cells"] = (
  resolved,
  predicate,
  issues
) => {
  const referenceBarRole = stringParameter(
    predicate,
    "referenceBarRole"
  );
  const questionBarRole = stringParameter(
    predicate,
    "questionBarRole"
  );
  const workspaceRole = stringParameter(
    predicate,
    "workspaceRole"
  );
  const referenceLaneRole = stringParameter(
    predicate,
    "referenceLaneRole"
  );
  const questionLaneRole = stringParameter(
    predicate,
    "questionLaneRole"
  );
  const trackRole = stringParameter(predicate, "trackRole");
  const startLineRole = stringParameter(
    predicate,
    "startLineRole"
  );
  const totalCellsPath = stringParameter(
    predicate,
    "totalCellsPath"
  );
  const referenceCellsPath = stringParameter(
    predicate,
    "referenceCellsPath"
  );
  const questionCellsPath = stringParameter(
    predicate,
    "questionCellsPath"
  );
  for (const item of resolved.items) {
    const totalCells = item.values[totalCellsPath];
    const referenceCells = item.values[referenceCellsPath];
    const questionCells = item.values[questionCellsPath];
    const referenceBar = byRole(
      resolved,
      item.id,
      referenceBarRole
    );
    const questionBar = byRole(
      resolved,
      item.id,
      questionBarRole
    );
    const workspace = byRole(
      resolved,
      item.id,
      workspaceRole
    );
    const referenceLane = byRole(
      resolved,
      item.id,
      referenceLaneRole
    );
    const questionLane = byRole(
      resolved,
      item.id,
      questionLaneRole
    );
    const track = byRole(resolved, item.id, trackRole);
    const startLine = byRole(
      resolved,
      item.id,
      startLineRole
    );
    const fractionOf = (
      emission: ResolvedEmission | undefined
    ): Ratio | undefined =>
      emission?.toolIntent.kind === "fraction-model"
        ? ratio(
            {
              fraction:
                emission.toolIntent.properties.fraction
            },
            "fraction"
          )
        : undefined;
    const referenceFraction = fractionOf(referenceBar);
    const questionFraction = fractionOf(questionBar);
    const trackFraction = fractionOf(track);
    const valid =
      Number.isInteger(totalCells) &&
      (totalCells === 10 || totalCells === 12) &&
      Number.isInteger(referenceCells) &&
      Number.isInteger(questionCells) &&
      Number(referenceCells) < Number(questionCells) &&
      referenceBar &&
      questionBar &&
      workspace &&
      referenceLane &&
      questionLane &&
      track &&
      startLine &&
      referenceBar.movable &&
      !referenceBar.locked &&
      questionBar.movable &&
      !questionBar.locked &&
      !track.movable &&
      track.locked &&
      referenceFraction?.numerator === referenceCells &&
      referenceFraction?.denominator === totalCells &&
      questionFraction?.numerator === questionCells &&
      questionFraction?.denominator === totalCells &&
      trackFraction?.numerator === totalCells &&
      trackFraction?.denominator === totalCells &&
      Math.abs(
        referenceBar.bounds.x - referenceLane.bounds.x
      ) >= 30 &&
      Math.abs(
        questionBar.bounds.x - questionLane.bounds.x
      ) >= 30 &&
      referenceBar.bounds.x !== questionBar.bounds.x &&
      referenceBar.bounds.width === questionBar.bounds.width &&
      referenceBar.bounds.width === referenceLane.bounds.width &&
      questionBar.bounds.width === questionLane.bounds.width &&
      referenceBar.bounds.width === track.bounds.width &&
      referenceLane.bounds.x === questionLane.bounds.x &&
      referenceLane.bounds.x === track.bounds.x &&
      referenceLane.bounds.width === questionLane.bounds.width &&
      referenceLane.bounds.width === track.bounds.width &&
      workspace.bounds.x === referenceLane.bounds.x &&
      workspace.bounds.width === referenceLane.bounds.width &&
      workspace.bounds.y <= referenceLane.bounds.y &&
      workspace.bounds.y + workspace.bounds.height >=
        questionLane.bounds.y + questionLane.bounds.height &&
      startLine.bounds.x + startLine.bounds.width / 2 ===
        referenceLane.bounds.x &&
      startLine.bounds.y <= referenceLane.bounds.y &&
      startLine.bounds.y + startLine.bounds.height >=
        questionLane.bounds.y + questionLane.bounds.height &&
      referenceBar.bounds.height <= referenceLane.bounds.height &&
      questionBar.bounds.height <= questionLane.bounds.height &&
      referenceLane.bounds.y + referenceLane.bounds.height + 10 <=
        questionLane.bounds.y &&
      referenceBar.bounds.y + referenceBar.bounds.height <
        referenceLane.bounds.y &&
      questionBar.bounds.y + questionBar.bounds.height <
        referenceLane.bounds.y &&
      track.bounds.y >=
        questionLane.bounds.y + questionLane.bounds.height + 10;
    if (!valid) {
      issue(
        issues,
        "bar-graph-scale-geometry-invalid",
        "pedagogy",
        `${item.id}의 막대가 처음에는 어긋나 있고 조작 후에는 서로 다른 두 행에서 같은 출발선·전체 폭·칸 단위를 사용해야 합니다.`
      );
    }
  }
};

handlers["values.broken-ruler-length-distractors"] = (
  resolved,
  predicate,
  issues
) => {
  const totalUnitsPath = stringParameter(
    predicate,
    "totalUnitsPath"
  );
  const startMarkPath = stringParameter(
    predicate,
    "startMarkPath"
  );
  const lengthPath = stringParameter(predicate, "lengthPath");
  const endMarkPath = stringParameter(predicate, "endMarkPath");
  const correctPath = stringParameter(predicate, "correctPath");
  const candidatePaths = stringArrayParameter(
    predicate,
    "candidatePaths"
  );

  for (const item of resolved.items) {
    const totalUnits = item.values[totalUnitsPath];
    const startMark = item.values[startMarkPath];
    const length = item.values[lengthPath];
    const endMark = item.values[endMarkPath];
    const orderedIdeas = [
      length,
      Number(length) + 1,
      Number(length) - 1,
      totalUnits,
      Number(totalUnits) - Number(length)
    ];
    const expected = [
      ...new Set(
        orderedIdeas.filter(
          (value) =>
            Number.isInteger(value) &&
            Number(value) >= 1 &&
            Number(value) <= Number(totalUnits)
        )
      )
    ]
      .slice(0, 5)
      .map(String);
    const candidates = candidatePaths.map(
      (path) => item.values[path]
    );
    const valid =
      Number.isInteger(totalUnits) &&
      [8, 12].includes(Number(totalUnits)) &&
      Number.isInteger(startMark) &&
      Number(startMark) >= 1 &&
      Number.isInteger(length) &&
      Number(length) >= 2 &&
      Number.isInteger(endMark) &&
      Number(endMark) === Number(startMark) + Number(length) &&
      Number(endMark) <= Number(totalUnits) &&
      expected.length === 5 &&
      item.values[correctPath] === String(length) &&
      candidates.every((value) => typeof value === "string") &&
      new Set(candidates).size === 5 &&
      expected.every((value) => candidates.includes(value)) &&
      candidatePaths.every(
        (path) => item.values[`${path}Latex`] === item.values[path]
      );
    if (!valid) {
      issue(
        issues,
        "broken-ruler-length-distractors-invalid",
        "pedagogy",
        `${item.id}에 실제 길이·경계 하나 더 세기·간격 하나 빠뜨리기·자 전체 길이·연필이 덮지 않은 길이를 구별하는 다섯 선택지가 없습니다.`
      );
    }
  }
};

handlers["values.place-value-ten-exchange-distractors"] = (
  resolved,
  predicate,
  issues
) => {
  const hundredsPath = stringParameter(predicate, "hundredsPath");
  const tensPath = stringParameter(predicate, "tensPath");
  const onesPath = stringParameter(predicate, "onesPath");
  const exchangeTensPath = stringParameter(
    predicate,
    "exchangeTensPath"
  );
  const correctPath = stringParameter(predicate, "correctPath");
  const misconceptionPaths = [
    stringParameter(predicate, "concatenatePath"),
    stringParameter(predicate, "omitExchangePath"),
    stringParameter(predicate, "tenTensAsOnesPath"),
    stringParameter(predicate, "reversePath")
  ];
  const candidatePaths = stringArrayParameter(
    predicate,
    "candidatePaths",
    5
  );

  for (const item of resolved.items) {
    const hundreds = item.values[hundredsPath];
    const tens = item.values[tensPath];
    const ones = item.values[onesPath];
    const exchangeTens = item.values[exchangeTensPath];
    const correct =
      (Number(hundreds) + 1) * 100 +
      Number(tens) * 10 +
      Number(ones);
    const expectedMisconceptions = [
      Number(`${String(hundreds)}${Number(tens) + 10}${String(ones)}`),
      Number(hundreds) * 100 + Number(tens) * 10 + Number(ones),
      Number(hundreds) * 100 + Number(tens) * 10 + 10 + Number(ones),
      Number(ones) * 100 + (Number(hundreds) + 1) * 10 + Number(tens)
    ].map(String);
    const candidates = candidatePaths.map(
      (path) => item.values[path]
    );
    const valid =
      Number.isInteger(hundreds) &&
      Number(hundreds) >= 1 &&
      Number(hundreds) <= 4 &&
      Number.isInteger(tens) &&
      Number(tens) >= 0 &&
      Number(tens) <= 4 &&
      Number.isInteger(ones) &&
      Number(ones) >= 1 &&
      Number(ones) <= 8 &&
      exchangeTens === 10 &&
      item.values[correctPath] === String(correct) &&
      misconceptionPaths.every(
        (path, index) =>
          item.values[path] === expectedMisconceptions[index]
      ) &&
      candidates.every((value) => typeof value === "string") &&
      new Set(candidates).size === 5 &&
      [String(correct), ...expectedMisconceptions].every((value) =>
        candidates.includes(value)
      ) &&
      candidatePaths.every(
        (path) => item.values[`${path}Latex`] === item.values[path]
      );
    if (!valid) {
      issue(
        issues,
        "place-value-ten-exchange-distractors-invalid",
        "pedagogy",
        `${item.id}에 개수 이어 쓰기·십 묶음 누락·십 모형을 일로 세기·자리 뒤바꾸기 오개념을 드러내는 선택지가 없습니다.`
      );
    }
  }
};

handlers["geometry.place-value-ten-exchange"] = (
  resolved,
  predicate,
  issues
) => {
  const tenRoles = stringArrayParameter(predicate, "tenRoles", 10);
  const slotRoles = stringArrayParameter(predicate, "slotRoles", 10);
  const gridRowRoles = stringArrayParameter(predicate, "gridRowRoles", 10);
  const tenBankRole = stringParameter(predicate, "tenBankRole");
  const exchangeBoxRole = stringParameter(
    predicate,
    "exchangeBoxRole"
  );
  const hundredGridPanelRole = stringParameter(
    predicate,
    "hundredGridPanelRole"
  );
  const relationRole = stringParameter(predicate, "relationRole");
  const isPlaceValue = (
    emission: ResolvedEmission | undefined,
    value: 10,
    movable: boolean
  ) =>
    emission?.toolIntent.kind === "place-value-model" &&
    emission.toolIntent.properties.value === value &&
    emission.movable === movable &&
    emission.locked === !movable;
  const visualBounds = (emission: ResolvedEmission) =>
    emission.renderedBounds ?? emission.bounds;
  const inside = (
    child: ResolvedEmission,
    parent: ResolvedEmission
  ) => {
    const childBounds = visualBounds(child);
    const parentBounds = visualBounds(parent);
    return (
      childBounds.x >= parentBounds.x &&
      childBounds.y >= parentBounds.y &&
      childBounds.x + childBounds.width <=
        parentBounds.x + parentBounds.width &&
      childBounds.y + childBounds.height <=
        parentBounds.y + parentBounds.height
    );
  };
  const overlaps = (
    left: ResolvedEmission,
    right: ResolvedEmission
  ) => {
    const leftBounds = visualBounds(left);
    const rightBounds = visualBounds(right);
    return (
      leftBounds.x < rightBounds.x + rightBounds.width &&
      leftBounds.x + leftBounds.width > rightBounds.x &&
      leftBounds.y < rightBounds.y + rightBounds.height &&
      leftBounds.y + leftBounds.height > rightBounds.y
    );
  };

  for (const item of resolved.items) {
    const tens = tenRoles.map((role) =>
      byRole(resolved, item.id, role)
    );
    const slots = slotRoles.map((role) =>
      byRole(resolved, item.id, role)
    );
    const gridRows = gridRowRoles.map((role) =>
      byRole(resolved, item.id, role)
    );
    const tenBank = byRole(resolved, item.id, tenBankRole);
    const exchangeBox = byRole(
      resolved,
      item.id,
      exchangeBoxRole
    );
    const hundredGridPanel = byRole(
      resolved,
      item.id,
      hundredGridPanelRole
    );
    const relation = byRole(resolved, item.id, relationRole);
    const presentTens = tens.filter(
      (emission): emission is ResolvedEmission => emission !== undefined
    );
    const presentSlots = slots.filter(
      (emission): emission is ResolvedEmission => emission !== undefined
    );
    const presentGridRows = gridRows.filter(
      (emission): emission is ResolvedEmission => emission !== undefined
    );
    const firstRow = presentGridRows[0];
    const gridIsExact =
      firstRow !== undefined &&
      presentGridRows.length === 10 &&
      presentGridRows.every((row, index) => {
        const first = visualBounds(firstRow);
        const current = visualBounds(row);
        return (
          row.toolIntent.kind === "text" &&
          row.toolIntent.properties.text === "□□□□□□□□□□" &&
          row.locked &&
          !row.movable &&
          current.width >= 200 &&
          current.height >= 20 &&
          current.width === first.width &&
          current.height === first.height &&
          current.x === first.x &&
          current.y === first.y + index * first.height &&
          (hundredGridPanel ? inside(row, hundredGridPanel) : false)
        );
      });
    const sourceDisksDoNotOverlap = presentTens.every(
      (left, index) =>
        presentTens
          .slice(index + 1)
          .every((right) => !overlaps(left, right))
    );
    const slotsDoNotOverlap = presentSlots.every(
      (left, index) =>
        presentSlots
          .slice(index + 1)
          .every((right) => !overlaps(left, right))
    );
    const valid =
      tenRoles.length === 10 &&
      new Set(tenRoles).size === 10 &&
      slotRoles.length === 10 &&
      new Set(slotRoles).size === 10 &&
      gridRowRoles.length === 10 &&
      new Set(gridRowRoles).size === 10 &&
      presentTens.length === 10 &&
      presentTens.every((emission) =>
        isPlaceValue(emission, 10, true)
      ) &&
      tenBank?.toolIntent.kind === "draw-rectangle" &&
      tenBank.locked &&
      !tenBank.movable &&
      exchangeBox?.toolIntent.kind === "draw-rectangle" &&
      exchangeBox.locked &&
      !exchangeBox.movable &&
      hundredGridPanel?.toolIntent.kind === "draw-rectangle" &&
      hundredGridPanel.locked &&
      !hundredGridPanel.movable &&
      relation?.toolIntent.kind === "text" &&
      relation.toolIntent.properties.text === "10 × 10 = 100" &&
      relation.locked &&
      !relation.movable &&
      presentTens.every((emission) =>
        tenBank ? inside(emission, tenBank) : false
      ) &&
      presentSlots.length === 10 &&
      presentSlots.every(
        (slot) =>
          slot.toolIntent.kind === "draw-rectangle" &&
          slot.locked &&
          !slot.movable &&
          visualBounds(slot).width >= 120 &&
          visualBounds(slot).height >= 120 &&
          (exchangeBox ? inside(slot, exchangeBox) : false)
      ) &&
      sourceDisksDoNotOverlap &&
      slotsDoNotOverlap &&
      gridIsExact &&
      (exchangeBox && hundredGridPanel
        ? visualBounds(exchangeBox).x +
            visualBounds(exchangeBox).width +
            20 <=
          visualBounds(hundredGridPanel).x
        : false) &&
      presentTens.every(
        (emission) =>
          exchangeBox !== undefined &&
          !inside(emission, exchangeBox) &&
          presentSlots.every((slot) => !overlaps(emission, slot)) &&
          presentGridRows.every((row) => !overlaps(emission, row))
      );
    if (!valid) {
      issue(
        issues,
        "place-value-ten-exchange-geometry-invalid",
        "pedagogy",
        `${item.id}에는 겹치지 않는 십 모형 10개, 서로 다른 열 칸, 10×10의 100칸 모형이 실제 렌더 크기로 연결되어야 합니다.`
      );
    }
  }
};

handlers["geometry.unit-ruler-offset-length"] = (
  resolved,
  predicate,
  issues
) => {
  const measuredBarRole = stringParameter(
    predicate,
    "measuredBarRole"
  );
  const unitStickRole = stringParameter(
    predicate,
    "unitStickRole"
  );
  const measureLaneRole = stringParameter(
    predicate,
    "measureLaneRole"
  );
  const rulerRole = stringParameter(predicate, "rulerRole");
  const startLineRole = stringParameter(
    predicate,
    "startLineRole"
  );
  const totalUnitsPath = stringParameter(
    predicate,
    "totalUnitsPath"
  );
  const startMarkPath = stringParameter(
    predicate,
    "startMarkPath"
  );
  const lengthPath = stringParameter(predicate, "lengthPath");
  const endMarkPath = stringParameter(predicate, "endMarkPath");
  const spanPath = stringParameter(predicate, "spanPath");

  const fractionOf = (
    emission: ResolvedEmission | undefined
  ): Ratio | undefined =>
    emission?.toolIntent.kind === "fraction-model"
      ? ratio(
          { fraction: emission.toolIntent.properties.fraction },
          "fraction"
        )
      : undefined;

  for (const item of resolved.items) {
    const totalUnits = item.values[totalUnitsPath];
    const startMark = item.values[startMarkPath];
    const length = item.values[lengthPath];
    const endMark = item.values[endMarkPath];
    const measuredBar = byRole(
      resolved,
      item.id,
      measuredBarRole
    );
    const unitStick = byRole(resolved, item.id, unitStickRole);
    const measureLane = byRole(
      resolved,
      item.id,
      measureLaneRole
    );
    const ruler = byRole(resolved, item.id, rulerRole);
    const startLine = byRole(resolved, item.id, startLineRole);
    const measuredFraction = fractionOf(measuredBar);
    const unitFraction = fractionOf(unitStick);
    const rulerFraction = fractionOf(ruler);
    const measuredRendered = measuredBar?.renderedBounds;
    const unitRendered = unitStick?.renderedBounds;
    const unitSpan =
      measuredBar?.toolIntent.kind === "draw-rectangle" &&
      measuredBar.toolIntent.properties.unitSpan !== null &&
      typeof measuredBar.toolIntent.properties.unitSpan === "object" &&
      !Array.isArray(measuredBar.toolIntent.properties.unitSpan)
        ? measuredBar.toolIntent.properties.unitSpan as Record<string, unknown>
        : undefined;
    const pencilSpan =
      item.values[spanPath] !== null &&
      typeof item.values[spanPath] === "object" &&
      !Array.isArray(item.values[spanPath])
        ? item.values[spanPath] as Record<string, unknown>
        : undefined;
    const valid =
      Number.isInteger(totalUnits) &&
      [8, 12].includes(Number(totalUnits)) &&
      Number.isInteger(startMark) &&
      Number(startMark) >= 1 &&
      Number.isInteger(length) &&
      Number(length) >= 2 &&
      Number.isInteger(endMark) &&
      Number(endMark) === Number(startMark) + Number(length) &&
      Number(endMark) <= Number(totalUnits) &&
      measuredBar &&
      unitStick &&
      measureLane &&
      ruler &&
      startLine &&
      !measuredBar.movable &&
      measuredBar.locked &&
      unitStick.movable &&
      !unitStick.locked &&
      !ruler.movable &&
      ruler.locked &&
      measuredFraction === undefined &&
      unitSpan?.from === startMark &&
      unitSpan?.to === endMark &&
      unitSpan?.of === totalUnits &&
      pencilSpan?.from === startMark &&
      pencilSpan?.to === endMark &&
      pencilSpan?.of === totalUnits &&
      Number(unitSpan?.to) - Number(unitSpan?.from) === length &&
      unitFraction?.numerator === 1 &&
      unitFraction.denominator === totalUnits &&
      rulerFraction?.numerator === totalUnits &&
      rulerFraction.denominator === totalUnits &&
      measureLane.toolIntent.kind === "draw-rectangle" &&
      measureLane.toolIntent.properties.fill === "none" &&
      measuredBar.bounds.width === ruler.bounds.width &&
      unitStick.bounds.width === ruler.bounds.width &&
      measureLane.bounds.width === ruler.bounds.width &&
      measuredBar.bounds.x === ruler.bounds.x &&
      unitStick.bounds.x === ruler.bounds.x &&
      measureLane.bounds.x === ruler.bounds.x &&
      ruler.bounds.width % Number(totalUnits) === 0 &&
      measuredRendered !== undefined &&
      unitRendered !== undefined &&
      measuredRendered.x ===
        ruler.bounds.x +
          ruler.bounds.width / Number(totalUnits) * Number(startMark) &&
      measuredRendered.y === measuredBar.bounds.y &&
      measuredRendered.width ===
        ruler.bounds.width / Number(totalUnits) * Number(length) &&
      measuredRendered.height === measuredBar.bounds.height &&
      unitRendered.x === unitStick.bounds.x &&
      unitRendered.y === unitStick.bounds.y &&
      unitRendered.width ===
        ruler.bounds.width / Number(totalUnits) &&
      unitRendered.height === unitStick.bounds.height &&
      measuredBar.bounds.y >= measureLane.bounds.y &&
      measuredBar.bounds.y + measuredBar.bounds.height <=
        measureLane.bounds.y + measureLane.bounds.height &&
      measureLane.bounds.y + measureLane.bounds.height -
        (measuredBar.bounds.y + measuredBar.bounds.height) >=
        unitRendered.height &&
      unitStick.bounds.y + unitStick.bounds.height <
        measureLane.bounds.y &&
      ruler.bounds.y >=
        measureLane.bounds.y + measureLane.bounds.height + 10 &&
      startLine.bounds.x + startLine.bounds.width / 2 ===
        measureLane.bounds.x &&
      startLine.bounds.y <= measureLane.bounds.y &&
      startLine.bounds.y + startLine.bounds.height >=
        measureLane.bounds.y + measureLane.bounds.height;
    if (!valid) {
      issue(
        issues,
        "unit-ruler-offset-length-invalid",
        "pedagogy",
        `${item.id}의 분할선 없는 연필 양끝이 자의 눈금과 맞고, 1 cm 막대 한 개를 옮겨 길이를 확인할 수 있어야 합니다.`
      );
    }
  }
};

handlers["visual.hidden-fraction-labels"] = (
  resolved,
  predicate,
  issues
) => {
  const roles = stringArrayParameter(predicate, "roles");
  for (const item of resolved.items) {
    const emissions = roles.map((role) =>
      byRole(resolved, item.id, role)
    );
    if (
      emissions.some(
        (emission) =>
          !emission ||
          emission.toolIntent.kind !== "fraction-model" ||
          emission.toolIntent.properties.showLabel !== false
      )
    ) {
      issue(
        issues,
        "fraction-label-must-be-hidden",
        "pedagogy",
        `${item.id}의 시각 막대에 분수 표기가 노출되어 활동에서 다루는 단위의 의미와 충돌합니다.`
      );
    }
  }
};

handlers["geometry.common-unit-lane-strips"] = (
  resolved,
  predicate,
  issues
) => {
  handlers["geometry.common-unit-sum-strips"]!(
    resolved,
    predicate,
    issues
  );
  const leftCellsPath = stringParameter(
    predicate,
    "leftCellsPath"
  );
  const rightCellsPath = stringParameter(
    predicate,
    "rightCellsPath"
  );
  const differenceCellsPath = stringParameter(
    predicate,
    "differenceCellsPath"
  );
  for (const item of resolved.items) {
    const leftCells = item.values[leftCellsPath];
    const rightCells = item.values[rightCellsPath];
    const differenceCells =
      item.values[differenceCellsPath];
    if (
      !Number.isInteger(leftCells) ||
      !Number.isInteger(rightCells) ||
      !Number.isInteger(differenceCells) ||
      Number(rightCells) >= Number(leftCells) ||
      Number(differenceCells) !==
        Number(leftCells) - Number(rightCells)
    ) {
      issue(
        issues,
        "common-unit-difference-cover-invalid",
        "pedagogy",
        `${item.id}의 덮는 띠가 처음 띠보다 짧고 남은 공통 단위 칸과 정확히 대응하지 않습니다.`
      );
    }
  }
};

export function validateRegisteredPredicates(
  resolved: ResolvedActivity,
  issues: ValidationIssue[]
): void {
  for (const predicate of resolved.valuePredicates) {
    const handler = handlers[predicate.kind];
    if (!handler) {
      issue(
        issues,
        "predicate-handler-unregistered",
        "schema",
        `등록되지 않은 값 검증 규칙입니다: ${predicate.kind}`
      );
      continue;
    }
    handler(resolved, predicate, issues);
  }
}
