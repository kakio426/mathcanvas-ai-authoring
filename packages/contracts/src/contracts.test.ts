import { describe, expect, it } from "vitest";
import {
  CONTRACT_SCHEMA_VERSION,
  SensitiveDataError,
  canonicalJson,
  createSeededRandom,
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
