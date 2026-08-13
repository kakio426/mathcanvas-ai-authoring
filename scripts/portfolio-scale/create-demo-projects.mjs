#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { CONTRACT_SCHEMA_VERSION } from "../../packages/contracts/dist/index.js";
import { compileActivity, resolveActivity } from "../../packages/mathcanvas-compiler/dist/index.js";
import { recommendActivity } from "../../packages/planner/dist/index.js";
import { prepareRegisteredActivity } from "../../packages/templates/dist/index.js";
import { validateForCreation } from "../../packages/validator/dist/index.js";
import {
  acquireManagedProfileLock,
  resolveStateDirectory
} from "../contract-lab/lib/paths.mjs";

const root = resolve(import.meta.dirname, "../..");
const origin = "https://mathcanvas.vivasam.com";
const generatedAt = "2026-08-13T12:00:00.000Z";
const demoPrefix = "초등 수학 학생용 활동 완성";
const stateDirectory = resolveStateDirectory();
const profileDirectory = resolve(stateDirectory, "chrome-profile");
const devToolsPortPath = resolve(profileDirectory, "DevToolsActivePort");
const outputDirectory = resolve(
  root,
  ".mathcanvas-contract-lab/portfolio-scale-live-demo"
);
const data = JSON.parse(
  await readFile(
    resolve(root, "packages/templates/src/problem-families/portfolio-scale.generated.json"),
    "utf8"
  )
);

const canonicalize = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
};
const hash = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)) ?? "undefined")
    .digest("hex");
const comparable = (payload) => ({
  projectTitle: payload.projectTitle,
  contentsJson: payload.contentsJson,
  canvasOption: payload.canvasOption,
  isShowMenuOnActivity: payload.isShowMenuOnActivity,
  isNoteworthy: payload.isNoteworthy ?? false,
  tags: payload.tags,
  studyLevel: payload.studyLevel,
  categoryId: payload.categoryId ?? payload.category?.categoryId
});
const comparableDiff = (expected, actual) =>
  Object.fromEntries(
    [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
      .filter((key) => hash(expected[key]) !== hash(actual[key]))
      .map((key) => [
        key,
        {
          expectedHash: hash(expected[key]),
          actualHash: hash(actual[key]),
          expectedSize: Array.isArray(expected[key]) ? expected[key].length : null,
          actualSize: Array.isArray(actual[key]) ? actual[key].length : null
        }
      ])
  );
const summarizeContentsDiff = (expectedObjects, actualObjects) => {
  const actualById = new Map(actualObjects.map((object) => [object?.id, object]));
  return expectedObjects.flatMap((expectedObject, index) => {
    const actualObject = actualById.get(expectedObject?.id) ?? actualObjects[index];
    const keys = [...new Set([
      ...Object.keys(expectedObject ?? {}),
      ...Object.keys(actualObject ?? {})
    ])];
    const differences = keys.filter(
      (key) => hash(expectedObject?.[key]) !== hash(actualObject?.[key])
    );
    return differences.length === 0
      ? []
      : [{
          index,
          id: expectedObject?.id ?? null,
          differences: Object.fromEntries(
            differences.slice(0, 8).map((key) => [
              key,
              { expected: expectedObject?.[key], actual: actualObject?.[key] }
            ])
          )
        }];
  }).slice(0, 3);
};

const frameFirstActivity = async (page, firstItemPrefix) => {
  const question = page.locator(`[id="${firstItemPrefix}-question"]`).first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const bounds = await question.boundingBox();
    if (!bounds) throw new Error("portfolio-demo-first-question-not-rendered");
    const dragDistance = Math.max(-420, Math.min(420, 155 - bounds.y));
    if (Math.abs(dragDistance) < 12) return;
    await page.keyboard.down("Space");
    await page.mouse.move(800, 420);
    await page.mouse.down();
    await page.mouse.move(800, 420 + dragDistance, { steps: 20 });
    await page.mouse.up();
    await page.keyboard.up("Space");
    await page.waitForTimeout(180);
  }
};

const saveAndReopenInteraction = async ({
  page,
  projectId,
  payload,
  visibleObjectIds,
  firstItemPrefix,
  screenshotPath
}) => {
  const movableObjects = payload.contentsJson.filter(
    (object) =>
      object?.isMoveRotateHandler === true &&
      typeof object?.id === "string" &&
      typeof object?.svgId === "string" &&
      /^NO\d{2}/u.test(object.svgId)
  );
  if (movableObjects.length === 0) {
    throw new Error("portfolio-demo-movable-object-unavailable");
  }
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));
  let movableObject;
  let target;
  let beforeBounds;
  for (const candidate of movableObjects) {
    const locator = page.locator(`[id="${candidate.id}"]`).first();
    const bounds = await locator.boundingBox();
    if (
      bounds &&
      bounds.x + bounds.width / 2 > 0 &&
      bounds.y + bounds.height / 2 > 80 &&
      bounds.x + bounds.width / 2 < viewport.width &&
      bounds.y + bounds.height / 2 < viewport.height
    ) {
      movableObject = candidate;
      target = locator;
      beforeBounds = bounds;
      break;
    }
  }
  if (!movableObject || !target || !beforeBounds) {
    movableObject = movableObjects[0];
    target = page.locator(`[id="${movableObject.id}"]`).first();
    await target.scrollIntoViewIfNeeded();
    beforeBounds = await target.boundingBox();
  }
  if (!beforeBounds) throw new Error("portfolio-demo-movable-object-not-rendered");

  await page.mouse.move(
    beforeBounds.x + beforeBounds.width / 2,
    beforeBounds.y + beforeBounds.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    beforeBounds.x + beforeBounds.width / 2 + 72,
    beforeBounds.y + beforeBounds.height / 2 + 28,
    { steps: 14 }
  );
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterBounds = await target.boundingBox();
  const movedDistance = afterBounds
    ? Math.hypot(afterBounds.x - beforeBounds.x, afterBounds.y - beforeBounds.y)
    : 0;
  if (movedDistance < 20) {
    throw new Error(`portfolio-demo-drag-not-observed:${movedDistance.toFixed(2)}`);
  }

  const saveControl = page
    .locator("#top-toolbar div.cursor-pointer")
    .filter({ hasText: /^\s*저장\s*$/ })
    .first();
  if (!(await saveControl.isVisible().catch(() => false))) {
    throw new Error("portfolio-demo-save-control-unavailable");
  }
  const expectedPath = `/api/project/${encodeURIComponent(projectId)}`;
  const [saveRequest, saveResponse] = await Promise.all([
    page.waitForRequest(
      (request) =>
        request.method().toUpperCase() === "PUT" &&
        new URL(request.url()).pathname === expectedPath,
      { timeout: 30_000 }
    ),
    page.waitForResponse(
      (response) =>
        response.request().method().toUpperCase() === "PUT" &&
        new URL(response.url()).pathname === expectedPath,
      { timeout: 30_000 }
    ),
    saveControl.click()
  ]);
  if (!saveResponse.ok()) {
    throw new Error(`portfolio-demo-save-failed:${saveResponse.status()}`);
  }
  const savedPayload = saveRequest.postDataJSON();
  const savedObject = savedPayload?.contentsJson?.find(
    (object) => object?.id === movableObject.id
  );
  if (!savedObject || hash(savedObject) === hash(movableObject)) {
    throw new Error("portfolio-demo-saved-object-not-mutated");
  }
  const persistedAfterSave = await page.evaluate(async (savedProjectId) => {
    const response = await fetch(
      `/api/project/${encodeURIComponent(savedProjectId)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) throw new Error(`project-save-readback-failed:${response.status}`);
    return response.json();
  }, projectId);
  const persistedObject = persistedAfterSave.contentsJson?.find(
    (object) => object?.id === movableObject.id
  );
  if (!persistedObject || hash(persistedObject) === hash(movableObject)) {
    throw new Error("portfolio-demo-persisted-object-not-mutated");
  }

  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.goto(`${origin}/ko/view/${projectId}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForSelector(".playground", { state: "attached", timeout: 30_000 });
  await page.waitForFunction(
    (expectedIds) => expectedIds.every((id) => document.getElementById(id) !== null),
    visibleObjectIds,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(800);
  const reopenedPayload = await page.evaluate(async (reopenedProjectId) => {
    const response = await fetch(
      `/api/project/${encodeURIComponent(reopenedProjectId)}`,
      { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) throw new Error(`project-reopen-failed:${response.status}`);
    return response.json();
  }, projectId);
  const savedHash = hash(comparable(persistedAfterSave));
  const reopenedHash = hash(comparable(reopenedPayload));
  if (savedHash !== reopenedHash) {
    const savedComparable = comparable(persistedAfterSave);
    const reopenedComparable = comparable(reopenedPayload);
    throw new Error(
      "portfolio-demo-saved-reopen-mismatch:" +
        JSON.stringify({
          fields: comparableDiff(savedComparable, reopenedComparable),
          contents: summarizeContentsDiff(
            savedComparable.contentsJson,
            reopenedComparable.contentsJson
          )
        })
    );
  }
  await frameFirstActivity(page, firstItemPrefix);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  return {
    objectId: movableObject.id,
    movedDistance: Number(movedDistance.toFixed(2)),
    saveStatus: saveResponse.status(),
    savedPayloadHash: savedHash,
    reopenedPayloadHash: reopenedHash,
    exactSavedReopen: true
  };
};

const representativeByRenderer = new Map();
for (const record of data.records) {
  if (!representativeByRenderer.has(record.rendererKind)) {
    representativeByRenderer.set(record.rendererKind, record);
  }
}
const representatives = [...representativeByRenderer.values()].sort((left, right) =>
  left.rendererKind.localeCompare(right.rendererKind)
);
if (representatives.length !== 7) {
  throw new Error(`portfolio-demo-renderer-count-invalid:${representatives.length}`);
}

const releaseLock = acquireManagedProfileLock(stateDirectory);
let browser;
let context;
let connectedToLoginChrome = false;
try {
  const [port] = (await readFile(devToolsPortPath, "utf8")).trim().split(/\r?\n/);
  if (/^\d+$/.test(port)) {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    context = browser.contexts()[0];
    connectedToLoginChrome = Boolean(context);
  }
} catch {
  // 전용 로그인 Chrome이 없을 때만 디스크 프로필로 headless context를 연다.
}
if (!context) {
  context = await chromium.launchPersistentContext(profileDirectory, {
    channel: "chrome",
    headless: true,
    viewport: { width: 1600, height: 1000 }
  });
}
// 기존 로그인 Chrome의 빈 탭이나 중단된 검사 탭을 재사용하면 navigation/fetch가
// 끝나지 않는 경우가 있다. 로그인 context만 공유하고 검사용 탭은 항상 새로 만든다.
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const results = [];
try {
  console.log("portfolio live demo: opening MathCanvas");
  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  const authStatus = await page.evaluate(async () =>
    (
      await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(30_000)
      })
    ).status
  );
  if (authStatus !== 200) throw new Error(`mathcanvas-auth-required:${authStatus}`);
  console.log("portfolio live demo: login confirmed");

  for (const record of representatives) {
    console.log(`portfolio live demo: preparing ${record.rendererKind}`);
    const requestId = `portfolio-live-${record.rendererKind}`;
    const recommendation = recommendActivity({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId,
      prompt: `${record.standardCode} 학생이 읽고 바로 할 수 있는 수학 활동을 만들어 주세요.`,
      requestedStandardCode: record.standardCode,
      requestedFamilyId: record.familyId,
      requestedGrade: Number(record.gradeBand[0]),
      problemCount: record.targetOutlines.length,
      difficulty: "normal",
      manipulation: record.manipulation,
      createdAt: generatedAt
    });
    const plan = prepareRegisteredActivity(recommendation, {
      seed: requestId,
      generatedAt,
      activityId: requestId
    });
    const resolved = resolveActivity(plan);
    const compiled = compileActivity(resolved);
    const validation = validateForCreation(resolved, compiled, new Date(generatedAt));
    if (!validation.canCreate) {
      throw new Error(
        `portfolio-demo-validation-failed:${record.rendererKind}:` +
          validation.issues.map((issue) => issue.code).join(",")
      );
    }
    const payload = {
      ...compiled.payload,
      projectTitle: `${demoPrefix} · ${record.gradeBand}학년 · ${record.domain}`
    };
    const createResult = await page.evaluate(async ({ payload, title }) => {
      const token = window.localStorage.getItem("accessToken");
      const authorization = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch("/api/project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
          ...authorization
        },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000)
      });
      const body = await response.json().catch(() => ({}));
      return {
        ok: response.ok && typeof body.projectId === "string",
        projectId: body.projectId,
        body,
        status: response.status,
        reused: false
      };
    }, { payload, title: payload.projectTitle });
    if (!createResult.ok || typeof createResult.projectId !== "string") {
      throw new Error(
        `portfolio-demo-create-failed:${record.rendererKind}:` +
          `${createResult.status ?? "unknown"}:` +
          `${JSON.stringify(createResult.body ?? {})}`
      );
    }
    const reopened = await page.evaluate(async (projectId) => {
      const response = await fetch(`/api/project/${encodeURIComponent(projectId)}`, {
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(30_000)
      });
      return response.ok
        ? { ok: true, payload: await response.json(), status: response.status }
        : { ok: false, status: response.status };
    }, createResult.projectId);
    if (!reopened.ok) {
      throw new Error(
        `portfolio-demo-reopen-failed:${record.rendererKind}:${reopened.status}`
      );
    }
    const expectedComparable = comparable(payload);
    const actualComparable = comparable(reopened.payload);
    const exactRoundTrip = hash(expectedComparable) === hash(actualComparable);
    if (!exactRoundTrip) {
      throw new Error(
        `portfolio-demo-round-trip-mismatch:${record.rendererKind}:` +
          JSON.stringify({
            fields: comparableDiff(expectedComparable, actualComparable),
            contents: summarizeContentsDiff(
              expectedComparable.contentsJson,
              actualComparable.contentsJson
            )
          })
      );
    }
    const editorUrl = `${origin}/ko/view/${createResult.projectId}`;
    const firstItemPrefix = `${record.standardSlug}-${record.targetOutlines[0].key}`;
    const visibleObjectIds = payload.contentsJson
      .map((object) => object?.id)
      .filter(
        (id) =>
          typeof id === "string" &&
          (id.startsWith("instruction-") || id.startsWith(firstItemPrefix))
      );
    if (visibleObjectIds.length === 0) {
      throw new Error(`portfolio-demo-visible-object-set-empty:${record.rendererKind}`);
    }
    await page.goto(editorUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector(".playground", { state: "attached", timeout: 30_000 });
    await page.waitForFunction(
      (expectedIds) => expectedIds.every((id) => document.getElementById(id) !== null),
      visibleObjectIds,
      { timeout: 30_000 }
    );
    await page.waitForTimeout(800);
    await frameFirstActivity(page, firstItemPrefix);
    const screenshotPath = resolve(outputDirectory, `${record.rendererKind}.png`);
    await mkdir(outputDirectory, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const interaction =
      record.rendererKind === "number-card"
        ? await saveAndReopenInteraction({
            page,
            projectId: createResult.projectId,
            payload,
            visibleObjectIds,
            firstItemPrefix,
            screenshotPath: resolve(outputDirectory, "number-card-after-save.png")
          })
        : null;
    results.push({
      workItemId: record.workItemId,
      standardCode: record.standardCode,
      familyId: record.familyId,
      rendererKind: record.rendererKind,
      engineClassIds: record.engineClassIds,
      targetOutlineCount: record.targetOutlines.length,
      projectId: createResult.projectId,
      editorUrl,
      reused: createResult.reused,
      objectCount: payload.contentsJson.length,
      visibleObjectCount: visibleObjectIds.length,
      payloadHash: hash(payload),
      reopenedPayloadHash: hash(actualComparable),
      exactRoundTrip,
      screenshotPath,
      interaction
    });
    console.log(`portfolio live demo: verified ${record.rendererKind}`);
  }
} finally {
  if (connectedToLoginChrome) browser?._connection?.close();
  else await context.close();
  releaseLock();
}

const report = {
  schemaVersion: "1.0.0",
  reportId: "portfolio-scale-live-demo-v1",
  observedAt: new Date().toISOString(),
  accountScope: "current-owner-my-canvas",
  summary: {
    expectedRendererCount: 7,
    createdOrReusedProjectCount: results.length,
    exactReopenCount: results.filter((result) => result.exactRoundTrip).length,
    exactSavedReopenCount: results.filter(
      (result) => result.interaction?.exactSavedReopen === true
    ).length
  },
  limitations: [
    "대표 7개 화면 유형의 생성·재열기를 검증했으며 97개 프로젝트를 계정에 대량 생성하지 않았습니다.",
    "대표 number-card 화면 1개는 실제 드래그·저장 PUT·재열기까지 검증했습니다."
  ],
  projects: results
};
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  resolve(outputDirectory, "latest.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
await writeFile(
  resolve(outputDirectory, "latest.md"),
  [
    "# MathCanvas 97 시연 · 실제 생성/재열기",
    "",
    `- 대표 화면: ${results.length}/7`,
    `- exact 재열기: ${report.summary.exactReopenCount}/7`,
    `- 실제 조작·저장·재열기: ${report.summary.exactSavedReopenCount}/1`,
    "",
    "| 화면 | 성취기준 | 엔진 | 객체 | 프로젝트 |",
    "|---|---|---|---:|---|",
    ...results.map(
      (result) =>
        `| ${result.rendererKind} | ${result.standardCode} | ${result.engineClassIds.join(", ")} | ${result.objectCount} | [열기](${result.editorUrl}) |`
    ),
    ""
  ].join("\n")
);
console.log(
  `portfolio live demo PASS: ${results.length}/7 created or reused, ` +
    `${report.summary.exactReopenCount}/7 exact reopen`
);
for (const result of results) {
  console.log(`${result.rendererKind} ${result.standardCode} ${result.editorUrl}`);
}
if (connectedToLoginChrome) process.exit(0);
