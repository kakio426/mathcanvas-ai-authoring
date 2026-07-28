import {
  BRIDGE_PROTOCOL_VERSION,
  EXTENSION_VERSION,
  LOCAL_BRIDGE_ORIGIN,
  errorCodeForStatus,
  sha256Canonical,
  type ExtensionHeartbeat,
  type ExtensionJobResult,
  type PageInspection,
  type QueuedCreation
} from "./shared.js";

const storageKeys = [
  "pairingSecret",
  "instanceId",
  "completedResults",
  "lastFullContractCheckAt",
  "lastFullContractFailure"
] as const;
const pollAlarm = "mathcanvas-bridge-poll";
export const FULL_CONTRACT_CACHE_MS = 6 * 60 * 60 * 1000;
export const FULL_CONTRACT_FAILURE_BACKOFF_MS = 15 * 60 * 1000;
let polling = false;

export function shouldUseContractFailureBackoff(
  failureCheckedAt: string | undefined,
  now: Date,
  forceFullContractCheck: boolean
): boolean {
  return (
    !forceFullContractCheck &&
    failureCheckedAt !== undefined &&
    !Number.isNaN(Date.parse(failureCheckedAt)) &&
    now.getTime() - Date.parse(failureCheckedAt) <
      FULL_CONTRACT_FAILURE_BACKOFF_MS
  );
}

export function shouldRunFullContractCheck(
  lastSuccessAt: string | undefined,
  now: Date,
  forceFullContractCheck: boolean
): boolean {
  return (
    forceFullContractCheck ||
    lastSuccessAt === undefined ||
    Number.isNaN(Date.parse(lastSuccessAt)) ||
    now.getTime() - Date.parse(lastSuccessAt) >=
      FULL_CONTRACT_CACHE_MS
  );
}

interface StoredState {
  pairingSecret?: string;
  instanceId: string;
  completedResults: Record<string, ExtensionJobResult>;
  lastFullContractCheckAt?: string;
  lastFullContractFailure?: {
    checkedAt: string;
    detailCode: string;
  };
}

async function loadState(): Promise<StoredState> {
  const stored = await chrome.storage.local.get([...storageKeys]);
  let instanceId =
    typeof stored.instanceId === "string" ? stored.instanceId : "";
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(instanceId)) {
    instanceId = `extension-${crypto.randomUUID()}`;
    await chrome.storage.local.set({ instanceId });
  }
  const completedResults =
    stored.completedResults &&
    typeof stored.completedResults === "object" &&
    !Array.isArray(stored.completedResults)
      ? (stored.completedResults as Record<string, ExtensionJobResult>)
      : {};
  return {
    ...(typeof stored.pairingSecret === "string"
      ? { pairingSecret: stored.pairingSecret }
      : {}),
    instanceId,
    completedResults,
    ...(typeof stored.lastFullContractCheckAt === "string" &&
    !Number.isNaN(Date.parse(stored.lastFullContractCheckAt))
      ? { lastFullContractCheckAt: stored.lastFullContractCheckAt }
      : {}),
    ...(stored.lastFullContractFailure &&
    typeof stored.lastFullContractFailure === "object" &&
    typeof stored.lastFullContractFailure.checkedAt === "string" &&
    !Number.isNaN(
      Date.parse(stored.lastFullContractFailure.checkedAt)
    ) &&
    typeof stored.lastFullContractFailure.detailCode === "string"
      ? {
          lastFullContractFailure: {
            checkedAt: stored.lastFullContractFailure.checkedAt,
            detailCode: stored.lastFullContractFailure.detailCode
          }
        }
      : {})
  };
}

async function bridgeFetch(
  path: string,
  state: StoredState,
  init: RequestInit = {}
): Promise<Response> {
  if (!state.pairingSecret || !/^[a-f0-9]{64}$/.test(state.pairingSecret)) {
    throw new Error("bridge-not-paired");
  }
  const headers = new Headers(init.headers);
  headers.set("X-MathCanvas-Bridge-Secret", state.pairingSecret);
  headers.set("X-MathCanvas-Instance-Id", state.instanceId);
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(`${LOCAL_BRIDGE_ORIGIN}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
}

export async function inspectMathCanvasPage(
  verifyStaticContract = true
): Promise<PageInspection> {
  try {
    if (verifyStaticContract) {
    const categoryResponse = await fetch("/api/project-category", {
      cache: "no-store"
    });
    if (!categoryResponse.ok) {
      return { state: "contract-mismatch", detailCode: "category-api-failed" };
    }
    const categoryBody = (await categoryResponse.json()) as {
      list?: Array<{ categoryId?: string; categoryName?: string }>;
    };
    const categoryMatches = categoryBody.list?.some(
      (category) =>
        category.categoryId === "rJa0d46MAy" &&
        category.categoryName === "수와 연산"
    );
    if (!categoryMatches) {
      return {
        state: "contract-mismatch",
        detailCode: "number-operations-category-mismatch"
      };
    }

    const [unitFractionResponse, fractionSetResponse] = await Promise.all(
      [
        "/api/public-project/P_CsJeiL",
        "/api/public-project/P_yK4Aa6XomJ"
      ].map((url) =>
          fetch(url, {
            cache: "no-store"
          })
        )
    );
    if (
      !unitFractionResponse?.ok ||
      !fractionSetResponse?.ok
    ) {
      return {
        state: "contract-mismatch",
        detailCode: "fraction-fixture-api-failed"
      };
    }
    const unitFractionBody = (await unitFractionResponse.json()) as {
      contentsJson?: Array<{
        svgId?: unknown;
        count?: unknown;
        divider?: unknown;
        defaultWidth?: unknown;
        perWidth?: unknown;
        width?: unknown;
        height?: unknown;
        cx?: unknown;
        coordinates?: unknown;
        isMoveRotateHandler?: unknown;
      }>;
    };
    const fractionSetBody = (await fractionSetResponse.json()) as {
      contentsJson?: Array<{
        svgId?: unknown;
        count?: unknown;
        divider?: unknown;
        defaultWidth?: unknown;
        perWidth?: unknown;
        width?: unknown;
        height?: unknown;
        cx?: unknown;
        coordinates?: unknown;
        type?: unknown;
        parent?: unknown;
        point1?: unknown;
        point2?: unknown;
        isTextEdit?: unknown;
        playgroundIndex?: unknown;
        isTextEditFontSize?: unknown;
        isMoveRotateHandler?: unknown;
        strokeType?: unknown;
        strokeWidth?: unknown;
        isStrokeChange?: unknown;
        fill?: unknown;
      }>;
      canvasOption?: {
        scale?: unknown;
        moduleArr?: {
          Unit01?: { NO03FM?: unknown };
        };
      };
    };
    const denominatorThree = unitFractionBody.contentsJson?.find(
      (object) =>
        object.svgId === "NO03FM-08" &&
        object.count === 1 &&
        object.divider === 3
    );
    const expectedPerWidth = 640 / 3;
    const coordinates = denominatorThree?.coordinates;
    const fullThirds = fractionSetBody.contentsJson?.find(
      (object) =>
        object.svgId === "NO03FM-08" &&
        object.count === 3 &&
        object.divider === 3
    );
    const fullCoordinates = fullThirds?.coordinates;
    const drawElement = fractionSetBody.contentsJson?.find(
      (object) => object.svgId === "drawElem" && object.type === "rect"
    );
    const inputText = fractionSetBody.contentsJson?.find(
      (object) => object.svgId === "input-text"
    );
    const mathLatex = fractionSetBody.contentsJson?.find(
      (object) => object.svgId === "math-latex"
    );
    if (
      denominatorThree?.defaultWidth !== 640 ||
      denominatorThree.height !== 80 ||
      denominatorThree.width !== Math.round(expectedPerWidth) ||
      denominatorThree.cx !== 0 ||
      denominatorThree.isMoveRotateHandler !== true ||
      typeof denominatorThree.perWidth !== "number" ||
      Math.abs(denominatorThree.perWidth - expectedPerWidth) > 0.001 ||
      !Array.isArray(coordinates) ||
      !Array.isArray(coordinates[0]) ||
      typeof coordinates[0][0] !== "number" ||
      Math.abs(coordinates[0][0] + expectedPerWidth / 2) > 0.001 ||
      fullThirds?.width !== 640 ||
      fullThirds.height !== 80 ||
      fullThirds.defaultWidth !== 640 ||
      typeof fullThirds.perWidth !== "number" ||
      Math.abs(fullThirds.perWidth - expectedPerWidth) > 0.001 ||
      typeof fullThirds?.cx !== "number" ||
      Math.abs(fullThirds.cx - expectedPerWidth) > 0.001 ||
      fullThirds.isMoveRotateHandler !== true ||
      !Array.isArray(fullCoordinates) ||
      !Array.isArray(fullCoordinates[1]) ||
      typeof fullCoordinates[1][0] !== "number" ||
      Math.abs(fullCoordinates[1][0] - (640 - expectedPerWidth / 2)) >
        0.001 ||
      fractionSetBody.canvasOption?.scale !== 5 ||
      fractionSetBody.canvasOption?.moduleArr?.Unit01?.NO03FM !== true ||
      !drawElement ||
      !Array.isArray(drawElement.point1) ||
      !Array.isArray(drawElement.point2) ||
      !Array.isArray(drawElement.coordinates) ||
      typeof drawElement.parent !== "object" ||
      "width" in drawElement ||
      "height" in drawElement ||
      drawElement.strokeType !== 1 ||
      drawElement.strokeWidth !== 2 ||
      drawElement.isStrokeChange !== true ||
      drawElement.isMoveRotateHandler !== false ||
      !inputText ||
      inputText.fill !== "#000000" ||
      inputText.isTextEdit !== true ||
      inputText.playgroundIndex !== 2 ||
      inputText.isMoveRotateHandler !== false ||
      !mathLatex ||
      mathLatex.parent !== null ||
      mathLatex.isTextEditFontSize !== true ||
      mathLatex.fill !== "transparent" ||
      mathLatex.isMoveRotateHandler !== false
    ) {
      return {
        state: "contract-mismatch",
        detailCode: "fraction-fixture-contract-mismatch"
      };
    }
    }

    const token = window.localStorage.getItem("accessToken");
    if (!token) return { state: "login-required" };
    const authResponse = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      cache: "no-store"
    });
    if (authResponse.status === 401 || authResponse.status === 403) {
      return { state: "login-required" };
    }
    if (!authResponse.ok) {
      return { state: "contract-mismatch", detailCode: "auth-api-failed" };
    }
    return { state: "ready" };
  } catch {
    return { state: "contract-mismatch", detailCode: "preflight-failed" };
  }
}

export async function createProjectInMathCanvas(
  payload: Record<string, unknown>,
  expectedPayloadHash: string
): Promise<
  | { ok: true; projectId: string }
  | { ok: false; errorCode: string; httpStatus?: number }
> {
  function canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          )
          .map(([key, child]) => [key, canonicalize(child)])
      );
    }
    return value;
  }
  async function digest(value: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(value)));
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  // chrome.scripting.executeScript는 이 함수를 직렬화하므로
  // background 모듈의 errorCodeForStatus를 클로저로 참조할 수 없습니다.
  function errorForStatus(status: number): string {
    return status === 400
      ? "contract-mismatch"
      : status === 401
        ? "login-required"
        : status === 403
          ? "permission-denied"
          : status >= 500
            ? "mathcanvas-unavailable"
            : "project-create-failed";
  }
  async function findExistingProject(
    token: string,
    projectTitle: string
  ): Promise<
    | { ok: true; projectId?: string }
    | { ok: false; errorCode: string; httpStatus?: number }
  > {
    try {
      const query = new URLSearchParams({
        projectTitle,
        offset: "1",
        limit: "16",
        sortCondition: "createdAt",
        sortOrder: "desc"
      });
      const response = await fetch(`/api/project?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) {
        return {
          ok: false,
          errorCode: errorForStatus(response.status),
          httpStatus: response.status
        };
      }
      const body = (await response.json()) as {
        list?: Array<{
          projectId?: unknown;
          projectTitle?: unknown;
        }>;
      };
      const exact = body.list?.find(
        (project) =>
          project.projectTitle === projectTitle &&
          typeof project.projectId === "string" &&
          /^[A-Za-z0-9_-]{1,160}$/.test(project.projectId)
      );
      return exact && typeof exact.projectId === "string"
        ? { ok: true, projectId: exact.projectId }
        : { ok: true };
    } catch {
      return { ok: false, errorCode: "mathcanvas-unavailable" };
    }
  }

  try {
    if ((await digest(payload)) !== expectedPayloadHash) {
      return { ok: false, errorCode: "payload-hash-mismatch" };
    }
    const projectTitle = payload.projectTitle;
    if (typeof projectTitle !== "string" || projectTitle.length === 0) {
      return { ok: false, errorCode: "contract-mismatch" };
    }
    const token = window.localStorage.getItem("accessToken");
    if (!token) return { ok: false, errorCode: "login-required" };
    const existing = await findExistingProject(token, projectTitle);
    if (!existing.ok) return existing;
    if (existing.projectId) {
      return { ok: true, projectId: existing.projectId };
    }
    const response = await fetch("/api/project", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        Authorization: `Bearer ${token}`
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      if (response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        const reconciled = await findExistingProject(token, projectTitle);
        if (reconciled.ok && reconciled.projectId) {
          return { ok: true, projectId: reconciled.projectId };
        }
      }
      return {
        ok: false,
        errorCode: errorForStatus(response.status),
        httpStatus: response.status
      };
    }
    const body = (await response.json()) as { projectId?: unknown };
    if (
      typeof body.projectId !== "string" ||
      !/^[A-Za-z0-9_-]{1,160}$/.test(body.projectId)
    ) {
      return { ok: false, errorCode: "contract-mismatch" };
    }
    return { ok: true, projectId: body.projectId };
  } catch {
    const projectTitle = payload.projectTitle;
    const token = window.localStorage.getItem("accessToken");
    if (typeof projectTitle === "string" && token) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      const reconciled = await findExistingProject(token, projectTitle);
      if (reconciled.ok && reconciled.projectId) {
        return { ok: true, projectId: reconciled.projectId };
      }
    }
    return { ok: false, errorCode: "mathcanvas-unavailable" };
  }
}

async function inspectConnection(
  state: StoredState,
  forceFullContractCheck = false
): Promise<{
  heartbeat: ExtensionHeartbeat;
  tab?: chrome.tabs.Tab;
}> {
  if (!state.pairingSecret || !/^[a-f0-9]{64}$/.test(state.pairingSecret)) {
    return {
      heartbeat: {
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        instanceId: state.instanceId,
        extensionVersion: EXTENSION_VERSION,
        state: "bridge-not-paired",
        checkedAt: new Date().toISOString()
      }
    };
  }

  const tabs = await chrome.tabs.query({
    url: "https://mathcanvas.vivasam.com/ko/*"
  });
  const tab = tabs.find((candidate) => candidate.id !== undefined);
  if (!tab?.id || !tab.url) {
    return {
      heartbeat: {
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        instanceId: state.instanceId,
        extensionVersion: EXTENSION_VERSION,
        state: "mathcanvas-tab-missing",
        checkedAt: new Date().toISOString()
      }
    };
  }

  const now = new Date();
  const recentFullContractFailure =
    state.lastFullContractFailure &&
    shouldUseContractFailureBackoff(
      state.lastFullContractFailure.checkedAt,
      now,
      forceFullContractCheck
    )
      ? state.lastFullContractFailure
      : undefined;
  if (recentFullContractFailure) {
    return {
      tab,
      heartbeat: {
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        instanceId: state.instanceId,
        extensionVersion: EXTENSION_VERSION,
        state: "contract-mismatch",
        checkedAt: now.toISOString(),
        mathCanvasTabUrl: tab.url,
        detailCode: recentFullContractFailure.detailCode
      }
    };
  }
  const fullContractCheckDue = shouldRunFullContractCheck(
    state.lastFullContractCheckAt,
    now,
    forceFullContractCheck
  );
  const execution = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: inspectMathCanvasPage,
    args: [fullContractCheckDue]
  });
  const inspection = execution[0]?.result as PageInspection | undefined;
  const stateValue = inspection?.state ?? "contract-mismatch";
  if (stateValue === "ready" && fullContractCheckDue) {
    state.lastFullContractCheckAt = now.toISOString();
    await chrome.storage.local.set({
      lastFullContractCheckAt: state.lastFullContractCheckAt
    });
    await chrome.storage.local.remove("lastFullContractFailure");
    delete state.lastFullContractFailure;
  } else if (stateValue === "contract-mismatch" && fullContractCheckDue) {
    state.lastFullContractFailure = {
      checkedAt: now.toISOString(),
      detailCode: inspection?.detailCode ?? "preflight-failed"
    };
    await chrome.storage.local.set({
      lastFullContractFailure: state.lastFullContractFailure
    });
  }
  return {
    tab,
    heartbeat: {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      instanceId: state.instanceId,
      extensionVersion: EXTENSION_VERSION,
      state: stateValue,
      checkedAt: new Date().toISOString(),
      mathCanvasTabUrl: tab.url,
      ...(stateValue === "ready" ? { contractVersion: "1.0.0" as const } : {}),
      ...(inspection?.detailCode ? { detailCode: inspection.detailCode } : {})
    }
  };
}

async function postHeartbeat(
  heartbeat: ExtensionHeartbeat,
  state: StoredState
): Promise<void> {
  await bridgeFetch("/bridge/v1/heartbeat", state, {
    method: "POST",
    body: JSON.stringify(heartbeat)
  });
}

async function storeCompletedResult(
  state: StoredState,
  result: ExtensionJobResult
): Promise<void> {
  const next = { ...state.completedResults, [result.jobId]: result };
  const entries = Object.entries(next)
    .sort(
      (left, right) =>
        Date.parse(right[1].completedAt) - Date.parse(left[1].completedAt)
    )
    .slice(0, 50);
  state.completedResults = Object.fromEntries(entries);
  await chrome.storage.local.set({ completedResults: state.completedResults });
}

async function postResult(
  state: StoredState,
  result: ExtensionJobResult
): Promise<void> {
  await bridgeFetch(`/bridge/v1/jobs/${result.jobId}/result`, state, {
    method: "POST",
    body: JSON.stringify(result)
  });
}

async function executeJob(
  job: QueuedCreation,
  tab: chrome.tabs.Tab,
  state: StoredState
): Promise<void> {
  const cached = state.completedResults[job.jobId];
  if (cached) {
    await postResult(state, cached);
    return;
  }
  if (
    job.compiledProject.contractVersion !== "1.0.0" ||
    job.compiledProject.payloadHash !== job.payloadHash ||
    (await sha256Canonical(job.compiledProject.payload)) !== job.payloadHash
  ) {
    const result: ExtensionJobResult = {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      jobId: job.jobId,
      instanceId: state.instanceId,
      payloadHash: job.payloadHash,
      ok: false,
      completedAt: new Date().toISOString(),
      errorCode: "payload-hash-mismatch"
    };
    await storeCompletedResult(state, result);
    await postResult(state, result);
    return;
  }
  if (!tab.id) throw new Error("mathcanvas-tab-missing");

  const execution = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: createProjectInMathCanvas,
    args: [job.compiledProject.payload, job.payloadHash]
  });
  const pageResult = execution[0]?.result as
    | Awaited<ReturnType<typeof createProjectInMathCanvas>>
    | undefined;
  let result: ExtensionJobResult;
  if (pageResult?.ok) {
    const editorUrl = `https://mathcanvas.vivasam.com/ko/view/${pageResult.projectId}`;
    result = {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      jobId: job.jobId,
      instanceId: state.instanceId,
      payloadHash: job.payloadHash,
      ok: true,
      completedAt: new Date().toISOString(),
      projectId: pageResult.projectId,
      editorUrl
    };
    await storeCompletedResult(state, result);
    await chrome.tabs.create({ url: editorUrl, active: true });
  } else {
    const errorCode =
      pageResult?.errorCode ??
      errorCodeForStatus(pageResult?.httpStatus ?? 500);
    result = {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      jobId: job.jobId,
      instanceId: state.instanceId,
      payloadHash: job.payloadHash,
      ok: false,
      completedAt: new Date().toISOString(),
      errorCode,
      ...(pageResult?.httpStatus
        ? { httpStatus: pageResult.httpStatus }
        : {})
    };
    await storeCompletedResult(state, result);
  }
  await postResult(state, result);
}

async function poll(forceFullContractCheck = false): Promise<void> {
  if (polling) return;
  polling = true;
  try {
    const state = await loadState();
    const connection = await inspectConnection(
      state,
      forceFullContractCheck
    );
    if (connection.heartbeat.state === "bridge-not-paired") return;
    try {
      await postHeartbeat(connection.heartbeat, state);
      if (connection.heartbeat.state !== "ready" || !connection.tab) return;
      const response = await bridgeFetch("/bridge/v1/jobs/next", state);
      if (!response.ok) return;
      const body = (await response.json()) as {
        job?: QueuedCreation | null;
      };
      if (body.job) {
        const freshConnection = await inspectConnection(state, true);
        if (
          freshConnection.heartbeat.state === "ready" &&
          freshConnection.tab
        ) {
          await executeJob(body.job, freshConnection.tab, state);
        } else {
          const errorCode =
            freshConnection.heartbeat.state === "login-required"
              ? "login-required"
              : freshConnection.heartbeat.state ===
                    "mathcanvas-tab-missing"
                ? "mathcanvas-tab-missing"
                : "contract-mismatch";
          const result: ExtensionJobResult = {
            protocolVersion: BRIDGE_PROTOCOL_VERSION,
            jobId: body.job.jobId,
            instanceId: state.instanceId,
            payloadHash: body.job.payloadHash,
            ok: false,
            completedAt: new Date().toISOString(),
            errorCode
          };
          await storeCompletedResult(state, result);
          await postResult(state, result);
        }
      }
    } catch {
      // 로컬 서버가 꺼진 상태는 다음 알람에서 다시 확인합니다.
    }
  } finally {
    polling = false;
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(async () => {
    await chrome.alarms.create(pollAlarm, { periodInMinutes: 1 });
    const state = await loadState();
    if (!state.pairingSecret) await chrome.runtime.openOptionsPage();
    await poll(true);
  });

  chrome.runtime.onStartup.addListener(async () => {
    await chrome.alarms.create(pollAlarm, { periodInMinutes: 1 });
    await poll(true);
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === pollAlarm) await poll();
  });

  chrome.action.onClicked.addListener(async () => {
    await poll(true);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "poll-now") return false;
    void poll(true).then(
      () => sendResponse({ ok: true }),
      () => sendResponse({ ok: false })
    );
    return true;
  });

  void poll(true);
}
