import { describe, expect, it } from "vitest";
import {
  PROBLEM_FAMILY_SCHEMA_VERSION,
  capabilityManifestSchema,
  problemFamilyManifestSchema,
  problemParametersSchema,
  releaseEvidenceSchema
} from "./problem-family.js";

const familyId = "number.multiplication.group-array-meaning-v1";
const defaultParameters = {
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  familyId,
  values: {
    itemsPerGroup: 4,
    groupCount: 6,
    contextObjectId: "ice-cream",
    misconceptionId: "groups-size-order"
  }
} as const;

const capability = {
  schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
  supportedStandardCodes: ["[2수01-10]"],
  gradeBand: "1-2",
  recommendedGrade: 2,
  gradeRange: [1, 3],
  availableProblemCounts: [2],
  defaultProblemCount: 2,
  supportedDifficulties: ["normal"],
  parameterFields: [
    {
      key: "itemsPerGroup",
      inputLabel: "한 묶음의 수",
      control: "number",
      section: "수학 조건",
      min: 2,
      max: 6
    },
    {
      key: "groupCount",
      inputLabel: "묶음 수",
      control: "number",
      section: "수학 조건",
      min: 2,
      max: 7
    },
    {
      key: "contextObjectId",
      inputLabel: "사물 맥락",
      control: "select",
      section: "맥락과 오개념",
      options: [{ value: "ice-cream", label: "아이스크림" }]
    },
    {
      key: "misconceptionId",
      inputLabel: "확인할 오개념",
      control: "fixed",
      section: "맥락과 오개념",
      options: [{ value: "groups-size-order", label: "두 수의 뜻 바꾸기" }]
    }
  ],
  defaultParameters,
  promptGuards: [],
  unsupportedParameterPolicy: "clarification-required",
  title: "곱셈 첫 문항 맞추기",
  scopeNote: "지원하는 조건만 첫 문항에 반영합니다.",
  legacyTeacherIntentKind: "multiplication-array-v1"
} as const;

describe("ProblemFamily 공통 계약", () => {
  it("역할이 명시된 동적 ProblemParameters를 받는다", () => {
    expect(problemParametersSchema.parse(defaultParameters)).toEqual(
      defaultParameters
    );
    expect(
      problemParametersSchema.safeParse({
        ...defaultParameters,
        values: { "role-less": 4 }
      }).success
    ).toBe(false);
  });

  it("capability의 기본값과 UI 필드가 정확히 일치해야 한다", () => {
    expect(capabilityManifestSchema.parse(capability)).toEqual(capability);
    expect(
      capabilityManifestSchema.safeParse({
        ...capability,
        parameterFields: capability.parameterFields.slice(0, 3)
      }).success
    ).toBe(false);
    expect(
      capabilityManifestSchema.safeParse({
        ...capability,
        availableProblemCounts: [2, 7],
        defaultProblemCount: 7
      }).success
    ).toBe(false);
  });

  it("released를 현재 live evidence 없이 선언하지 못한다", () => {
    const base = {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      supportState: "released",
      lifecycleStage: "live-released",
      evidencePaths: ["research/mathcanvas/release-canary.json"],
      verificationMethod: "inline-hashes",
      blueprintContentHash: "a".repeat(64),
      layoutPresetContentHash: "b".repeat(64)
    } as const;
    expect(releaseEvidenceSchema.parse(base)).toEqual(base);
    expect(
      releaseEvidenceSchema.safeParse({
        ...base,
        lifecycleStage: "offline-validated",
        evidencePaths: []
      }).success
    ).toBe(false);
  });

  it("canonical family/activity/template ID 불일치를 거부한다", () => {
    const manifest = {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId,
      activityId: familyId,
      templateId: familyId,
      domain: "수와 연산",
      learningGoal: "같은 수씩 묶인 상황을 곱셈식과 배열로 연결한다.",
      assessmentTargetIds: [],
      manipulation: "multiplication-array-choice-drag",
      generator: {
        id: "number.multiplication.group-array-items-v1",
        version: "1.0.0"
      },
      capability,
      renderRecipe: {
        kind: "legacy-blueprint-adapter",
        recipeId: familyId,
        recipeVersion: "1.0.0",
        blueprintId: familyId,
        layoutTokenSet: "multiplication-array-v1"
      },
      solReviewScope: {
        familyTrackId: familyId,
        scopeId: "W002-FAMILY_TRACK-repeat-rule"
      },
      releaseEvidence: {
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        supportState: "released",
        lifecycleStage: "live-released",
        evidencePaths: ["research/mathcanvas/wave17-release-canary.json"],
        verificationMethod: "inline-hashes",
        blueprintContentHash: "a".repeat(64),
        layoutPresetContentHash: "b".repeat(64)
      }
    } as const;
    expect(problemFamilyManifestSchema.parse(manifest)).toEqual(manifest);
    expect(
      problemFamilyManifestSchema.safeParse({
        ...manifest,
        solReviewScope: {
          familyTrackId: familyId,
          scopeId: "scope with spaces"
        }
      }).success
    ).toBe(false);
    expect(
      problemFamilyManifestSchema.safeParse({
        ...manifest,
        templateId: "number.other.family-v1"
      }).success
    ).toBe(false);
  });
});
