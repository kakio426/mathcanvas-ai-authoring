const forbiddenKeyPattern =
  /^(authorization|accesstoken|access_token|refreshtoken|refresh_token|token|jwt|password|cookie|set-cookie)$/i;

export class SensitiveDataError extends Error {
  public constructor(public readonly path: string) {
    super(`민감한 인증 필드는 전달할 수 없습니다: ${path}`);
    this.name = "SensitiveDataError";
  }
}

export function assertNoSensitiveKeys(
  value: unknown,
  path = "$",
  visited = new WeakSet<object>()
): void {
  if (value === null || typeof value !== "object") return;
  if (visited.has(value)) return;
  visited.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSensitiveKeys(item, `${path}[${index}]`, visited)
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (forbiddenKeyPattern.test(key)) {
      throw new SensitiveDataError(childPath);
    }
    assertNoSensitiveKeys(child, childPath, visited);
  }
}

const jwtPattern = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/gi;
const namedSecretPattern =
  /\b(accessToken|access_token|refreshToken|refresh_token|authorization|password)\b\s*[:=]\s*["']?[^"',\s}]+/gi;

export function redactSensitiveText(value: string): string {
  return value
    .replace(jwtPattern, "[REDACTED_JWT]")
    .replace(bearerPattern, "Bearer [REDACTED]")
    .replace(namedSecretPattern, (_match, key: string) => `${key}=[REDACTED]`);
}
