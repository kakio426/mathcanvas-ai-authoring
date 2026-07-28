import {
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { quarantineCorruptStateFile } from "./state-recovery.js";

describe("로컬 상태 복구", () => {
  it("손상된 파일을 덮어쓰지 않고 별도 백업으로 옮긴다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-state-"));
    const statePath = join(directory, "drafts.json");
    writeFileSync(statePath, "{broken");
    const backupPath = quarantineCorruptStateFile(
      statePath,
      new Date("2026-07-29T08:09:10.000Z")
    );
    expect(backupPath).toBe(
      `${statePath}.corrupt-20260729080910000`
    );
    expect(readFileSync(backupPath!, "utf8")).toBe("{broken");
  });
});
