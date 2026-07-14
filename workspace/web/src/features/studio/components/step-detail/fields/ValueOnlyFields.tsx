import { Form, Input } from "antd";
import { valueFieldMeta } from "../../../../../constants/field-meta";
import type { StepType } from "../../../../../types/scenario";
import type { StepFieldsProps } from "../types";

/** wait / log / screenshot：仅 value 字段，label 由类型决定 */
export function ValueOnlyFields({ step, onChange }: StepFieldsProps) {
  const valueMeta = valueFieldMeta(step.type as StepType);
  return (
    <Form.Item label={valueMeta.label} tooltip={valueMeta.tooltip} required>
      <Input
        value={step.value == null ? "" : String(step.value)}
        placeholder={valueMeta.placeholder}
        onChange={(e) => onChange({ value: e.target.value })}
      />
    </Form.Item>
  );
}
