#!/usr/bin/env node
// 공개 MathCanvas 수업에서 자료와 가능성 영역 그래프 도구의 실제 객체 계약을 관찰한다.
//
// 로그인 없이 열리는 공개 엔드포인트만 사용하고, 읽기만 한다.
// 수업의 문제 내용이 아니라 필드 이름·타입·구조만 남긴다. 관찰한 값은
// 자릿수와 형태만 요약해 생성기가 같은 모양을 만들 수 있는지 판단하는 데 쓴다.
//
//   node scripts/contract-lab/capture-public-graph-tools.mjs
//
// 출력: research/mathcanvas/graph-tool-contract.observations.json

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ORIGIN = "https://mathcanvas.vivasam.com";
const OUTPUT = resolve(
  root,
  "research/mathcanvas/graph-tool-contract.observations.json"
);

// 자료와 가능성 영역에서 초등 활동이 실제로 쓰는 도구.
const TARGET_TOOL_PREFIXES = [
  "DP02TG", // 자료와 표
  "DP03PG", // 그림그래프
  "DP04BC", // 막대그래프, 꺾은선그래프
  "DP06RC" // 비율 그래프(띠그래프, 원그래프)
];

// 학생이 채우는 빈 그래프인지, 이미 값이 있는 해석용 그래프인지를 가르는 필드.
const SERIES_FIELDS = ["firstGraphValue", "secondGraphValue"];

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`fetch-failed:${response.status}:${url}`);
  }
  return response.json();
}

async function listPublicProjects() {
  const collected = new Map();
  for (let page = 1; page <= 6; page += 1) {
    const query = new URLSearchParams({
      offset: String(page),
      limit: "100",
      sortCondition: "contentsScore",
      sortOrder: "desc"
    });
    let body;
    try {
      body = await getJson(`${ORIGIN}/api/public-project?${query}`);
    } catch {
      break;
    }
    const list = body.list ?? [];
    if (list.length === 0) break;
    for (const project of list) {
      if (typeof project.publicProjectId === "string") {
        collected.set(project.publicProjectId, project);
      }
    }
  }
  return [...collected.values()];
}

function describeValue(value) {
  if (Array.isArray(value)) {
    return {
      kind: "array",
      length: value.length,
      itemKinds: [...new Set(value.map((item) => typeof item))].sort()
    };
  }
  if (value === null) return { kind: "null" };
  if (typeof value === "object") {
    return { kind: "object", fieldCount: Object.keys(value).length };
  }
  return { kind: typeof value };
}

function mergeShape(shape, object) {
  for (const [field, value] of Object.entries(object)) {
    const seen = shape.get(field) ?? {
      field,
      occurrences: 0,
      kinds: new Set(),
      arrayLengths: new Set()
    };
    seen.occurrences += 1;
    const described = describeValue(value);
    seen.kinds.add(described.kind);
    if (described.kind === "array") seen.arrayLengths.add(described.length);
    shape.set(field, seen);
  }
}

const projects = await listPublicProjects();
if (projects.length === 0) {
  throw new Error("public-project-list-empty");
}

const graphProjects = projects.filter((project) =>
  /그래프|자료|표로|표를/.test(String(project.projectTitle))
);

const tools = new Map();
const inspected = [];

for (const project of graphProjects) {
  let detail;
  try {
    detail = await getJson(
      `${ORIGIN}/api/public-project/${encodeURIComponent(project.publicProjectId)}`
    );
  } catch {
    continue;
  }
  const objects = detail.contentsJson ?? [];
  const matched = objects.filter(
    (object) =>
      typeof object.svgId === "string" &&
      TARGET_TOOL_PREFIXES.some((prefix) => object.svgId.startsWith(prefix))
  );
  if (matched.length === 0) continue;

  inspected.push({
    publicProjectId: project.publicProjectId,
    objectCount: objects.length,
    graphObjectCount: matched.length,
    variants: [...new Set(matched.map((object) => object.svgId))].sort()
  });

  for (const object of matched) {
    const toolId = object.svgId.slice(0, 6);
    const entry =
      tools.get(toolId) ??
      {
        toolId,
        variants: new Set(),
        sampleCount: 0,
        shape: new Map(),
        seriesLengths: new Set(),
        categoryLabelCounts: new Set(),
        prefilledSamples: 0,
        emptySamples: 0
      };
    entry.variants.add(object.svgId);
    entry.sampleCount += 1;
    mergeShape(entry.shape, object);

    for (const field of SERIES_FIELDS) {
      const series = object[field];
      if (Array.isArray(series)) entry.seriesLengths.add(series.length);
    }
    if (Array.isArray(object.label)) {
      entry.categoryLabelCounts.add(object.label.length);
    }
    const firstSeries = object.firstGraphValue;
    if (Array.isArray(firstSeries)) {
      const anyFilled = firstSeries.some(
        (value) => typeof value === "number" && value !== 0
      );
      if (anyFilled) entry.prefilledSamples += 1;
      else entry.emptySamples += 1;
    }
    tools.set(toolId, entry);
  }
}

if (tools.size === 0) {
  throw new Error("graph-tool-observations-empty");
}

const output = {
  schemaVersion: "1.0.0",
  observedAt: new Date().toISOString(),
  source: {
    origin: ORIGIN,
    endpoints: [
      "/api/public-project?offset&limit&sortCondition&sortOrder",
      "/api/public-project/{publicProjectId}"
    ],
    authentication: "none",
    note: "공개 수업의 구조만 관찰한다. 문항 내용은 저장하지 않는다."
  },
  scanned: {
    publicProjects: projects.length,
    graphCandidates: graphProjects.length,
    inspectedWithGraphTools: inspected.length
  },
  inspected: inspected.sort((left, right) =>
    left.publicProjectId < right.publicProjectId ? -1 : 1
  ),
  tools: [...tools.values()]
    .sort((left, right) => (left.toolId < right.toolId ? -1 : 1))
    .map((entry) => ({
      moduleKey: entry.toolId,
      toolId: entry.toolId,
      variants: [...entry.variants].sort(),
      sampleCount: entry.sampleCount,
      // 학생이 채우는 빈 그래프와 이미 값이 있는 해석용 그래프의 비율.
      usage: {
        emptySeriesSamples: entry.emptySamples,
        prefilledSeriesSamples: entry.prefilledSamples
      },
      seriesLengths: [...entry.seriesLengths].sort((a, b) => a - b),
      categoryLabelCounts: [...entry.categoryLabelCounts].sort(
        (a, b) => a - b
      ),
      fields: [...entry.shape.values()]
        .sort((left, right) => (left.field < right.field ? -1 : 1))
        .map((field) => ({
          field: field.field,
          occurrences: field.occurrences,
          alwaysPresent: field.occurrences === entry.sampleCount,
          kinds: [...field.kinds].sort(),
          ...(field.arrayLengths.size > 0
            ? { arrayLengths: [...field.arrayLengths].sort((a, b) => a - b) }
            : {})
        }))
    }))
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");

process.stdout.write(
  `graph-tool observations: ${output.tools.length} tools / ` +
    `${output.scanned.inspectedWithGraphTools} lessons / ` +
    `${output.scanned.publicProjects} public projects scanned\n`
);
for (const tool of output.tools) {
  process.stdout.write(
    `  ${tool.toolId} ${tool.variants.join(",")} — ` +
      `표본 ${tool.sampleCount}개, 필드 ${tool.fields.length}개, ` +
      `빈그래프 ${tool.usage.emptySeriesSamples} / 값있음 ${tool.usage.prefilledSeriesSamples}\n`
  );
}
