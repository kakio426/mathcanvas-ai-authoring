import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const MATHCANVAS_ORIGIN = "https://mathcanvas.vivasam.com";

export async function createLiveAuthHeadlessSession(
  stateDirectory
) {
  const profileDirectory = join(stateDirectory, "chrome-profile");
  if (!existsSync(profileDirectory)) {
    throw new Error("live-auth-profile-unavailable");
  }

  // 사용자가 보고 있는 Chrome에 CDP로 붙지 않는다. Chrome 버전 차이로
  // Browser context 명령이 실패하거나 포커스를 가져오는 문제를 피하기 위해,
  // 인증에 필요한 최소 파일만 임시 프로필로 복사해 headless에서 읽는다.
  const snapshotDirectory = mkdtempSync(
    join(tmpdir(), "mathcanvas-auth-profile-")
  );
  const snapshotDefault = join(snapshotDirectory, "Default");
  mkdirSync(snapshotDefault, { recursive: true, mode: 0o700 });
  const copyIfPresent = (relativePath) => {
    const source = join(profileDirectory, relativePath);
    if (!existsSync(source)) return;
    cpSync(source, join(snapshotDirectory, relativePath), {
      recursive: true
    });
  };
  for (const relativePath of [
    "Local State",
    "Default/Preferences",
    "Default/Secure Preferences",
    "Default/Cookies",
    "Default/Cookies-journal",
    "Default/Local Storage"
  ]) {
    copyIfPresent(relativePath);
  }

  let snapshotContext;
  try {
    snapshotContext = await chromium.launchPersistentContext(
      snapshotDirectory,
      {
        channel: "chrome",
        headless: true,
        viewport: { width: 1280, height: 800 }
      }
    );
    const snapshotPage =
      snapshotContext.pages()[0] ?? (await snapshotContext.newPage());
    await snapshotPage.goto(`${MATHCANVAS_ORIGIN}/ko`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });
    const authStatus = await snapshotPage.evaluate(async () => {
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

    const storageState = await snapshotContext.storageState();
    await snapshotContext.close();
    snapshotContext = undefined;
    rmSync(snapshotDirectory, { recursive: true, force: true });
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
  } catch (error) {
    await snapshotContext?.close().catch(() => undefined);
    rmSync(snapshotDirectory, { recursive: true, force: true });
    throw error;
  }
}
