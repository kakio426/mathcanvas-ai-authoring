import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  eduititHtml30LifecycleEvidenceV2Schema,
  eduititHtml30LifecycleStateObservationV2Schema,
  sha256Hex
} from "../../../packages/contracts/dist/index.js";

function fileSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function invalid(code, detail = "") {
  throw new Error(`html30-v2-lifecycle:${code}${detail ? `:${detail}` : ""}`);
}

export function verifyEduititHtml30LifecycleEvidence({
  repositoryRoot,
  lifecyclePath,
  artifact,
  offline,
  manifest
}) {
  const lifecycle = eduititHtml30LifecycleEvidenceV2Schema.parse(
    readJson(lifecyclePath)
  );
  const { contentSha256: artifactContentSha256, ...artifactBody } = artifact;
  if (
    artifactContentSha256 !== sha256Hex(artifactBody) ||
    lifecycle.sourceBindings.compiledCandidateContentSha256 !== artifactContentSha256 ||
    lifecycle.sourceBindings.offlineDesignContentSha256 !== offline.contentSha256 ||
    artifact.sourceBindings?.offlineDesign?.contentSha256 !== offline.contentSha256 ||
    manifest.sourceArtifactContentSha256 !== artifactContentSha256 ||
    lifecycle.sourceBindings.projectManifestFileSha256 !==
      fileSha256(join(repositoryRoot, "research/mathcanvas/eduitit-html30-v2-created-projects.json"))
  ) {
    invalid("source-drift");
  }

  const captureHarnessBinding = lifecycle.sourceBindings.captureHarness;
  const captureHarnessPath = join(repositoryRoot, captureHarnessBinding.path);
  if (
    !existsSync(captureHarnessPath) ||
    fileSha256(captureHarnessPath) !== captureHarnessBinding.fileSha256
  ) {
    invalid("capture-harness-drift");
  }

  const projectBySequence = new Map(
    manifest.projects.map((entry) => [entry.sequence, entry])
  );
  const activityBySequence = new Map(
    offline.activities.map((entry) => [entry.sequence, entry])
  );
  const requiredCombos = new Set(
    offline.activities.map(
      (activity) =>
        `${activity.sourceBinding.catalogAffordance.family.id}::${activity.layoutIntent.variant}`
    )
  );
  const observedCombos = new Set();

  for (const record of lifecycle.records) {
    const combo = `${record.affordanceFamilyId}::${record.layoutVariant}`;
    observedCombos.add(combo);
    const project = projectBySequence.get(record.representativeSequence);
    const candidate = artifact.candidates[record.representativeSequence - 1];
    if (
      !project ||
      !candidate ||
      record.projectId !== project.projectId ||
      record.candidatePayloadHash !== candidate.payloadHash ||
      project.payloadHash !== candidate.payloadHash ||
      record.coveredSequences.some((sequence) => {
        const activity = activityBySequence.get(sequence);
        return (
          !activity ||
          activity.sourceBinding.catalogAffordance.family.id !==
            record.affordanceFamilyId ||
          activity.layoutIntent.variant !== record.layoutVariant
        );
      })
    ) {
      invalid("record-drift", record.recordId);
    }

    for (const state of record.states) {
      const screenshotPath = join(repositoryRoot, state.screenshotPath);
      const observationPath = join(repositoryRoot, state.observationPath);
      if (
        !existsSync(screenshotPath) ||
        fileSha256(screenshotPath) !== state.screenshotSha256 ||
        !existsSync(observationPath) ||
        fileSha256(observationPath) !== state.observationFileSha256
      ) {
        invalid("state-file-drift", `${record.recordId}:${state.state}`);
      }
      const observation = eduititHtml30LifecycleStateObservationV2Schema.parse(
        readJson(observationPath)
      );
      if (
        observation.contentSha256 !== state.observationContentSha256 ||
        observation.recordId !== record.recordId ||
        observation.state !== state.state ||
        observation.sequence !== record.representativeSequence ||
        observation.projectId !== record.projectId ||
        observation.candidatePayloadHash !== record.candidatePayloadHash ||
        observation.captureHarnessFileSha256 !== captureHarnessBinding.fileSha256 ||
        observation.screenshotPath !== state.screenshotPath ||
        observation.screenshotSha256 !== state.screenshotSha256 ||
        observation.persistedStateSha256 !== state.persistedStateSha256 ||
        observation.semanticProjectionSha256 !== state.semanticProjectionSha256 ||
        observation.selectionChromeVisible !== state.selectionChromeVisible ||
        observation.boundsWithinWorkbench !== state.boundsWithinWorkbench
      ) {
        invalid("state-observation-drift", `${record.recordId}:${state.state}`);
      }
    }
  }

  if (
    observedCombos.size !== requiredCombos.size ||
    [...requiredCombos].some((combo) => !observedCombos.has(combo))
  ) {
    invalid("combo-coverage-incomplete");
  }
  return lifecycle;
}
