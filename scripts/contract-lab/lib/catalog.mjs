import { createHash } from "node:crypto";
import { stableJson } from "./normalize.mjs";

const supportStates = [
  "captured",
  "contracted",
  "verified",
  "released"
];
const evidenceTypes = ["dom", "network", "bundle", "manual"];
const priorityValues = ["p1", "p2", "p3", "backlog"];
const identifierPattern = /^[A-Za-z0-9._:-]{1,200}$/;

function issue(issues, path, message) {
  issues.push({ path, message });
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateUnknowns(tool, index, issues) {
  const unknownFields = new Map();
  if (tool.unknowns !== undefined) {
    if (!Array.isArray(tool.unknowns)) {
      issue(issues, `tools[${index}].unknowns`, "배열이어야 합니다.");
      return unknownFields;
    }
    tool.unknowns.forEach((unknown, unknownIndex) => {
      if (
        !unknown ||
        typeof unknown !== "object" ||
        !["toolId", "moduleKey", "categoryId"].includes(unknown.field) ||
        !isNonEmptyString(unknown.reason)
      ) {
        issue(
          issues,
          `tools[${index}].unknowns[${unknownIndex}]`,
          "field와 구체적인 reason이 필요합니다."
        );
        return;
      }
      unknownFields.set(unknown.field, unknown.reason);
    });
  }
  for (const field of ["toolId", "moduleKey", "categoryId"]) {
    if (!isNonEmptyString(tool[field]) && !unknownFields.has(field)) {
      issue(
        issues,
        `tools[${index}].${field}`,
        "값 또는 구조화된 unknown 사유가 필요합니다."
      );
    }
  }
  return unknownFields;
}

export function validateCatalogSnapshot(snapshot, options = {}) {
  const issues = [];
  const maxSupportState = options.maxSupportState ?? "captured";
  const maxStateIndex = supportStates.indexOf(maxSupportState);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return [{ path: "", message: "snapshot은 객체여야 합니다." }];
  }
  if (snapshot.schemaVersion !== "1.0.0") {
    issue(issues, "schemaVersion", "1.0.0이어야 합니다.");
  }
  if (
    !isNonEmptyString(snapshot.snapshotId) ||
    !identifierPattern.test(snapshot.snapshotId)
  ) {
    issue(issues, "snapshotId", "안정적인 식별자가 필요합니다.");
  }
  if (
    !snapshot.observation ||
    typeof snapshot.observation !== "object" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.observation.observationDate ?? "") ||
    snapshot.observation.origin !== "https://mathcanvas.vivasam.com" ||
    !isNonEmptyString(snapshot.observation.sourcePath) ||
    snapshot.observation.accountScope !== "authenticated-current-user"
  ) {
    issue(
      issues,
      "observation",
      "날짜·origin·sourcePath·accountScope가 필요합니다."
    );
  }
  const categoryKeys = new Set();
  const categoryIds = new Set();
  const categoryByKey = new Map();
  if (!Array.isArray(snapshot.categories)) {
    issue(issues, "categories", "배열이어야 합니다.");
  } else {
    snapshot.categories.forEach((category, index) => {
      const path = `categories[${index}]`;
      if (
        !category ||
        typeof category !== "object" ||
        Array.isArray(category)
      ) {
        issue(issues, path, "category는 객체여야 합니다.");
        return;
      }
      if (
        !isNonEmptyString(category.stableKey) ||
        !identifierPattern.test(category.stableKey)
      ) {
        issue(issues, `${path}.stableKey`, "안정적인 key가 필요합니다.");
      } else if (categoryKeys.has(category.stableKey)) {
        issue(issues, `${path}.stableKey`, "category key가 중복됩니다.");
      } else {
        categoryKeys.add(category.stableKey);
        categoryByKey.set(category.stableKey, category);
      }
      if (!isNonEmptyString(category.observedName)) {
        issue(issues, `${path}.observedName`, "관찰된 이름이 필요합니다.");
      }
      if (isNonEmptyString(category.categoryId)) {
        if (categoryIds.has(category.categoryId)) {
          issue(issues, `${path}.categoryId`, "categoryId가 중복됩니다.");
        }
        categoryIds.add(category.categoryId);
      } else if (!isNonEmptyString(category.unknownReason)) {
        issue(
          issues,
          `${path}.categoryId`,
          "categoryId 또는 unknownReason이 필요합니다."
        );
      }
    });
  }
  if (!Array.isArray(snapshot.tools)) {
    issue(issues, "tools", "배열이어야 합니다.");
    return issues;
  }
  const stableKeys = new Set();
  const toolIds = new Set();
  for (const [index, tool] of snapshot.tools.entries()) {
    const path = `tools[${index}]`;
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
      issue(issues, path, "도구는 객체여야 합니다.");
      continue;
    }
    if (
      !isNonEmptyString(tool.stableKey) ||
      !identifierPattern.test(tool.stableKey)
    ) {
      issue(issues, `${path}.stableKey`, "안정적인 key가 필요합니다.");
    } else if (stableKeys.has(tool.stableKey)) {
      issue(issues, `${path}.stableKey`, "stableKey가 중복됩니다.");
    } else {
      stableKeys.add(tool.stableKey);
    }
    if (!isNonEmptyString(tool.observedName)) {
      issue(issues, `${path}.observedName`, "관찰된 이름이 필요합니다.");
    }
    if (
      !isNonEmptyString(tool.categoryStableKey) ||
      !categoryByKey.has(tool.categoryStableKey)
    ) {
      issue(
        issues,
        `${path}.categoryStableKey`,
        "등록된 category를 참조해야 합니다."
      );
    } else {
      const category = categoryByKey.get(tool.categoryStableKey);
      if (
        isNonEmptyString(tool.categoryId) &&
        isNonEmptyString(category.categoryId) &&
        tool.categoryId !== category.categoryId
      ) {
        issue(
          issues,
          `${path}.categoryId`,
          "참조한 category의 categoryId와 일치해야 합니다."
        );
      }
    }
    validateUnknowns(tool, index, issues);
    if (isNonEmptyString(tool.toolId)) {
      if (toolIds.has(tool.toolId)) {
        issue(issues, `${path}.toolId`, "toolId가 중복됩니다.");
      }
      toolIds.add(tool.toolId);
    }
    if (!Array.isArray(tool.visibleOptions)) {
      issue(issues, `${path}.visibleOptions`, "배열이어야 합니다.");
    }
    if (!Array.isArray(tool.evidence) || tool.evidence.length === 0) {
      issue(issues, `${path}.evidence`, "근거가 하나 이상 필요합니다.");
    } else {
      tool.evidence.forEach((evidence, evidenceIndex) => {
        if (
          !evidence ||
          typeof evidence !== "object" ||
          !evidenceTypes.includes(evidence.type) ||
          !isNonEmptyString(evidence.locator)
        ) {
          issue(
            issues,
            `${path}.evidence[${evidenceIndex}]`,
            "허용된 type과 locator가 필요합니다."
          );
        }
      });
    }
    const stateIndex = supportStates.indexOf(tool.supportState);
    if (stateIndex < 0 || stateIndex > maxStateIndex) {
      issue(
        issues,
        `${path}.supportState`,
        `P0 snapshot은 ${maxSupportState} 이하만 허용합니다.`
      );
    }
    if (
      !priorityValues.includes(tool.deepProbePriority) ||
      !isNonEmptyString(tool.deepProbeReason)
    ) {
      issue(
        issues,
        `${path}.deepProbePriority`,
        "우선순위와 사유가 필요합니다."
      );
    }
  }
  if (
    !snapshot.counts ||
    snapshot.counts.tools !== snapshot.tools.length ||
    snapshot.counts.categories !==
      (Array.isArray(snapshot.categories)
        ? snapshot.categories.length
        : -1)
  ) {
    issue(issues, "counts", "실제 배열 길이와 일치해야 합니다.");
  }
  const expectedToolsByCategory = Object.fromEntries(
    [...categoryKeys]
      .sort()
      .map((key) => [
        key,
        snapshot.tools.filter(
          (tool) => tool.categoryStableKey === key
        ).length
      ])
  );
  if (
    stableJson(snapshot.counts?.toolsByCategory ?? {}) !==
    stableJson(expectedToolsByCategory)
  ) {
    issue(
      issues,
      "counts.toolsByCategory",
      "category별 도구 합계와 일치해야 합니다."
    );
  }
  const expectedFingerprint = catalogFingerprint(snapshot);
  if (snapshot.paletteFingerprint !== expectedFingerprint) {
    issue(
      issues,
      "paletteFingerprint",
      `계산된 fingerprint ${expectedFingerprint}와 다릅니다.`
    );
  }
  return issues;
}

export function catalogFingerprint(snapshot) {
  const stableSurface = {
    categories: (snapshot.categories ?? []).map((category) => ({
      stableKey: category.stableKey,
      observedName: category.observedName,
      categoryId: category.categoryId ?? null
    })),
    tools: (snapshot.tools ?? []).map((tool) => ({
      stableKey: tool.stableKey,
      observedName: tool.observedName,
      toolId: tool.toolId ?? null,
      categoryId: tool.categoryId ?? null,
      moduleKey: tool.moduleKey ?? null,
      visibleOptions: tool.visibleOptions ?? []
    }))
  };
  return createHash("sha256")
    .update(stableJson(stableSurface))
    .digest("hex");
}

export function normalizeCatalogSnapshot(snapshot) {
  const categories = [...(snapshot.categories ?? [])].sort((left, right) =>
    String(left.stableKey).localeCompare(String(right.stableKey))
  );
  const categoryOrder = new Map(
    categories.map((category, index) => [category.stableKey, index])
  );
  const tools = [...(snapshot.tools ?? [])]
    .map((tool) => ({
      ...tool,
      visibleOptions: [...(tool.visibleOptions ?? [])].sort((left, right) =>
        String(left).localeCompare(String(right))
      ),
      unknowns: [...(tool.unknowns ?? [])].sort((left, right) =>
        String(left.field).localeCompare(String(right.field))
      ),
      evidence: [...(tool.evidence ?? [])].sort((left, right) =>
        `${left.type}:${left.locator}`.localeCompare(
          `${right.type}:${right.locator}`
        )
      )
    }))
    .sort((left, right) => {
      const categoryComparison =
        (categoryOrder.get(left.categoryStableKey) ??
          Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(right.categoryStableKey) ??
          Number.MAX_SAFE_INTEGER);
      return (
        categoryComparison ||
        String(left.stableKey).localeCompare(String(right.stableKey))
      );
    });
  const toolsByCategory = Object.fromEntries(
    categories.map((category) => [
      category.stableKey,
      tools.filter(
        (tool) => tool.categoryStableKey === category.stableKey
      ).length
    ])
  );
  const normalized = {
    ...snapshot,
    categories,
    tools,
    counts: {
      categories: categories.length,
      tools: tools.length,
      toolsByCategory
    }
  };
  return {
    ...normalized,
    paletteFingerprint: catalogFingerprint(normalized)
  };
}
