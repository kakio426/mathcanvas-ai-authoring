import type { NativeToolPlacement } from "./native-tool-contracts.js";

export const COUNTING_MODEL_VARIANT_ID = "NO01SC-01" as const;
export const COUNTING_MODEL_UNIT_SIZE = 80;
// 80px placement 주위의 84px intrinsic reserve가 서로 겹치지 않도록 하는
// 최소 간격이다. visual은 약 64px라 실제 화면에는 약 20px가 남는다.
export const COUNTING_MODEL_UNIT_GAP = 4;
export const COUNTING_MODEL_UNIT_PITCH =
  COUNTING_MODEL_UNIT_SIZE + COUNTING_MODEL_UNIT_GAP;
export const COUNTING_MODEL_MAX_COUNT = 31;
export const COUNTING_MODEL_COLUMN_COUNT = 5;
export const COUNTING_MODEL_ROW_STAGGER = COUNTING_MODEL_UNIT_PITCH / 2;
export const COUNTING_MODEL_ROW_CAPACITIES = [
  5, 4, 5, 4, 5, 4, 4
] as const;

export interface CountingModelUnitPlacement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * `5-4-5-4-5-4-4` 고정 벌집 행을 순서대로 채우는 중립 pool. 한 묶음 크기는
 * 배치 입력으로 읽지 않으며, 23과 31도 `5열×4/6행+나머지` 직사각형이 되지
 * 않는다. 마지막 부분 행은 가운데 정렬하지 않아 남은 수 단서도 만들지 않는다.
 */
export function resolveCountingModelUnitPlacements(
  count: number,
  placement: NativeToolPlacement
): readonly CountingModelUnitPlacement[] {
  if (!Number.isInteger(count) || count < 3 || count > COUNTING_MODEL_MAX_COUNT) {
    throw new Error(`counting-model-count-out-of-range:${count}`);
  }
  let remaining = count;
  const rowOccupancies = COUNTING_MODEL_ROW_CAPACITIES.flatMap((capacity) => {
    if (remaining === 0) return [];
    const occupancy = Math.min(capacity, remaining);
    remaining -= occupancy;
    return [occupancy];
  });
  if (remaining !== 0) {
    throw new Error(`counting-model-row-capacity-overflow:${count}`);
  }
  const requiredWidth = Math.max(
    ...rowOccupancies.map((occupancy, row) => {
      const capacity = COUNTING_MODEL_ROW_CAPACITIES[row]!;
      const stagger =
        capacity < COUNTING_MODEL_COLUMN_COUNT
          ? COUNTING_MODEL_ROW_STAGGER
          : 0;
      return (
        stagger +
        COUNTING_MODEL_UNIT_SIZE +
        (occupancy - 1) * COUNTING_MODEL_UNIT_PITCH
      );
    })
  );
  const requiredHeight =
    rowOccupancies.length * COUNTING_MODEL_UNIT_SIZE +
    (rowOccupancies.length - 1) * COUNTING_MODEL_UNIT_GAP;
  if (
    requiredWidth > placement.width ||
    requiredHeight > placement.height
  ) {
    throw new Error(
      `counting-model-pool-overflow:${count}:${placement.width}x${placement.height}`
    );
  }
  const top = placement.y + (placement.height - requiredHeight) / 2;
  const left = placement.x + (placement.width - requiredWidth) / 2;
  const result: CountingModelUnitPlacement[] = [];
  let index = 0;
  rowOccupancies.forEach((occupancy, row) => {
    const capacity = COUNTING_MODEL_ROW_CAPACITIES[row]!;
    const stagger =
      capacity < COUNTING_MODEL_COLUMN_COUNT
        ? COUNTING_MODEL_ROW_STAGGER
        : 0;
    for (let column = 0; column < occupancy; column += 1) {
      result.push({
        id: `${placement.id}-unit-${String(index + 1).padStart(2, "0")}`,
        x:
          left +
          COUNTING_MODEL_UNIT_SIZE / 2 +
          stagger +
          column * COUNTING_MODEL_UNIT_PITCH,
        y:
          top +
          COUNTING_MODEL_UNIT_SIZE / 2 +
          row * COUNTING_MODEL_UNIT_PITCH
      });
      index += 1;
    }
  });
  return result;
}

export interface CountingModelStructureAnalysis {
  readonly rowOccupancies: readonly number[];
  readonly columnOccupancies: readonly number[];
  readonly maximumUnitsPerRow: number;
  readonly distinctColumnCount: number;
  readonly completeRowOccupanciesMatchingSupportedGroupSize: readonly number[];
  readonly transposedRectangleMatchingDivision: boolean;
  readonly answerStructureLeaked: boolean;
}

/**
 * 실제 emit 좌표에서 구조 단서를 계산한다. 이 함수는 증거 생성기가 `false`를
 * 상수로 쓰지 못하게 하고, deliberately leaking fixture도 같은 gate를 통과하게 한다.
 */
export function analyzeCountingModelStructure(
  placements: readonly Pick<CountingModelUnitPlacement, "x" | "y">[],
  input: {
    readonly groupSize: number;
    readonly quotient: number;
    readonly supportedGroupSizes: readonly number[];
  }
): CountingModelStructureAnalysis {
  const rows = new Map<number, number>();
  const columns = new Map<number, number>();
  for (const placement of placements) {
    rows.set(placement.y, (rows.get(placement.y) ?? 0) + 1);
    columns.set(placement.x, (columns.get(placement.x) ?? 0) + 1);
  }
  const rowOccupancies = [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, count]) => count);
  const columnOccupancies = [...columns.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, count]) => count);
  const maximumUnitsPerRow = Math.max(0, ...rowOccupancies);
  const completeRows = rowOccupancies.filter(
    (occupancy) => occupancy === maximumUnitsPerRow
  );
  const matchingCompleteRows = completeRows.filter((occupancy) =>
    input.supportedGroupSizes.includes(occupancy)
  );
  const repeatedGroupRows =
    rowOccupancies.filter((occupancy) => occupancy === input.groupSize)
      .length >= input.quotient;
  const repeatedGroupColumns =
    columnOccupancies.filter((occupancy) => occupancy === input.groupSize)
      .length >= input.quotient;
  const transposedRectangleMatchingDivision =
    maximumUnitsPerRow === input.quotient &&
    completeRows.length === input.groupSize;
  return {
    rowOccupancies,
    columnOccupancies,
    maximumUnitsPerRow,
    distinctColumnCount: columnOccupancies.length,
    completeRowOccupanciesMatchingSupportedGroupSize: [
      ...new Set(matchingCompleteRows)
    ],
    transposedRectangleMatchingDivision,
    answerStructureLeaked:
      repeatedGroupRows ||
      repeatedGroupColumns ||
      transposedRectangleMatchingDivision
  };
}
