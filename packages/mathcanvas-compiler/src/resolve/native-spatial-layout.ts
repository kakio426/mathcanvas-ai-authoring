import type {
  LayoutToken,
  NativeSpatialContract,
  SpatialBounds
} from "@mathcanvas/contracts";
import { assertNativeSpatialContract } from "@mathcanvas/contracts";

export interface LayoutVariantCandidate {
  readonly id: string;
  /** Semantic width required by this explicit preset, before any layout growth. */
  readonly requiredContentWidth: number;
  /** Maximum content width this variant can accept without scaling. */
  readonly maxContentWidth: number;
  /** Fixed pitch chosen for this variant; it must not change during growth. */
  readonly itemPitch: number;
}

export interface SelectedLayoutVariant {
  readonly variant: LayoutVariantCandidate;
  readonly fallbackCount: number;
}

/**
 * Select from an author-declared primary + optional fallback pair using semantic
 * content widths only. No measured growth result is fed back into selection.
 */
export function selectLayoutVariant(
  candidates: readonly LayoutVariantCandidate[]
): SelectedLayoutVariant {
  if (candidates.length === 0) {
    throw new Error("layout-variant-candidates-empty");
  }
  if (candidates.length > 2) {
    throw new Error("layout-variant-fallback-limit");
  }
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    if (
      !Number.isFinite(candidate.requiredContentWidth) ||
      candidate.requiredContentWidth <= 0 ||
      !Number.isFinite(candidate.maxContentWidth) ||
      candidate.maxContentWidth <= 0 ||
      !Number.isFinite(candidate.itemPitch) ||
      candidate.itemPitch <= 0
    ) {
      throw new Error(`layout-variant-candidate-invalid:${candidate.id}`);
    }
    if (
      index === 1 &&
      candidate.requiredContentWidth >= candidates[0]!.requiredContentWidth
    ) {
      throw new Error("layout-variant-fallback-not-monotone");
    }
    if (candidate.requiredContentWidth <= candidate.maxContentWidth) {
      return { variant: candidate, fallbackCount: index };
    }
  }
  throw new Error(
    `layout-variant-content-width-overflow:${candidates.at(-1)!.requiredContentWidth}`
  );
}

export interface ReservePlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function resolveNativeReserveBounds(
  placement: ReservePlacement,
  contract: NativeSpatialContract
): SpatialBounds {
  const parsed = assertNativeSpatialContract(contract);
  if (
    !Number.isFinite(placement.x) ||
    !Number.isFinite(placement.y) ||
    !Number.isFinite(placement.width) ||
    !Number.isFinite(placement.height) ||
    placement.width <= 0 ||
    placement.height <= 0
  ) {
    throw new Error("native-spatial-placement-invalid");
  }
  if (
    placement.width < parsed.minInteractiveSize.width ||
    placement.height < parsed.minInteractiveSize.height
  ) {
    throw new Error(
      `native-spatial-min-interactive-size:${parsed.contractId}`
    );
  }
  const local = parsed.reserveBox;
  if (parsed.reserveAnchor === "placement-center") {
    return {
      x: placement.x + placement.width / 2 + local.x,
      y: placement.y + placement.height / 2 + local.y,
      width: local.width,
      height: local.height
    };
  }
  return {
    x: placement.x + local.x,
    y: placement.y + local.y,
    width: local.width,
    height: local.height
  };
}

export interface VerticalFlowNode {
  readonly id: string;
  readonly contentHeight: number;
  readonly reserveHeight: number;
}

export interface VerticalFlowResult {
  readonly nodes: readonly (VerticalFlowNode & { readonly y: number })[];
  readonly contentHeight: number;
}

/**
 * Accumulate reserve heights exactly once. This is deliberately not a general
 * solver: itemPitch belongs to the selected variant and is never mutated here.
 */
export function resolveReserveVerticalFlow(
  nodes: readonly VerticalFlowNode[],
  options: { readonly originY: number; readonly minGap: number; readonly bottomPadding: number }
): VerticalFlowResult {
  if (
    !Number.isFinite(options.originY) ||
    !Number.isFinite(options.minGap) ||
    options.minGap < 0 ||
    !Number.isFinite(options.bottomPadding) ||
    options.bottomPadding < 0
  ) {
    throw new Error("native-spatial-flow-options-invalid");
  }
  let cursor = options.originY;
  const resolved: Array<VerticalFlowNode & { readonly y: number }> = [];
  for (const node of nodes) {
    if (
      !node.id ||
      !Number.isFinite(node.contentHeight) ||
      node.contentHeight <= 0 ||
      !Number.isFinite(node.reserveHeight) ||
      node.reserveHeight <= 0
    ) {
      throw new Error(`native-spatial-flow-node-invalid:${node.id}`);
    }
    const height = Math.max(node.contentHeight, node.reserveHeight);
    resolved.push({ ...node, y: cursor, reserveHeight: height });
    cursor += height + options.minGap;
  }
  const last = resolved.at(-1);
  const bottom = last ? last.y + last.reserveHeight : options.originY;
  return {
    nodes: resolved,
    contentHeight: bottom - options.originY + options.bottomPadding
  };
}

export function tokenToReservePlacement(token: LayoutToken): ReservePlacement {
  return {
    x: token.x,
    y: token.y,
    width: token.width,
    height: token.height
  };
}
