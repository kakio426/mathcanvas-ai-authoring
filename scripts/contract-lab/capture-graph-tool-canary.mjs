#!/usr/bin/env node
// 자료와 가능성 영역 그래프 도구(DP04BC 막대그래프, DP02TG 자료와 표)가
// 새 프로젝트로 저장되고 다시 열었을 때 그대로 살아 있는지 확인한다.
//
// 공개 수업에서 관찰한 객체 계약(graph-tool-object-template.json)으로 페이로드를
// 만들고, 새 프로젝트 POST 한 번만 수행한 뒤 다시 읽어 필드 단위로 비교한다.
// 기존 프로젝트는 수정하지 않는다.
//
// 전제: `pnpm mathcanvas:login`으로 전용 Chrome이 열려 있어야 한다.
//
//   node scripts/contract-lab/capture-graph-tool-canary.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  defaultResearchRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";

const probeId = "graph-tool-canary-v1";
const evidenceOutput = join(
  defaultResearchRoot,
  "graph-tool-release-canary.json"
);
// 자료와 가능성 영역. 이 영역 도구는 Unit04에 활성화한다.
const CATEGORY_ID = "ZS0MczMDuY";
const UNIT_ID = "Unit04";

const template = JSON.parse(
  readFileSync(
    join(
      repositoryRoot,
      "research",
      "mathcanvas",
      "graph-tool-object-template.json"
    ),
    "utf8"
  )
);

// 저장·재열기에서 값이 바뀌면 안 되는 의미 필드. 나머지 구조 필드는
// 템플릿 그대로 보내고 전체를 통째로 비교한다.
const MEANING_FIELDS = [
  "svgId",
  "title",
  "name",
  "unit",
  "label",
  "labelCount",
  "widthCount",
  "heightCount",
  "heightDeps",
  "start",
  "firstGraphValue",
  "secondGraphValue",
  "isOnlyOneGraph",
  "isWave"
];

function buildModuleActivationMap() {
  const catalog = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "research",
        "mathcanvas",
        "tool-catalog.snapshot.json"
      ),
      "utf8"
    )
  );
  const moduleArr = { Unit01: {}, Unit02: {}, Unit03: {}, Unit04: {} };
  for (const tool of catalog.tools ?? []) {
    if (typeof tool?.moduleKey === "string" && tool.unitId) {
      moduleArr[tool.unitId] = moduleArr[tool.unitId] ?? {};
      moduleArr[tool.unitId][tool.moduleKey] = true;
    }
  }
  // 그래프 도구는 이 조사 대상이므로 명시적으로 켠다.
  moduleArr[UNIT_ID].DP04BC = true;
  moduleArr[UNIT_ID].DP02TG = true;
  return moduleArr;
}

function barChartObject(id, placement) {
  return {
    ...template.barChart,
    id,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    svgId: "DP04BC-01",
    title: ["우리 반이 좋아하는 운동"],
    // [세로축 이름, 가로축 이름]
    name: ["학생 수", "운동"],
    unit: ["명", ""],
    label: ["축구", "농구", "피구", "달리기"],
    labelCount: 4,
    widthCount: 4,
    // 축 최대값 = (heightCount - 1) x start. 한 칸 1명, 눈금선 7개 -> 0~6명.
    // start와 heightDeps는 반드시 같은 값이어야 한다. 다르면 start가 이긴다.
    heightCount: 7,
    heightDeps: 1,
    start: ["1"],
    // 학생이 채울 빈 막대. 공개 수업의 '그리기' 유형과 같은 모양이다.
    firstGraphValue: [0, 0, 0, 0],
    secondGraphValue: [0, 0, 0, 0],
    isOnlyOneGraph: true,
    isWave: false
  };
}

function dataTableObject(id, placement) {
  return {
    ...template.dataTable,
    id,
    x: placement.x,
    y: placement.y,
    _x: placement.x,
    _y: placement.y,
    svgId: "DP02TG-02",
    title: ["우리 반이 좋아하는 운동"],
    name: ["축구", "농구", "피구", "달리기"]
  };
}

function buildPayload(runId) {
  return {
    canvasOption: {
      canvasCenterCoordinate: { cx: 1200, cy: 1740 },
      CR07BSArr: [],
      CR07BSObj: { type1: 0.3, type2: 0.3, type3: 0.3, weight: 0 },
      grid: {
        distance: { x: 40, y: 40 },
        isGrid: false,
        isGridToggle: false,
        type: "none"
      },
      isCaptured: false,
      lockIds: [],
      moduleArr: buildModuleActivationMap(),
      penElements: [],
      scale: 5,
      viewBox: [0, 0, 2400, 3480]
    },
    categoryId: CATEGORY_ID,
    contentsJson: [
      dataTableObject("a-graph-canary-table", { x: 520, y: 420 }),
      barChartObject("a-graph-canary-bar", { x: 520, y: 1180 })
    ],
    isNoteworthy: false,
    isShowMenuOnActivity: true,
    projectTitle: `AI-CONTRACT-PROBE-${runId} · 막대그래프 도구 확인`,
    studyLevel: "elementary",
    tags: []
  };
}

function compareObject(submitted, reopened, label) {
  const differences = [];
  for (const field of MEANING_FIELDS) {
    const before = JSON.stringify(submitted[field]);
    const after = JSON.stringify(reopened?.[field]);
    if (before !== after) {
      differences.push({ field, submitted: before, reopened: after });
    }
  }
  const droppedFields = Object.keys(submitted).filter(
    (field) => !(field in (reopened ?? {}))
  );
  return { label, differences, droppedFields };
}

const stateDirectory = resolveStateDirectory();
let session;
try {
  session = await createLiveAuthHeadlessSession(stateDirectory);
} catch (error) {
  process.stderr.write(
    `${error.message}\n전용 로그인 Chrome이 열려 있어야 합니다. pnpm mathcanvas:login을 먼저 실행하세요.\n`
  );
  process.exit(1);
}

const runId = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+/, "Z");
const payload = buildPayload(runId);

let context;
try {
  context = await session.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  await page.goto("https://mathcanvas.vivasam.com/ko/myCanvas", {
    waitUntil: "domcontentloaded"
  });

  const created = await page.evaluate(async (body) => {
    const token = window.localStorage.getItem("accessToken");
    const response = await fetch("/api/project", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: "include",
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    return { status: response.status, projectId: parsed?.projectId ?? null };
  }, payload);

  if (created.status < 200 || created.status >= 300 || !created.projectId) {
    throw new Error(`graph-tool-create-failed:${created.status}`);
  }

  const reopened = await page.evaluate(async (projectId) => {
    const token = window.localStorage.getItem("accessToken");
    const response = await fetch(`/api/project/${projectId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`reopen-failed:${response.status}`);
    return response.json();
  }, created.projectId);

  const reopenedObjects = reopened.contentsJson ?? [];
  const findBySvg = (svgId) =>
    reopenedObjects.find((object) => object.svgId === svgId);

  const barComparison = compareObject(
    payload.contentsJson[1],
    findBySvg("DP04BC-01"),
    "DP04BC-01"
  );
  const tableComparison = compareObject(
    payload.contentsJson[0],
    findBySvg("DP02TG-02"),
    "DP02TG-02"
  );

  const moduleState =
    reopened.canvasOption?.moduleArr?.[UNIT_ID] ?? {};
  const issues = [];
  if (!findBySvg("DP04BC-01")) issues.push("bar-chart-missing-after-reopen");
  if (!findBySvg("DP02TG-02")) issues.push("data-table-missing-after-reopen");
  if (barComparison.differences.length > 0) {
    issues.push("bar-chart-meaning-changed");
  }
  if (tableComparison.differences.length > 0) {
    issues.push("data-table-meaning-changed");
  }
  if (moduleState.DP04BC !== true) issues.push("bar-chart-module-not-enabled");

  const evidence = {
    schemaVersion: "1.0.0",
    probeId,
    observedAt: new Date().toISOString(),
    status: issues.length === 0 ? "pass" : "fail",
    issues,
    createRequestCount: 1,
    existingProjectWriteCount: 0,
    // 프로젝트 식별자는 남기지 않는다. 열어 본 사실과 형태만 기록한다.
    submittedObjectCount: payload.contentsJson.length,
    reopenedObjectCount: reopenedObjects.length,
    // 도구 증거는 저장소 규약대로 moduleKey를 가진 배열로 남긴다.
    tools: [
      {
        moduleKey: "DP04BC",
        variant: "DP04BC-01",
        survivedReopen: Boolean(findBySvg("DP04BC-01")),
        meaningDifferences: barComparison.differences,
        droppedFieldCount: barComparison.droppedFields.length,
        droppedFields: barComparison.droppedFields,
        axisRule: "축 최대값 = (heightCount - 1) x Number(start[0])"
      },
      {
        moduleKey: "DP02TG",
        variant: "DP02TG-02",
        survivedReopen: Boolean(findBySvg("DP02TG-02")),
        meaningDifferences: tableComparison.differences,
        droppedFieldCount: tableComparison.droppedFields.length,
        droppedFields: tableComparison.droppedFields
      }
    ],
    moduleActivation: {
      unitId: UNIT_ID,
      DP04BC: moduleState.DP04BC === true,
      DP02TG: moduleState.DP02TG === true
    }
  };

  mkdirSync(dirname(evidenceOutput), { recursive: true });
  writeFileSync(
    evidenceOutput,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );

  process.stdout.write(
    `graph-tool canary ${evidence.status}: ` +
      `막대그래프 ${evidence.tools[0].survivedReopen ? "유지" : "사라짐"} / ` +
      `표 ${evidence.tools[1].survivedReopen ? "유지" : "사라짐"} / ` +
      `의미 변경 ${barComparison.differences.length + tableComparison.differences.length}건 / ` +
      `누락 필드 ${barComparison.droppedFields.length + tableComparison.droppedFields.length}개\n`
  );
  for (const difference of [
    ...barComparison.differences,
    ...tableComparison.differences
  ]) {
    process.stdout.write(
      `  변경 ${difference.field}: ${difference.submitted} -> ${difference.reopened}\n`
    );
  }
  if (issues.length > 0) {
    process.stdout.write(`  문제: ${issues.join(", ")}\n`);
    process.exitCode = 1;
  }
} finally {
  await context?.close().catch(() => undefined);
  await session.close();
}
