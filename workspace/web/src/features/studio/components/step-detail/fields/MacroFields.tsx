import { Form, Select, Typography } from "antd";
import { valueFieldMeta } from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";

export function MacroFields({ step, onChange, macroIds, macroRef }: StepFieldsProps) {
  const valueMeta = valueFieldMeta("macro");
  return (
    <>
      <Form.Item label={valueMeta.label} tooltip={valueMeta.tooltip} required>
        <Select
          value={step.value as string}
          options={macroIds.map((id) => ({ value: id, label: id }))}
          onChange={(v) => onChange({ value: v })}
          showSearch
          placeholder="选择宏"
        />
      </Form.Item>
      {macroRef && (
        <div style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            宏「{macroRef.id}」包含 {macroRef.steps.length} 个子步骤
          </Typography.Text>
        </div>
      )}
    </>
  );
}
