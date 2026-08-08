#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  ACTIVITY_RELEASE_EVIDENCE,
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { resolveCurriculum } from "../../packages/curriculum/dist/index.js";
import {
  compileActivity,
  getLayoutPreset,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import {
  enumerateRegisteredVariationEnvelope,
  getRegisteredActivitySupportState,
  listRegisteredBlueprints,
  prepareRegisteredActivityForEnvelopeValidation
} from "../../packages/templates/dist/index.js";
import { validateForCreation } from "../../packages/validator/dist/index.js";
import {
  VISUAL_ACTIVITY_CONTROLS,
  VISUAL_FAMILY_ORDER
} from "./activity-controls.mjs";

const root = resolve(import.meta.dirname, "../..");
const jsonPath = resolve(root, "reports/visual-audit/latest.json");
const markdownPath = resolve(root, "reports/VISUAL_QUALITY_AUDIT.md");
const strict = !process.argv.includes("--allow-issues");
const REQUIRED_VISUAL_PREDICATES = Object.freeze([
  "visual.text-fit",
  "visual.labeled-pool-row",
  "visual.no-overlap"
]);

function visibleBounds(emission) {
  return emission.renderedBounds ?? emission.bounds;
}

function contains(container, child, tolerance = 0.001) {
  return (
    child.x >= container.x - tolerance &&
    child.y >= container.y - tolerance &&
    child.x + child.width <= container.x + container.width + tolerance &&
    child.y + child.height <= container.y + container.height + tolerance
  );
}

function intersects(left, right, tolerance = 0.001) {
  return (
    left.x < right.x + right.width - tolerance &&
    left.x + left.width > right.x + tolerance &&
    left.y < right.y + right.height - tolerance &&
    left.y + left.height > right.y + tolerance
  );
}

function centeredIn(source, target) {
  return {
    x: target.x + (target.width - source.width) / 2,
    y: target.y + (target.height - source.height) / 2,
    width: source.width,
    height: source.height
  };
}

function placedIn(source, target, placement = "center") {
  if (placement === "leading-edge") {
    return {
      x: target.x,
      y: target.y + (target.height - source.height) / 2,
      width: source.width,
      height: source.height
    };
  }
  return centeredIn(source, target);
}

function stableVariationKey(variation) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(variation).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    )
  );
}

function makeRecommendation(blueprint, variation, control) {
  const curriculum = resolveCurriculum(
    blueprint.curriculumBinding.standardCode
  );
  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `visual-audit-${blueprint.id}`,
    supported: true,
    templateId: blueprint.id,
    gradeBand: curriculum.record.gradeBand,
    recommendedGrade: control.grade,
    standardCode: curriculum.record.code,
    learningGoal: blueprint.learningObjective,
    prerequisites: curriculum.record.prerequisites,
    problemCount: variation.problemCount,
    difficulty: variation.difficulty,
    ...(variation.denominatorRelation
      ? { denominatorRelation: variation.denominatorRelation }
      : {}),
    manipulation: control.manipulation,
    rationale: ["시각 완성도 variation 전수 검사입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}

function pushIssue(issues, input) {
  const key = [
    input.severity,
    input.code,
    input.blueprintId
  ].join("|");
  if (!issues.some((issue) => issue.key === key)) {
    issues.push({ key, ...input });
  }
}

function visualRoles(blueprint) {
  const predicate = blueprint.valuePredicates.find(
    (candidate) => candidate.kind === "visual.no-overlap"
  );
  const roles = predicate?.parameters.roles;
  return new Set(Array.isArray(roles) ? roles : []);
}

function auditResolved({ blueprint, control, resolved, compiled, variation, issues }) {
  const variationKey = stableVariationKey(variation);
  const validation = validateForCreation(
    resolved,
    compiled,
    new Date("2026-08-01T00:00:00.000Z")
  );
  for (const validationIssue of validation.issues) {
    pushIssue(issues, {
      severity: "P0",
      code: `creation-${validationIssue.code}`,
      blueprintId: blueprint.id,
      variation: variationKey,
      detail: validationIssue.message
    });
  }

  const byId = new Map(
    resolved.emissions.map((emission) => [emission.id, emission])
  );
  for (const emission of resolved.emissions) {
    const visible = visibleBounds(emission);
    if (
      visible.x < 0 ||
      visible.y < 0 ||
      visible.x + visible.width > resolved.layout.width ||
      visible.y + visible.height > resolved.layout.height
    ) {
      pushIssue(issues, {
        severity: "P0",
        code: "rendered-object-out-of-canvas",
        blueprintId: blueprint.id,
        variation: variationKey,
        itemId: emission.itemId,
        roles: [emission.role],
        detail: `${emission.role}의 실제 외곽이 캔버스를 벗어납니다.`
      });
    }
    if (emission.containerId) {
      const container = byId.get(emission.containerId);
      if (!container || !contains(visibleBounds(container), visible)) {
        pushIssue(issues, {
          severity: "P0",
          code: "rendered-child-outside-container",
          blueprintId: blueprint.id,
          variation: variationKey,
          itemId: emission.itemId,
          roles: [emission.role],
          detail: `${emission.role}의 실제 외곽이 시각적 컨테이너를 벗어납니다.`
        });
      }
    }
  }

  const guardedRoles = visualRoles(blueprint);
  for (const constraint of resolved.constraints) {
    const target = byId.get(constraint.targetId);
    if (!target) continue;
    const targetBounds = visibleBounds(target);
    for (const sourceId of constraint.sourceIds) {
      const source = byId.get(sourceId);
      if (!source) continue;
      const placement = control.targetPlacementByRole?.[target.role] ?? "center";
      const moved = placedIn(visibleBounds(source), targetBounds, placement);
      if (!contains(targetBounds, moved)) {
        pushIssue(issues, {
          severity: "P0",
          code: "post-interaction-source-does-not-fit-target",
          blueprintId: blueprint.id,
          variation: variationKey,
          itemId: source.itemId,
          roles: [source.role, target.role],
          detail:
            `${source.role}의 실제 크기 ${moved.width.toFixed(1)}×${moved.height.toFixed(1)}가 ` +
            `${target.role} ${targetBounds.width.toFixed(1)}×${targetBounds.height.toFixed(1)} 안에 들어가지 않습니다.`
        });
      }
      if (placement === "leading-edge") {
        const startLine = resolved.emissions.find(
          (candidate) =>
            candidate.itemId === source.itemId &&
            candidate.role === "start-line"
        );
        const startLineBounds = startLine
          ? visibleBounds(startLine)
          : undefined;
        const startAnchorX = startLineBounds
          ? startLineBounds.x + startLineBounds.width / 2
          : Number.NaN;
        if (!startLineBounds || Math.abs(moved.x - startAnchorX) > 0.001) {
          pushIssue(issues, {
            severity: "P0",
            code: "post-interaction-common-start-misaligned",
            blueprintId: blueprint.id,
            variation: variationKey,
            itemId: source.itemId,
            roles: [source.role, target.role, "start-line"],
            detail: `${source.role}의 시작점이 공통 출발선과 맞지 않습니다.`
          });
        }
      }
      const placementUsesTargetCenter =
        !/lane|balance-scale/.test(target.role);
      if (!placementUsesTargetCenter) continue;
      for (const protectedEmission of resolved.emissions) {
        if (
          protectedEmission.itemId !== source.itemId ||
          protectedEmission.id === source.id ||
          protectedEmission.id === target.id ||
          !guardedRoles.has(protectedEmission.role)
        ) {
          continue;
        }
        if (intersects(moved, visibleBounds(protectedEmission))) {
          pushIssue(issues, {
            severity: "P0",
            code: "post-interaction-protected-region-overlap",
            blueprintId: blueprint.id,
            variation: variationKey,
            itemId: source.itemId,
            roles: [source.role, protectedEmission.role],
            detail: `${source.role}를 ${target.role} 중앙에 놓으면 ${protectedEmission.role}와 겹칩니다.`
          });
        }
      }
    }
  }
}

function readCanaryEvidence(blueprint, control, issues) {
  const evidencePaths = ACTIVITY_RELEASE_EVIDENCE[blueprint.id] ?? [];
  const evidencePath = evidencePaths[0];
  if (!evidencePath || !existsSync(resolve(root, evidencePath))) {
    pushIssue(issues, {
      severity: "P0",
      code: "release-canary-missing",
      blueprintId: blueprint.id,
      detail: "출시 canary 파일이 없습니다."
    });
    return { status: "missing" };
  }
  const evidence = JSON.parse(
    readFileSync(resolve(root, evidencePath), "utf8")
  );
  const record = Array.isArray(evidence.results)
    ? evidence.results.find(
        (candidate) => candidate.blueprintId === blueprint.id
      )
    : evidence;
  if (
    !record ||
    record.status !== "pass" ||
    record.blueprintContentHash !== blueprint.contentHash ||
    record.layoutPresetContentHash !==
      sha256Hex(getLayoutPreset(blueprint.layout.tokenSet))
  ) {
    pushIssue(issues, {
      severity: "P0",
      code: "release-canary-stale-or-failed",
      blueprintId: blueprint.id,
      detail: "출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다."
    });
  }
  if (!existsSync(resolve(root, control.previewPath))) {
    pushIssue(issues, {
      severity: "P1",
      code: "release-preview-missing",
      blueprintId: blueprint.id,
      detail: `실제 글자 잉크를 확인할 preview가 없습니다: ${control.previewPath}`
    });
  }
  return {
    status: record?.status ?? "missing",
    observedAt: evidence.observedAt ?? record?.observedAt ?? null,
    evidencePath,
    previewPath: control.previewPath,
    hasInteractionEvidence: Boolean(record?.interactionShape)
  };
}

function scoreFor(issues) {
  const deduction = issues.reduce(
    (sum, issue) =>
      sum + (issue.severity === "P0" ? 25 : issue.severity === "P1" ? 8 : 2),
    0
  );
  return Math.max(0, 100 - deduction);
}

const requestedActivityId = process.argv
  .find((argument) => argument.startsWith("--activity="))
  ?.slice("--activity=".length);
const blueprints = listRegisteredBlueprints().filter((blueprint) =>
  requestedActivityId
    ? blueprint.id === requestedActivityId
    : getRegisteredActivitySupportState(blueprint.id) === "released"
);
if (requestedActivityId && blueprints.length !== 1) {
  throw new Error(`visual-audit-activity-missing:${requestedActivityId}`);
}
const results = [];
for (const blueprint of blueprints) {
  const control = VISUAL_ACTIVITY_CONTROLS[blueprint.id];
  if (!control) {
    throw new Error(`visual-audit-control-missing:${blueprint.id}`);
  }
  const issues = [];
  const predicateKinds = new Set(
    blueprint.valuePredicates.map((predicate) => predicate.kind)
  );
  for (const predicateKind of REQUIRED_VISUAL_PREDICATES) {
    if (!predicateKinds.has(predicateKind)) {
      pushIssue(issues, {
        severity: "P0",
        code: "required-visual-predicate-missing",
        blueprintId: blueprint.id,
        detail: `${predicateKind}가 없습니다.`
      });
    }
  }

  const variations = enumerateRegisteredVariationEnvelope(blueprint.id);
  for (const [index, variation] of variations.entries()) {
    const recommendation = makeRecommendation(
      blueprint,
      variation,
      control
    );
    const plan = prepareRegisteredActivityForEnvelopeValidation(
      recommendation,
      {
        seed: `visual-audit-${blueprint.id}-${index + 1}`,
        generatedAt: "2026-08-01T00:00:00.000Z",
        activityId: `visual-audit-${sha256Hex([
          blueprint.id,
          variation,
          index
        ]).slice(0, 16)}`
      }
    );
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    auditResolved({
      blueprint,
      control,
      resolved,
      compiled,
      variation,
      issues
    });
  }
  const canary = readCanaryEvidence(blueprint, control, issues);
  results.push({
    blueprintId: blueprint.id,
    family: control.family,
    variationCount: variations.length,
    score: scoreFor(issues),
    canary,
    issues: issues.map(({ key: _key, ...issue }) => issue)
  });
}

const familyResults = VISUAL_FAMILY_ORDER.map((family) => {
  const activities = results.filter((result) => result.family === family);
  return {
    family,
    activityCount: activities.length,
    score:
      activities.reduce((sum, activity) => sum + activity.score, 0) /
      activities.length,
    p0: activities.flatMap((activity) => activity.issues).filter((issue) => issue.severity === "P0").length,
    p1: activities.flatMap((activity) => activity.issues).filter((issue) => issue.severity === "P1").length
  };
});
const allIssues = results.flatMap((result) => result.issues);
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  activityCount: results.length,
  variationCount: results.reduce(
    (sum, result) => sum + result.variationCount,
    0
  ),
  overallScore:
    results.reduce((sum, result) => sum + result.score, 0) /
    results.length,
  status: allIssues.some((issue) => issue.severity === "P0")
    ? "fail"
    : allIssues.some((issue) => issue.severity === "P1")
      ? "needs-polish"
      : "pass",
  issueCounts: {
    p0: allIssues.filter((issue) => issue.severity === "P0").length,
    p1: allIssues.filter((issue) => issue.severity === "P1").length,
    p2: allIssues.filter((issue) => issue.severity === "P2").length
  },
  evidenceCoverage: {
    previewCount: results.filter((result) =>
      existsSync(resolve(root, result.canary.previewPath ?? ""))
    ).length,
    interactionCanaryCount: results.filter(
      (result) => result.canary.hasInteractionEvidence
    ).length
  },
  families: familyResults,
  activities: results
};

mkdirSync(dirname(jsonPath), { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  "# MathCanvas 시각 품질 감사",
  "",
  `- 상태: **${report.status}**`,
  `- 활동: ${report.activityCount}개`,
  `- variation: ${report.variationCount}개`,
  `- 시각 감사 점수: **${report.overallScore.toFixed(1)}/100**`,
  `- P0: ${report.issueCounts.p0}건 / P1: ${report.issueCounts.p1}건 / P2: ${report.issueCounts.p2}건`,
  `- 실제 preview: ${report.evidenceCoverage.previewCount}/${report.activityCount}개`,
  `- 실제 조작 후 canary: ${report.evidenceCoverage.interactionCanaryCount}/${report.activityCount}개 (나머지는 정적 조작 시뮬레이션)`,
  "",
  "## 계열별 결과",
  "",
  "| 계열 | 활동 | 점수 | P0 | P1 |",
  "|---|---:|---:|---:|---:|",
  ...report.families.map(
    (family) =>
      `| ${family.family} | ${family.activityCount} | ${family.score.toFixed(1)} | ${family.p0} | ${family.p1} |`
  ),
  "",
  "## 남은 문제",
  "",
  ...(allIssues.length === 0
    ? ["P0·P1·P2 문제가 없습니다."]
    : results.flatMap((result) =>
        result.issues.map(
          (issue) =>
            `- **${issue.severity} ${issue.code}** · ${result.blueprintId}: ${issue.detail}`
        )
      )),
  "",
  "## 판정 기준",
  "",
  "P0는 출시 차단, P1은 배포 전 수정, P2는 후속 미감 개선입니다. 모든 variation에서 실제 rendered bounds를 사용하고, 선택물을 목표 중앙에 놓은 조작 후 상태까지 계산합니다. 실제 글자 잉크는 현재 blueprint·layout hash에 결속된 canary preview로 보완합니다. 이 점수는 자동 계약 통과율이며, 최종 미감·교육 품질 점수와는 구분합니다.",
  ""
].join("\n");
writeFileSync(markdownPath, markdown);

process.stdout.write(
  `visual-audit ${report.status}: ${report.activityCount} activities / ${report.variationCount} variations / P0 ${report.issueCounts.p0} / P1 ${report.issueCounts.p1} / ${report.overallScore.toFixed(1)} points\n`
);
if (
  strict &&
  (report.issueCounts.p0 > 0 || report.issueCounts.p1 > 0)
) {
  process.exitCode = 1;
}
