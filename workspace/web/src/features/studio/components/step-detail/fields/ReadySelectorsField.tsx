import { Form, Input } from "antd";
import { STEP_FIELDS } from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";

export function ReadySelectorsField({ step, patchParams }: Pick<StepFieldsProps, "step" | "patchParams">) {
  return (
    <Form.Item label={STEP_FIELDS.readySelectors.label} tooltip={STEP_FIELDS.readySelectors.tooltip}>
      <Input
        value={((step.params?.readySelectors as string[]) ?? []).join(", ")}
        placeholder={STEP_FIELDS.readySelectors.placeholder}
        onChange={(e) =>
          patchParams({
            readySelectors: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
          })
        }
      />
    </Form.Item>
  );
}
