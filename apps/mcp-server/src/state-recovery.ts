import { existsSync, renameSync } from "node:fs";

export function quarantineCorruptStateFile(
  statePath: string,
  now = new Date()
): string | null {
  if (!existsSync(statePath)) return null;
  const timestamp = now.toISOString().replace(/[^0-9]/g, "");
  const backupPath = `${statePath}.corrupt-${timestamp}`;
  renameSync(statePath, backupPath);
  return backupPath;
}
