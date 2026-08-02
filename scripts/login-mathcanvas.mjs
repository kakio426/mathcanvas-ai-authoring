#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  unlinkSync
} from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import {
  inspectMathCanvasPage,
  MATHCANVAS_HOME_URL
} from "../packages/managed-browser/dist/index.js";
import { resolveStateDirectory } from "./contract-lab/lib/paths.mjs";

const MATHCANVAS_ORIGIN = new URL(MATHCANVAS_HOME_URL).origin;
const stateDirectory = resolveStateDirectory();
const profileDirectory = join(stateDirectory, "chrome-profile");
const devToolsPortPath = join(profileDirectory, "DevToolsActivePort");
const chromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let browser;
let context;
let chromeProcess;
let contextClosed = false;
let authenticated = false;
let confirmationClicked = false;

async function waitForDevToolsEndpoint(timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (existsSync(devToolsPortPath)) {
      const [port] = readFileSync(devToolsPortPath, "utf8")
        .trim()
        .split(/\r?\n/);
      if (/^\d+$/.test(port)) {
        return `http://127.0.0.1:${port}`;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("devtools-endpoint-timeout");
}

async function waitForChromeExit(timeoutMs = 10_000) {
  if (!chromeProcess || chromeProcess.exitCode !== null) return true;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chromeProcess?.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    chromeProcess.once("exit", onExit);
  });
}

function isMathCanvasPage(candidate) {
  try {
    return new URL(candidate.url()).origin === MATHCANVAS_ORIGIN;
  } catch {
    return false;
  }
}

async function ensureMathCanvasPage(browserContext) {
  const livePages = browserContext
    .pages()
    .filter((candidate) => !candidate.isClosed());
  const mathCanvasPage = livePages.find(isMathCanvasPage);
  if (mathCanvasPage) return mathCanvasPage;

  // 시작할 때 이미 만들어진 빈 탭을 재사용해 같은 로그인 창을 두 번
  // 만들지 않는다. 로그인 제공자가 원래 창까지 닫은 경우에만 새 page를
  // 만들어 MathCanvas로 복구한다.
  const recoveredPage = livePages[0] ?? (await browserContext.newPage());
  await recoveredPage.goto(MATHCANVAS_HOME_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await recoveredPage.bringToFront();
  try {
    const cdp = await browserContext.newCDPSession(recoveredPage);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "normal" }
    });
    await cdp.detach();
  } catch {
    // 창 상태 복구를 지원하지 않는 Chrome 버전에서도 로그인은 계속한다.
  }
  await Promise.all(
    livePages
      .filter(
        (candidate) =>
          candidate.url() === "about:blank"
      )
      .map((candidate) => candidate.close().catch(() => undefined))
  );
  return recoveredPage;
}

try {
  process.stdout.write(
    `MathCanvas 로그인 창을 열었습니다. 로그인 후 ‘내 캔버스’까지 이동해 주세요.\n창을 직접 닫으면 로그인 작업만 취소되며 다시 열리지 않습니다.\n프로필: ${profileDirectory}\n`
  );
  if (!existsSync(chromeExecutable)) {
    throw new Error("chrome-executable-unavailable");
  }
  if (existsSync(devToolsPortPath)) unlinkSync(devToolsPortPath);
  chromeProcess = spawn(
    chromeExecutable,
    [
      `--user-data-dir=${profileDirectory}`,
      "--remote-debugging-port=0",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-session-crashed-bubble",
      "--start-maximized",
      "--new-window",
      "about:blank"
    ],
    { stdio: "ignore" }
  );
  chromeProcess.on("exit", () => {
    contextClosed = true;
  });
  browser = await chromium.connectOverCDP(
    await waitForDevToolsEndpoint()
  );
  context = browser.contexts()[0];
  if (!context) throw new Error("chrome-context-unavailable");
  context.on("close", () => {
    contextClosed = true;
  });

  let page =
    context.pages().find((candidate) =>
      candidate.url().startsWith("https://mathcanvas.vivasam.com/")
    ) ??
    context.pages()[0] ??
    (await context.newPage());
  page = await ensureMathCanvasPage(context);
  await page.bringToFront();

  while (!contextClosed) {
    page = await ensureMathCanvasPage(context);
    try {
      if (isMathCanvasPage(page)) {
        const authStatus = await page.evaluate(async () => {
          try {
            const response = await fetch("/api/auth/me", {
              method: "GET",
              credentials: "include",
              cache: "no-store"
            });
            return response.status;
          } catch {
            return 0;
          }
        });
        const persistentSession = (await context.cookies(MATHCANVAS_ORIGIN))
          .some(
            (cookie) =>
              cookie.name === "MATHCANVAS_SESSION" &&
              cookie.expires > Date.now() / 1000 + 60
          );
        const accessToken = await page.evaluate(
          () => Boolean(window.localStorage.getItem("accessToken"))
        );
        authenticated =
          authStatus === 200 && (persistentSession || accessToken);
        if (authenticated) break;
      }
    } catch {
      // 로그인 리디렉션 중에는 URL이나 페이지 컨텍스트가 잠시 교체될 수 있습니다.
    }
    if (!page.isClosed() && isMathCanvasPage(page)) {
      try {
        if (!confirmationClicked) {
          const confirmation = page.getByRole("button", {
            name: "확인",
            exact: true
          });
          if (await confirmation.isVisible().catch(() => false)) {
            await confirmation.click();
            confirmationClicked = true;
          }
        }
        const inspection = await page.evaluate(
          inspectMathCanvasPage,
          { verifyStaticContract: false }
        );
        if (inspection.state === "ready") {
          authenticated = await page.evaluate(
            () => Boolean(window.localStorage.getItem("accessToken"))
          );
          if (authenticated) break;
        }
      } catch {
        // 로그인 리디렉션 중에는 페이지 컨텍스트가 잠시 교체될 수 있습니다.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!authenticated) {
    process.stdout.write("MathCanvas 로그인 창을 닫아 로그인 작업을 취소했습니다.\n");
    process.exitCode = 1;
  } else {
    // Chrome이 전용 프로필의 Local Storage를 디스크에 반영할 시간을 둡니다.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    process.stdout.write(
      "PASS MathCanvas 로그인 확인 완료. 전용 창을 닫고 앱으로 돌아갑니다.\n"
    );
  }
} catch (error) {
  process.stderr.write(
    "MathCanvas 로그인 창을 열지 못했습니다. 실행 중인 MathCanvas 로그인·생성 작업을 닫고 다시 시도해 주세요.\n"
  );
  process.exitCode = 1;
} finally {
  if (browser && browser.isConnected()) {
    await browser.close().catch(() => undefined);
  }
  const exitedCleanly = await waitForChromeExit();
  if (!exitedCleanly && chromeProcess?.exitCode === null) {
    chromeProcess.kill("SIGTERM");
  }
}
