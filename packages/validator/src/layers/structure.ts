import {
  assertNoSensitiveKeys,
  compiledProjectSchema,
  resolvedActivitySchema,
  sha256Hex,
  type CompiledProject,
  type ResolvedActivity,
  type ValidationIssue
} from "@mathcanvas/contracts";
import { compileActivity } from "@mathcanvas/compiler";
import { issue } from "./shared.js";

export function validateStructure(
  resolvedInput: ResolvedActivity,
  compiledInput: CompiledProject,
  issues: ValidationIssue[]
): {
  resolved?: ResolvedActivity;
  compiled?: CompiledProject;
} {
  const resolved = resolvedActivitySchema.safeParse(resolvedInput);
  const compiled = compiledProjectSchema.safeParse(compiledInput);
  if (!resolved.success) {
    resolved.error.issues.forEach((entry) =>
      issue(
        issues,
        "resolved-activity-invalid",
        "schema",
        entry.message,
        entry.path.join(".")
      )
    );
  }
  if (!compiled.success) {
    compiled.error.issues.forEach((entry) =>
      issue(
        issues,
        "compiled-project-invalid",
        "schema",
        entry.message,
        entry.path.join(".")
      )
    );
  }
  try {
    assertNoSensitiveKeys({
      resolved: resolvedInput,
      compiled: compiledInput
    });
  } catch (error) {
    issue(
      issues,
      "sensitive-data-detected",
      "security",
      error instanceof Error ? error.message : "민감 정보가 포함되었습니다."
    );
  }
  if (resolved.success && compiled.success) {
    const canonical = compileActivity(resolved.data);
    if (sha256Hex(compiled.data) !== sha256Hex(canonical)) {
      issue(
        issues,
        "compiled-project-not-canonical",
        "api-contract",
        "컴파일 결과가 선언된 활동의 정규 결과와 다릅니다."
      );
    }
  }
  return {
    ...(resolved.success ? { resolved: resolved.data } : {}),
    ...(compiled.success ? { compiled: compiled.data } : {})
  };
}
