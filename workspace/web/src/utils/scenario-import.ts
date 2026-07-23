import { rawToDraft, type ScenarioDraft } from "../types/scenario";
import {
  hasScenarioErrors,
  validateScenarioDraft,
  type ScenarioValidateIssue,
} from "./scenario-validate";

export interface ParsedScenarioJson {
  draft: ScenarioDraft;
  suggestedFile: string;
  moduleAdjusted: boolean;
  clientIssues: ScenarioValidateIssue[];
}

export function parseScenarioJsonText(text: string, activeModule: string): ParsedScenarioJson {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("JSON 语法无效");
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("根节点须为 JSON 对象");
  }

  const record = raw as Record<string, unknown>;
  if (!String(record.id ?? "").trim() && !String(record.name ?? "").trim()) {
    throw new Error("缺少 id 或 name 字段");
  }

  const jsonModule = String(record.module ?? activeModule).trim() || activeModule;
  const moduleAdjusted = jsonModule !== activeModule;
  const draft = rawToDraft({ ...record, module: jsonModule }, jsonModule);
  const clientIssues = validateScenarioDraft(draft);

  if (hasScenarioErrors(clientIssues)) {
    const err = new Error("场景内容校验未通过") as Error & { issues?: ScenarioValidateIssue[] };
    err.issues = clientIssues;
    throw err;
  }

  const suggestedFile = `${draft.id || "imported"}.json`;
  return { draft, suggestedFile, moduleAdjusted, clientIssues };
}
