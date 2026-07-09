import { Dropdown, Typography } from "antd";
import { ExperimentOutlined, CheckOutlined, SettingOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../context/ProjectContext";
import "./app-header.css";

export function ProjectSwitcher() {
  const navigate = useNavigate();
  const { projectId, projects, setProjectId } = useProject();
  const current = projects.find((p) => p.id === projectId);

  const menuItems: MenuProps["items"] = [
    ...projects.map((p) => ({
      key: p.id,
      label: (
        <div>
          <div className="app-header__project-option-name">{p.name}</div>
          <div className="app-header__project-option-id">{p.id}</div>
        </div>
      ),
      extra: p.id === projectId ? <CheckOutlined style={{ color: "#1677ff" }} /> : null,
    })),
    { type: "divider" as const },
    {
      key: "__manage__",
      label: "项目管理",
      icon: <SettingOutlined />,
    },
  ];

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "__manage__") {
      navigate("/projects");
      return;
    }
    setProjectId(key);
  };

  return (
    <div className="app-header__actions">
      <Dropdown
        menu={{ items: menuItems, onClick: onMenuClick, selectedKeys: projectId ? [projectId] : [] }}
        trigger={["click"]}
        placement="bottomRight"
        overlayClassName="app-header__project-dropdown"
      >
        <button type="button" className="app-header__project-trigger" aria-label="切换项目">
          <span className="app-header__project-icon">
            <ExperimentOutlined />
          </span>
          <span className="app-header__project-text">
            <Typography.Text className="app-header__project-name" ellipsis>
              {current?.name ?? "选择项目"}
            </Typography.Text>
            <Typography.Text className="app-header__project-id" ellipsis type="secondary">
              {current?.id ?? "—"}
            </Typography.Text>
          </span>
          <span className="app-header__project-chevron" aria-hidden>▾</span>
        </button>
      </Dropdown>
    </div>
  );
}
