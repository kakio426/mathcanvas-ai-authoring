import {
  chmodSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, parse, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(
  new URL("../../../", import.meta.url)
);
export const defaultRawRoot = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "raw"
);
export const defaultSanitizedRoot = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "sanitized"
);
export const defaultResearchRoot = join(
  repositoryRoot,
  "research",
  "mathcanvas"
);

export function assertPathInside(path, root, label) {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  const relation = relative(resolvedRoot, resolvedPath);
  if (
    relation === "" ||
    relation === ".." ||
    relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(relation)
  ) {
    throw new Error(
      `${label}은(는) 허용된 경로 내부의 파일이어야 합니다: ${resolvedRoot}`
    );
  }
  return resolvedPath;
}

export function resolveStateDirectory(
  configured = process.env.MATHCANVAS_STATE_DIR,
  userHome = homedir()
) {
  const target = configured
    ? resolve(configured)
    : join(userHome, ".mathcanvas-ai-authoring");
  if (
    target.includes("\0") ||
    target.length > 1000 ||
    target === parse(target).root ||
    target === resolve(userHome)
  ) {
    throw new Error(
      "MathCanvas state directory는 홈이나 디스크 루트일 수 없습니다."
    );
  }
  return target;
}

function processIsActive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EPERM"
    ) {
      return true;
    }
    return false;
  }
}

export function assertManagedProfileAvailable(stateDirectory) {
  const lockPath = join(stateDirectory, "server.lock");
  if (!existsSync(lockPath)) return;
  let record;
  try {
    record = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    throw new Error(
      `contract-lab-profile-lock-invalid: ${lockPath}`
    );
  }
  const pid = Number(record?.pid);
  if (Number.isInteger(pid) && pid > 0 && processIsActive(pid)) {
    throw new Error(
      `contract-lab-profile-in-use: MathCanvas MCP PID ${pid}`
    );
  }
  throw new Error(
    `contract-lab-profile-stale-lock: ${lockPath}`
  );
}

export function acquireManagedProfileLock(stateDirectory) {
  assertManagedProfileAvailable(stateDirectory);
  const lockPath = join(stateDirectory, "server.lock");
  let descriptor;
  try {
    descriptor = openSync(lockPath, "wx", 0o600);
    writeFileSync(
      descriptor,
      `${JSON.stringify({
        pid: process.pid,
        owner: "contract-lab",
        startedAt: new Date().toISOString()
      })}\n`
    );
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    throw new Error(
      `contract-lab-profile-in-use: ${lockPath}`,
      { cause: error }
    );
  }
  closeSync(descriptor);
  chmodSync(lockPath, 0o600);
  let released = false;
  return () => {
    if (released || !existsSync(lockPath)) return;
    const record = JSON.parse(readFileSync(lockPath, "utf8"));
    if (
      record?.pid === process.pid &&
      record?.owner === "contract-lab"
    ) {
      unlinkSync(lockPath);
    }
    released = true;
  };
}
