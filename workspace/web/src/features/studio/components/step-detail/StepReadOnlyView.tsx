import { Descriptions, Table, Tag, Typography } from "antd";
import {
  STEP_FIELDS, valueFieldMeta, stepTypeLabel, matchRuleLabel,
} from "../../../../constants/field-meta";
import type { StepDraft } from "../../../../types/scenario";
import type { MacroRef, RuleRef } from "./types";
import { formatBranchTarget, paramBool } from "./helpers";

export function StepReadOnlyView({
  step, macroRef, ruleRef,
}: {
  step: StepDraft;
  macroRef?: MacroRef;
  ruleRef?: RuleRef;
}) {
  return (
    <div style={{ padding: 16 }}>
      {ruleRef && (
        <div style={{ marginBottom: 12, padding: 8, background: "#f6f8fa", borderRadius: 6 }}>
          <Typography.Text type="secondary">继承规则：</Typography.Text>
          <Tag color="blue">{ruleRef.id}</Tag>
          {ruleRef.description && (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
              {ruleRef.description}
            </Typography.Text>
          )}
        </div>
      )}
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={STEP_FIELDS.stepId.label}>{step.stepId}</Descriptions.Item>
        <Descriptions.Item label={STEP_FIELDS.type.label}>
          <Tag color="purple">{stepTypeLabel(step.type)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={STEP_FIELDS.desc.label}>{step.desc || "—"}</Descriptions.Item>
        {step.selector && (
          <Descriptions.Item label={STEP_FIELDS.selector.label}>{step.selector}</Descriptions.Item>
        )}
        {step.url && <Descriptions.Item label={STEP_FIELDS.url.label}>{step.url}</Descriptions.Item>}
        {step.value != null && (
          <Descriptions.Item label={valueFieldMeta(step.type).label}>{String(step.value)}</Descriptions.Item>
        )}
        {step.verifyValue && (
          <Descriptions.Item label={STEP_FIELDS.verifyValue.label}>{step.verifyValue}</Descriptions.Item>
        )}
        {step.expectValue && (
          <Descriptions.Item label={STEP_FIELDS.expectValue.label}>{step.expectValue}</Descriptions.Item>
        )}
        {step.matchRule && (
          <Descriptions.Item label={STEP_FIELDS.matchRule.label}>{matchRuleLabel(step.matchRule)}</Descriptions.Item>
        )}
        {step.branch && (
          <>
            <Descriptions.Item label={STEP_FIELDS.branchYes.label}>
              {formatBranchTarget(step.branch.yes)}
            </Descriptions.Item>
            <Descriptions.Item label={STEP_FIELDS.branchNo.label}>
              {formatBranchTarget(step.branch.no)}
            </Descriptions.Item>
            {paramBool(step, "instantVerify") && (
              <Descriptions.Item label={STEP_FIELDS.instantVerify.label}>是</Descriptions.Item>
            )}
          </>
        )}
        {step.next && <Descriptions.Item label={STEP_FIELDS.next.label}>{step.next}</Descriptions.Item>}
        {step.delay != null && (
          <Descriptions.Item label={STEP_FIELDS.delay.label}>{step.delay} ms</Descriptions.Item>
        )}
        {step.timeOut != null && (
          <Descriptions.Item label={STEP_FIELDS.timeOut.label}>{step.timeOut} ms</Descriptions.Item>
        )}
      </Descriptions>
      {step.type === "macro" && macroRef && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>关联宏步骤：{macroRef.id}</Typography.Text>
          {macroRef.description && (
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
              {macroRef.description}
            </Typography.Text>
          )}
          <Table
            size="small"
            rowKey={(_, index) => String(index)}
            pagination={false}
            dataSource={macroRef.steps}
            columns={[
              { title: "ID", dataIndex: "stepId", width: 56 },
              { title: "类型", dataIndex: "type", width: 72, render: (t: string) => <Tag color="orange">{t}</Tag> },
              { title: "描述", dataIndex: "desc", ellipsis: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}
