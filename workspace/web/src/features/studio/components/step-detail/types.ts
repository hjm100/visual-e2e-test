import type { StepDraft } from "../../../../types/scenario";

export interface MacroRef {
  id: string;
  description?: string;
  steps: StepDraft[];
}

export interface RuleRef {
  id: string;
  description?: string;
}

export type BranchTarget = { step: string } | { scenario: string };
export type BranchKind = "step" | "scenario";

export interface StepDetailPanelProps {
  step: StepDraft | null;
  steps: StepDraft[];
  macroIds: string[];
  onChange: (patch: Partial<StepDraft>) => void;
  readOnly?: boolean;
  macroRef?: MacroRef;
  ruleRef?: RuleRef;
  fixtureParamNames?: string[];
}

export interface StepFieldsProps {
  step: StepDraft;
  steps: StepDraft[];
  onChange: (patch: Partial<StepDraft>) => void;
  patchParams: (patch: Record<string, unknown>) => void;
  macroIds: string[];
  macroRef?: MacroRef;
}
