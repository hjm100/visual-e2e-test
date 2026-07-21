import type { FileEntry, SortMode } from "../types";

const API = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `请求失败: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  list: (dir: string, imagesOnly: boolean) =>
    request<FileEntry[]>(
      `/api/fs/list?dir=${encodeURIComponent(dir)}&imagesOnly=${imagesOnly}`,
    ),

  preview: (body: {
    dir: string;
    files: string[];
    sort: SortMode;
    rule: { template: string; prefix: string; startIndex: number };
    allFiles: FileEntry[];
  }) =>
    request<Array<{ from: string; to: string; conflict?: string }>>("/api/rename/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  apply: (dir: string, items: Array<{ from: string; to: string }>) =>
    request<{ succeeded: string[]; failed: Array<{ from: string; reason: string }> }>(
      "/api/rename/apply",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir, items }),
      },
    ),
};
