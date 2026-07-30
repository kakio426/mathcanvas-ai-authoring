import {
  CONTRACT_SCHEMA_VERSION,
  validationReportSchema,
  type CompiledProject,
  type ResolvedActivity,
  type ValidationIssue,
  type ValidationReport
} from "@mathcanvas/contracts";
import { validateNativeSafety } from "./layers/native-safety.js";
import { validateReferencesAndLayout } from "./layers/reference.js";
import { validateSemantics } from "./layers/semantic.js";
import { validateStructure } from "./layers/structure.js";

export function validateForCreation(
  resolvedInput: ResolvedActivity,
  compiledInput: CompiledProject,
  checkedAt = new Date()
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const parsed = validateStructure(
    resolvedInput,
    compiledInput,
    issues
  );
  if (parsed.resolved && parsed.compiled) {
    validateReferencesAndLayout(
      parsed.resolved,
      parsed.compiled,
      issues
    );
    validateSemantics(parsed.resolved, issues);
    validateNativeSafety(parsed.resolved, parsed.compiled, issues);
  }
  return validationReportSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    activitySpecId: resolvedInput.id,
    compiledPayloadHash: compiledInput.payloadHash,
    checkedAt: checkedAt.toISOString(),
    issues,
    canCreate: !issues.some((entry) => entry.severity === "error")
  });
}
