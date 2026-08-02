#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { failCli, parseArguments } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";

const hashPattern = /^[a-f0-9]{64}$/;
const semverPattern = /^\d+\.\d+\.\d+$/;

function circularResidual(actual, expected) {
  const modulo = (value) => ((value % 360) + 360) % 360;
  const delta = Math.abs(modulo(actual) - modulo(expected));
  return Math.min(delta, 360 - delta);
}

function gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

function lcm(left, right) {
  return (left * right) / gcd(left, right);
}

export function validateActivityReleaseCanaryEvidence(
  evidence
) {
  const itemCount = evidence?.problemCount;
  const shape = evidence?.reopenShape;
  const persisted = evidence?.persistedShape;
  if (
    evidence?.schemaVersion !== "1.0.0" ||
    typeof evidence?.observedAt !== "string" ||
    Number.isNaN(Date.parse(evidence.observedAt)) ||
    !semverPattern.test(evidence?.blueprintVersion ?? "") ||
    !hashPattern.test(evidence?.blueprintContentHash ?? "") ||
    !hashPattern.test(evidence?.layoutPresetContentHash ?? "") ||
    !hashPattern.test(evidence?.payloadHash ?? "") ||
    !hashPattern.test(evidence?.projectReferenceHash ?? "") ||
    evidence?.status !== "pass" ||
    evidence?.createRequestCount !== 1 ||
    evidence?.existingProjectWriteCount !== 0 ||
    evidence?.localValidationIssueCount !== 0 ||
    evidence?.editorPath !== "/ko/view/<redacted-project>" ||
    !["Unit01", "Unit02", "Unit03", "Unit04"].includes(
      evidence?.categoryUnit
    ) ||
    !Number.isInteger(itemCount) ||
    itemCount < 1 ||
    itemCount > 4 ||
    !Number.isInteger(persisted?.objectCount) ||
    persisted.objectCount < 1 ||
    typeof evidence?.previewPath !== "string" ||
    !evidence.previewPath.endsWith(".png")
  ) {
    throw new Error(
      "activity-release-canary-evidence-shape-invalid"
    );
  }

  if (
    evidence.blueprintId ===
    "data.bar-graph.scale-unit.read-v1"
  ) {
    const interaction = evidence.interactionShape;
    const expectedReferenceWidth =
      (interaction?.laneWidth * interaction?.referenceCells) /
      interaction?.totalCells;
    const expectedQuestionWidth =
      (interaction?.laneWidth * interaction?.questionCells) /
      interaction?.totalCells;
    if (
      evidence.probeId !==
        "wave12-bar-graph-scale-release-canary-v1" ||
      evidence.categoryUnit !== "Unit04" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "NO03FM" ||
      shape?.fractionStripCount !== itemCount * 2 ||
      shape?.visibleFractionStripCount !== itemCount * 2 ||
      shape?.unitRulerCount !== itemCount ||
      shape?.candidateTextCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.joinLaneCount !== itemCount ||
      shape?.referenceLaneCount !== itemCount ||
      shape?.questionLaneCount !== itemCount ||
      persisted?.fractionStripCount !== itemCount * 3 ||
      persisted?.configuredFractionMatchCount !== itemCount * 3 ||
      persisted?.leftStripCount !== itemCount ||
      persisted?.rightStripCount !== itemCount ||
      persisted?.unitRulerCount !== itemCount ||
      persisted?.unitRulerDividerMatchCount !== itemCount ||
      persisted?.labelHiddenStripCount !== itemCount * 3 ||
      persisted?.candidateFormulaCount !== itemCount * 5 ||
      persisted?.fractionModuleActive !== true ||
      interaction?.action !==
        "align-bars-on-separate-scale-rows" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      ![
        interaction?.totalCells,
        interaction?.peoplePerCell,
        interaction?.referenceCells,
        interaction?.questionCells,
        interaction?.referenceValue,
        interaction?.questionValue
      ].every(
        (value) => Number.isInteger(value) && value > 0
      ) ||
      ![10, 12].includes(interaction?.totalCells) ||
      ![2, 5, 10].includes(interaction?.peoplePerCell) ||
      interaction?.referenceCells >=
        interaction?.questionCells ||
      interaction?.referenceValue !==
        interaction?.referenceCells *
          interaction?.peoplePerCell ||
      interaction?.questionValue !==
        interaction?.questionCells *
          interaction?.peoplePerCell ||
      interaction?.withinOneWhole !== true ||
      ![
        interaction?.laneWidth,
        interaction?.wholeWidth,
        interaction?.unitRulerWidth,
        interaction?.commonUnitCellWidth,
        interaction?.leftStripWidth,
        interaction?.rightStripWidth,
        interaction?.startResidual,
        interaction?.questionStartResidual,
        interaction?.referenceEdgeResidual,
        interaction?.questionEdgeResidual,
        interaction?.referenceBarWidthResidual,
        interaction?.questionBarWidthResidual,
        interaction?.initialReferenceOffset,
        interaction?.initialQuestionOffset,
        interaction?.questionLaneWidth,
        interaction?.expectedRowPitch,
        interaction?.actualRowPitch,
        interaction?.leftVerticalCenterResidual,
        interaction?.rightVerticalCenterResidual,
        interaction?.rowSeparationGap,
        interaction?.rulerStartResidual,
        interaction?.rulerWidthResidual,
        interaction?.cellBoundaryResidual,
        interaction?.verticalRowResidual,
        interaction?.verticalContainmentResidual
      ].every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      ) ||
      Math.abs(
        interaction?.wholeWidth - interaction?.laneWidth
      ) > 3 ||
      Math.abs(
        interaction?.unitRulerWidth -
          interaction?.laneWidth
      ) > 3 ||
      Math.abs(
        interaction?.questionLaneWidth -
          interaction?.laneWidth
      ) > 3 ||
      Math.abs(
        interaction?.commonUnitCellWidth -
          interaction?.unitRulerWidth /
            interaction?.totalCells
      ) > 1 ||
      Math.abs(
        interaction?.leftStripWidth -
          expectedReferenceWidth
      ) > 3 ||
      Math.abs(
        interaction?.rightStripWidth -
          expectedQuestionWidth
      ) > 3 ||
      interaction?.startResidual > 5 ||
      interaction?.questionStartResidual > 5 ||
      interaction?.initialReferenceOffset <
        interaction?.commonUnitCellWidth / 2 ||
      interaction?.initialQuestionOffset <
        interaction?.commonUnitCellWidth / 2 ||
      interaction?.rowSeparationGap < 10 ||
      interaction?.referenceEdgeResidual > 5 ||
      interaction?.questionEdgeResidual > 5 ||
      interaction?.referenceBarWidthResidual > 3 ||
      interaction?.questionBarWidthResidual > 3 ||
      interaction?.rulerStartResidual > 3 ||
      interaction?.rulerWidthResidual > 3 ||
      interaction?.cellBoundaryResidual > 5 ||
      interaction?.verticalRowResidual > 5 ||
      interaction?.leftVerticalCenterResidual > 5 ||
      interaction?.rightVerticalCenterResidual > 5 ||
      interaction?.verticalContainmentResidual > 5
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "measure.length.unit-iteration.ruler-v1"
  ) {
    const interaction = evidence.interactionShape;
    if (
      evidence.probeId !==
        "wave13-broken-ruler-release-canary-v1" ||
      evidence.blueprintVersion !== "1.2.0" ||
      evidence.categoryUnit !== "Unit03" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "NO03FM" ||
      !Number.isInteger(itemCount) ||
      itemCount < 2 ||
      itemCount > 3 ||
      shape?.pencilCount !== itemCount ||
      shape?.visiblePencilCount !== itemCount ||
      shape?.unitStickCount !== itemCount ||
      shape?.visibleUnitStickCount !== itemCount ||
      shape?.unitRulerCount !== itemCount ||
      shape?.visibleUnitRulerCount !== itemCount ||
      shape?.joinLaneCount !== itemCount ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.questionCount !== itemCount ||
      shape?.candidateTextCount !== itemCount * 5 ||
      persisted?.pencilCount !== itemCount ||
      persisted?.undividedPencilCount !== itemCount ||
      persisted?.pencilPointMatchCount !== itemCount ||
      persisted?.lockedPencilCount !== itemCount ||
      persisted?.unitStickCount !== itemCount ||
      persisted?.configuredUnitStickCount !== itemCount ||
      persisted?.unlockedUnitStickCount !== itemCount ||
      persisted?.unitRulerCount !== itemCount ||
      persisted?.configuredUnitRulerCount !== itemCount ||
      persisted?.lockedRulerCount !== itemCount ||
      persisted?.transparentLaneCount !== itemCount ||
      persisted?.candidateTextCount !== itemCount * 5 ||
      persisted?.fractionModuleActive !== true ||
      interaction?.action !==
        "repeat-one-centimeter-stick-along-pencil" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      ![8, 12].includes(interaction?.totalUnits) ||
      !Number.isInteger(interaction?.startMark) ||
      interaction.startMark < 1 ||
      !Number.isInteger(interaction?.endMark) ||
      !Number.isInteger(interaction?.lengthCm) ||
      interaction.lengthCm < 2 ||
      interaction.endMark !==
        interaction.startMark + interaction.lengthCm ||
      interaction.endMark > interaction.totalUnits ||
      !Number.isInteger(interaction?.iterationCount) ||
      interaction.iterationCount < 2 ||
      ![
        interaction?.rulerWidth,
        interaction?.pencilWidth,
        interaction?.unitStickWidth,
        interaction?.unitStickHeight,
        interaction?.expectedCellWidth,
        interaction?.pencilLeftResidual,
        interaction?.pencilRightResidual,
        interaction?.pencilWidthResidual,
        interaction?.stickWidthResidual,
        interaction?.stickLeftResidual,
        interaction?.maxIterationLeftResidual,
        interaction?.finalStickRightResidual,
        interaction?.stickVerticalContainmentResidual,
        interaction?.lockedPencilResidual,
        interaction?.lockedRulerResidual,
        interaction?.stickMoveDistance,
        interaction?.lowerBandHeight
      ].every(
        (value) =>
          typeof value === "number" && Number.isFinite(value)
      ) ||
      Math.abs(
        interaction.expectedCellWidth -
          interaction.rulerWidth / interaction.totalUnits
      ) > 1 ||
      Math.abs(
        interaction.pencilWidth -
          interaction.expectedCellWidth * interaction.lengthCm
      ) > 3 ||
      Math.abs(
        interaction.unitStickWidth -
          interaction.expectedCellWidth
      ) > 3 ||
      interaction.pencilLeftResidual > 3 ||
      interaction.pencilRightResidual > 3 ||
      interaction.pencilWidthResidual > 3 ||
      interaction.stickWidthResidual > 3 ||
      interaction.stickLeftResidual > 5 ||
      interaction.iterationCount !== interaction.lengthCm ||
      interaction.maxIterationLeftResidual > 5 ||
      interaction.finalStickRightResidual > 3 ||
      interaction.stickVerticalContainmentResidual > 3 ||
      interaction.lockedPencilResidual > 3 ||
      interaction.lockedRulerResidual > 3 ||
      interaction.stickMoveDistance < 30 ||
      interaction.lowerBandHeight + 1 <
        interaction.unitStickHeight
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "relation.equal-sign.balanced-equation.cards-v1"
  ) {
    if (
      evidence.probeId !==
        "wave5-equality-release-canary-v1" ||
      evidence.reusedReleasedTool !== "NO04NT" ||
      shape?.answerSlotCount !== itemCount ||
      shape?.numberCardCount !== itemCount * 6 ||
      shape?.topCellCount !== itemCount * 18 ||
      shape?.bottomCellCount !== itemCount * 18 ||
      persisted?.answerSlotCount !== itemCount ||
      persisted?.numberCardCount !== itemCount * 6 ||
      persisted?.topCellCount !== itemCount * 18 ||
      persisted?.bottomCellCount !== itemCount * 18
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "measure.time.clock.hour-hand-boundary-v1"
  ) {
    if (
      evidence.probeId !==
        "wave6-clock-release-canary-v2" ||
      evidence.categoryUnit !== "Unit03" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "SM02AD" ||
      shape?.clockCount !== itemCount ||
      shape?.visibleClockCount !== itemCount ||
      shape?.gearedClockCount !== itemCount ||
      shape?.candidateTextCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      persisted?.clockCount !== itemCount ||
      persisted?.gearedClockCount !== itemCount ||
      persisted?.stoppedClockCount !== itemCount ||
      persisted?.initialMinuteCount !== itemCount ||
      persisted?.candidateTextCount !== itemCount * 5 ||
      persisted?.clockModuleActive !== true ||
      evidence.interactionShape?.action !==
        "drag-minute-hand-to-generated-minute" ||
      evidence.interactionShape?.transientOnly !== true ||
      evidence.interactionShape?.existingProjectWriteCount !== 0 ||
      typeof evidence.interactionShape?.targetMinute !== "number" ||
      Math.abs(
        evidence.interactionShape.afterMinuteAngle -
          evidence.interactionShape.targetMinute * 6
      ) > 1 ||
      circularResidual(
        evidence.interactionShape?.afterHourAngle,
        (evidence.interactionShape?.startHour +
          evidence.interactionShape?.targetMinute / 60) *
          30
      ) > 0.6 ||
      evidence.interactionShape?.handAngleResidual > 0.6
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "measure.time.elapsed.clock-pair-v1"
  ) {
    const interaction = evidence.interactionShape;
    const expectedEndHour =
      interaction?.startHour === 12
        ? 1
        : interaction?.startHour + 1;
    const expectedStartHourAngle =
      ((interaction?.startHour % 12) +
        interaction?.startMinute / 60) *
      30;
    const expectedEndHourAngle =
      ((interaction?.endHour % 12) +
        interaction?.endMinute / 60) *
      30;
    if (
      evidence.probeId !==
        "wave7-elapsed-time-release-canary-v1" ||
      evidence.categoryUnit !== "Unit03" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "SM02AD" ||
      shape?.clockCount !== itemCount * 2 ||
      shape?.visibleClockCount !== itemCount * 2 ||
      shape?.gearedClockCount !== itemCount * 2 ||
      shape?.candidateTextCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      persisted?.clockCount !== itemCount * 2 ||
      persisted?.gearedClockCount !== itemCount * 2 ||
      persisted?.stoppedClockCount !== itemCount * 2 ||
      persisted?.startClockCount !== itemCount ||
      persisted?.endClockCount !== itemCount ||
      persisted?.configuredTimeMatchCount !== itemCount * 2 ||
      persisted?.candidateTextCount !== itemCount * 5 ||
      persisted?.clockModuleActive !== true ||
      interaction?.action !==
        "drag-start-clock-to-end-time" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      ![
        interaction?.startHour,
        interaction?.startMinute,
        interaction?.endHour,
        interaction?.endMinute,
        interaction?.elapsedMinutes,
        interaction?.beforeMinuteAngle,
        interaction?.beforeHourAngle,
        interaction?.afterMinuteAngle,
        interaction?.afterHourAngle
      ].every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      ) ||
      interaction?.endHour !== expectedEndHour ||
      interaction?.startMinute +
        interaction?.elapsedMinutes !==
        60 + interaction?.endMinute ||
      circularResidual(
        interaction?.beforeMinuteAngle,
        interaction?.startMinute * 6
      ) > 1 ||
      circularResidual(
        interaction?.beforeHourAngle,
        expectedStartHourAngle
      ) > 0.6 ||
      circularResidual(
        interaction?.afterMinuteAngle,
        interaction?.endMinute * 6
      ) > 1 ||
      circularResidual(
        interaction?.afterHourAngle,
        expectedEndHourAngle
      ) > 0.6 ||
      interaction?.beforeMinuteResidual > 1 ||
      interaction?.beforeHourResidual > 0.6 ||
      interaction?.minuteAngleResidual > 1 ||
      interaction?.handAngleResidual > 0.6 ||
      typeof interaction?.clockRenderedSizeResidual !== "number" ||
      !Number.isFinite(interaction.clockRenderedSizeResidual) ||
      interaction.clockRenderedSizeResidual > 4 ||
      typeof interaction?.afterInteractionMinimumGap !== "number" ||
      !Number.isFinite(interaction.afterInteractionMinimumGap) ||
      interaction.afterInteractionMinimumGap < 3 ||
      interaction?.occlusionCount !== 0 ||
      typeof interaction?.referenceVisibleAreaRatio !== "number" ||
      !Number.isFinite(interaction.referenceVisibleAreaRatio) ||
      interaction.referenceVisibleAreaRatio < 0.99
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "fraction.subtract.unlike-denominators.common-unit-v1"
  ) {
    const interaction = evidence.interactionShape;
    const expectedLeftCells =
      interaction?.leftNumerator *
      (interaction?.commonDenominator /
        interaction?.leftDenominator);
    const expectedRightCells =
      interaction?.rightNumerator *
      (interaction?.commonDenominator /
        interaction?.rightDenominator);
    const expectedLeftWidth =
      (interaction?.laneWidth *
        interaction?.leftNumerator) /
      interaction?.leftDenominator;
    const expectedRightWidth =
      (interaction?.laneWidth *
        interaction?.rightNumerator) /
      interaction?.rightDenominator;
    const expectedUncoveredWidth =
      (interaction?.laneWidth *
        interaction?.differenceCells) /
      interaction?.commonDenominator;
    if (
      evidence.probeId !==
        "wave11-common-unit-difference-release-canary-v1" ||
      evidence.categoryUnit !== "Unit01" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "NO03FM" ||
      shape?.fractionStripCount !== itemCount * 2 ||
      shape?.visibleFractionStripCount !== itemCount * 2 ||
      shape?.unitRulerCount !== itemCount ||
      shape?.candidateTextCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.joinLaneCount !== itemCount ||
      persisted?.fractionStripCount !== itemCount * 3 ||
      persisted?.configuredFractionMatchCount !== itemCount * 3 ||
      persisted?.leftStripCount !== itemCount ||
      persisted?.rightStripCount !== itemCount ||
      persisted?.unitRulerCount !== itemCount ||
      persisted?.unitRulerDividerMatchCount !== itemCount ||
      persisted?.candidateFormulaCount !== itemCount * 5 ||
      persisted?.fractionModuleActive !== true ||
      interaction?.action !==
        "cover-minuend-with-subtrahend-from-right" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      ![
        interaction?.leftDenominator,
        interaction?.rightDenominator,
        interaction?.commonDenominator,
        interaction?.leftNumerator,
        interaction?.rightNumerator,
        interaction?.leftCells,
        interaction?.rightCells,
        interaction?.differenceCells
      ].every(
        (value) =>
          Number.isInteger(value) && value > 0
      ) ||
      gcd(
        interaction?.leftNumerator,
        interaction?.leftDenominator
      ) !== 1 ||
      gcd(
        interaction?.rightNumerator,
        interaction?.rightDenominator
      ) !== 1 ||
      interaction?.commonDenominator !==
        lcm(
          interaction?.leftDenominator,
          interaction?.rightDenominator
        ) ||
      interaction?.commonDenominator <=
        Math.max(
          interaction?.leftDenominator,
          interaction?.rightDenominator
        ) ||
      interaction?.leftCells !== expectedLeftCells ||
      interaction?.rightCells !== expectedRightCells ||
      interaction?.differenceCells !==
        interaction?.leftCells - interaction?.rightCells ||
      interaction?.differenceCells >=
        interaction?.commonDenominator ||
      gcd(
        interaction?.differenceCells,
        interaction?.commonDenominator
      ) !== 1 ||
      interaction?.withinOneWhole !== true ||
      ![
        interaction?.laneWidth,
        interaction?.wholeWidth,
        interaction?.unitRulerWidth,
        interaction?.commonUnitCellWidth,
        interaction?.leftStripWidth,
        interaction?.rightStripWidth,
        interaction?.uncoveredWidth,
        interaction?.uncoveredWidthResidual,
        interaction?.coveredWidthResidual,
        interaction?.rulerStartResidual,
        interaction?.rulerWidthResidual,
        interaction?.cellBoundaryResidual,
        interaction?.startResidual,
        interaction?.rightEdgeResidual,
        interaction?.verticalRowResidual,
        interaction?.verticalContainmentResidual
      ].every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      ) ||
      Math.abs(
        interaction?.wholeWidth - interaction?.laneWidth
      ) > 3 ||
      Math.abs(
        interaction?.unitRulerWidth -
          interaction?.laneWidth
      ) > 3 ||
      Math.abs(
        interaction?.commonUnitCellWidth -
          interaction?.unitRulerWidth /
            interaction?.commonDenominator
      ) > 1 ||
      Math.abs(
        interaction?.leftStripWidth - expectedLeftWidth
      ) > 3 ||
      Math.abs(
        interaction?.rightStripWidth - expectedRightWidth
      ) > 3 ||
      Math.abs(
        interaction?.uncoveredWidth -
          expectedUncoveredWidth
      ) > 5 ||
      interaction?.uncoveredWidthResidual > 5 ||
      interaction?.coveredWidthResidual > 5 ||
      interaction?.rulerStartResidual > 3 ||
      interaction?.rulerWidthResidual > 3 ||
      interaction?.cellBoundaryResidual > 5 ||
      interaction?.startResidual > 5 ||
      interaction?.rightEdgeResidual > 5 ||
      interaction?.verticalRowResidual > 5 ||
      interaction?.verticalContainmentResidual > 5
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "fraction.add.unlike-denominators.common-unit-v1"
  ) {
    const interaction = evidence.interactionShape;
    const expectedLeftCells =
      interaction?.leftNumerator *
      (interaction?.commonDenominator /
        interaction?.leftDenominator);
    const expectedRightCells =
      interaction?.rightNumerator *
      (interaction?.commonDenominator /
        interaction?.rightDenominator);
    const expectedLeftWidth =
      (interaction?.laneWidth *
        interaction?.leftNumerator) /
      interaction?.leftDenominator;
    const expectedRightWidth =
      (interaction?.laneWidth *
        interaction?.rightNumerator) /
      interaction?.rightDenominator;
    const expectedJoinedWidth =
      (interaction?.laneWidth *
        interaction?.sumCells) /
      interaction?.commonDenominator;
    if (
      evidence.probeId !==
        "wave10-common-unit-release-canary-v2" ||
      evidence.categoryUnit !== "Unit01" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "NO03FM" ||
      shape?.fractionStripCount !== itemCount * 2 ||
      shape?.visibleFractionStripCount !== itemCount * 2 ||
      shape?.unitRulerCount !== itemCount ||
      shape?.candidateTextCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.joinLaneCount !== itemCount ||
      persisted?.fractionStripCount !== itemCount * 3 ||
      persisted?.configuredFractionMatchCount !== itemCount * 3 ||
      persisted?.leftStripCount !== itemCount ||
      persisted?.rightStripCount !== itemCount ||
      persisted?.unitRulerCount !== itemCount ||
      persisted?.unitRulerDividerMatchCount !== itemCount ||
      persisted?.candidateFormulaCount !== itemCount * 5 ||
      persisted?.fractionModuleActive !== true ||
      interaction?.action !==
        "drag-two-fraction-strips-end-to-end" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      ![
        interaction?.leftDenominator,
        interaction?.rightDenominator,
        interaction?.commonDenominator,
        interaction?.leftNumerator,
        interaction?.rightNumerator,
        interaction?.leftCells,
        interaction?.rightCells,
        interaction?.sumCells
      ].every(
        (value) =>
          Number.isInteger(value) && value > 0
      ) ||
      interaction?.commonDenominator !==
        lcm(
          interaction?.leftDenominator,
          interaction?.rightDenominator
        ) ||
      interaction?.commonDenominator <=
        Math.max(
          interaction?.leftDenominator,
          interaction?.rightDenominator
        ) ||
      interaction?.leftCells !== expectedLeftCells ||
      interaction?.rightCells !== expectedRightCells ||
      interaction?.sumCells !==
        interaction?.leftCells + interaction?.rightCells ||
      interaction?.sumCells >=
        interaction?.commonDenominator ||
      interaction?.withinOneWhole !== true ||
      ![
        interaction?.laneWidth,
        interaction?.wholeWidth,
        interaction?.unitRulerWidth,
        interaction?.commonUnitCellWidth,
        interaction?.leftStripWidth,
        interaction?.rightStripWidth,
        interaction?.joinedWidth,
        interaction?.joinedWidthResidual,
        interaction?.rulerStartResidual,
        interaction?.rulerWidthResidual,
        interaction?.cellBoundaryResidual,
        interaction?.startResidual,
        interaction?.joinResidual,
        interaction?.verticalRowResidual,
        interaction?.verticalContainmentResidual
      ].every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      ) ||
      Math.abs(
        interaction?.wholeWidth - interaction?.laneWidth
      ) > 3 ||
      Math.abs(
        interaction?.unitRulerWidth -
          interaction?.laneWidth
      ) > 3 ||
      Math.abs(
        interaction?.commonUnitCellWidth -
          interaction?.unitRulerWidth /
            interaction?.commonDenominator
      ) > 1 ||
      Math.abs(
        interaction?.leftStripWidth - expectedLeftWidth
      ) > 3 ||
      Math.abs(
        interaction?.rightStripWidth - expectedRightWidth
      ) > 3 ||
      Math.abs(
        interaction?.joinedWidth - expectedJoinedWidth
      ) > 5 ||
      interaction?.joinedWidthResidual > 5 ||
      interaction?.rulerStartResidual > 3 ||
      interaction?.rulerWidthResidual > 3 ||
      interaction?.cellBoundaryResidual > 5 ||
      interaction?.startResidual > 5 ||
      interaction?.joinResidual > 5 ||
      interaction?.verticalRowResidual > 5 ||
      interaction?.verticalContainmentResidual > 5
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "fraction.add.same-denominator.improper-sum-v1"
  ) {
    const interaction = evidence.interactionShape;
    const expectedLeftWidth =
      (interaction?.wholeWidth *
        interaction?.leftNumerator) /
      interaction?.denominator;
    const expectedRightWidth =
      (interaction?.wholeWidth *
        interaction?.rightNumerator) /
      interaction?.denominator;
    const expectedJoinedWidth =
      (interaction?.wholeWidth *
        interaction?.sumNumerator) /
      interaction?.denominator;
    const expectedOverflowWidth =
      (interaction?.wholeWidth *
        interaction?.overflowNumerator) /
      interaction?.denominator;
    if (
      evidence.probeId !==
        "wave9-improper-sum-release-canary-v3" ||
      evidence.categoryUnit !== "Unit01" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "NO03FM" ||
      shape?.fractionStripCount !== itemCount * 2 ||
      shape?.visibleFractionStripCount !== itemCount * 2 ||
      shape?.candidateTextCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.joinLaneCount !== itemCount ||
      shape?.oneWholeBoundaryCount !== itemCount ||
      persisted?.fractionStripCount !== itemCount * 2 ||
      persisted?.configuredFractionMatchCount !== itemCount * 2 ||
      persisted?.leftStripCount !== itemCount ||
      persisted?.rightStripCount !== itemCount ||
      persisted?.oneWholeBoundaryCount !== itemCount ||
      persisted?.candidateFormulaCount !== itemCount * 5 ||
      persisted?.fractionModuleActive !== true ||
      interaction?.action !==
        "drag-two-fraction-strips-end-to-end" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      ![
        interaction?.denominator,
        interaction?.leftNumerator,
        interaction?.rightNumerator,
        interaction?.sumNumerator,
        interaction?.overflowNumerator
      ].every(
        (value) =>
          Number.isInteger(value) && value > 0
      ) ||
      interaction?.leftNumerator +
        interaction?.rightNumerator !==
        interaction?.sumNumerator ||
      interaction?.sumNumerator <=
        interaction?.denominator ||
      interaction?.sumNumerator >=
        interaction?.denominator * 2 ||
      interaction?.overflowNumerator !==
        interaction?.sumNumerator -
          interaction?.denominator ||
      interaction?.crossedOneWhole !== true ||
      ![
        interaction?.laneWidth,
        interaction?.wholeWidth,
        interaction?.leftStripWidth,
        interaction?.rightStripWidth,
        interaction?.joinedWidth,
        interaction?.joinedWidthResidual,
        interaction?.overflowWidth,
        interaction?.overflowWidthResidual,
        interaction?.boundaryOffsetResidual,
        interaction?.startResidual,
        interaction?.joinResidual,
        interaction?.verticalRowResidual,
        interaction?.verticalContainmentResidual
      ].every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      ) ||
      Math.abs(
        interaction?.laneWidth -
          interaction?.wholeWidth * 2
      ) > 3 ||
      Math.abs(
        interaction?.leftStripWidth - expectedLeftWidth
      ) > 3 ||
      Math.abs(
        interaction?.rightStripWidth - expectedRightWidth
      ) > 3 ||
      Math.abs(
        interaction?.joinedWidth - expectedJoinedWidth
      ) > 5 ||
      Math.abs(
        interaction?.overflowWidth - expectedOverflowWidth
      ) > 5 ||
      interaction?.joinedWidthResidual > 5 ||
      interaction?.overflowWidthResidual > 5 ||
      interaction?.boundaryOffsetResidual > 3 ||
      interaction?.startResidual > 5 ||
      interaction?.joinResidual > 5 ||
      interaction?.verticalRowResidual > 5 ||
      interaction?.verticalContainmentResidual > 5
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "fraction.add.same-denominator.strips-v1"
  ) {
    const interaction = evidence.interactionShape;
    const expectedLeftWidth =
      (interaction?.laneWidth *
        interaction?.leftNumerator) /
      interaction?.denominator;
    const expectedRightWidth =
      (interaction?.laneWidth *
        interaction?.rightNumerator) /
      interaction?.denominator;
    const expectedJoinedWidth =
      (interaction?.laneWidth *
        interaction?.sumNumerator) /
      interaction?.denominator;
    if (
      evidence.probeId !==
        "wave8-fraction-sum-release-canary-v4" ||
      evidence.categoryUnit !== "Unit01" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "NO03FM" ||
      shape?.fractionStripCount !== itemCount * 2 ||
      shape?.visibleFractionStripCount !== itemCount * 2 ||
      shape?.candidateTextCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.joinLaneCount !== itemCount ||
      persisted?.fractionStripCount !== itemCount * 2 ||
      persisted?.configuredFractionMatchCount !== itemCount * 2 ||
      persisted?.leftStripCount !== itemCount ||
      persisted?.rightStripCount !== itemCount ||
      persisted?.candidateFormulaCount !== itemCount * 5 ||
      persisted?.fractionModuleActive !== true ||
      interaction?.action !==
        "drag-two-fraction-strips-end-to-end" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      ![
        interaction?.denominator,
        interaction?.leftNumerator,
        interaction?.rightNumerator,
        interaction?.sumNumerator
      ].every(
        (value) =>
          Number.isInteger(value) && value > 0
      ) ||
      interaction?.leftNumerator +
        interaction?.rightNumerator !==
        interaction?.sumNumerator ||
      interaction?.sumNumerator >=
        interaction?.denominator ||
      ![
        interaction?.laneWidth,
        interaction?.leftStripWidth,
        interaction?.rightStripWidth,
        interaction?.joinedWidth,
        interaction?.joinedWidthResidual,
        interaction?.startResidual,
        interaction?.joinResidual,
        interaction?.endpointResidual,
        interaction?.verticalRowResidual,
        interaction?.verticalContainmentResidual
      ].every(
        (value) =>
          typeof value === "number" &&
          Number.isFinite(value)
      ) ||
      Math.abs(
        interaction?.leftStripWidth - expectedLeftWidth
      ) > 3 ||
      Math.abs(
        interaction?.rightStripWidth - expectedRightWidth
      ) > 3 ||
      Math.abs(
        interaction?.joinedWidth - expectedJoinedWidth
      ) > 5 ||
      interaction?.joinedWidthResidual > 5 ||
      interaction?.startResidual > 5 ||
      interaction?.joinResidual > 5 ||
      interaction?.endpointResidual > 7 ||
      interaction?.verticalRowResidual > 5 ||
      interaction?.verticalContainmentResidual > 5
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "relation.equal-sign.balance-scale.sum-card-v1"
  ) {
    if (
      evidence.probeId !==
        "wave5-balance-scale-release-canary-v3" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 2 ||
      !evidence.releasedTools.includes("CR07BS") ||
      !evidence.releasedTools.includes("NO04NT") ||
      shape?.scaleCount !== itemCount ||
      shape?.visibleScaleCount !== itemCount ||
      shape?.fixedCardCount !== itemCount * 2 ||
      shape?.candidateCardCount !== itemCount * 5 ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.leftTiltCount !== itemCount ||
      persisted?.scaleCount !== itemCount ||
      persisted?.fixedPlateMemberCount !== itemCount * 2 ||
      persisted?.candidateCardCount !== itemCount * 5 ||
      persisted?.candidateWithPlateCount !== 0 ||
      persisted?.tiltedScaleCount !== itemCount ||
      persisted?.disabledEquilibriumScaleCount !== itemCount ||
      persisted?.balanceModuleActive !== true ||
      persisted?.numberCardModuleActive !== true ||
      evidence.interactionShape?.wrongLine !==
        "M143,-35 L143,37 L575,87 L575,15" ||
      evidence.interactionShape?.correctLine !==
        "M143,-10 L143,62 L575,62 L575,-10" ||
      evidence.interactionShape?.wrongButtonDisabled !== true ||
      evidence.interactionShape?.correctButtonDisabled !== true ||
      evidence.interactionShape?.wrongCardOnRightPan !== true ||
      evidence.interactionShape?.correctCardOnRightPan !== true
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  if (
    evidence.blueprintId ===
    "number.place-value.regroup-ten-bundles-v1"
  ) {
    const interaction = evidence.interactionShape;
    if (
      evidence.probeId !==
        "wave14-place-value-release-canary-v1" ||
      evidence.blueprintVersion !== "1.1.0" ||
      evidence.categoryUnit !== "Unit01" ||
      !Array.isArray(evidence.releasedTools) ||
      evidence.releasedTools.length !== 1 ||
      evidence.releasedTools[0] !== "NO04PD" ||
      itemCount < 2 ||
      itemCount > 3 ||
      shape?.placeValueModelCount !== itemCount * 10 ||
      shape?.exchangeTenCount !== itemCount * 10 ||
      shape?.visibleExchangeTenCount !== itemCount * 10 ||
      shape?.exchangeBoxCount !== itemCount ||
      shape?.exchangeSlotCount !== itemCount * 10 ||
      shape?.hundredGridRowCount !== itemCount * 10 ||
      shape?.hundredGridRelationCount !== itemCount ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      shape?.candidateTextCount !== itemCount * 5 ||
      persisted?.placeValueModelCount !== itemCount * 10 ||
      persisted?.exchangeTenCount !== itemCount * 10 ||
      persisted?.configuredExchangeTenCount !== itemCount * 10 ||
      persisted?.unlockedExchangeTenCount !== itemCount * 10 ||
      persisted?.exchangeSlotCount !== itemCount * 10 ||
      persisted?.hundredGridRowCount !== itemCount * 10 ||
      persisted?.hundredGridRelationCount !== itemCount ||
      persisted?.candidateFormulaCount !== itemCount * 5 ||
      persisted?.placeValueModuleActive !== true ||
      interaction?.action !==
        "place-ten-tens-in-distinct-slots-and-revise" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      interaction?.exchangeTenCount !== 10 ||
      interaction?.movedTenCount !== 10 ||
      interaction?.tenValueTotal !== 100 ||
      interaction?.hundredGridValue !== 100 ||
      interaction?.targetSlotCount !== 10 ||
      interaction?.distinctSlotCoverageCount !== 10 ||
      interaction?.allTenBoundsInsideExchangeBox !== true ||
      interaction?.occlusionCount !== 0 ||
      interaction?.referenceGridRowCount !== 10 ||
      interaction?.representedGridCellCount !== 100 ||
      interaction?.relationVisible !== true ||
      typeof interaction?.afterInteractionMinimumGap !== "number" ||
      !Number.isFinite(interaction.afterInteractionMinimumGap) ||
      interaction.afterInteractionMinimumGap < 3 ||
      typeof interaction?.referenceVisibleAreaRatio !== "number" ||
      !Number.isFinite(interaction.referenceVisibleAreaRatio) ||
      interaction.referenceVisibleAreaRatio < 0.99 ||
      typeof interaction?.minimumMoveDistance !== "number" ||
      !Number.isFinite(interaction.minimumMoveDistance) ||
      interaction.minimumMoveDistance < 20 ||
      !/^position-card-\d+$/.test(
        interaction?.incorrectCandidateRole ?? ""
      ) ||
      !/^position-card-\d+$/.test(
        interaction?.correctCandidateRole ?? ""
      ) ||
      interaction?.choiceChanged !== true
    ) {
      throw new Error(
        "activity-release-canary-evidence-shape-invalid"
      );
    }
    return evidence;
  }

  const wave16And17Contracts = {
    "pattern.repeat-unit.pattern-blocks-v1": {
      probeId: "wave16-pattern-release-canary-v1",
      categoryUnit: "Unit02",
      action: "choose-repeat-unit-and-extend-pattern",
      releasedTools: ["SM02PB"],
      persisted: (value) =>
        value?.patternBlockCount === itemCount * 11 &&
        value?.patternModuleActive === true
    },
    "number.multiplication.group-array-meaning-v1": {
      probeId: "wave17-multiplication-release-canary-v1",
      categoryUnit: "Unit01",
      action: "choose-expression-and-check-grouped-array",
      releasedTools: [],
      persisted: (value) => value?.arrayTextCount === itemCount
    },
    "probability.compare.bag-ratios-v1": {
      probeId: "wave17-probability-release-canary-v1",
      categoryUnit: "Unit04",
      action: "choose-relation-and-align-probability-strips",
      releasedTools: ["NO03FM"],
      requiresCommonStart: true,
      persisted: (value) =>
        value?.fractionStripCount === itemCount * 2 &&
        value?.fractionModuleActive === true
    }
  };
  const wave18ClaimEvidenceContracts = {
    "number.division.quotient-remainder.claim-evidence-v1": {
      probeId: "wave18-division-remainder-release-canary-v1",
      categoryUnit: "Unit01"
    },
    "measure.angle.turn-size.claim-evidence-v1": {
      probeId: "wave18-angle-turn-release-canary-v1",
      categoryUnit: "Unit03"
    },
    "number.mixed-calculation.order.claim-evidence-v1": {
      probeId: "wave18-mixed-calculation-order-release-canary-v1",
      categoryUnit: "Unit01",
      problemCount: 1,
      candidateCount: 4
    },
    "relation.ratio.same-unit.claim-evidence-v1": {
      probeId: "wave18-ratio-same-unit-release-canary-v1",
      categoryUnit: "Unit02"
    },
    "data.picture-graph.key.claim-evidence-v1": {
      probeId: "wave18-picture-graph-key-release-canary-v1",
      categoryUnit: "Unit04"
    },
    "geometry.triangle.classification.claim-evidence-v1": {
      probeId: "wave18-triangle-classification-release-canary-v1",
      categoryUnit: "Unit03"
    },
    "geometry.symmetry.equal-distance.claim-evidence-v1": {
      probeId: "wave18-line-symmetry-distance-release-canary-v1",
      categoryUnit: "Unit03"
    },
    "data.graph.purpose.claim-evidence-v1": {
      probeId: "wave18-graph-purpose-release-canary-v1",
      categoryUnit: "Unit04"
    }
  };
  const wave18ClaimEvidence =
    wave18ClaimEvidenceContracts[evidence.blueprintId];
  if (wave18ClaimEvidence) {
    const interaction = evidence.interactionShape;
    if (
      evidence.probeId !== wave18ClaimEvidence.probeId ||
      evidence.categoryUnit !== wave18ClaimEvidence.categoryUnit ||
      itemCount !== (wave18ClaimEvidence.problemCount ?? 2) ||
      JSON.stringify(evidence.releasedTools) !== "[]" ||
      persisted?.arrayTextCount !== itemCount ||
      persisted?.candidateCount !==
        itemCount * (wave18ClaimEvidence.candidateCount ?? 5) ||
      shape?.sourceRoleCount !== itemCount ||
      shape?.targetRoleCount !== itemCount ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      interaction?.action !== "choose-claim-and-check-evidence" ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      interaction?.movedRoleCount !== 1 ||
      typeof interaction?.moveDistance !== "number" ||
      !Number.isFinite(interaction.moveDistance) ||
      interaction.moveDistance < 20 ||
      interaction?.allMovedInsideTargets !== true ||
      typeof interaction?.maximumTargetOverflowPx !== "number" ||
      !Number.isFinite(interaction.maximumTargetOverflowPx) ||
      interaction.maximumTargetOverflowPx > 5 ||
      interaction?.movedPairOverlapCount !== 0 ||
      interaction?.minimumMovedGap !== null ||
      interaction?.commonStartResidualPx !== null
    ) {
      throw new Error("activity-release-canary-evidence-shape-invalid");
    }
    return evidence;
  }
  const wave16And17 = wave16And17Contracts[evidence.blueprintId];
  if (wave16And17) {
    const interaction = evidence.interactionShape;
    if (
      evidence.probeId !== wave16And17.probeId ||
      evidence.categoryUnit !== wave16And17.categoryUnit ||
      itemCount !== 2 ||
      JSON.stringify(evidence.releasedTools) !==
        JSON.stringify(wave16And17.releasedTools) ||
      !wave16And17.persisted(persisted) ||
      shape?.sourceRoleCount !== itemCount ||
      shape?.targetRoleCount !== itemCount ||
      shape?.predictionBoxCount !== itemCount ||
      shape?.explanationBoxCount !== itemCount ||
      interaction?.action !== wave16And17.action ||
      interaction?.transientOnly !== true ||
      interaction?.existingProjectWriteCount !== 0 ||
      typeof interaction?.moveDistance !== "number" ||
      !Number.isFinite(interaction.moveDistance) ||
      interaction.moveDistance < 20 ||
      interaction?.allMovedInsideTargets !== true ||
      typeof interaction?.maximumTargetOverflowPx !== "number" ||
      !Number.isFinite(interaction.maximumTargetOverflowPx) ||
      interaction.maximumTargetOverflowPx > 5 ||
      interaction?.movedPairOverlapCount !== 0 ||
      (interaction.movedRoleCount > 1 &&
        (typeof interaction?.minimumMovedGap !== "number" ||
          !Number.isFinite(interaction.minimumMovedGap) ||
          interaction.minimumMovedGap < 3)) ||
      (interaction.movedRoleCount === 1 &&
        interaction?.minimumMovedGap !== null) ||
      (wave16And17.requiresCommonStart === true &&
        (typeof interaction?.commonStartResidualPx !== "number" ||
          !Number.isFinite(interaction.commonStartResidualPx) ||
          interaction.commonStartResidualPx > 5)) ||
      (wave16And17.requiresCommonStart !== true &&
        interaction?.commonStartResidualPx !== null)
    ) {
      throw new Error("activity-release-canary-evidence-shape-invalid");
    }
    return evidence;
  }

  throw new Error(
    "activity-release-canary-evidence-shape-invalid"
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  try {
    const options = parseArguments(process.argv.slice(2), {
      input: {
        type: "string",
        default: join(
          defaultResearchRoot,
          "wave5-equality-release-canary.json"
        )
      },
      "research-root": {
        type: "string",
        default: defaultResearchRoot
      }
    });
    const inputPath = assertPathInside(
      options.input,
      options["research-root"],
      "activity release canary"
    );
    const evidence = validateActivityReleaseCanaryEvidence(
      JSON.parse(readFileSync(inputPath, "utf8"))
    );
    process.stdout.write(
      `PASS activity release canary ${evidence.blueprintId}\n`
    );
  } catch (error) {
    failCli(error);
  }
}
