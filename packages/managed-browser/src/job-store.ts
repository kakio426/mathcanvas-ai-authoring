import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname } from "node:path";
import {
  creationResultSchema,
  queuedCreationSchema,
  type CreationResult,
  type QueuedCreation
} from "./types.js";

export type CreationJobStatus =
  | "queued"
  | "creating"
  | "succeeded"
  | "failed"
  | "expired";

export interface StoredCreationJob {
  job: QueuedCreation;
  status: CreationJobStatus;
  result?: CreationResult;
}

export interface CreationJobStoreOptions {
  snapshotPath?: string;
  maxStoredJobs?: number;
}

export class CreationJobStore {
  readonly #jobs = new Map<string, StoredCreationJob>();
  readonly #snapshotPath: string | undefined;
  readonly #maxStoredJobs: number;

  public constructor(options: CreationJobStoreOptions = {}) {
    this.#snapshotPath = options.snapshotPath;
    this.#maxStoredJobs = options.maxStoredJobs ?? 500;
    if (!Number.isInteger(this.#maxStoredJobs) || this.#maxStoredJobs < 1) {
      throw new RangeError("maxStoredJobs는 1 이상의 정수여야 합니다.");
    }
    if (!this.#snapshotPath || !existsSync(this.#snapshotPath)) return;
    const snapshot = JSON.parse(
      readFileSync(this.#snapshotPath, "utf8")
    ) as unknown;
    if (
      typeof snapshot !== "object" ||
      snapshot === null ||
      !("version" in snapshot) ||
      (snapshot.version !== 2 && snapshot.version !== 3) ||
      !("jobs" in snapshot) ||
      !Array.isArray(snapshot.jobs)
    ) {
      throw new Error("저장된 브라우저 작업 파일 형식이 올바르지 않습니다.");
    }
    for (const item of snapshot.jobs) {
      if (typeof item !== "object" || item === null) {
        throw new Error("저장된 브라우저 작업 항목이 올바르지 않습니다.");
      }
      const record = item as Record<string, unknown>;
      const parsedJob = queuedCreationSchema.safeParse(record.job);
      if (!parsedJob.success) {
        const legacyCompiled =
          typeof record.job === "object" &&
          record.job !== null &&
          "compiledProject" in record.job &&
          typeof record.job.compiledProject === "object" &&
          record.job.compiledProject !== null &&
          "sourceActivitySpecId" in record.job.compiledProject;
        if (snapshot.version === 2 && legacyCompiled) {
          // v1 다문제 작업은 새 배치로 재승인해야 한다. 파일은 읽되 실행 큐로 복구하지 않는다.
          continue;
        }
        throw new Error("저장된 브라우저 작업 항목이 올바르지 않습니다.");
      }
      const job = parsedJob.data;
      const status = record.status;
      if (
        status !== "queued" &&
        status !== "creating" &&
        status !== "succeeded" &&
        status !== "failed" &&
        status !== "expired"
      ) {
        throw new Error(`저장된 작업 상태가 올바르지 않습니다: ${String(status)}`);
      }
      const result =
        record.result === undefined
          ? undefined
          : creationResultSchema.parse(record.result);
      if (
        ((status === "succeeded" || status === "failed") && !result) ||
        (result &&
          ((result.ok && status !== "succeeded") ||
            (!result.ok && status !== "failed")))
      ) {
        throw new Error(`저장된 작업 ${job.jobId}의 결과가 올바르지 않습니다.`);
      }
      this.#jobs.set(job.jobId, {
        job,
        status,
        ...(result ? { result } : {})
      });
    }
  }

  #persist(): void {
    const removable = [...this.#jobs.values()]
      .filter(
        (stored) =>
          stored.status === "succeeded" ||
          stored.status === "failed" ||
          stored.status === "expired"
      )
      .sort((left, right) => {
        const leftAt = Date.parse(
          left.result?.completedAt ?? left.job.createdAt
        );
        const rightAt = Date.parse(
          right.result?.completedAt ?? right.job.createdAt
        );
        return leftAt - rightAt;
      });
    while (
      this.#jobs.size > this.#maxStoredJobs &&
      removable.length > 0
    ) {
      const oldest = removable.shift();
      if (oldest) this.#jobs.delete(oldest.job.jobId);
    }
    if (!this.#snapshotPath) return;
    const directory = dirname(this.#snapshotPath);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.#snapshotPath}.tmp`;
    writeFileSync(
      temporaryPath,
      `${JSON.stringify({
        version: 3,
        jobs: [...this.#jobs.values()]
      })}\n`,
      { encoding: "utf8", mode: 0o600 }
    );
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, this.#snapshotPath);
    chmodSync(this.#snapshotPath, 0o600);
  }

  public enqueue(job: QueuedCreation, now = new Date()): StoredCreationJob {
    const parsed = queuedCreationSchema.parse(job);
    if (Date.parse(parsed.expiresAt) <= now.getTime()) {
      throw new RangeError("이미 만료된 생성 작업은 등록할 수 없습니다.");
    }
    if (this.#jobs.has(parsed.jobId)) {
      throw new Error(`이미 사용한 작업 ID입니다: ${parsed.jobId}`);
    }
    const stored: StoredCreationJob = { job: parsed, status: "queued" };
    this.#jobs.set(parsed.jobId, stored);
    this.#persist();
    return stored;
  }

  public markCreating(jobId: string, now = new Date()): StoredCreationJob {
    const stored = this.#jobs.get(jobId);
    if (!stored) throw new Error(`알 수 없는 작업 ID입니다: ${jobId}`);
    if (Date.parse(stored.job.expiresAt) <= now.getTime()) {
      stored.status = "expired";
      this.#persist();
      return stored;
    }
    if (stored.status === "queued" || stored.status === "creating") {
      stored.status = "creating";
      this.#persist();
    }
    return stored;
  }

  public complete(jobId: string, result: CreationResult): StoredCreationJob {
    const stored = this.#jobs.get(jobId);
    if (!stored) throw new Error(`알 수 없는 작업 ID입니다: ${jobId}`);
    const parsed = creationResultSchema.parse(result);
    if (stored.result) {
      if (JSON.stringify(stored.result) !== JSON.stringify(parsed)) {
        throw new Error("완료된 작업에 서로 다른 결과를 저장할 수 없습니다.");
      }
      return stored;
    }
    stored.result = parsed;
    stored.status = parsed.ok ? "succeeded" : "failed";
    this.#persist();
    return stored;
  }

  public get(jobId: string, now = new Date()): StoredCreationJob | null {
    const stored = this.#jobs.get(jobId);
    if (!stored) return null;
    if (
      stored.status !== "succeeded" &&
      stored.status !== "failed" &&
      Date.parse(stored.job.expiresAt) <= now.getTime()
    ) {
      stored.status = "expired";
      this.#persist();
    }
    return stored;
  }

  public findByPayloadHash(
    payloadHash: string,
    now = new Date()
  ): StoredCreationJob | null {
    const match = [...this.#jobs.values()].find(
      (stored) =>
        stored.job.payloadHash === payloadHash &&
        stored.status !== "failed" &&
        stored.status !== "expired"
    );
    if (!match) return null;
    const current = this.get(match.job.jobId, now);
    return current?.status === "expired" ? null : current;
  }
}
