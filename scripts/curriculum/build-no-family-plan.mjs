import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  familyRevalidationArtifactIsCurrent,
  familyRevalidationSupersedes,
  rewindFamilyTrackForRetry,
  reviewCandidateIsCurrent,
  replanTriggerForFlow,
  resolveFlowOperation,
  validateOperationCursor,
  replanTriggerReview,
  latestScopedSolReplanRequest,
  solReplanRequestArtifactIsCurrent
} from "./sol-review-status.mjs";
import { semanticSliceIsCurrent } from "./revalidation-semantic-slice.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = resolve(root, "scripts/curriculum/no-family-plan.json");
const coveragePath = resolve(root, "reports/curriculum-coverage/latest.json");
const executionPath = resolve(root, "reports/curriculum-execution/latest.json");
const targetOutlinePath = resolve(
  root,
  "scripts/curriculum/no-family-target-outlines.sol-draft.json"
);
const learningMapPath = resolve(
  root,
  "fixtures/pedagogy/no-family-learning-map.used.json"
);
const solReviewBoardPath = resolve(
  root,
  "scripts/curriculum/sol-review-board.json"
);
const jsonPath = resolve(
  root,
  "reports/curriculum-execution/no-family-plan.json"
);
const markdownPath = resolve(
  root,
  "reports/curriculum-execution/no-family-plan.md"
);
const shouldWrite = process.argv.includes("--write");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function unique(values) {
  return [...new Set(values)];
}

function stableCodeHash(codes) {
  return createHash("sha256")
    .update([...codes].sort().join("\n"))
    .digest("hex");
}

function codeOrderHash(codes) {
  return createHash("sha256").update(codes.join("\n")).digest("hex");
}

function reviewKey(
  standardCode,
  operation,
  familyTrackId = null,
  scopeId = null
) {
  return `${standardCode}:${operation}:${familyTrackId ?? ""}:${scopeId ?? ""}`;
}

function effectiveReview(review) {
  if (
    review?.decision === "approved" &&
    review.operation !== "SOL_REPLAN" &&
    !reviewCandidateIsCurrent(review)
  ) {
    return { ...review, decision: "stale" };
  }
  return review;
}

function jsonHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * ENGINE_CORE is owned by a concrete family sub-work, not by the broad
 * archetype. The legacy base contract remains the repeat-rule v9 contract;
 * every other family must provide an explicit override. Falling back to the
 * base for repair/change would make the artifact identity lie about the work
 * that was actually reviewed.
 */
export function resolveEngineCoreContract(contract, familyTrackId = null) {
  const base = contract?.engineCoreContract;
  if (!base) return null;
  const baseFamilyTrackId = "pattern.repeat-unit.construct-v1";
  if (!familyTrackId || familyTrackId === baseFamilyTrackId) return base;
  const override =
    contract.engineCoreContractsByFamilyTrack?.[familyTrackId];
  assert(
    override && typeof override === "object",
    `no-family-plan-engine-core-contract-ref-missing:${familyTrackId}`
  );
  return {
    ...base,
    ...override,
    manifestDecision: {
      ...base.manifestDecision,
      ...override.manifestDecision
    },
    runtimePredicate: {
      ...base.runtimePredicate,
      ...override.runtimePredicate,
      parameters: {
        ...base.runtimePredicate?.parameters,
        ...override.runtimePredicate?.parameters
      }
    },
    constraintCapacity: {
      ...base.constraintCapacity,
      ...override.constraintCapacity
    },
    binding: {
      ...base.binding,
      ...override.binding
    },
    layoutContract: {
      ...base.layoutContract,
      ...override.layoutContract
    }
  };
}

export function replanConsumesRequest({
  replanReview,
  replanApproved,
  replanConsumed
}) {
  return (
    replanReview?.operation === "SOL_REPLAN" &&
    replanReview.decision === "approved" &&
    replanApproved === true &&
    replanConsumed === true
  );
}

export function assertEngineCoreContract(contract, archetypeId) {
  const requiresEngineCore = (contract.subWorkItems ?? []).some((item) =>
    item.operationSequence?.includes("ENGINE_CORE")
  );
  if (!requiresEngineCore) return;

  const core = contract.engineCoreContract;
  assert(
    core && typeof core === "object",
    `no-family-plan-engine-core-contract-missing:${archetypeId}`
  );
  const decision = core.manifestDecision;
  const runtime = core.runtimePredicate;
  const binding = core.binding;
  const stableId = (value) =>
    typeof value === "string" &&
    /^[A-Za-z0-9._:-]+$/.test(value);
  const relativePath = (value) =>
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    /^[A-Za-z0-9._/-]+$/.test(value);
  const stringList = (value, minimum = 1) =>
    Array.isArray(value) &&
    value.length >= minimum &&
    new Set(value).size === value.length &&
    value.every(stableId);
  const orderedCapacity = (variantCount, slotCount) => {
    let capacity = 1;
    for (let index = 0; index < slotCount; index += 1) {
      capacity *= variantCount - index;
    }
    return capacity;
  };
  const distractorList = (value) =>
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 7 &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.misconception === "string" &&
        entry.misconception.length > 0 &&
        (stableId(entry.role) || stableId(entry.predicateKind))
    );
  const stateConstructionValid = (value, decisionValue) =>
    value &&
    value.kind === "ordered-distinct-subset-from-pool" &&
    stringList(value.sourceRoles, 3) &&
    stringList(value.slotRoles, 2) &&
    value.slotCount === value.slotRoles.length &&
    Number.isInteger(value.minimumDistinctValues) &&
    value.minimumDistinctValues >= 2 &&
    value.minimumDistinctValues <= value.slotCount &&
    Number.isInteger(value.minimumDistinctPoolValues) &&
    value.minimumDistinctPoolValues >= 3 &&
    Number.isInteger(value.minimumCopiesPerDistinctValue) &&
    value.minimumCopiesPerDistinctValue >= 3 &&
    value.sourceUseMode === "move-once-no-clone" &&
    value.sourceRoles.length >=
      value.minimumDistinctPoolValues * value.minimumCopiesPerDistinctValue &&
    value.allowsAnyOrderedSelection === true &&
    value.initialState === "empty" &&
    JSON.stringify(value.sourceRoles) ===
      JSON.stringify(decisionValue.variantRoles) &&
      JSON.stringify(value.slotRoles) ===
      JSON.stringify(decisionValue.ruleSlotRoles);
  const constraintCapacity = core.constraintCapacity;
  const layoutContract = core.layoutContract;
  const applicationValid = (value, ruleStatePath, ruleSlotRoles) =>
    value &&
    value.ruleStatePath === ruleStatePath &&
    Array.isArray(value.continuationTargetRoles) &&
    value.continuationTargetRoles.length >= 4 &&
    new Set(value.continuationTargetRoles).size ===
      value.continuationTargetRoles.length &&
    value.continuationTargetRoles.every(stableId) &&
    value.period === 2 &&
    Number.isInteger(value.minimumTargetCount) &&
    value.minimumTargetCount >= 4 &&
    value.continuationTargetRoles.length === value.minimumTargetCount &&
    value.period === ruleSlotRoles.length &&
    value.continuationTargetRoles.length % value.period === 0 &&
    value.requiresVisibleComparison === true &&
    value.requiresSimultaneousRuleAndContinuation === true &&
    value.ruleStateIndexMode === "index-mod-period" &&
    value.evidenceMode === "student-state-dependent";
  assert(
    constraintCapacity &&
      constraintCapacity.maxSources === 12 &&
      constraintCapacity.requiredSources === 9 &&
      constraintCapacity.maxSources >= constraintCapacity.requiredSources &&
    layoutContract &&
      layoutContract.tokenSet === "w002-repeat-rule-construction-v1" &&
      layoutContract.sourceRoles === 9 &&
      layoutContract.ruleSlotRoles === 2 &&
      layoutContract.continuationTargetRoles === 4 &&
      layoutContract.minSlotWidth >= 188 &&
      layoutContract.minSlotHeight >= 188 &&
      layoutContract.allVisibleSimultaneously === true &&
      layoutContract.containment === "native-rendered-bounds",
    `no-family-plan-engine-core-capacity-contract-invalid:${archetypeId}`
  );
  assert(
    decision &&
      decision.mode === "construct-rule" &&
      decision.constructionMode === "student-constructed" &&
      decision.answerMode === "conditional-rubric" &&
      stableId(decision.ruleStatePath) &&
      stableId(decision.decisionConstraintId) &&
      stringList(decision.variantRoles, 9) &&
      decision.variantRoles.length === constraintCapacity.requiredSources &&
      stringList(decision.ruleSlotRoles, 2) &&
      stableId(decision.variantProperty) &&
      stableId(decision.validRuleStatesPath) &&
      stableId(decision.surplusPath) &&
      Number.isInteger(decision.minimumValidStates) &&
      decision.minimumValidStates >= 2 &&
      Number.isInteger(decision.minimumSurplus) &&
      decision.minimumSurplus >= 2 &&
      decision.stateConstruction?.minimumDistinctPoolValues === 3 &&
      decision.stateConstruction?.minimumCopiesPerDistinctValue === 3 &&
      decision.stateConstruction?.minimumDistinctValues ===
        decision.ruleSlotRoles.length &&
      decision.variantRoles.length ===
        (decision.stateConstruction?.minimumDistinctPoolValues ?? 0) *
          (decision.stateConstruction?.minimumCopiesPerDistinctValue ?? 0) &&
      Number.isInteger(
        decision.stateConstruction?.minimumCopiesPerDistinctValue
      ) &&
      Number.isInteger(decision.application?.period) &&
      Array.isArray(decision.application?.continuationTargetRoles) &&
      decision.stateConstruction.minimumCopiesPerDistinctValue >=
        1 +
          decision.application.continuationTargetRoles.length /
            decision.application.period +
          (decision.repair?.repairTargetRoles?.length ?? 0) &&
      orderedCapacity(
        decision.variantRoles.length,
        decision.ruleSlotRoles.length
      ) >=
        decision.minimumValidStates + decision.minimumSurplus &&
      distractorList(decision.distractors) &&
      decision.distractors.length >= 2 &&
      stateConstructionValid(decision.stateConstruction, decision) &&
      applicationValid(
        decision.application,
        decision.ruleStatePath,
        decision.ruleSlotRoles
      ),
    `no-family-plan-engine-core-manifest-invalid:${archetypeId}`
  );
  assert(
    runtime &&
      runtime.kind === "cognitive.rule-state-contract" &&
      runtime.parameters &&
      typeof runtime.parameters === "object",
    `no-family-plan-engine-core-runtime-invalid:${archetypeId}`
  );
  const parameters = runtime.parameters;
  assert(
    parameters.mode === decision.mode &&
      parameters.constructionMode === decision.constructionMode &&
      parameters.answerMode === decision.answerMode &&
      parameters.ruleStatePath === decision.ruleStatePath &&
      parameters.decisionConstraintId === decision.decisionConstraintId &&
      parameters.validRuleStatesPath === decision.validRuleStatesPath &&
      parameters.surplusPath === decision.surplusPath &&
      JSON.stringify(parameters.variantRoles) ===
        JSON.stringify(decision.variantRoles) &&
      JSON.stringify(parameters.ruleSlotRoles) ===
        JSON.stringify(decision.ruleSlotRoles) &&
      parameters.variantProperty === decision.variantProperty &&
      parameters.continuationRuleStatePath === decision.ruleStatePath &&
      parameters.explanationRuleStatePath === decision.ruleStatePath &&
      stableId(parameters.predictionRole) &&
      stableId(parameters.explanationRole) &&
      stringList(parameters.verificationRoles, 1) &&
      parameters.minimumValidStates === decision.minimumValidStates &&
      parameters.minimumSurplus === decision.minimumSurplus &&
      Array.isArray(parameters.studentInputRoles) &&
      parameters.studentInputRoles.length === 0 &&
      JSON.stringify(parameters.stateConstruction) ===
        JSON.stringify(decision.stateConstruction) &&
      JSON.stringify(parameters.application) ===
        JSON.stringify(decision.application) &&
      JSON.stringify(parameters.verificationRoles) ===
        JSON.stringify([
          ...decision.ruleSlotRoles,
          ...decision.application.continuationTargetRoles
        ]) &&
      JSON.stringify(parameters.distractors) ===
        JSON.stringify(decision.distractors),
    `no-family-plan-engine-core-runtime-binding-invalid:${archetypeId}`
  );
  assert(
    binding &&
      binding.manifestDecisionMode === decision.mode &&
      binding.predicateKind === runtime.kind &&
      binding.decisionConstraintId === decision.decisionConstraintId &&
      JSON.stringify(binding.ruleSlotRoles) ===
        JSON.stringify(decision.ruleSlotRoles) &&
      binding.studentRuleStatePath === decision.ruleStatePath &&
      binding.applicationRuleStatePath === decision.ruleStatePath &&
      binding.answerMode === decision.answerMode,
    `no-family-plan-engine-core-binding-invalid:${archetypeId}`
  );
  const artifactContract = core.artifactContract;
  assert(
    artifactContract &&
      relativePath(artifactContract.artifactPath) &&
      artifactContract.status === "implemented-verified-pending-family-track" &&
      Array.isArray(artifactContract.implementationFiles) &&
      artifactContract.implementationFiles.length > 0 &&
      new Set(artifactContract.implementationFiles).size ===
        artifactContract.implementationFiles.length &&
      artifactContract.implementationFiles.every(relativePath),
    `no-family-plan-engine-core-artifact-contract-invalid:${archetypeId}`
  );

  const overrides = contract.engineCoreContractsByFamilyTrack ?? {};
  assert(
    overrides && typeof overrides === "object" && !Array.isArray(overrides),
    `no-family-plan-engine-core-contract-overrides-invalid:${archetypeId}`
  );
  const plannedFamilyTrackIds = new Set(
    (contract.subWorkItems ?? []).map((item) => item.familyTrackId)
  );
  for (const [familyTrackId, override] of Object.entries(overrides)) {
    assert(
      plannedFamilyTrackIds.has(familyTrackId) &&
        familyTrackId !== "pattern.repeat-unit.construct-v1" &&
        override &&
        typeof override === "object" &&
        override.baseContractFamilyTrackId ===
          "pattern.repeat-unit.construct-v1" &&
        typeof override.contractRevision === "string" &&
        override.constraintCapacity?.maxSources === 12 &&
        override.constraintCapacity?.requiredSources === 12 &&
        override.layoutContract &&
        override.layoutContract.tokenSet === "w002-repeat-repair-v1" &&
        override.layoutContract.sourceRoles === 12 &&
        override.layoutContract.ruleSlotRoles === 2 &&
        override.layoutContract.continuationTargetRoles === 4 &&
        override.layoutContract.misalignedItemRoles === 1 &&
        override.layoutContract.repairTargetRoles === 1 &&
        override.layoutContract.repairBankRoles === 1 &&
        override.layoutContract.minSlotWidth >= 188 &&
        override.layoutContract.minSlotHeight >= 188 &&
        override.layoutContract.allVisibleSimultaneously === true &&
        override.layoutContract.containment === "native-rendered-bounds",
      `no-family-plan-engine-core-contract-override-layout-invalid:${archetypeId}:${familyTrackId}`
    );
    const overrideDecision = override.manifestDecision;
    const overrideRuntime = override.runtimePredicate?.parameters;
    const overrideState = overrideDecision?.stateConstruction;
    const overrideApplication = overrideDecision?.application;
    const overrideLifecycle = overrideDecision?.stateLifecycle;
    assert(
      overrideDecision?.mode === "construct-rule" &&
        overrideDecision.constructionMode === "student-constructed" &&
        overrideDecision.answerMode === "conditional-rubric" &&
        stableId(overrideDecision.ruleStatePath) &&
        stableId(overrideDecision.decisionConstraintId) &&
        stringList(overrideDecision.variantRoles, 12) &&
        overrideDecision.variantRoles.length === 12 &&
        stringList(overrideDecision.ruleSlotRoles, 2) &&
        overrideDecision.variantProperty === decision.variantProperty &&
        overrideState?.sourceRoles.length === 12 &&
        overrideState.minimumCopiesPerDistinctValue === 4 &&
        overrideState.sourceRoles.length ===
          overrideState.minimumDistinctPoolValues *
            overrideState.minimumCopiesPerDistinctValue &&
        overrideApplication?.continuationTargetRoles.length === 4 &&
        overrideApplication.minimumTargetCount === 4 &&
        overrideState.minimumCopiesPerDistinctValue >=
          1 +
            overrideApplication.continuationTargetRoles.length /
              overrideApplication.period +
            1,
      `no-family-plan-engine-core-contract-override-capacity-invalid:${archetypeId}:${familyTrackId}`
    );
    assert(
      overrideLifecycle &&
        overrideLifecycle.kind === "empty-selection-then-declared-repair" &&
        overrideLifecycle.statePath === overrideDecision.ruleStatePath &&
        JSON.stringify(overrideLifecycle.phaseOrder) ===
          JSON.stringify([
            "rule-selection",
            "remove-misaligned",
            "place-replacement"
          ]) &&
        overrideLifecycle.initialState === overrideState.initialState &&
        overrideLifecycle.declaredStateCardinality ===
          overrideState.slotCount &&
        overrideLifecycle.declaredStateExamplesPath ===
          overrideDecision.validRuleStatesPath &&
        overrideLifecycle.selectionConstraintIdPrefix ===
          overrideDecision.decisionConstraintId &&
        overrideLifecycle.requiresIndexedSelectionWrites === true &&
        overrideLifecycle.repairRequiresDeclaredState === true,
      `no-family-plan-engine-core-contract-override-lifecycle-invalid:${archetypeId}:${familyTrackId}`
    );
    assert(
      overrideRuntime &&
        JSON.stringify(overrideRuntime.variantRoles) ===
          JSON.stringify(overrideDecision.variantRoles) &&
        JSON.stringify(overrideRuntime.stateConstruction) ===
          JSON.stringify(overrideState) &&
        JSON.stringify(overrideRuntime.stateLifecycle) ===
          JSON.stringify(overrideLifecycle) &&
        JSON.stringify(overrideRuntime.application) ===
          JSON.stringify(overrideApplication) &&
        JSON.stringify(overrideRuntime.verificationRoles) ===
          JSON.stringify([
            ...overrideDecision.ruleSlotRoles,
            ...overrideApplication.continuationTargetRoles,
            "misaligned-item",
            "repair-target",
            "repair-bank"
          ]),
      `no-family-plan-engine-core-contract-override-runtime-invalid:${archetypeId}:${familyTrackId}`
    );
    const repair =
      override.repair ?? override.manifestDecision?.repair;
    const stableRoleList = (value, minimum = 1) =>
      Array.isArray(value) &&
      value.length >= minimum &&
      new Set(value).size === value.length &&
      value.every(stableId);
    assert(
      repair &&
        repair.kind === "declared-rule-independent-misplacement" &&
        repair.declaredRuleStatePath === decision.ruleStatePath &&
        repair.repairRuleStateIndex === 1 &&
        repair.wrongItemProperty === decision.variantProperty &&
        stableRoleList(repair.wrongItemRoles) &&
        stableRoleList(repair.repairTargetRoles) &&
        stableRoleList(repair.repairBankRoles) &&
        stableId(repair.beforeStatePath) &&
        stableId(repair.afterStatePath) &&
        stableId(repair.validAfterStateExamplesPath) &&
        repair.beforeStatePath !== repair.validAfterStateExamplesPath &&
        repair.afterStatePath !== repair.validAfterStateExamplesPath &&
        repair.beforeStatePath !== repair.afterStatePath &&
        stableId(repair.removeConstraintId) &&
        stableId(repair.replacementConstraintId) &&
        repair.requiresIndependentWrongState === true &&
        repair.requiresBeforeAfterComparison === true &&
        repair.evidenceMode === "student-state-dependent",
      `no-family-plan-engine-core-contract-override-repair-invalid:${archetypeId}:${familyTrackId}`
    );
    assert(
      override.manifestDecision?.repair &&
        JSON.stringify(override.manifestDecision.repair) ===
          JSON.stringify(repair) &&
        override.runtimePredicate?.parameters?.repair &&
        JSON.stringify(override.runtimePredicate.parameters.repair) ===
          JSON.stringify(repair) &&
        override.binding?.repair &&
        JSON.stringify(override.binding.repair) ===
          JSON.stringify({
            declaredRuleStatePath: repair.declaredRuleStatePath,
            repairRuleStateIndex: repair.repairRuleStateIndex,
            wrongItemProperty: repair.wrongItemProperty,
            wrongItemRoles: repair.wrongItemRoles,
            repairTargetRoles: repair.repairTargetRoles,
            repairBankRoles: repair.repairBankRoles,
            beforeStatePath: repair.beforeStatePath,
            afterStatePath: repair.afterStatePath,
            validAfterStateExamplesPath: repair.validAfterStateExamplesPath,
            removeConstraintId: repair.removeConstraintId,
            replacementConstraintId: repair.replacementConstraintId
          }),
      `no-family-plan-engine-core-contract-override-binding-invalid:${archetypeId}:${familyTrackId}`
    );
    assert(
      JSON.stringify(override.binding.stateLifecycle) ===
        JSON.stringify(overrideLifecycle),
      `no-family-plan-engine-core-contract-override-binding-lifecycle-invalid:${archetypeId}:${familyTrackId}`
    );
    const overrideArtifact = override.artifactContract;
    assert(
      overrideArtifact &&
        relativePath(overrideArtifact.artifactPath) &&
        overrideArtifact.artifactPath !== artifactContract.artifactPath &&
        overrideArtifact.status ===
          "implemented-verified-pending-family-track" &&
        Array.isArray(overrideArtifact.implementationFiles) &&
        overrideArtifact.implementationFiles.length > 0 &&
        new Set(overrideArtifact.implementationFiles).size ===
          overrideArtifact.implementationFiles.length &&
        overrideArtifact.implementationFiles.every(relativePath),
      `no-family-plan-engine-core-contract-override-artifact-invalid:${archetypeId}:${familyTrackId}`
    );
  }
}

function familyRevalidationArtifactPath(baseWorkItemId) {
  return resolve(
    root,
    "reports/curriculum-execution/family-revalidation",
    `${baseWorkItemId}.json`
  );
}

function sha256File(relativePath) {
  const absolutePath = resolve(root, relativePath);
  assert(
    absolutePath.startsWith(`${root}/`),
    `no-family-plan-revalidation-path-outside-root:${relativePath}`
  );
  return createHash("sha256")
    .update(readFileSync(absolutePath))
    .digest("hex");
}

export function assertEngineCoreCompletionEvidence(
  stateItem,
  plannedItem,
  contract
) {
  const completedOperations = stateItem?.completedOperations ?? [];
  const hasEngineCore = completedOperations.includes("ENGINE_CORE");
  const evidence = stateItem?.completionEvidenceByOperation?.ENGINE_CORE;
  if (!hasEngineCore) {
    assert(
      evidence === undefined,
      `no-family-plan-subwork-engine-core-evidence-before-completion:${plannedItem.workItemId}`
    );
    return;
  }

  const engineCoreContract = resolveEngineCoreContract(
    contract,
    plannedItem.familyTrackId
  );
  const artifactContract = engineCoreContract?.artifactContract;
  assert(
    artifactContract &&
      evidence &&
      evidence.artifactPath === artifactContract.artifactPath &&
      typeof evidence.artifactSha256 === "string" &&
      /^[a-f0-9]{64}$/u.test(evidence.artifactSha256),
    `no-family-plan-subwork-engine-core-evidence-required:${plannedItem.workItemId}`
  );
  const artifactPath = evidence.artifactPath;
  const artifact = readJson(resolve(root, artifactPath));
  assert(
    artifact.schemaVersion === "1.0.0" &&
      artifact.operation === "ENGINE_CORE" &&
      artifact.workItemId === plannedItem.workItemId &&
      artifact.operationWorkItemId ===
        `${plannedItem.workItemId}-ENGINE_CORE` &&
      artifact.standardCode === contract.standardCode &&
      artifact.familyTrackId === plannedItem.familyTrackId &&
      artifact.scopeId === plannedItem.scopeId &&
      artifact.replanContractRevision ===
        (engineCoreContract.contractRevision ??
          contract.replanContractRevision) &&
      artifact.status === artifactContract.status,
    `no-family-plan-subwork-engine-core-evidence-invalid:${plannedItem.workItemId}`
  );
  const expectedFiles = [...artifactContract.implementationFiles].sort();
  const actualFiles = Object.keys(artifact.implementationFiles ?? {}).sort();
  assert(
    JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
    `no-family-plan-subwork-engine-core-evidence-files:${plannedItem.workItemId}`
  );
  assert(
    evidence.artifactSha256 === sha256File(artifactPath),
    `no-family-plan-subwork-engine-core-evidence-stale:${plannedItem.workItemId}`
  );
  for (const file of expectedFiles) {
    assert(
      sha256File(file) === artifact.implementationFiles[file],
      `no-family-plan-subwork-engine-core-implementation-stale:${plannedItem.workItemId}:${file}`
    );
  }
}

function readCurrentFamilyRevalidationArtifact(
  baseWorkItemId,
  standardCode,
  reviewScopes,
  familyId,
  contract
) {
  try {
    const artifact = readJson(familyRevalidationArtifactPath(baseWorkItemId));
    if (
      artifact.schemaVersion !== "1.0.0" ||
      artifact.operation !== "FAMILY_REVALIDATION" ||
      artifact.workItemId !== baseWorkItemId ||
      artifact.standardCode !== standardCode ||
      artifact.familyId !== familyId ||
      artifact.replanContractRevision !==
        (contract.replanContractRevision ?? null) ||
      !reviewScopes.some(
        (scope) =>
          scope.familyTrackId === artifact.familyTrackId &&
          scope.scopeId === artifact.scopeId
      ) ||
      typeof artifact.fingerprintSha256 !== "string"
    ) {
      return null;
    }
    const { fingerprintSha256, ...fingerprintPayload } = artifact;
    if (jsonHash(fingerprintPayload) !== fingerprintSha256) return null;
    const expectedImplementationFiles = [...(contract.revalidationFiles ?? [])].sort();
    const actualImplementationFiles = Object.keys(
      artifact.implementationFiles ?? {}
    ).sort();
    if (
      JSON.stringify(actualImplementationFiles) !==
      JSON.stringify(expectedImplementationFiles)
    ) {
      return null;
    }
    const expectedSemanticSlices = contract.revalidationSemanticSlices ?? [];
    if (
      !Array.isArray(artifact.semanticSlices) ||
      artifact.semanticSlices.length !== expectedSemanticSlices.length ||
      !expectedSemanticSlices.every((descriptor) => {
        const slice = artifact.semanticSlices.find(
          (candidate) =>
            candidate.kind === descriptor.kind &&
            candidate.path === descriptor.path &&
            candidate.standardCode === descriptor.standardCode
        );
        return slice && semanticSliceIsCurrent(root, slice);
      })
    ) {
      return null;
    }
    for (const [relativePath, expectedHash] of Object.entries(
      artifact.implementationFiles ?? {}
    )) {
      if (sha256File(relativePath) !== expectedHash) return null;
    }
    return artifact;
  } catch {
    return null;
  }
}

function readSubWorkState(contract) {
  if (typeof contract.subWorkStatePath !== "string") return null;
  try {
    const absolutePath = resolve(root, contract.subWorkStatePath);
    assert(
      absolutePath.startsWith(`${root}/`),
      `no-family-plan-subwork-state-path-outside-root:${contract.subWorkStatePath}`
    );
    const state = readJson(absolutePath);
    const plannedItems = contract.subWorkItems ?? [];
    const plannedIds = plannedItems.map((item) => item.workItemId);
    const stateIds = (state.items ?? []).map((item) => item.workItemId);
    assert(
        state.schemaVersion === "1.0.0" &&
        state.standardCode === contract.standardCode &&
        state.contractRevision === contract.replanContractRevision &&
        state.workItemId === plannedIds[0]?.match(/^W\d+/)?.[0] &&
        Array.isArray(state.items) &&
        state.items.length === plannedItems.length &&
        new Set(stateIds).size === stateIds.length &&
        plannedIds.every((workItemId) => stateIds.includes(workItemId)),
      `no-family-plan-subwork-state-schema:${contract.subWorkStatePath}`
    );
    for (const item of state.items) {
      const planned = plannedItems.find(
        (plannedItem) => plannedItem.workItemId === item.workItemId
      );
      assert(
        planned &&
          assertEngineCoreCompletionEvidence(item, planned, contract) ===
            undefined &&
          validateOperationCursor(
            planned.operationSequence,
            item.completedOperations,
            item.nextOperation
          ),
        `no-family-plan-subwork-state-item:${item.workItemId}`
      );
    }
    return new Map(
      state.items.map((item) => [
        item.workItemId,
        {
          completedOperations: item.completedOperations,
          nextOperation: item.nextOperation
        }
      ])
    );
  } catch {
    return null;
  }
}

function hasLearningMapBinding(learningMap, standardCode) {
  const prefix = `${standardCode} `;
  const topics = learningMap.topics.filter((topic) =>
    typeof topic.titleKorean === "string" && topic.titleKorean.startsWith(prefix)
  );
  const bySuffix = new Map(
    topics.map((topic) => [topic.id.split(".").at(-1), topic.id])
  );
  if (
    !["concept", "representation", "application"].every((suffix) =>
      bySuffix.has(suffix)
    )
  ) {
    return false;
  }
  const dependencyPairs = new Set(
    learningMap.dependencies
      .filter((dependency) => dependency.strength === "hard")
      .map((dependency) => `${dependency.topicId}<-${dependency.prerequisiteId}`)
  );
  return (
    dependencyPairs.has(
      `${bySuffix.get("representation")}<-${bySuffix.get("concept")}`
    ) &&
    dependencyPairs.has(
      `${bySuffix.get("application")}<-${bySuffix.get("representation")}`
    )
  );
}

function operationWorkItemId(
  baseWorkItemId,
  operation,
  reviewGate,
  subWorkItem = null
) {
  if (subWorkItem?.workItemId) {
    return `${subWorkItem.workItemId}-${operation}`;
  }
  if (operation === "SOL_REPLAN") {
    return `${baseWorkItemId}-SOL_REPLAN`;
  }
  if (operation === "FAMILY_REVALIDATION") {
    return `${baseWorkItemId}-FAMILY_REVALIDATION`;
  }
  return operation === "SOL_REVIEW"
    ? `${baseWorkItemId}-SOL_REVIEW-${reviewGate}`
    : `${baseWorkItemId}-${operation}`;
}

function operationDependencies(
  baseWorkItemId,
  operation,
  reviewGate,
  familyTrackReviewStatus = null,
  subWorkItem = null
) {
  const map = `${baseWorkItemId}-LEARNING_MAP_BINDING`;
  const target = `${baseWorkItemId}-TARGET_SET`;
  const targetReview = `${baseWorkItemId}-SOL_REVIEW-TARGET_SET`;
  const family = `${baseWorkItemId}-FAMILY_TRACK`;
  if (subWorkItem?.dependencies?.length && operation !== "SOL_REPLAN") {
    return [...subWorkItem.dependencies];
  }
  if (operation === "LEARNING_MAP_BINDING") return [];
  if (operation === "TARGET_SET") return [map];
  if (operation === "SOL_REVIEW" && reviewGate === "TARGET_SET") {
    return [target];
  }
  if (operation === "FAMILY_TRACK") return [map, target, targetReview];
  if (operation === "SOL_REPLAN") {
    return [family, `${baseWorkItemId}-SOL_REVIEW-FAMILY_TRACK`];
  }
  if (operation === "FAMILY_REVALIDATION") {
    return [family, `${baseWorkItemId}-SOL_REVIEW-FAMILY_TRACK`];
  }
  if (operation === "SOL_REVIEW" && reviewGate === "FAMILY_TRACK") {
    return familyTrackReviewStatus === "stale"
      ? [family, `${baseWorkItemId}-FAMILY_REVALIDATION`]
      : [family];
  }
  if (operation === "SOL_REVIEW" && reviewGate === "FAMILY_REVALIDATION") {
    return [family, `${baseWorkItemId}-FAMILY_REVALIDATION`];
  }
  return [];
}

function fileMatches(pattern, file) {
  if (pattern === file) return true;
  if (pattern.endsWith("/**")) return file.startsWith(pattern.slice(0, -2));
  if (!pattern.includes("*")) return false;
  const expression = new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
      .join(".*")}$`
  );
  return expression.test(file);
}

function actionClass(nextAction) {
  if (nextAction === "complete") return "complete";
  if (nextAction === "sol-replan-required") {
    return "blocked-needs-sol-replan";
  }
  if (nextAction === "capture-current-hash-live-evidence") {
    return "live-evidence";
  }
  if (nextAction === "review-target-set-and-design-family") {
    return "planned-no-family";
  }
  return "offline-in-progress";
}

function buildReport() {
  const source = readJson(sourcePath);
  const coverage = readJson(coveragePath);
  const execution = readJson(executionPath);
  const targetOutlines = readJson(targetOutlinePath);
  const learningMap = readJson(learningMapPath);
  const solReviewBoard = readJson(solReviewBoardPath);

  assert(source.schemaVersion === "1.0.0", "no-family-plan-schema");
  assert(
    source.planId === "kr-2022-elementary-math-no-family-baseline",
    "no-family-plan-id"
  );
  assert(
    source.loopPolicy.workUnit === "one-standard-per-run",
    "no-family-plan-work-unit"
  );
  assert(
    source.loopPolicy.externalReview === "repository-qa-only-no-fable",
    "no-family-plan-review-policy"
  );
  assert(
    source.solReview?.boardPath ===
      "scripts/curriculum/sol-review-board.json" &&
      source.solReview.reviewerModel === "gpt-5.6-sol / max" &&
      source.solReview.requiredAfter.includes("TARGET_SET") &&
      source.solReview.requiredAfter.includes("FAMILY_TRACK") &&
      source.solReview.reviewOperations.includes("SOL_REPLAN") &&
      source.solReview.reviewOperations.includes("SOL_REPLAN_REQUEST") &&
      source.solReview.reviewOperations.includes("FAMILY_REVALIDATION") &&
      source.solReview.transactionPolicy?.candidateOwner === "Luna" &&
      source.solReview.transactionPolicy?.reviewOwner === "Sol" &&
      source.solReview.transactionPolicy?.derivedReportCommitOwner === "Sol" &&
      source.solReview.transactionPolicy?.reviewerPushes === false &&
      source.solReview.transactionPolicy?.allowedPostApprovalFilesAreManifestBound ===
        true &&
      JSON.stringify(source.solReview.scopePolicy?.familyTrackRequires) ===
        JSON.stringify(["familyTrackId", "scopeId"]) &&
      JSON.stringify(source.solReview.scopePolicy?.familyRevalidationRequires) ===
        JSON.stringify([
          "familyTrackId",
          "scopeId",
          "artifactPath",
          "fingerprintSha256",
          "supersedesFamilyTrackReviewId"
        ]) &&
      JSON.stringify(source.solReview.scopePolicy?.solReplanRequestRequires) ===
        JSON.stringify([
          "familyTrackId",
          "scopeId",
          "operationWorkItemId",
          "blockedOperation",
          "blockedContractRevision",
          "blockerArtifactPath",
          "blockerArtifactSha256"
        ]) &&
      JSON.stringify(source.solReview.scopePolicy?.scopeKey) ===
        JSON.stringify(["standardCode", "operation", "familyTrackId", "scopeId"]),
    "no-family-plan-sol-review-policy"
  );
  assert(
    solReviewBoard.schemaVersion === "1.0.0" &&
      solReviewBoard.boardId ===
        "kr-2022-elementary-math-no-family-sol-review-board" &&
      solReviewBoard.reviewer?.model === "gpt-5.6-sol / max" &&
      solReviewBoard.policy?.oneStandardPerReview === true &&
      solReviewBoard.policy?.reviewerMayEditImplementation === false &&
      solReviewBoard.policy?.approvalBindsToCandidateCommit === true &&
      solReviewBoard.policy?.latestAttemptWins === true &&
      solReviewBoard.policy?.pushRequiresApprovedCandidate === true &&
      solReviewBoard.policy?.reviewerOwnsBoardAndDerivedReportCommit === true &&
      solReviewBoard.policy?.reviewerMustNotPush === true &&
      solReviewBoard.policy?.postApprovalFilesMustBeManifestBound === true &&
      Array.isArray(solReviewBoard.reviews),
    "no-family-plan-sol-review-board-schema"
  );
  assert(
    targetOutlines.schemaVersion === "1.0.0" &&
      targetOutlines.status === "sol-max-planning-draft",
    "no-family-plan-target-outline-schema"
  );
  assert(
    learningMap.schemaVersion === "1.0.0" &&
      Array.isArray(learningMap.topics) &&
      Array.isArray(learningMap.dependencies) &&
      source.foundation.executionLearningMapFixture ===
        "fixtures/pedagogy/no-family-learning-map.used.json",
    "no-family-plan-learning-map-schema"
  );

  const officialByCode = new Map(
    coverage.rows.map((row) => [row.code, row])
  );
  const engineIds = source.sharedEngineClasses.map(
    (engine) => engine.engineClassId
  );
  assert(
    engineIds.length === source.estimate.sharedRenderRecipeEngineClasses &&
      new Set(engineIds).size === engineIds.length,
    "no-family-plan-engine-count-or-duplicate"
  );
  const archetypeIds = source.archetypes.map(
    (archetype) => archetype.archetypeId
  );
  assert(
    archetypeIds.length === source.estimate.initialConcreteProblemFamilyTracks &&
      new Set(archetypeIds).size === archetypeIds.length,
    "no-family-plan-track-count-or-duplicate"
  );
  const trackContractIds = Object.keys(source.trackContracts);
  assert(
    trackContractIds.length === archetypeIds.length &&
      new Set(trackContractIds).size === trackContractIds.length &&
      archetypeIds.every((id) => trackContractIds.includes(id)),
    "no-family-plan-track-contract-coverage"
  );
  assert(
    Object.values(source.trackContracts).every(
      (contract) =>
        contract.familyId &&
        contract.engineClassIds.length > 0 &&
        contract.engineClassIds.every((id) => engineIds.includes(id))
    ),
    "no-family-plan-track-contract-engine"
  );
  for (const [archetypeId, contract] of Object.entries(source.trackContracts)) {
    const subWorkItems = contract.subWorkItems ?? [];
    if (contract.revalidationSemanticSlices) {
      assert(
        typeof contract.standardCode === "string" &&
          typeof contract.replanDocumentPath === "string" &&
          typeof contract.replanContractRevision === "string" &&
          Array.isArray(contract.revalidationSemanticSlices) &&
          contract.revalidationSemanticSlices.length > 0,
        `no-family-plan-revalidation-contract:${archetypeId}`
      );
      assert(
        contract.revalidationSemanticSlices.every(
          (slice) =>
            typeof slice.path === "string" &&
            slice.standardCode === contract.standardCode &&
            ((slice.kind === "learning-map" &&
              !slice.startMarker &&
              !slice.endMarker) ||
              (slice.kind === "source-module" &&
                (slice.startMarker === undefined ||
                  typeof slice.startMarker === "string") &&
                (slice.endMarker === undefined ||
                  typeof slice.endMarker === "string")) ||
              (slice.kind === "registry-family" &&
                typeof slice.familyId === "string"))
        ),
        `no-family-plan-revalidation-semantic-slice:${archetypeId}`
      );
    }
    if (subWorkItems.length > 0) {
      assert(
        typeof contract.standardCode === "string",
        `no-family-plan-subwork-standard-code:${archetypeId}`
      );
    }
    assert(
      Array.isArray(subWorkItems) &&
        new Set(subWorkItems.map((item) => item.workItemId)).size ===
          subWorkItems.length,
      `no-family-plan-subwork-id:${archetypeId}`
    );
    for (const subWorkItem of subWorkItems) {
      assert(
        typeof subWorkItem.workItemId === "string" &&
          typeof subWorkItem.familyId === "string" &&
          typeof subWorkItem.familyTrackId === "string" &&
          typeof subWorkItem.scopeId === "string" &&
          Array.isArray(subWorkItem.targetOutlineKeys) &&
          subWorkItem.targetOutlineKeys.length > 0 &&
          Array.isArray(subWorkItem.assessmentTargetIds) &&
          subWorkItem.assessmentTargetIds.length > 0 &&
          Array.isArray(subWorkItem.dependencies) &&
          Array.isArray(subWorkItem.operationSequence) &&
          subWorkItem.operationSequence.length > 0 &&
          subWorkItem.operationSequence.every((operation) =>
            ["AFFORDANCE_DISCOVERY", "ENGINE_CORE", "FAMILY_TRACK", "SOL_REVIEW"].includes(
              operation
            )
          ) &&
          subWorkItem.operationSequence.includes(subWorkItem.nextOperation) &&
          Array.isArray(subWorkItem.completedOperations) &&
          subWorkItem.completedOperations.every((operation) =>
            subWorkItem.operationSequence.includes(operation)
          ) &&
          new Set(subWorkItem.completedOperations).size ===
            subWorkItem.completedOperations.length &&
          validateOperationCursor(
            subWorkItem.operationSequence,
            subWorkItem.completedOperations,
            subWorkItem.nextOperation
          ),
        `no-family-plan-subwork-shape:${archetypeId}:${subWorkItem.workItemId}`
      );
      assert(
        validateOperationCursor(
          subWorkItem.operationSequence,
          subWorkItem.completedOperations,
          subWorkItem.nextOperation
        ),
        `no-family-plan-subwork-phase-cursor:${archetypeId}:${subWorkItem.workItemId}`
      );
      if (typeof contract.subWorkStatePath === "string") {
        assert(
          subWorkItem.operationSequence.every((operation) =>
            (source.operationPolicy.allowedFilesByOperation[operation] ?? []).some(
              (pattern) => fileMatches(pattern, contract.subWorkStatePath)
            )
          ),
          `no-family-plan-subwork-state-not-allowed:${archetypeId}:${subWorkItem.workItemId}`
        );
      }
    }
  }
  assert(
    new Set(
      Object.values(source.trackContracts).map((contract) => contract.familyId)
    ).size === archetypeIds.length,
    "no-family-plan-family-id-duplicate"
  );

  const plannedCodes = source.archetypes.flatMap(
    (archetype) => archetype.standardCodes
  );
  assert(
    plannedCodes.length === source.baseline.expectedStandardCount,
    "no-family-plan-standard-count"
  );
  assert(
    new Set(plannedCodes).size === plannedCodes.length,
    "no-family-plan-standard-duplicate"
  );
  assert(
    plannedCodes.every((code) => officialByCode.has(code)),
    "no-family-plan-standard-unknown"
  );
  assert(
    stableCodeHash(plannedCodes) === source.baseline.standardCodeSha256,
    "no-family-plan-baseline-hash"
  );
  assert(
    source.standardWorkOrder.length === plannedCodes.length &&
      new Set(source.standardWorkOrder).size === plannedCodes.length &&
      source.standardWorkOrder.every((code) => plannedCodes.includes(code)) &&
      codeOrderHash(source.standardWorkOrder) ===
        source.baseline.standardWorkOrderSha256,
    "no-family-plan-work-order"
  );
  const workItemIdByCode = new Map(
    source.standardWorkOrder.map((code, index) => [
      code,
      `W${String(index + 1).padStart(3, "0")}`
    ])
  );
  assert(
    source.operationPolicy?.firstOperation === "LEARNING_MAP_BINDING" &&
      Array.isArray(source.operationPolicy.order) &&
      source.operationPolicy.order[0] === "LEARNING_MAP_BINDING" &&
      source.operationPolicy.order.includes("SOL_REVIEW") &&
      Object.values(source.operationPolicy.allowedFilesByOperation).every(
        (files) => Array.isArray(files) && files.length > 0
      ) &&
      Object.values(source.operationPolicy.postApprovalFilesByOperation ?? {}).every(
        (files) => Array.isArray(files) && files.length > 0
      ),
    "no-family-plan-operation-manifest-policy"
  );
  const allowedSolDecisions = new Set(source.solReview.decisionValues);
  const reviewOperations = new Set(source.solReview.reviewOperations);
  const solReviewByKey = new Map();
  const solReviewHistoryByKey = new Map();
  const solReviewIds = new Set();
  for (const review of solReviewBoard.reviews ?? []) {
    assert(
      source.solReview.artifactRequiredFields.every((field) =>
        Object.prototype.hasOwnProperty.call(review, field)
      ),
      `no-family-plan-sol-review-field:${review.reviewId ?? "unknown"}`
    );
    assert(
      plannedCodes.includes(review.standardCode),
      `no-family-plan-sol-review-code:${review.standardCode}`
    );
    assert(
      reviewOperations.has(review.operation),
      `no-family-plan-sol-review-operation:${review.operation}`
    );
    assert(
      review.workItemId === workItemIdByCode.get(review.standardCode),
      `no-family-plan-sol-review-work-item:${review.standardCode}`
    );
    assert(
      typeof review.reviewId === "string" && review.reviewId.trim().length > 0 &&
        review.reviewer === source.solReview.reviewerModel &&
        allowedSolDecisions.has(review.decision) &&
        Number.isInteger(review.attempt) &&
        review.attempt >= 1 &&
        /^[a-f0-9]{40}$/.test(review.candidateCommit) &&
        Array.isArray(review.changedFiles) &&
        review.changedFiles.length > 0 &&
        new Set(review.changedFiles).size === review.changedFiles.length &&
        review.changedFiles.every(
          (file) => typeof file === "string" && file.trim().length > 0
        ) &&
        (review.supersedesReviewId === null ||
          (typeof review.supersedesReviewId === "string" &&
            review.supersedesReviewId.trim().length > 0)) &&
        typeof review.checkedAt === "string" &&
        Number.isFinite(Date.parse(review.checkedAt)) &&
        Array.isArray(review.evidenceRefs) &&
        review.evidenceRefs.length > 0 &&
        review.evidenceRefs.every(
          (evidence) => typeof evidence === "string" && evidence.trim().length > 0
        ) &&
        Array.isArray(review.findings) &&
        review.findings.length > 0 &&
        review.findings.every(
          (finding) => typeof finding === "string" && finding.trim().length > 0
        ),
      `no-family-plan-sol-review-record:${review.reviewId}`
    );
    if (review.operation === "FAMILY_TRACK") {
      if (review.familyTrackId !== undefined || review.scopeId !== undefined) {
        assert(
          typeof review.familyTrackId === "string" &&
            typeof review.scopeId === "string",
          `no-family-plan-sol-review-scope:${review.reviewId}`
        );
      }
    }
    if (review.operation === "FAMILY_REVALIDATION") {
      assert(
        typeof review.familyTrackId === "string" &&
          typeof review.scopeId === "string" &&
          typeof review.artifactPath === "string" &&
          /^[a-f0-9]{64}$/.test(review.fingerprintSha256 ?? "") &&
          (review.attempt === 1
            ? review.supersedesReviewId === null
            : typeof review.supersedesReviewId === "string" &&
              review.supersedesReviewId.trim().length > 0) &&
          typeof review.supersedesFamilyTrackReviewId === "string" &&
          review.supersedesFamilyTrackReviewId.trim().length > 0,
        `no-family-plan-sol-revalidation-record:${review.reviewId}`
      );
    }
    const reviewArchetype = source.archetypes.find((archetype) =>
      archetype.standardCodes.includes(review.standardCode)
    );
    const reviewContract = reviewArchetype
      ? source.trackContracts[reviewArchetype.archetypeId]
      : null;
    if (
      review.operation === "FAMILY_REVALIDATION" &&
      review.decision === "approved" &&
      typeof reviewContract?.replanContractRevision === "string"
    ) {
      assert(
        review.replanContractRevision ===
          reviewContract.replanContractRevision,
        `no-family-plan-sol-revalidation-revision:${review.reviewId}`
      );
    }
    if (review.operation === "SOL_REPLAN") {
      assert(
        typeof review.replanDocumentPath === "string" &&
          /^[a-f0-9]{64}$/.test(review.replanDocumentSha256 ?? "") &&
          typeof review.supersedesBlockedReviewId === "string" &&
          review.supersedesBlockedReviewId.trim().length > 0 &&
          review.replanOwner === "Luna" &&
          Array.isArray(review.replanScopes) &&
          review.replanScopes.length > 0 &&
          (review.decision !== "approved" ||
            typeof review.replanContractRevision === "string"),
        `no-family-plan-sol-replan-record:${review.reviewId}`
      );
    }
    if (review.operation === "SOL_REPLAN_REQUEST") {
      assert(
        review.decision === "blocked" &&
          typeof review.familyTrackId === "string" &&
          typeof review.scopeId === "string" &&
          typeof review.operationWorkItemId === "string" &&
          review.operationWorkItemId.startsWith(`${review.workItemId}-`) &&
          review.blockedOperation === "ENGINE_CORE" &&
          typeof review.blockedContractRevision === "string" &&
          typeof review.blockerArtifactPath === "string" &&
          /^[a-f0-9]{64}$/.test(review.blockerArtifactSha256 ?? "") &&
          solReplanRequestArtifactIsCurrent(review),
        `no-family-plan-sol-replan-request-record:${review.reviewId}`
      );
    }
    if (review.operation === "TARGET_SET") {
      if (
        review.supersedesReplanReviewId !== undefined ||
        review.replanContractRevision !== undefined ||
        review.targetOutlineSha256 !== undefined
      ) {
        assert(
          typeof review.supersedesReplanReviewId === "string" &&
            typeof review.replanContractRevision === "string" &&
            /^[a-f0-9]{64}$/.test(review.targetOutlineSha256 ?? ""),
          `no-family-plan-sol-target-replan-binding:${review.reviewId}`
        );
      }
    }
    assert(
      !solReviewIds.has(review.reviewId),
      `no-family-plan-sol-review-id-duplicate:${review.reviewId}`
    );
    const reviewAllowedFiles =
      source.operationPolicy.allowedFilesByOperation[review.operation];
    const disallowedReviewFiles = review.changedFiles.filter(
      (file) =>
        !reviewAllowedFiles.some((pattern) => fileMatches(pattern, file))
    );
    if (disallowedReviewFiles.length > 0) {
      // A blocked review is the audit record for a candidate that must not
      // advance. Preserve its exact changedFiles even when the candidate
      // violated the operation manifest, but require an explicit finding so
      // the exception cannot silently become an approval or post-approval.
      // The same SCOPE_VIOLATION rule is documented in SOL_REVIEW_PROMPT.md.
      assert(
        review.decision === "blocked" &&
          review.findings.some((finding) =>
            finding.includes("SCOPE_VIOLATION")
          ),
        `no-family-plan-sol-review-file-not-allowed:${review.reviewId}`
      );
    }
    solReviewIds.add(review.reviewId);
    const key = reviewKey(
      review.standardCode,
      review.operation,
      review.familyTrackId ?? null,
      review.scopeId ?? null
    );
    const previous = solReviewByKey.get(key);
    assert(
      previous
        ? review.attempt === previous.attempt + 1 &&
          review.supersedesReviewId === previous.reviewId
        : review.attempt === 1 && review.supersedesReviewId === null,
      `no-family-plan-sol-review-attempt-order:${key}`
    );
    const history = solReviewHistoryByKey.get(key) ?? [];
    history.push(review);
    solReviewHistoryByKey.set(key, history);
    solReviewByKey.set(key, effectiveReview(review));
  }
  const targetOutlineCodes = targetOutlines.records.map(
    (record) => record.standardCode
  );
  assert(
    targetOutlines.source.expectedStandardCount === plannedCodes.length &&
      targetOutlines.source.standardCodeSha256 ===
        source.baseline.standardCodeSha256 &&
      targetOutlines.source.standardWorkOrderSha256 ===
        source.baseline.standardWorkOrderSha256 &&
    targetOutlineCodes.length === plannedCodes.length &&
      new Set(targetOutlineCodes).size === plannedCodes.length &&
      plannedCodes.every((code) => targetOutlineCodes.includes(code)) &&
      codeOrderHash(targetOutlineCodes) ===
        source.baseline.standardWorkOrderSha256,
    "no-family-plan-target-outline-coverage"
  );
  const targetOutlineByCode = new Map(
    targetOutlines.records.map((record) => [record.standardCode, record])
  );
  const targetKeys = [];
  for (const code of source.standardWorkOrder) {
    const record = targetOutlineByCode.get(code);
    const official = officialByCode.get(code);
    assert(
      record?.officialGoal === official?.officialGoal,
      `no-family-plan-target-outline-goal:${code}`
    );
    assert(
      Array.isArray(record.expectedTargetOutline) &&
        record.expectedTargetOutline.length > 0,
      `no-family-plan-target-outline-empty:${code}`
    );
    for (const target of record.expectedTargetOutline) {
      assert(
        target.key &&
          target.studentDecision &&
          target.invariant &&
          target.observableEvidence &&
          target.misconceptionClass,
        `no-family-plan-target-outline-field:${code}`
      );
      targetKeys.push(`${code}:${target.key}`);
    }
  }
  assert(
    new Set(targetKeys).size === targetKeys.length &&
      targetKeys.length === source.estimate.solDraftExpectedTargetCount,
    "no-family-plan-target-outline-count-or-key-duplicate"
  );

  const archetypeById = new Map(
    source.archetypes.map((archetype) => [archetype.archetypeId, archetype])
  );
  const archetypeByCode = new Map();
  for (const archetype of source.archetypes) {
    assert(
      archetype.standardCodes.includes(archetype.anchorStandardCode),
      `no-family-plan-anchor-mismatch:${archetype.archetypeId}`
    );
    const rows = archetype.standardCodes.map((code) => officialByCode.get(code));
    assert(
      rows.every(Boolean),
      `no-family-plan-track-standard-unknown:${archetype.archetypeId}`
    );
    assert(
      new Set(rows.map((row) => row.gradeBand)).size === 1,
      `no-family-plan-track-grade-band-mixed:${archetype.archetypeId}`
    );
    assert(
      new Set(rows.map((row) => row.domain)).size === 1 &&
        rows[0].domain === archetype.domain,
      `no-family-plan-track-domain-mixed:${archetype.archetypeId}`
    );
    for (const code of archetype.standardCodes) {
      archetypeByCode.set(code, archetype);
    }
  }
  const batchedArchetypeIds = source.batches.flatMap(
    (batch) => batch.archetypeIds
  );
  assert(
    new Set(source.batches.map((batch) => batch.batchId)).size ===
      source.batches.length,
    "no-family-plan-batch-duplicate"
  );
  assert(
    batchedArchetypeIds.length === archetypeIds.length &&
      new Set(batchedArchetypeIds).size === batchedArchetypeIds.length &&
      archetypeIds.every((id) => batchedArchetypeIds.includes(id)),
    "no-family-plan-batch-coverage"
  );
  assert(
    batchedArchetypeIds.every((id) => archetypeById.has(id)),
    "no-family-plan-batch-archetype-unknown"
  );
  const batchByArchetypeId = new Map();
  for (const batch of source.batches) {
    for (const archetypeId of batch.archetypeIds) {
      batchByArchetypeId.set(archetypeId, batch);
    }
  }

  const currentNoFamilyCodes = execution.breadthQueue
    .filter(
      (row) => row.nextAction === "review-target-set-and-design-family"
    )
    .map((row) => row.code);
  const unplannedCurrentCodes = currentNoFamilyCodes.filter(
    (code) => !plannedCodes.includes(code)
  );
  assert(
    unplannedCurrentCodes.length === 0,
    `no-family-plan-current-code-unplanned:${unplannedCurrentCodes.join(",")}`
  );

  const executionByCode = new Map(
    execution.breadthQueue.map((row) => [row.code, row])
  );
  const workItems = source.standardWorkOrder.map((code, index) => {
    const official = officialByCode.get(code);
    const archetype = archetypeByCode.get(code);
    assert(archetype, `no-family-plan-code-track-missing:${code}`);
    const batch = batchByArchetypeId.get(archetype.archetypeId);
    assert(batch, `no-family-plan-code-batch-missing:${code}`);
    const contract = source.trackContracts[archetype.archetypeId];
    assert(contract, `no-family-plan-track-contract-missing:${archetype.archetypeId}`);
    assertEngineCoreContract(contract, archetype.archetypeId);
    const reviewScopes = contract.reviewScopes ?? [];
    const subWorkItems = contract.subWorkItems ?? [];
    const subWorkState = readSubWorkState(contract);
    if (subWorkItems.length > 0) {
      assert(
        subWorkState instanceof Map,
        `no-family-plan-subwork-state-required:${archetype.archetypeId}`
      );
    }
    assert(
      reviewScopes.every(
        (scope) =>
          typeof scope.familyTrackId === "string" &&
          typeof scope.scopeId === "string"
      ),
      `no-family-plan-review-scope-invalid:${archetype.archetypeId}`
    );
    assert(
      subWorkItems.every(
        (subWorkItem) =>
          reviewScopes.some(
            (scope) =>
              scope.familyTrackId === subWorkItem.familyTrackId &&
              scope.scopeId === subWorkItem.scopeId
          )
      ),
      `no-family-plan-subwork-scope-missing:${archetype.archetypeId}`
    );
    const baseWorkItemId = `W${String(index + 1).padStart(3, "0")}`;
    const current = executionByCode.get(code);
    let nextAction = current?.nextAction ?? "complete";
    const expectedTargetOutline =
      targetOutlineByCode.get(code).expectedTargetOutline;
    if (subWorkItems.length > 0) {
      const ownedOutlineKeys = subWorkItems.flatMap(
        (subWorkItem) => subWorkItem.targetOutlineKeys
      );
      assert(
        new Set(ownedOutlineKeys).size === ownedOutlineKeys.length &&
          ownedOutlineKeys.length === expectedTargetOutline.length &&
          expectedTargetOutline.every((target) =>
            ownedOutlineKeys.includes(target.key)
          ),
        `no-family-plan-subwork-target-ownership:${code}`
      );
      const ownedAssessmentTargetIds = subWorkItems.flatMap(
        (subWorkItem) => subWorkItem.assessmentTargetIds
      );
      assert(
        new Set(ownedAssessmentTargetIds).size ===
          ownedAssessmentTargetIds.length,
        `no-family-plan-subwork-target-id-duplicate:${code}`
      );
    }
    const targetSetReview = solReviewByKey.get(
      reviewKey(code, "TARGET_SET")
    );
    const legacyFamilyTrackReview = solReviewByKey.get(
      reviewKey(code, "FAMILY_TRACK")
    );
    const scopedFamilyTrackReviews = reviewScopes.map((scope) =>
      solReviewByKey.get(
        reviewKey(
          code,
          "FAMILY_TRACK",
          scope.familyTrackId,
          scope.scopeId
        )
      )
    );
    const scopedFamilyRevalidationReviews = reviewScopes.map((scope) =>
      solReviewByKey.get(
        reviewKey(
          code,
          "FAMILY_REVALIDATION",
          scope.familyTrackId,
          scope.scopeId
        )
      )
    );
    const familyTrackReviews = reviewScopes.length
      ? scopedFamilyTrackReviews
      : [legacyFamilyTrackReview];
    const familyTrackReview =
      familyTrackReviews.find(Boolean) ?? legacyFamilyTrackReview ?? null;
    const targetSetReviewStatus = targetSetReview?.decision ?? "pending";
    const familyTrackReviewStatus = (() => {
      const decisions = familyTrackReviews
        .filter(Boolean)
        .map((review) => review.decision);
      if (decisions.includes("blocked")) return "blocked";
      if (decisions.includes("changes-requested")) return "changes-requested";
      if (decisions.includes("stale")) return "stale";
      if (reviewScopes.length && legacyFamilyTrackReview?.decision === "blocked") {
        return "blocked";
      }
      if (
        reviewScopes.length &&
        (legacyFamilyTrackReview?.decision === "approved" ||
          legacyFamilyTrackReview?.decision === "stale")
      ) {
        return "stale";
      }
      if (
        decisions.length > 0 &&
        decisions.length === reviewScopes.length &&
        decisions.every((decision) => decision === "approved")
      ) {
        return "approved";
      }
      return "pending";
    })();
    const replanReview = solReviewByKey.get(reviewKey(code, "SOL_REPLAN"));
    const approvedReplanReview =
      (solReviewHistoryByKey.get(reviewKey(code, "SOL_REPLAN")) ?? [])
        .filter((review) => review.decision === "approved")
        .at(-1) ?? null;
    const replanDocumentPath = contract.replanDocumentPath;
    const blockedFamilyTrackReview =
      familyTrackReviews.find((review) => review?.decision === "blocked") ??
      (legacyFamilyTrackReview?.decision === "blocked"
        ? legacyFamilyTrackReview
        : null);
    const latestFamilyRevalidationReview =
      scopedFamilyRevalidationReviews
        .filter(Boolean)
        .sort((left, right) => right.attempt - left.attempt)[0] ?? null;
    const replanTrigger = replanTriggerReview(
      replanReview,
      latestFamilyRevalidationReview,
      blockedFamilyTrackReview,
      solReviewBoard.reviews ?? []
    );
    const replanApproved =
      replanReview?.decision === "approved" &&
      typeof replanDocumentPath === "string" &&
      replanReview.replanDocumentPath === replanDocumentPath &&
      replanReview.replanDocumentSha256 === sha256File(replanDocumentPath) &&
      replanReview.supersedesBlockedReviewId ===
        replanTrigger?.reviewId &&
      JSON.stringify(replanReview.replanScopes ?? []) ===
        JSON.stringify(reviewScopes) &&
      replanReview.replanContractRevision === contract.replanContractRevision;
    const targetOutlineHash = jsonHash(expectedTargetOutline);
    const replanConsumed =
      replanApproved &&
      (contract.replanTargetSetRequired === false
        ? true
        : targetSetReview?.decision === "approved" &&
          targetSetReview.supersedesReplanReviewId === replanReview?.reviewId &&
          targetSetReview.replanContractRevision ===
            contract.replanContractRevision &&
          targetSetReview.targetOutlineSha256 === targetOutlineHash);
    const subWorkStatuses = subWorkItems.map((subWorkItem) => {
      const state = subWorkState.get(subWorkItem.workItemId) ?? {};
      const phase = {
        ...subWorkItem,
        completedOperations:
          state.completedOperations ?? subWorkItem.completedOperations,
        nextOperation: state.nextOperation ?? subWorkItem.nextOperation
      };
      assert(
        validateOperationCursor(
          phase.operationSequence,
          phase.completedOperations,
          phase.nextOperation
        ),
        `no-family-plan-subwork-state-cursor:${code}:${subWorkItem.workItemId}`
      );
      const review = solReviewByKey.get(
        reviewKey(
          code,
          "FAMILY_TRACK",
          phase.familyTrackId,
          phase.scopeId
        )
      );
      const reviewStatus = review?.decision ?? "pending";
      const retryState = rewindFamilyTrackForRetry(
        phase.operationSequence,
        phase.completedOperations,
        reviewStatus
      );
      const retryingFamilyTrack = retryState !== null;
      const effectivePhase = retryState
        ? { ...phase, ...retryState }
        : phase;
      return {
        ...effectivePhase,
        reviewStatus,
        reviewId: review?.reviewId ?? null,
        retryingFamilyTrack
      };
    });
    const nextSubWork = subWorkStatuses.find(
      (subWorkItem) => subWorkItem.reviewStatus !== "approved"
    ) ?? null;
    const nextSubWorkCursor =
      nextSubWork
        ? {
            workItemId: baseWorkItemId,
            standardCode: code,
            operationWorkItemId: `${nextSubWork.workItemId}-${nextSubWork.nextOperation}`,
            familyTrackId: nextSubWork.familyTrackId,
            scopeId: nextSubWork.scopeId,
            nextOperation: nextSubWork.nextOperation,
            contractRevision:
              approvedReplanReview?.replanContractRevision ??
              contract.replanContractRevision
          }
        : null;
    const consumedReplanRequestId = replanConsumesRequest({
      replanReview,
      replanApproved,
      replanConsumed
    }) &&
      replanReview?.supersedesBlockedReviewId &&
      (solReviewBoard.reviews ?? []).some(
        (review) =>
          review.reviewId === replanReview.supersedesBlockedReviewId &&
          review.operation === "SOL_REPLAN_REQUEST"
      )
      ? replanReview.supersedesBlockedReviewId
      : null;
    const latestSolReplanRequest = nextSubWorkCursor
      ? latestScopedSolReplanRequest(
          solReviewBoard.reviews,
          nextSubWorkCursor,
          consumedReplanRequestId
        )
      : null;
    const scopedFamilyTrackStatus = (() => {
      const decisions = scopedFamilyTrackReviews
        .filter(Boolean)
        .map((review) => review.decision);
      if (decisions.includes("blocked")) return "blocked";
      if (decisions.includes("changes-requested")) return "changes-requested";
      if (decisions.includes("stale")) return "stale";
      if (
        reviewScopes.length > 0 &&
        decisions.length === reviewScopes.length &&
        decisions.every((decision) => decision === "approved")
      ) {
        return "approved";
      }
      return "pending";
    })();
    const hasScopedFamilyTrackReview = scopedFamilyTrackReviews.some(Boolean);
    const familyTrackStatusBeforeRevalidation =
      replanConsumed && hasScopedFamilyTrackReview
        ? scopedFamilyTrackStatus
        : familyTrackReviewStatus;
    const familyRevalidationStatus = (() => {
      const decisions = scopedFamilyRevalidationReviews
        .filter(Boolean)
        .map((review) => review.decision);
      if (decisions.includes("blocked")) return "blocked";
      if (decisions.includes("changes-requested")) return "changes-requested";
      if (
        reviewScopes.length === 1 &&
        decisions.length === 1 &&
        decisions[0] === "approved"
      ) {
        return "approved";
      }
      return "pending";
    })();
    const revalidationArtifact =
      reviewScopes.length > 0
        ? readCurrentFamilyRevalidationArtifact(
            baseWorkItemId,
            code,
            reviewScopes,
            contract.familyId,
            contract
          )
        : null;
    const revalidationApproved =
      revalidationArtifact !== null &&
      scopedFamilyRevalidationReviews.some(
        (review) =>
          (() => {
            if (
              review?.decision !== "approved" ||
              review.artifactPath !==
                `reports/curriculum-execution/family-revalidation/${baseWorkItemId}.json` ||
              review.fingerprintSha256 !== revalidationArtifact.fingerprintSha256 ||
              !familyRevalidationArtifactIsCurrent(review)
            ) {
              return false;
            }
            const scopedFamilyReview = solReviewByKey.get(
              reviewKey(
                code,
                "FAMILY_TRACK",
                review.familyTrackId,
                review.scopeId
              )
            );
            const linkedFamilyReview =
              scopedFamilyReview ?? legacyFamilyTrackReview;
            return familyRevalidationSupersedes(review, linkedFamilyReview);
          })()
      );
    const familyTrackStatusForFlow = revalidationApproved
      ? "approved"
      : familyTrackStatusBeforeRevalidation;
    const learningMapBound = hasLearningMapBinding(learningMap, code);
    const targetSetReady =
      targetSetReviewStatus === "approved" &&
      (!replanApproved || replanConsumed);
    const linkedFamily = (current?.linkedFamilyIds?.length ?? 0) > 0;
    const familyValidated =
      revalidationApproved ||
      (current?.offlineFamilyIds?.length ?? 0) > 0 ||
      (current?.releasedFamilyIds?.length ?? 0) > 0;
    let operation;
    let reviewGate = null;
    const flowReplanTrigger = replanTriggerForFlow({
      rawTrigger: replanTrigger,
      replanConsumed,
      latestFamilyRevalidationReview,
      scopedFamilyTrackReviews,
      latestSolReplanRequest
    });
    const flowOperation = resolveFlowOperation({
      flowReplanTrigger,
      replanApproved,
      replanConsumed,
      nextSubWorkOperation: replanConsumed
        ? nextSubWork?.nextOperation ?? null
        : null
    });
    const blockedBySolReplan = flowOperation === "SOL_REPLAN";
    if (blockedBySolReplan) {
      nextAction = "sol-replan-required";
      operation = "SOL_REPLAN";
      reviewGate = null;
    } else if (flowOperation === "TARGET_SET") {
      nextAction = "review-target-set-and-design-family";
      operation = "TARGET_SET";
    } else if (
      familyTrackStatusForFlow === "stale" &&
      !revalidationArtifact
    ) {
      operation = "FAMILY_REVALIDATION";
      reviewGate = null;
    } else if (!learningMapBound) {
      operation = "LEARNING_MAP_BINDING";
    } else if (!targetSetReady) {
      operation = "TARGET_SET";
    } else if (targetSetReviewStatus !== "approved") {
      operation = "SOL_REVIEW";
      reviewGate = "TARGET_SET";
    } else if (
      familyTrackStatusForFlow === "stale" &&
      revalidationArtifact &&
      !revalidationApproved
    ) {
      operation = "SOL_REVIEW";
      reviewGate = "FAMILY_REVALIDATION";
    } else if (replanConsumed && nextSubWork) {
      operation = flowOperation ?? nextSubWork.nextOperation;
      if (operation === "SOL_REVIEW") {
        reviewGate = "FAMILY_TRACK";
      }
    } else if (!linkedFamily || !familyValidated) {
      operation = "FAMILY_TRACK";
    } else if (familyTrackStatusForFlow !== "approved") {
      operation = "SOL_REVIEW";
      reviewGate = "FAMILY_TRACK";
    } else if (nextAction === "capture-current-hash-live-evidence") {
      operation = "LIVE_EVIDENCE";
    } else if (nextAction === "complete") {
      operation = "BATCH_CLOSEOUT";
    } else {
      operation = "STANDARD_BINDING";
    }
    const operationId = operationWorkItemId(
      baseWorkItemId,
      operation,
      reviewGate,
      replanConsumed && nextSubWork ? nextSubWork : null
    );
    const dependencies = operationDependencies(
      baseWorkItemId,
      operation,
      reviewGate,
      familyTrackStatusForFlow,
      replanConsumed && nextSubWork ? nextSubWork : null
    );
    const allowedFiles = source.operationPolicy.allowedFilesByOperation[operation];
    assert(
      Array.isArray(allowedFiles) && allowedFiles.length > 0,
      `no-family-plan-operation-allowed-files:${operation}`
    );
    return {
      sequence: index + 1,
      workItemId: baseWorkItemId,
      batchId: batch.batchId,
      wave: batch.wave,
      standardCode: code,
      gradeBand: official.gradeBand,
      domain: official.domain,
      officialGoal: official.officialGoal,
      archetypeId: archetype.archetypeId,
      plannedFamilyId: contract.familyId,
      engineClassIds: contract.engineClassIds,
      engineCoreContract:
        resolveEngineCoreContract(
          contract,
          nextSubWork?.familyTrackId ?? null
        ) ?? null,
      reviewScopes,
      familySubWorkItems: subWorkStatuses,
      nextFamilySubWork: replanConsumed ? nextSubWork : null,
      subWorkStatePath: contract.subWorkStatePath ?? null,
      replanDocumentPath: contract.replanDocumentPath ?? null,
      replanContractRevision: contract.replanContractRevision ?? null,
      operation,
      operationWorkItemId: operationId,
      dependencyWorkItemIds: dependencies,
      allowedFiles,
      reviewGate,
      learningMapBound,
      targetOutlineSha256: jsonHash(expectedTargetOutline),
      expectedTargetOutline,
      expectedTargetCount: expectedTargetOutline.length,
      archetypeRole:
        code === archetype.anchorStandardCode ? "anchor" : "extension",
      splitRisk: archetype.splitRisk,
      nextAction,
      actionClass: blockedBySolReplan
        ? "blocked-needs-sol-replan"
        : operation === "SOL_REVIEW"
          ? "sol-review-required"
          : actionClass(nextAction),
      solReview: {
        targetSet: targetSetReviewStatus,
        familyTrack: familyTrackStatusForFlow,
        targetSetReviewId: targetSetReview?.reviewId ?? null,
        familyTrackReviewId: familyTrackReview?.reviewId ?? null,
        familyTrackReviewIds: familyTrackReviews
          .filter(Boolean)
          .map((review) => review.reviewId),
        replan: replanReview?.decision ?? "pending",
        replanApproved,
        replanConsumed,
        familyRevalidation: familyRevalidationStatus,
        revalidationApproved,
        revalidationArtifact: revalidationArtifact?.fingerprintSha256 ?? null,
        solReplanRequest: latestSolReplanRequest
          ? {
              reviewId: latestSolReplanRequest.reviewId,
              decision: latestSolReplanRequest.decision,
              blockerArtifactPath:
                latestSolReplanRequest.blockerArtifactPath,
              blockerArtifactSha256:
                latestSolReplanRequest.blockerArtifactSha256
            }
          : null
      }
    };
  });
  assert(workItems.length === plannedCodes.length, "no-family-plan-work-count");
  assert(
    new Set(workItems.map((item) => item.standardCode)).size ===
      workItems.length,
    "no-family-plan-work-duplicate"
  );

  const actionClassCounts = Object.fromEntries(
    [
      "planned-no-family",
      "offline-in-progress",
      "sol-review-required",
      "blocked-needs-sol-replan",
      "live-evidence",
      "complete"
    ].map((status) => [
      status,
      workItems.filter((item) => item.actionClass === status).length
    ])
  );
  const nextOfflineWork = workItems.find((item) =>
    ["planned-no-family", "offline-in-progress", "sol-review-required"].includes(
      item.actionClass
    )
  );
  const nextReplanWork = workItems.find(
    (item) => item.actionClass === "blocked-needs-sol-replan"
  );
  const nextLiveEvidenceWork = workItems.find(
    (item) => item.actionClass === "live-evidence"
  );
  const currentMatchesBaseline =
    currentNoFamilyCodes.length === source.baseline.expectedStandardCount &&
    stableCodeHash(currentNoFamilyCodes) === source.baseline.standardCodeSha256 &&
    codeOrderHash(currentNoFamilyCodes) ===
      source.baseline.standardWorkOrderSha256;
  const solReviewSummary = {
    totalRecords: solReviewBoard.reviews.length,
    approved: solReviewBoard.reviews.filter(
      (review) => review.decision === "approved"
    ).length,
    changesRequested: solReviewBoard.reviews.filter(
      (review) => review.decision === "changes-requested"
    ).length,
    blocked: solReviewBoard.reviews.filter(
      (review) => review.decision === "blocked"
    ).length,
    pendingRequiredReviews: workItems.reduce(
      (count, item) =>
        count +
        (item.solReview.targetSet === "pending" ? 1 : 0) +
        (item.solReview.familyTrack === "pending" ? 1 : 0),
      0
    )
  };

  return {
    schemaVersion: source.schemaVersion,
    planId: source.planId,
    purpose: source.purpose,
    baseline: {
      ...source.baseline,
      currentMatchesBaseline,
      currentNoFamilyCount: currentNoFamilyCodes.length,
      currentUnplannedNoFamilyCount: unplannedCurrentCodes.length
    },
    modelPolicy: source.modelPolicy,
    loopPolicy: source.loopPolicy,
    foundation: source.foundation,
    operationPolicy: source.operationPolicy,
    solReview: {
      ...source.solReview,
      boardPath: source.solReview.boardPath,
      records: solReviewBoard.reviews
    },
    targetOutlineSource: targetOutlines.source,
    workItemTypes: source.workItemTypes,
    nativeDiscoveryBundles: source.nativeDiscoveryBundles,
    familyAcceptanceGates: source.familyAcceptanceGates,
    planningGuardrails: source.planningGuardrails,
    estimate: source.estimate,
    current: {
      plannedStandardCount: plannedCodes.length,
      sharedEngineClassCount: source.sharedEngineClasses.length,
      concreteTrackCount: source.archetypes.length,
      concreteTrackCountsByDomain: Object.fromEntries(
        unique(source.archetypes.map((archetype) => archetype.domain)).map(
          (domain) => [
            domain,
            source.archetypes.filter(
              (archetype) => archetype.domain === domain
            ).length
          ]
        )
      ),
      expectedTargetCount: targetKeys.length,
      batchCount: source.batches.length,
      actionClassCounts,
      solReviewSummary,
      nextOfflineWork: nextOfflineWork ?? null,
      nextReplanWork: nextReplanWork ?? null,
      nextLiveEvidenceWork: nextLiveEvidenceWork ?? null
    },
    batches: source.batches.map((batch) => ({
      ...batch,
      standardCount: batch.archetypeIds.reduce(
        (sum, id) => sum + archetypeById.get(id).standardCodes.length,
        0
      )
    })),
    sharedEngineClasses: source.sharedEngineClasses,
    archetypes: source.archetypes,
    trackContracts: source.trackContracts,
    workItems
  };
}

function markdown(report) {
  const lines = [
    "# 97개 무-family 성취기준 실행 계획",
    "",
    `- 기준 성취기준: **${report.current.plannedStandardCount}개**`,
    `- shared RenderRecipe/engine class: **${report.current.sharedEngineClassCount}개**`,
    `- grade-band-safe concrete family track: **${report.current.concreteTrackCount}개**`,
    `- 영역별 track: **${Object.entries(report.current.concreteTrackCountsByDomain).map(([domain, count]) => `${domain} ${count}`).join(" · ")}**`,
    `- Sol expected AssessmentTarget outline: **${report.current.expectedTargetCount}개 / 97 standards**`,
    `- 실행 batch: **${report.current.batchCount}개**`,
    `- 현재 no-family: **${report.baseline.currentNoFamilyCount}개**`,
    `- 초기 집합 일치: **${report.baseline.currentMatchesBaseline ? "PASS" : "진행으로 감소"}**`,
    `- 누락된 현재 no-family: **${report.baseline.currentUnplannedNoFamilyCount}개**`,
    "",
    `- 최종 concrete family 계획 범위: **${report.estimate.finalConcreteProblemFamilyRange}개**`,
    `- 예상 Luna work item: **${report.estimate.expectedLunaWorkItemRuns}회**`,
    "",
    "> 84개 track은 최종 ProblemFamily 수가 아닙니다. AssessmentTarget 완전 분해에서 학생의 결정, 수학적 불변량, 관찰 증거가 달라지면 같은 track 안에서도 concrete family를 분리합니다.",
    "",
    "## 모델 역할",
    "",
    `- 전체 계획·재계획: **${report.modelPolicy.planning}**`,
    `- 반복 구현: **${report.modelPolicy.execution}**`,
    `- 독립 검토: **${report.modelPolicy.review}**`,
    `- 재계획 승격: **${report.modelPolicy.escalation}**`,
    `- 현재 환경 주의: ${report.modelPolicy.runtimeNote}`,
    "",
    "## 먼저 닫을 foundation",
    "",
    `- 기본 learning-map 결속: **${report.foundation.defaultLearningMapRecordsForPlan}/${report.current.plannedStandardCount}**`,
    `- pilot 포함 learning-map 결속: **${report.foundation.pilotInclusiveLearningMapRecordsForPlan}/${report.current.plannedStandardCount}**`,
    `- 추가 pinned record 필요: **${report.foundation.requiredPinnedLearningMapAdditions}개**`,
    `- 규칙: ${report.foundation.rule}`,
    `- bounded native discovery: **${report.estimate.boundedNativeDiscoveryBundles}개 묶음**`,
    "",
    "## 지금 선택된 작업",
    "",
    `- offline: ${report.current.nextOfflineWork ? `${report.current.nextOfflineWork.standardCode} · ${report.current.nextOfflineWork.archetypeId} · ${report.current.nextOfflineWork.nextAction}` : "없음"}`,
    `- Sol 재계획: ${report.current.nextReplanWork ? `${report.current.nextReplanWork.standardCode} · ${report.current.nextReplanWork.archetypeId} · ${report.current.nextReplanWork.nextAction}` : "없음"}`,
    `- live evidence: ${report.current.nextLiveEvidenceWork ? `${report.current.nextLiveEvidenceWork.standardCode} · ${report.current.nextLiveEvidenceWork.archetypeId}` : "없음"}`,
    "",
    "## Sol 독립 검토 게이트",
    "",
    `- reviewer: **${report.solReview.reviewerModel}**`,
    `- required after: **${report.solReview.requiredAfter.join(" · ")}**`,
    `- board: **${report.solReview.boardPath}**`,
    `- 승인 기록: **${report.current.solReviewSummary.approved}개** · 수정 요청: **${report.current.solReviewSummary.changesRequested}개** · 차단: **${report.current.solReviewSummary.blocked}개** · pending: **${report.current.solReviewSummary.pendingRequiredReviews}개**`,
    "- Sol은 구현 파일을 수정하지 않고 승인·수정요청·차단만 기록한다.",
    "- 승인 기록 없이 reviewed-complete·offline-validated·live-released 승격과 main push를 할 수 없다.",
    "",
    "## 실행 상태",
    "",
    "| 상태 | 성취기준 수 |",
    "|---|---:|",
    ...Object.entries(report.current.actionClassCounts).map(
      ([status, count]) => `| ${status} | ${count} |`
    ),
    "",
    "## 배치",
    "",
    "배치는 shared engine 생성·승격 checkpoint다. Luna의 실제 표준 순서는 아래 W001~W097이며 한 실행은 성취기준 한 개만 소유한다.",
    "",
    "| batch | wave | 목적 | family track | 성취기준 |",
    "|---|---:|---|---:|---:|",
    ...report.batches.map(
      (batch) =>
        `| ${batch.batchId} | ${batch.wave} | ${batch.purpose} | ${batch.archetypeIds.length} | ${batch.standardCount} |`
    ),
    "",
    "## 24개 shared engine",
    "",
    "| engine | class | native/contract 상태 |",
    "|---|---|---|",
    ...report.sharedEngineClasses.map(
      (engine) =>
        `| ${engine.engineClassId} | ${engine.title} | ${engine.nativeDependency} |`
    ),
    "",
    "## 84개 concrete family track",
    "",
    "| ID | 영역 | 학생의 결정 | 불변량 | 증거 | RenderRecipe/native | 위험 | 성취기준 |",
    "|---|---|---|---|---|---|---|---:|",
    ...report.archetypes.map(
      (archetype) =>
        `| ${archetype.archetypeId} | ${archetype.domain} | ${archetype.studentDecision} | ${archetype.invariant} | ${archetype.observableEvidence} | ${report.trackContracts[archetype.archetypeId].engineClassIds.join("+")} / ${archetype.nativeDependency} | ${archetype.splitRisk} | ${archetype.standardCodes.length} |`
    ),
    "",
    "## 97개 표준 작업 카드",
    "",
    "| work | operation | batch | 성취기준 | 학년군 | 영역 | track | engine | target 초안 hash | 역할 | Sol 검토 | 현재 동작 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...report.workItems.map(
      (item) =>
        `| ${item.operationWorkItemId} | ${item.operation} | ${item.batchId} | ${item.standardCode} | ${item.gradeBand} | ${item.domain} | ${item.archetypeId} | ${item.engineClassIds.join("+")} | ${item.targetOutlineSha256.slice(0, 12)} (${item.expectedTargetCount}) | ${item.archetypeRole} | target ${item.solReview.targetSet} / family ${item.solReview.familyTrack} | ${item.actionClass === "sol-review-required" ? "SOL_REVIEW" : item.nextAction} |`
    ),
    "",
    "## Family acceptance gate",
    "",
    ...report.familyAcceptanceGates.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "## Native discovery 묶음",
    "",
    ...report.nativeDiscoveryBundles.map(
      (bundle) => `- ${bundle.id} · ${bundle.required ? "필수" : "조건부"} · ${bundle.scope}`
    ),
    "",
    "## 재계획 hard stop",
    "",
    ...report.planningGuardrails.map((rule) => `- ${rule}`),
    ""
  ];
  return lines.join("\n");
}

const report = buildReport();
const json = `${JSON.stringify(report, null, 2)}\n`;
const md = markdown(report);

if (shouldWrite) {
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, json);
  writeFileSync(markdownPath, md);
  console.log(
    `no-family plan updated: ${report.current.plannedStandardCount} standards / ${report.current.sharedEngineClassCount} engines / ${report.current.concreteTrackCount} tracks / ${report.current.batchCount} batches`
  );
} else {
  let existingJson;
  let existingMarkdown;
  try {
    existingJson = readFileSync(jsonPath, "utf8");
    existingMarkdown = readFileSync(markdownPath, "utf8");
  } catch {
    throw new Error(
      "no-family plan report is missing; run pnpm curriculum:no-family-plan:update"
    );
  }
  if (existingJson !== json || existingMarkdown !== md) {
    throw new Error(
      "no-family plan report is stale; run pnpm curriculum:no-family-plan:update"
    );
  }
console.log(
    `no-family plan PASS: ${report.current.plannedStandardCount} standards / ${report.current.sharedEngineClassCount} engines / ${report.current.concreteTrackCount} tracks; next ${report.current.nextOfflineWork?.standardCode ?? "none"}; replan ${report.current.nextReplanWork?.standardCode ?? "none"}`
  );
}
