import { readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { isImageFile, type FileEntry } from "./rename.js";
import { resolveDir } from "../utils/safe-path.js";

export function listDirectory(dir: string, imagesOnly: boolean): FileEntry[] {
  const abs = resolveDir(dir);
  return readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const full = join(abs, e.name);
      const stat = statSync(full);
      const dot = e.name.lastIndexOf(".");
      const ext = dot > 0 ? e.name.slice(dot) : "";
      return {
        name: e.name,
        ext,
        typeLabel: ext ? ext.slice(1).toUpperCase() : "—",
        size: stat.size,
        mtime: stat.mtimeMs,
      };
    })
    .filter((f) => !imagesOnly || isImageFile(f.name));
}

export interface ApplyItem {
  from: string;
  to: string;
}

export function applyRename(
  dir: string,
  items: ApplyItem[],
): { succeeded: string[]; failed: Array<{ from: string; reason: string }> } {
  const abs = resolveDir(dir);
  const succeeded: string[] = [];
  const failed: Array<{ from: string; reason: string }> = [];

  const temps: Array<{ temp: string; final: string }> = [];
  for (const item of items) {
    if (item.from === item.to) continue;
    const fromPath = join(abs, item.from);
    const temp = join(abs, `.${randomUUID()}.tmp`);
    try {
      renameSync(fromPath, temp);
      temps.push({ temp, final: join(abs, item.to) });
    } catch (err) {
      failed.push({
        from: item.from,
        reason: err instanceof Error ? err.message : "重命名失败",
      });
    }
  }

  for (const { temp, final } of temps) {
    try {
      renameSync(temp, final);
      succeeded.push(final.split("/").pop() ?? final);
    } catch (err) {
      failed.push({
        from: temp,
        reason: err instanceof Error ? err.message : "重命名失败",
      });
    }
  }

  return { succeeded, failed };
}
