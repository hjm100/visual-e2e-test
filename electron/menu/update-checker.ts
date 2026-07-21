import { dialog, shell } from "electron";
import { getAppVersion } from "../version.js";

const DOWNLOADS_URL = "https://visual-e2e.github.io/downloads.json";

interface DownloadAsset {
  id: string;
  label: string;
  url: string;
}

interface DownloadsManifest {
  version: string;
  assets: DownloadAsset[];
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.replace(/^v/, "").split("-", 1)[0].split(".").map(Number);
  const rightParts = right.replace(/^v/, "").split("-", 1)[0].split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function isDownloadsManifest(value: unknown): value is DownloadsManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<DownloadsManifest>;
  return (
    typeof manifest.version === "string" &&
    /^\d+(?:\.\d+)*$/.test(manifest.version) &&
    Array.isArray(manifest.assets) &&
    manifest.assets.every(
      (asset) =>
        asset &&
        typeof asset.id === "string" &&
        typeof asset.label === "string" &&
        typeof asset.url === "string",
    )
  );
}

function getAssetId(): string | null {
  if (process.platform === "win32") return "win";
  if (process.platform === "darwin" && process.arch === "arm64") return "mac-arm64";
  if (process.platform === "darwin" && process.arch === "x64") return "mac-x64";
  return null;
}

export async function checkForUpdates(): Promise<void> {
  try {
    const response = await fetch(DOWNLOADS_URL, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest: unknown = await response.json();
    if (!isDownloadsManifest(manifest)) {
      throw new Error("Invalid downloads manifest");
    }

    const currentVersion = getAppVersion();
    if (compareVersions(manifest.version, currentVersion) <= 0) {
      await dialog.showMessageBox({
        type: "info",
        title: "检测更新",
        message: "当前已是最新版本",
        detail: `当前版本 ${currentVersion}`,
      });
      return;
    }

    const assetId = getAssetId();
    const asset = manifest.assets.find((item) => item.id === assetId);
    if (!asset) {
      throw new Error(`Unsupported platform: ${process.platform}/${process.arch}`);
    }

    const downloadUrl = new URL(asset.url);
    if (downloadUrl.protocol !== "https:") {
      throw new Error("Invalid download URL");
    }

    const result = await dialog.showMessageBox({
      type: "info",
      title: "发现新版本",
      message: `Visual E2E Test ${manifest.version} 已发布`,
      detail: `当前版本 ${currentVersion}\n安装包：${asset.label}`,
      buttons: ["下载更新", "稍后"],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) {
      await shell.openExternal(downloadUrl.toString());
    }
  } catch (error) {
    console.error("check-for-updates:", error);
    await dialog.showMessageBox({
      type: "error",
      title: "检测更新失败",
      message: "暂时无法获取最新版本信息",
      detail: "请检查网络连接后重试",
    });
  }
}
