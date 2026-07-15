import { Form, Input } from "antd";
import { STEP_FIELDS, valueFieldMeta, selectorPlaceholder } from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";
import { ReadySelectorsField } from "./ReadySelectorsField";

export function KeyboardFields({ step, onChange, patchParams }: StepFieldsProps) {
  const valueMeta = valueFieldMeta("keyboard");
  return (
    <>
      <Form.Item label={STEP_FIELDS.selector.label} tooltip={STEP_FIELDS.selector.tooltip} required>
        <Input
          value={step.selector}
          placeholder={selectorPlaceholder("keyboard")}
          onChange={(e) => onChange({ selector: e.target.value })}
        />
      </Form.Item>
      <Form.Item label={valueMeta.label} tooltip={valueMeta.tooltip} required>
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
