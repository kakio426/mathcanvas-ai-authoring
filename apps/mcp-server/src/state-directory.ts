import { homedir } from "node:os";
import { join, parse, resolve } from "node:path";

export function resolveStateDirectory(
  configured = process.env.MATHCANVAS_STATE_DIR,
  userHome = homedir()
): string {
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
      "MATHCANVAS_STATE_DIR은 홈이나 디스크 루트가 아닌 전용 폴더여야 합니다."
    );
  }
  return target;
}
