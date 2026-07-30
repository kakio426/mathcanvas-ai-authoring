#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot,
  repositoryRoot
} from "./lib/paths.mjs";
import { assertNoSensitiveData } from "./lib/normalize.mjs";
import {
  exactRoundTripHash
} from "./lib/round-trip-evidence.mjs";
import {
  buildWave3PenCanaryPayload
} from "./lib/common-draw-contract.mjs";

const ARTIFACT_ID = "wave3-pen-canary-artifacts-v1";
const PROBE_ID = "wave3-pen-canary-v1";
const CREATE_CHECKPOINT_ID =
  "wave3-pen-canary-create-checkpoint-v1";
const SAVE_CHECKPOINT_ID =
  "wave3-pen-canary-save-checkpoint-v1";
const REDACTED_PROJECT_PATH =
  "/api/project/<redacted-project>";
const successfulOutcome = "roundtrip-pass";
const negativeOutcomes = new Set([
  "authored-create-rejected",
  "authored-pen-not-persisted",
  "authored-pen-not-rendered"
]);

function sameJson(left, right) {
  try {
    return exactRoundTripHash(left) === exactRoundTripHash(right);
  } catch {
    return false;
  }
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

function penSummary(element) {
  const d = typeof element?.d === "string" ? element.d : "";
  const numericTokens =
    d.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  return {
    strokeId: element?.id,
    fieldNames:
      element && typeof element === "object"
        ? Object.keys(element).sort()
        : [],
    fieldTypes:
      element && typeof element === "object"
        ? Object.fromEntries(
            Object.entries(element)
              .sort(([left], [right]) =>
                left.localeCompare(right)
              )
              .map(([field, value]) => [
                field,
                value === null
                  ? "null"
                  : Array.isArray(value)
                    ? "array"
                    : typeof value
              ])
          )
        : {},
    numericTokenCount: numericTokens.length,
    pointCount: Math.floor(numericTokens.length / 2),
    pathLength: d.length,
    ...(d.length > 0
      ? { pathSha256: exactRoundTripHash(d) }
      : {})
  };
}

function sortedIds(summaries) {
  return (summaries ?? [])
    .map((summary) => summary?.strokeId ?? summary?.id)
    .sort();
}

function pathHashById(summaries) {
  return Object.fromEntries(
    (summaries ?? [])
      .map((summary) => [
        summary?.strokeId ?? summary?.id,
        summary?.pathSha256
      ])
      .sort(([left], [right]) =>
        String(left).localeCompare(String(right))
      )
  );
}

function validateNetworkRecords(
  evidence,
  artifacts,
  createCheckpoint,
  saveCheckpoint,
  submittedPayloadHash,
  issue
) {
  const allowedWrites = artifacts?.network?.allowedWrites ?? [];
  const projectReads = artifacts?.network?.projectReads ?? [];
  const blockedExisting =
    artifacts?.network?.blockedExistingProjectReads ?? [];
  const blockedCanary =
    artifacts?.network?.blockedCanaryReadLimit ?? [];
  const blockedWrites =
    artifacts?.network?.blockedWrites ?? [];
  const blockedExternalWrites =
    artifacts?.network?.blockedExternalWrites ?? [];
  const createWrite =
    createCheckpoint?.network?.allowedWrites?.[0];
  if (
    createCheckpoint?.schemaVersion !== "1.0.0" ||
    createCheckpoint?.checkpointId !== CREATE_CHECKPOINT_ID ||
    createCheckpoint?.runId !== evidence?.provenance?.runId ||
    !isoDate(createCheckpoint?.observedAt) ||
    createCheckpoint?.provenance?.submittedPayloadHash !==
      submittedPayloadHash ||
    createCheckpoint?.network?.allowedWrites?.length !== 1 ||
    createWrite?.method !== "POST" ||
    createWrite?.path !== "/api/project" ||
    createWrite?.payloadHash !== submittedPayloadHash ||
    !Number.isInteger(createWrite?.status) ||
    createCheckpoint?.phase !==
      (evidence?.outcome === "authored-create-rejected"
        ? "create-response-rejected-or-invalid"
        : "create-response-captured-before-ui-pen")
  ) {
    issue("createCheckpoint", "Wave 3 POST checkpoint가 재계산 결과와 다릅니다.");
  }
  if (
    projectReads.length > 3 ||
    projectReads.some(
      (read) =>
        read?.method !== "GET" ||
        read?.path !== REDACTED_PROJECT_PATH
    ) ||
    blockedExisting.length !== 0 ||
    blockedCanary.some(
      (read) =>
        read?.method !== "GET" ||
        read?.path !== REDACTED_PROJECT_PATH
    ) ||
    evidence?.writeBoundary?.projectReadCount !==
      projectReads.length ||
    evidence?.writeBoundary?.blockedCanaryReadCount !==
      blockedCanary.length ||
    evidence?.writeBoundary?.blockedWriteCount !==
      blockedWrites.length ||
    evidence?.writeBoundary?.blockedExternalWriteCount !==
      blockedExternalWrites.length ||
    evidence?.writeBoundary?.existingTeacherProjectReadCount !== 0
  ) {
    issue("readBoundary", "canary GET 상한 또는 기존 프로젝트 read 경계가 다릅니다.");
  }

  if (evidence?.outcome === successfulOutcome) {
    const creationMode =
      evidence?.writeBoundary?.creationEvidenceMode;
    const expectedWriteCount =
      creationMode === "recovered-private-state" ? 1 : 2;
    const saveWrite = allowedWrites.find(
      (write) => write?.method === "PUT"
    );
    if (
      createWrite?.status < 200 ||
      createWrite?.status >= 300 ||
      allowedWrites.length !== expectedWriteCount ||
      !saveWrite ||
      saveWrite.path !== REDACTED_PROJECT_PATH ||
      saveWrite.status < 200 ||
      saveWrite.status >= 300 ||
      saveWrite.payloadHash !==
        artifacts?.provenance?.savedPayloadHash ||
      saveCheckpoint?.schemaVersion !== "1.0.0" ||
      saveCheckpoint?.checkpointId !== SAVE_CHECKPOINT_ID ||
      saveCheckpoint?.runId !== evidence?.provenance?.runId ||
      !isoDate(saveCheckpoint?.observedAt) ||
      saveCheckpoint?.phase !==
        "save-response-captured-before-final-render" ||
      saveCheckpoint?.provenance?.submittedPayloadHash !==
        submittedPayloadHash ||
      saveCheckpoint?.provenance?.savedPayloadHash !==
        artifacts?.provenance?.savedPayloadHash ||
      !sameJson(
        saveCheckpoint?.network?.allowedWrites,
        allowedWrites
      ) ||
      !sameJson(
        saveCheckpoint?.discovery?.penElementSummaries,
        artifacts?.discovery?.savedPenElementSummaries
      ) ||
      evidence?.writeBoundary?.allowedCreateCount !== 1 ||
      evidence?.writeBoundary?.allowedSaveCount !== 1 ||
      evidence?.writeBoundary?.observedAllowedWriteCount !==
        allowedWrites.length
    ) {
      issue("writeBoundary", "Wave 3 성공 경로의 POST/PUT 경계가 다릅니다.");
    }
  } else {
    const createRejected =
      evidence?.outcome === "authored-create-rejected";
    if (
      evidence?.writeBoundary?.mode !==
        "one-create-no-save-negative-outcome" ||
      evidence?.writeBoundary?.allowedCreateCount !== 1 ||
      evidence?.writeBoundary?.allowedSaveCount !== 0 ||
      evidence?.writeBoundary?.observedAllowedWriteCount !==
        allowedWrites.length ||
      (createRejected &&
        (allowedWrites.length !== 1 ||
          allowedWrites[0]?.method !== "POST")) ||
      (!createRejected &&
        allowedWrites.some((write) => write?.method === "PUT"))
    ) {
      issue("writeBoundary", "Wave 3 부정 결과는 저장 없이 보존되어야 합니다.");
    }
  }
  if (
    blockedWrites.some(
      (write) =>
        write?.method !== "POST" ||
        write?.path !==
          `${REDACTED_PROJECT_PATH}/upload-image`
    ) ||
    blockedExternalWrites.some(
      (write) =>
        !["POST", "PUT", "PATCH", "DELETE"].includes(
          write?.method
        ) ||
        typeof write?.path !== "string"
    )
  ) {
    issue("blockedWrites", "차단 write 요약이 허용된 형태가 아닙니다.");
  }
}

try {
  const options = parseArguments(process.argv.slice(2), {
    input: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.roundtrip.json"
      )
    },
    artifacts: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.artifacts.json"
      )
    },
    "create-checkpoint": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.create-checkpoint.json"
      )
    },
    "save-checkpoint": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave3-pen-canary.save-checkpoint.json"
      )
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const readResearchJson = (path, label) =>
    JSON.parse(
      readFileSync(
        assertPathInside(
          path,
          options["research-root"],
          label
        ),
        "utf8"
      )
    );
  const evidence = readResearchJson(
    options.input,
    "Wave 3 evidence"
  );
  const artifacts = readResearchJson(
    options.artifacts,
    "Wave 3 artifacts"
  );
  const createCheckpoint = readResearchJson(
    options["create-checkpoint"],
    "Wave 3 create checkpoint"
  );
  const saveCheckpoint =
    evidence?.outcome === successfulOutcome
      ? readResearchJson(
          options["save-checkpoint"],
          "Wave 3 save checkpoint"
        )
      : undefined;
  const goldenFixture = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "fixtures",
        "golden",
        "fraction-comparison.p0-v1.json"
      ),
      "utf8"
    )
  );
  const staticContract = readResearchJson(
    join(
      options["research-root"],
      "pen-contract.static.json"
    ),
    "Wave 3 static contract"
  );
  const issues = [];
  const issue = (path, message) => issues.push({ path, message });
  const runId = evidence?.provenance?.runId;
  const validOutcome =
    evidence?.outcome === successfulOutcome ||
    negativeOutcomes.has(evidence?.outcome);
  if (
    evidence?.schemaVersion !== "1.0.0" ||
    evidence?.probeId !== PROBE_ID ||
    !isoDate(evidence?.observedAt) ||
    !validOutcome ||
    artifacts?.schemaVersion !== "1.0.0" ||
    artifacts?.artifactId !== ARTIFACT_ID ||
    artifacts?.runId !== runId ||
    artifacts?.outcome !== evidence?.outcome
  ) {
    issue("identity", "Wave 3 evidence/artifact identity가 다릅니다.");
  }
  try {
    assertNoSensitiveData(evidence);
    assertNoSensitiveData(artifacts);
    assertNoSensitiveData(createCheckpoint);
    if (saveCheckpoint) assertNoSensitiveData(saveCheckpoint);
  } catch (error) {
    issue("redaction", String(error));
  }
  if (
    JSON.stringify({ evidence, artifacts }).includes('"d":') ||
    /function T5t|function P5t|rawCode|sourceExcerpt/.test(
      JSON.stringify({ evidence, artifacts })
    )
  ) {
    issue("redaction", "커밋 evidence에 raw SVG d 또는 source 원문이 있습니다.");
  }

  let submittedPayload;
  try {
    submittedPayload = buildWave3PenCanaryPayload(
      goldenFixture?.results?.compiledProject?.payload,
      runId
    );
  } catch (error) {
    issue("goldenBinding", String(error));
  }
  const submittedPayloadHash = submittedPayload
    ? exactRoundTripHash(submittedPayload)
    : undefined;
  const expectedSubmittedSummaries =
    submittedPayload?.canvasOption?.penElements?.map(penSummary);
  if (
    evidence?.provenance?.source !==
      "approved-new-canary-ui-pen" ||
    evidence?.provenance?.goldenFixtureId !==
      goldenFixture?.fixtureId ||
    evidence?.provenance?.goldenPayloadHash !==
      goldenFixture?.invariants?.payloadHash ||
    evidence?.provenance?.staticContractFileHash !==
      exactRoundTripHash(staticContract) ||
    evidence?.provenance?.submittedPayloadHash !==
      submittedPayloadHash ||
    artifacts?.provenance?.submittedPayloadHash !==
      submittedPayloadHash ||
    evidence?.provenance?.createCheckpointHash !==
      exactRoundTripHash(createCheckpoint) ||
    (saveCheckpoint &&
      evidence?.provenance?.saveCheckpointHash !==
        exactRoundTripHash(saveCheckpoint)) ||
    evidence?.provenance?.artifactsHash !==
      exactRoundTripHash(artifacts)
  ) {
    issue("provenance", "Wave 3 정본 hash 결속이 다릅니다.");
  }

  validateNetworkRecords(
    evidence,
    artifacts,
    createCheckpoint,
    saveCheckpoint,
    submittedPayloadHash,
    issue
  );

  if (evidence?.outcome === successfulOutcome) {
    const initialObservation =
      artifacts?.discovery?.initialPenObservation;
    const savedSummaries =
      artifacts?.discovery?.savedPenElementSummaries ?? [];
    const initialIds = sortedIds(initialObservation?.reopened);
    const savedIds = sortedIds(savedSummaries);
    const expectedFinalIds =
      artifacts?.interaction?.expectedFinalIds ?? [];
    const render = artifacts?.render;
    if (
      initialObservation?.authoredCreatePersistence !== true ||
      evidence?.discovery?.authoredCreatePersistence !== true ||
      !sameJson(initialIds, sortedIds(expectedSubmittedSummaries)) ||
      !sameJson(savedIds, [...expectedFinalIds].sort()) ||
      !sameJson(render?.initial?.pathIds, initialIds) ||
      render?.initial?.pathCount !== 2 ||
      render?.afterDraw?.pathCount !== 3 ||
      render?.afterErase?.pathCount !== 2 ||
      render?.final?.pathCount !== 2 ||
      !sameJson(render?.afterErase?.pathIds, expectedFinalIds) ||
      !sameJson(render?.final?.pathIds, expectedFinalIds) ||
      render?.initial?.coordinateSpaceIdentity !== true ||
      render?.final?.coordinateSpaceIdentity !== true ||
      !sameJson(
        pathHashById(initialObservation?.reopened),
        pathHashById(render?.initial?.paths)
      ) ||
      !sameJson(
        pathHashById(savedSummaries),
        pathHashById(render?.afterErase?.paths)
      ) ||
      !sameJson(
        pathHashById(savedSummaries),
        pathHashById(render?.final?.paths)
      ) ||
      evidence?.interaction?.uiCreatedStrokeCount !== 1 ||
      evidence?.interaction?.erasedAuthoredStrokeCount !== 1 ||
      evidence?.roundTrip?.savedReopen?.normalizedEqual !== true ||
      evidence?.roundTrip?.savedReopen
        ?.unexpectedDifferenceCount !== 0
    ) {
      issue("roundTrip", "Wave 3 pen ID/path/render 왕복이 재계산 결과와 다릅니다.");
    }
  } else {
    if (
      evidence?.discovery?.authoredCreatePersistence !== false ||
      artifacts?.discovery?.authoredCreatePersistence !== false ||
      typeof evidence?.discovery?.failureReason !== "string" ||
      evidence.discovery.failureReason.length === 0 ||
      evidence.discovery.failureReason !==
        artifacts?.discovery?.failureReason ||
      !sameJson(
        evidence?.discovery?.submittedPenElementSummaries,
        expectedSubmittedSummaries
      ) ||
      !sameJson(
        artifacts?.discovery?.submittedPenElementSummaries,
        expectedSubmittedSummaries
      ) ||
      !sameJson(
        evidence?.discovery?.initialPenElementSummaries,
        artifacts?.discovery?.initialPenElementSummaries ?? []
      ) ||
      (evidence?.outcome === "authored-pen-not-rendered" &&
        ((artifacts?.discovery?.initialRender?.valid === true &&
          sameJson(
            artifacts?.discovery?.initialRender?.pathIds,
            sortedIds(expectedSubmittedSummaries)
          )) ||
          !sameJson(
            evidence?.discovery?.initialRenderedPenStrokeIds,
            artifacts?.discovery?.initialRender?.pathIds
          )))
    ) {
      issue("negativeOutcome", "authored pen 부정 결과가 재계산 가능해야 합니다.");
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `wave3-pen-canary-evidence-invalid:${JSON.stringify(
        issues
      )}`
    );
  }
  process.stdout.write(
    `PASS wave3 pen canary ${runId} ${evidence.outcome}\n`
  );
} catch (error) {
  failCli(error);
}
