import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, Modal, Input, Form, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api } from "../../../api/client";
import { useProject } from "../../../context/ProjectContext";
import { validateModuleId } from "../../../utils/scenario-serialize";

interface ScenarioListPanelProps {
  activeModule: string;
  onModuleChange: (m: string) => void;
  selectedFile?: string;
  onSelectScenario: (file: string) => void;
}

export function ScenarioListPanel({
  activeModule,
  onModuleChange,
  selectedFile,
  onSelectScenario,
}: ScenarioListPanelProps) {
  const qc = useQueryClient();
  const { projectId } = useProject();
  const [createOpen, setCreateOpen] = useState(false);
  const [moduleId, setModuleId] = useState("");
  const [description, setDescription] = useState("");

  const modulesQuery = useQuery({
    queryKey: ["modules", projectId],
    queryFn: api.modules,
    enabled: !!projectId,
  });
  const scenariosQuery = useQuery({
    queryKey: ["scenarios", projectId, activeModule],
    queryFn: () => api.scenarios(activeModule),
    enabled: !!projectId && !!activeModule,
  });

  const createModuleMut = useMutation({
    mutationFn: () => api.createModule(moduleId, description || undefined),
    onSuccess: (info) => {
      message.success(`模块 ${info.module} 已创建`);
      setCreateOpen(false);
      setModuleId("");
      setDescription("");
      void qc.invalidateQueries({ queryKey: ["modules", projectId] });
      onModuleChange(info.module);
    },
    onError: (e: Error) => message.error(e.message),
  });

  const scenarios = scenariosQuery.data ?? [];
  const moduleError = moduleId ? validateModuleId(moduleId) : undefined;

  return (
    <div className="studio-list-panel">
      <div className="studio-list-panel__head">
        <Select
          style={{ width: "100%" }}
          value={activeModule}
          onChange={onModuleChange}
          options={(modulesQuery.data ?? []).map((m) => ({ value: m.module, label: m.module }))}
          dropdownRender={(menu) => (
            <>
              {menu}
              <div style={{ padding: 8, borderTop: "1px solid #f0f0f0" }}>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    setCreateOpen(true);
                  }}
                >
                  <PlusOutlined /> 新建模块
                </a>
              </div>
            </>
          )}
        />
      </div>
      <div className="studio-list-panel__body">
        {scenarios.map((s) => {
          const active = selectedFile === s.file;
          return (
            <div
              key={s.file}
              className={`studio-list-item${active ? " studio-list-item--active" : ""}`}
              onClick={() => onSelectScenario(s.file)}
            >
              <span className="studio-list-item__name" title={s.name}>
                {s.name}
              </span>
            </div>
          );
        })}
        {!scenariosQuery.isLoading && scenarios.length === 0 && (
          <div style={{ padding: 16, color: "#bfbfbf", fontSize: 12, textAlign: "center" }}>
            暂无场景
          </div>
        )}
      </div>

      <Modal
        title="新建模块"
        open={createOpen}
        okText="创建"
        cancelText="取消"
        confirmLoading={createModuleMut.isPending}
        okButtonProps={{ disabled: !moduleId.trim() || !!moduleError }}
        onOk={() => createModuleMut.mutate()}
        onCancel={() => {
          setCreateOpen(false);
          setModuleId("");
          setDescription("");
        }}
      >
        <Form layout="vertical">
          <Form.Item
            label="模块 ID"
            required
            validateStatus={moduleError ? "error" : undefined}
            help={moduleError ?? "小写字母开头，仅含字母、数字、_、-"}
          >
            <Input
              value={moduleId}
              placeholder="mission"
              onChange={(e) => setModuleId(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="描述">
            <Input
              value={description}
              placeholder="可选"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
