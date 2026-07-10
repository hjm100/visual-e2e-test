import { isTauri } from "@tauri-apps/api/core";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function projectHeaders(projectId: string): HeadersInit {
  return projectId ? { "X-Project-Id": projectId } : {};
}

export type DownloadRunsResult =
  | { status: "saved"; path: string }
  | { status: "browser-default"; filename: string }
  | { status: "cancelled" };

function parseFilename(
  disposition: string,
  projectId: string,
  runIds: string[],
): string {
  const match = disposition.match(/filename="([^"]+)"/);
  return match?.[1] ?? (runIds.length === 1 ? `${projectId}-${runIds[0]}.zip` : `${projectId}-runs.zip`);
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

async function saveBlobInTauri(blob: Blob, filename: string): Promise<DownloadRunsResult> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const { downloadDir, join } = await import("@tauri-apps/api/path");

  const path = await save({
    defaultPath: await join(await downloadDir(), filename),
    filters: [{ name: "ZIP 压缩包", extensions: ["zip"] }],
    title: "保存运行报告",
  });
  if (!path) return { status: "cancelled" };

  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return { status: "saved", path };
}

async function saveBlobInBrowser(blob: Blob, filename: string): Promise<DownloadRunsResult> {
  const pickSaveFile = window.showSaveFilePicker;
  if (pickSaveFile) {
    try {
      const handle = await pickSaveFile.call(window, {
        suggestedName: filename,
        startIn: "downloads",
        types: [{ description: "ZIP 压缩包", accept: { "application/zip": [".zip"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { status: "saved", path: handle.name };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { status: "cancelled" };
      }
      throw e;
    }
  }

  triggerAnchorDownload(blob, filename);
  return { status: "browser-default", filename };
}

/** Download one or more runs as zip (report + logs + artifacts). */
export async function downloadRunsArchive(
  projectId: string,
  runIds: string[],
): Promise<DownloadRunsResult> {
  if (runIds.length === 0) return { status: "cancelled" };

  const url = `${API_BASE}/api/runs/download`;
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json", ...projectHeaders(projectId) },
    body: JSON.stringify({ runIds }),
  };

  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `下载失败: ${res.status}`);
  }

  const blob = await res.blob();
  const filename = parseFilename(res.headers.get("Content-Disposition") ?? "", projectId, runIds);

  if (isTauri()) {
    return saveBlobInTauri(blob, filename);
  }
  return saveBlobInBrowser(blob, filename);
}
