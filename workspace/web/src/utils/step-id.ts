import type { StepDraft } from "../types/scenario";

/** 自动重排的步骤 ID：s1、s2、… */
export const AUTO_STEP_ID_PATTERN = /^s\d+$/;

export function isAutoStepId(stepId: string): boolean {
  return AUTO_STEP_ID_PATTERN.test(stepId);
}

type BranchTarget = { step: string } | { scenario: string };

function mapBranchTarget(target: BranchTarget, idMap: Record<string, string>): BranchTarget {
  if ("scenario" in target) return target;
  const mapped = idMap[target.step];
  return mapped ? { step: mapped } : target;
}

/** 将步骤引用从旧 ID 映射到新 ID（next / branch.step） */
export function applyStepIdMap(steps: StepDraft[], idMap: Record<string, string>): StepDraft[] {
  if (Object.keys(idMap).length === 0) return steps;
  return steps.map((step) => {
    let next = step.next;
    if (next && idMap[next]) next = idMap[next];

    let branch = step.branch;
    if (branch) {
      branch = {
        yes: mapBranchTarget(branch.yes, idMap),
        no: mapBranchTarget(branch.no, idMap),
      };
    }

    return {
      ...step,
      ...(next !== step.next ? { next } : {}),
      ...(branch !== step.branch ? { branch } : {}),
    };
  });
}

/**
 * 按列表顺序重排自动 ID（s1、s2…）；自定义 ID 跳过。
 * 同步更新 next / branch 中的步骤引用。
 */
export function renumberAutoStepIds(steps: StepDraft[]): StepDraft[] {
  const idMap: Record<string, string> = {};
  let seq = 1;

  const renamed = steps.map((step) => {
    if (!isAutoStepId(step.stepId)) return step;
    const newId = `s${seq++}`;
    if (newId !== step.stepId) idMap[step.stepId] = newId;
    return newId === step.stepId ? step : { ...step, stepId: newId };
  });

  return applyStepIdMap(renamed, idMap);
}

/** 单步改名时同步引用（不重排其它自动 ID） */
export function renameStepId(steps: StepDraft[], from: string, to: string): StepDraft[] {
  if (!from || !to || from === to) return steps;
  const withId = steps.map((s) => (s.stepId === from ? { ...s, stepId: to } : s));
  return applyStepIdMap(withId, { [from]: to });
}
