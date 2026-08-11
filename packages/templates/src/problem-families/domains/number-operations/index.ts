import { divisionGroupingProblemFamilyCapability } from "./division-grouping.js";
import { fractionComparisonProblemFamilyCapability } from "./fraction-comparison.js";
import { multiplicationArrayProblemFamilyCapability } from "./multiplication-array.js";
import type { ProblemFamilyNativeModule } from "../../types.js";

export const NUMBER_OPERATIONS_PROBLEM_FAMILY_CAPABILITIES = [
  multiplicationArrayProblemFamilyCapability,
  divisionGroupingProblemFamilyCapability,
  fractionComparisonProblemFamilyCapability
] as const;

export const NUMBER_OPERATIONS_NATIVE_PROBLEM_FAMILY_MODULES:
  readonly ProblemFamilyNativeModule[] = [];
