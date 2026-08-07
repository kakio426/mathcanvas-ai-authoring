#!/usr/bin/env node

import {
  mkdir,
  readFile,
  rename,
  writeFile
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthoringRuntime } from "../packages/authoring-runtime/dist/index.js";
import { sha256Hex } from "../packages/contracts/dist/index.js";
import { getRegisteredBlueprintContentHash } from "../packages/templates/dist/index.js";
import {
  buildLessonBundleRecommendationInput,
  lessonBundleWorksheetIntakeSchema,
  projectLessonBundleRecommendation
} from "../apps/mcp-server/dist/lesson-bundle.js";
import {
  findApprovedOwnerManualProject,
  findOwnerManualLessonReview,
  ownerManualActivityLibrarySchema
} from "../apps/mcp-server/dist/owner-manual-library.js";
import {
  findOwnerGeneratedTemplateApproval,
  ownerGeneratedTemplateApprovalsSchema
} from "../apps/mcp-server/dist/owner-generated-approvals.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".."
);

function fail(message) {
  throw new Error(`MathCanvas 수업 꾸러미 루프 오류: ${message}`);
}

function parseArgs(argv) {
  const options = {
    input: "",
    output: "",
    manualLibrary: resolve(
      repositoryRoot,
      "config/owner-manual-activity-library.json"
    ),
    generatedApprovals: resolve(
      repositoryRoot,
      "config/owner-generated-template-approvals.json"
    ),
    confirm: false,
    replace: false
  };
  while (argv.length) {
    const token = argv.shift();
    if (token === "--input") options.input = resolve(argv.shift() || "");
    else if (token === "--output")
      options.output = resolve(argv.shift() || "");
    else if (token === "--manual-library")
      options.manualLibrary = resolve(argv.shift() || "");
    else if (token === "--generated-approvals")
      options.generatedApprovals = resolve(argv.shift() || "");
    else if (token === "--confirm") options.confirm = true;
    else if (token === "--replace") options.replace = true;
    else fail(`알 수 없는 옵션입니다: ${token}`);
  }
  if (!options.input) fail("--input이 필요합니다.");
  if (!options.output) fail("--output이 필요합니다.");
  return options;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`${label}을 읽지 못했습니다: ${error.message}`);
  }
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

function reusableResult(existing, intakeHash) {
  return (
    existing?.intakeHash === intakeHash &&
    ["owner-manual-selected", "created"].includes(existing?.status)
  );
}

const options = parseArgs(process.argv.slice(2));
const intake = lessonBundleWorksheetIntakeSchema.parse(
  await readJson(options.input, "활동지 intake")
);
const manualLibrary = ownerManualActivityLibrarySchema.parse(
  await readJson(options.manualLibrary, "수동 제작본 허용 목록")
);
const generatedApprovals = ownerGeneratedTemplateApprovalsSchema.parse(
  await readJson(options.generatedApprovals, "자동 제작 템플릿 승인 목록")
);
const intakeHash = sha256Hex(intake);

if (!options.replace) {
  try {
    const existing = await readJson(options.output, "기존 결과");
    if (reusableResult(existing, intakeHash)) {
      process.stdout.write(
        `${JSON.stringify({ ...existing, reused: true }, null, 2)}\n`
      );
      process.exit(0);
    }
  } catch {
    // 결과가 없거나 아직 완성되지 않았으면 정상적으로 계속한다.
  }
}

const manualReview = findOwnerManualLessonReview(
  manualLibrary,
  intake.lesson.lessonId
);
if (!manualReview) {
  const result = {
    schemaVersion: 1,
    status: "owner-manual-review-required",
    intakeHash,
    lessonId: intake.lesson.lessonId,
    worksheetSha256: intake.worksheet.sha256,
    sourcePolicy: intake.sourcePolicy,
    reviewRequest: {
      accountScope: "current-owner-my-canvas",
      loginRequired: true,
      visualInspectionRequired: true,
      instructions: [
        "MathCanvas에 로그인해 내 캔버스를 엽니다.",
        "선생님이 직접 손으로 만든 프로젝트만 후보로 봅니다.",
        "후보 화면을 열어 이 차시 목표와 학생 조작이 맞는지 확인합니다.",
        "다른 사람 자료, AI·CONTRACT·프로토타입 프로젝트는 후보에서 제외합니다."
      ]
    },
    completedAt: new Date().toISOString()
  };
  await writeJsonAtomic(options.output, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

const manualProject = findApprovedOwnerManualProject(
  manualLibrary,
  intake.lesson.lessonId
);
if (manualProject) {
  const result = {
    schemaVersion: 1,
    status: "owner-manual-selected",
    intakeHash,
    lessonId: intake.lesson.lessonId,
    worksheetSha256: intake.worksheet.sha256,
    sourcePolicy: intake.sourcePolicy,
    manualReview,
    selectedProject: manualProject,
    completedAt: new Date().toISOString()
  };
  await writeJsonAtomic(options.output, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

const runtime = createAuthoringRuntime({ headless: true });
try {
  automatedBranch: {
  const recommendation = runtime.service.recommend(
    buildLessonBundleRecommendationInput(intake)
  );
  const projected = projectLessonBundleRecommendation(
    intake,
    recommendation
  );

  if (!recommendation.supported) {
    const result = {
      schemaVersion: 1,
      status: "owner-template-required",
      intakeHash,
      lessonId: intake.lesson.lessonId,
      worksheetSha256: intake.worksheet.sha256,
      manualReview,
      ...projected,
      completedAt: new Date().toISOString()
    };
    await writeJsonAtomic(options.output, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    break automatedBranch;
  }

  const templateId = recommendation.recommendation.templateId;
  if (!templateId) fail("지원 추천에 템플릿 ID가 없습니다.");
  const blueprintContentHash =
    getRegisteredBlueprintContentHash(templateId);
  const approval = findOwnerGeneratedTemplateApproval(
    generatedApprovals,
    intake.lesson.lessonId,
    templateId,
    blueprintContentHash
  );
  if (!approval) {
    const result = {
      schemaVersion: 1,
      status: "owner-template-review-required",
      intakeHash,
      lessonId: intake.lesson.lessonId,
      worksheetSha256: intake.worksheet.sha256,
      manualReview,
      ...projected,
      templateReviewRequest: {
        templateId,
        blueprintContentHash,
        reason:
          "과거 AI 프로토타입을 재사용하지 않고 이 차시용 새 화면 검증 근거를 만들어야 합니다.",
        requiredGates: [
          "pnpm cognitive:verify",
          "pnpm check",
          "fresh student-screen canary",
          "new project visual review"
        ]
      },
      completedAt: new Date().toISOString()
    };
    await writeJsonAtomic(options.output, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    break automatedBranch;
  }

  if (!options.confirm) {
    const result = {
      schemaVersion: 1,
      status: "ready-to-create",
      intakeHash,
      lessonId: intake.lesson.lessonId,
      worksheetSha256: intake.worksheet.sha256,
      manualReview,
      ...projected,
      templateApproval: approval,
      completedAt: new Date().toISOString()
    };
    await writeJsonAtomic(options.output, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    break automatedBranch;
  }

  if (!recommendation.draftId || !recommendation.activitySpecHash) {
    fail("승인할 수 있는 추천 초안이 없습니다.");
  }
  const creation = await runtime.service.createNewProject({
    draftId: recommendation.draftId,
    activitySpecHash: recommendation.activitySpecHash,
    teacherConfirmed: true
  });
  const result = {
    schemaVersion: 1,
    status: creation.status === "succeeded" ? "created" : "creation-failed",
    intakeHash,
    lessonId: intake.lesson.lessonId,
    worksheetSha256: intake.worksheet.sha256,
    manualReview,
    ...projected,
    templateApproval: approval,
    creation,
    completedAt: new Date().toISOString()
  };
  await writeJsonAtomic(options.output, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (creation.status !== "succeeded") process.exitCode = 2;
  }
} finally {
  await runtime.dispose();
}
