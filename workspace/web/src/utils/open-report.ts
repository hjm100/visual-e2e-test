import { isTauri } from "@tauri-apps/api/core";

function resolveReportHref(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return new URL(path, window.location.origin).href;
}

/** workspace：系统浏览器；Tauri client：应用内新窗口 */
export async function openReport(path: string): Promise<void> {
  const href = resolveReportHref(path);

  if (isTauri()) {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const label = `report-${Date.now()}`;
    const win = new WebviewWindow(label, {
      url: href,
      title: "测试报告",
      width: 1280,
      height: 900,
      center: true,
    });
    win.once("tauri://error", (e) => {
      console.error("report window error", e);
    });
    return;
  }

  window.open(href, "_blank", "noopener,noreferrer");
}
