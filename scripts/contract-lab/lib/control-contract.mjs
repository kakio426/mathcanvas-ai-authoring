const integrationTargets = new Set([
  "tool-adapter",
  "managed-browser-operation",
  "internal-editor-action",
  "excluded-by-policy"
]);
const adapterStatuses = new Set([
  "queued",
  "registered",
  "excluded-by-policy"
]);
const contractStatuses = new Set([
  "captured",
  "contracted",
  "verified",
  "released"
]);
const publicExposures = new Set([
  "indirect-existing-flow",
  "none"
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function issue(issues, path, message) {
  issues.push({ path, message });
}

function validateMapping(mapping, path, issues) {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    issue(issues, path, "mapping은 객체여야 합니다.");
    return;
  }
  if (!isNonEmptyString(mapping.controlId)) {
    issue(issues, `${path}.controlId`, "controlId가 필요합니다.");
  }
  if (!isNonEmptyString(mapping.observedName)) {
    issue(issues, `${path}.observedName`, "관찰된 이름이 필요합니다.");
  }
  if (!integrationTargets.has(mapping.integrationTarget)) {
    issue(
      issues,
      `${path}.integrationTarget`,
      "허용된 MCP 연결 결정이 필요합니다."
    );
  }
  if (!publicExposures.has(mapping.publicMcpExposure)) {
    issue(
      issues,
      `${path}.publicMcpExposure`,
      "공개 노출 여부가 필요합니다."
    );
  }
  if (!contractStatuses.has(mapping.contractStatus)) {
    issue(
      issues,
      `${path}.contractStatus`,
      "허용된 계약 상태가 필요합니다."
    );
  }
  if (!adapterStatuses.has(mapping.adapterStatus)) {
    issue(
      issues,
      `${path}.adapterStatus`,
      "허용된 adapter 상태가 필요합니다."
    );
  }
  if (!isNonEmptyString(mapping.safetyDecision)) {
    issue(
      issues,
      `${path}.safetyDecision`,
      "안전 결정이 필요합니다."
    );
  }
  if (mapping.integrationTarget === "tool-adapter") {
    if (mapping.publicMcpExposure !== "indirect-existing-flow") {
      issue(
        issues,
        `${path}.publicMcpExposure`,
        "콘텐츠 adapter는 기존 승인 흐름을 통해서만 간접 노출해야 합니다."
      );
    }
    if (
      !Array.isArray(mapping.requiredLifecycle) ||
      mapping.requiredLifecycle.length === 0
    ) {
      issue(
        issues,
        `${path}.requiredLifecycle`,
        "adapter 검증 lifecycle이 필요합니다."
      );
    }
    if (!isNonEmptyString(mapping.contractFamily)) {
      issue(
        issues,
        `${path}.contractFamily`,
        "contract family 또는 조사 대기 family가 필요합니다."
      );
    }
  } else if (!isNonEmptyString(mapping.exclusionOrOperationReason)) {
    issue(
      issues,
      `${path}.exclusionOrOperationReason`,
      "adapter가 아닌 연결 결정에는 이유가 필요합니다."
    );
  }
}

export function validateControlContractMatrix(matrix, catalog) {
  const issues = [];
  if (!matrix || typeof matrix !== "object" || Array.isArray(matrix)) {
    return [{ path: "", message: "matrix는 객체여야 합니다." }];
  }
  if (matrix.schemaVersion !== "1.0.0") {
    issue(issues, "schemaVersion", "1.0.0이어야 합니다.");
  }
  if (!isNonEmptyString(matrix.matrixId)) {
    issue(issues, "matrixId", "matrix ID가 필요합니다.");
  }
  if (
    matrix.catalogFingerprint !== catalog?.paletteFingerprint
  ) {
    issue(
      issues,
      "catalogFingerprint",
      "검증한 catalog fingerprint와 일치해야 합니다."
    );
  }
  const expectedMcpTools = [
    "mathcanvas_check_connection",
    "mathcanvas_create_new_project",
    "mathcanvas_get_job_status",
    "mathcanvas_open_workspace",
    "mathcanvas_recommend_activity"
  ];
  if (
    JSON.stringify(matrix.existingPublicMcpTools) !==
    JSON.stringify(expectedMcpTools)
  ) {
    issue(
      issues,
      "existingPublicMcpTools",
      "현재의 제한형 MCP 표면만 기록해야 합니다."
    );
  }
  const catalogTools = new Map(
    (catalog?.tools ?? []).map((tool) => [tool.stableKey, tool])
  );
  const mappingIds = new Set();
  if (!Array.isArray(matrix.toolMappings)) {
    issue(issues, "toolMappings", "배열이어야 합니다.");
  } else {
    matrix.toolMappings.forEach((mapping, index) => {
      const path = `toolMappings[${index}]`;
      validateMapping(mapping, path, issues);
      if (mappingIds.has(mapping?.controlId)) {
        issue(issues, `${path}.controlId`, "controlId가 중복됩니다.");
      }
      mappingIds.add(mapping?.controlId);
      const tool = catalogTools.get(mapping?.controlId);
      if (!tool) {
        issue(
          issues,
          `${path}.controlId`,
          "catalog의 tool을 참조해야 합니다."
        );
      } else if (tool.observedName !== mapping.observedName) {
        issue(
          issues,
          `${path}.observedName`,
          "catalog의 관찰 이름과 일치해야 합니다."
        );
      }
    });
  }
  for (const toolId of catalogTools.keys()) {
    if (!mappingIds.has(toolId)) {
      issue(
        issues,
        "toolMappings",
        `catalog tool ${toolId}의 MCP 연결 결정이 없습니다.`
      );
    }
  }
  const editorControlIds = new Set();
  if (!Array.isArray(matrix.editorControls)) {
    issue(issues, "editorControls", "배열이어야 합니다.");
  } else {
    matrix.editorControls.forEach((mapping, index) => {
      const path = `editorControls[${index}]`;
      validateMapping(mapping, path, issues);
      if (editorControlIds.has(mapping?.controlId)) {
        issue(issues, `${path}.controlId`, "controlId가 중복됩니다.");
      }
      editorControlIds.add(mapping?.controlId);
      if (mapping?.publicMcpExposure !== "none") {
        issue(
          issues,
          `${path}.publicMcpExposure`,
          "UI 제어는 버튼별 공개 MCP로 노출하지 않습니다."
        );
      }
    });
  }
  if (
    !matrix.counts ||
    matrix.counts.catalogTools !== catalogTools.size ||
    matrix.counts.toolMappings !== matrix.toolMappings?.length ||
    matrix.counts.editorControls !== matrix.editorControls?.length ||
    matrix.counts.totalObservedControls !==
      (matrix.toolMappings?.length ?? 0) +
        (matrix.editorControls?.length ?? 0)
  ) {
    issue(issues, "counts", "matrix 배열 길이와 일치해야 합니다.");
  }
  const bundleMappings = (matrix.toolMappings ?? []).filter(
    (mapping) => mapping?.bundleEvidence != null
  );
  const expectedBundleCounts = {
    bundleAnalyzedMathTools: bundleMappings.length,
    bundleVariants: bundleMappings.reduce(
      (sum, mapping) =>
        sum + (mapping.bundleEvidence?.variants ?? 0),
      0
    ),
    bundleSubToolbarOptions: bundleMappings.reduce(
      (sum, mapping) =>
        sum +
        (mapping.bundleEvidence?.subToolbarOptions?.length ?? 0),
      0
    )
  };
  for (const [field, value] of Object.entries(expectedBundleCounts)) {
    if (matrix.counts?.[field] !== value) {
      issue(
        issues,
        `counts.${field}`,
        `bundle evidence 실제 합계 ${value}와 일치해야 합니다.`
      );
    }
  }
  if (
    bundleMappings.some(
      (mapping) => mapping.surface !== "math-palette"
    )
  ) {
    issue(
      issues,
      "toolMappings.bundleEvidence",
      "bundle module evidence는 수학 팔레트 도구에만 연결합니다."
    );
  }
  return issues;
}
