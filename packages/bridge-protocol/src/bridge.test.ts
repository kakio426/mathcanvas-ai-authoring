import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BRIDGE_PROTOCOL_VERSION,
  BridgeJobStore,
  createBridgeHttpServer,
  loadOrCreatePairingSecret
} from "./index.js";

const servers: ReturnType<typeof createBridgeHttpServer>[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => server.close(() => resolve()))
    )
  );
});

describe("브리지 보안과 상태", () => {
  it("연결 코드를 0600 파일로 만들고 재사용한다", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mathcanvas-secret-"));
    const path = join(directory, "pairing-secret");
    const first = await loadOrCreatePairingSecret(path);
    const second = await loadOrCreatePairingSecret(path);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect((await readFile(path, "utf8")).trim()).toBe(first);
    if (process.platform !== "win32") {
      expect((await stat(path)).mode & 0o777).toBe(0o600);
    }
  });

  it("확장 프로그램 origin과 연결 코드가 모두 맞아야 한다", async () => {
    const secret = "a".repeat(64);
    const server = createBridgeHttpServer({
      store: new BridgeJobStore(),
      pairingSecret: secret
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve())
    );
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("포트 없음");
    const url = `http://127.0.0.1:${address.port}/bridge/v1/health`;

    expect((await fetch(url)).status).toBe(403);
    expect(
      (
        await fetch(url, {
          headers: {
            Origin: "chrome-extension://test-extension",
            "X-MathCanvas-Bridge-Secret": "b".repeat(64)
          }
        })
      ).status
    ).toBe(401);
    expect(
      (
        await fetch(url, {
          headers: {
            Origin: "chrome-extension://test-extension",
            "X-MathCanvas-Bridge-Secret": secret
          }
        })
      ).status
    ).toBe(200);
  });

  it("민감 정보 없는 heartbeat만 보관한다", () => {
    const store = new BridgeJobStore();
    store.recordHeartbeat({
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      instanceId: "extension-instance",
      extensionVersion: "1.0.0",
      state: "ready",
      checkedAt: "2026-07-28T03:00:00.000Z",
      mathCanvasTabUrl: "https://mathcanvas.vivasam.com/ko/myCanvas",
      contractVersion: "1.0.0"
    });
    expect(
      store.latestHeartbeat(new Date("2026-07-28T03:00:10.000Z"))?.state
    ).toBe("ready");
    expect(
      store.latestHeartbeat(new Date("2026-07-28T03:01:00.000Z"))
    ).not.toBeNull();
    expect(
      store.latestHeartbeat(new Date("2026-07-28T03:01:40.000Z"))
    ).toBeNull();
  });
});
