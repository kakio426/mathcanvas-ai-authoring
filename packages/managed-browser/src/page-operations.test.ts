import { afterEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "@mathcanvas/contracts";
import {
  createProjectInMathCanvas,
  inspectMathCanvasPage
} from "./page-operations.js";

const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow
  });
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function installWindow(token: string | null) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { origin: "https://mathcanvas.vivasam.com" },
      localStorage: {
        getItem: (key: string) =>
          key === "accessToken" ? token : null
      }
    }
  });
}

const fractionSvgByDenominator: Record<number, string> = {
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

function fullFractionObject(denominator: number) {
  const perWidth = 640 / denominator;
  return {
    svgId: fractionSvgByDenominator[denominator],
    count: denominator,
    divider: denominator,
    defaultWidth: 640,
    width: 640,
    height: 80,
    perWidth,
    cx: (640 - perWidth) / 2,
    coordinates: [
      [-perWidth / 2, -40],
      [640 - perWidth / 2, -40],
      [640 - perWidth / 2, 40],
      [-perWidth / 2, 40]
    ],
    isMoveRotateHandler: true
  };
}

function installStaticContractFetch(options: {
  token: string | null;
  denominatorTwelveSvgId?: string;
}) {
  installWindow(options.token);
  globalThis.fetch = vi.fn(async (url: string | URL) => {
    const pathname = String(url);
    if (pathname === "/api/project-category") {
      return new Response(
        JSON.stringify({
          list: [{ categoryId: "rJa0d46MAy", categoryName: "수와 연산" }]
        }),
        { status: 200 }
      );
    }
    if (pathname === "/api/public-project/P_CsJeiL") {
      return new Response(
        JSON.stringify({
          contentsJson: [
            {
              ...fullFractionObject(3),
              count: 1,
              width: Math.round(640 / 3),
              cx: 0,
              coordinates: [
                [-640 / 6, -40],
                [640 / 6, -40],
                [640 / 6, 40],
                [-640 / 6, 40]
              ]
            }
          ]
        }),
        { status: 200 }
      );
    }
    if (pathname === "/api/public-project/P_yK4Aa6XomJ") {
      const fractions = Array.from({ length: 12 }, (_, index) =>
        fullFractionObject(index + 1)
      );
      if (options.denominatorTwelveSvgId) {
        fractions[11] = {
          ...fractions[11]!,
          svgId: options.denominatorTwelveSvgId
        };
      }
      return new Response(
        JSON.stringify({
          contentsJson: [
            ...fractions,
            {
              svgId: "drawElem",
              type: "rect",
              point1: [0, 0],
              point2: [100, 100],
              coordinates: [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100]
              ],
              parent: {},
              strokeType: 1,
              strokeWidth: 2,
              isStrokeChange: true,
              isMoveRotateHandler: false
            },
            {
              svgId: "input-text",
              fill: "#000000",
              isTextEdit: true,
              playgroundIndex: 2,
              isMoveRotateHandler: false
            },
            {
              svgId: "math-latex",
              parent: null,
              isTextEditFontSize: true,
              fill: "transparent",
              isMoveRotateHandler: false
            }
          ],
          canvasOption: {
            scale: 5,
            moduleArr: { Unit01: { NO03FM: true } }
          }
        }),
        { status: 200 }
      );
    }
    if (pathname === "/api/auth/me") {
      return new Response(JSON.stringify({ userId: "teacher" }), {
        status: 200
      });
    }
    return new Response("", { status: 404 });
  }) as typeof fetch;
}

describe("페이지 컨텍스트 작업", () => {
  it("Bearer 토큰이 없어도 cookie 인증을 검사하고 미인증만 차단한다", async () => {
    installWindow(null);
    globalThis.fetch = vi.fn(
      async () => new Response("", { status: 401 })
    ) as typeof fetch;
    await expect(inspectMathCanvasPage(false)).resolves.toEqual({
      state: "login-required",
      detailCode: "auth-required"
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    globalThis.fetch = vi.fn(
      async () => new Response("{}", { status: 200 })
    ) as typeof fetch;
    await expect(inspectMathCanvasPage(false)).resolves.toEqual({
      state: "ready"
    });
  });

  it("토큰은 페이지 안에서만 사용하고 프로젝트 ID만 반환한다", async () => {
    installWindow("secret-browser-token");
    const payload = {
      projectTitle: "분수 비교 활동지",
      contentsJson: []
    };
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      requests.push({ url: String(url), ...(init ? { init } : {}) });
      if (String(url).startsWith("/api/project?")) {
        return new Response(JSON.stringify({ list: [] }), { status: 200 });
      }
      if (String(url) === "/api/project") {
        return new Response(JSON.stringify({ projectId: "P_created" }), {
          status: 200
        });
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;

    const result = await createProjectInMathCanvas({
      payload,
      expectedPayloadHash: sha256Hex(payload)
    });
    expect(result).toEqual({ ok: true, projectId: "P_created" });
    expect(JSON.stringify(result)).not.toContain("secret-browser-token");
    expect(requests).toHaveLength(2);
    expect(
      new Headers(requests[1]?.init?.headers).get("Authorization")
    ).toBe("Bearer secret-browser-token");
    expect(requests[1]?.init?.method).toBe("POST");

    installWindow(null);
    requests.length = 0;
    globalThis.fetch = vi.fn(
      async (url: string | URL, init?: RequestInit) => {
        requests.push({ url: String(url), ...(init ? { init } : {}) });
        return String(url).startsWith("/api/project?")
          ? new Response(JSON.stringify({ list: [] }), { status: 200 })
          : new Response(JSON.stringify({ projectId: "P_cookie" }), {
              status: 200
            });
      }
    ) as typeof fetch;
    await expect(
      createProjectInMathCanvas({
        payload,
        expectedPayloadHash: sha256Hex(payload)
      })
    ).resolves.toEqual({ ok: true, projectId: "P_cookie" });
    expect(
      new Headers(requests[1]?.init?.headers).has("Authorization")
    ).toBe(false);
  });

  it("분모 1~12 전체와 기본 객체 계약이 맞으면 연결 준비를 반환한다", async () => {
    installStaticContractFetch({ token: "browser-token" });
    await expect(inspectMathCanvasPage(true)).resolves.toEqual({
      state: "ready"
    });

    const visited: string[] = [];
    installWindow("browser-token");
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const path = String(url);
      visited.push(path);
      if (path === "/api/auth/me") {
        return new Response("{}", { status: 200 });
      }
      if (path === "/api/project-category") {
        return new Response(
          JSON.stringify({
            list: [
              {
                categoryId: "rJa0d46MAy",
                categoryName: "수와 연산"
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (path.startsWith("/api/project?")) {
        return new Response(
          JSON.stringify({
            list: [
              {
                projectId: "P_owned_probe",
                projectTitle: "수 카드로 만든 기존 활동"
              },
              {
                projectId: "P_owned_common",
                projectTitle: "AI-CONTRACT-PROBE-P3-COMMON"
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (path === "/api/project/P_owned_probe") {
        return new Response(
          JSON.stringify({
            contentsJson: [
              ...Array.from({ length: 10 }, (_, index) => ({
                svgId: `NO04NT-${String(index + 1).padStart(2, "0")}`,
                fill: "#2194FF",
                numberFrameSnap: true,
                parent: { variation: 25 },
                coordinates: [
                  [-40, -40],
                  [40, -40],
                  [40, 40],
                  [-40, 40]
                ]
              })),
              { svgId: "SM02AD-01" }
            ],
            canvasOption: {
              moduleArr: {
                Unit01: { NO04NT: true },
                Unit03: { SM02AD: true }
              }
            }
          }),
          { status: 200 }
        );
      }
      if (path === "/api/project/P_owned_common") {
        return new Response(
          JSON.stringify({
            contentsJson: [{ svgId: "input-text" }],
            canvasOption: {
              moduleArr: { Unit01: {} }
            }
          }),
          { status: 200 }
        );
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;
    await expect(
      inspectMathCanvasPage({
        verifyStaticContract: true,
        requiredModules: ["NO04NT", "SM02AD", "input-text"]
      })
    ).resolves.toEqual({ state: "ready" });
    expect(visited.some((path) => path.startsWith("/api/public-project/")))
      .toBe(false);
  });

  it("분모 12의 SVG ID가 바뀌면 쓰기 전에 계약 불일치로 중단한다", async () => {
    installStaticContractFetch({
      token: "browser-token",
      denominatorTwelveSvgId: "NO03FM-unknown"
    });
    await expect(inspectMathCanvasPage(true)).resolves.toEqual({
      state: "contract-mismatch",
      detailCode: "contract-mismatch"
    });

    const visited: string[] = [];
    installWindow("browser-token");
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const path = String(url);
      visited.push(path);
      if (path === "/api/auth/me") {
        return new Response("{}", { status: 200 });
      }
      if (path === "/api/project-category") {
        return new Response(
          JSON.stringify({
            list: [
              {
                categoryId: "rJa0d46MAy",
                categoryName: "수와 연산"
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (path.startsWith("/api/project?")) {
        return new Response(JSON.stringify({ list: [] }), {
          status: 200
        });
      }
      throw new Error(`unexpected fallback: ${path}`);
    }) as typeof fetch;
    await expect(
      inspectMathCanvasPage({
        verifyStaticContract: true,
        requiredModules: ["NO04NT"]
      })
    ).resolves.toEqual({
      state: "contract-mismatch",
      detailCode: "contract-probe-unavailable"
    });
    expect(
      visited.some((path) => path.startsWith("/api/public-project/"))
    ).toBe(false);

    globalThis.fetch = vi.fn(async () => new Response("", { status: 500 }));
    await expect(inspectMathCanvasPage(true)).resolves.toEqual({
      state: "contract-mismatch",
      detailCode: "contract-probe-unavailable"
    });
  });
});
