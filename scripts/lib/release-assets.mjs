/**
 * Collect local Electron installer paths for CDN / GitHub Release.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../dev/env.mjs";

export const ASSET_GLOBS = [
  { dir: "build/macos-arm64", ext: ".dmg", id: "mac-arm64" },
  { dir: "build/macos-x64", ext: ".dmg", id: "mac-x64" },
  { dir: "build/windows", ext: ".exe", id: "win" },
];

/** @returns {{ path: string, id: "mac-arm64" | "mac-x64" | "win" }[]} */
export function collectReleaseAssets() {
  const files = [];
  for (const { dir, ext, id } of ASSET_GLOBS) {
    const abs = join(REPO_ROOT, dir);
    if (!existsSync(abs)) {
      throw new Error(
        `缺少目录 ${dir}/。请先: npm run download:chromium -- all && npm run electron:build:all`,
      );
    }
    const matched = readdirSync(abs).filter((n) => n.endsWith(ext));
    if (matched.length === 0) {
      throw new Error(`缺少 ${dir}/*${ext}。请先完成本机打包。`);
    }
    for (const name of matched) {
      files.push({ path: join(abs, name), id });
    }
  }
  return files;
}
