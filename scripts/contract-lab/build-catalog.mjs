#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  normalizeCatalogSnapshot,
  validateCatalogSnapshot
} from "./lib/catalog.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  defaultResearchRoot,
  defaultSanitizedRoot
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";

const origin = "https://mathcanvas.vivasam.com";

const commonToolbar = [
  {
    stableKey: "common.undo",
    observedName: "실행 취소",
    shortcut: null,
    controlKind: "history-action",
    deepProbePriority: "backlog",
    deepProbeReason:
      "create-only MCP에서는 기존 프로젝트 편집 명령으로 공개하지 않습니다."
  },
  {
    stableKey: "common.redo",
    observedName: "다시 실행",
    shortcut: null,
    controlKind: "history-action",
    deepProbePriority: "backlog",
    deepProbeReason:
      "create-only MCP에서는 기존 프로젝트 편집 명령으로 공개하지 않습니다."
  },
  {
    stableKey: "common.select",
    observedName: "선택",
    shortcut: "V",
    controlKind: "selection-action",
    deepProbePriority: "backlog",
    deepProbeReason:
      "선택은 생성 payload가 아니라 편집기 상호작용 상태입니다."
  },
  {
    stableKey: "common.pen",
    observedName: "펜",
    shortcut: "P",
    controlKind: "content-tool",
    deepProbePriority: "p1",
    deepProbeReason:
      "공통 authoring primitive와 penElements 저장 계약을 확인해야 합니다."
  },
  {
    stableKey: "common.eraser",
    observedName: "지우개",
    shortcut: "E",
    controlKind: "edit-action",
    deepProbePriority: "backlog",
    deepProbeReason:
      "지우개는 새 객체 생성보다 기존 객체 수정·삭제 의미가 우선입니다."
  },
  {
    stableKey: "common.point-line",
    observedName: "점 / 선",
    shortcut: "L",
    controlKind: "content-tool",
    deepProbePriority: "p1",
    deepProbeReason:
      "선·점은 여러 활동이 공유할 도형 primitive 후보입니다."
  },
  {
    stableKey: "common.rectangle",
    observedName: "사각형",
    shortcut: "R",
    controlKind: "content-tool",
    deepProbePriority: "p1",
    deepProbeReason:
      "현재 활동이 비교판과 드롭 영역 표면에 사용합니다."
  },
  {
    stableKey: "common.circle",
    observedName: "원",
    shortcut: "O",
    controlKind: "content-tool",
    deepProbePriority: "p1",
    deepProbeReason:
      "도형 primitive 공통 계약을 사각형과 함께 검증해야 합니다."
  },
  {
    stableKey: "common.text",
    observedName: "텍스트",
    shortcut: "T",
    controlKind: "content-tool",
    deepProbePriority: "p1",
    deepProbeReason:
      "현재 활동의 안내문·문항 번호가 사용하는 핵심 도구입니다."
  },
  {
    stableKey: "common.formula",
    observedName: "수식",
    shortcut: null,
    controlKind: "content-tool",
    deepProbePriority: "p1",
    deepProbeReason:
      "현재 활동의 분수 식과 수학 기호가 사용하는 핵심 도구입니다."
  }
];

const p2Modules = new Set(["NO01SC", "NO01TF", "NO04NT"]);
const p3Modules = new Set(["NO07NL"]);

function probeMetadata(moduleId) {
  if (moduleId === "NO03FM") {
    return {
      deepProbePriority: "p1",
      deepProbeReason:
        "현재 분수 비교 활동에서 이미 사용하는 네이티브 수학 도구입니다."
    };
  }
  if (p2Modules.has(moduleId)) {
    return {
      deepProbePriority: "p2",
      deepProbeReason:
        "10 가르기·모으기 또는 비분수 적합성 활동의 후보 도구입니다."
    };
  }
  if (p3Modules.has(moduleId)) {
    return {
      deepProbePriority: "p3",
      deepProbeReason:
        "수 표현 variation을 검증할 수직선 후보입니다."
    };
  }
  return {
    deepProbePriority: "backlog",
    deepProbeReason:
      "전체 계약 지도에는 포함하지만 현재 명명된 활동 wave의 직접 소비자는 아닙니다."
  };
}

function extractScreenText(screenCapture) {
  return (screenCapture?.candidates ?? [])
    .map((candidate) => candidate?.text)
    .filter((value) => typeof value === "string")
    .join("\n");
}

function assertObservedOnScreen(screenText, value, label) {
  const comparableScreen = screenText.replace(/\s+/g, "");
  const comparableValue = value.replace(/\s+/g, "");
  if (!comparableScreen.includes(comparableValue)) {
    throw new Error(`screen-cross-check-failed: ${label} ${value}`);
  }
}

try {
  const options = parseArguments(process.argv.slice(2), {
    toolbar: {
      type: "string",
      default: join(defaultRawRoot, "toolbar.raw.json")
    },
    screen: {
      type: "string",
      default: join(
        defaultSanitizedRoot,
        "tool-settings.sanitized.json"
      )
    },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "tool-catalog.snapshot.json"
      )
    },
    "raw-root": { type: "string", default: defaultRawRoot },
    "sanitized-root": {
      type: "string",
      default: defaultSanitizedRoot
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    },
    date: {
      type: "string",
      default: new Date().toISOString().slice(0, 10)
    }
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error("--date는 YYYY-MM-DD 형식이어야 합니다.");
  }
  const toolbarPath = assertPathInside(
    options.toolbar,
    options["raw-root"],
    "toolbar raw input"
  );
  const screenPath = assertPathInside(
    options.screen,
    options["sanitized-root"],
    "screen sanitized input"
  );
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "research output"
  );
  const toolbarCapture = JSON.parse(
    readFileSync(toolbarPath, "utf8")
  );
  const screenCapture = JSON.parse(
    readFileSync(screenPath, "utf8")
  );
  if (
    toolbarCapture?.request?.method !== "GET" ||
    toolbarCapture?.request?.origin !== origin ||
    toolbarCapture?.request?.path !== "/api/canvas/toolbar" ||
    !Array.isArray(toolbarCapture?.categories)
  ) {
    throw new Error("toolbar-capture-invalid");
  }
  const screenText = extractScreenText(screenCapture);
  if (!screenText.includes("도구설정전체 선택")) {
    throw new Error(
      "screen-cross-check-failed: 도구설정 modal을 확인할 수 없습니다."
    );
  }
  if (!screenText.includes("bottom-common-toolbar")) {
    const bottomToolbar = (screenCapture?.candidates ?? []).find(
      (candidate) =>
        candidate?.attributes?.id === "bottom-common-toolbar"
    );
    if (!bottomToolbar) {
      throw new Error(
        "screen-cross-check-failed: bottom-common-toolbar"
      );
    }
  }

  const categories = toolbarCapture.categories.map((category) => {
    assertObservedOnScreen(screenText, category.title, "category");
    return {
      stableKey: category.itemId,
      observedName: category.title,
      categoryId: category.itemId,
      surfaceKind: "math-palette"
    };
  });
  categories.push({
    stableKey: "common-authoring",
    observedName: "하단 공통 도구",
    categoryId: "bottom-common-toolbar",
    surfaceKind: "common-authoring"
  });

  const tools = toolbarCapture.categories.flatMap((category) =>
    category.children.map((module) => {
      assertObservedOnScreen(screenText, module.title, "module");
      return {
        stableKey: module.itemId,
        observedName: module.title,
        toolId: module.itemId,
        categoryStableKey: category.itemId,
        categoryId: category.itemId,
        moduleKey: module.itemId,
        surfaceKind: "math-palette",
        controlKind: "content-tool",
        visibleOptions: [],
        optionObservation:
          "도구 설정 화면은 활성화 선택만 제공하며 도구별 옵션은 펼치지 않습니다.",
        evidence: [
          {
            type: "dom",
            locator: `tool-settings:${category.title}>${module.title}`
          },
          {
            type: "network",
            locator: `/api/canvas/toolbar#${category.itemId}/${module.itemId}`
          }
        ],
        supportState: "captured",
        ...probeMetadata(module.itemId)
      };
    })
  );

  for (const common of commonToolbar) {
    assertObservedOnScreen(screenText, common.observedName, "common");
    tools.push({
      ...common,
      categoryStableKey: "common-authoring",
      categoryId: "bottom-common-toolbar",
      surfaceKind: "common-authoring",
      visibleOptions: common.shortcut
        ? [`keyboard:${common.shortcut}`]
        : [],
      unknowns: [
        {
          field: "moduleKey",
          reason:
            "공통 도구는 수학 module API 항목이 아니며 native 저장 계약 deep-probe 전입니다."
        },
        {
          field: "toolId",
          reason:
            "화면 DOM은 공개 tool ID를 노출하지 않으며 native 저장 계약 deep-probe 전입니다."
        }
      ],
      evidence: [
        {
          type: "dom",
          locator: `#bottom-common-toolbar:${common.observedName}`
        }
      ],
      supportState: "captured"
    });
  }

  const normalized = normalizeCatalogSnapshot({
    schemaVersion: "1.0.0",
    snapshotId: `mathcanvas-palette-${options.date}`,
    observation: {
      observationDate: options.date,
      origin,
      sourcePath: "/ko/view/<creator-owned-project>",
      accountScope: "authenticated-current-user"
    },
    categories,
    tools,
    counts: {},
    paletteFingerprint: ""
  });
  assertNoSensitiveData(normalized);
  const issues = validateCatalogSnapshot(normalized, {
    maxSupportState: "captured"
  });
  if (issues.length > 0) {
    throw new Error(
      `catalog-invalid:\n${issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, stableJson(normalized), "utf8");
  process.stdout.write(
    `PASS catalog ${normalized.counts.categories} categories ` +
      `${normalized.counts.tools} tools ${normalized.paletteFingerprint} ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
}
