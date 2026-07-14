import { Form, Tag, Typography } from "antd";
import type { StepDetailPanelProps } from "./types";
import { STEP_TYPE_FIELDS } from "./registry";
import { StepHeaderFields, StepFooterFields } from "./StepCommonFields";
import { StepReadOnlyView } from "./StepReadOnlyView";

export type { StepDetailPanelProps, MacroRef, RuleRef } from "./types";

export function StepDetailPanel({
  step, steps, macroIds, onChange, readOnly, macroRef, ruleRef, fixtureParamNames,
}: StepDetailPanelProps) {
  if (!step) {
    return <div style={{ padding: 16, color: "#999" }}>选择步骤以查看详情</div>;
  }

  if (readOnly) {
    return <StepReadOnlyView step={step} macroRef={macroRef} ruleRef={ruleRef} />;
  }

  const patchParams = (patch: Record<string, unknown>) =>
    onChange({ params: { ...step.params, ...patch } });

  const TypeFields = STEP_TYPE_FIELDS[step.type];

  return (
    <div style={{ padding: 16 }}>
      {fixtureParamNames && fixtureParamNames.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
            可用参数：
          </Typography.Text>
          {fixtureParamNames.map((name) => (
            <Tag
              key={name}
              color="blue"
              style={{ cursor: "pointer", marginBottom: 4 }}
              onClick={() => navigator.clipboard.writeText(`{${name}}`)}
            >
              {`{${name}}`}
            </Tag>
          ))}
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, marginTop: 4 }}>
            点击复制，粘贴到描述、选择器等字段
          </Typography.Text>
        </div>
      )}
      <Form layout="vertical">
        <StepHeaderFields step={step} onChange={onChange} />
        <TypeFields
          step={step}
          steps={steps}
          onChange={onChange}
          patchParams={patchParams}
          macroIds={macroIds}
          macroRef={macroRef}
        />
        <StepFooterFields
          step={step}
          steps={steps}
          onChange={onChange}
          patchParams={patchParams}
        />
      </Form>
    </div>
  );
}
