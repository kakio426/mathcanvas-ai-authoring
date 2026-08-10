#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  eduititHtml30OfflineDesignV2Schema,
  mathCanvasPayloadSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import {
  compileEduititHtml30CandidateV2
} from "../../packages/mathcanvas-compiler/dist/index.js";
import { repositoryRoot } from "../contract-lab/lib/paths.mjs";

const offlinePath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-offline-design.json"
);
const harnessPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-prompt-harness.json"
);
const outputPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-v2-compiled-candidates.json"
);

const sourcePaths = {
  compiler:
    "packages/mathcanvas-compiler/src/compile-eduitit-html30-v2.ts",
  candidateNativeFactories:
    "packages/mathcanvas-compiler/src/adapters/eduitit-html30-candidate-native-v2.ts",
  canonicalGroup:
    "packages/mathcanvas-compiler/src/adapters/canonical-native-group-v2.ts",
  builder:
    "scripts/prompt-harness/build-eduitit-html30-v2-candidates.mjs"
};

function fileSha(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function pinned(path) {
  const absolutePath = join(repositoryRoot, path);
  return { path, fileSha256: fileSha(absolutePath) };
}

function buildArtifact() {
  const offline = eduititHtml30OfflineDesignV2Schema.parse(
    JSON.parse(readFileSync(offlinePath, "utf8"))
  );
  const harness = JSON.parse(readFileSync(harnessPath, "utf8"));
  if (harness.entries?.length !== 30) {
    throw new Error("html30-v2-compiled:harness-exact-30-required");
  }
  const domainBySequence = new Map(
    harness.entries.map((entry) => [entry.sequence, entry.catalogBinding.domain])
  );
  const candidates = offline.activities.map((activity, index) => {
    const layout = offline.layouts[index];
    const domain = domainBySequence.get(activity.sequence);
    if (!layout || typeof domain !== "string") {
      throw new Error(`html30-v2-compiled:source-binding:${activity.sequence}`);
    }
    const candidate = compileEduititHtml30CandidateV2(activity, layout, domain);
    mathCanvasPayloadSchema.parse(candidate.payload);
    return candidate;
  });
  const allAtScale3 = candidates.every(
    (candidate) =>
      candidate.payload.canvasOption.scale === 3 &&
      candidate.payload.canvasOption.viewBox.join(",") === "0,0,1536,960"
  );
  const allOneProblem = candidates.every((candidate) => {
    const activity = offline.activities[candidate.sequence - 1];
    return activity?.structure.oneProblem === true;
  });
  const allGroupWrappersExact = candidates.every((candidate) => {
    const activity = offline.activities[candidate.sequence - 1];
    if (!activity) return false;
    const objects = candidate.payload.contentsJson;
    const byId = new Map(objects.map((object) => [object.id, object]));
    return activity.nativePlan.movableUnits.every((unit) => {
      if (unit.representation.kind !== "canonical-native-group") return true;
      const wrapper = byId.get(unit.representation.groupId);
      return (
        wrapper?.svgId === "group-element" &&
        wrapper.groupId === unit.representation.groupId &&
        wrapper.isGroup === true &&
        Array.isArray(wrapper.ids) &&
        wrapper.ids.length === unit.representation.memberIds.length &&
        unit.representation.memberIds.every((id) => {
          const member = byId.get(id);
          return member?.groupId === unit.representation.groupId && member.isGroup === true;
        })
      );
    });
  });
  const allForbiddenRegionsAbsent = offline.activities.every(
    (activity) =>
      !activity.structure.topDirectionBlock &&
      !activity.structure.predictionRegion &&
      !activity.structure.firstAnswerRegion &&
      !activity.structure.revisionRegion &&
      !activity.structure.writtenReasonRegion &&
      !activity.structure.penRequired
  );
  const allInitialTextLeakageAuditsPass = candidates.every(
    (candidate) =>
      candidate.initialTextLeakageAudit?.policyVersion ===
        "html30-v2-initial-answer-leakage-v2" &&
      candidate.initialTextLeakageAudit?.passed === true &&
      candidate.initialTextLeakageAudit?.violations?.length === 0
  );
  if (
    candidates.length !== 30 ||
    !allAtScale3 ||
    !allOneProblem ||
    !allGroupWrappersExact ||
    !allForbiddenRegionsAbsent ||
    !allInitialTextLeakageAuditsPass
  ) {
    throw new Error("html30-v2-compiled:attestation-failed");
  }
  const body = {
    schemaVersion: "1.0.0",
    artifactId: "eduitit-html30-v2-compiled-candidates",
    artifactVersion: "1.0.0",
    sourceBindings: {
      offlineDesign: {
        path: "research/mathcanvas/eduitit-html30-v2-offline-design.json",
        fileSha256: fileSha(offlinePath),
        contentSha256: offline.contentSha256
      },
      promptHarness: {
        path: "research/mathcanvas/eduitit-html30-prompt-harness.json",
        fileSha256: fileSha(harnessPath),
        contentSha256: harness.contentSha256
      },
      ...Object.fromEntries(
        Object.entries(sourcePaths).map(([key, path]) => [key, pinned(path)])
      )
    },
    candidates,
    attestation: {
      exactCandidateCount: 30,
      allOneProblem,
      allAtMathCanvas100PercentScale3: allAtScale3,
      allForbiddenRegionsAbsent,
      allCanonicalGroupsPersisted: allGroupWrappersExact,
      allInitialTextLeakageAuditsPass,
      legacyWriterUsed: false,
      externalWriteAllowed: false,
      liveValidationPending: true,
      releaseQualifiedCount: 0,
      blockers: [
        "live 100-percent geometry confirmation is pending",
        "actual save-reopen and visual review are pending"
      ]
    }
  };
  return { ...body, contentSha256: sha256Hex(body) };
}

const expected = buildArtifact();
if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(expected, null, 2)}\n`, "utf8");
  process.stdout.write(
    `UPDATED HTML30 V2 compiled candidates 30/30 ${expected.contentSha256}\n`
  );
} else {
  const current = JSON.parse(readFileSync(outputPath, "utf8"));
  if (JSON.stringify(current) !== JSON.stringify(expected)) {
    throw new Error("html30-v2-compiled:artifact-stale");
  }
  process.stdout.write(
    `PASS HTML30 V2 compiled candidates 30/30 ${expected.contentSha256}\n`
  );
}
