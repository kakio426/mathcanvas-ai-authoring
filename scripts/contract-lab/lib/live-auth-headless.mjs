import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const MATHCANVAS_ORIGIN = "https://mathcanvas.vivasam.com";

async function readLiveStorageState(profileDirectory) {
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
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const target = Array.isArray(targets)
    ? targets.find((candidate) => {
        try {
          return (
            candidate?.type === "page" &&
            new URL(candidate.url).origin === MATHCANVAS_ORIGIN &&
            typeof candidate.webSocketDebuggerUrl === "string"
          );
        } catch {
          return false;
        }
      })
    : undefined;
  if (!target) {
    throw new Error("live-auth-mathcanvas-page-unavailable");
  }

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    clearTimeout(handler.timeout);
    if (message.error) {
      handler.reject(new Error(message.error.message));
    } else {
      handler.resolve(message.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`live-auth-cdp-timeout:${method}`));
      }, 5_000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });

  try {
    const authEvaluation = await send("Runtime.evaluate", {
      expression:
        "fetch('/api/auth/me',{credentials:'include',cache:'no-store'}).then(response=>response.status).catch(()=>0)",
      awaitPromise: true,
      returnByValue: true
    });
    if (authEvaluation?.result?.value !== 200) {
      throw new Error("live-auth-required");
    }
    const [{ cookies }, localStorageEvaluation] = await Promise.all([
      send("Network.getCookies", {
        urls: [`${MATHCANVAS_ORIGIN}/`]
      }),
      send("Runtime.evaluate", {
        expression: "JSON.stringify(Object.entries(localStorage))",
        returnByValue: true
      })
    ]);
    const localStorage = JSON.parse(
      localStorageEvaluation?.result?.value ?? "[]"
    );
    return {
      cookies: cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite:
          cookie.sameSite === "Strict"
            ? "Strict"
            : cookie.sameSite === "None"
              ? "None"
              : "Lax"
      })),
      origins: [
        {
          origin: MATHCANVAS_ORIGIN,
          localStorage: localStorage.map(([name, value]) => ({
            name,
            value
          }))
        }
      ]
    };
  } finally {
    for (const handler of pending.values()) {
      clearTimeout(handler.timeout);
      handler.reject(new Error("live-auth-cdp-closed"));
    }
    pending.clear();
    socket.close();
  }
}

export async function createLiveAuthHeadlessSession(
  stateDirectory
) {
  const profileDirectory = join(stateDirectory, "chrome-profile");
  if (!existsSync(profileDirectory)) {
    throw new Error("live-auth-profile-unavailable");
  }

  // 페이지 target에 직접 붙어 쿠키와 localStorage만 메모리로 전달한다.
  // Browser context 명령을 보내지 않으므로 Chrome 버전 차이와 포커스 이동을
  // 피하고, 사용자가 보고 있는 로그인 창은 그대로 유지한다.
  const storageState = await readLiveStorageState(profileDirectory);
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
    }
  };
}
