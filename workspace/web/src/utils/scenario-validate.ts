import type { ScenarioDraft, StepDraft, StepType } from "../types/scenario";

export interface ScenarioValidateIssue {
  level: "error" | "warning";
  message: string;
  path?: string;
  stepId?: string;
}

const SELECTOR_TYPES = new Set<StepType>(["click", "hover", "input", "keyboard"]);
const VALUE_TYPES = new Set<StepType>(["wait", "log", "screenshot", "input", "keyboard"]);
const RULES_WITHOUT_EXPECT = new Set(["visible", "hidden", "urlContains"]);

function isBlank(value: string | undefined): boolean {
  return !value || !value.trim();
}

function pushStepError(issues: ScenarioValidateIssue[], step: StepDraft, message: string): void {
  issues.push({ level: "error", message, path: step.stepId, stepId: step.stepId });
}

export function validateScenarioDraft(draft: ScenarioDraft): ScenarioValidateIssue[] {
  const issues: ScenarioValidateIssue[] = [];

  if (isBlank(draft.id)) {
    issues.push({ level: "error", message: "场景 ID 不能为空", path: "id" });
  }
  if (isBlank(draft.name)) {
    issues.push({ level: "error", message: "场景名称不能为空", path: "name" });
  }

  if (draft.mode === "extends") {
    if (isBlank(draft.extends)) {
      issues.push({ level: "error", message: "继承规则不能为空", path: "extends" });
    }
    return issues;
  }

  if (draft.steps.length === 0) {
    issues.push({ level: "error", message: "至少需要一个步骤", path: "steps" });
    return issues;
  }

  for (const step of draft.steps) {
    if (isBlank(step.stepId)) {
      issues.push({ level: "error", message: "步骤 ID 不能为空", path: "steps" });
      continue;
    }

    if (SELECTOR_TYPES.has(step.type) && isBlank(step.selector)) {
      pushStepError(issues, step, `${step.stepId}：元素选择器不能为空`);
    }
    if (step.type === "link" && isBlank(step.url)) {
      pushStepError(issues, step, `${step.stepId}：跳转地址不能为空`);
    }
    if (step.type === "macro" && (step.value == null || step.value === "")) {
      pushStepError(issues, step, `${step.stepId}：请选择宏步骤`);
    }
    if (VALUE_TYPES.has(step.type) && step.type !== "input" && (step.value == null || step.value === "")) {
      pushStepError(issues, step, `${step.stepId}：${step.type} 类型的值不能为空`);
    }
    if (step.type === "input" && (step.value == null || step.value === "") && isBlank(step.selector)) {
      pushStepError(issues, step, `${step.stepId}：输入步骤需填写选择器或输入内容`);
    }
    if (step.type === "verify") {
      if (isBlank(step.verifyValue)) {
        pushStepError(issues, step, `${step.stepId}：验证目标不能为空`);
      }
      const rule = step.matchRule ?? "contains";
      if (!RULES_WITHOUT_EXPECT.has(rule) && isBlank(step.expectValue)) {
        pushStepError(issues, step, `${step.stepId}：期望值不能为空`);
      }
      if (step.branch) {
        const yesVal = "scenario" in step.branch.yes ? step.branch.yes.scenario : step.branch.yes.step;
        const noVal = "scenario" in step.branch.no ? step.branch.no.scenario : step.branch.no.step;
        if (isBlank(yesVal)) {
          pushStepError(issues, step, `${step.stepId}：分支通过 (yes) 目标不能为空`);
        }
        if (isBlank(noVal)) {
          pushStepError(issues, step, `${step.stepId}：分支未通过 (no) 目标不能为空`);
        }
      }
    }
  }

  return issues;
}

export function hasScenarioErrors(issues: ScenarioValidateIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}
