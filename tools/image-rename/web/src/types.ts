export interface FileEntry {
  name: string;
  ext: string;
  typeLabel: string;
  size: number;
  mtime: number;
}

export type SortMode = "name-asc" | "name-desc" | "mtime-asc" | "mtime-desc";

export const TOOL_MSG = {
  CACHE_CLEAR: "vet-tool:cache:clear",
  CACHE_CLEARED: "vet-tool:cache:cleared",
  PICK_FOLDER: "vet-tool:bridge:pick-folder",
  PICK_FOLDER_RESULT: "vet-tool:bridge:pick-folder-result",
} as const;

export const SORT_OPTIONS = [
  { value: "name-asc", label: "文件名 ↑" },
  { value: "name-desc", label: "文件名 ↓" },
  { value: "mtime-asc", label: "修改时间 ↑" },
  { value: "mtime-desc", label: "修改时间 ↓" },
] as const;

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
