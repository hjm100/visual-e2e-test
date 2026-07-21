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

export class ReleaseAssetsError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReleaseAssetsError";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasVersion(filename, version) {
  const pattern = new RegExp(
    `(^|[^0-9A-Za-z])${escapeRegExp(version)}(?=$|[^0-9A-Za-z])`,
  );
  return pattern.test(filename);
}

/** @returns {{ path: string, id: "mac-arm64" | "mac-x64" | "win" }[]} */
export function collectReleaseAssets(version, repoRoot = REPO_ROOT) {
  const files = [];
  for (const { dir, ext, id } of ASSET_GLOBS) {
    const abs = join(repoRoot, dir);
    if (!existsSync(abs)) {
      throw new ReleaseAssetsError(
        `缺少当前版本 ${version} 的安装包目录 ${dir}/`,
      );
    }

    const installers = readdirSync(abs, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(ext))
      .map((entry) => entry.name);
    const matched = installers.filter((name) => hasVersion(name, version));
    if (installers.length !== 1 || matched.length !== 1) {
      const found = installers.length > 0 ? installers.join(", ") : "无";
      throw new ReleaseAssetsError(
        `${dir}/ 必须且只能包含一个当前版本 ${version} 的 ${ext} 安装包（发现: ${found}）`,
      );
    }

    files.push({ path: join(abs, matched[0]), id });
  }
  return files;
}
