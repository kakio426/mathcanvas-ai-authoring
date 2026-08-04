#!/usr/bin/env node

/**
 * 학생 화면 품질 감사.
 *
 * `visual:audit`이 계약 통과율(겹침·이탈·컨테이너)을 본다면 이 감사는 학생이
 * 실제 화면에서 겪는 것을 본다. 다섯 축을 CSS px로 환산해 검사한다.
 *
 *   1. 문제의 위치   문제 요소가 한 덩어리로 묶여 보이는가
 *   2. 폰트 크기     학년에 맞게 읽히는가
 *   3. 수학적 배움   문항별 질문이 검증받고 있는가
 *   4. 학생 이해     질문이 보기보다 크게 보이는가
 *   5. 답 입력       드래그 여유·클릭 대상·글쓰기 영역이 충분한가
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  recommendationSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { resolveCurriculum } from "../../packages/curriculum/dist/index.js";
import {
  compileActivity,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import {
  enumerateRegisteredVariationEnvelope,
  getRegisteredActivitySupportState,
  listRegisteredBlueprints,
  prepareRegisteredActivityForEnvelopeValidation
} from "../../packages/templates/dist/index.js";
import { VISUAL_ACTIVITY_CONTROLS } from "../visual-audit/activity-controls.mjs";
import { REGRESSION_GATES } from "./regression-gates.mjs";
import {
  ABSOLUTE_MINIMUM_TEXT_CSS_PX,
  DROP_SLACK_BLOCKING_CSS_PX,
  DROP_SLACK_RECOMMENDED_CSS_PX,
  INTERACTIVE_TARGET_BLOCKING_CSS_PX,
  INTERACTIVE_TARGET_RECOMMENDED_CSS_PX,
  INTER_ITEM_MINIMUM_GAP_CSS_PX,
  OUTSIDE_ELEMENT_PROXIMITY_RATIO,
  RECOMMENDED_TEXT_CSS_PX,
  RENDER_SCALE_EVIDENCE,
  WRITING_REGION_BLOCKING_CSS_PX,
  WRITING_REGION_RECOMMENDED_CSS_PX,
  gradeBandOf,
  toCssPx
} from "./thresholds.mjs";

const root = resolve(import.meta.dirname, "../..");
const jsonPath = resolve(root, "reports/quality-audit/latest.json");
const markdownPath = resolve(root, "reports/ACTIVITY_QUALITY_AUDIT.md");
const strict = !process.argv.includes("--allow-issues");

const px = (units) => Number(toCssPx(units).toFixed(1));
const visible = (emission) => emission.renderedBounds ?? emission.bounds;

const QUESTION_ROLE = /^(question|prompt)$/;
const WRITING_ROLE = /^(prediction|explanation|answer)-box$/;
const HANGUL = /[가-힣]/u;

function intersects(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function contains(container, child) {
  return (
    child.x >= container.x &&
    child.y >= container.y &&
    child.x + child.width <= container.x + container.width &&
    child.y + child.height <= container.y + container.height
  );
}

function makeRecommendation(blueprint, variation, control) {
  const curriculum = resolveCurriculum(
    blueprint.curriculumBinding.standardCode
  );
  return recommendationSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `quality-audit-${blueprint.id}`,
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
    rationale: ["학생 화면 품질 전수 검사입니다."],
    confidence: 0.98,
    caveats: curriculum.warnings,
    blockingReasons: [],
    curriculum: curriculum.record
  });
}

/** 같은 근본 원인은 활동·검사·역할 단위로 한 번만 보고한다. */
function pushIssue(issues, input) {
  const key = [input.code, input.blueprintId, input.role ?? ""].join("|");
  const existing = issues.find((issue) => issue.key === key);
  if (existing) {
    existing.occurrences += 1;
    return;
  }
  issues.push({ key, occurrences: 1, ...input });
}

// ---------------------------------------------------------------- 2. 폰트 크기

function auditTypography({ blueprint, control, resolved, issues }) {
  const band = gradeBandOf(control.grade);
  const recommended = RECOMMENDED_TEXT_CSS_PX[band];

  for (const emission of resolved.emissions) {
    // These are square glyphs that draw a 10×10 area model, not language a
    // student must read. Cell geometry is guarded by its dedicated predicate.
    if (/^hundred-grid-row-\d+$/.test(emission.role)) continue;
    const properties = emission.toolIntent?.properties ?? {};
    if (
      typeof properties.text !== "string" ||
      typeof properties.fontSize !== "number"
    ) {
      continue;
    }
    const rendered = px(properties.fontSize);
    if (rendered < ABSOLUTE_MINIMUM_TEXT_CSS_PX) {
      pushIssue(issues, {
        severity: "P0",
        axis: "폰트 크기",
        code: "text-below-absolute-minimum",
        blueprintId: blueprint.id,
        role: emission.role,
        detail:
          `${emission.role}("${properties.text.slice(0, 16)}")가 fontSize ` +
          `${properties.fontSize} = 화면 ${rendered}px로, 어떤 학년에도 ` +
          `허용하지 않는 하한 ${ABSOLUTE_MINIMUM_TEXT_CSS_PX}px 미만입니다.`
      });
    } else if (rendered < recommended) {
      pushIssue(issues, {
        severity: "P1",
        axis: "폰트 크기",
        code: "text-below-grade-recommendation",
        blueprintId: blueprint.id,
        role: emission.role,
        detail:
          `${emission.role}가 화면 ${rendered}px입니다. ` +
          `${control.grade}학년 권장 하한은 ${recommended}px입니다.`
      });
    }
  }
}

// ------------------------------------------------------- 4. 질문과 보기의 위계

function auditHierarchy({ blueprint, resolved, issues }) {
  const byId = new Map(
    resolved.emissions.map((emission) => [emission.id, emission])
  );
  const candidateIds = new Set(
    resolved.constraints.flatMap((constraint) => constraint.sourceIds)
  );

  for (const item of resolved.items) {
    const question = resolved.emissions.find(
      (emission) =>
        emission.itemId === item.id &&
        QUESTION_ROLE.test(emission.role) &&
        typeof emission.toolIntent?.properties?.fontSize === "number"
    );
    if (!question) continue;
    const questionSize = question.toolIntent.properties.fontSize;

    for (const candidateId of candidateIds) {
      const candidate = byId.get(candidateId);
      const size = candidate?.toolIntent?.properties?.fontSize;
      if (
        !candidate ||
        candidate.itemId !== item.id ||
        typeof size !== "number" ||
        size <= questionSize
      ) {
        continue;
      }
      pushIssue(issues, {
        severity: "P1",
        axis: "학생 이해",
        code: "question-not-visually-dominant",
        blueprintId: blueprint.id,
        role: `${question.role}<${candidate.role}`,
        detail:
          `질문 ${question.role}(${questionSize}, ${px(questionSize)}px)이 ` +
          `보기 ${candidate.role}(${size}, ${px(size)}px)보다 작습니다. ` +
          "학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다."
      });
    }
  }
}

// ------------------------------------------------- 2. 폰트 넘침 검사의 적용 범위

function auditTextFitCoverage({ blueprint, resolved, issues }) {
  const predicate = blueprint.valuePredicates.find(
    (candidate) => candidate.kind === "visual.text-fit"
  );
  const guarded = new Set(
    Array.isArray(predicate?.parameters?.roles)
      ? predicate.parameters.roles
      : []
  );
  for (const emission of resolved.emissions) {
    const properties = emission.toolIntent?.properties ?? {};
    if (
      typeof properties.text !== "string" ||
      typeof properties.fontSize !== "number" ||
      guarded.has(emission.role)
    ) {
      continue;
    }
    pushIssue(issues, {
      severity: "P1",
      axis: "폰트 크기",
      code: "text-fit-unguarded-role",
      blueprintId: blueprint.id,
      role: emission.role,
      detail:
        `${emission.role}의 고정 문구가 visual.text-fit 대상에 없어 ` +
        "생성 값이 길어져도 넘침을 아무도 막지 않습니다."
    });
  }
}

// ------------------------------------------------------------- 5. 답 입력 난이도

function auditInteraction({ blueprint, resolved, issues }) {
  const byId = new Map(
    resolved.emissions.map((emission) => [emission.id, emission])
  );
  const seenPairs = new Set();

  for (const constraint of resolved.constraints) {
    const target = byId.get(constraint.targetId);
    if (!target) continue;
    const targetBounds = visible(target);
    const targetShort = Math.min(targetBounds.width, targetBounds.height);

    if (px(targetShort) < INTERACTIVE_TARGET_BLOCKING_CSS_PX) {
      pushIssue(issues, {
        severity: "P0",
        axis: "답 입력",
        code: "interactive-target-too-small",
        blueprintId: blueprint.id,
        role: target.role,
        detail:
          `${target.role}의 짧은 변이 화면 ${px(targetShort)}px으로 ` +
          `WCAG 최소 대상 크기 ${INTERACTIVE_TARGET_BLOCKING_CSS_PX}px 미만입니다.`
      });
    } else if (px(targetShort) < INTERACTIVE_TARGET_RECOMMENDED_CSS_PX) {
      pushIssue(issues, {
        severity: "P1",
        axis: "답 입력",
        code: "interactive-target-below-recommendation",
        blueprintId: blueprint.id,
        role: target.role,
        detail:
          `${target.role}의 짧은 변이 화면 ${px(targetShort)}px입니다. ` +
          `초등 조작 권장은 ${INTERACTIVE_TARGET_RECOMMENDED_CSS_PX}px입니다.`
      });
    }

    for (const sourceId of constraint.sourceIds) {
      const source = byId.get(sourceId);
      if (!source) continue;
      const pairKey = `${source.role}->${target.role}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const sourceBounds = visible(source);
      const slackX = targetBounds.width - sourceBounds.width;
      const slackY = targetBounds.height - sourceBounds.height;
      const tightest = Math.min(slackX, slackY);
      const axis = slackX <= slackY ? "가로" : "세로";

      if (px(tightest) < DROP_SLACK_BLOCKING_CSS_PX) {
        pushIssue(issues, {
          severity: "P0",
          axis: "답 입력",
          code: "drop-slack-too-tight",
          blueprintId: blueprint.id,
          role: pairKey,
          detail:
            `${source.role}를 ${target.role}에 놓을 때 ${axis} 여유가 화면 ` +
            `${px(tightest)}px뿐입니다(±${(px(tightest) / 2).toFixed(1)}px). ` +
            "학생이 픽셀 단위로 맞춰야 합니다."
        });
      } else if (px(tightest) < DROP_SLACK_RECOMMENDED_CSS_PX) {
        pushIssue(issues, {
          severity: "P1",
          axis: "답 입력",
          code: "drop-slack-below-recommendation",
          blueprintId: blueprint.id,
          role: pairKey,
          detail:
            `${source.role} → ${target.role}의 여유가 화면 ${px(tightest)}px입니다. ` +
            `권장은 ${DROP_SLACK_RECOMMENDED_CSS_PX}px입니다.`
        });
      }
    }
  }
}

// --------------------------------------------------- 5. 글쓰기 영역이 쓸 수 있는가

function auditWritingRegions({ blueprint, resolved, issues }) {
  for (const emission of resolved.emissions) {
    if (!WRITING_ROLE.test(emission.role)) continue;
    const bounds = visible(emission);
    const height = px(bounds.height);

    if (height < WRITING_REGION_BLOCKING_CSS_PX) {
      pushIssue(issues, {
        severity: "P0",
        axis: "답 입력",
        code: "writing-region-too-small",
        blueprintId: blueprint.id,
        role: emission.role,
        detail:
          `${emission.role}의 높이가 화면 ${height}px입니다. ` +
          "MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 " +
          `손글씨로만 채울 수 있고, 그러려면 최소 ${WRITING_REGION_BLOCKING_CSS_PX}px가 필요합니다.`
      });
    } else if (height < WRITING_REGION_RECOMMENDED_CSS_PX) {
      pushIssue(issues, {
        severity: "P1",
        axis: "답 입력",
        code: "writing-region-below-recommendation",
        blueprintId: blueprint.id,
        role: emission.role,
        detail: `${emission.role}의 높이가 화면 ${height}px으로 손글씨 권장 ${WRITING_REGION_RECOMMENDED_CSS_PX}px 미만입니다.`
      });
    }

    const labelRole = `${emission.role.replace(/-box$/, "")}-label`;
    const label = resolved.emissions.find(
      (candidate) =>
        candidate.role === labelRole && candidate.itemId === emission.itemId
    );
    if (label && !contains(bounds, visible(label))) {
      pushIssue(issues, {
        severity: "P1",
        axis: "답 입력",
        code: "writing-region-label-detached",
        blueprintId: blueprint.id,
        role: emission.role,
        detail:
          `${labelRole}이 ${emission.role} 바깥에 떠 있습니다. ` +
          "라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다."
      });
    }
  }
}

// ------------------------------------------------------------- 1. 문제의 위치

function auditItemGrouping({ blueprint, resolved, issues }) {
  const itemIds = resolved.items.map((item) => item.id);
  const emissionsOf = (itemId) =>
    resolved.emissions.filter((emission) => emission.itemId === itemId);
  const panelOf = (itemId) => {
    const panel = emissionsOf(itemId).find((emission) =>
      /^(mat|panel|item-panel)$/.test(emission.role)
    );
    return panel ? visible(panel) : undefined;
  };

  for (let index = 0; index < itemIds.length - 1; index += 1) {
    const current = itemIds[index];
    const next = itemIds[index + 1];

    for (const left of emissionsOf(current)) {
      for (const right of emissionsOf(next)) {
        if (!intersects(visible(left), visible(right))) continue;
        pushIssue(issues, {
          severity: "P0",
          axis: "문제의 위치",
          code: "cross-item-overlap",
          blueprintId: blueprint.id,
          role: `${left.role}x${right.role}`,
          detail:
            `${current}의 ${left.role}가 ${next}의 ${right.role}와 겹칩니다. ` +
            "layout resolver는 같은 문제 안의 겹침만 검사합니다."
        });
      }
    }

    const panel = panelOf(current);
    const nextPanel = panelOf(next);
    if (!panel || !nextPanel) continue;

    const outside = emissionsOf(current)
      .map(visible)
      .filter((bounds) => bounds.y + bounds.height > panel.y + panel.height);
    if (outside.length === 0) continue;

    const top = Math.min(...outside.map((bounds) => bounds.y));
    const bottom = Math.max(
      ...outside.map((bounds) => bounds.y + bounds.height)
    );
    const gapAbove = top - (panel.y + panel.height);
    const gapBelow = nextPanel.y - bottom;

    if (px(Math.min(gapAbove, gapBelow)) < INTER_ITEM_MINIMUM_GAP_CSS_PX) {
      pushIssue(issues, {
        severity: "P1",
        axis: "문제의 위치",
        code: "inter-item-gap-too-small",
        blueprintId: blueprint.id,
        role: "outside-elements",
        detail: `문제 사이 최소 간격이 화면 ${px(Math.min(gapAbove, gapBelow))}px입니다.`
      });
    }

    if (gapAbove > 0 && gapBelow / gapAbove < OUTSIDE_ELEMENT_PROXIMITY_RATIO) {
      pushIssue(issues, {
        severity: "P1",
        axis: "문제의 위치",
        code: "outside-element-ambiguous-ownership",
        blueprintId: blueprint.id,
        role: "outside-elements",
        detail:
          `패널 밖 요소 ${outside.length}개가 자기 문제와 ${px(gapAbove)}px, ` +
          `다음 문제와 ${px(gapBelow)}px 떨어져 있습니다(비율 ` +
          `${(gapBelow / gapAbove).toFixed(2)}, 기준 ${OUTSIDE_ELEMENT_PROXIMITY_RATIO}). ` +
          "어느 문제의 것인지 학생이 구분하기 어렵습니다."
      });
    }
  }
}

// ------------------------------------------------------ 3. 문항 질문의 검증 여부

function auditItemQuestionGate({ blueprint, resolved, issues }) {
  const predicate = blueprint.valuePredicates.find(
    (candidate) => candidate.kind === "language.classroom-korean"
  );
  const gated = new Set(
    Array.isArray(predicate?.parameters?.promptRoles)
      ? predicate.parameters.promptRoles
      : []
  );

  for (const emission of resolved.emissions) {
    const text = emission.toolIntent?.properties?.text;
    if (
      !emission.itemId ||
      !QUESTION_ROLE.test(emission.role) ||
      typeof text !== "string" ||
      !HANGUL.test(text) ||
      gated.has(emission.role)
    ) {
      continue;
    }
    pushIssue(issues, {
      severity: "P1",
      axis: "수학적 배움",
      code: "item-question-ungated",
      blueprintId: blueprint.id,
      role: emission.role,
      detail:
        `문항 질문 ${emission.role}("${text.slice(0, 20)}")가 ` +
        "language.classroom-korean의 promptRoles에 없어 학생이 이해할 " +
        "한국어인지 아무도 검사하지 않습니다."
    });
  }
}

// ----------------------------------------------------------------------- 실행

const blueprints = listRegisteredBlueprints().filter(
  (blueprint) => getRegisteredActivitySupportState(blueprint.id) === "released"
);

const results = [];
for (const blueprint of blueprints) {
  const control = VISUAL_ACTIVITY_CONTROLS[blueprint.id];
  if (!control) {
    throw new Error(`quality-audit-control-missing:${blueprint.id}`);
  }
  const issues = [];
  const variations = enumerateRegisteredVariationEnvelope(blueprint.id);

  for (const [index, variation] of variations.entries()) {
    const plan = prepareRegisteredActivityForEnvelopeValidation(
      makeRecommendation(blueprint, variation, control),
      {
        seed: `quality-audit-${blueprint.id}-${index + 1}`,
        generatedAt: "2026-08-01T00:00:00.000Z",
        activityId: `quality-audit-${sha256Hex([
          blueprint.id,
          variation,
          index
        ]).slice(0, 16)}`
      }
    );
    const resolved = resolveActivity(plan);
    compileActivity(resolved);
    const context = { blueprint, control, resolved, issues };
    auditTypography(context);
    auditHierarchy(context);
    auditTextFitCoverage(context);
    auditInteraction(context);
    auditWritingRegions(context);
    auditItemGrouping(context);
    auditItemQuestionGate(context);
  }

  results.push({
    blueprintId: blueprint.id,
    grade: control.grade,
    family: control.family,
    variationCount: variations.length,
    issues: issues.map(({ key: _key, ...issue }) => issue)
  });
}

const allIssues = results.flatMap((result) => result.issues);
const byAxis = (axis) => allIssues.filter((issue) => issue.axis === axis);
const AXES = [
  "문제의 위치",
  "폰트 크기",
  "수학적 배움",
  "학생 이해",
  "답 입력"
];

const enforcedCodes = new Set(
  Object.values(REGRESSION_GATES).flatMap((gate) => gate.codes)
);
const registeredRegressions = existsSync(resolve(root, "qa/regressions"))
  ? readdirSync(resolve(root, "qa/regressions"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];
const unmappedRegressions = registeredRegressions.filter(
  (name) => !REGRESSION_GATES[name]
);
const regressionsWithoutGate = Object.entries(REGRESSION_GATES)
  .filter(([, gate]) => gate.codes.length === 0)
  .map(([name]) => name);

const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  renderScale: RENDER_SCALE_EVIDENCE,
  activityCount: results.length,
  variationCount: results.reduce(
    (sum, result) => sum + result.variationCount,
    0
  ),
  status:
    allIssues.some((issue) => issue.severity === "P0") ||
    unmappedRegressions.length > 0
      ? "fail"
      : allIssues.length > 0
        ? "needs-polish"
        : "pass",
  issueCounts: {
    p0: allIssues.filter((issue) => issue.severity === "P0").length,
    p1: allIssues.filter((issue) => issue.severity === "P1").length
  },
  axes: AXES.map((axis) => ({
    axis,
    p0: byAxis(axis).filter((issue) => issue.severity === "P0").length,
    p1: byAxis(axis).filter((issue) => issue.severity === "P1").length
  })),
  regressions: {
    registered: registeredRegressions,
    unmapped: unmappedRegressions,
    withoutAutomatedGate: regressionsWithoutGate,
    enforcedCodes: [...enforcedCodes].sort()
  },
  activities: results
};

mkdirSync(dirname(jsonPath), { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

const codeSummary = new Map();
for (const issue of allIssues) {
  const entry = codeSummary.get(issue.code) ?? {
    severity: issue.severity,
    axis: issue.axis,
    activities: new Set(),
    roles: 0
  };
  entry.activities.add(issue.blueprintId);
  entry.roles += 1;
  codeSummary.set(issue.code, entry);
}

const markdown = [
  "# MathCanvas 학생 화면 품질 감사",
  "",
  "`visual:audit`이 계약 통과율을 본다면 이 감사는 학생이 실제 화면에서 겪는 것을 봅니다.",
  "모든 판정은 캔버스 단위를 CSS px로 환산한 뒤 내립니다.",
  "",
  `- 환산비: 1 캔버스 단위 = ${RENDER_SCALE_EVIDENCE.measuredWidthCssPx.toFixed(2)} px / ${RENDER_SCALE_EVIDENCE.tokenWidthUnits} 단위 = **${(RENDER_SCALE_EVIDENCE.measuredWidthCssPx / RENDER_SCALE_EVIDENCE.tokenWidthUnits).toFixed(4)} px** (근거: \`${RENDER_SCALE_EVIDENCE.canaryPath}\`, viewport ${RENDER_SCALE_EVIDENCE.viewport})`,
  `- 상태: **${report.status}**`,
  `- 활동 ${report.activityCount}개 / variation ${report.variationCount}개`,
  `- P0 ${report.issueCounts.p0}건 / P1 ${report.issueCounts.p1}건`,
  "",
  "## 기준 축별 결과",
  "",
  "| 축 | P0 | P1 |",
  "|---|---:|---:|",
  ...report.axes.map((axis) => `| ${axis.axis} | ${axis.p0} | ${axis.p1} |`),
  "",
  "## 검사별 요약",
  "",
  "| 검사 | 등급 | 축 | 해당 활동 |",
  "|---|---|---|---:|",
  ...[...codeSummary.entries()]
    .sort((left, right) =>
      left[1].severity === right[1].severity
        ? right[1].activities.size - left[1].activities.size
        : left[1].severity.localeCompare(right[1].severity)
    )
    .map(
      ([code, entry]) =>
        `| \`${code}\` | ${entry.severity} | ${entry.axis} | ${entry.activities.size} |`
    ),
  "",
  "## 회귀 기준 연결",
  "",
  `\`qa/regressions/\`에 등록된 ${registeredRegressions.length}개 회귀 중 ${registeredRegressions.length - unmappedRegressions.length}개가 자동 검사에 연결되어 있습니다.`,
  "",
  ...(unmappedRegressions.length
    ? [
        `**연결되지 않은 회귀**: ${unmappedRegressions.join(", ")} — \`scripts/quality-audit/regression-gates.mjs\`에 추가해야 합니다.`,
        ""
      ]
    : []),
  ...Object.entries(REGRESSION_GATES).flatMap(([name, gate]) => [
    `- \`${name}\`: ${gate.summary}`,
    `  - 자동 검사: ${gate.codes.map((code) => `\`${code}\``).join(", ") || "없음"}`,
    ...(gate.manualOnly.length
      ? [`  - 사람이 확인해야 하는 잔여 기준: ${gate.manualOnly.join(" / ")}`]
      : [])
  ]),
  "",
  "## 활동별 상세",
  "",
  ...results.flatMap((result) =>
    result.issues.length === 0
      ? [`### ${result.blueprintId} (${result.grade}학년)`, "", "문제 없음", ""]
      : [
          `### ${result.blueprintId} (${result.grade}학년)`,
          "",
          ...result.issues
            .slice()
            .sort((left, right) => left.severity.localeCompare(right.severity))
            .map(
              (issue) =>
                `- **${issue.severity} ${issue.code}** · ${issue.axis} · ${issue.occurrences}곳: ${issue.detail}`
            ),
          ""
        ]
  ),
  "## 판정 기준",
  "",
  "P0는 학생이 활동을 제대로 수행할 수 없게 만드는 문제로 출시를 막습니다.",
  "P1은 배포 전 개선 대상입니다. 임계값과 그 근거는 `scripts/quality-audit/thresholds.mjs`에 있습니다.",
  ""
].join("\n");
writeFileSync(markdownPath, markdown);

process.stdout.write(
  `quality-audit ${report.status}: ${report.activityCount} activities / ` +
    `${report.variationCount} variations / P0 ${report.issueCounts.p0} / ` +
    `P1 ${report.issueCounts.p1}\n`
);
for (const axis of report.axes) {
  process.stdout.write(
    `  ${axis.axis.padEnd(8)} P0 ${String(axis.p0).padStart(3)} / P1 ${String(axis.p1).padStart(3)}\n`
  );
}
if (unmappedRegressions.length > 0) {
  process.stdout.write(
    `  회귀 미연결: ${unmappedRegressions.join(", ")}\n`
  );
}
if (strict && report.status === "fail") {
  process.exitCode = 1;
}
