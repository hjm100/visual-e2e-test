import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Button,
  Spin,
  Empty,
  message,
  Modal,
  Form,
  Input,
  Dropdown,
} from "antd";
import type { MenuProps } from "antd";
import {
  PictureOutlined,
  ToolOutlined,
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { api } from "../../api/client";
import { ScrollPane } from "../../components/layout/ScrollPane";
import type { ToolRegistryEntry } from "./types";
import {
  createCustomTool,
  deleteCustomTool,
  isValidHttpUrl,
  listCustomTools,
  updateCustomTool,
  type CustomTool,
} from "./custom-tools-store";
import "./tools.css";

const ICONS: Record<string, React.ReactNode> = {
  picture: <PictureOutlined />,
};

interface ToolFormValues {
  name: string;
  url: string;
  iconUrl?: string;
  description?: string;
}

function BuiltinIcon({ icon }: { icon?: string }) {
  if (icon && ICONS[icon]) return <>{ICONS[icon]}</>;
  return <ToolOutlined />;
}

function CustomIcon({ iconUrl }: { iconUrl?: string }) {
  const [failed, setFailed] = useState(false);
  if (!iconUrl || failed) return <ToolOutlined />;
  return (
    <img
      src={iconUrl}
      alt=""
      className="tools-hub__icon-img"
      onError={() => setFailed(true)}
    />
  );
}

interface ToolCardProps {
  title: React.ReactNode;
  description?: string;
  onOpen: () => void;
  menuItems?: MenuProps["items"];
}

function ToolCard({ title, description, onOpen, menuItems }: ToolCardProps) {
  return (
    <Card
      className="tools-hub__card"
      onClick={onOpen}
      title={
        <div className="tools-hub__card-title">
          {title}
          {menuItems && menuItems.length > 0 && (
            <Dropdown
              menu={{ items: menuItems }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                className="tools-hub__card-actions"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          )}
        </div>
      }
    >
      <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
        {description || "—"}
      </Typography.Paragraph>
    </Card>
  );
}

export function ToolsHubPage() {
  const navigate = useNavigate();
  const [customTools, setCustomTools] = useState<CustomTool[]>(() => listCustomTools());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomTool | null>(null);
  const [form] = Form.useForm<ToolFormValues>();

  const registryQuery = useQuery({
    queryKey: ["tools-registry"],
    queryFn: api.toolsRegistry,
  });

  const builtinTools = registryQuery.data?.tools ?? [];

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (tool: CustomTool) => {
    setEditing(tool);
    form.setFieldsValue({
      name: tool.name,
      url: tool.url,
      iconUrl: tool.iconUrl,
      description: tool.description,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name.trim(),
      url: values.url.trim(),
      iconUrl: values.iconUrl?.trim() || undefined,
      description: values.description?.trim() || undefined,
    };

    if (editing) {
      updateCustomTool(editing.id, payload);
      message.success("已更新");
    } else {
      createCustomTool(payload);
      message.success("已添加");
    }
    setCustomTools(listCustomTools());
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleDelete = (tool: CustomTool) => {
    Modal.confirm({
      title: "删除工具",
      content: `确定删除「${tool.name}」？`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: () => {
        deleteCustomTool(tool.id);
        setCustomTools(listCustomTools());
        message.success("已删除");
      },
    });
  };

  const customMenu = (tool: CustomTool): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "编辑",
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        openEditModal(tool);
      },
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "删除",
      danger: true,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        handleDelete(tool);
      },
    },
  ];

  const openCustomTool = async (tool: CustomTool) => {
    if (window.electronAPI?.openExternalTool) {
      try {
        await window.electronAPI.openExternalTool(tool.url, tool.name);
        return;
      } catch (err) {
        message.warning(err instanceof Error ? err.message : "应用内打开失败，已尝试浏览器打开");
      }
    }
    window.open(tool.url, "_blank", "noopener,noreferrer");
  };

  return (
    <ScrollPane>
      <div className="tools-hub__header">
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            工具箱
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            测试辅助工具集合，用于处理截图、文件等测试过程中的常见操作。
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          添加工具
        </Button>
      </div>

      {registryQuery.isLoading && <Spin style={{ marginTop: 24 }} />}

      {!registryQuery.isLoading && builtinTools.length > 0 && (
        <section className="tools-hub__section">
          <Typography.Title level={5} className="tools-hub__section-title">
            内置工具
          </Typography.Title>
          <div className="tools-hub__grid">
            {builtinTools.map((tool: ToolRegistryEntry) => (
              <ToolCard
                key={tool.id}
                title={
                  <>
                    <BuiltinIcon icon={tool.icon} />
                    <span className="tools-hub__card-title-text">{tool.name}</span>
                  </>
                }
                description={tool.description}
                onOpen={() => navigate(`/tools/${tool.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="tools-hub__section">
        <Typography.Title level={5} className="tools-hub__section-title">
          自定义
        </Typography.Title>
        {customTools.length === 0 && !registryQuery.isLoading && builtinTools.length === 0 ? (
          <Empty description="暂无工具" />
        ) : customTools.length === 0 ? (
          <Empty description="暂无自定义工具" />
        ) : (
          <div className="tools-hub__grid">
            {customTools.map((tool) => (
              <ToolCard
                key={tool.id}
                title={
                  <>
                    <CustomIcon iconUrl={tool.iconUrl} />
                    <span className="tools-hub__card-title-text">{tool.name}</span>
                  </>
                }
                description={tool.description}
                onOpen={() => void openCustomTool(tool)}
                menuItems={customMenu(tool)}
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        title={editing ? "编辑工具" : "添加工具"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => void handleSave()}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="工具名"
            rules={[{ required: true, message: "请输入工具名" }]}
          >
            <Input placeholder="例如：JSON 格式化" />
          </Form.Item>
          <Form.Item
            name="url"
            label="工具地址"
            rules={[
              { required: true, message: "请输入工具地址" },
              {
                validator: (_, value: string) =>
                  !value || isValidHttpUrl(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error("请输入有效的 http 或 https 地址")),
              },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item
            name="iconUrl"
            label="图标地址"
            extra="可选，公网图片 URL"
            rules={[
              {
                validator: (_, value?: string) =>
                  !value?.trim() || isValidHttpUrl(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error("请输入有效的图片 URL")),
              },
            ]}
          >
            <Input placeholder="https://example.com/icon.png" />
          </Form.Item>
          <Form.Item name="description" label="工具描述">
            <Input.TextArea rows={2} placeholder="简要说明用途" />
          </Form.Item>
        </Form>
      </Modal>
    </ScrollPane>
  );
}
