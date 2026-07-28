import { describe, expect, it } from "vitest";
import { errorCodeForStatus, sha256Canonical } from "./shared.js";

describe("확장 프로그램 순수 함수", () => {
  it("Node 컴파일러와 같은 canonical SHA-256 규칙을 쓴다", async () => {
    const vector = {
      z: [3, { b: "한글", a: true }],
      a: { n: 1.25, s: "MathCanvas" }
    };
    expect(await sha256Canonical(vector)).toBe(
      "d9765429f122a68903802cdbe6ca07579d42f8dfee2c7658c06277dc385cae58"
    );
  });

  it("MathCanvas 상태 코드를 안전한 오류 코드로 바꾼다", () => {
    expect(errorCodeForStatus(400)).toBe("contract-mismatch");
    expect(errorCodeForStatus(401)).toBe("login-required");
    expect(errorCodeForStatus(403)).toBe("permission-denied");
    expect(errorCodeForStatus(503)).toBe("mathcanvas-unavailable");
  });
});
