import { Form, Input } from "antd";
import { STEP_FIELDS, valueFieldMeta, selectorPlaceholder } from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";
import { ReadySelectorsField } from "./ReadySelectorsField";

export function InputFields({ step, onChange, patchParams }: StepFieldsProps) {
  const valueMeta = valueFieldMeta("input");
  return (
    <>
      <Form.Item label={STEP_FIELDS.selector.label} tooltip={STEP_FIELDS.selector.tooltip} required>
        <Input
          value={step.selector}
          placeholder={selectorPlaceholder("input")}
          onChange={(e) => onChange({ selector: e.target.value })}
        />
      </Form.Item>
      <Form.Item label={valueMeta.label} tooltip={valueMeta.tooltip}>
        <Input
          value={step.value == null ? "" : String(step.value)}
          placeholder={valueMeta.placeholder}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      </Form.Item>
      <ReadySelectorsField step={step} patchParams={patchParams} />
    </>
  );
}
