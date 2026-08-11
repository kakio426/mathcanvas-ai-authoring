import type {
  AssessmentTarget,
  AssessmentTargetSet
} from "@mathcanvas/contracts";
import { LEARNING_MAP_COMMIT } from "./data.js";
import { findOfficialElementaryStandard } from "./official-elementary-standards.js";
import {
  CLASSIFICATION_ASSESSMENT_TARGET_IDS,
  classificationAssessmentTargetSet,
  classificationAssessmentTargets
} from "./assessment-targets/classification-2su04-01.js";
import {
  REPEATING_PATTERN_ASSESSMENT_TARGET_IDS,
  repeatingPatternAssessmentTargetSet,
  repeatingPatternAssessmentTargets
} from "./assessment-targets/repeating-pattern-2su02-01.js";
import {
  DATA_TABLE_ASSESSMENT_TARGET_IDS,
  dataTableAssessmentTargetSet,
  dataTableAssessmentTargets
} from "./assessment-targets/data-table-2su04-02.js";

export {
  CLASSIFICATION_ASSESSMENT_TARGET_IDS,
  REPEATING_PATTERN_ASSESSMENT_TARGET_IDS,
  DATA_TABLE_ASSESSMENT_TARGET_IDS
};

const rawTargets: readonly AssessmentTarget[] = [
  ...classificationAssessmentTargets,
  ...repeatingPatternAssessmentTargets,
  ...dataTableAssessmentTargets
];
const rawSets: readonly AssessmentTargetSet[] = [
  classificationAssessmentTargetSet,
  repeatingPatternAssessmentTargetSet,
  dataTableAssessmentTargetSet
];

function assertRegistryIntegrity(): void {
  const targetIds = rawTargets.map((target) => target.targetId);
  if (new Set(targetIds).size !== targetIds.length) {
    throw new Error("assessment-target-duplicate");
  }
  const setCodes = rawSets.map((set) => set.standardCode);
  if (new Set(setCodes).size !== setCodes.length) {
    throw new Error("assessment-target-set-duplicate");
  }
  const setByStandard = new Map(
    rawSets.map((set) => [set.standardCode, set])
  );
  for (const target of rawTargets) {
    if (!findOfficialElementaryStandard(target.standardCode)) {
      throw new Error(
        `assessment-target-standard-unknown:${target.standardCode}`
      );
    }
    if (target.learningMap.commit !== LEARNING_MAP_COMMIT) {
      throw new Error(
        `assessment-target-learning-map-commit-mismatch:${target.targetId}`
      );
    }
    if (
      target.reviewStatus !== "reviewed" ||
      !setByStandard
        .get(target.standardCode)
        ?.targetIds.includes(target.targetId)
    ) {
      throw new Error(
        `assessment-target-orphan-or-unreviewed:${target.targetId}`
      );
    }
  }
  for (const set of rawSets) {
    if (!findOfficialElementaryStandard(set.standardCode)) {
      throw new Error(`assessment-target-standard-unknown:${set.standardCode}`);
    }
    const targets = rawTargets.filter(
      (target) => target.standardCode === set.standardCode
    );
    const actual = [...targets.map((target) => target.targetId)].sort();
    const declared = [...set.targetIds].sort();
    if (JSON.stringify(actual) !== JSON.stringify(declared)) {
      throw new Error(`assessment-target-set-incomplete:${set.standardCode}`);
    }
  }
}

assertRegistryIntegrity();

export const assessmentTargets: readonly AssessmentTarget[] = rawTargets;
export const assessmentTargetSets: readonly AssessmentTargetSet[] = rawSets;

export function findAssessmentTarget(
  targetId: string
): AssessmentTarget | undefined {
  return assessmentTargets.find((target) => target.targetId === targetId);
}

export function findAssessmentTargetSet(
  standardCode: string
): AssessmentTargetSet | undefined {
  return assessmentTargetSets.find((set) => set.standardCode === standardCode);
}
