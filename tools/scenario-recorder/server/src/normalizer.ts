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

const MIN_WAIT_MS = 300;
const MAX_WAIT_MS = 10_000;
const SENSITIVE_QUERY_PARAMETER_PATTERN =
  /^(?:(?:access|refresh|id|oauth)?_?token|password|passwd|secret|client_secret|api[-_]?key|code|auth|auth_?code|authorization|session|session_id|credential)$/i;

export function sanitizeRecordedUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PARAMETER_PATTERN.test(key)) {
        url.searchParams.set(key, "{redacted}");
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function nextStepId(steps: StepDraft[]): string {
  const nums = steps
    .map((s) => parseInt(s.stepId.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `s${max + 1}`;
}

function lastMeaningfulStep(steps: StepDraft[]): StepDraft | undefined {
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.type !== "wait") return step;
  }
  return undefined;
}

function stepDesc(type: RecorderStepType, detail: string): string {
  const labels: Record<RecorderStepType, string> = {
    click: "点击",
    input: "输入",
    link: "打开页面",
    keyboard: "按键",
    wait: "等待",
  };
  return detail ? `${labels[type]} ${detail}` : labels[type];
}

export class RecorderNormalizer {
  private steps: StepDraft[] = [];
  private pendingInputs = new Map<string, RecorderAction & { type: "input" }>();
  private lastActionTimestamp: number | null = null;
  private revision = 0;

  getRevision(): number {
    return this.revision;
  }

  getSteps(): StepDraft[] {
    return [...this.steps];
  }

  flush(): StepDraft[] {
    this.commitAllPendingInputs(Date.now());
    return this.getSteps();
  }

  /** Seed the first link step as the entry route when recording starts. */
  seedEntryRoute(rawUrl: string, timestamp = Date.now()): void {
    if (this.steps.length > 0) return;

    const sanitized = sanitizeRecordedUrl(rawUrl.trim());
    if (!sanitized || sanitized === "about:blank") return;

    this.steps.push({
      stepId: "s1",
      type: "link",
      url: sanitized,
      params: { loadState: "load" },
      desc: stepDesc("link", sanitized),
    });
    this.lastActionTimestamp = timestamp;
    this.bumpRevision();
  }

  private bumpRevision(): void {
    this.revision += 1;
  }

  private insertWaitBefore(timestamp: number): void {
    if (this.lastActionTimestamp == null) return;
    const gap = Math.min(timestamp - this.lastActionTimestamp, MAX_WAIT_MS);
    if (gap < MIN_WAIT_MS) return;
    this.steps.push({
      stepId: nextStepId(this.steps),
      type: "wait",
      value: Math.round(gap),
      params: {},
      desc: stepDesc("wait", `${Math.round(gap)}ms`),
    });
  }

  private appendClick(selector: string, timestamp: number): void {
    this.insertWaitBefore(timestamp);
    this.steps.push({
      stepId: nextStepId(this.steps),
      type: "click",
      selector,
      params: {},
      desc: stepDesc("click", selector),
    });
    this.lastActionTimestamp = timestamp;
    this.bumpRevision();
  }

  private appendInput(action: RecorderAction & { type: "input" }): void {
    const value = action.password ? "{password}" : action.value;
    const last = lastMeaningfulStep(this.steps);
    if (last?.type === "input" && last.selector === action.selector && last.value === value) {
      return;
    }
    this.insertWaitBefore(action.timestamp);
    this.steps.push({
      stepId: nextStepId(this.steps),
      type: "input",
      selector: action.selector,
      value,
      params: { clearBeforeInput: true },
      desc: stepDesc("input", action.selector),
    });
    this.lastActionTimestamp = action.timestamp;
    this.bumpRevision();
  }

  private commitInput(selector: string, timestamp: number): void {
    const pending = this.pendingInputs.get(selector);
    if (!pending) return;
    this.pendingInputs.delete(selector);
    this.appendInput({ ...pending, timestamp });
  }

  private commitOtherPendingInputs(exceptSelector: string | null, timestamp: number): void {
    for (const selector of [...this.pendingInputs.keys()]) {
      if (selector !== exceptSelector) {
        this.commitInput(selector, timestamp);
      }
    }
  }

  private commitAllPendingInputs(timestamp: number): void {
    for (const selector of [...this.pendingInputs.keys()]) {
      this.commitInput(selector, timestamp);
    }
  }

  push(action: RecorderAction): void {
    if (action.type === "navigation") {
      // Navigation is a side effect of click/keyboard — do not emit link steps
      // (playback would goto again and re-refresh the page).
      this.commitAllPendingInputs(action.timestamp);
      return;
    }

    if (action.type === "input") {
      this.pendingInputs.set(action.selector, action);
      return;
    }

    if (action.type === "focusout") {
      this.commitInput(action.selector, action.timestamp);
      return;
    }

    if (action.type === "focus") {
      this.commitOtherPendingInputs(action.selector, action.timestamp);
      this.appendClick(action.selector, action.timestamp);
      return;
    }

    if (action.type === "click") {
      this.commitAllPendingInputs(action.timestamp);
      this.appendClick(action.selector, action.timestamp);
      return;
    }

    if (action.type === "keyboard") {
      this.commitAllPendingInputs(action.timestamp);
      this.insertWaitBefore(action.timestamp);
      this.steps.push({
        stepId: nextStepId(this.steps),
        type: "keyboard",
        selector: action.selector,
        value: action.value,
        params: {},
        desc: stepDesc("keyboard", action.value),
      });
      this.lastActionTimestamp = action.timestamp;
      this.bumpRevision();
    }
  }
}
