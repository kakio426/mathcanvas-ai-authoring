import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  DIVISION_GROUPING_CONTEXT_OBJECT_IDS,
  SensitiveDataError,
  TEACHER_INTENT_CAPABILITIES,
  assertTeacherIntentCapabilityRegistry,
  buildDivisionGroupingTeacherIntentCanonicalStory,
  canonicalJson,
  createSeededRandom,
  divisionGroupingTeacherIntentSchema,
  fractionComparisonTeacherIntentSchema,
  generationRequestSchema,
  multiplicationArrayTeacherIntentSchema,
  redactSensitiveText,
  sha256Hex,
  assertNoSensitiveKeys
} from "./index.js";

describe("공통 계약", () => {
  it("알 수 없는 AI 출력 필드와 인증 필드를 거부한다", () => {
    const input = {
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: "request-1",
      prompt: "분모가 다른 분수의 크기를 비교하는 활동",
      createdAt: "2026-07-28T00:00:00.000Z",
      accessToken: "secret"
    };
    expect(generationRequestSchema.safeParse(input).success).toBe(false);
    expect(() => assertNoSensitiveKeys(input)).toThrow(SensitiveDataError);
  });

  it("중첩된 인증 필드도 거부한다", () => {
    expect(() =>
      assertNoSensitiveKeys({ payload: { headers: { Authorization: "Bearer x" } } })
    ).toThrow("$.payload.headers.Authorization");
  });

  it("객체 키 순서와 무관하게 같은 canonical hash를 만든다", () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      '{"a":{"c":3,"d":4},"b":2}'
    );
    expect(sha256Hex({ b: 2, a: 1 })).toBe(sha256Hex({ a: 1, b: 2 }));
    expect(
      sha256Hex({
        z: [3, { b: "한글", a: true }],
        a: { n: 1.25, s: "MathCanvas" }
      })
    ).toBe(
      "d9765429f122a68903802cdbe6ca07579d42f8dfee2c7658c06277dc385cae58"
    );
  });

  it("같은 seed에서 같은 난수열을 만든다", () => {
    const first = createSeededRandom("lesson-seed");
    const second = createSeededRandom("lesson-seed");
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it("곱셈 TeacherIntent에서 두 수의 역할과 등록 맥락을 검증한다", () => {
    const golden = {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    };
    expect(multiplicationArrayTeacherIntentSchema.parse(golden)).toEqual(
      golden
    );
    expect(
      multiplicationArrayTeacherIntentSchema.parse({
        ...golden,
        itemsPerGroup: 6,
        groupCount: 7
      })
    ).toMatchObject({ itemsPerGroup: 6, groupCount: 7 });
    expect(
      generationRequestSchema.parse({
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        requestId: "request-teacher-intent",
        prompt: "곱셈 배열의 두 수가 뜻하는 바를 확인하는 활동",
        manipulation: "multiplication-array-choice-drag",
        teacherIntent: golden,
        createdAt: "2026-08-10T00:00:00.000Z"
      }).teacherIntent
    ).toEqual(golden);
  });

  it.each([
    ["한 묶음의 수 하한", { itemsPerGroup: 1 }],
    ["한 묶음의 수 상한", { itemsPerGroup: 7 }],
    ["묶음 수 하한", { groupCount: 1 }],
    ["묶음 수 상한", { groupCount: 8 }],
    ["같은 두 수", { itemsPerGroup: 4, groupCount: 4 }],
    ["미등록 맥락", { contextObjectId: "cookie" }],
    ["미등록 오개념", { misconceptionId: "addition-instead" }]
  ])("곱셈 TeacherIntent의 %s 위반을 거부한다", (_label, override) => {
    expect(
      multiplicationArrayTeacherIntentSchema.safeParse({
        kind: "multiplication-array-v1",
        itemsPerGroup: 4,
        groupCount: 6,
        contextObjectId: "ice-cream",
        misconceptionId: "groups-size-order",
        ...override
      }).success
    ).toBe(false);
  });

  it("역할 없는 숫자 배열과 partial TeacherIntent를 거부한다", () => {
    expect(
      generationRequestSchema.safeParse({
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        requestId: "request-roleless-numbers",
        prompt: "곱셈 배열에서 4와 6을 사용하는 활동",
        specificNumbers: [4, 6],
        createdAt: "2026-08-10T00:00:00.000Z"
      }).success
    ).toBe(false);
    expect(
      multiplicationArrayTeacherIntentSchema.safeParse({
        kind: "multiplication-array-v1",
        itemsPerGroup: 4,
        groupCount: 6
      }).success
    ).toBe(false);
  });

  it("TeacherIntent capability registry의 세 경로와 기본값이 서로 충돌하지 않는다", () => {
    expect(() => assertTeacherIntentCapabilityRegistry()).not.toThrow();
    expect(TEACHER_INTENT_CAPABILITIES).toHaveLength(3);
    expect(
      new Set(
        TEACHER_INTENT_CAPABILITIES.map(
          (capability) =>
            `${capability.manipulation}:${capability.standardCode}`
        )
      ).size
    ).toBe(3);
    expect(
      TEACHER_INTENT_CAPABILITIES.map((capability) => capability.kind)
    ).toEqual([
      "multiplication-array-v1",
      "division-grouping-v1",
      "fraction-comparison-v1"
    ]);
  });

  it("나눗셈 TeacherIntent는 몇 개씩 묶는 포함제와 나머지 조건을 검증한다", () => {
    const golden = {
      kind: "division-grouping-v1",
      totalCount: 23,
      groupSize: 4,
      contextObjectId: "candy",
      misconceptionId: "quotient-remainder-meaning"
    };
    expect(divisionGroupingTeacherIntentSchema.parse(golden)).toEqual(golden);
    for (const invalid of [
      { ...golden, totalCount: 24 },
      { ...golden, totalCount: 7, groupSize: 4 },
      { ...golden, totalCount: 41, groupSize: 5 },
      { ...golden, contextObjectId: "student" }
    ]) {
      expect(divisionGroupingTeacherIntentSchema.safeParse(invalid).success)
        .toBe(false);
    }
  });

  it("나눗셈 TeacherIntent 허용 범위 전체가 고유한 5개 답 카드와 canonical 이야기를 만든다", () => {
    let supportedCount = 0;
    for (const contextObjectId of DIVISION_GROUPING_CONTEXT_OBJECT_IDS) {
      for (let totalCount = 7; totalCount <= 42; totalCount += 1) {
        for (let groupSize = 2; groupSize <= 9; groupSize += 1) {
          const parsed = divisionGroupingTeacherIntentSchema.safeParse({
            kind: "division-grouping-v1",
            totalCount,
            groupSize,
            contextObjectId,
            misconceptionId: "quotient-remainder-meaning"
          });
          if (!parsed.success) continue;
          supportedCount += 1;
          const story =
            buildDivisionGroupingTeacherIntentCanonicalStory(parsed.data);
          const quotient = Math.floor(totalCount / groupSize);
          const remainder = totalCount % groupSize;
          expect(story.candidateSet).toHaveLength(5);
          expect(new Set(story.candidateSet).size).toBe(5);
          expect(story.candidateSet).toContain(
            `${quotient}묶음, ${remainder}${story.fields.countableCounter}`
          );
          expect(story.fields.evidenceText).toContain("묶음");
          expect(story.fields.evidenceText).toContain(
            story.fields.countableObjectName
          );
        }
      }
    }
    expect(supportedCount).toBe(612);
  });

  it("분수 비교 TeacherIntent는 서로 다른 분모의 구별 가능한 두 진분수만 받는다", () => {
    const golden = {
      kind: "fraction-comparison-v1",
      numerator: 3,
      leftDenominator: 4,
      rightDenominator: 5,
      misconceptionId: "denominator-size-only"
    };
    expect(fractionComparisonTeacherIntentSchema.parse(golden)).toEqual(golden);
    for (const invalid of [
      { ...golden, numerator: 4 },
      { ...golden, rightDenominator: 4 },
      {
        ...golden,
        numerator: 1,
        leftDenominator: 3,
        rightDenominator: 4
      },
      {
        ...golden,
        numerator: 1,
        leftDenominator: 2,
        rightDenominator: 6
      }
    ]) {
      expect(fractionComparisonTeacherIntentSchema.safeParse(invalid).success)
        .toBe(false);
    }
  });

  it("로그 문자열에서 JWT와 Authorization 값을 가린다", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop";
    const redacted = redactSensitiveText(
      `Authorization: Bearer abc.def.ghi accessToken=${jwt}`
    );
    expect(redacted).not.toContain(jwt);
    expect(redacted).not.toContain("abc.def.ghi");
    expect(redacted).toContain("[REDACTED]");
  });
});
