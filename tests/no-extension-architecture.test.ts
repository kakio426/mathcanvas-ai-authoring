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

  it("MCP 서버는 HTTP listener 없이 authoring runtime을 사용한다", () => {
    const entry = read("apps/mcp-server/src/index.ts");
    expect(entry).toContain("createAuthoringRuntime");
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

  it("교사 화면 로컬 서버는 loopback에만 바인딩하고 경계를 유지한다", () => {
    const server = read("apps/teacher-ui/src/server/main.ts");
    const security = read("docs/SECURITY.md");

    // SECURITY.md 불변 조건 7번이 선언한 경계를 코드가 실제로 지키는지 확인한다.
    expect(server).toMatch(/server\.listen\(\s*0\s*,\s*"127\.0\.0\.1"/);
    expect(server).not.toMatch(
      /\.listen\(\s*\d+\s*,\s*["'](?:0\.0\.0\.0|::)["']/
    );
    // Host 헤더 검사, 1회용 boot key, CSRF 헤더, CSP, 편집 링크 출처 제한
    expect(server).toContain("127.0.0.1:${port}");
    expect(server).toContain("bootKeyUsed");
    expect(server).toContain("x-mathcanvas-ui");
    expect(server).toMatch(/HttpOnly;\s*SameSite=Strict/);
    expect(server).toContain("frame-ancestors 'none'");
    expect(server).toContain("mathcanvas.vivasam.com");

    // 문서가 이 예외를 명시하고 있어야 한다. 불변식과 구현이 어긋나면 실패한다.
    expect(security).toContain("apps/teacher-ui");
    expect(security).toMatch(
      /MCP 서버는 stdio만 사용하며 수신 포트를 열지 않습니다/
    );
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

  it("TeacherIntent 중앙 소비자는 capability kind별 분기 없이 registry 계약만 사용한다", () => {
    const consumers = [
      read("packages/planner/src/index.ts"),
      read("apps/mcp-server/src/server.ts"),
      read("apps/teacher-ui/src/server/main.ts"),
      read("apps/teacher-ui/src/server/curriculum-catalog.ts"),
      read("apps/teacher-ui/src/server/input-reflections.ts"),
      read("apps/teacher-ui/src/web/App.tsx")
    ].join("\n");
    expect(consumers).not.toMatch(
      /multiplication-array-v1|division-grouping-v1|fraction-comparison-v1/
    );
    expect(consumers).toContain("getTeacherIntentCapability");
    expect(consumers).toContain("teacherIntentSchema");
    expect(consumers).toContain("findTeacherIntentCapabilityForRoute");
  });
});
