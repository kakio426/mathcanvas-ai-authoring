import {
  BRIDGE_PROTOCOL_VERSION,
  extensionHeartbeatSchema,
  extensionJobResultSchema,
  queuedCreationSchema,
  type ExtensionHeartbeat,
  type ExtensionJobResult,
  type QueuedCreation
} from "./schemas.js";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname } from "node:path";

interface StoredJob {
  job: QueuedCreation;
  status: "queued" | "creating" | "succeeded" | "failed" | "expired";
  claimedBy?: string;
  result?: ExtensionJobResult;
}

export class DuplicateBridgeJobError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DuplicateBridgeJobError";
  }
}

export interface BridgeJobStoreOptions {
  snapshotPath?: string;
  maxStoredJobs?: number;
}

export class BridgeJobStore {
  readonly #jobs = new Map<string, StoredJob>();
  #heartbeat: ExtensionHeartbeat | null = null;
  readonly #snapshotPath: string | undefined;
  readonly #maxStoredJobs: number;

  public constructor(options: BridgeJobStoreOptions = {}) {
    this.#snapshotPath = options.snapshotPath;
    this.#maxStoredJobs = options.maxStoredJobs ?? 500;
    if (
      !Number.isInteger(this.#maxStoredJobs) ||
      this.#maxStoredJobs < 1
    ) {
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
      snapshot.version !== 1 ||
      !("jobs" in snapshot) ||
      !Array.isArray(snapshot.jobs)
    ) {
      throw new Error("저장된 브리지 작업 파일 형식이 올바르지 않습니다.");
    }
    for (const item of snapshot.jobs) {
      if (typeof item !== "object" || item === null) {
        throw new Error("저장된 브리지 작업 항목이 올바르지 않습니다.");
      }
      const record = item as Record<string, unknown>;
      const job = queuedCreationSchema.parse(record.job);
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
      const claimedBy =
        typeof record.claimedBy === "string" &&
        /^[A-Za-z0-9._:-]{1,160}$/.test(record.claimedBy)
          ? record.claimedBy
          : undefined;
      const result =
        record.result === undefined
          ? undefined
          : extensionJobResultSchema.parse(record.result);
      if (
        (status === "creating" && !claimedBy) ||
        ((status === "succeeded" || status === "failed") && !result) ||
        (result &&
          (result.jobId !== job.jobId ||
            result.payloadHash !== job.payloadHash ||
            result.instanceId !== claimedBy ||
            (result.ok && status !== "succeeded") ||
            (!result.ok && status !== "failed")))
      ) {
        throw new Error(`저장된 작업 ${job.jobId}의 상태 연결이 올바르지 않습니다.`);
      }
      this.#jobs.set(job.jobId, {
        job,
        status,
        ...(claimedBy ? { claimedBy } : {}),
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
    const jobs = [...this.#jobs.values()].map((stored) => ({
      job: stored.job,
      status: stored.status,
      ...(stored.claimedBy ? { claimedBy: stored.claimedBy } : {}),
      ...(stored.result ? { result: stored.result } : {})
    }));
    writeFileSync(
      temporaryPath,
      `${JSON.stringify({ version: 1, jobs })}\n`,
      { encoding: "utf8", mode: 0o600 }
    );
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, this.#snapshotPath);
    chmodSync(this.#snapshotPath, 0o600);
  }

  public recordHeartbeat(input: unknown): ExtensionHeartbeat {
    const heartbeat = extensionHeartbeatSchema.parse(input);
    this.#heartbeat = heartbeat;
    return heartbeat;
  }

  public latestHeartbeat(now = new Date(), maxAgeMs = 90_000): ExtensionHeartbeat | null {
    if (!this.#heartbeat) return null;
    if (now.getTime() - Date.parse(this.#heartbeat.checkedAt) > maxAgeMs) {
      return null;
    }
    return this.#heartbeat;
  }

  public enqueue(input: unknown, now = new Date()): QueuedCreation {
    const job = queuedCreationSchema.parse(input);
    if (Date.parse(job.expiresAt) <= now.getTime()) {
      throw new RangeError("이미 만료된 생성 작업은 등록할 수 없습니다.");
    }
    if (this.#jobs.has(job.jobId)) {
      throw new DuplicateBridgeJobError(`이미 사용한 작업 ID입니다: ${job.jobId}`);
    }
    const duplicatePayload = [...this.#jobs.values()].find(
      (stored) =>
        stored.job.payloadHash === job.payloadHash &&
        stored.status !== "failed" &&
        stored.status !== "expired"
    );
    if (duplicatePayload) {
      throw new DuplicateBridgeJobError(
        `같은 활동은 이미 생성 대기 또는 완료 상태입니다: ${duplicatePayload.job.jobId}`
      );
    }
    this.#jobs.set(job.jobId, { job, status: "queued" });
    this.#persist();
    return job;
  }

  public claimNext(instanceId: string, now = new Date()): QueuedCreation | null {
    let changed = false;
    for (const stored of this.#jobs.values()) {
      if (
        stored.status !== "succeeded" &&
        stored.status !== "failed" &&
        Date.parse(stored.job.expiresAt) <= now.getTime()
      ) {
        stored.status = "expired";
        changed = true;
      }
    }
    const existingClaim = [...this.#jobs.values()].find(
      (stored) =>
        stored.status === "creating" && stored.claimedBy === instanceId
    );
    if (existingClaim) {
      if (changed) this.#persist();
      return existingClaim.job;
    }

    const next = [...this.#jobs.values()].find(
      (stored) => stored.status === "queued"
    );
    if (!next) {
      if (changed) this.#persist();
      return null;
    }
    next.status = "creating";
    next.claimedBy = instanceId;
    this.#persist();
    return next.job;
  }

  public complete(input: unknown): ExtensionJobResult {
    const result = extensionJobResultSchema.parse(input);
    const stored = this.#jobs.get(result.jobId);
    if (!stored) throw new Error(`알 수 없는 작업 ID입니다: ${result.jobId}`);
    if (stored.job.payloadHash !== result.payloadHash) {
      throw new Error("작업 결과의 payload 해시가 다릅니다.");
    }
    if (stored.claimedBy !== result.instanceId) {
      throw new Error("작업을 가져간 확장 프로그램과 결과 발신자가 다릅니다.");
    }
    if (stored.result) {
      if (JSON.stringify(stored.result) !== JSON.stringify(result)) {
        throw new Error("완료된 작업에 서로 다른 결과를 다시 보낼 수 없습니다.");
      }
      return stored.result;
    }
    stored.result = result;
    stored.status = result.ok ? "succeeded" : "failed";
    this.#persist();
    return result;
  }

  public getStatus(jobId: string, now = new Date()): {
    jobId: string;
    status: StoredJob["status"];
    result?: ExtensionJobResult;
  } | null {
    const stored = this.#jobs.get(jobId);
    if (!stored) return null;
    const expired =
      stored.status !== "succeeded" &&
      stored.status !== "failed" &&
      Date.parse(stored.job.expiresAt) <= now.getTime();
    return {
      jobId,
      status: expired ? "expired" : stored.status,
      ...(stored.result ? { result: stored.result } : {})
    };
  }

  public findByPayloadHash(
    payloadHash: string,
    now = new Date()
  ): {
    jobId: string;
    status: StoredJob["status"];
    result?: ExtensionJobResult;
  } | null {
    if (!/^[a-f0-9]{64}$/.test(payloadHash)) {
      throw new Error("payloadHash 형식이 올바르지 않습니다.");
    }
    const match = [...this.#jobs.values()].find(
      (stored) =>
        stored.job.payloadHash === payloadHash &&
        stored.status !== "failed" &&
        stored.status !== "expired"
    );
    if (!match) return null;
    const current = this.getStatus(match.job.jobId, now);
    return current?.status === "expired" ? null : current;
  }

  public createQueuedJob(
    input: Omit<QueuedCreation, "protocolVersion">
  ): QueuedCreation {
    return queuedCreationSchema.parse({
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      ...input
    });
  }
}
