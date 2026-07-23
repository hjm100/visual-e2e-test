import { randomUUID } from "node:crypto";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import {
  drainRecorderActions,
  exposeRecorderBinding,
  getBrowserHooksInitScript,
  hooksReady,
  installRecorderHooks,
  setRecordingEnabled,
  type BrowserRecordedAction,
} from "./browser-script.js";
import { RecorderNormalizer } from "./normalizer.js";
import { resolveBrowserLaunch } from "./resolve-browser.js";
import type { RecorderAction, ScenarioExport, ScenarioMeta, StepDraft } from "./types.js";

export type RecorderStatus =
  | "starting"
  | "preparing"
  | "recording"
  | "paused"
  | "stopping"
  | "stopped"
  | "cancelled"
  | "error";

export interface RecorderSessionView {
  sessionId: string;
  status: RecorderStatus;
  startUrl: string;
  currentUrl: string;
  meta: ScenarioMeta;
  steps: StepDraft[];
  scenario?: ScenarioExport;
  error?: string;
  startedAt: string;
  updatedAt: string;
  revision: number;
}

interface ActiveSession {
  id: string;
  status: RecorderStatus;
  startUrl: string;
  currentUrl: string;
  meta: ScenarioMeta;
  normalizer: RecorderNormalizer;
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

const sessions = new Map<string, ActiveSession>();

function nowIso(): string {
  return new Date().toISOString();
}

function toView(session: ActiveSession): RecorderSessionView {
  const steps = session.normalizer.getSteps();
  const view: RecorderSessionView = {
    sessionId: session.id,
    status: session.status,
    startUrl: session.startUrl,
    currentUrl: session.currentUrl,
    meta: session.meta,
    steps,
    error: session.error,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    revision: session.normalizer.getRevision(),
  };
  if (session.status === "stopped") {
    view.scenario = buildScenarioExport(session.meta, steps);
  }
  return view;
}

export function buildScenarioExport(meta: ScenarioMeta, steps: StepDraft[]): ScenarioExport {
  const entryLink = steps.find((s) => s.type === "link" && s.url);
  return {
    id: meta.id,
    name: meta.name,
    module: meta.module,
    enabled: true,
    setup: {
      requiresLogin: meta.requiresLogin,
      entryRoute: entryLink?.url ?? "",
    },
    steps,
  };
}

function touch(session: ActiveSession): void {
  session.updatedAt = nowIso();
}

async function ensurePageHooks(page: Page): Promise<boolean> {
  const installed = await installRecorderHooks(page);
  if (!installed) return false;
  return hooksReady(page);
}

function mapBrowserAction(action: BrowserRecordedAction): RecorderAction {
  if (action.type === "click") {
    return { type: "click", selector: action.selector, timestamp: action.timestamp };
  }
  if (action.type === "focus") {
    return { type: "focus", selector: action.selector, timestamp: action.timestamp };
  }
  if (action.type === "focusout") {
    return { type: "focusout", selector: action.selector, timestamp: action.timestamp };
  }
  if (action.type === "input") {
    return {
      type: "input",
      selector: action.selector,
      value: action.value ?? "",
      password: Boolean(action.password),
      timestamp: action.timestamp,
    };
  }
  return {
    type: "keyboard",
    selector: action.selector,
    value: action.value ?? "",
    timestamp: action.timestamp,
  };
}

function ingestAction(session: ActiveSession, action: BrowserRecordedAction): void {
  if (session.status !== "recording") return;
  session.normalizer.push(mapBrowserAction(action));
  try {
    if (session.page) session.currentUrl = session.page.url();
  } catch {
    // page may be navigating
  }
  touch(session);
}

async function flushQueuedActions(session: ActiveSession): Promise<void> {
  const page = session.page;
  if (!page) return;
  try {
    const actions = await drainRecorderActions(page);
    for (const action of actions) {
      session.normalizer.push(mapBrowserAction(action));
    }
    if (actions.length) touch(session);
  } catch {
    // page may be closing
  }
}

function attachPageListeners(session: ActiveSession, page: Page): void {
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    if (session.status !== "recording") {
      session.currentUrl = frame.url();
      touch(session);
      return;
    }
    session.normalizer.push({
      type: "navigation",
      url: frame.url(),
      timestamp: Date.now(),
    });
    session.currentUrl = frame.url();
    touch(session);
  });

  page.on("load", () => {
    void ensurePageHooks(page).catch(() => undefined);
  });
}

async function finalizeClosedBrowser(session: ActiveSession): Promise<void> {
  session.normalizer.flush();
  if (session.status === "recording" || session.status === "paused") {
    session.status = session.normalizer.getSteps().length > 0 ? "stopped" : "cancelled";
  }
  session.browser = null;
  session.context = null;
  session.page = null;
  touch(session);
}

async function closeBrowser(session: ActiveSession): Promise<void> {
  try {
    await session.context?.close();
  } catch {
    // ignore
  }
  try {
    await session.browser?.close();
  } catch {
    // ignore
  }
  session.context = null;
  session.browser = null;
  session.page = null;
}

export async function createSession(input: {
  startUrl: string;
  meta: ScenarioMeta;
}): Promise<RecorderSessionView> {
  const id = randomUUID();
  const session: ActiveSession = {
    id,
    status: "starting",
    startUrl: input.startUrl,
    currentUrl: "",
    meta: input.meta,
    normalizer: new RecorderNormalizer(),
    browser: null,
    context: null,
    page: null,
    startedAt: nowIso(),
    updatedAt: nowIso(),
  };
  sessions.set(id, session);

  void launchBrowser(session).catch((err: Error) => {
    session.status = "error";
    session.error = err.message;
    touch(session);
  });

  return toView(session);
}

async function launchBrowser(session: ActiveSession): Promise<void> {
  const browserLaunch = await resolveBrowserLaunch();
  if (!browserLaunch.ok) {
    throw new Error(browserLaunch.hints.join("；") || "测试浏览器未就绪");
  }

  for (const [key, value] of Object.entries(browserLaunch.env)) {
    process.env[key] = value;
  }

  const settings = browserLaunch.settings;
  const launchOpts: Parameters<typeof chromium.launch>[0] = {
    headless: false,
    slowMo: settings.slowMo,
    timeout: 30_000,
    args: ["--disable-dev-shm-usage", "--disable-breakpad"],
    env: {
      ...process.env,
      ...browserLaunch.env,
    },
  };

  if (browserLaunch.executablePath) {
    launchOpts.executablePath = browserLaunch.executablePath;
  }

  if (settings.devtools) {
    (launchOpts as Record<string, unknown>).devtools = true;
  }

  const browser = await chromium.launch(launchOpts);
  session.browser = browser;

  browser.on("disconnected", () => {
    void finalizeClosedBrowser(session);
  });

  const context = await browser.newContext({
    viewport: settings.viewport,
    locale: "zh-CN",
  });
  session.context = context;

  // Binding before init script / navigation — page pushes actions immediately (no polling).
  await exposeRecorderBinding(context, (action) => {
    ingestAction(session, action);
  });
  await context.addInitScript({ content: getBrowserHooksInitScript() });

  context.on("page", (page) => {
    attachPageListeners(session, page);
    void ensurePageHooks(page).catch(() => undefined);
  });

  const page = await context.newPage();
  session.page = page;
  page.setDefaultTimeout(settings.actionTimeout);
  page.setDefaultNavigationTimeout(settings.timeout);
  attachPageListeners(session, page);

  await page.goto(session.startUrl, { waitUntil: "load", timeout: settings.timeout });
  session.currentUrl = page.url();

  const ready = await ensurePageHooks(page);
  if (!ready) {
    throw new Error("页面录制钩子注入失败，请刷新目标页后重试「开始录制」");
  }

  session.status = "preparing";
  touch(session);
}

export function getSession(sessionId: string): RecorderSessionView | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return toView(session);
}

export async function commandSession(
  sessionId: string,
  command: "start" | "pause" | "resume" | "stop",
): Promise<RecorderSessionView> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("会话不存在");

  if (command === "start") {
    if (session.status !== "preparing" && session.status !== "paused") {
      throw new Error(`当前状态无法开始录制: ${session.status}`);
    }
    const page = session.page;
    if (!page) throw new Error("浏览器未就绪");

    const ready = await ensurePageHooks(page);
    if (!ready) {
      throw new Error("页面录制钩子注入失败，请刷新目标页后重试「开始录制」");
    }

    // First start only: seed entry link from the page where recording begins.
    if (session.status === "preparing") {
      const entryUrl = page.url() || session.currentUrl || session.startUrl;
      session.normalizer.seedEntryRoute(entryUrl, Date.now());
      session.currentUrl = entryUrl;
    }

    await setRecordingEnabled(page, true);
    session.status = "recording";
    touch(session);
    return toView(session);
  }

  if (command === "pause") {
    if (session.status !== "recording") throw new Error("当前未在录制");
    const page = session.page;
    if (page) {
      await setRecordingEnabled(page, false);
      await flushQueuedActions(session);
    }
    session.status = "paused";
    touch(session);
    return toView(session);
  }

  if (command === "resume") {
    if (session.status !== "paused") throw new Error("当前未暂停");
    const page = session.page;
    if (!page) throw new Error("浏览器未就绪");
    await setRecordingEnabled(page, true);
    session.status = "recording";
    touch(session);
    return toView(session);
  }

  if (command === "stop") {
    if (!["recording", "paused", "preparing"].includes(session.status)) {
      throw new Error(`当前状态无法停止: ${session.status}`);
    }
    session.status = "stopping";
    touch(session);

    const page = session.page;
    if (page) {
      await setRecordingEnabled(page, false);
      await flushQueuedActions(session);
    }
    session.normalizer.flush();
    session.status = "stopped";
    await closeBrowser(session);
    touch(session);
    return toView(session);
  }

  throw new Error(`未知命令: ${command}`);
}

export async function cancelSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.status = "cancelled";
  await closeBrowser(session);
  sessions.delete(sessionId);
}

export function listSessions(): RecorderSessionView[] {
  return [...sessions.values()].map(toView);
}
