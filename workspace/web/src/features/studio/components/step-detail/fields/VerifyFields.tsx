import { Form, Input, Select, Switch } from "antd";
import {
  STEP_FIELDS, matchRuleOptions,
  verifyValuePlaceholder, expectValuePlaceholder,
} from "../../../../../constants/field-meta";
import type { StepFieldsProps } from "../types";
import { paramBool } from "../helpers";
import { BranchTargetEditor } from "../BranchTargetEditor";

export function VerifyFields({ step, steps, onChange, patchParams }: StepFieldsProps) {
  const rule = step.matchRule ?? "contains";
  const expectRequired = !["visible", "hidden", "urlContains"].includes(rule);

  return (
    <>
      <Form.Item label={STEP_FIELDS.verifyValue.label} tooltip={STEP_FIELDS.verifyValue.tooltip} required>
        <Input
          value={step.verifyValue}
          placeholder={verifyValuePlaceholder(rule)}
          onChange={(e) => onChange({ verifyValue: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label={STEP_FIELDS.expectValue.label}
        tooltip={STEP_FIELDS.expectValue.tooltip}
        required={expectRequired}
      >
        <Input
          value={step.expectValue}
          placeholder={expectValuePlaceholder(rule)}
          onChange={(e) => onChange({ expectValue: e.target.value })}
        />
      </Form.Item>
      <Form.Item label={STEP_FIELDS.matchRule.label} tooltip={STEP_FIELDS.matchRule.tooltip} required>
        <Select
          value={step.matchRule ?? "contains"}
          options={matchRuleOptions()}
          onChange={(v) => onChange({ matchRule: v })}
        />
      </Form.Item>
      <Form.Item label={STEP_FIELDS.branch.label} tooltip={STEP_FIELDS.branch.tooltip}>
        <Switch
          checked={!!step.branch}
          onChange={(enabled) => {
            if (!enabled) {
              const nextParams = { ...step.params };
              delete nextParams.instantVerify;
              onChange({
                branch: undefined,
                params: Object.keys(nextParams).length > 0 ? nextParams : undefined,
              });
              return;
            }
            onChange({
              branch: {
                yes: { step: "" },
                no: { step: "" },
              },
            });
          }}
        />
      </Form.Item>
      {step.branch && (
        <>
          <BranchTargetEditor
            label={STEP_FIELDS.branchYes.label}
            tooltip={STEP_FIELDS.branchYes.tooltip}
            target={step.branch.yes}
            steps={steps}
            currentStepId={step.stepId}
            onChange={(yes) => onChange({ branch: { ...step.branch!, yes } })}
          />
          <BranchTargetEditor
            label={STEP_FIELDS.branchNo.label}
            tooltip={STEP_FIELDS.branchNo.tooltip}
            target={step.branch.no}
            steps={steps}
            currentStepId={step.stepId}
            onChange={(no) => onChange({ branch: { ...step.branch!, no } })}
          />
          <Form.Item label={STEP_FIELDS.instantVerify.label} tooltip={STEP_FIELDS.instantVerify.tooltip}>
            <Switch
              checked={paramBool(step, "instantVerify")}
              onChange={(v) => patchParams({ instantVerify: v || undefined })}
            />
          </Form.Item>
        </>
      )}
    </>
  );
}
