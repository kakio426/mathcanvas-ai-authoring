export type EvidenceFragment =
  | { readonly kind: "tool"; readonly value: string }
  | { readonly kind: "key"; readonly value: string }
  | {
      readonly kind: "claim";
      readonly claimKind:
        | "contracted"
        | "verified"
        | "released"
        | "lifecycle";
      readonly toolKey: string;
    };

export function parseEvidenceFragment(
  evidenceId: string
): {
  readonly filePath: string;
  readonly fragment?: EvidenceFragment;
} {
  const separator = evidenceId.indexOf("#");
  if (separator === -1) return { filePath: evidenceId };
  const filePath = evidenceId.slice(0, separator);
  const rawFragment = evidenceId.slice(separator + 1);
  if (rawFragment.startsWith("tool=")) {
    return {
      filePath,
      fragment: {
        kind: "tool",
        value: rawFragment.slice("tool=".length)
      }
    };
  }
  if (rawFragment.startsWith("key=")) {
    return {
      filePath,
      fragment: {
        kind: "key",
        value: rawFragment.slice("key=".length)
      }
    };
  }
  if (rawFragment.startsWith("claim=")) {
    const [claimKind, ...toolParts] = rawFragment
      .slice("claim=".length)
      .split(":");
    const toolKey = toolParts.join(":");
    if (
      (claimKind === "contracted" ||
        claimKind === "verified" ||
        claimKind === "released" ||
        claimKind === "lifecycle") &&
      toolKey
    ) {
      return {
        filePath,
        fragment: { kind: "claim", claimKind, toolKey }
      };
    }
  }
  throw new Error(`unsupported-evidence-fragment:${evidenceId}`);
}

export function resolveEvidenceFragment(
  document: unknown,
  fragment: EvidenceFragment | undefined
): unknown {
  if (!fragment) return document;
  if (
    document === null ||
    typeof document !== "object" ||
    Array.isArray(document)
  ) {
    return undefined;
  }
  const record = document as Record<string, unknown>;
  if (fragment.kind === "key") {
    return record[fragment.value];
  }
  if (fragment.kind === "tool") {
    const tools = Array.isArray(record.tools)
      ? record.tools
      : record.modules;
    if (!Array.isArray(tools)) return undefined;
    return tools.find(
      (tool) =>
        tool !== null &&
        typeof tool === "object" &&
        ((tool as Record<string, unknown>).stableKey ===
          fragment.value ||
          (tool as Record<string, unknown>).moduleKey ===
            fragment.value)
    );
  }
  const claims = record.claims;
  if (
    claims === null ||
    typeof claims !== "object" ||
    Array.isArray(claims)
  ) {
    return undefined;
  }
  const toolClaims = (claims as Record<string, unknown>)[
    fragment.toolKey
  ];
  if (
    toolClaims === null ||
    typeof toolClaims !== "object" ||
    Array.isArray(toolClaims)
  ) {
    return undefined;
  }
  return (toolClaims as Record<string, unknown>)[fragment.claimKind];
}
