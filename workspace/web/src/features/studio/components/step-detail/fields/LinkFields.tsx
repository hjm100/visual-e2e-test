import { Form, Input } from "antd";
import { STEP_FIELDS } from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";
import { ReadySelectorsField } from "./ReadySelectorsField";

export function LinkFields({ step, onChange, patchParams }: StepFieldsProps) {
  return (
    <>
      <Form.Item label={STEP_FIELDS.url.label} tooltip={STEP_FIELDS.url.tooltip} required>
        <Input
          value={step.url}
          placeholder={STEP_FIELDS.url.placeholder}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </Form.Item>
      <ReadySelectorsField step={step} patchParams={patchParams} />
    </>
  );
}
