#!/usr/bin/env node
// 출시된 활동을 교사 화면과 같은 입력으로 전부 실제 생성하고 화면을 찍는다.
//
// 지금 이 도구가 만들어 내는 활동이 실제로 어떻게 보이는지 한자리에서 확인하기
// 위한 진단용이다. 새 프로젝트만 만들고 기존 프로젝트는 건드리지 않는다.
//
// 전제: `pnpm mathcanvas:login`으로 전용 Chrome이 열려 있어야 한다.
//
//   node scripts/capture-activity-gallery.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTRACT_SCHEMA_VERSION } from "../packages/contracts/dist/index.js";
import {
  teacherCurriculumCatalog,
  teacherTextbookUnits
} from "../packages/curriculum/dist/index.js";
import { recommendActivity } from "../packages/planner/dist/index.js";
import {
  prepareRegisteredActivity
} from "../packages/templates/dist/index.js";
import {
  compileActivity,
  resolveActivity
} from "../packages/mathcanvas-compiler/dist/index.js";
import { validateForCreation } from "../packages/validator/dist/index.js";
import {
  repositoryRoot,
  resolveStateDirectory
} from "./contract-lab/lib/paths.mjs";
import { createLiveAuthHeadlessSession } from "./contract-lab/lib/live-auth-headless.mjs";

const runId = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+/, "Z");
const outputDirectory = join(
  repositoryRoot,
  ".mathcanvas-contract-lab",
  "previews",
  "gallery"
);
mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });

// 교사 화면이 보내는 것과 같은 입력을 만든다.
const targets = [];
for (const standard of teacherCurriculumCatalog) {
  for (const activity of standard.activities) {
    if (activity.availability !== "released") continue;
    const unit = teacherTextbookUnits.find(
      (candidate) =>
        candidate.standardCodes.includes(standard.standardCode) &&
        candidate.activityIds.includes(activity.id)
    );
    targets.push({ standard, activity, unit });
  }
}

const session = await createLiveAuthHeadlessSession(resolveStateDirectory());
const context = await session.newContext({
  viewport: { width: 1400, height: 1900 }
});
const page = await context.newPage();
await page.goto("https://mathcanvas.vivasam.com/ko/myCanvas", {
  waitUntil: "domcontentloaded"
});

const results = [];
for (const [index, target] of targets.entries()) {
  const { standard, activity, unit } = target;
  const label = `${index + 1}/${targets.length} ${activity.id}`;
  try {
    const recommendation = recommendActivity({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      requestId: `gallery-${activity.id}`,
      prompt: [
        activity.promptSeed,
        activity.learningNeeds[0]?.promptDetail ?? ""
      ].join(". "),
      requestedStandardCode: standard.standardCode,
      ...(unit ? { requestedGrade: unit.grade } : {}),
      problemCount: activity.defaultProblemCount,
      manipulation: activity.manipulation,
      createdAt: "2026-08-03T01:00:00.000Z"
    });
    if (!recommendation.supported) {
      throw new Error(
        `추천 거부: ${recommendation.blockingReasons[0] ?? "이유 없음"}`
      );
    }
    const resolved = resolveActivity(
      prepareRegisteredActivity(recommendation, {
        seed: `gallery-${activity.id}`,
        generatedAt: "2026-08-03T01:00:00.000Z",
        activityId: `activity-gallery-${activity.id}`
      })
    );
    const compiled = compileActivity(resolved);
    const validation = validateForCreation(resolved, compiled, new Date());
    if (!validation.canCreate) {
      throw new Error(
        `검증 실패: ${validation.issues.map((issue) => issue.message).join(" ")}`
      );
    }

    const payload = {
      ...compiled.payload,
      projectTitle: `AI-CONTRACT-PROBE-${runId}-${index + 1} · ${activity.label}`
    };
    const created = await page.evaluate(async (body) => {
      const token = window.localStorage.getItem("accessToken");
      const response = await fetch("/api/project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: "include",
        body: JSON.stringify(body)
      });
      const text = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      return { status: response.status, projectId: parsed?.projectId ?? null };
    }, payload);
    if (!created.projectId) {
      throw new Error(`생성 실패 HTTP ${created.status}`);
    }

    await page.goto(
      `https://mathcanvas.vivasam.com/ko/view/${created.projectId}`,
      { waitUntil: "networkidle", timeout: 90_000 }
    );
    await page.waitForTimeout(6000);
    const fileName = `${String(index + 1).padStart(2, "0")}-${activity.id}.png`;
    await page.screenshot({ path: join(outputDirectory, fileName) });

    results.push({
      order: index + 1,
      activityId: activity.id,
      label: activity.label,
      standardCode: standard.standardCode,
      grade: unit?.grade ?? null,
      unitTitle: unit ? `${unit.unitNumber}. ${unit.title}` : null,
      objectCount: payload.contentsJson?.length ?? 0,
      problemCount: recommendation.problemCount ?? null,
      screenshot: fileName,
      status: "ok"
    });
    process.stdout.write(
      `${label} 완료 (개체 ${payload.contentsJson?.length ?? 0}개)\n`
    );
  } catch (error) {
    results.push({
      order: index + 1,
      activityId: activity.id,
      label: activity.label,
      standardCode: standard.standardCode,
      grade: unit?.grade ?? null,
      status: "fail",
      error: error.message
    });
    process.stdout.write(`${label} 실패: ${error.message}\n`);
  }
}

writeFileSync(
  join(outputDirectory, "index.json"),
  `${JSON.stringify(
    {
      schemaVersion: "1.0.0",
      observedAt: new Date().toISOString(),
      total: results.length,
      ok: results.filter((result) => result.status === "ok").length,
      results
    },
    null,
    2
  )}\n`,
  "utf8"
);

const ok = results.filter((result) => result.status === "ok").length;
process.stdout.write(
  `\n활동 갤러리: 성공 ${ok} / 전체 ${results.length}\n출력: ${outputDirectory}\n`
);

await context.close();
await session.close();
process.exit(0);
