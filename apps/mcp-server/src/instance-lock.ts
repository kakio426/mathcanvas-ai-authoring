import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname } from "node:path";

export class InstanceLock {
  readonly #path: string;
  readonly #pid: number;
  #held = false;

  public constructor(path: string, pid = process.pid) {
    this.#path = path;
    this.#pid = pid;
  }

  public acquire(now = new Date()): void {
    mkdirSync(dirname(this.#path), { recursive: true, mode: 0o700 });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const descriptor = openSync(this.#path, "wx", 0o600);
        try {
          writeFileSync(
            descriptor,
            `${JSON.stringify({
              pid: this.#pid,
              startedAt: now.toISOString()
            })}\n`
          );
        } finally {
          closeSync(descriptor);
        }
        chmodSync(this.#path, 0o600);
        this.#held = true;
        return;
      } catch (error) {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : "";
        if (code !== "EEXIST") throw error;
        let activePid: number | null = null;
        try {
          const record = JSON.parse(readFileSync(this.#path, "utf8")) as {
            pid?: unknown;
          };
          if (Number.isInteger(record.pid) && Number(record.pid) > 0) {
            activePid = Number(record.pid);
          }
        } catch {
          activePid = null;
        }
        if (activePid !== null) {
          let processIsActive = false;
          try {
            process.kill(activePid, 0);
            processIsActive = true;
          } catch (probeError) {
            const probeCode =
              typeof probeError === "object" &&
              probeError !== null &&
              "code" in probeError
                ? String(probeError.code)
                : "";
            if (probeCode === "EPERM") {
              processIsActive = true;
            } else if (probeCode !== "ESRCH") {
              throw probeError;
            }
          }
          if (processIsActive) {
            throw new Error(
              "MathCanvas AI 서버가 이미 실행 중입니다. Codex와 Claude Code 중 하나만 열어 주세요."
            );
          }
        }
        unlinkSync(this.#path);
      }
    }
    throw new Error("MathCanvas AI 서버 실행 잠금을 만들지 못했습니다.");
  }

  public release(): void {
    if (!this.#held || !existsSync(this.#path)) return;
    try {
      const record = JSON.parse(readFileSync(this.#path, "utf8")) as {
        pid?: unknown;
      };
      if (record.pid === this.#pid) unlinkSync(this.#path);
    } finally {
      this.#held = false;
    }
  }
}
