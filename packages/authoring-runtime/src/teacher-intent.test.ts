import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  DIVISION_GROUPING_CONTEXT_DETAILS,
  DIVISION_GROUPING_CONTEXT_OBJECT_IDS,
  getTeacherIntentCapability,
  sha256Hex,
  type TeacherIntent
} from "@mathcanvas/contracts";
import { compileActivity, resolveActivity } from "@mathcanvas/compiler";
import { recommendActivity } from "@mathcanvas/planner";
import {
  buildRegisteredAppliedTeacherIntent,
  buildRegisteredProblemPreviews,
  buildRegisteredTeacherAnswerKey,
  prepareRegisteredActivity,
  problemParametersFromTeacherIntent,
  projectRegisteredApprovalView
} from "@mathcanvas/templates";
import { validateForCreation } from "@mathcanvas/validator";

const multiplicationIntent = {
  kind: "multiplication-array-v1",
  itemsPerGroup: 4,
  groupCount: 6,
  contextObjectId: "ice-cream",
  misconceptionId: "groups-size-order"
} as const;

const divisionIntent = {
  kind: "division-grouping-v1",
  totalCount: 23,
  groupSize: 4,
  contextObjectId: "candy",
  misconceptionId: "quotient-remainder-meaning"
} as const;

const fractionIntent = {
  kind: "fraction-comparison-v1",
  numerator: 3,
  leftDenominator: 4,
  rightDenominator: 5,
  misconceptionId: "denominator-size-only"
} as const;

function prepare(intent: TeacherIntent) {
  const capability = getTeacherIntentCapability(intent.kind);
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `teacher-intent-${intent.kind}`,
    prompt: `${capability.title} 활동을 만들어 주세요.`,
    requestedStandardCode: capability.standardCode,
    requestedGrade: capability.recommendedGrade,
    problemCount: capability.defaultProblemCount,
    difficulty: "normal",
    ...(capability.denominatorRelation
      ? { denominatorRelation: capability.denominatorRelation }
      : {}),
    manipulation: capability.manipulation,
    teacherIntent: intent,
    createdAt: "2026-08-10T00:00:00.000Z"
  });
  const resolved = resolveActivity(
    prepareRegisteredActivity(recommendation, {
      seed: "teacher-intent-fixed-seed",
      generatedAt: "2026-08-10T00:00:00.000Z",
      activityId: `teacher-intent-${intent.kind}`
    })
  );
  const approvalView = projectRegisteredApprovalView(resolved);
  const compiled = compileActivity(resolved);
  const validation = validateForCreation(
    resolved,
    compiled,
    new Date("2026-08-10T00:00:00.000Z")
  );
  return {
    recommendation,
    resolved,
    approvalView,
    activitySpecHash: sha256Hex(approvalView),
    compiled,
    validation,
    answerKey: buildRegisteredTeacherAnswerKey(resolved),
    problemPreviews: buildRegisteredProblemPreviews(resolved),
    appliedTeacherIntent: buildRegisteredAppliedTeacherIntent(resolved)
  };
}

function prepareWithProblemParameters(intent: TeacherIntent) {
  const capability = getTeacherIntentCapability(intent.kind);
  const problemParameters = problemParametersFromTeacherIntent(intent);
  if (!problemParameters) {
    throw new Error(`problem-parameters-adapter-missing:${intent.kind}`);
  }
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `teacher-intent-${intent.kind}`,
    prompt: `${capability.title} 활동을 만들어 주세요.`,
    requestedStandardCode: capability.standardCode,
    requestedGrade: capability.recommendedGrade,
    problemCount: capability.defaultProblemCount,
    difficulty: "normal",
    ...(capability.denominatorRelation
      ? { denominatorRelation: capability.denominatorRelation }
      : {}),
    manipulation: capability.manipulation,
    problemParameters,
    createdAt: "2026-08-10T00:00:00.000Z"
  });
  const resolved = resolveActivity(
    prepareRegisteredActivity(recommendation, {
      seed: "teacher-intent-fixed-seed",
      generatedAt: "2026-08-10T00:00:00.000Z",
      activityId: `teacher-intent-${intent.kind}`
    })
  );
  return {
    recommendation,
    resolved,
    compiled: compileActivity(resolved),
    answerKey: buildRegisteredTeacherAnswerKey(resolved),
    problemPreviews: buildRegisteredProblemPreviews(resolved),
    appliedTeacherIntent: buildRegisteredAppliedTeacherIntent(resolved)
  };
}

describe("TeacherIntent capability 세로 단면", () => {
  it.each([
    ["곱셈", multiplicationIntent],
    ["나눗셈", divisionIntent],
    ["분수", fractionIntent]
  ] as const)(
    "%s legacy TeacherIntent와 공통 ProblemParameters는 같은 문항·정답·payload를 만든다",
    (_name, intent) => {
      const legacy = prepare(intent);
      const generic = prepareWithProblemParameters(intent);
      expect(generic.resolved.items).toEqual(legacy.resolved.items);
      expect(generic.answerKey).toEqual(legacy.answerKey);
      expect(generic.problemPreviews).toEqual(legacy.problemPreviews);
      expect(generic.appliedTeacherIntent).toEqual(intent);
      expect(generic.compiled.payload).toEqual(legacy.compiled.payload);
      expect(generic.compiled.payloadHash).toBe(legacy.compiled.payloadHash);
      expect(generic.recommendation.problemParameters).toEqual(
        problemParametersFromTeacherIntent(intent)
      );
    }
  );

  it.each([
    ["곱셈", multiplicationIntent],
    ["나눗셈", divisionIntent],
    ["분수", fractionIntent]
  ] as const)(
    "%s은 같은 seed와 intent에서 resolved·approval·hash가 byte-stable하다",
    (_name, intent) => {
      const first = prepare(intent);
      const second = prepare(intent);
      expect(first.resolved).toEqual(second.resolved);
      expect(first.approvalView).toEqual(second.approvalView);
      expect(first.activitySpecHash).toBe(second.activitySpecHash);
      expect(first.recommendation.teacherIntent).toEqual(intent);
      expect(first.appliedTeacherIntent).toEqual(intent);
    }
  );

  it("나눗셈의 등록 사물 맥락 4종은 자연스러운 canonical 이야기로 생성 전 검증을 통과한다", () => {
    for (const contextObjectId of DIVISION_GROUPING_CONTEXT_OBJECT_IDS) {
      const result = prepare({ ...divisionIntent, contextObjectId });
      const context = DIVISION_GROUPING_CONTEXT_DETAILS[contextObjectId];
      const first = result.resolved.items[0];
      expect(result.validation.canCreate).toBe(true);
      expect(first?.values.questionText).toContain(context.objectName);
      expect(first?.values.evidenceText).toContain(context.objectName);
      expect(first?.values.evidenceText).toContain("묶음");
      expect(first?.values.countableCounter).toBe(context.counter);
    }
  });

  it("나눗셈 TeacherIntent 이야기의 근거 문장을 바꾸면 canonical 언어 감사가 생성 차단한다", () => {
    const result = prepare(divisionIntent);
    const tampered = structuredClone(result.resolved);
    tampered.items[0]!.values.evidenceText =
      "사탕을 세어 보세요.";
    const compiled = compileActivity(tampered);
    const validation = validateForCreation(
      tampered,
      compiled,
      new Date("2026-08-10T00:00:00.000Z")
    );
    expect(validation.canCreate).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "classroom-language-unclear"
    );
  });

  it.each([
    ["곱셈", multiplicationIntent],
    ["나눗셈", divisionIntent],
    ["분수", fractionIntent]
  ] as const)(
    "%s은 승인된 resolved에서 생성 payload까지 컴파일되고 생성 전 검증을 통과한다",
    (_name, intent) => {
      const result = prepare(intent);
      expect(result.compiled.payloadHash).toBe(
        sha256Hex(result.compiled.payload)
      );
      expect(result.validation.compiledPayloadHash).toBe(
        result.compiled.payloadHash
      );
      expect(result.validation.canCreate).toBe(true);
      expect(
        result.validation.issues.filter((issue) => issue.severity === "error")
      ).toEqual([]);
    }
  );

  it.each([
    [
      "곱셈 묶음 수",
      multiplicationIntent,
      { ...multiplicationIntent, groupCount: 7 }
    ],
    [
      "나눗셈 전체 수",
      divisionIntent,
      { ...divisionIntent, totalCount: 22 }
    ],
    [
      "분수 오른쪽 분모",
      fractionIntent,
      { ...fractionIntent, rightDenominator: 6 }
    ]
  ] as const)(
    "같은 seed에서 %s만 바꾸면 첫 문항과 hash가 함께 바뀐다",
    (_name, baselineIntent, changedIntent) => {
      const baseline = prepare(baselineIntent);
      const changed = prepare(changedIntent);
      expect(changed.resolved.items[0]?.values).not.toEqual(
        baseline.resolved.items[0]?.values
      );
      expect(changed.problemPreviews?.[0]).not.toEqual(
        baseline.problemPreviews?.[0]
      );
      expect(changed.activitySpecHash).not.toBe(baseline.activitySpecHash);
    }
  );

  it("곱셈 문항·정답·역순 오답·exact preview가 같은 의미값을 사용한다", () => {
    const result = prepare(multiplicationIntent);
    const first = result.resolved.items[0];
    expect(first?.values).toMatchObject({
      each: 4,
      groups: 6,
      total: 24,
      correctValueText: "4\\times6",
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    });
    const candidates = Array.from(
      { length: 5 },
      (_, index) => String(first?.values[`candidate${index + 1}`])
    );
    expect(candidates).toContain("6\\times4");
    expect(result.answerKey[0]?.answer).toBe("4\\times6");
    expect(result.problemPreviews?.[0]).toEqual({
      problemNumber: 1,
      statements: [
        "한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요?"
      ]
    });
  });

  it("나눗셈 문항·모형 수·몫과 나머지·exact preview가 같은 포함제 의미값을 사용한다", () => {
    const result = prepare(divisionIntent);
    const first = result.resolved.items[0];
    expect(first?.values).toMatchObject({
      questionText:
        "사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요?",
      correctValueText: "5묶음, 3개",
      countableTotal: 23,
      countableGroupSize: 4,
      countableObjectName: "사탕",
      contextObjectId: "candy",
      misconceptionId: "quotient-remainder-meaning"
    });
    expect(result.answerKey[0]).toMatchObject({
      answer: "5묶음, 3개",
      explanation: "4개씩 5묶음은 20개이고 3개가 남습니다."
    });
    expect(result.problemPreviews?.[0]).toEqual({
      problemNumber: 1,
      statements: [
        "사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요?"
      ]
    });
  });

  it("분수 문항·분수 띠 값·관계·exact preview가 같은 비교 의미값을 사용한다", () => {
    const result = prepare(fractionIntent);
    const first = result.resolved.items[0];
    expect(first?.values).toMatchObject({
      left: { numerator: 3, denominator: 4 },
      right: { numerator: 3, denominator: 5 },
      correctRelation: ">",
      misconceptionId: "denominator-size-only"
    });
    expect(result.answerKey[0]?.answer).toBe("3/4 > 3/5");
    expect(result.problemPreviews?.[0]).toEqual({
      problemNumber: 1,
      statements: ["3/4 ? 3/5"]
    });
  });
});
