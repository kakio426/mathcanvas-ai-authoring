#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  BridgeJobStore,
  createBridgeHttpServer,
  loadOrCreatePairingSecret
} from "@mathcanvas/bridge-protocol";
import { MathCanvasAuthoringService } from "./service.js";
import { createMcpServer } from "./server.js";

const stateDirectory =
  process.env.MATHCANVAS_STATE_DIR ??
  join(homedir(), ".mathcanvas-ai-authoring");
const secretPath = join(stateDirectory, "pairing-secret");
const port = Number.parseInt(
  process.env.MATHCANVAS_BRIDGE_PORT ?? "38471",
  10
);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("MATHCANVAS_BRIDGE_PORT는 1024~65535 사이여야 합니다.");
}

const pairingSecret = await loadOrCreatePairingSecret(secretPath);
const bridgeStore = new BridgeJobStore({
  snapshotPath: join(stateDirectory, "bridge-jobs.json")
});
const bridgeServer = createBridgeHttpServer({
  store: bridgeStore,
  pairingSecret
});
await new Promise<void>((resolve, reject) => {
  bridgeServer.once("error", reject);
  bridgeServer.listen(port, "127.0.0.1", () => {
    bridgeServer.off("error", reject);
    resolve();
  });
});

process.stderr.write(
  [
    "MathCanvas AI 로컬 연결이 시작되었습니다.",
    "연결 코드는 설치 결과 또는 `pnpm pairing-code` 명령에서 확인하세요.",
    "보안을 위해 MCP 서버 로그에는 연결 코드를 표시하지 않습니다.",
    ""
  ].join("\n")
);

const service = new MathCanvasAuthoringService(bridgeStore, undefined, {
  draftSnapshotPath: join(stateDirectory, "drafts.json")
});
const server = createMcpServer(service);
const transport = new StdioServerTransport();

const shutdown = async () => {
  await server.close();
  await new Promise<void>((resolve) => bridgeServer.close(() => resolve()));
};
process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

await server.connect(transport);
