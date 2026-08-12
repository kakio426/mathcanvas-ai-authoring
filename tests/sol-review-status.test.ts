import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
// @ts-ignore Sol review gate is a repository-side ESM utility.
import * as solReviewStatus from "../scripts/curriculum/sol-review-status.mjs";
// @ts-ignore Semantic revalidation helper is a repository-side ESM utility.
import * as semanticSlices from "../scripts/curriculum/revalidation-semantic-slice.mjs";
// @ts-ignore The curriculum builder exports a repository-side contract validator.
import * as noFamilyPlanBuilder from "../scripts/curriculum/build-no-family-plan.mjs";

const {
  effectiveFamilyLifecycleStage,
  familyRevalidationSupersedes,
  latestScopedSolReplanRequest,
  nativeFamilyReviewStatus,
  replanTriggerForFlow,
  replanTriggerReview,
  resolveFlowOperation,
  rewindFamilyTrackForRetry,
  reviewCandidateIsCurrent,
  reviewImplementationFiles,
  reviewScopeMatches,
  solReplanRequestArtifactIsCurrent,
  solReplanRequestMatchesCursor,
  validateOperationCursor
} = solReviewStatus;
const { buildSemanticSlice, semanticSliceHash, semanticSliceIsCurrent } =
  semanticSlices;
const {
  assertFamilyTrackPostApprovalDerivedReportChain,
  assertEngineCoreContract,
  assertEngineCoreCompletionEvidence,
  resolveEngineCoreContract,
  replanConsumesRequest
} = noFamilyPlanBuilder;

const candidateCommit = "a".repeat(40);

function review(overrides: Record<string, unknown> = {}) {
  return {
    reviewId: "W999-FAMILY_TRACK-SOL-A1",
    standardCode: "[2수02-02]",
    operation: "FAMILY_TRACK",
    decision: "approved",
    attempt: 1,
    candidateCommit,
    changedFiles: ["packages/example.ts", "reports/example.json"],
    ...overrides
  };
}

function manifest(scope?: Record<string, string>) {
  return {
    renderRecipe: { kind: "native-render-recipe" },
    capability: { supportedStandardCodes: ["[2수02-02]"] },
    releaseEvidence: { lifecycleStage: "offline-validated" },
    ...(scope ? { solReviewScope: scope } : {})
  };
}

describe("Sol review candidate and scope gates", () => {
  it("orders FAMILY_TRACK post-approval reports from registry to the next cursor", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const report = JSON.parse(
      readFileSync("reports/curriculum-execution/no-family-plan.json", "utf8")
    );
    const chain = assertFamilyTrackPostApprovalDerivedReportChain(
      source.operationPolicy
    );
    expect(chain.map((step: { id: string }) => step.id)).toEqual([
      "problem-family-registry",
      "curriculum-coverage",
      "curriculum-execution",
      "no-family-plan"
    ]);
    const missingRegistry = JSON.parse(
      JSON.stringify(source.operationPolicy)
    );
    missingRegistry.postApprovalFilesByOperation.FAMILY_TRACK =
      missingRegistry.postApprovalFilesByOperation.FAMILY_TRACK.filter(
        (pattern: string) => pattern !== "reports/problem-family-registry/**"
      );
    expect(() =>
      assertFamilyTrackPostApprovalDerivedReportChain(missingRegistry)
    ).toThrow(
      "no-family-plan-family-track-derived-file-not-post-approval:reports/problem-family-registry/latest.json"
    );
    const wrongOrder = JSON.parse(JSON.stringify(source.operationPolicy));
    wrongOrder.postApprovalDerivedReportChainByOperation.FAMILY_TRACK.reverse();
    expect(() =>
      assertFamilyTrackPostApprovalDerivedReportChain(wrongOrder)
    ).toThrow("no-family-plan-family-track-post-approval-chain");

    const registry = JSON.parse(
      readFileSync("reports/problem-family-registry/latest.json", "utf8")
    );
    const repair = registry.families.find(
      (family: { familyId: string }) =>
        family.familyId === "pattern.declared-repeat.repair-v1"
    );
    expect(repair.solReviewStatus).toBe("approved");
    expect(repair.lifecycleStage).toBe("offline-validated");

    const execution = JSON.parse(
      readFileSync("reports/curriculum-execution/latest.json", "utf8")
    );
    const w002 = execution.breadthQueue.find(
      (row: { code: string }) => row.code === "[2수02-02]"
    );
    expect(w002.offlineCoveredTargetCount).toBe(2);
    expect(w002.liveCoveredTargetCount).toBe(0);
    const currentSubWorks = report.workItems.find(
      (item: { workItemId: string }) => item.workItemId === "W002"
    ).familySubWorkItems;
    const approvedRepair = currentSubWorks.find(
      (item: { familyTrackId: string }) =>
        item.familyTrackId === "pattern.declared-repeat.repair-v1"
    );
    expect(approvedRepair.reviewStatus).toBe("approved");
    expect(approvedRepair.reviewId).toBe(
      "W002-FAMILY_TRACK-repeat-repair-SOL-A4"
    );
    if (report.current.nextReplanWork?.workItemId === "W002") {
      expect(report.current.nextReplanWork.operation).toBe("SOL_REPLAN");
      expect(
        report.current.nextReplanWork.solReview.solReplanRequest?.reviewId
      ).toBe("W002-SOL_REPLAN_REQUEST-change-rule-SOL-A1");
    } else {
      expect(report.current.nextReplanWork).toBeNull();
    }
    const nextAfterApproval = currentSubWorks.find(
      (item: { reviewStatus: string }) => item.reviewStatus !== "approved"
    );
    expect(nextAfterApproval.familyTrackId).toBe(
      "pattern.change-rule.construct-v1"
    );
    expect(nextAfterApproval.nextOperation).toBe("ENGINE_CORE");
  });

  it("fails closed for incomplete student-constructed rule contracts", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const base = () =>
      JSON.parse(JSON.stringify(source.trackContracts.C01));
    expect(() => assertEngineCoreContract(base(), "C01")).not.toThrow();
    expect(
      base().engineCoreContract.manifestDecision.variantRoles
    ).toHaveLength(9);
    expect(
      base().engineCoreContract.manifestDecision.stateConstruction
        .sourceUseMode
    ).toBe("move-once-no-clone");
    expect(
      base().engineCoreContract.manifestDecision.stateConstruction
        .minimumCopiesPerDistinctValue
    ).toBe(3);
    expect(base().engineCoreContract.constraintCapacity).toEqual({
      maxSources: 12,
      requiredSources: 9
    });
    expect(base().engineCoreContract.layoutContract).toEqual({
      tokenSet: "w002-repeat-rule-construction-v1",
      sourceRoles: 9,
      ruleSlotRoles: 2,
      continuationTargetRoles: 4,
      minSlotWidth: 188,
      minSlotHeight: 188,
      allVisibleSimultaneously: true,
      containment: "native-rendered-bounds"
    });

    const missingCapacity = base();
    delete missingCapacity.engineCoreContract.constraintCapacity;
    expect(() => assertEngineCoreContract(missingCapacity, "C01")).toThrow(
      "no-family-plan-engine-core-capacity-contract-invalid:C01"
    );

    const tooFewTargets = base();
    tooFewTargets.engineCoreContract.manifestDecision.application.continuationTargetRoles.pop();
    expect(() => assertEngineCoreContract(tooFewTargets, "C01")).toThrow(
      "no-family-plan-engine-core-manifest-invalid:C01"
    );

    const wrongPeriod = base();
    wrongPeriod.engineCoreContract.manifestDecision.application.period = 1;
    expect(() => assertEngineCoreContract(wrongPeriod, "C01")).toThrow(
      "no-family-plan-engine-core-manifest-invalid:C01"
    );

    const missingVerificationRole = base();
    missingVerificationRole.engineCoreContract.runtimePredicate.parameters.verificationRoles.pop();
    expect(() => assertEngineCoreContract(missingVerificationRole, "C01")).toThrow(
      "no-family-plan-engine-core-runtime-binding-invalid:C01"
    );

    const impossibleDistinctness = base();
    impossibleDistinctness.engineCoreContract.manifestDecision.stateConstruction.minimumDistinctValues = 3;
    expect(() => assertEngineCoreContract(impossibleDistinctness, "C01")).toThrow(
      "no-family-plan-engine-core-manifest-invalid:C01"
    );

    const insufficientPhysicalPool = base();
    insufficientPhysicalPool.engineCoreContract.manifestDecision.variantRoles =
      insufficientPhysicalPool.engineCoreContract.manifestDecision.variantRoles.slice(
        0,
        8
      );
    insufficientPhysicalPool.engineCoreContract.manifestDecision.stateConstruction.sourceRoles =
      insufficientPhysicalPool.engineCoreContract.manifestDecision.stateConstruction.sourceRoles.slice(
        0,
        8
      );
    insufficientPhysicalPool.engineCoreContract.runtimePredicate.parameters.variantRoles =
      insufficientPhysicalPool.engineCoreContract.runtimePredicate.parameters.variantRoles.slice(
        0,
        8
      );
    insufficientPhysicalPool.engineCoreContract.runtimePredicate.parameters.stateConstruction.sourceRoles =
      insufficientPhysicalPool.engineCoreContract.runtimePredicate.parameters.stateConstruction.sourceRoles.slice(
        0,
        8
      );
    expect(() => assertEngineCoreContract(insufficientPhysicalPool, "C01")).toThrow(
      "no-family-plan-engine-core-manifest-invalid:C01"
    );

    const tooManyContinuationTargets = base();
    tooManyContinuationTargets.engineCoreContract.manifestDecision.application.continuationTargetRoles.push(
      "continuation-slot-5",
      "continuation-slot-6"
    );
    tooManyContinuationTargets.engineCoreContract.manifestDecision.application.minimumTargetCount = 6;
    expect(() => assertEngineCoreContract(tooManyContinuationTargets, "C01")).toThrow(
      "no-family-plan-engine-core-manifest-invalid:C01"
    );

    const nonPeriodicContinuationTargets = base();
    nonPeriodicContinuationTargets.engineCoreContract.manifestDecision.application.continuationTargetRoles.push(
      "continuation-slot-5"
    );
    expect(() => assertEngineCoreContract(nonPeriodicContinuationTargets, "C01")).toThrow(
      "no-family-plan-engine-core-manifest-invalid:C01"
    );
  });

  it("requires current ENGINE_CORE completion evidence before FAMILY_TRACK", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const contract = source.trackContracts.C01;
    const planned = contract.subWorkItems.find(
      (item: { workItemId: string }) =>
        item.workItemId === "W002-FAMILY_TRACK-repeat-rule"
    );
    const artifactPath = contract.engineCoreContract.artifactContract.artifactPath;
    const pending = {
      workItemId: planned.workItemId,
      completedOperations: ["AFFORDANCE_DISCOVERY"],
      nextOperation: "ENGINE_CORE"
    };
    expect(() =>
      assertEngineCoreCompletionEvidence(pending, planned, contract)
    ).not.toThrow();

    if (!existsSync(artifactPath)) {
      expect(() =>
        assertEngineCoreCompletionEvidence(
          {
            ...pending,
            completedOperations: ["AFFORDANCE_DISCOVERY", "ENGINE_CORE"],
            nextOperation: "FAMILY_TRACK"
          },
          planned,
          contract
        )
      ).toThrow("no-family-plan-subwork-engine-core-evidence-required");
      return;
    }

    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    const artifactSha256 = createHash("sha256")
      .update(readFileSync(artifactPath))
      .digest("hex");

    const completed = {
      ...pending,
      completedOperations: ["AFFORDANCE_DISCOVERY", "ENGINE_CORE"],
      nextOperation: "FAMILY_TRACK",
      completionEvidenceByOperation: {
        ENGINE_CORE: { artifactPath, artifactSha256 }
      }
    };
    expect(() =>
      assertEngineCoreCompletionEvidence(completed, planned, contract)
    ).not.toThrow();

    expect(() =>
      assertEngineCoreCompletionEvidence(
        {
          ...completed,
          completionEvidenceByOperation: {
            ENGINE_CORE: { artifactPath, artifactSha256: "0".repeat(64) }
          }
        },
        planned,
        contract
      )
    ).toThrow("no-family-plan-subwork-engine-core-evidence-stale");
    expect(() =>
      assertEngineCoreCompletionEvidence(
        {
          ...completed,
          completionEvidenceByOperation: undefined
        },
        planned,
        contract
      )
    ).toThrow("no-family-plan-subwork-engine-core-evidence-required");
    expect(() =>
      assertEngineCoreCompletionEvidence(
        {
          ...pending,
          completionEvidenceByOperation: {
            ENGINE_CORE: { artifactPath, artifactSha256 }
          }
        },
        planned,
        contract
      )
    ).toThrow("no-family-plan-subwork-engine-core-evidence-before-completion");
    expect(artifact.status).toBe("implemented-verified-pending-family-track");
  });

  it("preserves repeat-repair v12 completion evidence under the v14 contract", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const contract = source.trackContracts.C01;
    const planned = contract.subWorkItems.find(
      (item: { workItemId: string }) =>
        item.workItemId === "W002-FAMILY_TRACK-repeat-repair"
    );
    const artifactContract = resolveEngineCoreContract(
      contract,
      planned.familyTrackId
    ).artifactContract;
    expect(contract.replanContractRevision).toBe("W002-SOL-REPLAN-v14");
    expect(artifactContract.pendingStatus).toBe(
      "planned-pending-engine-core"
    );
    expect(artifactContract.pendingContractRevision).toBe(
      "W002-SOL-REPLAN-v11"
    );
    expect(artifactContract.completionStatus).toBe(
      "implemented-verified-pending-family-track"
    );
    expect(artifactContract.completionContractRevision).toBe(
      "W002-SOL-REPLAN-v12"
    );

    const artifactPath = artifactContract.artifactPath;
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    const artifactSha256 = createHash("sha256")
      .update(readFileSync(artifactPath))
      .digest("hex");
    const pending = {
      workItemId: planned.workItemId,
      completedOperations: [],
      nextOperation: "ENGINE_CORE"
    };
    const completed = {
      workItemId: planned.workItemId,
      completedOperations: ["ENGINE_CORE"],
      nextOperation: "FAMILY_TRACK",
      completionEvidenceByOperation: {
        ENGINE_CORE: { artifactPath, artifactSha256 }
      }
    };

    if (artifact.status === artifactContract.pendingStatus) {
      expect(artifact.replanContractRevision).toBe(
        artifactContract.pendingContractRevision
      );
      expect(() =>
        assertEngineCoreCompletionEvidence(pending, planned, contract)
      ).not.toThrow();
      expect(() =>
        assertEngineCoreCompletionEvidence(completed, planned, contract)
      ).toThrow("no-family-plan-subwork-engine-core-evidence-invalid");
    } else {
      expect(artifact.status).toBe(artifactContract.completionStatus);
      expect(artifact.replanContractRevision).toBe(
        artifactContract.completionContractRevision
      );
      expect(() =>
        assertEngineCoreCompletionEvidence(completed, planned, contract)
      ).not.toThrow();
    }
  });

  it("projects the W002 engine-core contract into the generated loop work item", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const report = JSON.parse(
      readFileSync("reports/curriculum-execution/no-family-plan.json", "utf8")
    );
    const workItem = report.workItems.find(
      (item: { workItemId: string }) => item.workItemId === "W002"
    );
    const expected = resolveEngineCoreContract(
      source.trackContracts.C01,
      workItem.nextFamilySubWork?.familyTrackId ??
        workItem.engineCoreContract.familyTrackId
    );
    expect(expected).toBeDefined();
    expect(workItem.engineCoreContract).toEqual(expected);
    expect(source.planningGuardrails).toContain(
      "operation manifest 밖의 exact changedFiles는 SCOPE_VIOLATION finding을 가진 blocked review로만 보존하며 승인·post-approval 권한을 넓히지 않는다."
    );
    if (workItem.engineCoreContract.contractKind === "observable-change") {
      expect(
        workItem.engineCoreContract.runtimePredicate.parameters.ruleStatePath
      ).toBe("studentChangeRuleState");
      expect(
        workItem.engineCoreContract.manifestDecision.application
          .sequenceStatePath
      ).toBe("constructedSequenceState");
      expect(workItem.engineCoreContract.manifestDecision.repair).toMatchObject({
        wrongIndexPath: "misalignedTermIndex",
        requiresOnlyWrongIndexChanges: true
      });
    } else {
      expect(
        workItem.engineCoreContract.runtimePredicate.parameters
          .continuationRuleStatePath
      ).toBe("declaredRuleState");
      expect(
        workItem.engineCoreContract.runtimePredicate.parameters
          .explanationRuleStatePath
      ).toBe("declaredRuleState");
      expect(
        workItem.engineCoreContract.manifestDecision.stateLifecycle
          .selectionOutputStatePath
      ).toBe("declaredRuleState");
    }
    const currentProjection = [
      report.current.nextOfflineWork,
      report.current.nextReplanWork
    ].find(
      (item: { workItemId?: string } | null | undefined) =>
        item?.workItemId === "W002"
    );
    expect(currentProjection?.engineCoreContract).toEqual(expected);
    if (report.current.nextReplanWork?.workItemId === "W002") {
      expect(report.current.nextReplanWork.operation).toBe("SOL_REPLAN");
      expect(report.current.nextReplanWork.replanContractRevision).toBe(
        "W002-SOL-REPLAN-v14"
      );
      const trigger =
        report.current.nextReplanWork.solReview.solReplanRequest;
      if (trigger) {
        expect(trigger.reviewId).toBe(
          "W002-SOL_REPLAN_REQUEST-change-rule-SOL-A1"
        );
      } else {
        expect(
          report.current.nextReplanWork.solReview.familyTrackReviewIds
        ).toContain("W002-FAMILY_TRACK-repeat-repair-SOL-A2");
      }
      expect(report.current.nextReplanWork.solReview.replanApproved).toBe(
        false
      );
      expect(report.current.nextReplanWork.solReview.replanConsumed).toBe(
        false
      );
    } else {
      const nextOffline = report.current.nextOfflineWork;
      expect(nextOffline?.workItemId).toBe("W002");
      expect(["ENGINE_CORE", "FAMILY_TRACK"]).toContain(
        nextOffline?.operation
      );
      expect(nextOffline?.solReview.replanApproved).toBe(true);
      expect(nextOffline?.solReview.replanConsumed).toBe(true);
      expect(report.current.nextReplanWork).toBeNull();

      const state = JSON.parse(
        readFileSync(
          "reports/curriculum-execution/subwork-state/W002.json",
          "utf8"
        )
      );
      const activeStateItem = state.items.find(
        (item: { workItemId: string }) =>
          item.workItemId === nextOffline.nextFamilySubWork?.workItemId
      );
      const repeatRuleStateItem = state.items.find(
        (item: { workItemId: string }) =>
          item.workItemId === "W002-FAMILY_TRACK-repeat-rule"
      );
      const activePlannedItem = workItem.familySubWorkItems.find(
        (item: { workItemId: string }) =>
          item.workItemId === nextOffline.nextFamilySubWork?.workItemId
      );
      expect(activePlannedItem).toBeDefined();
      expect(nextOffline.operationWorkItemId).toBe(
        `${activePlannedItem.workItemId}-${nextOffline.operation}`
      );
      const completedPrefix = activePlannedItem.operationSequence.slice(
        0,
        activePlannedItem.operationSequence.indexOf(nextOffline.operation)
      );
      expect(activeStateItem?.completedOperations).toEqual(completedPrefix);
      expect(activeStateItem?.nextOperation).toBe(nextOffline.operation);
      expect(
        repeatRuleStateItem?.completionEvidenceByOperation?.ENGINE_CORE
          ?.artifactPath
      ).toContain("repeat-rule-engine-core-v10-compat");

      if (nextOffline?.operation === "ENGINE_CORE") {
        const engineCoreFamily = nextOffline.nextFamilySubWork?.familyTrackId;
        expect(nextOffline.operationWorkItemId).toBe(
          `${nextOffline.nextFamilySubWork?.workItemId}-ENGINE_CORE`
        );
        expect(nextOffline.nextFamilySubWork?.nextOperation).toBe(
          "ENGINE_CORE"
        );
        expect([
          "pattern.declared-repeat.repair-v1",
          "pattern.change-rule.construct-v1"
        ]).toContain(engineCoreFamily);
        expect(activeStateItem?.completionEvidenceByOperation).toBeUndefined();
      } else {
        expect(nextOffline?.operationWorkItemId).toBe(
          "W002-FAMILY_TRACK-repeat-repair-FAMILY_TRACK"
        );
        expect(nextOffline?.nextFamilySubWork?.nextOperation).toBe(
          "FAMILY_TRACK"
        );
        expect(activeStateItem?.completedOperations).toEqual(["ENGINE_CORE"]);
        const evidence =
          activeStateItem?.completionEvidenceByOperation?.ENGINE_CORE;
        const artifactPath =
          expected.artifactContract.artifactPath;
        expect(evidence?.artifactPath).toBe(artifactPath);
        expect(evidence?.artifactSha256).toBe(
          createHash("sha256")
            .update(readFileSync(artifactPath))
            .digest("hex")
        );
      }
    }
  });

  it("resolves repair ENGINE_CORE by family and never falls back to repeat-rule evidence", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const contract = source.trackContracts.C01;
    const repairFamily = "pattern.declared-repeat.repair-v1";
    const repair = resolveEngineCoreContract(contract, repairFamily);
    const repeat = resolveEngineCoreContract(
      contract,
      "pattern.repeat-unit.construct-v1"
    );
    expect(repair.artifactContract.artifactPath).toContain(
      "repeat-repair-engine-core-v11"
    );
    expect(repair.artifactContract.artifactPath).not.toBe(
      repeat.artifactContract.artifactPath
    );
    const withoutRepairRef = JSON.parse(JSON.stringify(contract));
    delete withoutRepairRef.engineCoreContractsByFamilyTrack[repairFamily];
    expect(() =>
      resolveEngineCoreContract(withoutRepairRef, repairFamily)
    ).toThrow(
      "no-family-plan-engine-core-contract-ref-missing:pattern.declared-repeat.repair-v1"
    );

    const planned = contract.subWorkItems.find(
      (item: { workItemId: string }) =>
        item.workItemId === "W002-FAMILY_TRACK-repeat-repair"
    );
    expect(() =>
      assertEngineCoreCompletionEvidence(
        {
          workItemId: planned.workItemId,
          completedOperations: ["ENGINE_CORE"],
          nextOperation: "FAMILY_TRACK",
          completionEvidenceByOperation: {
            ENGINE_CORE: {
              artifactPath: repeat.artifactContract.artifactPath,
              artifactSha256: "0".repeat(64)
            }
          }
        },
        planned,
        contract
      )
    ).toThrow("no-family-plan-subwork-engine-core-evidence-required");
  });

  it("resolves an educationally separate change-rule ENGINE_CORE contract", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const contract = source.trackContracts.C01;
    const changeFamily = "pattern.change-rule.construct-v1";
    const change = resolveEngineCoreContract(contract, changeFamily);
    expect(change.contractKind).toBe("observable-change");
    expect(change.familyTrackId).toBe(changeFamily);
    expect(change.scopeId).toBe("W002-FAMILY_TRACK-change-rule");
    expect(change.manifestDecision).toMatchObject({
      mode: "construct-change-rule",
      ruleStatePath: "studentChangeRuleState",
      stateFields: ["startValue", "stepMagnitude", "direction"],
      initialState: "empty",
      answerMode: "conditional-rubric"
    });
    expect(change.manifestDecision.application).toMatchObject({
      sequenceStatePath: "constructedSequenceState",
      transition: "next-equals-current-plus-signed-step",
      minimumVisibleTerms: 4
    });
    expect(change.manifestDecision.repair).toMatchObject({
      wrongIndexPath: "misalignedTermIndex",
      derivation: "replace-with-declared-transition-value",
      requiresOnlyWrongIndexChanges: true
    });
    expect(change.artifactContract.pendingStatus).toBe(
      "planned-pending-engine-core"
    );
    expect(change.artifactContract.pendingContractRevision).toBe(
      "W002-SOL-REPLAN-v14"
    );

    const withoutChangeRef = JSON.parse(JSON.stringify(contract));
    delete withoutChangeRef.engineCoreContractsByFamilyTrack[changeFamily];
    expect(() =>
      resolveEngineCoreContract(withoutChangeRef, changeFamily)
    ).toThrow(
      "no-family-plan-engine-core-contract-ref-missing:pattern.change-rule.construct-v1"
    );
    expect(() => assertEngineCoreContract(withoutChangeRef, "C01")).toThrow(
      "no-family-plan-engine-core-contract-override-coverage-invalid:C01"
    );

    const wrongKind = JSON.parse(JSON.stringify(contract));
    wrongKind.engineCoreContractsByFamilyTrack[changeFamily] = JSON.parse(
      JSON.stringify(
        wrongKind.engineCoreContractsByFamilyTrack[
          "pattern.declared-repeat.repair-v1"
        ]
      )
    );
    expect(() => assertEngineCoreContract(wrongKind, "C01")).toThrow(
      "no-family-plan-engine-core-contract-override-layout-invalid:C01:pattern.change-rule.construct-v1"
    );

    const wrongPath = JSON.parse(JSON.stringify(contract));
    wrongPath.engineCoreContractsByFamilyTrack[
      changeFamily
    ].runtimePredicate.parameters.ruleStatePath = "declaredRuleState";
    expect(() => assertEngineCoreContract(wrongPath, "C01")).toThrow(
      "no-family-plan-change-rule-runtime-binding-invalid:C01:pattern.change-rule.construct-v1"
    );

    const aliasedArtifact = JSON.parse(JSON.stringify(contract));
    aliasedArtifact.engineCoreContractsByFamilyTrack[
      changeFamily
    ].artifactContract.artifactPath =
      aliasedArtifact.engineCoreContractsByFamilyTrack[
        "pattern.declared-repeat.repair-v1"
      ].artifactContract.artifactPath;
    expect(() => assertEngineCoreContract(aliasedArtifact, "C01")).toThrow(
      "no-family-plan-change-rule-artifact-contract-invalid:C01:pattern.change-rule.construct-v1"
    );

    const planned = contract.subWorkItems.find(
      (item: { workItemId: string }) =>
        item.workItemId === "W002-FAMILY_TRACK-change-rule"
    );
    expect(() =>
      assertEngineCoreCompletionEvidence(
        {
          workItemId: planned.workItemId,
          completedOperations: [],
          nextOperation: "ENGINE_CORE"
        },
        planned,
        contract
      )
    ).not.toThrow();
  });

  it("invalidates an approval when a candidate implementation file changes afterwards", () => {
    const base = (args: string[]) => {
      if (args[0] === "diff-tree") {
        return "packages/example.ts\nreports/example.json\n";
      }
      if (args[0] === "diff") {
        return "scripts/curriculum/sol-review-board.json\nreports/example.json\n";
      }
      return "";
    };
    expect(reviewCandidateIsCurrent(review(), base)).toBe(true);

    const stale = (args: string[]) =>
      args[0] === "diff"
        ? "packages/example.ts\nreports/example.json\n"
        : base(args);
    expect(reviewCandidateIsCurrent(review(), stale)).toBe(false);
  });

  it("does not invalidate a target review for an unrelated shared target index change", () => {
    expect(
      reviewImplementationFiles({
        operation: "TARGET_SET",
        changedFiles: [
          "packages/curriculum/src/assessment-targets.ts",
          "packages/curriculum/src/assessment-targets/data-table-2su04-02.ts"
        ]
      })
    ).toEqual([
      "packages/curriculum/src/assessment-targets/data-table-2su04-02.ts"
    ]);
  });

  it("requires both familyTrackId and scopeId for a scoped family review", () => {
    const scope = {
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    };
    expect(reviewScopeMatches(review(), scope)).toBe(false);
    expect(
      reviewScopeMatches(review({ ...scope }), scope)
    ).toBe(true);
  });

  it("does not reuse an unscoped approval for a different family track", () => {
    const scope = {
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    };
    const board = { reviews: [review()] };
    const candidateIsCurrent = () => true;
    expect(nativeFamilyReviewStatus(manifest(scope), board, candidateIsCurrent)).toBe(
      "pending"
    );
    expect(
      nativeFamilyReviewStatus(
        manifest(scope),
        { reviews: [review({ ...scope })] },
        candidateIsCurrent
      )
    ).toBe("approved");
  });

  it("downgrades stale approvals so released evidence is not counted", () => {
    const scope = {
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    };
    const board = { reviews: [review({ ...scope })] };
    const stale = () => false;
    expect(nativeFamilyReviewStatus(manifest(scope), board, stale)).toBe("stale");
    expect(effectiveFamilyLifecycleStage(manifest(scope), board, stale)).toBe(
      "generatable"
    );
  });

  it("requires a contiguous sub-work phase cursor", () => {
    const sequence = ["AFFORDANCE_DISCOVERY", "ENGINE_CORE", "FAMILY_TRACK", "SOL_REVIEW"];
    expect(validateOperationCursor(sequence, [], "AFFORDANCE_DISCOVERY")).toBe(true);
    expect(
      validateOperationCursor(sequence, ["AFFORDANCE_DISCOVERY"], "ENGINE_CORE")
    ).toBe(true);
    expect(
      validateOperationCursor(sequence, ["AFFORDANCE_DISCOVERY", "FAMILY_TRACK"], "SOL_REVIEW")
    ).toBe(false);
    expect(
      validateOperationCursor(sequence, ["AFFORDANCE_DISCOVERY", "ENGINE_CORE"], "SOL_REVIEW")
    ).toBe(false);
  });

  it("links a first revalidation attempt to a legacy family review separately", () => {
    const familyReview = review({ reviewId: "W001-FAMILY_TRACK-SOL-A3" });
    expect(
      familyRevalidationSupersedes(
        {
          operation: "FAMILY_REVALIDATION",
          supersedesReviewId: null,
          supersedesFamilyTrackReviewId: "W001-FAMILY_TRACK-SOL-A3"
        },
        familyReview
      )
    ).toBe(true);
    expect(
      familyRevalidationSupersedes(
        {
          operation: "FAMILY_REVALIDATION",
          supersedesReviewId: "W001-FAMILY_REVALIDATION-SOL-A1",
          supersedesFamilyTrackReviewId: "W001-FAMILY_TRACK-SOL-A3"
        },
        familyReview
      )
    ).toBe(true);
    expect(
      familyRevalidationSupersedes(
        {
          operation: "FAMILY_REVALIDATION",
          supersedesReviewId: null,
          supersedesFamilyTrackReviewId: "W001-FAMILY_TRACK-SOL-A2"
        },
        familyReview
      )
    ).toBe(false);
  });

  it("rewinds a changed family review to implementation instead of looping SOL_REVIEW", () => {
    const sequence = ["AFFORDANCE_DISCOVERY", "ENGINE_CORE", "FAMILY_TRACK", "SOL_REVIEW"];
    expect(
      rewindFamilyTrackForRetry(
        sequence,
        ["AFFORDANCE_DISCOVERY", "ENGINE_CORE", "FAMILY_TRACK"],
        "changes-requested"
      )
    ).toEqual({
      completedOperations: ["AFFORDANCE_DISCOVERY", "ENGINE_CORE"],
      nextOperation: "FAMILY_TRACK"
    });
    expect(
      rewindFamilyTrackForRetry(sequence, ["AFFORDANCE_DISCOVERY"], "changes-requested")
    ).toBe(null);
  });

  it("keeps a replan trigger alive after its family revalidation is approved", () => {
    const blockedRevalidation = review({
      reviewId: "W001-FAMILY_REVALIDATION-SOL-A1",
      operation: "FAMILY_REVALIDATION",
      decision: "changes-requested"
    });
    const approvedRevalidation = {
      ...blockedRevalidation,
      reviewId: "W001-FAMILY_REVALIDATION-SOL-A2",
      decision: "approved",
      attempt: 2,
      supersedesReviewId: blockedRevalidation.reviewId
    };
    const replan = {
      ...review({
        reviewId: "W001-SOL_REPLAN-SOL-A2",
        operation: "SOL_REPLAN",
        supersedesBlockedReviewId: blockedRevalidation.reviewId
      })
    };

    expect(
      replanTriggerReview(
        replan,
        blockedRevalidation,
        null,
        [blockedRevalidation, approvedRevalidation]
      )
    ).toBe(blockedRevalidation);
    expect(
      replanTriggerReview(
        replan,
        approvedRevalidation,
        null,
        [blockedRevalidation, approvedRevalidation]
      )
    ).toBe(blockedRevalidation);
  });

  it("does not resurrect a consumed legacy blocker and rewinds scoped changes", () => {
    const legacyBlocked = review({
      reviewId: "W002-FAMILY_TRACK-SOL-A4",
      decision: "blocked"
    });
    expect(
      replanTriggerForFlow({
        rawTrigger: legacyBlocked,
        replanConsumed: false,
        scopedFamilyTrackReviews: []
      })
    ).toBe(legacyBlocked);
    expect(
      replanTriggerForFlow({
        rawTrigger: legacyBlocked,
        replanConsumed: true,
        scopedFamilyTrackReviews: []
      })
    ).toBe(null);

    const scopedChanges = review({
      reviewId: "W002-FAMILY_TRACK-repeat-rule-SOL-A1",
      decision: "changes-requested",
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    });
    expect(
      replanTriggerForFlow({
        rawTrigger: legacyBlocked,
        replanConsumed: true,
        scopedFamilyTrackReviews: [scopedChanges]
      })
    ).toBe(null);
    expect(
      resolveFlowOperation({
        flowReplanTrigger: null,
        replanApproved: true,
        replanConsumed: true,
        nextSubWorkOperation: "FAMILY_TRACK"
      })
    ).toBe("FAMILY_TRACK");

    const scopedBlocked = { ...scopedChanges, decision: "blocked" };
    const blockedTrigger = replanTriggerForFlow({
      rawTrigger: legacyBlocked,
      replanConsumed: true,
      scopedFamilyTrackReviews: [scopedBlocked]
    });
    expect(blockedTrigger).toBe(scopedBlocked);
    expect(
      resolveFlowOperation({
        flowReplanTrigger: blockedTrigger,
        replanApproved: true,
        replanConsumed: true,
        nextSubWorkOperation: "FAMILY_TRACK"
      })
    ).toBe("SOL_REPLAN");
  });

  it("routes a new family revalidation blocker after replan consumption", () => {
    const revalidation = review({
      reviewId: "W001-FAMILY_REVALIDATION-SOL-A1",
      operation: "FAMILY_REVALIDATION",
      decision: "blocked"
    });
    const trigger = replanTriggerForFlow({
      rawTrigger: review({ decision: "blocked" }),
      replanConsumed: true,
      latestFamilyRevalidationReview: revalidation
    });
    expect(trigger).toBe(revalidation);
    expect(
      resolveFlowOperation({
        flowReplanTrigger: trigger,
        replanApproved: true,
        replanConsumed: true,
        nextSubWorkOperation: "FAMILY_TRACK"
      })
    ).toBe("SOL_REPLAN");
  });

  it("routes only a current scoped SOL_REPLAN_REQUEST for the exact operation cursor", () => {
    const blockerArtifactPath =
      "reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-repair-lifecycle-preflight-v11.json";
    const blockerArtifactSha256 = createHash("sha256")
      .update(readFileSync(blockerArtifactPath))
      .digest("hex");
    const cursor = {
      workItemId: "W002",
      standardCode: "[2수02-02]",
      operationWorkItemId:
        "W002-FAMILY_TRACK-repeat-repair-ENGINE_CORE",
      familyTrackId: "pattern.declared-repeat.repair-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-repair",
      nextOperation: "ENGINE_CORE",
      contractRevision: "W002-SOL-REPLAN-v10"
    };
    const request = review({
      reviewId: "W002-SOL_REPLAN_REQUEST-repeat-repair-SOL-A2",
      workItemId: "W002",
      operation: "SOL_REPLAN_REQUEST",
      decision: "blocked",
      operationWorkItemId: cursor.operationWorkItemId,
      familyTrackId: cursor.familyTrackId,
      scopeId: cursor.scopeId,
      blockedOperation: cursor.nextOperation,
      blockedContractRevision: cursor.contractRevision,
      blockerArtifactPath,
      blockerArtifactSha256
    });
    const candidateIsCurrent = () => true;

    expect(solReplanRequestArtifactIsCurrent(request)).toBe(true);
    expect(
      solReplanRequestMatchesCursor(
        request,
        cursor,
        candidateIsCurrent
      )
    ).toBe(true);
    expect(
      latestScopedSolReplanRequest(
        [request],
        cursor,
        null,
        candidateIsCurrent
      )
    ).toBe(request);
    expect(
      replanTriggerForFlow({
        rawTrigger: review({
          reviewId: "W002-FAMILY_TRACK-repeat-rule-SOL-A2",
          decision: "blocked"
        }),
        replanConsumed: true,
        latestSolReplanRequest: request
      })
    ).toBe(request);
    expect(
      replanTriggerForFlow({
        rawTrigger: review({
          reviewId: "W002-FAMILY_TRACK-repeat-rule-SOL-A2",
          decision: "blocked"
        }),
        replanConsumed: false,
        latestSolReplanRequest: request
      })
    ).toBe(request);

    expect(
      solReplanRequestMatchesCursor(
        request,
        { ...cursor, operationWorkItemId: "W002-other-ENGINE_CORE" },
        candidateIsCurrent
      )
    ).toBe(false);
    expect(
      solReplanRequestMatchesCursor(
        request,
        { ...cursor, nextOperation: "FAMILY_TRACK" },
        candidateIsCurrent
      )
    ).toBe(false);
    expect(
      latestScopedSolReplanRequest(
        [request],
        cursor,
        request.reviewId,
        candidateIsCurrent
      )
    ).toBe(null);
    expect(
      replanTriggerForFlow({
        rawTrigger: request,
        replanConsumed: true,
        latestSolReplanRequest: request,
        nextSubWorkOperation: "ENGINE_CORE"
      })
    ).toBe(null);
  });

  it("rejects stale, non-blocked, and artifact-mismatched SOL_REPLAN_REQUEST records", () => {
    const blockerArtifactPath =
      "reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-repair-lifecycle-preflight-v11.json";
    const artifactSha256 = createHash("sha256")
      .update(readFileSync(blockerArtifactPath))
      .digest("hex");
    const baseRequest = review({
      workItemId: "W002",
      operation: "SOL_REPLAN_REQUEST",
      decision: "blocked",
      operationWorkItemId:
        "W002-FAMILY_TRACK-repeat-repair-ENGINE_CORE",
      familyTrackId: "pattern.declared-repeat.repair-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-repair",
      blockedOperation: "ENGINE_CORE",
      blockedContractRevision: "W002-SOL-REPLAN-v10",
      blockerArtifactPath,
      blockerArtifactSha256: artifactSha256
    });
    expect(
      solReplanRequestArtifactIsCurrent({
        ...baseRequest,
        decision: "approved"
      })
    ).toBe(false);
    expect(
      solReplanRequestArtifactIsCurrent({
        ...baseRequest,
        blockerArtifactSha256: "0".repeat(64)
      })
    ).toBe(false);
    expect(
      solReplanRequestArtifactIsCurrent({
        ...baseRequest,
        familyTrackId: "pattern.change-rule.construct-v1"
      })
    ).toBe(false);
    expect(
      solReplanRequestMatchesCursor(
        baseRequest,
        {
          workItemId: "W002",
          standardCode: "[2수02-02]",
          operationWorkItemId:
            "W002-FAMILY_TRACK-repeat-repair-ENGINE_CORE",
          familyTrackId: "pattern.declared-repeat.repair-v1",
          scopeId: "W002-FAMILY_TRACK-repeat-repair",
          nextOperation: "ENGINE_CORE",
          contractRevision: "W002-SOL-REPLAN-v10"
        },
        () => false
      )
    ).toBe(false);
  });

  it("keeps W002 blocker lineage in the scoped request, not legacy state", () => {
    const state = JSON.parse(
      readFileSync(
        "reports/curriculum-execution/subwork-state/W002.json",
        "utf8"
      )
    );
    expect(state.blockedReviewId).toBeUndefined();
    const report = JSON.parse(
      readFileSync("reports/curriculum-execution/no-family-plan.json", "utf8")
    );
    const preApproval = report.current.nextReplanWork;
    if (preApproval?.workItemId === "W002") {
      expect(preApproval.operation).toBe("SOL_REPLAN");
      expect(preApproval.replanContractRevision).toBe("W002-SOL-REPLAN-v14");
      const trigger = preApproval.solReview.solReplanRequest;
      if (trigger) {
        expect(trigger.reviewId).toBe(
          "W002-SOL_REPLAN_REQUEST-change-rule-SOL-A1"
        );
      } else {
        expect(preApproval.solReview.familyTrackReviewIds).toContain(
          "W002-FAMILY_TRACK-repeat-repair-SOL-A2"
        );
      }
      expect(preApproval.solReview.replanApproved).toBe(false);
      expect(preApproval.solReview.replanConsumed).toBe(false);
      return;
    }

    const postApproval = report.current.nextOfflineWork;
    expect(postApproval?.workItemId).toBe("W002");
    expect(["ENGINE_CORE", "FAMILY_TRACK"]).toContain(
      postApproval?.operation
    );
    expect(postApproval?.operationWorkItemId).toBe(
      `${postApproval?.nextFamilySubWork?.workItemId}-${postApproval?.operation}`
    );
    expect(postApproval?.nextFamilySubWork?.familyTrackId).toBe(
      "pattern.change-rule.construct-v1"
    );
    expect(postApproval?.nextFamilySubWork?.scopeId).toBe(
      "W002-FAMILY_TRACK-change-rule"
    );
    expect(postApproval?.solReview.solReplanRequest).toBeNull();
    expect(postApproval?.solReview.replanApproved).toBe(true);
    expect(postApproval?.solReview.replanConsumed).toBe(true);
  });

  it("does not consume a preflight request until a fully bound replan is approved", () => {
    const request = {
      operation: "SOL_REPLAN",
      decision: "changes-requested"
    };
    expect(
      replanConsumesRequest({
        replanReview: request,
        replanApproved: false,
        replanConsumed: false
      })
    ).toBe(false);
    expect(
      replanConsumesRequest({
        replanReview: { ...request, decision: "blocked" },
        replanApproved: false,
        replanConsumed: false
      })
    ).toBe(false);
    expect(
      replanConsumesRequest({
        replanReview: { ...request, decision: "approved" },
        replanApproved: true,
        replanConsumed: false
      })
    ).toBe(false);
    expect(
      replanConsumesRequest({
        replanReview: { ...request, decision: "approved" },
        replanApproved: true,
        replanConsumed: true
      })
    ).toBe(true);
  });

  it("ignores the consumed replan's superseded failure identity", () => {
    const sameFamilyRevalidation = review({
      reviewId: "W002-FAMILY_REVALIDATION-repeat-rule-SOL-A2",
      operation: "FAMILY_REVALIDATION",
      decision: "blocked"
    });
    const sameFamilyTrigger = replanTriggerForFlow({
      rawTrigger: sameFamilyRevalidation,
      replanConsumed: true,
      latestFamilyRevalidationReview: sameFamilyRevalidation
    });
    expect(sameFamilyTrigger).toBe(null);
    expect(
      resolveFlowOperation({
        flowReplanTrigger: sameFamilyTrigger,
        replanApproved: true,
        replanConsumed: true,
        nextSubWorkOperation: "AFFORDANCE_DISCOVERY"
      })
    ).toBe("AFFORDANCE_DISCOVERY");

    const sameScopedBlocker = review({
      reviewId: "W002-FAMILY_TRACK-repeat-rule-SOL-A2",
      decision: "blocked",
      familyTrackId: "pattern.repeat-unit.construct-v1",
      scopeId: "W002-FAMILY_TRACK-repeat-rule"
    });
    expect(
      replanTriggerForFlow({
        rawTrigger: sameScopedBlocker,
        replanConsumed: true,
        scopedFamilyTrackReviews: [sameScopedBlocker]
      })
    ).toBe(null);
  });

  it("resolves the complete consumed and unconsumed operation transitions", () => {
    const legacyTrigger = review({ decision: "blocked" });
    expect(
      resolveFlowOperation({
        flowReplanTrigger: legacyTrigger,
        replanApproved: false,
        replanConsumed: false
      })
    ).toBe("SOL_REPLAN");
    expect(
      resolveFlowOperation({
        flowReplanTrigger: legacyTrigger,
        replanApproved: true,
        replanConsumed: false
      })
    ).toBe("TARGET_SET");
    expect(
      resolveFlowOperation({
        flowReplanTrigger: null,
        replanApproved: true,
        replanConsumed: true,
        nextSubWorkOperation: "AFFORDANCE_DISCOVERY"
      })
    ).toBe("AFFORDANCE_DISCOVERY");
  });

  it("fingerprints only the selected standard learning-map slice", () => {
    const descriptor = {
      kind: "learning-map",
      path: "fixtures/pedagogy/learning-map.used.json",
      standardCode: "[2수04-02]"
    };
    const slice = buildSemanticSlice(process.cwd(), descriptor);
    expect(slice.topics).toHaveLength(3);
    expect(JSON.stringify(slice)).not.toContain("[2수02-02]");
    const fingerprint = {
      ...descriptor,
      sha256: semanticSliceHash(process.cwd(), descriptor)
    };
    expect(semanticSliceIsCurrent(process.cwd(), fingerprint)).toBe(true);
    expect(
      semanticSliceIsCurrent(process.cwd(), { ...fingerprint, sha256: "0".repeat(64) })
    ).toBe(false);
  });

  it("binds the native data-table handler without hashing the whole registry", () => {
    const descriptor = {
      kind: "source-module",
      path: "packages/validator/src/native/registry.ts",
      standardCode: "[2수04-02]",
      startMarker: "function dataTableHandler(",
      endMarker: "function pointLineHandler("
    };
    const fingerprint = {
      ...descriptor,
      sha256: semanticSliceHash(process.cwd(), descriptor)
    };
    expect(semanticSliceIsCurrent(process.cwd(), fingerprint)).toBe(true);
    expect(buildSemanticSlice(process.cwd(), descriptor).contentSha256).toMatch(
      /^[a-f0-9]{64}$/
    );
  });

  it("binds the resolved family registry record by family id", () => {
    const descriptor = {
      kind: "registry-family",
      path: "reports/problem-family-registry/latest.json",
      standardCode: "[2수04-02]",
      familyId: "data.early-table.organize-v1"
    };
    const slice = buildSemanticSlice(process.cwd(), descriptor);
    expect(slice.family.familyId).toBe(descriptor.familyId);
    expect(slice.family.assessmentTargetIds).toEqual([
      "data.table.organize-classified-data-v1",
      "data.table.explain-usefulness-v1"
    ]);
    expect(
      semanticSliceIsCurrent(process.cwd(), {
        ...descriptor,
        sha256: semanticSliceHash(process.cwd(), descriptor)
      })
    ).toBe(true);
  });
});
