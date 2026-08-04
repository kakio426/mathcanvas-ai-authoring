import { describe, expect, it } from "vitest";
import { sha256Hex } from "@mathcanvas/contracts";
import {
  ManagedChromeRuntime,
  type ManagedContext,
  type ManagedPage
} from "./runtime.js";
import type {
  PageCreationResult,
  PageInspection
} from "./page-operations.js";

class FakePage implements ManagedPage {
  public navigations: string[] = [];
  public broughtToFront = 0;
  public closed = false;
  public evaluateError: Error | undefined;
  public evaluationArguments: unknown[] = [];

  public constructor(
    public currentUrl = "about:blank",
    public inspection: PageInspection = { state: "ready" },
    public creation: PageCreationResult = {
      ok: true,
      projectId: "P_runtime"
    }
  ) {}

  public url(): string {
    return this.currentUrl;
  }

  public async goto(url: string): Promise<void> {
    this.currentUrl = url;
    this.navigations.push(url);
  }

  public async bringToFront(): Promise<void> {
    this.broughtToFront += 1;
  }

  public async evaluate<R, A>(
    pageFunction: (argument: A) => Promise<R>,
    argument: A
  ): Promise<R> {
    if (this.evaluateError) throw this.evaluateError;
    this.evaluationArguments.push(argument);
    return (
      pageFunction.name === "inspectMathCanvasPage"
        ? this.inspection
        : this.creation
    ) as R;
  }

  public isClosed(): boolean {
    return this.closed;
  }
}

class FakeContext implements ManagedContext {
  public closeListener: (() => void) | undefined;
  public closed = false;

  public constructor(public tabs: FakePage[]) {}

  public pages(): ManagedPage[] {
    return this.tabs;
  }

  public async newPage(): Promise<ManagedPage> {
    const page = new FakePage();
    this.tabs.push(page);
    return page;
  }

  public async close(): Promise<void> {
    this.closed = true;
    this.closeListener?.();
  }

  public on(_event: "close", listener: () => void): void {
    this.closeListener = listener;
  }
}

describe("관리형 Chrome 런타임", () => {
  it("별도 프로필로 Chrome을 열고 내 캔버스 화면을 앞으로 가져온다", async () => {
    const initialPage = new FakePage();
    const context = new FakeContext([initialPage]);
    let launchedDirectory = "";
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-dedicated-profile",
      headless: false,
      launcher: async (directory) => {
        launchedDirectory = directory;
        return context;
      },
      now: () => new Date("2026-07-29T07:00:00.000Z")
    });

    const connection = await runtime.openWorkspace();
    expect(launchedDirectory).toBe("/tmp/mathcanvas-dedicated-profile");
    expect(initialPage.navigations).toEqual([
      "https://mathcanvas.vivasam.com/ko/myCanvas"
    ]);
    expect(initialPage.broughtToFront).toBe(1);
    expect(connection.ready).toBe(true);
    await runtime.close();
    expect(context.closed).toBe(true);

    const staleApiPage = new FakePage(
      "https://mathcanvas.vivasam.com/api/project/stale"
    );
    const interactivePage = new FakePage(
      "https://mathcanvas.vivasam.com/ko"
    );
    const mixedContext = new FakeContext([
      staleApiPage,
      interactivePage
    ]);
    const mixedRuntime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-interactive-page",
      headless: false,
      launcher: async () => mixedContext
    });
    await mixedRuntime.openWorkspace();
    expect(staleApiPage.broughtToFront).toBe(0);
    expect(interactivePage.broughtToFront).toBe(1);
    await mixedRuntime.close();
  });

  it("외부 쓰기 직전 연결을 검사하고 포커스 이동 없이 편집 링크를 반환한다", async () => {
    const workspace = new FakePage(
      "https://mathcanvas.vivasam.com/ko/myCanvas"
    );
    const context = new FakeContext([workspace]);
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-runtime-create",
      headless: true,
      launcher: async () => context,
      now: () => new Date("2026-07-29T07:00:01.000Z")
    });
    const payload = {
      projectTitle: "새 수 카드 활동지",
      contentsJson: [{ svgId: "input-text" }],
      canvasOption: {
        moduleArr: {
          Unit01: { NO04NT: true },
          Unit03: { SM02AD: true }
        }
      }
    };
    const result = await runtime.createProject(payload, sha256Hex(payload));

    expect(result).toMatchObject({
      ok: true,
      projectId: "P_runtime",
      editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_runtime"
    });
    expect(context.tabs).toHaveLength(1);
    expect(workspace.broughtToFront).toBe(0);
    expect(workspace.evaluationArguments[0]).toMatchObject({
      verifyStaticContract: true,
      requiredModules: ["NO04NT", "SM02AD", "input-text"]
    });
  });

  it("생성 직전 로그인이 만료되면 headless 프로필을 놓는다", async () => {
    const context = new FakeContext([
      new FakePage(
        "https://mathcanvas.vivasam.com/ko/myCanvas",
        { state: "login-required", detailCode: "auth-required" }
      )
    ]);
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-runtime-auth-expired",
      headless: true,
      launcher: async () => context
    });
    const payload = { projectTitle: "로그인 만료 확인" };

    await expect(
      runtime.createProject(payload, sha256Hex(payload))
    ).resolves.toMatchObject({
      ok: false,
      errorCode: "auth-required"
    });
    expect(context.closed).toBe(true);
  });

  it("payload가 바뀌면 브라우저에 전달하기 전에 중단한다", async () => {
    let launches = 0;
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-runtime-hash",
      headless: true,
      launcher: async () => {
        launches += 1;
        return new FakeContext([]);
      }
    });
    const result = await runtime.createProject(
      { projectTitle: "변조됨" },
      "0".repeat(64)
    );
    expect(result).toMatchObject({
      ok: false,
      errorCode: "payload-hash-mismatch"
    });
    expect(launches).toBe(0);
  });

  it("Chrome 실행 실패를 민감한 오류 원문 없이 반환한다", async () => {
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-runtime-fail",
      headless: true,
      launcher: async () => {
        throw new Error("sensitive local path");
      }
    });
    await expect(runtime.checkConnection()).resolves.toMatchObject({
      ready: false,
      state: "browser-launch-failed",
      detailCode: "chrome-launch-failed"
    });
  });

  it("다른 Vivasam 화면도 MathCanvas 내 캔버스로 되돌린다", async () => {
    const initialPage = new FakePage("https://www.vivasam.com/home");
    const context = new FakeContext([initialPage]);
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-runtime-self-heal",
      headless: false,
      launcher: async () => context
    });

    await runtime.openWorkspace();
    expect(initialPage.navigations).toEqual([
      "https://mathcanvas.vivasam.com/ko/myCanvas"
    ]);
  });

  it("MathCanvas처럼 시작하는 다른 origin도 내 캔버스로 되돌린다", async () => {
    const initialPage = new FakePage(
      "https://mathcanvas.vivasam.com.evil.example/ko/myCanvas"
    );
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-runtime-origin",
      headless: false,
      launcher: async () => new FakeContext([initialPage])
    });

    await runtime.openWorkspace();
    expect(initialPage.navigations).toEqual([
      "https://mathcanvas.vivasam.com/ko/myCanvas"
    ]);
  });

  it("페이지 검사 실패는 Chrome 실행 실패와 구분한다", async () => {
    const page = new FakePage(
      "https://mathcanvas.vivasam.com/ko/myCanvas"
    );
    page.evaluateError = new Error("page was closed");
    const runtime = new ManagedChromeRuntime({
      userDataDirectory: "/tmp/mathcanvas-runtime-page-fail",
      headless: true,
      launcher: async () => new FakeContext([page])
    });

    await expect(runtime.checkConnection()).resolves.toMatchObject({
      ready: false,
      state: "contract-mismatch",
      detailCode: "browser-page-inspection-failed"
    });
  });
});
