#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";
import {
  validateControlContractMatrix
} from "./lib/control-contract.mjs";

const existingPublicMcpTools = [
  "mathcanvas_check_connection",
  "mathcanvas_create_new_project",
  "mathcanvas_get_job_status",
  "mathcanvas_open_workspace",
  "mathcanvas_recommend_activity"
];
const fullLifecycle = [
  "compile",
  "create-canary",
  "render",
  "manipulate-if-required",
  "save",
  "reopen",
  "round-trip-compare"
];
const registeredAdapters = new Set([
  "NO03FM",
  "common.rectangle",
  "common.text",
  "common.formula"
]);
const commonFamilies = {
  "common.pen": "canvas-pen-elements",
  "common.point-line": "native-draw-object",
  "common.rectangle": "native-draw-object",
  "common.circle": "native-draw-object",
  "common.text": "native-text-object",
  "common.formula": "native-latex-object"
};

function toolMapping(tool, bundleTool) {
  const isAdapter =
    tool.controlKind === "content-tool";
  if (isAdapter) {
    const shapeFamilies = [
      ...new Set(
        (bundleTool?.factoryVariants ?? []).map(
          (variant) => variant.shapeFamily
        )
      )
    ].sort();
    return {
      controlId: tool.stableKey,
      observedName: tool.observedName,
      surface: tool.surfaceKind,
      controlKind: tool.controlKind,
      integrationTarget: "tool-adapter",
      publicMcpExposure: "indirect-existing-flow",
      publicMcpPath: [
        "mathcanvas_recommend_activity",
        "mathcanvas_create_new_project"
      ],
      contractStatus: tool.supportState,
      contractFamily:
        commonFamilies[tool.stableKey] ??
        (bundleTool
          ? `bundle-shape-family:${shapeFamilies.join("+")}`
          : "deep-probe-required"),
      bundleEvidence: bundleTool
        ? {
            variants: bundleTool.variants.length,
            subToolbarOptions:
              bundleTool.subToolbarOptions.map(
                (option) => option.observedLabel
              ),
            shapeFamilies,
            factoryCoverage: bundleTool.factoryCoverage
          }
        : null,
      adapterStatus: registeredAdapters.has(tool.stableKey)
        ? "registered"
        : "queued",
      requiredLifecycle: fullLifecycle,
      safetyDecision:
        "명시적 교사 승인 뒤 새 프로젝트 payload에만 사용하며 기존 프로젝트는 수정하지 않습니다."
    };
  }
  return {
    controlId: tool.stableKey,
    observedName: tool.observedName,
    surface: tool.surfaceKind,
    controlKind: tool.controlKind,
    integrationTarget: "internal-editor-action",
    publicMcpExposure: "none",
    contractStatus: tool.supportState,
    adapterStatus: "excluded-by-policy",
    bundleEvidence: null,
    requiredLifecycle: [],
    safetyDecision:
      "create-only 경계에서 기존 객체를 편집·삭제하는 공개 명령을 만들지 않습니다.",
    exclusionOrOperationReason: tool.deepProbeReason
  };
}

function editorControl(
  controlId,
  observedName,
  surface,
  integrationTarget,
  reason,
  safetyDecision
) {
  return {
    controlId,
    observedName,
    surface,
    controlKind: "editor-control",
    integrationTarget,
    publicMcpExposure: "none",
    contractStatus: "captured",
    adapterStatus: "excluded-by-policy",
    requiredLifecycle: [],
    safetyDecision,
    exclusionOrOperationReason: reason
  };
}

const editorControls = [
  editorControl(
    "left.tool-settings",
    "도구 설정",
    "left-navigation",
    "internal-editor-action",
    "도구 활성화 설정은 새 payload의 moduleArr로 컴파일하며 UI 클릭 자체는 공개하지 않습니다.",
    "기존 프로젝트 설정을 UI로 수정하지 않습니다."
  ),
  editorControl(
    "left.panel-collapse",
    "도구 패널 접기",
    "left-navigation",
    "excluded-by-policy",
    "편집기 표시 상태일 뿐 생성 payload의 학습 콘텐츠가 아닙니다.",
    "공개 MCP 표면에 추가하지 않습니다."
  ),
  ...[
    ["Unit01", "수와 연산"],
    ["Unit02", "변화와 관계"],
    ["Unit03", "도형과 측정"],
    ["Unit04", "자료와 가능성"]
  ].map(([unit, name]) =>
    editorControl(
      `left.category-toggle.${unit}`,
      `${name} 펼치기/접기`,
      "left-navigation",
      "excluded-by-policy",
      "팔레트 탐색 UI이며 adapter registry는 category ID로 직접 찾습니다.",
      "공개 MCP 표면에 추가하지 않습니다."
    )
  ),
  editorControl(
    "viewport.refresh",
    "새로고침",
    "right-viewport",
    "managed-browser-operation",
    "canary 재열기와 렌더 검증 과정에서만 사용합니다.",
    "미저장 변경이 있는 사용자 프로젝트에는 실행하지 않습니다."
  ),
  editorControl(
    "viewport.fullscreen",
    "전체 화면",
    "right-viewport",
    "excluded-by-policy",
    "표시 모드이며 생성 payload나 수학 의미를 바꾸지 않습니다.",
    "공개 MCP 표면에 추가하지 않습니다."
  ),
  editorControl(
    "viewport.grid",
    "그리드",
    "right-viewport",
    "managed-browser-operation",
    "활동 blueprint의 canvas option으로 컴파일하고 UI 토글은 공개하지 않습니다.",
    "승인된 새 프로젝트 payload에서만 설정합니다."
  ),
  editorControl(
    "viewport.zoom-in",
    "확대",
    "right-viewport",
    "managed-browser-operation",
    "시각 검증의 viewport 정규화에만 사용합니다.",
    "프로젝트 콘텐츠와 분리된 표시 상태로 취급합니다."
  ),
  editorControl(
    "viewport.zoom-out",
    "축소",
    "right-viewport",
    "managed-browser-operation",
    "시각 검증의 viewport 정규화에만 사용합니다.",
    "프로젝트 콘텐츠와 분리된 표시 상태로 취급합니다."
  ),
  editorControl(
    "viewport.pan",
    "이동",
    "right-viewport",
    "managed-browser-operation",
    "렌더 확인을 위한 viewport 탐색에만 사용합니다.",
    "프로젝트 객체를 이동시키는 편집 명령과 분리합니다."
  ),
  editorControl(
    "lifecycle.capture",
    "캡처",
    "top-lifecycle",
    "managed-browser-operation",
    "승인 전 미리보기와 시각 회귀 증거 생성 후보입니다.",
    "캡처 파일은 민감정보 검사와 로컬 raw 경계를 따릅니다."
  ),
  editorControl(
    "lifecycle.settings",
    "설정",
    "top-lifecycle",
    "internal-editor-action",
    "새 프로젝트 설정은 payload로 컴파일하고 기존 프로젝트 설정 UI는 수정하지 않습니다.",
    "기존 프로젝트 update 호출을 공개하지 않습니다."
  ),
  editorControl(
    "lifecycle.save",
    "저장",
    "top-lifecycle",
    "managed-browser-operation",
    "별도 save MCP가 아니라 승인된 create 요청의 서버 저장 성공으로 대체합니다.",
    "POST 새 프로젝트 생성 외의 PUT/PATCH 저장은 금지합니다."
  ),
  editorControl(
    "lifecycle.make-activity",
    "활동 만들기",
    "top-lifecycle",
    "excluded-by-policy",
    "별도 학생 배포 lifecycle은 현재 create-only 저작 범위 밖이며 후속 계약 조사가 필요합니다.",
    "동작을 추측해 자동 클릭하지 않습니다."
  ),
  editorControl(
    "lifecycle.copy-url",
    "URL 복사",
    "top-lifecycle",
    "managed-browser-operation",
    "UI clipboard 대신 create/job 결과의 editorUrl을 반환합니다.",
    "클립보드를 읽거나 쓰지 않습니다."
  ),
  editorControl(
    "lifecycle.exit",
    "나가기",
    "top-lifecycle",
    "excluded-by-policy",
    "편집기 탐색 UI이며 저작 결과의 의미나 저장 계약이 아닙니다.",
    "공개 MCP 표면에 추가하지 않습니다."
  )
];

try {
  const options = parseArguments(process.argv.slice(2), {
    catalog: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "tool-catalog.snapshot.json"
      )
    },
    "bundle-contract": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "bundle-contract.snapshot.json"
      )
    },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "control-contract.matrix.json"
      )
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const catalogPath = assertPathInside(
    options.catalog,
    options["research-root"],
    "catalog input"
  );
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "matrix output"
  );
  const bundleContractPath = assertPathInside(
    options["bundle-contract"],
    options["research-root"],
    "bundle contract input"
  );
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const bundleContract = JSON.parse(
    readFileSync(bundleContractPath, "utf8")
  );
  if (
    bundleContract.catalogFingerprint !==
    catalog.paletteFingerprint
  ) {
    throw new Error("bundle-contract-catalog-mismatch");
  }
  const bundleByTool = new Map(
    bundleContract.tools.map((tool) => [tool.stableKey, tool])
  );
  const toolMappings = catalog.tools
    .map((tool) => toolMapping(tool, bundleByTool.get(tool.stableKey)))
    .sort((left, right) =>
      left.controlId.localeCompare(right.controlId)
    );
  const sortedEditorControls = [...editorControls].sort((left, right) =>
    left.controlId.localeCompare(right.controlId)
  );
  const matrix = {
    schemaVersion: "1.0.0",
    matrixId: `mathcanvas-control-contract-${catalog.observation.observationDate}`,
    observation: catalog.observation,
    catalogFingerprint: catalog.paletteFingerprint,
    publicMcpRule:
      "화면 버튼마다 MCP 도구를 만들지 않고 추천→명시적 승인→create-only 흐름에서 registry를 간접 사용합니다.",
    existingPublicMcpTools,
    toolMappings,
    editorControls: sortedEditorControls,
    counts: {
      catalogTools: catalog.tools.length,
      toolMappings: toolMappings.length,
      editorControls: sortedEditorControls.length,
      totalObservedControls:
        toolMappings.length + sortedEditorControls.length,
      bundleAnalyzedMathTools: toolMappings.filter(
        (mapping) => mapping.bundleEvidence != null
      ).length,
      bundleVariants: toolMappings.reduce(
        (sum, mapping) =>
          sum + (mapping.bundleEvidence?.variants ?? 0),
        0
      ),
      bundleSubToolbarOptions: toolMappings.reduce(
        (sum, mapping) =>
          sum +
          (mapping.bundleEvidence?.subToolbarOptions.length ?? 0),
        0
      )
    }
  };
  assertNoSensitiveData(matrix);
  const issues = validateControlContractMatrix(matrix, catalog);
  if (issues.length > 0) {
    throw new Error(
      `control-matrix-invalid:\n${issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, stableJson(matrix), "utf8");
  process.stdout.write(
    `PASS control matrix ${toolMappings.length} tool mappings ` +
      `${sortedEditorControls.length} editor controls ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
}
