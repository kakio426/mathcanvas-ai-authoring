import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = resolve(root, "scripts/curriculum/no-family-plan.json");
const coveragePath = resolve(root, "reports/curriculum-coverage/latest.json");
const executionPath = resolve(root, "reports/curriculum-execution/latest.json");
const targetOutlinePath = resolve(
  root,
  "scripts/curriculum/no-family-target-outlines.sol-draft.json"
);
const jsonPath = resolve(
  root,
  "reports/curriculum-execution/no-family-plan.json"
);
const markdownPath = resolve(
  root,
  "reports/curriculum-execution/no-family-plan.md"
);
const shouldWrite = process.argv.includes("--write");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function unique(values) {
  return [...new Set(values)];
}

function stableCodeHash(codes) {
  return createHash("sha256")
    .update([...codes].sort().join("\n"))
    .digest("hex");
}

function codeOrderHash(codes) {
  return createHash("sha256").update(codes.join("\n")).digest("hex");
}

function actionClass(nextAction) {
  if (nextAction === "complete") return "complete";
  if (nextAction === "capture-current-hash-live-evidence") {
    return "live-evidence";
  }
  if (nextAction === "review-target-set-and-design-family") {
    return "planned-no-family";
  }
  return "offline-in-progress";
}

function buildReport() {
  const source = readJson(sourcePath);
  const coverage = readJson(coveragePath);
  const execution = readJson(executionPath);
  const targetOutlines = readJson(targetOutlinePath);

  assert(source.schemaVersion === "1.0.0", "no-family-plan-schema");
  assert(
    source.planId === "kr-2022-elementary-math-no-family-baseline",
    "no-family-plan-id"
  );
  assert(
    source.loopPolicy.workUnit === "one-standard-per-run",
    "no-family-plan-work-unit"
  );
  assert(
    source.loopPolicy.externalReview === "repository-qa-only-no-fable",
    "no-family-plan-review-policy"
  );
  assert(
    targetOutlines.schemaVersion === "1.0.0" &&
      targetOutlines.status === "sol-max-planning-draft",
    "no-family-plan-target-outline-schema"
  );

  const officialByCode = new Map(
    coverage.rows.map((row) => [row.code, row])
  );
  const engineIds = source.sharedEngineClasses.map(
    (engine) => engine.engineClassId
  );
  assert(
    engineIds.length === source.estimate.sharedRenderRecipeEngineClasses &&
      new Set(engineIds).size === engineIds.length,
    "no-family-plan-engine-count-or-duplicate"
  );
  const archetypeIds = source.archetypes.map(
    (archetype) => archetype.archetypeId
  );
  assert(
    archetypeIds.length === source.estimate.initialConcreteProblemFamilyTracks &&
      new Set(archetypeIds).size === archetypeIds.length,
    "no-family-plan-track-count-or-duplicate"
  );
  const trackContractIds = Object.keys(source.trackContracts);
  assert(
    trackContractIds.length === archetypeIds.length &&
      new Set(trackContractIds).size === trackContractIds.length &&
      archetypeIds.every((id) => trackContractIds.includes(id)),
    "no-family-plan-track-contract-coverage"
  );
  assert(
    Object.values(source.trackContracts).every(
      (contract) =>
        contract.familyId &&
        contract.engineClassIds.length > 0 &&
        contract.engineClassIds.every((id) => engineIds.includes(id))
    ),
    "no-family-plan-track-contract-engine"
  );
  assert(
    new Set(
      Object.values(source.trackContracts).map((contract) => contract.familyId)
    ).size === archetypeIds.length,
    "no-family-plan-family-id-duplicate"
  );

  const plannedCodes = source.archetypes.flatMap(
    (archetype) => archetype.standardCodes
  );
  assert(
    plannedCodes.length === source.baseline.expectedStandardCount,
    "no-family-plan-standard-count"
  );
  assert(
    new Set(plannedCodes).size === plannedCodes.length,
    "no-family-plan-standard-duplicate"
  );
  assert(
    plannedCodes.every((code) => officialByCode.has(code)),
    "no-family-plan-standard-unknown"
  );
  assert(
    stableCodeHash(plannedCodes) === source.baseline.standardCodeSha256,
    "no-family-plan-baseline-hash"
  );
  assert(
    source.standardWorkOrder.length === plannedCodes.length &&
      new Set(source.standardWorkOrder).size === plannedCodes.length &&
      source.standardWorkOrder.every((code) => plannedCodes.includes(code)) &&
      codeOrderHash(source.standardWorkOrder) ===
        source.baseline.standardWorkOrderSha256,
    "no-family-plan-work-order"
  );
  const targetOutlineCodes = targetOutlines.records.map(
    (record) => record.standardCode
  );
  assert(
    targetOutlines.source.expectedStandardCount === plannedCodes.length &&
      targetOutlines.source.standardCodeSha256 ===
        source.baseline.standardCodeSha256 &&
      targetOutlines.source.standardWorkOrderSha256 ===
        source.baseline.standardWorkOrderSha256 &&
    targetOutlineCodes.length === plannedCodes.length &&
      new Set(targetOutlineCodes).size === plannedCodes.length &&
      plannedCodes.every((code) => targetOutlineCodes.includes(code)) &&
      codeOrderHash(targetOutlineCodes) ===
        source.baseline.standardWorkOrderSha256,
    "no-family-plan-target-outline-coverage"
  );
  const targetOutlineByCode = new Map(
    targetOutlines.records.map((record) => [record.standardCode, record])
  );
  const targetKeys = [];
  for (const code of source.standardWorkOrder) {
    const record = targetOutlineByCode.get(code);
    const official = officialByCode.get(code);
    assert(
      record?.officialGoal === official?.officialGoal,
      `no-family-plan-target-outline-goal:${code}`
    );
    assert(
      Array.isArray(record.expectedTargetOutline) &&
        record.expectedTargetOutline.length > 0,
      `no-family-plan-target-outline-empty:${code}`
    );
    for (const target of record.expectedTargetOutline) {
      assert(
        target.key &&
          target.studentDecision &&
          target.invariant &&
          target.observableEvidence &&
          target.misconceptionClass,
        `no-family-plan-target-outline-field:${code}`
      );
      targetKeys.push(`${code}:${target.key}`);
    }
  }
  assert(
    new Set(targetKeys).size === targetKeys.length &&
      targetKeys.length === source.estimate.solDraftExpectedTargetCount,
    "no-family-plan-target-outline-count-or-key-duplicate"
  );

  const archetypeById = new Map(
    source.archetypes.map((archetype) => [archetype.archetypeId, archetype])
  );
  const archetypeByCode = new Map();
  for (const archetype of source.archetypes) {
    assert(
      archetype.standardCodes.includes(archetype.anchorStandardCode),
      `no-family-plan-anchor-mismatch:${archetype.archetypeId}`
    );
    const rows = archetype.standardCodes.map((code) => officialByCode.get(code));
    assert(
      rows.every(Boolean),
      `no-family-plan-track-standard-unknown:${archetype.archetypeId}`
    );
    assert(
      new Set(rows.map((row) => row.gradeBand)).size === 1,
      `no-family-plan-track-grade-band-mixed:${archetype.archetypeId}`
    );
    assert(
      new Set(rows.map((row) => row.domain)).size === 1 &&
        rows[0].domain === archetype.domain,
      `no-family-plan-track-domain-mixed:${archetype.archetypeId}`
    );
    for (const code of archetype.standardCodes) {
      archetypeByCode.set(code, archetype);
    }
  }
  const batchedArchetypeIds = source.batches.flatMap(
    (batch) => batch.archetypeIds
  );
  assert(
    new Set(source.batches.map((batch) => batch.batchId)).size ===
      source.batches.length,
    "no-family-plan-batch-duplicate"
  );
  assert(
    batchedArchetypeIds.length === archetypeIds.length &&
      new Set(batchedArchetypeIds).size === batchedArchetypeIds.length &&
      archetypeIds.every((id) => batchedArchetypeIds.includes(id)),
    "no-family-plan-batch-coverage"
  );
  assert(
    batchedArchetypeIds.every((id) => archetypeById.has(id)),
    "no-family-plan-batch-archetype-unknown"
  );
  const batchByArchetypeId = new Map();
  for (const batch of source.batches) {
    for (const archetypeId of batch.archetypeIds) {
      batchByArchetypeId.set(archetypeId, batch);
    }
  }

  const currentNoFamilyCodes = execution.breadthQueue
    .filter(
      (row) => row.nextAction === "review-target-set-and-design-family"
    )
    .map((row) => row.code);
  const unplannedCurrentCodes = currentNoFamilyCodes.filter(
    (code) => !plannedCodes.includes(code)
  );
  assert(
    unplannedCurrentCodes.length === 0,
    `no-family-plan-current-code-unplanned:${unplannedCurrentCodes.join(",")}`
  );

  const executionByCode = new Map(
    execution.breadthQueue.map((row) => [row.code, row])
  );
  const workItems = source.standardWorkOrder.map((code, index) => {
    const official = officialByCode.get(code);
    const archetype = archetypeByCode.get(code);
    assert(archetype, `no-family-plan-code-track-missing:${code}`);
    const batch = batchByArchetypeId.get(archetype.archetypeId);
    assert(batch, `no-family-plan-code-batch-missing:${code}`);
    const contract = source.trackContracts[archetype.archetypeId];
    const current = executionByCode.get(code);
    const nextAction = current?.nextAction ?? "complete";
    return {
      sequence: index + 1,
      workItemId: `W${String(index + 1).padStart(3, "0")}`,
      batchId: batch.batchId,
      wave: batch.wave,
      standardCode: code,
      gradeBand: official.gradeBand,
      domain: official.domain,
      officialGoal: official.officialGoal,
      archetypeId: archetype.archetypeId,
      plannedFamilyId: contract.familyId,
      engineClassIds: contract.engineClassIds,
      expectedTargetOutline:
        targetOutlineByCode.get(code).expectedTargetOutline,
      expectedTargetCount:
        targetOutlineByCode.get(code).expectedTargetOutline.length,
      archetypeRole:
        code === archetype.anchorStandardCode ? "anchor" : "extension",
      splitRisk: archetype.splitRisk,
      nextAction,
      actionClass: actionClass(nextAction)
    };
  });
  assert(workItems.length === plannedCodes.length, "no-family-plan-work-count");
  assert(
    new Set(workItems.map((item) => item.standardCode)).size ===
      workItems.length,
    "no-family-plan-work-duplicate"
  );

  const actionClassCounts = Object.fromEntries(
    [
      "planned-no-family",
      "offline-in-progress",
      "live-evidence",
      "complete"
    ].map((status) => [
      status,
      workItems.filter((item) => item.actionClass === status).length
    ])
  );
  const nextOfflineWork = workItems.find((item) =>
    ["planned-no-family", "offline-in-progress"].includes(item.actionClass)
  );
  const nextLiveEvidenceWork = workItems.find(
    (item) => item.actionClass === "live-evidence"
  );
  const currentMatchesBaseline =
    currentNoFamilyCodes.length === source.baseline.expectedStandardCount &&
    stableCodeHash(currentNoFamilyCodes) === source.baseline.standardCodeSha256 &&
    codeOrderHash(currentNoFamilyCodes) ===
      source.baseline.standardWorkOrderSha256;

  return {
    schemaVersion: source.schemaVersion,
    planId: source.planId,
    purpose: source.purpose,
    baseline: {
      ...source.baseline,
      currentMatchesBaseline,
      currentNoFamilyCount: currentNoFamilyCodes.length,
      currentUnplannedNoFamilyCount: unplannedCurrentCodes.length
    },
    modelPolicy: source.modelPolicy,
    loopPolicy: source.loopPolicy,
    foundation: source.foundation,
    targetOutlineSource: targetOutlines.source,
    workItemTypes: source.workItemTypes,
    nativeDiscoveryBundles: source.nativeDiscoveryBundles,
    familyAcceptanceGates: source.familyAcceptanceGates,
    planningGuardrails: source.planningGuardrails,
    estimate: source.estimate,
    current: {
      plannedStandardCount: plannedCodes.length,
      sharedEngineClassCount: source.sharedEngineClasses.length,
      concreteTrackCount: source.archetypes.length,
      concreteTrackCountsByDomain: Object.fromEntries(
        unique(source.archetypes.map((archetype) => archetype.domain)).map(
          (domain) => [
            domain,
            source.archetypes.filter(
              (archetype) => archetype.domain === domain
            ).length
          ]
        )
      ),
      expectedTargetCount: targetKeys.length,
      batchCount: source.batches.length,
      actionClassCounts,
      nextOfflineWork: nextOfflineWork ?? null,
      nextLiveEvidenceWork: nextLiveEvidenceWork ?? null
    },
    batches: source.batches.map((batch) => ({
      ...batch,
      standardCount: batch.archetypeIds.reduce(
        (sum, id) => sum + archetypeById.get(id).standardCodes.length,
        0
      )
    })),
    sharedEngineClasses: source.sharedEngineClasses,
    archetypes: source.archetypes,
    trackContracts: source.trackContracts,
    workItems
  };
}

function markdown(report) {
  const lines = [
    "# 97개 무-family 성취기준 실행 계획",
    "",
    `- 기준 성취기준: **${report.current.plannedStandardCount}개**`,
    `- shared RenderRecipe/engine class: **${report.current.sharedEngineClassCount}개**`,
    `- grade-band-safe concrete family track: **${report.current.concreteTrackCount}개**`,
    `- 영역별 track: **${Object.entries(report.current.concreteTrackCountsByDomain).map(([domain, count]) => `${domain} ${count}`).join(" · ")}**`,
    `- Sol expected AssessmentTarget outline: **${report.current.expectedTargetCount}개 / 97 standards**`,
    `- 실행 batch: **${report.current.batchCount}개**`,
    `- 현재 no-family: **${report.baseline.currentNoFamilyCount}개**`,
    `- 초기 집합 일치: **${report.baseline.currentMatchesBaseline ? "PASS" : "진행으로 감소"}**`,
    `- 누락된 현재 no-family: **${report.baseline.currentUnplannedNoFamilyCount}개**`,
    "",
    `- 최종 concrete family 계획 범위: **${report.estimate.finalConcreteProblemFamilyRange}개**`,
    `- 예상 Luna work item: **${report.estimate.expectedLunaWorkItemRuns}회**`,
    "",
    "> 84개 track은 최종 ProblemFamily 수가 아닙니다. AssessmentTarget 완전 분해에서 학생의 결정, 수학적 불변량, 관찰 증거가 달라지면 같은 track 안에서도 concrete family를 분리합니다.",
    "",
    "## 모델 역할",
    "",
    `- 전체 계획·재계획: **${report.modelPolicy.planning}**`,
    `- 반복 구현: **${report.modelPolicy.execution}**`,
    `- 재계획 승격: **${report.modelPolicy.escalation}**`,
    `- 현재 환경 주의: ${report.modelPolicy.runtimeNote}`,
    "",
    "## 먼저 닫을 foundation",
    "",
    `- 기본 learning-map 결속: **${report.foundation.defaultLearningMapRecordsForPlan}/${report.current.plannedStandardCount}**`,
    `- pilot 포함 learning-map 결속: **${report.foundation.pilotInclusiveLearningMapRecordsForPlan}/${report.current.plannedStandardCount}**`,
    `- 추가 pinned record 필요: **${report.foundation.requiredPinnedLearningMapAdditions}개**`,
    `- 규칙: ${report.foundation.rule}`,
    `- bounded native discovery: **${report.estimate.boundedNativeDiscoveryBundles}개 묶음**`,
    "",
    "## 지금 선택된 작업",
    "",
    `- offline: ${report.current.nextOfflineWork ? `${report.current.nextOfflineWork.standardCode} · ${report.current.nextOfflineWork.archetypeId} · ${report.current.nextOfflineWork.nextAction}` : "없음"}`,
    `- live evidence: ${report.current.nextLiveEvidenceWork ? `${report.current.nextLiveEvidenceWork.standardCode} · ${report.current.nextLiveEvidenceWork.archetypeId}` : "없음"}`,
    "",
    "## 실행 상태",
    "",
    "| 상태 | 성취기준 수 |",
    "|---|---:|",
    ...Object.entries(report.current.actionClassCounts).map(
      ([status, count]) => `| ${status} | ${count} |`
    ),
    "",
    "## 배치",
    "",
    "배치는 shared engine 생성·승격 checkpoint다. Luna의 실제 표준 순서는 아래 W001~W097이며 한 실행은 성취기준 한 개만 소유한다.",
    "",
    "| batch | wave | 목적 | family track | 성취기준 |",
    "|---|---:|---|---:|---:|",
    ...report.batches.map(
      (batch) =>
        `| ${batch.batchId} | ${batch.wave} | ${batch.purpose} | ${batch.archetypeIds.length} | ${batch.standardCount} |`
    ),
    "",
    "## 24개 shared engine",
    "",
    "| engine | class | native/contract 상태 |",
    "|---|---|---|",
    ...report.sharedEngineClasses.map(
      (engine) =>
        `| ${engine.engineClassId} | ${engine.title} | ${engine.nativeDependency} |`
    ),
    "",
    "## 84개 concrete family track",
    "",
    "| ID | 영역 | 학생의 결정 | 불변량 | 증거 | RenderRecipe/native | 위험 | 성취기준 |",
    "|---|---|---|---|---|---|---|---:|",
    ...report.archetypes.map(
      (archetype) =>
        `| ${archetype.archetypeId} | ${archetype.domain} | ${archetype.studentDecision} | ${archetype.invariant} | ${archetype.observableEvidence} | ${report.trackContracts[archetype.archetypeId].engineClassIds.join("+")} / ${archetype.nativeDependency} | ${archetype.splitRisk} | ${archetype.standardCodes.length} |`
    ),
    "",
    "## 97개 표준 작업 카드",
    "",
    "| work | batch | 성취기준 | 학년군 | 영역 | track | engine | target 초안 | 역할 | 현재 동작 |",
    "|---|---|---|---|---|---|---|---:|---|---|",
    ...report.workItems.map(
      (item) =>
        `| ${item.workItemId} | ${item.batchId} | ${item.standardCode} | ${item.gradeBand} | ${item.domain} | ${item.archetypeId} | ${item.engineClassIds.join("+")} | ${item.expectedTargetCount} | ${item.archetypeRole} | ${item.nextAction} |`
    ),
    "",
    "## Family acceptance gate",
    "",
    ...report.familyAcceptanceGates.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "## Native discovery 묶음",
    "",
    ...report.nativeDiscoveryBundles.map(
      (bundle) => `- ${bundle.id} · ${bundle.required ? "필수" : "조건부"} · ${bundle.scope}`
    ),
    "",
    "## 재계획 hard stop",
    "",
    ...report.planningGuardrails.map((rule) => `- ${rule}`),
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
    `no-family plan updated: ${report.current.plannedStandardCount} standards / ${report.current.sharedEngineClassCount} engines / ${report.current.concreteTrackCount} tracks / ${report.current.batchCount} batches`
  );
} else {
  let existingJson;
  let existingMarkdown;
  try {
    existingJson = readFileSync(jsonPath, "utf8");
    existingMarkdown = readFileSync(markdownPath, "utf8");
  } catch {
    throw new Error(
      "no-family plan report is missing; run pnpm curriculum:no-family-plan:update"
    );
  }
  if (existingJson !== json || existingMarkdown !== md) {
    throw new Error(
      "no-family plan report is stale; run pnpm curriculum:no-family-plan:update"
    );
  }
  console.log(
    `no-family plan PASS: ${report.current.plannedStandardCount} standards / ${report.current.sharedEngineClassCount} engines / ${report.current.concreteTrackCount} tracks; next ${report.current.nextOfflineWork?.standardCode ?? "none"}`
  );
}
