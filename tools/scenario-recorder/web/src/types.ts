export interface StepDraft {
  stepId: string;
  type: string;
  selector?: string;
  url?: string;
  value?: string | number;
  params?: Record<string, unknown>;
  desc?: string;
}

export interface ScenarioMeta {
  id: string;
  name: string;
  module: string;
  requiresLogin: boolean;
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

export interface BrowserStatus {
  ok: boolean;
  path: string;
  version: string;
  hints: string[];
}

export type RecorderCommand = "start" | "pause" | "resume" | "stop";
