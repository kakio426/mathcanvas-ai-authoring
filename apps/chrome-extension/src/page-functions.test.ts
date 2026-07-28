import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { sha256Canonical } from "./shared.js";
import {
  createProjectInMathCanvas,
  inspectMathCanvasPage,
  shouldRunFullContractCheck,
  shouldUseContractFailureBackoff
} from "./background.js";

const nativeContract = JSON.parse(
  readFileSync(
    new URL(
      "../../../fixtures/mathcanvas/native-object-contract.json",
      import.meta.url
    ),
    "utf8"
  )
) as {
  unitThird: Record<string, unknown>;
  fractionThirds: Record<string, unknown>;
  drawRectangle: Record<string, unknown>;
  inputText: Record<string, unknown>;
  mathLatex: Record<string, unknown>;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function loginWith(token = "page-only-token"): void {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key === "accessToken" ? token : null)
    }
  });
}

describe("MathCanvas MAIN-world 함수", () => {
  it("전체 계약 캐시와 실패 백오프 시간을 경계값대로 계산한다", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    expect(
      shouldRunFullContractCheck(
        "2026-07-28T06:00:00.000Z",
        now,
        false
      )
    ).toBe(true);
    expect(
      shouldRunFullContractCheck(
        "2026-07-28T06:00:01.000Z",
        now,
        false
      )
    ).toBe(false);
    expect(
      shouldUseContractFailureBackoff(
        "2026-07-28T11:45:01.000Z",
        now,
        false
      )
    ).toBe(true);
    expect(
      shouldUseContractFailureBackoff(
        "2026-07-28T11:45:00.000Z",
        now,
        false
      )
    ).toBe(false);
    expect(
      shouldUseContractFailureBackoff(
        "2026-07-28T11:59:59.000Z",
        now,
        true
      )
    ).toBe(false);
  });

  it("카테고리·분수 fixture·로그인이 모두 맞아야 ready다", async () => {
    loginWith();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          list: [
            { categoryId: "rJa0d46MAy", categoryName: "수와 연산" }
          ]
        })
      )
      .mockResolvedValueOnce(
        response({
          contentsJson: [
            nativeContract.unitThird
          ]
        })
      )
      .mockResolvedValueOnce(
        response({
          contentsJson: [
            {
              ...nativeContract.fractionThirds
            },
            {
              ...nativeContract.drawRectangle,
              parent: {},
              point1: [0, 0],
              point2: [100, 100],
              coordinates: [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100]
              ]
            },
            nativeContract.inputText,
            nativeContract.mathLatex
          ],
          canvasOption: {
            scale: 5,
            moduleArr: { Unit01: { NO03FM: true } }
          }
        })
      )
      .mockResolvedValueOnce(response({ userNo: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectMathCanvasPage();
    expect(result).toEqual({ state: "ready" });
    expect(JSON.stringify(result)).not.toContain("page-only-token");
    expect(
      JSON.stringify(await inspectNonSensitiveCallShape(fetchMock))
    ).not.toContain("page-only-token");
  });

  it("공개 분수 fixture 좌표가 달라지면 로그인 호출 전에 멈춘다", async () => {
    loginWith();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          list: [
            { categoryId: "rJa0d46MAy", categoryName: "수와 연산" }
          ]
        })
      )
      .mockResolvedValueOnce(
        response({
          contentsJson: [
            {
              ...nativeContract.unitThird,
              coordinates: [[0, -40]]
            }
          ]
        })
      )
      .mockResolvedValueOnce(response({ contentsJson: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(inspectMathCanvasPage()).resolves.toEqual({
      state: "contract-mismatch",
      detailCode: "fraction-fixture-contract-mismatch"
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/auth/me")).toBe(
      false
    );
  });

  it("최근 계약 검사가 있으면 공개 fixture를 다시 받지 않고 로그인만 확인한다", async () => {
    loginWith();
    const fetchMock = vi.fn().mockResolvedValueOnce(
      response({ userNo: 1 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(inspectMathCanvasPage(false)).resolves.toEqual({
      state: "ready"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/me");
  });

  it("같은 고유 제목의 프로젝트가 있으면 POST하지 않고 재사용한다", async () => {
    loginWith();
    const payload = {
      projectTitle: "분수 띠로 크기 비교하기 [AI-ABCDEF123456]",
      contentsJson: []
    };
    const hash = await sha256Canonical(payload);
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        list: [
          {
            projectId: "P_existing",
            projectTitle: payload.projectTitle
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createProjectInMathCanvas(payload, hash)
    ).resolves.toEqual({ ok: true, projectId: "P_existing" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/project?");
    const lookupUrl = new URL(
      String(fetchMock.mock.calls[0]?.[0]),
      "https://mathcanvas.vivasam.com"
    );
    expect(lookupUrl.searchParams.get("offset")).toBe("1");
    expect(lookupUrl.searchParams.get("limit")).toBe("16");
    expect(lookupUrl.searchParams.get("sortCondition")).toBe("createdAt");
    expect(lookupUrl.searchParams.get("sortOrder")).toBe("desc");
  });

  it("기존 결과가 없을 때만 새 프로젝트 POST를 한 번 보낸다", async () => {
    loginWith();
    const payload = {
      projectTitle: "분수 띠로 크기 비교하기 [AI-123456ABCDEF]",
      contentsJson: []
    };
    const hash = await sha256Canonical(payload);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ list: [] }))
      .mockResolvedValueOnce(response({ projectId: "P_created" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createProjectInMathCanvas(payload, hash)
    ).resolves.toEqual({ ok: true, projectId: "P_created" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/project");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
  });
});

async function inspectNonSensitiveCallShape(
  fetchMock: ReturnType<typeof vi.fn>
): Promise<unknown[]> {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url,
    headers:
      init && typeof init === "object" && "headers" in init
        ? "[page-local-headers]"
        : undefined
  }));
}
