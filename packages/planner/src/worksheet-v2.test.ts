import { describe, expect, it } from "vitest";
import {
  curriculumAuthorityBindingSchema,
  worksheetCatalogEntrySchema,
  worksheetPlanV2Schema,
  worksheetRequestV2Schema
} from "@mathcanvas/contracts";
import {
  getElementaryCurriculumCoverage,
  getGrade3PilotWorksheetCoverage,
  grade3PilotWorksheetCatalog
} from "@mathcanvas/curriculum";
import {
  planWorksheetV2,
  planWorksheetV2ForContractLab,
  WorksheetV2PlanningError
} from "./v2.js";

const firstEntry = grade3PilotWorksheetCatalog[0]!;

function request(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "2.0.0",
    requestId: "v2-r2-1",
    catalogEntryId: firstEntry.catalogEntryId,
    selection: firstEntry.selection,
    seed: "seed-r2-1",
    createdAt: "2026-08-08T00:00:00.000Z",
    ...overrides
  };
}

describe("Worksheet V2 catalog/request/plan", () => {
  it("30개 pilot entry를 구조화 선택과 세 family에 결속한다", () => {
    expect(grade3PilotWorksheetCatalog).toHaveLength(30);
    expect(
      new Set(
        grade3PilotWorksheetCatalog.map((entry) => entry.catalogEntryId)
      ).size
    ).toBe(30);
    for (const entry of grade3PilotWorksheetCatalog) {
      expect(entry.selection.unitId).toBe(entry.authorityBinding.unit.unitId);
      expect(entry.selection.standardCode).toBe(
        entry.authorityBinding.standard.code
      );
      expect(entry.teacherVisible).toBe(false);
      expect(entry.availability).toBe("blocked");
      expect(entry.blockingReasons.length).toBeGreaterThan(0);
      expect(entry.blueprintFamily.id).not.toBe(entry.variationPreset.id);
      expect(entry.variationPreset.id).not.toBe(entry.affordanceFamily.family.id);
      expect(entry.affordanceFamily.family.id).not.toBe(entry.layoutFamily.id);
    }
  });

  it("pilotCoverage와 curriculumCoverage를 숫자 추정 없이 분리한다", () => {
    expect(getGrade3PilotWorksheetCoverage()).toMatchObject({
      coverageKind: "pilot",
      status: "available",
      numerator: 0,
      denominator: 30,
      candidateEntries: 0,
      blockedEntries: 30
    });
    expect(getElementaryCurriculumCoverage()).toMatchObject({
      coverageKind: "curriculum",
      status: "unavailable",
      numerator: null,
      denominator: null,
      candidateEntries: 0,
      blockedEntries: 30
    });
  });

  it("strict V2 request는 manipulation·좌표·raw payload를 받지 않는다", () => {
    expect(
      worksheetRequestV2Schema.safeParse({
        ...request(),
        manipulation: "number-card-make-ten-drag"
      }).success
    ).toBe(false);
    expect(
      worksheetRequestV2Schema.safeParse({
        ...request(),
        coordinates: { x: 10, y: 10 }
      }).success
    ).toBe(false);
    expect(
      worksheetRequestV2Schema.safeParse({
        ...request(),
        rawPayload: { moduleArr: {} }
      }).success
    ).toBe(false);
  });

  it("contract-lab V2 route는 exact selection과 bounded modifier 결과를 보존한다", () => {
    const plan = planWorksheetV2ForContractLab(
      request({
        modifier: {
          context: "우리 반 도서관에서 본 책을 세어 보자.",
          problemCount: 3,
          difficulty: "hard"
        }
      })
    );
    expect(plan.status).toBe("blocked");
    expect(plan.catalogEntry.catalogEntryId).toBe(firstEntry.catalogEntryId);
    expect(plan.selection).toEqual(firstEntry.selection);
    expect(plan.appliedModifiers).toEqual([
      {
        key: "context",
        value: "우리 반 도서관에서 본 책을 세어 보자."
      }
    ]);
    expect(plan.rejectedModifiers).toEqual([
      {
        key: "problemCount",
        value: 3,
        reason: "문제 수는 1~2개만 허용됩니다."
      },
      {
        key: "difficulty",
        value: "hard",
        reason: "이 catalog entry에서 검증된 난이도만 사용할 수 있습니다."
      }
    ]);
    expect("manipulation" in plan).toBe(false);
  });

  it("plan snapshot은 request selection/native evidence 변조를 닫는다", () => {
    const plan = planWorksheetV2ForContractLab(request());
    const wrongSelection = structuredClone(plan);
    wrongSelection.request.selection = {
      ...wrongSelection.request.selection,
      unitId: "3-2-1"
    };
    expect(worksheetPlanV2Schema.safeParse(wrongSelection).success).toBe(false);

    const wrongNative = structuredClone(plan);
    wrongNative.affordanceFamily.candidateToolKeys = ["NO01SC"];
    expect(worksheetPlanV2Schema.safeParse(wrongNative).success).toBe(false);

    const wrongDecision = structuredClone(plan);
    wrongDecision.rejectedModifiers = [
      {
        key: "problemCount",
        value: "not-a-number"
      } as never
    ];
    expect(worksheetPlanV2Schema.safeParse(wrongDecision).success).toBe(false);

    const injectedModifier = structuredClone(plan);
    injectedModifier.appliedModifiers = [
      { key: "problemCount", value: 2 }
    ];
    expect(worksheetPlanV2Schema.safeParse(injectedModifier).success).toBe(
      false
    );
  });

  it("cross-band binding은 primary와 다른 하위 학년군 하나만 허용한다", () => {
    const crossBandEntry = grade3PilotWorksheetCatalog.find(
      (candidate) => candidate.authorityBinding.crossBandReview !== undefined
    )!;
    const wrong = structuredClone(crossBandEntry.authorityBinding);
    wrong.crossBandReview!.standardCode = wrong.standard.code;
    wrong.prerequisiteStandardCodes = [wrong.standard.code];
    expect(curriculumAuthorityBindingSchema.safeParse(wrong).success).toBe(false);

    const unverified = structuredClone(crossBandEntry.authorityBinding);
    unverified.crossBandReview!.source.verificationStatus = "unverified";
    expect(curriculumAuthorityBindingSchema.safeParse(unverified).success).toBe(
      false
    );

    const wrongGrade = structuredClone(crossBandEntry.authorityBinding);
    wrongGrade.crossBandReview!.grade = 3;
    wrongGrade.crossBandReview!.unitId = "3-1-6";
    expect(curriculumAuthorityBindingSchema.safeParse(wrongGrade).success).toBe(
      false
    );
  });

  it("teacher route는 release-candidate를 released처럼 노출하지 않는다", () => {
    expect(() => planWorksheetV2(request())).toThrowError(
      WorksheetV2PlanningError
    );
    try {
      planWorksheetV2(request());
    } catch (error) {
      expect(error).toMatchObject({ code: "entry-not-public" });
    }
  });

  it("선택이 entry와 다르면 exact resolve를 거부한다", () => {
    expect(() =>
      planWorksheetV2ForContractLab(
        request({
          selection: {
            ...firstEntry.selection,
            unitId: "3-2-1"
          }
        })
      )
    ).toThrowError(/학년·학기·단원·성취기준·학습 유형/);
  });

  it("catalog schema는 released 상태의 native/visibility/blocking 모순을 닫는다", () => {
    const candidate = structuredClone(firstEntry);
    candidate.availability = "released";
    candidate.teacherVisible = true;
    candidate.blockingReasons = [];
    candidate.affordanceFamily.supportState = "captured";
    expect(worksheetCatalogEntrySchema.safeParse(candidate).success).toBe(false);
  });
});
