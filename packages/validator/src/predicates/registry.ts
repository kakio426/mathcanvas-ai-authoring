import type {
  ResolvedActivity,
  ResolvedEmission,
  ValidationIssue,
  ValuePredicate
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

const handlers: Readonly<Record<string, Handler>> = {
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
            containsValue(
              emission.toolIntent.properties,
              correctValue
            )
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
          const leftBounds = regions[left]!.bounds;
          const rightBounds = regions[right]!.bounds;
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
