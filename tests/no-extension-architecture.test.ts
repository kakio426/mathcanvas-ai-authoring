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

  it("ProblemParameters 중앙 소비자는 family별 kind 분기 없이 registry 계약만 사용한다", () => {
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
    expect(consumers).toContain("problemParametersSchema");
    expect(consumers).toContain("getProblemFamilyManifest");
    expect(consumers).toContain("findProblemFamilyByRoute");
    expect(consumers).toContain("validateProblemParameters");
  });

  it("신규 family runtime은 영역 index에서 중앙 수동 registry를 우회한다", () => {
    const templateRegistry = read("packages/templates/src/registry.ts");
    const domainIndex = read(
      "packages/templates/src/problem-families/domains/index.ts"
    );
    const runtimeRegistry = read(
      "packages/templates/src/problem-families/runtime-registry.ts"
    );
    const familyTypes = read(
      "packages/templates/src/problem-families/types.ts"
    );
    const runtimeTypes = read(
      "packages/templates/src/problem-families/runtime-types.ts"
    );
    const variationRegistry = read(
      "packages/templates/src/variations/registry.ts"
    );
    const cognitiveRegistry = read(
      "packages/templates/src/cognitive/registry.ts"
    );
    const legacyManipulations = read(
      "packages/templates/src/problem-families/legacy-manipulations.ts"
    );

    expect(templateRegistry).toContain(
      "DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES"
    );
    expect(templateRegistry).toContain(
      "createProblemFamilyRuntimeRegistry"
    );
    expect(domainIndex).toContain("NUMBER_OPERATIONS_NATIVE_PROBLEM_FAMILY_MODULES");
    expect(domainIndex).toContain("CHANGE_RELATIONSHIPS_NATIVE_PROBLEM_FAMILY_MODULES");
    expect(domainIndex).toContain("GEOMETRY_MEASUREMENT_NATIVE_PROBLEM_FAMILY_MODULES");
    expect(domainIndex).toContain("DATA_PROBABILITY_NATIVE_PROBLEM_FAMILY_MODULES");
    expect(runtimeRegistry).toContain("ProblemFamilyNativeModule");
    expect(familyTypes).toContain("source:");
    expect(familyTypes).toContain("capability?:");
    expect(familyTypes).toContain("runtime:");
    expect(familyTypes).toContain("cognitiveManifest:");
    expect(familyTypes).toContain("variationEnvelope:");
    expect(runtimeTypes).toContain("generateItemsForVariation?:");
    expect(variationRegistry).toContain(
      "DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES.map"
    );
    expect(cognitiveRegistry).toContain(
      "DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES.map"
    );
    expect(legacyManipulations).toContain("strangler adapter 전용 고정표");
  });

  it("첫 native family ID가 공통 planner·UI·감사 registry에 새 분기로 새지 않는다", () => {
    const forbiddenCentralConsumers = [
      "packages/planner/src/index.ts",
      "apps/mcp-server/src/server.ts",
      "apps/teacher-ui/src/server/main.ts",
      "apps/teacher-ui/src/server/curriculum-catalog.ts",
      "apps/teacher-ui/src/web/App.tsx",
      "packages/templates/src/registry.ts",
      "packages/templates/src/item-generators/registry.ts",
      "packages/templates/src/variations/registry.ts",
      "packages/templates/src/cognitive/registry.ts"
    ].map(read).join("\n");

    expect(forbiddenCentralConsumers).not.toContain(
      "data.classification.given-criterion-count-v1"
    );
  });
});
