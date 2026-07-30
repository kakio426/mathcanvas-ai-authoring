import { createHash } from "node:crypto";
import { assertNoSensitiveData } from "./normalize.mjs";

export const ROUND_TRIP_NUMERIC_DIGITS = 12;
export const ROUND_TRIP_NUMERIC_TOLERANCE = 1e-12;
export const WAVE1_RELEASED_TOOL_KEYS = [
  "NO03FM",
  "common.formula",
  "common.rectangle",
  "common.text"
];
export const WAVE1_CANARY_TITLE_PREFIX = "AI-CONTRACT-PROBE";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0
        )
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("round-trip evidence에는 유한한 숫자만 허용됩니다.");
  }
  if (typeof value === "undefined" || typeof value === "function") {
    throw new TypeError(
      "round-trip evidence에는 undefined 또는 함수를 허용하지 않습니다."
    );
  }
  return value;
}

export function exactRoundTripHash(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function normalizeRoundTripValue(
  value,
  digits = ROUND_TRIP_NUMERIC_DIGITS
) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        "round-trip 정규화에는 유한한 숫자만 허용됩니다."
      );
    }
    const scale = 10 ** digits;
    if (Math.abs(value) * scale > Number.MAX_SAFE_INTEGER) {
      throw new RangeError(
        `round-trip-number-out-of-safe-range:${String(value)}`
      );
    }
    return Math.round(value * scale) / scale;
  }
  if (Array.isArray(value)) {
    return value.map((child) =>
      normalizeRoundTripValue(child, digits)
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [
          key,
          normalizeRoundTripValue(child, digits)
        ])
    );
  }
  return value;
}

export function roundTripHash(value) {
  return createHash("sha256")
    .update(JSON.stringify(normalizeRoundTripValue(value)))
    .digest("hex");
}

export function compareRoundTripValues(
  expected,
  actual,
  tolerance = ROUND_TRIP_NUMERIC_TOLERANCE
) {
  if (tolerance !== ROUND_TRIP_NUMERIC_TOLERANCE) {
    throw new RangeError(
      `unsupported-round-trip-tolerance:${String(tolerance)}`
    );
  }
  const numericDifferences = [];
  const unexpectedDifferences = [];

  function walk(left, right, path) {
    if (Object.is(left, right)) return;
    if (typeof left === "number" && typeof right === "number") {
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        unexpectedDifferences.push({
          path,
          kind: "non-finite-number"
        });
        return;
      }
      const delta = Math.abs(left - right);
      numericDifferences.push({ path, delta });
      if (delta > tolerance) {
        unexpectedDifferences.push({
          path,
          kind: "numeric-tolerance-exceeded"
        });
      }
      return;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        unexpectedDifferences.push({
          path,
          kind: "array-length-mismatch"
        });
      }
      for (
        let index = 0;
        index < Math.max(left.length, right.length);
        index += 1
      ) {
        walk(left[index], right[index], `${path}[${index}]`);
      }
      return;
    }
    if (
      left !== null &&
      right !== null &&
      typeof left === "object" &&
      typeof right === "object"
    ) {
      const keys = new Set([
        ...Object.keys(left),
        ...Object.keys(right)
      ]);
      for (const key of [...keys].sort()) {
        walk(
          left[key],
          right[key],
          path ? `${path}.${key}` : key
        );
      }
      return;
    }
    unexpectedDifferences.push({
      path,
      kind: "value-mismatch"
    });
  }

  walk(expected, actual, "");
  const maximumNumericDelta = numericDifferences.reduce(
    (maximum, difference) =>
      Math.max(maximum, difference.delta),
    0
  );
  let normalizedEqual = false;
  try {
    normalizedEqual =
      JSON.stringify(normalizeRoundTripValue(expected)) ===
      JSON.stringify(normalizeRoundTripValue(actual));
  } catch {
    normalizedEqual = false;
  }
  return {
    normalizedEqual,
    numericDifferenceCount: numericDifferences.length,
    maximumNumericDelta,
    unexpectedDifferenceCount: unexpectedDifferences.length,
    unexpectedDifferences
  };
}

function directToolKey(object) {
  if (object?.svgId === "drawElem") return "common.rectangle";
  if (object?.svgId === "input-text") return "common.text";
  if (object?.svgId === "math-latex") return "common.formula";
  if (
    typeof object?.svgId === "string" &&
    object.svgId.startsWith("NO03FM-")
  ) {
    return "NO03FM";
  }
  return undefined;
}

export function countWave1ToolObjects(contents) {
  return countWave1ToolObjectsWithPolicy(contents, {
    allowLegacyFractionGroups: false
  });
}

export function countWave1ToolObjectsWithPolicy(
  contents,
  { allowLegacyFractionGroups }
) {
  if (!Array.isArray(contents)) {
    throw new TypeError("contentsJson은 배열이어야 합니다.");
  }
  const directToolById = new Map();
  for (const object of contents) {
    const toolKey = directToolKey(object);
    if (toolKey && typeof object?.id === "string") {
      directToolById.set(object.id, toolKey);
    }
  }
  const counts = new Map(
    WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => [toolKey, 0])
  );
  const objectIdsByTool = new Map(
    WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => [toolKey, []])
  );
  let unclassifiedObjectCount = 0;
  for (const object of contents) {
    let toolKey = directToolKey(object);
    if (
      !toolKey &&
      allowLegacyFractionGroups &&
      object?.svgId === "group-element" &&
      Array.isArray(object.ids) &&
      object.ids.length > 0
    ) {
      const referencedTools = [
        ...new Set(
          object.ids
            .map((id) => directToolById.get(id))
            .filter(Boolean)
        )
      ];
      if (referencedTools.length === 1) {
        toolKey = referencedTools[0];
      }
    }
    if (!toolKey || !counts.has(toolKey)) {
      unclassifiedObjectCount += 1;
      continue;
    }
    counts.set(toolKey, (counts.get(toolKey) ?? 0) + 1);
    if (typeof object?.id === "string") {
      objectIdsByTool.get(toolKey)?.push(object.id);
    }
  }
  return { counts, objectIdsByTool, unclassifiedObjectCount };
}

export function buildCanaryPayload(
  goldenPayload,
  runId,
  titlePrefix
) {
  if (!/^\d{8}T\d{6}Z$/.test(runId)) {
    throw new Error(`invalid-canary-run-id:${runId}`);
  }
  if (
    typeof titlePrefix !== "string" ||
    !/^AI-CONTRACT-PROBE(?:-W\d+)?$/.test(titlePrefix)
  ) {
    throw new Error("invalid-canary-title-prefix");
  }
  const projectTitle =
    `${titlePrefix}-${runId} · ` +
    String(goldenPayload?.projectTitle ?? "");
  if (projectTitle.length > 120) {
    throw new Error("canary-project-title-too-long");
  }
  return canonicalize({
    ...goldenPayload,
    projectTitle
  });
}

export function buildWave1CanaryPayload(goldenPayload, runId) {
  return buildCanaryPayload(
    goldenPayload,
    runId,
    WAVE1_CANARY_TITLE_PREFIX
  );
}

export function validateCanaryGoldenBinding({
  goldenPayload,
  expectedGoldenPayloadHash,
  submittedPayload,
  runId,
  titlePrefix
}) {
  if (
    !hash64(expectedGoldenPayloadHash) ||
    exactRoundTripHash(goldenPayload) !== expectedGoldenPayloadHash
  ) {
    throw new Error("canary-golden-hash-mismatch");
  }
  const expectedSubmittedPayload = buildCanaryPayload(
    goldenPayload,
    runId,
    titlePrefix
  );
  if (!sameJson(expectedSubmittedPayload, submittedPayload)) {
    throw new Error("canary-payload-not-derived-from-golden");
  }
  const classification = countWave1ToolObjects(
    submittedPayload?.contentsJson
  );
  if (classification.unclassifiedObjectCount !== 0) {
    throw new Error("canary-payload-has-unclassified-objects");
  }
  return {
    goldenPayloadHash: expectedGoldenPayloadHash,
    submittedPayloadHash: exactRoundTripHash(submittedPayload),
    submittedObjectCount: submittedPayload.contentsJson.length
  };
}

export function validateWave1CanaryGoldenBinding(input) {
  return validateCanaryGoldenBinding({
    ...input,
    titlePrefix: WAVE1_CANARY_TITLE_PREFIX
  });
}

function sameJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function isoDate(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(new Date(value).getTime()) &&
    new Date(value).toISOString() === value
  );
}

function hash64(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function validateWave1RoundTripEvidence(evidence, artifacts) {
  const issues = [];
  const issue = (path, message) => issues.push({ path, message });
  if (evidence?.schemaVersion !== "1.0.0") {
    issue("schemaVersion", "1.0.0이어야 합니다.");
  }
  if (evidence?.probeId !== "wave1-released-baseline-read-only-v1") {
    issue("probeId", "wave 1 read-only probe ID와 일치해야 합니다.");
  }
  if (!isoDate(evidence?.observedAt)) {
    issue("observedAt", "실제 ISO 관찰 시각이어야 합니다.");
  }
  if (
    evidence?.provenance?.source !==
      "creator-owned-approved-job" ||
    evidence?.provenance?.creationStatus !== "succeeded" ||
    !isoDate(evidence?.provenance?.creationCompletedAt) ||
    !hash64(evidence?.provenance?.submittedPayloadHash) ||
    !hash64(evidence?.provenance?.artifactsHash)
  ) {
    issue("provenance", "승인된 성공 생성 기록과 64자리 hash가 필요합니다.");
  }
  if (
    artifacts?.schemaVersion !== "1.0.0" ||
    artifacts?.artifactId !==
      "wave1-released-baseline-read-only-artifacts-v1"
  ) {
    issue("artifacts", "재계산 가능한 wave 1 artifact가 필요합니다.");
  }
  try {
    assertNoSensitiveData(artifacts);
  } catch (error) {
    issue("artifacts", String(error));
  }

  let expectedComparison;
  let mutationComparison;
  let submittedCounts;
  let reopenedCounts;
  try {
    expectedComparison = compareRoundTripValues(
      artifacts.submittedComparable,
      artifacts.reopenedComparable
    );
    mutationComparison = compareRoundTripValues(
      artifacts.reopenedComparable,
      artifacts.postInteractionReopenedComparable
    );
    submittedCounts = countWave1ToolObjectsWithPolicy(
      artifacts.submittedComparable?.contentsJson,
      { allowLegacyFractionGroups: true }
    );
    reopenedCounts = countWave1ToolObjectsWithPolicy(
      artifacts.reopenedComparable?.contentsJson,
      { allowLegacyFractionGroups: true }
    );
  } catch (error) {
    issue("artifacts", String(error));
  }

  if (
    evidence?.provenance?.artifactsHash !==
    exactRoundTripHash(artifacts)
  ) {
    issue("provenance.artifactsHash", "artifact 실제 hash와 일치해야 합니다.");
  }
  if (
    evidence?.provenance?.submittedPayloadHash !==
    exactRoundTripHash(artifacts?.submittedPayload)
  ) {
    issue(
      "provenance.submittedPayloadHash",
      "제출 payload 실제 hash와 일치해야 합니다."
    );
  }
  if (
    !sameJson(
      artifacts?.submittedComparable,
      artifacts?.submittedPayload
        ? {
            projectTitle: artifacts.submittedPayload.projectTitle,
            contentsJson: artifacts.submittedPayload.contentsJson,
            canvasOption: artifacts.submittedPayload.canvasOption,
            isShowMenuOnActivity:
              artifacts.submittedPayload.isShowMenuOnActivity,
            isNoteworthy:
              artifacts.submittedPayload.isNoteworthy,
            tags: artifacts.submittedPayload.tags,
            studyLevel: artifacts.submittedPayload.studyLevel,
            categoryId: artifacts.submittedPayload.categoryId
          }
        : undefined
    )
  ) {
    issue("artifacts.submittedComparable", "제출 payload의 비교 projection이어야 합니다.");
  }

  const toolKeys = [...(evidence?.toolResults ?? [])]
    .map((result) => result?.toolKey)
    .sort();
  if (
    JSON.stringify(toolKeys) !==
    JSON.stringify([...WAVE1_RELEASED_TOOL_KEYS].sort())
  ) {
    issue("toolResults", "released 기준선 4도구를 모두 포함해야 합니다.");
  }
  let submittedToolTotal = 0;
  for (const [index, result] of (
    evidence?.toolResults ?? []
  ).entries()) {
    const expectedSubmitted =
      submittedCounts?.counts.get(result?.toolKey) ?? -1;
    const expectedReopened =
      reopenedCounts?.counts.get(result?.toolKey) ?? -1;
    submittedToolTotal += result?.submittedObjectCount ?? 0;
    if (
      !Number.isInteger(result?.submittedObjectCount) ||
      result.submittedObjectCount <= 0 ||
      result.submittedObjectCount !== expectedSubmitted ||
      result.reopenedObjectCount !== expectedReopened ||
      result.submittedObjectCount !== result.reopenedObjectCount ||
      result.submittedObjectCount !== result.renderedObjectCount
    ) {
      issue(
        `toolResults[${index}]`,
        "artifact에서 재계산한 제출·재열기·렌더 객체 수와 일치해야 합니다."
      );
    }
  }
  if (
    submittedCounts?.unclassifiedObjectCount !== 0 ||
    reopenedCounts?.unclassifiedObjectCount !== 0 ||
    submittedToolTotal !== evidence?.render?.submittedObjectCount ||
    evidence?.render?.submittedObjectCount !==
      evidence?.render?.itemGroupCount
  ) {
    issue(
      "render.submittedObjectCount",
      "4도구 분류 합계와 제출·렌더 전체 객체 수가 일치해야 합니다."
    );
  }

  if (
    evidence?.roundTrip?.numericTolerance !==
      ROUND_TRIP_NUMERIC_TOLERANCE ||
    !sameJson(
      {
        normalizedEqual: evidence?.roundTrip?.normalizedEqual,
        numericDifferenceCount:
          evidence?.roundTrip?.numericDifferenceCount,
        maximumNumericDelta:
          evidence?.roundTrip?.maximumNumericDelta,
        unexpectedDifferenceCount:
          evidence?.roundTrip?.unexpectedDifferenceCount,
        unexpectedDifferences:
          evidence?.roundTrip?.unexpectedDifferences
      },
      expectedComparison
    ) ||
    expectedComparison?.normalizedEqual !== true ||
    expectedComparison?.unexpectedDifferenceCount !== 0 ||
    evidence?.roundTrip?.submittedComparableHash !==
      roundTripHash(artifacts?.submittedComparable) ||
    evidence?.roundTrip?.reopenedComparableHash !==
      roundTripHash(artifacts?.reopenedComparable) ||
    evidence?.roundTrip?.submittedComparableHash !==
      evidence?.roundTrip?.reopenedComparableHash
  ) {
    issue("roundTrip", "artifact 재계산 결과·허용 오차·hash가 일치해야 합니다.");
  }
  if (
    evidence?.render?.playgroundCount <= 0 ||
    evidence?.render?.visibleSvgCount <= 0 ||
    evidence?.render?.mathFieldCount !==
      (reopenedCounts?.counts.get("common.formula") ?? -1) ||
    evidence?.render?.containsProjectTitle !== true ||
    evidence?.render?.containsInstruction !== true
  ) {
    issue("render", "제출 객체와 화면 렌더 근거가 일치해야 합니다.");
  }
  if (
    evidence?.interaction?.mode !== "isolated-client-only" ||
    evidence?.interaction?.toolKey !== "NO03FM" ||
    evidence?.interaction?.transformChanged !== true ||
    evidence?.interaction?.persistedSourceUnchanged !== true
  ) {
    issue("interaction", "분수 모형의 격리된 이동 검증이 필요합니다.");
  }
  const persistedMutationCount =
    (mutationComparison?.numericDifferenceCount ?? -1) +
    (mutationComparison?.unexpectedDifferenceCount ?? -1);
  if (
    mutationComparison?.normalizedEqual !== true ||
    persistedMutationCount !== 0 ||
    evidence?.writeBoundary?.mode !== "block-all-writes" ||
    evidence?.writeBoundary?.observedWriteRequestCount !== 0 ||
    evidence?.writeBoundary?.persistedMutationCount !==
      persistedMutationCount
  ) {
    issue("writeBoundary", "기존 프로젝트 전체 payload에는 쓰기·변경이 없어야 합니다.");
  }
  if (
    !sameJson(
      evidence?.claims,
      Object.fromEntries(
        (evidence?.toolResults ?? []).map((result) => [
          result.toolKey,
          {
            lifecycle: {
              renderedObjectCount: result.renderedObjectCount,
              reopenedObjectCount: result.reopenedObjectCount
            },
            released: {
              comparableHash:
                evidence?.roundTrip?.reopenedComparableHash,
              normalizedEqual:
                evidence?.roundTrip?.normalizedEqual
            },
            verified: {
              reopenedObjectCount: result.reopenedObjectCount,
              submittedObjectCount: result.submittedObjectCount
            }
          }
        ])
      )
    )
  ) {
    issue("claims", "도구별 evidence claim이 측정 결과와 일치해야 합니다.");
  }
  const serialized = JSON.stringify(evidence);
  for (const forbidden of [
    "projectId",
    "jobId",
    "editorUrl",
    "accessToken",
    "Authorization",
    "owner"
  ]) {
    if (serialized.includes(forbidden)) {
      issue("redaction", `${forbidden} 필드를 포함할 수 없습니다.`);
    }
  }
  return {
    ok: issues.length === 0,
    issues
  };
}
