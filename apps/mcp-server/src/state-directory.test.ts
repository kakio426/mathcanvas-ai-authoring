import { describe, expect, it } from "vitest";
import { resolveStateDirectory } from "./state-directory.js";

describe("상태 폴더 경계", () => {
  it("기본값은 사용자 홈 아래 전용 폴더다", () => {
    expect(resolveStateDirectory(undefined, "/Users/teacher")).toBe(
      "/Users/teacher/.mathcanvas-ai-authoring"
    );
  });

  it("홈과 디스크 루트는 상태 폴더로 받지 않는다", () => {
    expect(() =>
      resolveStateDirectory("/Users/teacher", "/Users/teacher")
    ).toThrow("전용 폴더");
    expect(() => resolveStateDirectory("/", "/Users/teacher")).toThrow(
      "전용 폴더"
    );
  });
});
