function assertBox(box, label) {
  if (
    !box ||
    ![box.x, box.y, box.width, box.height].every(
      (value) => typeof value === "number" && Number.isFinite(value)
    ) ||
    box.width < 0 ||
    box.height < 0
  ) {
    throw new Error(`post-interaction-box-invalid:${label}`);
  }
}

export function overlapArea(left, right) {
  assertBox(left, "overlap-left");
  assertBox(right, "overlap-right");
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x)
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y)
  );
  return width * height;
}

export function edgeGap(left, right) {
  assertBox(left, "gap-left");
  assertBox(right, "gap-right");
  const horizontal = Math.max(
    0,
    left.x - (right.x + right.width),
    right.x - (left.x + left.width)
  );
  const vertical = Math.max(
    0,
    left.y - (right.y + right.height),
    right.y - (left.y + left.height)
  );
  return Math.hypot(horizontal, vertical);
}

export function minimumPairGap(boxes) {
  if (!Array.isArray(boxes) || boxes.length < 2) {
    throw new Error("post-interaction-gap-boxes-insufficient");
  }
  return Math.min(
    ...boxes.flatMap((left, index) =>
      boxes.slice(index + 1).map((right) => edgeGap(left, right))
    )
  );
}

export function occlusionCount(boxes) {
  if (!Array.isArray(boxes)) {
    throw new Error("post-interaction-occlusion-boxes-invalid");
  }
  return boxes.reduce(
    (count, left, index) =>
      count +
      boxes
        .slice(index + 1)
        .filter((right) => overlapArea(left, right) > 0).length,
    0
  );
}

function coveredArea(reference, occluders) {
  assertBox(reference, "reference");
  const intersections = occluders
    .map((occluder) => {
      assertBox(occluder, "occluder");
      return {
        left: Math.max(reference.x, occluder.x),
        top: Math.max(reference.y, occluder.y),
        right: Math.min(
          reference.x + reference.width,
          occluder.x + occluder.width
        ),
        bottom: Math.min(
          reference.y + reference.height,
          occluder.y + occluder.height
        )
      };
    })
    .filter((box) => box.right > box.left && box.bottom > box.top);
  const xEdges = [
    reference.x,
    reference.x + reference.width,
    ...intersections.flatMap((box) => [box.left, box.right])
  ].sort((left, right) => left - right);
  let area = 0;
  for (let index = 0; index < xEdges.length - 1; index += 1) {
    const left = xEdges[index];
    const right = xEdges[index + 1];
    if (right <= left) continue;
    const ranges = intersections
      .filter((box) => box.left < right && box.right > left)
      .map((box) => [box.top, box.bottom])
      .sort((first, second) => first[0] - second[0]);
    let coveredHeight = 0;
    let rangeStart;
    let rangeEnd;
    for (const [top, bottom] of ranges) {
      if (rangeStart === undefined || top > rangeEnd) {
        if (rangeStart !== undefined) coveredHeight += rangeEnd - rangeStart;
        rangeStart = top;
        rangeEnd = bottom;
      } else {
        rangeEnd = Math.max(rangeEnd, bottom);
      }
    }
    if (rangeStart !== undefined) coveredHeight += rangeEnd - rangeStart;
    area += (right - left) * coveredHeight;
  }
  return area;
}

export function referenceVisibleAreaRatio(referenceBoxes, occluders) {
  if (!Array.isArray(referenceBoxes) || referenceBoxes.length === 0) {
    throw new Error("post-interaction-reference-boxes-insufficient");
  }
  if (!Array.isArray(occluders)) {
    throw new Error("post-interaction-occluders-invalid");
  }
  const referenceArea = referenceBoxes.reduce((total, box) => {
    assertBox(box, "reference");
    return total + box.width * box.height;
  }, 0);
  if (referenceArea === 0) return 0;
  const occludedArea = referenceBoxes.reduce(
    (total, box) => total + coveredArea(box, occluders),
    0
  );
  return Number(
    Math.max(0, 1 - occludedArea / referenceArea).toFixed(6)
  );
}

export function assertPostInteractionVisual({
  gapBoxes,
  occlusionBoxes = gapBoxes,
  referenceBoxes,
  occluders,
  minimumGap = 3,
  minimumVisibleAreaRatio = 0.99,
  errorCode = "post-interaction-visual-invalid"
}) {
  const metrics = {
    afterInteractionMinimumGap: minimumPairGap(gapBoxes),
    occlusionCount: occlusionCount(occlusionBoxes),
    referenceVisibleAreaRatio: referenceVisibleAreaRatio(
      referenceBoxes,
      occluders
    )
  };
  if (
    metrics.afterInteractionMinimumGap < minimumGap ||
    metrics.occlusionCount !== 0 ||
    metrics.referenceVisibleAreaRatio < minimumVisibleAreaRatio
  ) {
    throw new Error(`${errorCode}:${JSON.stringify(metrics)}`);
  }
  return metrics;
}
