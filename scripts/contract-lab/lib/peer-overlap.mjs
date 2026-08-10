function right(bounds) {
  return bounds.x + bounds.width;
}

function bottom(bounds) {
  return bounds.y + bounds.height;
}

function validBounds(bounds) {
  return [bounds?.x, bounds?.y, bounds?.width, bounds?.height].every(
    (value) => Number.isFinite(value)
  );
}

function unionBounds(boundsList) {
  const minX = Math.min(...boundsList.map((bounds) => bounds.x));
  const minY = Math.min(...boundsList.map((bounds) => bounds.y));
  const maxX = Math.max(...boundsList.map(right));
  const maxY = Math.max(...boundsList.map(bottom));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function resolveMovableRootBounds(entries, specs) {
  if (!Array.isArray(entries) || !Array.isArray(specs)) {
    throw new Error("movable-root-bounds:invalid-input");
  }
  const entryIds = entries.map((entry) => entry?.id);
  const specIds = specs.map((spec) => spec?.id);
  if (
    entryIds.some((id) => typeof id !== "string" || id.length === 0) ||
    new Set(entryIds).size !== entryIds.length ||
    entries.some((entry) => !validBounds(entry.bounds)) ||
    specIds.some((id) => typeof id !== "string" || id.length === 0) ||
    new Set(specIds).size !== specIds.length ||
    specs.some(
      (spec) =>
        spec.memberIds !== null &&
        (!Array.isArray(spec.memberIds) ||
          spec.memberIds.length === 0 ||
          spec.memberIds.some((id) => typeof id !== "string" || id.length === 0) ||
          new Set(spec.memberIds).size !== spec.memberIds.length)
    )
  ) {
    throw new Error("movable-root-bounds:invalid-entry");
  }
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const movableRootBounds = [];
  const missingMovableRootIds = [];
  for (const spec of specs) {
    if (spec.memberIds) {
      const members = spec.memberIds.map((id) => entryById.get(id));
      if (members.some((entry) => !entry)) {
        missingMovableRootIds.push(spec.id);
        continue;
      }
      movableRootBounds.push({
        id: spec.id,
        bounds: unionBounds(members.map((entry) => entry.bounds))
      });
      continue;
    }
    const exact = entryById.get(spec.id);
    if (!exact) {
      missingMovableRootIds.push(spec.id);
      continue;
    }
    movableRootBounds.push({ id: spec.id, bounds: exact.bounds });
  }
  return { movableRootBounds, missingMovableRootIds };
}

export function findPeerOverlapPairs(entries, toleranceCssPx = 1.5) {
  if (!Array.isArray(entries) || !Number.isFinite(toleranceCssPx) || toleranceCssPx < 0) {
    throw new Error("peer-overlap:invalid-input");
  }
  const ids = entries.map((entry) => entry?.id);
  if (
    ids.some((id) => typeof id !== "string" || id.length === 0) ||
    new Set(ids).size !== ids.length ||
    entries.some((entry) => !validBounds(entry.bounds))
  ) {
    throw new Error("peer-overlap:invalid-entry");
  }
  const pairs = [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const rightEntry = entries[rightIndex];
      const overlapWidth =
        Math.min(right(left.bounds), right(rightEntry.bounds)) -
        Math.max(left.bounds.x, rightEntry.bounds.x);
      const overlapHeight =
        Math.min(bottom(left.bounds), bottom(rightEntry.bounds)) -
        Math.max(left.bounds.y, rightEntry.bounds.y);
      if (overlapWidth > toleranceCssPx && overlapHeight > toleranceCssPx) {
        pairs.push({
          leftId: left.id,
          rightId: rightEntry.id,
          overlapWidth,
          overlapHeight
        });
      }
    }
  }
  return pairs;
}

export function findPeerClearanceViolations(
  entries,
  minimumClearanceCssPx = 16,
  toleranceCssPx = 1.5
) {
  if (
    !Array.isArray(entries) ||
    !Number.isFinite(minimumClearanceCssPx) ||
    minimumClearanceCssPx <= 0 ||
    !Number.isFinite(toleranceCssPx) ||
    toleranceCssPx < 0
  ) {
    throw new Error("peer-clearance:invalid-input");
  }
  // Reuse the overlap validator's identity and geometry checks.
  findPeerOverlapPairs(entries, toleranceCssPx);
  const violations = [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const rightEntry = entries[rightIndex];
      const gapX = Math.max(
        rightEntry.bounds.x - right(left.bounds),
        left.bounds.x - right(rightEntry.bounds),
        0
      );
      const gapY = Math.max(
        rightEntry.bounds.y - bottom(left.bounds),
        left.bounds.y - bottom(rightEntry.bounds),
        0
      );
      const clearance = Math.hypot(gapX, gapY);
      if (clearance + toleranceCssPx < minimumClearanceCssPx) {
        violations.push({
          leftId: left.id,
          rightId: rightEntry.id,
          clearance
        });
      }
    }
  }
  return violations;
}
