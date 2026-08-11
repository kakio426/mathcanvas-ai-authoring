import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-ignore Sol review gate is a repository-side ESM utility.
import * as solReviewStatus from "../scripts/curriculum/sol-review-status.mjs";
// @ts-ignore Semantic revalidation helper is a repository-side ESM utility.
import * as semanticSlices from "../scripts/curriculum/revalidation-semantic-slice.mjs";
// @ts-ignore The curriculum builder exports a repository-side contract validator.
import * as noFamilyPlanBuilder from "../scripts/curriculum/build-no-family-plan.mjs";

const {
  effectiveFamilyLifecycleStage,
  familyRevalidationSupersedes,
  nativeFamilyReviewStatus,
  replanTriggerForFlow,
  replanTriggerReview,
  resolveFlowOperation,
  rewindFamilyTrackForRetry,
  reviewCandidateIsCurrent,
  reviewImplementationFiles,
  reviewScopeMatches,
  validateOperationCursor
} = solReviewStatus;
const { buildSemanticSlice, semanticSliceHash, semanticSliceIsCurrent } =
  semanticSlices;
const { assertEngineCoreContract } = noFamilyPlanBuilder;

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
  it("fails closed for incomplete student-constructed rule contracts", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const base = () =>
      JSON.parse(JSON.stringify(source.trackContracts.C01));
    expect(() => assertEngineCoreContract(base(), "C01")).not.toThrow();

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
  });

  it("projects the W002 engine-core contract into the generated loop work item", () => {
    const source = JSON.parse(
      readFileSync("scripts/curriculum/no-family-plan.json", "utf8")
    );
    const report = JSON.parse(
      readFileSync("reports/curriculum-execution/no-family-plan.json", "utf8")
    );
    const expected = source.trackContracts.C01.engineCoreContract;
    const workItem = report.workItems.find(
      (item: { workItemId: string }) => item.workItemId === "W002"
    );
    expect(expected).toBeDefined();
    expect(workItem.engineCoreContract).toEqual(expected);
    expect(source.planningGuardrails).toContain(
      "operation manifest 밖의 exact changedFiles는 SCOPE_VIOLATION finding을 가진 blocked review로만 보존하며 승인·post-approval 권한을 넓히지 않는다."
    );
    expect(
      workItem.engineCoreContract.runtimePredicate.parameters
        .continuationRuleStatePath
    ).toBe(workItem.engineCoreContract.manifestDecision.ruleStatePath);
    const currentProjection = [
      report.current.nextOfflineWork,
      report.current.nextReplanWork
    ].find(
      (item: { workItemId?: string } | null | undefined) =>
        item?.workItemId === "W002"
    );
    expect(currentProjection?.engineCoreContract).toEqual(expected);
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
