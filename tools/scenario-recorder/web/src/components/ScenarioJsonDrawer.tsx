import { Button, Drawer, Space, Typography } from "antd";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { JsonPreview } from "./JsonPreview";
import "./json-preview-drawer.css";

interface ScenarioJsonDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  savePath: string;
  data: unknown;
  onCopy: () => void;
  onDownload: () => void;
}

export function ScenarioJsonDrawer({
  open,
  onClose,
  title,
  savePath,
  data,
  onCopy,
  onDownload,
}: ScenarioJsonDrawerProps) {
  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose={false}
      extra={(
        <Space>
          <Button icon={<CopyOutlined />} onClick={onCopy}>
            复制 JSON
          </Button>
          <Button icon={<DownloadOutlined />} onClick={onDownload}>
            下载 JSON
          </Button>
        </Space>
      )}
    >
      <Typography.Text type="secondary" className="json-preview-drawer__path">
        保存路径：{savePath}
      </Typography.Text>
      <div className="json-preview-drawer__body">
        <JsonPreview embedded data={data} />
      </div>
    </Drawer>
  );
}
