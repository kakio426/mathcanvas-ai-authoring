#!/usr/bin/env node

import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { sha256Hex } from "../packages/contracts/dist/index.js";
import { lessonBundleWorksheetIntakeSchema } from "../apps/mcp-server/dist/lesson-bundle.js";

function fail(message) {
  throw new Error(`MathCanvas canary 채택 오류: ${message}`);
}

function parseArgs(argv) {
  const options = {
    input: "",
    pendingResult: "",
    output: "",
    evidence: "",
    raw: "",
    initialPreview: "",
    preview: "",
    evidenceReference: "",
    initialPreviewReference: "",
    previewReference: "",
    visualReviewPassed: false
  };
  while (argv.length) {
    const token = argv.shift();
    const nextPath = () => resolve(argv.shift() || "");
    if (token === "--input") options.input = nextPath();
    else if (token === "--pending-result") options.pendingResult = nextPath();
    else if (token === "--output") options.output = nextPath();
    else if (token === "--evidence") options.evidence = nextPath();
    else if (token === "--raw") options.raw = nextPath();
    else if (token === "--initial-preview") options.initialPreview = nextPath();
    else if (token === "--preview") options.preview = nextPath();
    else if (token === "--evidence-reference") options.evidenceReference = argv.shift() || "";
    else if (token === "--initial-preview-reference") options.initialPreviewReference = argv.shift() || "";
    else if (token === "--preview-reference") options.previewReference = argv.shift() || "";
    else if (token === "--visual-review-passed") options.visualReviewPassed = true;
    else fail(`알 수 없는 옵션입니다: ${token}`);
  }
  for (const key of ["input", "pendingResult", "evidence", "raw", "initialPreview", "preview"]) {
    if (!options[key]) fail(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}가 필요합니다.`);
  }
  if (!options.output) options.output = options.pendingResult;
  if (!options.visualReviewPassed) {
    fail("실제 학생 화면을 눈으로 확인한 뒤 --visual-review-passed를 지정해야 합니다.");
  }
  return options;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`${label}을 읽지 못했습니다: ${error.message}`);
  }
}

async function assertNonemptyFile(filePath, label) {
  const details = await stat(filePath).catch(() => null);
  if (!details?.isFile() || details.size === 0) fail(`${label} 파일이 없습니다: ${filePath}`);
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await rename(temporaryPath, filePath);
}

function assertIsoDate(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) fail(`${label} 시각이 올바르지 않습니다.`);
}

const options = parseArgs(process.argv.slice(2));
const intake = lessonBundleWorksheetIntakeSchema.parse(await readJson(options.input, "활동지 intake"));
const pending = await readJson(options.pendingResult, "대기 중 결과");
const evidence = await readJson(options.evidence, "canary 검증 근거");
const raw = await readJson(options.raw, "canary 생성 결과");

if (pending.status !== "owner-template-review-required") fail(`채택 가능한 대기 상태가 아닙니다: ${pending.status}`);
if (pending.intakeHash !== sha256Hex(intake)) fail("대기 결과가 현재 활동지 intake와 다릅니다.");
if (pending.lessonId !== intake.lesson.lessonId || pending.worksheetSha256 !== intake.worksheet.sha256) {
  fail("대기 결과의 차시 또는 활동지 해시가 현재 입력과 다릅니다.");
}
const review = pending.templateReviewRequest;
if (!review?.templateId || !review?.blueprintContentHash) fail("템플릿 검토 요청 정보가 없습니다.");
if (evidence.status !== "pass" || evidence.localValidationIssueCount !== 0) fail("canary 검증이 통과 상태가 아닙니다.");
if (evidence.blueprintId !== review.templateId || evidence.blueprintContentHash !== review.blueprintContentHash) {
  fail("canary가 이 차시에 검토한 템플릿·버전과 다릅니다.");
}
if (evidence.createRequestCount !== 1 || evidence.existingProjectWriteCount !== 0 || evidence.reusedExisting !== false) {
  fail("새 프로젝트를 정확히 한 번 만든 fresh canary가 아닙니다.");
}
if (raw.payloadHash !== evidence.payloadHash || raw.creation?.ok !== true) fail("canary 원본 생성 결과가 검증 근거와 다릅니다.");
if (raw.observedAt !== evidence.observedAt) fail("canary 원본과 검증 근거의 관찰 시각이 다릅니다.");
assertIsoDate(evidence.observedAt, "canary 관찰");
const projectId = raw.creation.projectId;
const editorUrl = raw.creation.editorUrl;
if (typeof projectId !== "string" || !/^[A-Za-z0-9_-]{4,64}$/.test(projectId)) fail("새 프로젝트 ID가 올바르지 않습니다.");
if (editorUrl !== `https://mathcanvas.vivasam.com/ko/view/${projectId}`) fail("새 프로젝트 편집 URL이 올바르지 않습니다.");
if (evidence.projectReferenceHash !== sha256Hex(projectId)) fail("canary 프로젝트 참조 해시가 다릅니다.");
await assertNonemptyFile(options.initialPreview, "조작 전 화면");
await assertNonemptyFile(options.preview, "조작 후 화면");

const completedAt = new Date().toISOString();
const result = {
  ...pending,
  status: "created",
  creationMode: "fresh-canary-adopted",
  canaryApproval: {
    reviewer: "owner-loop-visual-qa",
    reviewedAt: completedAt,
    evidenceObservedAt: evidence.observedAt,
    blueprintId: evidence.blueprintId,
    blueprintContentHash: evidence.blueprintContentHash,
    payloadHash: evidence.payloadHash,
    evidencePath: options.evidenceReference || options.evidence,
    initialPreviewPath: options.initialPreviewReference || options.initialPreview,
    previewPath: options.previewReference || options.preview
  },
  creation: {
    status: "succeeded",
    projectId,
    editorUrl,
    completedAt: raw.creation.completedAt
  },
  completedAt
};
delete result.templateReviewRequest;
await writeJsonAtomic(options.output, result);
process.stdout.write(`${JSON.stringify({ status: result.status, projectId, editorUrl, output: options.output }, null, 2)}\n`);
