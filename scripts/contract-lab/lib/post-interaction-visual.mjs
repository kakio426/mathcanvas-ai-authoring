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

export function targetOverflow(box, target) {
  assertBox(box, "target-overflow-box");
  assertBox(target, "target-overflow-target");
  return Math.max(
    0,
    target.x - box.x,
    target.y - box.y,
    box.x + box.width - (target.x + target.width),
    box.y + box.height - (target.y + target.height)
  );
}

/**
 * 실제 조작 뒤 모든 활동이 같은 이름과 임계값으로 증거를 남기게 한다.
 * 활동별 canary는 박스와 이동 거리만 제공하고, 판정 정책은 여기에서 공유한다.
 */
export function measurePostInteractionContract({
  action,
  moveDistances,
  movedBoxes,
  targetBoxes,
  correctDecisionPlaced,
  commonStartResidualPx = null,
  transientOnly,
  existingProjectWriteCount,
  maximumTargetOverflowPx = 5
}) {
  if (
    typeof action !== "string" ||
    action.length === 0 ||
    !Array.isArray(moveDistances) ||
    !Array.isArray(movedBoxes) ||
    !Array.isArray(targetBoxes) ||
    moveDistances.length === 0 ||
    moveDistances.length !== movedBoxes.length ||
    movedBoxes.length !== targetBoxes.length
  ) {
    throw new Error("post-interaction-contract-input-invalid");
  }
  const targetOverflows = movedBoxes.map((box, index) =>
    targetOverflow(box, targetBoxes[index])
  );
  const maximumOverflow = Math.max(...targetOverflows);
  return {
    action,
    moveDistance: Math.min(...moveDistances),
    movedRoleCount: movedBoxes.length,
    correctDecisionPlaced,
    allMovedInsideTargets: maximumOverflow <= maximumTargetOverflowPx,
    maximumTargetOverflowPx: maximumOverflow,
    movedPairOverlapCount:
      movedBoxes.length > 1 ? occlusionCount(movedBoxes) : 0,
    minimumMovedGap:
      movedBoxes.length > 1 ? minimumPairGap(movedBoxes) : null,
    commonStartResidualPx,
    transientOnly,
    existingProjectWriteCount
  };
}

export function assertPostInteractionContract(
  interaction,
  {
    expectedAction,
    expectedMovedRoleCount,
    minimumMoveDistance = 20,
    maximumTargetOverflowPx = 5,
    minimumMovedGap = 3,
    requireCommonStart = false,
    maximumCommonStartResidualPx = 5,
    errorCode = "post-interaction-contract-invalid"
  } = {}
) {
  const movedRoleCount = interaction?.movedRoleCount;
  const singleRole = movedRoleCount === 1;
  const commonStartValid = requireCommonStart
    ? typeof interaction?.commonStartResidualPx === "number" &&
      Number.isFinite(interaction.commonStartResidualPx) &&
      interaction.commonStartResidualPx <= maximumCommonStartResidualPx
    : interaction?.commonStartResidualPx === null;
  const gapValid = singleRole
    ? interaction?.minimumMovedGap === null
    : typeof interaction?.minimumMovedGap === "number" &&
      Number.isFinite(interaction.minimumMovedGap) &&
      interaction.minimumMovedGap >= minimumMovedGap;
  if (
    typeof interaction?.action !== "string" ||
    interaction.action.length === 0 ||
    (expectedAction !== undefined && interaction.action !== expectedAction) ||
    !Number.isInteger(movedRoleCount) ||
    movedRoleCount < 1 ||
    (expectedMovedRoleCount !== undefined &&
      movedRoleCount !== expectedMovedRoleCount) ||
    interaction?.correctDecisionPlaced !== true ||
    typeof interaction?.moveDistance !== "number" ||
    !Number.isFinite(interaction.moveDistance) ||
    interaction.moveDistance < minimumMoveDistance ||
    interaction?.allMovedInsideTargets !== true ||
    typeof interaction?.maximumTargetOverflowPx !== "number" ||
    !Number.isFinite(interaction.maximumTargetOverflowPx) ||
    interaction.maximumTargetOverflowPx > maximumTargetOverflowPx ||
    interaction?.movedPairOverlapCount !== 0 ||
    !gapValid ||
    !commonStartValid ||
    interaction?.transientOnly !== true ||
    interaction?.existingProjectWriteCount !== 0
  ) {
    throw new Error(`${errorCode}:${JSON.stringify(interaction)}`);
  }
  return interaction;
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
