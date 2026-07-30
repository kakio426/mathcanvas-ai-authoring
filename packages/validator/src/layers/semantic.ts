import type {
  ResolvedActivity,
  ValidationIssue
} from "@mathcanvas/contracts";
import { validateRegisteredPredicates } from "../predicates/registry.js";

export function validateSemantics(
  resolved: ResolvedActivity,
  issues: ValidationIssue[]
): void {
  validateRegisteredPredicates(resolved, issues);
}
