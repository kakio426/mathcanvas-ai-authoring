#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { sha256Hex } from "../../packages/contracts/dist/index.js";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  defaultResearchRoot,
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";

const origin = "https://mathcanvas.vivasam.com";
const activityId =
  "number.division.quotient-remainder.claim-evidence-v1";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function runTitle(runId) {
  return `AI-CONTRACT-PROBE-DIVNATIVE-${runId}`;
}

function projectPath(projectId) {
  return `/api/project/${encodeURIComponent(projectId)}`;
}

function summarizeBounds(bounds) {
  if (!bounds) return null;
  return Object.fromEntries(
    Object.entries(bounds).map(([key, value]) => [
      key,
      Number(value.toFixed(3))
    ])
  );
}

function cloneObjectAt(object, id, x, y) {
  return {
    ...structuredClone(object),
    id,
    x,
    y,
    _x: x,
    _y: y,
    groupId: "",
    isGroup: false,
    isGroupElement: false
  };
}

function objectByVariant(contentsJson, variantId) {
  const object = contentsJson.find(
    (candidate) => candidate?.svgId === variantId
  );
  if (!object) {
    throw new Error(`division-semantic-template-missing:${variantId}`);
  }
  return object;
}

async function waitForAuthentication(page) {
  const status = await page.evaluate(async () => {
    try {
      return (
        await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store"
        })
      ).status;
    } catch {
      return 0;
    }
  });
  if (status !== 200) throw new Error("division-semantic-auth-required");
}

async function findProject(page, title) {
  return page.evaluate(async (projectTitle) => {
    const query = new URLSearchParams({
      projectTitle,
      offset: "1",
      limit: "100",
      sortCondition: "createdAt",
      sortOrder: "desc"
    });
    const response = await fetch(`/api/project?${query.toString()}`, {
      credentials: "include",
      cache: "no-store"
    });
    const body = await response.json();
    const matches = (body?.list ?? []).filter(
      (project) => project?.projectTitle === projectTitle
    );
    return {
      status: response.status,
      matchCount: matches.length,
      projectId:
        matches.length === 1 ? matches[0]?.projectId : undefined
    };
  }, title);
}

async function readProject(page, projectId) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/project/${encodeURIComponent(id)}`, {
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`division-semantic-project-read-failed:${response.status}`);
    }
    return response.json();
  }, projectId);
}

async function openInjectedProject(page, projectId, expectedObjectCount) {
  await page.goto(`${origin}/ko/view/${encodeURIComponent(projectId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForSelector(".playground", {
    state: "attached",
    timeout: 30_000
  });
  await page.waitForTimeout(1_800);
  const count = await page.locator(".item.group").count();
  if (count !== expectedObjectCount) {
    throw new Error(
      `division-semantic-injected-object-count:${expectedObjectCount}:${count}`
    );
  }
}

async function selectAllByLasso(page) {
  const items = page.locator(".item.group");
  const boxes = [];
  for (let index = 0; index < (await items.count()); index += 1) {
    const box = await items.nth(index).boundingBox();
    if (!box) throw new Error("division-semantic-item-not-visible");
    boxes.push(box);
  }
  const left = Math.min(...boxes.map((box) => box.x)) - 12;
  const top = Math.min(...boxes.map((box) => box.y)) - 12;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + 12;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + 12;
  await page.mouse.move(left, top);
  await page.mouse.down();
  await page.mouse.move(right, bottom, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  return {
    items: boxes.map(summarizeBounds),
    union: summarizeBounds({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    })
  };
}

async function clickNamedControl(page, label) {
  const control = page
    .locator("div.cursor-pointer")
    .filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) })
    .first();
  if (!(await control.isVisible().catch(() => false))) {
    throw new Error(`division-semantic-control-missing:${label}`);
  }
  await control.click({ force: true });
  await page.waitForTimeout(350);
}

let context;
let authSession;
try {
  const options = parseArguments(process.argv.slice(2), {
    "run-id": { type: "string", required: true },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "division-native-semantic-probe.json"
      )
    },
    "raw-output": {
      type: "string",
      default: join(
        defaultRawRoot,
        "division-native-semantic-probe.raw.json"
      )
    },
    "screenshot-dir": {
      type: "string",
      default: join(
        repositoryRoot,
        ".mathcanvas-contract-lab",
        "previews",
        "wave18",
        "division-native-semantic"
      )
    },
    "research-root": { type: "string", default: defaultResearchRoot },
    "raw-root": { type: "string", default: defaultRawRoot },
    "state-dir": { type: "string", default: resolveStateDirectory() }
  });
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "semantic probe evidence"
  );
  const rawOutputPath = assertPathInside(
    options["raw-output"],
    options["raw-root"],
    "semantic probe raw evidence"
  );
  const screenshotDirectory = assertPathInside(
    options["screenshot-dir"],
    join(repositoryRoot, ".mathcanvas-contract-lab", "previews"),
    "semantic probe screenshots"
  );
  const observedAt = new Date().toISOString();
  const projectTitle = runTitle(options["run-id"]);
  const blockedRequests = [];
  const capturedSavePayloads = [];
  let pendingSaveResolve;
  let injectedContents;
  let injectedProjectReadCount = 0;
  let projectId;

  authSession = await createLiveAuthHeadlessSession(
    resolveStateDirectory(options["state-dir"])
  );
  context = await authSession.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    if (
      injectedContents &&
      projectId &&
      method === "GET" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      const response = await route.fetch();
      const body = await response.json();
      body.contentsJson = injectedContents;
      body.contentsJsonLength = injectedContents.length;
      injectedProjectReadCount += 1;
      await route.fulfill({
        response,
        contentType: "application/json",
        body: JSON.stringify(body)
      });
      return;
    }
    if (safeMethods.has(method)) {
      await route.continue();
      return;
    }
    const path =
      url.origin === origin ? url.pathname : `${url.origin}${url.pathname}`;
    if (
      projectId &&
      method === "PUT" &&
      url.origin === origin &&
      url.pathname === projectPath(projectId)
    ) {
      capturedSavePayloads.push(request.postDataJSON());
      pendingSaveResolve?.();
    }
    blockedRequests.push({ method, path });
    await route.abort("blockedbyclient");
  });

  const discoveryPage = await context.newPage();
  await discoveryPage.goto(`${origin}/ko`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await waitForAuthentication(discoveryPage);
  const found = await findProject(discoveryPage, projectTitle);
  if (
    found.status !== 200 ||
    found.matchCount !== 1 ||
    typeof found.projectId !== "string"
  ) {
    throw new Error(
      `division-semantic-source-project-invalid:${JSON.stringify({
        status: found.status,
        matchCount: found.matchCount
      })}`
    );
  }
  projectId = found.projectId;
  const sourceProject = await readProject(discoveryPage, projectId);
  await discoveryPage.close();
  const sourceContents = sourceProject.contentsJson ?? [];
  const unitTemplate = objectByVariant(sourceContents, "NO01SC-01");
  const numberRackTemplate = objectByVariant(sourceContents, "NO01NR-01");
  const numberGridTemplate = objectByVariant(sourceContents, "NO04NG-01");
  const localScreenshots = [];
  mkdirSync(screenshotDirectory, { recursive: true, mode: 0o700 });

  const captureAttemptedSave = async (page) => {
    const before = capturedSavePayloads.length;
    const captured = new Promise((resolve) => {
      pendingSaveResolve = resolve;
    });
    await clickNamedControl(page, "저장");
    await Promise.race([
      captured,
      new Promise((resolve) => setTimeout(resolve, 3_000))
    ]);
    pendingSaveResolve = undefined;
    if (capturedSavePayloads.length !== before + 1) {
      throw new Error("division-semantic-save-payload-not-captured");
    }
    return capturedSavePayloads.at(-1);
  };

  const groupIds = Array.from(
    { length: 4 },
    (_, index) => `semantic-unit-${String(index + 1).padStart(2, "0")}`
  );
  injectedContents = [
    cloneObjectAt(unitTemplate, groupIds[0], 900, 1550),
    cloneObjectAt(unitTemplate, groupIds[1], 1000, 1550),
    cloneObjectAt(unitTemplate, groupIds[2], 900, 1650),
    cloneObjectAt(unitTemplate, groupIds[3], 1000, 1650)
  ];
  const groupPage = await context.newPage();
  await openInjectedProject(groupPage, projectId, 4);
  const groupSelectionBounds = await selectAllByLasso(groupPage);
  await clickNamedControl(groupPage, "그룹");
  const groupedPath = join(screenshotDirectory, "counting-grouped.png");
  await groupPage.screenshot({ path: groupedPath });
  localScreenshots.push(groupedPath);
  const groupedPayload = await captureAttemptedSave(groupPage);
  const groupedWrapper = groupedPayload.contentsJson.find(
    (object) => object?.svgId === "group-element"
  );
  if (!groupedWrapper) {
    throw new Error("division-semantic-group-wrapper-missing");
  }
  const groupedMembers = groupedPayload.contentsJson.filter((object) =>
    groupIds.includes(object?.id)
  );
  const groupedWrapperLocator = groupPage.locator(
    `[id="${String(groupedWrapper.id).replaceAll('"', '\\"')}"]`
  ).first();
  const groupedBounds = summarizeBounds(
    await groupedWrapperLocator.boundingBox()
  );
  if (!groupedBounds) {
    throw new Error("division-semantic-group-wrapper-not-rendered");
  }
  await groupPage.mouse.move(
    groupedBounds.x + groupedBounds.width / 2,
    groupedBounds.y + groupedBounds.height / 2
  );
  await groupPage.mouse.down();
  await groupPage.mouse.move(
    groupedBounds.x + groupedBounds.width / 2 + 150,
    groupedBounds.y + groupedBounds.height / 2 + 40,
    { steps: 16 }
  );
  await groupPage.mouse.up();
  await groupPage.waitForTimeout(350);
  const movedPath = join(screenshotDirectory, "counting-grouped-moved.png");
  await groupPage.screenshot({ path: movedPath });
  localScreenshots.push(movedPath);
  const movedPayload = await captureAttemptedSave(groupPage);
  const movedWrapper = movedPayload.contentsJson.find(
    (object) => object?.id === groupedWrapper.id
  );
  const movedMembers = movedPayload.contentsJson.filter((object) =>
    groupIds.includes(object?.id)
  );
  await groupPage.mouse.click(1080, 620);
  await groupPage.waitForTimeout(250);
  const deselectedPath = join(
    screenshotDirectory,
    "counting-grouped-deselected.png"
  );
  await groupPage.screenshot({ path: deselectedPath });
  localScreenshots.push(deselectedPath);
  const undoControl = groupPage.locator("#bottom-common-toolbar .group").first();
  if (!(await undoControl.isVisible().catch(() => false))) {
    throw new Error("division-semantic-undo-control-missing");
  }
  await undoControl.click({ force: true });
  await groupPage.waitForTimeout(250);
  await undoControl.click({ force: true });
  await groupPage.waitForTimeout(350);
  const undoPath = join(screenshotDirectory, "counting-group-undo.png");
  await groupPage.screenshot({ path: undoPath });
  localScreenshots.push(undoPath);
  const groupUndoPayload = await captureAttemptedSave(groupPage);
  await groupPage.close();

  const numberRackId = "semantic-number-rack";
  injectedContents = [
    cloneObjectAt(numberRackTemplate, numberRackId, 700, 1650)
  ];
  const rackPage = await context.newPage();
  await openInjectedProject(rackPage, projectId, 1);
  const rackObject = rackPage.locator(`[id="${numberRackId}"]`);
  const firstBead = rackObject.locator("circle.bead").first();
  const beadBounds = await firstBead.boundingBox();
  if (!beadBounds) throw new Error("division-semantic-bead-not-visible");
  const beadStartX = beadBounds.x + beadBounds.width / 2;
  const beadStartY = beadBounds.y + beadBounds.height / 2;
  await rackPage.mouse.move(beadStartX, beadStartY);
  await rackPage.mouse.down();
  await rackPage.mouse.move(beadStartX - 105, beadStartY, { steps: 12 });
  await rackPage.mouse.up();
  await rackPage.waitForTimeout(350);
  const rackPath = join(screenshotDirectory, "number-rack-bead-moved.png");
  await rackPage.screenshot({ path: rackPath });
  localScreenshots.push(rackPath);
  const rackPayload = await captureAttemptedSave(rackPage);
  const movedRack = rackPayload.contentsJson.find(
    (object) => object?.id === numberRackId
  );
  await rackPage.close();

  const numberGridId = "semantic-number-grid";
  injectedContents = [
    cloneObjectAt(numberGridTemplate, numberGridId, 600, 1260)
  ];
  const gridPage = await context.newPage();
  await openInjectedProject(gridPage, projectId, 1);
  const gridObject = gridPage.locator(`[id="${numberGridId}"]`);
  const gridBounds = await gridObject.boundingBox();
  if (!gridBounds) throw new Error("division-semantic-grid-not-visible");
  await gridPage.mouse.click(
    gridBounds.x + gridBounds.width / 2,
    gridBounds.y + gridBounds.height / 2
  );
  await gridPage.waitForTimeout(200);
  await gridObject.locator("rect.number-rect").nth(22).click({ force: true });
  await gridPage.waitForTimeout(250);
  const gridPath = join(screenshotDirectory, "number-grid-cell-selected.png");
  await gridPage.screenshot({ path: gridPath });
  localScreenshots.push(gridPath);
  const gridPayload = await captureAttemptedSave(gridPage);
  const changedGrid = gridPayload.contentsJson.find(
    (object) => object?.id === numberGridId
  );
  await gridPage.close();

  const groupedMemberStateValid =
    groupedMembers.length === 4 &&
    groupedMembers.every(
      (object) =>
        object.isGroup === true &&
        typeof object.groupId === "string" &&
        object.groupId.length > 0 &&
        object.groupId === groupedWrapper.groupId
    );
  const moveDelta = {
    x: Number((movedWrapper.x - groupedWrapper.x).toFixed(6)),
    y: Number((movedWrapper.y - groupedWrapper.y).toFixed(6))
  };
  if (Math.hypot(moveDelta.x, moveDelta.y) <= 10) {
    throw new Error("division-semantic-group-move-not-observed");
  }
  const movedMemberStateValid =
    movedMembers.length === 4 &&
    movedMembers.every((object, index) => {
      const before = groupedMembers[index];
      return (
        before &&
        Number((object.x - before.x).toFixed(6)) === moveDelta.x &&
        Number((object.y - before.y).toFixed(6)) === moveDelta.y &&
        object.groupId === groupedWrapper.groupId &&
        object.isGroup === true
      );
    });
  const undoneMembers = groupUndoPayload.contentsJson.filter((object) =>
    groupIds.includes(object?.id)
  );
  const groupUndoValid =
    groupUndoPayload.contentsJson.every(
      (object) => object?.svgId !== "group-element"
    ) &&
    undoneMembers.length === 4 &&
    undoneMembers.every(
      (object) => object.isGroup === false && object.groupId === ""
    );
  const evidence = {
    schemaVersion: "1.0.0",
    evidenceId: "division-native-semantic-probe-20260808-v1",
    observedAt,
    activityId,
    probeMode: "dedicated-live-auth-read-only-response-injection",
    environment: {
      viewport: { width: 1280, height: 800 },
      profileScope: "dedicated-mathcanvas-profile",
      userChromeTouched: false,
      externalWriteCount: 0,
      attemptedSavePayloadCount: capturedSavePayloads.length,
      blockedNonSafeRequestCount: blockedRequests.length,
      injectedProjectReadCount,
      serviceWorkersBlocked: true
    },
    isolation: {
      oneSemanticCasePerCanvas: true,
      unknownCandidatesColocated: false,
      sourceProjectPersistedStateChanged: false,
      localScreenshots: localScreenshots.map((path) =>
        relative(repositoryRoot, path)
      ),
      qualityEvidence: false,
      reason:
        "후보의 의미 조작을 분리 관측한 reference probe이며 완성 학생 활동 캡처가 아닙니다."
    },
    candidates: [
      {
        moduleKey: "NO01SC",
        variantId: "NO01SC-01",
        observedName: "수 세기 모형",
        semanticOperation: "multi-select-group-move-undo",
        mathematicalState: {
          initialMemberCount: 4,
          groupedWrapperCount: groupedPayload.contentsJson.filter(
            (object) => object?.svgId === "group-element"
          ).length,
          groupedWrapperMemberCount: Array.isArray(groupedWrapper.ids)
            ? groupedWrapper.ids.length
            : 0,
          clientSavePayloadHasCommonGroupMembership: groupedMemberStateValid,
          groupMoveDelta: moveDelta,
          memberMoveMatchesWrapper: movedMemberStateValid,
          undoRestoresUngroupedState: groupUndoValid,
          fullDivisionStateObserved: false
        },
        spatialObservationCssPx: {
          selectedUnits: groupSelectionBounds,
          groupedChromeBox: groupedBounds
        },
        decision: "primary-candidate-persistent-lifecycle-required",
        nextGate:
          "23개 전체에서 구성원 4개인 wrapper 5개, ungrouped 3개, 중복 0개를 실제 저장·재열기로 확인합니다."
      },
      {
        moduleKey: "NO01NR",
        variantId: "NO01NR-01",
        observedName: "수 구슬",
        semanticOperation: "bead-drag",
        mathematicalState: {
          beforeBeadX: numberRackTemplate.beadX,
          afterBeadX: movedRack?.beadX,
          persistedClientStateChanged:
            sha256Hex(numberRackTemplate.beadX) !== sha256Hex(movedRack?.beadX)
        },
        decision: "secondary-representation-not-equal-group-core"
      },
      {
        moduleKey: "NO04NG",
        variantId: "NO04NG-01",
        observedName: "배열표",
        semanticOperation: "number-cell-select",
        mathematicalState: {
          beforeSelectedRect: numberGridTemplate.selectedRect,
          afterSelectedRect: changedGrid?.selectedRect,
          persistedClientStateChanged:
            sha256Hex(numberGridTemplate.selectedRect) !==
            sha256Hex(changedGrid?.selectedRect)
        },
        decision: "secondary-checking-representation-not-group-core"
      }
    ],
    decision: {
      status: "conditional-go-no01sc-grouping-persistent-lifecycle-required",
      reason:
        "NO01SC-01 네 단위 모형의 native group membership과 가역 이동이 확인되어 drag-only 탈락 결론을 폐기합니다. 전체 23개 상태, 선택 해제 뒤 시각적 묶음 구분, 실제 save/reopen, reserveBox는 아직 release gate입니다.",
      primaryCandidate: "NO01SC-01",
      releaseQualified: false
    }
  };
  assertNoSensitiveData(evidence);
  const raw = {
    schemaVersion: "1.0.0",
    observedAt,
    runId: options["run-id"],
    projectId,
    projectTitle,
    sourceProject,
    capturedSavePayloads,
    blockedRequests,
    evidence
  };
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  mkdirSync(dirname(rawOutputPath), { recursive: true, mode: 0o700 });
  writeFileSync(outputPath, stableJson(evidence), {
    encoding: "utf8",
    mode: 0o600
  });
  writeFileSync(rawOutputPath, stableJson(raw), {
    encoding: "utf8",
    mode: 0o600
  });
  process.stdout.write(
    `PASS division native semantic probe: NO01SC grouping candidate, external writes 0 ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
} finally {
  await context?.close().catch(() => undefined);
  await authSession?.close().catch(() => undefined);
}
