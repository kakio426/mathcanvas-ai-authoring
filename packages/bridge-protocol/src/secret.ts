import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const secretPattern = /^[a-f0-9]{64}$/;

export async function loadOrCreatePairingSecret(path: string): Promise<string> {
  try {
    const existing = (await readFile(path, "utf8")).trim();
    if (!secretPattern.test(existing)) {
      throw new Error("저장된 연결 코드 형식이 올바르지 않습니다.");
    }
    return existing;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : undefined;
    if (code !== "ENOENT") throw error;
  }

  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const secret = randomBytes(32).toString("hex");
  try {
    await writeFile(path, `${secret}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx"
    });
    await chmod(path, 0o600);
    return secret;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : undefined;
    if (code !== "EEXIST") throw error;
    const existing = (await readFile(path, "utf8")).trim();
    if (!secretPattern.test(existing)) {
      throw new Error("동시에 생성된 연결 코드 형식이 올바르지 않습니다.");
    }
    return existing;
  }
}
