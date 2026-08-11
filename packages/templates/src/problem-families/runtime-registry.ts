import { enumerateVariationEnvelope } from "@mathcanvas/contracts";
import type { ProblemFamilyNativeModule } from "./types.js";
import type { ProblemFamilyRuntimeBinding } from "./runtime-types.js";

function assertNativeModuleConsistent(module: ProblemFamilyNativeModule): void {
  const { source, runtime, cognitiveManifest, variationEnvelope } = module;
  if (
    runtime.familyId !== source.familyId ||
    runtime.blueprint.id !== source.familyId ||
    source.activityId !== source.familyId ||
    source.templateId !== source.familyId
  ) {
    throw new Error(`problem-family-native-id-mismatch:${source.familyId}`);
  }
  if (
    runtime.blueprint.generator.id !== source.generator.id ||
    runtime.blueprint.generator.version !== source.generator.version
  ) {
    throw new Error(
      `problem-family-native-generator-mismatch:${source.familyId}`
    );
  }
  if (runtime.blueprint.contentHash !== source.blueprint.contentHash) {
    throw new Error(`problem-family-native-hash-mismatch:${source.familyId}`);
  }
  if (
    runtime.blueprint.curriculumBinding.standardCode !== source.standardCode ||
    runtime.blueprint.curriculumBinding.domain !== source.domain ||
    runtime.blueprint.learningObjective !== source.learningGoal
  ) {
    throw new Error(
      `problem-family-native-curriculum-mismatch:${source.familyId}`
    );
  }
  if (runtime.supportState !== source.supportState) {
    throw new Error(
      `problem-family-native-support-mismatch:${source.familyId}`
    );
  }
  if ((source.assessmentTargetIds?.length ?? 0) < 1) {
    throw new Error(
      `problem-family-native-assessment-target-missing:${source.familyId}`
    );
  }
  if (
    cognitiveManifest.blueprintId !== source.familyId ||
    cognitiveManifest.blueprintVersion !== runtime.blueprint.version ||
    cognitiveManifest.blueprintContentHash !== runtime.blueprint.contentHash
  ) {
    throw new Error(
      `problem-family-native-cognitive-manifest-mismatch:${source.familyId}`
    );
  }
  if (variationEnvelope.blueprintId !== source.familyId) {
    throw new Error(
      `problem-family-native-variation-envelope-mismatch:${source.familyId}`
    );
  }
  for (const variation of enumerateVariationEnvelope(variationEnvelope)) {
    if (
      !source.availableProblemCounts.includes(
        variation.problemCount as number
      ) ||
      !source.supportedDifficulties.includes(
        variation.difficulty as "easy" | "normal" | "hard"
      )
    ) {
      throw new Error(
        `problem-family-native-variation-capability-mismatch:${source.familyId}`
      );
    }
  }
  if (
    module.capability !== undefined &&
    module.capability.familyId !== source.familyId
  ) {
    throw new Error(
      `problem-family-native-capability-mismatch:${source.familyId}`
    );
  }
  if (
    module.capability?.defaultParameters !== undefined &&
    runtime.appliedProblemParameters === undefined
  ) {
    throw new Error(
      `problem-family-native-parameter-projector-missing:${source.familyId}`
    );
  }
}

/**
 * 기존 29개 runtime binding과 영역 index의 native 모듈을 합친다. 중앙 registry는
 * 영역 index만 import하므로 신규 family ID나 generator ID를 알 필요가 없다.
 */
export function createProblemFamilyRuntimeRegistry(
  legacyBindings: readonly ProblemFamilyRuntimeBinding[],
  nativeModules: readonly ProblemFamilyNativeModule[]
): Readonly<Record<string, ProblemFamilyRuntimeBinding>> {
  const entries: Array<readonly [string, ProblemFamilyRuntimeBinding]> = [];
  for (const binding of legacyBindings) {
    if (binding.familyId !== binding.blueprint.id) {
      throw new Error(
        `problem-family-legacy-runtime-id-mismatch:${binding.familyId}`
      );
    }
    entries.push([binding.familyId, binding]);
  }
  for (const module of nativeModules) {
    assertNativeModuleConsistent(module);
    entries.push([module.source.familyId, module.runtime]);
  }
  const ids = entries.map(([familyId]) => familyId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("problem-family-runtime-duplicate");
  }
  return Object.freeze(Object.fromEntries(entries));
}
