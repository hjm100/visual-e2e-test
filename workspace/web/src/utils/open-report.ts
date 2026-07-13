import { isElectron } from "./runtime";

function resolveReportHref(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return new URL(path, window.location.origin).href;
}

/** workspace：系统浏览器；Electron client：应用内新窗口 */
export async function openReport(path: string): Promise<void> {
  const href = resolveReportHref(path);

  if (isElectron() && window.electronAPI) {
    await window.electronAPI.openReport(href);
    return;
  }

  const popup = window.open(href, "_blank", "noopener,noreferrer");
  if (!popup) {
    throw new Error("无法打开报告，请检查浏览器是否拦截弹窗");
  }
}
