import type {
  ProblemFamilyCapabilityExtension,
  ProblemFamilyNativeModule
} from "../../types.js";
import { repeatingPatternArrangementProblemFamilyModule } from "./repeating-pattern-arrangement.js";

export const CHANGE_RELATIONSHIPS_PROBLEM_FAMILY_CAPABILITIES:
  readonly ProblemFamilyCapabilityExtension[] = [];

export const CHANGE_RELATIONSHIPS_NATIVE_PROBLEM_FAMILY_MODULES:
  readonly ProblemFamilyNativeModule[] = [
    repeatingPatternArrangementProblemFamilyModule
  ];
