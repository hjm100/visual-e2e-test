import { Form, Input, Switch } from "antd";
import { STEP_FIELDS, selectorPlaceholder } from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";
import { paramBool } from "../helpers";
import { ReadySelectorsField } from "./ReadySelectorsField";

export function ClickFields({ step, onChange, patchParams }: StepFieldsProps) {
  return (
    <>
      <Form.Item label={STEP_FIELDS.selector.label} tooltip={STEP_FIELDS.selector.tooltip} required>
        <Input
          value={step.selector}
          placeholder={selectorPlaceholder("click")}
          onChange={(e) => onChange({ selector: e.target.value })}
        />
      </Form.Item>
      <ReadySelectorsField step={step} patchParams={patchParams} />
      <Form.Item label={STEP_FIELDS.clickAny.label} tooltip={STEP_FIELDS.clickAny.tooltip}>
        <Input
          value={((step.params?.clickAny as string[]) ?? []).join(", ")}
          placeholder={STEP_FIELDS.clickAny.placeholder}
          onChange={(e) =>
            patchParams({
              clickAny: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
            })
          }
        />
      </Form.Item>
      <Form.Item label={STEP_FIELDS.optional.label} tooltip={STEP_FIELDS.optional.tooltip}>
        <Switch
          checked={paramBool(step, "optional")}
          onChange={(v) => patchParams({ optional: v || undefined })}
        />
      </Form.Item>
    </>
  );
}
