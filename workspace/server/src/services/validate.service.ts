import type { ProjectContext } from "../project-context.js";
import { expandScenarioRaw } from "../adapters/scenario-expander.js";
import { scenarioWriteSchema, isExtendsScenario } from "../schemas/scenario.schema.js";
import { FixtureRepository } from "../repositories/fixture.repo.js";

export interface ValidateIssue {
  level: "error" | "warning";
  message: string;
  path?: string;
}

export interface ValidateResult {
  valid: boolean;
  issues: ValidateIssue[];
  expanded?: unknown;
}

const RUNTIME_ENV_VARIABLES = new Set(["username", "password", "base_url"]);
const TEMPLATE_PLACEHOLDERS = new Set(["addonName", "readySelector", "screenshot"]);

export class ValidateService {
  private fixtures: FixtureRepository;
  private fixturesDir: string;

  constructor(project: ProjectContext) {
    this.fixtures = new FixtureRepository(project);
    this.fixturesDir = project.fixturesDir;
  }

  validateScenario(raw: unknown): ValidateResult {
    const issues: ValidateIssue[] = [];

    const parsed = scenarioWriteSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        valid: false,
        issues: parsed.error.issues.map((i) => ({
          level: "error",
          message: `${i.path.join(".")}: ${i.message}`,
        })),
      };
    }

    const scenario = parsed.data;
    this.checkReferences(scenario, issues);

    let expanded: unknown;
    try {
      expanded = expandScenarioRaw(scenario, this.fixturesDir);
      if (!isExtendsScenario(scenario) && "steps" in scenario) {
        this.checkStepGraph(scenario.steps, issues);
      } else if (expanded && typeof expanded === "object" && "steps" in expanded) {
        this.checkStepGraph((expanded as { steps: unknown[] }).steps, issues);
      }
    } catch (err) {
      issues.push({
        level: "error",
        message: err instanceof Error ? err.message : "展开失败",
      });
    }

    return { valid: !issues.some((i) => i.level === "error"), issues, expanded };
  }

  validateBatch(module: string, scenarios: Array<{ file: string; raw: unknown }>): ValidateResult[] {
    return scenarios.map((s) => {
      const result = this.validateScenario(s.raw);
      if (!result.valid) {
        result.issues.unshift({ level: "error", message: `文件: ${module}/${s.file}` });
      }
      return result;
    });
  }

  expand(raw: unknown): unknown {
    const parsed = scenarioWriteSchema.parse(raw);
    return expandScenarioRaw(parsed, this.fixturesDir);
  }

  private checkReferences(scenario: ReturnType<typeof scenarioWriteSchema.parse>, issues: ValidateIssue[]): void {
    const vars = this.fixtures.readVariables();
    const allVars = Object.values(vars).flatMap((m) => Object.keys(m));

    const text = JSON.stringify(scenario);
    const varRefs = text.match(/\{([a-zA-Z_][\w]*)\}/g) ?? [];
    for (const ref of new Set(varRefs)) {
      const key = ref.slice(1, -1);
      if (!allVars.includes(key) && !RUNTIME_ENV_VARIABLES.has(key) && !TEMPLATE_PLACEHOLDERS.has(key)) {
        issues.push({ level: "warning", message: `未定义变量: ${ref}` });
      }
    }

    if (isExtendsScenario(scenario)) {
      try {
        this.fixtures.readRule(scenario.extends);
      } catch {
        issues.push({ level: "error", message: `规则模板不存在: ${scenario.extends}` });
      }
    }

    const steps = isExtendsScenario(scenario) ? (scenario.steps ?? []) : scenario.steps;
    for (const step of steps) {
      this.checkStepRequiredFields(step, issues);
      if (step.type === "macro" && typeof step.value === "string") {
        try {
          this.fixtures.readMacro(step.value);
        } catch {
          issues.push({ level: "error", message: `宏不存在: ${step.value}`, path: step.stepId });
        }
      }
    }
  }

  private checkStepRequiredFields(step: { stepId: string; type: string; selector?: string; url?: string; value?: unknown; verifyValue?: string; expectValue?: string; matchRule?: string; branch?: { yes?: { step?: string; scenario?: string }; no?: { step?: string; scenario?: string } } }, issues: ValidateIssue[]): void {
    const blank = (v?: string) => !v || !v.trim();
    const selectorTypes = new Set(["click", "hover", "input", "keyboard"]);
    const valueTypes = new Set(["wait", "log", "screenshot"]);

    if (selectorTypes.has(step.type) && blank(step.selector)) {
      issues.push({ level: "error", message: `${step.stepId}：元素选择器不能为空`, path: step.stepId });
    }
    if (step.type === "link" && blank(step.url)) {
      issues.push({ level: "error", message: `${step.stepId}：跳转地址不能为空`, path: step.stepId });
    }
    if (step.type === "macro" && (step.value == null || step.value === "")) {
      issues.push({ level: "error", message: `${step.stepId}：请选择宏步骤`, path: step.stepId });
    }
    if (valueTypes.has(step.type) && (step.value == null || step.value === "")) {
      issues.push({ level: "error", message: `${step.stepId}：值不能为空`, path: step.stepId });
    }
    if (step.type === "verify") {
      if (blank(step.verifyValue)) {
        issues.push({ level: "error", message: `${step.stepId}：验证目标不能为空`, path: step.stepId });
      }
      const rule = step.matchRule ?? "contains";
      if (!["visible", "hidden", "urlContains"].includes(rule) && blank(step.expectValue)) {
        issues.push({ level: "error", message: `${step.stepId}：期望值不能为空`, path: step.stepId });
      }
      if (step.branch) {
        const yesVal = step.branch.yes?.scenario ?? step.branch.yes?.step;
        const noVal = step.branch.no?.scenario ?? step.branch.no?.step;
        if (blank(yesVal)) {
          issues.push({ level: "error", message: `${step.stepId}：分支通过 (yes) 目标不能为空`, path: step.stepId });
        }
        if (blank(noVal)) {
          issues.push({ level: "error", message: `${step.stepId}：分支未通过 (no) 目标不能为空`, path: step.stepId });
        }
      }
    }
  }

  private checkStepGraph(steps: unknown[], issues: ValidateIssue[]): void {
    const ids = new Set(
      steps.filter((s): s is { stepId: string } => typeof s === "object" && s !== null && "stepId" in s)
        .map((s) => s.stepId),
    );
    for (const step of steps) {
      if (typeof step !== "object" || step === null) continue;
      const s = step as { stepId?: string; next?: string; branch?: { yes?: { step?: string }; no?: { step?: string } } };
      if (s.next && !ids.has(s.next)) {
        issues.push({ level: "error", message: `next 目标不存在: ${s.next}`, path: s.stepId });
      }
      if (s.branch?.yes && "step" in s.branch.yes && s.branch.yes.step && !ids.has(s.branch.yes.step)) {
        issues.push({ level: "error", message: `branch.yes 目标不存在: ${s.branch.yes.step}`, path: s.stepId });
      }
      if (s.branch?.no && "step" in s.branch.no && s.branch.no.step && !ids.has(s.branch.no.step)) {
        issues.push({ level: "error", message: `branch.no 目标不存在: ${s.branch.no.step}`, path: s.stepId });
      }
    }
  }
}
