import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "playwright";

export interface BrowserRecordedAction {
  type: "click" | "focus" | "focusout" | "input" | "keyboard";
  selector: string;
  value?: string;
  password?: boolean;
  timestamp: number;
}

export const ACTION_QUEUE_KEY = "__visualE2EActions";
export const RECORDING_FLAG_KEY = "__visualE2ERecording";
export const HOOKS_FLAG_KEY = "__visualE2EHooksInstalled";
export const RECORD_BINDING_NAME = "__visualE2ERecord";

function resolveInjectScriptPath(): string {
  const dir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(dir, "browser-hooks.inject.js"),
    join(dir, "..", "src", "browser-hooks.inject.js"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error("browser-hooks.inject.js 未找到");
}

let cachedInitScript: string | null = null;

export function getBrowserHooksInitScript(): string {
  if (!cachedInitScript) {
    cachedInitScript = readFileSync(resolveInjectScriptPath(), "utf8");
  }
  return cachedInitScript;
}

export function isBrowserRecordedAction(value: unknown): value is BrowserRecordedAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  const type = action.type;
  if (
    type !== "click"
    && type !== "focus"
    && type !== "focusout"
    && type !== "input"
    && type !== "keyboard"
  ) {
    return false;
  }
  if (typeof action.selector !== "string") return false;
  if (typeof action.timestamp !== "number") return false;
  return true;
}

export async function exposeRecorderBinding(
  context: BrowserContext,
  onAction: (action: BrowserRecordedAction) => void,
): Promise<void> {
  await context.exposeBinding(RECORD_BINDING_NAME, (_source, payload: unknown) => {
    if (!isBrowserRecordedAction(payload)) return;
    onAction(payload);
  });
}

export async function installRecorderHooks(page: Page): Promise<boolean> {
  return page.evaluate("window.__visualE2EInstallHooks()") as Promise<boolean>;
}

/** Fallback flush when binding failed or page navigated mid-flight. */
export async function drainRecorderActions(page: Page): Promise<BrowserRecordedAction[]> {
  const raw = await page.evaluate("window.__visualE2EDrainActions()") as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isBrowserRecordedAction);
}

export async function setRecordingEnabled(page: Page, enabled: boolean): Promise<void> {
  await page.evaluate(`window.__visualE2ESetRecording(${enabled ? "true" : "false"})`);
}

export async function hooksReady(page: Page): Promise<boolean> {
  return page.evaluate("window.__visualE2EHooksReady()") as Promise<boolean>;
}
