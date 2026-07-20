import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spin, Typography } from "antd";
import { LoadingOutlined, ExportOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { ScrollPane } from "../../components/layout/ScrollPane";
import { getCustomTool } from "./custom-tools-store";
import { TOOL_MSG, toolWebOrigin, type ToolRegistryEntry } from "./types";
import type { CustomTool } from "./custom-tools-store";
import "./tools.css";

interface BuiltinHostFrameProps {
  tool: ToolRegistryEntry;
  iframeSrc: string;
  apiOrigin: string;
}

function BuiltinHostFrame({ tool, iframeSrc, apiOrigin }: BuiltinHostFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webOrigin = toolWebOrigin(tool, import.meta.env.DEV);

  useEffect(() => {
    setReady(false);
    setIframeLoaded(false);
    setError(null);
  }, [apiOrigin, tool.id, iframeSrc]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const healthUrl = `${apiOrigin}/api/health`;
      const started = Date.now();
      while (Date.now() - started < 20_000) {
        if (cancelled) return;
        try {
          const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
          if (res.ok) {
            setReady(true);
            return;
          }
        } catch {
          // retry
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (!cancelled) {
        setError("工具暂不可用，请稍后重试");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOrigin, tool.id]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== webOrigin) return;
      const data = event.data as { type?: string };
      if (data?.type !== TOOL_MSG.PICK_FOLDER) return;

      let path: string | null = null;
      if (window.electronAPI?.pickFolder) {
        path = await window.electronAPI.pickFolder();
      }

      iframeRef.current?.contentWindow?.postMessage(
        { type: TOOL_MSG.PICK_FOLDER_RESULT, path },
        webOrigin,
      );
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [webOrigin]);

  if (error) {
    return (
      <ScrollPane>
        <Alert type="warning" message={error} showIcon />
      </ScrollPane>
    );
  }

  if (!ready) {
    return (
      <div className="tool-host__loading">
        <div className="tool-host__loading-inner">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          <Typography.Text type="secondary">正在连接 {tool.name}…</Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <>
      {!iframeLoaded && (
        <div className="tool-host__loading">
          <div className="tool-host__loading-inner">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
            <Typography.Text type="secondary">正在加载 {tool.name}…</Typography.Text>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="tool-host__iframe"
        src={iframeSrc}
        title={tool.name}
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        referrerPolicy="no-referrer"
        style={{ opacity: iframeLoaded ? 1 : 0 }}
        onLoad={() => setIframeLoaded(true)}
      />
    </>
  );
}

function CustomHostFrame({ tool }: { tool: CustomTool }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    setIframeLoaded(false);
    setLoadTimedOut(false);
  }, [tool.id, tool.url]);

  useEffect(() => {
    if (iframeLoaded) return;
    const timer = window.setTimeout(() => {
      setLoadTimedOut(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [iframeLoaded, tool.id, tool.url]);

  const openExternal = () => {
    window.open(tool.url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="tool-host__external-bar">
        <Typography.Text type="secondary" ellipsis style={{ flex: 1, marginRight: 12 }}>
          {tool.url}
        </Typography.Text>
        <Button size="small" icon={<ExportOutlined />} onClick={openExternal}>
          在浏览器中打开
        </Button>
      </div>
      {!iframeLoaded && (
        <div className="tool-host__loading">
          <div className="tool-host__loading-inner">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
            <Typography.Text type="secondary">正在加载 {tool.name}…</Typography.Text>
          </div>
        </div>
      )}
      <iframe
        className="tool-host__iframe"
        src={tool.url}
        title={tool.name}
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        style={{ opacity: iframeLoaded ? 1 : 0 }}
        onLoad={() => {
          setIframeLoaded(true);
          setLoadTimedOut(false);
        }}
      />
      {loadTimedOut && (
        <Alert
          type="warning"
          showIcon
          style={{ position: "absolute", right: 16, bottom: 16, left: 16, zIndex: 3 }}
          message="该网站可能禁止应用内嵌入"
          description="请点击上方“在浏览器中打开”。部分网站会通过 X-Frame-Options 或 CSP 拒绝 iframe 显示。"
        />
      )}
    </>
  );
}

export function ToolHostPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const isDev = import.meta.env.DEV;

  const customTool = toolId ? getCustomTool(toolId) : undefined;

  const registryQuery = useQuery({
    queryKey: ["tools-registry"],
    queryFn: api.toolsRegistry,
    enabled: !customTool,
  });

  const builtinTool = registryQuery.data?.tools.find((t) => t.id === toolId);

  if (!customTool && registryQuery.isLoading) {
    return (
      <div className="tool-host__loading">
        <div className="tool-host__loading-inner">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          <Typography.Text type="secondary">正在加载…</Typography.Text>
        </div>
      </div>
    );
  }

  if (customTool) {
    return (
      <div className="tool-host">
        <CustomHostFrame tool={customTool} />
      </div>
    );
  }

  if (toolId?.startsWith("custom-")) {
    return (
      <ScrollPane>
        <Typography.Text type="danger">未找到工具: {toolId}</Typography.Text>
      </ScrollPane>
    );
  }

  if (!builtinTool) {
    return (
      <ScrollPane>
        <Typography.Text type="danger">未找到工具: {toolId}</Typography.Text>
      </ScrollPane>
    );
  }

  const webOrigin = toolWebOrigin(builtinTool, isDev);
  const apiOrigin = `http://127.0.0.1:${isDev ? builtinTool.devPort : builtinTool.prodPort}`;

  return (
    <div className="tool-host">
      <BuiltinHostFrame
        tool={builtinTool}
        iframeSrc={`${webOrigin}/`}
        apiOrigin={apiOrigin}
      />
    </div>
  );
}
