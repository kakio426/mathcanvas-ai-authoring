export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BoundsEntry {
  readonly id: string;
  readonly bounds: Bounds;
}

export interface MovableRootSpec {
  readonly id: string;
  readonly memberIds: readonly string[] | null;
}

export function resolveMovableRootBounds(
  entries: readonly BoundsEntry[],
  specs: readonly MovableRootSpec[]
): {
  readonly movableRootBounds: readonly BoundsEntry[];
  readonly missingMovableRootIds: readonly string[];
};

export function findPeerOverlapPairs(
  entries: readonly BoundsEntry[],
  toleranceCssPx?: number
): readonly {
  readonly leftId: string;
  readonly rightId: string;
  readonly overlapWidth: number;
  readonly overlapHeight: number;
}[];

export function findPeerClearanceViolations(
  entries: readonly BoundsEntry[],
  minimumClearanceCssPx?: number,
  toleranceCssPx?: number
): readonly {
  readonly leftId: string;
  readonly rightId: string;
  readonly clearance: number;
}[];
