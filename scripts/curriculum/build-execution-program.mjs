import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = resolve(
  root,
  "scripts/curriculum/elementary-execution-program.json"
);
const coveragePath = resolve(
  root,
  "reports/curriculum-coverage/latest.json"
);
const registryPath = resolve(
  root,
  "reports/problem-family-registry/latest.json"
);
const jsonPath = resolve(
  root,
  "reports/curriculum-execution/latest.json"
);
const markdownPath = resolve(
  root,
  "reports/curriculum-execution/latest.md"
);
const shouldWrite = process.argv.includes("--write");

const gradeBands = ["1-2", "3-4", "5-6"];
const domains = ["수와 연산", "변화와 관계", "도형과 측정", "자료와 가능성"];
const cellStatuses = [
  "pipeline-proven",
  "target-bound-offline",
  "released-candidate-needs-target-review",
  "offline-candidate-needs-target-review",
  "candidate-needs-implementation"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function cellKey(gradeBand, domain) {
  return `${gradeBand}|${domain}`;
}

function unique(values) {
  return [...new Set(values)];
}

function familiesForStandard(registry, standardCode) {
  return registry.families.filter((family) =>
    family.standardCodes.includes(standardCode)
  );
}

function targetIdsAtOrAbove(families, stages) {
  return unique(
    families
      .filter((family) => stages.includes(family.lifecycleStage))
      .flatMap((family) => family.assessmentTargetIds)
  );
}

function representativeStatus(row, family) {
  const reviewed = row.targetCoverage.status === "available";
  const bound = family.assessmentTargetIds.length > 0;
  if (reviewed && bound && family.lifecycleStage === "live-released") {
    return "pipeline-proven";
  }
  if (reviewed && bound && family.lifecycleStage === "offline-validated") {
    return "target-bound-offline";
  }
  if (family.lifecycleStage === "live-released") {
    return "released-candidate-needs-target-review";
  }
  if (family.lifecycleStage === "offline-validated") {
    return "offline-candidate-needs-target-review";
  }
  return "candidate-needs-implementation";
}

function representativeNextAction(status) {
  return {
    "pipeline-proven": "maintain-current-hash-evidence",
    "target-bound-offline": "capture-current-hash-live-evidence",
    "released-candidate-needs-target-review":
      "review-target-set-bind-released-family",
    "offline-candidate-needs-target-review":
      "review-target-set-validate-offline-family",
    "candidate-needs-implementation": "design-and-validate-family"
  }[status];
}

function standardNextAction(row, relatedFamilies) {
  const releasedFamilies = relatedFamilies.filter(
    (family) => family.lifecycleStage === "live-released"
  );
  const offlineFamilies = relatedFamilies.filter(
    (family) => family.lifecycleStage === "offline-validated"
  );
  if (row.targetCoverage.status !== "available") {
    if (releasedFamilies.length > 0) {
      return "review-target-set-and-bind-released-family";
    }
    if (offlineFamilies.length > 0) {
      return "review-target-set-and-close-offline-family";
    }
    if (relatedFamilies.length > 0) {
      return "review-target-set-and-complete-existing-family";
    }
    return "review-target-set-and-design-family";
  }
  const required = row.targetCoverage.denominator;
  const live = row.targetCoverage.numerator;
  const linked = unique(
    relatedFamilies.flatMap((family) => family.assessmentTargetIds)
  ).length;
  const offline = targetIdsAtOrAbove(relatedFamilies, [
    "offline-validated",
    "live-released"
  ]).length;
  if (live === required) return "complete";
  if (linked < required) return "cover-unbound-reviewed-targets";
  if (offline < required) return "finish-offline-validation";
  return "capture-current-hash-live-evidence";
}

function actionLabel(action) {
  return {
    complete: "완료",
    "review-target-set-and-bind-released-family":
      "target 완전 분해 → released family 결속",
    "review-target-set-and-close-offline-family":
      "target 완전 분해 → offline family 검증·출시",
    "review-target-set-and-complete-existing-family":
      "target 완전 분해 → 기존 family 완성",
    "review-target-set-and-design-family":
      "target 완전 분해 → 새 family 설계",
    "cover-unbound-reviewed-targets": "미지원 reviewed target family 추가",
    "finish-offline-validation": "연결 target의 offline 검증 완료",
    "capture-current-hash-live-evidence": "현재 해시 canary·저장·재열기",
    "maintain-current-hash-evidence": "현재 해시 증거 유지",
    "review-target-set-bind-released-family":
      "target 완전 분해·released family 이관",
    "review-target-set-validate-offline-family":
      "target 완전 분해·offline family 검증",
    "design-and-validate-family": "family 설계·offline 검증"
  }[action] ?? action;
}

function buildReport() {
  const program = readJson(sourcePath);
  const coverage = readJson(coveragePath);
  const registry = readJson(registryPath);
  assert(program.schemaVersion === "1.0.0", "execution-program-schema");
  assert(program.executionMode === "continuous-autonomous", "execution-mode");
  assert(program.reviewPolicy === "repository-qa-only-no-fable", "review-policy");
  assert(program.representativeCells.length === 12, "representative-cell-count");
  const expectedCells = new Set(
    gradeBands.flatMap((gradeBand) =>
      domains.map((domain) => cellKey(gradeBand, domain))
    )
  );
  const declaredCells = new Set(
    program.representativeCells.map((cell) =>
      cellKey(cell.gradeBand, cell.domain)
    )
  );
  assert(declaredCells.size === 12, "representative-cell-duplicate");
  assert(
    [...expectedCells].every((key) => declaredCells.has(key)),
    "representative-cell-missing"
  );
  assert(
    program.representativeCells.every(
      (cell, index) => cell.sequence === index + 1
    ),
    "representative-sequence"
  );

  const rowByCode = new Map(coverage.rows.map((row) => [row.code, row]));
  const familyById = new Map(
    registry.families.map((family) => [family.familyId, family])
  );
  const representatives = program.representativeCells.map((selected) => {
    const row = rowByCode.get(selected.standardCode);
    const family = familyById.get(selected.familyId);
    assert(row, `representative-standard-missing:${selected.standardCode}`);
    assert(family, `representative-family-missing:${selected.familyId}`);
    assert(
      row.gradeBand === selected.gradeBand && row.domain === selected.domain,
      `representative-cell-mismatch:${selected.standardCode}`
    );
    assert(
      family.standardCodes.includes(selected.standardCode),
      `representative-family-standard-mismatch:${selected.familyId}`
    );
    assert(
      family.domain === selected.domain,
      `representative-family-domain-mismatch:${selected.familyId}`
    );
    const status = representativeStatus(row, family);
    assert(cellStatuses.includes(status), `representative-status:${status}`);
    return {
      ...selected,
      officialGoal: row.officialGoal,
      familyLifecycleStage: family.lifecycleStage,
      familySupportState: family.supportState,
      assessmentTargetBindingCount: family.assessmentTargetIds.length,
      evidencePaths: family.evidencePaths,
      standardTargetCoverage: row.targetCoverage,
      status,
      nextAction: representativeNextAction(status)
    };
  });

  const standardRows = coverage.rows.map((row) => {
    const relatedFamilies = familiesForStandard(registry, row.code);
    const liveTargetIds = targetIdsAtOrAbove(relatedFamilies, [
      "live-released"
    ]);
    const offlineTargetIds = targetIdsAtOrAbove(relatedFamilies, [
      "offline-validated",
      "live-released"
    ]);
    return {
      code: row.code,
      gradeBand: row.gradeBand,
      domain: row.domain,
      officialGoal: row.officialGoal,
      targetSetReviewed: row.targetCoverage.status === "available",
      targetCoverage: row.targetCoverage,
      linkedFamilyIds: relatedFamilies.map((family) => family.familyId),
      releasedFamilyIds: relatedFamilies
        .filter((family) => family.lifecycleStage === "live-released")
        .map((family) => family.familyId),
      offlineFamilyIds: relatedFamilies
        .filter((family) => family.lifecycleStage === "offline-validated")
        .map((family) => family.familyId),
      offlineCoveredTargetCount: offlineTargetIds.length,
      liveCoveredTargetCount: liveTargetIds.length,
      nextAction: standardNextAction(row, relatedFamilies)
    };
  });

  const standardByCode = new Map(
    standardRows.map((row) => [row.code, row])
  );
  const representativeByCell = new Map(
    representatives.map((cell) => [cellKey(cell.gradeBand, cell.domain), cell])
  );
  const queuesByCell = new Map();
  for (const key of expectedCells) {
    const representative = representativeByCell.get(key);
    const [gradeBand, domain] = key.split("|");
    const rows = standardRows
      .filter(
        (row) => row.gradeBand === gradeBand && row.domain === domain
      )
      .sort((left, right) => left.code.localeCompare(right.code, "ko"));
    const representativeRow = standardByCode.get(
      representative.standardCode
    );
    queuesByCell.set(key, [
      representativeRow,
      ...rows.filter((row) => row.code !== representative.standardCode)
    ]);
  }
  const breadthQueue = [];
  const maximumCellSize = Math.max(
    ...[...queuesByCell.values()].map((rows) => rows.length)
  );
  for (let round = 0; round < maximumCellSize; round += 1) {
    for (const representative of representatives) {
      const row = queuesByCell.get(
        cellKey(representative.gradeBand, representative.domain)
      )[round];
      if (row && row.nextAction !== "complete") {
        breadthQueue.push({
          queueIndex: breadthQueue.length + 1,
          rotation: round + 1,
          ...row
        });
      }
    }
  }
  const incompleteStandardCount = standardRows.filter(
    (row) => row.nextAction !== "complete"
  ).length;
  assert(
    breadthQueue.length === incompleteStandardCount,
    "breadth-queue-count-mismatch"
  );
  assert(
    new Set(breadthQueue.map((row) => row.code)).size ===
      breadthQueue.length,
    "breadth-queue-duplicate"
  );

  const representativeStatusCounts = Object.fromEntries(
    cellStatuses.map((status) => [
      status,
      representatives.filter((cell) => cell.status === status).length
    ])
  );
  const actionSummary = Object.fromEntries(
    unique(standardRows.map((row) => row.nextAction))
      .sort()
      .map((action) => [
        action,
        standardRows.filter((row) => row.nextAction === action).length
      ])
  );
  const reviewedRows = standardRows.filter((row) => row.targetSetReviewed);
  const reviewedTargetCount = reviewedRows.reduce(
    (sum, row) => sum + row.targetCoverage.denominator,
    0
  );
  assert(
    reviewedTargetCount === coverage.reviewedRequiredAssessmentTargetCount,
    "reviewed-target-count-mismatch"
  );
  const liveReviewedTargetCount = reviewedRows.reduce(
    (sum, row) => sum + row.targetCoverage.numerator,
    0
  );
  const offlineReviewedTargetCount = reviewedRows.reduce(
    (sum, row) => sum + row.offlineCoveredTargetCount,
    0
  );
  const provenCount = representativeStatusCounts["pipeline-proven"];
  const fullyLiveStandardCount = standardRows.filter(
    (row) => row.nextAction === "complete"
  ).length;
  const offlineLane = representatives.find((cell) =>
    [
      "released-candidate-needs-target-review",
      "offline-candidate-needs-target-review",
      "candidate-needs-implementation"
    ].includes(cell.status)
  );
  const liveEvidenceLane = representatives.find(
    (cell) => cell.status === "target-bound-offline"
  );

  return {
    schemaVersion: program.schemaVersion,
    programId: program.programId,
    executionMode: program.executionMode,
    batchSize: program.batchSize,
    reviewPolicy: program.reviewPolicy,
    rules: program.rules,
    source: {
      authorityReviewedAt: coverage.authorityReviewedAt,
      officialStandardCount: coverage.officialStandardCount,
      problemFamilyRegistrySchemaVersion: registry.schemaVersion
    },
    current: {
      officialStandards: coverage.officialStandardCount,
      reviewedTargetSets: coverage.reviewedAssessmentTargetStandardCount,
      reviewedTargets: reviewedTargetCount,
      offlineReviewedTargets: offlineReviewedTargetCount,
      liveReviewedTargets: liveReviewedTargetCount,
      fullyLiveStandards: fullyLiveStandardCount,
      representativeCellsProven: provenCount,
      representativeCellTotal: representatives.length,
      canonicalFamilies: registry.registeredFamilyCount,
      releasedFamilies: registry.releasedFamilyCount,
      commonParameterFamilies: registry.parameterizedFamilyCount,
      globalTargetCoverageStatus: coverage.targetCoverage.status
    },
    phases: [
      {
        phase: "0",
        name: "공식 분모와 카탈로그 권위",
        status: "complete",
        progress: `${coverage.mappedStandardCount}/${coverage.officialStandardCount}`
      },
      {
        phase: "1",
        name: "공통 ProblemFamily 기반",
        status: "complete",
        progress: `${registry.registeredFamilyCount} canonical / ${registry.releasedFamilyCount} released`
      },
      {
        phase: "2",
        name: "학년군×영역 대표 격자",
        status: provenCount === representatives.length ? "complete" : "in-progress",
        progress: `${provenCount}/${representatives.length} pipeline-proven`
      },
      {
        phase: "3A",
        name: "121개 AssessmentTargetSet 완전 분해",
        status:
          coverage.reviewedAssessmentTargetStandardCount ===
          coverage.officialStandardCount
            ? "complete"
            : "in-progress",
        progress: `${coverage.reviewedAssessmentTargetStandardCount}/${coverage.officialStandardCount}`
      },
      {
        phase: "3B",
        name: "필수 target family·offline 검증",
        status: "in-progress",
        progress: `${offlineReviewedTargetCount}/${reviewedTargetCount} reviewed targets; global denominator incomplete`
      },
      {
        phase: "3C",
        name: "현재 해시 live create·저장·재열기",
        status: "in-progress",
        progress: `${liveReviewedTargetCount}/${reviewedTargetCount} reviewed targets; global denominator incomplete`
      },
      {
        phase: "4",
        name: "전 범위 TeacherRequest·반영 표·실제 미리보기",
        status: "queued-after-phase-2",
        progress: `${registry.parameterizedFamilyCount}/${registry.registeredFamilyCount} common-parameter families`
      },
      {
        phase: "5",
        name: "문항 단위 수정·최종 제품 릴리스",
        status: "queued",
        progress: "not globally measured"
      }
    ],
    currentWork: {
      offlineLane: offlineLane
        ? {
            sequence: offlineLane.sequence,
            standardCode: offlineLane.standardCode,
            familyId: offlineLane.familyId,
            nextAction: offlineLane.nextAction
          }
        : null,
      liveEvidenceLane: liveEvidenceLane
        ? {
            sequence: liveEvidenceLane.sequence,
            standardCode: liveEvidenceLane.standardCode,
            familyId: liveEvidenceLane.familyId,
            nextAction: liveEvidenceLane.nextAction
          }
        : null,
      breadthLaneAfterRepresentativeGrid: breadthQueue[0] ?? null
    },
    representativeStatusCounts,
    representativeCells: representatives,
    standardActionSummary: actionSummary,
    remainingStandardCount: breadthQueue.length,
    breadthQueue
  };
}

function markdown(report) {
  const lines = [
    "# 2022 개정 초등 수학 전체 실행 보드",
    "",
    `- 실행 모드: **${report.executionMode}**`,
    `- 공식 분모: **${report.current.officialStandards}개 성취기준**`,
    `- 대표 격자: **${report.current.representativeCellsProven}/${report.current.representativeCellTotal} pipeline-proven**`,
    `- reviewed target set: **${report.current.reviewedTargetSets}/${report.current.officialStandards}**`,
    `- 현재 검토된 target: **${report.current.reviewedTargets}개 · offline ${report.current.offlineReviewedTargets} · live ${report.current.liveReviewedTargets}**`,
    `- 전역 target coverage: **${report.current.globalTargetCoverageStatus}**`,
    `- 남은 성취기준 작업 queue: **${report.remainingStandardCount}개**`,
    "",
    "> 이 보드는 released 활동 reach와 성취기준 완전 커버리지를 합치지 않습니다. 전체 target 분모가 완성되기 전에는 전역 백분율을 제시하지 않습니다.",
    "",
    "## 연속 실행 계약",
    "",
    ...report.rules.map((rule) => `- ${rule}`),
    "",
    "## 전체 단계",
    "",
    "| 단계 | 목표 | 상태 | 현재 증거 |",
    "|---|---|---|---|",
    ...report.phases.map(
      (phase) =>
        `| ${phase.phase} | ${phase.name} | ${phase.status} | ${phase.progress} |`
    ),
    "",
    "## 지금 자동으로 선택된 작업",
    "",
    `- offline 레인: ${report.currentWork.offlineLane ? `${report.currentWork.offlineLane.standardCode} · ${report.currentWork.offlineLane.familyId} · ${actionLabel(report.currentWork.offlineLane.nextAction)}` : "없음"}`,
    `- live-evidence 레인: ${report.currentWork.liveEvidenceLane ? `${report.currentWork.liveEvidenceLane.standardCode} · ${report.currentWork.liveEvidenceLane.familyId} · ${actionLabel(report.currentWork.liveEvidenceLane.nextAction)}` : "없음"}`,
    `- 대표 격자 이후 breadth 레인: ${report.currentWork.breadthLaneAfterRepresentativeGrid ? `${report.currentWork.breadthLaneAfterRepresentativeGrid.code} · ${actionLabel(report.currentWork.breadthLaneAfterRepresentativeGrid.nextAction)}` : "없음"}`,
    "",
    "## 12개 대표 격자",
    "",
    "| 순서 | 학년군×영역 | 성취기준 | 대표 family | family 상태 | target | 셀 상태 | 다음 동작 |",
    "|---:|---|---|---|---|---|---|---|",
    ...report.representativeCells.map(
      (cell) =>
        `| R${String(cell.sequence).padStart(2, "0")} | ${cell.gradeBand} × ${cell.domain} | ${cell.standardCode} | ${cell.familyId} | ${cell.familyLifecycleStage} | ${cell.standardTargetCoverage.status === "available" ? `${cell.standardTargetCoverage.numerator}/${cell.standardTargetCoverage.denominator}` : "미분해"} | ${cell.status} | ${actionLabel(cell.nextAction)} |`
    ),
    "",
    "## 121개 성취기준 작업 유형",
    "",
    "| 작업 | 성취기준 수 |",
    "|---|---:|",
    ...Object.entries(report.standardActionSummary).map(
      ([action, count]) => `| ${actionLabel(action)} | ${count} |`
    ),
    "",
    "새 family 설계가 필요한 기준선은 `reports/curriculum-execution/no-family-plan.md`의 24 engine · 84 grade-band-safe track · W001~W097 계획을 사용한다.",
    "",
    "## 전체 breadth queue",
    "",
    "대표 격자 뒤에는 아래 순서를 다시 묻지 않고 진행한다. 같은 rotation 안에서 학년군과 영역을 바꾸며 한 셀에 몰리지 않게 한다.",
    "",
    "| queue | rotation | 코드 | 학년군 | 영역 | 다음 동작 | 기존 family |",
    "|---:|---:|---|---|---|---|---|",
    ...report.breadthQueue.map(
      (row) =>
        `| ${row.queueIndex} | ${row.rotation} | ${row.code} | ${row.gradeBand} | ${row.domain} | ${actionLabel(row.nextAction)} | ${row.linkedFamilyIds.join(", ") || "새 family 필요"} |`
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
  console.log(
    `curriculum execution program updated: ${report.current.representativeCellsProven}/${report.current.representativeCellTotal} representative cells; ${report.current.reviewedTargetSets}/${report.current.officialStandards} target sets`
  );
} else {
  let existingJson;
  let existingMarkdown;
  try {
    existingJson = readFileSync(jsonPath, "utf8");
    existingMarkdown = readFileSync(markdownPath, "utf8");
  } catch {
    throw new Error(
      "curriculum execution report is missing; run pnpm curriculum:program:update"
    );
  }
  if (existingJson !== json || existingMarkdown !== md) {
    throw new Error(
      "curriculum execution report is stale; run pnpm curriculum:program:update"
    );
  }
  console.log(
    `curriculum execution program PASS: ${report.current.representativeCellsProven}/${report.current.representativeCellTotal} representative cells; next offline ${report.currentWork.offlineLane?.standardCode ?? "none"}`
  );
}
