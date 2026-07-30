import {
  boundsSchema,
  type BlueprintLayout,
  type LayoutBlock,
  type LayoutPreset
} from "@mathcanvas/contracts";

export interface ResolvedLayoutSlot {
  readonly role: string;
  readonly itemId?: string;
  readonly flowGroup?: string;
  readonly collisionGroup?: string;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface ResolvedLayout {
  readonly width: number;
  readonly height: number;
  readonly viewBox: readonly [number, number, number, number];
  readonly minGap: number;
  readonly slots: readonly ResolvedLayoutSlot[];
}

function flatten(block: LayoutBlock): LayoutBlock[] {
  return [block, ...block.children.flatMap(flatten)];
}

function intersects(
  left: ResolvedLayoutSlot,
  right: ResolvedLayoutSlot
): boolean {
  return (
    left.bounds.x < right.bounds.x + right.bounds.width &&
    left.bounds.x + left.bounds.width > right.bounds.x &&
    left.bounds.y < right.bounds.y + right.bounds.height &&
    left.bounds.y + left.bounds.height > right.bounds.y
  );
}

export function resolveLayout(
  layout: BlueprintLayout,
  itemIds: readonly string[],
  preset: LayoutPreset
): ResolvedLayout {
  const tokens = preset.tokens;
  const blocks = flatten(layout.root);
  const canvasToken = tokens[layout.root.preset];
  if (!canvasToken) {
    throw new Error(`layout-token-missing:${layout.root.preset}`);
  }
  const canvasHeight =
    preset.canvasBaseHeight + itemIds.length * preset.itemPitch;
  const cache = new Map<string, ResolvedLayoutSlot["bounds"]>();
  const resolving = new Set<string>();
  const resolveToken = (
    tokenName: string,
    itemIndex: number | undefined
  ): ResolvedLayoutSlot["bounds"] => {
    const cacheKey = `${tokenName}:${itemIndex ?? "activity"}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    if (resolving.has(cacheKey)) {
      throw new Error(`layout-cyclic-reference:${tokenName}`);
    }
    const token = tokens[tokenName];
    if (!token) throw new Error(`layout-token-missing:${tokenName}`);
    if (token.scope === "item" && itemIndex === undefined) {
      throw new Error(`layout-item-index-required:${tokenName}`);
    }
    resolving.add(cacheKey);
    let anchorX = 0;
    let anchorY =
      token.scope === "item"
        ? preset.itemOriginY + (itemIndex ?? 0) * preset.itemPitch
        : 0;
    if (token.relativeTo) {
      if (!tokens[token.relativeTo]) {
        throw new Error(
          `layout-missing-anchor:${tokenName}:${token.relativeTo}`
        );
      }
      const anchor = resolveToken(token.relativeTo, itemIndex);
      anchorX = anchor.x;
      anchorY = anchor.y;
    }
    const bounds = {
      x: anchorX + token.x,
      y: anchorY + token.y,
      width: token.width,
      height: token.height
    };
    resolving.delete(cacheKey);
    if (bounds.width <= 0 || bounds.height <= 0) {
      throw new Error(`layout-negative-size:${tokenName}`);
    }
    boundsSchema.parse(bounds);
    if (
      bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.width > canvasToken.width ||
      bounds.y + bounds.height > canvasHeight
    ) {
      throw new Error(`layout-canvas-overflow:${tokenName}`);
    }
    cache.set(cacheKey, bounds);
    return bounds;
  };

  const slots: ResolvedLayoutSlot[] = [];
  for (const block of blocks.slice(1)) {
    if (block.repeat === "once") {
      slots.push({
        role: block.id,
        bounds: resolveToken(block.preset, undefined),
        ...(block.flowGroup
          ? { flowGroup: block.flowGroup }
          : {}),
        ...(block.collisionGroup
          ? { collisionGroup: block.collisionGroup }
          : {})
      });
      continue;
    }
    itemIds.forEach((itemId, itemIndex) => {
      slots.push({
        role: block.id,
        itemId,
        bounds: resolveToken(block.preset, itemIndex),
        ...(block.flowGroup
          ? { flowGroup: block.flowGroup }
          : {}),
        ...(block.collisionGroup
          ? { collisionGroup: block.collisionGroup }
          : {})
      });
    });
  }

  for (let leftIndex = 0; leftIndex < slots.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < slots.length;
      rightIndex += 1
    ) {
      const left = slots[leftIndex];
      const right = slots[rightIndex];
      if (
        left &&
        right &&
        left.itemId === right.itemId &&
        ((left.collisionGroup !== undefined &&
          left.collisionGroup === right.collisionGroup) ||
          (left.flowGroup !== undefined &&
            left.flowGroup === right.flowGroup)) &&
        intersects(left, right)
      ) {
        throw new Error(
          `layout-overlap:${left.itemId ?? "activity"}:${left.role}:${right.role}`
        );
      }
    }
  }

  return {
    width: canvasToken.width,
    height: canvasHeight,
    viewBox: [0, 0, canvasToken.width, canvasHeight],
    minGap: preset.minGap,
    slots
  };
}
