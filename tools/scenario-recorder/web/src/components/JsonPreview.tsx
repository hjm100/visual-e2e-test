import { Spin } from "antd";
import "./json-preview.css";

interface JsonPreviewProps {
  data: unknown;
  loading?: boolean;
  embedded?: boolean;
}

export function JsonPreview({ data, loading, embedded }: JsonPreviewProps) {
  const text = data !== undefined ? JSON.stringify(data, null, 2) : "";

  return (
    <div className={embedded ? "json-preview json-preview--embedded" : "json-preview"}>
      <Spin spinning={loading ?? false} className="json-preview__spin">
        <pre className="json-preview__code">{text}</pre>
      </Spin>
    </div>
  );
}
