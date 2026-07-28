import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("확장 기능 없는 아키텍처 회귀 방지", () => {
  it("확장 앱과 loopback 브리지 패키지가 존재하지 않는다", () => {
    expect(existsSync(join(root, "apps/chrome-extension"))).toBe(false);
    expect(existsSync(join(root, "packages/bridge-protocol"))).toBe(false);
  });

  it("설치 과정에 개발자 모드·연결 코드·로컬 포트가 없다", () => {
    const installers = [
      read("scripts/install-macos/install.command"),
      read("scripts/install-windows/install.ps1")
    ].join("\n");
    expect(installers).not.toMatch(
      /chrome:\/\/extensions|pairing|38471|chrome-extension/i
    );
    expect(installers).toContain("codex mcp add");
    expect(installers).toContain("claude mcp add");
  });

  it("MCP 서버는 HTTP listener 없이 관리형 Chrome을 직접 사용한다", () => {
    const entry = read("apps/mcp-server/src/index.ts");
    expect(entry).toContain("ManagedChromeRuntime");
    expect(entry).not.toMatch(
      /createServer|\.listen\(|pairing|bridgeServer|BRIDGE_PORT/
    );
  });

  it("브라우저 런타임은 별도 프로필과 고정 MathCanvas 도구만 제공한다", () => {
    const runtime = read("packages/managed-browser/src/runtime.ts");
    const server = read("apps/mcp-server/src/server.ts");
    expect(runtime).toContain("launchPersistentContext");
    expect(runtime).toContain("userDataDirectory");
    expect(server).not.toMatch(/evaluate|executeScript|arbitrary|javascript/i);
    expect(server).not.toContain("chrome.scripting");
  });

  it("페이지 쓰기는 새 프로젝트 POST 한 종류뿐이다", () => {
    const operations = read(
      "packages/managed-browser/src/page-operations.ts"
    );
    expect(
      [...operations.matchAll(/method:\s*["']POST["']/g)]
    ).toHaveLength(1);
    expect(operations).not.toMatch(
      /method:\s*["'](?:PUT|PATCH|DELETE)["']/
    );
  });
});
