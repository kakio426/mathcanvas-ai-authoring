import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  listProblemFamilyManifests,
  listRegisteredBlueprints
} from "../../packages/templates/dist/index.js";
import {
  effectiveFamilyRecord,
  readSolReviewBoard
} from "../curriculum/sol-review-status.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const jsonPath = resolve(root, "reports/problem-family-registry/latest.json");
const markdownPath = resolve(root, "reports/problem-family-registry/latest.md");
const baselinePath = resolve(
  root,
  "fixtures/golden/problem-family-released-v1.json"
);
const shouldWrite = process.argv.includes("--write");

function buildReport() {
  const manifests = [...listProblemFamilyManifests()].sort((left, right) =>
    left.familyId.localeCompare(right.familyId)
  );
  const blueprints = new Map(
    listRegisteredBlueprints().map((blueprint) => [blueprint.id, blueprint])
  );
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const solReviewBoard = readSolReviewBoard();
  const baselineByFamily = new Map(
    baseline.rows.map((family) => [family.familyId, family])
  );
  const released = manifests.filter(
    (manifest) => manifest.releaseEvidence.supportState === "released"
  );
  const baselineMissing = released
    .filter((manifest) => !baselineByFamily.has(manifest.familyId))
    .map((manifest) => manifest.familyId);
  const baselineExtra = [...baselineByFamily.keys()].filter(
    (familyId) =>
      !released.some((manifest) => manifest.familyId === familyId)
  );
  const hashMismatches = released
    .filter(
      (manifest) =>
        baselineByFamily.get(manifest.familyId)?.blueprintContentHash !==
        manifest.releaseEvidence.blueprintContentHash
    )
    .map((manifest) => manifest.familyId);
  if (
    blueprints.size !== manifests.length ||
    baselineMissing.length > 0 ||
    baselineExtra.length > 0 ||
    hashMismatches.length > 0
  ) {
    throw new Error(
      `problem-family-report-invalid:runtime=${blueprints.size}/${manifests.length}:baseline-missing=${baselineMissing.join(",")}:baseline-extra=${baselineExtra.join(",")}:hash-mismatch=${hashMismatches.join(",")}`
    );
  }

  return {
    schemaVersion: "1.0.0",
    registeredFamilyCount: manifests.length,
    releasedFamilyCount: released.length,
    parameterizedFamilyCount: manifests.filter(
      (manifest) => manifest.capability.parameterFields.length > 0
    ).length,
    nativeFamilyCount: manifests.filter(
      (manifest) => manifest.renderRecipe.kind === "native-render-recipe"
    ).length,
    releasedPayloadBaselineCount: baseline.rows.length,
    families: manifests.map((manifest) => {
      const effective = effectiveFamilyRecord(manifest, solReviewBoard);
      return {
      familyId: manifest.familyId,
      activityId: manifest.activityId,
      templateId: manifest.templateId,
      domain: manifest.domain,
      standardCodes: manifest.capability.supportedStandardCodes,
      manipulation: manifest.manipulation,
      generator: manifest.generator,
      renderRecipeKind: manifest.renderRecipe.kind,
      supportState: manifest.releaseEvidence.supportState,
      lifecycleStage: effective.lifecycleStage,
      solReviewStatus: effective.reviewStatus,
      blueprintContentHash:
        manifest.releaseEvidence.blueprintContentHash,
      assessmentTargetIds: manifest.assessmentTargetIds,
      parameterKeys: manifest.capability.parameterFields.map(
        (field) => field.key
      ),
      evidencePaths: manifest.releaseEvidence.evidencePaths
      };
    })
  };
}

function markdown(report) {
  return [
    "# ProblemFamily registry 보고서",
    "",
    `- canonical family: **${report.registeredFamilyCount}개**`,
    `- released family: **${report.releasedFamilyCount}개**`,
    `- 공통 ProblemParameters 지원 family: **${report.parameterizedFamilyCount}개**`,
    `- native module family: **${report.nativeFamilyCount}개**`,
    `- released payload hash 기준선: **${report.releasedPayloadBaselineCount}개**`,
    "",
    "> family 수는 AssessmentTarget coverage가 아닙니다. reviewed target 분해 전까지 target coverage는 산정하지 않습니다.",
    "",
    "| FamilyId | 영역 | 성취기준 | runtime | 상태 | 파라미터 |",
    "|---|---|---|---|---|---|",
    ...report.families.map(
      (family) =>
        `| ${family.familyId} | ${family.domain} | ${family.standardCodes.join(", ")} | ${family.renderRecipeKind} | ${family.lifecycleStage} | ${family.parameterKeys.join(", ") || "-"} |`
    ),
    ""
  ].join("\n");
}

const report = buildReport();
const json = `${JSON.stringify(report, null, 2)}\n`;
const md = markdown(report);

if (shouldWrite) {
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, json);
  writeFileSync(markdownPath, md);
  console.log(
    `problem-family registry updated: ${report.registeredFamilyCount} registered / ${report.releasedFamilyCount} released`
  );
} else {
  let existingJson;
  let existingMarkdown;
  try {
    existingJson = readFileSync(jsonPath, "utf8");
    existingMarkdown = readFileSync(markdownPath, "utf8");
  } catch {
    throw new Error(
      "problem-family registry report is missing; run pnpm problem-family:update"
    );
  }
  if (existingJson !== json || existingMarkdown !== md) {
    throw new Error(
      "problem-family registry report is stale; run pnpm problem-family:update"
    );
  }
  console.log(
    `problem-family registry PASS: ${report.registeredFamilyCount} registered / ${report.releasedFamilyCount} released`
  );
}
