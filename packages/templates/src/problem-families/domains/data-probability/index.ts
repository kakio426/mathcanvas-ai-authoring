import type {
  ProblemFamilyCapabilityExtension,
  ProblemFamilyNativeModule
} from "../../types.js";
import { classificationGivenCriterionCountProblemFamilyModule } from "./classification-given-criterion-count.js";
import { dataTableOrganizeProblemFamilyModule } from "./data-table-organize.js";

export const DATA_PROBABILITY_PROBLEM_FAMILY_CAPABILITIES:
  readonly ProblemFamilyCapabilityExtension[] = [];

export const DATA_PROBABILITY_NATIVE_PROBLEM_FAMILY_MODULES:
  readonly ProblemFamilyNativeModule[] = [
    classificationGivenCriterionCountProblemFamilyModule,
    dataTableOrganizeProblemFamilyModule
  ];
