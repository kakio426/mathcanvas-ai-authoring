import type { LayoutToken } from "@mathcanvas/contracts";

export interface CenteredChoicePoolOptions {
  readonly roles: readonly string[];
  readonly rowCounts: readonly number[];
  readonly centerX: number;
  readonly firstRowY: number;
  readonly rowGap: number;
  readonly memberWidth: number;
  readonly memberHeight: number;
  readonly contentWidth?: number;
  readonly columnGap: number;
  readonly insetX: number;
  readonly insetY: number;
}

export function centeredRowLeft(
  centerX: number,
  memberCount: number,
  memberWidth: number,
  columnGap: number
): number {
  return (
    centerX -
    (memberCount * memberWidth +
      Math.max(0, memberCount - 1) * columnGap) /
      2
  );
}

export function centeredChoicePoolTokens(
  options: CenteredChoicePoolOptions
): Readonly<Record<string, LayoutToken>> {
  const contentWidth =
    options.contentWidth ??
    options.memberWidth - options.insetX * 2;
  if (
    options.rowCounts.some((count) => count < 1) ||
    options.rowCounts.reduce((sum, count) => sum + count, 0) !==
      options.roles.length ||
    options.memberWidth <= options.insetX * 2 ||
    options.memberHeight <= options.insetY * 2 ||
    contentWidth <= 0 ||
    contentWidth > options.memberWidth
  ) {
    throw new RangeError("centered-choice-pool-options-invalid");
  }

  const tokens: Record<string, LayoutToken> = {};
  let roleIndex = 0;
  options.rowCounts.forEach((rowCount, rowIndex) => {
    const rowLeft = centeredRowLeft(
      options.centerX,
      rowCount,
      options.memberWidth,
      options.columnGap
    );
    const y =
      options.firstRowY +
      rowIndex * (options.memberHeight + options.rowGap);
    for (let column = 0; column < rowCount; column += 1) {
      const role = options.roles[roleIndex++]!;
      const x =
        rowLeft +
        column * (options.memberWidth + options.columnGap);
      tokens[`item.${role}-backdrop`] = {
        scope: "item",
        x,
        y,
        width: options.memberWidth,
        height: options.memberHeight
      };
      tokens[`item.${role}`] = {
        scope: "item",
        x: x + (options.memberWidth - contentWidth) / 2,
        y: y + options.insetY,
        width: contentWidth,
        height: options.memberHeight - options.insetY * 2
      };
    }
  });
  return tokens;
}
