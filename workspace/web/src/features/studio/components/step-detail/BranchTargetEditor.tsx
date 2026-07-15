import { Form, Input, Select, Space } from "antd";
import type { StepDraft } from "../../../../types/scenario";
import type { BranchKind, BranchTarget } from "./types";
import {
  branchKind, branchValue, makeBranchTarget, nextStepOptions,
} from "./helpers";

const BRANCH_KIND_OPTIONS = [
  { value: "step" as const, label: "步骤" },
  { value: "scenario" as const, label: "场景" },
];

export function BranchTargetEditor({
  label,
  tooltip,
  target,
  steps,
  currentStepId,
  onChange,
}: {
  label: string;
  tooltip?: string;
  target: BranchTarget | undefined;
  steps: StepDraft[];
  currentStepId: string;
  onChange: (target: BranchTarget) => void;
}) {
  const kind = branchKind(target);
  const value = branchValue(target);

  return (
    <Form.Item label={label} tooltip={tooltip} required>
      <Space.Compact style={{ width: "100%" }}>
        <Select
          style={{ width: 88 }}
          value={kind}
          options={BRANCH_KIND_OPTIONS}
          onChange={(nextKind: BranchKind) => onChange(makeBranchTarget(nextKind, ""))}
        />
        {kind === "step" ? (
          <Select
            style={{ flex: 1, minWidth: 0 }}
            value={value || undefined}
            options={nextStepOptions(steps, currentStepId, value || undefined)}
            placeholder="选择步骤"
            onChange={(v) => onChange(makeBranchTarget("step", v))}
            showSearch
            optionFilterProp="label"
          />
        ) : (
          <Input
            style={{ flex: 1, minWidth: 0 }}
            value={value}
            placeholder="场景文件，如 fail.json"
            onChange={(e) => onChange(makeBranchTarget("scenario", e.target.value))}
          />
        )}
      </Space.Compact>
    </Form.Item>
  );
}
