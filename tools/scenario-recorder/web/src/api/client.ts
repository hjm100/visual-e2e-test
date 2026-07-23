export interface ScenarioMeta {
  id: string;
  name: string;
  module: string;
  requiresLogin: boolean;
}

export interface StepDraft {
  stepId: string;
  type: string;
  selector?: string;
  url?: string;
  value?: string | number;
  params?: Record<string, unknown>;
  desc?: string;
}

export interface ScenarioExport {
  id: string;
  name: string;
  module: string;
  enabled: boolean;
  setup: {
    requiresLogin: boolean;
    entryRoute: string;
  };
  steps: StepDraft[];
}

export type RecorderStatus =
  | "starting"
  | "preparing"
  | "recording"
  | "paused"
  | "stopping"
  | "stopped"
  | "cancelled"
  | "error";

export interface RecorderSession {
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

export type RecorderCommand = "start" | "pause" | "resume" | "stop";

export interface BrowserStatus {
  ok: boolean;
  path: string;
  version: string;
  hints: string[];
}

const API = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `请求失败: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  browserStatus: () => request<BrowserStatus>("/api/browser/status"),

  createSession: (body: { startUrl: string; meta: ScenarioMeta }) =>
    request<RecorderSession>("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  getSession: (sessionId: string) => request<RecorderSession>(`/api/sessions/${sessionId}`),

  command: (sessionId: string, command: RecorderCommand) =>
    request<RecorderSession>(`/api/sessions/${sessionId}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    }),

  cancel: (sessionId: string) =>
    request<{ ok: boolean }>(`/api/sessions/${sessionId}`, { method: "DELETE" }),
};
