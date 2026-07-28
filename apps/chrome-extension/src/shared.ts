export const BRIDGE_PROTOCOL_VERSION = "1.0.0" as const;
export const EXTENSION_VERSION = "1.0.0" as const;
export const LOCAL_BRIDGE_ORIGIN = "http://127.0.0.1:38471" as const;

export type ConnectionState =
  | "bridge-not-paired"
  | "mathcanvas-tab-missing"
  | "login-required"
  | "contract-mismatch"
  | "ready";

export interface PageInspection {
  state: Exclude<ConnectionState, "bridge-not-paired" | "mathcanvas-tab-missing">;
  detailCode?: string;
}

export interface ExtensionHeartbeat {
  protocolVersion: typeof BRIDGE_PROTOCOL_VERSION;
  instanceId: string;
  extensionVersion: typeof EXTENSION_VERSION;
  state: ConnectionState;
  checkedAt: string;
  mathCanvasTabUrl?: string;
  contractVersion?: "1.0.0";
  detailCode?: string;
}

export interface QueuedCreation {
  protocolVersion: typeof BRIDGE_PROTOCOL_VERSION;
  jobId: string;
  approvalHash: string;
  payloadHash: string;
  createdAt: string;
  expiresAt: string;
  compiledProject: {
    contractVersion: string;
    payloadHash: string;
    payload: Record<string, unknown>;
  };
}

export interface ExtensionJobResult {
  protocolVersion: typeof BRIDGE_PROTOCOL_VERSION;
  jobId: string;
  instanceId: string;
  payloadHash: string;
  ok: boolean;
  completedAt: string;
  projectId?: string;
  editorUrl?: string;
  errorCode?: string;
  httpStatus?: number;
}

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
  return value;
}

export async function sha256Canonical(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function errorCodeForStatus(status: number): string {
  if (status === 400) return "contract-mismatch";
  if (status === 401) return "login-required";
  if (status === 403) return "permission-denied";
  if (status >= 500) return "mathcanvas-unavailable";
  return "project-create-failed";
}
