import { join } from "node:path";
import {
  CreationJobStore,
  ManagedChromeRuntime
} from "@mathcanvas/managed-browser";
import { InstanceLock } from "./instance-lock.js";
import { MathCanvasAuthoringService } from "./service.js";
import { resolveStateDirectory } from "./state-directory.js";
import { quarantineCorruptStateFile } from "./state-recovery.js";
import type { WorksheetV2AuthoringRuntime } from "./worksheet-v2.js";

export interface AuthoringRuntimeOptions {
  stateDirectory?: string;
  headless?: boolean;
  logger?: (message: string) => void;
}

export interface AuthoringRuntime {
  service: MathCanvasAuthoringService;
  worksheetV2: WorksheetV2AuthoringRuntime;
  browserRuntime: ManagedChromeRuntime;
  jobStore: CreationJobStore;
  closeBrowser(): Promise<void>;
  dispose(): Promise<void>;
}

function recoverStateFile(
  path: string,
  kind: string,
  logger: (message: string) => void
): void {
  const backupPath = quarantineCorruptStateFile(path);
  if (backupPath) {
    logger(`${kind} 상태 파일이 손상되어 보존용 백업으로 옮겼습니다: ${backupPath}`);
  }
}

export function createAuthoringRuntime(
  options: AuthoringRuntimeOptions = {}
): AuthoringRuntime {
  const logger = options.logger ?? ((message) => process.stderr.write(`${message}\n`));
  const stateDirectory = options.stateDirectory ?? resolveStateDirectory();
  const instanceLock = new InstanceLock(join(stateDirectory, "server.lock"));
  instanceLock.acquire();
  const browserRuntime = new ManagedChromeRuntime({
    userDataDirectory: join(stateDirectory, "chrome-profile"),
    headless: options.headless ?? true
  });
  const jobSnapshotPath = join(stateDirectory, "creation-jobs.json");
  const draftSnapshotPath = join(stateDirectory, "drafts.json");

  let jobStore: CreationJobStore;
  try {
    jobStore = new CreationJobStore({ snapshotPath: jobSnapshotPath });
  } catch {
    recoverStateFile(jobSnapshotPath, "생성 작업", logger);
    jobStore = new CreationJobStore({ snapshotPath: jobSnapshotPath });
  }

  let service: MathCanvasAuthoringService;
  try {
    service = new MathCanvasAuthoringService(
      browserRuntime,
      jobStore,
      undefined,
      { draftSnapshotPath }
    );
  } catch {
    recoverStateFile(draftSnapshotPath, "추천안", logger);
    service = new MathCanvasAuthoringService(
      browserRuntime,
      jobStore,
      undefined,
      { draftSnapshotPath }
    );
  }

  let disposed = false;
  const closeBrowser = () => browserRuntime.close();
  return {
    service,
    worksheetV2: service.worksheetV2,
    browserRuntime,
    jobStore,
    closeBrowser,
    async dispose() {
      if (disposed) return;
      disposed = true;
      await browserRuntime.close();
      instanceLock.release();
    }
  };
}
