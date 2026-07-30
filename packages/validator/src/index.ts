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

function fractionValueKey(numerator: number, denominator: number): string {
  let left = Math.abs(numerator);
  let right = Math.abs(denominator);
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  const divisor = left || 1;
  return `${numerator / divisor}/${denominator / divisor}`;
}

function report(
  issues: ValidationIssue[],
  canvasSpecId: string,
  payloadHash: string,
  checkedAt: Date
): ValidationReport {
  return validationReportSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    canvasSpecId,
    compiledPayloadHash: payloadHash,
    checkedAt: checkedAt.toISOString(),
    issues,
    canCreate: !issues.some((value) => value.severity === "error")
  });
}

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
