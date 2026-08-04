import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const MATHCANVAS_ORIGIN = "https://mathcanvas.vivasam.com";

export async function createLiveAuthHeadlessSession(
  stateDirectory
) {
  const profileDirectory = join(stateDirectory, "chrome-profile");
  const portPath = join(profileDirectory, "DevToolsActivePort");
  if (!existsSync(portPath)) {
    throw new Error("live-auth-browser-unavailable");
  }
  const [port] = readFileSync(portPath, "utf8")
    .trim()
    .split(/\r?\n/);
  if (!/^\d+$/.test(port)) {
    throw new Error("live-auth-endpoint-invalid");
  }

  const liveBrowser = await chromium.connectOverCDP(
    `http://127.0.0.1:${port}`
  );
  try {
    const liveContext = liveBrowser.contexts()[0];
    const livePage = liveContext?.pages().find((candidate) => {
      try {
        return new URL(candidate.url()).origin === MATHCANVAS_ORIGIN;
      } catch {
        return false;
      }
    });
    if (!liveContext || !livePage) {
      throw new Error("live-auth-mathcanvas-page-unavailable");
    }
    const authStatus = await livePage.evaluate(async () => {
      try {
        return (
          await fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store"
          })
        ).status;
      } catch {
        return 0;
      }
    });
    if (authStatus !== 200) {
      throw new Error("live-auth-required");
    }

    // 인증값은 메모리에서 새 headless context로만 전달한다. 파일이나 로그에는
    // 쓰지 않으며, 전용 로그인 Chrome도 닫지 않는다.
    const storageState = await liveContext.storageState();
    const headlessBrowser = await chromium.launch({
      channel: "chrome",
      headless: true
    });
    return {
      launcher: async () =>
        headlessBrowser.newContext({
          storageState,
          viewport: { width: 1280, height: 800 }
        }),
      newContext: async (options = {}) =>
        headlessBrowser.newContext({
          ...options,
          storageState
        }),
      close: async () => {
        await headlessBrowser.close().catch(() => undefined);
        // headless 작업이 모두 끝난 뒤에만 Playwright 연결을 끊는다.
        // CDP로 연결한 Browser.close()는 연결 transport만 닫고 외부 로그인
        // Chrome 프로세스에는 Browser.close 명령을 보내지 않는다.
        await liveBrowser.close().catch(() => undefined);
      }
    };
  } catch (error) {
    await liveBrowser.close().catch(() => undefined);
    throw error;
  }
}
