import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  elementaryCurriculumCoverageReportSchema
} from "../../packages/contracts/dist/index.js";
import {
  officialElementaryStandardsFixture,
  teacherCurriculumCatalog,
  teacherTextbookUnits
} from "../../packages/curriculum/dist/index.js";
import {
  listProblemFamilyManifests,
  listRegisteredBlueprints
} from "../../packages/templates/dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const jsonPath = resolve(root, "reports/curriculum-coverage/latest.json");
const markdownPath = resolve(root, "reports/curriculum-coverage/latest.md");
const shouldWrite = process.argv.includes("--write");

function unavailable(note) {
  return { status: "unavailable", numerator: null, denominator: null, note };
}

function available(numerator, denominator, note) {
  return { status: "available", numerator, denominator, note };
}

function stageFor(standard, families) {
  if (!standard) return "unmapped";
  if (families.length === 0) return "mapped";
  const order = ["mapped", "generatable", "offline-validated", "live-released"];
  return families
    .map((family) => family.releaseEvidence.lifecycleStage)
    .sort((left, right) => order.indexOf(right) - order.indexOf(left))[0];
}

function buildReport() {
  const { source, standards } = officialElementaryStandardsFixture;
  const families = listProblemFamilyManifests();
  const officialCodes = new Set(standards.map((standard) => standard.code));
  const manifestIds = new Set(families.map((family) => family.familyId));
  const runtimeBlueprints = listRegisteredBlueprints();
  const runtimeIds = new Set(runtimeBlueprints.map((blueprint) => blueprint.id));
  const missingRuntime = [...manifestIds].filter(
    (familyId) => !runtimeIds.has(familyId)
  );
  const missingManifest = [...runtimeIds].filter(
    (familyId) => !manifestIds.has(familyId)
  );
  const unknownFamilyStandardCodes = [
    ...new Set(
      families.flatMap((family) =>
        family.capability.supportedStandardCodes.filter(
          (standardCode) => !officialCodes.has(standardCode)
        )
      )
    )
  ];
  const blueprintHashMismatches = runtimeBlueprints
    .filter(
      (blueprint) =>
        families.find((family) => family.familyId === blueprint.id)
          ?.releaseEvidence.blueprintContentHash !== blueprint.contentHash
    )
    .map((blueprint) => blueprint.id);
  if (
    missingRuntime.length > 0 ||
    missingManifest.length > 0 ||
    unknownFamilyStandardCodes.length > 0 ||
    blueprintHashMismatches.length > 0
  ) {
    throw new Error(
      [
        `problem-family-coverage-join-failed`,
        `missing-runtime=${missingRuntime.join(",")}`,
        `missing-manifest=${missingManifest.join(",")}`,
        `unknown-standard=${unknownFamilyStandardCodes.join(",")}`,
        `hash-mismatch=${blueprintHashMismatches.join(",")}`
      ].join(":")
    );
  }
  const familiesByStandard = new Map();
  for (const family of families) {
    for (const standardCode of family.capability.supportedStandardCodes) {
      const registered = familiesByStandard.get(standardCode) ?? [];
      registered.push(family);
      familiesByStandard.set(standardCode, registered);
    }
  }
  const catalogByCode = new Map(
    teacherCurriculumCatalog.map((standard) => [standard.standardCode, standard])
  );
  const unitsByStandard = new Map();
  for (const unit of teacherTextbookUnits) {
    for (const code of unit.standardCodes) {
      const unitIds = unitsByStandard.get(code) ?? [];
      unitIds.push(unit.id);
      unitsByStandard.set(code, unitIds);
    }
  }

  const rows = standards.map((official) => {
    const catalog = catalogByCode.get(official.code);
    const registeredFamilies = familiesByStandard.get(official.code) ?? [];
    const activityIds = registeredFamilies.map((family) => family.familyId);
    const releasedActivityIds = registeredFamilies
      .filter((family) => family.releaseEvidence.supportState === "released")
      .map((family) => family.familyId);
    return {
      code: official.code,
      gradeBand: official.gradeBand,
      domain: official.domain,
      officialGoal: official.officialGoal,
      catalogMapped: catalog !== undefined,
      catalogSummaryKind: catalog?.summaryKind ?? null,
      catalogGoalMatchesOfficial:
        catalog === undefined ? null : catalog.standardSummary === official.officialGoal,
      activityStage: stageFor(catalog, registeredFamilies),
      activityIds,
      releasedActivityIds,
      unitIds: unitsByStandard.get(official.code) ?? [],
      targetCoverage: unavailable(
        "AssessmentTarget 스키마는 도입했지만 공식 성취기준별 reviewed target 분해는 Phase 2부터 진행합니다. family 수를 target coverage로 대체하지 않습니다."
      ),
      familyVariety: {
        basis: "canonical-problem-family-registry",
        familyCount: activityIds.length,
        releasedFamilyCount: releasedActivityIds.length
      }
    };
  });

  const missingOfficialCodes = standards
    .filter((standard) => !catalogByCode.has(standard.code))
    .map((standard) => standard.code);
  const codesOutsideOfficialFixture = teacherCurriculumCatalog
    .filter((standard) => !officialCodes.has(standard.standardCode))
    .map((standard) => standard.standardCode);
  const officialGoalMismatches = rows
    .filter((row) => row.catalogGoalMatchesOfficial === false)
    .map((row) => row.code);
  const gradeBandMismatches = standards
    .filter(
      (official) =>
        catalogByCode.get(official.code)?.gradeBand !== official.gradeBand
    )
    .map((standard) => standard.code);
  const domainMismatches = standards
    .filter(
      (official) => catalogByCode.get(official.code)?.domain !== official.domain
    )
    .map((standard) => standard.code);
  const unknownStandardCodes = [
    ...new Set(teacherTextbookUnits.flatMap((unit) => unit.standardCodes))
  ].filter((code) => !officialCodes.has(code));
  const orphanOfficialStandardCodes = standards
    .filter((standard) => (unitsByStandard.get(standard.code)?.length ?? 0) === 0)
    .map((standard) => standard.code);
  const activityById = new Map(
    teacherCurriculumCatalog.flatMap((standard) =>
      standard.activities.map((activity) => [activity.id, activity])
    )
  );
  const unitsWithAnyActivity = teacherTextbookUnits.filter(
    (unit) => unit.activityIds.length > 0
  ).length;
  const unitsWithReleasedActivity = teacherTextbookUnits.filter((unit) =>
    unit.activityIds.some(
      (activityId) => activityById.get(activityId)?.availability === "released"
    )
  ).length;

  const mapped = rows.filter((row) => row.catalogMapped).length;
  const withActivity = rows.filter((row) => row.activityIds.length > 0).length;
  const withReleasedActivity = rows.filter(
    (row) => row.releasedActivityIds.length > 0
  ).length;
  const gradeBands = ["1-2", "3-4", "5-6"];
  const domains = ["수와 연산", "변화와 관계", "도형과 측정", "자료와 가능성"];
  const summarize = (key, value) => {
    const selected = rows.filter((row) => row[key] === value);
    return {
      [key]: value,
      official: selected.length,
      mapped: selected.filter((row) => row.catalogMapped).length,
      withActivity: selected.filter((row) => row.activityIds.length > 0).length,
      withReleasedActivity: selected.filter(
        (row) => row.releasedActivityIds.length > 0
      ).length
    };
  };

  return elementaryCurriculumCoverageReportSchema.parse({
    schemaVersion: officialElementaryStandardsFixture.schemaVersion,
    authorityReviewedAt: source.reviewedAt,
    source,
    officialStandardCount: standards.length,
    catalogStandardCount: teacherCurriculumCatalog.length,
    mappedStandardCount: mapped,
    standardsWithAnyActivity: withActivity,
    standardsWithReleasedActivity: withReleasedActivity,
    catalogDiff: {
      missingOfficialCodes,
      codesOutsideOfficialFixture,
      officialGoalMismatches,
      gradeBandMismatches,
      domainMismatches
    },
    officialStandardMappingCoverage: available(
      mapped,
      standards.length,
      "공식 fixture의 성취기준이 교사용 카탈로그에 정확한 원문 목표와 함께 연결된 비율입니다."
    ),
    releasedActivityReach: available(
      withReleasedActivity,
      standards.length,
      "released 활동이 하나 이상 연결된 성취기준 비율입니다. target coverage가 아닙니다."
    ),
    targetCoverage: unavailable(
      "성취기준별 필수 AssessmentTarget을 정의하기 전에는 목표 충족률을 계산하지 않습니다."
    ),
    textbookUnitReach: {
      totalUnits: teacherTextbookUnits.length,
      unitsWithAnyActivity,
      unitsWithReleasedActivity,
      unknownStandardCodes,
      orphanOfficialStandardCodes
    },
    byGradeBand: gradeBands.map((gradeBand) => summarize("gradeBand", gradeBand)),
    byDomain: domains.map((domain) => summarize("domain", domain)),
    rows
  });
}

function percent(numerator, denominator) {
  return denominator === 0 ? "0.0%" : `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function markdown(report) {
  const stageCounts = Object.fromEntries(
    ["unmapped", "mapped", "generatable", "offline-validated", "live-released"].map(
      (stage) => [stage, report.rows.filter((row) => row.activityStage === stage).length]
    )
  );
  const lines = [
    "# 2022 개정 초등 수학 커버리지",
    "",
    `- 공식 fixture 검토 시각: ${report.authorityReviewedAt}`,
    `- 공식 분모: **${report.officialStandardCount}개 성취기준** (교육부 HWP와 NCIC PDF 교차 확인)`,
    `- 카탈로그 매핑: **${report.mappedStandardCount}/${report.officialStandardCount}**`,
    `- released 활동 reach: **${report.standardsWithReleasedActivity}/${report.officialStandardCount} (${percent(report.standardsWithReleasedActivity, report.officialStandardCount)})**`,
    "- target coverage: **산정하지 않음** — AssessmentTarget registry가 생기기 전에는 활동 수로 대신하지 않습니다.",
    "- family variety: canonical ProblemFamily registry의 FamilyId를 사용하며 target coverage와 합치지 않습니다.",
    `- catalog diff: 누락 ${report.catalogDiff.missingOfficialCodes.length}, fixture 밖 ${report.catalogDiff.codesOutsideOfficialFixture.length}, 문구 ${report.catalogDiff.officialGoalMismatches.length}, 학년군 ${report.catalogDiff.gradeBandMismatches.length}, 영역 ${report.catalogDiff.domainMismatches.length}`,
    "",
    "> released 활동 reach는 ‘이 성취기준에 출시 활동이 하나라도 연결됨’을 뜻합니다. 성취기준의 모든 평가 목표를 다룬다는 뜻이 아닙니다.",
    "",
    "## 파이프라인 상태",
    "",
    "| 상태 | 성취기준 수 |",
    "|---|---:|",
    `| unmapped | ${stageCounts.unmapped} |`,
    `| mapped | ${stageCounts.mapped} |`,
    `| generatable | ${stageCounts.generatable} |`,
    `| offline-validated | ${stageCounts["offline-validated"]} |`,
    `| live-released | ${stageCounts["live-released"]} |`,
    "",
    "## 학년군별",
    "",
    "| 학년군 | 공식 | mapped | 활동 있음 | released reach |",
    "|---|---:|---:|---:|---:|",
    ...report.byGradeBand.map(
      (row) =>
        `| ${row.gradeBand} | ${row.official} | ${row.mapped} | ${row.withActivity} | ${row.withReleasedActivity} |`
    ),
    "",
    "## 영역별",
    "",
    "| 영역 | 공식 | mapped | 활동 있음 | released reach |",
    "|---|---:|---:|---:|---:|",
    ...report.byDomain.map(
      (row) =>
        `| ${row.domain} | ${row.official} | ${row.mapped} | ${row.withActivity} | ${row.withReleasedActivity} |`
    ),
    "",
    "## 교과서 단원 연결",
    "",
    `- 비상교육 1–6학년 단원: ${report.textbookUnitReach.totalUnits}개`,
    `- 활동 연결 단원: ${report.textbookUnitReach.unitsWithAnyActivity}개`,
    `- released 활동 연결 단원: ${report.textbookUnitReach.unitsWithReleasedActivity}개`,
    `- 공식 fixture 밖 코드: ${report.textbookUnitReach.unknownStandardCodes.length}개`,
    `- 어느 단원에도 연결되지 않은 공식 성취기준: ${report.textbookUnitReach.orphanOfficialStandardCodes.length}개`,
    "",
    "## 성취기준별 상태",
    "",
    "| 코드 | 학년군 | 영역 | 상태 | 활동 | released | 단원 |",
    "|---|---|---|---|---|---|---|",
    ...report.rows.map(
      (row) =>
        `| ${row.code} | ${row.gradeBand} | ${row.domain} | ${row.activityStage} | ${row.activityIds.join(", ") || "-"} | ${row.releasedActivityIds.join(", ") || "-"} | ${row.unitIds.join(", ") || "-"} |`
    ),
    ""
  ];
  return lines.join("\n");
}

const report = buildReport();
const json = `${JSON.stringify(report, null, 2)}\n`;
const md = markdown(report);

if (shouldWrite) {
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, json);
  writeFileSync(markdownPath, md);
  console.log(`curriculum coverage updated: ${report.standardsWithReleasedActivity}/${report.officialStandardCount} released activity reach`);
} else {
  let existingJson;
  let existingMarkdown;
  try {
    existingJson = readFileSync(jsonPath, "utf8");
    existingMarkdown = readFileSync(markdownPath, "utf8");
  } catch {
    throw new Error("curriculum coverage report is missing; run pnpm curriculum:coverage:update");
  }
  if (existingJson !== json || existingMarkdown !== md) {
    throw new Error("curriculum coverage report is stale; run pnpm curriculum:coverage:update");
  }
  console.log(`curriculum coverage PASS: ${report.standardsWithReleasedActivity}/${report.officialStandardCount} released activity reach; target coverage unavailable`);
}
