import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { URL } from "node:url";
import { BRIDGE_PROTOCOL_VERSION } from "./schemas.js";
import { BridgeJobStore } from "./store.js";

const secretHeader = "x-mathcanvas-bridge-secret";
const instanceHeader = "x-mathcanvas-instance-id";
const maximumBodyBytes = 3 * 1024 * 1024;

function secureEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

function json(
  response: ServerResponse,
  status: number,
  body: unknown,
  origin?: string
): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  if (origin) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
  }
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumBodyBytes) throw new RangeError("요청 본문이 너무 큽니다.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export interface BridgeHttpServerOptions {
  store: BridgeJobStore;
  pairingSecret: string;
}

export function createBridgeHttpServer({
  store,
  pairingSecret
}: BridgeHttpServerOptions) {
  if (!/^[a-f0-9]{64}$/.test(pairingSecret)) {
    throw new Error("pairingSecret은 256비트 16진수여야 합니다.");
  }

  return createServer(async (request, response) => {
    const origin = request.headers.origin;
    const allowedOrigin =
      typeof origin === "string" && origin.startsWith("chrome-extension://")
        ? origin
        : undefined;

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) {
        json(response, 403, { error: "origin-not-allowed" });
        return;
      }
      response.statusCode = 204;
      response.setHeader("access-control-allow-origin", allowedOrigin);
      response.setHeader(
        "access-control-allow-headers",
        "content-type, x-mathcanvas-bridge-secret, x-mathcanvas-instance-id"
      );
      response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      response.setHeader("access-control-max-age", "600");
      response.end();
      return;
    }

    if (!allowedOrigin) {
      json(response, 403, { error: "origin-not-allowed" });
      return;
    }
    const providedSecret = request.headers[secretHeader];
    if (
      typeof providedSecret !== "string" ||
      !secureEqual(providedSecret, pairingSecret)
    ) {
      json(response, 401, { error: "bridge-not-paired" }, allowedOrigin);
      return;
    }

    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    try {
      if (request.method === "GET" && url.pathname === "/bridge/v1/health") {
        json(
          response,
          200,
          {
            protocolVersion: BRIDGE_PROTOCOL_VERSION,
            localServer: "ready",
            heartbeat: store.latestHeartbeat()
          },
          allowedOrigin
        );
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/bridge/v1/heartbeat"
      ) {
        const heartbeat = store.recordHeartbeat(await readJson(request));
        json(response, 200, heartbeat, allowedOrigin);
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/bridge/v1/jobs/next"
      ) {
        const instanceId = request.headers[instanceHeader];
        if (typeof instanceId !== "string" || instanceId.length === 0) {
          json(response, 400, { error: "instance-id-required" }, allowedOrigin);
          return;
        }
        json(
          response,
          200,
          { job: store.claimNext(instanceId) },
          allowedOrigin
        );
        return;
      }
      const resultMatch = url.pathname.match(
        /^\/bridge\/v1\/jobs\/([A-Za-z0-9._:-]+)\/result$/
      );
      if (request.method === "POST" && resultMatch) {
        const body = await readJson(request);
        if (
          typeof body !== "object" ||
          body === null ||
          !("jobId" in body) ||
          body.jobId !== resultMatch[1]
        ) {
          json(response, 400, { error: "job-id-mismatch" }, allowedOrigin);
          return;
        }
        json(response, 200, store.complete(body), allowedOrigin);
        return;
      }
      json(response, 404, { error: "not-found" }, allowedOrigin);
    } catch (error) {
      json(
        response,
        error instanceof RangeError ? 413 : 400,
        {
          error: "invalid-request",
          message: error instanceof Error ? error.message : "잘못된 요청입니다."
        },
        allowedOrigin
      );
    }
  });
}
