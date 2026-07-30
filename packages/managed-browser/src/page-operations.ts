export interface PageInspection {
  state: "login-required" | "contract-mismatch" | "ready";
  detailCode?: string;
}

export interface PageInspectionInput {
  verifyStaticContract?: boolean;
  requiredModules?: string[];
}

export async function inspectMathCanvasPage(
  input: boolean | PageInspectionInput = true
): Promise<PageInspection> {
  const options =
    typeof input === "boolean"
      ? { verifyStaticContract: input }
      : input;
  const verifyStaticContract = options.verifyStaticContract ?? true;
  const requiredModules =
    options.requiredModules?.length
      ? [...new Set(options.requiredModules)]
      : ["NO03FM", "input-text", "math-latex", "drawElem"];
  const headers = (token: string | null) =>
    token ? { Authorization: `Bearer ${token}` } : {};
  const creatorContractMatches = (
    body: {
      contentsJson?: Array<Record<string, unknown>>;
      canvasOption?: {
        moduleArr?: { Unit01?: Record<string, unknown> };
      };
    },
    modules: readonly string[]
  ): boolean => {
    const objects = body.contentsJson ?? [];
    const enabled = body.canvasOption?.moduleArr?.Unit01 ?? {};
    const expectedFractionSvgByDenominator: Record<number, string> = {
      1: "NO03FM-10",
      2: "NO03FM-09",
      3: "NO03FM-08",
      4: "NO03FM-07",
      5: "NO03FM-06",
      6: "NO03FM-05",
      7: "NO03FM-04",
      8: "NO03FM-03",
      9: "NO03FM-02",
      10: "NO03FM-01",
      11: "NO03FM-21",
      12: "NO03FM-22"
    };
    return modules.every((module) => {
      if (module === "NO03FM") {
        if (enabled.NO03FM !== true) return false;
        const fractions = objects.filter(
          (object) =>
            typeof object.divider === "number" &&
            typeof object.count === "number"
        );
        return (
          fractions.length > 0 &&
          fractions.every((object) => {
            const denominator = Number(object.divider);
            return (
              object.svgId ===
                expectedFractionSvgByDenominator[denominator] &&
              typeof object.defaultWidth === "number" &&
              typeof object.perWidth === "number" &&
              object.isMoveRotateHandler === true
            );
          })
        );
      }
      if (module === "NO04NT") {
        if (enabled.NO04NT !== true) return false;
        const cards = objects.filter(
          (object) =>
            typeof object.svgId === "string" &&
            /^NO04NT-(0[1-9]|10)$/.test(object.svgId)
        );
        return (
          new Set(cards.map((card) => card.svgId)).size === 10 &&
          cards.every(
            (card) =>
              card.fill === "#2194FF" &&
              card.numberFrameSnap === true &&
              typeof card.parent === "object" &&
              card.parent !== null &&
              (card.parent as Record<string, unknown>).variation === 25 &&
              Array.isArray(card.coordinates) &&
              card.coordinates.length === 4
          )
        );
      }
      return objects.some((object) => object.svgId === module);
    });
  };

  try {
    if (window.location.origin !== "https://mathcanvas.vivasam.com") {
      return { state: "login-required", detailCode: "auth-required" };
    }

    const token = window.localStorage.getItem("accessToken");
    const authResponse = await fetch("/api/auth/me", {
      headers: headers(token),
      credentials: "include",
      cache: "no-store"
    });
    if (authResponse.status === 401 || authResponse.status === 403) {
      return { state: "login-required", detailCode: "auth-required" };
    }
    if (!authResponse.ok) {
      return {
        state: "contract-mismatch",
        detailCode: "contract-probe-unavailable"
      };
    }

    if (verifyStaticContract) {
      const categoryResponse = await fetch("/api/project-category", {
        headers: headers(token),
        credentials: "include",
        cache: "no-store"
      });
      if (!categoryResponse.ok) {
        return {
          state: "contract-mismatch",
          detailCode: "contract-probe-unavailable"
        };
      }
      const categoryBody = (await categoryResponse.json()) as {
        list?: Array<{ categoryId?: string; categoryName?: string }>;
      };
      if (
        !categoryBody.list?.some(
          (category) =>
            category.categoryId === "rJa0d46MAy" &&
            category.categoryName === "수와 연산"
        )
      ) {
        return {
          state: "contract-mismatch",
          detailCode: "contract-mismatch"
        };
      }

      const query = new URLSearchParams({
        projectTitle: "AI-CONTRACT-PROBE",
        offset: "1",
        limit: "100",
        sortCondition: "createdAt",
        sortOrder: "desc"
      });
      const ownedResponse = await fetch(`/api/project?${query.toString()}`, {
        headers: headers(token),
        credentials: "include",
        cache: "no-store"
      });
      if (ownedResponse.ok) {
        const ownedBody = (await ownedResponse.json()) as {
          list?: Array<{
            projectId?: unknown;
            projectTitle?: unknown;
          }>;
        };
        const candidates =
          ownedBody.list?.filter(
            (project) =>
              typeof project.projectId === "string" &&
              typeof project.projectTitle === "string" &&
              project.projectTitle.startsWith("AI-CONTRACT-PROBE")
          ) ?? [];
        const verifiedCreatorModules = new Set<string>();
        for (const candidate of candidates) {
          const detailResponse = await fetch(
            `/api/project/${encodeURIComponent(String(candidate.projectId))}`,
            {
              headers: headers(token),
              credentials: "include",
              cache: "no-store"
            }
          );
          if (!detailResponse.ok) continue;
          const detail = (await detailResponse.json()) as {
            contentsJson?: Array<Record<string, unknown>>;
            canvasOption?: {
              moduleArr?: { Unit01?: Record<string, unknown> };
            };
          };
          for (const module of requiredModules) {
            if (creatorContractMatches(detail, [module])) {
              verifiedCreatorModules.add(module);
            }
          }
          if (
            requiredModules.every((module) =>
              verifiedCreatorModules.has(module)
            )
          ) {
            return { state: "ready" };
          }
        }
      }

      const publicFallbackModules = new Set([
        "NO03FM",
        "input-text",
        "math-latex",
        "drawElem"
      ]);
      if (
        requiredModules.some(
          (module) => !publicFallbackModules.has(module)
        )
      ) {
        return {
          state: "contract-mismatch",
          detailCode: "contract-probe-unavailable"
        };
      }

      const fixtureResponses = await Promise.all(
        [
          "/api/public-project/P_CsJeiL",
          "/api/public-project/P_yK4Aa6XomJ"
        ].map((url) => fetch(url, { cache: "no-store" }))
      );
      const unitFractionResponse = fixtureResponses[0];
      const fractionSetResponse = fixtureResponses[1];
      if (
        !unitFractionResponse ||
        !fractionSetResponse ||
        !unitFractionResponse.ok ||
        !fractionSetResponse.ok
      ) {
        return {
          state: "contract-mismatch",
          detailCode: "contract-probe-unavailable"
        };
      }

      const unitFractionBody = (await unitFractionResponse.json()) as {
        contentsJson?: Array<Record<string, unknown>>;
      };
      const fractionSetBody = (await fractionSetResponse.json()) as {
        contentsJson?: Array<Record<string, unknown>>;
        canvasOption?: {
          scale?: unknown;
          moduleArr?: { Unit01?: { NO03FM?: unknown } };
        };
      };
      const expectedFractionSvgByDenominator: Record<number, string> = {
        1: "NO03FM-10",
        2: "NO03FM-09",
        3: "NO03FM-08",
        4: "NO03FM-07",
        5: "NO03FM-06",
        6: "NO03FM-05",
        7: "NO03FM-04",
        8: "NO03FM-03",
        9: "NO03FM-02",
        10: "NO03FM-01",
        11: "NO03FM-21",
        12: "NO03FM-22"
      };
      const fractionObjects = fractionSetBody.contentsJson?.filter(
        (object) => typeof object.divider === "number"
      );
      const allFractionDenominatorsMatch = Object.entries(
        expectedFractionSvgByDenominator
      ).every(([denominatorText, expectedSvgId]) => {
        const denominator = Number(denominatorText);
        const object = fractionObjects?.find(
          (candidate) => candidate.divider === denominator
        );
        return (
          object?.svgId === expectedSvgId &&
          object.count === denominator &&
          object.defaultWidth === 640 &&
          object.width === 640 &&
          object.height === 80 &&
          typeof object.perWidth === "number" &&
          Math.abs(object.perWidth - 640 / denominator) < 0.001 &&
          object.isMoveRotateHandler === true
        );
      });
      const denominatorThree = unitFractionBody.contentsJson?.find(
        (object) =>
          object.svgId === "NO03FM-08" &&
          object.count === 1 &&
          object.divider === 3
      );
      const fullThirds = fractionSetBody.contentsJson?.find(
        (object) =>
          object.svgId === "NO03FM-08" &&
          object.count === 3 &&
          object.divider === 3
      );
      const drawElement = fractionSetBody.contentsJson?.find(
        (object) => object.svgId === "drawElem" && object.type === "rect"
      );
      const inputText = fractionSetBody.contentsJson?.find(
        (object) => object.svgId === "input-text"
      );
      const mathLatex = fractionSetBody.contentsJson?.find(
        (object) => object.svgId === "math-latex"
      );
      const expectedPerWidth = 640 / 3;
      const coordinates = denominatorThree?.coordinates;
      const fullCoordinates = fullThirds?.coordinates;

      if (
        fractionObjects?.length !== 12 ||
        !allFractionDenominatorsMatch ||
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
        typeof fullThirds.cx !== "number" ||
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
        drawElement.parent === null ||
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
          detailCode: "contract-mismatch"
        };
      }
    }
    return { state: "ready" };
  } catch {
    return {
      state: "contract-mismatch",
      detailCode: "contract-probe-unavailable"
    };
  }
}

export interface PageCreationInput {
  payload: Record<string, unknown>;
  expectedPayloadHash: string;
}

export type PageCreationResult =
  | { ok: true; projectId: string }
  | { ok: false; errorCode: string; httpStatus?: number };

export async function createProjectInMathCanvas({
  payload,
  expectedPayloadHash
}: PageCreationInput): Promise<PageCreationResult> {
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
    const bytes = new TextEncoder().encode(
      JSON.stringify(canonicalize(value))
    );
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
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
    token: string | null,
    projectTitle: string
  ): Promise<
    | { ok: true; projectId?: string }
    | { ok: false; errorCode: string; httpStatus?: number }
  > {
    try {
      const query = new URLSearchParams({
        projectTitle,
        offset: "1",
        limit: "100",
        sortCondition: "createdAt",
        sortOrder: "desc"
      });
      const response = await fetch(`/api/project?${query.toString()}`, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
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
        list?: Array<{ projectId?: unknown; projectTitle?: unknown }>;
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
    const existing = await findExistingProject(token, projectTitle);
    if (!existing.ok) return existing;
    if (existing.projectId) {
      return { ok: true, projectId: existing.projectId };
    }

    const response = await fetch("/api/project", {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {})
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
