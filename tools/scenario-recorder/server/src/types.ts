export type RecorderStepType = "click" | "input" | "link" | "keyboard" | "wait";

export interface StepDraft {
  stepId: string;
  type: RecorderStepType;
  selector?: string;
  url?: string;
  value?: string | number;
  params: Record<string, unknown>;
  desc: string;
}

export type RecorderAction =
  | { type: "click"; selector: string; timestamp: number }
  | { type: "focus"; selector: string; timestamp: number }
  | { type: "focusout"; selector: string; timestamp: number }
  | { type: "input"; selector: string; value: string; password: boolean; timestamp: number }
  | { type: "keyboard"; selector: string; value: string; timestamp: number }
  | { type: "navigation"; url: string; timestamp: number };

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

export interface BrowserSettings {
  headless: boolean;
  slowMo: number;
  devtools: boolean;
  timeout: number;
  actionTimeout: number;
  viewport: { width: number; height: number };
}
