import type {
  ProblemFamilyCapabilityExtension,
  ProblemFamilyNativeModule
} from "../../types.js";
import { changeRuleConstructionProblemFamilyModule } from "./change-rule-construction.js";
import { declaredRepeatRepairProblemFamilyModule } from "./declared-repeat-repair.js";
import { repeatRuleConstructionProblemFamilyModule } from "./repeat-rule-construction.js";
import { repeatingPatternArrangementProblemFamilyModule } from "./repeating-pattern-arrangement.js";

export const CHANGE_RELATIONSHIPS_PROBLEM_FAMILY_CAPABILITIES:
  readonly ProblemFamilyCapabilityExtension[] = [];

export const CHANGE_RELATIONSHIPS_NATIVE_PROBLEM_FAMILY_MODULES:
  readonly ProblemFamilyNativeModule[] = [
    changeRuleConstructionProblemFamilyModule,
    declaredRepeatRepairProblemFamilyModule,
    repeatRuleConstructionProblemFamilyModule,
    repeatingPatternArrangementProblemFamilyModule
  ];
