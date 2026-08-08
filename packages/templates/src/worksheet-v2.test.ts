import { describe, expect, it } from "vitest";
import { grade3PilotWorksheetCatalog } from "@mathcanvas/curriculum";
import { planWorksheetV2ForContractLab } from "@mathcanvas/planner";
import {
  prepareWorksheetV2,
  prepareWorksheetV2ForContractLab
} from "./worksheet-v2.js";

const entry = grade3PilotWorksheetCatalog[0]!;
const request = {
  schemaVersion: "2.0.0",
  requestId: "v2-template-r2-1",
  catalogEntryId: entry.catalogEntryId,
  selection: entry.selection,
  seed: "template-seed-r2-1",
  createdAt: "2026-08-08T00:00:00.000Z"
} as const;

describe("prepareWorksheetV2", () => {
  it("blocked catalog는 contract-lab preparation에서도 generator로 우회하지 않는다", () => {
    const plan = planWorksheetV2ForContractLab(request);
    expect(plan.status).toBe("blocked");
    expect(() =>
      prepareWorksheetV2ForContractLab(plan, {
        preparedAt: "2026-08-08T00:00:00.000Z"
      })
    ).toThrow(/worksheet-v2-not-preparable/);
  });

  it("released fixture는 별도 V2 preparation envelope으로 전달된다", () => {
    const plan = planWorksheetV2ForContractLab(request);
    const released = structuredClone(plan);
    released.status = "released";
    released.catalogEntry.availability = "released";
    released.catalogEntry.teacherVisible = true;
    released.catalogEntry.blockingReasons = [];
    released.catalogEntry.affordanceFamily.supportState = "released";
    released.affordanceFamily.supportState = "released";
    const prepared = prepareWorksheetV2(released, {
      preparedAt: "2026-08-08T00:00:00.000Z"
    });
    expect(prepared.state).toBe("transport-ready");
    expect(prepared.plan.catalogEntry.catalogEntryId).toBe(entry.catalogEntryId);
    expect("manipulation" in prepared).toBe(false);
    expect(prepared.notes.join(" ")).not.toContain("released라고 주장");
  });
});
