import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CodeOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  StopOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { api, type RecorderSession } from "./api/client";
import { loadCache, saveCache } from "./cache/store";
import { ScenarioJsonDrawer } from "./components/ScenarioJsonDrawer";
import "./app.css";

const ACTIVE = new Set(["starting", "preparing", "recording", "paused", "stopping"]);

const STATUS_LABEL: Record<string, string> = {
  starting: "正在启动浏览器",
  preparing: "浏览器已就绪",
  recording: "录制中",
  paused: "已暂停",
  stopping: "正在结束",
  stopped: "已结束",
  cancelled: "已取消",
  error: "错误",
};

const STATUS_COLOR: Record<string, string> = {
  starting: "processing",
  preparing: "default",
  recording: "success",
  paused: "warning",
  stopping: "processing",
  stopped: "default",
  error: "error",
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App() {
  const cache = loadCache();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<RecorderSession | null>(null);
  const [jsonDrawerOpen, setJsonDrawerOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue({
      scenarioId: cache.scenarioId,
      scenarioName: cache.scenarioName,
      module: cache.module,
      startUrl: cache.startUrl,
      requiresLogin: cache.requiresLogin,
    });
  }, [cache, form]);

  const browserStatus = useQuery({
    queryKey: ["browser-status"],
    queryFn: api.browserStatus,
    refetchInterval: 30_000,
  });

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: Boolean(sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE.has(status) ? 500 : false;
    },
  });

  useEffect(() => {
    if (sessionQuery.data) setSession(sessionQuery.data);
  }, [sessionQuery.data]);

  const createMutation = useMutation({
    mutationFn: api.createSession,
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setSession(data);
      message.success("浏览器启动中");
    },
    onError: (err: Error) => message.error(err.message),
  });

  const commandMutation = useMutation({
    mutationFn: ({ id, command }: { id: string; command: "start" | "pause" | "resume" | "stop" }) =>
      api.command(id, command),
    onSuccess: (data) => {
      setSession(data);
      if (data.status === "recording") message.success("开始录制");
      if (data.status === "stopped") message.success("录制已结束，JSON 已生成");
    },
    onError: (err: Error) => message.error(err.message),
  });

  const scenarioJson = useMemo(() => {
    if (session?.scenario) return session.scenario;
    if (!session) return null;
    const entryLink = session.steps.find((s) => s.type === "link" && s.url);
    return {
      id: session.meta.id,
      name: session.meta.name,
      module: session.meta.module,
      enabled: true,
      setup: {
        requiresLogin: session.meta.requiresLogin,
        entryRoute: entryLink?.url ?? "",
      },
      steps: session.steps,
    };
  }, [session]);

  const scenarioSavePath = useMemo(() => {
    if (!scenarioJson) return "";
    const file = `${scenarioJson.id || "scenario"}.json`;
    return `scenarios/${scenarioJson.module}/${file}`;
  }, [scenarioJson]);

  const copyScenarioJson = () => {
    if (!scenarioJson) return;
    void navigator.clipboard.writeText(JSON.stringify(scenarioJson, null, 2));
    message.success("已复制 JSON");
  };

  const downloadScenarioJson = () => {
    if (!scenarioJson) return;
    downloadJson(`${scenarioJson.id || "scenario"}.json`, scenarioJson);
  };

  const handleLaunch = async () => {
    const values = await form.validateFields();
    saveCache({
      scenarioId: values.scenarioId,
      scenarioName: values.scenarioName,
      module: values.module,
      startUrl: values.startUrl,
      requiresLogin: values.requiresLogin,
    });
    if (sessionId) {
      await api.cancel(sessionId).catch(() => undefined);
      setSessionId(null);
      setSession(null);
    }
    createMutation.mutate({
      startUrl: values.startUrl,
      meta: {
        id: values.scenarioId,
        name: values.scenarioName,
        module: values.module,
        requiresLogin: values.requiresLogin,
      },
    });
  };

  const handleStartRecording = () => {
    if (!sessionId) return;
    commandMutation.mutate({ id: sessionId, command: "start" });
  };

  const handleStop = () => {
    if (!sessionId) return;
    commandMutation.mutate({ id: sessionId, command: "stop" });
  };

  const status = session?.status;
  const isActive = status ? ACTIVE.has(status) : false;
  const canLaunch = !sessionId || status === "stopped" || status === "cancelled" || status === "error";
  const canStart = status === "preparing" || status === "paused";
  const canStop = status === "recording" || status === "paused" || status === "preparing";

  return (
    <div className="recorder-page">
      <Typography.Title level={3}>
        <VideoCameraOutlined /> 场景录制
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        启动浏览器后在目标页面操作，工具会记录点击、输入、跳转与常用快捷键，并生成场景 JSON。
      </Typography.Paragraph>

      {browserStatus.data && !browserStatus.data.ok && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="测试浏览器未就绪"
          description={browserStatus.data.hints.join("；") || "请先在主项目设置中安装或配置浏览器"}
        />
      )}

      <div className="recorder-layout">
        <Card title="录制设置">
          <Form form={form} layout="vertical">
            <Form.Item
              label="场景 ID"
              name="scenarioId"
              rules={[{ required: true, message: "请输入场景 ID" }]}
            >
              <Input placeholder="login_success" disabled={isActive} />
            </Form.Item>
            <Form.Item
              label="场景名称"
              name="scenarioName"
              rules={[{ required: true, message: "请输入场景名称" }]}
            >
              <Input placeholder="登录成功" disabled={isActive} />
            </Form.Item>
            <Form.Item
              label="模块"
              name="module"
              rules={[{ required: true, message: "请输入模块名" }]}
            >
              <Input placeholder="login" disabled={isActive} />
            </Form.Item>
            <Form.Item
              label="起始地址"
              name="startUrl"
              rules={[{ required: true, message: "请输入起始 URL" }]}
            >
              <Input placeholder="https://example.com/login" disabled={isActive} />
            </Form.Item>
            <Form.Item label="需要登录" name="requiresLogin" valuePropName="checked">
              <Switch disabled={isActive} />
            </Form.Item>
          </Form>

          <Space wrap>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => void handleLaunch()}
              loading={createMutation.isPending || status === "starting"}
              disabled={!canLaunch}
            >
              启动浏览器
            </Button>
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={handleStartRecording}
              loading={commandMutation.isPending}
              disabled={!canStart}
            >
              开始录制
            </Button>
            {status === "recording" && (
              <Button
                icon={<PauseOutlined />}
                onClick={() => sessionId && commandMutation.mutate({ id: sessionId, command: "pause" })}
              >
                暂停
              </Button>
            )}
            {status === "paused" && (
              <Button
                icon={<PlayCircleOutlined />}
                onClick={() => sessionId && commandMutation.mutate({ id: sessionId, command: "resume" })}
              >
                继续
              </Button>
            )}
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleStop}
              disabled={!canStop}
              loading={status === "stopping"}
            >
              结束录制
            </Button>
          </Space>

          {session && (
            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  状态：
                  <Tag color={STATUS_COLOR[session.status] ?? "default"}>
                    {STATUS_LABEL[session.status] ?? session.status}
                  </Tag>
                </div>
                <Typography.Text type="secondary" ellipsis>
                  当前页面：{session.currentUrl || session.startUrl}
                </Typography.Text>
                {session.error && <Alert type="error" message={session.error} />}
              </Space>
            </div>
          )}
        </Card>

        <Card
          title="录制步骤"
          extra={scenarioJson ? (
            <Button icon={<CodeOutlined />} onClick={() => setJsonDrawerOpen(true)}>
              JSON 预览
            </Button>
          ) : null}
        >
          <div className="recorder-steps">
            {session?.steps?.length ? (
              <List
                dataSource={session.steps}
                renderItem={(step) => (
                  <List.Item>
                    <Space direction="vertical" size={0}>
                      <Space>
                        <Tag>{step.type}</Tag>
                        <Typography.Text strong>{step.stepId}</Typography.Text>
                      </Space>
                      <Typography.Text type="secondary">{step.desc}</Typography.Text>
                      {step.selector && (
                        <Typography.Text code>{step.selector}</Typography.Text>
                      )}
                      {step.url && <Typography.Text code>{step.url}</Typography.Text>}
                      {step.value != null && step.type !== "click" && (
                        <Typography.Text code>{String(step.value)}</Typography.Text>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="开始录制后，步骤会显示在这里" />
            )}
          </div>
        </Card>
      </div>

      <ScenarioJsonDrawer
        open={jsonDrawerOpen && Boolean(scenarioJson)}
        onClose={() => setJsonDrawerOpen(false)}
        title={`JSON 预览: ${scenarioJson?.name || scenarioJson?.id || "场景"}`}
        savePath={scenarioSavePath}
        data={scenarioJson}
        onCopy={copyScenarioJson}
        onDownload={downloadScenarioJson}
      />
    </div>
  );
}
