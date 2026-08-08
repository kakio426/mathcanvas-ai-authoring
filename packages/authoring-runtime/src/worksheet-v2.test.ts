import { describe, expect, it } from "vitest";
import { grade3PilotWorksheetCatalog } from "@mathcanvas/curriculum";
import { planWorksheetV2ForContractLab } from "@mathcanvas/planner";
import {
  prepareWorksheetV2,
  prepareWorksheetV2ForContractLab
} from "@mathcanvas/templates";
import {
  WorksheetV2AuthoringRuntime,
  WorksheetV2AuthoringRuntimeError
} from "./worksheet-v2.js";

const entry = grade3PilotWorksheetCatalog[0]!;
const request = {
  schemaVersion: "2.0.0",
  requestId: "v2-runtime-r2-1",
  catalogEntryId: entry.catalogEntryId,
  selection: entry.selection,
  seed: "runtime-seed-r2-1",
  createdAt: "2026-08-08T00:00:00.000Z"
} as const;

function releasedPreparation() {
  const plan = planWorksheetV2ForContractLab(request);
  const released = structuredClone(plan);
  released.status = "released";
  released.catalogEntry.availability = "released";
  released.catalogEntry.teacherVisible = true;
  released.catalogEntry.blockingReasons = [];
  released.catalogEntry.affordanceFamily.supportState = "released";
  released.affordanceFamily.supportState = "released";
  return prepareWorksheetV2(released, {
    preparedAt: "2026-08-08T00:00:00.000Z"
  });
}

function fixtureRuntime() {
  const preparation = releasedPreparation();
  return {
    preparation,
    runtime: new WorksheetV2AuthoringRuntime(
      { now: () => new Date("2026-08-08T00:05:00.000Z") },
      { canonicalPlanResolver: () => preparation.plan }
    )
  };
}

describe("WorksheetV2AuthoringRuntime", () => {
  it("V2 public route는 blocked pilot을 teacher preparation으로 우회하지 않는다", () => {
    const runtime = new WorksheetV2AuthoringRuntime({
      now: () => new Date("2026-08-08T00:00:00.000Z")
    });
    expect(() =>
      runtime.planAndPrepare(request, {
        preparedAt: "2026-08-08T00:00:00.000Z"
      })
    ).toThrow(/아직 교사 UI에 공개할 수 없습니다/);
  });

  it("released fixture가 preparation→draft/hash→approval→resolve 경계를 통과한다", () => {
    const { runtime, preparation } = fixtureRuntime();
    const draft = runtime.createDraft(preparation, {
      draftId: "worksheet-draft-v2-r2-fixture",
      createdAt: "2026-08-08T00:00:00.000Z",
      expiresAt: "2026-08-08T00:30:00.000Z"
    });
    const originalExpiresAt = draft.expiresAt;
    draft.expiresAt = "2026-08-07T00:00:00.000Z";
    expect(runtime.getDraft(draft.draftId)?.expiresAt).toBe(originalExpiresAt);
    const draftId = draft.draftId;
    const preparationHash = draft.preparationHash;
    expect(draft.state).toBe("pending-approval");
    expect(draft.preparationHash).toMatch(/^[a-f0-9]{64}$/);
    expect(() =>
      runtime.resolveDraft({
        draftId,
        preparationHash
      })
    ).toThrowError(WorksheetV2AuthoringRuntimeError);

    const approved = runtime.approveDraft({
      draftId,
      preparationHash,
      teacherConfirmed: true,
      approvedAt: "2026-08-08T00:05:00.000Z"
    });
    expect(approved.state).toBe("approved");
    expect(approved.approval?.teacherConfirmed).toBe(true);
    expect(runtime.resolveDraft({
      draftId,
      preparationHash
    })).toEqual(preparation);
  });

  it("현재 catalog가 blocked이면 로컬에서 released로 바꾼 snapshot을 draft로 만들지 않는다", () => {
    const runtime = new WorksheetV2AuthoringRuntime({
      now: () => new Date("2026-08-08T00:05:00.000Z")
    });
    expect(() => runtime.createDraft(releasedPreparation(), {
      draftId: "worksheet-draft-v2-r2-stale",
      createdAt: "2026-08-08T00:00:00.000Z",
      expiresAt: "2026-08-08T00:30:00.000Z"
    })).toThrow(/catalog\/planner/);
  });

  it("draft 이후 current catalog가 바뀌면 approve와 resolve 모두 다시 차단한다", () => {
    const preparation = releasedPreparation();
    let currentPlan = preparation.plan;
    const runtime = new WorksheetV2AuthoringRuntime(
      { now: () => new Date("2026-08-08T00:05:00.000Z") },
      { canonicalPlanResolver: () => currentPlan }
    );
    const draft = runtime.createDraft(preparation, {
      draftId: "worksheet-draft-v2-r2-catalog-drift-approve",
      createdAt: "2026-08-08T00:00:00.000Z",
      expiresAt: "2026-08-08T00:30:00.000Z"
    });
    currentPlan = {
      ...currentPlan,
      status: "blocked",
      catalogEntry: {
        ...currentPlan.catalogEntry,
        availability: "blocked",
        teacherVisible: false,
        blockingReasons: ["catalog drift"]
      }
    };
    expect(() => runtime.approveDraft({
      draftId: draft.draftId,
      preparationHash: draft.preparationHash,
      teacherConfirmed: true
    })).toThrow(/catalog\/planner/);

    const secondPreparation = releasedPreparation();
    currentPlan = secondPreparation.plan;
    const secondRuntime = new WorksheetV2AuthoringRuntime(
      { now: () => new Date("2026-08-08T00:05:00.000Z") },
      { canonicalPlanResolver: () => currentPlan }
    );
    const secondDraft = secondRuntime.createDraft(secondPreparation, {
      draftId: "worksheet-draft-v2-r2-catalog-drift-resolve",
      createdAt: "2026-08-08T00:00:00.000Z",
      expiresAt: "2026-08-08T00:30:00.000Z"
    });
    secondRuntime.approveDraft({
      draftId: secondDraft.draftId,
      preparationHash: secondDraft.preparationHash,
      teacherConfirmed: true
    });
    currentPlan = {
      ...currentPlan,
      status: "blocked",
      catalogEntry: {
        ...currentPlan.catalogEntry,
        availability: "blocked",
        teacherVisible: false,
        blockingReasons: ["catalog drift"]
      }
    };
    expect(() => secondRuntime.resolveDraft({
      draftId: secondDraft.draftId,
      preparationHash: secondDraft.preparationHash
    })).toThrow(/catalog\/planner/);
  });

  it("hash가 바뀌거나 승인이 없으면 resolve·compile을 허용하지 않는다", () => {
    const { runtime } = fixtureRuntime();
    const draft = runtime.createDraft(releasedPreparation(), {
      draftId: "worksheet-draft-v2-r2-hash",
      createdAt: "2026-08-08T00:00:00.000Z",
      expiresAt: "2026-08-08T00:30:00.000Z"
    });
    expect(() =>
      runtime.approveDraft({
        draftId: draft.draftId,
        preparationHash: "0".repeat(64),
        teacherConfirmed: true
      })
    ).toThrow(/현재 draft가 다릅니다/);
    expect(() =>
      runtime.approveDraft({
        draftId: draft.draftId,
        preparationHash: draft.preparationHash,
        teacherConfirmed: false
      })
    ).toThrow(/명시적으로 승인/);
    expect(() =>
      runtime.approveDraft({
        draftId: draft.draftId,
        preparationHash: draft.preparationHash,
        teacherConfirmed: true,
        approvedAt: "2026-08-07T23:59:00.000Z"
      })
    ).toThrow(/생성 시각보다 이를 수 없습니다/);
  });

  it("R2 compile fixture는 resolve 후에도 R4 계약 부재를 명시적으로 차단한다", () => {
    const { runtime } = fixtureRuntime();
    const draft = runtime.createDraft(releasedPreparation(), {
      draftId: "worksheet-draft-v2-r2-compile",
      createdAt: "2026-08-08T00:00:00.000Z",
      expiresAt: "2026-08-08T00:30:00.000Z"
    });
    const approved = runtime.approveDraft({
      draftId: draft.draftId,
      preparationHash: draft.preparationHash,
      teacherConfirmed: true
    });
    const gate = runtime.compileDraft({
      draftId: approved.draftId,
      preparationHash: approved.preparationHash
    });
    expect(gate.state).toBe("blocked");
    expect(gate.blockingReasons.join(" ")).toContain("R4");
    expect("payload" in gate).toBe(false);
  });

  it("contract-lab preparation은 teacher approval draft로 승격할 수 없다", () => {
    const plan = planWorksheetV2ForContractLab(request);
    const released = structuredClone(plan);
    released.status = "released";
    released.catalogEntry.availability = "released";
    released.catalogEntry.teacherVisible = true;
    released.catalogEntry.blockingReasons = [];
    released.catalogEntry.affordanceFamily.supportState = "released";
    released.affordanceFamily.supportState = "released";
    const candidatePreparation = prepareWorksheetV2ForContractLab(released, {
      preparedAt: "2026-08-08T00:00:00.000Z"
    });
    const runtime = new WorksheetV2AuthoringRuntime(
      { now: () => new Date("2026-08-08T00:05:00.000Z") },
      { canonicalPlanResolver: () => released }
    );
    expect(() => runtime.createDraft(candidatePreparation)).toThrow(
      /manifest-bound 승인 경계/
    );
  });
});
