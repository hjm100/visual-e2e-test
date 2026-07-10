import { Spin, Typography } from "antd";
import "./json-preview.css";

interface JsonPreviewProps {
  data: unknown;
  loading?: boolean;
  title?: string;
  /** Inline flow — no inner scroll (parent scroll container owns scrolling). */
  embedded?: boolean;
}

export function JsonPreview({ data, loading, title, embedded }: JsonPreviewProps) {
  const text = data !== undefined ? JSON.stringify(data, null, 2) : "";

  return (
    <div className={embedded ? "json-preview json-preview--embedded" : "json-preview"}>
      {title && (
        <Typography.Text type="secondary" className="json-preview__title">
          {title}
        </Typography.Text>
      )}
      <Spin spinning={loading ?? false} className="json-preview__spin">
        <pre className="json-preview__code">{text}</pre>
      </Spin>
    </div>
  );
}
