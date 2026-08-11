import { describe, expect, it } from "vitest";
import {
  MATHCANVAS_PROJECT_CATEGORIES,
  PROBLEM_FAMILY_SCHEMA_VERSION
} from "@mathcanvas/contracts";
import { compileActivity, resolveActivity } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import { validateForCreation } from "@mathcanvas/validator";
import {
  buildRegisteredAppliedProblemParameters,
  buildRegisteredProblemPreviews,
  buildRegisteredTeacherAnswerKey,
  prepareRegisteredActivityForEnvelopeValidation
} from "../../../registry.js";
import { assertCognitiveManifestBound } from "../../../cognitive/registry.js";
import { validateProblemParameters } from "../../registry.js";
import {
  CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
  CLASSIFICATION_GIVEN_CRITERION_COUNT_MANIPULATION,
  CLASSIFICATION_SET_IDS,
  classificationCountCandidateValues,
  classificationGivenCriterionCountBlueprint,
  generateClassificationGivenCriterionCountItems,
  type ClassificationSetId
} from "./classification-given-criterion-count.js";

const generatedAt = "2026-08-11T00:00:00.000Z";

function recommend(input: {
  classificationSetId: ClassificationSetId;
  matchingCount: number;
  problemCount: number;
}) {
  return recommendActivity({
    schemaVersion: "1.0.0",
    requestId: "classification-envelope-test",
    prompt:
      "2학년 학생이 주어진 기준에 맞는 사물을 분류하고 개수를 세는 문제를 만들어 주세요.",
    requestedFamilyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
    requestedStandardCode: "[2수04-01]",
    requestedGrade: 2,
    problemCount: input.problemCount,
    difficulty: "normal",
    problemParameters: {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
      // key 순서를 바꾸어도 실제 적용 projection이 같은 의미로 비교돼야 한다.
      values: {
        matchingCount: input.matchingCount,
        classificationSetId: input.classificationSetId
      }
    },
    createdAt: generatedAt
  });
}

function resolveEnvelope(input: {
  classificationSetId: ClassificationSetId;
  matchingCount: number;
  problemCount: number;
}) {
  const recommendation = recommend(input);
  const plan = prepareRegisteredActivityForEnvelopeValidation(
    {
      ...recommendation,
      supported: true,
      blockingReasons: []
    },
    {
      seed: "classification-envelope-seed",
      generatedAt,
      activityId: "classification-envelope-activity"
    }
  );
  const resolved = resolveActivity(plan);
  const compiled = compileActivity(resolved);
  const report = validateForCreation(
    resolved,
    compiled,
    new Date(generatedAt)
  );
  return { recommendation, resolved, compiled, report };
}

describe("[2수04-01] 주어진 기준 분류·개수 세기 native family", () => {
  it("review 전 상태를 정직하게 막되 exact preview·정답·실제 조건까지 offline 생성한다", () => {
    const result = resolveEnvelope({
      classificationSetId: "round-shape",
      matchingCount: 4,
      problemCount: 3
    });

    expect(result.recommendation).toMatchObject({
      supported: false,
      templateId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
      standardCode: "[2수04-01]",
      manipulation: CLASSIFICATION_GIVEN_CRITERION_COUNT_MANIPULATION,
      blockingReasons: [
        "이 활동은 새 화면을 확인하는 중이라 실제 생성에는 아직 공개되지 않았습니다."
      ]
    });
    expect(result.report.issues).toEqual([]);
    expect(result.report.canCreate).toBe(true);
    expect(result.resolved.items).toHaveLength(3);
    expect(result.compiled.payload.categoryId).toBe(
      MATHCANVAS_PROJECT_CATEGORIES["자료와 가능성"].categoryId
    );
    expect(assertCognitiveManifestBound(classificationGivenCriterionCountBlueprint))
      .toMatchObject({
        mathematicalDecision: expect.stringContaining("같은 기준"),
        limitations: {
          autoGrading: "none-by-design",
          phaseOrder: "teacher-guided"
        }
      });

    const answers = buildRegisteredTeacherAnswerKey(result.resolved);
    const previews = buildRegisteredProblemPreviews(result.resolved);
    const applied = buildRegisteredAppliedProblemParameters(result.resolved);
    expect(answers).toHaveLength(3);
    expect(answers[0]).toMatchObject({
      answer: "4개",
      explanation: expect.stringContaining("모두 4개")
    });
    expect(previews?.[0]?.statements).toEqual([
      expect.stringContaining("둥근 모양인 물건은 몇 개인가요"),
      "기준: 둥근 모양",
      expect.stringContaining("사물:"),
      expect.stringContaining("선택:")
    ]);
    expect(applied).toEqual({
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
      values: {
        classificationSetId: "round-shape",
        matchingCount: 4
      }
    });

    for (const item of result.resolved.items) {
      const matching = item.values.matchingObjects as string[];
      const nonmatching = item.values.nonmatchingObjects as string[];
      const objects = item.values.objects as string[];
      const candidates = [1, 2, 3, 4, 5].map((index) =>
        String(item.values[`candidate${index}`])
      );
      expect(matching).toHaveLength(4);
      expect(nonmatching).toHaveLength(4);
      expect(new Set([...matching, ...nonmatching])).toEqual(
        new Set(objects)
      );
      expect(objects).toHaveLength(8);
      expect(new Set(candidates).size).toBe(5);
      expect(candidates).toContain("4개");
      expect(candidates).toContain("8개");
      expect(String(item.values.answerExplanation)).toContain(
        matching.join(", ")
      );
    }
  });

  it("선언한 4×5×3 유한 파라미터 envelope를 전수 생성·컴파일·검증한다", () => {
    let combinationCount = 0;
    for (const classificationSetId of CLASSIFICATION_SET_IDS) {
      for (let matchingCount = 2; matchingCount <= 6; matchingCount += 1) {
        for (const problemCount of [1, 2, 3]) {
          const result = resolveEnvelope({
            classificationSetId,
            matchingCount,
            problemCount
          });
          combinationCount += 1;
          expect(result.report.issues, `${classificationSetId}/${matchingCount}/${problemCount}`)
            .toEqual([]);
          expect(result.resolved.items).toHaveLength(problemCount);
          for (const item of result.resolved.items) {
            expect(item.values.classificationSetId).toBe(classificationSetId);
            expect(item.values.matchingCount).toBe(matchingCount);
            expect(item.values.totalObjectCount).toBe(8);
            expect(
              (item.values.matchingObjects as string[]).length
            ).toBe(matchingCount);
            expect(
              (item.values.nonmatchingObjects as string[]).length
            ).toBe(8 - matchingCount);
            const candidates = [1, 2, 3, 4, 5].map((index) =>
              Number(String(item.values[`candidate${index}`]).replace("개", ""))
            );
            expect(new Set(candidates)).toEqual(
              new Set(classificationCountCandidateValues(matchingCount))
            );
            expect(candidates).toContain(8);
            if (8 - matchingCount !== matchingCount) {
              expect(candidates).toContain(8 - matchingCount);
            } else {
              expect(item.values.matchingObjects).not.toEqual(
                item.values.nonmatchingObjects
              );
              expect(String(item.values.answerExplanation)).toContain(
                (item.values.matchingObjects as string[]).join(", ")
              );
            }
          }
        }
      }
    }
    expect(combinationCount).toBe(60);
  });

  it("같은 입력은 결정적이고 의미 조건 변경은 문항과 payload hash를 함께 바꾼다", () => {
    const sameA = resolveEnvelope({
      classificationSetId: "vehicles",
      matchingCount: 3,
      problemCount: 2
    });
    const sameB = resolveEnvelope({
      classificationSetId: "vehicles",
      matchingCount: 3,
      problemCount: 2
    });
    const changedCount = resolveEnvelope({
      classificationSetId: "vehicles",
      matchingCount: 5,
      problemCount: 2
    });
    const changedSet = resolveEnvelope({
      classificationSetId: "food",
      matchingCount: 3,
      problemCount: 2
    });

    expect(sameA.resolved.items).toEqual(sameB.resolved.items);
    expect(sameA.compiled.payloadHash).toBe(sameB.compiled.payloadHash);
    expect(changedCount.resolved.items[0]?.values.objectListText).not.toBe(
      sameA.resolved.items[0]?.values.objectListText
    );
    expect(changedCount.compiled.payloadHash).not.toBe(
      sameA.compiled.payloadHash
    );
    expect(changedSet.resolved.items[0]?.values.questionText).not.toBe(
      sameA.resolved.items[0]?.values.questionText
    );
    expect(changedSet.compiled.payloadHash).not.toBe(
      sameA.compiled.payloadHash
    );
  });

  it("범위 밖·추가 조건과 아직 미지원인 학생 자체 기준 요청을 침묵 없이 거부한다", () => {
    const base = {
      schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
      familyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
      values: {
        classificationSetId: "round-shape",
        matchingCount: 4
      }
    } as const;
    expect(() =>
      validateProblemParameters({
        ...base,
        values: { ...base.values, matchingCount: 7 }
      })
    ).toThrow("classification-problem-parameters-unsupported");
    expect(() =>
      validateProblemParameters({
        ...base,
        values: { ...base.values, ignoredField: true }
      })
    ).toThrow("classification-problem-parameters-unsupported");
    expect(() =>
      recommendActivity({
        schemaVersion: "1.0.0",
        requestId: "classification-self-criterion-block",
        prompt:
          "학생이 스스로 정한 기준으로 사물을 분류하고 개수를 세게 해 주세요.",
        requestedFamilyId: CLASSIFICATION_GIVEN_CRITERION_COUNT_FAMILY_ID,
        requestedStandardCode: "[2수04-01]",
        requestedGrade: 2,
        createdAt: generatedAt
      })
    ).toThrow("학생이 기준을 스스로 정하는 목표는 아직 별도 문제군이 필요합니다");
  });

  it("generator 자체도 문제 수·개수 경계와 잘못된 난이도를 fail-closed 처리한다", () => {
    expect(
      generateClassificationGivenCriterionCountItems(
        {
          difficulty: "normal",
          problemCount: 1,
          classificationSetId: "food",
          matchingCount: 2
        },
        "minimum-boundary"
      )
    ).toHaveLength(1);
    expect(
      generateClassificationGivenCriterionCountItems(
        {
          difficulty: "normal",
          problemCount: 3,
          classificationSetId: "food",
          matchingCount: 6
        },
        "maximum-boundary"
      )
    ).toHaveLength(3);
    expect(() =>
      generateClassificationGivenCriterionCountItems(
        {
          difficulty: "easy",
          problemCount: 2,
          classificationSetId: "food",
          matchingCount: 4
        },
        "unsupported-difficulty"
      )
    ).toThrow(RangeError);
  });
});
