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
const studentQuestions = JSON.parse(
  await readFile(
    resolve(
      root,
      "packages/templates/src/problem-families/portfolio-scale.student-questions.json"
    ),
    "utf8"
  )
);
const studentSupport = JSON.parse(
  await readFile(
    resolve(
      root,
      "packages/templates/src/problem-families/portfolio-scale.student-support.json"
    ),
    "utf8"
  )
);
const expectedTargetOutlineKeys = raw.records.flatMap((record) =>
  record.targetOutlines.map((target) => target.key)
);
if (
  new Set(expectedTargetOutlineKeys).size !== expectedTargetOutlineKeys.length ||
  Object.keys(studentQuestions).length !== expectedTargetOutlineKeys.length ||
  expectedTargetOutlineKeys.some(
    (key) => typeof studentQuestions[key] !== "string"
  ) ||
  Object.keys(studentQuestions).some(
    (key) => !expectedTargetOutlineKeys.includes(key)
  )
) {
  throw new Error("portfolio-student-question-registry-not-exact");
}
if (
  Object.keys(studentSupport).length !== expectedTargetOutlineKeys.length ||
  expectedTargetOutlineKeys.some((key) => {
    const entry = studentSupport[key];
    return !entry ||
      typeof entry.correctChoice !== "string" ||
      typeof entry.evidencePrompt !== "string";
  }) ||
  Object.keys(studentSupport).some(
    (key) => !expectedTargetOutlineKeys.includes(key)
  )
) {
  throw new Error("portfolio-student-support-registry-not-exact");
}
const normalizedStudentSupport = Object.values(studentSupport).flatMap((entry) => [
  entry.correctChoice.normalize("NFKC").trim(),
  entry.evidencePrompt.normalize("NFKC").trim()
]);
if (
  normalizedStudentSupport.some(
    (text, index) =>
      text.length < 8 ||
      text.length > (index % 2 === 0 ? 42 : 50) ||
      !/[.]$/u.test(text)
  )
) {
  throw new Error("portfolio-student-support-registry-not-elementary");
}
const normalizedStudentQuestions = Object.values(studentQuestions).map((question) =>
  question.normalize("NFKC").trim()
);
if (
  new Set(normalizedStudentQuestions).size !== expectedTargetOutlineKeys.length ||
  normalizedStudentQuestions.some(
    (question) =>
      question.length < 10 ||
      question.length > 60 ||
      !/[?]$/u.test(question)
  )
) {
  throw new Error("portfolio-student-question-registry-not-elementary");
}
const recordByFamilyId = new Map(
  raw.records.map((record) => [record.familyId, record])
);
const manifests = listProblemFamilyManifests()
  .filter((manifest) => manifest.renderRecipe.kind === "portfolio-scale-adapter")
  .sort((left, right) => left.familyId.localeCompare(right.familyId));

const rows = [];
const forbiddenStudentCopy =
  /(R\d{2}|D\d{2}[A-Z]?|목표 윤곽|엔진|아키타입|검증|불변량|membership|피연산자|등분제|포함제|정례|반례|이동 벡터|원자료|집계|변인|확인할 생각|수학 자료|문제의 조건|…)/iu;
const learnerCopyRoles = new Set([
  "instruction-predict",
  "instruction-verify",
  "instruction-explain",
  "question",
  "prediction-label",
  "pool-label",
  "explanation-label",
  "group-label",
  "array-text",
  "position-card-1",
  "position-card-2",
  "position-card-3",
  "position-card-4"
]);
const normalizeStudentText = (value) => value.normalize("NFKC").trim();
const hasTerminalPunctuation = (value) => /[.?!요죠까다]$/u.test(value);
const containsBounds = (container, child, inset = 0) =>
  child.x >= container.x + inset &&
  child.y >= container.y + inset &&
  child.x + child.width <= container.x + container.width - inset &&
  child.y + child.height <= container.y + container.height - inset;
const distance = (left, right) =>
  Math.hypot(
    Number(right?.[0]) - Number(left?.[0]),
    Number(right?.[1]) - Number(left?.[1])
  );

const inspectNativeUsability = (record, resolved, compiled) => {
  const objectsById = new Map(
    compiled.payload.contentsJson.map((object) => [object?.id, object])
  );
  const itemResults = resolved.items.map((item) => {
    const emissionByRole = new Map(
      resolved.emissions
        .filter((emission) => emission.id.startsWith(`${item.id}-`))
        .map((emission) => [emission.role, emission])
    );
    const panel = emissionByRole.get("array-panel")?.bounds;
    const nativeEmissions = [...emissionByRole.values()].filter(
      (emission) => emission.role.startsWith("native-")
    );
    const nativeElementsContained = Boolean(panel) && nativeEmissions.every(
      (emission) => containsBounds(
        panel,
        emission.renderedBounds ?? emission.bounds,
        12
      )
    );

    let nativeElementsUsable = false;
    if (record.rendererKind === "number-card") {
      nativeElementsUsable = nativeEmissions
        .filter((emission) => emission.role.startsWith("native-model-"))
        .every((emission) =>
          Math.min(
            emission.renderedBounds?.width ?? 0,
            emission.renderedBounds?.height ?? 0
          ) >= 160
        );
    } else if (record.rendererKind === "place-value") {
      nativeElementsUsable = nativeEmissions.every((emission) =>
        Math.min(
          emission.renderedBounds?.width ?? 0,
          emission.renderedBounds?.height ?? 0
        ) >= 192
      );
    } else if (record.rendererKind === "geometry") {
      nativeElementsUsable = nativeEmissions.every((emission) => {
        const coordinates = objectsById.get(emission.id)?.coordinates;
        return Array.isArray(coordinates) &&
          coordinates.length >= 2 &&
          distance(coordinates[0], coordinates[1]) >= 140;
      });
    } else if (record.rendererKind === "clock") {
      nativeElementsUsable = nativeEmissions.every((emission) =>
        Math.min(emission.bounds.width, emission.bounds.height) >= 260
      );
    } else if (record.rendererKind === "fraction") {
      nativeElementsUsable = nativeEmissions.every((emission) =>
        Math.max(
          emission.renderedBounds?.width ?? emission.bounds.width,
          emission.renderedBounds?.height ?? emission.bounds.height
        ) >= 180
      );
    } else if (record.rendererKind === "pattern") {
      nativeElementsUsable = nativeEmissions.every((emission) =>
        Math.max(
          emission.renderedBounds?.width ?? 0,
          emission.renderedBounds?.height ?? 0
        ) >= 130
      );
    } else if (record.rendererKind === "table-graph") {
      const table = emissionByRole.get("native-model-1")?.bounds;
      nativeElementsUsable = Boolean(panel && table) &&
        panel.y + panel.height - (table.y + table.height) >= 100 &&
        table.width >= 1200 && table.height >= 150;
    }
    return { nativeElementsContained, nativeElementsUsable };
  });

  return {
    nativeElementsContained: itemResults.every(
      (result) => result.nativeElementsContained
    ),
    nativeElementsUsable: itemResults.every(
      (result) => result.nativeElementsUsable
    )
  };
};

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
      prompt: `${record.standardCode} 학생이 읽고 바로 할 수 있는 수학 활동을 만들어 주세요.`,
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
    const learnerTextObjects = compiled.payload.contentsJson.filter((object) => {
      if (typeof object?.text !== "string" || object.text.trim().length === 0) {
        return false;
      }
      if (typeof object?.id !== "string") return false;
      return [...learnerCopyRoles].some(
        (role) => object.id === role || object.id.endsWith(`-${role}`)
      );
    });
    const internalCodeHidden = learnerTextObjects.every(
      (object) => !forbiddenStudentCopy.test(normalizeStudentText(object.text))
    );
    const questions = learnerTextObjects.filter((object) =>
      typeof object?.id === "string" && object.id.endsWith("-question")
    );
    const compiledQuestionTexts = questions
      .map((object) => normalizeStudentText(object.text))
      .sort();
    const registeredQuestionTexts = record.targetOutlines
      .map((target) => normalizeStudentText(studentQuestions[target.key]))
      .sort();
    const questionsElementary =
      questions.length === record.targetOutlines.length &&
      JSON.stringify(compiledQuestionTexts) ===
        JSON.stringify(registeredQuestionTexts) &&
      questions.every(
        (object) => {
          const text = normalizeStudentText(object.text);
          return text.length >= 10 &&
            text.length <= 60 &&
            /[?]$/u.test(text);
        }
      );
    const choices = learnerTextObjects.filter(
      (object) =>
        typeof object?.id === "string" &&
        /-position-card-[1-4]$/u.test(object.id)
    );
    const choicesElementary =
      choices.length === record.targetOutlines.length * 4 &&
      choices.every((object) => {
        const text = normalizeStudentText(object.text);
        return text.length >= 8 && text.length <= 36 && hasTerminalPunctuation(text);
      });
    const expectedCorrectChoices = record.targetOutlines
      .map((target) => normalizeStudentText(studentSupport[target.key].correctChoice));
    const registeredCorrectChoicesVisible = expectedCorrectChoices.every(
      (correctChoice) => choices.some(
        (object) => normalizeStudentText(object.text) === correctChoice
      )
    );
    const evidencePrompts = learnerTextObjects.filter((object) =>
      typeof object?.id === "string" && object.id.endsWith("-array-text")
    );
    const compiledEvidencePromptTexts = evidencePrompts
      .map((object) => normalizeStudentText(object.text))
      .sort();
    const registeredEvidencePromptTexts = record.targetOutlines
      .map((target) => normalizeStudentText(studentSupport[target.key].evidencePrompt))
      .sort();
    const registeredEvidencePromptsVisible =
      evidencePrompts.length === record.targetOutlines.length &&
      JSON.stringify(compiledEvidencePromptTexts) ===
        JSON.stringify(registeredEvidencePromptTexts);
    const visibleCopyComplete =
      learnerTextObjects.length >= record.targetOutlines.length * 8 &&
      learnerTextObjects.every((object) => {
        const text = normalizeStudentText(object.text);
        return text.length > 0 && !/[\r\n]/u.test(text);
      });
    const tableNativeObjects = compiled.payload.contentsJson.filter(
      (object) => object?.svgId === "DP02TG-02"
    );
    const tableCopyComplete =
      record.rendererKind !== "table-graph" ||
      tableNativeObjects.every(
        (object) =>
          Array.isArray(object.name) &&
          object.name.length === 6 &&
          object.name.every(
            (name) => typeof name === "string" && name.trim().length > 0
          )
      );
    const nativeUsability = inspectNativeUsability(record, resolved, compiled);
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
      internalCodeHidden,
      questionsElementary,
      choicesElementary,
      registeredCorrectChoicesVisible,
      registeredEvidencePromptsVisible,
      visibleCopyComplete,
      tableCopyComplete,
      ...nativeUsability,
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
      internalCodeHidden: false,
      questionsElementary: false,
      choicesElementary: false,
      registeredCorrectChoicesVisible: false,
      registeredEvidencePromptsVisible: false,
      visibleCopyComplete: false,
      tableCopyComplete: false,
      nativeElementsContained: false,
      nativeElementsUsable: false,
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
    row.internalCodeHidden &&
    row.questionsElementary &&
    row.choicesElementary &&
    row.registeredCorrectChoicesVisible &&
    row.registeredEvidencePromptsVisible &&
    row.visibleCopyComplete &&
    row.tableCopyComplete &&
    row.nativeElementsContained &&
    row.nativeElementsUsable &&
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
  `- 조작물 크기·확인 영역 포함: ${passedRows.filter((row) => row.nativeElementsUsable && row.nativeElementsContained).length}/${report.summary.expectedStandardCount}`,
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
