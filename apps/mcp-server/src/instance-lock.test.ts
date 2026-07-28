import {
  mkdtempSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InstanceLock } from "./instance-lock.js";

describe("MCP 서버 단일 실행 잠금", () => {
  it("살아 있는 프로세스의 잠금이 있으면 두 번째 서버를 막는다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-lock-"));
    const lockPath = join(directory, "server.lock");
    writeFileSync(lockPath, JSON.stringify({ pid: process.pid }));
    expect(() => new InstanceLock(lockPath).acquire()).toThrow(
      "하나만 열어"
    );
  });

  it("끝난 프로세스의 잠금은 회수하고 정상 해제한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-stale-lock-"));
    const lockPath = join(directory, "server.lock");
    writeFileSync(lockPath, JSON.stringify({ pid: 2_147_483_647 }));
    const lock = new InstanceLock(lockPath);
    expect(() => lock.acquire()).not.toThrow();
    expect(() => lock.release()).not.toThrow();
  });
});
