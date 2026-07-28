import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const extensionDirectory = join(
  process.cwd(),
  "apps",
  "chrome-extension"
);

describe("Chrome 확장 프로그램 권한과 쓰기 경계", () => {
  it("필요한 호스트만 허용한다", async () => {
    const manifest = JSON.parse(
      await readFile(
        join(extensionDirectory, "public", "manifest.json"),
        "utf8"
      )
    ) as {
      permissions: string[];
      host_permissions: string[];
    };
    expect(manifest.permissions.sort()).toEqual(
      ["alarms", "scripting", "storage", "tabs"].sort()
    );
    expect(manifest.host_permissions.sort()).toEqual(
      [
        "http://127.0.0.1:38471/*",
        "https://mathcanvas.vivasam.com/*"
      ].sort()
    );
  });

  it("MathCanvas 외부 쓰기는 단일 POST 생성만 사용한다", async () => {
    const source = await readFile(
      join(extensionDirectory, "src", "background.ts"),
      "utf8"
    );
    expect(source.match(/fetch\("\/api\/project"/g)).toHaveLength(1);
    expect(source).toContain('"/api/public-project/P_CsJeiL"');
    expect(source).toContain('"fraction-fixture-contract-mismatch"');
    expect(source).toContain('method: "POST"');
    expect(source).not.toMatch(/method:\s*"(PUT|PATCH|DELETE)"/);
    expect(source).not.toMatch(/\/api\/project\/\$\{/);
  });

  it("토큰 이름은 page MAIN 함수 밖의 결과 계약에 없다", async () => {
    const shared = await readFile(
      join(extensionDirectory, "src", "shared.ts"),
      "utf8"
    );
    expect(shared).not.toMatch(/accessToken|Authorization|Bearer/);
    expect(shared).not.toMatch(/token\s*[?:]/i);
  });

  it("저장된 연결 코드를 옵션 화면 입력칸에 다시 노출하지 않는다", async () => {
    const optionsSource = await readFile(
      join(extensionDirectory, "src", "options.ts"),
      "utf8"
    );
    expect(optionsSource).not.toContain(
      "secretInput.value = stored.pairingSecret"
    );
    expect(optionsSource).toContain('secretInput.value = ""');
  });
});
