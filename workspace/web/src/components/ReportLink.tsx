import { Button, message } from "antd";
import { openReport } from "../utils/open-report";

interface ReportLinkProps {
  href: string;
  children?: React.ReactNode;
}

export function ReportLink({ href, children = "查看" }: ReportLinkProps) {
  return (
    <Button
      type="link"
      size="small"
      style={{ paddingInline: 0, height: "auto" }}
      onClick={() => {
        openReport(href).catch((e) => {
          message.error(e instanceof Error ? e.message : "无法打开报告");
        });
      }}
    >
      {children}
    </Button>
  );
}
