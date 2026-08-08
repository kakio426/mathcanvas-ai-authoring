import type { NativeToolPlacement } from "./native-tool-contracts.js";

export const COUNTING_MODEL_VARIANT_ID = "NO01SC-01" as const;
export const COUNTING_MODEL_UNIT_SIZE = 80;
// 80px placement 주위의 84px intrinsic reserve가 서로 겹치지 않도록 하는
// 최소 간격이다. visual은 약 64px라 실제 화면에는 약 20px가 남는다.
export const COUNTING_MODEL_UNIT_GAP = 4;
export const COUNTING_MODEL_UNIT_PITCH =
  COUNTING_MODEL_UNIT_SIZE + COUNTING_MODEL_UNIT_GAP;
export const COUNTING_MODEL_MAX_COUNT = 31;

export interface CountingModelUnitPlacement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * 낱개 사이 간격을 고정한 가운데 정렬 pool. 한 묶음 크기는 배치 입력으로 읽지
 * 않으므로 초기 모형이 몫이나 나머지를 미리 드러내지 않는다.
 */
export function resolveCountingModelUnitPlacements(
  count: number,
  placement: NativeToolPlacement
): readonly CountingModelUnitPlacement[] {
  if (!Number.isInteger(count) || count < 3 || count > COUNTING_MODEL_MAX_COUNT) {
    throw new Error(`counting-model-count-out-of-range:${count}`);
  }
  const columns = Math.floor(
    (placement.width + COUNTING_MODEL_UNIT_GAP) /
      COUNTING_MODEL_UNIT_PITCH
  );
  const rows = Math.ceil(count / columns);
  const requiredWidth =
    Math.min(count, columns) * COUNTING_MODEL_UNIT_SIZE +
    (Math.min(count, columns) - 1) * COUNTING_MODEL_UNIT_GAP;
  const requiredHeight =
    rows * COUNTING_MODEL_UNIT_SIZE +
    (rows - 1) * COUNTING_MODEL_UNIT_GAP;
  if (
    columns < 1 ||
    requiredWidth > placement.width ||
    requiredHeight > placement.height
  ) {
    throw new Error(
      `counting-model-pool-overflow:${count}:${placement.width}x${placement.height}`
    );
  }
  const top = placement.y + (placement.height - requiredHeight) / 2;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, count - row * columns);
    const rowWidth =
      rowCount * COUNTING_MODEL_UNIT_SIZE +
      (rowCount - 1) * COUNTING_MODEL_UNIT_GAP;
    const left = placement.x + (placement.width - rowWidth) / 2;
    const column = index % columns;
    return {
      id: `${placement.id}-unit-${String(index + 1).padStart(2, "0")}`,
      x:
        left +
        COUNTING_MODEL_UNIT_SIZE / 2 +
        column * COUNTING_MODEL_UNIT_PITCH,
      y:
        top +
        COUNTING_MODEL_UNIT_SIZE / 2 +
        row * COUNTING_MODEL_UNIT_PITCH
    };
  });
}
