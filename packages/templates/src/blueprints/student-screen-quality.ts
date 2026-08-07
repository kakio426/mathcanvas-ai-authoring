import type { ActivityBlueprintBody } from "@mathcanvas/contracts";

const WRITING_PAIRS = [
  ["prediction-label", "prediction-box"],
  ["explanation-label", "explanation-box"],
  ["answer-label", "answer-box"]
] as const;

interface StudentScreenQualityOptions {
  readonly questionFontSize?: number;
  readonly compactGlyphRoles?: readonly string[];
  readonly compactGlyphMinimumFontSize?: number;
}

function normalizeWritingLayer(
  roles: ActivityBlueprintBody["toolRoles"],
  gradeMinimumFontSize: number,
  questionFontSize: number,
  compactGlyphRoles: readonly string[],
  compactGlyphMinimumFontSize: number
): ActivityBlueprintBody["toolRoles"] {
  const ordered = roles.map((role) => {
    if (
      (role.intentKind !== "text" && role.intentKind !== "latex") ||
      typeof role.properties.fontSize !== "number"
    ) {
      return role;
    }
    const writingHeader = WRITING_PAIRS.some(
      ([labelRole]) => role.role === labelRole
    );
    const problemText = role.role === "question" || role.role === "prompt";
    const mathPrompt = role.role === "prompt" && role.intentKind === "latex";
    const compactGridGlyph =
      /^hundred-grid-row-\d+$/.test(role.role) ||
      compactGlyphRoles.includes(role.role);
    return {
      ...role,
      properties: {
        ...role.properties,
        fontSize: Math.max(
          role.properties.fontSize,
          compactGridGlyph
            ? compactGlyphMinimumFontSize
            : mathPrompt
              ? 66
            : problemText
            ? questionFontSize
            : writingHeader
              ? 32
              : gradeMinimumFontSize
        )
      }
    };
  });

  for (const [labelRole, boxRole] of WRITING_PAIRS) {
    const labelIndex = ordered.findIndex((role) => role.role === labelRole);
    const boxIndex = ordered.findIndex((role) => role.role === boxRole);
    if (labelIndex < 0 || boxIndex < 0 || labelIndex > boxIndex) continue;
    const [label] = ordered.splice(labelIndex, 1);
    const updatedBoxIndex = ordered.findIndex((role) => role.role === boxRole);
    ordered.splice(updatedBoxIndex + 1, 0, label!);
  }
  return ordered;
}

function releaseWritingHeadersFromCollisionGroups(
  block: ActivityBlueprintBody["layout"]["root"]
): ActivityBlueprintBody["layout"]["root"] {
  const children = block.children.map(
    releaseWritingHeadersFromCollisionGroups
  );
  if (!WRITING_PAIRS.some(([labelRole]) => block.id === labelRole)) {
    return { ...block, children };
  }
  const { flowGroup: _flowGroup, collisionGroup: _collisionGroup, ...rest } =
    block;
  return { ...rest, children };
}

/**
 * Student-screen policy for the released activity family.  It stays in the
 * template layer so activity-specific presentation does not leak into the
 * frozen compiler/validator core.
 */
export function withStudentScreenQuality(
  input: ActivityBlueprintBody,
  options: StudentScreenQualityOptions = {}
): ActivityBlueprintBody {
  const grade = Number(
    input.curriculumBinding.standardCode.match(/^\[(\d)/)?.[1] ?? 6
  );
  const gradeMinimumFontSize = grade <= 2 ? 32 : grade <= 4 ? 30 : 28;
  const toolRoles = normalizeWritingLayer(
    input.toolRoles,
    gradeMinimumFontSize,
    options.questionFontSize ?? 45,
    options.compactGlyphRoles ?? [],
    options.compactGlyphMinimumFontSize ?? 25
  );
  const textRoles = toolRoles
    .filter((role) => role.intentKind === "text" || role.intentKind === "latex")
    .map((role) => role.role);
  const valuePredicates = input.valuePredicates.map((predicate) => {
    if (predicate.kind === "visual.text-fit") {
      const existing = Array.isArray(predicate.parameters.roles)
        ? predicate.parameters.roles.filter(
            (role): role is string => typeof role === "string"
          )
        : [];
      return {
        ...predicate,
        parameters: {
          ...predicate.parameters,
          roles: [...new Set([...existing, ...textRoles])]
        }
      };
    }
    if (predicate.kind === "language.classroom-korean") {
      const existing = Array.isArray(predicate.parameters.promptRoles)
        ? predicate.parameters.promptRoles.filter(
            (role): role is string => typeof role === "string"
          )
        : [];
      const promptRoles = toolRoles
        .filter(
          (role) =>
            role.intentKind === "text" &&
            (role.role === "question" || role.role === "prompt")
        )
        .map((role) => role.role);
      if (existing.length === 0 && promptRoles.length === 0) {
        return predicate;
      }
      return {
        ...predicate,
        parameters: {
          ...predicate.parameters,
          promptRoles: [...new Set([...existing, ...promptRoles])]
        }
      };
    }
    return predicate;
  });
  return {
    ...input,
    toolRoles,
    valuePredicates,
    layout: {
      ...input.layout,
      root: releaseWritingHeadersFromCollisionGroups(input.layout.root)
    }
  };
}
