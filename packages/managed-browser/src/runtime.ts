import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { sha256Hex } from "@mathcanvas/contracts";
import {
  createProjectInMathCanvas,
  inspectMathCanvasPage,
  type PageCreationResult,
  type PageInspection,
  type PageInspectionInput
} from "./page-operations.js";
import {
  MANAGED_BROWSER_VERSION,
  MATHCANVAS_HOME_URL,
  MATHCANVAS_ORIGIN,
  browserConnectionSchema,
  creationResultSchema,
  type BrowserConnection,
  type CreationResult,
  type MathCanvasBrowserRuntime
} from "./types.js";

export interface ManagedPage {
  url(): string;
  goto(
    url: string,
    options?: { waitUntil?: "domcontentloaded"; timeout?: number }
  ): Promise<unknown>;
  bringToFront(): Promise<void>;
  evaluate<R, A>(pageFunction: (argument: A) => Promise<R>, argument: A): Promise<R>;
  isClosed(): boolean;
}

export interface ManagedContext {
  pages(): ManagedPage[];
  newPage(): Promise<ManagedPage>;
  close(): Promise<void>;
  on(event: "close", listener: () => void): unknown;
}

export type PersistentContextLauncher = (
  userDataDirectory: string
) => Promise<ManagedContext>;

function launchChrome(
  userDataDirectory: string,
  options: { headless: boolean; launchArguments: string[] }
): Promise<ManagedContext> {
  return chromium.launchPersistentContext(userDataDirectory, {
    channel: "chrome",
    headless: options.headless,
    viewport: options.headless ? { width: 1280, height: 800 } : null,
    args: options.launchArguments
  }) as unknown as Promise<ManagedContext>;
}

export interface ManagedChromeRuntimeOptions {
  userDataDirectory: string;
  launcher?: PersistentContextLauncher;
  headless?: boolean;
  launchArguments?: string[];
  now?: () => Date;
}

function isMathCanvasUrl(value: string): boolean {
  try {
    return new URL(value).origin === MATHCANVAS_ORIGIN;
  } catch {
    return false;
  }
}

function isInteractiveMathCanvasUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === MATHCANVAS_ORIGIN &&
      (url.pathname === "/ko" ||
        url.pathname.startsWith("/ko/"))
    );
  } catch {
    return false;
  }
}

export class ManagedChromeRuntime implements MathCanvasBrowserRuntime {
  readonly #userDataDirectory: string;
  readonly #launcher: PersistentContextLauncher;
  readonly #now: () => Date;
  #context: ManagedContext | undefined;
  #contextPromise: Promise<ManagedContext> | undefined;
  #workspacePage: ManagedPage | undefined;

  public constructor(options: ManagedChromeRuntimeOptions) {
    this.#userDataDirectory = options.userDataDirectory;
    this.#launcher =
      options.launcher ??
      ((directory) =>
        launchChrome(directory, {
          headless: options.headless ?? false,
          launchArguments:
            options.launchArguments ??
            (options.headless ? [] : ["--start-maximized"])
        }));
    this.#now = options.now ?? (() => new Date());
  }

  async #ensureContext(): Promise<ManagedContext> {
    if (this.#context) return this.#context;
    if (!this.#contextPromise) {
      mkdirSync(this.#userDataDirectory, {
        recursive: true,
        mode: 0o700
      });
      this.#contextPromise = this.#launcher(this.#userDataDirectory);
    }
    try {
      const context = await this.#contextPromise;
      this.#context = context;
      context.on("close", () => {
        this.#context = undefined;
        this.#contextPromise = undefined;
        this.#workspacePage = undefined;
      });
      return context;
    } catch (error) {
      this.#contextPromise = undefined;
      throw error;
    }
  }

  async #ensureWorkspacePage(context: ManagedContext): Promise<ManagedPage> {
    if (this.#workspacePage && !this.#workspacePage.isClosed()) {
      return this.#workspacePage;
    }
    const pages = context.pages();
    const mathCanvasPage =
      pages.find((page) =>
        isInteractiveMathCanvasUrl(page.url())
      ) ??
      pages.find((page) => isMathCanvasUrl(page.url()));
    const candidate = mathCanvasPage ?? pages[0] ?? (await context.newPage());
    this.#workspacePage = candidate;
    if (!isMathCanvasUrl(candidate.url())) {
      await candidate.goto(MATHCANVAS_HOME_URL, {
        waitUntil: "domcontentloaded",
        timeout: 30_000
      });
    }
    return candidate;
  }

  public async openWorkspace(): Promise<BrowserConnection> {
    return this.checkConnection({
      forceContractCheck: false,
      bringToFront: true
    });
  }

  public async checkConnection(
    options: {
      forceContractCheck?: boolean;
      bringToFront?: boolean;
      requiredModules?: string[];
    } = {}
  ): Promise<BrowserConnection> {
    const checkedAt = this.#now().toISOString();
    let context: ManagedContext;
    try {
      context = await this.#ensureContext();
    } catch {
      return browserConnectionSchema.parse({
        runtimeVersion: MANAGED_BROWSER_VERSION,
        state: "browser-launch-failed",
        ready: false,
        checkedAt,
        detailCode: "chrome-launch-failed"
      });
    }
    try {
      const page = await this.#ensureWorkspacePage(context);
      if (options.bringToFront ?? true) await page.bringToFront();
      const inspection = await page.evaluate<
        PageInspection,
        PageInspectionInput
      >(
        inspectMathCanvasPage,
        {
          verifyStaticContract: options.forceContractCheck ?? true,
          ...(options.requiredModules
            ? { requiredModules: options.requiredModules }
            : {})
        }
      );
      return browserConnectionSchema.parse({
        runtimeVersion: MANAGED_BROWSER_VERSION,
        state: inspection.state,
        ready: inspection.state === "ready",
        checkedAt,
        currentUrl: page.url(),
        ...(inspection.detailCode
          ? { detailCode: inspection.detailCode }
          : {})
      });
    } catch {
      return browserConnectionSchema.parse({
        runtimeVersion: MANAGED_BROWSER_VERSION,
        state: "contract-mismatch",
        ready: false,
        checkedAt,
        detailCode: "browser-page-inspection-failed"
      });
    }
  }

  public async createProject(
    payload: Record<string, unknown>,
    expectedPayloadHash: string
  ): Promise<CreationResult> {
    const completedAt = () => this.#now().toISOString();
    if (
      !/^[a-f0-9]{64}$/.test(expectedPayloadHash) ||
      sha256Hex(payload) !== expectedPayloadHash
    ) {
      return creationResultSchema.parse({
        ok: false,
        completedAt: completedAt(),
        errorCode: "payload-hash-mismatch"
      });
    }

    const canvasOption = payload.canvasOption as
      | {
          moduleArr?: { Unit01?: Record<string, unknown> };
        }
      | undefined;
    const contents = Array.isArray(payload.contentsJson)
      ? (payload.contentsJson as Array<Record<string, unknown>>)
      : [];
    const requiredModules = [
      ...Object.entries(canvasOption?.moduleArr?.Unit01 ?? {})
        .filter(([, enabled]) => enabled === true)
        .map(([module]) => module),
      ...contents.flatMap((object) =>
        ["input-text", "math-latex", "drawElem"].includes(
          String(object.svgId)
        )
          ? [String(object.svgId)]
          : []
      )
    ];
    const connection = await this.checkConnection({
      forceContractCheck: true,
      bringToFront: true,
      requiredModules: [...new Set(requiredModules)]
    });
    if (!connection.ready) {
      return creationResultSchema.parse({
        ok: false,
        completedAt: completedAt(),
        errorCode:
          connection.detailCode === "auth-required"
            ? "auth-required"
            : connection.detailCode === "contract-probe-unavailable"
              ? "contract-probe-unavailable"
              : connection.detailCode === "contract-mismatch"
                ? "contract-mismatch"
                : connection.state === "login-required"
                  ? "auth-required"
            : connection.state === "browser-launch-failed"
              ? "browser-launch-failed"
              : "contract-mismatch"
      });
    }

    try {
      const context = await this.#ensureContext();
      const page = await this.#ensureWorkspacePage(context);
      const pageResult = await page.evaluate<
        PageCreationResult,
        {
          payload: Record<string, unknown>;
          expectedPayloadHash: string;
        }
      >(createProjectInMathCanvas, { payload, expectedPayloadHash });
      if (!pageResult.ok) {
        return creationResultSchema.parse({
          ok: false,
          completedAt: completedAt(),
          errorCode: pageResult.errorCode,
          ...(pageResult.httpStatus
            ? { httpStatus: pageResult.httpStatus }
            : {})
        });
      }

      const editorUrl =
        `https://mathcanvas.vivasam.com/ko/view/${pageResult.projectId}`;
      const editorPage = await context.newPage();
      await editorPage.goto(editorUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000
      });
      await editorPage.bringToFront();
      this.#workspacePage = editorPage;
      return creationResultSchema.parse({
        ok: true,
        completedAt: completedAt(),
        projectId: pageResult.projectId,
        editorUrl
      });
    } catch {
      return creationResultSchema.parse({
        ok: false,
        completedAt: completedAt(),
        errorCode: "mathcanvas-unavailable"
      });
    }
  }

  public async close(): Promise<void> {
    const context = this.#context;
    this.#context = undefined;
    this.#contextPromise = undefined;
    this.#workspacePage = undefined;
    if (context) await context.close();
  }
}
