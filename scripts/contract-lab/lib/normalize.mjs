const sensitiveKeyPattern =
  /(?:^|[-_.])(authorization|cookie|set-cookie|token|access[-_]?token|refresh[-_]?token|session|password|passwd|secret|api[-_]?key)(?:$|[-_.])/i;
const emailPattern =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi;
const jwtPattern =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return value;
    }
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return value;
  }
}

function sanitizeString(value) {
  if (isoTimestampPattern.test(value)) return "<redacted-timestamp>";
  return safeUrl(value)
    .replace(
      /\/ko\/view\/[A-Za-z0-9_-]{1,160}/g,
      "/ko/view/<redacted-project>"
    )
    .replace(
      /\/api\/project\/[A-Za-z0-9_-]{1,160}/g,
      "/api/project/<redacted-project>"
    )
    .replace(emailPattern, "<redacted-email>")
    .replace(bearerPattern, "<redacted-bearer>")
    .replace(jwtPattern, "<redacted-jwt>");
}

export function sanitizeUnknown(value) {
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (value !== null && typeof value === "object") {
    const output = {};
    const redactedFields = [];
    for (const [key, child] of Object.entries(value).sort(
      ([left], [right]) => left.localeCompare(right)
    )) {
      if (sensitiveKeyPattern.test(key)) {
        redactedFields.push(key);
        continue;
      }
      output[key] = sanitizeUnknown(child);
    }
    if (redactedFields.length > 0) {
      output._redactedFields = redactedFields.sort();
    }
    return output;
  }
  if (typeof value === "string") return sanitizeString(value);
  return value;
}

function collectSensitiveFindings(value, path, findings) {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      collectSensitiveFindings(child, `${path}[${index}]`, findings)
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (sensitiveKeyPattern.test(key)) {
        findings.push(`${childPath}:sensitive-key`);
      }
      collectSensitiveFindings(child, childPath, findings);
    }
    return;
  }
  if (typeof value !== "string") return;
  if (emailPattern.test(value)) findings.push(`${path}:email`);
  emailPattern.lastIndex = 0;
  if (bearerPattern.test(value)) findings.push(`${path}:bearer`);
  bearerPattern.lastIndex = 0;
  if (jwtPattern.test(value)) findings.push(`${path}:jwt`);
  jwtPattern.lastIndex = 0;
}

export function sensitiveFindings(value) {
  const findings = [];
  collectSensitiveFindings(value, "", findings);
  return findings.sort();
}

export function assertNoSensitiveData(value) {
  const findings = sensitiveFindings(value);
  if (findings.length > 0) {
    throw new Error(
      `sanitized-secret-scan-failed: ${findings.join(", ")}`
    );
  }
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)])
    );
  }
  return value;
}

export function stableJson(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}
