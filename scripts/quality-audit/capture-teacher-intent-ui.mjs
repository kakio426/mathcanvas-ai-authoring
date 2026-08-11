#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(import.meta.dirname, "../..");
const stateDirectory = mkdtempSync(
  join(tmpdir(), "mathcanvas-teacher-intent-ui-")
);
const screenshotDirectory = resolve(
  root,
  ".mathcanvas-contract-lab/previews/teacher-intent-local"
);
const reportPath = resolve(root, "reports/teacher-intent/local-ui.md");
const scenarios = [
  {
    kind: "multiplication-array-v1",
    expectedQuestion:
      "한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요?",
    expectedAnswer: "4×6",
    reflectionLabels: [
      "한 묶음의 수",
      "묶음 수",
      "사물 맥락",
      "확인할 오개념"
    ],
    screenshotName: "multiplication.png"
  },
  {
    kind: "division-grouping-v1",
    expectedQuestion:
      "사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요?",
    expectedAnswer: "5묶음, 3개",
    reflectionLabels: [
      "전체 수",
      "한 묶음의 수",
      "사물 맥락",
      "확인할 오개념"
    ],
    screenshotName: "division.png"
  },
  {
    kind: "fraction-comparison-v1",
    expectedQuestion: "3/4 ? 3/5",
    expectedAnswer: "3/4 > 3/5",
    reflectionLabels: [
      "공통 분자",
      "왼쪽 분모",
      "오른쪽 분모",
      "확인할 오개념"
    ],
    screenshotName: "fraction.png"
  }
];

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function startServer() {
  const child = spawn(
    process.execPath,
    [resolve(root, "apps/teacher-ui/dist/server/main.js")],
    {
      cwd: root,
      env: {
        ...process.env,
        MATHCANVAS_UI_NO_OPEN: "1",
        MATHCANVAS_STATE_DIR: stateDirectory
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  const ready = new Promise((resolveReady, rejectReady) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      rejectReady(new Error(`teacher-ui-start-timeout:${stderr.slice(-500)}`));
    }, 20_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const match = stdout.match(
        /MathCanvas 수업 준비 책상: (http:\/\/127\.0\.0\.1:\d+\/\?k=[A-Za-z0-9_-]+)/
      );
      if (!match) return;
      clearTimeout(timeout);
      resolveReady(match[1]);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      rejectReady(
        new Error(`teacher-ui-exited-before-ready:${code}:${stderr.slice(-500)}`)
      );
    });
  });
  return { child, ready };
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5_000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

mkdirSync(screenshotDirectory, { recursive: true, mode: 0o700 });
const { child: server, ready } = startServer();
let browser;
let creationRequestCount = 0;
let loginRequestCount = 0;
const results = [];

try {
  const bootUrl = await ready;
  const localOrigin = new URL(bootUrl).origin;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();
  await page.route("**/api/session", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/session" && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connection: "ready",
          message: "로컬 QA: 외부 MathCanvas 연결 없이 미리보기만 확인합니다."
        })
      });
      return;
    }
    await route.continue();
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin === localOrigin &&
      (url.pathname === "/api/creations" ||
        url.pathname.startsWith("/api/creations/"))
    ) {
      creationRequestCount += 1;
    }
    if (
      url.origin === localOrigin &&
      url.pathname === "/api/session/open-login"
    ) {
      loginRequestCount += 1;
    }
  });

  await page.goto(bootUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page
    .getByRole("button", { name: "수업 준비 시작하기" })
    .waitFor({ timeout: 20_000 });
  const catalog = await page.evaluate(async () =>
    (await fetch("/api/curriculum", { credentials: "same-origin" })).json()
  );
  await page.getByRole("button", { name: "수업 준비 시작하기" }).click();

  for (const [index, scenario] of scenarios.entries()) {
    const standard = catalog.standards.find((candidate) =>
      candidate.activities.some(
        (activity) => activity.teacherIntentCapability === scenario.kind
      )
    );
    const activity = standard?.activities.find(
      (candidate) => candidate.teacherIntentCapability === scenario.kind
    );
    const unit = catalog.units.find(
      (candidate) =>
        standard &&
        activity &&
        candidate.standardCodes.includes(standard.standardCode) &&
        candidate.activityIds.includes(activity.id)
    );
    if (!standard || !activity || !unit) {
      throw new Error(`teacher-intent-ui-route-missing:${scenario.kind}`);
    }

    await page
      .getByRole("radio", { name: `${unit.grade}학년`, exact: true })
      .check();
    await page
      .getByRole("radio", { name: `${unit.semester}학기`, exact: true })
      .check();
    const curriculumSelects = page.locator(".curriculum-select-grid select");
    await curriculumSelects.nth(0).selectOption(unit.id);
    await curriculumSelects.nth(1).selectOption(standard.standardCode);
    await page
      .locator(`input[name="활동 초점"][value="${activity.id}"]`)
      .check();

    const details = page.locator("details.detail-settings");
    if (!(await details.evaluate((element) => element.open))) {
      await details.locator("summary").click();
    }
    await details.locator('input[type="checkbox"]').check();
    await page
      .getByRole("button", { name: "이 내용으로 활동 추천받기" })
      .click();
    await page
      .getByRole("heading", { name: "실제 문항" })
      .waitFor({ timeout: 30_000 });

    const previewText = await page.locator("main").innerText();
    if (!previewText.includes(scenario.expectedQuestion)) {
      throw new Error(`teacher-intent-ui-question-mismatch:${scenario.kind}`);
    }
    await page.locator("details.answer-details summary").click();
    const answerText = await page.locator("details.answer-details").innerText();
    if (!answerText.includes(scenario.expectedAnswer)) {
      throw new Error(`teacher-intent-ui-answer-mismatch:${scenario.kind}`);
    }
    if (answerText.includes("\\times")) {
      throw new Error(`teacher-intent-ui-raw-latex-visible:${scenario.kind}`);
    }

    const reflectionRows = await page
      .locator(".reflection-table tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) => ({
          label: row.querySelector("th")?.textContent?.trim() ?? "",
          status:
            row.querySelector(".reflection-badge")?.textContent?.trim() ?? ""
        }))
      );
    const intentRows = scenario.reflectionLabels.map((label) =>
      reflectionRows.find((row) => row.label === label)
    );
    if (
      intentRows.some((row) => !row || row.status !== "반영됨")
    ) {
      throw new Error(`teacher-intent-ui-reflection-mismatch:${scenario.kind}`);
    }

    const screenshotPath = resolve(
      screenshotDirectory,
      scenario.screenshotName
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.push({
      kind: scenario.kind,
      question: scenario.expectedQuestion,
      answer: scenario.expectedAnswer,
      appliedIntentRows: intentRows.length,
      screenshotPath: relative(root, screenshotPath)
    });

    if (index < scenarios.length - 1) {
      await page
        .getByRole("button", { name: "← 수업 내용 고치기" })
        .click();
      await page
        .getByRole("heading", { name: "학년과 단원에서 시작해 보세요." })
        .waitFor();
    }
  }
  await context.close();

  if (creationRequestCount !== 0 || loginRequestCount !== 0) {
    throw new Error(
      `teacher-intent-ui-external-boundary-violated:${creationRequestCount}:${loginRequestCount}`
    );
  }

  const rows = results
    .map(
      (result) =>
        `| ${result.kind} | ${escapeCell(result.question)} | ${escapeCell(result.answer)} | ${result.appliedIntentRows}/4 | \`${result.screenshotPath}\` | PASS |`
    )
    .join("\n");
  const report = `# TeacherIntent 로컬 UI 브라우저 QA

- 생성 시각: ${new Date().toISOString()}
- 결과: **PASS**
- 외부 MathCanvas 연결: 사용하지 않음
- \`/api/creations\` 요청: **${creationRequestCount}건**
- 로그인 창 요청: **${loginRequestCount}건**
- 범위: 로컬 교사용 UI의 구조화 입력 → 추천 → exact preview → 정답 → 반영표

| capability | 실제 문항 | 표시 정답 | intent 반영 행 | 로컬 캡처 | 판정 |
|---|---|---|---|---|---|
${rows}

이 검사는 외부 저장·재열기 fresh canary를 대체하지 않습니다. MathCanvas 접근이
복구되기 전까지 생성 버튼은 누르지 않으며, 교사의 실제 사용 의향은 별도로 판단합니다.
`;
  mkdirSync(resolve(root, "reports/teacher-intent"), {
    recursive: true
  });
  writeFileSync(reportPath, report, "utf8");
  process.stdout.write(`PASS ${reportPath}\n`);
} finally {
  await browser?.close().catch(() => undefined);
  await stopServer(server);
  rmSync(stateDirectory, { recursive: true, force: true });
}
