import { Form, Input } from "antd";
import { STEP_FIELDS, selectorPlaceholder } from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";
import { ReadySelectorsField } from "./ReadySelectorsField";

export function HoverFields({ step, onChange, patchParams }: StepFieldsProps) {
  return (
    <>
      <Form.Item label={STEP_FIELDS.selector.label} tooltip={STEP_FIELDS.selector.tooltip} required>
        <Input
          value={step.selector}
          placeholder={selectorPlaceholder("hover")}
          onChange={(e) => onChange({ selector: e.target.value })}
        />
      </Form.Item>
      <ReadySelectorsField step={step} patchParams={patchParams} />
    </>
  );
}
