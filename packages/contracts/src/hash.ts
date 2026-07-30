import { createHash, timingSafeEqual } from "node:crypto";
import {
  ACTIVITY_SPEC_SCHEMA_VERSION,
  CONTRACT_SCHEMA_VERSION,
  type ApprovalReceipt
} from "./schemas.js";
import { assertNoSensitiveKeys } from "./security.js";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0
        )
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("해시 입력에는 유한한 숫자만 사용할 수 있습니다.");
  }
  if (typeof value === "undefined" || typeof value === "function") {
    throw new TypeError("해시 입력에는 undefined 또는 함수를 사용할 수 없습니다.");
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  assertNoSensitiveKeys(value);
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function createApprovalReceipt(
  spec: unknown,
  approvedAt: Date,
  expiresAt: Date
): ApprovalReceipt {
  if (expiresAt.getTime() <= approvedAt.getTime()) {
    throw new RangeError("승인 만료 시각은 승인 시각보다 뒤여야 합니다.");
  }
  const activitySpecHash = sha256Hex(spec);
  const approvalHash = sha256Hex({
    purpose: "mathcanvas-create-new-project",
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    activitySpecSchemaVersion: ACTIVITY_SPEC_SCHEMA_VERSION,
    activitySpecHash,
    approvedAt: approvedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });
  return {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    activitySpecHash,
    approvalHash,
    approvedAt: approvedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
}

export function verifyApprovalReceipt(
  spec: unknown,
  receipt: ApprovalReceipt,
  now: Date
): boolean {
  if (Date.parse(receipt.expiresAt) <= now.getTime()) return false;
  const expected = createApprovalReceipt(
    spec,
    new Date(receipt.approvedAt),
    new Date(receipt.expiresAt)
  );
  const expectedBytes = Buffer.from(expected.approvalHash, "hex");
  const actualBytes = Buffer.from(receipt.approvalHash, "hex");
  return (
    expected.activitySpecHash === receipt.activitySpecHash &&
    expectedBytes.length === actualBytes.length &&
    timingSafeEqual(expectedBytes, actualBytes)
  );
}

export function createSeededRandom(seed: string): () => number {
  if (seed.length === 0) throw new RangeError("seed는 비어 있을 수 없습니다.");
  const digest = createHash("sha256").update(seed).digest();
  let state =
    (digest.readUInt32LE(0) ^
      digest.readUInt32LE(4) ^
      digest.readUInt32LE(8) ^
      digest.readUInt32LE(12)) >>>
    0;
  if (state === 0) state = 0x9e3779b9;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
