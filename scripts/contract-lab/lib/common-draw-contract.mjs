import { createHash } from "node:crypto";
import { assertNoSensitiveData } from "./normalize.mjs";
import {
  buildCanaryPayload,
  exactRoundTripHash
} from "./round-trip-evidence.mjs";

export const COMMON_DRAW_OBSERVATION_ID =
  "mathcanvas-common-draw-read-only-2026-07-29";
export const COMMON_DRAW_OBSERVATION_SCHEMA_VERSION = "1.0.0";
export const REDACTED_PUBLIC_PROJECT_PATH =
  "/api/public-project/<redacted-project>";
export const PEN_STATIC_CONTRACT_ID =
  "mathcanvas-pen-static-contract-2026-07-29";
export const PEN_STATIC_CONTRACT_SCHEMA_VERSION = "1.0.0";
export const WAVE3_PEN_CANARY_TITLE_PREFIX =
  "AI-CONTRACT-PROBE-W3";
export const WAVE3_PEN_CANARY_CONTENT_COUNT = 59;
export const WAVE3_PEN_CANARY_SAFE_RENDER_BOUNDS = [
  0,
  0,
  2200,
  1200
];

function penPathFromPoints(points) {
  return points
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"} ${x},${y}`
    )
    .join(" ");
}

export function wave3AuthoredPenElements(runId) {
  if (!/^\d{8}T\d{6}Z$/.test(runId)) {
    throw new Error(`invalid-canary-run-id:${runId}`);
  }
  return [
    {
      id: `p-w3-authored-a-${runId}`,
      d: penPathFromPoints([
        [1760, 360],
        [1830, 430],
        [1910, 380]
      ]),
      stroke: "#1f2937",
      strokeWidth: 4,
      isColor: false
    },
    {
      id: `p-w3-authored-b-${runId}`,
      d: penPathFromPoints([
        [1760, 600],
        [1840, 530],
        [1930, 610]
      ]),
      stroke: "#2563eb",
      strokeWidth: "4",
      isColor: false
    }
  ];
}

export function buildWave3PenCanaryPayload(
  goldenPayload,
  runId
) {
  const base = buildCanaryPayload(
    goldenPayload,
    runId,
    WAVE3_PEN_CANARY_TITLE_PREFIX
  );
  const viewBox = base?.canvasOption?.viewBox;
  const safeRenderBounds =
    WAVE3_PEN_CANARY_SAFE_RENDER_BOUNDS;
  const penElements = wave3AuthoredPenElements(runId);
  const numericCoordinates = penElements.flatMap((element) =>
    (element.d.match(/[-+]?(?:\d*\.)?\d+/g) ?? []).map(Number)
  );
  if (
    base?.contentsJson?.length !==
      WAVE3_PEN_CANARY_CONTENT_COUNT ||
    !Array.isArray(base?.canvasOption?.penElements) ||
    base.canvasOption.penElements.length !== 0 ||
    !Array.isArray(viewBox) ||
    viewBox.length !== 4 ||
    viewBox.some(
      (value) =>
        typeof value !== "number" || !Number.isFinite(value)
    ) ||
    [viewBox, safeRenderBounds].some((bounds) =>
      numericCoordinates.some((coordinate, index) => {
        const [x, y, width, height] = bounds;
        return index % 2 === 0
          ? coordinate < x || coordinate > x + width
          : coordinate < y || coordinate > y + height;
      })
    )
  ) {
    throw new Error("wave3-golden-or-authored-pen-bounds-invalid");
  }
  return {
    ...base,
    canvasOption: {
      ...base.canvasOption,
      penElements
    }
  };
}

const requiredUnresolvedToolKeys = [
  "common.circle",
  "common.pen",
  "common.point-line"
];
const forbiddenEvidenceKeyPattern =
  /^(?:projectId|jobId|editorUrl|accessToken|authorization|owner)$/i;
const privateProjectIdPattern = /\bP_[A-Za-z0-9_-]+\b/;

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function summarizeObjects(objects) {
  const summaries = new Map();
  for (const object of objects) {
    if (
      object === null ||
      typeof object !== "object" ||
      Array.isArray(object)
    ) {
      continue;
    }
    const wireSvgId =
      typeof object.svgId === "string" ? object.svgId : "<absent>";
    const wireType =
      typeof object.type === "string" ? object.type : "<absent>";
    const key = `${wireSvgId}\u0000${wireType}`;
    const current = summaries.get(key) ?? {
      wireSvgId,
      wireType,
      sampleCount: 0,
      fieldTypes: new Map()
    };
    current.sampleCount += 1;
    for (const [field, value] of Object.entries(object)) {
      const types = current.fieldTypes.get(field) ?? new Set();
      types.add(valueType(value));
      current.fieldTypes.set(field, types);
    }
    summaries.set(key, current);
  }
  return [...summaries.values()]
    .map((summary) => ({
      wireSvgId: summary.wireSvgId,
      wireType: summary.wireType,
      sampleCount: summary.sampleCount,
      fieldNames: [...summary.fieldTypes.keys()].sort(),
      fieldTypes: Object.fromEntries(
        [...summary.fieldTypes.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([field, types]) => [field, [...types].sort()])
      )
    }))
    .sort((left, right) =>
      `${left.wireSvgId}:${left.wireType}`.localeCompare(
        `${right.wireSvgId}:${right.wireType}`
      )
    );
}

function summarizeWireSignatures(objects) {
  const counts = new Map();
  for (const object of objects) {
    const wireSvgId =
      typeof object?.svgId === "string" ? object.svgId : "<absent>";
    const wireType =
      typeof object?.type === "string" ? object.type : "<absent>";
    const key = `${wireSvgId}\u0000${wireType}`;
    const current = counts.get(key) ?? {
      wireSvgId,
      wireType,
      count: 0
    };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((left, right) =>
    `${left.wireSvgId}:${left.wireType}`.localeCompare(
      `${right.wireSvgId}:${right.wireType}`
    )
  );
}

function isKnownReleasedOrWrapper(object) {
  if (object?.svgId === "group-element") return true;
  if (object?.svgId === "input-text") return true;
  if (object?.svgId === "math-latex") return true;
  if (
    typeof object?.svgId === "string" &&
    object.svgId.startsWith("NO03FM-")
  ) {
    return true;
  }
  return object?.svgId === "drawElem" && object?.type === "rect";
}

function findCatalogModuleKey(wireSvgId, catalogModuleKeys) {
  return [...catalogModuleKeys]
    .sort((left, right) => right.length - left.length)
    .find(
      (moduleKey) =>
        wireSvgId === moduleKey ||
        wireSvgId.startsWith(`${moduleKey}-`)
    );
}

export function extractMathPaletteModuleKeys(catalog) {
  const moduleKeys = Array.isArray(catalog?.tools)
    ? catalog.tools
        .filter(
          (tool) =>
            tool?.surfaceKind === "math-palette" &&
            typeof tool?.moduleKey === "string"
        )
        .map((tool) => tool.moduleKey)
        .sort()
    : [];
  if (
    moduleKeys.length === 0 ||
    new Set(moduleKeys).size !== moduleKeys.length
  ) {
    throw new Error("catalog-module-keys-invalid");
  }
  return moduleKeys;
}

function buildUnresolved() {
  return [
    {
      stableKey: "common.circle",
      unknownFields: [
        "geometry",
        "hydrationDefaults",
        "moduleActivation",
        "wireSvgId",
        "wireType"
      ],
      unknownReason:
        "circleElem 독립 factory가 정적 registry에 없고 공개 fixture에도 원 객체가 없어 drawElem 공유 여부를 확정할 수 없습니다.",
      evidenceIds: [
        "research/mathcanvas/bundle-contract.snapshot.json#key=commonNativeFactories",
        "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation"
      ]
    },
    {
      stableKey: "common.pen",
      unknownFields: [
        "coordinateEncoding",
        "elementSchema",
        "lockIdsParticipation",
        "strokeUnit"
      ],
      unknownReason:
        "공개 fixture의 canvasOption.penElements는 모두 빈 배열이어서 비어 있지 않은 pen element의 wire 계약을 관찰할 수 없습니다.",
      evidenceIds: [
        "research/mathcanvas/common-draw-contract.observations.json#key=penObservation"
      ]
    },
    {
      stableKey: "common.point-line",
      unknownFields: [
        "angleElemRelationship",
        "geometry",
        "hydrationDefaults",
        "pointLineObjectCardinality",
        "wireSvgId",
        "wireType"
      ],
      unknownReason:
        "pointElem과 straightElem 독립 factory가 없고 공개 fixture에도 점·선 객체가 없습니다. 발견된 angleElem과 하단 점/선 도구의 관계도 확인되지 않았습니다.",
      evidenceIds: [
        "research/mathcanvas/bundle-contract.snapshot.json#key=commonNativeFactories",
        "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation"
      ]
    }
  ];
}

export function commonDrawObservationHash(observation) {
  if (
    observation === null ||
    typeof observation !== "object" ||
    Array.isArray(observation)
  ) {
    throw new TypeError("common draw observation은 객체여야 합니다.");
  }
  const { integrity: _integrity, ...hashInput } = observation;
  return exactRoundTripHash(hashInput);
}

export function buildCommonDrawObservation({
  observationDate,
  responses,
  catalogModuleKeys
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observationDate)) {
    throw new Error(`invalid-observation-date:${observationDate}`);
  }
  if (!Array.isArray(responses) || responses.length === 0) {
    throw new Error("common-draw-responses-required");
  }
  if (
    !Array.isArray(catalogModuleKeys) ||
    catalogModuleKeys.length === 0 ||
    catalogModuleKeys.some(
      (moduleKey) =>
        typeof moduleKey !== "string" || moduleKey.length === 0
    )
  ) {
    throw new Error("catalog-module-keys-required");
  }

  const allObjects = [];
  const allPenElements = [];
  const sources = responses.map((response, index) => {
    const contentsJson = Array.isArray(response.body?.contentsJson)
      ? response.body.contentsJson
      : [];
    const penElements = Array.isArray(
      response.body?.canvasOption?.penElements
    )
      ? response.body.canvasOption.penElements
      : [];
    allObjects.push(...contentsJson);
    allPenElements.push(...penElements);
    return {
      sourceIndex: index + 1,
      sourceKind: "public-project-fixture",
      method: "GET",
      path: REDACTED_PUBLIC_PROJECT_PATH,
      status: response.status,
      contentsCount: contentsJson.length,
      penElementsCount: penElements.length,
      wireSignatureHistogram:
        summarizeWireSignatures(contentsJson)
    };
  });

  const drawObjects = allObjects.filter(
    (object) => object?.svgId === "drawElem"
  );
  const residualObjects = allObjects.filter(
    (object) => !isKnownReleasedOrWrapper(object)
  );
  const residualWireShapes = summarizeObjects(residualObjects).map(
    (summary) => {
      const moduleKey = findCatalogModuleKey(
        summary.wireSvgId,
        catalogModuleKeys
      );
      return moduleKey
        ? {
            ...summary,
            classification: "catalog-math-module",
            moduleKey,
            evidenceIds: [
              `research/mathcanvas/tool-catalog.snapshot.json#tool=${moduleKey}`
            ]
          }
        : {
            ...summary,
            classification: "unexplained-residual",
            evidenceIds: [
              "research/mathcanvas/common-draw-contract.observations.json#key=sources"
            ]
          };
    }
  );
  const unresolvedCandidateShapes = residualWireShapes.filter(
    (summary) =>
      summary.classification === "unexplained-residual"
  );
  const totalObjectCount = allObjects.length;
  const residualObjectCount = residualWireShapes.reduce(
    (sum, summary) => sum + summary.sampleCount,
    0
  );
  const catalogMathModuleObjectCount = residualWireShapes
    .filter(
      (summary) =>
        summary.classification === "catalog-math-module"
    )
    .reduce((sum, summary) => sum + summary.sampleCount, 0);
  const unexplainedResidualObjectCount =
    unresolvedCandidateShapes.reduce(
      (sum, summary) => sum + summary.sampleCount,
      0
    );
  const observation = {
    schemaVersion: COMMON_DRAW_OBSERVATION_SCHEMA_VERSION,
    observationId: COMMON_DRAW_OBSERVATION_ID,
    observationDate,
    accessPolicy: {
      allowedMethod: "GET",
      productWriteCount: 0,
      rawResponsePersisted: false
    },
    sources,
    drawObservation: {
      wireAccounting: {
        totalObjectCount,
        knownReleasedOrWrapperObjectCount:
          totalObjectCount - residualObjectCount,
        catalogMathModuleObjectCount,
        unexplainedResidualObjectCount
      },
      observedWireShapes: summarizeObjects(drawObjects),
      residualWireShapes,
      unresolvedCandidateShapes
    },
    penObservation: {
      sourcePayloadCount: responses.length,
      observedElementCount: allPenElements.length,
      allObservedArraysEmpty: sources.every(
        (source) => source.penElementsCount === 0
      )
    },
    unresolved: buildUnresolved()
  };
  return {
    ...observation,
    integrity: {
      algorithm: "sha256-canonical-json",
      payloadSha256: exactRoundTripHash(observation)
    }
  };
}

function collectForbiddenEvidence(value, path, issues) {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      collectForbiddenEvidence(child, `${path}[${index}]`, issues)
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (forbiddenEvidenceKeyPattern.test(key)) {
        issues.push({
          path: childPath,
          message: "비식별 evidence에 금지된 식별 필드가 있습니다."
        });
      }
      collectForbiddenEvidence(child, childPath, issues);
    }
    return;
  }
  if (typeof value === "string" && privateProjectIdPattern.test(value)) {
    issues.push({
      path,
      message: "비식별 evidence에 원본 프로젝트 ID가 있습니다."
    });
  }
}

export function validateCommonDrawObservation(
  observation,
  { catalogModuleKeys = [] } = {}
) {
  const issues = [];
  const add = (path, message) => issues.push({ path, message });
  try {
    assertNoSensitiveData(observation);
  } catch (error) {
    add("redaction", String(error));
  }
  collectForbiddenEvidence(observation, "", issues);

  if (
    observation?.schemaVersion !==
    COMMON_DRAW_OBSERVATION_SCHEMA_VERSION
  ) {
    add("schemaVersion", "지원하는 common draw evidence 버전이 아닙니다.");
  }
  if (observation?.observationId !== COMMON_DRAW_OBSERVATION_ID) {
    add("observationId", "common draw observation ID가 다릅니다.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observation?.observationDate ?? "")) {
    add("observationDate", "observationDate는 YYYY-MM-DD여야 합니다.");
  }
  const catalogModuleKeySet = new Set(catalogModuleKeys);
  if (
    !Array.isArray(catalogModuleKeys) ||
    catalogModuleKeys.length === 0 ||
    catalogModuleKeys.some(
      (moduleKey) =>
        typeof moduleKey !== "string" || moduleKey.length === 0
    ) ||
    catalogModuleKeySet.size !== catalogModuleKeys.length
  ) {
    add(
      "catalogModuleKeys",
      "검증된 math-palette module key 집합이 필요합니다."
    );
  }
  if (
    observation?.accessPolicy?.allowedMethod !== "GET" ||
    observation?.accessPolicy?.productWriteCount !== 0 ||
    observation?.accessPolicy?.rawResponsePersisted !== false
  ) {
    add(
      "accessPolicy",
      "읽기 전용 GET, write 0, raw 미영속화 정책이어야 합니다."
    );
  }
  if (
    !Array.isArray(observation?.sources) ||
    observation.sources.length === 0
  ) {
    add("sources", "검증할 공개 fixture source가 필요합니다.");
  } else {
    for (const [index, source] of observation.sources.entries()) {
      if (
        source?.sourceIndex !== index + 1 ||
        source?.sourceKind !== "public-project-fixture" ||
        source?.method !== "GET" ||
        source?.path !== REDACTED_PUBLIC_PROJECT_PATH ||
        !Number.isInteger(source?.status) ||
        source.status < 200 ||
        source.status >= 300 ||
        !Number.isInteger(source?.contentsCount) ||
        source.contentsCount < 0 ||
        !Number.isInteger(source?.penElementsCount) ||
        source.penElementsCount < 0 ||
        !Array.isArray(source?.wireSignatureHistogram) ||
        source.wireSignatureHistogram.length === 0 ||
        source.wireSignatureHistogram.some(
          (entry) =>
            typeof entry?.wireSvgId !== "string" ||
            entry.wireSvgId.length === 0 ||
            typeof entry?.wireType !== "string" ||
            entry.wireType.length === 0 ||
            !Number.isInteger(entry?.count) ||
            entry.count <= 0
        ) ||
        source.wireSignatureHistogram.reduce(
          (sum, entry) => sum + (entry?.count ?? 0),
          0
        ) !== source.contentsCount
      ) {
        add(`sources.${index}`, "공개 fixture source 요약이 잘못됐습니다.");
      }
    }
  }
  if (
    !Array.isArray(
      observation?.drawObservation?.observedWireShapes
    ) ||
    !Array.isArray(
      observation?.drawObservation?.residualWireShapes
    ) ||
    !Array.isArray(
      observation?.drawObservation?.unresolvedCandidateShapes
    )
  ) {
    add("drawObservation", "draw object 요약 배열이 필요합니다.");
  } else {
    const summaries = [
      ...observation.drawObservation.observedWireShapes,
      ...observation.drawObservation.residualWireShapes,
      ...observation.drawObservation.unresolvedCandidateShapes
    ];
    const allowedTypes = new Set([
      "array",
      "bigint",
      "boolean",
      "function",
      "null",
      "number",
      "object",
      "string",
      "symbol",
      "undefined"
    ]);
    for (const [index, summary] of summaries.entries()) {
      const fieldNames = summary?.fieldNames;
      const fieldTypes = summary?.fieldTypes;
      if (
        typeof summary?.wireSvgId !== "string" ||
        summary.wireSvgId.length === 0 ||
        typeof summary?.wireType !== "string" ||
        summary.wireType.length === 0 ||
        !Number.isInteger(summary?.sampleCount) ||
        summary.sampleCount <= 0 ||
        !Array.isArray(fieldNames) ||
        fieldNames.length === 0 ||
        fieldNames.some(
          (field) => typeof field !== "string" || field.length === 0
        ) ||
        new Set(fieldNames).size !== fieldNames.length ||
        fieldTypes === null ||
        typeof fieldTypes !== "object" ||
        Array.isArray(fieldTypes) ||
        JSON.stringify(Object.keys(fieldTypes).sort()) !==
          JSON.stringify([...fieldNames].sort()) ||
        Object.values(fieldTypes).some(
          (types) =>
            !Array.isArray(types) ||
            types.length === 0 ||
            types.some(
              (type) =>
                typeof type !== "string" ||
                !allowedTypes.has(type)
            )
        )
      ) {
        add(
          `drawObservation.summaries.${index}`,
          "draw wire 요약의 field/type schema가 잘못됐습니다."
        );
      }
    }
    const rectangle = observation.drawObservation.observedWireShapes.find(
      (summary) =>
        summary?.wireSvgId === "drawElem" &&
        summary?.wireType === "rect"
    );
    if (!rectangle) {
      add(
        "drawObservation.observedWireShapes",
        "released rectangle의 drawElem|rect 기준선이 필요합니다."
      );
    }
    if (
      observation.drawObservation.unresolvedCandidateShapes.length !== 0
    ) {
      add(
        "drawObservation.unresolvedCandidateShapes",
        "새 draw 후보가 발견되면 unknown 계약을 재검토해야 합니다."
      );
    }
    const residualSampleCount =
      observation.drawObservation.residualWireShapes.reduce(
        (sum, summary) =>
          sum +
          (Number.isInteger(summary?.sampleCount)
            ? summary.sampleCount
            : 0),
        0
      );
    const catalogResidualCount =
      observation.drawObservation.residualWireShapes
        .filter(
          (summary) =>
            summary?.classification === "catalog-math-module"
        )
        .reduce(
          (sum, summary) =>
            sum +
            (Number.isInteger(summary?.sampleCount)
              ? summary.sampleCount
              : 0),
          0
        );
    const unexplainedResidualCount =
      observation.drawObservation.residualWireShapes
        .filter(
          (summary) =>
            summary?.classification === "unexplained-residual"
        )
        .reduce(
          (sum, summary) =>
            sum +
            (Number.isInteger(summary?.sampleCount)
              ? summary.sampleCount
              : 0),
          0
        );
    const sourceObjectCount = Array.isArray(observation?.sources)
      ? observation.sources.reduce(
          (sum, source) =>
            sum +
            (Number.isInteger(source?.contentsCount)
              ? source.contentsCount
              : 0),
          0
        )
      : 0;
    const sourceSignatureCounts = new Map();
    for (const source of observation.sources ?? []) {
      for (const signature of source?.wireSignatureHistogram ?? []) {
        const key =
          `${signature.wireSvgId}\u0000${signature.wireType}`;
        sourceSignatureCounts.set(
          key,
          (sourceSignatureCounts.get(key) ?? 0) + signature.count
        );
      }
    }
    const expectedResidualSignatures = [
      ...sourceSignatureCounts.entries()
    ]
      .filter(([key]) => {
        const [wireSvgId, wireType] = key.split("\u0000");
        return !isKnownReleasedOrWrapper({
          svgId: wireSvgId,
          type: wireType === "<absent>" ? undefined : wireType
        });
      })
      .map(([key, count]) => {
        const [wireSvgId, wireType] = key.split("\u0000");
        return { wireSvgId, wireType, sampleCount: count };
      })
      .sort((left, right) =>
        `${left.wireSvgId}:${left.wireType}`.localeCompare(
          `${right.wireSvgId}:${right.wireType}`
        )
      );
    const actualResidualSignatures =
      observation.drawObservation.residualWireShapes
        .map((summary) => ({
          wireSvgId: summary?.wireSvgId,
          wireType: summary?.wireType,
          sampleCount: summary?.sampleCount
        }))
        .sort((left, right) =>
          `${left.wireSvgId}:${left.wireType}`.localeCompare(
            `${right.wireSvgId}:${right.wireType}`
          )
        );
    if (
      JSON.stringify(expectedResidualSignatures) !==
      JSON.stringify(actualResidualSignatures)
    ) {
      add(
        "drawObservation.residualWireShapes",
        "source wire histogram의 residual과 상세 분류가 일치해야 합니다."
      );
    }
    const accounting =
      observation.drawObservation.wireAccounting;
    if (
      accounting?.totalObjectCount !== sourceObjectCount ||
      accounting?.knownReleasedOrWrapperObjectCount !==
        sourceObjectCount - residualSampleCount ||
      accounting?.catalogMathModuleObjectCount !==
        catalogResidualCount ||
      accounting?.unexplainedResidualObjectCount !==
        unexplainedResidualCount ||
      accounting?.knownReleasedOrWrapperObjectCount +
        accounting?.catalogMathModuleObjectCount +
        accounting?.unexplainedResidualObjectCount !==
        accounting?.totalObjectCount
    ) {
      add(
        "drawObservation.wireAccounting",
        "source 전체 객체와 residual 분류 회계가 일치하지 않습니다."
      );
    }
    const unexplainedByResidual =
      observation.drawObservation.residualWireShapes
        .filter(
          (summary) =>
            summary?.classification === "unexplained-residual"
        )
        .map((summary) => ({
          wireSvgId: summary.wireSvgId,
          wireType: summary.wireType,
          sampleCount: summary.sampleCount
        }))
        .sort((left, right) =>
          `${left.wireSvgId}:${left.wireType}`.localeCompare(
            `${right.wireSvgId}:${right.wireType}`
          )
        );
    const unexplainedCandidates =
      observation.drawObservation.unresolvedCandidateShapes
        .map((summary) => ({
          wireSvgId: summary?.wireSvgId,
          wireType: summary?.wireType,
          sampleCount: summary?.sampleCount
        }))
        .sort((left, right) =>
          `${left.wireSvgId}:${left.wireType}`.localeCompare(
            `${right.wireSvgId}:${right.wireType}`
          )
        );
    if (
      JSON.stringify(unexplainedByResidual) !==
      JSON.stringify(unexplainedCandidates)
    ) {
      add(
        "drawObservation.unresolvedCandidateShapes",
        "설명 불가능 residual과 candidate 집합이 일치해야 합니다."
      );
    }
    for (const [index, summary] of observation.drawObservation
      .residualWireShapes.entries()) {
      if (
        summary?.classification === "catalog-math-module"
      ) {
        if (
          typeof summary.moduleKey !== "string" ||
          !catalogModuleKeySet.has(summary.moduleKey) ||
          !(
            summary.wireSvgId === summary.moduleKey ||
            summary.wireSvgId.startsWith(
              `${summary.moduleKey}-`
            )
          ) ||
          !Array.isArray(summary.evidenceIds) ||
          !summary.evidenceIds.includes(
            `research/mathcanvas/tool-catalog.snapshot.json#tool=${summary.moduleKey}`
          )
        ) {
          add(
            `drawObservation.residualWireShapes.${index}`,
            "수학 module residual에는 일치하는 moduleKey와 catalog 근거가 필요합니다."
          );
        }
      } else if (
        summary?.classification !== "unexplained-residual"
      ) {
        add(
          `drawObservation.residualWireShapes.${index}.classification`,
          "residual은 catalog module 또는 unexplained로 분류해야 합니다."
        );
      }
    }
  }
  if (
    observation?.penObservation?.sourcePayloadCount !==
      observation?.sources?.length ||
    !Number.isInteger(
      observation?.penObservation?.observedElementCount
    ) ||
    typeof observation?.penObservation?.allObservedArraysEmpty !==
      "boolean"
  ) {
    add("penObservation", "penElements 관찰 요약이 일관되지 않습니다.");
  }
  if (
    observation?.penObservation?.allObservedArraysEmpty === true &&
    observation?.penObservation?.observedElementCount !== 0
  ) {
    add(
      "penObservation.observedElementCount",
      "모든 배열이 비었다면 관찰 element 수도 0이어야 합니다."
    );
  }
  if (
    observation?.penObservation?.allObservedArraysEmpty !== true ||
    observation?.penObservation?.observedElementCount !== 0
  ) {
    add(
      "penObservation",
      "비어 있지 않은 pen element가 발견되면 계약을 다시 분석해야 합니다."
    );
  }

  const unresolved = Array.isArray(observation?.unresolved)
    ? observation.unresolved
    : [];
  const unresolvedKeys = unresolved
    .map((entry) => entry?.stableKey)
    .sort();
  if (
    JSON.stringify(unresolvedKeys) !==
    JSON.stringify([...requiredUnresolvedToolKeys].sort())
  ) {
    add(
      "unresolved",
      "circle, pen, point-line의 unknown을 각각 기록해야 합니다."
    );
  }
  for (const [index, entry] of unresolved.entries()) {
    if (
      !Array.isArray(entry?.unknownFields) ||
      entry.unknownFields.length === 0 ||
      entry.unknownFields.some(
        (field) => typeof field !== "string" || field.length === 0
      ) ||
      typeof entry?.unknownReason !== "string" ||
      entry.unknownReason.trim().length === 0 ||
      !Array.isArray(entry?.evidenceIds) ||
      entry.evidenceIds.length === 0
    ) {
      add(
        `unresolved.${index}`,
        "unknown에는 fields, reason, evidenceIds가 필요합니다."
      );
    }
    if (
      entry?.stableKey === "common.circle" ||
      entry?.stableKey === "common.point-line"
    ) {
      if (
        !entry.evidenceIds?.includes(
          "research/mathcanvas/common-draw-contract.observations.json#key=drawObservation"
        ) ||
        entry.evidenceIds?.some((evidenceId) =>
          evidenceId.endsWith("#key=unresolved")
        )
      ) {
        add(
          `unresolved.${index}.evidenceIds`,
          "circle과 point-line은 자기참조가 아닌 drawObservation 근거를 가져야 합니다."
        );
      }
    }
  }

  if (
    observation?.integrity?.algorithm !==
      "sha256-canonical-json" ||
    !/^[a-f0-9]{64}$/.test(
      observation?.integrity?.payloadSha256 ?? ""
    )
  ) {
    add("integrity", "common draw evidence hash metadata가 잘못됐습니다.");
  } else {
    try {
      if (
        commonDrawObservationHash(observation) !==
        observation.integrity.payloadSha256
      ) {
        add(
          "integrity.payloadSha256",
          "common draw evidence hash가 다릅니다."
        );
      }
    } catch (error) {
      add("integrity.payloadSha256", String(error));
    }
  }

  return { ok: issues.length === 0, issues };
}

function requiredSlice(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end =
    start < 0
      ? -1
      : source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`pen-static-marker-missing:${label}`);
  }
  return source.slice(start, end);
}

function requireFragments(source, fragments, label) {
  if (fragments.some((fragment) => !source.includes(fragment))) {
    throw new Error(`pen-static-shape-mismatch:${label}`);
  }
}

export function penStaticContractHash(contract) {
  if (
    contract === null ||
    typeof contract !== "object" ||
    Array.isArray(contract)
  ) {
    throw new TypeError("pen static contract는 객체여야 합니다.");
  }
  const { integrity: _integrity, ...hashInput } = contract;
  return exactRoundTripHash(hashInput);
}

export function buildPenStaticContract({
  source,
  bundle
}) {
  if (
    typeof source !== "string" ||
    source.length === 0 ||
    bundle === null ||
    typeof bundle !== "object" ||
    Array.isArray(bundle) ||
    typeof bundle.path !== "string" ||
    !Number.isInteger(bundle.bytes) ||
    !/^[a-f0-9]{64}$/.test(bundle.sha256 ?? "")
  ) {
    throw new Error("pen-static-input-invalid");
  }
  const actualHash = createHash("sha256")
    .update(source)
    .digest("hex");
  if (
    Buffer.byteLength(source) !== bundle.bytes ||
    actualHash !== bundle.sha256
  ) {
    throw new Error("pen-static-bundle-hash-mismatch");
  }

  const createHandler = requiredSlice(
    source,
    "function T5t(){",
    "function P5t(){",
    "create-handler"
  );
  requireFragments(
    createHandler,
    [
      'setAttribute("fill","none")',
      'setAttribute("stroke",i.value.stroke)',
      'setAttribute("stroke-width",i.value.strokeWidth)',
      'setAttribute("id",`p${crypto.randomUUID()}`)',
      'setAttribute("d",`M ${C.x},${C.y}`)',
      'setAttribute("d",`${f} L ${u.x},${u.y}`)',
      "const g={id:h,d:u,stroke:f,strokeWidth:C,isColor:!1};n.value.push(g)"
    ],
    "create-handler"
  );

  const eraseHandler = requiredSlice(
    source,
    "function P5t(){",
    "function H5t(){",
    "erase-handler"
  );
  requireFragments(
    eraseHandler,
    [
      'querySelectorAll("path")',
      'h.getAttribute("id")',
      "t.value=t.value.filter(x=>x.id!==h.id)"
    ],
    "erase-handler"
  );

  const rehydrateStart = source.indexOf("Ef=s=>{");
  if (rehydrateStart < 0) {
    throw new Error("pen-static-marker-missing:rehydrate");
  }
  const rehydrate = source.slice(
    rehydrateStart,
    rehydrateStart + 650
  );
  requireFragments(
    rehydrate,
    [
      'createElementNS("http://www.w3.org/2000/svg","path")',
      'setAttribute("fill","none")',
      'setAttribute("stroke",s.stroke)',
      'setAttribute("stroke-width",s.strokeWidth)',
      'setAttribute("id",s.id)',
      'setAttribute("d",s.d)'
    ],
    "rehydrate"
  );

  const degenerateGuard = requiredSlice(
    source,
    "function mct(s){",
    "const Lo=",
    "degenerate-guard"
  );
  requireFragments(
    degenerateGuard,
    [
      "if(e.length<4)return!0",
      "if(e[i]!==t||e[i+1]!==n)return!1",
      "return!0"
    ],
    "degenerate-guard"
  );
  requireFragments(
    source,
    [
      'if(mct(pe.d))continue',
      "Me.getTotalLength()",
      "!isFinite(Ze)||Ze<=0",
      'et("pen-board")',
      "getScreenCTM()",
      ".inverse()",
      "const we=xe.svgId.split(\"-\")[0]"
    ],
    "rehydrate-and-metadata"
  );

  const contract = {
    schemaVersion: PEN_STATIC_CONTRACT_SCHEMA_VERSION,
    snapshotId: PEN_STATIC_CONTRACT_ID,
    bundle: {
      path: bundle.path,
      bytes: bundle.bytes,
      sha256: bundle.sha256
    },
    staticContract: {
      contractFamily: "canvas-pen-elements",
      payloadPath: "canvasOption.penElements",
      createdFieldShape: [
        "d",
        "id",
        "isColor",
        "stroke",
        "strokeWidth"
      ],
      rehydrateReadFields: [
        "d",
        "id",
        "stroke",
        "strokeWidth"
      ],
      idRule: {
        prefix: "p",
        entropySource: "crypto.randomUUID"
      },
      pathRule: {
        initialCommand: "M",
        appendCommand: "L"
      },
      degenerateStrokeRule: {
        minimumNumericTokens: 4,
        allPointsEqualRejected: true,
        totalLengthMustBeFinite: true,
        totalLengthMustBePositive: true
      },
      renderTarget: "#pen-board path",
      coordinateSource: "outermost-svg-user-space",
      lockIdsParticipation: "none-in-pen-handlers",
      moduleActivation: "none",
      tagContribution: "none",
      studentErasable: true,
      bundleFactoryReconciliation:
        "pen-is-store-path-list-not-P6t-factory"
    },
    unknown: [
      {
        field: "authoredCreatePersistence",
        reason:
          "비어 있지 않은 penElements를 POST한 생성·재열기 lifecycle은 관찰하지 않았습니다."
      },
      {
        field: "coordinateSpaceIdentity",
        reason:
          "pen-board와 outermost viewBox의 생성 직후 동일성은 실제 렌더에서 확인하지 않았습니다."
      },
      {
        field: "isColorPersistence",
        reason:
          "UI 생성 시 isColor=false를 기록하지만 서버 저장·재열기 보존 여부는 관찰하지 않았습니다."
      },
      {
        field: "serverNormalization",
        reason:
          "서버가 pen field, id, path를 보존·정규화·거절하는지 관찰하지 않았습니다."
      },
      {
        field: "strokeWidthWireType",
        reason:
          "store 기본값은 number이고 DOM getAttribute는 string이므로 실제 저장 JSON 타입을 관찰해야 합니다."
      }
    ],
    sourcePolicy: {
      analysis: "local-gitignored-bundle",
      networkRequestCount: 0,
      productWriteCount: 0,
      rawSourceCommitted: false
    }
  };
  assertNoSensitiveData(contract);
  return {
    ...contract,
    integrity: {
      algorithm: "sha256-canonical-json",
      payloadSha256: exactRoundTripHash(contract)
    }
  };
}

export function validatePenStaticContract(
  contract,
  { bundle } = {}
) {
  const issues = [];
  const add = (path, message) => issues.push({ path, message });
  try {
    assertNoSensitiveData(contract);
  } catch (error) {
    add("redaction", String(error));
  }
  collectForbiddenEvidence(contract, "", issues);
  if (
    contract?.schemaVersion !==
      PEN_STATIC_CONTRACT_SCHEMA_VERSION ||
    contract?.snapshotId !== PEN_STATIC_CONTRACT_ID
  ) {
    add("identity", "pen static contract identity가 다릅니다.");
  }
  if (
    bundle === null ||
    typeof bundle !== "object" ||
    contract?.bundle?.path !== bundle?.path ||
    contract?.bundle?.bytes !== bundle?.bytes ||
    contract?.bundle?.sha256 !== bundle?.sha256
  ) {
    add("bundle", "검증된 bundle snapshot과 결속되어야 합니다.");
  }
  const staticContract = contract?.staticContract;
  const exactExpectations = {
    contractFamily: "canvas-pen-elements",
    payloadPath: "canvasOption.penElements",
    createdFieldShape: [
      "d",
      "id",
      "isColor",
      "stroke",
      "strokeWidth"
    ],
    rehydrateReadFields: [
      "d",
      "id",
      "stroke",
      "strokeWidth"
    ],
    idRule: {
      prefix: "p",
      entropySource: "crypto.randomUUID"
    },
    pathRule: {
      initialCommand: "M",
      appendCommand: "L"
    },
    degenerateStrokeRule: {
      minimumNumericTokens: 4,
      allPointsEqualRejected: true,
      totalLengthMustBeFinite: true,
      totalLengthMustBePositive: true
    },
    renderTarget: "#pen-board path",
    coordinateSource: "outermost-svg-user-space",
    lockIdsParticipation: "none-in-pen-handlers",
    moduleActivation: "none",
    tagContribution: "none",
    studentErasable: true,
    bundleFactoryReconciliation:
      "pen-is-store-path-list-not-P6t-factory"
  };
  if (
    exactRoundTripHash(staticContract) !==
    exactRoundTripHash(exactExpectations)
  ) {
    add("staticContract", "pen static contract shape가 다릅니다.");
  }
  const unknownFields = Array.isArray(contract?.unknown)
    ? contract.unknown.map((entry) => entry?.field).sort()
    : [];
  if (
    JSON.stringify(unknownFields) !==
      JSON.stringify([
        "authoredCreatePersistence",
        "coordinateSpaceIdentity",
        "isColorPersistence",
        "serverNormalization",
        "strokeWidthWireType"
      ]) ||
    contract.unknown.some(
      (entry) =>
        typeof entry?.reason !== "string" ||
        entry.reason.trim().length === 0
    )
  ) {
    add("unknown", "실측 전 unknown 필드와 사유를 모두 보존해야 합니다.");
  }
  if (
    JSON.stringify(contract?.sourcePolicy) !==
      JSON.stringify({
        analysis: "local-gitignored-bundle",
        networkRequestCount: 0,
        productWriteCount: 0,
        rawSourceCommitted: false
      })
  ) {
    add("sourcePolicy", "오프라인·무쓰기 source policy가 필요합니다.");
  }
  if (
    contract?.integrity?.algorithm !==
      "sha256-canonical-json" ||
    !/^[a-f0-9]{64}$/.test(
      contract?.integrity?.payloadSha256 ?? ""
    )
  ) {
    add("integrity", "pen static contract hash metadata가 잘못됐습니다.");
  } else {
    try {
      if (
        penStaticContractHash(contract) !==
        contract.integrity.payloadSha256
      ) {
        add("integrity.payloadSha256", "pen static contract hash가 다릅니다.");
      }
    } catch (error) {
      add("integrity.payloadSha256", String(error));
    }
  }
  const serialized = JSON.stringify(contract);
  for (const forbidden of [
    "function T5t",
    "function P5t",
    "function mct",
    "rawCode",
    "sourceExcerpt"
  ]) {
    if (serialized.includes(forbidden)) {
      add("sourcePolicy", "원본 bundle 코드를 정본에 포함할 수 없습니다.");
    }
  }
  return { ok: issues.length === 0, issues };
}
