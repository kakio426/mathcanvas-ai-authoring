#!/usr/bin/env node
import { join } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CreationJobStore,
  ManagedChromeRuntime
} from "@mathcanvas/managed-browser";
import { MathCanvasAuthoringService } from "./service.js";
import { createMcpServer } from "./server.js";
import { quarantineCorruptStateFile } from "./state-recovery.js";
import { InstanceLock } from "./instance-lock.js";
import { resolveStateDirectory } from "./state-directory.js";

const stateDirectory = resolveStateDirectory();
const instanceLock = new InstanceLock(join(stateDirectory, "server.lock"));
instanceLock.acquire();
const browserRuntime = new ManagedChromeRuntime({
  userDataDirectory: join(stateDirectory, "chrome-profile")
});
const jobSnapshotPath = join(stateDirectory, "creation-jobs.json");
const draftSnapshotPath = join(stateDirectory, "drafts.json");

function recoverStateFile(path: string, kind: string): void {
  const backupPath = quarantineCorruptStateFile(path);
  if (backupPath) {
    process.stderr.write(
      `${kind} 상태 파일이 손상되어 보존용 백업으로 옮겼습니다: ${backupPath}\n`
    );
  }
}

let jobStore: CreationJobStore;
try {
  jobStore = new CreationJobStore({ snapshotPath: jobSnapshotPath });
} catch {
  recoverStateFile(jobSnapshotPath, "생성 작업");
  jobStore = new CreationJobStore({ snapshotPath: jobSnapshotPath });
}

process.stderr.write(
  [
    "MathCanvas AI 로컬 MCP 서버가 시작되었습니다.",
    "확장 프로그램과 Computer Use를 사용하지 않습니다.",
    "MathCanvas 전용 Chrome은 대화에서 요청할 때 열립니다.",
    ""
  ].join("\n")
);

let service: MathCanvasAuthoringService;
try {
  service = new MathCanvasAuthoringService(
    browserRuntime,
    jobStore,
    undefined,
    { draftSnapshotPath }
  );
} catch {
  recoverStateFile(draftSnapshotPath, "추천안");
  service = new MathCanvasAuthoringService(
    browserRuntime,
    jobStore,
    undefined,
    { draftSnapshotPath }
  );
}
const server = createMcpServer(service);
const transport = new StdioServerTransport();

const shutdown = async () => {
  await server.close();
  await browserRuntime.close();
  instanceLock.release();
};
process.once("exit", () => instanceLock.release());
process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));

await server.connect(transport);
