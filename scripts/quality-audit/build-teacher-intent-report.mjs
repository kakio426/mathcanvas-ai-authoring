#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  CONTRACT_SCHEMA_VERSION,
  multiplicationArrayTeacherIntentSchema,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import { resolveActivity } from "../../packages/mathcanvas-compiler/dist/index.js";
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

const root = resolve(import.meta.dirname, "../..");
const reportPath = resolve(root, "reports/teacher-intent/latest.md");
const fixedSeed = "teacher-intent-fixed-seed";
const goldenIntent = {
  kind: "multiplication-array-v1",
  itemsPerGroup: 4,
  groupCount: 6,
  contextObjectId: "ice-cream",
  misconceptionId: "groups-size-order"
};

function prepare(intent) {
  const recommendation = recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "teacher-intent-golden-request",
    prompt: "곱셈 배열에서 두 수의 뜻을 확인하는 활동을 만들어 주세요.",
    requestedStandardCode: "[2수01-10]",
    requestedGrade: 3,
    problemCount: 2,
    difficulty: "normal",
    manipulation: "multiplication-array-choice-drag",
    teacherIntent: intent,
    createdAt: "2026-08-10T00:00:00.000Z"
  });
  const resolved = resolveActivity(
    prepareRegisteredActivity(recommendation, {
      seed: fixedSeed,
      generatedAt: "2026-08-10T00:00:00.000Z",
      activityId: "teacher-intent-fixed-activity"
    })
  );
  const approvalView = projectRegisteredApprovalView(resolved);
  const answerKey = buildRegisteredTeacherAnswerKey(resolved);
  return {
    recommendation,
    resolved,
    approvalView,
    activitySpecHash: sha256Hex(approvalView),
    answerKey,
    problemPreviews: projectProblemPreviews(resolved, answerKey),
    appliedTeacherIntent: projectAppliedTeacherIntent(resolved)
  };
}

function displayFormula(value) {
  return String(value).replaceAll("\\times", "×");
}

function status(passed) {
  return passed ? "PASS" : "FAIL";
}

const golden = prepare(goldenIntent);
const repeated = prepare(goldenIntent);
const changedItems = prepare({ ...goldenIntent, itemsPerGroup: 5 });
const changedGroups = prepare({ ...goldenIntent, groupCount: 7 });
const first = golden.resolved.items[0];
const question = String(first?.values.questionText ?? "");
const candidates = Array.from(
  { length: 5 },
  (_, index) => String(first?.values[`candidate${index + 1}`] ?? "")
);
const reflections = buildInputReflections(
  {
    requestedGrade: 3,
    unitTitle: "1학기 곱셈",
    standardCode: "[2수01-10]",
    activityId: "multiplication-array",
    activityLabel: "묶음 배열과 곱셈식 연결",
    manipulation: "multiplication-array-choice-drag",
    learningNeedLabel: "곱셈식 두 수의 뜻을 바꾸어 생각해요",
    contextNote: "",
    problemCount: 2,
    teacherIntent: goldenIntent,
    appliedTeacherIntent: golden.appliedTeacherIntent
  },
  golden.recommendation
);
const reflectedIntent = reflections.filter((reflection) =>
  ["한 묶음의 수", "묶음 수", "사물 맥락", "확인할 오개념"].includes(
    reflection.inputLabel
  )
);

let conflictCode;
try {
  recommendActivity({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    requestId: "teacher-intent-conflict-request",
    prompt: "분수 비교 활동을 만들어 주세요.",
    manipulation: "fraction-strip-common-start-drag",
    teacherIntent: goldenIntent,
    createdAt: "2026-08-10T00:00:00.000Z"
  });
} catch (error) {
  conflictCode = error && typeof error === "object" && "code" in error
    ? error.code
    : undefined;
}

const checks = {
  question:
    question ===
    "한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요?",
  answer: golden.answerKey[0]?.answer === "4\\times6",
  reverseDistractor: candidates.includes("6\\times4"),
  total: first?.values.total === 24,
  reflection:
    reflectedIntent.length === 4 &&
    reflectedIntent.every((reflection) => reflection.status === "applied"),
  exactPreview:
    golden.problemPreviews[0]?.statementSource === "learner-instructions" &&
    golden.problemPreviews[0]?.statements[0] === question,
  deterministic:
    sha256Hex(golden.resolved) === sha256Hex(repeated.resolved) &&
    golden.activitySpecHash === repeated.activitySpecHash,
  itemsCause:
    golden.resolved.items[0]?.values.questionText !==
      changedItems.resolved.items[0]?.values.questionText &&
    golden.activitySpecHash !== changedItems.activitySpecHash,
  groupsCause:
    golden.resolved.items[0]?.values.questionText !==
      changedGroups.resolved.items[0]?.values.questionText &&
    golden.activitySpecHash !== changedGroups.activitySpecHash,
  equalNumbersRejected: !multiplicationArrayTeacherIntentSchema.safeParse({
    ...goldenIntent,
    groupCount: 4
  }).success,
  outOfRangeRejected: !multiplicationArrayTeacherIntentSchema.safeParse({
    ...goldenIntent,
    itemsPerGroup: 7
  }).success,
  partialRejected: !multiplicationArrayTeacherIntentSchema.safeParse({
    kind: "multiplication-array-v1",
    itemsPerGroup: 4,
    groupCount: 6
  }).success,
  contextRejected: !multiplicationArrayTeacherIntentSchema.safeParse({
    ...goldenIntent,
    contextObjectId: "cookie"
  }).success,
  activityConflictRejected:
    conflictCode === "teacher-intent-confirmation-required"
};
const passed = Object.values(checks).every(Boolean);
const report = `# 곱셈 TeacherIntent v1 — 자동 QA

- 생성 시각: ${new Date().toISOString()}
- 결과: **${status(passed)}**
- 고정 seed: \`${fixedSeed}\`
- 외부 MathCanvas 쓰기: 실행하지 않음
- fresh canary: 실행하지 않음(자동 검증과 별도)

## 요청 → 실제 결과

| 확인 항목 | 요청 | 실제 결과 | 판정 |
|---|---|---|---|
| 한 묶음의 수 | 4개씩 | ${String(first?.values.each)}개씩 | ${status(first?.values.each === 4)} |
| 묶음 수 | 6묶음 | ${String(first?.values.groups)}묶음 | ${status(first?.values.groups === 6)} |
| 사물 맥락 | 아이스크림 | ${question.replaceAll("|", "\\|")} | ${status(checks.question)} |
| 정답 | 4×6 | ${displayFormula(golden.answerKey[0]?.answer)} | ${status(checks.answer)} |
| 순서 오개념 보기 | 6×4 | ${candidates.map(displayFormula).join(", ")} | ${status(checks.reverseDistractor)} |
| 전체 수 | 24 | ${String(first?.values.total)} | ${status(checks.total)} |
| 승인 전 실제 문항 | exact preview | ${golden.problemPreviews[0]?.statementSource ?? "없음"} | ${status(checks.exactPreview)} |
| 반영 상태 | 4개 필드 모두 반영됨 | ${reflectedIntent.map((row) => `${row.inputLabel}:${row.status}`).join(", ")} | ${status(checks.reflection)} |

## 재현성과 안전 차단

| 검사 | 판정 |
|---|---|
| 같은 seed + 같은 intent → 같은 resolved/hash | ${status(checks.deterministic)} |
| 같은 seed + 한 묶음의 수 변경 → 문항/hash 함께 변경 | ${status(checks.itemsCause)} |
| 같은 seed + 묶음 수 변경 → 문항/hash 함께 변경 | ${status(checks.groupsCause)} |
| 같은 두 수 거부 | ${status(checks.equalNumbersRejected)} |
| 범위 밖 수 거부 | ${status(checks.outOfRangeRejected)} |
| partial intent 거부 | ${status(checks.partialRejected)} |
| 미등록 맥락 거부 | ${status(checks.contextRejected)} |
| 다른 활동과의 조합 거부 | ${status(checks.activityConflictRejected)} |

## 제작자 화면 확인

- [ ] 요청한 수와 맥락이 화면의 첫 문제에 들어갔는가?
- [ ] 정답 4×6과 오답 6×4가 수학적으로 맞는가?
- [ ] 이 활동을 실제 수업에서 쓰고 싶은가?

자동 검사는 외부 프로젝트를 만들지 않습니다. 실제 생성과 fresh canary는 제작자가 원할
때 별도로 실행합니다.
`;

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, report, "utf8");
console.log(`${status(passed)} ${reportPath}`);
if (!passed) process.exitCode = 1;
