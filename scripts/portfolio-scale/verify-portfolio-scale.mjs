#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import {
  compileActivity,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import { recommendActivity } from "../../packages/planner/dist/index.js";
import {
  listProblemFamilyManifests,
  prepareRegisteredActivity,
  projectRegisteredApprovalView
} from "../../packages/templates/dist/index.js";
import { validateForCreation } from "../../packages/validator/dist/index.js";

const root = resolve(import.meta.dirname, "../..");
const write = process.argv.includes("--write");
const generatedAt = "2026-08-13T12:00:00.000Z";
const raw = JSON.parse(
  await readFile(
    resolve(
      root,
      "packages/templates/src/problem-families/portfolio-scale.generated.json"
    ),
    "utf8"
  )
);
const recordByFamilyId = new Map(
  raw.records.map((record) => [record.familyId, record])
);
const manifests = listProblemFamilyManifests()
  .filter((manifest) => manifest.renderRecipe.kind === "portfolio-scale-adapter")
  .sort((left, right) => left.familyId.localeCompare(right.familyId));

const rows = [];
for (const manifest of manifests) {
  const record = recordByFamilyId.get(manifest.familyId);
  if (!record) {
    throw new Error(`portfolio-record-missing:${manifest.familyId}`);
  }
  const seed = `portfolio-scale-${record.workItemId.toLowerCase()}`;
  try {
    const recommendation = recommendActivity({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: `portfolio-verify-${record.workItemId.toLowerCase()}`,
      prompt: `${record.standardCode} 핵심 판단과 자료 확인 활동을 만들어 주세요.`,
      requestedStandardCode: record.standardCode,
      requestedFamilyId: manifest.familyId,
      requestedGrade: manifest.capability.recommendedGrade,
      problemCount: record.targetOutlines.length,
      difficulty: "normal",
      manipulation: manifest.manipulation,
      createdAt: generatedAt
    });
    const plan = prepareRegisteredActivity(recommendation, {
      seed,
      generatedAt,
      activityId: `portfolio-verify-${record.workItemId.toLowerCase()}`
    });
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    const validation = validateForCreation(
      resolved,
      compiled,
      new Date(generatedAt)
    );
    const serverTagContractExact =
      compiled.payload.tags.length <= 20 &&
      compiled.payload.tags.every(
        (tag) => typeof tag === "string" && tag.length >= 1 && tag.length <= 12
      );
    const outlineKeys = resolved.items.map((item) => item.values.targetOutlineKey);
    const expectedKeys = record.targetOutlines.map((target) => target.key);
    const itemCoverageExact =
      JSON.stringify(outlineKeys) === JSON.stringify(expectedKeys);
    rows.push({
      workItemId: record.workItemId,
      standardCode: record.standardCode,
      familyId: manifest.familyId,
      archetypeId: record.archetypeId,
      engineClassIds: record.engineClassIds,
      rendererKind: record.rendererKind,
      targetOutlineCount: record.targetOutlines.length,
      recommendationSupported: recommendation.supported,
      resolvedItemCount: resolved.items.length,
      emissionCount: resolved.emissions.length,
      compiledPayloadHash: compiled.payloadHash,
      approvalViewSha256: sha256Hex(projectRegisteredApprovalView(resolved)),
      itemCoverageExact,
      serverTagContractExact,
      canCreate: validation.canCreate,
      issues: validation.issues
    });
  } catch (error) {
    rows.push({
      workItemId: record.workItemId,
      standardCode: record.standardCode,
      familyId: manifest.familyId,
      archetypeId: record.archetypeId,
      engineClassIds: record.engineClassIds,
      rendererKind: record.rendererKind,
      targetOutlineCount: record.targetOutlines.length,
      recommendationSupported: false,
      resolvedItemCount: 0,
      emissionCount: 0,
      compiledPayloadHash: null,
      approvalViewSha256: null,
      itemCoverageExact: false,
      serverTagContractExact: false,
      canCreate: false,
      issues: [
        {
          severity: "error",
          code: "portfolio-exception",
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    });
  }
}

const passedRows = rows.filter(
  (row) =>
    row.recommendationSupported &&
    row.itemCoverageExact &&
    row.serverTagContractExact &&
    row.canCreate &&
    row.resolvedItemCount === row.targetOutlineCount
);
const failedRows = rows.filter((row) => !passedRows.includes(row));
const report = {
  schemaVersion: "1.0.0",
  reportId: "portfolio-scale-97-runtime-verification-v1",
  generatedAt,
  source: raw.source,
  scope: {
    statement:
      "97개 확장 성취기준의 target-outline 진단형 활동을 planner→ActivitySpec→native compile→creation validator로 전수 실행한다.",
    doesNotClaim: [
      "정식 AssessmentTarget 숙달 판정",
      "자동 채점",
      "97개 모두의 live 저장·재열기",
      "학생 응답 영속성"
    ]
  },
  summary: {
    expectedStandardCount: 97,
    actualStandardCount: rows.length,
    passedStandardCount: passedRows.length,
    failedStandardCount: failedRows.length,
    expectedTargetOutlineCount: 237,
    passedTargetOutlineCount: passedRows.reduce(
      (sum, row) => sum + row.targetOutlineCount,
      0
    ),
    rendererCount: new Set(rows.map((row) => row.rendererKind)).size,
    engineClassCount: new Set(rows.flatMap((row) => row.engineClassIds)).size
  },
  failures: failedRows,
  rows
};

const jsonPath = resolve(root, "reports/portfolio-scale/latest.json");
const mdPath = resolve(root, "reports/portfolio-scale/latest.md");
const markdown = [
  "# MathCanvas 97개 확장 실행 검증",
  "",
  `- 표준: ${report.summary.passedStandardCount}/${report.summary.expectedStandardCount}`,
  `- 목표 윤곽 문항: ${report.summary.passedTargetOutlineCount}/${report.summary.expectedTargetOutlineCount}`,
  `- 실제 화면 유형: ${report.summary.rendererCount}`,
  `- 엔진 계열: ${report.summary.engineClassCount}`,
  `- 실패: ${report.summary.failedStandardCount}`,
  "",
  "| 작업 | 성취기준 | 화면 | 엔진 | 문항 | 생성 |",
  "|---|---|---|---|---:|---|",
  ...rows.map(
    (row) =>
      `| ${row.workItemId} | ${row.standardCode} | ${row.rendererKind} | ${row.engineClassIds.join(", ")} | ${row.resolvedItemCount}/${row.targetOutlineCount} | ${row.canCreate ? "PASS" : "FAIL"} |`
  ),
  "",
  "이 보고서는 현장 시연용 실행 검증판의 실제 생성 가능성을 증명하며, 정식 숙달 판정이나 자동 채점을 주장하지 않습니다.",
  ""
].join("\n");

if (write) {
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(mdPath, markdown);
}

console.log(
  `portfolio-scale: ${passedRows.length}/${rows.length} standards, ` +
    `${report.summary.passedTargetOutlineCount}/${report.summary.expectedTargetOutlineCount} target outlines, ` +
    `${report.summary.rendererCount} renderers, ${report.summary.engineClassCount} engine classes`
);
for (const failure of failedRows.slice(0, 20)) {
  console.error(
    `${failure.workItemId} ${failure.standardCode}: ${failure.issues
      .map((issue) => issue.code + ":" + issue.message)
      .join(" | ")}`
  );
}
if (
  rows.length !== 97 ||
  report.summary.passedTargetOutlineCount !== 237 ||
  report.summary.rendererCount < 6 ||
  report.summary.engineClassCount !== 23 ||
  failedRows.length > 0
) {
  process.exitCode = 1;
}
