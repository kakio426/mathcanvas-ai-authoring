#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  TEACHER_INTENT_CAPABILITIES,
  getTeacherIntentCapability,
  sha256Hex,
  teacherIntentSchema
} from "../../packages/contracts/dist/index.js";
import {
  compileActivity,
  resolveActivity
} from "../../packages/mathcanvas-compiler/dist/index.js";
import { recommendActivity } from "../../packages/planner/dist/index.js";
import {
  buildRegisteredTeacherAnswerKey,
  prepareRegisteredActivity,
  projectRegisteredApprovalView
} from "../../packages/templates/dist/index.js";
import {
  projectAppliedTeacherIntent,
  projectProblemPreviews
} from "../../packages/authoring-runtime/dist/index.js";
import { buildInputReflections } from "../../apps/teacher-ui/dist/server/input-reflections.js";
import { validateForCreation } from "../../packages/validator/dist/index.js";

const root = resolve(import.meta.dirname, "../..");
const reportPath = resolve(root, "reports/teacher-intent/latest.md");
const fixedSeed = "teacher-intent-capability-fixed-seed";

const fixtures = [
  {
    name: "곱셈 배열",
    intent: {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    },
    changedIntent: {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 7,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    },
    expectedPreview:
      "한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요?",
    expectedAnswer: "4\\times6",
    domainCheck(result) {
      const first = result.resolved.items[0];
      const candidates = Array.from(
        { length: 5 },
        (_, index) => String(first?.values[`candidate${index + 1}`] ?? "")
      );
      return (
        first?.values.each === 4 &&
        first?.values.groups === 6 &&
        first?.values.total === 24 &&
        candidates.includes("6\\times4")
      );
    },
    evidence: "4개씩 × 6묶음, 전체 24, 역순 보기 6×4"
  },
  {
    name: "나눗셈 묶기",
    intent: {
      kind: "division-grouping-v1",
      totalCount: 23,
      groupSize: 4,
      contextObjectId: "candy",
      misconceptionId: "quotient-remainder-meaning"
    },
    changedIntent: {
      kind: "division-grouping-v1",
      totalCount: 22,
      groupSize: 4,
      contextObjectId: "candy",
      misconceptionId: "quotient-remainder-meaning"
    },
    expectedPreview:
      "사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요?",
    expectedAnswer: "5묶음, 3개",
    domainCheck(result) {
      const first = result.resolved.items[0];
      const candidates = Array.from(
        { length: 5 },
        (_, index) => String(first?.values[`candidate${index + 1}`] ?? "")
      );
      return (
        first?.values.countableTotal === 23 &&
        first?.values.countableGroupSize === 4 &&
        first?.values.countableObjectName === "사탕" &&
        candidates.includes("3묶음, 5개") &&
        candidates.includes("4묶음, 7개")
      );
    },
    evidence: "23개를 4개씩 묶기, 5묶음과 3개, 몫·나머지 오개념 보기"
  },
  {
    name: "분수 비교",
    intent: {
      kind: "fraction-comparison-v1",
      numerator: 3,
      leftDenominator: 4,
      rightDenominator: 5,
      misconceptionId: "denominator-size-only"
    },
    changedIntent: {
      kind: "fraction-comparison-v1",
      numerator: 3,
      leftDenominator: 4,
      rightDenominator: 6,
      misconceptionId: "denominator-size-only"
    },
    expectedPreview: "3/4 ? 3/5",
    expectedAnswer: "3/4 > 3/5",
    domainCheck(result) {
      const first = result.resolved.items[0];
      return (
        first?.values.left?.numerator === 3 &&
        first?.values.left?.denominator === 4 &&
        first?.values.right?.numerator === 3 &&
        first?.values.right?.denominator === 5 &&
        first?.values.correctRelation === ">" &&
        first?.values.misconceptionId === "denominator-size-only"
      );
    },
    evidence: "3/4와 3/5, 관계 >, 분모 크기만 보는 오개념 표식"
  }
];

function prepare(intent) {
  const capability = getTeacherIntentCapability(intent.kind);
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: `teacher-intent-report-${intent.kind}`,
    prompt: `${capability.title} 활동을 만들어 주세요.`,
    requestedStandardCode: capability.standardCode,
    requestedGrade: capability.recommendedGrade,
    problemCount: capability.defaultProblemCount,
    difficulty: "normal",
    ...(capability.denominatorRelation
      ? { denominatorRelation: capability.denominatorRelation }
      : {}),
    manipulation: capability.manipulation,
    teacherIntent: intent,
    createdAt: "2026-08-10T00:00:00.000Z"
  });
  const resolved = resolveActivity(
    prepareRegisteredActivity(recommendation, {
      seed: fixedSeed,
      generatedAt: "2026-08-10T00:00:00.000Z",
      activityId: `teacher-intent-report-${intent.kind}`
    })
  );
  const approvalView = projectRegisteredApprovalView(resolved);
  const answerKey = buildRegisteredTeacherAnswerKey(resolved);
  const compiled = compileActivity(resolved);
  const validation = validateForCreation(
    resolved,
    compiled,
    new Date("2026-08-10T00:00:00.000Z")
  );
  return {
    capability,
    recommendation,
    resolved,
    approvalView,
    activitySpecHash: sha256Hex(approvalView),
    compiled,
    validation,
    answerKey,
    problemPreviews: projectProblemPreviews(resolved, answerKey),
    appliedTeacherIntent: projectAppliedTeacherIntent(resolved)
  };
}

function status(passed) {
  return passed ? "PASS" : "FAIL";
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function displayAnswer(value) {
  return String(value).replaceAll("\\times", "×");
}

const results = fixtures.map((fixture, index) => {
  const golden = prepare(fixture.intent);
  const repeated = prepare(fixture.intent);
  const changed = prepare(fixture.changedIntent);
  const reflectionInput = {
    requestedGrade: golden.capability.recommendedGrade,
    unitTitle: fixture.name,
    standardCode: golden.capability.standardCode,
    activityId: golden.capability.templateId,
    activityLabel: golden.capability.title,
    manipulation: golden.capability.manipulation,
    learningNeedLabel: "자동 QA 학습 필요",
    contextNote: "",
    problemCount: golden.capability.defaultProblemCount,
    teacherIntent: fixture.intent,
    appliedTeacherIntent: golden.appliedTeacherIntent
  };
  const reflected = buildInputReflections(
    reflectionInput,
    golden.recommendation
  ).filter((row) =>
    golden.capability.fields.some(
      (field) => field.inputLabel === row.inputLabel
    )
  );
  const other =
    TEACHER_INTENT_CAPABILITIES[
      (index + 1) % TEACHER_INTENT_CAPABILITIES.length
    ];
  let conflictCode;
  try {
    recommendActivity({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: `teacher-intent-conflict-${fixture.intent.kind}`,
      prompt: `${fixture.name} 충돌 검사`,
      manipulation: other.manipulation,
      teacherIntent: fixture.intent,
      createdAt: "2026-08-10T00:00:00.000Z"
    });
  } catch (error) {
    conflictCode =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
  }
  const preview = golden.problemPreviews[0];
  const checks = {
    schema: teacherIntentSchema.safeParse(fixture.intent).success,
    recommendation:
      golden.recommendation.templateId === golden.capability.templateId &&
      JSON.stringify(golden.recommendation.teacherIntent) ===
        JSON.stringify(fixture.intent),
    applied:
      JSON.stringify(golden.appliedTeacherIntent) ===
      JSON.stringify(fixture.intent),
    exactPreview:
      preview?.statementSource === "learner-instructions" &&
      preview.statements[0] === fixture.expectedPreview,
    answer: golden.answerKey[0]?.answer === fixture.expectedAnswer,
    domain: fixture.domainCheck(golden),
    reflection:
      reflected.length === golden.capability.fields.length &&
      reflected.every((row) => row.status === "applied"),
    deterministic:
      sha256Hex(golden.resolved) === sha256Hex(repeated.resolved) &&
      golden.activitySpecHash === repeated.activitySpecHash,
    causal:
      JSON.stringify(golden.resolved.items[0]?.values) !==
        JSON.stringify(changed.resolved.items[0]?.values) &&
      golden.activitySpecHash !== changed.activitySpecHash,
    conflict: conflictCode === "teacher-intent-confirmation-required",
    compiledPayload:
      golden.compiled.payloadHash === sha256Hex(golden.compiled.payload) &&
      golden.validation.compiledPayloadHash === golden.compiled.payloadHash,
    creationGate:
      golden.validation.canCreate &&
      !golden.validation.issues.some((issue) => issue.severity === "error")
  };
  return { fixture, golden, reflected, checks };
});

let divisionSharingConflictCode;
try {
  recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "teacher-intent-division-sharing-conflict",
    prompt: "사탕 23개를 4명에게 똑같이 나누게 해 주세요.",
    teacherIntent: fixtures[1].intent,
    createdAt: "2026-08-10T00:00:00.000Z"
  });
} catch (error) {
  divisionSharingConflictCode =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
}

const boundaryChecks = {
  multiplicationEqualNumbersRejected: !teacherIntentSchema.safeParse({
    ...fixtures[0].intent,
    groupCount: 4
  }).success,
  divisionNoRemainderRejected: !teacherIntentSchema.safeParse({
    ...fixtures[1].intent,
    totalCount: 24
  }).success,
  fractionSameDenominatorRejected: !teacherIntentSchema.safeParse({
    ...fixtures[2].intent,
    rightDenominator: 4
  }).success,
  divisionEqualSharingPromptRejected:
    divisionSharingConflictCode === "teacher-intent-confirmation-required"
};
const passed =
  results.every(({ checks }) => Object.values(checks).every(Boolean)) &&
  Object.values(boundaryChecks).every(Boolean);

const capabilityRows = results
  .map(({ fixture, golden, reflected, checks }) => {
    const preview = golden.problemPreviews[0];
    return `| ${fixture.name} | ${escapeCell(fixture.expectedPreview)} | ${escapeCell(displayAnswer(golden.answerKey[0]?.answer ?? "없음"))} | ${escapeCell(fixture.evidence)} | ${reflected.length}/${golden.capability.fields.length} 반영 | \`${golden.compiled.payloadHash.slice(0, 12)}…\` | ${status(golden.validation.canCreate)} | ${status(Object.values(checks).every(Boolean))} |`;
  })
  .join("\n");

const checkRows = results
  .flatMap(({ fixture, checks }) =>
    Object.entries(checks).map(
      ([name, value]) => `| ${fixture.name} | ${name} | ${status(value)} |`
    )
  )
  .join("\n");

const boundaryRows = Object.entries(boundaryChecks)
  .map(([name, value]) => `| ${name} | ${status(value)} |`)
  .join("\n");

const report = `# TeacherIntent capability 3종 — 자동 QA

- 생성 시각: ${new Date().toISOString()}
- 결과: **${status(passed)}**
- capability 수: **${TEACHER_INTENT_CAPABILITIES.length}**
- 고정 seed: \`${fixedSeed}\`
- 외부 MathCanvas 쓰기: 실행하지 않음(프로젝트 생성 0건)
- fresh canary: **BLOCKED** — 2026-08-11 제작자 확인 기준 외부 MathCanvas 접근 차단

## 요청 → 실제 결과

| capability | exact preview | 정답 | 실제 의미 증거 | 반영표 | payload hash | validator | 판정 |
|---|---|---|---|---|---|---|---|
${capabilityRows}

## 공통 파이프라인 검사

| capability | 검사 | 판정 |
|---|---|---|
${checkRows}

## 경계값 차단

| 검사 | 판정 |
|---|---|
${boundaryRows}

## 현재 범위와 남은 일

- 구현됨: 구조화된 TeacherIntent 3종, 첫 문항 exact preview, 실제 적용값 대조,
  동일 입력 재현성, 조건 변경에 따른 문항/hash 변경, route 충돌 차단,
  실제 compiler payload와 생성 전 validator 통과.
- 구현되지 않음: 제품 내부 자유문장 파서, 대화식 부분 수정, 나머지 18개 released
  활동의 TeacherIntent, 외부 MathCanvas fresh canary.
- 따라서 이 보고서의 PASS는 **TeacherIntent 공통 기반 + 3개 capability**의 오프라인
  통과를 뜻하며, 교사용 AI 전체 완성을 뜻하지 않습니다.

자동 검사는 외부 프로젝트를 만들지 않습니다. 현재 외부 MathCanvas 접근 차단 때문에
fresh canary는 실행할 수 없으며, 접근이 복구된 뒤 별도 실행해야 합니다.
`;

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, report, "utf8");
console.log(`${status(passed)} ${reportPath}`);
if (!passed) process.exitCode = 1;
